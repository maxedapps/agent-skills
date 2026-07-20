---
name: create-plan
description: >-
  Creates, reviews, and improves lean, research-backed implementation plans with
  key-file evidence and stable, actionable tasks. Use this skill when the user
  asks to plan a feature or change, create an implementation handoff, or review
  or improve an unimplemented plan before coding. Do not use to implement a plan,
  audit completed implementation against a plan, or answer a small conceptual
  question that needs no implementation handoff.
license: MIT
compatibility: >-
  Requires project file access. Saving requires write access. Current external
  research requires suitable retrieval access. Delegation and independent review
  require a safely available subagent capability.
metadata:
  short-description: Create or improve lean implementation plans
---

# Create Plan

## Mandatory resources and output

1. Before drafting or revising, load and adapt [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md). Preserve its required semantic core: outcome and boundaries, key files/evidence/decisions, stable tasks, and final acceptance. Remove guidance, comments, placeholders, and every optional field that adds no information. Never plan from a remembered format.
2. Before finalizing, load and complete [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md). Repeat it after material edits.
3. If either resource cannot be loaded, stop. Do not invent a substitute.

Do not implement the change. When writes permit, save only the Markdown plan under `.plans/<descriptive-kebab-case-name>.md` and, when the focused checkpoint below runs, its distinct `.reviews/<descriptive-slug>-decomplex.md` report. Do not write implementation artifacts or overwrite unrelated work. For chat-only or no-write work, return the plan in chat and state why it was not saved.

## Planning standard

- Create a distilled handoff that a fresh implementer can execute without repeating core research.
- Cite only inspected files, symbols, tests, documents, and authoritative external sources. Include every key local file used during planning briefly in the plan's key-files table, together with why it matters and its plan impact.
- Treat task file lists as non-exhaustive starting points. Require implementation-time discovery of coupled callers, tests, fixtures, config, schemas, generated files, docs, and consumers once, without repeating that policy in every task.
- Keep stable task IDs. Every task must state the required change, starting paths or narrow search targets, and observable verification with exact checks and expected signals.
- Put tests beside the behavior they protect. Include exact contracts, dependencies, risks, recovery, migration, rollout, security, observability, and operator actions only where material.
- Keep the requested outcome central. Prefer the smallest design that solves the evidenced problem; omit speculative scope, abstractions, packages, compatibility layers, phases, safeguards, and tests.
- Ask the user when evidence cannot resolve a material scope, behavior, architecture, migration, risk, or complexity choice.

## Workflow

### 1. Establish scope and inspect the repository

- Read repository instructions, relevant existing plans, source, tests, config, schemas, docs, migrations, generated artifacts, and nearby patterns.
- Inventory the requested outcome, current problem, scope, non-goals, decisions, risks, and validation expectations.
- Record the key local files that materially informed planning. Do not turn the plan into a complete file inventory.

### 2. Research proportionately

Use direct inspection for small or tightly coupled work. Use one or more bounded subagents when fresh context, independence, expertise, or parallel exploration materially improves the plan; use multiple lanes only for genuinely separable questions. Load `use-subagents-dynamic` when available, otherwise the legacy `use-subagents` fallback, and never load both.

- Give each lane one question, exact scope, evidence requirements, and stop condition; prohibit edits and recursive delegation.
- Research external behavior only when it is decision-relevant, current, version-sensitive, security-sensitive, or not established locally. Prefer authoritative, version-matched sources.
- Verify material handoff claims directly. Keep synthesis, scope, design choices, and acceptance in the parent.
- If independent work is unavailable or disproportionate, proceed directly and report the limitation; do not manufacture lanes.

### 3. Synthesize the smallest viable plan

- Resolve data/control flow, integration boundaries, compatibility, failure behavior, migration or rollout, recovery, and repository checks.
- Compare viable approaches only when the choice changes implementation. Preserve rejected alternatives only when they prevent reopening a consequential decision.
- Map each material finding to a decision, task, safeguard, check, non-goal, or unresolved gate.
- Re-evaluate every task and phase. Remove, merge, or simplify work whose value does not justify its complexity.

Unavailable credentials or live services do not justify vague planning. Use inspected contracts, fail-closed configuration, fakes, and explicit operator steps where appropriate.

### 4. Draft the lean handoff

Load and adapt the template again.

- Use a flat `Tasks` section for small plans. Add phases only for real dependencies, migrations, rollout, delivery boundaries, or independently verifiable outcomes; each phase must finish green.
- Keep the key-files table brief but include key implementation starting points and every key local file that informed planning. Include external sources only when they impose a decision or constraint.
- Omit `Depends on`, exact shapes, risks/recovery, phase exits, exceptional review checkpoints, deferrals, and non-goals when they add no information.
- Do not repeat the same problem, approach, check, risk, or completion rule across plan, phase, task, and final sections.
- Keep planning provenance—lane IDs, parent-verification narrative, review ledgers, and routine finding dispositions—out of the implementation handoff. Report it at delivery unless it changes implementation.

### 5. Prevent complexity when proportionate

For a non-trivial draft with meaningful architecture, dependency, configuration, fallback, concurrency, rollout, compatibility, or abstraction choices, use `decomplex` in Prevention mode when available and its required report can be written. The planner owns every recommendation and accepts only evidence-backed, in-scope simplifications.

For a tiny draft, unavailable skill, or unavailable report write, apply the built-in simplicity gate and record the fallback at delivery. Do not add a plan section or fake report merely to document that the pass did not run.

### 6. Review and deliver

Use a fresh read-only reviewer for consequential plans when safe and proportionate. Give it the request, draft, key evidence, decisions, constraints, risks, unresolved questions, and any decomplex report. For small plans or unavailable independent review, perform the checklist directly and report the independence limit.

Evaluate each finding as `Accept`, `Validate`, `Reject`, or `Ask user`. Update the plan only for accepted, evidence-backed, proportionate findings; use at most one focused follow-up on accepted changes. Keep the review ledger outside the plan unless a finding creates an implementation decision, task, or gate.

Complete the checklist, save or return the plan, and report its path or no-write reason, research/review used, material decisions, rejected or deferred findings, skipped work, and remaining risks.
