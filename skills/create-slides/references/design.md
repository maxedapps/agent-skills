# Slide Design Guidance

Decision guidance for any deck genre. No fixed slide counts, font-size
formulas, or per-genre rules — derive every choice from the audience, the
message, and the material.

Contents: [Audience and outcome](#audience-and-outcome-first) ·
[Message-led titles](#message-led-slide-titles) ·
[Evidence and provenance](#evidence-research-and-provenance) ·
[Story structures](#story-structures) ·
[Density and delivery](#density-and-delivery) ·
[Layout contracts](#layout-contracts) ·
[Use the space](#use-the-space) ·
[Hierarchy](#visual-hierarchy) ·
[Type, color, imagery](#typography-color-imagery) ·
[Data display](#data-display) ·
[Layouts and primitives](#layouts-and-starter-primitives) ·
[Anti-patterns](#anti-patterns)

## Audience and outcome first

- Before outlining, answer: who is watching, what do they already know, what
  should they believe or do afterwards, and how is the deck delivered?
- Every slide must serve that outcome. Cut slides that only prove effort.
- Open with why the audience should care; end with the action or conclusion
  you want them to leave with.

## Message-led slide titles

- Write each title as the slide's takeaway sentence, not a topic label:
  "Churn concentrates in the first week", not "Churn analysis".
- The titles alone, read in order, must tell the whole story. Outline and
  test this title-only skeleton before writing any slide body.
- The body then supports its title with evidence — nothing more.

## Evidence, research, and provenance

- Never invent numbers, quotes, names, or images. Research current or
  unknown claims (use the `web-research` skill) and keep the source.
- Attribute quotes and data on the slide or in a discreet credit line;
  keep full URLs for the handoff report.
- Use only assets you may use: user-supplied files, content you created
  (inline SVG counts), or material with a verified license. Record
  provenance for each asset.
- Mark projections, estimates, and assumptions as such on the slide.

## Story structures

Pick the shape that fits the material; do not force one formula:

- **Problem → tension → resolution** — proposals, pitches, postmortems.
- **Claim → evidence → implication** — analyses and research readouts;
  lead with the conclusion, then support it.
- **Journey / chronology** — retrospectives, case studies, roadmaps.
- **Compare and contrast** — option evaluations, before/after, benchmarks.
- **Ladder of abstraction** — teaching: concrete example first, then the
  general principle, then a second application.

Whatever the shape: one idea per slide, an early stakes-setting slide, and a
closing slide that restates the message and the next step.

## Density and delivery

Delivery mode changes density **and** reveal model. Ask when unclear.

| Mode | Density | Reveal default |
|---|---|---|
| **Live talk** | Few words, large focal elements | Multi-step `data-enter` to pace narration |
| **Recorded video / tutorial** | Comfortable reading, roomy gaps | **One-step staggered** (whole body on one ArrowRight) unless the speaker wants multi-step |
| **Self-paced (sent)** | Complete sentences; captions interpret figures | Little or no stepping |

- Multi-step reveals are for pacing speech, not decoration.
- One-step staggered: all body nodes share `data-enter="1"`; stagger only via
  CSS `transition-delay` (see `web-slides.md`). Titles/chrome may stay unstepped.
- Self-paced decks must stand alone without the speaker.

## Layout contracts

Name the contract per **slide role**. One deck commonly mixes roles —
that is intentional, not a contradiction.

### Cover / close roles

| Contract | When |
|---|---|
| **`cover-center`** | Title stack vertically centered on the stage (default for opening/closing full-bleeds) |
| **`cover-top`** | Title stack top-aligned like content (rare; only if requested) |

### Content roles

| Contract | When |
|---|---|
| **`title-band + body-upper`** | Fixed top title band; body starts soon under it in the upper region with roomy gaps. Default for tutorial/video content slides. |
| **`title-band + body-center-remaining`** | Fixed top title band; the **group** of body content is vertically centered in the leftover frame (content still content-sized). |
| **`free-flow`** | No fixed band; only when the slide is a special full-bleed or statement moment. |

**Title band rules (when used):**

- Reserve a fixed-height heading region so eyebrow + title Y stay stable
  across content slides (two-line title min-height if titles wrap).
- Do **not** vertically center the whole `.slide` when a title band is in
  play — that is what makes titles jump as body height changes.
- Optional `slide-footer` chrome stays pinned via the starter primitive;
  it is not a substitute for the title band.

**Default combo for video/tutorial decks:** `cover-center` +  
`title-band + body-upper` + one-step staggered + tutorial-comfortable gaps.

## Use the space

“Use the space” means:

1. Stable hierarchy (titles don’t jump; eye knows where to land).
2. Content-sized modules (cards/panels fit their text, with sensible padding).
3. Comfortable gaps between major rows (title → body, body band → body band).
4. Intentional empty margin — especially a calm lower region on upper-body layouts.

It does **not** mean:

- Stretching cards/bridges/lists to the footer to “fill” leftover height.
- Centering short text inside a huge empty panel as a substitute for layout.
- Cramping rows under the title while leaving a dead lower half.

Equal-height cards **within a row** (from the tallest content in that row)
are fine. Full-slide stretch-fill is not, unless the user explicitly wants
a full-bleed module.

## Visual hierarchy

- Decide the one thing the eye must land on first, make it dominant (size,
  weight, color, position), and demote everything else.
- Use whitespace as the primary grouping tool; align to the layout grid
  instead of adding boxes and rules.
- Keep recurring elements (titles, credits, accents) in the same place on
  every content slide so attention goes to what changed.
- Mix boxed and unboxed content when it helps: lede → cards → aside line,
  bridge → insight row, steps → short takeaway — not only grids of cards.

## Typography, color, imagery

- Type: the starter's token scale keeps sizes consistent; change tokens, not
  ad-hoc sizes. Prefer one body family with weight contrast; optional
  **serif display** for `h1`/`h2` when the art direction calls for it.
  Keep line lengths short and headlines tight.
- Color: start from a content-derived accent on a restrained neutral base.
  Check contrast for every text/background pair; never rely on color alone.
  If the brief is “accent on text/UI only,” keep backgrounds pure neutral
  gray/ink gradients — no accent-tinted washes.
- Themes: optionally start from technical / corporate / playful — starting
  points to adapt, never constraints. Override accent, surfaces, and type
  tokens after copy. Playful rounded look is strongest on macOS.
- Imagery: use images that carry information or mood; full-bleed one strong
  image rather than tiling weak ones. No decorative stock filler, no
  unlicensed material.

## Data display

- Show the comparison that supports the slide's claim, not the whole
  dataset; strip gridlines, legends, and precision that the claim ignores.
- Title the chart with its finding; label data directly where possible.
- Big single numbers (the `statistic` primitive) beat charts when one value
  is the message. Tables are for lookup, rarely for persuasion.
- Cite the data source on the slide.

## Layouts and starter primitives

Map common slide shapes to the starter's composable primitives
(`assets/slides.css`), then layer deck-specific structure (title band,
body stack) in the theme/override CSS:

| Slide shape | Primitives |
|---|---|
| Cover / section break | `full-bleed` or absolute cover shell + `stack` |
| Single big claim | `statement` |
| Point beside evidence or code | `split` (+ `code`, `media`) |
| Comparison / option cards | `grid` + `card` |
| Key metrics | `cluster` + `statistic` |
| Attributed quote | `quote` |
| Figure with caption | `media` |
| Recurring footer chrome | `slide-footer` |
| Fixed content titles | deck `slide-heading` band (not in starter; add in theme CSS) |

Compose primitives before inventing new CSS; add a new primitive only when a
layout genuinely recurs and none fits.

## Anti-patterns

- Topic-label titles; walls of bullets read aloud; paragraph slides in a
  live deck.
- Vertically centering entire content slides when titles must stay locked.
- Stretch-filling cards/panels to consume empty viewport (“fake density”).
- Treating cover-center and content title-band as mutually exclusive.
- Multi-step reveals for video decks that only needed one staggered step.
- Accent-colored background washes when the brief wanted neutral surfaces.
- Rewriting user-edited copy while “fixing layout.”
- Decoration unrelated to content; charts with no stated finding.
- Stepped reveals as spectacle; animation on every element.
- Uncredited data, quotes, or imagery; invented specifics.
- Many ideas crammed on one slide to reduce slide count — split instead.
