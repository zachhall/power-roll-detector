import { MarkdownPostProcessorContext, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { PowerRollView, VIEW_TYPE_POWER_ROLL } from "./view";
import {
	RollHistoryEntry,
	RollMode,
	makeEntryId,
	rollBreakdown,
	rollPowerRoll,
	rollSavingThrow as rollSavingThrowResult,
	rollSuffix,
	tierLabel,
} from "./rolls";
import { DEFAULT_SIDEBAR_OPEN_BEHAVIOR, PowerRollDetectorSettingTab, SidebarOpenBehavior } from "./settings";

const POWER_ROLL_PATTERN = /Power Roll\s*\+\s*(-?\d+)/gi;
const SKIP_PARENT_SELECTOR =
	"code, pre, a, button, input, textarea, select, .power-roll-inline";
const FEATURE_CONTAINER_SELECTOR = ".ds-feature-container";
const FEATURE_NAME_SELECTOR = ".ds-feature-name-value";
const CREATURE_CONTAINER_SELECTOR = ".ds-sb-container";
const CREATURE_NAME_SELECTOR = ".ds-header-title-left";
const HISTORY_LIMIT = 20;

export function reportError(context: string): (err: unknown) => void {
	return (err: unknown) => console.error(`Power Roll Detector: ${context} failed`, err);
}

interface PluginData {
	history: RollHistoryEntry[];
	sidebarOpenBehavior: SidebarOpenBehavior;
}

export default class PowerRollDetectorPlugin extends Plugin {
	rollMode: RollMode = "none";
	history: RollHistoryEntry[] = [];
	testModifierInput = "";
	skillEnabled = false;
	sidebarOpenBehavior: SidebarOpenBehavior = DEFAULT_SIDEBAR_OPEN_BEHAVIOR;

	async onload() {
		const data = (await this.loadData()) as Partial<PluginData> | null;
		this.history = data?.history ?? [];
		this.sidebarOpenBehavior = data?.sidebarOpenBehavior ?? DEFAULT_SIDEBAR_OPEN_BEHAVIOR;

		this.registerView(VIEW_TYPE_POWER_ROLL, (leaf) => new PowerRollView(leaf, this));

		this.addRibbonIcon("dice", "Open Power Roll history", () => {
			this.activateView().catch(reportError("open history view"));
		});

		this.addCommand({
			id: "open-power-roll-history",
			name: "Open Power Roll history",
			callback: () => {
				this.activateView().catch(reportError("open history view"));
			},
		});

		this.addSettingTab(new PowerRollDetectorSettingTab(this.app, this));

		this.registerMarkdownPostProcessor(
			(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				this.processNode(el, ctx.sourcePath);
			}
		);
	}

	async activateView() {
		let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(VIEW_TYPE_POWER_ROLL)[0];
		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("split");
			await leaf.setViewState({ type: VIEW_TYPE_POWER_ROLL, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	setRollMode(mode: RollMode) {
		this.rollMode = this.rollMode === mode ? "none" : mode;
		this.refreshView();
	}

	private async pushHistory(entry: RollHistoryEntry) {
		this.history = [entry, ...this.history].slice(0, HISTORY_LIMIT);
		await this.persistData();
		this.refreshView();
	}

	async saveSettings() {
		await this.persistData();
	}

	private async persistData() {
		await this.saveData({
			history: this.history,
			sidebarOpenBehavior: this.sidebarOpenBehavior,
		} satisfies PluginData);
	}

	/** Reveals the Power Roll sidebar after an inline roll, per the "Sidebar on power roll" setting. */
	private async revealSidebarForRoll() {
		if (this.sidebarOpenBehavior === "never") return;

		if (this.sidebarOpenBehavior === "ifOpen") {
			const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_POWER_ROLL)[0];
			if (existingLeaf) await this.app.workspace.revealLeaf(existingLeaf);
			return;
		}

		await this.activateView();
	}

	private refreshView() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_POWER_ROLL)) {
			if (leaf.view instanceof PowerRollView) {
				leaf.view.render();
			}
		}
	}

	setTestModifierInput(value: string) {
		this.testModifierInput = value;
	}

	stepTestModifier(delta: number) {
		const current = Number(this.testModifierInput) || 0;
		this.testModifierInput = String(current + delta);
		this.refreshView();
	}

	toggleSkill() {
		this.skillEnabled = !this.skillEnabled;
		this.refreshView();
	}

	async rollTest() {
		const characteristicModifier = Number(this.testModifierInput) || 0;
		const skillApplied = this.skillEnabled;
		const effectiveModifier = characteristicModifier + (skillApplied ? 2 : 0);
		const mode = this.rollMode;
		const result = rollPowerRoll(effectiveModifier, mode);

		const entry: RollHistoryEntry = {
			id: makeEntryId(),
			timestamp: Date.now(),
			kind: "test",
			label: null,
			creatureLabel: null,
			formulaText: "Test",
			mode,
			skillApplied,
			dieA: result.dieA,
			dieB: result.dieB,
			modifier: characteristicModifier,
			total: result.total,
			tier: result.tier,
			success: null,
		};

		if (mode !== "none") {
			this.rollMode = "none";
		}
		if (skillApplied) {
			this.skillEnabled = false;
		}

		await this.pushHistory(entry);

		const suffix = rollSuffix(mode, skillApplied);
		new Notice(
			`Test${suffix}: ${rollBreakdown(entry)} = ${result.total} (${tierLabel(result.tier)})`,
			6000
		);
	}

	async rollSavingThrow() {
		const result = rollSavingThrowResult();
		const entry: RollHistoryEntry = {
			id: makeEntryId(),
			timestamp: Date.now(),
			kind: "saving-throw",
			label: null,
			creatureLabel: null,
			formulaText: "Saving Throw",
			mode: null,
			skillApplied: false,
			dieA: result.die,
			dieB: null,
			modifier: null,
			total: result.die,
			tier: null,
			success: result.success,
		};
		await this.pushHistory(entry);
		new Notice(`Saving Throw → 🎲 ${result.die} (${result.success ? "Success" : "Failure"})`, 6000);
	}

	private extractFeatureLabel(span: HTMLElement): string | null {
		const container = span.closest(FEATURE_CONTAINER_SELECTOR);
		const nameEl = container?.querySelector(FEATURE_NAME_SELECTOR);
		const text = nameEl?.textContent?.trim();
		return text ? text : null;
	}

	private fileTitleFromPath(sourcePath: string | undefined): string | null {
		if (!sourcePath) return null;
		const segment = sourcePath.split("/").pop() ?? sourcePath;
		const title = segment.replace(/\.md$/i, "").trim();
		return title ? title : null;
	}

	private extractCreatureLabel(span: HTMLElement): string | null {
		const container = span.closest(CREATURE_CONTAINER_SELECTOR);
		const nameEl = container?.querySelector(CREATURE_NAME_SELECTOR);
		const text = nameEl?.textContent?.trim();
		if (text) return text;
		return this.fileTitleFromPath(span.dataset.sourcePath);
	}

	private async handlePowerRoll(span: HTMLElement) {
		const modifier = Number(span.dataset.modifier);
		const mode = this.rollMode;
		const result = rollPowerRoll(modifier, mode);
		const label = this.extractFeatureLabel(span);
		const creatureLabel = this.extractCreatureLabel(span);

		const entry: RollHistoryEntry = {
			id: makeEntryId(),
			timestamp: Date.now(),
			kind: "power-roll",
			label,
			creatureLabel,
			formulaText: span.textContent ?? "Power Roll",
			mode,
			skillApplied: false,
			dieA: result.dieA,
			dieB: result.dieB,
			modifier,
			total: result.total,
			tier: result.tier,
			success: null,
		};

		if (mode !== "none") {
			this.rollMode = "none";
		}

		await this.pushHistory(entry);
		await this.revealSidebarForRoll();

		const suffix = rollSuffix(mode, false);
		new Notice(
			`${entry.formulaText}${suffix}: ${rollBreakdown(entry)} = ${result.total} (${tierLabel(result.tier)})`,
			6000
		);
	}

	private processNode(root: HTMLElement, sourcePath: string) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: (node) => {
				const parent = node.parentElement;
				if (!parent) return NodeFilter.FILTER_REJECT;
				if (parent.closest(SKIP_PARENT_SELECTOR)) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		});

		const targets: Text[] = [];
		let current: Node | null;
		while ((current = walker.nextNode())) {
			const text = current.textContent ?? "";
			POWER_ROLL_PATTERN.lastIndex = 0;
			if (POWER_ROLL_PATTERN.test(text)) {
				targets.push(current as Text);
			}
		}

		for (const textNode of targets) {
			this.splitAndWrap(textNode, sourcePath);
		}
	}

	private splitAndWrap(textNode: Text, sourcePath: string) {
		const text = textNode.textContent ?? "";
		POWER_ROLL_PATTERN.lastIndex = 0;

		const fragment = createFragment((frag) => {
			let lastIndex = 0;
			let match: RegExpExecArray | null;

			while ((match = POWER_ROLL_PATTERN.exec(text))) {
				const [fullMatch, modifier] = match;
				const start = match.index;

				if (start > lastIndex) {
					frag.appendText(text.slice(lastIndex, start));
				}

				const span = frag.createSpan({
					cls: "power-roll-inline",
					text: fullMatch,
					attr: {
						role: "button",
						tabindex: "0",
						"aria-label": `Roll ${fullMatch}`,
						"data-modifier": modifier,
						"data-source-path": sourcePath,
					},
				});
				span.addEventListener("click", () => {
					this.handlePowerRoll(span).catch(reportError("power roll"));
				});
				span.addEventListener("keydown", (evt: KeyboardEvent) => {
					if (evt.key === "Enter" || evt.key === " ") {
						evt.preventDefault();
						this.handlePowerRoll(span).catch(reportError("power roll"));
					}
				});

				lastIndex = start + fullMatch.length;
			}

			if (lastIndex < text.length) {
				frag.appendText(text.slice(lastIndex));
			}
		});

		textNode.replaceWith(fragment);
	}
}
