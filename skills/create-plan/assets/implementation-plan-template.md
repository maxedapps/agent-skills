# [Plan title]

> **Status:** Ready for implementation | Blocked on [specific decision]
> **Planning memory:** `.progress/<plan-slug>.md` | Not persisted — [no-write reason]

## Problems

- Describe each material current-state problem, affected outcome, and evidence concisely.
- Separate distinct problems; do not turn this section into implementation steps.

## Implementation summary

Summarize the chosen approach, dependency order, and why it solves the problems. Keep detailed investigation and rejected alternatives in planning memory.

## Conducted research and relevant sources

| Source or artifact | Material finding | Implementation impact |
|---|---|---|
| `src/example.ts` — `targetSymbol` | [Observed contract or constraint] | [Required implementation action or safeguard] |
| [Authoritative URL, plan, review, test, or durable doc] | [Material finding] | [Decision, task, check, or non-goal it drives] |

- **Research/delegation record:** [Meaningful codebase-scouting or external-research lane and terminal handoff, plus parent verification of material claims. For direct work, record the concrete allowed fallback reason.]
- Cite only inspected sources. Keep essential findings and effects here even when detailed notes exist in planning memory.

## Scope and non-goals

- **In scope:** [Bounded outcomes and integration surfaces.]
- **Non-goals:** [Adjacent work intentionally excluded and why, when material.]

## Decisions and constraints

| Decision or constraint | Why | Status / consequence |
|---|---|---|
| [Chosen behavior, architecture, invariant, compatibility boundary, or assumption] | [Brief implementation-relevant reason] | Confirmed / inferred-reversible / approval required |

## Phase 1 — [Concrete, independently verifiable outcome]

### Problems addressed

- [Problem from the top-level inventory resolved or reduced by this phase.]

### Implementation summary

State the phase approach, dependency boundary, and resulting observable state in a few sentences.

### Tasks

#### T1.1 — [Task title]

**Description**

- Implement [specific behavior] in [symbol/component] and state the intended control/data flow.
- Update required integration boundaries and preserve [named invariant or compatibility behavior].
- Inspect and add every coupled caller, test, fixture, configuration entry, schema, generated file, document, and downstream consumer discovered during implementation; the files below are starting points, not a closed allowlist.

**Relevant files — non-exhaustive starting points**

- Modify `src/example.ts` — `targetSymbol`: [purpose].
- Create or modify `test/example.test.ts`: [behavior protected].
- Search `[narrow pattern]` and resolve the exact path before editing when a path is not yet knowable.

**Dependencies**

- [Task IDs, approval, migration state, or `None`.]

**Contract or shape** *(include only for a material API, type, schema, query, config, CLI, protocol, or state-machine contract)*

```text
[Critical target shape, invariant, or transition only]
```

**Acceptance and verification**

- [Observable acceptance criterion] — run `[exact command or manual/operator check]`; expect [specific signal] and retain [test output, diff, screenshot, log, or migration evidence].
- [Failure/regression criterion] — verify [boundary behavior] with [exact evidence].

**Task-local risks** *(include only when applicable)*

- [Task-specific failure mode and safeguard or recovery action.]

<!-- Repeat titled stable-ID tasks as needed. IDs remain stable if tasks move or are refined. -->

### Risks, safeguards, and recovery

- **Material failure or migration risk:** [Failure mode and affected state.]
- **Safeguard:** [Prevention, compatibility, observability, or fail-closed behavior.]
- **Rollback/recovery:** [Concrete reversal, retry, cleanup, or operator action and validation.]

Use exactly `None material for this phase` when investigation found no material failure, migration, rollback, or recovery concern; do not add generic boilerplate.

### Phase validation and review

- **Checks:** Run [focused and phase-wide commands/manual checks]; expect [specific results]. Confirm the phase is green with all discovered coupled artifacts and consumers.
- **Review focus:** [Task IDs, highest-risk behavior/files, callers, and integration boundaries.]
- **Baseline:** [This phase's problems, decisions, task acceptance criteria, and approved deviations.]
- **Evidence:** [Plan/tracker path, changed diff, checks/results, runtime artifacts, skipped checks with reasons, and known risks.]
- **Exit and rerun:** Apply the current `code-review` authoritative finding and follow-up contract, disposition material findings, fix admitted work, and rerun [named checks]. Use one fresh read-only review for a meaningful checkpoint when safely available; otherwise record the concrete fallback reason and independence limitation. Deduplicate an aligned owning-workflow review.

<!-- Add numbered phases only for real dependency, delivery, migration/rollout, or independently verifiable boundaries. Each phase repeats the complete required structure above. -->

## Final validation and review

- Run `[authoritative repository gates]`; expect [exact success signals].
- Perform applicable integration, browser/manual, migration/rollback, security, performance, documentation, generated-output, and cleanup checks; justify material skips.
- **Review focus:** the complete implementation, all changed and discovered coupled files, highest-risk decisions, and cross-phase integration.
- **Baseline:** this full plan, sources, decisions, acceptance criteria, Definition of Done, and approved deviations.
- **Evidence:** provide the plan and tracker/progress evidence, complete diff, callers/consumers, all validation results, skips, constraints, deviations, and known risks.
- **Exit and rerun:** Apply the current `code-review` contract. Default to a fresh read-only final reviewer when safely available; otherwise record an allowed concrete fallback and independence limitation. Resolve findings, rerun affected and final gates, and deduplicate any equivalent implementation-workflow final review.

## Definition of Done

- [Each problem and required outcome is resolved with observable evidence.]
- [Every task, source-driven requirement, decision, and accepted review finding is implemented or explicitly approved as deferred.]
- [Automated/manual checks pass; coupled callers, tests, config, schemas, generated artifacts, docs, consumers, migration/rollout, and recovery work are complete where applicable.]
- [Review and fallback evidence is resolved, with remaining blockers or operator steps explicit.]
