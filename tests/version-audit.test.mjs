import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { bumpVersion as run, copyBumpVersionFiles, requiresJq } from './helpers/bump-version-fixture.mjs';

function makeFixture() {
  return copyBumpVersionFiles('razorback-audit-');
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

test('--audit exits 0 on a clean fixture', requiresJq, (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = run(dir, '--audit');
  assert.equal(result.status, 0, `--audit stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /All declared files are in sync/);
});

test('--audit exits non-zero when a declared manifest has drifted', requiresJq, (t) => {
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

test('--check exits non-zero when a declared manifest has drifted', requiresJq, (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  driftManifest(dir, '.claude-plugin/plugin.json', 'version', '9.9.9');

  const result = run(dir, '--check');
  assert.notEqual(result.status, 0, `--check stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /DRIFT DETECTED/);
});

test('--check with no expected version exits 0 on a clean fixture', requiresJq, (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = run(dir, '--check');
  assert.equal(result.status, 0, `--check stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /All declared files are in sync/);
});

test('--check exits 0 when the declared manifests match the expected version', requiresJq, (t) => {
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

test('--check exits non-zero when the manifests agree on a version other than the expected one', requiresJq, (t) => {
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

test('--audit keeps undeclared version references advisory (exit 0)', requiresJq, (t) => {
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

test('version bumps keep npm lock metadata synchronized without changing dependencies', requiresJq, (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const lockPath = path.join(dir, 'package-lock.json');
  const lock = {
    name: 'razorback',
    version: fixtureVersion(dir),
    lockfileVersion: 3,
    packages: {
      '': { name: 'razorback', version: fixtureVersion(dir), devDependencies: { example: '1.2.3' } },
      'node_modules/example': { version: '1.2.3', integrity: 'fixture-integrity', dev: true },
    },
  };
  fs.writeFileSync(lockPath, JSON.stringify(lock));

  const result = run(dir, '9.8.7');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(lockPath, 'utf8')), {
    ...lock,
    version: '9.8.7',
    packages: { ...lock.packages, '': { ...lock.packages[''], version: '9.8.7' } },
  });
});
