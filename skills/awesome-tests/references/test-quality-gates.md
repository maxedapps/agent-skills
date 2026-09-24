# Test quality gates

Contextual guidance, not a pyramid, coverage target, or checklist.

## Layers and regressions

- Start from the changed behavior, past regressions, trust boundaries, and plausible failure modes.
- Prefer a focused regression test at the defect boundary, including the condition that escaped, plus only the broader check needed to prove integration. Don't repeat the same permutations across layers.
- Cover the boundaries and failure paths that are reachable and costly when wrong, such as rejection with partial work, rollback, or idempotency. Not every value class needs a test.
- At trust boundaries, assert the denied capability or preserved invariant (authorization, tenant isolation, escaping, secret exposure), not only a status code.

## Fixtures and doubles

- Use small, realistic fixtures with intent-revealing values. Avoid shared mutable state and oversized factories.
- Prefer real collaborators when their behavior is the risk and they stay deterministic and affordable. Use fakes for controlled stateful behavior and mocks for genuinely contractual interactions or hard boundaries.
- Keep doubles faithful to the real error, async, serialization, and lifecycle behavior of the installed versions.
- Assert exact call counts or order only for protocols, idempotency, transactions, billing, or side-effect safety. Otherwise assert the resulting state.

## Determinism and flakes

- Await or return every async operation and make sure assertions actually run. Capture failures from callbacks, timers, workers, and rejected promises.
- Replace sleeps with observable readiness, bounded polling, controllable clocks, or lifecycle signals.
- Control time zone, clock, locale, randomness, generated IDs, and environment where they affect results.
- Make tests order-independent: unique resources, reset state, and failure-safe cleanup of handles, servers, files, and subscriptions.
- Diagnose flakes with bounded repetition plus isolated, reordered, and parallel runs. Keep the original failure evidence; don't paper over nondeterminism with retries.

## UI tests

- Select by role, label, and accessible name. Use test IDs only when no meaningful semantic selector exists; avoid DOM structure, CSS classes, and indexes.
- Assert exact copy only when the wording is the contract (regulated, safety, or acceptance-specified text).
- Wait for observable application state, not elapsed time.

## Snapshots and visual tests

- Snapshot only a small, stable contract a reviewer can understand. Prefer focused assertions when they identify the behavior better.
- Normalize only values that aren't part of the contract. Treat snapshot updates as behavior changes and reject unexplained bulk rewrites.
- Visual tests need a stable viewport, fonts, animation, and data. Pair them with semantic assertions when appearance alone can't prove correctness.

## False greens in CI

- Confirm the runner discovers the test and CI actually runs it with the right environment and services. An undiscovered test protects nothing.
- A conditional test must fail or report clearly when required configuration is missing, not silently become a no-op.
- Keep the lost protection of a skip or quarantine visible, with a reason and a way back. Retries may gather flake evidence but never turn eventual passage into correctness.
