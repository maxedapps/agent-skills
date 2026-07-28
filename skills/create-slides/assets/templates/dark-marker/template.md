---
template: dark-marker
look: Dark board with a subtle dot grid, a thick light frame the slide title breaks through, hand-drawn corners and a marker-pen highlight.
base: dark
texture: dot grid
motion: word-by-word blur reveal, swept marker highlight, cross-slide title morph
best-for: Teaching and course material, recorded tutorials, explanatory b-roll
avoid-for: Formal corporate reporting, dense data tables, print-first handouts
fonts: Rubik (display) + Shantell Sans (body)
---

# dark-marker

- **Broken frame.** A thick `--color-frame` border inset from the stage edge;
  the title sits *in* the top rule and masks it. The cover eyebrow does the same.
- **Dot grid.** Viewport-anchored, so its density is identical at 1080p and 4K
  and it runs continuously *through* the label masks.
- **Hand-drawn geometry.** No two card corners share a radius; alternate cards
  take `--radius-card-alt`.
- **Marker highlight.** `.marker` spans, swept on when revealed.

## Adjustable surface

```css
:root {
  --color-bg: #2b2e33;        /* board */
  --color-surface: #33373d;   /* cards */
  --color-border: #4d525a;    /* hairlines */
  --color-text: #f4f2ee;
  --color-muted: #b3b8c0;
  --color-accent: #ffc46b;    /* marker, arrows, emphasis */
  --color-accent-ink: #2b2e33;/* text ON the accent */
  --color-frame: #f6f4f0;     /* the thick border */
  --dot-color: rgba(255, 255, 255, 0.09);
  --font-display: "Rubik";
  --font-body: "Shantell Sans";
}
```

Everything else in `theme.css` is structure — change it in `deck.css`.

- `--color-accent-ink` must stay legible **on** `--color-accent`.
- `--dot-color` flips polarity for a light board (dark dots on light).
- `--frame-border` must derive from `--stage-em`, never `em`, or the title
  stops sitting on the rule.
