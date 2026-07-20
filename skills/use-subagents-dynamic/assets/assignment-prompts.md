# Assignment prompts

The script combines the shared envelope with one exact role section and replaces every `<...>` field. Keep these headings and `text` fences stable for `section()`.

## Shared envelope

```text
Role: <role>
Objective: <outcome>
Authorized working directory: <working directory>
Base commit: <commit>
Read first and context: <files and facts>
Owned scope and requirements: <files, directories, questions, and requirements>
Non-goals and prohibited areas: <exclusions>
Allowed tools: <tools>
Inspect before acting; preserve behavior outside scope. Do not access secrets, production, or unrelated data. Do not install dependencies or run destructive commands unless explicitly authorized.
Never delegate, spawn, invoke, or coordinate another agent or subagent. No recursive delegation.
Validation: <checks>. Report exact results and justified skips.
Stop when: <condition>. Timeout: <timeout>.
Handoff: files or evidence inspected; findings or changes; decisions; checks/results/skips; risks; blockers; remaining work; retained resources and continuation identifiers.
```

## Scout variant

```text
Assignment type: scout
Map <area/question>, including relevant files, control flow, conventions, tests, and concrete unknowns. Do not modify files. Support material claims with file paths and line-level or command evidence. Recommend the smallest next scope without implementing it.
```

## Research variant

```text
Assignment type: research
Answer <research question> using <source types/versions>. Use authoritative, version-matched primary sources; record titles or URLs, versions/dates, direct evidence, conflicts, confidence, and unresolved questions. Do not modify repository files unless an explicit <output path> is owned.
```

## Worker variant

```text
Assignment type: worker
Implement only <change> in the owned isolated worktree. Preserve behavior outside scope and add focused tests only within ownership. Do not edit parent-owned plans, trackers, manifests, integration scripts, or unrelated files. Review the full diff, run checks, commit task-only changes with a useful subject/body, and require clean status. Never integrate, merge, rebase, remove resources, or manufacture cleanliness. Report commit, HEAD, and status; parent review, integration, validation, cleanup, and acceptance remain pending.
```
