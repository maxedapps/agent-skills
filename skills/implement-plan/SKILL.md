---
name: implement-plan
description: Implements existing Markdown plans exhaustively with a mandatory loaded tracker, worker-first task delegation, Analyze → Plan → Implement → Verify loops, active validation, and independent reviews. Use when the user asks to implement, execute, carry out, or continue an existing plan. Do not use for creating a plan from scratch or only reviewing a plan.
metadata:
  short-description: Implement plans with a mandatory tracker and worker task loops
---

# Implement Plan

## Instruction priority

Follow explicit user/system/developer instructions over this workflow. All delegated workers and reviewers must run through `use-subagents` in visible Herdr panes. If Herdr delegation is unavailable, record the blocker and do not substitute hidden or headless agents.

## Mandatory startup gate

Complete this gate in order before any project source edit or implementation-worker launch:

1. Read the entire plan; continue by offset if output is truncated.
2. **Use the file-reading tool to load [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md).** Noticing, citing, or remembering it does not count.
3. Copy/adapt the template into the plan's `Implementation Progress` section, or into a retained tracker file when the plan must not be edited.
4. Populate the initial coverage inventory and record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
5. Only then inspect implementation context, refine tasks, assign workers/execution lanes, and edit source files.

On resumed work, reload the template, reread the full plan, and reconcile the tracker before editing. If the template cannot be loaded, implementation remains blocked until it is available; do not fabricate load evidence or silently substitute a remembered version.

## Completion contract

- Map every actionable plan requirement to task rows; never hide a multi-item phase behind one opaque row.
- Run every row through **Analyze → Plan → Implement → Verify → update tracker**. A delegated task follows the same evidence contract.
- Continue automatically while dependency-ready rows remain and no human decision is required.
- Mark a row `Verified` only after task-specific validation passes. `Descoped` requires explicit user approval and rationale.
- A phase is complete only when all child rows are `Verified` or user-approved `Descoped`.
- Before claiming completion, reconcile the original plan line by line against the tracker. Any open row means `Partial` or `Blocked`, never `Complete`.

## Worker and context contract

- For multi-step or broad plans, the parent primarily orchestrates. Assign each bounded implementation task or milestone to a worker by default; scouts, researchers, validators, and reviewers do not satisfy this implementation requirement.
- Dependencies do not prevent delegation: use sequential workers and checkpoint between them. Use parallel workers only for independent tasks in isolated worktrees or explicit non-overlapping write lanes.
- Use one fresh Herdr pane and fresh agent session per task or milestone. Give it plan/tracker paths, assigned task IDs, relevant files, scope, acceptance criteria, and verification expectations; persist essential context in project artifacts instead of forking parent context.
- Close each worker with a structured communication handoff under `.subagents/`, then have the parent record the resulting evidence in the owning plan tracker. Keep the tracker single-writer when workers run in parallel or could resume concurrently. At milestone boundaries, carry forward files and evidence—not accumulated worker transcripts or one long implementation session.
- Parent implementation is an exception requiring a concrete tracker reason: genuinely trivial work, unavailable worker, unsafe handoff, immediate tightly coupled coordination, or explicit user request. Do not repeatedly label rows “trivial” to retain a broad plan in the parent.
- The parent remains responsible for decomposition, assignments, synthesis, consistency, validation, reviews, decisions, and the final outcome.

Before launching any worker or subagent, read and apply the `use-subagents` skill, including its worker isolation, session, transcript, and handoff boundaries.

## Core rules

- Run milestone and final reviewers as fresh-context, read-only subagents through `use-subagents`. Use the user's requested reviewer when safely available; otherwise use that workflow's default reviewer. Ask for independent critique rather than approval, capture the handoff, and reuse the same reviewer session for follow-up on that milestone when possible.
- Document plan deviations before or immediately after making them.
- Before each task loop, define verification, meaningful test coverage, and any human checkpoint.
- Add or update tests when they protect acceptance criteria, user-visible behavior, regressions, integration boundaries, failure paths, edge cases, or security/data invariants. Avoid implementation-detail, duplicate, over-mocked, or count-only tests; document why strong automated coverage is impractical when applicable.
- For UI/browser-visible changes, read the `agent-browser` skill and perform real-browser verification unless impossible or explicitly out of scope; record any skip reason.
- Ask the human for requested approvals, material ambiguity, access/credentials, destructive or production-impacting actions, or unresolved repeated failures—not for routine review.
- Request independent review after each major milestone and at final completion unless the user disables it; record that deviation when disabled.
- Use the tracker as durable task memory and the source of truth before handoffs, compaction summaries, and final responses. Never store secrets in it.
- When required, validate uncommitted base-to-worktree diffs, forbidden dependencies in source plus lock/install graphs, and targeted formatting without broad unrelated churn.

## Workflow

### 1. Initialize the execution queue

- Use the exact user-provided plan path; ask only if the intended plan is ambiguous.
- Complete the mandatory startup gate above.
- Give every independently executable implementation, test, migration, cleanup, documentation, rollout, and verification task a stable ID, dependency mapping, planned check, and exact plan reference.
- Keep the tracker retained and current. Record assignments, files, commands/results, reviews/fixes, skips with reasons, blockers, decisions, and the exact next ready task.

### 2. Decompose and assign

- Split compound rows until each is one coherent, independently verifiable loop. Preserve plan phases as milestone groupings.
- Apply the worker contract to every implementation row. Record owner, sequential/parallel mode, Herdr pane/session ID, dependencies/write isolation, and expected handoff. Record the allowed exception when the parent owns a row.
- If the plan is too vague or large to assign safely, first add a task/milestone breakdown; ask the user only if it changes scope, behavior, or risk.

### 3. Execute each task loop

Choose the next dependency-ready row. Multiple rows may be `In progress` only in genuinely independent, isolated lanes.

1. **Analyze:** inspect the plan section, current state, prior evidence, risks, and unknowns.
2. **Plan:** record the bounded action, expected result, verification, rollback/cleanup, and checkpoint need.
3. **Implement:** have the assigned worker make the coherent change; use parent execution only for its recorded exception.
4. **Verify:** run targeted behavioral tests plus relevant lint/typecheck/build. For UI work, also perform required real-browser checks.
5. **Update and decide:** record evidence immediately. Mark `Verified` only on success; otherwise repeat analysis or mark `Blocked`. Then continue to the next ready row.

Operational rules:

- Give workers narrow prompts using paths and assigned task IDs; include full plan content only when they cannot access the file.
- Do not advance past required workers/reviewers still running. Continue independent work, then use the runtime wait/status mechanism and incorporate results.
- Do not overlap writers in one worktree. Do not edit overlapping code while a step review is running.
- If context/time limits force a stop, checkpoint exact non-terminal rows and the restart point; report a partial handoff, not completion.
- For uncertain third-party behavior or current external evidence, read `web-research` and require current, version-specific sources. Delegate separable research/reconnaissance where useful.
- After two failures for the same cause, request independent direction and ask the user if the blocker remains.

### 4. Review milestones

Before review, update the tracker. Give the reviewer the plan/tracker paths, task IDs and acceptance criteria, touched files/diffs, validation evidence, skipped checks, constraints, deviations, and blockers. Require independent inspection and no edits unless explicitly intended.

Evaluate findings critically, fix material issues, update the tracker, rerun validation, and follow up with the same reviewer session when possible. Do not begin overlapping work until the review is resolved or isolated.

### 5. Reconcile and finish

- Enter final review only when no row is `Pending`, `In progress`, or `Blocked`.
- Reread the full plan and complete the template's final reconciliation checklist. Add any missed requirement and return to execution.
- Convert unresolved material review findings or scope-relevant validation failures into `Blocked` rows. Only unrelated pre-existing failures may remain documented caveats.
- Run final targeted and repository-wide validation, required browser/manual checks, and repository-index cleanup when the user did not request staging.
- Request final independent review; after material fixes, rerun validation and review.
- Update the tracker after final review. If it is repository-tracked, rerun formatting/checks that include it.

## Final response

Include concisely:

- plan/tracker path and truthful `Complete`, `Partial`, or `Blocked` status
- counts of `Verified` and user-approved `Descoped` rows, plus remaining task IDs
- completed milestones and worker delegation used
- validation, meaningful test coverage, and browser/manual checks or skip reasons
- independent reviews and alignment status
- remaining caveats or human decisions
