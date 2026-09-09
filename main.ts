import { MarkdownPostProcessorContext, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { PowerRollView, VIEW_TYPE_POWER_ROLL } from "./view";
import {
	RollHistoryEntry,
	RollMode,
	makeEntryId,
	rollPowerRoll,
	rollSavingThrow as rollSavingThrowResult,
	rollSuffix,
	tierLabel,
} from "./rolls";

const POWER_ROLL_PATTERN = /Power Roll\s*\+\s*(-?\d+)/gi;
const SKIP_PARENT_SELECTOR =
	"code, pre, a, button, input, textarea, select, .power-roll-inline";
const FEATURE_CONTAINER_SELECTOR = ".ds-feature-container";
const FEATURE_NAME_SELECTOR = ".ds-feature-name-value";
const CREATURE_CONTAINER_SELECTOR = ".ds-sb-container";
const CREATURE_NAME_SELECTOR = ".ds-header-title-left";
const HISTORY_LIMIT = 20;

interface PluginData {
	history: RollHistoryEntry[];
}

export default class PowerRollDetectorPlugin extends Plugin {
	rollMode: RollMode = "none";
	history: RollHistoryEntry[] = [];
	testModifierInput = "";
	skillEnabled = false;

	async onload() {
		const data = (await this.loadData()) as PluginData | null;
		this.history = data?.history ?? [];

		this.registerView(VIEW_TYPE_POWER_ROLL, (leaf) => new PowerRollView(leaf, this));

		this.addRibbonIcon("dice", "Open Power Roll history", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-power-roll-history",
			name: "Open Power Roll history",
			callback: () => this.activateView(),
		});

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
		await this.saveData({ history: this.history } satisfies PluginData);
		this.refreshView();
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
		const typedModifier = Number(this.testModifierInput) || 0;
		const skillApplied = this.skillEnabled;
		const modifier = typedModifier + (skillApplied ? 2 : 0);
		const mode = this.rollMode;
		const result = rollPowerRoll(modifier, mode);

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
			modifier,
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
		const sign = modifier >= 0 ? "+ " : "- ";
		new Notice(
			`Test${suffix} → 🎲 ${result.dieA} + ${result.dieB} ${sign}${Math.abs(modifier)} = ${result.total} (${tierLabel(result.tier)})`,
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

		const suffix = rollSuffix(mode, false);
		const sign = modifier >= 0 ? "+ " : "- ";
		new Notice(
			`${entry.formulaText}${suffix} → 🎲 ${result.dieA} + ${result.dieB} ${sign}${Math.abs(modifier)} = ${result.total} (${tierLabel(result.tier)})`,
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

		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = POWER_ROLL_PATTERN.exec(text))) {
			const [fullMatch, modifier] = match;
			const start = match.index;

			if (start > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
			}

			const span = document.createElement("span");
			span.addClass("power-roll-inline");
			span.setAttr("role", "button");
			span.setAttr("tabindex", "0");
			span.setAttr("aria-label", `Roll ${fullMatch}`);
			span.dataset.modifier = modifier;
			span.dataset.sourcePath = sourcePath;
			span.setText(fullMatch);
			span.addEventListener("click", () => this.handlePowerRoll(span));
			span.addEventListener("keydown", (evt: KeyboardEvent) => {
				if (evt.key === "Enter" || evt.key === " ") {
					evt.preventDefault();
					this.handlePowerRoll(span);
				}
			});
			fragment.appendChild(span);

			lastIndex = start + fullMatch.length;
		}

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		textNode.replaceWith(fragment);
	}
}
