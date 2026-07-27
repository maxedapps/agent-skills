---
template: dark-marker
look: Dark board with a subtle dot grid, a thick light frame that the slide title breaks through, hand-drawn corners and a marker-pen highlight.
base: dark
texture: dot grid
motion: word-by-word blur reveal, swept marker highlight, cross-slide title morph
best-for: Teaching and course material, recorded tutorials, explanatory b-roll
avoid-for: Formal corporate reporting, dense data tables, print-first handouts
fonts: Rubik (display) · Shantell Sans (body)
---

# dark-marker

## What it gives you

- **Broken frame chrome.** A thick `--color-frame` border inset from the stage
  edge; the slide title sits *in* the top rule, masking it. An eyebrow label can
  do the same on the cover.
- **Dot grid.** Viewport-relative, so density is identical at 1080p and 4K, and
  continuous *through* the title masks.
- **Hand-drawn geometry.** Irregular `border-radius` on cards, arrows drawn as
  wobbly beziers, a sketched circle for the "vs" badge.
- **Marker highlight.** `.marker` inline spans, swept on when revealed.

## Slide archetypes

| Class | Use |
|---|---|
| `.slide--cover` + `.cover` | Opening/closing, vertically centred |
| `.big-question` / `.big-statement` | Full-slide statement, optionally `.reveal-words` |
| `.frame__tag--title` + `.slide-body` | Standard content slide with a locked title band |
| `.flow` + `.flow__node` + `.flow__arrow` | Left-to-right process diagram |
| `.dial` + `.dial__station` | Cyclical process, stations on a ring |
| `.blocks` + `.block` | Grid of icon cards |
| `.levels` + `.level` | Escalating tiers, warming towards the accent |
| `.ways` + `.way` | Two or three side-by-side options |
| `.trace` + `.trace__row` | Numbered walkthrough with call chips |
| `.vs-pair` + `.vs-badge` | Two named things with a sketched "vs" between |
| `.axis` | Gradient trade-off rule under a row |
| `.payoff` / `.lede` | The line above or below a diagram |

After scaffolding the template, run `npm run dev` to see its slide archetypes rendered in `index.html`.

## Adjustable surface

Everything below is meant to be changed per deck. Anything *not* listed is
structure — change it in `deck.css`, not here.

```css
:root {
  --color-bg: #2b2e33;        /* board */
  --color-surface: #33373d;   /* cards */
  --color-border: #4d525a;    /* hairlines */
  --color-text: #f4f2ee;
  --color-muted: #b3b8c0;
  --color-accent: #ffc46b;    /* marker, arrows, emphasis */
  --color-accent-ink: #2b2e33;/* text ON the accent — must contrast with it */
  --color-frame: #f6f4f0;     /* the thick border */
  --dot-color: rgba(255, 255, 255, 0.09);
  --frame-border: calc(0.45 * var(--stage-em));
  --font-display: "Rubik", system-ui, sans-serif;
  --font-body: "Shantell Sans", system-ui, sans-serif;
  --motion-duration: 400ms;
  --motion-ease: cubic-bezier(0.22, 0.9, 0.35, 1);
}
```

Derived, not free:

- `--color-accent-ink` must stay legible **on** `--color-accent` — it is the
  text colour inside marker highlights and accent chips.
- `--dot-color` must flip polarity for a light board (dark dots on light).
- `--frame-border` must stay derived from `--stage-em`, never `em`. An `em`
  here resolves against each label's own font-size and the title stops sitting
  on the rule.

## Changing the fonts

```sh
node tools/fonts.mjs --display "Fraunces:400,700" --body "Inter:400,600"
```

then point `--font-display` / `--font-body` at the new families. Re-run
`npm run qa` afterwards: some composition is metric-sensitive (the morph scale
factor and `.big-statement`'s `max-width` assume the display face's proportions).
