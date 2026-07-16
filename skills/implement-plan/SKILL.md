---
name: implement-plan
description: >-
  Implements existing Markdown plans exhaustively through tracked task loops,
  delegation-first execution, active validation, and plan-backed reviews. Use
  this skill when asked to implement, execute, carry out, or continue an
  existing plan. Do not use for creating a plan from scratch or only reviewing
  a plan without implementing it.
license: MIT
compatibility: >-
  Requires project write access. Delegation-first execution uses a safely
  available capability with least privilege, isolated concurrent writers,
  terminal handoffs, and cleanup; concrete fallbacks must be recorded when that
  capability cannot safely serve eligible work. Browser-visible tasks also
  require browser automation for manual verification.
metadata:
  short-description: Implement plans with delegated, tracked, verified task loops
---

# Implement Plan

## Instruction priority

Follow explicit user/system/developer constraints over this workflow. After the mandatory plan/tracker gate, delegate eligible bounded work when a safe capability exists. Delegation-first does not mean maximum fan-out: retain work in the parent only for a concrete reason allowed below, and preserve every isolation, handoff, verification, and lifecycle rule.

## Mandatory startup gate

Complete this gate in order before any project source edit or delegated implementation launch. Use the exact user-provided plan path; ask only if the intended plan is ambiguous.

1. Read the entire plan; continue by offset if output is truncated.
2. **Use the file-reading tool to load [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md).** Noticing, citing, or remembering it does not count.
3. Copy/adapt the template into the plan's `Implementation Progress` section, or into a retained tracker file when the plan must not be edited.
4. Populate the initial coverage inventory and record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
5. Only then inspect implementation context, refine tasks, classify execution lanes, or edit source files.

On resumed work, reload the template, reread the full plan, and reconcile the tracker before editing. If the template cannot be loaded, implementation is blocked; never fabricate load evidence or substitute memory.

## Completion contract

- Map every actionable requirement to independently verifiable rows; do not hide a multi-item phase in one opaque row.
- Run every row through **Analyze → Plan → Implement → Verify → update tracker**, regardless of owner.
- Continue automatically while dependency-ready rows remain and no human decision is required.
- Mark a row `Verified` only after task-specific validation passes. `Descoped` requires explicit user approval and rationale.
- Complete a phase only when every child row is `Verified` or approved `Descoped`.
- Before claiming completion, reread the original plan and reconcile it line by line. Any open row means `Partial` or `Blocked`, never `Complete`.

## Delegation-first execution strategy

After the startup gate:

1. Decompose compound work into coherent rows with stable IDs, dependencies, planned checks, and exact plan references. If vagueness prevents safe execution, refine the breakdown first; ask the user only when this changes scope, behavior, or risk.
2. Before each execution batch, enumerate all dependency-ready rows. Classify every bounded non-trivial row as delegation-eligible or not eligible.
3. Mark a row eligible when it has bounded ownership and acceptance evidence and can be handed off without unsafe coupling. When a safe capability exists, delegate it.
4. Keep a row in the parent only for a recorded concrete reason: true triviality; tight coupling or parent integration ownership; overlapping scope; unavailable safe isolation or capability; immediate iterative decision-making; user prohibition; or verification cost greater than the delegation benefit. Do not call a broad phase “trivial.”
5. For each batch record task IDs, owner and rationale, batch ID, dependencies and join point, file/domain ownership, overlap analysis, isolation mode, run/handoff state, and required review checkpoint.

Concurrent writers require genuinely independent ownership and one isolated worktree per writer. Writers in one checkout run sequentially, even when intended files differ. Do not mutate overlapping code while a writer or checkpoint review is active. Parallel readers must have non-overlapping questions or independent-review value.

The parent is the tracker's only writer whenever lanes run concurrently or may resume concurrently. The parent owns decomposition, integration, complete diff inspection, claim spot-checking, validation, review disposition, and the final result; a successful delegated run is evidence, not verification.

For each delegated run:

- grant only necessary files, tools, write scope, credentials-free context, and commands;
- provide fresh task context: plan/tracker paths, IDs, acceptance criteria, constraints, relevant starting files, and expected checks;
- require a terminal handoff containing run identity when available, files read/changed, decisions, exact commands/results, skips, risks, blockers, and remaining work;
- track it to a terminal state; do not fire and forget or advance through a required join point early;
- have the parent inspect its diff and evidence, spot-check claims, and run task-specific tests plus relevant lint/typecheck/build;
- resolve failed, blocked, unknown, interrupted, or timed-out states, then clean workflow-owned worktrees, processes, sessions, credentials, and disposable artifacts without discarding owner work.

## Core implementation rules

- Record deviations before or immediately after making them.
- Before each loop, define acceptance evidence, meaningful test coverage, rollback/cleanup, and any human or review checkpoint.
- Add or update tests for acceptance behavior, regressions, integrations, failure paths, edge cases, and security/data invariants when valuable. Avoid count-only, duplicated, over-mocked, or implementation-detail tests; explain material coverage gaps.
- For UI/browser-visible changes, read the `agent-browser` skill and perform real-browser verification unless impossible or explicitly excluded; record the skip and confidence limit.
- Ask the human only for requested approvals, material ambiguity, credentials/access, destructive or production-impacting actions, or unresolved repeated failures.
- Do not install a missing validation tool without authorization. Record the unavailable gate and its effect.
- Keep the tracker as durable, secret-free task memory. Validate relevant uncommitted diffs, dependency graphs, generated outputs, and targeted formatting without unrelated churn when the project requires them.
- For uncertain current third-party behavior, read `web-research` and use current version-specific sources. Delegate separable research only when its evidence value justifies the lane.

## Task loop

For each batch, select from the enumerated dependency-ready rows. Multiple rows may be `In progress` only in isolated independent lanes.

1. **Analyze:** inspect the plan requirement, repository state, callers/boundaries, prior evidence, risks, and unknowns.
2. **Plan:** record the bounded change, owner/batch/isolation decision, expected result, checks, rollback/cleanup, join point, and review need.
3. **Implement:** make the coherent change in the assigned parent or delegated lane without crossing ownership.
4. **Verify:** the parent inspects the diff/evidence and runs targeted behavioral tests plus applicable static/build and browser/manual checks.
5. **Update and decide:** record exact evidence immediately. Mark `Verified`, repeat analysis, or mark `Blocked`; then enumerate the next dependency-ready batch.

If time or context forces a stop, record exact non-terminal states and restart point and report a partial handoff. After two failures from the same cause, seek an independent direction when useful and ask the user if the blocker remains.

## Review checkpoints

Default to a fresh, read-only independent subagent reviewer applying the current `code-review` contract when a safe capability exists:

- at every plan-authored checkpoint;
- after a major integration, migration, risk, dependency, or delivery boundary;
- after a risky coherent task batch; and
- during final reconciliation.

Do not require a reviewer for every tiny row. Deduplicate checkpoints aligned in scope, baseline, evidence, and exit conditions; record one review ID against all covered rows. A direct checklist-driven review is allowed only with a concrete recorded fallback: unavailable or unsafe review capability, user restriction, or review scope whose verification cost is genuinely disproportionate to the independence benefit. State the resulting independence limitation.

Invoke `code-review` with explicit axes:

- **Baseline:** plan-backed against applicable plan sections, acceptance criteria, decisions, approvals, deviations, and tracker evidence.
- **Scope:** bounded checkpoint tasks plus necessary callers/contracts/state/tests/migrations/generated outputs, or full plan and all integration boundaries for final review.
- **Invocation/output:** embedded and handoff-only unless explicitly requested otherwise.
- **Evidence:** plan/tracker paths, IDs, relevant diff/files, validation and runtime/manual results, skips and confidence limits, constraints/non-goals, deviations, risks, blockers, and permissions.

Use `code-review` as the authority for materiality, scoring, finding selection, overflow, and bounded follow-up; do not reproduce that policy in the tracker. Require complete applicable authority-matrix coverage and the four separate baseline-quality, implementation-compliance, implementation-quality, and test/validation-quality verdicts.

The parent independently verifies and dispositions findings by evidence, reachability, relevance, impact, and proportional fix/regression/maintenance cost. Record material dispositions, admitted fix or validation rows, reruns, and the bounded follow-up under the same review ID. Labels never decide admission. Resolve, reasonedly reject/defer, isolate, or expose a human decision before overlapping work continues.

## Final reconciliation

Enter final reconciliation only when no implementation row is `Pending`, `In progress`, or `Blocked`:

1. Reread the full plan and complete the tracker's reconciliation checklist; add and execute any missed requirement.
2. Run final targeted and repository-wide checks plus required browser/manual validation and safe repository-index cleanup.
3. Run one deduplicated fresh final review with **plan-backed + full + embedded + handoff-only** axes, or record the allowed direct fallback and limitation.
4. Require the complete matrix and all four verdicts; disposition material findings, create rows for admitted work, fix, rerun affected checks, and record the code-review-governed follow-up.
5. Convert unresolved material findings or scope-relevant failures to `Blocked`. Only evidence-backed unrelated pre-existing failures may remain caveats.
6. Update the tracker, and rerun checks that cover it when tracked.

## Final response

Report the plan/tracker paths and truthful status; `Verified`/approved `Descoped` counts and remaining IDs; batches/delegated runs and concrete parent fallbacks; validation and browser/manual evidence or skips; review IDs, independence/fallback, dispositions, fixes/reruns, and alignment; unresolved decisions, caveats, and retained resources.
