---
name: use-subagents-v2
description: >-
  Executes bounded subagent assignments through isolated Git worktrees and a
  verified parent-owned integration lifecycle. Use this skill when launching,
  supervising, integrating, or cleaning up workers through interactive Herdr or
  a supported standalone one-shot agent CLI. Do not use when deciding whether
  or how to delegate, for recursive delegation, or for ordinary background
  processes.
license: MIT
compatibility: >-
  Requires Git worktrees plus either an inspected interactive Herdr installation
  or a standalone agent CLI with a proven one-shot headless and permission-safe
  invocation.
metadata:
  short-description: Run isolated subagents and integrate verified work
---

# Use Subagents V2

This is a runtime adapter. Use `use-subagents` first for delegation strategy, decomposition, dependencies, and assignment design. The parent remains responsible for review, validation, integration, acceptance, and cleanup.

## Critical rules

- Never delegate recursively. Every assignment must prohibit the child from launching another agent.
- Give every worker its own branch and isolated worktree. Never let a child write in the parent checkout or another active lane.
- **Before every worker launch, read [`references/worktrees.md`](references/worktrees.md) completely. Read it again immediately before integration or cleanup.** Do not rely on an earlier read.
- Read [`references/runtime-contracts.md`](references/runtime-contracts.md) before selecting or invoking a runtime. Probe current help and fail closed when required capabilities cannot be proven.
- Never force, stash, reset, clean, raw-delete, or use `git branch -D`. Never remove dirty, live, conflicted, moved, unintegrated, unknown, or unverifiable resources.
- Treat runtime status as advisory. Parent inspection and repository evidence determine whether work can advance.

## Workflow

1. Use `use-subagents` to decide and split the work. Record bounded ownership, permissions, dependencies, checks, timeout, stop condition, and handoff requirements.
2. Build the assignment with [`assets/assignment-prompts.md`](assets/assignment-prompts.md). Include only task-relevant context and require a self-contained handoff.
3. **Before launching the worker, reread [`references/worktrees.md`](references/worktrees.md) completely.** Create and record an isolated worktree, exact generated branch, base commit, runtime target, and ownership manifest.
4. Read [`references/runtime-contracts.md`](references/runtime-contracts.md), probe the installed runtime, and launch only a supported mode:
   - Herdr: a normal interactive executable, no headless flag and no task argument; wait for idle, then submit the complete assignment atomically.
   - Standalone: one headless, non-interactive invocation containing the complete assignment. Follow-up is unsupported.
5. Bound and supervise the run. Inspect output before waits, use timeouts, investigate blocked/unknown/failed states, and stop safely when needed. Do not treat an idle or successful status as proof.
6. Inspect the handoff, complete Git status, diff, log, worker HEAD, and worker check output. Require clean, task-only commits before integration.
7. **Immediately before integration or cleanup, reread [`references/worktrees.md`](references/worktrees.md) completely.** Follow its parent-owned order exactly: integration dry-run, explicit integration, parent validation, ancestry proof, cleanup dry-run, non-force cleanup, then deletion of the exact generated branch with `git branch -d`.
8. Accept only after the parent has reviewed the diff, rerun relevant checks, and proved the worker HEAD is an ancestor of the validated parent HEAD. Report retained resources and recovery evidence.

## Failure handling

If any state is dirty, uncommitted, conflicted, moved, unintegrated, live, unknown, or unverifiable, stop the lifecycle. Retain the pane/process, worktree, branch, and manifest; report identifiers, observed evidence, safe recovery steps, and the blocked phase. Never weaken a safety check to finish cleanup.
