import { ItemView, WorkspaceLeaf } from "obsidian";
import type PowerRollDetectorPlugin from "./main";
import { RollHistoryEntry, RollMode, modeLabel, tierLabel } from "./rolls";

export const VIEW_TYPE_POWER_ROLL = "power-roll-history-view";

const TOGGLE_MODES: { mode: RollMode; label: string }[] = [
	{ mode: "bane", label: "Bane" },
	{ mode: "doubleBane", label: "Double Bane" },
	{ mode: "edge", label: "Edge" },
	{ mode: "doubleEdge", label: "Double Edge" },
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

		const toggleRow = contentEl.createDiv({ cls: "prd-toggle-row" });
		for (const { mode, label } of TOGGLE_MODES) {
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

		const line = row.createDiv({ cls: "prd-history-line" });

		if (entry.kind === "power-roll") {
			const modeSuffix = entry.mode && entry.mode !== "none" ? ` (${modeLabel(entry.mode)})` : "";
			const dice = `🎲 ${entry.dieA} + ${entry.dieB}`;
			const modifierText =
				entry.modifier !== null
					? ` ${entry.modifier >= 0 ? "+" : ""}${entry.modifier}`
					: "";
			line.setText(
				`${entry.formulaText}${modeSuffix}: ${dice}${modifierText} = ${entry.total} — ${
					entry.tier ? tierLabel(entry.tier) : ""
				}`
			);
		} else {
			line.setText(`Saving Throw: 🎲 ${entry.dieA} — ${entry.success ? "Success" : "Failure"}`);
			line.addClass(entry.success ? "prd-history-success" : "prd-history-failure");
		}

		row.createDiv({
			text: new Date(entry.timestamp).toLocaleTimeString(),
			cls: "prd-history-time",
		});

		return row;
	}
}
