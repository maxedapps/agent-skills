---
name: create-changes-report
description: >-
  Creates a self-contained, interactive HTML report that explains completed
  repository changes as the primary code-review artifact. Use this skill
  whenever an agent changed code, tests, configuration, schemas, or
  infrastructure and is about to finish, summarize the work, or hand it off—even
  when the user did not request a report. Also use when asked to explain or
  report on completed repository changes. Do not use for read-only code reviews,
  tasks without repository changes, pre-implementation plans, or live-data
  dashboards.
license: MIT
compatibility: >-
  Requires repository write access and browser automation for mandatory render
  verification.
metadata:
  short-description: Create interactive HTML change-review reports
---

# Create an interactive changes report

This skill is a **completion gate for repository changes**. Before sending the final response for any task that changed code, tests, configuration, schemas, or infrastructure, produce ONE self-contained HTML file (no external dependencies, no CDN, works from disk). The report must let a reviewer understand and assess the completed changes in ~5 minutes without first reading the source, with every key number and claim one click away from its evidence.

Save it under `reports/` with a descriptive kebab-case name ending in `-changes.html`. In the final response, make the report path prominent and use it as the primary review handoff; keep the chat summary brief.

This artifact does not replace `code-review` or an owning workflow's finding authority. If report preparation uncovers a new material defect, stop, return it to the owning workflow for disposition and verification, then regenerate the report from the resolved state.

Start from [assets/report-template.html](assets/report-template.html) — it contains the complete visual system (CSS custom properties for light/dark), the syntax highlighter, the popover/jump JS, and one working example of every component. Copy it and replace content; do not restyle from scratch.

## The altitude rule (the balance the user wants)

- The **main page** is a 5-minute read: what was built, how it fits together, what's risky, what to decide. No exhaustive lists on it, ever.
- **Depth lives behind clicks**: full test inventories, per-file breakdowns, version tables, grammar/protocol details go in popovers.
- Every stat tile and load-bearing claim must be **clickable** — either a popover (detail) or a jump (related section). A number nobody can drill into is a claim, not evidence.
- Code snippets: at most ~5, each 10–20 lines, each chosen because it *explains the architecture*, not because it changed.

## Workflow

### 1 · Gather evidence (before writing any HTML)

- Establish the exact review scope from `git status`, the relevant staged and unstaged diffs, and any task baseline or commits. Include new/untracked files; never infer the changes from memory.
- Read the changed source and tests, plus the plan/spec, progress tracker, and prior review notes when they exist.
- **Run the project's required check suite yourself** (formatter, lint, typecheck, and relevant behavior-focused tests) and record the exact commands and real results. Never report checks or numbers you did not reproduce.
- Extract hard data for popovers:
  - changed-file inventory and line deltas
  - test names: `grep -hoE '(it|it\.effect|describe)\(\s*"[^"]+"' <test files>`
  - per-file sizes: `wc -l` over source, sorted
  - applicable counts such as endpoints, tables/columns, packages, migrations, and pinned versions
- Trace the main behavior from entry point to side effects and identify compatibility, data, auth, error, and rollback implications.
- For critical or broad changes, run independent review passes (subagents) over the major surfaces and keep only calibrated findings.

### 2 · Analyze — two distinct sections, never merged

- **Critical findings**: actual gaps/deviations/notes, ranked most-important-first, each with a severity badge (`⚠ gap` serious / `⚠ deviation` warning / `note` neutral / `✓ clean` good). Always include one "what was hunted and came back clean" entry — absence of findings must be shown as work done, not silence.
- **Critical points — load-bearing code** (the ◆ section): *not bugs* — the places where a defect would hurt most (data-loss paths, safety gates, auth surfaces, unproven compositions, identity/checksum rules). Each card states **what it is**, **why a bug there hurts**, and **what currently protects it**, with cross-links to related findings. Mark these spots with ◆ throughout the report (flow diagram, snippet headings).

### 3 · Build from the template

Section order (drop what doesn't apply, keep the order):

1. **Hero**: eyebrow (project · task/milestone · date), title, one lede paragraph stating the user-visible outcome, and the "tip" line explaining that dashed-underlined terms and tiles are clickable.
2. **Stat tiles** (4–6): changed files, line delta, tests/checks, and other meaningful headline numbers; each uses `data-pop` or `data-goto`.
3. **What changed and why**: concise before → after behavior, task intent, and scope boundaries. State what was deliberately left unchanged.
4. **Big picture**: one CSS flow diagram (`.flow`/`.fbox`) telling the single story that explains most files; ◆ dots on load-bearing boxes.
5. **Changed surface**: table of area → change → reason → key files. Put the exhaustive per-file inventory in a popover.
6. **Protocol / lifecycle**: numbered sequence (`ol.seq`) if there is a core flow; include a verbatim sample of real output (test output, plan output, or log lines) in a plain `<pre>`.
7. **Data model**: `.schema` cards per changed table/entity + one cascade/relationship line.
8. **Key code**: 3–5 `pre.hl` snippets with `.filetag` file paths and a sentence each on *why this snippet is central to reviewing the change*.
9. **Fixture/demo**: tree view (`pre.tree`) if a fixture exists.
10. **Verification status**: exact commands and results for what ran green **and what was explicitly not verified** (`li.skip`) — unverified items are as important as green ones. Optionally a single-hue bar row (`.bars`) for test distribution.
11. **Critical points** (◆, `.hot` cards).
12. **Critical findings** (`.finding` cards with badges, ids like `f-<slug>` for cross-links).
13. **Decisions and tradeoffs**: table of notable decisions, deviations, compatibility implications, and why.
14. **Review guide**: where a reviewer should focus, remaining risks, and any follow-up work; say explicitly when none is known.
15. **Footer**: generation date + exact change scope and sources (diff/baseline, plan, tracker, reviews, fresh check-suite run).
16. **`<dialog>` popovers** at the end of body.

Interactivity contract (already implemented in the template — just use the attributes):

- `data-pop="pop-<id>"` on any `<button class="dive">`, tile, or bar row opens that `<dialog>`.
- `data-goto="#<id>"` smooth-scrolls and flashes the target; give every section and finding an `id`.
- `?pop=<id>` in the URL deep-links straight into a popover.
- Popovers close via ✕ (`data-close`), backdrop click, or Esc (native dialog).

### 4 · Verify rendering — mandatory, not optional

Serve the file over HTTP and screenshot with a headless browser; inspect the images yourself:

1. Full-page **light** mode.
2. **Dark** mode — if you can't emulate `prefers-color-scheme`, screenshot a temp copy made with `sed 's/@media (prefers-color-scheme: dark)/@media all/'`.
3. One **popover open** via the `?pop=` deep link (this also proves the JS runs without errors).

Look for: run-together inline spans, label collisions, overflowing code lines, popover scroll. Fix and re-shoot. Then **clean up**: delete temp copies/screenshots, stop the server and browser.

## Visual system rules (details live in the template)

- All colors are CSS custom properties defined once for light and overridden in one `@media (prefers-color-scheme: dark)` block — never hardcode a hex in the body.
- Status/badge colors (`--good/--warning/--serious`) are reserved for severity and never used decoratively; badges always pair color with a text label.
- Charts: single-hue only (e.g. the test-distribution bars); direct value labels; no chart libraries, no dual axes, no rainbow palettes.
- Syntax highlighting is the template's regex tokenizer over `pre.hl code` text (keywords, strings incl. multi-line templates, SQL verbs, `//` comments, Capitalized types, numbers). Plain `<pre>` (sample output, trees) stays unhighlighted — no `hl` class.
- Escape `<`, `>`, `&` inside snippet markup; the highlighter reads decoded `textContent` and re-escapes.
- Body text stays in ink tokens; accent color is reserved for interactive elements (`.dive`, tiles' hint line, links).
