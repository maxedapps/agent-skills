# Slide Design Guidance

Decision guidance for any deck genre. No fixed slide counts, font-size
formulas, or per-genre rules — derive every choice from the audience, the
message, and the material.

Contents: [Audience and outcome](#audience-and-outcome-first) ·
[Message-led titles](#message-led-slide-titles) ·
[Evidence and provenance](#evidence-research-and-provenance) ·
[Story structures](#story-structures) · [Density](#density-live-vs-self-paced) ·
[Hierarchy](#visual-hierarchy) · [Type, color, imagery](#typography-color-imagery) ·
[Data display](#data-display) · [Layouts](#layouts-and-starter-primitives) ·
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

## Density: live vs self-paced

- **Live (presented) decks** support a speaker: fewer words, larger focal
  elements, stepped reveals (`data-enter`) to pace the narration.
- **Self-paced (sent) decks** must stand alone: complete sentences, captions
  that interpret figures, little or no stepping.
- Ask which mode applies when it is consequential and unclear; it changes
  nearly every density decision.

## Visual hierarchy

- Decide the one thing the eye must land on first, make it dominant (size,
  weight, color, position), and demote everything else.
- Use whitespace as the primary grouping tool; align to the layout grid
  instead of adding boxes and rules.
- Keep recurring elements (titles, credits, accents) in the same place on
  every slide so attention goes to what changed; if used, the starter's
  `slide-header`/`slide-footer` primitives guarantee that same-place
  rendering regardless of each slide's content height.

## Typography, color, imagery

- Type: the starter's token scale keeps sizes consistent; change tokens, not
  ad-hoc sizes. Prefer one family with weight contrast; keep line lengths
  short and headlines tight.
- Color: start from a content-derived accent (subject, brand, data meaning)
  on a restrained neutral base. Check contrast for every text/background
  pair; never rely on color alone to encode meaning.
- Themes: optionally start from the shipped theme whose personality matches
  the content — technical (dark, electric accent), corporate (paper serif),
  playful (warm rounded) — or skip themes entirely. They are starting points
  to adapt, never constraints. The playful rounded look is strongest on
  macOS and degrades to a clean geometric sans elsewhere.
- Imagery: use images that carry information or mood relevant to the
  content; full-bleed one strong image rather than tiling several weak
  ones. No decorative stock filler, no unlicensed material.

## Data display

- Show the comparison that supports the slide's claim, not the whole
  dataset; strip gridlines, legends, and precision that the claim ignores.
- Title the chart with its finding; label data directly where possible.
- Big single numbers (the `statistic` primitive) beat charts when one value
  is the message. Tables are for lookup, rarely for persuasion.
- Cite the data source on the slide.

## Layouts and starter primitives

Map common slide shapes to the starter's composable primitives
(`assets/slides.css`):

| Slide shape | Primitives |
|---|---|
| Cover / section break | `full-bleed` + `stack` |
| Single big claim | `statement` |
| Point beside evidence or code | `split` (+ `code`, `media`) |
| Comparison / option cards | `grid` + `card` |
| Key metrics | `cluster` + `statistic` |
| Attributed quote | `quote` |
| Figure with caption | `media` |
| Recurring header/footer | `slide-header`, `slide-footer` |

Compose these before inventing new CSS; add a new primitive only when a
layout genuinely recurs and none fits.

## Anti-patterns

- Topic-label titles; walls of bullets read aloud; paragraph slides in a
  live deck.
- Decoration unrelated to content: gradients, icons, or stock photos as
  filler.
- Charts pasted with default styling and no stated finding.
- Stepped reveals used as spectacle rather than pacing; animation on every
  element.
- Uncredited data, quotes, or imagery; invented specifics.
- Many ideas crammed on one slide to reduce slide count — split instead.
