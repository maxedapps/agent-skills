# Runtime-native and non-interactive CLI backends

Read this reference before launching a runtime-native child or non-interactive agent CLI. Use these only after Herdr is absent, prohibited, or has a recorded failed preflight.

## Contents

- Shared backend requirements
- Runtime-native delegation
- CLI selection and process control
- Read-only and writer controls
- Pi, Claude Code, Codex, and equivalent CLIs

## Shared backend requirements

Before any write-enabled, parallel, sensitive, or broad/expensive assignment, read [`coordination-and-safety.md`](coordination-and-safety.md). For every backend:

- establish an explicit absolute working directory, bounded assignment, least privilege, and timeout
- use a fresh context for a new assignment or independent judgment
- prohibit recursive delegation
- record a run/thread/process identifier when available
- confirm observed start and a terminal completion/failure state
- capture final output, exit/state, limitations, and validation evidence
- cancel or clean up every owned run; never fire and forget

Default to read-only. Capture `git status --short` and relevant diff state before a read-only run, then verify they are unchanged afterward. A prompt is not a permission boundary.

## Runtime-native delegation

Inspect the capability actually exposed by the active harness and its current tool schema or local documentation; do not assume a universal tool name, parameter shape, permission model, persistence behavior, or background mode. Use native delegation only when it provides a fresh child context and enough controls for the assignment.

Pass one bounded prompt and only needed context. Set read-only tools/permissions explicitly when supported. If the runtime cannot technically restrict a nominally read-only child, treat it as write-capable and either add external isolation or reject it. Preserve native thread output as the handoff; do not require the child to write a file.

Use the native wait/status/follow-up mechanisms rather than polling blindly. Reuse the thread only for same-assignment follow-up; create a fresh thread for a new role or independent review. The parent remains responsible for inspecting changes and rerunning validation.

For native writers, require bounded write permissions and the isolation rules below. Parallel native agents do not make shared-checkout writes safe.

## CLI selection and process control

Honor an explicitly requested suitable CLI. Otherwise choose an installed, authenticated CLI whose current permission, filesystem, output, and session controls fit the assignment; there is no fixed vendor ranking. Before use:

```bash
command -v <cli>
<cli> --help
```

Inspect subcommand help too, such as `codex exec --help`. Do not copy flags across products or versions. Never put credentials in prompts, arguments, logs, or handoffs. Pass only required environment variables and filesystem access; remember that a CLI may also read credentials/configuration from its home directory.

Run in the explicit project cwd, with a harness/process-supervisor timeout supported in the current environment. Capture stdout/stderr, exit code, and final result; use structured/final-output options when the installed help supports them. Do not use detached or background execution unless the parent has an explicit monitor, cancellation path, and final join.

### Read-only CLI path

- Disable write-capable tools, shell execution, and auto-approval where supported.
- Disable unneeded project/user extensions, hooks, skills, MCP servers, and context resources when the CLI supports it.
- Compare worktree status/diff before and after. Any unexpected change makes the run failed pending investigation.
- A tool allowlist limits model-invoked tools, not necessarily process-level reads, loaded code, network access, or inherited credentials. Use an OS/container/VM boundary when those require confinement.

### Write-enabled CLI path

Use a CLI writer only when the assignment explicitly authorizes it and the backend provides bounded write controls. Shared-checkout writers run sequentially. Each concurrent writer gets one disposable isolated worktree/check-out and one non-overlapping lane. The parent and other writers do not edit that lane while it runs.

Never enable blanket auto-approval, unrestricted host access, or a danger/full-access mode as a substitute for proper scope. Review the complete diff and rerun parent validation. If write scope or isolation cannot be established, reject that CLI as a writer and continue fallback or report delegation blocked.

## Pi (`pi -p`)

Current installed Pi help documents print mode and a read-only built-in-tool allowlist:

```bash
pi -p \
  --tools read,grep,find,ls \
  --no-session \
  --no-approve \
  --no-extensions \
  --no-skills \
  --no-prompt-templates \
  --no-context-files \
  "<bounded assignment>"
```

Choose disabling flags according to needed context rather than copying blindly. `--no-approve` ignores protected project-local settings/resources for that run, but `AGENTS.md` and `CLAUDE.md` still load unless `--no-context-files` is set. User/global extensions and other resources can still load unless their `--no-*` discovery flags are set. Conversely, project-local resources needed by the task require a deliberate trust decision; non-interactive mode shows no trust prompt.

`--tools read,grep,find,ls` prevents writes through those allowed built-in tools, but it does not confine reads, protect inherited credentials, sandbox the Pi process, or make loaded extensions safe. Pi has no built-in sandbox. Avoid passing broad environment state; retain only runtime and authentication inputs genuinely required. For untrusted repositories, unattended work, sensitive host files, or any Pi CLI writer, run the whole process inside an OS/container/VM or policy-controlled boundary exposing only the required checkout and credentials. Without that external boundary, reject Pi as a write-enabled CLI backend.

Do not call `pi -p` runtime-native delegation: Pi core has no built-in subagents; this path is a subprocess fallback.

## Claude Code (`claude -p`)

Current installed Claude Code help supports `--print`, `--tools`, `--allowedTools`/`--disallowedTools`, `--permission-mode`, `--safe-mode`, `--bare`, `--no-session-persistence`, and structured output controls. It warns that print mode skips the workspace trust dialog, so use it only in a trusted directory or an external sandbox.

A minimal read-only shape, after confirming current tool names, is:

```bash
claude -p \
  --safe-mode \
  --tools Read \
  --permission-mode plan \
  --no-session-persistence \
  "<bounded assignment>"
```

Add only verified read tools required by the assignment. `--safe-mode` disables customizations but not built-in tools or permissions. For a bounded writer, use an isolated checkout plus the smallest verified tool list and permission mode; deny shell or restrict allowed shell patterns unless the lane requires them. Refuse `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`, and `bypassPermissions` outside an explicit external sandbox.

Capture text/JSON/stream output as appropriate and apply `--max-budget-usd` when a user or task budget requires it. Do not assume `--worktree` alone confines all host access; inspect and verify its behavior before relying on it.

## Codex (`codex exec`)

Current installed Codex CLI help supports an explicit cwd, sandbox mode, ephemeral sessions, JSONL events, final-message files, and output schemas. Read-only is the documented default, but set it explicitly. Place captured output outside the assessed checkout (or account for an explicitly ignored communication path in the baseline):

```bash
codex exec \
  --cd <absolute-project-path> \
  --sandbox read-only \
  --ephemeral \
  --output-last-message <output-path-outside-assessed-checkout> \
  "<bounded assignment>"
```

Use `--json` for event capture or `--output-schema <file>` for a validated final shape when useful. For an authorized isolated writer, `--sandbox workspace-write` is the maximum normal permission; do not add writable directories beyond the assigned checkout. Prohibit `danger-full-access` and `--dangerously-bypass-approvals-and-sandbox` unless the entire process already runs inside an explicit external sandbox designed for that access.

User configuration and rules can affect behavior. When independence or reproducibility requires it, inspect installed help for `--ignore-user-config`, `--ignore-rules`, and `--strict-config` semantics before choosing them; do not disable policy controls casually.

## Equivalent CLIs

An equivalent non-interactive agent CLI is eligible only if installed help confirms: non-interactive operation, explicit cwd, a capturable terminal result/exit, and permissions suitable for the assignment. Read-only work needs enforceable denial of writes or external containment. Writer work needs bounded writes plus checkout isolation. If these cannot be shown from current help and a harmless preflight, the CLI is unsuitable.
