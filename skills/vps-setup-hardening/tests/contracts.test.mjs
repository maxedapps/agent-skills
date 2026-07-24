import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '..');
const COMMON = path.join(SKILL_ROOT, 'scripts/lib/common.sh');
const FAIL2BAN_CONFIG = path.join(
  SKILL_ROOT,
  'assets/config/10-agent-recipes-sshd.local',
);
const SCRIPTS = {
  inspect: path.join(SKILL_ROOT, 'scripts/inspect-system.sh'),
  configureAdmin: path.join(SKILL_ROOT, 'scripts/configure-admin-user.sh'),
  hardenSsh: path.join(SKILL_ROOT, 'scripts/harden-ssh.sh'),
  verify: path.join(SKILL_ROOT, 'scripts/verify-setup.sh'),
  ubuntuBase: path.join(SKILL_ROOT, 'scripts/ubuntu/apply-base-setup.sh'),
  ubuntuFirewall: path.join(SKILL_ROOT, 'scripts/ubuntu/apply-firewall.sh'),
  ubuntuCloseSsh: path.join(SKILL_ROOT, 'scripts/ubuntu/close-public-ssh.sh'),
  ubuntuDocker: path.join(SKILL_ROOT, 'scripts/ubuntu/install-docker.sh'),
  ubuntuNode: path.join(SKILL_ROOT, 'scripts/ubuntu/install-nodejs.sh'),
  ubuntuTailscale: path.join(SKILL_ROOT, 'scripts/ubuntu/install-tailscale.sh'),
  alBase: path.join(SKILL_ROOT, 'scripts/al2023-ec2/apply-base-setup.sh'),
  alDocker: path.join(SKILL_ROOT, 'scripts/al2023-ec2/install-docker.sh'),
  alNode: path.join(SKILL_ROOT, 'scripts/al2023-ec2/install-nodejs.sh'),
  alTailscale: path.join(SKILL_ROOT, 'scripts/al2023-ec2/install-tailscale.sh'),
};

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 15_000,
    ...options,
  });
}

function classify(osId, versionId, arch, hasSystemd, hasInclude, isEc2) {
  return run('bash', [
    COMMON,
    'classify',
    osId,
    versionId,
    arch,
    hasSystemd,
    hasInclude,
    isEc2,
  ]);
}

function assertClassifies(osId, versionId, arch, isEc2, expected) {
  const result = classify(osId, versionId, arch, 'true', 'true', isEc2);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected);
}

function assertRefuses(osId, versionId, arch, isEc2 = 'false') {
  const result = classify(osId, versionId, arch, 'true', 'true', isEc2);
  assert.notEqual(result.status, 0);
}

test('normalize-arch accepts both naming conventions', () => {
  for (const [input, expected] of [
    ['x86_64', 'amd64'],
    ['amd64', 'amd64'],
    ['aarch64', 'arm64'],
    ['arm64', 'arm64'],
  ]) {
    const result = run('bash', [COMMON, 'normalize-arch', input]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), expected);
  }
  const bad = run('bash', [COMMON, 'normalize-arch', 'ppc64le']);
  assert.notEqual(bad.status, 0);
});

test('classifier accepts Ubuntu 24.04/26.04 on amd64 and arm64', () => {
  for (const version of ['24.04', '26.04']) {
    for (const arch of ['amd64', 'arm64', 'x86_64', 'aarch64']) {
      assertClassifies('ubuntu', version, arch, 'false', 'ubuntu');
    }
  }
});

test('classifier accepts AL2023 only with positive EC2 evidence', () => {
  for (const arch of ['amd64', 'arm64', 'x86_64', 'aarch64']) {
    assertClassifies('amzn', '2023', arch, 'true', 'al2023-ec2');
    assertRefuses('amzn', '2023', arch, 'false');
  }
});

test('classifier refuses unsupported platforms', () => {
  assertRefuses('ubuntu', '22.04', 'amd64');
  assertRefuses('ubuntu', '25.04', 'amd64');
  assertRefuses('amzn', '2', 'amd64', 'true');
  assertRefuses('debian', '12', 'amd64');
  assertRefuses('fedora', '41', 'amd64');
  assertRefuses('rhel', '9', 'amd64');
  assertRefuses('alpine', '3.20', 'amd64');
  assertRefuses('opensuse-leap', '15.6', 'amd64');
  const noSystemd = classify('ubuntu', '24.04', 'amd64', 'false', 'true', 'false');
  assert.notEqual(noSystemd.status, 0);
  const noInclude = classify('ubuntu', '24.04', 'amd64', 'true', 'false', 'false');
  assert.notEqual(noInclude.status, 0);
  const badArch = classify('ubuntu', '24.04', 'ppc64le', 'true', 'true', 'false');
  assert.notEqual(badArch.status, 0);
});

test('every mutator and inspector --help exits 0 without root', () => {
  for (const [name, script] of Object.entries(SCRIPTS)) {
    const result = run('bash', [script, '--help']);
    assert.equal(result.status, 0, `${name} --help failed: ${result.stderr}`);
    assert.match(result.stdout, /Usage:/);
  }
});

test('pre-mutation argument refusals happen before root requirement', () => {
  const cases = [
    [SCRIPTS.hardenSsh, [], /confirmed-login-tested|tested administrator|--admin/i],
    [SCRIPTS.hardenSsh, ['--admin', 'ubuntu'], /confirmed-login-tested/i],
    [SCRIPTS.configureAdmin, [], /--admin/i],
    [SCRIPTS.ubuntuBase, [], /--ingress/i],
    [SCRIPTS.ubuntuBase, ['--ingress', 'bogus'], /host|external/i],
    [SCRIPTS.ubuntuCloseSsh, [], /confirmed-tailscale-ssh-tested/i],
    [SCRIPTS.ubuntuFirewall, ['--docker-planned'], /Removed flag|provider/i],
    [SCRIPTS.ubuntuFirewall, ['--confirmed-docker-ingress-control'], /Removed flag|provider/i],
    [SCRIPTS.alBase, [], /releasever/i],
    [SCRIPTS.alBase, ['--releasever', '2023'], /nonspecific|concrete/i],
    [SCRIPTS.alBase, ['--releasever', 'latest'], /nonspecific|concrete/i],
    [SCRIPTS.alBase, ['--releasever', ''], /releasever/i],
    [SCRIPTS.alDocker, ['--releasever', '2023.6.20241010'], /pinned release|do not pass/i],
    [SCRIPTS.alNode, ['--releasever', '2023.6.20241010'], /pinned release|do not pass/i],
    [SCRIPTS.alTailscale, ['--releasever', '2023.6.20241010'], /pinned release|do not pass|no arguments/i],
    [SCRIPTS.verify, ['--profile', 'ubuntu', '--ingress', 'external'], /confirmed-external-ingress-tested/i],
    [SCRIPTS.verify, ['--profile', 'ubuntu', '--ingress', 'host', '--confirmed-security-group-tested'], /al2023-ec2/i],
    [SCRIPTS.verify, ['--profile', 'al2023-ec2', '--ingress', 'external'], /confirmed-security-group-tested/i],
    [SCRIPTS.verify, ['--profile', 'al2023-ec2', '--ingress', 'host'], /external/i],
    [SCRIPTS.verify, ['--profile', 'al2023-ec2', '--ingress', 'external', '--confirmed-external-ingress-tested'], /confirmed-security-group-tested/i],
    [SCRIPTS.verify, ['--firewall', 'host'], /Replaced by --profile/i],
  ];

  for (const [script, args, pattern] of cases) {
    const result = run('bash', [script, ...args]);
    assert.notEqual(result.status, 0, `${script} ${args.join(' ')} should refuse`);
    assert.match(`${result.stderr}\n${result.stdout}`, pattern);
    assert.doesNotMatch(`${result.stderr}\n${result.stdout}`, /Root privileges are required/);
  }
});

test('AL base accepts concrete releasever shape then demands root (no mutation)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vps-contract-'));
  try {
    const bin = path.join(dir, 'bin');
    mkdirSync(bin);
    const logFile = path.join(dir, 'mutations.log');
    writeFileSync(logFile, '');
    for (const name of ['dnf', 'rpm', 'systemctl', 'install', 'cp']) {
      const shim = path.join(bin, name);
      writeFileSync(
        shim,
        `#!/bin/sh\necho "$0 $*" >>'${logFile}'\nexit 0\n`,
      );
      chmodSync(shim, 0o755);
    }
    const result = run('bash', [SCRIPTS.alBase, '--releasever', '2023.6.20241010'], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Root privileges are required/);
    const logged = run('cat', [logFile]).stdout.trim();
    assert.equal(logged, '', `mutating shims were invoked before refusal:\n${logged}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ubuntu profile manages and verifies a systemd-backed Fail2Ban sshd jail', () => {
  const baseHelp = run('bash', [SCRIPTS.ubuntuBase, '--help']);
  assert.equal(baseHelp.status, 0, baseHelp.stderr);
  assert.match(baseHelp.stdout, /Fail2Ban sshd jail/i);

  const config = readFileSync(FAIL2BAN_CONFIG, 'utf8');
  assert.match(config, /^\[sshd\]$/m);
  assert.match(config, /^enabled = true$/m);
  assert.match(config, /^backend = systemd$/m);
  assert.match(config, /^bantime\.increment = true$/m);

  const base = readFileSync(SCRIPTS.ubuntuBase, 'utf8');
  assert.match(base, /apt-get install[\s\S]*fail2ban|APT_PACKAGES=.*fail2ban/);
  assert.match(base, /fail2ban-client -t/);
  assert.match(base, /fail2ban-client reload/);
  assert.match(base, /fail2ban-client status sshd/);
  assert.doesNotMatch(base, /systemctl restart fail2ban/);

  const verify = readFileSync(SCRIPTS.verify, 'utf8');
  assert.match(verify, /Managed Fail2Ban sshd configuration is current/);
  assert.match(verify, /Fail2Ban service is enabled and active/);
  assert.match(verify, /fail2ban-client -t/);
  assert.match(verify, /fail2ban-client status sshd/);
});

test('ubuntu firewall unknown-rule path is documented in help and rejects removed docker flags', () => {
  const help = run('bash', [SCRIPTS.ubuntuFirewall, '--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /unrecognized UFW rules|default-deny UFW/i);
  assert.doesNotMatch(help.stdout, /firewalld|--docker-planned/);
});

test('inspect-system is read-only help and runs without mutation args', () => {
  const help = run('bash', [SCRIPTS.inspect, '--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /does not display authorized-key contents/i);
  const bad = run('bash', [SCRIPTS.inspect, '--mutate']);
  assert.notEqual(bad.status, 0);
});

test('inspect-system reports gate inputs without authorized-key contents', () => {
  const result = run('bash', [SCRIPTS.inspect], { timeout: 30_000 });
  // May refuse unsupported local macOS/dev hosts after printing inventory, but must not crash bash.
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  const out = `${result.stdout}\n${result.stderr}`;
  assert.match(out, /Profile classification:/i);
  assert.match(out, /Normalized architecture:|architecture/i);
  assert.match(out, /EC2 evidence:/i);
  assert.match(out, /Privilege:/i);
  assert.match(out, /=== SSH ===/i);
  assert.match(out, /Firewall \/ ingress evidence|ingress evidence/i);
  assert.match(out, /Updates, time, and security controls/i);
  assert.match(out, /optional tools|Docker:|Node\.js:/i);
  assert.doesNotMatch(out, /BEGIN OPENSSH PRIVATE KEY|BEGIN RSA PRIVATE KEY/);
  assert.doesNotMatch(out, /ssh-(rsa|ed25519|dss) [A-Za-z0-9+/=]{40,}/);
});

test('later AL installers document pinned-release usage and refuse releasever', () => {
  for (const script of [SCRIPTS.alDocker, SCRIPTS.alNode, SCRIPTS.alTailscale]) {
    const help = run('bash', [script, '--help']);
    assert.equal(help.status, 0, help.stderr);
    assert.match(
      help.stdout,
      /pinned|amazon-linux\/2023|Amazon Linux 2023|host pinned|release/i,
    );
  }
  const dockerHelp = run('bash', [SCRIPTS.alDocker, '--help']);
  assert.doesNotMatch(dockerHelp.stdout, /--releasever/);
});

test('ubuntu firewall help rejects docker host path coupling', () => {
  const help = run('bash', [SCRIPTS.ubuntuFirewall, '--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Do not use this script when\s+Docker is planned|provider firewall/i);
});

test('script inventory matches the closed two-profile layout', () => {
  const find = run('bash', [
    '-lc',
    `find '${SKILL_ROOT}/scripts' -name '*.sh' | sort`,
  ]);
  assert.equal(find.status, 0);
  const files = find.stdout
    .trim()
    .split('\n')
    .map((line) => path.relative(SKILL_ROOT, line));
  const expected = [
    'scripts/al2023-ec2/apply-base-setup.sh',
    'scripts/al2023-ec2/install-docker.sh',
    'scripts/al2023-ec2/install-nodejs.sh',
    'scripts/al2023-ec2/install-tailscale.sh',
    'scripts/configure-admin-user.sh',
    'scripts/harden-ssh.sh',
    'scripts/inspect-system.sh',
    'scripts/lib/common.sh',
    'scripts/ubuntu/apply-base-setup.sh',
    'scripts/ubuntu/apply-firewall.sh',
    'scripts/ubuntu/close-public-ssh.sh',
    'scripts/ubuntu/install-docker.sh',
    'scripts/ubuntu/install-nodejs.sh',
    'scripts/ubuntu/install-tailscale.sh',
    'scripts/verify-setup.sh',
  ].sort();
  assert.deepEqual(files, expected);
});

test('stale top-level installers and firewalld entrypoints are gone', () => {
  const stale = [
    'scripts/apply-base-setup.sh',
    'scripts/apply-firewall.sh',
    'scripts/close-public-ssh.sh',
    'scripts/install-docker.sh',
    'scripts/install-nodejs.sh',
    'scripts/install-tailscale.sh',
  ];
  for (const rel of stale) {
    const result = run('test', ['-e', path.join(SKILL_ROOT, rel)]);
    assert.notEqual(result.status, 0, `${rel} should not exist`);
  }
});
