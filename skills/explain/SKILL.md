---
name: explain
description: >-
  Produces concise, evidence-grounded Markdown explanations and standalone HTML
  for code, systems, data relationships, and prior plans, reviews, or agent
  statements. Use this skill when the user explicitly asks to explain, walk
  through, clarify, or visualize one of those subjects. Do not use for
  implementation or fixes, performing a new code review, slide creation,
  exhaustive documentation, or render-only conversion of supplied Markdown.
license: MIT
compatibility: >-
  Requires Node.js 20+, npm dependencies installed once in the skill directory,
  and local file-write access. The renderer uses the platform's default-browser
  opener unless --no-open is passed. Rendered HTML is standalone and offline.
metadata:
  short-description: Explain code, systems, and prior decisions as standalone HTML
---

# Explain

## Critical rules

- Explain only. Do not implement, fix, or modify the subject; write only the requested Markdown/HTML artifacts and any required local dependency install.
- Lead with the answer or mental model, then supply only the context needed to support it.
- Ground claims in supplied/current code, data, artifacts, or conversation context. For code, cite paths and symbols and distinguish observed behavior from inference.
- Default to 3–6 sections, paragraphs of at most three sentences, at most one useful diagram, and 1–2 focused excerpts normally no longer than 15 lines each. Exceed a default when correctness requires it.
- Do not repeat the same information in prose, code, tables, and diagrams. Give each retained modality a distinct job.
- Redact secrets, credentials, tokens, PII, and irrelevant sensitive values from prose, excerpts, diagrams, and paths returned to the user.
- Before designing any explanation, read [`references/explanation-design.md`](references/explanation-design.md). It is mandatory.

## Workflow

1. Interpret the requested subject, audience, desired depth, output location, and title. Ask only about a consequential ambiguity; otherwise use a concise maintainer-oriented default.
2. Inspect the supplied or current context before drafting. For code/systems/data, read the relevant files, callers, symbols, schemas, and tests; for a prior plan, review, or agent statement, inspect the available conversation and named artifacts without reconstructing missing context.
3. Research only missing, current external claims with the `web-research` skill. If retrieval is unavailable, state the limitation and omit unsupported claims rather than guessing.
4. Before choosing the structure, read [`references/explanation-design.md`](references/explanation-design.md), then select the smallest archetype, evidence labels, trace, excerpts, and optional visual that answer the request.
5. Draft the answer-first explanation. Use code path/symbol citations, label material observations versus inferences, and include safeguards, trade-offs, or gaps only when they affect understanding.
6. Write the Markdown to the user-selected location. If none was selected, use a fresh OS temporary directory; choose a fresh `.html` path there too.
7. Self-edit against the critical rules and the reference's deletion pass. Verify every claim against its cited context and remove duplicated modalities.
8. Resolve the installed skill directory to an absolute path. If its dependencies are unavailable, run this idempotent lockfile-based setup once from that directory:

   ```sh
   npm ci --ignore-scripts --no-audit --no-fund
   ```

9. Render with the installed skill's absolute script path and the tested contract:

   ```sh
   node "<skill-dir>/scripts/render-explainer.mjs" \
     --input "<markdown-path>" \
     --output "<html-path>"
   ```

   Replace `<skill-dir>` with the absolute directory resolved in step 8. The local default is to open the completed HTML in the user's browser. Add `--no-open` for CI, tests, SSH/headless/remote work, or whenever browser side effects are inappropriate. Add `--title "<title>"` when needed; use `--force` only for an intentional replacement. The CLI prints bounded JSON with an explicit `open` status. A browser-launch warning leaves the written artifact valid and exits successfully; on a prerequisite or render failure, report the diagnostic and do not claim an HTML artifact.
10. Validate independently of the convenience auto-open: read the generated HTML and confirm the expected title and explanation. When `agent-browser` or another browser capability is available, inspect the `file://` artifact's layout, diagram, console, and network activity; otherwise keep the artifact and disclose that visual/browser validation was skipped.
11. Return the absolute Markdown and HTML paths plus a one-line summary. Disclose any research, browser, or rendering skips/failures.

## Resources

- [`references/explanation-design.md`](references/explanation-design.md) — decision guide for both explanation archetypes, evidence, traces, visuals, excerpts, and deletion. Read before structuring every explanation (workflow step 4).
- [`scripts/render-explainer.mjs`](scripts/render-explainer.mjs) — deterministic Markdown-to-HTML CLI with default browser opening and `--no-open` suppression. Run only after the Markdown is final and prerequisites are present (workflow step 9); do not duplicate its rendering logic.
- [`assets/explainer.html`](assets/explainer.html), [`assets/explainer.css`](assets/explainer.css), and [`assets/explainer.js`](assets/explainer.js) — renderer-owned shell, presentation, and optional diagram runtime. The renderer loads them automatically; do not copy or edit them during an explanation. Inspect them only when diagnosing a reported missing/corrupt asset.
- [`package.json`](package.json) and [`package-lock.json`](package-lock.json) — Node compatibility and pinned renderer dependencies. Use them only for the step-8 install; do not install in the caller's project.

## Validation

Run from the skill catalog root after normal skill maintenance:

- `node scripts/validate-skill-metadata.mjs skills/explain`; expect valid name, routing, compatibility, and no starter sentinels.
- `node scripts/validate-skill-links.mjs skills/explain`; expect every local resource link to resolve.
- `npx -y skills-ref validate skills/explain`; expect the skill schema to validate.
- When renderer code or assets change, run `node --check skills/explain/scripts/render-explainer.mjs`, `node --check skills/explain/assets/explainer.js`, `npm test --prefix skills/explain`, and `node skills/explain/scripts/render-explainer.mjs --help`; expect syntax, focused renderer tests, and CLI help to pass.
