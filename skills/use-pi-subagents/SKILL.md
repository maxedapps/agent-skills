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

**Pi RPC launcher only.** Policy lives in `use-subagents` — load/follow that skill for:

- delegate-by-default
- parent vs child ownership
- assignment contract
- worktrees / Git / mandatory cleanup
- verify and reporting

This skill adds **how to start and supervise children on Pi** via `scripts/subagents.mjs`.

Use when:

- you are on Pi
- native `subagent_*` tools are **not** active
- a safe launcher is needed

Do **not** co-activate with native `subagent_*` or another launcher for the same workflow.

## Pi mechanics

- Only [`scripts/subagents.mjs`](scripts/subagents.mjs) — never raw `pi --mode rpc`
- Roles: **scout** (repo map) · **research** (external) · **worker** (implement)
- Parent supplies exact `--cwd`
- Readers: read-only in that cwd
- Concurrent writers: parent-created isolated worktrees + non-overlapping ownership (per `use-subagents`)
- Children never Git or manage worktrees/branches (including via bash)
- No recursive delegation — assignments must forbid spawning agents
- Child claims/exit/status = evidence, not acceptance

## Workflow

1. Apply `use-subagents` (split, ownership, isolation plan, join points).
2. Prepare each cwd/worktree yourself.
3. Build assignment from [`assets/assignment-prompts.md`](assets/assignment-prompts.md) + one role in [`assets/agents/`](assets/agents/) (envelope already matches the portable handoff contract).
4. From this skill directory:
   - `node scripts/subagents.mjs --help`
   - `node scripts/subagents.mjs info` (Pi version + RPC gate)
5. Launch:
   - `run --role … --cwd … --timeout …`
   - blocking default
   - `--async` only for independent lanes
6. Supervise: `status` · `send` (same-assignment follow-up) · `stop`  
   States/recovery: [`references/rpc-lifecycle.md`](references/rpc-lifecycle.md)
7. Parent verify: handoff + full diff + rerun checks + parent Git (`use-subagents` integrate rules).
8. **Cleanup (both layers):**
   - stop child if live
   - `clean` dry-run then apply → **script run state only** (`clean` never touches cwd)
   - remove safe parent-created worktrees/branches per `use-subagents`
   - retain dirty/unknown/owner work; report why
9. Report results, validation, worktree lifecycle, retentions (same shape as `use-subagents`).

## Failure

Unproven ownership, permissions, identity, liveness, or cwd provenance → stop.  
No force/stash/reset/raw-delete/weakened checks. Retain resources; report last safe step.
