---
name: use-subagents
description: >-
  Provides legacy guidance for planning and coordinating bounded subagent work.
  Use this skill when delegation, decomposition, parallel research or review,
  isolated implementation, or independent validation may help, but only if
  `use-subagents-v2` is unavailable. Do not use when `use-subagents-v2` is
  available, for recursive delegation, or for ordinary background processes.
license: MIT
compatibility: >-
  Decision and coordination guidance is instruction-only. Launching requires a
  runtime-specific adapter, a native subagent capability, or a suitably
  controlled non-interactive agent CLI.
metadata:
  short-description: Legacy fallback for bounded subagent work
---

# Use Subagents (Legacy Fallback)

Use this legacy guidance only when `use-subagents-v2` is unavailable. Never co-activate both skills; if V2 is available, stop and use it instead. Follow higher-priority instructions for scope, privacy, tools, cost, and latency.

## Scope and runtime handoff

| This generic skill owns | A runtime-specific subagent skill or adapter owns |
|---|---|
| Delegation decisions, decomposition, assignment contracts, dependencies, sequencing/parallelism, synthesis, and parent verification | Exact tools and arguments, permission enforcement, status meanings, ownership and worktrees, interruption/stopping, cleanup, and recovery |

Use the generic workflow to decide and design work even when no adapter exists. Before any technical launch, status, interruption, stop, or cleanup operation, load an available runtime-specific subagent skill or adapter; its technical rules take precedence for those mechanics. Do not guess a future adapter name, invent tool calls, or assume one permission model.

## Decide

| Delegate when | Stay in the parent when |
|---|---|
| The assignment has one bounded role, scope, output, and stop condition. | The task is direct, small, or cheaper to verify locally. |
| Fresh context, expertise, independent judgment, context isolation, or real parallelism adds material value. | Work is tightly coupled, scopes overlap, or frequent parent-child iteration is required. |
| Expected value exceeds launch, monitoring, synthesis, verification, and cleanup cost. | Reconstructing context or coordinating the run erases the benefit. |

Complexity alone is not a reason to delegate. Loading this skill requires a decision, not a launch.

## Split the work

| Pattern | Use and sequencing |
|---|---|
| Independent fan-out | Run separable research or review angles in parallel, with non-overlapping questions and one parent synthesis. |
| Staged pipeline | Run scout → worker → reviewer when each output is required input for the next; verify each handoff before advancing. |
| Independent judgment | Give fresh reviewers the same evidence without sharing prior conclusions; resolve disagreements from evidence. |
| Writer lanes | For explicitly authorized implementation, run writers sequentially in one checkout or place each concurrent writer in an isolated checkout with non-overlapping ownership. |

Record dependencies, owned files/questions, expected evidence, and the join point. Keep concurrency bounded by useful independence and available capacity; never maximize fan-out by default. The parent and other children must not mutate an active writer lane.

## Define each assignment

Give each child one bounded assignment containing:

- **Role and objective:** one job and a concrete expected outcome.
- **Starting context:** exact project path, files, facts, and unresolved questions needed to begin.
- **Scope:** owned areas, requirements, non-goals, and prohibited scope creep.
- **Permissions:** allowed paths/tools and forbidden writes, commands, installs, destructive actions, or production access.
- **Evidence and validation:** required sources, diffs, tests, commands, and explicit skipped-check reporting.
- **Handoff:** concise findings or changed files, decisions, exact check results, risks, blockers, and remaining work.
- **Stop controls:** completion condition, timeout, budget where relevant, and no recursive delegation.

Send only task-relevant context. Never include secrets, credentials, tokens, private transcripts, `.env` contents, or unrelated sensitive data. Project trust is not a sandbox.

## Select a runtime and supervise

1. If a runtime-specific subagent skill or adapter is available, load it and use its exact lifecycle and safety mechanics.
2. Otherwise inspect the host's actual native subagent capability and current tool schema or documentation. Use it only when permissions, ownership, observation, cancellation, and cleanup fit the assignment.
3. Use a non-interactive agent CLI only as a last fallback after verifying authentication, explicit working directory, permission boundary, observable start and completion, capturable output, timeout, and cancellation. A subprocess is not a native subagent.
4. If no safe capability exists, keep optional work in the parent. If the user explicitly requires delegation, report it blocked rather than weakening controls.

For every launched run:

- grant least privilege and default to read-only;
- use a fresh child for a new assignment or independent judgment; reuse only for same-assignment follow-up;
- parallelize readers only for independent work;
- enforce the Writer lanes rule above before any child writes;
- set a bounded timeout, confirm a new work cycle actually started, monitor to a terminal outcome, and inspect blocked, unknown, timed-out, or failed states;
- never fire and forget, and after repeated identical failures change the bounded approach instead of retrying blindly.

## Synthesize, verify, and clean up

The parent owns the result:

1. Inspect material evidence, every child-made diff, complete Git state, check output, skips, risks, and assumptions.
2. Spot-check claims and rerun relevant focused and repository validation. Child claims, status, and exit codes are evidence, not proof.
3. Resolve disagreement from sources and tests rather than averaging conclusions. Reject scope creep and unnecessary complexity.
4. Integrate only verified work, then use the runtime adapter's ownership-safe controls to stop, remove, or deliberately retain every workflow-owned run and resource. Never touch unrelated resources or discard dirty/unintegrated work.

## Final reporting

Report roles used, material findings or changes, parent verification and validation, unresolved/failed work, and intentionally retained resources with reasons. Include low-level run or resource identifiers only when useful for continuation or diagnosis.
