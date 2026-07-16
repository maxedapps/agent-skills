# Implementation Progress

> **Mandatory use:** the `implement-plan` agent must load this file with the file-reading tool before any project source edit or delegated implementation launch. Copy/adapt it into the plan when possible; otherwise retain it as a Markdown tracker. The parent is the tracker owner and its only writer while lanes run concurrently or may resume concurrently.

- **Template loaded from:** `implement-plan/assets/progress-tracker-template.md`
- **Plan:** `<path>`
- **Overall status:** `In progress | Partial | Blocked | Complete`
- **Last updated:** `<timestamp or date>`
- **Completion rule:** `Complete` only when every actionable requirement is covered by a `Verified` row or explicitly `Descoped` with user approval, reconciliation passes, and no admitted material finding remains open.

Status meanings: `In progress` is active execution; `Partial` is an explicit unfinished handoff/resource stop; `Blocked` means no dependency-ready work can continue; `Complete` means every completion gate passed.

## Plan coverage inventory

Build this from the full plan before implementation. Give each independently executable implementation, migration, cleanup, documentation, rollout, and verification item a stable row. Trace plan bullets, acceptance criteria, and required checks through the plan reference and evidence; split compound work rather than hiding it.

| ID | Plan reference / requirement | Dependencies | Status | Planned verification | Evidence / notes |
|---|---|---|---|---|---|
| T01 | `<section + exact requirement>` | — | Pending | `<task-specific check>` | `<result or review ID>` |

Allowed row statuses: `Pending`, `In progress`, `Blocked`, `Verified`, and `Descoped`. Multiple `In progress` rows require independent isolated lanes. `Verified` requires task-specific evidence; `Descoped` requires explicit user approval and rationale. Never use `Done`, and never complete a parent phase with an open child row.

## Execution and delegation strategy

Before each batch, enumerate dependency-ready rows. Classify every bounded non-trivial row for delegation. Delegate eligible rows when a safe capability exists. Parent execution requires one concrete recorded reason: true triviality; tight coupling/integration ownership; overlapping scope; unavailable safe isolation/capability; immediate iterative decision-making; user prohibition; or verification cost greater than benefit. Do not label a broad plan trivial.

Use isolated worktrees and non-overlapping ownership for concurrent writers; run writers sequentially in a shared checkout. Keep the tracker parent/single-writer. Require least privilege, terminal lifecycle resolution and handoff, parent diff/claim inspection, task-specific checks, and ownership-safe cleanup.

| Task IDs | Eligible? | Owner + concrete rationale | Batch / dependencies / join point | Ownership / overlap / isolation | Capability/run + terminal handoff | Parent evidence / cleanup | Review checkpoint |
|---|---|---|---|---|---|---|---|
| `T01` | `Yes / No / N/A-trivial` | `<delegated owner or allowed parent reason>` | `<B1; deps; join>` | `<files/domain; overlap analysis; isolated/sequential>` | `<capability + run ID/state; handoff path/summary>` | `<diff inspection, spot-checks, checks, cleanup>` | `<M01 / F01 / N/A-small>` |

For each run retain only useful evidence: assignment/run identity when available, files read/changed, decisions, exact commands/results, skipped checks, risks/blockers, and remaining work. A child handoff is evidence, not parent verification.

## Analyze → Plan → Implement → Verify journal

### `<task or batch ID>` — `<short name>`

- **Analyze:** `<current state, files/boundaries, risks, unknowns>`
- **Plan:** `<bounded action; owner/rationale; batch/join/isolation; acceptance evidence; rollback/cleanup; review need>`
- **Implement:** `<actions/files; delegated run and terminal handoff, or parent execution>`
- **Verify:** `<parent diff inspection and claim spot-check; commands and exact results; browser/manual checks or skip limitation>`
- **Review:** `<review ID or N/A-small; fresh read-only method or allowed direct fallback + limitation; material dispositions; fixes/reruns/follow-up>`
- **Decision:** `<Verified / repeat / Blocked; next dependency-ready batch>`

One aligned checkpoint may cover several rows. Reference its ID rather than duplicating review bookkeeping.

## Review register

Apply the current `code-review` authority for materiality, scores, finding selection, overflow, and follow-up; do not copy that protocol here. Default to a fresh read-only subagent reviewer for plan-authored checkpoints, major integration/migration/risk/dependency/delivery boundaries, risky coherent batches, and final reconciliation. Direct review requires a recorded unavailable/unsafe capability, user restriction, or genuinely disproportionate review scope. Deduplicate aligned checkpoints.

| ID / covered tasks | Axes, method, independence/fallback | Baseline, scope, and evidence | Material dispositions, fixes, reruns, follow-up | Matrix + four verdicts / status |
|---|---|---|---|---|
| `M01 / T01–T03` | `<plan-backed; bounded; embedded; handoff-only; fresh run ID or direct reason/limitation>` | `<plan/tracker refs; files/boundaries; checks/skips; deviations/risks>` | `<accepted/rejected/deferred + rationale; fix/validation rows; reruns and bounded follow-up>` | `<complete matrix location/summary; baseline/compliance/quality/validation verdicts; Open/Resolved/Blocked>` |

The parent admits findings only after checking evidence, reachability, scope relevance, impact, and proportional cost. Record task/review IDs and any validation-only row; labels never determine admission. An unresolved admitted material finding requires a `Blocked` row.

## Deviations and decisions

| Plan reference | Deviation or decision | Reason | User approval needed/received | Impact |
|---|---|---|---|---|

Record execution/review fallbacks here when they affect expected independence, coverage, or risk rather than only one strategy row.

## Final reconciliation

- [ ] Re-read the full original plan, not only this tracker.
- [ ] Every actionable requirement maps to one or more inventory rows; no compound work is hidden.
- [ ] Every bounded non-trivial row has eligibility, owner/rationale, dependencies, batch/join point, ownership, overlap/isolation, expected evidence, and checkpoint classification.
- [ ] Delegated runs evidence least privilege, run identity when available, terminal handoff/state, parent diff/claim inspection, task-specific validation, and safe cleanup; the tracker remained parent/single-writer.
- [ ] No row remains `Pending`, `In progress`, or `Blocked`; every `Verified` row has evidence and every `Descoped` row has explicit user approval.
- [ ] Required automated, integration, browser/manual, cleanup, documentation, migration, rollout, and acceptance checks passed or a scope-relevant failure is blocked.
- [ ] Plan-authored and workflow checkpoints were deduplicated; required fresh reviews or concrete direct fallbacks/limitations are recorded.
- [ ] The final plan-backed full embedded handoff includes the complete authority matrix and separate baseline-quality, implementation-compliance, implementation-quality, and test/validation-quality verdicts.
- [ ] Material findings have evidence-based parent dispositions; admitted fixes/validation, reruns, review IDs, and bounded follow-up are recorded. Unresolved admitted findings are blocked.
- [ ] Deviations, unrelated pre-existing failures, skipped checks, and confidence limits are explicit.
- [ ] `Overall status` is `Complete` only after every gate passes and no admitted material issue or blocked row remains.
