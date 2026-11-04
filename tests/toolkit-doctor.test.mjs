import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doctorPath = path.join(repositoryRoot, 'scripts', 'toolkit-doctor.mjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-doctor-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value));
}

function makeInstall(root, host, { version = '1.2.3', skillNames = ['using-razorback'] } = {}) {
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  for (const name of skillNames) {
    fs.mkdirSync(path.join(root, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture\n---\n`);
  }
  if (host === 'claude') {
    fs.mkdirSync(path.join(root, 'skills', 'using-razorback', 'references'), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', 'using-razorback', 'references', 'subagent-toolchain.md'), 'fixture');
    writeJson(path.join(root, '.claude-plugin', 'plugin.json'), { name: 'razorback', version, description: 'not output' });
    writeJson(path.join(root, '.claude-plugin', 'marketplace.json'), { plugins: [{ name: 'razorback', version }] });
    writeJson(path.join(root, 'hooks', 'hooks.json'), {
      hooks: {
        SessionStart: [{ hooks: [{ command: '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start' }] }],
        SubagentStart: [{ hooks: [{ command: '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" subagent-start' }] }],
      },
    });
    for (const file of ['session-start', 'subagent-start', 'run-hook.cmd']) {
      const filePath = path.join(root, 'hooks', file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'fixture');
    }
  } else {
    writeJson(path.join(root, '.codex-plugin', 'plugin.json'), { name: 'razorback', version, skills: './skills/' });
    writeJson(path.join(root, '.agents', 'plugins', 'marketplace.json'), { plugins: [{ name: 'razorback', source: { path: './' } }] });
  }
}

function runDoctor(args) {
  return spawnSync(process.execPath, [doctorPath, ...args], { encoding: 'utf8' });
}

function doctorArgs(projectRoot, host, installRoots, extra = []) {
  return ['--project-root', projectRoot, '--host', host, ...installRoots.flatMap(root => ['--install-root', root]), ...extra];
}

test('doctor requires explicit usable roots and a supported host', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'install');
  fs.mkdirSync(projectRoot);
  fs.mkdirSync(installRoot);

  const missingProject = runDoctor(['--host', 'claude', '--install-root', installRoot]);
  assert.equal(missingProject.status, 2);
  assert.match(missingProject.stderr, /--project-root/);

  const relativeInstall = runDoctor(doctorArgs(projectRoot, 'claude', ['relative/path']));
  assert.equal(relativeInstall.status, 2);
  assert.match(relativeInstall.stderr, /absolute/);

  const unsupportedHost = runDoctor(doctorArgs(projectRoot, 'opencode', [installRoot]));
  assert.equal(unsupportedHost.status, 2);
});

test('Codex doctor reports explicit workspace binding and its selected skills', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'codex-install');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'codex', { skillNames: ['using-razorback', 'test-driven-development'] });

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [installRoot], ['--json']));
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema_version, 1);
  assert.equal(report.status, 'findings');
  assert.ok(report.checks.some(check => check.id === 'workspace-root-binding' && check.status === 'unknown' && check.evidence.project_root === projectRoot));
  assert.ok(report.checks.some(check => check.id === 'workspace-root' && check.status === 'pass'));
  assert.ok(report.checks.some(check => check.id === 'versions' && check.status === 'pass' && check.evidence.installs[0].version === '1.2.3'));
  assert.ok(report.checks.some(check => check.id === 'skills' && check.status === 'pass' && check.evidence.installs[0].total === 2));
  assert.ok(report.checks.some(check => check.id === 'hook-assets' && check.status === 'pass'));
});

test('Claude doctor verifies the hook bootstrap payload files', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'claude-install');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'claude');

  const result = runDoctor(doctorArgs(projectRoot, 'claude', [installRoot], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.ok(report.checks.some(check => check.id === 'hook-assets' && check.status === 'pass'));
  assert.ok(report.checks.some(check => check.id === 'capabilities' && check.status === 'pass'));

  const outside = path.join(root, 'private.md');
  fs.writeFileSync(outside, 'SECRET_SENTINEL_51a6');
  const payload = path.join(installRoot, 'skills', 'using-razorback', 'references', 'subagent-toolchain.md');
  fs.rmSync(payload);
  fs.symlinkSync(outside, payload);
  const unsafe = runDoctor(doctorArgs(projectRoot, 'claude', [installRoot], ['--json']));
  assert.equal(unsafe.status, 1);
  assert.doesNotMatch(unsafe.stdout + unsafe.stderr, /SECRET_SENTINEL_51a6/);
  assert.ok(JSON.parse(unsafe.stdout).checks.some(check => check.id === 'hook-assets' && check.status === 'unknown'));
});

test('Claude hook assets must exist and each hook command must name a bundled asset', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'claude-install');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'claude');
  fs.rmSync(path.join(installRoot, 'hooks', 'subagent-start'));
  fs.rmSync(path.join(installRoot, 'skills', 'using-razorback', 'references', 'subagent-toolchain.md'));
  writeJson(path.join(installRoot, 'hooks', 'hooks.json'), {
    hooks: { SessionStart: [{ hooks: [{ command: 'hooks/missing.sh' }] }], SubagentStart: [{ hooks: [{ command: 'hooks/subagent-start' }] }] },
  });

  const result = runDoctor(doctorArgs(projectRoot, 'claude', [installRoot], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'findings');
  assert.ok(report.checks.some(check => check.id === 'hook-assets' && check.status === 'fail'));
  assert.ok(report.checks.find(check => check.id === 'hook-assets').evidence.installs[0].missing.includes('skills/using-razorback/references/subagent-toolchain.md'));
  assert.ok(report.checks.some(check => check.id === 'capabilities' && check.status === 'fail'));
});

test('doctor reports duplicate plugin registrations and version differences without guessing the active one', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const checkout = path.join(root, 'checkout');
  const cached = path.join(root, 'cache', 'plugin');
  fs.mkdirSync(projectRoot);
  makeInstall(checkout, 'codex', { version: '2.0.0' });
  makeInstall(cached, 'codex', { version: '1.9.0' });

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [cached, checkout], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const duplicates = report.checks.find(check => check.id === 'duplicate-skills');
  assert.equal(duplicates.status, 'warning');
  assert.deepEqual(duplicates.evidence.duplicates[0].roots, [cached, checkout]);
  assert.equal(duplicates.evidence.duplicates[0].preferred_root, undefined);
  assert.ok(report.checks.some(check => check.id === 'versions' && check.status === 'warning'));
});

test('doctor prefers a selected plugin layout over a skills-only registration', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const pluginRoot = path.join(root, 'plugin');
  const skillsRoot = path.join(root, 'fallback');
  fs.mkdirSync(projectRoot);
  makeInstall(pluginRoot, 'codex');
  fs.mkdirSync(path.join(skillsRoot, 'skills', 'using-razorback'), { recursive: true });
  fs.writeFileSync(path.join(skillsRoot, 'skills', 'using-razorback', 'SKILL.md'), '---\nname: using-razorback\n---\n');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [skillsRoot, pluginRoot], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const duplicate = report.checks.find(check => check.id === 'duplicate-skills').evidence.duplicates[0];
  assert.equal(duplicate.preferred_root, pluginRoot);
  assert.deepEqual(duplicate.redundant_roots, [skillsRoot]);
});

test('doctor marks an outside skill symlink unknown without reading its target', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'install');
  const outside = path.join(root, 'private');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'codex');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'SKILL.md'), 'SECRET_SENTINEL_8d70cc56');
  fs.rmSync(path.join(installRoot, 'skills', 'using-razorback'), { recursive: true });
  fs.symlinkSync(outside, path.join(installRoot, 'skills', 'using-razorback'), 'dir');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [installRoot], ['--json']));
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_SENTINEL_8d70cc56/);
  const report = JSON.parse(result.stdout);
  assert.ok(report.checks.some(check => check.id === 'skills' && check.status === 'unknown'));
});

test('unknown plugin metadata remains unknown and config values never appear in output', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'install');
  fs.mkdirSync(projectRoot);
  fs.mkdirSync(path.join(installRoot, 'skills', 'using-razorback'), { recursive: true });
  fs.writeFileSync(path.join(installRoot, 'skills', 'using-razorback', 'SKILL.md'), '---\nname: using-razorback\n---\n');
  writeJson(path.join(installRoot, '.codex-plugin', 'plugin.json'), { name: 'razorback', version: 'SECRET_SENTINEL_4e9b', privateConfig: 'SECRET_SENTINEL_4e9b' });
  writeJson(path.join(projectRoot, '.codex', 'settings.json'), { token: 'SECRET_SENTINEL_4e9b' });

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [installRoot], ['--json']));
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_SENTINEL_4e9b/);
  const report = JSON.parse(result.stdout);
  assert.ok(report.checks.some(check => check.id === 'capabilities' && check.status === 'unknown'));
  assert.ok(report.checks.some(check => check.id === 'versions' && check.status === 'unknown'));
});

test('unknown command line values are not echoed', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'install');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'codex');

  const result = runDoctor([...doctorArgs(projectRoot, 'codex', [installRoot]), '--token=SECRET_SENTINEL_b5a8']);
  assert.equal(result.status, 2);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_SENTINEL_b5a8/);
});

test('selected root symlinks are followed only when another selected root contains the target', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const sourceRoot = path.join(root, 'source');
  const aliasRoot = path.join(root, 'alias');
  fs.mkdirSync(projectRoot);
  makeInstall(sourceRoot, 'codex');
  fs.symlinkSync(sourceRoot, aliasRoot, 'dir');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [aliasRoot, sourceRoot], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.ok(report.checks.some(check => check.id === 'duplicate-roots' && check.status === 'warning'));

  const outside = path.join(root, 'outside');
  const outsideAlias = path.join(root, 'outside-alias');
  makeInstall(outside, 'codex');
  fs.symlinkSync(outside, outsideAlias, 'dir');
  const outsideResult = runDoctor(doctorArgs(projectRoot, 'codex', [outsideAlias], ['--json']));
  assert.equal(outsideResult.status, 1);
  assert.doesNotMatch(outsideResult.stdout + outsideResult.stderr, /outside-install sentinel/i);
  assert.ok(JSON.parse(outsideResult.stdout).checks.some(check => check.id === 'capabilities' && check.status === 'unknown'));
});

test('selected root symlink chains cannot escape through an intermediate link', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const selectedRoot = path.join(root, 'selected');
  const outside = path.join(root, 'outside');
  const alias = path.join(root, 'alias');
  fs.mkdirSync(projectRoot);
  fs.mkdirSync(selectedRoot);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.json'), 'SECRET_SENTINEL_3fcb');
  fs.symlinkSync(outside, path.join(selectedRoot, 'intermediate'), 'dir');
  fs.symlinkSync(path.join(selectedRoot, 'intermediate'), alias, 'dir');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [selectedRoot, alias], ['--json']));
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_SENTINEL_3fcb/);
  assert.ok(JSON.parse(result.stdout).checks.some(check => check.id === 'duplicate-roots' && check.status === 'unknown'));
});

test('Codex skills-tree symlinks are counted as registrations', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const checkout = path.join(root, 'checkout');
  const cache = path.join(root, 'cache');
  const agentsSkillLink = path.join(root, '.agents', 'skills', 'razorback');
  const arbitraryRoot = path.join(root, 'legacy-install-name');
  fs.mkdirSync(projectRoot);
  makeInstall(checkout, 'codex');
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.mkdirSync(path.dirname(agentsSkillLink), { recursive: true });
  fs.mkdirSync(path.join(arbitraryRoot, 'using-razorback'), { recursive: true });
  fs.writeFileSync(path.join(arbitraryRoot, 'using-razorback', 'SKILL.md'), '---\nname: using-razorback\n---\n');
  fs.symlinkSync(path.join(checkout, 'skills'), cache, 'dir');
  fs.symlinkSync(path.join(checkout, 'skills'), agentsSkillLink, 'dir');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [checkout, cache, agentsSkillLink, arbitraryRoot], ['--json']));
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const duplicates = report.checks.find(check => check.id === 'duplicate-skills').evidence.duplicates;
  assert.deepEqual(duplicates[0].roots, [checkout, cache, agentsSkillLink, arbitraryRoot]);
  assert.ok(report.checks.some(check => check.id === 'duplicate-roots' && check.evidence.duplicates[0].registrations.includes(cache)));
});

test('doctor text output is readable and the npm command is registered', t => {
  const root = fixture(t);
  const projectRoot = path.join(root, 'project');
  const installRoot = path.join(root, 'install');
  fs.mkdirSync(projectRoot);
  makeInstall(installRoot, 'codex');

  const result = runDoctor(doctorArgs(projectRoot, 'codex', [installRoot]));
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /workspace-root-binding: unknown/);
  assert.match(result.stdout, /capabilities: pass/);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.doctor, 'node scripts/toolkit-doctor.mjs');
});
