import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{ ignores: ["main.js", "tests/**", "esbuild.config.mjs"] },
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.*"],
				},
			},
		},
		rules: {
			// "Power Roll" and "Saving Throw" are Draw Steel's own game terms
			// (this plugin's whole reason to exist), capitalized consistently
			// everywhere in the UI and docs -- not sentence-case violations.
			"obsidianmd/ui/sentence-case": [
				"warn",
				{
					ignoreWords: ["Power", "Roll", "Saving", "Throw"],
				},
			],
		},
	},
]);
