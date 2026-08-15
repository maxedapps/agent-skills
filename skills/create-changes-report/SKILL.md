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

This skill is a **completion gate for repository changes**. Before the final response for any task that changed code, tests, configuration, schemas, or infrastructure, produce ONE self-contained HTML file (no CDN, works from disk). A reviewer must understand and assess the changes in ~5 minutes without first reading the source; every key number and claim is one click from evidence.

Save it under `reports/` as a descriptive kebab-case `*-changes.html`. Make that path the primary review handoff; keep the chat summary brief.

This artifact does not replace `code-review` or an owning workflow's finding authority. If report preparation uncovers a new material defect, stop, return it to the owning workflow for disposition and verification, then regenerate from the resolved state.

Start from [assets/report-template.html](assets/report-template.html) — visual system, highlighter, popover/jump JS, and one working example of every component. Copy it and replace content; do not restyle from scratch.

A **candidate** is the creator-QA-complete exact bytes. Any edit creates a new candidate. An owning workflow may require a fresh reviewer to read [references/artifact-review.md](references/artifact-review.md) (reviewer-only honesty/completeness/usefulness/precision contract; read when independently reviewing a candidate). Keep the review outcome outside the HTML.

## The altitude rule

- The **main page** is a 5-minute read: what was built, how it fits, what's risky, what to decide. No exhaustive lists on it.
- **Depth lives behind clicks**: inventories, per-file breakdowns, and protocol details go in popovers.
- Every stat tile and load-bearing claim is **clickable** (`data-pop` or `data-goto`).
- At most **five** `pre.hl` snippets across Critical points plus optional Additional key code. One source of truth per excerpt; never duplicate.

## Workflow

### 1 · Gather evidence (before writing any HTML)

- Establish exact scope from `git status`, staged/unstaged diffs, and any baseline or commits. Include new/untracked files; never infer changes from memory.
- Read the changed source and tests, plus the plan/spec, tracker, and prior review notes when they exist.
- **Run the project's required check suite yourself** and record exact commands and real results. Never report checks or numbers you did not reproduce.
- Extract popover data: changed-file inventory and line deltas; test names via `grep -hoE '(it|it\.effect|describe)\(\s*"[^"]+"' <test files>`; per-file sizes (`wc -l`); applicable counts (endpoints, tables, packages, migrations, versions).
- Trace the main behavior from entry to side effects; note compatibility, data, auth, error, and rollback implications.
- For critical or broad changes, run independent review passes over major surfaces and keep only calibrated findings.

### 2 · Analyze — two distinct sections, never merged

- **Critical findings**: actual gaps/deviations/notes, ranked most-important-first, each with a severity badge (`⚠ gap` / `⚠ deviation` / `note` / `✓ clean`). Always include one "hunted and came back clean" entry.
- **Critical points** (◆): *risk concentration, not bugs* — where a defect would hurt most (data-loss paths, safety gates, auth, unproven compositions, identity/checksum rules). Keep them distinct from findings. Admit at most five ranked, non-overlapping points; merge overlaps and send residual risk to the review guide.

A **complete path** is the full repository-root-relative POSIX path. `README.md` is valid; nested files include every directory segment. Never basename-only, `./…`, `~`, or a machine-absolute path. The provenance footer may name the inspected repo root when safe.

Each admitted point lists every directly involved source, test, schema, config, and supporting-protection file with its role. Renames: `old/path → new/path`. Deleted files stay visible. Unchanged supporting/protection files may appear labelled as such.

Each point owns 0–1 canonical, contiguous, verbatim excerpt of ~6–16 lines, tagged with complete path plus useful line range or symbol. Omit only when no concise excerpt can truthfully represent the point; state that reason; rely on the involved-path list; never manufacture code. Each hotspot excerpt consumes one of the five snippet slots.

### 3 · Build from the template

Section order (drop what doesn't apply, keep the order):

1. **Hero**: eyebrow, title, one lede, clickability tip.
2. **Stat tiles** (4–6): changed files, line delta, tests/checks, other headline numbers; each uses `data-pop` or `data-goto`. Changed-files and line-delta tiles both open the one `pop-files` inventory (complete path, status, delta, role).
3. **What changed and why**: before → after, intent, and what stayed unchanged.
4. **Big picture**: one CSS flow (`.flow`/`.fbox`); each ◆ marker targets its specific `#hot-<slug>`.
5. **Critical points** (`details.hot#hot-<slug>`). Collapsed `<summary>` must be understandable: category + critical point + short why. Expanded `.hot-body` has **Failure if wrong**, **Protected by**, **Files involved**, and **Key code**. Path elements use `data-path` with the complete POSIX path; the canonical excerpt uses a unique `data-code-key`.
6. **Changed surface**: area → change → reason → key files. Exhaustive inventory stays in `pop-files`.
7. **Protocol / lifecycle**: numbered sequence (`ol.seq`) plus a verbatim sample in a plain `<pre>`.
8. **Data model**: `.schema` cards + one cascade/relationship line.
9. **Additional key code** (optional): only unconsumed snippet slots, for architecture evidence not already shown in a critical point. Tag with complete path and unique `data-code-key`.
10. **Fixture/demo**: `pre.tree` if a fixture exists.
11. **Verification status**: exact commands and results, plus explicit skips (`li.skip`). Optional `.bars`.
12. **Critical findings** (`.finding` cards with badges, ids `f-<slug>`).
13. **Decisions and tradeoffs**.
14. **Review guide**: focus, remaining risks (including residual critical-point risk), follow-up.
15. **Footer**: date + exact scope and sources.
16. **`<dialog>` popovers** at the end of body.

Interactivity (already in the template):

- `data-pop="pop-<id>"` opens that `<dialog>`.
- `data-goto="#<id>"` opens the target or closest ancestor `<details>`, then scrolls and flashes. Native `<details>` expansion works without JavaScript.
- `?pop=<id>` deep-links a popover; `#hot-<slug>` opens that critical point.

### 4 · Verify rendering — mandatory

Serve the file over HTTP and inspect screenshots yourself:

1. Full-page **light** mode.
2. **Dark** mode — if you can't emulate `prefers-color-scheme`, screenshot a temp copy made with `sed 's/@media (prefers-color-scheme: dark)/@media all/'`.
3. One **popover open** via `?pop=`.
4. One **expanded critical point** at desktop width and at a narrow (~320–360px) width.

Also verify: keyboard toggle of `<details>`, a specific ◆ jump and `#hot-<slug>` hash both open the right card, long paths wrap, code scrolls instead of overflowing, print shows expanded details, and the console has no errors.

Then **clean up**: delete temp copies/screenshots, stop the server and browser.

## Visual system rules (details live in the template)

- Colors are CSS custom properties for light, overridden in one `@media (prefers-color-scheme: dark)` block — never hardcode a hex in the body.
- Status/badge colors (`--good/--warning/--serious`) are for severity only; badges always pair color with a text label.
- Charts: single-hue only; direct value labels; no chart libraries, dual axes, or rainbow palettes.
- Highlight `pre.hl code` with the template tokenizer. Plain `<pre>` stays unhighlighted.
- Escape `<`, `>`, `&` inside snippet markup; the highlighter reads decoded `textContent` and re-escapes.
- Body text stays in ink tokens; accent is for interactive elements only.
