# Power Roll Detector

Obsidian plugin for [Draw Steel](https://www.mcdmproductions.com/draw-steel).
It scans rendered notes for the text **"Power Roll + N"** and turns each match
into a clickable inline `2d10 + N` roller — no change to how your statblocks are
written. Built for use alongside
[Draw Steel Elements](https://github.com/SteelCompendium/obsidian-draw-steel-elements),
which renders `roll: Power Roll + N` statblock fields into plain text in Reading
view.

Independently written, but built on the same technique as
[RPG Detect Dice Roll](https://www.solorpgstudio.com) (`registerMarkdownPostProcessor`
+ `TreeWalker` text scanning), which handles literal `2d10+3` notation but not
Draw Steel's shorthand.

## Prerequisites

- **Obsidian ≥ 1.7.2**
- **[Draw Steel Elements](https://github.com/SteelCompendium/obsidian-draw-steel-elements)**
  — not required for detection (any plain "Power Roll + N" text is wrapped), but
  it's what renders statblock roll fields into notes, and the ability-name /
  monster-name context in roll history relies on its DOM structure
  (`.ds-feature-container`, `.ds-sb-container`). Without it, rolls still work but
  are logged without that context.

## Features

- Detects `Power Roll + N` (and `+ -N`) anywhere in rendered Markdown —
  statblocks, tables, callouts, prose. Only the numeric-modifier form; variants
  like `Power Roll + Reason, Intuition, or Presence` are left alone.
- Click (or focus + Enter/Space) to roll **2d10 + N**: two independent d10s,
  classified into Draw Steel's tiers (≤11 / 12–16 / 17+), shown in a toast with
  every term broken out.
- Rolls inside a Draw Steel Elements block also capture the ability name and the
  containing monster/character name for the history log.
- **Power Roll sidebar** (ribbon icon 🎲, "Open Power Roll history"):
  - **Edge / Bane toggles** — arm one for the *next* Power Roll or Test only,
    then it auto-clears. Edge +2, Bane −2; Double Edge/Bane shift the tier by one
    instead of a number.
  - **Roll a Test** — `2d10 + N` for characteristic/skill checks; type the
    modifier yourself. Respects the Edge/Bane toggle.
  - **Use Skill** — flat +2 to the next Test, stacks with Edge/Bane.
  - **Roll a Saving Throw** — flat 1d10, success on 6+. Ignores all toggles.
  - **Roll history** — last 20 rolls, newest first, with tier badge, term-by-term
    breakdown, and timestamp. A natural 19–20 (before modifiers) gets a gold
    border. Persists across restarts.

## Limitations

- Reading view only — no Live Preview / editing-mode detection.
- No settings pane; history limit, tier bands, and badge colors are fixed.
- No difficulty selector for Tests — the raw total and tier are shown for you to
  read against whatever table applies.

## Installation

### Recommended: BRAT

1. Install and enable the **BRAT** community plugin (Settings → Community plugins → Browse).
2. Run **BRAT: Add a beta plugin for testing** and add this repo: `zachhall/power-roll-detector`.
3. BRAT downloads `main.js`, `manifest.json`, and `styles.css` from the latest
   [release](../../releases) and enables the plugin. Run **BRAT: Check for
   updates to all beta plugins** to pull in future releases.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from a [release](../../releases).
2. Copy them into `<your vault>/.obsidian/plugins/power-roll-detector/`.
3. Reload Obsidian and enable **Power Roll Detector** under Settings → Community plugins.

## Building from source

```
npm install
npm run dev    # watch build
npm run build  # production build
```

`esbuild.config.mjs` writes `main.js` into this folder, so if the repo lives in
your vault's `.obsidian/plugins/` directory, no copy step is needed — just reload
Obsidian.

## License

MIT
