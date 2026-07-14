---
name: use-subagents
description: Delegates bounded work to independent subagents exclusively in visible Herdr-managed terminal panes. Use when fresh context, specialization, review, research, validation, or safe parallelism materially improves a task. Requires the parent to run inside Herdr; do not use headless subprocesses, runtime-native hidden agents, or concurrent writers in one worktree.
compatibility: Requires Herdr 0.7.3+ with a running compatible server, HERDR_ENV=1, and an installed interactive agent executable (Pi by default).
metadata:
  short-description: Run and coordinate subagents exclusively in visible Herdr panes
---

# Use Subagents

## Instruction priority

- Follow explicit user instructions and higher-priority instructions over this workflow. Honor requests to use, avoid, limit, pause, or inspect subagents, including constraints on cost, latency, privacy, tools, and scope.
- Activating this skill does not require launching a child. If user intent is ambiguous and delegation would materially affect cost, time, risk, or scope, ask before proceeding.

## Exclusive execution contract

- Run every subagent as an interactive agent process in a visible Herdr pane. **Never** use hidden runtime-native delegation, non-interactive `pi -p`, detached subprocess workers, or another non-Herdr execution path.
- Before delegation, require `HERDR_ENV=1`, `herdr` in `PATH`, Herdr `0.7.3+`, and a compatible running server. If any requirement fails, stop and report delegation as blocked; do not fall back.
- The installed CLI is authoritative. Before first use in a task, run `herdr --version`, `herdr status`, `herdr agent --help`, and `herdr wait --help`. Do not infer command syntax or resource IDs.
- Use `.subagents/` only for parent↔child communication: assignments, system constraints, follow-ups, captured handoffs, pane/session metadata, and diagnostics. Task-owned `.progress`, `.plans`, `.reviews`, source, tests, and deliverables stay at their owning paths.
- Record the owning parent's pane, terminal, workspace/tab, and agent session in task metadata before launching children; Herdr tabs alone do not identify their parent session.
- The parent owns decomposition, decisions, synthesis, verification, shared tracker updates, and the final answer. A Herdr status or child claim is never sufficient proof by itself.
- Default children to read-only Pi tool access (`read,grep,find,ls`). Grant additional tools only when the bounded role needs them. Assign writes explicitly and never run concurrent writers in one worktree.
- Use a fresh pane/session for a new assignment or when genuine independence or context separation matters. Reuse the same pane/session only for a follow-up on that assignment; do not split work merely because a role label or workflow phase changes.
- For each owning parent task, create one dedicated no-focus Herdr tab per workspace and launch all of that task's child panes in the corresponding tab; never launch a child in the parent's working tab. An isolated worktree writer therefore gets a dedicated subagent tab in its own workspace.
- Keep background tabs and panes unfocused unless the user asks to inspect one. Record every created tab, root pane, child pane, and terminal ID and track each until closure, deliberate retention, failure, cancellation, or an explicitly reported still-running state.
- Treat only those recorded resources as workflow-owned. After handoffs and same-assignment follow-ups are complete, close each owned child pane, then close the task's dedicated tab after all its children are closed unless the user wants it retained; never close an unrelated pane, tab, workspace, Herdr session, or server.
- Give every child a bounded prompt with role, scope, permissions, expected evidence/output, stopping condition, and no-recursive-delegation instruction.
- Never send secrets, credentials, private parent transcripts, or unnecessary sensitive data to a child or terminal scrollback.

Before assigning writes, parallel work, sensitive work, or broad/expensive investigations, read [`references/prompt-and-safety-guidance.md`](references/prompt-and-safety-guidance.md). It defines prompt requirements, Herdr lifecycle handling, worktree isolation, completion evidence, and failure cleanup.

## Workflow

### 1. Decide deliberately whether to delegate

Before each child or materially new assignment, decide whether its expected contribution justifies startup, monitoring, synthesis, verification, and cleanup. No single factor decides.

Delegation is more useful when work has a concrete bounded role, independent context or expertise improves confidence, separable work can run meaningfully in parallel, or context isolation protects the parent. Keeping work in the parent is more useful when a few direct checks can resolve it, the child would repeat the same context and reasoning, its handoff adds little beyond required verification, coordination would dominate, or judgment is tightly coupled.

Treat these as signals, not rules: simple work may still benefit from delegation, while complex work may not. Do not create separate children merely because different roles or workflow phases are available; overlapping work needs a deliberate independence or comparison purpose. Make a brief decision and proceed without creating an artifact solely to record it.

Choose bounded roles and keep visible concurrency proportional to machine/API capacity, task separability, and pane usability.

### 2. Preflight Herdr and initialize communication

Run:

```bash
test "${HERDR_ENV:-}" = 1
herdr --version
herdr status
herdr agent --help
herdr wait --help
herdr pane current --current
```

Require Herdr `0.7.3+` and matching compatible client/server versions. Use `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, and `HERDR_PANE_ID` only after confirming they are present. Always target `--current` or explicit returned IDs; never rely on another client's focused pane. Treat the returned current pane—including its `agent_session` when present—as the owning parent identity.

Generate one collision-resistant owning task ID, then one child assignment ID per role/task (for example role + task slug + timestamp/random suffix). IDs may contain letters, numbers, `.`, `_`, or `-` and must begin and end alphanumerically. Before creating artifacts or launching a child, require that no `.subagents/<id>.*` artifact, matching `.subagents/pi-sessions/*_<id>.jsonl` session, or live Herdr agent with that child ID exists. Never reuse a child ID for a fresh assignment, and never reuse a task ID while its dedicated tab or metadata remains live.

Then, at the target repository root, create `.subagents/` and `.subagents/pi-sessions/`, protect communication files with restrictive permissions where supported, and ensure `.subagents/` is locally ignored without modifying the user's tracked ignore policy. Create:

- `.subagents/<id>.prompt.md` — parent assignment
- `.subagents/<id>.system.md` — tool, safety, no-recursion, and stopping constraints
- `.subagents/<id>.follow-up.md` — same-task follow-up when needed
- `.subagents/<id>.handoff.md` — parent-captured child result
- `.subagents/<id>.herdr.json` — returned workspace/tab/pane/terminal IDs and Pi session reference when available
- `.subagents/<task-id>.herdr-tab.json` — canonical parent ownership, dedicated tabs/root panes, child IDs, and retained/closed state

Use canonical snake_case task metadata with `schema_version: 1`, `task_id`, `owner`, `tabs: []`, `child_ids: []`, and `state: "active"`. `owner` must contain the parent `workspace_id`, `tab_id`, `pane_id`, `terminal_id`, and the complete `agent_session` object from `herdr pane current --current` (or `null` when absent). Each `tabs` item contains `workspace_id`, `tab_id`, `root_pane_id`, and `root_terminal_id`.

### 3. Create the dedicated tab and start child panes

Before the first child for an owning task, create one dedicated subagent tab without stealing focus:

```bash
herdr tab create \
  --workspace "$HERDR_WORKSPACE_ID" \
  --cwd /absolute/path/to/project \
  --label "subagents-<task-id>" \
  --no-focus
```

Parse the returned tab and root-pane IDs and append a `tabs` record containing `workspace_id`, `tab_id`, `root_pane_id`, and `root_terminal_id` to `.subagents/<task-id>.herdr-tab.json`; never replace its `owner`. Treat IDs as opaque. Reserve the root pane as the tab's workflow-owned layout anchor; do not run an assignment or unrelated command in it. Reuse this tab for all ordinary children owned by the same parent task instead of creating one tab per child.

Use Pi unless the user explicitly requests another installed interactive agent. For a read-only Pi child, launch into the recorded dedicated tab without stealing focus:

```bash
herdr agent start <id> \
  --cwd /absolute/path/to/project \
  --workspace "$SUBAGENT_WORKSPACE_ID" \
  --tab "$SUBAGENT_TAB_ID" \
  --split right \
  --no-focus \
  -- pi \
    --session-id <id> \
    --session-dir /absolute/path/to/project/.subagents/pi-sessions \
    --name <id> \
    --tools read,grep,find,ls \
    --append-system-prompt /absolute/path/to/project/.subagents/<id>.system.md
```

Choose `right` or `down` after inspecting `herdr pane layout --pane "$SUBAGENT_ROOT_PANE_ID"`, and inspect the dedicated tab's layout after each launch. Avoid unusably narrow or short layouts; sequence child work when bounded concurrency no longer fits the task's dedicated tab. Parse and persist IDs from every JSON response—never predict IDs from examples or sidebar order.

For a child in a Herdr worktree workspace, first create and record a dedicated no-focus subagent tab in that returned workspace, then launch the child there. For a writer, pass an explicit tool allowlist required by its lane and apply the reference's isolation rules. For a user-requested different agent, launch its normal interactive executable in Herdr and apply that agent's safest available permission controls; if equivalent controls cannot be established, ask before proceeding.

Wait for startup and inspect failures:

```bash
herdr wait agent-status <pane-id> --status idle --timeout 30000
herdr pane get <pane-id>
```

### 4. Submit and monitor the assignment

Send the prompt as one literal submission plus Enter:

```bash
herdr pane run <pane-id> "$(cat /absolute/path/to/project/.subagents/<id>.prompt.md)"
```

Confirm the turn started by observing `working` or clear new-turn evidence. For a multiline prompt, `herdr pane run` may occasionally leave a bracketed-paste token visible in Pi's input while the agent stays `idle`; inspect recent output, and only in that exact state send one `herdr pane send-keys <pane-id> enter`, then require `working`. Do not send an extra Enter when the turn already started. Then monitor with `herdr wait agent-status`, `herdr pane get`, and `herdr agent read` as appropriate.

Herdr distinguishes completion by attention:

- `done`: the turn finished while unseen
- `idle`: the turn finished or is waiting and has been seen
- `blocked`: the child needs input or approval
- `unknown`: Herdr cannot classify it confidently

Accept `idle` or `done` as turn completion only after the assignment was observed starting or the Pi session contains a new final assistant turn. If a wait times out, inspect current status and recent unwrapped output before deciding. Do not infer completion from a PID or from a pane merely existing.

For `blocked`, inspect the exact prompt. Ask the human when approval, credentials, ambiguity, or risk requires them; otherwise send a bounded clarification through `herdr pane run`.

### 5. Capture and evaluate the handoff

Read the child result:

```bash
herdr agent read <pane-id> --source recent-unwrapped --lines 240
herdr agent get <pane-id>
```

Use the Pi integration's reported session reference when terminal scrollback is incomplete. The parent must capture the final result into `.subagents/<id>.handoff.md`; a read-only child does not receive write access merely to create that file.

A usable result requires all of:

1. observed completed turn (`idle` or `done` after start)
2. captured handoff or final Pi session response
3. no unresolved blocked/unknown state
4. parent spot-verification of material claims
5. parent review and validation of child-made changes

Record limitations, files inspected/changed, tests/checks, and unresolved concerns in the owning progress note or plan tracker. Parent verification does not automatically justify another child: verify directly when practical, and delegate validation only when fresh judgment, expertise, risk reduction, or parallelism is worth the added coordination.

### 6. Follow up in the same pane

When existing context helps a same-assignment follow-up, write `.subagents/<id>.follow-up.md` and submit it to the same pane with `herdr pane run`. Observe a new working→completion cycle and append the captured response to the handoff.

Use a fresh pane/session for a new assignment or when independence or clean context materially matters. Reapply step 1 before further delegation, and never send concurrent turns to one pane.

### 7. Close or retain workflow-owned panes and tabs deliberately

Keep a child pane while same-assignment follow-up, human inspection, or task continuation is likely. Once that assignment is complete, close only its recorded workflow-owned pane unless the user wants it retained:

```bash
herdr pane get <pane-id>  # verify recorded agent name and terminal ID
herdr pane close <pane-id>
herdr pane get <pane-id>  # require pane_not_found
```

If the recorded pane ID is missing because the pane moved, resolve the unique recorded agent name with `herdr agent get`, compare its terminal/session identity with `.subagents/<id>.herdr.json`, and close only the verified current pane ID. If ownership is uncertain, retain and report it rather than risking another pane.

After every child in a dedicated tab has a captured handoff and is closed or deliberately retained, inspect the tab and workspace pane list. Close the dedicated tab only when it was created by this workflow, no child is still running or retained there, and its pane set contains only the recorded root pane:

```bash
herdr tab get "$SUBAGENT_TAB_ID"
herdr pane list --workspace "$SUBAGENT_WORKSPACE_ID"  # filter by tab_id
herdr pane process-info --pane "$SUBAGENT_ROOT_PANE_ID"
herdr tab close "$SUBAGENT_TAB_ID"
herdr tab get "$SUBAGENT_TAB_ID"  # require tab_not_found
```

Require the recorded root pane to be at its untouched idle shell before closing the tab. Do not use tab closure as a shortcut for unverified child cancellation. If any pane is unrecorded, any process is unexpected, or ownership is uncertain, retain the tab and report the reason. Never close the parent's working tab, an unrelated pane or tab, a workspace, a Herdr named session, or the Herdr server as ordinary subagent cleanup.

For cancellation, send `ctrl+c`, inspect status/output, and close only the verified child pane if it does not stop cleanly. Before the final response, verify every child pane and dedicated tab is closed, deliberately retained, or explicitly reported as still running.

## Parallel writers

Parallel read-only children may share a worktree. Parallel writers may not. For genuinely parallel implementation, first run `herdr worktree --help`, then create one Herdr worktree workspace per writer with `herdr worktree create`, launch the writer in the returned workspace, and keep branches/files independently owned. Record every created branch, checkout path, and workspace ID. After safe review/integration, deliberately remove the worktree with the documented Herdr command, or explicitly retain and report it; never delete an unintegrated or dirty worktree casually. Herdr worktrees do not replace merge, conflict, validation, or cleanup responsibility.

## Final reporting

Summarize:

- Herdr dedicated-tab, root-pane, child-pane, terminal/agent IDs, and roles
- foreground/background and retained/closed state for every workflow-owned pane and tab
- material handoffs and how they were verified
- child-made changes and validation
- rejected/deferred findings with reasons
- unresolved blocked, failed, unknown, or still-running children
- created worktrees/workspaces/branches and whether each was safely removed or intentionally retained
