---
name: implement-plan
description: >-
  Implements a saved plan through to a tested pull request, handing it to an
  agent in its own worktree when possible. Use this skill when the user
  asks to implement, execute, or continue a plan. Do not use for creating a
  plan (use create-plan) or for changes without a plan.
license: MIT
---

# Implement Plan

## Hand off

Inside herdr (`HERDR_ENV=1`), hand the plan to a new agent unless you are the implementer or were told to implement it here (see orchestrate-agents):

1. Create a worktree (see use-worktrees). Copy the plan and ADR into it if they aren't committed.
2. Open the worktree in a new pane of your current herdr workspace (see use-worktrees) and start an agent of your kind there. Never create a new workspace or tab for it. Give it the plan path, any context the plan lacks, and: "You are the implementer. Use implement-plan in this checkout; don't hand off."
3. Step in only when it is blocked or asks something.
4. When it reports its PR, check the branch is fully pushed, quit the agent, close its pane, remove the worktree (see use-worktrees), and report the PR.

Otherwise, implement it yourself.

## Implement

1. Read the plan and its ADR. If something is unclear or looks wrong, ask before building on it.
2. Work through the tasks in order. Build the simplest thing that meets each task, with no extra layers, options, or defensive code for cases that can't happen.
3. Hand complex or parallel tasks to subagents.
4. Add or update tests only where they protect behavior that matters (see awesome-tests).
5. Verify every task yourself before moving on: run the checks the plan names, and check anything with a UI in a real browser with agent-browser. If a check needs a running service or test data, set it up; don't leave testing to the user.
6. Keep the plan file current: mark tasks done and update its status. If you deviate, update the plan, or write a new ADR if the decision changed.
7. When all tasks are done, review the full diff once (see code-review). Fix what solves a real, likely problem, skip what adds more complexity than it removes, and ask the user when unsure.
8. Commit, push, and open a pull request that says what changed and how you verified it.
9. Stop dev servers and close browsers. Leave the worktree to whoever created it.

Report the PR link, how you verified the work, and anything left open.
