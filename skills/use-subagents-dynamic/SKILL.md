---
name: use-subagents-dynamic
description: >-
  Plans, launches, and manages bounded scout, research, and worker coding agents
  through the script adapter. Use when native `subagent_*` tools are inactive and
  delegation is needed for task decomposition, research or review, independent
  validation, isolated implementation, follow-up, integration, or cleanup. Do
  not use for recursive delegation, ordinary background processes, or when an
  active native subagent runtime should own the lane instead.
license: MIT
compatibility: >-
  Requires Node.js and a current authenticated Pi, Claude Code, Codex, Grok, or
  Kimi CLI. Workers require Git; Herdr use requires a verified in-pane session;
  standalone asynchronous control supports tested macOS/Linux process APIs.
  Do not co-activate with a competing native subagent runtime adapter.
metadata:
  short-description: Coordinate and run bounded isolated subagents
---

# Use Subagents Dynamic

Script-backed runtime adapter. Use only when native `subagent_*` tools are inactive. Never co-activate competing runtime adapters.

## Critical rules

- **Delegation-first:** when this adapter is the active safe path, delegate every bounded non-trivial research, implementation, test-authoring, accepted remediation, or review unit. Parallelism is scheduling only; dependent or coupled work uses one blocking/awaited run, not parent implementation.
- Parent-only work is framing/decomposition/synthesis, tracker/plan ownership, integration/conflict resolution, dispositions, focused acceptance validation, cleanup/user communication, genuinely atomic mechanics with no research or behavior change, explicit user prohibition, or unavailable/unsafe capability. Required non-trivial work without a safe capability escalates or blocks—do not silently implement it in the parent.
- Choose a scout for repository discovery, research for source-backed external questions, or a worker for authorized implementation.
- Readers stay read-only in the parent checkout. Every writer gets an isolated worktree and non-overlapping ownership; the parent and sibling lanes do not mutate it.
- Never delegate recursively. Every assignment must prohibit launching or coordinating another agent.
- The parent reviews every handoff and diff, reruns relevant checks, integrates accepted work, validates the result, and owns cleanup.
- Use only [`scripts/subagents.mjs`](scripts/subagents.mjs) for launch and lifecycle operations. Never reconstruct vendor or Herdr commands.
- Treat child claims, exit codes, and runtime status as evidence, not acceptance. Retain dirty, live, conflicted, unintegrated, unknown, or unverifiable resources.

## Workflow

1. Apply the delegation-first rule. Split work into bounded, independently verifiable assignments with explicit ownership, dependencies, checks, timeout, stop condition, and join point. Independent lanes may run in parallel; dependent/coupled work is one blocking or awaited run before join.
2. Build each assignment from [`assets/assignment-prompts.md`](assets/assignment-prompts.md), using the shared envelope and exactly one role variant.
3. From this skill directory, run `node scripts/subagents.mjs --help`, then `node scripts/subagents.mjs info`. Select only a reported supported harness/role pair.
4. Use `node scripts/subagents.mjs run` with the complete assignment. Runs are blocking by default; use asynchronous runs only for genuinely independent lanes and keep concurrency bounded.
5. Use `node scripts/subagents.mjs status` to supervise through a terminal state; use `send` only for same-assignment Herdr follow-up and `stop` when required.
6. Inspect the handoff, complete diff, commits, Git state, and check evidence. Reject scope creep and rerun relevant checks in the parent.
7. For a worker, **immediately before integration and again immediately before cleanup**, read [`references/worktrees.md`](references/worktrees.md) completely. Use script-owned `integrate` dry-run/apply, validate in the parent, then `clean` dry-run/apply.
8. Report accepted results, exact validation, failures, and every retained run, worktree, branch, or manifest needed for recovery.

## Failure handling

If ownership, permissions, identity, liveness, cleanliness, integration, or ancestry cannot be proven, stop at that gate. Do not force, stash, reset, raw-delete, or weaken checks; retain the resources and report the last safe step plus recovery evidence.
