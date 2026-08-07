# Test quality gates

Use these as contextual decision gates, not a fixed pyramid, coverage target, smell quota, or framework command catalog.

## Contents

- [Strategy and layer selection](#strategy-and-layer-selection)
- [Oracles and regression sensitivity](#oracles-and-regression-sensitivity)
- [Boundaries, negative, security, and data cases](#boundaries-negative-security-and-data-cases)
- [Fixtures, fakes, mocks, and contract fidelity](#fixtures-fakes-mocks-and-contract-fidelity)
- [Determinism, async work, and isolation](#determinism-async-work-and-isolation)
- [UI selectors and text contracts](#ui-selectors-and-text-contracts)
- [Snapshots and visual tests](#snapshots-and-visual-tests)
- [Property, fuzz, and performance tests](#property-fuzz-and-performance-tests)
- [CI, discovery, skips, retries, and quarantine](#ci-discovery-skips-retries-and-quarantine)
- [Diagnostics and ownership](#diagnostics-and-ownership)
- [Review triage](#review-triage)

## Strategy and layer selection

- Start from changed behavior, acceptance criteria, past regressions, trust boundaries, and plausible failure modes. Record what each check would catch.
- Choose the cheapest repository-conventional layer that can observe the contract with enough fidelity: unit, component, integration, contract, end-to-end, or a specialized security, property/fuzz, snapshot/visual, or performance check.
- Move outward when wiring, serialization, persistence, browser/runtime behavior, permissions, or third-party compatibility is the risk. Move inward when a stable pure boundary proves the same claim faster and more clearly.
- Prefer a focused regression near the defect plus only the broader check needed to prove integration. Do not duplicate permutations across layers without distinct protection.
- Keep tests clear enough that failure intent is obvious. Repetition can be cheaper than an abstraction that hides setup or expectations.
- For plans, name the existing or planned path/suite, observable behavior, layer, fixtures/doubles, failure boundary, command/signal, and any justified automation gap or alternate check.

## Oracles and regression sensitivity

- Assert externally observable outcomes: returned values/errors, persisted state, emitted events, rendered semantics, authorization decisions, or bounded side effects.
- Make the oracle discriminating: it must reject the known bad behavior, not merely execute code, log output, snapshot broad state, or assert that something exists.
- Tie regression tests to the defect boundary and include the condition that previously escaped. A passing post-fix run alone does not prove sensitivity.
- Prove failure safely in this order: known bad/pre-fix behavior; a fully reverted bounded break in a disposable copy or safe test seam; an already-available mutation tool; otherwise a stated safety/availability limit.
- Never alter owner work or production code solely to manufacture sensitivity evidence. Verify temporary-state restoration after both expected and unexpected command outcomes.
- Treat line/branch coverage and mutation scores as diagnostic signals. Investigate meaningful uncovered behavior or surviving mutants; do not impose an arbitrary percentage.

## Boundaries, negative, security, and data cases

- Cover material equivalence classes and boundaries rather than every value: empty/missing, minimum/maximum, malformed, duplicate, stale, overflow/precision, encoding, and state-transition edges as relevant.
- Verify rejection semantics and side effects on failure, including partial work, rollback/atomicity, retry/idempotency, cancellation, and cleanup.
- At trust boundaries, test authentication, authorization, tenant/object isolation, validation, injection/escaping, path/redirect handling, secret/PII exposure, and abuse limits when reachable.
- For persisted or exchanged data, protect schema/serialization compatibility, nullability/defaults, ordering only when contractual, migration/round-trip invariants, and corruption or partial-read handling.
- Security tests must assert the denied capability or preserved invariant, not only a status code when data or side effects could still leak.

## Fixtures, fakes, mocks, and contract fidelity

- Use realistic minimal fixtures with intent-revealing values. Avoid shared mutable state, hidden defaults, oversized factories, and fixture data unrelated to the claim.
- Prefer real collaborators when their behavior is the risk and they remain deterministic and affordable. Use fakes for controlled stateful behavior and mocks/spies for a genuinely contractual interaction or hard boundary.
- Do not mock away the behavior being claimed. A test of wiring through mocks does not prove database, network, queue, filesystem, browser, or provider compatibility.
- Keep doubles faithful to installed versions and actual error, async, serialization, and lifecycle semantics. Add contract tests where drift between a double and provider is material.
- Exact call count/order is justified for protocols, idempotency, transactions, billing, or side-effect safety; otherwise prefer the resulting state or output.

## Determinism, async work, and isolation

- Await or return every async operation and ensure assertions execute. Capture failures from callbacks, background tasks, streams, timers, workers, and rejected promises.
- Replace arbitrary sleeps with observable readiness, explicit polling bounded by a timeout, controllable clocks, or lifecycle signals.
- Control time zones, clocks, locale, randomness, generated IDs, process environment, network, and scheduler assumptions where they affect results. Record and replay seeds for randomized failures.
- Make tests independent of order and prior runs. Allocate unique resources; reset state; close handles, transactions, servers, files, workers, and subscriptions in failure-safe cleanup.
- When races are plausible, exercise overlapping operations and the invariant they threaten. A single repeated pass cannot prove absence of concurrency defects.
- Diagnose flakes with bounded repetition plus isolated, reordered, and parallel runs as relevant. Preserve the original failure evidence; do not normalize nondeterminism with broad retries.

## UI selectors and text contracts

- Prefer selectors based on user-visible roles, labels, names, and stable public semantics. Use explicit test IDs when no meaningful semantic selector exists or identity itself is the contract.
- Avoid incidental DOM structure, CSS classes, indexes, and broad text matches. Scope selectors and assert the user-observable state or action result.
- Exact copy is valid for regulated, safety, localization-key, command, or acceptance-specified text. Otherwise assert durable semantics and allow harmless wording changes.
- Wait for observable application state, not elapsed time. Preserve browser/session isolation and test navigation, focus, disabled/loading/error states, and accessibility semantics when material.

## Snapshots and visual tests

- Snapshot only a bounded, stable contract that reviewers can understand. Prefer focused assertions when they better identify behavior.
- Normalize only nondeterministic values that are not part of the contract. Never mask meaningful IDs, ordering, timestamps, layout, or content to make a snapshot pass.
- Review snapshot updates as behavior changes; reject unexplained bulk rewrites. Store inputs and environment assumptions needed to reproduce them.
- Visual tests need stable viewport, fonts, animation, data, platform tolerance, and a reviewed baseline. Use region/component scope when full-page noise adds no protection.
- Pair snapshots or visual diffs with semantic assertions when appearance alone cannot prove interaction, accessibility, or data correctness.

## Property, fuzz, and performance tests

- Use property tests for broad input spaces with a clear invariant, valid generators, useful shrinking, bounded runtime, and reproducible seeds. Keep focused examples for critical named regressions.
- Fuzz parsers, serializers, protocol/trust boundaries, and state machines when malformed or adversarial inputs are material. Assert safety and invariants, not merely “did not crash.”
- Performance tests need a representative workload, controlled environment, warmup/sample method, baseline or budget, and actionable regression threshold. Separate microbenchmarks from end-to-end capacity claims.
- Treat noisy timing, machine contention, and tiny deltas cautiously. Report distributions/context rather than overclaiming from one run.

## CI, discovery, skips, retries, and quarantine

- Confirm the intended runner discovers the test and that CI executes the relevant suite, environment, build mode, and required services. A locally passing undiscovered test provides no gate.
- Make conditional tests fail or report clearly when required configuration is unexpectedly absent. Do not silently turn a required check into a no-op.
- Every skip/quarantine needs a reason, owner, tracking reference, bounded scope, and exit condition. Keep the lost protection visible.
- Retries may gather flake evidence or temporarily contain a known issue; they must retain attempt diagnostics and must not redefine eventual passage as correctness.
- Keep required gates deterministic and proportionate. Separate optional expensive suites explicitly without overstating what the default gate proves.

## Diagnostics and ownership

- Name tests by behavior and condition, so a failure identifies the broken contract. Include expected/actual values and the smallest safe context needed to reproduce.
- Preserve stack traces, seeds, request/correlation IDs, attempt number, timing, environment/version, and relevant artifacts for async, distributed, visual, fuzz, and flaky failures.
- Avoid secrets, PII, huge dumps, and logs without assertions. Diagnostics support an oracle; they are not one.
- Assign ownership for suites, fixtures, baselines, quarantines, and external test environments. Make cleanup and escalation paths explicit for shared resources.
- Report exact commands, results, discovery/skip counts when relevant, sensitivity evidence, retries, cleanup, and confidence limits. Distinguish not run from passed.

## Review triage

Classify evidence before recommending action. A smell name alone never creates a finding.

### Definite defects

Admit when evidence proves the claimed protection is broken or materially misstated, for example:

- the test passes against the known bad behavior or its assertion never executes;
- async work is not awaited/returned and failures escape the runner;
- the required runner does not discover or execute the test;
- demonstrated shared-state leakage makes order or parallel execution change the result;
- a required check is silently skipped, or cleanup reliably corrupts later tests;
- the name/report claims a contract that the oracle demonstrably does not verify.

### Strong signals

Investigate and validate before admission:

- arbitrary sleeps, broad retries, nondeterministic inputs, shared mutable fixtures, or leaked resources;
- assertionless/log-only tests, overly broad snapshots, or mocks that replace the behavior under claim;
- incidental exact copy/DOM/order/call assertions, excessive setup, duplicated coverage, or stale quarantine;
- a narrow happy path despite reachable failure, security, data, lifecycle, or concurrency risk.

Promote a signal only after showing realistic reachability, lost confidence, and a proportionate fix.

### Context-dependent heuristics

Never judge these mechanically: test count, coverage percentage, number of assertions, test length, test IDs, mocks/fakes, snapshots, exact text/order/calls, private access, duplicated setup, pyramid shape, or a named smell. They may be the clearest and cheapest way to protect a real contract. Ask what behavior is uniquely protected, whether a cheaper robust oracle exists, and what maintenance cost the choice creates before changing or deleting it.
