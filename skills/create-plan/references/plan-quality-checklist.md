# Plan Quality Checklist

Complete before final review and again after material revisions.

## Evidence and decisions

- [ ] Local exploration traced relevant definitions, callers, consumers, tests, fixtures, config, schemas, migrations, generated artifacts, docs, and repository conventions.
- [ ] Decision-relevant external claims use inspected, authoritative, version-matched sources.
- [ ] Sources, paths, symbols, commands, and observed behavior are exact. Unknown paths use a narrow discovery instruction.
- [ ] Viable approaches were compared deliberately. The choice, material trade-offs, assumptions, and approval gates are explicit.
- [ ] Every material finding maps to a decision, task, safeguard, check, non-goal, or unresolved gate.
- [ ] Any delegated lane has a sourced handoff; the parent verified and consolidated material claims.

## Implementation readiness

- [ ] The current template was copied and adapted. All guidance, examples, and placeholders were replaced without removing required headings or task fields.
- [ ] Problems are evidence-backed; scope, non-goals, dependency order, and intended outcomes are unambiguous.
- [ ] Each stable-ID task states behavior, integration boundaries, dependencies, non-exhaustive file starts, and observable acceptance evidence.
- [ ] File starts do not act as allowlists. Implementation-time discovery covers coupled code, tests, config, schemas, generated outputs, docs, and consumers.
- [ ] Exact target shapes appear only where they prevent ambiguity.
- [ ] Tests sit with the behavior they protect and cover material success, failure, regression, compatibility, migration, and recovery boundaries.
- [ ] Each phase can finish green. Risks, safeguards, recovery, validation, review focus, exit conditions, and reruns are specific.
- [ ] Final validation covers authoritative repository gates and applicable integration, manual, security, performance, migration, cleanup, documentation, and no-drift checks. Material skips are justified.
- [ ] Definition of Done is observable and includes decisions, accepted findings, coupled work, operator steps, and explicit deferrals.

## Review and delivery

- [ ] A fresh independent reviewer was used when safe and proportionate, or the plan records the concrete fallback and independence limitation.
- [ ] The parent checked reviewer evidence and dispositioned material findings. Affected checks and this checklist were repeated after fixes.
- [ ] The plan is concise: short sentences, useful bullets and tables, no transcript, repeated policy, generic advice, or unsupported detail.
- [ ] The final artifact is Markdown under `.plans/` when writes permit; otherwise the no-write reason is stated.
- [ ] Remaining assumptions, unresolved gates, skipped research or review, and known risks are visible.
