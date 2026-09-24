---
name: code-review
description: >-
  Reviews code changes and codebases for real defects and unnecessary
  complexity. Use this skill when asked to review a diff, branch, codebase, or
  completed implementation, or to check work against its plan. Do not use for
  an HTML walkthrough of a pull request (use pr-review) or for planning.
license: MIT
---

# Code Review

## Stance

- Review only what was asked. If the scope is unclear, ask.
- Look hard, report little. Try to break the code with realistic inputs, states, and sequences. Challenge the work, not its author.
- "Nothing worth changing" is a valid result. A short review is a good review.
- Don't edit code unless asked.

## What counts as a finding

Report something only if all of these hold:

- There is a concrete way it fails or causes harm.
- That can realistically happen.
- The impact on users, data, security, or maintenance is real.
- Fixing it removes more risk or complexity than the fix adds.

Never report niche edge cases, hypothetical scale, style preferences, duplication that hurts nothing, the number of helpers or files, or ideas for making things "more flexible".

## Where to look

Check what applies to the change:

- **Correctness:** wrong assumptions, error handling, races and async order, state and cleanup, and refactors that lost behavior.
- **Security:** authentication and authorization, injection, trusting client input, and secrets or personal data in code, logs, or URLs.
- **Libraries:** check behavior against the installed version's types and docs, not memory.
- **Tests:** do they protect behavior that matters? Flag missing coverage of real behavior, assertions on implementation details, excessive mocking, and tests that pass without proving anything. Don't ask for tests for their own sake.
- **Data and APIs:** breaking changes, migrations, and retries of side effects that aren't safe to repeat.
- **UI:** when practical, exercise the changed screens in a real browser with agent-browser.
- **Complexity:** unnecessary layers and wrappers, one-use helpers, speculative options or generic APIs, and defensive code for cases that can't happen. Prefer, in order: delete, use directly, local helper, shared abstraction, new abstraction.
- **Plan and ADR:** if the change implements a plan, report plan tasks that are missing or unverified, and conflicts with an accepted ADR.

## Report

Report findings in chat, most severe first. For each finding, give its severity (high, medium, or low), its `file:line`, what goes wrong and when, and the smallest fix. Skip nits. If there are many minor issues, summarize them in one line instead of listing them.
