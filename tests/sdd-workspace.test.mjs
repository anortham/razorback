import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

function setupRepo(name = 'repo') {
  const input = join(testRoot, name);
  git(testRoot, 'init', '-q', '-b', 'main', input);
  const repo = git(input, 'rev-parse', '--show-toplevel').trim();
  writeFileSync(join(repo, 'plan-a.md'), '# Plan A\n\n## Task 1: First thing\n\nDo the first thing.\n');
  writeFileSync(join(repo, 'plan-b.md'), '# Plan B\n\n## Task 1: Other thing\n\nDo the other thing.\n');
  mkdirSync(join(repo, 'plans', 'alpha'), { recursive: true });
  mkdirSync(join(repo, 'plans', 'beta'), { recursive: true });
  writeFileSync(join(repo, 'plans', 'alpha', 'plan.md'), '# Alpha plan\n');
  writeFileSync(join(repo, 'plans', 'beta', 'plan.md'), '# Beta plan\n');
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
  assert.equal(dirA, join(sddBase, 'plan-a-622bfa9a0830'));
  assert.equal(dirB, join(sddBase, 'plan-b-26c66ffe5996'));
  assert.notEqual(dirA, dirB);
  assert.ok(existsSync(dirA));
  assert.ok(existsSync(dirB));
});

test('the workspace tree self-ignores via .razorback/sdd/.gitignore', () => {
  runScript(repo, 'sdd-workspace', 'plan-a.md');
  assert.equal(readFileSync(join(sddBase, '.gitignore'), 'utf8'), '*\n');
  writeFileSync(join(sddBase, 'plan-a-622bfa9a0830', 'artifact.md'), 'x\n');
  const status = git(repo, 'status', '--porcelain');
  assert.ok(!status.includes('.razorback'), status);
  git(repo, 'add', '-A');
  const staged = git(repo, 'diff', '--cached', '--name-only');
  assert.ok(!staged.includes('.razorback'), staged);
});

test('same basenames in different directories resolve to distinct hashed plan keys', () => {
  const alpha = runScript(repo, 'sdd-workspace', 'plans/alpha/plan.md');
  const beta = runScript(repo, 'sdd-workspace', 'plans/beta/plan.md');
  assert.equal(alpha.status, 0, alpha.stderr);
  assert.equal(beta.status, 0, beta.stderr);
  assert.equal(alpha.stdout.trim(), join(sddBase, 'plan-03374bad0d91'));
  assert.equal(beta.stdout.trim(), join(sddBase, 'plan-e610f5aaa9e2'));
  assert.notEqual(alpha.stdout.trim(), beta.stdout.trim());
});

test('absolute, relative, and normalized spellings resolve to one plan workspace', () => {
  const spellings = [
    join(repo, 'plans', 'alpha', 'plan.md'),
    'plans/alpha/plan.md',
    'plans/alpha/../alpha/plan.md'
  ];
  const results = spellings.map((plan) => runScript(repo, 'sdd-workspace', plan));
  for (const result of results) {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), join(sddBase, 'plan-03374bad0d91'));
  }
});

test('a plan outside the repository exits 2 without creating an artifact directory', () => {
  const isolatedRepo = setupRepo('outside-repo');
  const outsidePlan = join(testRoot, 'outside-plan.md');
  writeFileSync(outsidePlan, '# Outside plan\n');

  const result = runScript(isolatedRepo, 'sdd-workspace', outsidePlan);

  assert.equal(result.status, 2, result.stdout);
  assert.match(result.stderr, /outside repository/);
  assert.equal(existsSync(join(isolatedRepo, '.razorback')), false);
});

test('a matching legacy ledger resumes its basename workspace', () => {
  const legacyRepo = setupRepo('legacy-repo');
  const legacyDir = join(legacyRepo, '.razorback', 'sdd', 'plan-a');
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, 'progress.md'), '# Razorback SDD ledger — plan: plan-a.md\n');

  const result = runScript(legacyRepo, 'sdd-workspace', 'plan-a.md');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), legacyDir);
});

test('a mismatched legacy ledger is not shared with another plan', () => {
  const mismatchRepo = setupRepo('mismatch-repo');
  const legacyDir = join(mismatchRepo, '.razorback', 'sdd', 'plan-a');
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, 'progress.md'), '# Razorback SDD ledger — plan: plan-b.md\n');
  writeFileSync(join(legacyDir, 'keep.txt'), 'keep\n');

  const result = runScript(mismatchRepo, 'sdd-workspace', 'plan-a.md');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), join(mismatchRepo, '.razorback', 'sdd', 'plan-a-622bfa9a0830'));
  assert.equal(readFileSync(join(legacyDir, 'keep.txt'), 'utf8'), 'keep\n');
});

test('a pre-planted .razorback/sdd symlink to an outside directory exits 2 and leaves it untouched', () => {
  const outside = join(testRoot, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'keep.txt'), 'keep\n');
  const trap = join(testRoot, 'trap');
  git(testRoot, 'init', '-q', '-b', 'main', trap);
  const trapRepo = git(trap, 'rev-parse', '--show-toplevel').trim();
  writeFileSync(join(trapRepo, 'plan-a.md'), '# Plan A\n\n## Task 1: First thing\n\nDo the first thing.\n');
  mkdirSync(join(trapRepo, '.razorback'));
  symlinkSync(outside, join(trapRepo, '.razorback', 'sdd'));

  const result = runScript(trapRepo, 'sdd-workspace', 'plan-a.md');

  assert.equal(result.status, 2, result.stdout);
  assert.match(result.stderr, /escapes the repository/);
  assert.equal(readFileSync(join(outside, 'keep.txt'), 'utf8'), 'keep\n');
  assert.ok(!existsSync(join(outside, '.gitignore')));
  assert.deepEqual(readdirSync(outside), ['keep.txt']);
});

test('task-brief writes the brief into its plan directory', () => {
  const result = runScript(repo, 'task-brief', 'plan-a.md', '1');
  assert.equal(result.status, 0, result.stderr);
  const briefPath = result.stdout.match(/^wrote (.*): \d+ lines$/m)?.[1];
  assert.equal(briefPath, join(sddBase, 'plan-a-622bfa9a0830', 'task-1-brief.md'));
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
  assert.equal(dirname(reviewPath), join(sddBase, 'plan-a-622bfa9a0830'));
  assert.match(reviewPath, /review-[0-9a-f]+\.\.[0-9a-f]+\.diff$/);
  assert.match(readFileSync(reviewPath, 'utf8'), /## Diff/);
});
