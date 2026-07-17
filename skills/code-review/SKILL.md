---
name: code-review
description: >-
  Reviews repository diffs, PRs, codebases, and completed implementations for
  material, evidence-backed defects and plan compliance. Use this skill when
  asked to review, audit, critique, find code issues, or evaluate implemented
  plan work. Do not use for draft-plan review or implementation unless fixes are
  explicitly requested.
license: MIT
metadata:
  short-description: Adaptable generic and plan-backed implementation review
---

# Code Review

## Instruction precedence

Perform a thorough, in-depth code review EITHER according to the user task (or as inferred from the context) OR based on the below dimensions and requirements.

If scope is unclear, ask! Do NOT widen or expand scope. Stick to the task and provided information.

## Required conditional resources

- If dimensions were not specified, **before a broad/all-dimensions review or an in-depth review of any requested dimension, read [`references/review-dimensions.md`](references/review-dimensions.md)** for the complete correctness, simplicity, typing, library, security, performance, test, compatibility/data/ops, package, accessibility, UX, and runtime heuristics.
- **Before reviewing implementation against a plan, tracker, design, acceptance criteria, or other authority source, read [`references/plan-backed-review.md`](references/plan-backed-review.md)** for authority precedence, traceability, statuses, and verdicts.
- **Before writing a standalone report, load [`assets/review-report-template.md`](assets/review-report-template.md)** and adapt its conditional sections.

## Output Format

- Follow provided instructions regarding the output format
- If unclear or unspecified, you MUST create a review report `.md` file (stored in local `.reviews` folder)

## Authoritative finding contract

- Admit only evidence-backed findings with a plausible/reachable path and meaningful impact to user/operator outcomes, security, data, compatibility, or operations. Exclude niche/speculative concerns, optional polish, and redesign unless comparably material; uncommon security/data paths qualify when reachability and impact justify them.
- Weigh each recommendation against implementation complexity, regression risk, and maintenance cost. When benefit does not exceed cost, reject/downgrade it or prefer a smaller correction, decisive validation, or no finding.
- Respect the context of the project you're working in - most projects are not enterprise scale and not every theoretical risk or potential bug can actually become a risk / bug in every project!

| Score | Meaning |
|---|---|
| `S4 Critical` | Catastrophic, irreversible, security, data, or availability impact if real. |
| `S3 High` | Major user/operator or core-path impact. |
| `S2 Medium` | Meaningful bounded impact or a practical workaround. |
| `S1 Low` | Minor, nonblocking impact. |
| `S0 Optional` | Polish or preference. |
| `C3 Confirmed` | Direct code, runtime, test, or reproduction evidence. |
| `C2 Supported` | Evidence-backed reachable path, not directly reproduced. |
| `C1 Tentative` | Plausible but insufficient evidence; validate first. |

- Record both scores, location/authority, evidence, path state, impact, and smallest safe fix/validation for each candidate. Scores only order work: independently reassess evidence, reachability, relevance, impact, and proportionality; even `S4` may be downgraded or rejected. `NEEDS RUNTIME VALIDATION` is a next-action flag, not confidence or permission to implement speculation.
- Deduplicate root causes. Unless explicit depth/output instructions override, report every `S4`, at most five additional material `S3`/`S2`, and no `S1`/`S0`. Replace further material findings with one blocking `not review-ready` caveat giving highest severity, affected areas/dimensions, aggregate impact, evidence basis, and known count/lower bound; return remediation control to the owner.
- Default to an initial review plus one follow-up limited to accepted fixes, affected boundaries, and material regressions; never reopen broad discovery. One extra follow-up requires unresolved material risk, confirmed regression, or invalidated coverage; then return control to the owner/human. Surface incidental apparently severe issues separately for reassessment, without broadening search.

## Core review rules

- Inspect relevant files in full, including call sites, tests, configuration, documentation, and nearby patterns. Broad scope requires coverage of every selected dimension but not reporting marginal findings. Record partial/skipped generated, vendor, lock, or oversized content and the resulting coverage limit.
- Preserve the worktree. Do not checkout, restore, stash, clean, or overwrite owner changes. Before a check that may rewrite tracked generated files, record their state; remove or reverse only review-created changes afterward. Treat package commands that may rewrite manifests, lockfiles, metadata, or install state as mutating.
- Do not edit source unless explicitly asked. A declared report is an output artifact, not a source edit, and remains governed by the output axis.
- Evaluate high-value tests, not counts: user-visible behavior, acceptance criteria, regressions, invariants, integration boundaries, important success and failure paths, and plausible boundary cases tied to a contract or meaningful security, data, or operational risk.
- Cheaply confirm serious suspicions when practical with targeted checks or disposable assertion-based repros. Record checks not run and how they limit confidence; delete temporary repro artifacts.
- For plan-backed work, apply the authority precedence, complete one matrix row per applicable authority item or implied requirement using the exact statuses, and produce all four separate verdicts required by [`references/plan-backed-review.md`](references/plan-backed-review.md); never collapse them into an aggregate pass.
- Use bounded read-only subagents only when independence justifies coordination. Give each exact scope, dimensions, evidence/output requirements, permissions, and stop condition; prohibit edits and recursion. The parent integrates coverage, deduplicates before output limits, spot-verifies material claims, and owns conclusions.

## Workflow

1. Evaluate the task and context to decide on the review scope and strictness. Ask for clarification if needed. 
2. Load the conditional resources above: [`references/review-dimensions.md`](references/review-dimensions.md) for broad/deep dimension review and [`references/plan-backed-review.md`](references/plan-backed-review.md) for an authority baseline.
3. Inspect repository shape and status, relevant diffs/commits, target files, callers, tests, config, docs, migrations, environment examples, CI, and nearby patterns before judging isolated code.
4. Establish broad coverage, then review every selected dimension; findings remain selective. For plan-backed work, complete the authority matrix while still applying generic implementation-quality dimensions.
5. Run only validation that materially improves confidence: targeted tests, lint/typecheck/build, migrations, API or runtime probes, package checks, browser/UI checks, or small repros. Preserve the worktree and record skips.
6. Produce the selected output. Before a standalone report, reread [`assets/review-report-template.md`](assets/review-report-template.md). If allowed and no path was supplied, use `.reviews/<review-slug>.md`; substantial reviews may keep `.progress/<review-slug>.md` evidence notes. Create neither for chat-only, handoff-only, or no-write output. Format permitted artifacts when required.
7. Before the final response, reread any created evidence/report notes. Summarize top findings, verdicts when applicable, validation run/skipped, limitations, and only the artifact paths that actually exist.

## If fixes are explicitly requested

Read affected files and callers first. Preserve behavior unless change was requested; prefer deleting, collapsing, or standardizing before adding abstractions. Update relevant tests/docs/config, validate, and summarize files, behavior, and results.
