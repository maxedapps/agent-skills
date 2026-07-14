# Code Review Dimensions

Use this reference for comprehensive or dimension-specific reviews. Stay adversarial but evidence-bound: look hard for real issues, then report only findings with concrete impact.

## Correctness / bugs

- Broken edge cases, wrong assumptions, off-by-one or lifecycle bugs
- Null/undefined/error handling gaps
- Race conditions, stale state, async ordering bugs, missing cleanup
- Inconsistent validation, parsing, serialization, or normalization
- Incorrect API contracts, return shapes, status codes, or error semantics
- Behavior that differs from tests, docs, names, or user expectations

## Code quality / simplicity

Prefer simple direct code and obvious data flow. Flag complexity that creates real maintenance or correctness risk.

- Naming that hides intent or creates misleading boundaries
- Unnecessary abstractions, layers, factories, managers, wrappers, hooks, services, or adapters
- One-line helpers used once or only renaming a call
- Tiny files/classes/functions that add navigation overhead without a real boundary
- Generic helpers/types/options for hypothetical future needs
- Boolean flags, broad APIs, modes, or extension points that complicate call sites
- Duplicate logic, duplicate derived state, or multiple sources of truth
- Overly clever code, dense type-level tricks, or indirection that hides responsibility
- Comments explaining confusing code that should be simplified instead

Good abstractions remove real duplication, encode a stable domain concept, protect a boundary, centralize a policy, or make call sites substantially clearer.

## Typing / type safety

- `any`, unsafe `unknown` handling, over-broad object/string types, or lost generics
- Type casts/non-null assertions that silence real uncertainty
- Missing runtime validation at trust boundaries
- Public APIs whose types misrepresent nullability, errors, async behavior, or mutability
- Duplicated or drifting schema/runtime/static types

## Library / language best practices

- Usage inconsistent with the installed version's official docs, source, examples, or migration notes
- Ignored framework lifecycle rules, concurrency constraints, cleanup, or recommended boundaries
- Custom code replacing standard library/framework features without clear benefit
- Deprecated APIs, stale patterns, or version-mismatched examples
- Relevant project-specific skill guidance ignored
- Error-as-value SDK clients (e.g. better-auth/@better-fetch, Supabase) whose calls resolve with `{ data, error }` instead of throwing: any `await client.op()` with a discarded result silently swallows failures — verify throw-vs-return semantics in the installed package
- Hand-written interface + `as unknown as` cast over a third-party client: treat as a hotspot — check required request fields and return shapes against the installed package's typings, not the hand-rolled type, especially in flows never exercised end-to-end (e.g. gated on unavailable credentials)
- Hardcoded URLs/paths targeting routes owned by a dependency or another service (auth handlers, webhooks, redirects, rendered links/forms): typecheck cannot catch a nonexistent route — verify the exact path + HTTP method exists in the installed package source (grep its dist route definitions) or, cheapest and decisive, dispatch a request against the real handler; tests that only assert the link/URL is rendered prove nothing about its validity

## Security / data safety

- Missing authentication or authorization checks, especially server-side
- Trusting client input; missing server-side validation
- Injection risks: SQL/NoSQL/command/template/path/header/etc.
- XSS, unsafe HTML/Markdown rendering, unsafe redirects, CSRF-relevant flows
- Secrets, tokens, PII, or sensitive internals in code, logs, errors, URLs, or configs
- Weak crypto, insecure randomness, unsafe deserialization, insecure defaults
- Over-broad permissions, CORS, file access, SSRF, dependency/config risks

## Performance / scalability

- N+1 queries, repeated network/file/database calls, missing batching/caching where clearly needed
- Unnecessary re-renders, repeated expensive computation, avoidable allocations
- Missing pagination, streaming, limits, timeouts, cancellation, retries, or backpressure
- Inefficient algorithms/data structures for expected input sizes
- Premature optimization that makes code harder without evidence of benefit

## Tests / validation

- Missing regression tests for risky logic or discovered bugs
- Tests that assert implementation details instead of behavior
- Fragile fixtures, excessive mocks, duplicated setup, unclear test intent
- Missing negative/error/edge-case coverage
- Skipped/gated tests: green commands do not validate tests that never executed
- Hybrid compile-time/runtime guarantees: verify the advertised gate runs both halves. Transpile-only test runners such as Vitest do not typecheck by default, so a runtime suite can stay green while a TypeScript exactness harness fails under `tsc`; run/probe both commands when the guarantee depends on both.
- Build, lint, typecheck, migration, or CI gaps relevant to the change

## API / compatibility / data / ops

- Backwards compatibility breaks, unclear contracts, unsafe stale-client behavior
- Error handling that hides failures, loses context, retries unsafely, or lacks user/operator visibility
- Missing or noisy logs/metrics/traces for important production paths
- Migration/data-integrity risks, non-idempotent migrations, weak rollback/recovery stories
- Dependency, environment, config, packaging, or CI drift

## Accessibility / UX

For UI code, check keyboard navigation, focus management, semantics, contrast, responsive behavior, loading/error/empty states, and screen-reader impact where relevant.
