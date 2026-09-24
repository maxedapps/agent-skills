---
name: awesome-tests
description: >-
  Writes, fixes, and reviews high-value, behavior-focused automated tests. Use
  this skill when the task is writing, improving, or repairing tests, reviewing
  test code or a test strategy, or diagnosing flaky, brittle, or false-green
  tests. Do not use for implementation plans or code reviews as a whole (even
  when they mention tests), production changes that involve no test work, just
  running an existing test command, manual exploratory QA, or general testing
  explanations.
license: MIT
metadata:
  short-description: Behavior-focused test engineering and review
---

# Awesome Tests

Write only high-value tests. Every test should protect behavior that matters to users, callers, or data. A test that exists for its own sake is maintenance cost with no protection. Don't add tests for niche edge cases or to push a coverage number.

## What good tests do

- Assert observable outcomes through public contracts: return values and errors, persisted state, emitted events, rendered semantics, authorization decisions. Assert exact text, order, calls, or snapshots only when they are part of the contract.
- Fail on the bad behavior. The oracle must reject what would actually go wrong, not just execute the code or check that something exists.
- Use the cheapest layer that can really observe the behavior, following the repository's conventions. Move outward only when wiring, serialization, persistence, the browser, or a third party is the risk.
- Don't mock away the behavior under test. A test through mocks proves wiring, not compatibility with the real database, network, or provider.
- Stay deterministic and isolated: await all async work, wait on observable state instead of sleeping, control time, randomness, and environment where they matter, and clean up.
- Read clearly: the name states behavior and condition, and setup shows intent. Some repetition beats an abstraction that hides the expectations.

Counts, coverage percentages, mocks, snapshots, and test IDs are signals, not verdicts. When reviewing, ask what behavior a test uniquely protects and whether a cheaper, sturdier oracle exists before changing or deleting it.

Don't edit production code unless asked.

## Prove the test can fail

A test that passes after a fix doesn't prove it protects anything. When safe, show it fails against the pre-fix or known-bad behavior. Otherwise make one small temporary break in a disposable copy or a test seam, then revert it fully. Never break owner work or production code just to prove this; if no safe option exists, say so.

## Reference

Read [`references/test-quality-gates.md`](references/test-quality-gates.md) when choosing fixtures or doubles, testing UI or snapshots, or diagnosing flaky or false-green tests.
