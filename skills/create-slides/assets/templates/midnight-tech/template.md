---
template: midnight-tech
look: Near-black board with a faint engineering grid, a bracketed frame, squared corners, monospaced labels and one cyan accent.
base: dark
texture: grid lines
motion: word-by-word reveal, selection-block highlight, cross-slide title morph
best-for: Developer content, architecture and systems talks, product demos
avoid-for: Warm brand decks, print handouts, non-technical audiences
fonts: Space Grotesk (display) + IBM Plex Sans (body) + JetBrains Mono (labels)
---

# midnight-tech

- **Grid board.** Viewport-anchored 1px grid, so it stays a hairline at any
  export resolution and lines up through the label masks.
- **Bracketed frame.** Accent corner brackets on the frame read as a viewport
  rather than a picture frame.
- **Monospaced micro-labels.** Eyebrow, chips, zone labels, trace numbers and
  the axis all sit in `--font-mono`; the titles stay in the grotesk.
- **Squared corners.** One 0.25em radius everywhere, hairline borders.

## Adjustable surface

```css
:root {
  --color-bg: #0b0f14;        /* board */
  --color-surface: #141b24;   /* cards */
  --color-border: #26313f;
  --color-text: #e7eef7;
  --color-muted: #93a4b8;
  --color-accent: #3ad6c8;    /* cyan */
  --color-accent-ink: #04191c;/* text ON the accent */
  --color-frame: #2b3a4c;
  --grid-color: rgba(150, 200, 255, 0.05);
  --font-display: "Space Grotesk";
  --font-body: "IBM Plex Sans";
  --font-mono: "JetBrains Mono";
}
```

Everything else in `theme.css` is structure — change it in `deck.css`.

- Keep `--grid-color` under ~6% alpha: a stronger grid survives the video
  encoder as visible banding.
- The accent carries dark ink; a pastel accent breaks the marker sweep.
