---
name: create-plan
description: >-
  Creates, reviews, and improves lean implementation plans through orchestrated
  research, evidence-backed synthesis, and iterative independent review closure.
  Use this skill when the user asks to plan a feature or change, create an
  implementation handoff, or review or improve an unimplemented plan before
  coding. Do not use to implement a plan, audit completed implementation against
  a plan, or answer a small conceptual question that needs no implementation handoff.
license: MIT
compatibility: >-
  Requires project file access. Saving requires write access. Current external
  research requires suitable retrieval access. Delegation and independent review
  require a safely available subagent capability.
metadata:
  short-description: Create lean plans through orchestrated research and review
---

# Create Plan

## Mandatory resources and output

1. Before drafting or revising, load and adapt [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md). Preserve its required semantic core: outcome and boundaries, key files/evidence/decisions, stable tasks, and final acceptance. Remove guidance, comments, placeholders, and every optional field that adds no information. Never plan from a remembered format.
2. Before finalizing, load and complete [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md). Repeat it after material edits.
3. If either resource cannot be loaded, stop. Do not invent a substitute.

Do not implement the change. When writes permit, save only the Markdown plan under `.plans/<descriptive-kebab-case-name>.md` and any distinct `.reviews/<descriptive-slug>-decomplex.md` reports required by the focused checkpoints below. Do not write implementation artifacts or overwrite unrelated work. For chat-only or no-write work, return the plan in chat and state why it was not saved.

## Planning standard

- Create a distilled handoff that a fresh implementer can execute without repeating core research.
- Cite only inspected files, symbols, tests, documents, and authoritative external sources. Include every key local file used during planning briefly in the plan's key-files table, together with why it matters and its plan impact.
- Treat task file lists as non-exhaustive starting points. Require implementation-time discovery of coupled callers, tests, fixtures, config, schemas, generated files, docs, and consumers once, without repeating that policy in every task.
- Keep stable task IDs. Every task must state the required change, starting paths or narrow search targets, and observable verification with exact checks and expected signals.
- Put tests beside the behavior they protect. Include exact contracts, dependencies, risks, recovery, migration, rollout, security, observability, and operator actions only where material.
- Keep the requested outcome central. Prefer the smallest design that solves the evidenced problem; omit speculative scope, abstractions, packages, compatibility layers, phases, safeguards, and tests.
- Ask the user when evidence cannot resolve a material scope, behavior, architecture, migration, risk, or complexity choice.
- The parent owns scope, synthesis, plan writes, finding dispositions, and delivery. Child handoffs and reviewer verdicts are evidence, never acceptance.

## Workflow

### 1. Establish scope without growing parent context

- The parent first reads only authoritative repository instructions, the request, mandatory resources, and relevant existing plan decisions. Frame the outcome, scope, non-goals, unresolved questions, risks, and validation expectations before detailed exploration.
- Do not deeply inspect source, tests, config, schemas, docs, migrations, generated artifacts, or external behavior in the parent when a bounded safe research lane can inspect them.
- Record the key local files that materially informed planning. Do not turn the plan into a complete file inventory.

### 2. Orchestrate research

Enumerate repository and external-research questions. Delegate every bounded non-trivial question when a safe capability exists. Independent questions may run in parallel; dependencies use one blocking or awaited child, then parent verification before the next question. Parallelism changes scheduling, not delegation eligibility.

Use exactly one runtime path: active native `subagent_*` tools plus their runtime skill; otherwise `use-pi-subagents`; otherwise generic `use-subagents` with the host's actual safe capability. Never co-activate competing runtime adapters. Parent inspection is limited to genuinely atomic mechanics with no research or behavior decision, explicit user prohibition, or unavailable/unsafe capability; required non-trivial research without a safe capability is blocked or escalated rather than silently absorbed by the parent.

- Give each lane one question, exact scope, evidence requirements, stop condition, and task-relevant context; prohibit edits and recursive delegation.
- Require concise decision-grade handoffs with evidence pointers, uncertainty, and material skips—not reasoning transcripts, raw logs, or routine process narration.
- Research external behavior only when it is decision-relevant, current, version-sensitive, security-sensitive, or not established locally. Prefer authoritative, version-matched sources.
- Verify acceptance-critical claims and material evidence pointers without repeating the child's full exploration. Scope, architecture, synthesis, plan writing, finding dispositions, and acceptance remain parent-owned; report material fallbacks at delivery.

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

For a tiny draft, unavailable skill, or unavailable report write, apply the built-in simplicity gate and record the fallback at delivery. Do not add a plan section or fake report merely to document that the pass did not run. If later review revisions materially change structural choices, rerun a scoped Prevention pass before closure.

### 6. Review to closure and deliver

For consequential plans, commission a bounded set of fresh independent read-only reviewers using the current plan-quality checklist. Give them the request, draft, assigned dimensions, key evidence, decisions, constraints, risks, unresolved questions, and any decomplex reports; prohibit edits and recursion. One reviewer may suffice; use complementary reviewers when breadth, risk, or specialist depth justifies them, and never add one merely to seek agreement. Collect all initial handoffs before sharing conclusions. Require stable finding IDs and `Clear`, `Changes required`, `Human decision required`, or `Blocked`; `Clear` means no unresolved material concern in assigned scope after considering parent and user evidence, not acceptance of every recommendation. For small plans or unavailable independent review, perform the checklist directly and report the independence limit.

The parent verifies, deduplicates, and dispositions every finding as `Accept`, `Validate`, `Reject`, `Ask user`, or `Block`. Reviewer findings and decomplex advice never create plan work automatically. Before accepting a complexity-increasing remedy, use decomplex Finding triage when available and proportionate; separate a valid concern from an overbuilt proposal and prefer the smallest evidence-backed change.

Apply only accepted changes, rerun affected checks, then return revisions, validation, and evidence-backed rejections to the originating reviewers with open findings—or a replacement with complete lineage when unavailable. Follow-ups cover those findings, affected plan sections, and revision-caused or revision-exposed issues—not a reopened broad review. Repeat until every commissioned reviewer is `Clear`. A human answer is authoritative evidence returned for reviewer closure, not a substitute for it.

On material uncertainty or persistent disagreement, or after two unsuccessful revision rounds for one root cause, recurrence after a claimed resolution, or no meaningful progress, ask the user with evidence and options. Keep the review ledger outside the plan unless a finding creates an implementation decision, task, or gate. Complete the checklist after material revisions, then save or return the plan and report its path or no-write reason, delegated lanes and parent fallbacks, review closure, decisions, skipped work, and remaining risks.
