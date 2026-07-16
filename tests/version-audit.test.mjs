import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = path.join(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.version-bump.json'), 'utf8'));

// Build a minimal fixture repo containing only the script, its config, and the
// declared version-bearing manifests. Copying from the working tree (not `git
// archive HEAD`) means the fixture exercises the script as it is right now.
function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-audit-'));
  const copy = (relativePath) => {
    const dest = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, relativePath), dest);
  };

  copy('.version-bump.json');
  copy('scripts/bump-version.sh');
  fs.chmodSync(path.join(dir, 'scripts/bump-version.sh'), 0o755);
  for (const entry of config.files) copy(entry.path);

  return dir;
}

function run(dir, ...args) {
  return spawnSync(path.join(dir, 'scripts/bump-version.sh'), args, {
    cwd: dir,
    encoding: 'utf8',
  });
}

function fixtureVersion(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
}

// Rewrite one declared manifest's version so the declared set disagrees.
function driftManifest(dir, relativePath, field, value) {
  const file = path.join(dir, relativePath);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keys = field.split('.');
  const target = keys.slice(0, -1).reduce((acc, key) => acc[key], json);
  target[keys.at(-1)] = value;
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

test('--audit exits 0 on a clean fixture', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = run(dir, '--audit');
  assert.equal(result.status, 0, `--audit stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /All declared files are in sync/);
});

test('--audit exits non-zero when a declared manifest has drifted', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  driftManifest(dir, '.claude-plugin/plugin.json', 'version', '9.9.9');

  const result = run(dir, '--audit');
  assert.notEqual(
    result.status,
    0,
    `--audit must fail on manifest drift; stdout:\n${result.stdout}\n${result.stderr}`
  );
  assert.match(result.stdout, /DRIFT DETECTED/);
});

test('--check exits non-zero when a declared manifest has drifted', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  driftManifest(dir, '.claude-plugin/plugin.json', 'version', '9.9.9');

  const result = run(dir, '--check');
  assert.notEqual(result.status, 0, `--check stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /DRIFT DETECTED/);
});

test('--check with no expected version exits 0 on a clean fixture', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = run(dir, '--check');
  assert.equal(result.status, 0, `--check stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /All declared files are in sync/);
});

test('--check exits 0 when the declared manifests match the expected version', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const version = fixtureVersion(dir);

  const result = run(dir, '--check', version);
  assert.equal(
    result.status,
    0,
    `--check ${version} must pass when the manifests are at that version; stdout:\n${result.stdout}\n${result.stderr}`
  );
});

test('--check exits non-zero when the manifests agree on a version other than the expected one', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const version = fixtureVersion(dir);

  const result = run(dir, '--check', '9.9.9');
  assert.notEqual(
    result.status,
    0,
    `--check must fail when the agreed version is not the expected one; stdout:\n${result.stdout}\n${result.stderr}`
  );
  // Scope to the mismatch line: the version table lists the actual version too,
  // so an unscoped match would pass without the message naming both versions.
  assert.match(
    result.stdout,
    new RegExp(`VERSION MISMATCH.*${version.replace(/\./g, '\\.')}.*9\\.9\\.9`),
    `the mismatch message must name both the actual and expected version; stdout:\n${result.stdout}`
  );
});

test('--audit keeps undeclared version references advisory (exit 0)', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const version = fixtureVersion(dir);
  fs.writeFileSync(path.join(dir, 'NOTES.md'), `Razorback ${version} is documented here.\n`);

  const result = run(dir, '--audit');
  assert.equal(
    result.status,
    0,
    `undeclared refs must stay advisory; stdout:\n${result.stdout}\n${result.stderr}`
  );
  assert.match(result.stdout, /UNDECLARED files containing/);
  assert.match(result.stdout, /NOTES\.md/);
});
