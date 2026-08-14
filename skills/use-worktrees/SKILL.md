---
name: use-worktrees
description: >-
  Manages Git worktrees for isolated feature or milestone work. Use this skill
  whenever work should happen in a worktree, a worktree needs syncing with its
  target branch, or a finished worktree branch should be merged or cleaned up.
  Do not use for ordinary single-checkout branch work or subagent delegation
  that does not require worktree operations.
license: MIT
compatibility: Requires Git and filesystem access outside the repository checkout.
metadata:
  short-description: Create, sync, merge, and clean up Git worktrees
---

# Use git worktrees

## Location

All worktrees live in `~/worktrees/<project>/<worktree>`, where `<project>` is the repo's directory name and `<worktree>` matches the branch name:

```
git worktree add ~/worktrees/course-platform/milestone-4-auth -b milestone-4-auth <target-branch>
```

Never create worktrees inside the repository or scattered elsewhere. `git worktree list` shows what exists.

## Setup after creating

- Follow the repository's setup instructions and install dependencies in the worktree; generated or ignored dependency directories are not shared between checkouts.
- Give deployments from concurrent worktrees a **dedicated stage/environment**. Never let parallel checkouts mutate the same deployment state.
- For delegated work, also follow `use-subagents`; the parent agent owns all worktree creation, integration, and cleanup.

## Working in the worktree

- All work for the feature happens on the worktree's branch, committed incrementally. The main checkout stays untouched and free for parallel work.
- Sync direction during work is always **target branch → worktree branch** (`git merge <target-branch>` inside the worktree) at natural checkpoints, and mandatorily before touching anything that parallel work may have changed. Never rebase or rewrite shared branches.
- After every sync, run the repository's full check suite.
- Sync conflict rules:
  - **Sequential migrations**: if the target branch took a number this branch also uses, renumber this branch's migration to the next free slot. Check this on every sync even without a textual conflict.
  - **Lockfile conflicts**: preserve both sides' manifest/workspace changes, then regenerate with the repository's package manager. Never hand-edit a generated lockfile.
  - Resolve everything else by reading both sides; the combined test suites are the arbiter.

## Merging back

**Never merge a worktree branch back into master (or any target branch) automatically.** Review cycles happen in the worktree first; the merge happens only when the user explicitly asks for it. When they do:

1. Final sync target → worktree branch; resolve conflicts and get the full check suite green **in the worktree**.
2. Merge the worktree branch into the target with `--no-ff` from the main checkout.
3. Review `git diff <target-before>..<merge-result>` to confirm nothing from the target's side was dropped.
4. Push. No force-push, no bulk `--theirs`/`--ours` resolutions, ever.

## Cleanup

After a merge is pushed and verified:

```
git worktree remove ~/worktrees/<project>/<worktree>
git branch -d <branch>
```

For unmerged cleanup, first inspect uncommitted changes and commits absent from the target. Remove a safe, fully handled workflow-owned worktree with no unique work according to `use-subagents`. Otherwise report the unique work and require explicit user approval; use forced worktree removal or branch deletion only when that approval specifically accepts the identified data loss.

`git worktree prune` clears stale registrations if a worktree directory was deleted manually.
