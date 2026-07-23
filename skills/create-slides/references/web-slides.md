# Web Slides: Starter Contract and Techniques

How the copied starter (`index.html`, `slides.css`, `slides.js`, plus
optionally one `theme-*.css` override) works and where you may extend it. The runtime behavior below is covered by
`scripts/slides-runtime.test.mjs` — documentation and tests agree.

Contents: [DOM and state contract](#dom-and-state-contract) ·
[Navigation](#navigation) · [Runtime API](#runtime-api) ·
[CSS structure](#css-structure) ·
[Layout implementation notes](#layout-implementation-notes) ·
[Motion](#motion-and-choreography) ·
[One-step staggered reveals](#one-step-staggered-reveals) ·
[Responsive and print](#responsive-and-print) ·
[Accessibility](#accessibility) · [Extend vs rebuild](#extend-vs-rebuild) ·
[Browser QA checklist](#browser-qa-checklist)

## DOM and state contract

- Slides are `<section class="slide">` elements inside `.stage`, presented
  in DOM order. Content lives entirely in HTML.
- Stepped nodes opt in with positive-integer `data-enter` and/or
  `data-exit` attributes (`"1"`, `"2"`, …; zero, negatives, floats, and
  non-numeric values are ignored).
  - `data-enter="n"`: hidden (`before`) while step < n, then `active`.
  - `data-exit="n"`: `exited` from step >= n. Exit-only nodes start visible.
  - Equal values on several nodes group them: they change together.
  - **Invalid pair rule:** if a node has both and exit <= enter, BOTH
    attributes are ignored — the node behaves as unstepped (always visible
    on its slide) and adds nothing to the slide's final step.
- A slide's final step is the maximum valid enter/exit value across its
  nodes, or 0 when none exist. Step 0 is the initial state.
- The runtime writes state the CSS styles against — never set these
  attributes manually:
  - slides: `data-state="current"|"hidden"`, `aria-hidden`, and `inert`
    (hidden slides are removed from focus and interaction order);
  - stepped nodes: `data-step-state="before"|"active"|"exited"`.
- Rendering is a pure function of (current slide, current step); there is
  no per-slide history, and hidden slides render at step 0.

## Navigation

- ArrowRight/ArrowDown: one step forward, then the next slide at step 0.
- ArrowLeft/ArrowUp: one step back; crossing a boundary opens the previous
  slide at its final step.
- Shift+Arrow: jump — next slide at step 0, or previous slide at its final
  step. If the target slide does not exist, slide and step stay unchanged.
- Never wraps. Ignores non-arrow keys, IME composition, Ctrl/Alt/Meta
  combinations, and keystrokes in inputs, textareas, selects, or
  contenteditable targets.

## Runtime API

`slides.js` is a classic script (no modules) that auto-initializes on load
and also works via `file://`. It exposes `SlidesRuntime` on `globalThis`
with pure helpers — `parseStep(attrValue)`, `stepPair(enterAttr, exitAttr)`,
`nodeState(step, pair)`, `finalStep(pairs)`, `reduce(state, action,
finalSteps)`, `actionForKey(event)`, `renderModel(state, deck)`; invalid
attribute values yield `null` fields rather than throwing, so check inputs
when verifying programmatically — plus `init(root)`, which returns a
controller: `getState()`, `finalSteps`, `send(action)` with actions
`next`/`prev`/`nextSlide`/`prevSlide`, and `destroy()`. A guarded CommonJS
export lets Node `require()` the same file for tests. In the browser the
auto-initialized controller is exposed as `SlidesRuntime.controller` — use
it from the console or automation to drive the deck programmatically, and
never call `init()` a second time on the same document (that would register
a competing key listener with its own state).

## CSS structure

- All theming flows through `:root` tokens: colors, `--font-*`, `--text-*`
  scale, `--space-*` scale, `--radius`, `--motion-duration`,
  `--motion-ease`. Restyle a deck by changing tokens first.
- A shipped theme file (`theme-technical.css`, `theme-corporate.css`, or
  `theme-playful.css`) is linked AFTER `slides.css`, so its `:root` block
  overrides the base tokens purely by cascade order, plus at most a few
  personality rules. Adapt a copied theme's tokens like any others; without
  a theme link the neutral base applies.
- The `.stage` is a responsive 16:9 surface; its `font-size` scales with
  the viewport and everything inside is sized in `em`, so composition is
  identical at any window size. Keep new sizes in `em`/tokens.
- Layout primitives (`stack`, `cluster`, `split`, `grid`, `media`,
  `statistic`, `quote`, `code`, `full-bleed`, `card`, `slide-header`,
  `slide-footer`) are composable classes — combine them before writing new
  layout CSS.
- Chrome (`slide-header`, `slide-footer`) is absolutely positioned inside
  the slide, so it renders at identical coordinates on every slide
  regardless of content height. Use it for recurring titles, credits, or
  page context if the deck wants them — optional, never required — and
  restyle the minimal muted default freely. Chrome may carry
  `data-enter`/`data-exit` and then participates in stepping automatically.
  On `full-bleed` slides chrome overlaps the bleed — omit it there or
  accept the overlay deliberately.
- Visibility states are styled via `.slide[data-state="current"]` and
  `[data-step-state="..."]` selectors; add per-deck overrides on those same
  hooks.

## Layout implementation notes

The starter centers each `.slide` (`justify-content: center`). That is fine
for simple sample slides and for **`cover-center`**. It is the wrong default
for content slides that need a locked title position.

### Title band + body (content slides)

Typical structure:

```html
<section class="slide">
  <header class="slide-heading">
    <p class="eyebrow">…</p>
    <h2>…</h2>
  </header>
  <div class="slide-body">…</div>
  <footer class="slide-footer">…</footer>
</section>
```

Theme/override CSS pattern:

- `.slide { justify-content: flex-start; }` for content slides (not cover).
- `.slide-heading` fixed height (room for eyebrow + two-line title).
- `.slide-body { flex: 1; display: flex; flex-direction: column; }` with
  either `justify-content: flex-start` + top padding (**body-upper**) or
  `justify-content: center` (**body-center-remaining**).
- Body children stay `flex: 0 0 auto` — content-sized. Do not set
  `flex: 1` / `height: 100%` on cards merely to fill the stage.
- Equal-height cards inside one grid/split row: stretch items to the row’s
  content height only.

### Cover center

Keep cover as its own shell (often `position: absolute; inset: 0` inside a
padding-less `.slide--cover`) with `justify-content: center`. Do not reuse
the content title-band on the cover unless the art direction says so.

## Motion and choreography

- Motion is purposeful pacing, not spectacle: reveal to direct attention,
  exit to clear it. Animate `opacity` and transforms (`translate`) only —
  they are compositable and cheap; never animate layout properties.
- Tune globally via `--motion-duration`/`--motion-ease`, or per element
  with more specific `[data-step-state]` rules (e.g. a larger translate for
  a hero element).
- For one-off emphasis beyond state transitions, the native Web Animations
  API (`element.animate(...)`) is an acceptable extension: keep it
  transform/opacity, cancellable, and gated behind a
  `matchMedia('(prefers-reduced-motion: reduce)')` check.
- Reduced motion: the starter's media query removes transitions and
  translation so every state change is an instant opacity flip. Any motion
  you add must collapse the same way — same content states, no movement.

## One-step staggered reveals

When the art direction is **one-step staggered** (common for video):

1. Leave titles/eyebrows unstepped (visible at step 0) unless the cover
   deliberately reveals subtitle lines.
2. Put `data-enter="1"` on every body node that should appear together.
3. Stagger **only** with CSS delay, e.g. `--stagger: 0|1|2` on nodes and:

```css
[data-enter][data-step-state="active"] {
  transition-delay: calc(var(--stagger, 0) * 70ms);
}
@media (prefers-reduced-motion: reduce) {
  [data-enter][data-step-state="active"] { transition-delay: 0ms !important; }
}
```

4. Expect each content slide’s `finalStep` to be `1` (plus cover/close if
   they also use a single enter step). Do not use `data-enter="2"`+ unless
   the speaker truly wants another keypress.

Equal `data-enter` values already group in the runtime; stagger is visual
only and must not require extra navigation steps.

## Responsive and print

- The stage letterboxes to 16:9 at any viewport; verify legibility at a
  small window, not just full screen.
- The starter is screen-first. If the user needs print/PDF, add an
  `@media print` block that makes each `.slide` static, visible, and one
  per page (`position: static; opacity: 1; visibility: visible;
  break-after: page`) with all stepped nodes shown.

## Accessibility

- Keyboard operation is the primary interface — preserve it. The runtime
  already leaves editable targets and modified keys alone.
- The runtime manages `aria-hidden`/`inert`; keep interactive content out
  of hidden slides' tab order by not fighting those attributes.
- Keep semantic structure: one `h1` on the cover, `h2` per slide title,
  real lists/figures/blockquotes; write meaningful `aria-label`s on slides
  and alt text on images/SVG figures.
- The starter's token pairs meet WCAG AA contrast; re-check contrast
  whenever you change color tokens. Keep the `:focus-visible` outline.

## Extend vs rebuild

- **Edit freely:** `index.html` content and structure; `slides.css` tokens,
  primitive tweaks, new deck-specific classes and `[data-step-state]`
  overrides; a copied `theme-*.css` file's tokens and personality rules.
- **Do not rebuild:** `slides.js` navigation, key handling, or the
  attribute contract above. Do not add libraries, modules, or a build step,
  and never manage `data-state`/`data-step-state`/`aria-hidden`/`inert` by
  hand.
- Only when the user explicitly requests different navigation behavior may
  `slides.js` change; prefer layering on the exposed controller
  (`SlidesRuntime.controller.send(...)` from your own listener) over
  editing the reducer, and mirror any real runtime change in the skill's
  `scripts/slides-runtime.test.mjs`.

## Browser QA checklist

Before browser QA (or when no browser is at hand yet), you can verify the
deck's step map headlessly: `require()` the copied `slides.js` in Node and
feed each node's attribute strings through `stepPair`/`finalStep` to
confirm every slide's expected final step and grouping.

### Runtime

Run in a real browser (e.g. `agent-browser`) on the finished deck:

- ArrowRight/ArrowDown through every step of every slide to the end; then
  ArrowLeft/ArrowUp all the way back — each reveal, group, and exit fires
  at the intended step; boundaries land on the previous slide's final step.
- Shift+ArrowRight and Shift+ArrowLeft across slides — direct jumps; at the
  first/last slide nothing changes (no wrap).
- Console has no errors or warnings from the deck.
- Recurring chrome (`slide-header`/`slide-footer`) renders at identical
  coordinates on every slide that has it — no jumping between slides.
- Emulate reduced motion — identical states, no movement (stagger delays 0).
- Resize to a small window — layout letterboxes, text stays legible.
- Close the browser and stop any helper processes when done.

### Composition

Still in the browser (measure with `getBoundingClientRect` if unsure):

- Content title-band slides: eyebrow/title tops match across several slides.
- Cover (if `cover-center`): content block midY ≈ stage midY.
- Cards/panels are not stretch-filled: no tall empty interiors with a thin
  text cap at the top or middle unless deliberately designed as a hero.
- Major body rows have even, comfortable gaps; body is not glued under the
  title while a large empty region sits unused below for no reason.
- One-step decks: a single ArrowRight on a content slide reveals the full
  body; `finalSteps[i]` is typically `1` for those slides.
- Accent-only surfaces: computed background has no accent RGB washes when
  that constraint was chosen.

Optional debug sketch (adapt selectors to the deck):

```js
// title lock + body start across content slides
const stage = document.querySelector('.stage').getBoundingClientRect();
const h2 = document.querySelector('.slide[data-state=current] .slide-heading h2');
const body = document.querySelector('.slide[data-state=current] .slide-body');
// compare (h2.top - stage.top) across slides; inspect body first-child tops
```
