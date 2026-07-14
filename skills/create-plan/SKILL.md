---
name: create-plan
description: Creates thoroughly researched, implementation-ready plans that are complete but distilled, structured into adaptive numbered phases, and explicit about decisions, files, pitfalls, checks, and review. Use when the user asks to "create a plan", "make a plan", "implementation plan", "plan this feature", "plan the change", or similar planning work before coding. Do not use to implement the plan or for quick conceptual answers that need no implementation handoff.
compatibility: >-
  Requires project file access. Saving and rendering plans requires write access
  and Node.js 18+; Bun is optional and enables rich Markdown rendering. Current
  external research requires suitable search/retrieval access. Independent
  subagent review requires the `use-subagents` prerequisites: Herdr 0.7.3+ with
  a running compatible server, HERDR_ENV=1, and an interactive agent. If those
  review prerequisites are unavailable, the workflow permits a documented
  self-review instead.
metadata:
  short-description: Create researched, implementation-ready plans
---

# Create Plan

## Instruction priority

Follow explicit user constraints and higher-priority instructions. If the user narrows scope, forbids tools, requests chat-only output, or changes this workflow, adapt and briefly record meaningful deviations.

## Mandatory steps

Read and use these resources:

1. **Before drafting any plan, load [`assets/implementation-plan-template.md`](assets/implementation-plan-template.md).** Copy and adapt its structure. Every non-conditional section is mandatory; omit only blocks the template explicitly marks conditional. Do not substitute a remembered or invented format.
2. **Before independent review or finalization, load [`references/plan-quality-checklist.md`](references/plan-quality-checklist.md).** Complete it against the draft and repeat it after material revisions.

If a mandatory resource cannot be loaded, planning is blocked; do not fabricate its contents. Chat-only plans still use the template even though files are not saved or rendered.

## Core contract

- Do not implement the requested change.
- Make research deep; make the final plan **complete, distilled, and executable**. Concision removes research narrative, repetition, and generic advice—not files, decisions, instructions, rationale, pitfalls, checks, or review guidance.
- Create or reuse `.progress/<plan-slug>.md` early for detailed research, source evaluation, inventories, alternatives, rejected reasoning, reviewer feedback, assumptions, and open investigations. Reread it before review, finalization, and summary. If writes are forbidden, mark planning memory as not persisted and keep all essential support in the chat-only plan; never cite a fictitious path.
- Discover relevant `.plans/`, `.progress/`, `.reviews/`, durable project docs, source/test symbols, and authoritative URLs. Cite applicable artifacts in the template's source table and state exactly what each contributes. Never invent an artifact; keep essential actions and decisions in the plan rather than hiding them behind references.
- Use exact paths and symbols. Line ranges may help discovery but are not durable identifiers. When a path is genuinely unknown, give a narrow search pattern and require resolution before edits instead of guessing.
- Use numbered phases only for meaningful dependency, delivery, migration/rollout, or independently verifiable boundaries. One phase is valid. Every advertised checkpoint must include all coupled schema, generated files, callers, fixtures, docs, and tests needed to be green.
- Use imperative lists, at least one useful table, and short critical-shape snippets for API/type/schema/query/config/CLI/protocol/state-machine changes. Do not force a synthetic snippet when no such contract changes.
- State every non-obvious decision, its status, and a brief implementation-relevant reason. Record full comparisons in `.progress`; mention a rejected approach in the plan only when it prevents a likely mistake.
- Put pitfalls, edge cases, unsafe shortcuts, compatibility boundaries, partial-failure behavior, and recovery where they affect implementation.
- Make checks and review guidance mandatory: exact commands/manual checks, expected signals, review focus, required evidence, exit conditions, and reruns after fixes. End with observable Definition of Done criteria.
- Ask the user only when material scope, behavior, security, data, migration, compatibility, or irreversible decisions cannot be inferred safely. Otherwise choose a reasonable reversible default, label it, explain why briefly, and name a fallback.
- Research third-party contracts rather than relying on memory. Read `web-research` for current, version-specific dependency/API/framework evidence, official docs, source repositories, release history, URLs, and other external sources.
- Do not defer code planning merely because credentials, environment IDs, or live resources are unavailable. Pin the documented contract, plan fail-closed configuration and fake-provider tests, and isolate real provisioning/verification as an operator step.
- Consider read-only subagents for genuinely separable research, codebase scouting, or independent review. Before delegating, read `use-subagents`. Keep delegation mechanics out of the final plan unless ownership or safe parallelism changes execution.
- Review the draft independently before finalizing. Use a fresh-context, read-only reviewer through `use-subagents`; ask for independent critique rather than approval.
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

### 3. Draft with the mandatory template

Before drafting, load `assets/implementation-plan-template.md`, then copy and adapt it rather than starting from a blank document.

- Preserve all non-conditional sections and remove placeholder guidance from the finished plan.
- Use the source table for applicable `.plans`, `.progress`, `.reviews`, docs, URLs, and code/test symbols; include traceability from requirements/findings to phases when multiple inputs exist.
- For each phase, provide exact files/references, ordered instructions, applicable contract snippets, localized pitfalls, exact checks with expected results, and an implementation-review checkpoint.
- Integrate tests and verification with the behavior they protect. Add final cross-cutting validation only for checks spanning phases.
- Keep operator steps, migration/rollout, rollback/recovery, security, performance, observability, browser/manual validation, and cleanup only where relevant—but make them concrete when relevant.
- Make the plan self-contained enough that a fresh implementer need not repeat core research or recover unstated decisions from chat.

### 4. Validate and review

Before review, load `references/plan-quality-checklist.md` and complete every applicable check.

Request a fresh-context, read-only critique through `use-subagents`. Use the user's requested reviewer when safely available; otherwise use the default reviewer supported by that workflow. Ask the reviewer to judge independently rather than confirm the draft. Provide the request, draft, progress path, source artifacts, decisions, constraints, known risks, and relevant code pointers. Ask for missing requirements/files, unsafe assumptions, weak rationale, incomplete snippets/checks/review guidance, false green checkpoints, and unnecessary repetition.

Evaluate feedback critically, record accepted/rejected details in `.progress`, revise without copying the transcript into the plan, rerun the quality checklist, and follow up in the same reviewer session after material changes when possible. If independent review is unavailable, record that limitation and perform a separate self-review pass.

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
