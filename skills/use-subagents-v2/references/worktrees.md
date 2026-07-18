# Worktree lifecycle

Read this file completely before every worker launch and reread it immediately before integration or cleanup. The parent executes every step; workers never integrate or remove resources.

## Contents

- Safety invariants and isolated launch
- Wait/stop and evidence inspection
- Integration dry-run and explicit apply
- Parent validation and ancestry proof
- Cleanup dry-run, non-force apply, and recovery

## Safety invariants

- One worker, one exact generated branch, one isolated worktree, one ownership manifest.
- Record `baseHead`, `workerBranch`, `workerPath`, runtime target, and later `workerHead`; never reconstruct identity from naming guesses.
- The parent and sibling lanes do not mutate an active worker lane.
- Never force, stash, reset, clean, raw-delete, or use `git branch -D`.
- Dirty, uncommitted, conflicted, moved, unintegrated, live, unknown, or unverifiable state is retained with its pane/process, worktree, branch, and manifest.

## 1. Launch isolated

From the clean parent repository, record the immutable base and create the generated branch/worktree:

```sh
baseHead=$(git rev-parse HEAD)
git status --short --branch
git worktree add -b "$workerBranch" "$workerPath" "$baseHead"
git -C "$workerPath" rev-parse --show-toplevel
git -C "$workerPath" rev-parse HEAD
git worktree list --porcelain
```

Set `workerBranch` and `workerPath` from the parent-owned manifest, not child input. Abort before launch if the parent is unexpectedly dirty, creation fails, paths do not match, or the branch/worktree is already owned. If a runtime provides a worktree creator, use only its current documented non-force form and record the resulting Git identities with the commands above.

Launch only inside `workerPath`. Keep the manifest until acceptance and cleanup both succeed.

## 2. Wait or stop, then inspect

After the runtime reaches a terminal outcome or is safely stopped, the parent inspects before trusting the handoff:

```sh
git -C "$workerPath" status --short --branch
git -C "$workerPath" diff --check
git -C "$workerPath" diff --stat "$baseHead"..HEAD
git -C "$workerPath" diff "$baseHead"..HEAD --
git -C "$workerPath" log --oneline --decorate "$baseHead"..HEAD
workerHead=$(git -C "$workerPath" rev-parse HEAD)
git worktree list --porcelain
```

Review worker check output and rerun focused checks when useful. Require all task changes to be committed, the worktree to be clean, commits to contain only assigned changes, and `workerHead`/branch/path to match the manifest:

```sh
test -z "$(git -C "$workerPath" status --porcelain=v1)"
test "$(git -C "$workerPath" branch --show-current)" = "$workerBranch"
test "$(git rev-parse "$workerBranch")" = "$workerHead"
```

Any failed or ambiguous check retains all resources. Do not repair child work by stashing, resetting, cleaning, or forcing it.

## 3. Reread, dry-run, and explicitly integrate

Reread this entire file now. Confirm the parent checkout is the recorded integration branch and clean. Require the parent's explicit review and worker-check attestations. Capture `parentHead=$(git rev-parse HEAD)`, review commits and diff again, and perform a non-mutating integration dry-run.

Fast-forward is the default. Its dry-run must prove that current parent HEAD is an ancestor of `workerHead` and preview the exact range:

```sh
parentHead=$(git rev-parse HEAD)
test -z "$(git status --porcelain=v1)"
git merge-base --is-ancestor "$parentHead" "$workerHead"
git log --oneline --decorate "$parentHead".."$workerHead"
git diff --stat "$parentHead".."$workerHead"
```

Only after that dry-run passes, explicitly apply:

```sh
git merge --ff-only "$workerHead"
```

A non-fast-forward merge requires explicit authorization. Probe `git merge-tree -h`; when the installed Git documents the two-branch `--write-tree` form, preflight without changing the checkout or refs:

```sh
git merge-tree --write-tree --quiet "$parentHead" "$workerHead"
```

A zero exit is required. If that non-mutating form is unavailable, retain and report instead of simulating a dry-run with a mutating merge. Then and only then explicitly apply the authorized merge:

```sh
git merge --no-ff "$workerHead"
```

Never auto-resolve a conflict. Inspect and report it, run `git merge --abort`, verify the parent returned to its recorded clean branch/HEAD, retain all worker resources, and begin a fresh integration attempt. Manual conflict resolution cannot unlock automated cleanup in this version.

## 4. Parent validation and ancestry proof

The parent reviews the integrated diff and reruns all relevant focused and repository checks. Validation failure blocks cleanup. After checks pass, prove integration using fresh values:

```sh
parentHead=$(git rev-parse HEAD)
git merge-base --is-ancestor "$workerHead" "$parentHead"
```

Exit status zero is required. This proof is necessary even when the integration command reported success.

## 5. Cleanup dry-run, non-force apply, exact branch delete

Cleanup dry-run comes only after parent validation and ancestry proof. Reconfirm manifest identity, worker cleanliness, worktree registration, branch/HEAD equality, ancestry, and that no process or pane is live in the worktree:

```sh
test -z "$(git -C "$workerPath" status --porcelain=v1)"
test "$(git -C "$workerPath" branch --show-current)" = "$workerBranch"
test "$(git rev-parse "$workerBranch")" = "$workerHead"
git merge-base --is-ancestor "$workerHead" "$(git rev-parse HEAD)"
git worktree list --porcelain
```

If any identity, liveness, cleanliness, registration, or ancestry fact is unknown, stop and retain. After the dry-run passes, apply cleanup without force. Use the owning runtime's currently documented non-force worktree removal, or Git directly:

```sh
git worktree remove "$workerPath"
git branch -d "$workerBranch"
```

The final command must target the exact generated branch recorded in the manifest. Never substitute `-D`, a wildcard, raw filesystem removal, or a guessed branch. Confirm the worktree and branch are absent before retiring the manifest.

## Recovery report

For a blocked phase, report the manifest identities, last safe completed step, exact failed command/result, current status/diff/log/HEAD, runtime liveness, and retained pane/process, worktree, branch, and manifest. Offer only non-destructive next steps; acceptance and cleanup remain pending.
