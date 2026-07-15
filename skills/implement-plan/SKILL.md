---
name: implement-plan
description: >-
  Implements existing Markdown plans exhaustively with a mandatory loaded
  tracker, Analyze → Plan → Implement → Verify task loops, active validation,
  optional bounded delegation, and plan-backed milestone and final reviews. Use
  when the user asks to implement, execute, carry out, or continue an existing
  plan. Do not use for creating a plan from scratch or only reviewing a plan.
license: MIT
compatibility: >-
  Requires project write access. Optional delegation requires a safely available
  execution capability that supports least privilege, isolated writers, terminal
  handoffs, and cleanup. Browser-visible tasks additionally require an available
  browser automation capability for manual verification.
metadata:
  short-description: Implement plans with a mandatory tracker and verified task loops
---

# Implement Plan

## Instruction priority

Follow explicit user/system/developer instructions over this workflow. Delegation is optional: consider it only when bounded fresh context, independent judgment, or safe parallelism materially improves the work. Parent execution is valid when delegation is unavailable, unsafe, or not worth its coordination cost. Whenever delegation is used, apply every permission, isolation, terminal-handoff, parent-verification, and cleanup rule below.

## Mandatory startup gate

Complete this gate in order before any project source edit or delegated implementation launch:

1. Read the entire plan; continue by offset if output is truncated.
2. **Use the file-reading tool to load [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md).** Noticing, citing, or remembering it does not count.
3. Copy/adapt the template into the plan's `Implementation Progress` section, or into a retained tracker file when the plan must not be edited.
4. Populate the initial coverage inventory and record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
5. Only then inspect implementation context, refine tasks, choose parent/delegated execution lanes, and edit source files.

On resumed work, reload the template, reread the full plan, and reconcile the tracker before editing. If the template cannot be loaded, implementation remains blocked until it is available; do not fabricate load evidence or silently substitute a remembered version.

## Completion contract

- Map every actionable plan requirement to task rows; never hide a multi-item phase behind one opaque row.
- Run every row through **Analyze → Plan → Implement → Verify → update tracker**. Parent and delegated tasks follow the same evidence contract.
- Continue automatically while dependency-ready rows remain and no human decision is required.
- Mark a row `Verified` only after task-specific validation passes. `Descoped` requires explicit user approval and rationale.
- A phase is complete only when all child rows are `Verified` or user-approved `Descoped`.
- Before claiming completion, reconcile the original plan line by line against the tracker. Any open row means `Partial` or `Blocked`, never `Complete`.

## Execution and context contract

- For each bounded task or milestone, choose parent execution or delegation based on fresh-context value, independence, safe parallelism, handoff risk, and coordination cost. Record the strategy; parent execution needs no exception when delegation is unavailable or not worthwhile.
- Give a delegated worker only the files, tools, write scope, credentials-free context, and commands needed for its assignment. Use fresh context per task or milestone, with the plan/tracker paths, task IDs, acceptance criteria, relevant files, constraints, and verification expectations.
- Concurrent writers are allowed only for genuinely independent tasks with one isolated worktree per writer. Writers sharing a worktree run sequentially even when their intended files do not overlap. Do not edit overlapping code while delegated writing or review is active.
- Track every delegated run to a terminal state. Capture a structured terminal handoff with assignment/run identity when available, files changed/read, decisions, commands/results, skipped checks, risks, blockers, and exact remaining work. Persist essential evidence in the tracker rather than relying on a long transcript.
- Keep the tracker single-writer when lanes run in parallel or may resume concurrently. At milestone boundaries carry forward files and evidence, not accumulated execution context.
- The parent remains responsible for decomposition, synthesis, consistency, diff inspection, spot-checking claims, validation, review decisions, and the final outcome. Delegated success is evidence, not verification.
- After each delegated assignment, clean up temporary worktrees, processes, sessions, credentials, and communication artifacts not intentionally retained. Never discard owner work during cleanup.

## Core rules

- Document plan deviations before or immediately after making them.
- Before each task loop, define verification, meaningful test coverage, and any human checkpoint.
- Add or update tests when they protect acceptance criteria, user-visible behavior, regressions, integration boundaries, failure paths, edge cases, or security/data invariants. Avoid implementation-detail, duplicate, over-mocked, or count-only tests; document why strong automated coverage is impractical when applicable.
- For UI/browser-visible changes, read the `agent-browser` skill and perform real-browser verification unless impossible or explicitly out of scope; record any skip reason.
- Ask the human for requested approvals, material ambiguity, access/credentials, destructive or production-impacting actions, or unresolved repeated failures—not for routine review.
- A missing validation CLI is not permission to install it. Respect project/user no-dependency constraints; record the unavailable gate as blocked and ask before installing any project or global tool.
- Use the tracker as durable task memory and the source of truth before handoffs, compaction summaries, and final responses. Never store secrets in it.
- When required, validate uncommitted base-to-worktree diffs, forbidden dependencies in source plus lock/install graphs, and targeted formatting without broad unrelated churn.

## Workflow

### 1. Initialize the execution queue

- Use the exact user-provided plan path; ask only if the intended plan is ambiguous.
- Complete the mandatory startup gate above.
- Give every independently executable implementation, test, migration, cleanup, documentation, rollout, and verification task a stable ID, dependency mapping, planned check, and exact plan reference.
- Keep the tracker retained and current. Record execution strategy, files, commands/results, reviews/fixes, skips with reasons, blockers, decisions, and the exact next ready task.

### 2. Decompose and choose execution

- Split compound rows until each is one coherent, independently verifiable loop. Preserve plan phases as milestone groupings.
- For every row, record parent or delegated ownership, sequential/parallel mode, dependencies, write isolation, expected evidence, and any available run identifier. Consider delegation; do not manufacture delegation where a parent pass is safer or cheaper.
- If the plan is too vague or large to execute safely, first add a task/milestone breakdown; ask the user only if it changes scope, behavior, or risk.

### 3. Execute each task loop

Choose the next dependency-ready row. Multiple rows may be `In progress` only in genuinely independent, isolated lanes.

1. **Analyze:** inspect the plan section, current state, prior evidence, risks, and unknowns.
2. **Plan:** record the bounded action, expected result, verification, rollback/cleanup, and checkpoint need.
3. **Implement:** make the coherent change through the chosen parent or delegated lane, preserving the assignment's scope.
4. **Verify:** have the parent inspect the resulting diff/evidence and run targeted behavioral tests plus relevant lint/typecheck/build. For UI work, also perform required real-browser checks.
5. **Update and decide:** record evidence immediately. Mark `Verified` only on success; otherwise repeat analysis or mark `Blocked`. Then continue to the next ready row.

Operational rules:

- Give delegated workers narrow assignments using paths and task IDs; include full plan content only when they cannot access it.
- Do not advance past required delegated work still running. Continue only isolated work, then wait for a terminal state and incorporate the handoff.
- Do not overlap writers in one worktree or edit overlapping code while a checkpoint review is active.
- If context/time limits force a stop, checkpoint exact non-terminal rows and the restart point; report a partial handoff, not completion.
- For uncertain third-party behavior or current external evidence, read `web-research` and require current, version-specific sources. Use separable research/reconnaissance only when its evidence value justifies coordination.
- After two failures for the same cause, seek an independent direction when useful and ask the user if the blocker remains.

### 4. Review major milestones

A major milestone is a plan-authored risk, dependency, integration, migration, or delivery boundary—not every phase or task row. Before review, update the tracker.

Request or invoke `code-review` with these explicit axes:

- **Baseline:** plan-backed against the applicable plan sections, acceptance criteria, decisions, approvals, and tracker evidence.
- **Scope:** bounded to the completed milestone task IDs and changed files, plus callers, tests, shared contracts/state, migrations, generated outputs, and integration boundaries needed to judge the slice.
- **Invocation:** embedded; this workflow owns timing, finding resolution, and completion decisions.
- **Output:** handoff only by default, with no separate review artifact unless explicitly requested.

If a plan-authored checkpoint and this workflow checkpoint align in scope, baseline, evidence, and exit conditions, run one review and reference its ID from all applicable rows. Do not launch duplicate reviews or require one reviewer per task merely because both documents mention a checkpoint.

Prefer a safely available, fresh-context, read-only independent reviewer when its independence is worthwhile. Ask for independent judgment, not approval, and prohibit edits unless explicitly intended. If independent review is unavailable or not worthwhile, record the independence limitation and perform the same bounded review directly with a separate checklist-driven pass; do not block solely on delegation.

Provide a complete, non-steering payload:

- plan and tracker paths; milestone/task IDs, plan sections, acceptance criteria, decisions, and approved deviations;
- changed and untracked files or equivalent diff evidence, relevant callers/tests, and required integration boundaries;
- validation commands/results, runtime/manual evidence, skipped checks with reasons, and confidence limits;
- constraints, non-goals, deviations, known risks, blockers, unresolved questions, and exact read/write permissions.

Require this handoff:

| Part | Required content |
|---|---|
| Coverage | Complete inspection, every authority-matrix row, and separate baseline, compliance, implementation, and validation-quality verdicts. |
| Advisory scores | Severity `S4 Critical`→`S0 Optional`; confidence `C3 Confirmed`→`C1 Tentative`. |
| Finding selection | Every `S4`, at most five material `S3`/`S2`, and no `S1`/`S0` by default. |
| Overflow | One blocking `not review-ready` caveat with highest score, affected areas, aggregate impact, evidence, and count/lower bound. |
| Evidence | Coverage/skips, scores, location, evidence, reachability, impact, smallest fix/validation, no-material-findings, and limitations. |

The parent applies this admission gate:

| Gate | Required handling |
|---|---|
| Scores | Guidance only; independently rescore. No label—even `S4`—admits or blocks by itself. |
| Materiality | Check evidence, reachability, scope relevance, impact, assumptions, and fix/regression/maintenance cost. |
| Disposition | Record reviewer/parent scores and accept/reject/defer rationale; downgrade or reject niche, irrelevant, immaterial, or disproportionate findings. |
| Validation | Treat `NEEDS RUNTIME VALIDATION` separately from confidence; create validation work, not speculative implementation. |
| Tasks/blocking | Create rows only for admitted material findings; `S1`/`S0` cannot block without user direction. Fix admitted work and rerun validation. |

| Review lifecycle | Rule |
|---|---|
| Normal | Initial review plus one follow-up limited to accepted fixes, affected boundaries, and material regressions. |
| Incidental severe issue | Surface for parent reassessment without broad discovery. |
| Extra round | Require unresolved material risk, confirmed regression, or invalidated coverage; then stop for parent/human disposition. |
| Exit | Resolve, reasonedly reject/defer, expose a human decision, or isolate before overlapping work. Reuse reviewer context when practical. |

### 5. Reconcile and finish

- Enter final reconciliation/review only when no implementation row is `Pending`, `In progress`, or `Blocked`.
- Reread the full original plan and complete the template's final reconciliation checklist. Add any missed requirement and return to execution.
- Run final targeted and repository-wide validation, required browser/manual checks, and repository-index cleanup when the user did not request staging.
- Request or invoke `code-review` with **plan-backed + full + embedded + handoff-only** axes over the entire plan, tracker, implementation, required integration boundaries, and all applicable review dimensions. Default to no separate artifact. Use the same complete payload and handoff schema as milestone review, expanded to every plan item, changed file/caller, validation result/skip, deviation, constraint, and known risk.
- Prefer safely useful independent final review; otherwise record the independence limitation and perform a separate checklist-driven direct final review. Deduplicate any aligned plan-authored final checkpoint into this one review.
- Require the final handoff's complete authority matrix and separate baseline-quality, implementation-compliance, implementation-quality, and test/validation-quality verdicts. Apply Section 4's selective output, parent admission/validation-row rules, validation reruns, and shared follow-up/round-stop policy rather than starting another loop.
- Convert unresolved material review findings or scope-relevant validation failures into `Blocked` rows. Only unrelated pre-existing failures may remain documented caveats. Final completion is blocked until every admitted milestone/final finding is resolved, rejected/deferred with rationale, or explicitly awaiting a human decision.
- Update the tracker after final review. If it is repository-tracked, rerun formatting/checks that include it.

## Final response

Include concisely:

- plan/tracker path and truthful `Complete`, `Partial`, or `Blocked` status;
- counts of `Verified` and user-approved `Descoped` rows, plus remaining task IDs;
- completed milestones and delegation used, or that parent execution was selected;
- validation, meaningful test coverage, and browser/manual checks or skip reasons;
- milestone/final review IDs, method/independence limitation, findings/fixes/follow-up, and alignment status;
- remaining caveats or human decisions.
