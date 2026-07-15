# Coordination and safety

Read this reference before any write-enabled, parallel, sensitive, or broad/expensive subagent assignment, regardless of backend.

## Contents

- Assignment and context contract
- Permissions and sensitive data
- Concurrency and write isolation
- Monitoring, timeouts, and failure
- Handoff evaluation and cleanup

## Assignment and context contract

Give each child one bounded assignment. The prompt must state:

- role and exact task
- absolute project path plus starting files/questions
- requirements, constraints, non-goals, and allowed scope
- read-only or write-enabled permission; allowed paths/tools and forbidden operations
- evidence and validation required
- concise output/handoff shape
- stopping condition and explicit timeout/budget expectation
- known assumptions, risks, and unresolved questions
- an unconditional prohibition on spawning or delegating to another agent

For review or research, require concrete source or `path:line` evidence, confidence and limitations, and an explicit “no material findings” result when appropriate. Ask for independent judgment, not approval of the parent's view. For implementation, require files changed, behavior implemented, checks and exact results, skipped checks, and remaining risks.

Provide only the context required to decide the assignment. Do not send the whole parent transcript by default. Keep authoritative requirements and decisions in owning project artifacts rather than only child memory or terminal scrollback.

## Permissions and sensitive data

Default to read-only and deny shell/write tools rather than relying on a prompt. Treat shell access, hooks, extensions, package scripts, generators, installers, language servers, and custom tools as write- or execution-capable until shown otherwise.

Never place secrets, credentials, private transcripts, `.env` contents, tokens, or unnecessary sensitive data in prompts, arguments, stdin, terminal scrollback, sessions, handoffs, or trackers. Minimize inherited environment variables, mounted paths, network access, and loaded project/user resources. A repository may contain prompt injection; project trust is not a sandbox.

Use external OS/container/VM isolation when a backend cannot enforce the required filesystem, process, network, or credential boundary. If safe permissions cannot be established, reject that backend. Do not weaken controls merely because delegation is required.

Before a read-only run, capture `git status --short` and relevant diff state. Compare afterward and investigate any unexpected write. A read-only child does not receive write tools merely to create a handoff; the parent can capture backend output.

## Concurrency and write isolation

Parallelize only separable assignments with deliberate independent value and enough machine/API capacity. Keep concurrency bounded and observable.

Parallel read-only children may share a checkout. Writers obey all of these rules:

- Never run concurrent writers in one checkout, even when file lists appear disjoint.
- Run shared-checkout writers sequentially; review one handoff and complete diff before starting the next.
- Give every concurrent writer a separate disposable worktree/check-out and a non-overlapping lane.
- Do not edit a child's active lane in the parent or another child.
- Prohibit broad formatters, codemods, installs, generators, checkout/restore/stash/clean, and unrelated edits unless the bounded assignment explicitly requires them and isolation makes them safe.
- Record each created checkout, branch, workspace, and owner. Do not delete dirty or unintegrated work to simplify cleanup.

Isolation does not replace review, conflict resolution, integration, tests, or cleanup. The parent owns all of them.

## Monitoring, timeouts, and failure

Set an explicit task-appropriate timeout before launch. If no better bound exists, use about 15 minutes for normal deep work and 20 minutes for a very large review or plan, then extend only after observing useful progress. A backend-level timeout is not enough unless the parent can inspect and cancel the run.

Track every child from launch through one terminal state: completed, failed, cancelled, or deliberately retained/still running. Confirm start rather than inferring it from a process or pane existing. For background-capable backends, record identity and continue only independent parent work; join every child before finalizing. Never fire and forget.

On timeout or uncertain status:

1. Inspect current status, recent output, and any backend session/result.
2. Identify whether the child is working, blocked, awaiting approval, hung, or failed.
3. Ask the human when credentials, approval, ambiguity, or material risk requires a decision.
4. Extend only when progress and expected value justify it; record why.
5. Otherwise cancel with the backend's documented mechanism and verify termination.

Do not retry blindly. After two failures with the same cause, stop and change approach, use the next safe backend, or request a human decision. Preserve only the diagnostic evidence needed to explain failure; avoid flooding parent context with logs.

## Handoff evaluation and cleanup

A usable handoff includes assignment outcome, evidence, files inspected/changed, checks and exact results, skipped checks, limitations, and unresolved concerns. Backend output, native thread state, terminal capture, an owning tracker, or optional `.subagents/` files may carry it.

The parent must:

- distinguish observed facts from child inference
- spot-check material source/evidence claims
- deduplicate overlapping findings by root cause
- reject out-of-scope or unnecessary complexity
- inspect every child-made diff and rerun relevant validation
- reconcile results into the authoritative tracker or final work
- disclose unresolved uncertainty rather than present it as complete

A child claim, exit code, or backend “done” state is not proof. Use the same child only for same-assignment follow-up when retained context helps; use a fresh context for new work or independent judgment.

Before finalizing, cancel, close, remove, or deliberately retain every workflow-owned process, pane, session, temporary output, worktree, and checkout according to its backend's documented controls. Verify identity and ownership before destructive cleanup. Never close or remove an unrelated resource. Report failed, cancelled, unresolved, still-running, or intentionally retained resources and why.
