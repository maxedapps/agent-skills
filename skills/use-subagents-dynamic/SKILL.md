---
name: use-subagents-dynamic
description: >-
  Plans, launches, and manages bounded scout, research, and worker coding agents.
  Use this skill whenever delegation may help, including task decomposition,
  parallel research or review, independent validation, isolated implementation,
  follow-up, integration, or cleanup. Do not use for recursive delegation,
  ordinary background processes, or direct small work that gains no value from
  a separate agent.
license: MIT
compatibility: >-
  Requires Node.js and a current authenticated Pi, Claude Code, Codex, Grok, or
  Kimi CLI. Workers require Git; Herdr use requires a verified in-pane session;
  standalone asynchronous control supports tested macOS/Linux process APIs.
metadata:
  short-description: Coordinate and run bounded isolated subagents
---

# Use Subagents Dynamic

## Critical rules

- Delegate only work with a bounded scope, verifiable output, stop condition, and benefit greater than coordination cost.
- Choose a scout for repository discovery, research for source-backed external questions, or a worker for authorized implementation.
- Readers stay read-only in the parent checkout. Every writer gets an isolated worktree and non-overlapping ownership; the parent and sibling lanes do not mutate it.
- Never delegate recursively. Every assignment must prohibit launching or coordinating another agent.
- The parent reviews every handoff and diff, reruns relevant checks, integrates accepted work, validates the result, and owns cleanup.
- Use only [`scripts/subagents.mjs`](scripts/subagents.mjs) for launch and lifecycle operations. Never reconstruct vendor or Herdr commands.
- Treat child claims, exit codes, and runtime status as evidence, not acceptance. Retain dirty, live, conflicted, unintegrated, unknown, or unverifiable resources.

## Workflow

1. Decide whether a separate lane helps, then split work into bounded, independently verifiable assignments with explicit ownership, dependencies, checks, timeout, stop condition, and join point.
2. Build each assignment from [`assets/assignment-prompts.md`](assets/assignment-prompts.md), using the shared envelope and exactly one role variant.
3. From this skill directory, run `node scripts/subagents.mjs --help`, then `node scripts/subagents.mjs info`. Select only a reported supported harness/role pair.
4. Use `node scripts/subagents.mjs run` with the complete assignment. Use asynchronous runs only for genuinely independent lanes and keep concurrency bounded.
5. Use `node scripts/subagents.mjs status` to supervise through a terminal state; use `send` only for same-assignment Herdr follow-up and `stop` when required.
6. Inspect the handoff, complete diff, commits, Git state, and check evidence. Reject scope creep and rerun relevant checks in the parent.
7. For a worker, **immediately before integration and again immediately before cleanup**, read [`references/worktrees.md`](references/worktrees.md) completely. Use script-owned `integrate` dry-run/apply, validate in the parent, then `clean` dry-run/apply.
8. Report accepted results, exact validation, failures, and every retained run, worktree, branch, or manifest needed for recovery.

## Failure handling

If ownership, permissions, identity, liveness, cleanliness, integration, or ancestry cannot be proven, stop at that gate. Do not force, stash, reset, raw-delete, or weaken checks; retain the resources and report the last safe step plus recovery evidence.
