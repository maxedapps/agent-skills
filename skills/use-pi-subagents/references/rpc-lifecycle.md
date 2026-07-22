# Pi RPC lifecycle

Use this reference for the six-command contract, generation/timeout rules, stop semantics, and retained-resource recovery. The parent owns every workspace and Git operation; this runtime owns only the Pi RPC child and private run state.

## Commands

| Command | Purpose |
|---|---|
| `info` | Resolve `pi`, require version ≥ 0.81.1, perform a no-model RPC `get_state` handshake, exit cleanly. Creates no run state. |
| `run` | Start one supervised child for `--role scout\|research\|worker` with one assignment source, required `--cwd`, `--timeout`, optional `--async`. |
| `status` | List owned runs, or inspect one `--run`. Optional `--wait --timeout` bounds only the caller wait. Optional `--lines` bounds output. |
| `send` | Same-assignment continuation on a live run. Idle → RPC `prompt` (new generation). Running → requires `--behavior steer\|follow-up`. Optional `--wait`. |
| `stop` | Request RPC `abort`, grace period, close stdin, then signal only a freshly verified owned process group if required. |
| `clean` | Dry-run by default. With `--apply`, retire only script-owned run state/logs after liveness is safely absent. Never reads or changes cwd. |

## States and next actions

Manifest/runtime states: `starting`, `running`, `idle`, `failed`, `timedout`, `stopped`, `cleaned`.

Normalized `blocked` covers ambiguous identity, crashed-without-terminal-record, spontaneous abort, `length`, terminal `toolUse`, missing final text, unknown stop reasons, or contradictory assistant evidence.

| State | Typical next |
|---|---|
| `running` | `wait` / `status --wait` or active `send --behavior` |
| `idle` | review handoff, optional idle `send`, then `stop`/`clean` when done |
| `failed` / `timedout` / `blocked` | inspect output, `stop` if still live, retain or `clean` only when safe |
| `stopped` | parent Git/workspace work as needed, then `clean` |
| `cleaned` | retain tombstone only if useful; no further runtime action |

## Generations and timeouts

- One generation per accepted idle RPC `prompt`. Initial `run` is generation 1. Idle `send` starts generation N+1.
- Active `steer` and `follow_up` stay in the current generation, do not increment it, and drain before that generation’s single `agent_settled`.
- Each prompt generation has one execution deadline: `run --timeout` sets generation 1; idle `send --timeout` sets the next generation or inherits the run timeout. Active steering/follow-up cannot reset it. `status --wait --timeout` never changes execution.
- Control requests are serialized. A second idle prompt during the start transition is rejected. Pi-accepted active steering/follow-up may queue in request order.

## Classification boundary

`agent_settled` is only the point at which classification is safe. Inspect the terminal assistant message:

| Evidence | Result |
|---|---|
| `stopReason: stop` with required final text | `idle` (child remains live) |
| `stopReason: error` or `errorMessage` | `failed` |
| timeout-driven abort | `timedout` |
| explicit-stop abort | `stopped` |
| spontaneous `aborted`, `length`, terminal `toolUse`, missing text, unknown stop, contradictory evidence | `blocked` |

Never treat prompt acknowledgement, `agent_end` alone, or transport success as completion.

## Role launch boundary

All roles launch:

`pi --mode rpc --no-session --no-skills --no-prompt-templates --no-context-files --no-approve --tools <allowlist> --thinking <level> --system-prompt <run/system-prompt.txt>`

- Role system prompts come from [`assets/agents/`](../assets/agents/) (Herdr-aligned scout/research/worker bodies). The assignment text remains the user prompt.
- Thinking: scout `medium`; research/worker `high`.
- Scout/worker also pass `--no-extensions`.
- Research intentionally loads trusted user/global extension code and hooks so its web-tool allowlist can activate available web tools. `--no-approve` excludes project-local resources. The tool allowlist does not sandbox extension code. Research must report unavailable web capability rather than invent sources.
- Allowlists: scout `read,grep,find,ls`; research `read,grep,find,ls,web_search,fetch_content,get_search_content`; worker `read,grep,find,ls,bash,edit,write`.
- Worker profile matches Herdr approach/handoff but keeps VCS parent-owned (no child commits/worktrees), consistent with this runtime boundary.

## Stop and cleanup

1. Prefer control-socket `stop` → RPC `abort` → bounded grace → close Pi stdin → verified process-group signal only if still live.
2. `clean` without `--apply` is dry-run. Apply only when the owned process/group is safely absent and provenance still matches.
3. `clean` deletes only the exact run directory under the private state root and writes an idempotent tombstone. It never inspects, mutates, or removes the parent-supplied cwd or any Git object.

## Retained-resource recovery

If socket auth fails, process identity is ambiguous, the control socket is missing while the group appears live, or terminal evidence is contradictory: stop mutating, retain the run directory/manifest/logs, report `runId`, last state, runtime identity, cwd path, and the non-destructive next inspection step. Never force-kill unverified PIDs or delete ambiguous state.
