# Plan Quality Checklist

Complete before final delivery and again after material revisions.

## Evidence and scope

- [ ] The requested outcome, current problem, in-scope behavior, material non-goals, and chosen approach are concise and unambiguous.
- [ ] Every key local file that materially informed planning appears briefly in `Key files, evidence, and decisions` with an exact path, why it matters, and its plan impact.
- [ ] Key implementation starting files or narrow search targets are included without turning the table or task lists into exhaustive inventories.
- [ ] Decision-relevant external claims use inspected, authoritative, version-matched sources; paths, symbols, commands, contracts, and observed behavior are exact.
- [ ] Material findings map to a decision, task, safeguard, check, non-goal, or unresolved gate. Rejected alternatives appear only when consequential.
- [ ] Exploration and research were proportionate. Any subagent handoff was bounded and verified by the parent; unavailable or disproportionate independence is reported at delivery rather than disguised.

## Implementation readiness

- [ ] The current template was loaded and adapted. Required semantic content remains; all guidance, comments, placeholders, empty optional fields, and `None` boilerplate were removed.
- [ ] Every stable-ID task directly advances the requested outcome or preserves required behavior and states the change, non-exhaustive starting points, and observable verification.
- [ ] Task checks name exact automated or manual commands/actions, expected signals, and material success, failure, or regression evidence.
- [ ] Tests sit with the behavior they protect. Exact contracts, dependencies, compatibility, migration, rollout, risks, recovery, security, observability, and operator actions appear only where material.
- [ ] A flat task list is used when sufficient. Every phase that remains represents a real boundary, can finish green, and adds only phase-wide checks not already covered by tasks.
- [ ] The plan does not repeat the same problem, approach, check, risk, coupled-file policy, review protocol, or completion rule across sections.
- [ ] Final acceptance covers authoritative repository gates and applicable end-to-end integration/manual behavior, expected signals, justified skips, operator steps, and explicit deferrals or blockers.
- [ ] Every task and phase was challenged for a simpler, narrower alternative; no unjustified complexity, speculative scope, or future-facing machinery remains.

## Review and delivery

- [ ] A proportionate decomplex Prevention pass covered meaningful structural choices when available, or the built-in gate was used and the fallback is reported outside the plan.
- [ ] A fresh read-only reviewer assessed every consequential draft when safe and proportionate, or direct review and its independence limit are reported.
- [ ] Every material recommendation or reviewer finding was evaluated as `Accept`, `Validate`, `Reject`, or `Ask user`; only accepted evidence-backed changes entered the plan.
- [ ] At most one focused follow-up checked accepted changes without reopening broad review.
- [ ] Planning provenance and routine review ledgers stay outside the implementation handoff unless they create a material decision, task, safeguard, check, or gate.
- [ ] The plan is concise: short sentences, useful tables or bullets, no transcript, generic advice, repeated policy, unsupported detail, or unnecessary file inventory.
- [ ] The final artifact is Markdown under `.plans/` when writes permit; otherwise the no-write reason is stated.
- [ ] Delivery reports research/review used, user decisions, rejected or deferred findings, skipped work, remaining assumptions, unresolved gates, and known risks.
