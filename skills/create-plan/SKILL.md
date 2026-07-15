---
name: create-plan
description: >-
  Creates, reviews, and improves thoroughly researched, implementation-ready
  plans that are complete but distilled, structured into adaptive numbered
  phases, and explicit about decisions, files, pitfalls, checks, and review. Use
  when the user asks to create or make an implementation plan, plan a feature or
  change, or review, improve, critique, or audit an existing unimplemented
  implementation plan before coding. Do not use to implement a plan, to audit
  whether implementation satisfies a plan, or for quick conceptual answers that
  need no implementation handoff.
compatibility: >-
  Requires project file access. Saving and rendering plans requires write access
  and Node.js 18+; Bun is optional and enables rich Markdown rendering. Current
  external research requires suitable search/retrieval access. Fresh read-only
  research or critique capabilities are optional; their absence does not block a
  recorded checklist-driven direct review.
metadata:
  short-description: Create or improve implementation-ready plans
---

# Create Plan

## Instruction priority

Follow explicit user constraints and higher-priority instructions. If the user narrows scope, forbids tools, requests chat-only output, or changes this workflow, adapt and briefly record meaningful deviations.

## Mandatory steps

Read and use these resources:

1. **Before drafting or revising any plan, load [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md).** Copy and adapt its structure. Every non-conditional section is mandatory; omit only blocks the template explicitly marks conditional. Do not substitute a remembered or invented format.
2. **Before independent or direct draft review and finalization, load [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md).** Complete it against the draft and repeat it after material revisions.

If a mandatory resource cannot be loaded, planning is blocked; do not fabricate its contents. Chat-only plans still use the template even though files are not saved or rendered.

## Core contract

- Do not implement the requested change. Reviewing an unimplemented plan is a local draft-quality task; do not route it through implementation-evidence review. Auditing whether code satisfies a plan is outside this skill.
- Make research deep; make the final plan **complete, distilled, and executable**. Concision removes research narrative, repetition, and generic advice—not files, decisions, instructions, rationale, pitfalls, checks, or review guidance.
- Create or reuse `.progress/<plan-slug>.md` early for detailed research, source evaluation, inventories, alternatives, rejected reasoning, reviewer feedback, assumptions, and open investigations. Reread it before review, finalization, and summary. If writes are forbidden, mark planning memory as not persisted and keep all essential support in the chat-only plan; never cite a fictitious path.
- Discover relevant `.plans/`, `.progress/`, `.reviews/`, durable project docs, source/test symbols, and authoritative URLs. Cite applicable artifacts in the template's source table and state exactly what each contributes. Never invent an artifact; keep essential actions and decisions in the plan rather than hiding them behind references.
- Use exact paths and symbols. Line ranges may help discovery but are not durable identifiers. When a path is genuinely unknown, give a narrow search pattern and require resolution before edits instead of guessing.
- Use numbered phases only for meaningful dependency, delivery, migration/rollout, or independently verifiable boundaries. One phase is valid. Every advertised checkpoint must include all coupled schema, generated files, callers, fixtures, docs, and tests needed to be green.
- Use imperative lists, at least one useful table, and short critical-shape snippets for API/type/schema/query/config/CLI/protocol/state-machine changes. Do not force a synthetic snippet when no such contract changes.
- State every non-obvious decision, its status, and a brief implementation-relevant reason. Record full comparisons in `.progress`; mention a rejected approach in the plan only when it prevents a likely mistake.
- Put pitfalls, edge cases, unsafe shortcuts, compatibility boundaries, partial-failure behavior, and recovery where they affect implementation.
- Make checks and review guidance mandatory: exact commands/manual checks, expected signals, review focus, baseline, required evidence, exit conditions, and reruns after fixes. End with observable Definition of Done criteria.
- Ask the user only when material scope, behavior, security, data, migration, compatibility, or irreversible decisions cannot be inferred safely. Otherwise choose a reasonable reversible default, label it, explain why briefly, and name a fallback.
- Research third-party contracts rather than relying on memory. Read `web-research` for current, version-specific dependency/API/framework evidence, official docs, source repositories, release history, URLs, and other external sources.
- Do not defer code planning merely because credentials, environment IDs, or live resources are unavailable. Pin the documented contract, plan fail-closed configuration and fake-provider tests, and isolate real provisioning/verification as an operator step.
- Consider fresh, read-only subagents for genuinely separable research, codebase scouting, or independent draft critique when their fresh context or independence is worth the coordination cost. Give them the complete bounded assignment and evidence payload; direct research and review remain valid.
- Review drafts proportionately through fresh, read-only independent judgment when worthwhile, or a recorded checklist-driven direct fallback. Request prioritized, high-confidence material blockers—not niche/speculative edges, optional polish, or disproportionate redesign—and independently admit findings; unavailable delegation alone never blocks completion.
- Do not prescribe branches, pushes, PRs, or merges unless the user asks.

## Workflow

### 1. Establish planning memory and scope

- Create or reuse `.progress/<plan-slug>.md` with the goal, scope, constraints, decision status, source artifacts, and open questions unless writes are forbidden; then use the template's non-persisted planning-memory value and keep essential support in the plan.
- Inspect relevant source, tests, config, docs, existing patterns, `.plans`, `.progress`, and `.reviews`. For API/schema/protocol/CLI changes, search the whole workspace for callers, generated clients, scripts, docs, and downstream consumers.
- Record detailed findings, risks, unknowns, likely validation, and chat-only provenance in planning memory.

### 2. Resolve questions and research

- Ask only blocking clarification questions and wait when user input is required.
- Investigate until local architecture, external contracts, integration boundaries, failure behavior, migration/rollout implications, and validation are understood. Prefer official docs, version-matched source, release notes, and repository examples; resolve material conflicts.
- Compare viable strategies for correctness, project fit, maintainability, risk, migration effort, performance, and testability. Keep detailed comparison and rejected evidence in `.progress`; retain the chosen decision and brief why in the plan.
- When fresh read-only research or scouting is useful, bound it to exact questions and sources. Require a terminal handoff containing files/sources inspected, findings, uncertainties, and skipped work; independently verify material claims before using them.

### 3. Draft with the mandatory template

Before drafting, load `assets/implementation-plan-template.md`, then copy and adapt it rather than starting from a blank document.

- Preserve all non-conditional sections and remove placeholder guidance from the finished plan.
- Use the source table for applicable `.plans`, `.progress`, `.reviews`, docs, URLs, and code/test symbols; include traceability from requirements/findings to phases when multiple inputs exist.
- For each phase, provide exact files/references, ordered instructions, applicable contract snippets, localized pitfalls, exact checks with expected results, and an implementation-review checkpoint with focus, baseline, evidence, exit, and rerun requirements.
- Integrate tests and verification with the behavior they protect. Add final cross-cutting validation only for checks spanning phases.
- Keep operator steps, migration/rollout, rollback/recovery, security, performance, observability, browser/manual validation, and cleanup only where relevant—but make them concrete when relevant.
- Make the plan self-contained enough that a fresh implementer need not repeat core research or recover unstated decisions from chat.

### 4. Validate and review the draft locally

Before review, load `references/plan-quality-checklist.md` and complete every applicable check. Draft-plan critique stays in this workflow because implementation evidence does not yet exist.

When independent review is worthwhile, provide the draft/support, sources/decisions, constraints/risks, questions, and code/test pointers. Require fresh, read-only judgment: every Critical and at most five additional high-confidence High/Medium material blockers to safety, consistency, executability, simplicity, or outcome; omit Low/Optional, niche/speculative work, and disproportionate redesign by default. If more remain, require one blocking `not review-ready` caveat with highest remaining severity, affected areas, aggregate impact, evidence basis, and count/lower bound. Otherwise record the direct review and independence limit.

Independently check evidence, reachability, outcome/constraint relevance, impact, confidence, and fix complexity/regression/maintenance cost; accept/reject/defer with rationale. Unconfirmed potentially material concerns remain decisive validation questions, not plan expansions. Revise accepted work and rerun the checklist/evidence. Default to an initial review plus one fix/regression-only follow-up; separately escalate incidental Critical issues without reopening discovery. One additional follow-up requires unresolved Critical/High, confirmed material regression, or substantial coverage-invalidating change; then stop autonomous review for a reasoned parent/human disposition. Completion requires material concerns resolved, reasonedly rejected/deferred, or exposed as human decisions.

### 5. Save, render, and open

1. Write `.plans/<descriptive-kebab-case-name>.md` without overwriting an unrelated plan.
2. Run `node scripts/render-plan-html.mjs --help` from this skill directory or use the equivalent absolute path.
3. Render with this bundled script—not `preview_export`—and include `--open`:

   ```sh
   node /absolute/path/to/create-plan/scripts/render-plan-html.mjs .plans/example.md --out .plans/example.html --open
   ```

4. If `--open` was omitted, rerun with it.
5. If the renderer warns that Bun is unavailable but exits successfully, accept the escaped plain-text HTML fallback; do not treat missing Bun as a blocked plan. Rich Markdown HTML requires Bun.
6. Share the Markdown, HTML, and planning-memory paths. Mention only blockers, important assumptions, review limitations, or meaningful workflow deviations; do not paste the full plan unless asked.
