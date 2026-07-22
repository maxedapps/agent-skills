---
name: use-subagents
description: >-
  Plans and coordinates bounded subagent work across coding agents. Use this
  skill whenever considering delegation, decomposition, parallel research,
  review or implementation, independent validation, or an explicit request to
  spawn or manage subagents. Prefer an active native subagent runtime, then
  `use-subagents-dynamic`, and use this skill only as the generic fallback with
  the host's actual safe capability. Do not use for ordinary background shell,
  server, or process work.
license: MIT
compatibility: >-
  Decision and coordination guidance is instruction-only. Launching requires a
  runtime-specific adapter, a native subagent capability, or a suitably
  controlled non-interactive agent CLI. Never co-activate competing runtime
  adapters.
metadata:
  short-description: Generic fallback for bounded subagent work
---

# Use Subagents

Generic coordinator guidance. Prefer one active runtime path (see Select a runtime). Never co-activate competing runtime adapters or skills. Follow higher-priority instructions for scope, privacy, tools, cost, and latency.

## Scope and runtime handoff

| This generic skill owns | A runtime-specific subagent skill or adapter owns |
|---|---|
| Delegation decisions, decomposition, assignment contracts, dependencies, sequencing/parallelism, synthesis, and parent verification | Exact tools and arguments, permission enforcement, status meanings, ownership and worktrees, interruption/stopping, cleanup, and recovery |

Before any technical launch, status, interruption, stop, or cleanup operation, load the single selected runtime skill or adapter; its technical rules take precedence for those mechanics. Do not guess a future adapter name, invent tool calls, or assume one permission model.

## Decide

**Delegation-first rule:** when a safe capability exists, delegate every bounded non-trivial research, implementation, test-authoring, accepted remediation, or review unit. Parallelism affects scheduling only. Dependent or coupled work uses one blocking or awaited run, then parent join—not parent implementation.

| Delegate | Parent-only |
|---|---|
| Bounded non-trivial research, implementation, test-authoring, accepted remediation, or review with a clear role, scope, output, and stop condition. | Framing, decomposition, synthesis, tracker/plan ownership, integration and conflict resolution, dispositions, focused acceptance validation, cleanup, and user communication. |
| Independent units in parallel when capacity allows; dependent/coupled units as one awaited child. | Genuinely atomic mechanics with no research or behavior change. |
| Required non-trivial work when a safe runtime path exists. | Explicit user prohibition of delegation. |
| | Unavailable or unsafe capability for optional work (keep in parent) or required work (escalate/block—do not silently implement in the parent). |

Do not stay in the parent for speed, warm context, coordination overhead, coupling, verification overhead, or missing parallelism.

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
- **Permissions:** allowed paths/tools and forbidden writes, commands, installs, destructive actions, or production access. Forbid child edits to parent-owned plans and trackers.
- **Evidence and validation:** required sources, diffs, tests, commands, and explicit skipped-check reporting.
- **Handoff:** concise findings or changed files; branch; commit SHA or clean HEAD/status for no-change work (no fake commit); decisions; exact check results; risks; blockers; remaining work. Parent integrates.
- **Stop controls:** completion condition, timeout, budget where relevant, and no recursive delegation.

Send only task-relevant context. Never include secrets, credentials, tokens, private transcripts, `.env` contents, or unrelated sensitive data. Project trust is not a sandbox.

## Select a runtime and supervise

Use exactly one active path, in order:

1. If native `subagent_*` tools are active, load their runtime skill and use those tools.
2. Otherwise, if `use-subagents-dynamic` is available, stop here and use that skill with `scripts/subagents.mjs`.
3. Otherwise inspect the host's actual native subagent capability and current tool schema or documentation. Use it only when permissions, ownership, observation, cancellation, and cleanup fit the assignment.
4. Use a non-interactive agent CLI only as a last fallback after verifying authentication, explicit working directory, permission boundary, observable start and completion, capturable output, timeout, and cancellation. A subprocess is not a native subagent.
5. If no safe capability exists, keep optional work in the parent. If the work is required or the user explicitly requires delegation, report it blocked rather than weakening controls or silently implementing in the parent.

Never co-activate competing runtime adapters or skills.

For every launched run:

- grant least privilege and default to read-only;
- use a fresh child for a new assignment or independent judgment; reuse only for same-assignment follow-up;
- parallelize only genuinely independent work; run dependent/coupled work as one blocking or awaited child;
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
