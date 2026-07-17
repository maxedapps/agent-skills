# [Plan title]

> **Status:** Ready for implementation | Blocked on [decision]
> **Planning memory:** Included in this plan | [existing evidence location]

## Problems

- [Current problem, affected outcome, and evidence.]

## Implementation summary

- [Chosen approach and dependency order.]
- [Why this approach solves the problems.]

## Conducted research and relevant sources

| Source or artifact | Material finding | Plan impact |
|---|---|---|
| `[inspected path and symbol]` | [Observed contract or constraint.] | [Decision, task, safeguard, or check.] |
| [Authoritative source] | [Version-matched finding.] | [Required action or non-goal.] |

- **Exploration/research lanes:** [At least two dedicated subagents, their bounded questions, and inspected paths/sources.]
- **Parent verification:** [Material claims checked, conflicts resolved, and coverage gaps filled.]

## Scope and non-goals

- **In scope:** [Outcomes and integration surfaces.]
- **Non-goals:** [Excluded adjacent work and reason.]

## Decisions and constraints

| Approach or constraint | Result | Reason and consequence |
|---|---|---|
| [Chosen approach] | Chosen | [Correctness, fit, risk, and testability rationale.] |
| [Viable alternative] | Rejected | [Material trade-off.] |
| [Invariant, assumption, or approval gate] | Confirmed / reversible / blocked | [Implementation consequence or fallback.] |

## Plan review

- **Reviewer:** [Fresh read-only subagent and review scope.]

| Finding | Parent evaluation | Disposition | Plan change or user decision |
|---|---|---|---|
| [Evidence-backed reviewer finding.] | [Evidence, scope, impact, and complexity assessment.] | Accept / Validate / Reject / Ask user | [Proportionate update, validation result, rejection reason, or decision needed.] |

- **Focused follow-up:** [Result for accepted changes, or `Not needed`.]

## Phase 1 — [Independently verifiable outcome]

### Problems addressed

- [Problems resolved or reduced by this phase.]

### Implementation summary

- [Phase approach, dependency boundary, and observable end state.]

### Tasks

#### T1.1 — [Task title]

**Description**

- [Behavior to implement, target symbol or component, and intended control/data flow.]
- [Integration and compatibility requirements.]
- Inspect and update all coupled artifacts discovered during implementation.

**Relevant files — non-exhaustive starting points**

- `[path]` — `[symbol or search target]`: [purpose].
- `[test path or narrow search pattern]`: [behavior to protect or file to resolve before editing].

**Dependencies**

- [Task IDs, approval, migration state, or `None`.]

**Contract or shape** *(only when exact shape matters)*

```text
[Small API, type, schema, query, config, protocol, CLI, or state-transition shape.]
```

**Acceptance and verification**

- [Observable result] — run `[exact check]`; expect [signal] and retain [evidence].
- [Failure or regression boundary] — verify [behavior] with [evidence].

**Task-local risks** *(only when material)*

- [Failure mode, safeguard, and recovery.]

<!-- Repeat stable-ID tasks as needed. Keep IDs stable if tasks move or change. -->

### Risks, safeguards, and recovery

- **Risk:** [Material failure, migration, or rollback risk.]
- **Safeguard:** [Prevention, compatibility, observability, or fail-closed behavior.]
- **Recovery:** [Rollback, retry, cleanup, or operator action and its check.]

Use exactly `None material for this phase` only when investigation found no material risk or recovery concern.

### Phase validation and review

- **Checks:** [Focused and phase-wide checks, expected signals, and retained evidence.]
- **Review focus:** [Task IDs, risky behavior, callers, and integration boundaries.]
- **Exit and rerun:** [Finding disposition, required fixes, and checks to rerun.]

<!-- Add phases only for real dependency, migration, rollout, delivery, or independently verifiable boundaries. Repeat the full phase structure. -->

## Final validation and review

- **Checks:** [Authoritative repository and applicable integration/manual checks, expected signals, and justified skips.]
- **Review focus:** [Complete implementation, coupled artifacts, highest-risk decisions, and cross-phase behavior.]
- **Evidence:** [Diff, check results, runtime artifacts, deviations, skipped checks, and known risks.]
- **Exit and rerun:** [Finding disposition, fixes, final reruns, and independent-review fallback if applicable.]

## Definition of Done

- [Each problem and in-scope outcome is resolved with observable evidence.]
- [Every task, decision, source-driven requirement, and accepted review finding is complete or explicitly deferred.]
- [Tests, integrations, migration or rollout, docs, generated outputs, cleanup, and recovery work are complete where applicable.]
- [Remaining blockers and operator steps are explicit.]
