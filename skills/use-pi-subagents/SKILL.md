---
name: use-pi-subagents
description: >-
  Pi-specific launcher for bounded scout, research, and worker agents via the
  Pi RPC script adapter. Use this skill when on Pi, native `subagent_*` tools
  are inactive, and you need to launch, follow up, status, stop, or clean RPC
  children. Apply together with `use-subagents` policy (delegation, isolation,
  verify, cleanup). Do not use when a native subagent runtime should own the
  lane, for recursive delegation, ordinary background processes, or automatic
  Git/worktree management.
license: MIT
compatibility: >-
  Requires Node.js 22.19+ and Pi 0.81.1+ on tested macOS/Linux. Asynchronous
  supervision uses Unix process groups and a private Unix-domain control socket.
  Do not co-activate with a competing native subagent runtime. Children never
  run Git; the parent owns every workspace and Git operation. Complements
  `use-subagents`; does not replace it.
metadata:
  short-description: Pi RPC launcher for subagents (with use-subagents policy)
---

# Use Pi Subagents

**Pi RPC launcher only.** Load/follow `use-subagents` for delegation, split, assignment shape, worktrees/Git, verify, workspace cleanup, and reporting.

This skill is **how to start and supervise Pi RPC children** via [`scripts/subagents.mjs`](scripts/subagents.mjs).

## Pi rules

- Only `node scripts/subagents.mjs …` from this skill directory — never raw `pi --mode rpc`
- Roles: **scout** · **research** · **worker** (Pi profiles in [`assets/agents/`](assets/agents/); portable behavior also in `use-subagents`)
- Parent supplies exact `--cwd` (prepare worktrees per `use-subagents` first)
- Pi children: **no Git at all** (including bash); no worktree/branch management; no recursive delegation
- Child claims/exit/status = evidence, not acceptance
- `clean` retires **script run state only** — never cwd/worktrees/Git

## Workflow

1. Apply `use-subagents` (split, ownership, isolation, join points); prepare each `--cwd`.
2. Build the task prompt; script wraps it with [`assets/assignment-prompts.md`](assets/assignment-prompts.md) + role profile from [`assets/agents/`](assets/agents/).
3. Preflight from this skill directory:
   - `node scripts/subagents.mjs --help`
   - `node scripts/subagents.mjs info`
4. Launch: `node scripts/subagents.mjs run --role <scout|research|worker> (--assignment FILE|--prompt TEXT) --cwd PATH --timeout MS [--async]`
   - blocking default; `--async` only for independent lanes
5. Supervise: `node scripts/subagents.mjs status|send|stop …`  
   States/generations/recovery: [`references/rpc-lifecycle.md`](references/rpc-lifecycle.md)
6. Verify + integrate + remove safe worktrees/branches per `use-subagents`.
7. Runtime cleanup (after review): `node scripts/subagents.mjs clean --run ID` then `--apply` when safe.
8. Report per `use-subagents` (include `runId` only if needed).

## Failure

Unproven ownership, permissions, identity, liveness, or cwd provenance → stop.  
Retain ambiguous runtime/state; report `runId`, last state, cwd, next safe inspection step. No force-kill of unverified PIDs.
