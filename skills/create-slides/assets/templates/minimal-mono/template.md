---
template: minimal-mono
look: Ink on paper, one monospaced typeface, and rules instead of boxes — every panel is a line above its content.
base: light
texture: none
motion: word-by-word reveal, inverted-block highlight, cross-slide title morph
best-for: Research talks, austere technical decks, internal write-ups
avoid-for: Marketing decks, anything needing warmth or brand colour
fonts: JetBrains Mono (everything)
---

# minimal-mono

- **One rule of chrome.** The frame is a single line across the top; the title
  sits on it.
- **No boxes.** Cards, zones, verdicts and options are a rule above their
  content. Emphasis is a heavier rule, never a fill.
- **No colour.** `--color-accent` is full-strength ink, so the marker reads as
  an inverted block and the loop numbers as solid squares.
- **Caps carry hierarchy.** Labels are uppercase and letterspaced instead of
  coloured.

## Adjustable surface

```css
:root {
  --color-bg: #fbfbfa;        /* paper */
  --color-border: #c7c7c4;    /* the rules */
  --color-text: #16181a;      /* ink */
  --color-muted: #62666a;
  --color-accent: #16181a;    /* emphasis == ink */
  --color-accent-ink: #fbfbfa;/* text ON the accent block */
  --font-body: "JetBrains Mono";
}
```

Everything else in `theme.css` is structure — change it in `deck.css`.

- Monospace runs ~15% wider than a grotesk at the same size; the type scale is
  already reduced to compensate. Re-run `npm run qa` after raising it.
- Introducing a hue means changing `--color-accent` *and* checking every
  filled element — the template assumes accent and ink are the same colour.
