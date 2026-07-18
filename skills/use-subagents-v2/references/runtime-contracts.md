# Runtime contracts

Use this reference to prove that a runtime can enforce the assignment before launch. Help output is version-specific evidence; remembered flags are not.

## Capability gate

From the parent-controlled environment, verify the executable path and current help:

```sh
command -v <executable>
<executable> --help
```

Also inspect the relevant subcommand help before constructing an invocation. Require all of the following:

- an explicit worker working directory or a process launched with the isolated worktree as its actual current directory;
- a permission boundary suitable for the role (read-only for readers; writes limited to the owned worktree for writers);
- observable output and terminal completion;
- a bounded wait and a safe way to interrupt or stop;
- one complete, non-interactive request for standalone mode; and
- no nested-agent or recursive orchestration behavior.

Do not infer a flag from another agent or version. Reject dangerous permission-bypass modes. If help is missing, ambiguous, or contradicts this contract, do not launch.

## Interactive Herdr

Probe the installed interface before each workflow:

```sh
herdr --help
herdr agent --help
herdr pane --help
herdr wait --help
herdr worktree --help
```

Current Herdr help exposes agent start/read/wait controls, pane input/interrupt controls, and worktree create/open/remove controls. Use only forms shown by that installed help. At the time this reference was written, the conservative interactive forms were:

```sh
herdr agent start "$name" --cwd "$workerPath" -- "$executable"
herdr agent read "$target" --source recent --lines "$lineCount"
herdr agent wait "$target" --status idle --timeout "$timeoutMs"
herdr pane run "$paneId" "$completeAssignment"
```

Re-probe before use; placeholders are parent-recorded values, not literal arguments. `pane run` is the documented text-plus-Enter operation and therefore keeps prompt submission atomic.

Lifecycle:

1. Create or open the recorded isolated worktree without force.
2. Start the **normal interactive executable** in that worktree. The argv after Herdr's separator contains the executable and proven interactive startup options only—never a headless/print/exec flag and never the task prompt.
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
codex exec --help
claude --help
opencode run --help
kimi --help
```

At the time this reference was written, those probes exposed Codex `exec`, Claude `--print`, and OpenCode `run`; they did not establish one shared permission or cwd syntax. Treat these as entry-point evidence only, not portable invocations. Launch the selected adapter as one foreground process whose actual current directory is the isolated worktree, passing the complete assignment once through the input form and permission controls documented by current help.

The invocation must expose a non-interactive completion result and enforce the assignment's permissions without a dangerous bypass. Capture output and exit status under a timeout. After it exits, inspect Git independently; exit zero is evidence, not acceptance.

Standalone follow-up is unsupported. If the result is incomplete or ambiguous, retain the worktree and branch and return control to the parent; do not resume a session or silently start a replacement worker.

## Kimi readers

Kimi reader assignments fail closed. Launch only if the installed `kimi --help` and relevant mode help prove an enforceable read-only boundary, explicit isolated working directory, observable completion, and no recursive delegation; standalone mode must additionally prove a non-interactive one-shot form. Missing executable/help, an advisory prompt, or trust in assignment wording is insufficient. When proof is absent, select another proven reader runtime or keep the work in the parent.

## Runtime evidence to retain

Record executable identity/version when available, help forms used, role and enforced permission mode, worktree path, runtime target or process identifier, timeout, terminal outcome, and any stop action. Distinguish observations from worker claims in the final report.
