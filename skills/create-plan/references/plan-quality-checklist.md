# Plan Quality Checklist

Complete this checklist before independent/direct draft review and repeat it after material revisions. Check semantics yourself; the structural validator proves only the required Markdown shape.

## Structure and handoff

- The current [`../assets/implementation-plan-template.md`](../assets/implementation-plan-template.md) was loaded and copied; all guidance and explicit sentinels such as `[Plan title]`, `[Task title]`, `src/example.ts`, and `REPLACE_ME` were replaced.
- `Problems` describes evidence-backed current-state problems without hiding implementation steps; `Implementation summary` gives the chosen overall approach and dependency order concisely.
- `Conducted research and relevant sources` has source/artifact, material finding, and implementation-impact columns; cited artifacts and URLs were actually inspected.
- `Scope and non-goals` bounds the outcome, and `Decisions and constraints` records non-obvious choices, invariants, assumptions, status, consequences, and brief reasons.
- The plan has one or more numbered, titled phases and ends with `Final validation and review` plus an observable `Definition of Done`; phase count follows real boundaries rather than a target.
- Every phase includes concise `Problems addressed`, `Implementation summary`, `Tasks`, `Risks, safeguards, and recovery`, and `Phase validation and review` sections.
- Every task has a unique stable ID and title, actionable `Description`, `Relevant files — non-exhaustive starting points`, `Dependencies`, and `Acceptance and verification`; task-local risks are included where applicable.
- `node scripts/validate-plan-structure.mjs <plan.md>` succeeds for the final saved plan, and its exact result is retained. For a no-write/chat-only plan, the same structure was checked manually and the unavailable CLI gate is explicit.

## Research, traceability, and strategy

- Relevant source, tests, config, docs, plans, progress/reviews, callers, consumers, generated artifacts, fixtures, schemas, migrations, and repository conventions were searched deeply enough to support the tasks.
- Every requirement, source finding, accepted review item, and decision maps to a task, phase safeguard/check, explicit approval gate, or approved deferment; essential actions are not hidden in planning memory.
- Paths, symbols, commands, headings, and source claims are exact and non-invented. Unknown files use a narrow discovery pattern and must be resolved before edits; mutable line numbers are not the sole anchor.
- Current or third-party contracts use version-matched authoritative evidence; material source conflicts, uncertainty, unavailable credentials, and operator-only provisioning are resolved or made explicit with fail-closed/test strategy.
- For non-trivial planning with a safe capability, at least one meaningful separable scouting/research lane produced a sourced terminal handoff and material claims were independently verified. Parallel lanes covered non-overlapping questions only.
- Any direct substantive research fallback records one concrete allowed reason—triviality, inseparability, unavailable/unsafe capability, user prohibition, or disproportionate coordination cost—and its evidence limitation.
- Planning memory exists for substantive, multi-source, resumable, conflict-heavy, or high-risk work and contains detailed evidence/alternatives/open questions; omission is justified by genuinely small scope or no-write constraints. The plan itself retains all answer-critical support.

## Task and phase actionability

- Each task states intended behavior/control flow, ordering, dependencies, integration boundaries, and enough detail for a fresh implementer to proceed without repeating core research.
- Every task file list is explicitly non-exhaustive and requires implementation-time discovery of coupled callers, tests, fixtures, config, schemas, generated files, docs, and downstream consumers.
- Relevant API/type/schema/query/config/CLI/protocol/state-machine work includes a short critical target shape or invariant; no synthetic snippet was added where none helps.
- Tests and verification are colocated with the behavior they protect and cover meaningful success, failure, regression, compatibility, migration, and risk boundaries rather than being deferred to a generic final phase.
- Every advertised phase-green state includes discovered coupled artifacts and consumers, and tasks do not defer necessary integration to an unspecified later step.
- The required phase risk section names material failure/migration behavior, safeguards, and rollback/recovery, or states exactly `None material for this phase`; generic risk boilerplate is absent.

## Validation and review

- Task acceptance and each phase/final check name an exact command or concrete manual/operator inspection, expected success signal, and retained evidence; automation N/A and material skips are justified.
- Planned commands exist, use the correct working directory, distinguish focused from authoritative gates, and cover applicable browser/UI, security, performance, migration/rollback, external-service, cleanup, and no-drift behavior.
- Each phase and final review states focus, baseline, evidence payload, exit/disposition, exact reruns, constraints/deviations, skipped checks, and known risks.
- Meaningful plan-authored checkpoints and final completion default to fresh read-only independent review when safely available; a direct fallback uses an allowed concrete reason and states the independence limitation.
- Review handling references the current `code-review` authoritative materiality, finding-selection, disposition, and bounded follow-up contract without copying its scoring/quota lifecycle. Aligned implementation-workflow reviews are deduplicated.
- Draft review received the complete request, plan, memory/equivalent evidence, sources, decisions, constraints/non-goals, risks, unresolved questions, and code/test pointers. Its sourced terminal handoff was verified; findings are resolved, reasonedly rejected/deferred, or exposed as decisions.
- After admitted fixes, affected checks and the structural validator were rerun, with review follow-up kept within the authoritative bounded policy.

## Delivery and compression

- The Markdown plan is saved under `.plans/` whenever writes are permitted and does not overwrite unrelated work; a chat-only result exists only because of an explicit no-write/output constraint.
- HTML rendering/opening occurs only when requested, required by project convention, or useful interactively; renderer fallback/skip and actual artifact paths are reported accurately.
- Lists and at least one useful table keep the plan scannable. Concision removed narrative, repetition, generic advice, and transcript history—not decisions, task detail, safeguards, traceability, checks, or evidence.
