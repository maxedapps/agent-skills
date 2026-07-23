---
name: create-slides
description: >-
  Creates and materially redesigns polished, dependency-free HTML slide decks
  with vanilla CSS, vanilla JavaScript, and a tested stepped-reveal starter.
  Use this skill when asked to create, build, or redesign a slide deck,
  presentation, pitch deck, talk, tutorial/video slides, or keynote-style
  slides as a web page. Do not use for ordinary websites or apps, editing
  proprietary slide files (PowerPoint, Keynote, Google Slides), research-only
  requests without a deck deliverable, or generating slide images only.
license: MIT
compatibility: >-
  Decks open from local files with no server, build step, or network access.
  Validation requires a browser or browser-automation capability.
metadata:
  short-description: Create or redesign dependency-free HTML slide decks from a tested starter
---

# Create Slides

## Critical rules

- No libraries, CDNs, frameworks, or build steps. The deck must open directly from a local `index.html`.
- Never invent facts, statistics, quotes, images, or licenses. Research unknown or current claims with the `web-research` skill and cite sources; record where every asset came from.
- State every assumption explicitly in the final report.
- Derive the design from the content (subject, brand, data), not generic decoration.
- Write semantic HTML: real headings, lists, figures, and one `<section class="slide">` per slide in DOM order.
- Keep the copied `slides.js` as the canonical runtime. Do not rebuild or replace navigation unless the user explicitly requests different behavior.
- **Lock art direction before building HTML** when delivery, reveal model, or composition is unspecified — see workflow step 2. Do not invent a full layout system mid-pass.
- **“Use the space” ≠ stretch boxes to fill the viewport.** It means stable hierarchy, content-sized modules, comfortable gaps, and intentional empty margin. Never grow cards/panels just to eat leftover height unless the user explicitly asks for full-bleed fill.
- **Slide roles may differ in one deck.** Cover/close can be vertically centered while content slides use a fixed top title band — these are complementary, not mutually exclusive.
- **User-owned copy is sacred.** After the user edits text (or says they did), change layout/CSS/structure only. Do not rewrite, “improve,” or restyle wording unless they ask.

## Workflow

1. Inspect all supplied material (text, data, images, brand constraints, venue, delivery mode) before asking anything.
2. If consequential unknowns remain, ask **one grouped art-direction question** covering only the gaps (skip items the user already stated). Defaults in brackets apply when proceeding on assumptions:
   - **Delivery:** live talk | **recorded video/tutorial** | self-paced send
   - **Reveal model:** multi-step narrative | **one-step staggered** | none
   - **Cover treatment:** **vertically centered** | top-aligned (and whether close matches cover)
   - **Content treatment:** **title-band + body-upper** | title-band + body-center-remaining | free flow
   - **Density:** sparse keynote | **tutorial-comfortable** (roomy row gaps, not cramped)
   - **Type:** system sans | **serif display titles** + sans body
   - **Color:** accent on text/UI only vs accent washes in backgrounds; light/dark base
   - Otherwise proceed on stated assumptions and record them.
3. Research missing or current facts with the `web-research` skill before writing slide content.
4. Read [`references/design.md`](references/design.md), then outline the story as slide titles only and check it carries the message before writing any slide body. Pick named **layout contracts** from that file for cover vs content slides.
5. Choose an art direction derived from the content — starting from the neutral base or one shipped theme (technical / corporate / playful) — and express it as token values (color, type, spacing). Themes are starting points; override tokens to match the locked art direction.
6. Copy [`assets/index.html`](assets/index.html), [`assets/slides.css`](assets/slides.css), and [`assets/slides.js`](assets/slides.js) verbatim into the deck directory; optionally also copy exactly one chosen theme file and link it after `slides.css`.
7. Read [`references/web-slides.md`](references/web-slides.md), then replace the sample content in `index.html` (including `<title>`), implement the chosen layout contracts and reveal model, keep only the primitives and `data-enter`/`data-exit` steps the deck needs, and adjust `slides.css` tokens for the art direction. Leave `slides.js` unchanged.
8. Validate every slide and every step in a browser using the exact checks below — **runtime and composition**.
9. Report the deck files, how to open them, the key controls, sources, assumptions, and the layout contracts used.

## Resources

- [`references/design.md`](references/design.md) — audience/outcome, story, density (including video), layout contracts, “use the space,” hierarchy, type/color, anti-patterns. Read before outlining or choosing art direction (workflow steps 2–5).
- [`references/web-slides.md`](references/web-slides.md) — starter DOM/state contract, title-band/stagger techniques, motion/a11y, extension boundaries, runtime + composition QA. Read before editing the copied starter (workflow step 7).
- [`assets/index.html`](assets/index.html), [`assets/slides.css`](assets/slides.css), [`assets/slides.js`](assets/slides.js) — the runnable starter deck, theme, and runtime. Copy all three verbatim into the deck directory at workflow step 6, then edit only `index.html` and `slides.css`.
- [`assets/theme-technical.css`](assets/theme-technical.css), [`assets/theme-corporate.css`](assets/theme-corporate.css), [`assets/theme-playful.css`](assets/theme-playful.css) — optional pre-built token overrides (dark technical, serif corporate, rounded playful). Copy at most one, only when its personality fits; link after `slides.css` and adapt tokens. Do not treat theme accent washes as mandatory.

## Validation

### Runtime

- Open the deck's `index.html` in a browser (`agent-browser` or similar); traverse every step of every slide with ArrowRight, then back with ArrowLeft; expect intended reveals/exits, boundary crossings into the previous slide's final step, and no wrap at either end.
- Press Shift+ArrowRight and Shift+ArrowLeft across several slides; expect direct jumps to the next slide at step 0 and the previous slide at its final step.
- Check the browser console; expect no errors.
- Emulate `prefers-reduced-motion: reduce`; expect identical content states without movement (including zero stagger delay).
- Inspect the deck directory; expect `index.html`, `slides.css`, `slides.js`, plus optionally the one copied theme CSS, plus only provenance-documented local assets, and no external URLs in markup or CSS.
- Stop any browser or server processes started for validation.

### Composition (fail the deck if any fail)

- **Title lock:** on content slides using a title band, title/eyebrow Y positions match across slides (measure in the browser if unsure).
- **No stretch-fill:** cards/panels are content-sized (or equal-height within a row from content), not grown to the footer with large empty interiors.
- **Spacing:** comfortable gap under the title band and between major body rows — not title↔body cramped with a huge empty lower third, and not rows stacked flush.
- **Role split:** cover uses the chosen cover treatment; content slides do not accidentally inherit cover centering (or vice versa) unless intended.
- **Accent scope:** if “accent on text/UI only,” backgrounds are neutral (no accent-tinted washes).
- **Reveal model:** multi-step decks need multiple ArrowRight presses per slide by design; one-step staggered decks should advance the whole body on a single step (final step typically `1` for body content).

## Constraints

- Adapt content and design per deck; never fork the runtime contract described in `references/web-slides.md` without an explicit user request.
- Keep decks self-contained: no network requests at presentation time, no telemetry, no remote fonts.
- Do not add presenter consoles, autoplay, URL routing, touch gestures, or export tooling unless the user asks for them.
- Prefer CSS/structure fixes over content rewrites when polishing layout.
