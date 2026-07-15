# Herdr backend

Read this reference whenever `command -v herdr` succeeds, before deciding that Herdr is usable or launching a child.

## Contents

- Availability and safe preflight
- Owned topology and launch
- Turn lifecycle and handoffs
- Writers and worktrees
- Cancellation and ownership-safe cleanup

## Availability and safe preflight

Installed CLI help is authoritative. Before first use in a task, run:

```bash
command -v herdr
herdr --version
herdr status
herdr agent --help
herdr wait --help
```

Require a running server and compatible client/server protocols. If syntax differs from this reference, follow the installed help and retain the discrepancy in the handoff. Herdr is unusable when prohibited by higher-priority instructions, unavailable/unhealthy, incompatible, or unable to establish a safely owned target; continue to the next backend rather than stopping optional delegation.

Never infer a target from another client's focused pane. When running inside Herdr, require `HERDR_ENV=1`, inspect `herdr pane current --current`, and compare its returned workspace/tab/pane identity with the `HERDR_*` environment before using those IDs. When outside Herdr, either target an explicit user-provided workspace or create a dedicated workflow-owned workspace with installed-help-confirmed `herdr workspace create --cwd <absolute-project-path> --label <label> --no-focus`. Do not manipulate an unrelated existing workspace merely because a server is running. If no explicit or workflow-owned target can be established, preflight fails safely.

Treat every returned workspace, tab, pane, terminal, and session ID as opaque. Record IDs from command output rather than examples, labels, focus, or sidebar order. `.subagents/` prompt, handoff, and metadata files are optional; an owning tracker or parent-captured terminal output may hold the same evidence.

## Owned topology and launch

Keep automation unfocused. In an existing workspace, create a dedicated task tab:

```bash
herdr tab create \
  --workspace <workspace-id> \
  --cwd <absolute-project-path> \
  --label <task-label> \
  --no-focus
```

Record the returned tab and root-pane IDs. Reserve that tab for this parent's children and keep its original root pane idle as a layout anchor. A dedicated workflow-created workspace may use its workflow-owned initial tab instead. Inspect `herdr pane layout --pane <root-pane-id>` and sequence children when additional splits would become unusable.

Launch an installed interactive agent with the smallest permissions its role needs:

```bash
herdr agent start <unique-child-name> \
  --cwd <absolute-project-path> \
  --workspace <workspace-id> \
  --tab <tab-id> \
  --split right \
  --no-focus \
  -- <interactive-agent> <verified-agent-options...>
```

Use this clean-context shape for a read-only Pi child:

```bash
herdr agent start <unique-child-name> \
  --cwd <absolute-project-path> \
  --workspace <workspace-id> \
  --tab <tab-id> \
  --split right \
  --no-focus \
  -- pi \
    --tools read,grep,find,ls \
    --no-approve \
    --no-extensions \
    --no-skills \
    --no-prompt-templates \
    --no-context-files
```

Keep `--no-skills` unless a reviewed instruction-only skill is required; then keep discovery disabled and add only its explicit `--skill <path>`. Keep `--no-prompt-templates` unless a reviewed explicit template is required. Keep `--no-context-files` when `AGENTS.md`/`CLAUDE.md` is unnecessary or untrusted; omit it only when reviewed context carries required constraints. `--no-approve` does not by itself suppress context files, and `bash` is write-capable even when `edit` and `write` are absent.

The tool allowlist limits model-invoked tools; it does not prevent extension or process initialization, confine reads, or sandbox Pi. Do not add explicit `-e` extensions. If an executable customization is necessary, classify it as execution-capable and contain the entire child in an OS/container/VM policy boundary limited to required paths, environment, and network; otherwise reject Pi through Herdr and select the next safe backend. For other agents, inspect installed help and apply equivalent least-privilege controls. If safe permissions cannot be established, reject that launch.

Wait for initial readiness and inspect failures:

```bash
herdr wait agent-status <pane-id> --status idle --timeout 30000
herdr pane get <pane-id>
```

Use the actual pane ID returned by launch. Do not predict IDs or start children in the parent's working tab.

## Submit, monitor, and capture

Submit one literal assignment plus Enter. If using an optional prompt file:

```bash
herdr pane run <pane-id> "$(cat <absolute-prompt-path>)"
```

Confirm the new turn started by observing `working` or unambiguous new-turn/session evidence. A multiline bracketed-paste submission can rarely remain at the input while status stays `idle`; only after inspecting recent output and confirming that exact condition, send one `herdr pane send-keys <pane-id> enter`. Never send an extra Enter after work has started.

Monitor with bounded waits plus inspection:

```bash
herdr wait agent-status <pane-id> --status done --timeout <milliseconds>
herdr pane get <pane-id>
herdr agent read <pane-id> --source recent-unwrapped --lines 240
herdr agent get <pane-id>
```

Herdr states are attention-aware:

- `working`: a turn is active
- `done`: completion occurred while unseen
- `idle`: completion or waiting has been seen
- `blocked`: input, permission, approval, or a decision is needed
- `unknown`: classification is uncertain

Accept `idle` or `done` as completion only after start was observed or the agent session has a new final response. Pane existence and process liveness are not completion evidence. On timeout, `blocked`, or `unknown`, inspect `pane get`, recent unwrapped output, and the reported agent session before deciding. Ask the human for credentials, approval, ambiguity, or risk decisions; otherwise send only a bounded same-assignment clarification.

Capture final output directly, in the owning tracker, or in optional `.subagents/<id>.handoff.md`. A read-only child does not need write permission to produce a handoff. Require a terminal state, no unresolved blocked/unknown condition, and parent verification. Reuse the pane only for follow-up on the same assignment and observe a fresh start-to-completion cycle; use a fresh pane/session for a new task or independent judgment.

## Writers and worktrees

Before any writer or parallel assignment, read [`coordination-and-safety.md`](coordination-and-safety.md). Shared-checkout writers run sequentially. For concurrent writers, first inspect `herdr worktree --help`, then create one isolated worktree workspace per writer using installed-help-confirmed options, for example:

```bash
herdr worktree create \
  --cwd <repository-path> \
  --branch <unique-branch> \
  --base <base-ref> \
  --label <label> \
  --no-focus \
  --json
```

Record the returned branch, checkout path, and workspace ID; launch the writer only in that checkout. Herdr worktrees isolate checkouts but do not merge, prevent all out-of-tree writes, resolve conflicts, or validate changes. The parent reviews and integrates the complete diff, reruns validation, and removes a worktree only after its changes are safely handled. Never force-remove dirty or unintegrated work merely for cleanup.

## Cancellation and ownership-safe cleanup

On timeout or cancellation, inspect status/output first. If the turn should stop, send `herdr pane send-keys <pane-id> ctrl+c`, then verify the resulting state. Close only the recorded child pane if it does not stop cleanly.

After capturing and verifying a handoff, close an owned child only after matching its recorded agent name and terminal/session identity:

```bash
herdr pane get <pane-id>
herdr pane close <pane-id>
herdr pane get <pane-id>  # require pane_not_found
```

If a pane moved, resolve its unique recorded agent name and compare terminal/session identity before closing its current pane ID. If ownership is uncertain, retain and report it.

Close a workflow-owned dedicated tab only when all its children are closed, no child is retained or running, no unrecorded pane is present, and its root pane remains at the untouched idle shell. Verify with `herdr tab get`, `herdr pane list --workspace <workspace-id>`, and `herdr pane process-info --pane <root-pane-id>` before `herdr tab close <tab-id>`, then require `herdr tab get` to report `tab_not_found`.

Do not close an existing user workspace, named session, unrelated tab/pane, or the Herdr server. Close a dedicated workspace created solely by this workflow only after the same ownership/process checks cover every contained tab and pane; otherwise retain and report it. Remove a workflow-owned worktree with the installed `herdr worktree remove --workspace <id>` flow only after integration and clean-state review, without `--force` unless a human explicitly authorizes the understood loss.
