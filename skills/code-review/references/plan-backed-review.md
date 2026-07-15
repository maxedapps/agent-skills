# Plan-backed implementation review

Use this reference whenever implementation is judged against a plan, tracker, design, acceptance criteria, approved decision, or equivalent authority source. Plan compliance adds an authority and traceability layer; it never replaces applicable correctness, security, simplicity, typing, performance, compatibility, accessibility, UX, data/ops, or test review.

## Contents

- [Scope and invocation](#scope-and-invocation)
- [Authority and precedence](#authority-and-precedence)
- [Baseline extraction](#baseline-extraction)
- [Evidence matrix](#evidence-matrix)
- [Status definitions](#status-definitions)
- [Four required verdicts](#four-required-verdicts)
- [Tests and validation](#tests-and-validation)
- [Findings, confidence, and caveats](#findings-confidence-and-caveats)
- [Workflow](#workflow)

## Scope and invocation

Resolve scope and invocation independently:

- An unqualified request to review implementation of a plan covers the full plan and its implementation.
- A named phase, task, step, file set, or diff is bounded plan-backed scope. Include only the callers, contracts, shared state, migrations, generated outputs, and integration boundaries required to judge that slice safely.
- A direct user request remains standalone even when phase-only or otherwise bounded.
- Invocation is embedded only when an owning workflow requested the checkpoint and retains timing and finding-resolution responsibility.
- If several plausible plans or authority sources could be intended, ask one focused clarification instead of guessing.

State omitted plan sections and boundaries explicitly. Never describe a bounded review as full-plan compliance.

## Authority and precedence

Read every authoritative source in full before assigning compliance statuses. Continue after truncated reads; do not infer the rest from headings, filenames, checkboxes, or summaries.

Apply authority in this order:

1. Current explicit user constraints and documented approvals override workflow defaults.
2. When the user states precedence among multiple plan, design, acceptance, or decision sources, follow it.
3. Without stated precedence, treat named plan, design, and acceptance sources as co-authoritative. Report conflicts instead of silently choosing one.
4. An approved decision, deviation, or descope supplements or supersedes a baseline only when evidence cites its approval source, exact scope, rationale, and consequence.
5. Trackers and progress notes are implementation claims and evidence, not authority, unless the user explicitly designates them as authoritative.

For an unresolved material conflict, ask one focused clarification when the answer is needed to proceed. If clarification is unavailable or output must continue, create a `baseline quality/conflict` finding, mark affected matrix rows `Unverifiable`, explain competing interpretations, and carry the uncertainty into the verdicts.

Do not treat a useful requirement omitted by the baseline as implementation noncompliance. Report the omission under baseline quality and evaluate any resulting implementation risk under generic implementation quality.

## Baseline extraction

From the full authority set, extract and cite:

- goals and intended user/operator outcomes;
- non-goals and explicit exclusions;
- acceptance criteria, checklists, and Definition of Done;
- functional, security, privacy, data, compatibility, performance, accessibility, and operational requirements;
- implied requirements necessary for the stated outcome or integration to work safely;
- affected files, systems, callers, generated artifacts, migrations, docs, configuration, and rollout/recovery expectations;
- risk notes, unsafe shortcuts, validation commands, manual checks, and review exit conditions;
- approved decisions, deviations, descopes, and unresolved questions.

An implied requirement must be necessary and evidence-backed, not a reviewer preference. Cite the source behavior or integration constraint that implies it.

Assess baseline quality separately for completeness, internal consistency, feasibility, testability, risk handling, missing acceptance criteria, unsafe assumptions, overengineering, and false-green checkpoints.

## Evidence matrix

Create and maintain this traceability shape:

```text
authority item / implied requirement
  → expected evidence
  → implementation evidence
  → validation/test evidence
  → status
```

For each row record:

- source citation and concise authority item or implied requirement;
- expected code, runtime, migration, config, docs, package, UI, or operational evidence;
- actual implementation evidence with `path:line`, symbol, diff, commit, or runtime observation where possible;
- validation/test evidence, including commands/results and skipped or gated checks;
- approval provenance when status is `Approved deviation`;
- one status from the definitions below and any confidence limitation.

Inspect evidence directly: repository status, supplied and working-tree diffs, relevant commits, progress claims, touched files, callers, tests, configuration, docs, migrations, environment examples, generated outputs, package contents, CI, and runtime behavior. A tracker checkbox, filename, implementation note, or test name is not proof by itself.

For a living product, roadmap, or status document whose meaning may have changed over time, inspect its Git history and the patch that introduced the relevant claim (for example, `git log --follow -- <path>` and the applicable `git show`). Distinguish newly specified future requirements from historical implementation claims; current desired-state text alone is not evidence that implementation exists.

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

A strong compliance verdict cannot excuse unsafe or incorrect code. A weak baseline does not automatically make implementation noncompliant; keep the baseline defect, compliance result, and generic implementation risk distinct.

## Tests and validation

Treat tests as first-class implementation evidence. Evaluate whether they protect acceptance criteria, important success paths, failure/error paths, edge cases, regressions, invariants, concurrency/isolation, integration boundaries, security/data safety, migrations, and user-visible behavior. Identify critical behaviors that are protected, untested, skipped, gated, superficial, over-mocked, duplicate, or implementation-detail-only.

For rendered forms and browser flows, verify tests exercise actual generated controls, hidden values, cookies, redirects, and browser-managed state. Synthetic reconstruction from upstream data can bypass broken wiring.

Run or recommend only checks that materially improve confidence: targeted tests, typecheck/lint/build, migration and rollback checks, API probes, package-artifact checks, browser/UI interaction, screenshots, or disposable assertion-based repros for serious suspicions. For UI-visible acceptance, representative runtime states are required when practical; static analysis alone cannot establish layout, interaction, responsive, auth, download, or animation behavior.

When third-party APIs, framework behavior, security assumptions, or migrations matter, identify installed versions and use current version-matched official docs, source, release notes, and migration evidence. Record checks not run, why, and how each skip limits a matrix status or verdict.

## Findings, confidence, and caveats

Each material finding includes:

- severity and user/operator impact;
- affected authority item or implied requirement when applicable;
- location (`path:line` when possible);
- concrete implementation and validation evidence;
- confidence: `CONFIRMED`, `PLAUSIBLE`, or `NEEDS RUNTIME VALIDATION`;
- the smallest safe fix or decisive validation next step.

Use `CONFIRMED` for direct code/runtime/test evidence, `PLAUSIBLE` for a reachable evidence-backed risk not yet demonstrated, and `NEEDS RUNTIME VALIDATION` when the decisive state cannot be established statically. Distinguish deterministic behavior, a confirmed reachable path, and an incident observed in the target workflow.

Group findings by severity and cite matrix rows where relevant. Prefer no finding over speculation. Record confirmed-good areas when they demonstrate meaningful coverage, not as a request for approval.

Caveats must identify partial/skipped files, unavailable tools/environments/credentials, gated tests, unresolved authority conflicts, missing runtime evidence, and any scope boundary that prevents a broader conclusion. Reflect material caveats in statuses and verdict confidence rather than relegating them to a footnote.

## Workflow

1. Resolve the authority target, full or bounded scope, standalone or embedded invocation, and output constraints.
2. Read all authority sources; extract requirements, implications, approvals, conflicts, and baseline-quality concerns.
3. Inspect implementation evidence and required integration boundaries. Load and apply the generic dimension reference for all broad or applicable implementation-quality checks.
4. Build the matrix and assign only evidence-supported statuses.
5. Assess high-value tests and run targeted validation, preserving skipped-check and runtime limitations.
6. Write severity-ranked findings, confirmed-good evidence where useful, the complete applicable matrix, and all four verdicts.
7. Produce the selected report or handoff with explicit coverage and caveats. Never claim full-plan compliance from a bounded review.
