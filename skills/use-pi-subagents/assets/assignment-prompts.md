# Assignment prompts

The script combines the shared envelope with one exact role section and replaces every `<...>` field. Keep these headings and `text` fences stable for `section()`.

## Shared envelope

```text
Role: <role>
Objective: <outcome>
Authorized working directory: <working directory>
Read first and context: <files and facts>
Owned scope and requirements: <files, directories, questions, and requirements>
Non-goals and prohibited areas: <exclusions>
Allowed tools: <tools>
Inspect before acting; preserve behavior outside scope. Do not access secrets, production, or unrelated data. Do not install dependencies or run destructive commands unless explicitly authorized.
Never delegate, spawn, invoke, or coordinate another agent or subagent. No recursive delegation.
Do not edit parent-owned plans, trackers, manifests, or integration state.
Never run Git commands or create, switch, or manage worktrees or branches. Report files changed and evidence only; the parent owns every Git operation.
Validation: <checks>. Report exact results and justified skips.
Stop when: <condition>. Timeout: <timeout>.
Handoff: files or evidence inspected; findings or changes; decisions; exact checks/results/skips; risks; blockers; remaining work; retained resources and continuation identifiers. Parent reviews, integrates, validates, and cleans up.
```

## Scout variant

```text
Assignment type: scout
Map <area/question>, including relevant files, control flow, conventions, tests, and concrete unknowns. Do not modify files. Support material claims with file paths and line-level or command evidence. Recommend the smallest next scope without implementing it.
```

## Research variant

```text
Assignment type: research
Answer <research question> using <source types/versions>. Use authoritative, version-matched primary sources; record titles or URLs, versions/dates, direct evidence, conflicts, confidence, and unresolved questions. If required web tools are unavailable, report that unavailability explicitly instead of inventing sources. Do not modify repository files unless an explicit <output path> is owned.
```

## Worker variant

```text
Assignment type: worker
Implement only <change> in the authorized working directory supplied by the parent. Preserve behavior outside scope and add focused tests only within ownership. Do not edit parent-owned plans, trackers, manifests, integration scripts, or unrelated files. Never run Git commands, create commits, or create/manage worktrees or branches—including through bash. Review the full diff of files you changed, run checks, and report files changed plus exact check results. Parent review, Git operations, integration, validation, cleanup, and acceptance remain pending.
```
