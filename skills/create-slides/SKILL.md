---
name: create-slides
description: >-
  Creates and materially redesigns polished, dependency-free HTML slide decks
  with vanilla CSS, vanilla JavaScript, and a tested stepped-reveal starter.
  Use this skill when asked to create, build, or redesign a slide deck,
  presentation, pitch deck, talk, or keynote-style slides as a web page. Do not
  use for ordinary websites or apps, editing proprietary slide files
  (PowerPoint, Keynote, Google Slides), research-only requests without a deck
  deliverable, or generating slide images only.
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

## Workflow

1. Inspect all supplied material (text, data, images, brand constraints, venue, delivery mode) before asking anything.
2. If consequential unknowns remain (audience, occasion, must-cover content, live vs self-paced), ask one grouped question. Otherwise proceed on stated assumptions.
3. Research missing or current facts with the `web-research` skill before writing slide content.
4. Read [`references/design.md`](references/design.md), then outline the story as slide titles only and check it carries the message before writing any slide body.
5. Choose an art direction derived from the content — starting from the neutral base or one shipped theme (technical / corporate / playful) — and express it as token values (color, type, spacing).
6. Copy [`assets/index.html`](assets/index.html), [`assets/slides.css`](assets/slides.css), and [`assets/slides.js`](assets/slides.js) verbatim into the deck directory; optionally also copy exactly one chosen theme file and link it after `slides.css`.
7. Read [`references/web-slides.md`](references/web-slides.md), then replace the sample content in `index.html` (including `<title>`), keep only the primitives and `data-enter`/`data-exit` steps the deck needs, and adjust `slides.css` tokens for the art direction. Leave `slides.js` unchanged.
8. Validate every slide and every step in a browser using the exact checks below.
9. Report the deck files, how to open them, the key controls, sources, and assumptions.

## Resources

- [`references/design.md`](references/design.md) — audience/outcome framing, story structures, density, hierarchy, typography, color, imagery, data display, anti-patterns. Read before outlining the story or choosing an art direction (workflow steps 4–5).
- [`references/web-slides.md`](references/web-slides.md) — the starter's DOM/state contract, CSS structure, motion and accessibility rules, extension boundaries, and browser QA checklist. Read before editing the copied starter (workflow step 7).
- [`assets/index.html`](assets/index.html), [`assets/slides.css`](assets/slides.css), [`assets/slides.js`](assets/slides.js) — the runnable starter deck, theme, and runtime. Copy all three verbatim into the deck directory at workflow step 6, then edit only `index.html` and `slides.css`.
- [`assets/theme-technical.css`](assets/theme-technical.css), [`assets/theme-corporate.css`](assets/theme-corporate.css), [`assets/theme-playful.css`](assets/theme-playful.css) — optional pre-built token overrides (dark technical, serif corporate, rounded playful). Copy at most one, only when its personality fits the content; link it after `slides.css` and adapt its tokens like any others.

## Validation

- Open the deck's `index.html` in a browser (`agent-browser` or similar); traverse every step of every slide with ArrowRight, then back with ArrowLeft; expect one-step reveals/exits, boundary crossings into the previous slide's final step, and no wrap at either end.
- Press Shift+ArrowRight and Shift+ArrowLeft across several slides; expect direct jumps to the next slide at step 0 and the previous slide at its final step.
- Check the browser console; expect no errors.
- Emulate `prefers-reduced-motion: reduce`; expect identical content states without movement.
- Inspect the deck directory; expect `index.html`, `slides.css`, `slides.js`, plus optionally the one copied theme CSS, plus only provenance-documented local assets, and no external URLs in markup or CSS.
- Stop any browser or server processes started for validation.

## Constraints

- Adapt content and design per deck; never fork the runtime contract described in `references/web-slides.md` without an explicit user request.
- Keep decks self-contained: no network requests at presentation time, no telemetry, no remote fonts.
- Do not add presenter consoles, autoplay, URL routing, touch gestures, or export tooling unless the user asks for them.
