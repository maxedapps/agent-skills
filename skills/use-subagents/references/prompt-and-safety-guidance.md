# Herdr subagent prompt and safety guidance

Read this reference before assigning writes, parallel tasks, sensitive work, or a broad/expensive investigation.

## Contents

- Prompt and communication contracts
- Herdr topology, focus, and permissions
- Write isolation and turn lifecycle
- Follow-ups, cleanup, timeouts, and result evaluation

## Prompt contract

Every child prompt must state:

- exact task and role
- project path and starting files/questions
- requirements, constraints, and non-goals
- whether files may be modified
- allowed files/directories and forbidden operations
- expected evidence and validation
- concise output/handoff shape
- stopping condition and timeout/budget expectation
- known assumptions, risks, and unresolved questions
- an unconditional prohibition on spawning or delegating to more agents

For reviews and research, require concrete source or `path:line` evidence, confidence/limitations, and “no material findings” when appropriate. Ask for independent judgment, not approval of the parent's position.

For implementation, require a bounded handoff: files changed, behavior implemented, tests/checks and results, skipped checks, and remaining risks. The parent captures communication under `.subagents/` and updates owning trackers itself.

## Communication boundary

`.subagents/` is a local parent↔child communication channel, not a project artifact folder.

Store there:

- assignments, system constraints, and follow-up briefs
- captured child handoffs and selected terminal diagnostics
- Herdr workspace/tab/pane/terminal IDs
- Pi session references and local child session state

Keep these at their owning locations instead:

- `.progress` notes and implementation trackers
- `.plans` and `.reviews`
- source, tests, migrations, generated assets, and project documentation

Use the repository root as the child cwd when practical. Create `.subagents/.gitignore` without overwriting an existing file, and add `/.subagents/` to the worktree's local `.git/info/exclude` when Git does not already ignore it. Do not change a tracked `.gitignore` merely for runtime communication. Treat local ignoring as protection against accidents, not permission to store secrets.

A read-only child does not receive write tools merely to produce a handoff. The parent reads the Herdr terminal or Pi session and writes `.subagents/<id>.handoff.md`.

## Herdr topology and focus safety

- Require `HERDR_ENV=1`; never control a user's focused Herdr session from outside Herdr.
- Use Herdr `0.7.3+` and confirm client/server protocol compatibility before launching children.
- Use `--no-focus` for every background child and dedicated subagent tab. Do not steal terminal focus while the user is typing.
- Use the caller's `HERDR_WORKSPACE_ID` only after checking the current pane. Create one dedicated no-focus subagent tab per workspace for each owning task and launch that task's child panes there; never place them in the parent's working tab.
- Children in another workspace, including isolated worktree writers, use the task's dedicated subagent tab in that workspace.
- Parse tab, root-pane, child-pane, and terminal IDs from JSON. IDs are opaque and can change when a pane moves across workspaces.
- Reserve each dedicated tab's created root pane as an empty workflow-owned layout anchor. Inspect that tab's layout before and after launches; prefer a few usable panes or sequential work rather than unreadably small panes.
- Record every tab and pane the workflow creates. Never close or send input to unrelated panes or tabs.
- A human can focus and type into a child pane. Before automated follow-up or cleanup, inspect status/output and avoid racing active human input.

## Agent permissions

For Pi reviewers, scouts, and most researchers, default to:

```text
--tools read,grep,find,ls
```

Add web/document tools only when the assignment needs them. A prompt saying “do not edit” is not equivalent to a tool allowlist; use both.

A writer receives only the tools needed for its explicit lane. `bash` is effectively write-capable even when `edit`/`write` are absent, so do not grant it to a nominally read-only child. Do not add `--approve` blindly; project-local skills, extensions, and context files can influence the child. Use trusted projects or `--no-approve` when project-local resources must be ignored.

Never include secrets in prompts, CLI arguments, terminal input, scrollback, session files, handoffs, or progress notes. Give children minimal necessary context rather than the full parent transcript.

## Write isolation

- A writer gets one explicit, non-overlapping lane.
- Do not edit that lane in the parent while the child runs.
- Never run concurrent writers in one worktree.
- Before creation, run `herdr worktree --help`; use `herdr worktree create` for each genuinely parallel writer, with a distinct branch and returned workspace.
- For shared-worktree sequential writers, wait for one writer to complete, capture/review its handoff and diff, then start the next.
- Forbid repo-wide formatters, codemods, installs, generators, and broad write-capable commands in concurrent lanes unless each writer has an isolated worktree.
- Child-made changes remain untrusted until the parent reviews the diff and reruns relevant validation.
- Before and after a read-only child, compare worktree status. Forbid checkout, restore, stash, clean, installs, and generators unless explicitly required.

Herdr worktrees provide checkout isolation and visibility; they do not merge results, resolve conflicts, validate changes, or decide when removal is safe. Record each created branch, checkout path, and workspace ID. After safe review/integration, use the documented `herdr worktree remove` flow, or intentionally retain and report the worktree. Never force-remove an unintegrated or dirty checkout merely to clean up. The parent owns every lifecycle decision.

## Turn lifecycle and completion

Herdr agent state is attention-aware:

- `working` means a turn is active.
- `blocked` means input, permission, or a decision is needed.
- `done` means completion occurred while unseen.
- `idle` means completion/waiting has been seen.
- `unknown` means classification is uncertain.

For every turn:

1. Confirm the agent reached initial `idle` after launch.
2. Submit exactly one assignment with `herdr pane run`.
3. Confirm start through `working` or unambiguous new-turn/session evidence.
4. Wait with a bounded timeout and inspect `pane get` plus recent unwrapped output on timeout.
5. Accept `idle` or `done` only after start was established.
6. Capture the final response into the handoff.
7. Verify material claims and changes in the parent.

Do not use pane existence, process liveness, or a single stale status as success evidence. Herdr status can be affected by lifecycle integration failures or user attention. When status and the visible/session transcript disagree, treat completion as uncertain and investigate.

For background work, record the pane ID and assignment path, continue only independent parent work, check at natural checkpoints, and resolve every child before finalizing. Background never means fire-and-forget.

## Follow-ups and independence

Reuse a pane/session only for a follow-up on the same role and assignment. Use a new Herdr pane and Pi session ID for a new task, changed perspective, or independent review. Never submit two turns concurrently to the same pane.

Long-running interactive sessions can compact or lose visible history. Keep authoritative decisions and evidence in owning project artifacts, not only terminal scrollback or child memory.

## Owned-resource cleanup

A completed turn does not terminate an interactive agent. Keep its pane for same-assignment follow-ups, then close it after capturing the handoff and verifying its recorded agent name plus terminal/session identity. Confirm closure by requiring a later `pane get` to return `pane_not_found`.

If a pane moved and its public ID changed, resolve the unique recorded agent name, compare current terminal/session identity with the stored metadata, and close only the verified pane. If identity is missing, conflicting, or uncertain, retain and report the pane.

Close a dedicated subagent tab only after every child is closed, no child is retained or running there, the tab contains only its recorded root pane, and `pane process-info` confirms that root remains at its untouched idle shell. Verify tab closure with `tab get`. Never use tab closure to cancel unverified children, and never close the parent's working tab, an unrelated resource, a workspace, a Herdr named session, or the Herdr server as ordinary cleanup.

## Timeouts, cancellation, and failure

Choose explicit budgets: approximately 900 seconds for normal deep work and 1200 seconds for very large reviews/plans unless the task warrants another bound.

On timeout:

1. Inspect `herdr pane get <pane-id>`.
2. Read recent unwrapped output and the Pi session reference.
3. If blocked, identify the exact needed input/approval.
4. If still legitimately working, extend only when useful and record why.
5. If hung or invalid, send `ctrl+c` with `herdr pane send-keys <pane-id> ctrl+c`.
6. If it does not stop, close only the pane created for that child and record the forced cancellation.

On failure, retain enough prompt/handoff/diagnostic evidence to explain it, but do not copy large terminal logs into parent context without need. After two failures for the same cause, stop retrying blindly and seek independent direction or a human decision.

## Result evaluation

The parent must:

- verify high-impact claims against source, tests, or authoritative evidence
- distinguish observed facts from child inference
- deduplicate overlapping findings by root cause
- reject unnecessary complexity and out-of-scope suggestions
- inspect every child-made diff and rerun relevant tests/checks
- document unresolved limitations rather than presenting uncertain work as complete
- close or deliberately retain only the Herdr panes and dedicated subagent tabs created and identity-verified by the workflow
