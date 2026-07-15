---
name: code-review
description: >-
  Performs evidence-bound reviews of diffs, PRs, codebases, implementation
  steps, and completed plan implementations for correctness, security, tests,
  performance, typing, maintainability, and complexity. Use when the user asks
  to review, audit, critique, find issues, or evaluate implemented plan work.
  Follow explicit scope and output constraints; when underspecified, inspect the
  current codebase broadly. Do not use for an unimplemented draft plan or to
  implement fixes unless asked.
metadata:
  short-description: Adaptable generic and plan-backed implementation review
---

# Code Review

## Instruction precedence

Follow explicit user constraints for target, baseline, scope, dimensions, depth, tools, validation, delegation, writes, artifacts, and output. Ask one focused question only if ambiguity risks reviewing the wrong target. A bare review defaults to the current codebase, generic baseline, full scope, all applicable dimensions, standalone invocation, and standalone output. Never broaden a bounded review repository-wide.

## Required conditional resources

- **Before a broad/all-dimensions review or an in-depth review of any requested dimension, read [`references/review-dimensions.md`](references/review-dimensions.md)** for the complete correctness, simplicity, typing, library, security, performance, test, compatibility/data/ops, package, accessibility, UX, and runtime heuristics.
- **Before reviewing implementation against a plan, tracker, design, acceptance criteria, or other authority source, read [`references/plan-backed-review.md`](references/plan-backed-review.md)** for authority precedence, traceability, statuses, and verdicts.
- **Before writing a standalone report, load [`assets/review-report-template.md`](assets/review-report-template.md)** and adapt its conditional sections.

## Select four independent axes

Resolve each axis separately; one axis never implies another.

1. **Baseline:** **Generic** judges contracts and applicable dimensions. **Plan-backed** adds traceability to supplied authority sources without replacing generic quality review.
2. **Scope:** **Full** inspects the requested target. **Bounded** inspects named work plus call sites and boundaries needed to judge it safely.
3. **Invocation:** **Standalone** is directly requested, even when bounded. **Embedded** means another workflow owns the checkpoint and resolution loop.
4. **Output:** **Chat-only**, **Markdown report plus concise summary**, or **embedded handoff**. Standalone defaults to report plus summary; embedded to handoff. A no-write instruction suppresses artifacts unless a report is explicitly exempted.

## Core rules

- Be adversarial but evidence-bound. A material finding requires a plausible/reachable path, meaningful impact to outcomes, users, operators, security, data, compatibility, or operations, and sufficient evidence/confidence. Exclude niche edges, speculative future concerns, optional polish, and redesign unless comparably material; uncommon security/data paths still qualify when reachability and impact justify them.
- Challenge each recommendation against implementation complexity, regression risk, and maintenance cost. If likely benefit does not exceed those costs, prefer no finding, a smaller correction, or decisive validation.
- Inspect relevant files in full, including call sites, tests, configuration, documentation, and nearby patterns. Broad scope requires coverage of every selected dimension, but does not require reporting marginal findings. Record partial/skipped generated, vendor, lock, or oversized content and the resulting coverage limit.
- Preserve the worktree. Do not checkout, restore, stash, clean, or overwrite owner changes. Before a check that may rewrite tracked generated files, record their state; remove or reverse only review-created changes afterward. Treat package commands that may rewrite manifests, lockfiles, metadata, or install state as mutating.
- Do not edit source unless explicitly asked. A declared report is an output artifact, not a source edit, and remains governed by the output axis.
- Evaluate high-value tests, not counts: user-visible behavior, acceptance criteria, regressions, invariants, integration boundaries, important success and failure paths, and plausible boundary cases tied to a contract or meaningful security, data, or operational risk.
- Cheaply confirm serious suspicions when practical with targeted checks or disposable assertion-based repros. Record checks not run and how they limit confidence; delete temporary repro artifacts.
- Deduplicate findings by root cause. By default report every Critical finding, at most five additional High/Medium material root causes, and no Low/Optional findings. Explicit user depth or output instructions override this default. If additional material root causes remain, disclose one blocking `not review-ready` caveat with their highest severity, affected areas/dimensions, aggregate impact, evidence basis, and known count or lower bound; return remediation control to the owner rather than serializing a backlog.
- For direct and delegated reviews, default to an initial review plus one follow-up. Follow-ups inspect accepted fixes, affected integration boundaries, and material regressions only; they do not reopen unrelated dimensions or broad discovery. Allow one additional follow-up only for an unresolved Critical/High issue, confirmed material regression, or substantial change invalidating prior coverage; then return control to the owner/human rather than continue autonomously. Surface any incidentally observed Critical issue separately and escalate it without authorizing broader search.
- Use bounded read-only subagents only when independence justifies coordination. Give each exact scope, dimensions, evidence/output requirements, permissions, and stop condition; prohibit edits and recursion. The parent integrates coverage, deduplicates before output limits, spot-verifies material claims, and owns conclusions.

## Workflow

1. Resolve the four axes and any explicit constraints. Clarify only a material ambiguity; otherwise use the defaults.
2. Load the conditional resources above: [`references/review-dimensions.md`](references/review-dimensions.md) for broad/deep dimension review and [`references/plan-backed-review.md`](references/plan-backed-review.md) for an authority baseline.
3. Inspect repository shape and status, relevant diffs/commits, target files, callers, tests, config, docs, migrations, environment examples, CI, and nearby patterns before judging isolated code.
4. Establish broad coverage, then review every selected dimension; findings remain selective. For plan-backed work, complete the authority matrix while still applying generic implementation-quality dimensions.
5. Run only validation that materially improves confidence: targeted tests, lint/typecheck/build, migrations, API or runtime probes, package checks, browser/UI checks, or small repros. Preserve the worktree and record skips.
6. Produce the selected output. Before a standalone report, reread [`assets/review-report-template.md`](assets/review-report-template.md). If allowed and no path was supplied, use `.reviews/<review-slug>.md`; substantial reviews may keep `.progress/<review-slug>.md` evidence notes. Create neither for chat-only, handoff-only, or no-write output. Format permitted artifacts when required.
7. Before the final response, reread any created evidence/report notes. Summarize top findings, verdicts when applicable, validation run/skipped, limitations, and only the artifact paths that actually exist.

## Finding quality

Each admitted finding includes severity and concrete impact; location (`path:line` when possible) and affected contract or authority item; evidence and confidence (`CONFIRMED`, `PLAUSIBLE`, or `NEEDS RUNTIME VALIDATION`); whether its path is deterministic, reachable, or observed; and the smallest proportionate safe fix or decisive validation step. `NEEDS RUNTIME VALIDATION` calls for decisive validation, never speculative implementation.

## If fixes are explicitly requested

Read affected files and callers first. Preserve behavior unless change was requested; prefer deleting, collapsing, or standardizing before adding abstractions. Update relevant tests/docs/config, validate, and summarize files, behavior, and results.
