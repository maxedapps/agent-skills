# Motion

Three trigger modes, one reveal vocabulary, and a cross-slide morph. Every
effect here must collapse under `prefers-reduced-motion` to the same content
state with no movement.

Contents: [Triggers](#three-triggers) · [Word reveal](#word-by-word-reveal) ·
[Marker sweep](#marker-sweep) · [Title morph](#cross-slide-title-morph) ·
[Traps](#traps)

## Three triggers

| Mode | Markup | Fires when |
|---|---|---|
| Always visible | no attribute | slide is shown |
| Stepped | `data-enter="1"` | that step is reached |
| Automatic | no `data-enter`, styled under `.slide[data-state="current"]` | the slide arrives |

Automatic is right when the content should simply be there a beat after the
cut — scattered logos, an opening statement. Stepped is right when the speaker
lands the point on a keypress.

One rule set serves both, so the animation never gets written twice:

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

## Word-by-word reveal

Split the heading into `<span class="w" style="--i: n">`, one per word, and put
`.reveal-words` on the parent. Words rise out of a blur, 30 ms apart.

Keep whitespace between spans (it is the word spacing) and do **not** put a
space before trailing punctuation — `…</span><span class="w">?</span>`.

## Marker sweep

The highlight is drawn, not faded: `background-size` grows `0% → 100%` behind
the text while the ink flips from `--color-text` to `--color-accent-ink` just
behind the leading edge (keyframed at 28% → 58%, not linearly, or the text
goes muddy mid-sweep).

Needs `background-repeat: no-repeat` and `box-decoration-break: clone` so a
highlight that wraps across lines still sweeps per fragment.

## Cross-slide title morph

A statement on one slide becomes the border title on the next. There is no
shared-element API; `morph.js` measures both elements and parks the target on
top of the source while its slide is hidden. Showing the slide transitions it
into place, which reads as one element moving.

- The two elements must be **geometrically similar**: same family, weight,
  tracking, line-height, and `em` padding, so one scale factor maps them.
- `morph.js` only writes CSS custom properties. Navigation stays in
  `slides.js`.
- It re-measures on resize and after `document.fonts.ready`.

## Traps

Each of these cost a debugging session.

**Restarting animations also restarts transitions.** `getAnimations()` returns
`CSSTransition` objects too. Stepped nodes sit mid "revealed → hidden"
transition, so replaying them flashes the slide's *fully revealed* content and
fades it out. Filter to `instanceof CSSAnimation`.

**Identical markup on both ends of a morph.** Splitting one side into word
spans made it 13 px taller (inline-block changes the line box) and the title
visibly hopped. Give both ends the same structure.

**The measuring class needs `!important`.** The parked state is
`.slide:not([data-state="current"]) .frame__tag--morph` — three selectors.
A plain `.frame__tag--morph.is-measuring` loses on specificity and the script
measures the parked position, computing an offset of zero.

**Mask patches must not scale mid-flight.** A background patch that masks a
border shows as a rectangle of mismatched texture while it is scaled. Move it
to a `::before` that fades in as the element arrives.

**Positioned labels resolve `em` against themselves.** A label centred on a
frame's border must derive the offset from `--stage-em`, not `em`, or a title
with `font-size: 1.9em` shifts by nearly double what was intended.

**Reduced motion needs an explicit collapse per effect.** Set
`animation: none` *and* reset the pre-animation state, or the elements stay at
`opacity: 0` forever.
