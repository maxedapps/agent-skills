---
name: agent-reviewer
description: Orchestrates independent AI reviewer agents in visible Herdr panes for deep critique, multi-round feedback, and autonomous collaboration. Use when a task needs another agent to review code, plans, research, architecture, decisions, investigations, or final work. Do not use for ordinary self-review, outside a Herdr-managed session, or when the user forbids agent review.
compatibility: "Requires the use-subagents skill prerequisites: Herdr 0.7.3+, HERDR_ENV=1, and an available interactive reviewer executable."
metadata:
  short-description: Coordinate independent AI reviewer agents with deep multi-round feedback
---

# Agent Reviewer

## Instruction priority

Follow explicit user constraints and higher-priority system/developer instructions. If the user specifies a reviewer agent, model, CLI, or tool, launch it in a Herdr pane when available and safe. If it cannot run through Herdr, report the review as blocked rather than using a hidden or headless reviewer.

## Core rules

- Prefer fresh-context reviewer agents. Use existing context only for follow-up rounds with the same reviewer.
- Before launching any reviewer agent, read and apply the `use-subagents` skill. Every reviewer must run interactively in a visible Herdr pane; use the user-specified reviewer first, otherwise launch a fresh Pi reviewer pane.
- Ask reviewers to inspect independently, form their own opinion, and do in-depth checks. Do not ask for approval or confirmation.
- Give helpful context and clear tasks, but do not bias reviewers toward your current solution.
- Tell reviewers not to modify files unless edits are explicitly requested.
- Support multiple rounds: after applying feedback, return to the same reviewer/session when possible and ask whether concerns are resolved and whether new issues were introduced.
- Keep raw reviewer assignments and captured responses in `.subagents/` per `use-subagents`. Record reviewer choice, session/thread IDs, synthesized findings, fixes, rejected feedback with reasons, unresolved concerns, and validation in the active progress tracker or plan progress notes.
- Use long timeouts for deep reviews: default 900 seconds; use 1200 seconds for large codebases/plans. Run a reviewer in the background only as a tracked Herdr pane; monitor its status and captured handoff through the `use-subagents` workflow until completion, failure, cancellation, or an explicitly reported still-running state.
- Keep reviewer invocations read-only by default across tools. If a reviewer runtime supports acceptance gates, CI gates, or autonomous fix modes, disable them for ordinary read-only critique unless the user specifically requested that gate.
- Forbid package-manager commands that may mutate manifests, lockfiles, workspace metadata, or install state during read-only reviews; prefer reading package files or commands known to be side-effect-free, and verify `git status` afterward. Some seemingly informational commands can rewrite workspace metadata.
- Keep subagent/reviewer prompts scoped enough to finish. Prefer several focused reviewers over one broad “review everything” prompt; name target files/subsystems and add runtime budgets such as `toolBudget`, `turnBudget`, CLI timeouts, or equivalent controls when available.
- Do not send secrets, tokens, credentials, private session data, or unnecessary sensitive content.

## Reviewer selection

1. **User-specified reviewer**: launch the exact requested interactive agent/tool in a visible Herdr pane, if available and safely permissioned.
2. **Default reviewer**: launch a fresh-context Pi reviewer pane through `use-subagents` with read-only tools and a role matching the task.
3. **Unavailable reviewer**: if Herdr or the requested interactive reviewer is unavailable, record the review as blocked. Ask the user whether to proceed without independent review; never substitute a hidden, headless, or non-Herdr reviewer.

## Prompt requirements

Give reviewers enough context to work independently:

- exact review task and desired output
- user request, constraints, non-goals, and acceptance criteria
- project path and whether the reviewer may inspect files directly
- relevant progress note or plan tracker path
- target files, plan sections, research questions, architecture decisions, or implementation steps
- touched files and diffs; include untracked file contents or `git diff --no-index /dev/null <file>` output when needed
- tests/validation run and results, plus skipped checks with reasons
- known assumptions, risks, deviations, blockers, and unresolved questions
- instruction to read relevant files/call sites/tests/config/docs independently where possible
- instruction to state limitations if filesystem/tools/source access is unavailable
- instruction to be critical: find bugs, missed requirements, weak evidence, regressions, security/performance/test gaps, complexity, and better alternatives
- instruction not to edit files unless explicitly intended

Avoid prompt wording like “confirm this is good”. Present your own reasoning only as context, not as the desired conclusion.

For subagent or external-CLI reviewer prompts, also include operational bounds when the scope is non-trivial:

- “Do not modify files.” unless edits are explicitly allowed.
- Exact files, directories, plan sections, or diff areas to inspect first.
- Whether broad repository scans, full test suites, or package installs are allowed.
- A concise output shape: concrete findings with severity and file/line references, or “no blockers found”.
- A stop rule such as “finish within the timeout; if scope is too large, report the highest-confidence findings and gaps instead of expanding the search.”

Runtime settings:

- Apply the `use-subagents` skill's Herdr preflight, read-only defaults, pane/session tracking, handoff capture, timeout, and focus rules.
- For a user-specified external CLI, use read-only/sandbox flags when available, set a shell timeout, and ask for concise findings instead of autonomous fix or acceptance-gate output unless that workflow is explicitly required.

## Review loop

1. **Prepare**: decide review scope, choose reviewer, write a clear prompt, and record the review start in progress notes.
2. **Launch**: use a fresh reviewer context for the first pass. Follow `use-subagents`; use a 900–1200 second timeout and choose foreground or tracked background mode based on whether the result blocks parent work.
3. **Evaluate**: read feedback critically. Accept valid issues, reject weak suggestions with reasons, and look for the underlying concern behind imperfect recommendations.
4. **Act**: revise code/plan/research or record why no change is needed. Rerun relevant validation when changes are material.
5. **Follow up**: submit the follow-up to the same Herdr reviewer pane/session when possible. If that pane/session is no longer usable, launch a fresh Herdr reviewer pane and include prior feedback, actions taken, revised state, and validation.
6. **Stop condition**: continue rounds until no material concerns remain, remaining disagreements are documented, or a human decision is required.

## Output to the main task

Summarize:

- reviewer used and session/thread ID when available
- whether the run was foreground or async, plus timeout/budget/acceptance settings when they affected reliability
- material findings
- fixes/revisions made
- rejected/deferred feedback with reasons
- unresolved concerns or user decisions needed
- validation rerun after material changes
