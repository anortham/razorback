import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEnvironment, readClientSdkVersion } from '../scripts/run-toolkit-integration.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const runner = join(root, 'scripts', 'run-toolkit-integration.mjs');
const integrationConfig = process.env.RAZORBACK_TOOLKIT_INTEGRATION_CONFIG;
const testRoot = mkdtempSync(join(tmpdir(), 'razorback-toolkit-integration-tests-'));
const fixtureEnvironment = createEnvironment(join(testRoot, 'git-setup')).environment;

test.after(() => rmSync(testRoot, { recursive: true, force: true }));

function run(args, timeout = 5000, env = process.env) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    env,
  });
}

function createSourceRoot(name) {
  const sourceRoot = join(testRoot, name);
  mkdirSync(sourceRoot, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: sourceRoot, stdio: 'ignore', env: fixtureEnvironment });
  execFileSync('git', ['config', 'user.name', 'Toolkit integration test'], { cwd: sourceRoot, stdio: 'ignore', env: fixtureEnvironment });
  execFileSync('git', ['config', 'user.email', 'toolkit-integration@example.invalid'], { cwd: sourceRoot, stdio: 'ignore', env: fixtureEnvironment });
  writeFileSync(join(sourceRoot, 'source.txt'), 'tracked source\n');
  execFileSync('git', ['add', 'source.txt'], { cwd: sourceRoot, stdio: 'ignore', env: fixtureEnvironment });
  execFileSync('git', ['commit', '-q', '-m', 'source'], { cwd: sourceRoot, stdio: 'ignore', env: fixtureEnvironment });
  return sourceRoot;
}

function writeConfig(name, goldfish, codeKb) {
  const configPath = join(testRoot, `${name}.json`);
  writeFileSync(configPath, JSON.stringify({ goldfish, code_kb: codeKb }));
  return configPath;
}

function sourceRecord(sourceRoot, command = process.execPath, args = []) {
  return { source_root: sourceRoot, command, args };
}

test('explicit integration requires a config path and reports usage', () => {
  const result = run([]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--config <absolute-path>/);
  assert.doesNotMatch(result.stdout + result.stderr, /GOLDFISH_HOME|CODE_KB_HOME|HOME=/);
});

test('explicit integration rejects a missing config without a successful skip', () => {
  const result = run(['--config', join(tmpdir(), 'razorback-missing-toolkit-config.json')]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Cannot read integration config/);
  assert.doesNotMatch(result.stdout + result.stderr, /mcpServers|GOLDFISH_HOME|CODE_KB_HOME/);
});

test('explicit integration does not print config values or execute a configured shell', () => {
  const configPath = join(testRoot, 'config.json');
  const sentinel = 'integration-config-secret-sentinel';
  writeFileSync(configPath, JSON.stringify({
    goldfish: { source_root: `/missing/${sentinel}`, command: '/bin/sh', args: ['-c', `touch /tmp/${sentinel}`] },
    code_kb: { source_root: `/missing/${sentinel}`, command: `/missing/${sentinel}`, args: [] },
  }));
  const result = run(['--config', configPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /must be an executable, not a shell/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sentinel));
});

test('explicit integration rejects a shell executable reached through a symlink', { skip: process.platform === 'win32' }, () => {
  const goldfishRoot = createSourceRoot('shell-alias-goldfish-source');
  const codeKbRoot = createSourceRoot('shell-alias-code-kb-source');
  const shellAlias = join(testRoot, 'shell-alias');
  const sideEffect = join(testRoot, 'shell-alias-side-effect');
  symlinkSync('/bin/sh', shellAlias);
  const configPath = writeConfig(
    'shell-alias',
    sourceRecord(goldfishRoot, shellAlias, ['-c', 'touch "$1"', 'sh', sideEffect]),
    sourceRecord(codeKbRoot),
  );
  const result = run(['--config', configPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /must be an executable, not a shell/);
  assert.equal(existsSync(sideEffect), false);
});

test('explicit integration rejects invalid record shapes before launching commands', () => {
  const sourceRoot = createSourceRoot('invalid-record-source');
  const configPath = writeConfig(
    'invalid-record',
    { ...sourceRecord(sourceRoot), args: 'not-an-argument-array' },
    sourceRecord(sourceRoot),
  );
  const result = run(['--config', configPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid goldfish record/);
});

test('explicit integration reports an unavailable executable without printing config values', () => {
  const sourceRoot = createSourceRoot('missing-executable-source');
  const sentinel = 'missing-executable-secret-sentinel';
  const configPath = writeConfig(
    'missing-executable',
    sourceRecord(sourceRoot, join(testRoot, sentinel)),
    sourceRecord(sourceRoot),
  );
  const result = run(['--config', configPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /source root or executable is unavailable/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sentinel));
});

test('explicit integration reports a missing source root without printing its path', () => {
  const codeKbRoot = createSourceRoot('missing-source-code-kb');
  const sentinel = 'missing-source-secret-sentinel';
  const configPath = writeConfig(
    'missing-source-root',
    sourceRecord(join(testRoot, sentinel)),
    sourceRecord(codeKbRoot),
  );
  const result = run(['--config', configPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /source root or executable is unavailable/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sentinel));
});

test('explicit integration requires clean source revisions before starting services', () => {
  const goldfishRoot = createSourceRoot('dirty-goldfish-source');
  const codeKbRoot = createSourceRoot('clean-code-kb-source');
  writeFileSync(join(goldfishRoot, 'source.txt'), 'uncommitted\n');
  const configPath = writeConfig(
    'dirty-source',
    sourceRecord(goldfishRoot),
    sourceRecord(codeKbRoot),
  );
  const inherited = { ...process.env, GIT_DIR: join(testRoot, 'nonexistent-global-git-dir') };
  const result = run(['--config', configPath], 5000, inherited);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /goldfish source_root must have a clean working tree/);
});

test('server environment replaces inherited home and secret values with temporary values', () => {
  const tempRoot = join(testRoot, 'environment');
  const sourceRoot = createSourceRoot('environment-source');
  const originalSecret = process.env.RAZORBACK_INTEGRATION_SECRET;
  process.env.RAZORBACK_INTEGRATION_SECRET = 'toolkit-env-secret-sentinel';
  try {
    const { environment, home, temp } = createEnvironment(tempRoot, [sourceRecord(sourceRoot)]);
    const probe = spawnSync(process.execPath, [
      '-e',
      'process.stdout.write(JSON.stringify({ secret: process.env.RAZORBACK_INTEGRATION_SECRET ?? null, home: process.env.HOME, path: process.env.PATH }))',
    ], { encoding: 'utf8', env: environment, timeout: 5000 });
    const observed = JSON.parse(probe.stdout);

    assert.equal(probe.status, 0);
    assert.equal(observed.secret, null);
    assert.equal(observed.home, home);
    assert.equal(environment.TMPDIR, temp);
    assert.doesNotMatch(observed.path, /toolkit-env-secret-sentinel/);
  } finally {
    if (originalSecret === undefined) delete process.env.RAZORBACK_INTEGRATION_SECRET;
    else process.env.RAZORBACK_INTEGRATION_SECRET = originalSecret;
  }
});

test('integration report version matches the exact installed SDK pin', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  assert.equal(readClientSdkVersion(), manifest.devDependencies['@modelcontextprotocol/client']);
});

test('integration transport receives command arguments directly in a scrubbed temporary environment', () => {
  const goldfishRoot = createSourceRoot('argv-goldfish-source');
  const codeKbRoot = createSourceRoot('argv-code-kb-source');
  const argvProbe = join(testRoot, 'argv-probe.mjs');
  const capturePath = join(testRoot, 'argv-capture.json');
  writeFileSync(argvProbe, [
    "import { writeFileSync } from 'node:fs';",
    "writeFileSync(process.argv[2], JSON.stringify({ args: process.argv.slice(3), home: process.env.HOME, secret: process.env.RAZORBACK_INTEGRATION_SECRET ?? null, temp: process.env.TMPDIR }));",
  ].join('\n'));
  const secretName = 'RAZORBACK_INTEGRATION_SECRET';
  const inherited = { ...process.env, [secretName]: 'direct-argv-secret-sentinel' };
  const configPath = writeConfig(
    'direct-argv',
    sourceRecord(goldfishRoot, process.execPath, [argvProbe, capturePath, 'argument with spaces', '--plain-argv']),
    sourceRecord(codeKbRoot),
  );
  const result = run(['--config', configPath], 45000, inherited);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Goldfish MCP server could not be reached/);
  const captured = JSON.parse(readFileSync(capturePath, 'utf8'));
  assert.deepEqual(captured.args, ['argument with spaces', '--plain-argv']);
  assert.equal(captured.secret, null);
  assert.match(captured.home, /razorback-toolkit-integration-/);
  assert.match(captured.temp, /razorback-toolkit-integration-/);
  assert.doesNotMatch(result.stdout + result.stderr, /direct-argv-secret-sentinel/);
});

test('real Goldfish and code-kb integration runs only with explicit config', {
  skip: integrationConfig ? false : 'external integration skipped: set RAZORBACK_TOOLKIT_INTEGRATION_CONFIG to an explicit local config',
}, () => {
  const result = run(['--config', integrationConfig], 120000);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema_version, 1);
  assert.equal(report.status, 'pass');
  assert.match(report.sources.goldfish.revision, /^[0-9a-f]{40}$/);
  assert.match(report.sources.code_kb.revision, /^[0-9a-f]{40}$/);
});
