# Specialized Plan Checks

Read only when the task matches one or more sections below. Apply the checks during detailed planning, record full evidence in `.progress`, and put or reference only implementation-relevant conclusions in the final plan.

## Review findings, audits, and scoped follow-ups

- Map every material finding to a plan phase, accepted assumption, or explicitly approved deferment. A compact linked inventory is acceptable when the mapping is too large for the plan.
- When planning only a subset of findings, define scoped completion separately from the parent plan/tracker. Keep the parent partial while excluded findings still block its broader completion criteria, and name the residual blockers.

## Defect proofs and regressions

- Specify permanent regression assertions in their final expected form and run them against old behavior to prove they fail for the intended reason.
- Do not plan to invert a success assertion between red and green. Label temporary reproduction probes and require their removal before the implementation checkpoint.

## External providers and raw/binary APIs

- If credentials, live IDs, or provisioning are unavailable, pin the documented contract, use fail-closed configuration and fake-provider tests, and isolate real provisioning/verification as an operator task.
- For raw MIME or binary APIs, define transport encoding, decoded-byte limits, byte-preservation guarantees, envelope-versus-content semantics, success/error DTOs, and partial provider outcomes. Do not leave these as a generic `string` or “raw body.”

## Structural cleanup and package reorganization

- Build a canonical file-operation manifest with exact current paths and a retain/rewrite/move/merge/create/delete disposition.
- Name every move/merge destination and every deletion replacement or prerequisite. Include package export, import, test, generated-file, and downstream-consumer updates.
- Keep a large manifest in a durable progress/supporting file when that is more readable; the plan must link it exactly and summarize the required operation sequence.

## Transactions, concurrency, and idempotency

- Define exact operation ordering, guarded zero-row behavior, ambiguous-outcome read-back/idempotency, crash recovery, and external-side-effect boundaries.
- Do not assume a batch makes dependent statements conditional or that a successful zero-row statement rolls back earlier successful statements. Use database-enforced failure, non-dispatchable reservation states, or explicit cleanup/read-back where needed.
- Bind idempotency keys to the complete canonical request. Include secret fields without creating an offline-guessing oracle. Specify concurrent same-key verification, changed-payload behavior, authorization/deletion semantics, and regression tests.

## SQL migrations and schema cutovers

- Verify every composite foreign key against an existing primary/unique parent key. State `ON DELETE` behavior and `UP`/`DOWN` index ordering.
- Require migration tests that execute representative DML and the database's foreign-key integrity check, not only DDL parsing.
- For migration squashes, capture the old chain's final schema metadata before deleting files, compare it with the fresh squashed schema, and permanently assert the complete canonical table/index/foreign-key contract. Include index owner, uniqueness, ordered columns/expressions, collation, direction, partial predicate, and every foreign-key action.
- For phased cutovers, ensure every claimed green/deployable checkpoint satisfies the schema checks installed in that phase, not only the final wave.

## SQLite/WAL validate-only behavior

- Audit both database-open behavior and post-validation cleanup. A read-only constructor does not make later WAL/SHM deletion safe.
- Require a regression whose latest committed state exists only in WAL. Distinguish durable DB/WAL/schema/data invariants from normal SHM lock-byte coordination.
- Reject `immutable` mode when it could ignore live WAL.

## Leased/background work

- Include stale-worker fencing and a durable mechanism that actually triggers replay after reclaim.
- Define claiming, ownership, retries, crash recovery, idempotency, and the boundary before irreversible side effects.

## Process-group cleanup

- Authoritative ownership must survive reparenting and failed shutdown. PID/PGID state alone must not authorize signaling after possible reuse.
- Specify bounded TERM/KILL retries, an authenticated live-supervisor recovery path when cleanup can outlive the parent, idempotence, listener checks, and exactly one deletion owner for each normal/orphan control-artifact path.

## Object-store cleanup

- Define authoritative owner-reference mappings per object/owner kind, shared or deterministic-key behavior, cleanup claiming/fencing, and partial-cleanup recovery.
- Re-read references immediately before deletion. Forbid request-path deletion when another concurrent owner may reference the same key.

## Suite-wide test-quality cleanup

- Establish measurable baseline/final inventories keyed by collected test identity.
- Give every test a retain/rewrite/merge/delete disposition, with replacement/evidence for every deletion and risk-based coverage criteria.
- Do not use ambiguous “file/case” units, blanket-retain categories, raw test counts, or percentage targets as completion evidence.

## Toolchain and bootstrap changes

- Compute the runtime-engine range intersection across selected package versions instead of using only the highest minimum. Preserve unsupported gaps and disjoint ranges.
- Align runtime type packages with the oldest supported runtime.
- Prevent multiple test runners from collecting each other's suite roots.

## Release evidence and generated reports

- Define canonical report filenames and validator inputs. Preserve or upload source reports, recompute recorded hashes, and make evidence auditable.
- State the ordering explicitly: copy → validate → manifest → upload.
