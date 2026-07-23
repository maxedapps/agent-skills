# Assignment template

Fill every field. Send only task-relevant context. Never include secrets, tokens, `.env`, or private transcripts.

```text
Role: <scout|research|worker or launcher equivalent>
Mode: <reader|writer>
Objective: <one concrete outcome>
Authorized working directory: <exact cwd/workspace>
Baseline: <revision or pre-lane state>
Read first and context: <files, facts, open questions>
Owned scope and requirements: <paths, behaviors, acceptance>
Non-goals and prohibited areas: <exclusions>
Dependencies / join point: <inputs from other lanes; where result feeds>
Permissions: <tools/paths allowed>
VCS: no worktree/branch/commit/integrate/cleanup; read-only VCS only if explicitly authorized
Do not edit parent-owned plans, trackers, manifests, or integration state.
Never delegate, spawn, or coordinate another agent. No recursive delegation.
Validation: <checks>. Report exact results and justified skips.
Stop when: <completion condition>. Timeout: <bound>.
Handoff: files read/changed; findings or changes; decisions; checks/results/skips; risks; blockers; remaining work; evidence pointers. Parent reviews, integrates, validates, and cleans up.
```

## Role add-ons

**Scout** — map the question/area with file/symbol evidence. Do not modify files. Recommend smallest next scope only.

**Research** — answer with authoritative, version-matched sources. Record URLs/versions, conflicts, confidence, skips. Do not modify repository files. Report missing web tools instead of inventing sources.

**Worker** — implement only the owned change in the authorized cwd. Preserve behavior outside scope. Review every file you changed; run required checks; report paths + exact results. Parent owns full-diff review, VCS, integrate, cleanup, acceptance.
