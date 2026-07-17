---
name: create-plan
description: >-
  Creates, reviews, and improves research-backed implementation plans with
  problem-led phases and stable, actionable tasks. Use this skill when the user
  asks to plan a feature or change, create an implementation handoff, or review
  or improve an unimplemented plan before coding. Do not use to implement a plan,
  audit completed implementation against a plan, or answer a small conceptual
  question that needs no implementation handoff.
license: MIT
compatibility: >-
  Requires project file access. Saving requires write access. Current external
  research requires suitable retrieval access. Non-trivial planning requires a
  safely available subagent capability.
metadata:
  short-description: Create or improve actionable implementation plans
---

# Create Plan

## Mandatory resources and output

1. Before drafting or revising, load, copy, and adapt [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md). Keep every required heading and task field. Replace all guidance and examples. Never plan from a remembered format.
2. Before finalizing, load and complete [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md). Repeat the semantic review after material edits.
3. If either resource cannot be loaded, stop. Do not invent a substitute.

Do not implement the change. When writes permit, save only the Markdown plan under `.plans/<descriptive-kebab-case-name>.md`. Do not overwrite unrelated work. For chat-only or no-write work, return the plan in chat and state why it was not saved.

## Planning standard

- Create a distilled handoff that a fresh implementer can execute without repeating core research.
- Cite only inspected files, symbols, tests, documents, and authoritative external sources. Never invent paths, commands, contracts, or evidence.
- Keep file lists as non-exhaustive starting points. Require implementation-time discovery of coupled callers, tests, fixtures, config, schemas, generated files, docs, and consumers.
- Keep task IDs stable when tasks move or gain detail.
- Put tests beside the behavior they protect. Give exact checks, expected signals, and evidence to retain.
- Include short contract snippets only when an API, schema, query, config, protocol, CLI, type, or state transition needs an exact target shape.
- Cover compatibility, failure behavior, migration, rollback, cleanup, security, observability, and operator actions where material.
- Keep the user’s requested outcome at the center. Research and review may broaden understanding, but must not broaden scope without a current, evidenced need.
- Before adding any task, phase, abstraction, safeguard, or test, ask whether it is necessary to deliver that outcome now and whether a simpler, narrower option would suffice. Omit or simplify it when not justified.
- Plan for the project’s observed requirements, not hypothetical scale, future flexibility, or niche scenarios unless the user or repository makes them relevant.
- **Avoid complexity at all cost. If in doubt, ask the user.**

## Workflow

### 1. Establish scope

- Read repository instructions and existing plans.
- Inventory requested outcomes, current problems, constraints, non-goals, open decisions, risks, and validation expectations.
- Identify the code, tests, configuration, documentation, and runtime surfaces that may participate.

### 2. Run dedicated exploration and research

For every non-trivial plan, launch **multiple dedicated subagents** before drafting. Load `use-subagents` when available; otherwise follow the runtime's reviewed subagent guidance.

| Required lane | Reasonable split |
|---|---|
| Local code exploration | Subsystems, call paths, data flow, tests, migrations, runtime or operational boundaries |
| Decision-relevant research | External API/framework versions, standards, security contracts, compatibility or deployment behavior |

- Use at least two exploration/research lanes. Split local exploration further when external research is not relevant.
- Give each lane one bounded question, exact scope, constraints, evidence requirements, and stop condition.
- Require inspected paths or authoritative sources, findings, uncertainty, and skipped work.
- Prohibit edits and recursive delegation.
- Keep synthesis, scope, design choices, and final acceptance in the parent.

If safe subagents are unavailable, prohibited, or cannot cover the required work, stop and ask the user whether to proceed with reduced independence. Do not silently replace required lanes with direct work.

### 3. Synthesize and decide

- Read every handoff. Verify material claims against local code or authoritative sources.
- Fill coverage gaps across definitions, callers, consumers, tests, fixtures, config, schemas, migrations, generated artifacts, docs, and nearby patterns.
- Resolve integration boundaries, data/control flow, failure behavior, compatibility, rollout, recovery, and repository checks.
- Compare viable approaches for correctness, project fit, simplicity, risk, migration cost, and testability.
- Prefer the smallest design that solves the evidenced problems.
- Map each material finding to a decision, task, safeguard, check, non-goal, or unresolved gate.
- Ask the user when alternatives change scope, behavior, architecture, risk, migration, or long-term complexity and evidence does not decide clearly.

Unavailable credentials or live services do not justify vague planning. Use documented contracts, fail-closed configuration, fakes, and explicit operator steps where appropriate.

### 4. Draft the fixed plan

Load and copy the template again. Preserve its required order and fields.

- Use one phase when sufficient. Add phases only for real dependencies, migrations, rollout, delivery boundaries, or independently verifiable outcomes.
- Make every phase executable and green, including discovered integrations.
- State phase risks, safeguards, and concrete recovery. Use the template's exact no-material-risk wording only after investigation.
- Before finalizing, re-evaluate every planned task against the assigned outcome. Remove, merge, or simplify tasks whose value does not justify their complexity.
- Keep essential evidence and decisions in the plan, not only in chat or research notes.
- Use short sentences, bullets, and useful tables. Remove investigation narrative and generic advice.

### 5. Review and deliver

Use a **fresh read-only reviewer subagent** for every non-trivial plan. The reviewer must not be an exploration/research lane and must not delegate.

Give it the request, full draft, lane handoffs, sources, decisions, constraints, risks, and unresolved questions. Require evidence-backed findings and the smallest proportionate improvement.

| Parent disposition | Action |
|---|---|
| **Accept** | Evidence-backed, in scope, and simpler or proportionate; update the plan. |
| **Validate** | Check a claim before changing the plan. |
| **Reject** | Unsupported, out of scope, duplicate, or complexity-increasing. Record why. |
| **Ask user** | Scope, behavior, architecture, risk, migration, or complexity choice remains unclear. |

- Evaluate every finding critically. Reviewer output is advice, not authority.
- Do not add speculative abstractions, packages, phases, compatibility layers, or future scope.
- After accepted changes, allow one focused follow-up on those changes only. Do not reopen broad review.
- Complete the semantic checklist after review changes.
- Plan focused phase and final validation without duplicating the implementation workflow.
- Save or return the Markdown plan. Report its path or no-write reason, user decisions, rejected/deferred findings, skipped work, and remaining risks.
