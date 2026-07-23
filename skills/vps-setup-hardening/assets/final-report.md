# VPS setup report: <target>

## Work completed

- <Changes actually performed>

## Current setup

- **Profile:** <ubuntu | al2023-ec2>
- **Platform:** <distribution, version, architecture, kernel>
- **Administrator:** <user and access model>
- **SSH:** <path, port, authentication; public vs tailnet-only>
- **Ingress:** <UFW host | provider firewall | EC2 Security Group>; enforcement boundary; IPv4/IPv6/UDP scope
- **Updates:** <Ubuntu unattended security updates, auto-reboot false | AL2023 pinned release version; no automatic release claim>
- **Security controls:** <AppArmor | SELinux mode>
- **Time:** <synchronization>
- **Optional tools:** <Tailscale / Docker Engine+Compose+Buildx / Node.js+npm versions>
- **Containers/published ports:** <state or none>
- **Reboot:** <state and whether post-reboot verification ran>

## Validation evidence

- <Local verifier summary: failures/warnings>
- <Independent SSH tests: intended path; public failure if applicable>
- <IPv4/IPv6 TCP exposure scans>
- <UDP: tested or incomplete>
- <Post-reboot checks if rebooted>
- <User-confirmed provider/SG state (distinct from local observation)>

## Remaining work

- <Exact provider/SG action, AL release maintenance, APT full upgrades for third-party repos, backup, ACL, deployment, or other maintenance>

<!--
Report rules:
- Include profile, update model/release version, ingress enforcement/evidence, IPv4/IPv6/UDP scope, optional tools, reboot state, and exact maintenance work.
- Distinguish observed local state, user-confirmed provider/SG state, and independent external evidence.
- Use “none” only after checking the category.
- State incomplete or skipped checks explicitly.
- Never include keys, tokens, authentication URLs, sensitive firewall dumps, or unrelated details.
- Keep the report brief. Do not duplicate a second “current setup report” from the verifier.
-->
