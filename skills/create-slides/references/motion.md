# Motion

Three triggers, five reveal presets, and one cross-slide morph. Every effect
must collapse under `prefers-reduced-motion` to the same content state with no
movement.

Contents: [Triggers](#three-triggers) · [Presets](#reveal-presets) ·
[Word reveal](#word-by-word-reveal) · [Marker sweep](#marker-sweep) ·
[Title morph](#cross-slide-title-morph) · [Traps](#traps)

## Three triggers

| Mode | Markup | Fires when |
|---|---|---|
| Always visible | no attribute | slide is shown |
| Stepped | `data-enter="1"` | that step is reached |
| Automatic | no `data-enter`, styled under `.slide[data-state="current"]` | the slide arrives |

Automatic is right when content should simply be there a beat after the cut —
scattered tiles, an opening statement. Stepped is right when the speaker lands
the point on a keypress.

One rule set serves both, so the animation is never written twice:

```css
.slide[data-state="current"] .reveal-words:not([data-step-state]) { --rv-delay: 300ms; }

.reveal-words[data-step-state="active"] .w,
.slide[data-state="current"] .reveal-words:not([data-step-state]) .w {
  animation: word-in 640ms var(--motion-ease) both;
  animation-delay: calc(var(--rv-delay, 0ms) + var(--i, 0) * 30ms);
}
```

`:not([data-step-state])` is the discriminator: the runtime only sets that
attribute on nodes that opted into stepping, so unstepped nodes take the
automatic branch and get the head-start delay.

**Reveal model per delivery.** Recorded video: one staggered step per slide.
Live talk: multi-step to pace narration. B-roll for a script: one step per
narration beat, because each step is also a cut point.

## Reveal presets

`data-reveal` on `.stage` sets the deck's motion; on any node it overrides the
deck for that node and its descendants:

```html
<main class="stage" data-reveal="fade">      <!-- whole deck -->
  …
  <ul class="blocks" data-reveal="zoom">     <!-- this group only -->
```

| Preset | Enter | Word reveal |
|---|---|---|
| `rise` | fade + 0.75em lift (default) | blur 10px, rise, scale 0.94 |
| `fade` | opacity only | plain fade |
| `zoom` | scale 0.96 → 1 | scale 0.9 → 1 |
| `slide` | from 1.2em left | plain fade |
| `blur` | 8px defocus + 0.3em lift | blur 14px |

Presets only set custom properties, so adding one costs nothing and every preset
collapses through the same reduced-motion block. Only `blur` applies a `filter`,
because a filter forces a compositing layer and breaks
`background-attachment: fixed` for anything inside it — do not extend it to the
other presets.

`npm run qa` fails on a `data-reveal` value that is not one of the five.

## Word-by-word reveal

Split the heading into `<span class="w" style="--i: n">`, one per word, and put
`.reveal-words` on the parent. Words land 30 ms apart.

Keep the whitespace between spans (it is the word spacing) and do **not** put a
space before trailing punctuation — `…</span><span class="w">?</span>`.

## Marker sweep

The highlight is drawn, not faded: `background-size` grows `0% → 100%` behind
the text while the ink flips from `--color-text` to `--color-accent-ink` just
behind the leading edge (keyframed at 28% → 58%, not linearly, or the text goes
muddy mid-sweep).

Needs `background-repeat: no-repeat` and `box-decoration-break: clone` so a
highlight wrapping across lines sweeps per fragment. Templates own the fill:
a pen stroke, a printed block, a selection rectangle, inverted ink.

## Cross-slide morph

A statement on one slide becomes the frame title on the next; a logo in a
scatter becomes the example pinned at the top of the slide after it. There is
no shared-element API; `morph.js` measures both elements and parks the target
on top of the source while its slide is hidden. Showing the slide transitions
it into place, which reads as one element moving.

- **Pairs match by attribute value.** `data-morph-from="logo"` pairs with
  `data-morph-to="logo"`; valueless attributes pair as `""`. A deck can run
  several morphs at once.
- Text pairs must be **geometrically similar**: same family, weight, tracking,
  line-height and `em` padding, so one scale factor maps them.
- Scale comes from `offsetWidth`, so non-text elements work too — put the pair
  on the two elements that must align exactly (the logo tile, not the figure
  that also contains a caption), or the ratio is computed from the wrong box.
- A target's own resting transform goes in `--morph-base-x/y`, which the parked
  offset is added to. The frame title sets `--morph-base-y: -50%`.
- Rotation is accumulated up the ancestor chain, so a tile inside a rotated
  figure parks at the same angle.
- `morph.js` only writes custom properties. Navigation stays in `slides.js`.
- It re-measures on resize and after `document.fonts.ready`.

A caption that belongs to the target but not to the morph should wait for the
tile to land — an opacity transition with a delay near the end of the move,
rather than arriving with the slide.

## Traps

Each of these cost a debugging session.

**Restarting animations also restarts transitions.** `getAnimations()` returns
`CSSTransition` objects too. Stepped nodes sit mid "revealed → hidden"
transition, so replaying them flashes the slide's *fully revealed* content and
fades it out. Filter to `instanceof CSSAnimation`.

**Identical markup on both ends of a morph.** Splitting one side into word spans
made it 13 px taller (inline-block changes the line box) and the title visibly
hopped. Give both ends the same structure.

**The measuring class needs `!important`.** The parked state is
`.slide:not([data-state="current"]) [data-morph-to]` — three selectors. A plain
`[data-morph-to].is-measuring` loses on specificity and the script measures the
parked position, computing an offset of zero.

**A rotated source measures too wide.** `getBoundingClientRect()` on a tilted
element returns its axis-aligned box — 5% too wide at 3°, which shows up as a
size pop on arrival. Take scale from `offsetWidth` (layout width, transform
free); centres are safe either way, since rotation preserves them.

**A multi-word highlight breaks across lines.** The pill renders in two pieces
with a ragged join. Non-breaking spaces inside the `.marker` keep it whole so it
wraps as a unit, and trailing punctuation belongs *inside* the last word span,
or it orphans onto its own line.

**Mask patches must not scale mid-flight.** A background patch that masks a
border shows as a rectangle of mismatched texture while scaled. Move it to a
`::before` that fades in as the element arrives.

**Positioned labels resolve `em` against themselves.** A label centred on a
frame line must derive its offset from `--stage-em`, not `em`, or a title at
`font-size: 1.9em` shifts by nearly double what was intended.

**Reduced motion needs an explicit collapse per effect, at matching
specificity.** Set `animation: none` *and* reset the pre-animation state — and
if the effect was set by a compound selector (like the blur preset), the
collapse needs the same selector shape or it silently loses the cascade.
