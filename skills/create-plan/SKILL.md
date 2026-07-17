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
  research requires suitable retrieval access. Delegated work requires a safely
  available subagent capability.
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
- Ask only when a consequential decision cannot be inferred safely. Otherwise choose a reversible default, label it, and state the fallback.

## Workflow

### 1. Establish scope

- Read repository instructions and existing plans.
- Inventory requested outcomes, current problems, constraints, non-goals, open decisions, risks, and validation expectations.
- Identify the code, tests, configuration, documentation, and runtime surfaces that may participate.

### 2. Explore and research thoroughly

Before drafting:

- Trace relevant local code end to end. Inspect definitions, callers, consumers, tests, fixtures, config, schemas, migrations, generated artifacts, docs, and nearby patterns.
- Resolve integration boundaries, data/control flow, failure behavior, compatibility, rollout or migration needs, and available repository checks.
- Research decision-relevant external contracts when behavior is third-party, version-sensitive, current, security-sensitive, or not established locally. Prefer authoritative, version-matched sources.
- Deliberately compare viable approaches for correctness, project fit, simplicity, risk, migration cost, and testability. Record the chosen approach and concise reasons; retain meaningful rejected options in the plan.
- Continue until each material finding drives a decision, task, safeguard, check, non-goal, or explicit unresolved gate.

Unavailable credentials or live services do not justify vague planning. Use documented contracts, fail-closed configuration, fakes, and explicit operator steps where appropriate.

### 3. Consider safe parallel work

For non-trivial planning, strongly consider safe subagents for separable exploration, research, or review. Read `use-subagents` before using them. Do not delegate synthesis, final decisions, or acceptance.

| Reasonable lane | Parent-owned synthesis |
|---|---|
| Trace one bounded subsystem and its tests | Integrate cross-system behavior and scope |
| Check one external contract or version | Compare approaches and choose the design |
| Review the complete draft against supplied evidence | Verify findings, resolve comments, and finalize |

Give each lane exact questions, scope, constraints, and expected evidence. Require inspected files or sources, findings, uncertainty, and skipped work. The parent independently checks material claims, consolidates the evidence, and owns the final plan. Use direct work when delegation is unsafe, unavailable, inseparable, trivial, prohibited, or disproportionate.

### 4. Draft the fixed plan

Load and copy the template again. Preserve its required order and fields.

- Use one phase when sufficient. Add phases only for real dependencies, migrations, rollout, delivery boundaries, or independently verifiable outcomes.
- Make every phase executable and green, including discovered integrations.
- State phase risks, safeguards, and concrete recovery. Use the template's exact no-material-risk wording only after investigation.
- Keep essential evidence and decisions in the plan, not only in chat or research notes.
- Use short sentences, bullets, and useful tables. Remove investigation narrative and generic advice.

### 5. Review and deliver

- Complete the semantic checklist. Check every source, path, command, dependency, acceptance signal, and required template field.
- For consequential plans, use a fresh independent reviewer when safely available and proportionate. Give the reviewer the request, full draft, sources, decisions, constraints, risks, and unresolved questions.
- Verify reviewer claims. Record accepted, rejected, and deferred findings; fix material gaps; then repeat affected checks and the checklist.
- Plan focused phase validation and authoritative final validation. Include review focus, evidence, exit conditions, and reruns without duplicating an equivalent implementation workflow.
- Save or return the Markdown plan. Report its path or no-write reason, assumptions, unresolved gates, skipped research or review, and remaining risks.
