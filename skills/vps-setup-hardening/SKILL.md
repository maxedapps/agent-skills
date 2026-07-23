---
name: vps-setup-hardening
description: >-
  Runs a manually initiated, safety-gated VPS setup and hardening workflow for
  Ubuntu 24.04 LTS, Ubuntu 26.04 LTS, and Amazon Linux 2023 on EC2. Use this
  skill when, and only when, the user explicitly invokes vps-setup-hardening by
  name and supplies a VPS or SSH target, optionally with tool, firewall, access,
  and runtime preferences. Do not use for ordinary SSH administration,
  application deployment, compliance auditing, isolated package installation,
  targeted firewall repair, or automatic infrastructure changes.
license: MIT
compatibility: >-
  Requires SSH access to Ubuntu 24.04/26.04 or Amazon Linux 2023 on EC2, secure
  file transfer, root or non-interactive sudo, and independent access and
  exposure tests. Strict manual-only invocation is supported by Pi, Claude Code,
  and Codex; other harnesses may ignore invocation-control metadata.
disable-model-invocation: true
metadata:
  short-description: Manually set up and harden Ubuntu or AL2023 EC2 VPS
---

> **Manual-only gate:** If the user did not explicitly invoke `vps-setup-hardening` by name, stop without inspecting or changing any server. Explain that this skill is manual-only.

# VPS Setup and Hardening

Supports exactly two closed profiles:

| Profile | Host | Ingress |
|---|---|---|
| `ubuntu` | Ubuntu 24.04/26.04 (`amd64`/`arm64`) | No Docker: UFW. Docker: verified provider firewall. |
| `al2023-ec2` | Amazon Linux 2023 on positively identified EC2 (`x86_64`/`aarch64`) | EC2 Security Groups for every run. |

## Critical rules

- Before connecting to or changing a server, read [`references/workflow.md`](references/workflow.md) completely and follow its gates in order.
- After read-only inspection, load only the selected profile reference: [`references/ubuntu.md`](references/ubuntu.md) or [`references/al2023-ec2.md`](references/al2023-ec2.md).
- Treat invocation arguments and prior conversation as authoritative context. Do not ask the user to repeat a resolved choice or any discoverable fact. Ask only for required non-discoverable information, grouping unresolved choices into one compact question after inspection whenever possible.
- Never request passwords, private keys, provider API tokens, Tailscale auth keys, or other credentials. Do not expose keys, tokens, authentication URLs, or sensitive configuration in reports.
- Preserve the current working session through every SSH, Tailscale, firewall, Security Group, and reboot change. Never remove an access path until its replacement succeeds in a fresh independent test.
- Stop at every human authentication, independent external test, provider/SG change, access-closing action, and reboot gate. Continue only from explicit evidence or confirmation for that gate.
- Never claim provider or Security Group filtering from local server output. Distinguish local observations from user-confirmed provider state.
- Never describe UFW or ordinary host-input filtering as protection for Docker-published ports. Docker always requires a verified provider/SG boundary first.
- Never modify local `~/.ssh/config` without separate explicit approval. Prefer command-line overrides for tests.
- Use the bundled profile scripts rather than recreating their deterministic commands. Do not weaken or speculate past a script refusal. Unsupported hosts must fail before mutation.
- Always finish a completed run with verification, cleanup of only the staged temporary bundle, and the report defined by [`assets/final-report.md`](assets/final-report.md).

## Resources and execution

1. **Before any server action**, read [`references/workflow.md`](references/workflow.md) completely.
2. Stage and run the bundled [`scripts/`](scripts/) and [`assets/config/`](assets/config/) resources as directed. Invoke profile scripts under `scripts/ubuntu/` or `scripts/al2023-ec2/` directly—no dispatcher wrappers.
3. **Immediately before the final response**, read [`assets/final-report.md`](assets/final-report.md) and use its brief evidence-qualified structure.

Prefer a native persistent SSH/session capability when available. Otherwise use normal `ssh` with `scp`, `rsync`, or SFTP. Provider consoles and rescue mode are recovery paths, not the default execution path.

## Completion contract

A run is complete only when mutations were verified, intended access and exposure were tested independently, any approved reboot was followed by reconnection and repeated checks, staged resources were removed safely, and the final report distinguishes completed work, observed state, user-confirmed external state, incomplete checks, and remaining work.
