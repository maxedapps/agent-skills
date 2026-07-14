---
name: review-plan-implementation
description: Reviews implemented Markdown plans against their goals, checklist items, acceptance criteria, implied requirements, and test evidence. Use when the user provides a plan/tracker/design doc and asks whether the implementation is complete, correct, safe, well-tested, and faithful to the plan, including prompts like “this plan was implemented; evaluate the plan and implementation” or “review implementation of .plans/foo.md”. Do not use for ordinary code review without a plan target; use code-review instead.
metadata:
  short-description: Review an implementation against its plan
---

# Review Plan Implementation

## Core mindset

Be adversarial but evidence-bound. Verify plan claims against code, tests, docs, config, migrations, runtime behavior, and git evidence. Do **not** trust checklist state or implementation notes without proof. Do **not** invent issues or nitpick harmless style.

## Core rules

- Read the full plan before judging or delegating. If truncated, continue reading until complete.
- Review both the **plan quality** and the **implementation quality**.
- Build or record a verification matrix: `plan item / implied requirement → expected evidence → actual code evidence → test/validation evidence → status`.
- Treat tests as a first-class review target. Evaluate **high-value test coverage**, not test volume: important happy paths, failure/error paths, edge cases, regressions, invariants, integration boundaries, acceptance criteria, and security/data-safety risks. Flag missing high-value tests and low-value tests that only increase counts, assert implementation details, over-mock real behavior, duplicate existing coverage, or create false confidence. For rendered forms and browser flows, verify tests submit the actual generated controls/hidden values/cookies rather than reconstructing a request from upstream data; synthetic submission can bypass broken form wiring.
- Work file by file and section by section. Read relevant files in full unless generated/vendor/too large; record skipped or partial reads and why.
- For large plans or multiple subsystems, read and apply the `use-subagents` skill and use read-only subagents. Give each subagent a bounded plan section/subsystem, require files read/skipped, CONFIRMED vs PLAUSIBLE findings with `path:line`, test-quality assessment, and smallest safe fix. The main agent spot-verifies, dedupes, and remains responsible.
- Use current, version-specific docs and source when judging third-party APIs, framework behavior, security assumptions, or migration requirements; read the `web-research` skill when applicable.
- Do not implement fixes unless explicitly requested.
- Create/reuse `.progress/<review-slug>.md` and save the final report to `.reviews/<review-slug>.md` unless file writes are forbidden.

## Workflow

1. Resolve the plan path and review scope. Ask only if the target plan is ambiguous or missing.
2. Read the full plan. Extract goals, non-goals, acceptance criteria, checklist items, risk notes, affected areas, and implied requirements.
3. Inspect repository evidence: `git status`, relevant diffs/commits, progress notes, touched files, call sites, tests, config, docs, migrations, env examples, and CI scripts.
4. Create the verification matrix in `.progress/<review-slug>.md`; update it as evidence is gathered.
5. Evaluate the plan: completeness, internal consistency, risk handling, testability, missing acceptance criteria, overengineering, and unsafe assumptions.
6. Evaluate the implementation against each matrix row: complete, partial, missing, incorrect, overbuilt, or unverifiable.
7. Evaluate high-value tests in depth. Identify which critical behaviors are protected, which are untested, and whether any tests are superficial or misleading.
8. Run or recommend validation that materially improves confidence: targeted tests, typecheck/lint/build, migration checks, API probes, browser checks for UI flows, or small repros for high-severity suspicions. Record skipped checks and confidence limits.
9. For UI/browser-visible work, read the `agent-browser` skill and verify representative rendered states when practical; static review is not enough for interaction, layout, responsive behavior, auth flows, downloads, or animation.
10. Write `.reviews/<review-slug>.md` with findings grouped by severity and plan item. Include confirmed-good coverage areas when useful.
11. Final response: concise top findings, overall plan-compliance verdict, high-value test verdict, report path, progress path, validation run/skipped, and remaining caveats.

## Finding quality bar

Each finding must include:

- plan item or implied requirement affected
- location (`path:line` where possible)
- evidence and impact
- confidence: CONFIRMED, PLAUSIBLE, or NEEDS RUNTIME VALIDATION
- smallest safe fix or validation next step

Prefer no finding over weak speculation. Separate must-fix gaps from improvements and optional polish.
