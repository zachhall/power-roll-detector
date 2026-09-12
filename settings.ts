import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
import type PowerRollDetectorPlugin from "./main";

export type SidebarOpenBehavior = "always" | "ifOpen" | "never";

export const DEFAULT_SIDEBAR_OPEN_BEHAVIOR: SidebarOpenBehavior = "always";

/**
 * Settings tab rendering, via Obsidian's declarative settings API
 * (getSettingDefinitions(), added in 1.13.0 -- this plugin's declared
 * minAppVersion). `display()` -- the pre-1.13.0 imperative override -- is
 * deliberately not implemented: every client that can run this plugin has
 * the declarative API, so it would never be called.
 */
export class PowerRollDetectorSettingTab extends PluginSettingTab {
	plugin: PowerRollDetectorPlugin;

	constructor(app: App, plugin: PowerRollDetectorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Sidebar on power roll",
				render: (setting) => this.renderSidebarOpenBehavior(setting),
			},
		];
	}

	private renderSidebarOpenBehavior(setting: Setting): void {
		setting
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
