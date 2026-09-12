import { App, PluginSettingTab, Setting } from "obsidian";
import type PowerRollDetectorPlugin from "./main";

export type SidebarOpenBehavior = "always" | "ifOpen" | "never";

export const DEFAULT_SIDEBAR_OPEN_BEHAVIOR: SidebarOpenBehavior = "always";

export class PowerRollDetectorSettingTab extends PluginSettingTab {
	plugin: PowerRollDetectorPlugin;

	constructor(app: App, plugin: PowerRollDetectorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Sidebar on power roll")
			.setDesc("What happens to the Power Roll sidebar when you click an inline Power Roll.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("always", "Always open")
					.addOption("ifOpen", "Only if already open")
					.addOption("never", "Never open automatically")
					.setValue(this.plugin.sidebarOpenBehavior)
					.onChange(async (value) => {
						this.plugin.sidebarOpenBehavior = value as SidebarOpenBehavior;
						await this.plugin.saveSettings();
					})
			);
	}
}
