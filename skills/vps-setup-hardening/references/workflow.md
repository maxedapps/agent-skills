# VPS setup and hardening workflow

Read this file completely before connecting to or changing any server. Execute the phases in order and preserve every human gate.

## Contents

1. [Operating contract](#operating-contract)
2. [Phase 0 — Resolve run context](#phase-0--resolve-run-context)
3. [Phase 1 — Stage and inspect](#phase-1--stage-and-inspect)
4. [Phase 2 — Establish the base](#phase-2--establish-the-base)
5. [Phase 3 — Administrator and SSH hardening](#phase-3--administrator-and-ssh-hardening)
6. [Phase 4 — Install and authenticate Tailscale](#phase-4--install-and-authenticate-tailscale)
7. [Phase 5 — Establish the ingress boundary](#phase-5--establish-the-ingress-boundary)
8. [Phase 6 — Install optional tools](#phase-6--install-optional-tools)
9. [Phase 7 — Final verification](#phase-7--final-verification)
10. [Phase 8 — Reboot, reconnect, and report](#phase-8--reboot-reconnect-and-report)
11. [Failure and recovery behavior](#failure-and-recovery-behavior)
12. [Provenance and maintenance](#provenance-and-maintenance)

## Operating contract

Follow these rules throughout:

- Treat the user's request and established conversation context as the run record. Carry resolved choices across later turns.
- Ask only for required, non-discoverable information. Group unresolved choices into one compact question after inspection whenever possible.
- Keep the original SSH session open through all access-changing work. A local loopback test is never a replacement for an independent login.
- Stop for human authentication, fresh-login tests, provider-side changes, exposure scans, access closure, unsupported-runtime approval, and reboot approval.
- Never request or handle passwords, private keys, provider API tokens, Tailscale auth keys, or secrets in chat or script arguments.
- Use current official provider/runtime documentation for provider rules, EOL status, and non-default runtime support.
- Use provider console or rescue mode only for recovery.
- Use the bundled scripts without weakening confirmation flags or fail-closed checks. If a script rejects the host, preserve the required outcome and ordering while adapting conservatively; do not force past the rejection.

## Phase 0 — Resolve run context

Extract these values from the user's request and prior conversation without asking again:

- SSH target, hostname, IP, or configured alias
- requested administrator name
- Tailscale, Docker, Node.js, pnpm, and other tool choices
- host versus external/provider ingress strategy
- provider identity, when stated or discoverable without credentials
- intended public TCP and UDP ports
- intended final SSH mode: public key-only or traditional OpenSSH over Tailscale only
- requested runtime versions

A VPS or SSH target is required to inspect the server. If it is missing, ask one concise blocking question for the target; do not require the user to restart or repeat the rest of the request.

Infer only safe defaults:

- Optional tools default to none.
- Docker administration defaults to `sudo docker`; Docker-group membership defaults to no.
- Node.js defaults to the current supported LTS line implemented by the bundled installer.
- Tailscale uses traditional OpenSSH, never Tailscale SSH.
- Public application ports default to none.
- With Tailscale selected, final SSH defaults to tailnet-only only when the user requested that closure; otherwise keep approved key-only public SSH.
- Without Docker, `host` is the normal firewall strategy unless the user selected provider filtering.
- With Docker, require `external` provider filtering or a separately reviewed Docker-aware host policy. UFW alone is invalid.

Apply these defaults without asking. Mark any remaining non-discoverable preferences as unresolved and defer them until after read-only inspection. Record resolved values for all later script commands and the final report. Do not relitigate an approved choice unless new inspection evidence invalidates it.

## Phase 1 — Stage and inspect

### Connect without changing access

Use a native persistent SSH capability when available. Otherwise use normal `ssh`. Do not weaken login settings, create passwords, or alter firewall rules to establish the first connection.

Create a private temporary directory on the VPS:

```bash
umask 077
mktemp -d "${TMPDIR:-/tmp}/vps-setup-hardening.XXXXXX"
```

If `/tmp` is mounted `noexec`, create the private directory under the connected user's home instead.

Stage the complete execution bundle into that directory with secure transfer. Include `scripts/` and `assets/config/` and preserve their relative paths. Prefer an available native transfer capability, `rsync`, `scp`, or SFTP without asking the user to choose first. If the harness cannot transfer files, give one exact command with resolved local source and remote destination.

Verify the staged bundle:

```bash
cd <remote-temporary-directory>
test -f scripts/lib/common.sh
test -f assets/config/00-agent-recipes-hardening.conf
test -f assets/config/20auto-upgrades
test -f assets/config/52agent-recipes-unattended-upgrades
test -f assets/config/60-agent-recipes-journal.conf
chmod 700 scripts/*.sh
```

Never stage credentials, private keys, tokens, or unrelated files. Remember the exact path for every human handoff.

### Run read-only inspection

```bash
./scripts/inspect-system.sh
```

Determine:

- distribution, release, architecture, package manager, and lifecycle support
- current user and availability of root or non-interactive sudo
- current SSH port and effective authentication settings
- users, authorized-key fingerprints, and administrative groups without printing key contents
- interfaces, public IPv4/IPv6 presence, routes, listeners, and current SSH path
- UFW, firewalld, nftables, provider/private networking evidence, and Tailscale state
- running/enabled/failed services and plausible workloads
- automatic updates, reboot policy, time synchronization, AppArmor/SELinux, storage, and reboot-required state
- installed Docker, Node.js, npm, pnpm, and other requested tools

Stop before mutation when:

- the release is end-of-life; recommend migration instead;
- the host is not plausibly fresh and the workflow could disrupt users, workloads, firewall policy, container networking, or package sources;
- SSH or network state cannot be classified safely;
- the platform is unsupported and no conservative equivalent is clear.

Do not remove provider agents, cloud-init, networking/storage services, or unfamiliar listeners speculatively.

### Resolve remaining choices once

Use the inspection and existing context to eliminate discoverable questions. Then ask one compact grouped question containing only required unresolved preferences. Typical items are the administrator name when no safe existing account can be selected, an ingress strategy when Docker was requested, and any ambiguous public-port or final-access requirement. Do not ask about optional tools that defaulted to none, platform facts, or choices already answered. When Docker is requested and ingress remains unresolved, explain in one sentence that UFW does not control Docker-published traffic.

If the target itself was missing earlier, that necessary connection question may be separate; still group all post-inspection choices into this single question.

### Establish privilege

If not root, test once without prompting:

```bash
sudo -n true
```

If it fails, never ask for the password. Stop and give the exact absolute staged command the user must run with `sudo`; inspect the result afterward.

## Phase 2 — Establish the base

Run the selected strategy exactly:

```bash
sudo ./scripts/apply-base-setup.sh --firewall <host|external>
```

`host` prepares a supported host-firewall package without activating it. `external` installs no host firewall and does not disable an existing one.

Verify before continuing:

- package metadata and installed OS packages were updated;
- basic administration and trusted-download tools exist;
- automatic security updates use the supported distribution mechanism;
- automatic reboot remains disabled;
- time synchronization is active;
- logs are persistent and size-bounded;
- SSH remains active and the current session remains usable.

Use the distribution-supported security-update timer when the script warns about an unimplemented platform. Do not invent uncontrolled release-upgrade cron jobs. Record a reboot requirement but defer reboot.

## Phase 3 — Administrator and SSH hardening

### Configure a named administrator

Prefer an existing intended non-root administrator only when it already has a normal shell, private home, intended key, and administrative group. Otherwise use the resolved name and reuse the currently working public key:

```bash
sudo ./scripts/configure-admin-user.sh --admin <admin-user>
```

When no reusable key exists, ask for a public-key file already staged on the VPS—not key contents in chat:

```bash
sudo ./scripts/configure-admin-user.sh \
  --admin <admin-user> \
  --authorized-keys-file <public-key-file>
```

Explain once:

- the account has no usable password;
- SSH is key-only;
- passwordless sudo means possession of the SSH key is root-equivalent.

### Gate: independent login and sudo test

Keep the original session open. Stop and require a second-terminal login through the current external path:

```bash
ssh -p <ssh-port> <admin-user>@<target>
sudo -n true
```

The test must open a fresh connection with the intended identity. Localhost and an existing multiplexed control connection are insufficient. Troubleshoot keys, ownership, permissions, provider policy, and SSH logs while preserving the original session.

Do not continue until the user confirms both commands succeeded.

### Harden SSH

Only after the gate succeeds:

```bash
sudo ./scripts/harden-ssh.sh \
  --admin <admin-user> \
  --confirmed-login-tested
```

The script must disable root, password, and keyboard-interactive login; keep public-key authentication; validate syntax and effective values; roll back on failure; and reload sshd without changing the firewall.

Keep the original session open. Stop again and require a new independent administrator login plus `sudo -n true` after reload. Do not change the SSH port merely as a security measure or replace maintained distro cryptographic defaults with copied lists.

Review listeners and services again. Expose only explicitly approved services, bind private services to loopback or a private/tailnet address, and keep AppArmor or SELinux enabled.

## Phase 4 — Install and authenticate Tailscale

Skip this phase when Tailscale was not selected.

Install from Tailscale's stable official repository:

```bash
sudo ./scripts/install-tailscale.sh
```

### Gate: human authentication

Keep public SSH and the current session available. Hand authentication to the user:

```bash
sudo tailscale up --ssh=false
```

Do not request an auth key. The user opens any authentication URL directly; never include that URL in the final report.

After the user confirms authentication, verify:

```bash
tailscale status
tailscale ip -4
tailscale ip -6
sudo tailscale debug prefs
```

Confirm the node is connected, record available Tailscale addresses, and ensure `RunSSH` is false. This workflow uses the existing OpenSSH daemon over the tailnet.

### Gate: independent OpenSSH-over-Tailscale test

From a separate tailnet-connected machine, stop and require:

```bash
ssh -p <ssh-port> <admin-user>@<tailscale-ip-or-magicdns-name>
sudo -n true
```

Keep the successful tailnet session open. For aliases or 1Password-backed SSH identities, preserve the alias identity settings with command-line overrides, for example:

```bash
ssh -o HostName=<tailscale-ip> -o User=<admin-user> -p <ssh-port> <existing-alias>
```

Do not edit `~/.ssh/config` merely to test. Do not continue toward public SSH closure until fresh traditional OpenSSH and sudo both succeed over Tailscale.

For shared or multi-administrator tailnets, briefly recommend a least-privilege grant/ACL review without designing a complex policy unless requested.

## Phase 5 — Establish the ingress boundary

Complete this phase before Docker installation. Preserve public SSH until a tested replacement exists.

### External/provider strategy

Identify the provider and consult its current official firewall/security-group documentation. Never request an API token. Give exact provider UI or user-executed actions for the correct VPS.

If Tailscale is selected and tailnet-only SSH is intended:

1. Keep the successful tailnet SSH session open.
2. Ensure the firewall is attached to the correct VPS and covers both public IPv4 and IPv6.
3. Allow only:
   - optional ICMP and ICMPv6;
   - optional inbound UDP 41641 for direct Tailscale connectivity (DERP fallback does not require it);
   - explicitly approved public application TCP/UDP ports.
4. Remove inbound public TCP `<ssh-port>` for `0.0.0.0/0`, `::/0`, and any other public source ranges.
5. Leave outbound unrestricted unless a separate approved egress policy accounts for package repositories, Tailscale, DNS, and time synchronization.
6. Stop while the user applies and confirms the provider change.
7. Test fresh tailnet SSH success and public SSH failure without reusing a control connection.

Use:

```bash
ssh -p <ssh-port> <admin-user>@<tailscale-ip-or-magicdns-name>
ssh -o ControlMaster=no -o ControlPath=none -o ConnectTimeout=5 \
  -p <ssh-port> <admin-user>@<public-ip>
```

When public SSH remains intended, retain TCP `<ssh-port>` only from explicitly approved sources when practical and test a fresh public login after attachment.

Explain the enforcement boundary accurately: sshd may still listen on public host interfaces. The provider firewall blocks reachability; detaching or misapplying it can expose key-only SSH and public Docker bindings. Provider console or rescue mode is the recovery path.

Do not infer provider filtering from `ss`, nftables, Docker, UFW, or local service output.

### Host-firewall strategy

Use this path for non-Docker hosts or only alongside a separately approved Docker-aware/provider control.

Initially preserve public SSH:

```bash
sudo ./scripts/apply-firewall.sh
```

Pass only explicitly approved ports:

```bash
sudo ./scripts/apply-firewall.sh --allow-tcp 80 --allow-tcp 443
```

If Docker is planned and a distinct Docker-aware boundary has already been established and externally tested:

```bash
sudo ./scripts/apply-firewall.sh \
  --docker-planned \
  --confirmed-docker-ingress-control
```

The script must stop on conflicting managers, unmanaged policy, unknown rules, or unsafe Docker assumptions. Never reset or override unknown firewall state merely to proceed. Keep the original session open and test fresh public SSH after activation.

When Tailscale is selected and tailnet-only SSH is intended, only after the independent Tailscale test run:

```bash
sudo ./scripts/close-public-ssh.sh \
  --confirmed-tailscale-ssh-tested
```

Then repeat fresh tailnet success and public failure tests. Do not mark closure complete until both outcomes are observed. UFW/firewalld host-input policy must never be presented as the Docker published-port boundary.

## Phase 6 — Install optional tools

Install only choices recorded in Phase 0.

### Docker

Docker requires an established and externally tested provider or reviewed Docker-aware ingress boundary. Stop before installation if that condition is not met.

Install from Docker's official repository:

```bash
sudo ./scripts/install-docker.sh
sudo docker info
sudo docker compose version
sudo docker buildx version
```

The installer runs `hello-world`, verifies Engine, Compose, Buildx, and service state, and removes its test container. Confirm no test container remains.

Use `sudo docker` by default. Only after separate explicit root-equivalent approval add the administrator to the Docker group:

```bash
sudo ./scripts/install-docker.sh --admin <admin-user>
```

Treat every published port as an exposure decision. Bind private ports explicitly to `127.0.0.1`, `::1`, or an intended Tailscale address. Publish to wildcard/public addresses only for explicitly approved services covered by the independent ingress boundary.

### Node.js

Use the bundled installer for its supported LTS default:

```bash
sudo ./scripts/install-nodejs.sh
```

Use `--major <supported-major>` only for an explicit supported workload requirement shown by `--help`.

If the user requests a Current, non-LTS, or installer-unsupported major:

1. Research the current official Node.js lifecycle and maintained package-source support.
2. State the support and upgrade consequence once.
3. Stop for explicit approval.
4. Adapt only the private staged temporary installer; never modify the installed skill or silently normalize the version as a default.
5. Preserve architecture, signing-key, repository, pinning, existing-version, and post-install verification checks.

Never install an EOL distro package merely because it is available.

### pnpm and other global tools

Treat each as a separate choice. Use current official installation guidance, resolve an exact version, install that exact version, and report it. Do not install pnpm implicitly with Node.js.

## Phase 7 — Final verification

### Independent external checks

From an independent machine, test the intended fresh SSH path and, when tailnet-only mode is intended, confirm public SSH failure. Disable SSH connection sharing for the negative test.

Scan all TCP ports on every public address:

```bash
nmap -Pn -p- <public-ipv4>
nmap -6 -Pn -p- <public-ipv6>
```

If `nmap` is unavailable, use an equivalent complete external TCP scan or mark the check incomplete. Confirm only explicitly approved ports are open. Account separately for IPv4 and IPv6. Record that UDP scanning was not performed unless it actually was.

Review every Docker-published binding locally and reconcile it with independent scan evidence. Local firewall, listener, nftables, and Docker output cannot replace external evidence.

### Local verifier

Run the verifier with the chosen access and firewall modes.

Host firewall:

```bash
sudo ./scripts/verify-setup.sh \
  --admin <admin-user> \
  --ssh-access <public|tailscale-only> \
  --firewall host
```

External/provider firewall only after the independent checks above:

```bash
sudo ./scripts/verify-setup.sh \
  --admin <admin-user> \
  --ssh-access <public|tailscale-only> \
  --firewall external \
  --confirmed-external-firewall-tested
```

The external confirmation records completed evidence; it does not prove or classify provider policy locally.

Resolve failures and contextualize every warning. Verify:

- administrator, authorized keys, and non-interactive sudo;
- sshd syntax and effective root/password/keyboard-interactive/public-key settings;
- intended SSH path and public failure when applicable;
- Tailscale connectivity, addresses, and Tailscale SSH disabled;
- host firewall state or explicitly identified external evidence basis;
- time synchronization;
- AppArmor or SELinux;
- automatic security updates and no automatic reboot;
- failed services, storage capacity, and reboot requirement;
- listeners and all Docker-published ports;
- Docker Engine, Compose, Buildx, and service state;
- exact installed Node.js, npm, pnpm, and other requested tool versions.

Do not use `none` for any category until it was checked.

## Phase 8 — Reboot, reconnect, and report

### Gate: reboot approval

When reboot is required or advisable, state concisely:

- expected downtime;
- the exact intended reconnect path;
- provider console/rescue recovery if the path fails.

Ask for explicit approval. Never reboot from an ambiguous or unverified access state.

If approval is declined or deferred, do not reboot. Record the pending reboot in the final report and continue to cleanup after the final pre-reboot verification.

If approved, reboot while retaining recovery context. Reconnect only through the intended final path. Verify the active kernel, rerun the same local verifier, repeat intended/public SSH tests, and repeat complete public IPv4/IPv6 TCP scans. Record whether UDP was tested.

### Cleanup

After the last completed verification—post-reboot when rebooted, otherwise pre-reboot—remove only the private staged execution directory. Confirm the resolved path is the run's temporary bundle before deletion. Do not remove script-created configuration backups, provider state, logs, or unrelated files.

### Final report

Immediately before responding, read `assets/final-report.md` from this skill and follow it. Keep the report brief. Distinguish:

- changes actually performed;
- observed local state;
- user-confirmed provider state;
- independent external evidence;
- checks not completed;
- exact remaining work.

Never include keys, tokens, authentication URLs, full firewall dumps, or unrelated configuration.

## Failure and recovery behavior

- On SSH hardening failure, rely on the bundled rollback and inspect effective configuration while the original session remains open.
- On firewall refusal, inspect unknown state; never reset, flush, or force an unclassified policy.
- If replacement SSH fails, keep public/original access unchanged and troubleshoot before proceeding.
- If public SSH remains reachable after intended closure, treat closure as failed and inspect both IPv4 and IPv6 provider/host rules.
- If Tailscale is lost after closure, use the provider console or rescue mode; do not reopen broad root/password SSH as the default recovery.
- If a package installer rejects the platform or version, stop with an exact supported alternative or approval question rather than improvising an unmaintained source.
- If verification is incomplete, report it as incomplete and do not claim the setup is fully verified.

## Provenance and maintenance

This workflow was adapted from:

- Source repository: `https://github.com/maxedapps/agent-recipes`
- Source path: `recipes/vps-setup-hardening/`
- Imported commit: `7798b30517c13937d54fbf0413b4ac73f370b299`
- Synchronized: `2026-07-20`

Legacy managed identifiers containing `agent-recipes` are intentionally retained in configuration filenames, firewall comments, backup suffixes, and state paths. This preserves compatibility and idempotency on hosts previously configured by the source recipe.

When either implementation changes, compare the workflow and scripts explicitly, port applicable safety fixes, rerun metadata/link/script/manual-invocation checks, and exercise the external-firewall + Tailscale + Docker path on a disposable VPS. Update the imported commit and synchronization date. Do not add a local-path-dependent synchronization script.
