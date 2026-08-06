import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = path.join(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.version-bump.json'), 'utf8'));

function git(dir, ...args) {
  const result = spawnSync(
    'git',
    ['-C', dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, `git ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function bump(dir, ...args) {
  return spawnSync(path.join(dir, 'scripts/bump-version.sh'), args, { cwd: dir, encoding: 'utf8' });
}

function release(dir, version, extra = { body: '', bullets: [] }) {
  for (const subject of extra.bullets ?? []) {
    fs.appendFileSync(path.join(dir, 'work.txt'), `${subject}\n`);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', subject);
  }
  bump(dir, version);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', `release: ${version} ${extra.title ?? 'a release'}${extra.body ? `\n\n${extra.body}` : ''}`);
  git(dir, 'tag', `v${version}`);
}

// A throwaway repo carrying the script, its config, and the declared manifests,
// so the release path can be driven against real tags without touching origin.
function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-release-'));
  const copy = (relativePath) => {
    const dest = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, relativePath), dest);
  };

  copy('.version-bump.json');
  copy('scripts/bump-version.sh');
  fs.chmodSync(path.join(dir, 'scripts/bump-version.sh'), 0o755);
  for (const entry of config.files) copy(entry.path);

  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'initial');

  release(dir, '1.0.0', { title: 'first release' });
  release(dir, '1.1.0', {
    title: 'second release',
    body: 'Adds the thing everyone asked for.\n\nClaude-Session: https://example.invalid/session\nCo-Authored-By: Nobody <nobody@example.invalid>',
    bullets: ['feat: add a thing', 'chore: record checkpoint', 'fix: correct the thing'],
  });

  return dir;
}

test('--release --dry-run titles the release from the release commit subject', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /title:\s+v1\.1\.0 — second release/);
});

test('--release --dry-run publishes nothing', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.match(result.stdout, /DRY RUN — nothing published/);
});

test('--release notes carry the release commit body without its trailers', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.match(result.stdout, /Adds the thing everyone asked for\./);
  assert.doesNotMatch(result.stdout, /Claude-Session:/);
  assert.doesNotMatch(result.stdout, /Co-Authored-By:/);
});

test('--release notes list the commits since the previous tag, oldest first', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  const feature = result.stdout.indexOf('- feat: add a thing');
  const fix = result.stdout.indexOf('- fix: correct the thing');
  assert.notEqual(feature, -1, `stdout:\n${result.stdout}`);
  assert.notEqual(fix, -1, `stdout:\n${result.stdout}`);
  assert.ok(feature < fix, `commits must run oldest first; stdout:\n${result.stdout}`);
});

test('--release notes drop the release commit and the configured noise subjects', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.doesNotMatch(result.stdout, /- release: 1\.1\.0/);
  assert.doesNotMatch(result.stdout, /- chore: record checkpoint/);
});

test('--release notes stop at the previous tag', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.doesNotMatch(result.stdout, /- release: 1\.0\.0/);
  assert.doesNotMatch(result.stdout, /first release/);
});

test('--release defaults to the version the manifests declare', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '--dry-run');
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /tag:\s+v1\.1\.0/);
});

test('--release exits non-zero when the tag does not exist', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '9.9.9', '--dry-run');
  assert.notEqual(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /tag v9\.9\.9 does not exist/);
});

// The guard reads the manifests inside the tag, not the working tree, so a
// stale-but-consistent checkout cannot be released under someone else's tag.
test('--release exits non-zero when the tagged commit declares another version', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  git(dir, 'tag', 'v2.0.0');

  const result = bump(dir, '--release', '2.0.0', '--dry-run');
  assert.notEqual(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /does not declare version 2\.0\.0/);
});

test('--release --notes-file publishes the given notes verbatim', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const notes = path.join(dir, 'notes.md');
  fs.writeFileSync(notes, 'Hand-written notes for this release.\n');

  const result = bump(dir, '--release', '1.1.0', '--dry-run', '--notes-file', notes);
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Hand-written notes for this release\./);
  assert.doesNotMatch(result.stdout, /- feat: add a thing/);
  assert.equal(fs.existsSync(notes), true, 'a supplied notes file must survive the run');
});

test('--release works when the config declares no excluded subjects', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const configPath = path.join(dir, '.version-bump.json');
  const fixtureConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  delete fixtureConfig.release;
  fs.writeFileSync(configPath, `${JSON.stringify(fixtureConfig, null, 2)}\n`);

  const result = bump(dir, '--release', '1.1.0', '--dry-run');
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /- chore: record checkpoint/);
});

test('--release rejects an unknown flag', (t) => {
  const dir = makeFixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = bump(dir, '--release', '--bogus');
  assert.notEqual(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /unknown --release flag/);
});

test('--help documents the release step', () => {
  const result = spawnSync(path.join(root, 'scripts/bump-version.sh'), ['--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /--release/);
  assert.match(result.stdout, /--dry-run/);
  assert.match(result.stdout, /--notes-file/);
});
