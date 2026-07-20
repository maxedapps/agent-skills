---
name: decomplex
description: >-
  Reviews proposed or existing work for unnecessary complexity and triages
  complexity-increasing recommendations without editing the reviewed targets.
  Use this skill when asked to simplify or decomplex source, tests,
  configuration, dependencies, plans, designs, or architecture; challenge
  over-engineering; audit unnecessary complexity; or triage recommendations
  that would add complexity. Do not use for general defect review,
  implementation or fixes, style-only cleanup, or conceptual explanations that
  need no durable review report.
license: MIT
compatibility: >-
  Requires read access to reviewed targets and project write access for one
  .reviews/ report; has no hard runtime dependency and never writes targets.
metadata:
  short-description: Evidence-gated complexity prevention, audit, and triage
---

# Decomplex

## Critical contract

- Infer and record exactly one mode: **Prevention** for unimplemented plans, designs, architecture, dependencies, or safeguards; **Audit** for existing source, tests, configuration, dependencies, or architecture; **Finding triage** for every supplied recommendation that may add complexity.
- Fix the target, authority, required behavior, and scope before reviewing. Ask only when ambiguity materially changes authority, scope, behavior, architecture, security posture, or risk.
- Treat targets as immutable. The sole allowed write is one distinct `.reviews/<descriptive-slug>-decomplex.md` report. Never edit a reviewed artifact, even when the same invocation asks for fixes.
- A direct invocation is blocked if the report cannot be written: stop, explain the block, and do not substitute a chat-only review. An embedding workflow may instead use its own documented fallback, without claiming that `decomplex` ran.
- Do not equate simplicity with fewer lines, helpers, dependencies, checks, or other elements. Preserve evidenced trust boundaries, invariants, compatibility, lifecycle cleanup, and operational needs.
- Review only complexity trade-offs. Route general correctness, security, performance, or plan-compliance defects to the appropriate owning workflow, such as `code-review`.
- Findings are advisory. The consuming agent or user owns validation, disposition, implementation, and escalation. **“No potential complexity findings” is a valid result.**

## Admission gate

A candidate becomes a potential finding only when all of these are established:

1. a concrete conceptual, maintenance, or operational burden;
2. absent or insufficient justification for the current need;
3. a realistic, reachable practical cost;
4. the smallest concrete simpler alternative;
5. preservation of required behavior;
6. proportionate value after simplification and regression costs; and
7. an explicit exception and boundary check.

Use evidence state `Confirmed` or `Supported`. Candidates that cannot pass the gate become a bounded validation step or material user question, or are omitted. Never turn helper count, duplication, novelty, hypothetical scale, or stylistic preference into a finding by itself.

Prefer simplifications in this order:

`delete → direct use → local logic/helper → existing shared abstraction → new abstraction`

## Workflow

1. **Establish the review contract.** Fix target, authority, scope, required behavior, mode, report path, access, and material constraints. Inspect callers or consumers, tests, configuration, history, and operational context only as needed to resolve the gate.
2. **Load the candidate gates.** Before inspecting candidates, read [`references/complexity-gates.md`](references/complexity-gates.md) completely. Apply its candidate/justified-exception pairs contextually; do not use it as a checklist quota.
3. **Evaluate candidates.** Apply every admission-gate element, compare the smallest behavior-preserving alternative, and order admitted potential findings by expected simplification value.
4. **Assign owner-facing recommendations.** Use only `Act`, `Validate`, or `Ask user`. Recommend action; do not perform it. In Finding triage mode, preserve every supplied finding ID and disposition each as `Act`, `Validate`, `Ask user`, or `No action`.
5. **Load and write the report.** Before writing output, read [`assets/decomplex-review-template.md`](assets/decomplex-review-template.md) completely. Create exactly one `.reviews/<descriptive-slug>-decomplex.md`, remove template guidance and empty sections, and retain explicit inspected/skipped coverage and limitations.
6. **Verify the handoff.** Confirm the report exists, every admitted item passes the gate, every supplied triage ID is accounted for, and no reviewed target changed.

## Resources

- [`references/complexity-gates.md`](references/complexity-gates.md) contains the mandatory surface-specific candidate and justified-exception inventory. Read it before candidate inspection.
- [`assets/decomplex-review-template.md`](assets/decomplex-review-template.md) defines the mandatory report and triage shape. Read it immediately before writing every report.

## Validation

From the catalog root, run:

```sh
node scripts/validate-skill-metadata.mjs skills/decomplex
node scripts/validate-skill-links.mjs skills/decomplex
npx -y skills-ref validate skills/decomplex
```

Expect valid metadata, resolved local resources, and a valid independently installable skill. Also inspect the final report and repository state; expect one report write and no target-artifact changes.
