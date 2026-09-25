---
name: use-worktrees
description: >-
  Manages Git worktrees for isolated feature or milestone work. Use this skill
  whenever work should happen in a worktree, a worktree needs syncing with its
  target branch, or a finished worktree should be turned into a pull request
  or cleaned up. Do not use for ordinary single-checkout branch work.
license: MIT
compatibility: Requires Git and filesystem access outside the repository checkout.
metadata:
  short-description: Create, sync, finish, and clean up Git worktrees
---

# Use git worktrees

## Create

Worktrees live only in `~/worktrees/<repo-dir>/<branch-slug>` (branch name with `/` → `-`). Create them with Git:

```
git worktree add ~/worktrees/<repo-dir>/<branch-slug> -b <branch> <target-branch>
```

For an existing branch, such as an open PR, run `git fetch origin <branch>:<branch>` and drop `-b`. Inside herdr (`HERDR_ENV=1`), don't use `herdr worktree create`: it opens a separate workspace. Open the worktree in a new pane of your current workspace instead:

```
herdr pane split --current --direction right --cwd <worktree-path> --no-focus
```

Then set it up: install dependencies and copy ignored config such as `.env` from the main checkout. Give concurrent worktrees **their own deployment stage**; never let parallel checkouts mutate the same deployment state.

## Sync

- Merge the target branch into the worktree branch (`git merge <target-branch>`) at checkpoints and before touching anything parallel work may have changed. Never rebase or rewrite shared branches.
- Run the full check suite after every sync.
- **Migrations**: if the target took a migration number this branch also uses, renumber this branch's migration, even without a textual conflict.
- **Lockfiles**: keep both sides' manifest changes and regenerate the lockfile; never hand-edit it.

## Finish

Do a final sync, get the checks green, push, and open a pull request. **Never merge into the target branch yourself**; that happens on the PR, when the user asks. No force-push, no bulk `--theirs`/`--ours` resolutions.

## Cleanup

Whoever created a worktree removes it; an agent working inside one leaves it alone. Once everything is committed, pushed, and in an open PR, remove it right away; later reviews or fixes use a fresh worktree.

```
git worktree remove <path>
git branch -d <branch>
```

Close any herdr pane you opened for it.

If it holds uncommitted or unpushed work, report that work and remove it only with the user's explicit approval.
