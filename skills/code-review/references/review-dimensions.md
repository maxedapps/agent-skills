# Review dimensions

Use after the scope, evidence, materiality, and worktree rules in `SKILL.md`. Apply every selected dimension thoroughly. These heuristics generate candidates, not findings; every candidate must pass the core admission gate.

## Evidence traps

- Compare moved, renamed, or extracted code and tests for dropped, duplicated, or drifted behavior.
- Distinguish deterministic behavior, an evidence-backed reachable risk, and an observed incident. Never imply recurrence without operational evidence.
- Make disposable repros assert behavior; logs alone may be suppressed or misleading.

## Correctness

Check for:

- edge cases, wrong assumptions, off-by-one errors, and lifecycle defects;
- null, exception, and error-as-data handling gaps;
- races, stale state, async ordering, cancellation, and cleanup;
- inconsistent validation, parsing, serialization, encoding, or normalization;
- wrong API shapes, statuses, return values, and error semantics;
- behavior that conflicts with tests, docs, names, contracts, or user expectations;
- refactors that lose side effects, ordering, fallbacks, or wiring.

## Simplicity and maintainability

Prefer obvious data flow and the least structure that meets current requirements. Challenge:

- misleading names and unclear ownership;
- unnecessary layers, wrappers, hooks, services, adapters, factories, or frameworks;
- one-use helpers and tiny files that add navigation without a stable boundary;
- speculative options, generic types, extension points, or broad APIs;
- duplicate logic or state, clever type tricks, and comments masking confusing code.

For cleanup, prefer: **delete → direct call/import → local helper → shared abstraction**. Name concrete deletion/consolidation targets and intentional exceptions. Keep abstractions that remove real duplication, encode a stable domain concept, protect a boundary, centralize policy, or clarify call sites.

## Types and trust boundaries

- Unsafe `any`/`unknown`, broad object/string types, lost generics, casts, and non-null assertions.
- Missing runtime validation at user, external, persistence, message, or file boundaries.
- Public types that misstate nullability, errors, async behavior, mutation, or ownership.
- Drift among runtime schemas, generated types, and static types.

## Libraries, languages, and versions

Identify installed framework, dependency, SDK, language, database, and runtime versions before judging behavior. Use version-matched official docs, source, release notes, standards, or first-party examples. Check lifecycle, concurrency, cleanup, deprecations, custom replacements, and project contracts.

High-risk integrations:

- **Error-as-value clients:** determine from installed types/source whether calls throw or return data plus error; discarded awaited results may swallow failure.
- **Handwritten third-party interfaces/casts:** compare required fields and return shapes with installed types, especially in credential-gated paths.
- **Dependency-owned routes:** verify method and URL against installed routes or the real handler; URL rendering alone proves nothing.

## Security and data safety

- Server-side authentication, authorization, object access, and client-input trust.
- SQL/NoSQL, command, template, path, header, log, XSS, redirect, and related injection.
- CSRF-relevant changes; unsafe HTML/Markdown; secrets, tokens, PII, or internals in code, logs, errors, URLs, artifacts, or config.
- Cryptography, randomness, deserialization, defaults, permissions, CORS, filesystem access, SSRF, dependencies, and deployment.
- Security/data invariants in tests, failure paths, and recovery.

## Performance and scale

- N+1 or repeated I/O; unjustified batching/caching; avoidable renders, computation, or allocation.
- Missing pagination, streaming, limits, timeouts, cancellation, safe retries, or backpressure.
- Algorithms mismatched to expected inputs; optimization complexity without evidence.

Before prescribing an index, inspect the actual query with `EXPLAIN QUERY PLAN` or its datastore equivalent when practical. Report unavailable evidence. Verify each predicate and ordering shape; do not guess a column list or assume one index serves all queries.

## Tests and validation

Judge protected behavior, not counts. Cover user-visible behavior, acceptance criteria, state transitions, failures, boundaries, regressions, invariants, concurrency, isolation, cleanup, integrations, security/data, and repository gates.

Flag implementation-detail assertions, excessive mocking, duplicated coverage, fragile fixtures, skipped/filtered/gated tests, and tests whose names overstate executed behavior. Before deleting a test, check whether it uniquely protects wiring, environment compatibility, parser failures, upgrade canaries, persisted mappings, authorization, or isolation.

Focused checks:

- **Forms/browser flows:** submit rendered controls with actual hidden values, cookies, and browser state; synthetic requests can bypass broken wiring.
- **Hybrid guarantees:** run static checks and runtime tests; transpile-only execution proves neither exact typing nor compilation.
- **Discovered defects:** add a focused regression assertion when it protects behavior without coupling to implementation.

## APIs, compatibility, data, and operations

- Public contracts, versioning, backward compatibility, and stale clients.
- Hidden errors, lost context, unsafe retries, and poor user/operator visibility.
- Useful—not noisy—logs, metrics, and traces for important paths.
- Migration integrity, idempotency, rollback, reconciliation, and recovery.
- Environment, configuration, packaging, deployment, CI, and dependency drift.

For send/create/payment side effects, do not recommend retries unless non-execution is known or reconciliation/idempotency exists. If acceptance may have occurred, represent the outcome as unknown until reconciled. Trace classified outcomes through persistence failure, queue retry, and stale recovery; known accepted/rejected results must not be re-executed or downgraded because a terminal write failed.

## Packages, CLIs, configuration, and CI

For published packages or CLIs, inspect a dry-run package artifact and, when practical, install it in a clean temporary consumer. Check included files, exports, types, binaries, executable bits, generated output, dependencies, licenses, config defaults, secret handling, CI/publish gates, help, errors, exit codes, path handling, and cleanup.

If review notes could enter the artifact, use a clean archive/copy or distinguish artifact contamination from owner content.

## Runtime, UI, accessibility, and UX

When practical, exercise representative rendered states and interactions: layout, clipping, responsiveness, loading/error/empty states, focus, auth, forms, downloads, animation, motion, and final frames. Static analysis cannot establish runtime behavior.

Check keyboard navigation, focus management, semantics, contrast, screen-reader impact, touch/pointer behavior, reduced motion, and understandable feedback. Use real controls and browser-managed state rather than synthetic equivalents.
