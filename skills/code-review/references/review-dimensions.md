# Review dimensions

Candidate heuristics only — every candidate must still pass the admission gate in `SKILL.md`. Apply selected dimensions thoroughly.

## Evidence traps

- Moved/renamed/extracted code or tests: dropped, duplicated, or drifted behavior
- Deterministic vs reachable risk vs observed incident — don’t imply recurrence without ops evidence
- Disposable repros must assert behavior; logs alone can mislead

## Correctness

- Edges, wrong assumptions, off-by-one, lifecycle defects
- Null/exception/error-as-data gaps
- Races, stale state, async order, cancellation, cleanup
- Inconsistent validation/parsing/serialization/encoding
- Wrong API shapes, statuses, returns, error semantics
- Conflicts with tests, docs, names, contracts, expectations
- Refactors losing side effects, ordering, fallbacks, wiring

## Simplicity and maintainability

Prefer obvious data flow and least structure for current needs. Challenge:

- Misleading names, unclear ownership
- Unnecessary layers/wrappers/hooks/services/adapters/factories
- One-use helpers/tiny files without a stable boundary
- Speculative options, generics, extension points, broad APIs
- Duplicate logic/state, clever type tricks, comments masking confusion

Cleanup order: **delete → direct call/import → local helper → shared abstraction**. Name concrete deletion targets and intentional exceptions.

## Types and trust boundaries

- Unsafe `any`/`unknown`, broad object/string types, lost generics, casts, non-null assertions
- Missing runtime validation at user/external/persistence/message/file boundaries
- Public types misstating nullability, errors, async, mutation, ownership
- Drift among runtime schemas, generated types, static types

## Libraries, languages, versions

Identify installed versions before judging behavior. Use version-matched official docs/source/release notes. Check lifecycle, concurrency, cleanup, deprecations, custom replacements, project contracts.

High-risk:

- **Error-as-value clients:** throw vs result from installed types/source; discarded awaits may swallow failure
- **Handwritten third-party interfaces/casts:** compare required fields/returns to installed types
- **Dependency-owned routes:** method/URL vs installed routes/real handler

## Security and data safety

- Authn/authz/object access; client-input trust
- Injection: SQL/NoSQL, command, template, path, header, log, XSS, redirect
- CSRF-relevant changes; unsafe HTML/Markdown; secrets/PII/tokens in code, logs, errors, URLs, artifacts, config
- Crypto, randomness, deserialization, defaults, permissions, CORS, FS, SSRF, deps, deploy
- Invariants in tests, failure paths, recovery

## Performance and scale

- N+1 / repeated I/O; unjustified batch/cache; avoidable render/compute/alloc
- Missing pagination, streaming, limits, timeouts, cancellation, safe retries, backpressure
- Algorithms mismatched to expected inputs; optimization complexity without evidence
- Index advice: prefer `EXPLAIN QUERY PLAN` (or equivalent) when practical; don’t guess columns

## Tests and validation

Judge protected behavior, not counts. Cover user-visible behavior, acceptance, transitions, failures, boundaries, regressions, invariants, concurrency, isolation, cleanup, integrations, security/data, repo gates.

Flag implementation-detail asserts, excessive mocks, duplicated coverage, fragile fixtures, skipped/gated tests, overstated names. Before deleting a test: unique protection for wiring, env compat, parser failures, upgrade canaries, persisted mappings, authz, isolation?

Focused:

- **Forms/browser:** real controls, hidden values, cookies, browser state
- **Hybrid:** static + runtime; transpile-only proves neither exact types nor compile
- **Discovered defects:** add focused regression when it protects behavior without coupling to impl

## APIs, compatibility, data, operations

- Public contracts, versioning, backward compat, stale clients
- Hidden errors, lost context, unsafe retries, poor operator visibility
- Useful (not noisy) logs/metrics/traces
- Migration integrity, idempotency, rollback, reconciliation, recovery
- Env/config/packaging/deploy/CI/dependency drift
- Side effects (send/create/pay): no retry unless non-execution known or idempotency/reconciliation exists; unknown outcome until reconciled

## Packages, CLIs, configuration, CI

Dry-run package artifact; install in clean temp consumer when practical. Check includes, exports, types, bins, executable bits, generated output, deps, licenses, defaults, secrets, CI/publish gates, help, errors, exit codes, paths, cleanup.

## Runtime, UI, accessibility, UX

Exercise representative rendered states when practical: layout, clipping, responsive, loading/error/empty, focus, auth, forms, downloads, motion/final frames. Check keyboard, focus, semantics, contrast, SR impact, touch, reduced motion, understandable feedback. Prefer real controls over synthetic bypasses.
