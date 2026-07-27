# Templates

A template is a complete look: tokens, chrome, and a component vocabulary. Core
supplies structure and motion mechanics and styles nothing that carries a look.

Contents: [Layers](#layers) · [Choosing one](#choosing-a-template) ·
[Adapting](#adapting-a-template) · [Authoring a new one](#authoring-a-new-template) ·
[What core owns](#what-core-owns)

## Layers

```
core/slides.css              structure · step states · primitives · reveal
                             mechanics · print · reduced motion
templates/<name>/theme.css   tokens · chrome · this template's components
deck.css                     this deck's overrides — starts near-empty
```

Loaded in that order; later files win by cascade, not by `!important`. Core
declares only `--stage-em`; **every other token is the template's job**. A deck
with no template loaded is unstyled by design.

## Choosing a template

Each template ships `template.md` with YAML frontmatter — `look`, `base`,
`texture`, `motion`, `best-for`, `avoid-for`. Read those, not the stylesheets,
and pick on fit. Copy the whole template directory into the deck.

If nothing fits, say so and author a new template rather than fighting an
existing one with overrides — a deck whose `deck.css` is longer than its theme
is a template that should have existed.

## Adapting a template

Change tokens first, and only tokens. The adjustable surface is listed in each
`template.md`; treat everything else as structure.

- Derive the accent from the deck's subject, not from taste. Keep one accent.
- Check every text/background pair for contrast after a token change,
  especially `--color-accent-ink` on `--color-accent`.
- Fonts: `node tools/fonts.mjs --display "…" --body "…"`, then repoint the
  `--font-*` tokens. Re-run `npm run qa` — composition can be metric-sensitive.
- Deck-specific one-offs go in `deck.css`. If a rule would be useful to the
  next deck using this template, it belongs in the theme instead.

## Authoring a new template

Copy an existing template directory and replace, in order:

1. **Tokens.** The whole adjustable surface, plus a `--dot-color` (or other
   texture) with the right polarity for the base.
2. **Chrome.** The frame, the title treatment, the cover treatment. This is
   what makes it recognisably a different template. Keep the *contract*: a
   recurring title must land at one Y on every content slide, and the cover
   must be able to centre without inheriting the title band.
3. **Components.** Restyle what the template needs. You may drop components
   you will not use, but do not rename shared ones — decks and the QA script
   look for `.slide-body`, `.reveal-words`, `.marker`, `.frame__tag`.
4. **`skeleton.html`.** Must render every archetype the template offers.
5. **`template.md`.** Frontmatter plus the adjustable surface, honestly
   described including what it is bad at.
6. **`fonts.json`.** Family + weights per role; no font binaries in the repo.

Then build a throwaway deck from it and run `npm run qa` before shipping it.

## What core owns

Do not move these into a template — a fix here must reach every template:

- the `.stage` / `.slide` geometry and the `data-step-state` styling hooks
- the starter layout primitives (`stack`, `cluster`, `split`, `grid`, `media`,
  `statistic`, `quote`, `code`, `full-bleed`, `card`, `slide-header/footer`)
- the reveal mechanics: `.w` word splitting, `word-in` and `marker-sweep`
  keyframes, the stepped-vs-automatic trigger pair and `--rv-delay`
- the `@media print` block
- the `prefers-reduced-motion` collapse

A template that needs different *mechanics* — not a different look — is a sign
core needs extending instead.
