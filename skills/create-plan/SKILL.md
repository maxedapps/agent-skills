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
  Requires project file access. Saving requires write access; structural
  validation requires Node.js 18+. Bun is optional for rich HTML rendering. Current
  external research requires suitable search/retrieval access. Delegated
  research and review require a safely available subagent capability.
metadata:
  short-description: Create or improve actionable implementation plans
---

# Create Plan

## Mandatory resources and output

1. **Before drafting or revising a plan, read and copy [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md).** Every non-conditional section and exact task field is required; do not use a remembered format.
2. **Before draft review and finalization, read [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md).** Complete it, then repeat it after material revisions.
3. **For every saved plan, run [`scripts/validate-plan-structure.mjs`](scripts/validate-plan-structure.mjs)** before review and after material revisions. Structural success does not replace semantic review.

If a mandatory resource cannot be loaded, stop rather than inventing it. Follow explicit user and higher-priority constraints; record meaningful workflow deviations. Do not implement the planned change.

Always save the finished Markdown plan to `.plans/<descriptive-kebab-case-name>.md` when writes are permitted, without overwriting unrelated work. A no-write or explicit chat-only constraint keeps the plan in chat and records that persistence and structural CLI validation were unavailable.

## Planning contract

- Produce a complete but distilled handoff. The required top-level structure is `Problems`, `Implementation summary`, `Conducted research and relevant sources`, `Scope and non-goals`, and `Decisions and constraints`, followed by numbered phases, final validation/review, and observable Definition of Done.
- Every phase states problems addressed, a concise implementation summary, titled stable-ID tasks, risks/safeguards/recovery, and phase validation/review. One phase is valid; add phases only for meaningful dependency, migration/rollout, delivery, or independently verifiable boundaries.
- Every task provides an actionable description, **Relevant files — non-exhaustive starting points**, dependencies, and acceptance/verification with exact expected evidence. Include task-local risks where they matter.
- File lists are discovery starts, never closed allowlists. Require implementers to inspect and add coupled callers, tests, fixtures, config, schemas, generated files, docs, and downstream consumers found during implementation.
- Keep detailed inventories, source evaluation, alternatives, and reviewer discussion in planning memory. Keep every essential finding, decision, action, safeguard, and check in the plan so a fresh implementer need not reconstruct chat or repeat core research.
- Cite only inspected local artifacts and authoritative external sources. Use exact paths and symbols; if a path is unknowable, provide a narrow search pattern and require resolution before editing. Never invent artifacts, commands, or evidence.
- Include short critical-shape snippets only for material API, type, schema, query, config, CLI, protocol, or state-machine contracts. Use at least one useful table and prefer concise imperative lists.
- State non-obvious decisions, status, and brief implementation reason. Put compatibility, failure, migration, rollback, cleanup, security, observability, and operator behavior where they affect a task or phase. Use `None material for this phase` only when no material phase risk exists.
- Ask only when material scope, behavior, security, data, compatibility, migration, or irreversible decisions cannot be inferred safely. Otherwise choose and label a reversible default with a fallback.

## Delegation and research policy

For non-trivial planning, actively identify and launch at least one meaningful separable codebase-scouting or external-research lane when a safe capability exists. Use parallel lanes only for non-overlapping questions. Read `use-subagents` before delegation and preserve its scope, isolation, lifecycle, and parent-verification rules.

Each lane receives exact questions, scope, sources, constraints, and output expectations. Require a sourced terminal handoff listing files/sources inspected, findings, uncertainty, and skipped work. Independently inspect evidence and verify material claims before adopting them.

Direct substantive research is a fallback only when a concrete reason is recorded: trivial scope, inseparability, unavailable or unsafe capability, user prohibition, or coordination cost disproportionate to the bounded question. “Faster” alone is not a reason. Research third-party, version-sensitive, or current contracts through `web-research` rather than memory.

Create or reuse `.progress/<plan-slug>.md` early for substantive, multi-source, resumable, conflict-heavy, or high-risk planning. Record goals, scope, constraints, source details, alternatives, open questions, delegation handoffs, and review dispositions. Genuinely small planning may omit separate memory; a no-write request must omit it. In both cases preserve answer-critical research and decisions in the plan itself.

## Workflow

### 1. Establish scope and evidence strategy

- Inspect relevant source, tests, config, docs, current plans/progress/reviews, repository instructions, and nearby patterns.
- Inventory requirements, affected outcomes, dependencies, risks, decisions, validation, and likely coupled surfaces.
- Decide and record planning-memory and delegation strategy, including a concrete allowed fallback where applicable.

### 2. Research until implementation choices are supportable

- Resolve local architecture, integration boundaries, external contracts, failure behavior, compatibility, migration/rollout, and verification.
- Compare viable approaches for correctness, project fit, simplicity, risk, and testability. Retain the chosen decision and concise why in the plan; keep detailed rejected reasoning in planning memory.
- Do not defer code planning because live credentials or resources are unavailable. Pin documented contracts, design fail-closed configuration and fake-provider coverage, and isolate real provisioning as an operator step.

### 3. Draft from the template

Load the template again, copy it, and replace all guidance and sentinels. Integrate tests with the behavior they protect. Make every phase independently executable and green, including coupled artifacts. Keep final checks for genuinely cross-phase validation.

### 4. Validate and independently review

Run from this skill directory or use the equivalent absolute path:

```sh
node scripts/validate-plan-structure.mjs /path/to/.plans/example.md
```

Then complete the quality checklist. Fix structural errors and semantic gaps before review.

A fresh read-only independent plan reviewer is the default before finalization when safely available. Supply the complete request, draft, planning memory or equivalent support, research sources, decisions, constraints, risks, unresolved questions, and relevant code/test pointers. Require a sourced terminal handoff and parent verification.

Use the current `code-review` authoritative materiality, finding-selection, disposition, and bounded follow-up contract instead of copying its scoring lifecycle. Draft critique remains plan-quality review, not implementation-compliance review. Record accepted/rejected/deferred findings and rerun the validator and affected checks after fixes. Direct checklist-driven review is allowed only for a recorded concrete fallback: trivial scope, inseparability, unavailable/unsafe capability, user prohibition, or disproportionate coordination cost; state the independence limitation.

Plan meaningful implementation checkpoints and final review with focus, baseline, evidence, exit/rerun requirements, and fresh read-only review by default. Deduplicate any checkpoint that aligns with the owning implementation workflow.

### 5. Save and optionally render

Save Markdown whenever writes are permitted and share its path. HTML is conditional: render/open only when requested, required by project convention, or useful in an interactive environment. First inspect renderer options, then run it without `--open` unless opening is appropriate:

```sh
node scripts/render-plan-html.mjs --help
node scripts/render-plan-html.mjs /path/to/.plans/example.md --out /path/to/.plans/example.html [--open]
```

The renderer is bundled and read/write scoped to the selected files. A successful Bun-unavailable fallback is acceptable; rich Markdown rendering requires Bun. Report only artifacts that exist, plus blockers, important assumptions, skipped gates, and meaningful review/delegation limitations.
