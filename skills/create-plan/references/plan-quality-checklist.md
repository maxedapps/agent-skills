# Plan Quality Checklist

Complete this checklist before draft review and repeat it after material revisions. Draft-plan critique stays local to plan creation; it does not require implementation evidence or route through implementation code review.

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
- Tests cover meaningful happy paths, failures, plausible contract/risk boundary cases, regressions, and invariants; defect fixes include fail-before proof when practical.
- UI work includes real-browser guidance; migrations, external services, destructive work, background processes, and rollout include applicable operator, cleanup, rollback, or recovery checks.
- Every review checkpoint states its **focus**, authoritative **baseline**, required **evidence**, and **exit/rerun requirements**, including exact checks to repeat after fixes.
- When implementation exists, phase checkpoints request bounded plan-backed code review and final checkpoints request full plan-backed code review; invocation is embedded only when an owning workflow requests that checkpoint.
- A plan-authored checkpoint and an owning implementation workflow checkpoint are one review when scope, baseline, evidence, and exit conditions align; the plan does not create duplicate per-task or per-document reviews.
- Review payloads include the plan/tracker paths, task IDs and acceptance criteria, changed files/diff and callers, validation evidence, skipped checks, deviations, constraints, integration boundaries, and known risks.
- Independent review is preferred only when safely available and worthwhile. Otherwise the plan requires a recorded separate checklist-driven direct review with its independence limitation; plan completion never blocks solely on delegation.
- Review requests require complete applicable inspection/matrix coverage but selective output: prioritized high-confidence material blockers, every Critical plus at most five additional High/Medium root causes, and no niche/speculative, Low/Optional, or disproportionate recommendations by default; excess material root causes produce one blocking `not review-ready` caveat with highest remaining severity, affected areas/dimensions, aggregate impact, evidence basis, and known count/lower bound.
- Findings are independently checked for evidence, reachability, relevance, impact, confidence, and proportionate fix cost; accepted/rejected/deferred rationale is recorded, and unconfirmed concerns become decisive validation questions.
- The default initial review plus one fix/regression-only follow-up and incidental Critical escalation are explicit; one extra round requires unresolved Critical/High, confirmed material regression, or invalidated coverage, then owner/human stop.
- Definition of Done is observable and reconciles all requirements, validation, documentation, downstream work, review findings, blockers, and operator steps.

## Draft review evidence

- Before finalization, the complete request, draft, planning memory or equivalent support, sources, decisions, constraints/non-goals, risks, assumptions, unresolved questions, and relevant code pointers are available to the review pass.
- The review asks for independent judgment and prioritized material blockers to safety, consistency, executability, simplicity, or outcome—not approval, optional polish, or future-flexibility redesign.
- A safely available, worthwhile independent reviewer uses fresh read-only context; otherwise the limitation and same-policy checklist-driven direct review are recorded.
- Follow-up stays within accepted fixes and material regressions; findings are resolved, reasonedly rejected/deferred, or exposed as human decisions within the bounded round policy.

## Compression

- The plan uses lists, at least one useful table, and critical snippets where applicable.
- Concision removed research narrative, repetition, generic advice, and transcript history—not implementation instructions or validation detail.
- No arbitrary phase count or word target distorted the plan.
- Information appears once at its point of use; references support the plan but do not hide essential decisions or actions.
