import { ItemView, WorkspaceLeaf } from "obsidian";
import type PowerRollDetectorPlugin from "./main";
import { RollHistoryEntry, RollMode, modeLabel, tierLabel } from "./rolls";

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

		const savingThrowButton = contentEl.createEl("button", {
			text: "Saving Throw",
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

		if (entry.label) {
			row.createDiv({ text: entry.label, cls: "prd-history-label" });
		}

		const resultRow = row.createDiv({ cls: "prd-result-row" });
		const breakdown = row.createDiv({ cls: "prd-history-breakdown" });

		if (entry.kind === "power-roll") {
			resultRow.createSpan({ text: String(entry.total), cls: "prd-result-total" });
			if (entry.tier) {
				resultRow.createSpan({
					text: tierLabel(entry.tier),
					cls: `prd-tier-badge prd-tier-${entry.tier}`,
				});
			}

			const modeSuffix = entry.mode && entry.mode !== "none" ? ` (${modeLabel(entry.mode)})` : "";
			const dice = `🎲 ${entry.dieA} + ${entry.dieB}`;
			const modifierText =
				entry.modifier !== null
					? ` ${entry.modifier >= 0 ? "+ " : "- "}${Math.abs(entry.modifier)}`
					: "";
			breakdown.setText(`${entry.formulaText}${modeSuffix}: ${dice}${modifierText}`);
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
