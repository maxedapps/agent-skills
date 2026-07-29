---
name: create-slides
description: >-
  Creates and materially redesigns polished, dependency-free HTML slide decks
  from five styled templates, with stepped and automatic reveal animations
  driven by named motion presets, a cross-slide title morph, and PDF plus MP4
  export at 1080p, 2K and 4K with reveals optionally timed to a
  narration/caption track.
  Use this skill when asked to create, build, redesign, restyle, or export a
  slide deck, presentation, pitch deck, talk, tutorial/video slides, course
  slides, slide b-roll for a video, or keynote-style slides as a web page. Do
  not use for ordinary websites or apps, editing proprietary slide files
  (PowerPoint, Keynote, Google Slides), research-only requests without a deck
  deliverable, or generating slide images only.
license: MIT
compatibility: >-
  Decks open from local files with no server or network access. Scaffolding
  fetches webfonts once. Validation and export need Node, Playwright and a
  Google Chrome install (the tools launch the `chrome` channel); video also
  needs ffmpeg on PATH, and capture above 1080p needs a POSIX shell.
metadata:
  short-description: Build, verify and export templated HTML slide decks
---

# Create Slides

## Critical rules

- No libraries, CDNs, frameworks, or build steps in the deck itself. It must
  open directly from a local `index.html`.
- **Never rebuild `core/slides.js`.** Navigation, key handling and the
  `data-enter`/`data-exit` contract are fixed. Extend by layering on
  `SlidesRuntime.controller`, the way `core/morph.js` does.
- **Never edit `core/slides.css` per deck.** It owns structure, archetype
  layout and the reveal presets. Override in `theme.css`, or in `deck.css`.
- Fonts must be inlined as data URIs (`tools/fonts.mjs`). `@font-face` files are
  blocked over `file://`, so a deck opened by double-click loses them.
- Never invent facts, statistics, quotes, images, or licenses. Research current
  claims with the `web-research` skill, cite sources, and record where every
  asset came from.
- Derive tokens and content from the subject; derive the *look* from a template.
  Do not invent a new layout system mid-pass.
- Write semantic HTML: real headings, lists, figures, one
  `<section class="slide">` per slide in DOM order.
- **"Use the space" ≠ stretching boxes to fill the viewport.** It means stable
  hierarchy, content-sized modules, comfortable gaps, and intentional margin.
- **Verify before reporting done.** `npm run qa` for the deck, `npm run audit`
  after any recording. Never call a deck or an export finished on the strength
  of having looked at it.
- **User-owned copy is sacred.** After the user edits text, change layout and
  CSS only — never rewrite their wording unless asked.
- State every assumption explicitly in the final report.

## Workflow

1. Inspect everything supplied — content, data, brand, delivery mode, and any
   script or captions the deck must back.
2. **Ask one grouped question** covering only the real gaps. Always include the
   look unless the user named a template or gave brand direction that settles
   it. Defaults in brackets if you must proceed on assumptions:
   - **Look:** `dark-marker` (courses, tutorials) | `light-editorial` (talks,
     reports) | `midnight-tech` (developer content) | `bold-keynote` (pitches) |
     `minimal-mono` (research talks) — one line each, and say which you'd pick
   - **Delivery:** live talk | **recorded video/tutorial** | self-paced send
   - **Reveal model:** multi-step | **one-step staggered** | none
   - **Density:** sparse keynote | **tutorial-comfortable**
3. Research unknown or current facts before writing any slide body.
4. Read [`references/design.md`](references/design.md). Outline the deck as
   **titles only** and check that sequence carries the message before writing
   any body copy.
5. Scaffold the deck:
   - `assets/core/` → `core/`, `assets/skeleton.html` → `index.html`
   - the chosen `assets/templates/<name>/` → `theme.css`, `fonts.json`
   - `assets/tools/` → `tools/`, `assets/starter/*` → deck root
     (`gitignore` → `.gitignore`)
   - create an empty `deck.css`
   - `npm install && node tools/fonts.mjs`
   - `npm run dev` renders every archetype the template offers — read it before
     writing slides.
6. Adapt **tokens only** to the subject, then write the slides. Read
   [`references/web-slides.md`](references/web-slides.md) for the DOM,
   composition and archetype contract, and [`references/motion.md`](references/motion.md)
   before setting any reveal or preset.
7. Verify: `npm run qa`, and fix everything it reports.
8. Export if asked — [`references/export.md`](references/export.md):
   `npm run pdf`, `npm run record` / `record:2k` / `record:4k`, then
   `npm run audit`. When the deck backs a recorded voiceover, time the reveals
   from the caption file: a sidecar `timings/<video>.json` per video, validated
   with `node tools/record.mjs --timing <file> --plan`. Timings never go in the
   markup — the deck only gains a `data-slide` handle per timed slide.
9. Report the files, how to open them, the controls, the template used, every
   assumption, and sources for any researched claim or asset.

## Resources

| Path | Read when |
|---|---|
| [`references/design.md`](references/design.md) | Before outlining — audience, story shape, density, anti-patterns |
| [`references/web-slides.md`](references/web-slides.md) | Before editing markup — DOM/state contract, composition, archetypes, presets |
| [`references/templates.md`](references/templates.md) | Choosing, adapting, or authoring a template; the token contract |
| [`references/motion.md`](references/motion.md) | Adding any reveal, preset, morph, or animation |
| [`references/export.md`](references/export.md) | Producing a PDF or video, or timing reveals to narration |
| `assets/core/` | `slides.css`, `slides.js`, `morph.js` — copied verbatim into every deck |
| `assets/optional/` | `router.js` — hash deep links; copy in only when asked ([web-slides.md](references/web-slides.md#url-routing-opt-in)) |
| `assets/skeleton.html` | One deck skeleton, shared by every template |
| `assets/templates/<name>/` | `theme.css`, `fonts.json`, `template.md` |
| `assets/tools/` | `fonts` · `qa` · `export-pdf` · `record` · `audit-video` |
| `assets/starter/` | `package.json`, `vite.config.js`, `gitignore` |
| `scripts/slides-runtime.test.mjs` | Guards the runtime contract; run after any change to it |

## Assets and provenance

- Logos: take the vendor's own site icon first. Aggregators go stale — building
  one deck, a major product had no entry at all, another name resolved to an
  unrelated company, and a third offered only a retired one-colour mark.
- Verify the mark is current, record every source in a `CREDITS.md` beside the
  files, and never draw an approximation of a real logo.
- Light-on-dark app icons need a full-bleed tile (`.tool__tile--dark`), not a
  white one.

## Constraints

- Do not add presenter consoles, autoplay, URL routing, or touch gestures
  unless asked. When URL routing *is* asked for, copy `assets/optional/router.js`
  rather than writing one — the jump-without-replaying-a-morph handling is the
  hard part.
- Do not fork the runtime contract in `references/web-slides.md` without an
  explicit request; mirror any real runtime change in
  `scripts/slides-runtime.test.mjs`.
- Decks stay self-contained: no network requests at presentation time, no
  telemetry, no remote fonts.
