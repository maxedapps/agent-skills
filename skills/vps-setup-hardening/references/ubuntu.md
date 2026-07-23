# Ubuntu 24.04 / 26.04 profile

Load only after inspection classifies the host as `ubuntu`. Supported: Ubuntu 24.04 LTS and 26.04 LTS on `amd64`/`arm64` with systemd and a standard top-level `sshd_config.d` include.

## Fixed contract

| Area | Behavior |
|---|---|
| Updates | APT full upgrade; Ubuntu unattended security updates; automatic reboot disabled |
| Ingress without Docker | UFW host firewall |
| Ingress with Docker | Independently verified provider firewall only; do not install or rely on UFW for Docker |
| Docker | Docker official APT repository; Engine, Compose, Buildx, `hello-world` required |
| Node.js | NodeSource APT; 24 default, 22 explicit; `amd64`/`arm64` |
| Tailscale | Official stable APT repository; `tailscale up --ssh=false` |

## Base setup

```bash
# Without Docker (prepare UFW package, do not activate yet):
sudo ./scripts/ubuntu/apply-base-setup.sh --ingress host

# With Docker or provider-only filtering (never installs/disables a host firewall):
sudo ./scripts/ubuntu/apply-base-setup.sh --ingress external
```

`--ingress host` is valid only when Docker will not be installed. `host` + Docker is rejected later by verification and must not be selected.

Confirm: packages upgraded; `unattended-upgrades` configured; no automatic reboot; time sync active; journald persistent/bounded; SSH session usable.

## Administrator and SSH

Shared scripts from the common workflow:

```bash
sudo ./scripts/configure-admin-user.sh --admin <admin-user>
# Gate: fresh ssh + sudo -n true
sudo ./scripts/harden-ssh.sh --admin <admin-user> --confirmed-login-tested
# Gate: fresh ssh + sudo -n true again
```

Prefer existing `ubuntu` when it already meets the intended-admin criteria.

## Tailscale (optional)

```bash
sudo ./scripts/ubuntu/install-tailscale.sh
```

### Gate: authenticate

```bash
sudo tailscale up --ssh=false
```

Then `tailscale status`, addresses, and `RunSSH: false`. Independent OpenSSH-over-Tailscale test before any public SSH closure.

## Ingress

### Provider / external (required for Docker; optional otherwise)

1. Identify the provider and consult current official firewall documentation.
2. Attach/adjust the correct firewall for this VPS covering public IPv4 and IPv6.
3. Allow only approved ports (optional ICMP/ICMPv6; optional UDP 41641 for direct Tailscale; approved app ports).
4. For tailnet-only SSH: remove public TCP `<ssh-port>` from `0.0.0.0/0`, `::/0`, and other public sources after the Tailscale login gate succeeds.
5. Stop for user confirmation of the provider change.
6. Test intended-path success and public failure independently.

Do not infer provider filtering from local `ss`/nftables/UFW/Docker output.

### Host UFW (non-Docker only)

Initially preserve public SSH:

```bash
sudo ./scripts/ubuntu/apply-firewall.sh
# approved ports:
sudo ./scripts/ubuntu/apply-firewall.sh --allow-tcp 80 --allow-tcp 443
```

Test fresh public SSH after activation. Unknown UFW rules → script refuses; never reset unknown policy to proceed.

When Tailscale is selected and tailnet-only SSH is intended, only after the independent Tailscale gate:

```bash
sudo ./scripts/ubuntu/close-public-ssh.sh --confirmed-tailscale-ssh-tested
```

Repeat fresh tailnet success and public failure tests on IPv4 and IPv6.

UFW host-input policy is never the Docker published-port boundary.

## Docker (optional)

Only after provider ingress is established and externally tested:

```bash
sudo ./scripts/ubuntu/install-docker.sh
sudo docker info
sudo docker compose version
sudo docker buildx version
```

Optional root-equivalent group (separate approval):

```bash
sudo ./scripts/ubuntu/install-docker.sh --admin <admin-user>
```

## Node.js (optional)

```bash
sudo ./scripts/ubuntu/install-nodejs.sh          # major 24
sudo ./scripts/ubuntu/install-nodejs.sh --major 22
```

## Verification

Host UFW:

```bash
sudo ./scripts/verify-setup.sh \
  --profile ubuntu \
  --admin <admin-user> \
  --ssh-access <public|tailscale-only> \
  --ingress host
```

External/provider (after independent tests):

```bash
sudo ./scripts/verify-setup.sh \
  --profile ubuntu \
  --admin <admin-user> \
  --ssh-access <public|tailscale-only> \
  --ingress external \
  --confirmed-external-ingress-tested
```

Profile checks include UFW or external mode, AppArmor, unattended-upgrade configuration, and Ubuntu reboot marker.

## Maintenance note

Third-party Docker/NodeSource/Tailscale repositories are not covered by Ubuntu unattended security updates the same way as archive packages. Apply normal full upgrades during routine maintenance and report that work.
