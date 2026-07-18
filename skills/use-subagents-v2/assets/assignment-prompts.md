# Assignment prompt templates

Copy the shared envelope and exactly one role block. Replace every angle-bracket field; remove unused instructions. Keep the assignment self-contained and task-specific.

## Shared envelope

```text
Role: <bounded role>
Objective: <one concrete outcome>

Starting context
- Authorized working directory: <parent checkout for a read-only reader, or absolute isolated worktree for a worker>
- Base/starting commit: <commit>
- Read first: <exact files and why>
- Known facts/open questions: <only task-relevant context>

Scope and ownership
- Own: <exact files, directories, or questions>
- Required: <observable requirements>
- Non-goals: <explicit exclusions>
- Do not modify: <parent/sibling/unrelated areas>

Permissions and safety
- Use only the authorized worktree and allowed tools: <tools>
- Do not access secrets, production, unrelated private data, or paths outside scope.
- Do not install dependencies or run destructive commands unless explicitly authorized.
- Never delegate, spawn, invoke, or coordinate another agent or subagent. No recursive delegation.
- Do not integrate, merge, remove the worktree/branch, or clean parent-owned resources.

Evidence and validation
- Inspect before acting; preserve behavior outside scope.
- Run: <focused checks and applicable repository checks>
- Report exact commands, results, and every skipped check with reason.
- Distinguish observed evidence from inference and your claims from parent-verified facts.

Stop controls
- Stop when: <completion condition>
- Timeout/budget: <bound>
- If blocked or state is unsafe/unknown, stop without bypassing controls and retain recoverable evidence.

Handoff
Return a self-contained final response with: summary; files/evidence inspected; findings or changed files; decisions; exact checks/results/skips; risks and assumptions; blockers; remaining work; and retained resources. Include identifiers needed for safe continuation.
```

## Scout variant

```text
Assignment type: scout
Inspect <bounded repository area/question>. Map relevant files, control flow, conventions, tests, and concrete unknowns for the parent. Do not modify files. Support each material claim with file paths and line-level or command evidence. Recommend the smallest next investigation or implementation scope; do not implement it.

Success means the parent can scope the next lane without redoing discovery and can tell observations from hypotheses.
```

## Research variant

```text
Assignment type: research
Answer <bounded research question> from <allowed source types/versions>. Prefer authoritative, version-matched primary sources. Record source titles/paths or URLs, relevant versions/dates, direct evidence, conflicts, and confidence. Do not modify repository files unless the owned output path explicitly requires a research artifact.

Success means every conclusion is traceable, conflicting evidence is surfaced, and unresolved questions are explicit.
```

## Worker variant

```text
Assignment type: worker
Implement only <bounded change> in the owned paths. Inspect relevant code first and preserve behavior outside scope. Add or update focused tests only when they are within ownership. Do not edit parent-owned plans, trackers, manifests, integration scripts, or unrelated files.

Before handoff:
1. Review the complete diff and remove scope creep.
2. Run the required focused checks and applicable type/repository checks.
3. Commit only task changes with a detailed subject and useful body explaining what changed, why, affected areas, and validation.
4. Require a clean worktree; do not stash, reset, clean, amend unrelated history, merge, or rebase to manufacture cleanliness.

Worker handoff must include:
- exact changed files and key decisions;
- exact checks with pass/fail output and justified skips;
- commit hash and current HEAD;
- `git status --short --branch` result;
- risks, assumptions, blockers, remaining work, and retained resources.

Success means the assigned implementation is committed in task-only commits, worker checks pass or skips are explicit, status is clean, and the handoff is independently reviewable. Parent review, integration, validation, ancestry proof, cleanup, and acceptance remain pending.
```
