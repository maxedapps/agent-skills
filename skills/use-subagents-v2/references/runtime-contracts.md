# Runtime contracts

Use this reference to prove that a runtime can enforce the assignment before launch. Help output is version-specific evidence; remembered flags are not.

## Contents

- Capability gate
- Interactive Herdr
- Standalone one-shot mode
- Kimi readers
- Runtime evidence to retain

## Capability gate

From the parent-controlled environment, verify the executable path and current help:

```sh
command -v <executable>
<executable> --help
```

Also inspect the relevant subcommand help before constructing an invocation. Require all of the following:

- an explicit working directory: the parent checkout for readers or the isolated worktree for workers;
- a permission policy suitable for the role (enforced read-only tools/sandbox for readers; explicitly authorized write tools/sandbox for isolated workers);
- observable output and terminal completion;
- a bounded wait and a safe way to interrupt or stop;
- one complete, non-interactive request for standalone mode; and
- no nested-agent or recursive orchestration behavior.

Do not infer a flag from another agent or version. Reject dangerous permission-bypass modes. If help is missing, ambiguous, or contradicts this contract, do not launch.

## Interactive Herdr

Probe the installed interface before each workflow:

```sh
herdr --help
herdr status --json
herdr agent --help
herdr pane --help
herdr wait --help
herdr worktree --help
```

Use Herdr only when `HERDR_ENV=1`, `HERDR_SOCKET_PATH`, `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, and `HERDR_PANE_ID` are set; client/server status is compatible; and `herdr pane current --current` matches those IDs. Re-probe before use. Herdr 0.7.4 exposes these conservative forms:

```sh
# Reader: create an owned, no-focus sibling pane in the parent checkout.
herdr agent start "$name" --cwd "$parentCheckout" --tab "$HERDR_TAB_ID" --split right --no-focus -- "$executable"

# Worker: create an owned worktree workspace, then launch in its returned root pane.
herdr worktree create --cwd "$parentCheckout" --branch "$workerBranch" --base "$baseHead" --no-focus --json
herdr pane run "$rootPaneId" "$executable"

herdr agent read "$terminalId" --source recent-unwrapped --lines "$lineCount"
herdr wait agent-status "$paneId" --status idle --timeout "$timeoutMs"
herdr pane run "$paneId" "$completeAssignment"
```

Placeholders are freshly recorded values, not literal arguments. Parse and retain returned workspace/tab/pane/terminal IDs. `pane run` is the documented text-plus-Enter operation and keeps each command or prompt submission atomic.

Lifecycle:

1. Readers stay in the parent checkout under an enforced read-only policy. Workers use a newly created recorded isolated worktree without force.
2. Start the **normal interactive executable**. The startup argv contains the executable and proven interactive permission options only—never a headless/print/exec flag and never the task prompt.
3. Resolve and record the actual agent/pane target. Inspect its output before waiting.
4. Wait with a finite timeout until the target reports idle. Inspect output again; status is advisory and may be stale or wrong.
5. Submit the entire assignment with the single atomic `pane run` operation. Do not split prompt text and the submit key across operations.
6. Confirm a new work cycle actually began. Inspect before each later wait; investigate idle, blocked, unknown, timeout, and process-exit evidence instead of blindly retrying.
7. Same-assignment clarification is allowed only when the output shows it is needed. Never broaden scope or ask the worker to delegate.
8. Interrupt or stop only through a control proven by current help, then inspect output and repository state. Do not close a pane that must be retained for recovery.

Do not use Herdr's force-removal option. A pane, workspace, or worktree with unsafe or unverifiable state remains open and is reported.

## Standalone one-shot mode

Probe the exact headless subcommand or flag and its full help. Current discovery probes for common adapters are:

```sh
pi --help
claude --help
codex exec --help
grok --help
kimi --help
```

After `doctor` proves the required tokens, the script constructs these current conservative forms; it sets the process cwd to the parent checkout for readers and the owned worktree for workers:

| CLI | Current standalone form | Prompt transport and role policy |
|---|---|---|
| Pi | `pi -p --no-session ... --tools <allowlist>` | stdin; scout is filesystem-read-only, research adds named web tools, worker gets the explicit write allowlist; non-research runs disable extensions |
| Claude | `claude -p --no-session-persistence --permission-mode <plan|dontAsk> --tools <allowlist>` | stdin; readers use `plan`, workers use the explicit write tool set |
| Codex | `codex [--search] exec -C <cwd> --sandbox <read-only|workspace-write> --ephemeral -` | stdin; research enables current `--search` |
| Grok | `grok --prompt-file <file> --permission-mode <plan|auto> --no-subagents --no-memory --output-format json` | owned prompt file; readers use `plan`, isolated workers use `auto` |
| Kimi | `kimi -p <prompt>` | argv because current help exposes no prompt-file/stdin form; standalone readers remain blocked and only isolated workers are allowed |

The exact argv is also stored in the owned manifest. Do not copy these forms around the script or bypass `doctor`; current help remains the authority. The invocation must expose a non-interactive completion result and enforce the assignment's permissions without a dangerous bypass. Capture output and exit status under a timeout. After it exits, inspect Git independently; exit zero is evidence, not acceptance.

Standalone follow-up is unsupported. If the result is incomplete or ambiguous, retain the worktree and branch and return control to the parent; do not resume a session or silently start a replacement worker.

## Kimi readers

Kimi reader assignments fail closed. Launch only if the installed `kimi --help` and relevant mode help prove an enforceable read-only boundary, explicit isolated working directory, observable completion, and no recursive delegation; standalone mode must additionally prove a non-interactive one-shot form. Missing executable/help, an advisory prompt, or trust in assignment wording is insufficient. When proof is absent, select another proven reader runtime or keep the work in the parent.

## Runtime evidence to retain

Record executable identity/version when available, help forms used, role and enforced permission mode, worktree path, runtime target or process identifier, timeout, terminal outcome, and any stop action. Distinguish observations from worker claims in the final report.
