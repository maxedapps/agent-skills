---
name: create-plan
description: >-
  Plans a change as an ADR that records the decision, plus an implementation
  plan that belongs to it. Use this skill when the user asks to plan a feature
  or change, or to revise an existing plan or ADR. Do not use for implementing
  a plan (use implement-plan) or for small changes that involve no real decision.
license: MIT
---

# Create Plan

Plan only; don't implement.

## Files

Decisions and their plans live together in the project's `adrs/` folder. If the project already uses a different ADR layout, follow it.

- `adrs/NNNN-<slug>.md`: the decision. Use the next free number and never renumber.
- `adrs/NNNN-<slug>.plan.md`: the plan that implements that decision.

Small changes that involve no real decision need neither. Just do them, or agree on the approach in chat.

## The ADR

Keep it short, usually under a page:

- **Status:** Proposed, Accepted, or Superseded by NNNN
- **Context:** the problem and its constraints
- **Decision:** what we'll do
- **Alternatives:** always include the simplest option that could work, and say why it was or wasn't chosen
- **Consequences:** the trade-offs we accept

Write new ADRs as Proposed. Mark one Accepted only when the user approves it. When a decision changes, write a new ADR that supersedes the old one instead of rewriting accepted history.

## The plan

- **Status:** Draft, Ready, In progress, or Done
- **Goal:** what's done when we're done, and what's out of scope
- **Tasks:** in order. For each task, say what changes and where to start, how to verify it, and whether it's done. Verification means the high-value tests to add or run, plus manual checks where they matter (e.g. agent-browser for UI).
- **Open questions:** anything the user must decide

## Keep it simple

- Research the code and docs as much as the plan needs, and no more.
- Pick the simplest design that meets the goal. Add no speculative options, fallbacks, abstractions, or "later" tasks.
- Before saving, remove every task that doesn't serve the goal.
- When a choice about scope, behavior, or architecture is genuinely ambiguous, ask the user instead of guessing.
- Challenge every piece of feedback on a plan: does it fix a real, likely problem, or does it just add complexity? When unsure, ask the user.
