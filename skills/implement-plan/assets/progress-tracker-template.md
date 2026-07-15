# Implementation Progress

> **Mandatory use:** the `implement-plan` agent must load this file with the file-reading tool before any project source edit or delegated implementation launch. Copy/adapt it into the plan when possible; otherwise use a retained Markdown tracker. Preserve the task inventory, status semantics, execution/delegation strategy, loop journal, deviations, evidence, review resolution, and reconciliation gates.

- **Template loaded from:** `implement-plan/assets/progress-tracker-template.md`
- **Plan:** `<path>`
- **Overall status:** `In progress | Partial | Blocked | Complete`
- **Last updated:** `<timestamp or date>`
- **Completion rule:** `Complete` is allowed only when every actionable plan requirement is traceably covered by a `Verified` row or explicitly `Descoped` with user approval.

Overall status meanings:

- `In progress`: execution is actively continuing
- `Partial`: execution stopped with unfinished but otherwise actionable rows; use only for an explicit handoff/resource limit, never as completion
- `Blocked`: no dependency-ready work can continue without a decision, access, environment change, or blocker resolution
- `Complete`: every completion and reconciliation gate passed

## Plan coverage inventory

Create this inventory from the full plan before implementation. Give every independently executable implementation, migration, cleanup, documentation, and verification task a row. Trace every plan checkbox, bullet, acceptance criterion, and required check to one or more rows through the plan reference and verification/evidence fields; create a separate row when the requirement is independently executable. Split compound tasks rather than hiding several unrelated changes in one row.

| ID | Original plan reference / requirement | Dependencies | Status | Owner | Verification | Evidence / notes |
|---|---|---|---|---|---|---|
| T01 | `<section + exact requirement>` | — | Pending | `Parent / Delegated W1` | `<planned check>` | `<may reference milestone/final review ID>` |

Allowed task-row statuses:

- `Pending`: not started
- `In progress`: active in its execution lane; multiple rows are allowed only when genuinely independent, explicitly isolated, and separately verified
- `Blocked`: cannot proceed; blocker and requested decision/access are recorded
- `Verified`: implementation and task-specific verification passed; evidence is recorded
- `Descoped`: intentionally omitted with explicit user approval and rationale

Do not use `Done` as a substitute for verification. Do not mark a parent phase complete while any child row remains `Pending`, `In progress`, or `Blocked`.

## Execution and delegation strategy

For each bounded task or milestone, choose parent execution or delegation based on whether fresh context, independent judgment, safe parallelism, or specialization materially outweighs coordination and handoff risk. Delegation is considered, not mandatory. Parent execution is valid without an exception when delegation is unavailable, unsafe, or not worthwhile; record the reason briefly enough to make the strategy understandable.

Whenever delegation is used:

- grant least-privilege files, tools, write scope, credentials-free context, and commands;
- use fresh context with the plan/tracker paths, task IDs, acceptance criteria, constraints, relevant files, and verification expectations;
- allow concurrent writers only for independent tasks with one isolated worktree per writer; writers sharing a worktree run sequentially even when files do not overlap;
- track the assignment to a terminal state and capture its run identity when available, files changed/read, decisions, commands/results, skips, risks, blockers, and exact remaining work;
- keep this tracker parent/single-writer when lanes run in parallel or may resume concurrently;
- require parent diff inspection, claim spot-checking, and task-specific verification before accepting the handoff;
- clean temporary worktrees, processes, sessions, credentials, and unneeded handoff artifacts without discarding owner work.

Task-owned source, tests, plans, and retained evidence remain at their required project paths rather than moving into a communication directory. A scout or reviewer provides evidence but does not silently become the implementation owner.

| Task IDs | Owner | Mode | Capability / run ID | Context and dependencies / write isolation | Terminal handoff, parent evidence, and cleanup |
|---|---|---|---|---|---|
| `T01` | `Parent / Delegated W1` | `Sequential / Parallel isolated` | `<capability + available run/thread/pane/session ID, or parent>` | `Fresh: plan + tracker, task ID, files; <dependencies/isolation>` | `<terminal output/handoff, parent checks, cleanup; or parent-strategy reason>` |

## Loop journal

### `<task ID>` — `<short name>`

- **Analyze:** `<current state, relevant files, risks, unknowns>`
- **Plan:** `<bounded change, acceptance criteria, planned verification, rollback/cleanup/checkpoint>`
- **Implement:** `<parent/delegated owner, available run identity, files/actions, terminal handoff; permissions/isolation/cleanup when delegated>`
- **Verify:** `<commands/manual or browser checks and exact results; parent diff inspection and spot-checks of delegated claims>`
- **Review:** `<N/A with reason | review ID; advisory reviewer→parent S/C scores; evidence/reachability/materiality/proportionality + assumptions; accepted/rejected/deferred rationale; validation/fixes; follow-up scope/round; extra-round reason; S1/S0 blocking approval>`
- **Decision:** `<Verified / repeat / Blocked; next ready task ID>`

A task row may reference one aligned milestone or final review; it does not require a separate reviewer. A plan-authored and workflow-authored checkpoint count as one review when scope, baseline, evidence, and exit conditions align. Record whether the review was independent or a checklist-driven direct fallback and any independence limitation.

## Review register

| Review ID | Scope / axes | Method and independence | Payload / coverage | Findings and rationale | Fixes, reruns, follow-up | Status |
|---|---|---|---|---|---|---|
| `M01 / F01` | `<plan-backed; bounded/full; embedded; handoff-only>` | `<independent capability/run or direct fallback + limitation>` | `<plan/tracker, task IDs, files/callers, tests, evidence/skips, deviations/risks>` | `<advisory reviewer→parent S/C scores; evidence/reachability/impact; assumptions; materiality/proportionality; disposition rationale; S1/S0 blocking approval>` | `<task/validation IDs, reruns/results; follow-up scope/round; extra-round reason>` | `<Open / Resolved / Blocked>` |

Embedded reviews default to handoff-only. Record complete matrix coverage but selective findings; read/run coverage and skips; reviewer/parent scores, evidence, reachability, impact, assumptions, smallest fix/validation, four verdicts, and any overflow caveat. Scores guide but never determine disposition. Follow-ups record fix/regression-only scope and severe incidental issues surfaced for reassessment.

## Deviations and decisions

| Plan reference | Deviation or decision | Reason | User approval needed/received | Impact |
|---|---|---|---|---|

## Final reconciliation

- [ ] Re-read the full original plan, not only this tracker.
- [ ] Every actionable plan item maps to one or more inventory rows.
- [ ] Parent/delegated ownership, context mode, dependencies/isolation, and expected evidence are recorded; when delegation was used, least privilege, available run identifiers, terminal handoffs, parent verification, and cleanup are evidenced.
- [ ] No row remains `Pending`, `In progress`, or `Blocked`.
- [ ] Every `Verified` row includes concrete validation evidence.
- [ ] Every `Descoped` row includes rationale and explicit user approval.
- [ ] Required automated, integration, browser/manual, cleanup, docs, migration, and acceptance checks are complete.
- [ ] Every applicable plan/workflow milestone checkpoint is resolved once without duplicate per-row reviews; aligned rows reference its review ID.
- [ ] The full plan-backed embedded final review covers the entire plan/tracker and all applicable review dimensions, or its direct checklist fallback and independence limitation are recorded.
- [ ] Every finding records advisory reviewer/parent S/C scores, assumptions, independently checked evidence/reachability/materiality/proportionality, and disposition rationale; no label alone admitted or blocked work, validation-only concerns became validation rows, and S1/S0 blocking work has user approval.
- [ ] Admitted/unresolved material findings became task rows; fixes/reruns and fix/regression-only follow-up scope/round are recorded; any extra round has a material reason, and autonomous review stopped afterward. Any unresolved admitted finding has a `Blocked` row.
- [ ] Scope-relevant final validation passes; any scope-relevant failure has a `Blocked` inventory row. Clearly unrelated/pre-existing failures are recorded separately as caveats with evidence.
- [ ] `Overall status` is updated to `Complete` only after every check above passes and no `Blocked` row exists.
