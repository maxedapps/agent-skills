---
name: implement-plan
description: >-
  Implements existing Markdown plans exhaustively through delegated task loops,
  validation, and review closure. Use this skill when asked to implement,
  execute, carry out, or continue an existing plan. Do not use for creating a
  plan from scratch or only reviewing a plan without implementing it.
license: MIT
compatibility: >-
  Requires project write access. Delegation requires a safely available
  subagent capability. Browser-visible work requires browser automation.
metadata:
  short-description: Implement plans via delegated task loops and review
---

# Implement Plan

## Hard rules

- Stay on the plan’s required outcome. Discovery/review do **not** add scope.
- Prefer the smallest behavior-preserving change. Skip unnecessary abstractions/tests/safeguards.
- **Delegate by default** when safe. “Small/easy” is not a reason to skip subagents.
- Leverage subagents — built-in, extensions/plugins, or skills. Follow `use-subagents` policy; use native subagents, extensions / plugins, or other skills
- Main agent owns: tracker, integration, dispositions, acceptance, user comms, cleanup.
- Child handoffs = evidence, never acceptance. Inspect diffs; rerun checks.
- Findings / `decomplex` recs never auto-create work — disposition first.
- Material doubt, scope/risk choices, or stuck review loops → **ask user**.
- Never fake `Complete`.

## Startup (blocking)

1. Read the **full** plan (offset if truncated).
2. **Read** [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md) with the file tool (memory doesn’t count).
3. Leverage subagents — built-in, extensions/plugins, or via skills.
4. Copy/adapt tracker into the plan or a standalone file.
5. Map every actionable plan requirement → tracker rows (split compound work into tasks/subtasks).
6. Record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
7. Only then implement.

On resume: repeat startup and reconcile. Missing template → stop.

## Task loop

For each dependency-ready task/subtask (delegate by default):

1. **Analyze** — read starts-at paths, callers, tests; research only if needed (`web-research` when third-party/current behavior is uncertain).
2. **Implement** — smallest change that satisfies the row; stay in ownership; record deviations.
3. **Check** — targeted tests + applicable lint/typecheck/build/migration/browser (`agent-browser` for UI).
4. **Review** — independent `code-review` when the task crosses a real boundary, or when the batch/phase completes; always for final full-plan review.
5. **Disposition** findings:
   - `Fix now` · `Validate` · `Reject` · `Ask user` · `Block`
   - Fix accepted items (delegate); rerun checks; focused re-review until `Clear`
   - Complexity-increasing fix → `decomplex` triage if available, else built-in gate; doubt → ask user
   - Two failed rounds / recurrence / no progress → ask user
6. **Update tracker** — `Verified` needs evidence; `Descoped` needs user approval.
7. **Cleanup** lane resources per `use-subagents` (and Pi `clean` if that launcher was used) — no orphans.
8. Next ready task/subtask.

Parallelize only independent tasks with isolated writers. Parent is sole tracker writer under concurrency.

## When to review

- After major boundaries: integration, migration, public contract, security/data invariant, risky dep, delivery milestone
- Plan-authored checkpoints
- Final full-plan review (plan-backed)

Fresh reviewers; don’t share conclusions pre-handoff. One reviewer default. Parent review only if independent review is unavailable — record the limit.

Reviewer states: `Clear` · `Changes required` · `Human decision required` · `Blocked`

## Done

1. Reread full plan — no missed requirements.
2. No row `Pending` / `In progress` / `Blocked`.
3. Diff hygiene — drop unjustified scope/complexity.
4. Final checks + final plan-backed review (+ `decomplex` Audit of **this** diff if proportionate).
5. Final cleanup — worktrees, branches, processes, runtime state.
6. Report truthfully.

`Complete` only when all rows are `Verified` or approved `Descoped`, validation passed, final review is `Clear`, and nothing material remains open. Else `Partial` or `Blocked`.

## Report

- plan/tracker paths · status · remaining IDs
- what was delegated vs parent-owned (and why)
- checks run / skipped
- review outcomes + dispositions
- decisions, deviations
- worktrees created/integrated/removed · retained resources + why
