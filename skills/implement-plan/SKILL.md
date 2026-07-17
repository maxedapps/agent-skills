---
name: implement-plan
description: >-
  Implements existing Markdown plans exhaustively through tracked task batches,
  delegation-first execution, active validation, and plan-backed reviews. Use
  this skill when asked to implement, execute, carry out, or continue an
  existing plan. Do not use for creating a plan from scratch or only reviewing
  a plan without implementing it.
license: MIT
compatibility: >-
  Requires project write access. Delegation requires a safely available
  capability, isolated concurrent writers, terminal handoffs, and parent
  verification. Browser-visible work requires browser automation.
metadata:
  short-description: Implement plans with delegated, tracked, verified batches
---

# Implement Plan

## Non-negotiable contract

Follow higher-priority constraints. After the startup gate:

- Cover every actionable plan requirement with independently verifiable tracker rows.
- Keep implementation centered on the user’s requested outcome and the plan’s required behavior. Discovery and review do not authorize adjacent improvements or broader scope.
- Before adding code, abstractions, tests, safeguards, or follow-up work, ask whether it is necessary now and whether a simpler change would suffice. Omit or simplify it when not justified.
- **Avoid complexity at all cost. If in doubt, ask the user.**
- **Before every non-trivial implementation batch, strongly consider subagents.** Delegate eligible bounded work when safe; record why parent-owned work is not eligible.
- Keep the tracker parent-owned and single-writer whenever lanes run or may resume concurrently.
- Treat child handoffs as evidence, never acceptance. The parent inspects every diff, verifies claims, integrates, and tests.
- Continue through dependency-ready work without asking unless a human decision is required.
- Claim completion only after full-plan reconciliation, validation, and final review. Open work means `Partial` or `Blocked`, never `Complete`.

## Mandatory startup gate

Before source edits or delegated implementation launches:

1. Read the complete user-provided plan; continue by offset if truncated.
2. **Load [`assets/progress-tracker-template.md`](assets/progress-tracker-template.md) with the file-reading tool.** Memory or a citation does not count.
3. Copy/adapt it into the plan's `Implementation Progress`, or retain a separate tracker if the plan cannot be edited.
4. Populate plan coverage and record `Template loaded from: implement-plan/assets/progress-tracker-template.md`.
5. Only then inspect implementation context, refine rows, assign lanes, or edit source.

On resume, repeat steps 1–4 and reconcile current state before editing. If the template cannot be loaded, stop; do not fabricate evidence.

## Execute in verified batches

1. **Inventory:** map implementation, migration, cleanup, docs, rollout, and required validation to stable rows with plan references, dependencies, and acceptance evidence. Split opaque compound rows.
2. **Select:** enumerate dependency-ready rows. Define the batch's scope, risks, rollback/cleanup, checks, and join point.
3. **Assign:** strongly consider subagents for every non-trivial batch. Record owner, ownership boundary, isolation, overlap, rationale, and review checkpoint.
4. **Implement:** stay within assigned ownership. Record deviations immediately.
5. **Verify:** parent-inspect diffs and claims; run targeted behavior tests plus applicable test, lint, typecheck, build, migration, and browser/manual checks.
6. **Update:** record concise evidence. Mark rows `Verified`, `Blocked`, or ready for another batch; then repeat.

`Verified` requires task-specific evidence. `Descoped` requires explicit user approval and rationale. A phase is complete only when all child rows are `Verified` or approved `Descoped`.

## Delegation and parallelism

Delegate when work has bounded ownership, explicit acceptance evidence, and no unsafe coupling. Cap fan-out at the number of lanes the parent can promptly inspect, integrate, and verify; fewer lanes are better than an integration backlog.

| Reasonable delegated lane | Keep sequential or parent-owned |
|---|---|
| Independent adapter plus focused tests in owned files | Cross-cutting refactor with shared callers |
| Read-only repository/API research with a precise question | Integration decisions requiring rapid iteration |
| Isolated docs, fixture, or migration lane with exact acceptance checks | Tiny edit whose handoff costs more than implementation |
| Independent test coverage for a stable public contract | Coupled schema, implementation, and rollout changes |

Concurrent writers require isolated worktrees and non-overlapping file/domain ownership. Writers sharing a checkout run sequentially. Do not mutate overlapping code during an active writer or checkpoint review. Keep coupled work sequential or parent-owned.

For each delegated run:

- grant least privilege and provide plan/tracker paths, row IDs, constraints, starting files, acceptance criteria, and checks;
- require a terminal handoff with run identity, files read/changed, decisions, exact commands/results, skips, risks, blockers, and remaining work;
- resolve terminal state before its join point;
- parent-inspect the full diff, spot-check claims, rerun task-specific and applicable repository checks, then clean only workflow-owned worktrees/processes/artifacts without losing owner work.

Allowed parent rationale: true triviality; tight coupling/integration ownership; overlapping scope; unavailable safe isolation/capability; immediate iterative decisions; user prohibition; or verification cost exceeding delegation benefit. Never call a broad phase trivial.

## Validation and safety

- Add or update valuable tests for acceptance behavior, regressions, integration/failure paths, edge cases, and security/data invariants. Avoid count-only, duplicated, over-mocked, or implementation-detail tests.
- For browser-visible changes, read `agent-browser` and manually verify in a real browser unless impossible or explicitly excluded; record skips and confidence limits.
- For uncertain current third-party behavior, read `web-research` and use version-specific sources.
- Do not install missing validation tools without authorization. Record unavailable gates and impact.
- Ask only for approvals, material ambiguity, credentials/access, destructive or production actions, or unresolved repeated failure.
- On interruption, record exact states, retained resources, and restart point. Never discard unrelated or owner work.

## Review checkpoints

Use a **fresh read-only subagent** applying `code-review` after every major coherent implementation boundary and once for final full-plan review. Also honor plan-authored checkpoints. A boundary is major because it crosses or completes an integration, migration, public contract, security/data invariant, risky dependency, or delivery milestone—not because of row count.

Deduplicate checkpoints with the same scope and evidence. Use direct parent review only when independent review is unavailable/unsafe, user-prohibited, or genuinely disproportionate; record the reason and independence limit.

Give reviewers the plan/tracker, covered IDs, relevant diff/contracts/tests, validation/manual evidence, skips, deviations, risks, and non-goals. Require read-only work and prohibit recursive delegation. For final review, require plan-backed full scope. Preserve the `code-review` authority matrix and separate baseline, compliance, quality, and validation verdicts when that contract requires them.

### Disposition every finding

The parent must critically evaluate **every** finding for evidence, reachability, plan scope, impact, and proportional regression/maintenance cost. Record exactly one disposition:

| Disposition | Use when |
|---|---|
| **Fix now** | Valid, in scope, simple, proportionate, and low risk; implement and rerun affected checks. |
| **Validate** | Plausible but evidence is insufficient; run a bounded check before deciding. |
| **Reject** | Incorrect, unreachable, out of scope, unnecessary for the assigned task, or disproportionate; record evidence and rationale. |
| **Human decision** | A required scope or architectural choice cannot be resolved safely without the user; queue for final presentation. |
| **Block** | Material and unresolved; overlapping work or completion cannot safely continue. |

Fix simple valid findings. Do not silently implement queued human decisions. After accepted fixes, allow one focused read-only follow-up on those fixes only; do not reopen a broad review. Do not add speculative abstractions, compatibility layers, or test machinery merely to satisfy review.

## Final reconciliation

1. Reread the complete original plan line by line; add and execute any missed row.
2. Confirm no row is `Pending`, `In progress`, or `Blocked`; verify approved descopes and all evidence.
3. Review the diff task by task and remove changes whose scope or complexity is not justified by the assigned outcome.
4. Run final targeted and repository-wide checks, required browser/manual validation, and safe cleanup.
5. Run one fresh plan-backed full read-only review; disposition every finding and perform at most one focused follow-up for accepted fixes.
6. Present the human-decision queue. Any unresolved material issue remains `Blocked`; only evidence-backed unrelated pre-existing failures may be caveats.
7. Update the tracker and rerun checks covering it when tracked.

## Final response

Report plan/tracker paths; truthful status and row counts; remaining IDs; batches, delegated runs, and parent-owned rationales; exact automated/browser/manual evidence and skips; review IDs and every disposition; human decisions, deviations, caveats, cleanup, and retained resources.
