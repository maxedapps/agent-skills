---
name: use-subagents
description: >-
  Portable playbook for bounded subagent delegation on any coding-agent harness.
  Use this skill whenever considering delegation, decomposition, parallel
  research, review or implementation, independent validation, or an explicit
  request to spawn or manage subagents. Works with the host's built-in subagent
  tools, extensions/plugins, or a safe agent CLI. Do not use for ordinary
  background shell, server, or process work.
license: MIT
compatibility: >-
  Instruction-only policy. Launching requires whatever subagent capability the
  current harness provides (native tools, extension/plugin, or a controlled
  non-interactive agent CLI).
metadata:
  short-description: Portable subagent delegation, isolation, and cleanup
---

# Use Subagents

Harness-agnostic **how to delegate**: split work, assign, isolate, verify, clean up.

- Owning workflows decide task goals; this skill defines **how** to delegate.
- Use whatever safe subagent mechanism the host provides.
- Host launcher/adapters own capability checks, launch, continuation, status, stop, and runtime-state cleanup — not this policy.
- Apply this policy with every launcher.

## Delegate + split

When a safe launcher exists, **delegate**. “Small/easy” is not a reason to keep work in parent.

**Parent keeps** (strong reason only): framing/decomposition/synthesis · plan/tracker ownership · integrate/dispositions/acceptance · user comms · workspace + runtime cleanup · atomic no-judgment steps · explicit user prohibition

If you skip delegation, record why.

**Split before launch:**

- One independently verifiable outcome per lane
- Classify: reader · writer · independent validator
- Record scope, deps, expected output, join point
- Parallelize only independent lanes; coupled work → one awaited lane
- Cap fan-out by parent integrate/verify/cleanup capacity
- Prefer roles in [`assets/agents/`](assets/agents/): **scout** · **research** · **worker** (adapt names to the launcher if needed)

## Pick a launcher

Choose **one accountable launcher per lane**. Prefer one launcher for the whole workflow.

A launcher is safe only if it provides: exact cwd/context · permissions/write boundary · observable start/completion · output capture · timeout/bound · cancel when async · known cleanup ownership.

Candidates (first safe fit):

1. Built-in / native subagent tools
2. Host extension or plugin
3. Catalog/runtime adapter skill for this harness
4. Non-interactive agent CLI with the capabilities above
5. Else: parent may execute; **block only when delegation/independence itself is required**

Never let two launchers control the same lane. Follow the chosen launcher’s mechanics for launch/status/stop/runtime cleanup.

## Assignment contract

Build from [`assets/assignment-template.md`](assets/assignment-template.md) + one profile in [`assets/agents/`](assets/agents/).

Each child gets one bounded job:

- **Role + objective** — one job, concrete outcome
- **Mode** — reader or writer
- **Context** — exact cwd/workspace + baseline, files, facts, open questions
- **Scope** — owned areas, requirements, non-goals, join output
- **Permissions** — least privilege; no secrets/prod/destructive acts unless explicit; no edits to parent plans/trackers
- **VCS** — no child worktree/branch/commit/integrate/cleanup; read-only VCS only if authorized
- **Validation** — required checks; report exact results + skips
- **Stop** — completion condition, timeout; **no recursive delegation**
- **Handoff** — files read/changed · decisions · checks+results · skips · risks · blockers · remaining · evidence pointers (not transcripts)

Send only task-relevant context. Never send secrets, tokens, `.env`, or private transcripts.

## Isolate (parent owns)

Unless the launcher explicitly owns isolation (parent still verifies):

- **Readers:** read-only. Shared checkout only if no concurrent writer can change the view and read-only is enforced; else isolate/snapshot
- **Writers:** sequential in one checkout after prior lane is stopped + dispositioned; concurrent only in isolated worktrees/workspaces with non-overlapping ownership
- Do not mutate an active writer cwd from parent/siblings
- Record before launch: baseline · path · branch (if any) · owner · existing dirty/untracked · deps · join point

**Children never** create/manage worktrees/branches or mutate VCS. Parent owns integrate + workspace cleanup.

## Supervise

- Fresh child for new or independent judgment; reuse only for same-assignment follow-up
- Confirm start; monitor to completed / failed / cancelled / timed out / unknown
- Never fire-and-forget async work
- Repeated identical failure → change approach, don’t blind-retry

## Verify + integrate

1. Reach completed/stopped (or cancel) via the launcher
2. Inspect handoff + full lane diff vs baseline (incl. untracked); child claims = evidence, not proof
3. Rerun relevant checks in parent
4. Integrate only if verified, via the repo’s normal method
5. Keep the lane until join/acceptance checks pass

## Cleanup (mandatory)

After each lane and at workflow end / interrupt recovery:

1. Stop/cancel live children when the launcher allows
2. Integrate, retain, or mark disposable **workflow-owned** work only
3. Remove only safe resources: workflow-created (or launcher-owned), terminal, fully handled, not dirty/conflicted/unknown/user-owned, no pending join
4. Clean launcher runtime/process state **after** review (preserve evidence until then) - **do NOT leave dangling worktrees/branches/processes/sockets!**
5. Retain + report everything unsafe/unknown and why

**No unaccounted workflow-owned resources.**

## Report

- roles / lanes used
- material results/changes
- parent verification
- unresolved/failed work
- worktrees/branches/workspaces created, integrated, removed
- retained resources + why
- launcher IDs only if needed for continuation
