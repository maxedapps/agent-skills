# Plan-backed implementation review

Use whenever implementation is judged against a plan, tracker, design, acceptance criteria, approved decision, or equivalent authority. This adds traceability; it does not replace generic implementation review.

**Contents:** [Scope](#scope-and-invocation) · [Authority](#authority-and-precedence) · [Baseline](#extract-the-baseline) · [Matrix](#evidence-matrix) · [Statuses](#status-definitions) · [Verdicts](#four-required-verdicts) · [Findings](#findings-and-validation) · [Workflow](#workflow)

## Scope and invocation

| Question | Rule |
|---|---|
| Unqualified plan review | Cover the full plan and implementation. |
| Named phase/task/step/files/diff | Bound scope, but include required callers, contracts, shared state, migrations, generated output, and integration boundaries. |
| Standalone or embedded | A direct request is standalone. It is embedded only when an owning workflow retains timing and resolution. |
| Ambiguous authority | Ask one focused question rather than guess. |

State omitted plan sections and boundaries. Never claim full-plan compliance from bounded scope.

## Authority and precedence

Read every authority source in full. Continue truncated reads; never infer content from headings, filenames, checkboxes, or summaries.

1. Current explicit user constraints and documented approvals override workflow defaults.
2. Follow user-stated precedence among plans, designs, acceptance criteria, and decisions.
3. Otherwise treat named sources as co-authoritative; report conflicts.
4. A decision, deviation, or descope changes the baseline only with approval source, scope, rationale, and consequence.
5. Trackers and progress notes are claims and evidence unless explicitly designated as authority.

For unresolved material conflict, ask when the answer is necessary. If unavailable, add a `baseline quality/conflict` finding, mark affected rows `Unverifiable`, explain competing interpretations, and lower verdict confidence.

A useful requirement omitted by the baseline is not noncompliance. Report it only when the core finding gate admits the resulting implementation risk.

## Extract the baseline

Cite:

- goals, outcomes, non-goals, and exclusions;
- acceptance criteria, checklists, and Definition of Done;
- functional, security, privacy, data, compatibility, performance, accessibility, and operational requirements;
- evidence-backed implied requirements necessary for safe behavior or integration;
- affected systems, callers, artifacts, migrations, docs, config, rollout, and recovery;
- risks, prohibited shortcuts, validation, manual checks, and exit conditions;
- approved changes and unresolved questions.

Assess baseline completeness, consistency, feasibility, testability, risk handling, missing acceptance criteria, unsafe assumptions, overengineering, and false-green checkpoints. An implied requirement must follow from cited behavior or an integration constraint, not reviewer preference. Only material baseline defects become findings or verdict exceptions.

For living roadmap/status documents, inspect Git history and the patch introducing relevant claims. Separate future requirements from historical implementation claims; current desired-state text is not proof of implementation.

## Evidence matrix

Create one row for every applicable authority item or implied requirement, whether or not it produces a finding:

```text
authority item / implied requirement
  → expected evidence
  → implementation evidence
  → validation/test evidence
  → status
```

Each row needs:

- source citation and concise requirement;
- expected code, runtime, migration, config, docs, package, UI, or operational proof;
- actual evidence with `path:line`, symbol, diff, commit, or runtime observation;
- validation results plus skipped/gated checks;
- approval provenance for `Approved deviation`;
- one exact status and any confidence limit.

Inspect evidence directly. A tracker checkbox, filename, implementation note, or test name is not proof. Complete matrix coverage and selective findings are separate: a `Complete` row needs evidence, not a manufactured improvement.

## Status definitions

Use exactly these row statuses:

- **Complete** — the requirement is implemented and the necessary evidence and validation support it.
- **Partial** — only part of the requirement or its necessary evidence is satisfied; state the missing part.
- **Missing** — required implementation or evidence is absent.
- **Incorrect** — implementation exists but contradicts the authority, intended behavior, or required integration.
- **Overbuilt** — implementation adds unnecessary scope or complexity beyond the authority and creates meaningful cost or risk.
- **Unverifiable** — available evidence cannot support a conclusion, including unresolved authority conflict or unavailable decisive validation.
- **Approved deviation** — implementation intentionally differs or is descoped, with a cited approval source, scope, rationale, and consequence.

Do not use `Approved deviation` for undocumented convenience, inferred consent, or a tracker claim. Do not collapse `Partial`, `Missing`, or `Unverifiable` into success.

## Four required verdicts

Give four separate evidence-based overall verdicts. Each verdict states the judgment, decisive evidence, material exceptions, and confidence; do not replace them with one aggregate “pass”.

1. **Plan/baseline quality and omissions** — completeness, consistency, feasibility, testability, risk coverage, unsafe assumptions, overengineering, conflicts, and omitted necessary requirements.
2. **Implementation compliance** — matrix status distribution, material incomplete/incorrect rows, and approved deviations or descopes with provenance.
3. **Implementation quality beyond the baseline** — applicable generic correctness, security, simplicity, typing, performance, compatibility, accessibility/UX, data/ops, and maintainability concerns, including risks the baseline failed to mention.
4. **Test and validation quality** — protected critical behaviors, important skipped/gated checks, missing high-value coverage, superficial or misleading tests, and confidence from runtime/manual evidence.

A strong compliance verdict cannot excuse unsafe code. A weak baseline does not automatically make implementation noncompliant. Keep baseline defects, compliance, and generic risks distinct.

## Findings and validation

Apply the candidate gate, scoring, limits, worktree, validation, and follow-up rules from `SKILL.md`. Matrix statuses are compliance evidence, not automatically findings. Link admitted findings to rows when relevant. Reflect material evidence limits in row statuses and verdict confidence.

Tests are matrix evidence only when they protect the claimed acceptance behavior or boundary. Use targeted static, runtime, migration, package, API, or browser checks that materially improve confidence. Identify installed versions and version-matched first-party evidence when third-party behavior, framework semantics, security assumptions, or migrations decide a row.

## Workflow

1. Resolve authority, scope, invocation, and output. Follow-ups inspect only accepted fixes, affected boundaries, and material regressions.
2. Read all authority; extract requirements, implications, approvals, conflicts, and baseline defects.
3. Inspect implementation and required integration boundaries. Apply relevant generic dimensions.
4. Complete the matrix with evidence-supported statuses.
5. Assess high-value tests and targeted validation; retain limitations.
6. Apply the core finding contract. Produce selective findings, the complete matrix, and four verdicts.
7. Report explicit coverage and caveats. Never claim full compliance from bounded scope.
