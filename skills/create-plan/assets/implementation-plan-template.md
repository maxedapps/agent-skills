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

- Review [high-risk behavior/files] against [decision, invariant, or source finding].
- Evidence: [diff, focused tests, logs/screenshots, migration output, or report].
- Exit when [material findings resolved and named checks rerun].

<!-- Repeat only for meaningful dependency, migration/rollout, delivery, or independently verifiable boundaries. -->

## Final validation and review

- Run `[authoritative repository gate]` — expect [result].
- Run applicable browser/manual, migration, security, performance, cleanup, and no-drift checks; name any justified skip and its confidence impact.
- Request an independent implementation review focused on [highest-risk decisions and pitfalls], providing this plan, the implementation tracker/progress artifact when present (otherwise the annotated plan), changed files/diff, validation evidence, skipped checks, and known constraints.
- Convert material findings into tracked work, fix them, rerun affected checks, and obtain follow-up review until no material concern remains or a human decision blocks completion.

## Definition of Done

- [Observable product/technical outcome is complete.]
- [Every requirement, source finding, and approved decision is implemented or explicitly approved as deferred.]
- [Required automated and manual checks pass with retained evidence.]
- [Documentation, migration/rollout/recovery, generated artifacts, and downstream consumers are complete where applicable.]
- [Independent review is resolved; remaining blockers or operator steps are explicit.]
