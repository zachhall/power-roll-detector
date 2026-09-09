# Power Roll Detector

An [Obsidian](https://obsidian.md) plugin for [Draw Steel](https://www.mcdmproductions.com/draw-steel) statblocks. It scans rendered notes for the text **"Power Roll + N"** and turns it into a clickable inline dice roller — no changes to how your statblocks are written or formatted.

Built for use alongside [Draw Steel Elements](https://github.com/SteelCompendium/obsidian-draw-steel-elements), which renders `roll: Power Roll + N` fields from `ds-statblock` code blocks into plain text in Reading view.

## What it does

- Detects `Power Roll + N` (and `Power Roll + -N`) anywhere it appears in rendered Markdown — statblocks, tables, callouts, plain paragraphs.
- Wraps each match in a styled, clickable/focusable span. Nothing else about the note changes.
- Click it (or focus + Enter/Space) to roll **2d10 + N**:
  - Rolls two independent d10s and sums them with the modifier.
  - Classifies the total into Draw Steel's power roll tiers (≤11 / 12–16 / 17+).
  - Shows the result in a toast notice, e.g. `Power Roll + 2 → 🎲 6 + 9 +2 = 17 (Tier 3: 17+)`.
- Each click is an independent fresh roll — nothing is persisted or written back to the note.

## What it intentionally doesn't do (yet)

- No Live Preview / editing-mode support — detection only runs in Reading view (via `registerMarkdownPostProcessor`).
- No settings pane, roll history, or advantage/disadvantage menu.
- Ability-check variants like `Power Roll + Reason, Intuition, or Presence` are left alone — only the numeric-modifier form is matched.

## Installation

Not yet on the Obsidian community plugin registry. To install manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from a [release](../../releases) (or build from source, below).
2. Copy them into `<your vault>/.obsidian/plugins/power-roll-detector/`.
3. Reload Obsidian and enable **Power Roll Detector** under Settings → Community plugins.

## Building from source

```bash
npm install
npm run dev    # esbuild watch mode, rebuilds main.js on save
npm run build  # one-off production build (minified)
```

`esbuild.config.mjs` writes `main.js` directly into this folder, so if this repo lives inside your vault's `.obsidian/plugins/` directory (as it does in the original setup), no copy step is needed — just reload Obsidian after a build.

## How it works

- A `MarkdownPostProcessor` walks the rendered DOM of each note with a `TreeWalker`, looking at text nodes (skipping `code`, `pre`, `a`, `button`, and form elements to avoid touching other interactive content).
- Matches against `/Power Roll\s*\+\s*(-?\d+)/gi`; the captured modifier is stored on the resulting span's `data-modifier` attribute so the click handler never has to re-parse text.
- Rolling uses `Math.random()` — this is a tabletop utility, not a cryptographic context.

## License

MIT
