---
name: implement-plan
description: >-
  Implements a saved plan task by task, with tests, verification, and cleanup.
  Use this skill when the user asks to implement, execute, or continue a plan.
  Do not use for creating a plan (use create-plan) or for changes without a plan.
license: MIT
---

# Implement Plan

1. Read the plan and its ADR. If something is unclear or looks wrong, ask before building on it. If the user wants the work isolated, use a worktree (see use-worktrees).
2. Work through the tasks in order. Build the simplest thing that meets each task, with no extra layers, options, or defensive code for cases that can't happen.
3. Outsource tasks to subagents when working on more complex tasks or parallel tasks.
4. Add or update tests only where they protect behavior that matters (see awesome-tests). Don't write tests just for the sake of having them.
5. Verify every task before moving on. Run the checks the plan names, and check anything with a UI in a real browser with agent-browser.
6. Keep the plan file current: mark tasks done and update the plan's status. If you have to deviate, update the plan, or write a new ADR if the decision changed. Don't diverge silently.
7. When all tasks are done, review the full diff (see code-review). Question each finding: fix what solves a real, likely problem, skip what adds more complexity than it removes, and ask the user when unsure. Do one review pass, not repeated rounds.
8. Clean up: stop dev servers, close browsers, and remove the worktrees you created once their work is merged.

Finish by reporting what changed, how you verified it, and anything left open.
