import { ItemView, WorkspaceLeaf } from "obsidian";
import type PowerRollDetectorPlugin from "./main";
import { RollHistoryEntry, RollMode, isNaturalCrit, rollBreakdown, rollSuffix, tierLabel } from "./rolls";

export const VIEW_TYPE_POWER_ROLL = "power-roll-history-view";

const TOGGLE_ROWS: { mode: RollMode; label: string }[][] = [
	[
		{ mode: "bane", label: "Bane" },
		{ mode: "edge", label: "Edge" },
	],
	[
		{ mode: "doubleBane", label: "Double Bane" },
		{ mode: "doubleEdge", label: "Double Edge" },
	],
];

export class PowerRollView extends ItemView {
	private plugin: PowerRollDetectorPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: PowerRollDetectorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_POWER_ROLL;
	}

	getDisplayText(): string {
		return "Power Roll";
	}

	getIcon(): string {
		return "dice";
	}

	async onOpen() {
		this.render();
	}

	render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("prd-view");

		const toggleGrid = contentEl.createDiv({ cls: "prd-toggle-grid" });
		for (const pair of TOGGLE_ROWS) {
			const toggleRow = toggleGrid.createDiv({ cls: "prd-toggle-row" });
			for (const { mode, label } of pair) {
				const button = toggleRow.createEl("button", {
					text: label,
					cls: "prd-toggle-button",
				});
				if (this.plugin.rollMode === mode) {
					button.addClass("is-active");
				}
				button.addEventListener("click", () => {
					this.plugin.setRollMode(mode);
				});
			}
		}

		const testRow = contentEl.createDiv({ cls: "prd-test-row" });

		const stepper = testRow.createDiv({ cls: "prd-test-stepper" });
		const decrementButton = stepper.createEl("button", {
			text: "−",
			cls: "prd-test-step-button",
			attr: { "aria-label": "Decrease test modifier" },
		});
		decrementButton.addEventListener("click", () => {
			this.plugin.stepTestModifier(-1);
		});

		const testInput = stepper.createEl("input", {
			type: "number",
			cls: "prd-test-input",
			attr: { placeholder: "0", "aria-label": "Test modifier" },
		});
		testInput.value = this.plugin.testModifierInput;
		testInput.addEventListener("input", () => {
			this.plugin.setTestModifierInput(testInput.value);
		});

		const incrementButton = stepper.createEl("button", {
			text: "+",
			cls: "prd-test-step-button",
			attr: { "aria-label": "Increase test modifier" },
		});
		incrementButton.addEventListener("click", () => {
			this.plugin.stepTestModifier(1);
		});

		const testButton = testRow.createEl("button", {
			text: "Roll a Test",
			cls: "prd-test-button",
		});
		testButton.addEventListener("click", () => {
			this.plugin.rollTest();
		});

		const skillButton = testRow.createEl("button", {
			text: "Use Skill",
			cls: "prd-skill-button",
		});
		if (this.plugin.skillEnabled) {
			skillButton.addClass("is-active");
		}
		skillButton.addEventListener("click", () => {
			this.plugin.toggleSkill();
		});

		contentEl.createDiv({ cls: "prd-divider" });

		const savingThrowButton = contentEl.createEl("button", {
			text: "Roll a Saving Throw",
			cls: "prd-saving-throw-button",
		});
		savingThrowButton.addEventListener("click", () => {
			this.plugin.rollSavingThrow();
		});

		const historyEl = contentEl.createDiv({ cls: "prd-history" });
		this.renderHistory(historyEl);
	}

	private renderHistory(container: HTMLElement) {
		if (this.plugin.history.length === 0) {
			container.createDiv({ text: "No rolls yet.", cls: "prd-history-empty" });
			return;
		}

		for (const entry of this.plugin.history) {
			container.appendChild(this.buildHistoryRow(entry));
		}
	}

	private buildHistoryRow(entry: RollHistoryEntry): HTMLElement {
		const row = document.createElement("div");
		row.addClass("prd-history-entry");
		if (isNaturalCrit(entry)) {
			row.addClass("prd-history-natural");
		}

		if (entry.creatureLabel) {
			row.createDiv({ text: entry.creatureLabel, cls: "prd-history-creature" });
		}

		if (entry.label) {
			row.createDiv({ text: entry.label, cls: "prd-history-label" });
		}

		const resultRow = row.createDiv({ cls: "prd-result-row" });
		const breakdown = row.createDiv({ cls: "prd-history-breakdown" });

		if (entry.kind === "power-roll" || entry.kind === "test") {
			resultRow.createSpan({ text: String(entry.total), cls: "prd-result-total" });
			if (entry.tier) {
				resultRow.createSpan({
					text: tierLabel(entry.tier),
					cls: `prd-tier-badge prd-tier-${entry.tier}`,
				});
			}

			const suffix = rollSuffix(entry.mode, entry.skillApplied);
			breakdown.setText(`${entry.formulaText}${suffix}: ${rollBreakdown(entry)}`);
		} else {
			resultRow.createSpan({ text: String(entry.dieA), cls: "prd-result-total" });
			resultRow.createSpan({
				text: entry.success ? "Success" : "Failure",
				cls: `prd-tier-badge ${entry.success ? "prd-success" : "prd-failure"}`,
			});
			breakdown.setText("Saving Throw");
		}

		row.createDiv({
			text: new Date(entry.timestamp).toLocaleTimeString(),
			cls: "prd-history-time",
		});

		return row;
	}
}
