# Slide Design Guidance

Decision guidance for any deck genre. No fixed slide counts or font-size
formulas — derive every choice from the audience, the message and the material.
The mechanical contracts (title lock, body fit, archetypes) live in
[web-slides.md](web-slides.md); this file is about what to put in them.

Contents: [Audience](#audience-and-outcome-first) · [Titles](#message-led-titles) ·
[Evidence](#evidence-and-provenance) · [Story shapes](#story-shapes) ·
[Density and delivery](#density-and-delivery) · [Use the space](#use-the-space) ·
[Hierarchy](#visual-hierarchy) · [Type and colour](#type-colour-imagery) ·
[Data](#data-display) · [Anti-patterns](#anti-patterns)

## Audience and outcome first

- Before outlining, answer: who is watching, what do they already know, what
  should they believe or do afterwards, and how is the deck delivered?
- Every slide must serve that outcome. Cut slides that only prove effort.
- Open with why the audience should care; end with the action or conclusion you
  want them to leave with.

## Message-led titles

- Write each title as the slide's takeaway, not a topic label: "Churn
  concentrates in the first week", not "Churn analysis".
- The titles alone, read in order, must tell the whole story. Outline and test
  that title-only skeleton before writing any body copy.
- The body then supports its title with evidence — nothing more.

## Evidence and provenance

- Never invent numbers, quotes, names or images. Research current or unknown
  claims (the `web-research` skill) and keep the source.
- Attribute quotes and data on the slide or in a discreet credit line; keep full
  URLs for the handoff report.
- Use only assets you may use: user-supplied files, content you created (inline
  SVG counts), or material with a verified licence. Record provenance.
- Mark projections, estimates and assumptions as such, on the slide.

## Story shapes

Pick the shape that fits the material; do not force one formula:

- **Problem → tension → resolution** — proposals, pitches, postmortems.
- **Claim → evidence → implication** — analyses; lead with the conclusion.
- **Journey / chronology** — retrospectives, case studies, roadmaps.
- **Compare and contrast** — option evaluations, before/after, benchmarks.
- **Ladder of abstraction** — teaching: concrete example, then the principle,
  then a second application.

Whatever the shape: one idea per slide, an early stakes-setting slide, and a
close that restates the message and the next step.

## Density and delivery

Delivery mode changes density **and** reveal model. Ask when unclear.

| Mode | Density | Reveal default |
|---|---|---|
| Live talk | Few words, large focal elements | Multi-step, to pace narration |
| Recorded video / tutorial | Comfortable reading, roomy gaps | **One-step staggered** |
| Self-paced (sent) | Complete sentences; captions interpret figures | Little or no stepping |

Multi-step reveals pace speech; they are not decoration. Self-paced decks must
stand alone without the speaker.

## Use the space

It means:

1. Stable hierarchy — titles don't jump, the eye knows where to land.
2. Content-sized modules — cards fit their text with sensible padding.
3. Comfortable gaps between major rows.
4. Intentional empty margin, especially a calm lower region.

It does **not** mean stretching cards to the frame edge, centring three words in
a huge empty panel, or cramping rows under the title while half the slide sits
dead. Equal-height cards *within a row* are fine; full-slide stretch-fill is not.

## Visual hierarchy

- Decide the one thing the eye must land on first, make it dominant, and demote
  everything else.
- Use whitespace as the primary grouping tool; align to the layout instead of
  adding boxes and rules.
- Keep recurring elements in the same place on every slide so attention goes to
  what changed.
- Mix boxed and unboxed content: lede → cards → aside line, not only grids.

## Type, colour, imagery

- Type: use the template's scale; change tokens, not ad-hoc sizes. Short line
  lengths, tight headlines.
- Colour: one content-derived accent on a restrained base. Check contrast for
  every text/background pair and never rely on colour alone. If the brief says
  "accent on text only", keep surfaces neutral — no accent washes.
- Templates: pick on `template.md` frontmatter fit, then adapt tokens. Never
  fight a template with overrides; author a new one instead.
- Imagery: images that carry information or mood; one strong full-bleed image
  beats four weak ones. No stock filler, no unlicensed material.

## Data display

- Show the comparison that supports the claim, not the whole dataset; strip
  gridlines, legends and precision the claim ignores.
- Title the chart with its finding; label data directly where possible.
- One big number (the `statistic` primitive) beats a chart when one value is the
  message. Tables are for lookup, rarely for persuasion.
- Cite the source on the slide.

## Anti-patterns

- Topic-label titles; walls of bullets read aloud; paragraph slides in a live
  deck.
- Vertically centring a whole content slide when the title must stay locked.
- Stretch-filling panels to consume empty space ("fake density").
- Multi-step reveals for a video deck that needed one staggered step.
- Accent-coloured washes when the brief wanted neutral surfaces.
- Rewriting user-edited copy while "fixing layout".
- Decoration unrelated to content; charts with no stated finding.
- Uncredited data, quotes or imagery; invented specifics.
- Many ideas crammed onto one slide to reduce the slide count — split instead.
