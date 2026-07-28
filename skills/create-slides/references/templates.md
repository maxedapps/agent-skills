# Templates

A template is a complete look: tokens, chrome, and the surface treatment of the
shared archetypes. Core supplies structure, layout and motion mechanics and
styles nothing that carries a look, so every template renders the same
`skeleton.html` and any deck can be re-skinned by swapping `theme.css`.

Contents: [The lineup](#the-lineup) · [Choosing](#choosing-one) ·
[Token contract](#token-contract) · [Adapting](#adapting-a-template) ·
[Authoring a new one](#authoring-a-new-template)

## The lineup

| Template | Look | Base | Best for |
|---|---|---|---|
| `dark-marker` | Dot-grid board, thick broken frame, hand-drawn corners, marker highlight | dark | Courses, tutorials, explanatory b-roll |
| `light-editorial` | Warm paper, serif display, hairline rules, rust accent | light | Talks, readouts, reports, PDF-first decks |
| `midnight-tech` | Grid board, bracketed frame, squared corners, mono labels, cyan | dark | Developer content, architecture, product demos |
| `bold-keynote` | No chrome, solid colour fields, very large type | dark | Pitches, launches, stage keynotes |
| `minimal-mono` | Ink on paper, one mono typeface, rules instead of boxes | light | Research talks, austere technical decks |

Each ships `theme.css`, `fonts.json` and a `template.md` whose frontmatter
carries `look`, `base`, `texture`, `motion`, `best-for`, `avoid-for`, `fonts`.

## Choosing one

**Ask the user which look they want** when starting a new deck, unless they
named one or supplied brand direction that settles it. Offer the table above —
one line each, not a lecture — and say which you would pick for their subject
and delivery mode. Then copy that template's three files into the deck.

If nothing fits, say so and author a new template rather than fighting an
existing one with overrides. A deck whose `deck.css` outgrows its theme is a
template that should have existed.

## Token contract

Core reads these and defines none of them except `--stage-em`. A template must
declare every one:

| Group | Tokens |
|---|---|
| Colour | `--color-bg` `--color-surface` `--color-border` `--color-text` `--color-muted` `--color-accent` `--color-accent-ink` `--color-frame` |
| Frame | `--frame-inset-y` `--frame-inset-x` `--frame-border` `--frame-pad-y` `--frame-pad-x` `--frame-tag-x` |
| Type | `--font-display` `--font-body` `--font-mono` `--text-sm` `--text-base` `--text-lg` `--text-xl` `--text-2xl` `--text-title` `--text-cover` `--leading-tight` `--leading-body` |
| Space | `--space-2xs` `--space-xs` `--space-sm` `--space-md` `--space-lg` `--space-xl` |
| Shape | `--rule` `--radius` `--radius-card` `--radius-chip` `--radius-tile` |
| Motion | `--motion-duration` `--motion-ease` |

Derived, not free:

- `--color-accent-ink` must be legible **on** `--color-accent`: it is the text
  colour inside marker highlights and filled accent panels.
- `--frame-border` must derive from `--stage-em`, never `em`. An `em` here
  resolves against each label's own font-size and the title stops sitting on the
  frame line. `0px` is fine for a frameless template.
- `.big-question` and `.frame__tag--title` must stay geometrically similar —
  same family, weight, tracking, line-height and `em` padding — or the title
  morph jumps. Every shipped template sets both together.
- Any texture must be `background-attachment: fixed` and viewport-relative, and
  must be repeated on `.frame__tag` and `.frame__tag--morph::before`, or the
  label masks show as mismatched patches.

## Adapting a template

Change tokens first, and only tokens; each `template.md` lists its adjustable
surface. Treat everything else as structure and put deck-specific one-offs in
`deck.css` — if a rule would help the next deck on this template, it belongs in
the theme instead.

- Derive the accent from the deck's subject, not from taste. Keep one accent.
- Re-check contrast after any colour change, especially accent-ink on accent.
- Fonts: `node tools/fonts.mjs --display "Family:400..700" --body "Family:400..600"`,
  then repoint the `--font-*` tokens. Prefer families with a variable weight
  range — a static family inlines one weight and the rest are faked.
- Re-run `npm run qa` afterwards: composition is metric-sensitive.

## Authoring a new template

Copy the closest existing directory and replace, in order:

1. **Tokens** — the whole contract above, plus any texture variable.
2. **Chrome** — frame, title treatment, cover treatment. This is what makes it
   recognisably different. Keep the contract: `.frame__tag` stays where core
   puts it, and the cover must centre without inheriting the title band.
3. **Component looks** — restyle archetypes through their existing class names.
   Never rename them: decks, the skeleton and `qa.mjs` all depend on them.
4. **`fonts.json`** — family + weights per role; no font binaries in the repo.
5. **`template.md`** — frontmatter plus the adjustable surface, honestly
   described including what it is bad at.

Then scaffold a throwaway deck from `assets/skeleton.html`, run
`node tools/fonts.mjs`, and pass `npm run qa` before shipping it. A template
that needs different *mechanics* rather than a different look is a sign core
needs extending — see [web-slides.md](web-slides.md).
