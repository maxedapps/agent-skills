---
name: use-pi-subagents
description: >-
  Plans, launches, and manages bounded scout, research, and worker coding agents
  through the Pi RPC script adapter. Use this skill when native `subagent_*`
  tools are inactive and delegation is needed for task decomposition, research
  or review, independent validation, isolated implementation, follow-up, status,
  stop, or state cleanup. Do not use for recursive delegation, ordinary
  background processes, automatic Git/worktree management, or when an active
  native subagent runtime should own the lane instead.
license: MIT
compatibility: >-
  Requires Node.js 22.19+ and Pi 0.81.1+ on tested macOS/Linux. Asynchronous
  supervision uses Unix process groups and a private Unix-domain control socket.
  Do not co-activate with a competing native subagent runtime adapter. Children
  never run Git; the parent owns every workspace and Git operation.
metadata:
  short-description: Coordinate bounded Pi RPC subagents
---

# Use Subagents Dynamic

Script-backed Pi RPC runtime adapter. Use only when native `subagent_*` tools are inactive. Never co-activate competing runtime adapters.

## Critical rules

- **Delegation-first:** when this adapter is the active safe path, delegate every bounded non-trivial research, implementation, test-authoring, accepted remediation, or review unit. Parallelism is scheduling only; dependent or coupled work uses one blocking/awaited run, not parent implementation.
- Parent-only work is framing/decomposition/synthesis, tracker/plan ownership, workspace isolation, Git status/diff/commit/review/integration/cleanup, dispositions, focused acceptance validation, cleanup/user communication, genuinely atomic mechanics with no research or behavior change, explicit user prohibition, or unavailable/unsafe capability. Required non-trivial work without a safe capability escalates or blocks—do not silently implement it in the parent.
- Choose a scout for repository discovery, research for source-backed external questions, or a worker for authorized implementation.
- Readers stay read-only in the supplied cwd. Writers require a parent-prepared isolated cwd with non-overlapping ownership; the parent and sibling lanes do not mutate an active writer cwd.
- Never delegate recursively. Every assignment must prohibit launching or coordinating another agent.
- The parent supplies the exact child `--cwd`, reviews every handoff and diff, reruns relevant checks, integrates accepted work with normal parent Git controls, validates the result, and owns cleanup of both runtime state and any workspace it created.
- Use only [`scripts/subagents.mjs`](scripts/subagents.mjs) for launch and lifecycle operations. Never reconstruct raw `pi --mode rpc` supervision.
- Treat child claims, exit codes, and runtime status as evidence, not acceptance. Retain dirty, live, conflicted, unintegrated, unknown, or unverifiable resources.
- Children never run Git commands or create/manage worktrees/branches, including through worker `bash`. The runtime records the canonical parent-supplied cwd and never invokes Git.

## Workflow

1. Apply the delegation-first rule. Split work into bounded, independently verifiable assignments with explicit ownership, dependencies, checks, timeout, stop condition, and join point. Independent lanes may run in parallel; dependent/coupled work is one blocking or awaited run before join.
2. Prepare each child's working directory yourself. Overlapping writers need isolated parent-created workspaces; stop a child before mutating or integrating its cwd.
3. Build each assignment from [`assets/assignment-prompts.md`](assets/assignment-prompts.md), using the shared envelope and exactly one role variant. Role system prompts are loaded from [`assets/agents/`](assets/agents/) (Herdr-aligned scout/research/worker profiles) via `--system-prompt`.
4. From this skill directory, run `node scripts/subagents.mjs --help`, then `node scripts/subagents.mjs info`. Require a successful Pi version gate and RPC handshake.
5. Use `node scripts/subagents.mjs run` with `--role`, one assignment source, exact `--cwd`, and `--timeout`. Runs are blocking by default; use `--async` only for genuinely independent lanes and keep concurrency bounded.
6. Use `status` to supervise; use `send` for same-assignment follow-up (idle `prompt`, or active `--behavior steer|follow-up`); use `stop` when required. Read [`references/rpc-lifecycle.md`](references/rpc-lifecycle.md) for states, generations, timeouts, stop, and recovery.
7. Inspect the handoff, complete diff in the supplied cwd, and check evidence. Reject scope creep and rerun relevant checks in the parent. Perform all Git operations yourself.
8. After the child is safely stopped or terminal and no longer live, use `clean` dry-run then apply to retire only script-owned run state. Runtime `clean` never reads or changes the supplied cwd.
9. Report accepted results, exact validation, failures, retained runs, and any parent-owned workspaces still needed for recovery.

## Failure handling

If ownership, permissions, identity, liveness, or cwd provenance cannot be proven, stop at that gate. Do not force, stash, reset, raw-delete, or weaken checks; retain the resources and report the last safe step plus recovery evidence.
