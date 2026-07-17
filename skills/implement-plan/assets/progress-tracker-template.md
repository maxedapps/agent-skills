# Implementation Progress

> Load this template with the file-reading tool before source edits or delegated implementation. Copy/adapt it into the plan or retain it separately. The parent is the only tracker writer while lanes run or may resume concurrently.

- **Template loaded from:** `implement-plan/assets/progress-tracker-template.md`
- **Plan:** `<path>`
- **Status:** `In progress | Partial | Blocked | Complete`
- **Updated:** `<date/time>`
- **Completion:** every requirement is `Verified` or user-approved `Descoped`; reconciliation, validation, and final review pass; no material issue remains open.

## Coverage

Map every implementation, migration, cleanup, documentation, rollout, and validation requirement. Split compound work. Status: `Pending | In progress | Blocked | Verified | Descoped`.

| ID | Plan reference and requirement | Dependencies | Status | Acceptance check | Evidence / notes |
|---|---|---|---|---|---|
| T01 | `<section: exact requirement>` | — | Pending | `<specific check>` | — |

`Verified` requires task-specific evidence. `Descoped` requires explicit user approval and rationale. Multiple `In progress` rows require isolated, non-overlapping lanes.

## Batches and evidence

Before **every non-trivial batch**, enumerate ready rows and consider subagents. Record a concrete allowed reason for parent ownership. Cap parallel lanes by parent integration/verification capacity; isolate concurrent writers in separate worktrees with non-overlapping ownership. Keep coupled work sequential or parent-owned.

| Batch / rows | Owner and delegation rationale | Scope / dependencies / join | Ownership / isolation / overlap | Acceptance and review checkpoint | Parent verification / terminal evidence / cleanup |
|---|---|---|---|---|---|
| B01 / T01 | `<delegate, or concrete parent reason>` | `<bounded change; deps; join>` | `<files/domain; worktree or sequential; overlap>` | `<checks; review ID or N/A-small>` | `<diff/claim inspection; commands/results; handoff/state; cleanup>` |

For delegated work retain run identity, terminal state/handoff, files changed, decisions, exact checks/results, skips, risks, blockers, and remaining work. Child claims are evidence; parent inspection and reruns establish verification.

## Reviews and dispositions

Use a fresh read-only subagent after each major coherent boundary—an integration, migration, public contract, security/data invariant, risky dependency, or delivery milestone—and for final full-plan review. Major does not mean “many rows.” Record direct-review fallbacks and independence limits.

| Review / covered rows | Boundary and scope | Method / run / evidence | Finding | Disposition and rationale | Fix or validation / rerun / one focused follow-up | Status |
|---|---|---|---|---|---|---|
| M01 / T01 | `<why major; bounded or final-full>` | `<fresh read-only run or fallback; inputs>` | `<finding or None>` | `<Fix now, Validate, Reject, Human decision, or Block — why>` | `<row/check/result/follow-up>` | `<Open, Resolved, or Blocked>` |

The parent critically evaluates **every** finding. `Fix now` is valid, in-scope, simple, proportionate, and low-risk. Queue doubtful, architectural, scope-changing, risky, or complexity-increasing findings as `Human decision`. After accepted fixes, allow one focused follow-up only—never a reopened broad review or speculative abstraction, compatibility layer, or test machinery. Preserve required authority-matrix and separate verdict evidence by reference rather than duplicating it here.

## Human-decision queue

| ID / source | Decision needed | Evidence and options | Scope / risk / complexity impact | Recommendation | Status / human answer |
|---|---|---|---|---|---|

Do not silently implement queued items. Unresolved material decisions block completion.

## Deviations

| Plan reference | Deviation / fallback | Reason and impact | Approval needed / received | Evidence |
|---|---|---|---|---|

## Final reconciliation

- [ ] Reread the full original plan; every actionable requirement maps to coverage rows.
- [ ] No row is `Pending`, `In progress`, or `Blocked`; each `Verified`/`Descoped` row has required evidence/approval.
- [ ] Every non-trivial batch records delegation consideration, ownership, dependencies/join, isolation/overlap, checks, and checkpoint.
- [ ] Parent inspected delegated diffs/claims, reran applicable checks, resolved terminal states, and safely cleaned workflow resources.
- [ ] Automated, integration, migration, browser/manual, rollout, and acceptance checks passed, or scope-relevant failures block.
- [ ] Fresh reviews cover each major coherent boundary and the final full plan, or a direct fallback and limitation is recorded.
- [ ] Every finding has a disposition; fixes/validation/reruns and at most one focused follow-up are recorded.
- [ ] Human decisions, deviations, skips, confidence limits, and unrelated pre-existing failures are explicit.
- [ ] `Complete` is used only when all gates pass and no material issue or decision remains open.
