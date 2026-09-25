---
name: implement-plan
description: >-
  Implements a saved plan through to a tested, independently reviewed pull
  request, handing it to an agent in its own worktree when possible. Use this
  skill when the user asks to implement, execute, or continue a plan. Do not
  use for creating a plan (use create-plan) or for changes without a plan.
license: MIT
---

# Implement Plan

## Hand off

Inside herdr (`HERDR_ENV=1`), hand the plan to a new agent unless you are the implementer or were told to implement it here (see orchestrate-agents):

1. Create a worktree (see use-worktrees). Copy the plan and ADR into it if they aren't committed.
2. Open the worktree in a new pane of your current herdr workspace (see use-worktrees) and start an agent of your kind there. Never create a new workspace or tab for it. Give it the plan path, any context the plan lacks, and: "You are the implementer. Use implement-plan in this checkout; don't hand off."
3. Step in only when it is blocked or asks something.
4. When it reports every task implemented and verified, start the reviewer the same way, on the same worktree. Tell it the plan path, the implementer's pane, and: "You are the reviewer. Follow implement-plan's Review round and settle findings directly with the implementer. Don't edit files."
5. When the review is settled, quit the reviewer and close its pane. Bring open disagreements to the user.
6. When the implementer reports its PR, check the branch is fully pushed, quit the agent, close its pane, remove the worktree (see use-worktrees), and report the PR.

Otherwise, implement it yourself.

## Implement

1. Read the plan and its ADR. If something is unclear or looks wrong, ask before building on it.
2. Work through the tasks in order. Build the simplest thing that meets each task, with no extra layers, options, or defensive code for cases that can't happen.
3. Hand complex or parallel tasks to subagents.
4. Add or update tests only where they protect behavior that matters (see awesome-tests).
5. Verify every task yourself: run the checks the plan names, and check anything with a UI in a real browser with agent-browser. Set up any service or test data a check needs; don't leave testing to the user.
6. Keep the plan file current. If you deviate, update the plan, or write a new ADR if the decision changed.
7. When all tasks are done, get the review round. If the plan was handed to you, say you're ready and wait for the reviewer; otherwise start one yourself (its own herdr pane, or a subagent outside herdr).
8. Commit, push, and open a pull request that says what changed, how you verified it, and what the review changed.
9. Stop dev servers and close browsers. Leave the worktree to whoever created it.

Report the PR link, the verification, the review's outcome, and anything left open.

## Review round

Every implementation gets one review by an agent that didn't write it, to catch what the author can't see, not to grow the code.

- **Reviewer:** read the plan, the ADR, the full diff and the code it plugs into (see code-review). Run the checks and try to break it as a user would. Report only real, likely problems and removable complexity, each with a concrete failure scenario (or the complexity removed) and a fix. Skip niche edge cases, speculative hardening and style preferences.
- **Implementer:** judge each finding instead of accepting it. Fix what is real with the simplest fix; reject, with a reason, fixes that add more complexity than the problem is worth.
- Settle findings in direct discussion; unresolved ones go to the user. Review again only after substantial fixes.
