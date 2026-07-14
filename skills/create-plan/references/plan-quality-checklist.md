# Plan Quality Checklist

Complete this checklist before independent draft review and repeat it after material revisions.

## Handoff completeness

- The mandatory template was loaded and every non-conditional section is present.
- A fresh implementer can act without reconstructing decisions from chat or repeating core research.
- The outcome, chosen approach, material boundaries, decision status, and brief rationale are explicit.
- Detailed research remains in `.progress`, while executable decisions, instructions, pitfalls, and critical shapes remain in the plan.

## Sources and traceability

- Relevant project plans, `.progress` notes, `.reviews` reports, docs, URLs, source symbols, and tests were searched and cited with what each contributes.
- No artifact, path, symbol, command, or heading was invented; mutable line numbers are not the sole anchor.
- Every requirement, review finding, audit item, or accepted decision maps to a phase, explicit assumption, approval gate, or approved deferment.
- File coverage includes callers, consumers, generated artifacts, fixtures, docs, configuration, migrations, and cleanup where applicable.

## Phase quality

- Each phase has a concrete outcome and exists for a real dependency, delivery, migration/rollout, or independently verifiable boundary.
- Instructions use imperative actions, exact files/symbols, intended behavior, ordering, and dependencies.
- Unknown paths have narrow discovery instructions rather than guessed references.
- Non-obvious decisions have a brief why; detailed alternatives are not duplicated from planning memory.
- Relevant API/type/schema/query/config/CLI/protocol/state-machine changes include a short critical-shape snippet.
- Pitfalls, edge cases, unsafe shortcuts, compatibility limits, partial failures, and recovery are placed where they matter.
- Every advertised green checkpoint includes all coupled schema, generated files, callers, fixtures, docs, and tests.

## Validation and review

- Each phase names exact automated checks or concrete inspections plus applicable manual checks, with expected success signals or retained evidence; automation N/A is justified rather than fabricated.
- Planned commands exist, use the correct working directory, and distinguish focused checks from authoritative repository gates.
- Tests cover meaningful happy paths, failures, edge cases, regressions, and invariants; defect fixes include fail-before proof when practical.
- UI work includes real-browser guidance; migrations, external services, destructive work, background processes, and rollout include applicable operator, cleanup, rollback, or recovery checks.
- Review checkpoints state focus, required evidence, exit conditions, and checks to rerun after fixes.
- Final independent implementation review receives the plan, tracker/progress artifact when present (otherwise the annotated plan), diff/files, evidence, skipped checks, risks, and constraints; material findings cannot be silently ignored.
- Definition of Done is observable and reconciles all requirements, validation, documentation, downstream work, review findings, blockers, and operator steps.

## Compression

- The plan uses lists, at least one useful table, and critical snippets where applicable.
- Concision removed research narrative, repetition, generic advice, and transcript history—not implementation instructions or validation detail.
- No arbitrary phase count or word target distorted the plan.
- Information appears once at its point of use; references support the plan but do not hide essential decisions or actions.
