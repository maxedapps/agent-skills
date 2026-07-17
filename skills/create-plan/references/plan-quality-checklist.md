# Plan Quality Checklist

Complete before final review and again after material revisions.

## Evidence and decisions

- [ ] Local exploration traced relevant definitions, callers, consumers, tests, fixtures, config, schemas, migrations, generated artifacts, docs, and repository conventions.
- [ ] Decision-relevant external claims use inspected, authoritative, version-matched sources.
- [ ] Sources, paths, symbols, commands, and observed behavior are exact. Unknown paths use a narrow discovery instruction.
- [ ] Viable approaches were compared deliberately. The choice, material trade-offs, assumptions, and approval gates are explicit.
- [ ] Every material finding maps to a decision, task, safeguard, check, non-goal, or unresolved gate.
- [ ] At least two dedicated exploration/research subagents produced bounded, sourced handoffs.
- [ ] The parent verified material claims, resolved conflicts, filled coverage gaps, and owns all decisions.

## Implementation readiness

- [ ] The current template was copied and adapted. All guidance, examples, and placeholders were replaced without removing required headings or task fields.
- [ ] Problems are evidence-backed; scope, non-goals, dependency order, and intended outcomes are unambiguous.
- [ ] The design is the simplest evidence-backed solution. No speculative abstraction, package, phase, compatibility layer, or future scope remains.
- [ ] Each stable-ID task states behavior, integration boundaries, dependencies, non-exhaustive file starts, and observable acceptance evidence.
- [ ] File starts do not act as allowlists. Implementation-time discovery covers coupled code, tests, config, schemas, generated outputs, docs, and consumers.
- [ ] Exact target shapes appear only where they prevent ambiguity.
- [ ] Tests sit with the behavior they protect and cover material success, failure, regression, compatibility, migration, and recovery boundaries.
- [ ] Each phase can finish green. Risks, safeguards, recovery, validation, review focus, exit conditions, and reruns are specific.
- [ ] Final validation covers authoritative repository gates and applicable integration, manual, security, performance, migration, cleanup, documentation, and no-drift checks. Material skips are justified.
- [ ] Definition of Done is observable and includes decisions, accepted findings, coupled work, operator steps, and explicit deferrals.

## Review and delivery

- [ ] A fresh read-only subagent reviewed the full draft independently and did not delegate.
- [ ] The parent critically evaluated every finding as `Accept`, `Validate`, `Reject`, or `Ask user`.
- [ ] Accepted changes are evidence-backed, in scope, and proportionate. Rejected complexity-increasing findings include a reason.
- [ ] Unclear scope, behavior, architecture, risk, migration, or complexity choices were asked of the user rather than guessed.
- [ ] At most one focused follow-up checked accepted changes without reopening broad review.
- [ ] The checklist was repeated after review changes.
- [ ] The plan is concise: short sentences, useful bullets and tables, no transcript, repeated policy, generic advice, or unsupported detail.
- [ ] The final artifact is Markdown under `.plans/` when writes permit; otherwise the no-write reason is stated.
- [ ] Remaining assumptions, user decisions, unresolved gates, skipped work, and known risks are visible.
