# Implementation Progress

> Load this template with the file-reading tool before source edits or delegated implementation. The parent is the only tracker writer while lanes run or may resume concurrently. When using the Pi RPC runtime, the parent prepares each writer cwd, passes it to the runtime, stops the child before Git operations, integrates through normal parent controls, and cleans runtime state separately from any workspace cleanup.

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

Before **every non-trivial batch**, enumerate ready rows and delegate each bounded non-trivial coherent unit when a safe capability exists; record the exact narrow exception for parent ownership. Cap parallel lanes by parent integration/verification capacity and isolate concurrent writers with non-overlapping ownership. Assign coupled or dependent behavior to one sequential/awaited worker. Record concise decision-grade facts and durable evidence pointers—not copied handoffs, logs, or transcripts. For a qualifying structural batch, record the decomplex Prevention report path or fallback inside an existing cell; add no column or tracker row.

| Batch / rows | Owner and delegation rationale | Scope / dependencies / join | Ownership / isolation / overlap | Acceptance and review checkpoint | Parent verification / terminal evidence / cleanup |
|---|---|---|---|---|---|
| B01 / T01 | `<delegate, or concrete parent reason>` | `<bounded change; deps; join; prevention report path or fallback when applicable>` | `<files/domain; worktree or sequential; overlap>` | `<checks; review ID or N/A-small>` | `<diff/claim inspection; commands/results; decomplex dispositions; handoff/state; cleanup>` |

For delegated work retain concise run identity, terminal state, changed files, decisions, wait/join evidence, exact check results, skips, risks, blockers, remaining work, parent integration/verification, cleanup, and durable evidence pointers. Child claims are evidence; parent inspection and reruns establish verification.

## Reviews and dispositions

At each major or plan-authored boundary and for final full-plan review, define a bounded read-only reviewer set. Initial reviewers are fresh and independent; prohibit recursion and do not share conclusions before handoff. Reuse the originating reviewer for its focused follow-up when safe, or record replacement continuity limits. Record direct-review fallbacks and independence limits. Add no duplicate reviewer merely to seek agreement and no parallel review tracker.

| Checkpoint / round / rows | Reviewer / run / scope | Finding ID / lineage | Parent disposition and rationale | Remediation / validation / decomplex evidence | Reviewer closure | Status |
|---|---|---|---|---|---|---|
| M01.R1 / T01 | `<fresh read-only reviewer or fallback; bounded/full scope>` | `<stable ID; initial, fix-caused, or fix-exposed; None if clear>` | `<Fix now, Validate, Reject, Human decision, or Block — why>` | `<smallest remedy/check/result; triage/audit path or fallback; material delta>` | `<Clear, Changes required, Human decision required, or Blocked — evidence>` | `<Open, Reviewer clear, or Blocked>` |

Apply the implement-plan review-closure contract. Preserve finding IDs and record concise dispositions, remediation or validation deltas, decomplex evidence, and focused originating-reviewer closure. Neither reviewer nor decomplex advice creates work automatically; human answers return as evidence until every commissioned reviewer is `Clear`. Record churn escalation and ensure final decomplex evidence covers the actual final diff.

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
- [ ] Every bounded non-trivial batch records delegated ownership or the exact atomic/user-prohibited/unavailable-capability exception, dependencies/join, isolation/overlap, checks, and checkpoint.
- [ ] Parent inspected delegated diffs/claims, integrated through parent-owned Git controls, reran applicable checks, resolved terminal states, and safely cleaned runtime state plus parent-owned workspaces.
- [ ] Automated, integration, migration, browser/manual, rollout, and acceptance checks passed, or scope-relevant failures block.
- [ ] Fresh independent reviewer sets cover each major coherent boundary and the final full plan, or a direct fallback and limitation is recorded.
- [ ] Every finding retains stable lineage, parent disposition, remediation/validation evidence, and focused follow-up closure.
- [ ] Every commissioned reviewer is `Clear`; human decisions were returned to affected reviewers as closure evidence; no material validation gap remains.
- [ ] Final decomplex evidence covers the actual final diff, or its fallback and independence limit are explicit.
- [ ] Human decisions, churn escalations, deviations, skips, confidence limits, and unrelated pre-existing failures are explicit.
- [ ] Every change and added test directly supports a plan requirement; unnecessary complexity and adjacent scope were removed.
- [ ] `Complete` is used only when all gates pass and no material issue or decision remains open.
