# Implementation Progress

> **Mandatory use:** the `implement-plan` agent must load this file with the file-reading tool before any project source edit or implementation-subagent launch. Copy/adapt it into the plan when possible; otherwise use a retained Markdown tracker. Preserve the task inventory, status semantics, subagent strategy, loop journal, deviations, evidence, and reconciliation gates.

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
| T01 | `<section + exact requirement>` | — | Pending | `Worker W1` | `<planned check>` | |

Allowed task-row statuses:

- `Pending`: not started
- `In progress`: active in its execution lane; multiple rows are allowed only when genuinely independent, explicitly isolated, and separately verified
- `Blocked`: cannot proceed; blocker and requested decision/access are recorded
- `Verified`: implementation and task-specific verification passed; evidence is recorded
- `Descoped`: intentionally omitted with explicit user approval and rationale

Do not use `Done` as a substitute for verification. Do not mark a parent phase complete while any child row remains `Pending`, `In progress`, or `Blocked`.

## Subagent and execution strategy

For multi-step or broad plans, assign bounded implementation tasks/milestones to workers by default. Sequential workers are expected for dependent work; parallel workers require independent tasks and isolated worktrees or explicit non-overlapping write lanes. A scout/reviewer does not replace a worker. If the parent implements, record one concrete exception: genuinely trivial task, unavailable worker, unsafe handoff, immediate tightly coupled coordination, or explicit user request. Do not repeatedly use “trivial” to keep a broad plan in the parent.

Use `.subagents/<id>.handoff.md` for worker-to-parent communication; the parent applies its evidence to this tracker. Keep this tracker parent/single-writer when workers run in parallel or could resume concurrently. Task-owned source, tests, plans, and evidence remain at their required project paths rather than moving into `.subagents/`.

| Task IDs | Owner | Mode | Context | Dependencies / write isolation | Handoff or parent-execution exception |
|---|---|---|---|---|---|
| `T01` | `Worker W1` | `Sequential` | `Fresh: plan + tracker paths, task ID, relevant files` | `<depends on / isolated lane>` | `<.subagents/<id>.handoff.md; parent-applied tracker evidence, or parent exception>` |

## Loop journal

### `<task ID>` — `<short name>`

- **Analyze:** `<current state, relevant files, risks, unknowns>`
- **Plan:** `<bounded change, acceptance criteria, planned verification, rollback/checkpoint>`
- **Implement:** `<worker/parent owner, files/actions, .subagents handoff path, parent-applied tracker evidence; parent exception reason if applicable>`
- **Verify:** `<commands/manual or browser checks and results>`
- **Review:** `<reviewer, findings, fixes, follow-up>`
- **Decision:** `<Verified / repeat / Blocked; next ready task ID>`

## Deviations and decisions

| Plan reference | Deviation or decision | Reason | User approval needed/received | Impact |
|---|---|---|---|---|

## Final reconciliation

- [ ] Re-read the full original plan, not only this tracker.
- [ ] Every actionable plan item maps to one or more inventory rows.
- [ ] Worker ownership, execution/context mode, dependencies/isolation, and handoffs are recorded; every parent-executed task has an allowed concrete exception reason.
- [ ] No row remains `Pending`, `In progress`, or `Blocked`.
- [ ] Every `Verified` row includes concrete validation evidence.
- [ ] Every `Descoped` row includes rationale and explicit user approval.
- [ ] Required automated, integration, browser/manual, cleanup, docs, migration, and acceptance checks are complete.
- [ ] Step-review and final-review material findings are resolved; any unresolved material finding has a `Blocked` inventory row.
- [ ] Scope-relevant final validation passes; any scope-relevant failure has a `Blocked` inventory row. Clearly unrelated/pre-existing failures are recorded separately as caveats with evidence.
- [ ] `Overall status` is updated to `Complete` only after every check above passes and no `Blocked` row exists.
