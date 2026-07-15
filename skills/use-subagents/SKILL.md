---
name: use-subagents
description: >-
  Split and delegate bounded work to subagents, coordinate their results, and
  decide when delegation is worthwhile. Use whenever considering or performing
  delegation, parallel agent work, fresh-context research, review, or validation,
  or when asked to spawn, use, or manage subagents. Load this skill before
  choosing a backend; loading it does not require launching a subagent. Do not
  use for ordinary background shell commands.
license: MIT
compatibility: >-
  The decision workflow can run without a delegation backend. Launching a
  child requires Herdr, a runtime-native subagent capability, or an
  authenticated non-interactive agent CLI.
metadata:
  short-description: Split and coordinate bounded subagent work
---

# Use Subagents

## Instruction priority and required references

Follow explicit user and higher-priority instructions, including limits on delegation, tools, cost, latency, privacy, and scope. Loading this skill starts a decision; it does not mandate a child. Ask first when unclear delegation would materially change cost, time, risk, or scope.

Use these references only under their stated conditions:

- If `command -v herdr` succeeds, **before Herdr preflight or launch read [`references/herdr.md`](references/herdr.md)** for safe targeting, commands, lifecycle, and cleanup.
- Before using runtime-native delegation or a non-interactive agent CLI, read [`references/native-and-cli-backends.md`](references/native-and-cli-backends.md) for capability, permission, output, and timeout controls.
- **Before any write-enabled, parallel, sensitive, or broad/expensive assignment, read [`references/coordination-and-safety.md`](references/coordination-and-safety.md)** for prompt, isolation, monitoring, and failure rules.

## 1. Decide whether delegation is worthwhile

Delegate only when all are true:

1. The assignment has one bounded role, scope, output, and stopping condition.
2. It materially benefits from fresh context or expertise, independent judgment, context isolation, or meaningful parallelism.
3. That benefit exceeds startup, monitoring, synthesis, verification, and cleanup cost.

Do not delegate when direct checks are cheaper; most parent context must be reconstructed; the work needs frequent tightly coupled iteration; scopes overlap; coordination dominates; or safe permissions and isolation cannot be established. Complexity alone is not a reason to delegate. Keep the decision brief unless an owning tracker requires it.

## 2. Select the backend in order

1. If `herdr` exists, read [`references/herdr.md`](references/herdr.md), run its preflight, and use Herdr when preflight succeeds.
2. If Herdr is absent, prohibited, or fails preflight, inspect the current harness for a runtime-native subagent capability. Before launch, read the native section of [`references/native-and-cli-backends.md`](references/native-and-cli-backends.md).
3. If no native capability is usable, read the CLI section of [`references/native-and-cli-backends.md`](references/native-and-cli-backends.md) and use a suitable installed non-interactive agent CLI.
4. If none is usable, stay in the parent when delegation is optional; report delegation blocked when it is required.

Retain a failed Herdr preflight reason. Do not hardcode a native tool name or describe CLI subprocesses as in-process subagents. Honor an explicitly requested suitable backend; otherwise keep this order.

## 3. Define and launch the assignment

Before writes, parallelism, sensitive context, or broad/expensive work, stop and read [`references/coordination-and-safety.md`](references/coordination-and-safety.md).

Every child prompt must specify role, exact scope and context, permissions and forbidden operations, required evidence/validation, output shape, stopping condition/budget, and no recursive delegation. Give one bounded assignment per child and only the context it needs; never include secrets, credentials, private transcripts, or unnecessary sensitive data.

Default to read-only and least privilege. Use a fresh context for independent work or a new assignment; reuse a session only for same-assignment follow-up. Parallel read-only children may share a checkout. Never run concurrent writers in one checkout: run shared-checkout writers sequentially or give each concurrent writer an isolated disposable worktree/check-out. The parent must not edit an active child's lane.

Record each child/backend and, when available, its run, thread, pane, session, process, or worktree identifier. Establish an explicit working directory and bounded timeout. Confirm start, monitor to a terminal state, capture the final output/handoff, and resolve blocked, failed, unknown, timed-out, or cancelled work. Never fire and forget.

## 4. Evaluate, integrate, and clean up

Treat child claims and backend completion states as untrusted evidence. The parent owns decisions, synthesis, tracker updates, complete diff review, spot-verification of material claims, and rerunning relevant validation. A handoff may be captured from native thread state, terminal/CLI output, or an optional `.subagents/` artifact; do not grant writes solely to create a handoff file.

Use the same child only for a useful same-assignment follow-up. Otherwise start fresh. Close, cancel, or deliberately retain only resources this workflow created, verifying ownership before cleanup. Report retained or still-running resources explicitly; never disrupt unrelated sessions, panes, processes, worktrees, or servers.

## Final reporting

Report only user-relevant facts: backend and child roles; material handoffs and parent verification; child-made changes and validation; unresolved, failed, cancelled, or running work; and intentionally retained resources. Include low-level IDs only when useful for continuation or diagnosis.
