# VPS setup and hardening workflow

Read this file completely before connecting to or changing any server. Execute the phases in order and preserve every human gate. After inspection selects a profile, load only that profile reference and follow its commands.

## Contents

1. [Operating contract](#operating-contract)
2. [Phase 0 — Resolve run context](#phase-0--resolve-run-context)
3. [Phase 1 — Stage, inspect, select profile](#phase-1--stage-inspect-select-profile)
4. [Phase 2 — Base setup](#phase-2--base-setup)
5. [Phase 3 — Administrator and SSH hardening](#phase-3--administrator-and-ssh-hardening)
6. [Phase 4 — Optional Tailscale](#phase-4--optional-tailscale)
7. [Phase 5 — Ingress gate](#phase-5--ingress-gate)
8. [Phase 6 — Optional Docker and Node.js](#phase-6--optional-docker-and-nodejs)
9. [Phase 7 — Verification](#phase-7--verification)
10. [Phase 8 — Reboot, cleanup, report](#phase-8--reboot-cleanup-report)
11. [Failure and recovery](#failure-and-recovery)
12. [Provenance](#provenance)

## Operating contract

- Carry resolved choices across later turns. Ask only for required non-discoverable information.
- Keep the original SSH session open through all access-changing work.
- Stop for human authentication, fresh-login tests, provider/SG changes, exposure scans, access closure, and reboot approval.
- Never request passwords, private keys, provider API tokens, Tailscale auth keys, or secrets.
- Use bundled scripts without weakening confirmation flags. If a script rejects the host, stop—do not force past the rejection.
- Profiles are closed: `ubuntu` (24.04/26.04) and `al2023-ec2` (Amazon Linux 2023 on positively identified EC2). No generic distro/package-manager matrix.

## Phase 0 — Resolve run context

Extract from the request and conversation without re-asking:

- SSH target
- administrator name (if stated)
- Tailscale, Docker, Node.js (22/24), pnpm, and other tool choices
- ingress intent and intended public TCP/UDP ports
- intended final SSH mode: public key-only or traditional OpenSSH over Tailscale only
- for AL2023: any stated target release version

Safe defaults (apply without asking):

- Optional tools default to none.
- Docker administration defaults to `sudo docker`; Docker-group membership defaults to no.
- Node.js defaults to major 24 when selected.
- Tailscale uses traditional OpenSSH, never Tailscale SSH.
- Public application ports default to none.
- Without Docker on Ubuntu, ingress defaults to host UFW unless the user selected provider filtering.
- With Docker on either profile, ingress is external/provider/SG only. UFW alone is invalid for Docker.
- AL2023 always uses EC2 Security Groups.

A VPS/SSH target is required. If missing, ask one concise blocking question for the target only.

## Phase 1 — Stage, inspect, select profile

### Connect and stage

Use a native persistent SSH capability when available. Otherwise use normal `ssh`. Do not weaken login settings to connect.

```bash
umask 077
mktemp -d "${TMPDIR:-/tmp}/vps-setup-hardening.XXXXXX"
```

If `/tmp` is `noexec`, stage under the connected user's home. Transfer `scripts/` and `assets/config/` preserving relative paths. Never stage credentials.

```bash
cd <remote-temporary-directory>
test -f scripts/lib/common.sh
test -f assets/config/00-agent-recipes-hardening.conf
test -f assets/config/20auto-upgrades
test -f assets/config/52agent-recipes-unattended-upgrades
test -f assets/config/60-agent-recipes-journal.conf
chmod 700 scripts/*.sh scripts/*/*.sh
```

### Read-only inspection

```bash
./scripts/inspect-system.sh
```

Determine every gate input: exact profile and architecture, EC2 evidence, privilege, users/admin groups/key fingerprints (never key contents), SSH effective settings and `sshd_config.d` include, interfaces/listeners, firewall/SG evidence qualification, release/update state, reboot state, services/workloads, and installed optional tools.

Stop before mutation when:

- the host does not classify as `ubuntu` or `al2023-ec2`;
- the host is not plausibly fresh and the workflow could disrupt users or workloads;
- SSH or network state cannot be classified safely.

### Load the selected profile reference

| Profile | Reference |
|---|---|
| `ubuntu` | [`ubuntu.md`](ubuntu.md) |
| `al2023-ec2` | [`al2023-ec2.md`](al2023-ec2.md) |

Read that file completely. Do not load the other profile.

### Resolve remaining choices once

Ask one compact grouped question for required unresolved preferences only (admin name when no safe existing account, Docker ingress confirmation, public ports, final SSH mode, AL2023 concrete `releasever` after inspection reports candidates).

### Establish privilege

```bash
sudo -n true
```

If it fails, never ask for the password. Give the exact absolute staged command for the user to run with `sudo`.

## Phase 2 — Base setup

Follow the selected profile reference for the exact base command.

Common success criteria before continuing:

- packages updated per profile update model;
- basic administration tools present;
- time synchronization active;
- journald persistent and size-bounded;
- SSH and the current session remain usable;
- reboot requirement recorded but deferred.

## Phase 3 — Administrator and SSH hardening

### Configure administrator

Prefer existing `ubuntu` (Ubuntu) or `ec2-user` (AL2023) when it has a normal shell, private home, intended key, and `sudo`/`wheel`. Otherwise:

```bash
sudo ./scripts/configure-admin-user.sh --admin <admin-user>
# or with staged public-key file:
sudo ./scripts/configure-admin-user.sh \
  --admin <admin-user> \
  --authorized-keys-file <public-key-file>
```

Disclose once: no usable password; SSH is key-only; passwordless sudo means key possession is root-equivalent.

### Gate: independent login and sudo

Keep the original session open. Require a fresh second-terminal login:

```bash
ssh -p <ssh-port> <admin-user>@<target>
sudo -n true
```

Localhost and multiplexed control connections are insufficient. Do not continue until both succeed.

### Harden SSH

```bash
sudo ./scripts/harden-ssh.sh \
  --admin <admin-user> \
  --confirmed-login-tested
```

Requires standard `sshd_config.d` include. On failure the script rolls back. Keep the original session open and repeat the independent login + `sudo -n true` gate after reload. Do not alter maintained cipher/KEX/host-key defaults.

## Phase 4 — Optional Tailscale

Skip when Tailscale was not selected. Install with the profile script from the selected reference.

### Gate: human authentication

Keep public SSH available. Authentication is human-controlled. Profile references give the exact `tailscale up` flags. Never request an auth key. Never include authentication URLs in the final report.

Verify:

```bash
tailscale status
tailscale ip -4
tailscale ip -6
sudo tailscale debug prefs
```

Confirm connected, record addresses, and ensure `RunSSH` is false.

### Gate: independent OpenSSH-over-Tailscale

From a separate tailnet machine:

```bash
ssh -p <ssh-port> <admin-user>@<tailscale-ip-or-magicdns-name>
sudo -n true
```

Do not proceed toward public SSH closure until both succeed. Keep the successful tailnet session open.

## Phase 5 — Ingress gate

Complete before Docker. Preserve public SSH until a tested replacement exists.

Profile-specific steps live in the selected reference. Common rules:

- Every access-changing action requires an immediately preceding successful replacement-path gate.
- Provider/SG changes are human-applied; never request API tokens.
- Distinguish local observations from user-confirmed provider state.
- After closure, test fresh intended-path success and public IPv4/IPv6 failure with connection sharing disabled:

```bash
ssh -o ControlMaster=no -o ControlPath=none -o ConnectTimeout=5 \
  -p <ssh-port> <admin-user>@<public-ip>
```

## Phase 6 — Optional Docker and Node.js

Install only choices from Phase 0, using profile scripts only.

### Docker

Requires an established and externally tested provider/SG ingress boundary first. Stop if that condition is unmet. After install verify Engine, Compose, Buildx, service state, and `hello-world` cleanup. Use `sudo docker` by default; Docker-group membership needs separate root-equivalent approval.

### Node.js

Profile installer for major 24 (default) or explicit 22. Existing different major → refuse. Unsupported/Current majors need separate research and explicit approval with a private staged adaptation—never silent install.

### pnpm and other globals

Separate choices. Install exact versions from current official guidance; do not imply pnpm with Node.js.

## Phase 7 — Verification

### Independent external checks

- Fresh intended SSH path; public failure when tailnet-only.
- Complete public TCP scans:

```bash
nmap -Pn -p- <public-ipv4>
nmap -6 -Pn -p- <public-ipv6>
```

- Reconcile Docker publications with external evidence.
- Record UDP as tested or incomplete.

### Local verifier

Use the profile's exact verifier arguments from the selected reference. Resolve failures; contextualize warnings. The verifier emits pass/fail/warning evidence only—one final human report uses [`assets/final-report.md`](../assets/final-report.md).

## Phase 8 — Reboot, cleanup, report

### Gate: reboot approval

When reboot is required/advisable, state downtime, reconnect path, and provider console/rescue recovery. Reboot only with explicit approval. After reboot: reconnect on the intended path, rerun verifier, SSH tests, and public scans.

### Cleanup

Remove only the private staged execution directory after the last completed verification. Do not remove configuration backups, provider state, logs, or unrelated files.

### Final report

Read `assets/final-report.md` immediately before responding. Distinguish performed changes, observed local state, user-confirmed provider/SG state, independent external evidence, incomplete checks, and exact remaining maintenance work.

## Failure and recovery

- SSH hardening failure → bundled rollback; original session stays open.
- Firewall/SG refusal → inspect; never reset unknown policy.
- Replacement SSH failure → keep original access; troubleshoot first.
- Public SSH still reachable after intended closure → closure failed; inspect IPv4 and IPv6.
- Tailscale lost after closure → provider console/rescue; do not reopen broad root/password SSH.
- Installer rejection → stop with exact alternative or approval question.
- Incomplete verification → report incomplete; do not claim full verification.

## Provenance

Adapted from:

- Source repository: `https://github.com/maxedapps/agent-recipes`
- Source path: `recipes/vps-setup-hardening/`
- Imported commit: `7798b30517c13937d54fbf0413b4ac73f370b299`
- Simplified for Ubuntu 24.04/26.04 and AL2023 on EC2: `2026-07-23`

Legacy managed identifiers containing `agent-recipes` are retained in configuration filenames, firewall comments, backup suffixes, and state paths for idempotency on previously managed hosts. This skill is authoritative for this project; do not require bidirectional synchronization with `agent-recipes`.
