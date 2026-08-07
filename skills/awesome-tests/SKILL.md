---
name: awesome-tests
description: >-
  Designs, writes, improves, and reviews behavior-focused automated tests and
  test strategies. Use this skill when adding or repairing tests, creating
  implementation plans that change runtime or application behavior and must
  specify tests or validation, assessing test code or coverage quality,
  diagnosing flaky, brittle, fragile, or false-green tests, or conducting code
  reviews that materially touch tests or validation. Do not use for unrelated
  production implementation, plans or reviews with no testing or validation
  work, running an unchanged test command only, manual exploratory QA alone, or
  conceptual testing explanations without a concrete target.
license: MIT
metadata:
  short-description: Behavior-focused test engineering and review
---

# Awesome Tests

## Critical rules

- Before any activity, read [`references/test-quality-gates.md`](references/test-quality-gates.md) fully and apply its contextual gates.
- Optimize meaningful confidence per maintenance cost, not test count or coverage theater.
- Map every test to an observable behavior or material risk and its intended failure signal.
- Prefer public or user-visible contracts over implementation details. Assert exact text, order, calls, or snapshots only when they are contractual rather than incidental.
- Require deterministic, isolated tests. Follow repository conventions and use the cheapest layer with sufficient fidelity.
- Treat counts, coverage, mocks, snapshots, test IDs, multiple assertions, and smell names as contextual signals, never automatic findings or acceptance gates.
- Do not edit production code unless the user explicitly requests it. Preserve unrelated code and owner state.

## Sensitivity safety

Prove a test can fail, when safe, in this order:

1. Run it against a known failing version or the pre-fix regression.
2. Otherwise introduce one bounded temporary behavior break in a disposable copy or safe test seam, then fully revert it and verify restoration.
3. Otherwise use mutation-tool evidence only when the repository already provides the tool.
4. Otherwise state why direct sensitivity proof was unsafe or unavailable.

Never mutate owner work or production code merely to satisfy this check. Remove temporary state even when a command fails.

## Activities and authority

| Activity | Contract |
|---|---|
| **Plan** | Produce risk/behavior coverage, test layer and path, fixtures/doubles, failure boundaries, commands and expected signals, plus justified gaps or alternate validation. |
| **Write/improve** | Make the smallest requested test changes, preserve unrelated code, and verify the claimed failure signal and passing behavior where safe. |
| **Review** | Stay read-only unless fixes are explicitly requested; assess actual protection, sensitivity, fidelity, determinism, and maintenance cost. |

These activities compose when requested. In embedded use, return test-engineering evidence only; the owning planning or review workflow retains authority over artifacts, findings, severity, matrices, reports, and verdicts. In standalone use, return the requested test plan or scoped review directly without adopting another workflow's schema.

## Common workflow

1. Fix the target, authority, requested activity, and output. Ask only if ambiguity changes the work.
2. Inspect behavior and contracts, callers, nearby tests, framework/configuration/CI, repository commands, and installed versions relevant to the target.
3. Before planning, writing, improving, or reviewing, read [`references/test-quality-gates.md`](references/test-quality-gates.md) fully.
4. Map material behaviors, boundaries, regressions, and risks to observable checks at the narrowest credible layer.
5. Perform the requested activity; distinguish proven defects from signals and contextual heuristics.
6. Prove sensitivity with the safe hierarchy above when practical.
7. Run targeted checks, then affected repository checks. When flake risk warrants it, probe repetition, isolation, order dependence, and parallel execution without hiding failures behind retries.
8. Report exact commands and results, sensitivity evidence, cleanup, skips, and confidence limits. If a check cannot run or cleanup/restoration is uncertain, stop and report the blocker rather than guessing.
