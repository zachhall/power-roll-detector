# Power Roll Detector

An [Obsidian](https://obsidian.md) plugin for [Draw Steel](https://www.mcdmproductions.com/draw-steel) statblocks. It scans rendered notes for the text **"Power Roll + N"** and turns it into a clickable inline dice roller — no changes to how your statblocks are written or formatted.

Built for use alongside [Draw Steel Elements](https://github.com/SteelCompendium/obsidian-draw-steel-elements), which renders `roll: Power Roll + N` fields from `ds-statblock` code blocks into plain text in Reading view.

## What it does

- Detects `Power Roll + N` (and `Power Roll + -N`) anywhere it appears in rendered Markdown — statblocks, tables, callouts, plain paragraphs.
- Wraps each match in a styled, clickable/focusable span. Nothing else about the note changes.
- Click it (or focus + Enter/Space) to roll **2d10 + N**:
  - Rolls two independent d10s and sums them with the modifier.
  - Applies whichever Edge/Bane mode is currently armed in the sidebar (see below), then clears it.
  - Classifies the total into Draw Steel's power roll tiers (≤11 / 12–16 / 17+).
  - Shows the result in a toast notice, e.g. `Power Roll + 2 → 🎲 6 + 9 +2 = 17 (Tier 3: 17+)`.
  - If the roll happened inside a Draw Steel Elements ability block, the ability's name (e.g. "I Work Better Alone") is captured and shown alongside the roll in history.

### Power Roll sidebar

A ribbon icon (🎲, "Open Power Roll history") opens a sidebar view with:

- **Edge/Bane toggles** — Bane, Double Bane, Edge, Double Edge. Click one to arm it for the *next* Power Roll click only; it auto-clears once applied (click again to disarm manually). Only one can be armed at a time. Per Draw Steel's rules:
  - Edge: +2 to the roll.
  - Double Edge: no numeric bonus — the resulting tier is bumped up by one (capped at Tier 3).
  - Bane: −2 to the roll.
  - Double Bane: no numeric penalty — the resulting tier is dropped by one (floored at Tier 1).
- **Saving Throw button** — a flat, unmodified 1d10 roll (success on 6+, failure on 5 or lower). Always ignores the Edge/Bane toggle, matching Draw Steel's rules that edges/banes apply to power rolls specifically.
- **Roll history** — the most recent 20 rolls (power rolls and saving throws), newest first, each showing the ability name when available, the dice/modifier breakdown, the result, and a timestamp. Persists across Obsidian restarts.

## What it intentionally doesn't do (yet)

- No Live Preview / editing-mode support — detection only runs in Reading view (via `registerMarkdownPostProcessor`).
- No settings pane (history limit, tier bands, etc. are fixed).
- Ability-check variants like `Power Roll + Reason, Intuition, or Presence` are left alone — only the numeric-modifier form is matched.
- Ability-name context in history relies on Draw Steel Elements' `.ds-feature-container` / `.ds-feature-name-value` DOM structure; rolls outside that structure (plain prose, other renderers) are logged without a label.

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
- Ability-name context is found by walking up from the clicked span (`closest(".ds-feature-container")`) and reading `.ds-feature-name-value` inside it — the DOM structure Draw Steel Elements renders for each feature.
- Rolling uses `Math.random()` — this is a tabletop utility, not a cryptographic context.
- Roll history and the sidebar's `ItemView` (`view.ts`) are separate from the pure dice/tier math (`rolls.ts`), which has no DOM or Obsidian API dependency.
- History is persisted via Obsidian's standard `loadData()`/`saveData()` plugin-data API (`data.json`), capped at the most recent 20 entries.

## License

MIT
