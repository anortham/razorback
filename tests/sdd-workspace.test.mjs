import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'skills/subagent-driven-development/scripts');

const testRoot = mkdtempSync(join(tmpdir(), 'sdd-workspace-'));
test.after(() => rmSync(testRoot, { recursive: true, force: true }));

const gitIdentity = ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'commit.gpgsign=false'];

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function runScript(cwd, script, ...args) {
  return spawnSync('bash', [join(scripts, script), ...args], { cwd, encoding: 'utf8' });
}

function setupRepo() {
  const input = join(testRoot, 'repo');
  git(testRoot, 'init', '-q', '-b', 'main', input);
  const repo = git(input, 'rev-parse', '--show-toplevel').trim();
  writeFileSync(join(repo, 'plan-a.md'), '# Plan A\n\n## Task 1: First thing\n\nDo the first thing.\n');
  writeFileSync(join(repo, 'plan-b.md'), '# Plan B\n\n## Task 1: Other thing\n\nDo the other thing.\n');
  return repo;
}

const repo = setupRepo();
const sddBase = join(repo, '.razorback', 'sdd');

test('sdd-workspace without a plan file exits 2 with usage', () => {
  const result = runScript(repo, 'sdd-workspace');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage: sdd-workspace PLAN_FILE/);
});

test('sdd-workspace with a nonexistent plan file exits 2', () => {
  const result = runScript(repo, 'sdd-workspace', 'no-such-plan.md');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no such plan file/);
});

test('two plans resolve to two distinct plan-scoped directories', () => {
  const a = runScript(repo, 'sdd-workspace', 'plan-a.md');
  const b = runScript(repo, 'sdd-workspace', 'plan-b.md');
  assert.equal(a.status, 0, a.stderr);
  assert.equal(b.status, 0, b.stderr);
  const dirA = a.stdout.trim();
  const dirB = b.stdout.trim();
  assert.equal(dirA, join(sddBase, 'plan-a'));
  assert.equal(dirB, join(sddBase, 'plan-b'));
  assert.notEqual(dirA, dirB);
  assert.ok(existsSync(dirA));
  assert.ok(existsSync(dirB));
});

test('the workspace tree self-ignores via .razorback/sdd/.gitignore', () => {
  runScript(repo, 'sdd-workspace', 'plan-a.md');
  assert.equal(readFileSync(join(sddBase, '.gitignore'), 'utf8'), '*\n');
  writeFileSync(join(sddBase, 'plan-a', 'artifact.md'), 'x\n');
  const status = git(repo, 'status', '--porcelain');
  assert.ok(!status.includes('.razorback'), status);
  git(repo, 'add', '-A');
  const staged = git(repo, 'diff', '--cached', '--name-only');
  assert.ok(!staged.includes('.razorback'), staged);
});

test('task-brief writes the brief into its plan directory', () => {
  const result = runScript(repo, 'task-brief', 'plan-a.md', '1');
  assert.equal(result.status, 0, result.stderr);
  const briefPath = result.stdout.match(/^wrote (.*): \d+ lines$/m)?.[1];
  assert.equal(briefPath, join(sddBase, 'plan-a', 'task-1-brief.md'));
  assert.match(readFileSync(briefPath, 'utf8'), /## Task 1: First thing/);
});

test('review-package requires the plan file first and writes into its plan directory', () => {
  git(repo, 'add', 'plan-a.md', 'plan-b.md');
  git(repo, ...gitIdentity, 'commit', '-qm', 'c1');
  writeFileSync(join(repo, 'f'), 'y\n');
  git(repo, 'add', 'f');
  git(repo, ...gitIdentity, 'commit', '-qm', 'c2');

  const legacy = runScript(repo, 'review-package', 'HEAD~1', 'HEAD');
  assert.equal(legacy.status, 2);
  assert.match(legacy.stderr, /usage: review-package PLAN_FILE BASE HEAD/);

  const result = runScript(repo, 'review-package', 'plan-a.md', 'HEAD~1', 'HEAD');
  assert.equal(result.status, 0, result.stderr);
  const reviewPath = result.stdout.match(/^wrote (.*): \d+ commit/m)?.[1];
  assert.equal(dirname(reviewPath), join(sddBase, 'plan-a'));
  assert.match(reviewPath, /review-[0-9a-f]+\.\.[0-9a-f]+\.diff$/);
  assert.match(readFileSync(reviewPath, 'utf8'), /## Diff/);
});
