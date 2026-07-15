---
name: code-review
description: >-
  Performs adaptable, evidence-bound code reviews of diffs, pull requests (PRs),
  codebases, implementation steps, and completed plan implementations for bugs,
  regressions, security, tests, performance, typing, maintainability, and
  unnecessary complexity. Use when the user asks to review, audit, inspect,
  evaluate, critique, or find issues in code or implementation evidence, or asks
  whether part or all of a plan was implemented correctly. Follow the user's
  target, baseline, scope, dimensions, depth, tools, and output constraints; for
  an underspecified review, inspect the current codebase broadly. Do not use to
  create, review, or improve an unimplemented draft plan before coding, or to
  implement fixes unless asked.
metadata:
  short-description: Adaptable generic and plan-backed implementation review
---

# Code Review

## Instruction precedence

Apply explicit user constraints for target, baseline, scope, dimensions, depth, tools, validation, delegation, source writes, artifacts, and output directly. Ask one focused question only when supplied information is missing, ambiguous, or contradictory enough to risk reviewing the wrong target. A bare review means the current codebase, generic baseline, full scope, all applicable dimensions, standalone invocation, and the standalone output default. Never expand a clearly bounded review into a repository-wide review.

## Required conditional resources

- **Before a broad/all-dimensions review or an in-depth review of any requested dimension, read [`references/review-dimensions.md`](references/review-dimensions.md)** for the complete correctness, simplicity, typing, library, security, performance, test, compatibility/data/ops, package, accessibility, UX, and runtime heuristics.
- **Before reviewing implementation against a plan, tracker, design, acceptance criteria, or other authority source, read [`references/plan-backed-review.md`](references/plan-backed-review.md)** for authority precedence, traceability, statuses, and verdicts.
- **Before writing a standalone report, load [`assets/review-report-template.md`](assets/review-report-template.md)** and adapt its conditional sections.

## Select four independent axes

Resolve each axis separately; one axis never implies another.

1. **Baseline**
   - **Generic:** judge the implementation against its contracts and applicable review dimensions.
   - **Plan-backed:** add traceability against supplied plan, tracker, design, acceptance, or approval sources. This never replaces generic implementation-quality review.
2. **Scope**
   - **Full:** inspect the complete requested target.
   - **Bounded:** inspect only the named phase, task, files, diff, or implementation step plus call sites and integration boundaries required to judge it safely.
3. **Invocation**
   - **Standalone:** the user directly requested the review, including a direct bounded or phase-only request.
   - **Embedded:** another workflow owns the checkpoint, timing, and finding-resolution loop. Bounded scope alone does not make a review embedded.
4. **Output**
   - **Chat-only**, **Markdown report plus concise chat summary**, or **embedded handoff**.
   - Standalone defaults to a Markdown report plus concise summary; embedded defaults to a handoff without a separate artifact.
   - A clear instruction not to modify or write files suppresses every artifact unless the user explicitly exempts a report. Read-only source review may still create a declared report when artifacts are allowed.

## Core rules

- Be adversarial but evidence-bound. Challenge claims and checklists, seek real bugs and unnecessary complexity, and prefer no finding over speculation, harmless style criticism, or inflated uncertainty.
- Inspect relevant files in full, including call sites, tests, configuration, documentation, and nearby patterns. Record partial/skipped generated, vendor, lock, or oversized content and the resulting coverage limit.
- Preserve the worktree. Do not checkout, restore, stash, clean, or overwrite owner changes. Before a check that may rewrite tracked generated files, record their state; remove or reverse only review-created changes afterward. Treat package commands that may rewrite manifests, lockfiles, metadata, or install state as mutating.
- Do not edit source unless explicitly asked. A declared report is an output artifact, not a source edit, and remains governed by the output axis.
- Evaluate high-value tests, not test counts: user-visible behavior, acceptance criteria, regressions, invariants, integration boundaries, important success and failure paths, edge cases, and security/data-safety risks.
- Cheaply confirm serious suspicions when practical with targeted checks or disposable assertion-based repros. Record checks not run and how they limit confidence; delete temporary repro artifacts.
- Rank findings by user impact and severity. Give evidence, confidence, location, and the smallest safe fix or validation step; audit whether the proposed fix is itself safe.
- Deduplicate by root cause. Independent evidence strengthens one finding rather than multiplying it.
- Consider bounded read-only subagents for large, separable scopes when their independence justifies coordination cost. Direct review remains valid. Give each child an exact scope, selected dimensions, evidence and output requirements, permissions, and stop condition; prohibit source edits and recursive delegation. An orchestrating parent partitions broad embedded reviews, integrates coverage, spot-verifies material claims, and remains responsible for conclusions.

## Workflow

1. Resolve the four axes and any explicit constraints. Clarify only a material ambiguity; otherwise use the defaults.
2. Load the required conditional resources. At this point, reread [`references/review-dimensions.md`](references/review-dimensions.md) for broad/all-dimensions scope or any requested dimension reviewed in depth, and [`references/plan-backed-review.md`](references/plan-backed-review.md) for any authority-backed baseline.
3. Inspect repository shape and status, relevant diffs/commits, target files, callers, tests, config, docs, migrations, environment examples, CI, and nearby patterns before judging isolated code.
4. Establish coverage, then review every selected dimension. For plan-backed work, build the authority matrix while still applying generic implementation-quality dimensions.
5. Run only validation that materially improves confidence: targeted tests, lint/typecheck/build, migrations, API or runtime probes, package checks, browser/UI checks, or small repros. Preserve the worktree and record skips.
6. Produce the selected output. Before a standalone report, reread and use [`assets/review-report-template.md`](assets/review-report-template.md). When permitted and no path was supplied, write the report to `.reviews/<review-slug>.md`; for a substantial review, optionally keep `.progress/<review-slug>.md` notes covering axes, files, commands/results, research, skips, and open questions. Do not create either artifact for chat-only, handoff-only, or no-write output. Format permitted artifacts if repository checks include them.
7. Before the final response, reread any created evidence/report notes. Summarize top findings, verdicts when applicable, validation run/skipped, limitations, and only the artifact paths that actually exist.

## Finding quality

Each material finding includes:

- severity and concrete user/operator impact;
- location (`path:line` when possible) and affected contract or authority item;
- evidence and confidence: `CONFIRMED`, `PLAUSIBLE`, or `NEEDS RUNTIME VALIDATION`;
- whether a conditional path is deterministic, merely reachable, or observed in the target workflow;
- the smallest safe fix or decisive next validation step.

Separate must-fix findings from important improvements and optional polish. Do not report vague cleanliness concerns, implausible future risks, or duplicate symptoms as separate defects.

## If fixes are explicitly requested

Read all affected files and call sites before editing. Preserve behavior unless behavior change was requested; prefer deleting, collapsing, standardizing, or simplifying before adding abstractions. Update relevant tests, docs, and config, run validation, and summarize changed files, behavior preserved or changed, and results.
