---
template: light-editorial
look: Warm paper, a serif display face, hairline rules instead of boxes, one rust accent used sparingly.
base: light
texture: none
motion: word-by-word reveal, printed-highlight sweep, cross-slide title morph
best-for: Talks, research readouts, reports, handouts, PDF-first decks
avoid-for: Neon product launches, dark-room keynotes, heavy diagram decks
fonts: Fraunces (display) + Inter (body)
---

# light-editorial

- **Hairline frame.** A thin box inset from the stage edge; the serif title
  breaks the top rule the same way the dark template does.
- **Paper surfaces.** Cards are near-white with a single hairline and a 0.2em
  radius — no shadows, no fills beyond a 6% accent tint.
- **Letterspaced labels.** Eyebrows, zone labels and verdict headings are set
  in small caps-style tracking in the body face.
- **Prints as designed.** No texture and no dark fields, so `npm run pdf`
  needs no special handling.

## Adjustable surface

```css
:root {
  --color-bg: #f7f3ea;        /* paper */
  --color-surface: #fffdf7;   /* cards */
  --color-border: #d5cdbc;    /* hairlines */
  --color-text: #221f1a;
  --color-muted: #6b6559;
  --color-accent: #a8431f;    /* rust */
  --color-accent-ink: #fdf8ef;/* text ON the accent */
  --color-frame: #c4baa6;
  --font-display: "Fraunces";
  --font-body: "Inter";
}
```

Everything else in `theme.css` is structure — change it in `deck.css`.

- Keep the accent dark enough to carry white ink: the marker sweep flips text
  to `--color-accent-ink` over a solid accent block.
- A serif display face sets tighter than a grotesk; re-check `.big-statement`
  wrapping after swapping it.
