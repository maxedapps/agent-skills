# Review dimensions

Use this reference for broad reviews and for any requested dimension. Apply only relevant checks, but do not let a narrow baseline hide defects in required integration boundaries.

## Contents

- [Coverage, worktree, and evidence](#coverage-worktree-and-evidence)
- [Correctness](#correctness)
- [Code quality and simplicity](#code-quality-and-simplicity)
- [Typing and trust boundaries](#typing-and-trust-boundaries)
- [Libraries, languages, and version evidence](#libraries-languages-and-version-evidence)
- [Security and data safety](#security-and-data-safety)
- [Performance and scalability](#performance-and-scalability)
- [High-value tests and validation](#high-value-tests-and-validation)
- [API, compatibility, data, and operations](#api-compatibility-data-and-operations)
- [Packages, CLIs, configuration, and CI](#packages-clis-configuration-and-ci)
- [Runtime, UI, accessibility, and UX](#runtime-ui-accessibility-and-ux)

## Coverage, worktree, and evidence

- Read relevant files and call sites in full before drawing conclusions. Partial or skipped reads are acceptable for generated, vendor, lock, or genuinely oversized content only when the reason and confidence limit are recorded.
- Inspect repository shape and status, supplied and working-tree diffs, commits when relevant, tests, configuration, documentation, migrations, environment examples, CI, and nearby project patterns.
- Treat owner changes as immutable review input. Do not use destructive worktree operations.
- Snapshot the state of tracked generated files before builds, type generation, formatting, or checks that may rewrite them. Restore only review-created changes; never erase pre-existing owner changes.
- Treat package-manager and “informational” workspace commands as mutating when they may rewrite manifests, lockfiles, workspace metadata, caches represented in source, or install state. Prefer read-only inspection and verify status after checks.
- Run cheap targeted confirmation for serious suspicions when practical. Throwaway repros should assert the hypothesized behavior rather than depend on console output, which sandboxed runners may suppress.
- Delete temporary repro files unless retention was requested. If declared review artifacts are covered by repository format/check gates, format them without broad unrelated churn.
- For moved, renamed, or extracted code, compare old and new content and tests for dropped, duplicated, or behaviorally drifted logic.
- Distinguish deterministic behavior, a reachable risk confirmed from evidence, and an incident actually observed in the target workflow. Do not imply operational recurrence without operational evidence.

## Correctness

- Broken edge cases, wrong assumptions, off-by-one errors, and lifecycle bugs.
- Null, undefined, exception, and error-as-data handling gaps.
- Race conditions, stale state, async ordering defects, cancellation, and missing cleanup.
- Inconsistent validation, parsing, serialization, encoding, and normalization.
- Incorrect API contracts, return shapes, status codes, and error semantics.
- Behavior inconsistent with tests, docs, names, public contracts, or user expectations.
- Refactors that retain signatures while losing side effects, ordering, fallback behavior, or integration wiring.

## Code quality and simplicity

Prefer obvious data flow and the least structural solution that meets current requirements.

- Naming that hides intent or creates misleading boundaries.
- Unnecessary abstractions, layers, factories, managers, wrappers, hooks, services, adapters, descriptors, or frameworks.
- One-line helpers used once or merely renaming a call.
- Tiny files, classes, or functions that add navigation without a stable boundary.
- Generic helpers, types, options, and extension points for hypothetical future needs.
- Boolean flags, modes, or broad APIs that push complexity into callers.
- Duplicate logic, duplicate derived state, and multiple sources of truth.
- Clever code, dense type tricks, and indirection that hide responsibility.
- Comments that preserve confusing code which should instead be simplified.

For cleanup or refactor recommendations, use this order:

1. delete;
2. direct import or direct call;
3. small local helper;
4. shared abstraction.

Inventory concrete deletion and consolidation candidates. Distinguish residual wrappers from already-shared implementations, and name similar code that should intentionally remain separate. Challenge every new package, service, helper, descriptor, or framework against current consumers and real change drivers; recommendations must not introduce the speculative structure they criticize.

Keep abstractions that remove real duplication, encode a stable domain concept, protect a boundary, centralize policy, or make call sites materially clearer.

## Typing and trust boundaries

- `any`, unsafe `unknown`, over-broad object/string types, and lost generics.
- Casts and non-null assertions that suppress reachable uncertainty.
- Missing runtime validation at external, persistence, message, file, or user-input boundaries.
- Public types that misrepresent nullability, error modes, async behavior, mutability, or ownership.
- Duplicated or drifting schema, runtime, generated, and static types.

## Libraries, languages, and version evidence

Before judging third-party or runtime behavior, identify the installed dependency, framework, language, SDK, database, and runtime versions that govern the target. Use current, version-matched official documentation, source, release notes, changelogs, migration notes, standards, and first-party examples. Record material conflicts and the implementation implication; do not rely on remembered APIs or examples from another version.

Check:

- framework lifecycle, concurrency, cleanup, and recommended boundaries;
- custom code replacing standard library/framework features without demonstrated benefit;
- deprecated APIs, stale patterns, and version-mismatched examples;
- applicable project-specific contracts and guidance.

Conditional integration hotspots:

- **Error-as-value clients:** determine from installed types/source whether a call throws or resolves with data plus error. An awaited result that is discarded may silently swallow failure.
- **Hand-written third-party interfaces and unsafe casts:** compare required fields and return shapes with installed typings/source, especially in credential-gated paths absent from end-to-end tests.
- **Dependency-owned routes:** verify hardcoded URL plus method against installed route definitions or dispatch a request through the real handler. A test that only renders the URL does not prove the route exists.

## Security and data safety

- Missing server-side authentication or authorization, especially for privileged actions and object-level access.
- Trust in client input or client-only validation.
- SQL, NoSQL, command, template, path, header, log, and related injection.
- XSS, unsafe HTML/Markdown, unsafe redirects, and CSRF-relevant state changes.
- Secrets, tokens, PII, or sensitive internals in code, logs, errors, URLs, artifacts, or configuration.
- Weak cryptography, insecure randomness, unsafe deserialization, and insecure defaults.
- Over-broad permissions, CORS, filesystem access, SSRF, dependency, and deployment configuration risks.
- Missing security/data invariants in tests and recovery paths.

## Performance and scalability

- N+1 queries, repeated file/network/database calls, and missing justified batching or caching.
- Unnecessary renders, repeated expensive computation, and avoidable allocation.
- Missing pagination, streaming, limits, timeouts, cancellation, safe retries, or backpressure.
- Algorithms and data structures mismatched to expected input sizes.
- Premature optimization that adds complexity without evidence.

Before prescribing an index, run `EXPLAIN QUERY PLAN` or the datastore equivalent against the actual query when practical. Report unavailable plan evidence. Do not assume a plausible column list or one index serves different predicates and orderings; verify each material query shape.

## High-value tests and validation

Assess protected behavior, not test count or line coverage. Check:

- user-visible and acceptance behavior;
- important happy paths and state transitions;
- failure/error paths, negative cases, and boundary/edge cases;
- regressions, invariants, concurrency, isolation, and cleanup;
- integration boundaries and real runtime wiring;
- security, authorization, privacy, and data-safety risks;
- relevant build, lint, typecheck, migration, packaging, and CI gates.

Flag tests that assert implementation details, over-mock real behavior, duplicate existing coverage, use fragile fixtures, hide intent, or create count-only confidence. Detect skipped, filtered, or credential-gated tests: a green command proves nothing about tests that did not execute.

Before recommending deletion, verify a test does not uniquely protect runtime wiring, environment compatibility, decoder/parser failure classes, upgrade canaries, persisted column mappings, authorization/isolation predicates, or another otherwise-uncovered boundary.

Conditional checks:

- **Rendered forms and browser flows:** submit the actual generated controls, hidden values, cookies, and browser state. Reconstructing a request from upstream data can bypass broken form wiring.
- **Hybrid compile/runtime guarantees:** run both halves. Transpile-only runtime tests do not establish TypeScript or equivalent static exactness.
- **Discovered defects:** require a focused regression assertion when it would protect behavior without overfitting implementation.
- **Disposable repros:** encode an assertion and isolate side effects; do not treat logs alone as proof.

Choose targeted tests, typecheck/lint/build, migration checks, API probes, browser checks, screenshots, or small repros only when they materially improve confidence. Record skipped checks, reasons, and consequences.

## API, compatibility, data, and operations

- Backwards compatibility, public contract clarity, versioning, and stale-client behavior.
- Errors that are hidden, lose context, retry unsafely, or lack user/operator visibility.
- Missing or noisy logs, metrics, and traces for important production paths.
- Migration and data-integrity risks, idempotency, rollback, reconciliation, and recovery.
- Dependency, environment, configuration, packaging, deployment, and CI drift.

### Ambiguous external side effects

For send/create/payment-style operations, do not recommend automatic retry or a retryable failure state unless non-execution is known or the provider supports reliable reconciliation/idempotency. If acceptance may already have occurred, prefer an explicit unknown outcome until reconciled.

Trace externally classified outcomes through persistence failure, queue retry, and stale-reconciliation paths. A known accepted or rejected result must not be re-executed or later downgraded to unknown merely because its terminal write failed. Require durable outcome evidence, read-back, idempotent reconciliation, or outcome-specific recovery.

## Packages, CLIs, configuration, and CI

For a publishable package or CLI, inspect the actual package artifact with the ecosystem equivalent of a dry-run pack. Then install and execute that artifact in a clean temporary consumer when practical. Source-tree tests alone do not prove included files, exports, executable bits, generated output, dependency declarations, or clean-consumer behavior.

If review-created notes/reports are not package-ignored, inspect from a clean archive/copy or explicitly separate artifact contamination from owner-authored package contents. Also check:

- package exports, entry points, types, binaries, files lists, licenses, and runtime dependencies;
- environment/config defaults, examples, validation, and secret handling;
- CI commands versus local scripts, skipped matrices, generated-file drift, and publish gates;
- CLI help, errors, exit codes, non-interactive behavior, path handling, and cleanup.

## Runtime, UI, accessibility, and UX

Static review and typecheck are insufficient for browser-visible or interactive behavior. When practical, verify representative rendered states and actual interaction for layout, clipping, responsive behavior, loading/error/empty states, focus, auth flows, forms, downloads, animation, motion, and final-frame quality. Record when runtime access is unavailable.

Check keyboard navigation, focus management, semantics, contrast, screen-reader impact, touch/pointer behavior, reduced-motion behavior, and understandable user/operator feedback. For generated UI requests, validate the real rendered controls and browser-managed state rather than a synthetic equivalent.
