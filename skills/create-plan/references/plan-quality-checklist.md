# Plan Quality Checklist

Complete before final delivery and again after material revisions.

## Evidence and scope

- [ ] The requested outcome, current problem, in-scope behavior, material non-goals, and chosen approach are concise and unambiguous.
- [ ] Every key local file that materially informed planning appears briefly in `Key files, evidence, and decisions` with an exact path, why it matters, and its plan impact.
- [ ] Key implementation starting files or narrow search targets are included without turning the table or task lists into exhaustive inventories.
- [ ] Decision-relevant external claims use inspected, authoritative, version-matched sources; paths, symbols, commands, contracts, and observed behavior are exact.
- [ ] Material findings map to a decision, task, safeguard, check, non-goal, or unresolved gate. Rejected alternatives appear only when consequential.
- [ ] Every bounded non-trivial repository or external-research question was delegated when a safe capability existed; independent questions were scheduled separately, dependent questions used an awaited child, and any parent inspection used only the narrow atomic/user-prohibited/unavailable-capability exceptions and was reported.

## Implementation readiness

- [ ] The current template was loaded and adapted. Required semantic content remains; all guidance, comments, placeholders, empty optional fields, and `None` boilerplate were removed.
- [ ] `Ready for implementation` is used only when no unresolved material gate can change implementation; otherwise status is `Blocked`.
- [ ] Every stable-ID task directly advances the requested outcome or preserves required behavior and states the change, non-exhaustive starting points, and observable verification.
- [ ] Task checks name exact automated or manual commands/actions, expected signals, and material success, failure, or regression evidence.
- [ ] Tests sit with the behavior they protect. Exact contracts, dependencies, compatibility, migration, rollout, risks, recovery, security, observability, and operator actions appear only where material.
- [ ] A flat task list is used when sufficient. Every phase that remains represents a real boundary, can finish green, and adds only phase-wide checks not already covered by tasks.
- [ ] The plan does not repeat the same problem, approach, check, risk, coupled-file policy, review protocol, or completion rule across sections.
- [ ] Final acceptance covers authoritative repository gates and applicable end-to-end integration/manual behavior, expected signals, justified skips, operator steps, and explicit deferrals or blockers.
- [ ] Every task and phase was challenged for a simpler, narrower alternative; no unjustified complexity, speculative scope, or future-facing machinery remains.

## Review and delivery

- [ ] A proportionate decomplex Prevention pass covered meaningful structural choices when available, or the built-in gate was used and the fallback is reported outside the plan.
- [ ] A fresh independent read-only reviewer set assessed every consequential draft; complementary reviewers were used only when breadth, risk, or specialist depth justified them, or direct review and its independence limit are reported.
- [ ] Every recommendation and stable-ID finding was critically evaluated as `Accept`, `Validate`, `Reject`, `Ask user`, or `Block`; only accepted evidence-backed proportionate changes entered the plan.
- [ ] Focused originating-reviewer rounds covered revisions, disputed evidence, affected sections, and revision-caused or revision-exposed issues until every commissioned reviewer returned `Clear`.
- [ ] Complexity-increasing remedies received proportionate decomplex triage or the built-in gate; material structural revisions received a current Prevention pass or explicit fallback.
- [ ] Repeated failure, recurrence, no progress, material uncertainty, and persistent disagreement were escalated to the user; human answers returned as reviewer-closure evidence.
- [ ] Planning provenance and routine review ledgers stay outside the implementation handoff unless they create a material decision, task, safeguard, check, or gate.
- [ ] The plan is concise: short sentences, useful tables or bullets, no transcript, generic advice, repeated policy, unsupported detail, or unnecessary file inventory.
- [ ] The final artifact is Markdown under `.plans/` when writes permit; otherwise the no-write reason is stated.
- [ ] Delivery reports delegated lanes, parent-owned fallbacks, review closure, user decisions, rejected or deferred findings, skipped work, unresolved gates, and known risks.
