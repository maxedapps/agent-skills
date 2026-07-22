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
  non-interactive agent CLI). No dependency on a Pi-specific adapter.
metadata:
  short-description: Portable subagent delegation, isolation, and cleanup
---

# Use Subagents

Harness-agnostic **how to delegate**: policy, assignment shape, isolation, verify, cleanup.

- Callers (`create-plan`, `implement-plan`, `code-review`, …) decide **when**.
- This skill defines **how**, using **whatever subagent mechanism the host provides**.
- Host-specific launcher skills (if any) only supply launch/status/stop commands — they do **not** replace this policy.
- This skill does **not** require Pi or any other single runtime.

## Pick a launcher (exactly one)

Use the first safe option the **current harness** actually has:

1. **Built-in / native subagent tools** (and their host docs/skill, if any)
2. **Host extension or plugin** that spawns bounded agents
3. **Catalog/runtime adapter skill** for this harness, if installed and appropriate
4. **Non-interactive agent CLI** only if all are proven: auth, cwd, permissions, start/completion, output capture, timeout, cancel
5. Else: keep optional work in parent; **required** work → block/escalate — never weaken safety or silently parent-implement

Rules:

- Never drive two launchers at once for the same workflow.
- Before launch/status/stop/cleanup, follow the chosen launcher’s mechanics.
- Policy below always applies, regardless of launcher.

## Delegate by default

When a safe launcher exists, **delegate**. Not only “hard” work. “Small/easy” is not a reason to keep it in parent.

**Parent keeps** (strong reason only):

- framing / decomposition / synthesis
- plan/tracker ownership
- integrate, dispositions, acceptance reruns
- user comms
- worktree + runtime cleanup
- truly atomic single-step mechanics with no judgment
- explicit user prohibition
- no safe launcher (required work → block)

If you skip delegation, record the strong reason.

## Worktrees + Git + cleanup

**Parent owns** isolation and Git. Children never create/manage worktrees/branches or run Git — unless the host’s subagent API explicitly owns isolation and the parent still verifies outcomes.

### Isolate

- **Readers:** read-only; shared checkout OK
- **Writers:** sequential in one checkout, **or** concurrent only in **parent-created** isolated worktrees/workspaces with non-overlapping ownership
- Do not mutate an active writer cwd from parent/siblings
- Record: path, branch (if any), owned files/domain, deps, join point
- Cap fan-out by parent integrate/verify/cleanup capacity

### Integrate

1. Stop or await the child to a terminal state
2. Inspect handoff + full diff + checks (child claims = evidence, not proof)
3. Parent Git integrate only if verified

### Cleanup (mandatory)

After each lane and at workflow end / interrupt recovery:

1. Stop live children
2. Integrate, retain, or abandon **workflow-owned** work only
3. Remove safe fully-handled parent worktrees/branches/workspaces
4. Clean launcher/runtime/process state via the chosen mechanism
5. Never delete dirty/conflicted/unintegrated/unknown/owner-owned work
6. Report every retention + why

**No orphan worktrees, branches, or agent processes.**

## Assignment contract

Each child gets one bounded job:

- **Role + objective** — one job, concrete outcome
- **Context** — cwd/project path, files, facts, open questions
- **Scope** — owned areas, requirements, non-goals
- **Permissions** — least privilege; forbid secrets/prod/destructive acts unless explicit; forbid child edits to parent plans/trackers
- **Validation** — required checks; report exact results + skips
- **Stop** — completion condition, timeout; **no recursive delegation**
- **Handoff** — files read/changed · decisions · checks+results · skips · risks · blockers · remaining · evidence pointers (not transcripts)

Send only task-relevant context. Never send secrets, tokens, `.env`, or private transcripts.

## Supervise

- Fresh child for new or independent judgment; reuse only for same-assignment follow-up
- Bounded timeout; confirm work started; monitor to terminal state
- Never fire-and-forget
- Repeated identical failure → change approach, don’t blind-retry
- Independent lanes may run in parallel; dependent/coupled work → one awaited child, then join

## Report

- roles used
- material results/changes
- parent verification
- unresolved/failed work
- worktrees/branches created, integrated, removed
- retained resources + why
- launcher run IDs only if needed for continuation
