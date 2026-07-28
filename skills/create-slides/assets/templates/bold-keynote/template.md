---
template: bold-keynote
look: No frame, no texture, no hairlines — solid colour fields, very large type and one saturated accent that fills panels instead of outlining them.
base: dark
texture: none
motion: word-by-word reveal, painted-block highlight, cross-slide title morph
best-for: Pitches, launches, conference keynotes, short high-contrast decks
avoid-for: Dense diagrams, reference decks, anything read from a laptop
fonts: Sora (display) + Manrope (body)
---

# bold-keynote

- **No chrome.** `--frame-border: 0`; the frame is an invisible margin that
  still locks every title to one Y.
- **Solid fields.** The cover is one accent field, and accent variants of the
  archetypes (`--loop`, `--top`, `--accent`, `--yes`) are filled, not tinted.
- **Very large type.** `--text-cover` at 6.4em and a 3em `.big-statement`;
  plan on far fewer words per slide than the other templates.
- **Hard edges.** Every radius is 0.

## Adjustable surface

```css
:root {
  --color-bg: #17141f;        /* field */
  --color-surface: #241e33;   /* panels */
  --color-text: #fdf7f2;
  --color-muted: #b9aec6;
  --color-accent: #ff5f3d;    /* the field colour */
  --color-accent-ink: #1c0c06;/* text ON the accent */
  --font-display: "Sora";
  --font-body: "Manrope";
}
```

Everything else in `theme.css` is structure — change it in `deck.css`.

- The accent is a *background* here, not an outline: it must carry
  `--color-accent-ink` at AA on large text.
- Cut copy before shrinking the type. This template fails loudly on long
  paragraphs, which is the point.
