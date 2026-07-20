---
name: vps-setup-hardening
description: >-
  Runs a manually initiated, safety-gated Linux VPS setup and hardening
  workflow. Use this skill when, and only when, the user explicitly invokes
  vps-setup-hardening by name and supplies a VPS or SSH target, optionally with
  tool, firewall, access, and runtime preferences. Do not use for ordinary SSH
  administration, application deployment, compliance auditing, isolated
  package installation, targeted firewall repair, or automatic infrastructure
  changes.
license: MIT
compatibility: >-
  Requires SSH access to a supported Linux VPS, secure file transfer, root or
  non-interactive sudo, and independent access and exposure tests. Strict
  manual-only invocation is supported by Pi, Claude Code, and Codex; other
  harnesses may ignore invocation-control metadata.
disable-model-invocation: true
metadata:
  short-description: Manually set up and harden a Linux VPS
---

> **Manual-only gate:** If the user did not explicitly invoke `vps-setup-hardening` by name, stop without inspecting or changing any server. Explain that this skill is manual-only.

# VPS Setup and Hardening

## Critical rules

- Before connecting to or changing a server, read [`references/workflow.md`](references/workflow.md) completely and follow its gates in order.
- Treat invocation arguments and prior conversation as authoritative context. Do not ask the user to repeat a resolved choice or any discoverable fact.
- Never request passwords, private keys, provider API tokens, Tailscale auth keys, or other credentials. Do not expose keys, tokens, authentication URLs, or sensitive configuration in reports.
- Preserve the current working session through every SSH, Tailscale, firewall, and reboot change. Never remove an access path until its replacement succeeds in a fresh independent test.
- Stop at every human authentication, independent external test, provider-side change, access-closing action, unsupported-runtime approval, and reboot gate. Continue only from explicit evidence or confirmation for that gate.
- Never claim provider or security-group filtering from local server output. Distinguish local observations from user-confirmed provider state.
- Never describe UFW or ordinary host-input filtering as protection for Docker-published ports. Establish and externally test a provider or reviewed Docker-aware ingress boundary before installing Docker.
- Never modify local `~/.ssh/config` without separate explicit approval. If approved, preserve all unrelated entries and make the smallest targeted change. Prefer command-line overrides for tests.
- Never install an unsupported or Current runtime silently. Research its current lifecycle and maintained source, explain the consequence once, and obtain explicit approval.
- Use the bundled scripts rather than recreating their deterministic commands. Do not weaken or speculate past a script refusal.
- Always finish a completed run with verification, cleanup of only the staged temporary bundle, and the report defined by [`assets/final-report.md`](assets/final-report.md).

## Resources and execution

1. **Before any server action**, read [`references/workflow.md`](references/workflow.md) completely. It contains the required sequence, commands, approval gates, recovery behavior, verification, and provenance.
2. Stage and run the bundled [`scripts/`](scripts/) and [`assets/config/`](assets/config/) resources as directed by the workflow. Adapt only a private staged copy when the workflow explicitly permits it.
3. **Immediately before the final response**, read [`assets/final-report.md`](assets/final-report.md) and use its brief evidence-qualified structure.

Prefer a native persistent SSH/session capability when available. Otherwise use normal `ssh` with `scp`, `rsync`, or SFTP. Provider consoles and rescue mode are recovery paths, not the default execution path. Consult current official provider and runtime documentation through available web-research capabilities when the workflow requires current facts.

This skill has no runtime dependency on another catalog skill or on an `agent-recipes` checkout.

## Completion contract

A run is complete only when mutations were verified, intended access and exposure were tested independently, any approved reboot was followed by reconnection and repeated checks, staged resources were removed safely, and the final report distinguishes completed work, observed state, user-confirmed external state, incomplete checks, and remaining work.
