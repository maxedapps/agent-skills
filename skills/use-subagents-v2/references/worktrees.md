# Worker integration and cleanup gates

Read this file completely only immediately before a worker's integration or cleanup. The parent performs every step through `scripts/subagents.mjs`; workers never integrate or remove resources.

## Ordered gates

1. **Reach a terminal state.** Use `status` and, when required, `stop`. A live or ambiguous runtime blocks integration.
2. **Verify ownership.** Match the recorded parent checkout, worker path, generated branch, base, HEAD, runtime identity, and manifest. Never reconstruct identity from names or child claims.
3. **Review the worker.** Inspect the handoff, complete commits and diff, cleanliness, and check evidence. Require task-only committed changes and rerun focused checks when useful.
4. **Verify the parent.** Confirm the recorded integration branch and a clean parent checkout. Parent or sibling changes must not have mutated the active worker lane.
5. **Preflight integration.** Run `integrate` with review and check attestations but without `--apply`. Fast-forward is the default; use merge only with explicit authorization and a successful non-mutating preflight.
6. **Apply integration.** Rerun `integrate` with the same attestations and `--apply`. Never auto-resolve conflicts or bypass provenance, cleanliness, liveness, or ancestry checks.
7. **Validate the parent.** Review the integrated diff and rerun all relevant focused and repository checks. Validation failure blocks cleanup.
8. **Reread this file before cleanup.** Run `clean` with the validation attestation but without `--apply`; require fresh identity, cleanliness, liveness, registration, and ancestry proof.
9. **Apply cleanup.** Rerun `clean` with the same attestation and `--apply`. It must remove the exact owned worktree without force and delete only the recorded generated branch.
10. **Confirm retirement.** Verify the run is cleaned and report validation plus cleanup evidence.

## Retention response

If any gate is dirty, uncommitted, conflicted, moved, unintegrated, live, unknown, or unverifiable, stop and retain the pane/process, worktree, branch, and manifest. Never force, stash, reset, clean, raw-delete, or use `git branch -D`.

Report the run and manifest identities, last safe gate, exact failed operation/result, current status/diff/commits/HEAD, runtime liveness, retained resources, and non-destructive next step. Acceptance and cleanup remain pending.
