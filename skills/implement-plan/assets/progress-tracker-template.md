# Implementation Progress

> Load this template with the file-reading tool before source edits or delegated implementation. Copy/adapt it into the plan or retain it separately. The parent is the only tracker writer while lanes run or may resume concurrently.

- **Template loaded from:** `implement-plan/assets/progress-tracker-template.md`
- **Plan:** `<path>`
- **Status:** `In progress | Partial | Blocked | Complete`
- **Updated:** `<date/time>`
- **Completion:** every requirement is `Verified` or user-approved `Descoped`; reconciliation and validation pass; every commissioned reviewer is `Clear`; no material issue remains open.

## Coverage

Map every implementation, migration, cleanup, documentation, rollout, and validation requirement. Split compound work. Status: `Pending | In progress | Blocked | Verified | Descoped`.

| ID | Plan reference and requirement | Dependencies | Status | Acceptance check | Evidence / notes |
|---|---|---|---|---|---|
| T01 | `<section: exact requirement>` | — | Pending | `<specific check>` | — |

`Verified` requires task-specific evidence. `Descoped` requires explicit user approval and rationale. Multiple `In progress` rows require isolated, non-overlapping lanes.

## Batches and evidence

Before **every non-trivial batch**, enumerate ready rows and strongly consider subagents. Record a concrete allowed reason for parent ownership. Cap parallel lanes by parent integration/verification capacity; isolate concurrent writers in separate worktrees with non-overlapping ownership. Keep coupled work sequential or parent-owned. For a qualifying structural batch, record the decomplex Prevention report path—or the unavailable/report-write fallback and independence limit—inside the existing scope or parent-evidence cell; do not add a column or tracker row.

| Batch / rows | Owner and delegation rationale | Scope / dependencies / join | Ownership / isolation / overlap | Acceptance and review checkpoint | Parent verification / terminal evidence / cleanup |
|---|---|---|---|---|---|
| B01 / T01 | `<delegate, or concrete parent reason>` | `<bounded change; deps; join; prevention report path or fallback when applicable>` | `<files/domain; worktree or sequential; overlap>` | `<checks; review ID or N/A-small>` | `<diff/claim inspection; commands/results; decomplex dispositions; handoff/state; cleanup>` |

For delegated work retain run identity, terminal state/handoff, files changed, decisions, exact checks/results, skips, risks, blockers, and remaining work. Child claims are evidence; parent inspection and reruns establish verification.

## Reviews and dispositions

At each major or plan-authored boundary and for final full-plan review, define a bounded read-only reviewer set. Initial reviewers are fresh and independent; prohibit recursion and do not share conclusions before handoff. Reuse the originating reviewer for its focused follow-up when safe, or record replacement continuity limits. Record direct-review fallbacks and independence limits. Add no duplicate reviewer merely to seek agreement and no parallel review tracker.

| Checkpoint / round / rows | Reviewer / run / scope | Finding ID / lineage | Parent disposition and rationale | Remediation / validation / decomplex evidence | Reviewer closure | Status |
|---|---|---|---|---|---|---|
| M01.R1 / T01 | `<fresh read-only reviewer or fallback; bounded/full scope>` | `<stable ID; initial, fix-caused, or fix-exposed; None if clear>` | `<Fix now, Validate, Reject, Human decision, or Block — why>` | `<smallest remedy/check/result; triage/audit path or fallback; material delta>` | `<Clear, Changes required, Human decision required, or Blocked — evidence>` | `<Open, Reviewer clear, Human-resolved, or Blocked>` |

The parent critically evaluates **every** finding and decomplex recommendation; neither advisory source creates work automatically. Preserve finding IDs across rounds. Before a complexity-increasing remedy, use decomplex Finding triage when proportionate or record the built-in fallback; distinguish a valid defect from an overbuilt fix. Return fixes, validation, and evidence-backed rejections to reviewers with open findings, then repeat focused rounds over those findings, affected boundaries, and fix-caused or fix-exposed regressions. Never reopen unrelated broad scope.

Close the checkpoint only when every commissioned reviewer is `Clear` and no material validation gap remains. Treat a human answer as an authoritative evidence delta and return it to affected reviewers for closure; it is not a substitute for reviewer clearance. Do not rerun without a material code, evidence, or human-decision delta. After two unsuccessful rounds for one root cause, recurrence after a claimed fix, or no meaningful progress, ask the user; never convert the iteration bound into completion. For final closure, record the decomplex Audit of the actual final diff and rerun it when review-driven remediation materially changes complexity.

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
- [ ] Fresh independent reviewer sets cover each major coherent boundary and the final full plan, or a direct fallback and limitation is recorded.
- [ ] Every finding retains stable lineage, parent disposition, remediation/validation evidence, and focused follow-up closure.
- [ ] Every commissioned reviewer is `Clear`; human decisions were returned to affected reviewers as closure evidence; no material validation gap remains.
- [ ] Final decomplex evidence covers the actual final diff, or its fallback and independence limit are explicit.
- [ ] Human decisions, churn escalations, deviations, skips, confidence limits, and unrelated pre-existing failures are explicit.
- [ ] Every change and added test directly supports a plan requirement; unnecessary complexity and adjacent scope were removed.
- [ ] `Complete` is used only when all gates pass and no material issue or decision remains open.
