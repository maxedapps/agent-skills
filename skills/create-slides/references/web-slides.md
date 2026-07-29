# Deck Contract

How the copied runtime works and where you may extend it. Everything about the
runtime below is covered by `scripts/slides-runtime.test.mjs` — docs and tests
agree.

Contents: [DOM and state](#dom-and-state-contract) · [Navigation](#navigation) ·
[Runtime API](#runtime-api) · [URL routing](#url-routing-opt-in) ·
[CSS layers](#css-layers-and-tokens) ·
[Composition](#composition-contract) · [Reveals](#reveals) ·
[Accessibility](#accessibility) · [Extend vs rebuild](#extend-vs-rebuild)

## DOM and state contract

- Slides are `<section class="slide">` inside `.stage`, presented in DOM order.
  Content lives entirely in HTML.
- Every slide composes inside `.frame` → `.frame__inner`. The frame owns the
  inset and padding; the slide itself is a bare canvas.
- Stepped nodes opt in with positive-integer `data-enter` / `data-exit`
  (`"1"`, `"2"`, …; zero, negatives, floats and non-numeric values are ignored).
  - `data-enter="n"`: hidden (`before`) while step < n, then `active`.
  - `data-exit="n"`: `exited` from step >= n. Exit-only nodes start visible.
  - Equal values group nodes: they change together on one keypress.
  - **Invalid pair rule:** if a node has both and exit <= enter, BOTH are
    ignored — it behaves as unstepped and adds nothing to the slide's final step.
- A slide's final step is the maximum valid value across its nodes, or 0.
- The runtime writes the state that CSS styles against — never set these by hand:
  slides get `data-state="current"|"hidden"`, `aria-hidden` and `inert`; stepped
  nodes get `data-step-state="before"|"active"|"exited"`.
- Rendering is a pure function of (slide, step). No per-slide history; hidden
  slides render at step 0.
- `data-slide="slug"` is optional and used only by timed video exports
  ([export.md](export.md)).

## Navigation

- ArrowRight/Down: one step forward, then the next slide at step 0.
- ArrowLeft/Up: one step back; crossing a boundary opens the previous slide at
  its final step.
- Shift+Arrow: jump a whole slide. Never wraps at either end.
- Ignores non-arrow keys, IME composition, Ctrl/Alt/Meta combos, and keystrokes
  in inputs, textareas, selects and contenteditable targets.

## Runtime API

`core/slides.js` is a classic script (no modules) that auto-initializes on load
and works over `file://`. It exposes `SlidesRuntime` on `globalThis`: the pure
helpers `parseStep`, `stepPair`, `nodeState`, `finalStep`, `reduce`,
`actionForKey`, `renderModel` (invalid input yields `null` fields rather than
throwing), plus `init(root)` returning a controller with `getState()`,
`finalSteps`, `send(action)` — `next`/`prev`/`nextSlide`/`prevSlide` — and
`destroy()`.

The auto-initialized controller is `SlidesRuntime.controller`; drive the deck
from the console or from automation through it. Never call `init()` twice on one
document — that registers a competing key listener with its own state. A guarded
CommonJS export lets Node `require()` the same file for tests.

## URL routing (opt-in)

Off by default — see [Constraints](../SKILL.md#constraints). When the user does
ask for deep links, copy `assets/optional/router.js` to `core/` and load it
after `slides.js` and `morph.js`. Do not write a new one.

`#4` is the fourth slide, 1-based. It exposes `SlidesRouter.goTo(n)`, which
makes screenshotting a specific slide a one-liner in QA and export tooling.

Five things this gets right, each of which is easy to get wrong:

- **Jumps are instant, not animated.** Stepping the controller from slide 2 to
  slide 30 sends ~28 actions, but they all land in one task, so intermediate
  slides are never styled and only the destination is painted.
- **A deep link must not replay a morph.** Landing directly on a morph target's
  slide would otherwise transition it in from the parked position with no
  source ever on screen. The router adds `.is-jumping` to `<html>`, which core
  uses to suppress transitions, and removes it on the *second* rAF: frame one
  is painted with the class on, frame two takes it off with values already
  settled, so nothing starts. Removing it on the first rAF re-animates
  everything — rAF runs *before* style recalc for that frame.
- **Entrance animations are left alone.** Only transitions are suppressed. A
  deep link to a scatter slide should still see the tiles drift in; that motion
  belongs to the slide, not to the move.
- **Steps stay out of the hash.** A history write per keypress hits browser
  rate limits, and `#12.3` is rarely what someone wants to share anyway.
- **Writes never re-enter.** `history.replaceState` fires no `hashchange`, so
  the write path and the read path can't loop. Writes are coalesced into one
  rAF, and `replaceState` (not `pushState`) keeps arrow keys out of the back
  stack.

If the deck must resolve slugs rather than indices, note that `data-slide` is
the timed-export handle ([export.md](export.md)) and only exists on timed
slides — either name every slide or keep the router numeric.

## CSS layers and tokens

```
core/slides.css              structure · step states · reveal presets ·
                             archetype layout · print · reduced motion
templates/<name>/theme.css   tokens · chrome · the look of the archetypes
deck.css                     this deck's overrides — starts near-empty
```

Loaded in that order; later files win by cascade, never by `!important`. Core
declares only `--stage-em`; every other token is the template's job, so a deck
with no template loaded is unstyled by design. The full token contract is in
[templates.md](templates.md).

The `.stage` is a responsive 16:9 surface whose `font-size` scales with the
viewport, and everything inside is sized in `em` — composition is identical at
any window size and at any export resolution. Keep new sizes in `em` or tokens.

## Composition contract

Two rules make a deck feel built rather than assembled, and `npm run qa`
enforces both:

1. **One title Y.** `.frame__tag` is positioned by core, centred on the frame's
   top line. Templates restyle it; they never reposition it. Both the eyebrow
   (`.frame__tag`) and the content title (`.frame__tag--title`) therefore land
   at the same Y on every slide.
2. **Body fits and is centred.** `.slide-body` inside `.frame__inner--center`
   sits vertically centred in the frame and must not overflow it. Content-sized
   modules with comfortable gaps — never `flex: 1` on a card to fill the stage.

Archetypes shipped by every template — compose these before inventing CSS:

| Class | Use |
|---|---|
| `.cover` (+ `.slide--cover`) | Opening/closing, vertically centred |
| `.big-question` / `.big-statement` | Full-slide statement, usually `.reveal-words` |
| `.frame__tag--title` + `.slide-body` | Standard content slide |
| `.flow` + `.flow__node` + `.flow__arrow` | Left-to-right process (`--loop` variant for a repeating stage) |
| `.blocks` + `.block` | Grid of icon cards |
| `.levels` + `.level` (`--mid`, `--top`) | Escalating tiers |
| `.ways` + `.way` (+ `.ways--three`) | Two or three side-by-side options |
| `.trace` + `.trace__row` | Numbered walkthrough |
| `.zones` + `.zone` (+ `.zone__wire`) | Two panels and what passes between them |
| `.verdicts` + `.verdict` (`--yes`) | The wrong reading, then the right one |
| `.vs-pair` + `.vs-badge` | Two named things |
| `.scatter` + `.tool` | Hand-placed logos or tiles |
| `.chips` / `.chip`, `.axis`, `.payoff`, `.lede` | Supporting rows and lines |
| `stack` `cluster` `split` `grid` `media` `statistic` `quote` `code` `card` `full-bleed` `slide-header/footer` | Generic primitives |

## Reveals

`data-reveal` on `.stage` sets the deck's motion; the same attribute on any node
overrides it for that node and its descendants:

| Preset | Motion | Good for |
|---|---|---|
| `rise` | fade + lift (default) | general use |
| `fade` | opacity only | text-heavy, calm decks |
| `zoom` | scale 0.96 → 1 | card and icon grids |
| `slide` | enter from the left | sequences, timelines |
| `blur` | 8px defocus + fade | statements, covers |

Presets set custom properties only (`--enter-x/y`, `--enter-scale`,
`--word-*`), so they cost nothing and collapse together under reduced motion.

**One-step staggered reveals** (the default for recorded video): give every body
node `data-enter="1"` and stagger with `--stagger: 0|1|2…`, which core turns into
a transition delay. The slide still has exactly one step — stagger is visual, and
never adds a keypress. Reach for `data-enter="2"`+ only when the speaker wants
another keypress.

## Accessibility

- Keyboard operation is the primary interface; the runtime already leaves
  editable targets and modified keys alone.
- The runtime manages `aria-hidden`/`inert` — don't fight it.
- Keep the semantics: one `h1` on the cover, `h2` per slide title, real lists,
  figures and blockquotes, meaningful `aria-label` per slide, alt text on
  images and informative SVG.
- Template token pairs meet WCAG AA; re-check contrast after changing any
  colour token, and keep the `:focus-visible` outline.

## Extend vs rebuild

- **Edit freely:** `index.html`, the template's tokens, anything in `deck.css`.
- **Never rebuild** `core/slides.js` navigation, key handling or the attribute
  contract; never add libraries, modules or a build step; never set
  `data-state`/`data-step-state`/`aria-hidden`/`inert` by hand.
- Layer new behaviour on `SlidesRuntime.controller` from your own listener, the
  way `core/morph.js` does. If the runtime itself must change, mirror it in
  `scripts/slides-runtime.test.mjs`.
- `npm run qa` is the gate: navigation, preset names, title lock, body fit and
  centring, reduced motion, small viewport, console and network. Run it before
  reporting any deck finished.
