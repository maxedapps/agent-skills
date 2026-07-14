---
name: code-review
description: Performs adversarial, evidence-bound code reviews for bugs, regressions, security, high-value tests, performance, typing, maintainability, and unnecessary complexity, then saves and opens an HTML report by default. Use when the user asks for code review, PR/local-change review, bug/security/performance/maintainability analysis, cleanup/refactoring opportunities, or whether code can be improved. If the target is a Markdown plan/tracker/design doc, use review-plan-implementation semantics. For underspecified review requests, default to the entire current codebase and all review dimensions. Do not use for implementing changes unless asked.
compatibility: >-
  Requires normal project file access and Node.js 18+ for the review HTML renderer.
  Bun is optional: it enables rich Markdown rendering; without it, the renderer
  warns and produces escaped plain-text HTML instead of failing. A local
  browser/open command is recommended for opening the generated report.
metadata:
  short-description: Adversarial code review for real bugs, risks, tests, and unnecessary complexity
---

# Code Review

## Instruction priority

Follow explicit user constraints and higher-priority instructions. If the user provides a target or review dimensions, those define the scope; otherwise default to the entire current codebase and all review dimensions. If the user narrows scope, forbids tools, asks for chat-only output, or gives a conflicting workflow, adapt and briefly note meaningful deviations.

## Core mindset

Be adversarial but evidence-bound: actively try to find real bugs, regressions, security issues, weak tests, broken contracts, hidden complexity, and maintainability risks. Be skeptical of implementation claims and tracker checkboxes. Do **not** invent issues, inflate uncertainty, nitpick harmless style, or report speculation as fact.

## Core rules

- Do not ask for a target or dimensions for bare/vague review requests; default to the entire current codebase and all relevant review dimensions.
- Ask a clarifying question only when the user provided extra scope/dimension information and that information is ambiguous, conflicting, or likely to make the default review the wrong target.
- Do not implement changes unless requested. If implementing, preserve behavior unless the user explicitly wants behavior changes.
- If the target is a Markdown plan/tracker/design doc, or the user asks whether an implementation satisfies a plan, apply the `review-plan-implementation` skill semantics instead of ordinary code review.
- Do not use revdiff/interactive annotations unless explicitly requested.
- Do not rush. Work through the selected scope step by step and file by file; read each relevant file in full before drawing conclusions from it, unless it is generated/vendor/lockfile content or genuinely too large, in which case record the skipped/partial read and why.
- For large scopes (roughly >10k lines or several subsystems), read and apply the `use-subagents` skill, then partition the codebase and delegate each partition to a parallel read-only subagent instead of reading everything in one context. Instruct each subagent to: read every partition file in full, cover the selected dimensions, label findings CONFIRMED vs PLAUSIBLE with `path:line` and smallest safe fix, empirically confirm cheap high-severity suspicions using throwaway repros confined to the session scratchpad, and return raw findings plus coverage notes (files read/skipped, checks not run). The orchestrator keeps raw child handoffs in `.subagents/`, logs synthesized coverage and findings to `.progress` as they arrive, spot-verifies top findings, dedupes by root cause across partitions (independent confirmations of the same root cause strengthen one finding, not two), and verifies the tracked worktree is untouched afterwards.
- Create or reuse `.progress/<review-slug>.md`; record scope, evidence, files checked, commands, research, skipped checks, and open questions.
- Save the final report to `.reviews/<review-slug>.md` unless file writes are forbidden.
- Render and open the final Markdown report as HTML by default whenever a review/code-analysis report is requested and file rendering is not forbidden. Before rendering, run `node scripts/render-review-html.mjs --help` from this skill directory or use the equivalent absolute script path. The final render command must include `--open`; if you accidentally render without `--open`, rerun the same command with `--open` before the final response.
- Before final responses or summaries, reread relevant `.progress` and `.reviews` notes and use them as source of truth.
- If reviewing uncommitted work with subagents, instruct them to treat the repo as read-only and forbid `git checkout`/`restore`/`stash`/`clean`.
- Before running builds/type generation or other checks that may rewrite tracked generated files, snapshot their pre-review state. After validation, restore only review-created generated changes and verify the owner’s pre-existing worktree changes remain intact.
- Prefer concrete findings with file/function/line evidence and clear impact. Separate must-fix issues from improvements and optional polish.
- Always evaluate high-value test coverage, not just test presence or coverage volume. Check whether tests protect user-visible behavior, acceptance criteria, regressions, invariants, integration boundaries, important happy paths, failure/error paths, edge cases, and security/data-safety risks. Flag missing high-value tests and low-value tests that only assert implementation details, over-mock real behavior, duplicate existing coverage, or create false confidence.
- For cleanup/refactor reviews, use the decision order **delete → direct import → small local helper → shared abstraction**. Explicitly inventory concrete deletion/consolidation candidates, distinguish residual wrappers from already-shared implementations, and name similar code that should intentionally remain separate.
- Challenge every proposed new package, service, helper, descriptor, or framework against current consumers and change drivers; anti-overengineering language alone is not enough if the recommendations themselves add speculative structure.
- Confirm cheap high-severity suspicions empirically when practical; label findings as confirmed vs plausible-from-reading.

## Scope and dimensions

Default when no extra information is provided: review the entire current codebase against all dimensions. Do not ask the user to choose a target or criteria first.

If the user provides scope or criteria, apply it directly when clear. Ask only if the provided information is ambiguous or conflicting, for example an unclear target branch, a file pattern that matches nothing, or mutually exclusive criteria.

“All dimensions” means:

1. Correctness / bugs
2. Code quality / simplicity
3. Typing / type safety
4. Library/language best practices
5. Security / data safety
6. Performance / scalability
7. High-value tests / validation
8. API contracts / backwards compatibility
9. Error handling / observability
10. Data integrity / migrations
11. Dependency / config / CI risks
12. Accessibility / UX
13. Other/custom focus if the request implies it

For detailed review heuristics by dimension, read `references/review-dimensions.md` before deep review or whenever running all dimensions.

## Workflow

1. Resolve target and dimensions using the scope defaults; only pause for clarification when the user-provided extra information is ambiguous or conflicting.
2. Create `.progress/` and `.reviews/`; create or reuse a short kebab-case slug.
3. Inspect repository shape, current status, relevant diffs, touched files, call sites, tests, config, docs, and nearby patterns before judging isolated code.
4. For project-status or plan/tracker reviews, verify claimed completion directly from code, tests, commits, and progress trackers; do not trust filenames or checklist state.
5. For refactors that move/rename/extract files, compare old vs new content and test coverage to catch dropped or drifted logic.
6. If library/framework best-practice accuracy matters, identify installed versions and research current official docs/source/release notes before judging.
7. Review the selected dimensions. For all-dimensions reviews, read `references/review-dimensions.md` and cover every relevant category.
8. For UI/visual/motion code, verify representative rendered states when practical; static code review and typecheck are not enough for layout, interaction, clipping, animation, or final-frame quality.
9. Write `.reviews/<review-slug>.md` using `assets/review-report-template.md` as the starting structure.
10. Render and open the Markdown report as a self-contained HTML file next to it, e.g. `.reviews/<review-slug>.html`.
    - Before rendering, run `node scripts/render-review-html.mjs --help` from this skill directory or use the equivalent absolute script path.
    - Use this skill's bundled renderer script, not generic preview tools, for the default workflow.
    - Include `--open`, for example: `node /absolute/path/to/code-review/scripts/render-review-html.mjs .reviews/<review-slug>.md --out .reviews/<review-slug>.html --open`.
    - If Bun is unavailable but the renderer exits successfully, accept the escaped plain-text HTML fallback and record the warning only when it materially affects review usability; missing Bun alone does not block the review.
    - If rendering or opening is impossible, record why in `.progress` and include the skipped check in the final response.
11. Respond concisely with the top findings, Markdown report path, HTML report path, progress path, and skipped checks.

## Finding quality bar

Report an issue only when it has clear evidence and user-relevant impact. Each important finding should include:

- location (`path:line` when possible)
- problem and why it matters
- confidence/evidence, including repro result if run
- smallest safe fix or direction

Avoid low-signal output:

- style preferences not backed by project convention or risk
- hypothetical future problems with no plausible path
- “could be cleaner” without naming concrete complexity or impact
- duplicate findings for the same root cause

## Research and validation

- Use project tests, lint, typecheck, build, migration checks, repro scripts, API checks, browser verification, or screenshots when they materially improve confidence.
- Write throwaway repro tests as assertions of the hypothesized behavior, not `console.log` observations — sandboxed test runners (e.g. Cloudflare workers vitest pool) may swallow console output.
- If a relevant check cannot be run, record why and how that limits confidence.
- Delete temporary repro artifacts unless the user wants them kept.
- If a repo formatter/check includes review artifacts, format `.progress`/`.reviews` Markdown and rendered HTML files so review artifacts do not break project gates.

## If implementing requested fixes

- Read all affected files and call sites before editing.
- Prefer deleting, collapsing, standardizing, or simplifying before adding abstractions.
- Update tests/docs/config as needed and run relevant validation.
- Summarize changed files, behavior preserved/changed, and verification.
