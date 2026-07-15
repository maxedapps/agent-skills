# [Plan title]

> **Status:** Ready for implementation | Blocked on [decision]
> **Planning memory:** `.progress/[plan-slug].md` | Not persisted — chat-only/read-only constraint; essential support is included here

## Outcome and approach

State the intended outcome, chosen approach, and the brief implementation-relevant reason for that approach. Name material scope boundaries or blockers only when they prevent ambiguity.

## Sources and traceability

| Reference | Required use |
|---|---|
| `.progress/[plan-slug].md#[heading]` | Retrieve [supporting inventory/research]; the executable decision remains below |
| `.reviews/[relevant-review].md` | Address findings [IDs] and preserve their acceptance criteria |
| `src/example.ts` — `exampleSymbol` | Preserve or change [current contract] |

Include only applicable project plans, `.progress` notes, `.reviews` reports, durable docs, authoritative URLs, and source/test symbols. Do not invent missing artifacts. Prefer symbols or headings; line ranges are discovery aids, not durable identifiers.

## Decisions and constraints

| Decision | Why | Status / consequence |
|---|---|---|
| [chosen behavior or architecture] | [brief reason] | Confirmed / inferred-reversible / approval required |

Record non-obvious decisions, invariants, compatibility boundaries, and assumptions an implementer must not rediscover. Put detailed alternatives and rejected evidence in planning memory.

## Phase 1 — [concrete, verifiable outcome]

**Files and references**

- Modify `src/example.ts` — `exampleSymbol`: [purpose].
- Create `src/example.test.ts`: [behavior protected].
- Delete or move `[path]` only after [prerequisite/replacement].

If an exact path is genuinely unknown, provide the narrow search pattern and require resolving it before edits.

**Implementation**

1. [Imperative implementation instruction and intended behavior.]
2. [Required caller, generated artifact, fixture, documentation, or downstream-consumer update.]
3. [Test work integrated with the behavior rather than deferred to a generic final phase.]

**Contract or shape** — include when changing an API, type, schema, query, configuration, CLI, protocol, or state machine; otherwise omit this block.

```ts
// Show only the critical target shape, invariant, or transition.
```

**Pitfalls and safeguards**

- [Failure mode, edge case, unsafe shortcut, compatibility issue, or recovery rule.]
- [Explain briefly why the prescribed implementation avoids it.]

**Checks**

- `[focused automated command or concrete inspection]` — expect [specific passing signal, invariant, or retained evidence]. If automation is genuinely inapplicable, say so briefly instead of inventing a command.
- `[manual/browser/operator check]` — expect [observable behavior]; omit only when genuinely inapplicable and state why in final validation when material.
- Confirm the checkpoint includes every coupled schema, caller, generated file, fixture, and test needed to be green.

**Review checkpoint**

- **Focus:** [completed task IDs, high-risk behavior/files, callers, and integration boundaries]. Request complete inspection but selective findings with advisory severity (`S4 Critical`→`S0 Optional`) and confidence (`C3 Confirmed`→`C1 Tentative`) scores: every `S4`, at most five additional material `S3`/`S2`, and no `S1`/`S0`, niche/speculative, or disproportionate work by default. If more remain, require one blocking `not review-ready` caveat with highest severity, affected areas/dimensions, aggregate impact, evidence basis, and count/lower bound.
- **Baseline:** [this phase's requirements, decisions, invariants, acceptance criteria, and approved deviations]. When implementation exists, request a **bounded plan-backed code review** of this scope. Treat it as embedded only when the owning implementation workflow requests the checkpoint; a direct request remains standalone.
- **Evidence:** [plan/tracker paths, changed files/diff, focused tests and results, logs/screenshots/migration output, skipped checks with reasons, constraints, deviations, and known risks].
- **Exit and rerun:** treat scores as guidance, independently rescore from evidence, reachability, relevance, impact, assumptions, and fix cost, and record reviewer/owner scores plus disposition rationale; no label alone admits or blocks. Turn unconfirmed concerns into validation tasks and track accepted fixes. Rerun [named checks], then allow one fix/regression-only follow-up; separately escalate incidental severe issues. One extra round requires unresolved material risk, confirmed regression, or invalidated coverage; then stop for an owner/human decision.
- If an owning workflow already requires a milestone review with the same scope, baseline, evidence, and exit conditions, satisfy both with one review and one finding-resolution loop; do not request a duplicate reviewer merely because both the plan and workflow contain a checkpoint.

<!-- Repeat only for meaningful dependency, migration/rollout, delivery, or independently verifiable boundaries. Not every phase is automatically a major review milestone. -->

## Final validation and review

- Run `[authoritative repository gate]` — expect [result].
- Run applicable browser/manual, migration, security, performance, cleanup, and no-drift checks; name any justified skip and its confidence impact.
- **Focus:** the complete implementation, all changed files and required integration boundaries, highest-risk decisions, and all applicable code-review dimensions/matrix rows. Apply the phase checkpoint's proportional request and selective finding default.
- **Baseline:** this full plan, its sources and acceptance criteria, the implementation tracker/progress evidence, and documented approvals/deviations. Request a **full plan-backed code review**. Treat it as embedded only when the owning implementation workflow requests the final checkpoint; otherwise it is standalone.
- **Evidence:** provide this plan, tracker/progress artifact when present (otherwise the annotated plan), changed files/diff, callers, tests and validation results, skipped checks, constraints, deviations, and known risks.
- **Exit and rerun:** apply the phase checkpoint's independent rescoring/disposition, validation-task, focused-follow-up, severe-issue reassessment, and round-stop rules; fix accepted work and rerun affected/final gates. Prefer worthwhile independent review, otherwise record the direct-review limitation. Deduplicate an aligned owning-workflow final review.

## Definition of Done

- [Observable product/technical outcome is complete.]
- [Every requirement, source finding, and approved decision is implemented or explicitly approved as deferred.]
- [Required automated and manual checks pass with retained evidence.]
- [Documentation, migration/rollout/recovery, generated artifacts, and downstream consumers are complete where applicable.]
- [Applicable milestone and final reviews are resolved through independent review when safely available and worthwhile, or a recorded checklist-driven direct review; remaining blockers or operator steps are explicit.]
