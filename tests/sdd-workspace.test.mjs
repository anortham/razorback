import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize } from 'node:path';
import { git, identityFlags, initRepository, removeTree } from './helpers/git-fixture.mjs';
import { root } from './helpers/repo.mjs';

const scripts = join(root, 'skills/subagent-driven-development/scripts');

const testRoot = mkdtempSync(join(tmpdir(), 'sdd-workspace-'));
test.after(() => removeTree(testRoot));

const gitIdentity = identityFlags('t', 't@example.com');

function runScript(cwd, script, ...args) {
  return spawnSync('bash', [join(scripts, script), ...args], { cwd, encoding: 'utf8' });
}

function setupRepo(name = 'repo') {
  const input = join(testRoot, name);
  initRepository(input, { branch: 'main' });
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
  assert.match(result.stderr, /usage: sdd-workspace \[-C DIR\] PLAN_FILE/);
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
  const dirA = normalize(a.stdout.trim());
  const dirB = normalize(b.stdout.trim());
  assert.equal(dirA, join(sddBase, 'plan-a-622bfa9a0830'));
  assert.equal(dirB, join(sddBase, 'plan-b-26c66ffe5996'));
  assert.notEqual(dirA, dirB);
  assert.ok(existsSync(dirA));
  assert.ok(existsSync(dirB));
});

function windowsShortPath(dir) {
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', `for %I in ("${normalize(dir)}") do @echo %~sI`], {
    encoding: 'utf8',
    windowsVerbatimArguments: true,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('sdd-workspace accepts a working tree reached through a Windows 8.3 short path', {
  skip: process.platform !== 'win32' && 'only Windows has 8.3 short path names',
}, (t) => {
  const longRepo = normalize(setupRepo('repository-with-a-long-name'));
  const shortRepo = windowsShortPath(longRepo);
  if (shortRepo.toLowerCase() === longRepo.toLowerCase()) {
    t.skip('this volume creates no 8.3 short names');
    return;
  }

  const result = runScript(shortRepo, 'sdd-workspace', 'plan-a.md');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(normalize(result.stdout.trim()), join(longRepo, '.razorback', 'sdd', 'plan-a-622bfa9a0830'));
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
  assert.equal(normalize(alpha.stdout.trim()), join(sddBase, 'plan-03374bad0d91'));
  assert.equal(normalize(beta.stdout.trim()), join(sddBase, 'plan-e610f5aaa9e2'));
  assert.notEqual(normalize(alpha.stdout.trim()), normalize(beta.stdout.trim()));
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
    assert.equal(normalize(result.stdout.trim()), join(sddBase, 'plan-03374bad0d91'));
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
  assert.equal(normalize(result.stdout.trim()), legacyDir);
});

test('a mismatched legacy ledger is not shared with another plan', () => {
  const mismatchRepo = setupRepo('mismatch-repo');
  const legacyDir = join(mismatchRepo, '.razorback', 'sdd', 'plan-a');
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, 'progress.md'), '# Razorback SDD ledger — plan: plan-b.md\n');
  writeFileSync(join(legacyDir, 'keep.txt'), 'keep\n');

  const result = runScript(mismatchRepo, 'sdd-workspace', 'plan-a.md');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(normalize(result.stdout.trim()), join(mismatchRepo, '.razorback', 'sdd', 'plan-a-622bfa9a0830'));
  assert.equal(readFileSync(join(legacyDir, 'keep.txt'), 'utf8'), 'keep\n');
});

test('a pre-planted .razorback/sdd symlink to an outside directory exits 2 and leaves it untouched', () => {
  const outside = join(testRoot, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'keep.txt'), 'keep\n');
  const trap = join(testRoot, 'trap');
  initRepository(trap, { branch: 'main' });
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
  assert.equal(normalize(briefPath), join(sddBase, 'plan-a-622bfa9a0830', 'task-1-brief.md'));
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
  assert.match(legacy.stderr, /usage: review-package \[-C DIR\] PLAN_FILE BASE HEAD/);

  const result = runScript(repo, 'review-package', 'plan-a.md', 'HEAD~1', 'HEAD');
  assert.equal(result.status, 0, result.stderr);
  const reviewPath = result.stdout.match(/^wrote (.*): \d+ commit/m)?.[1];
  assert.equal(dirname(normalize(reviewPath)), join(sddBase, 'plan-a-622bfa9a0830'));
  assert.match(reviewPath, /review-[0-9a-f]+\.\.[0-9a-f]+\.diff$/);
  assert.match(readFileSync(reviewPath, 'utf8'), /## Diff/);
});

test('sdd-repo stops with exit 2 outside a working tree and names the fix', () => {
  const outside = mkdtempSync(join(testRoot, 'outside-'));
  const result = runScript(outside, 'sdd-repo');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must run from inside the git working tree/);
  assert.match(result.stderr, /git said:/);
});

test('sdd-repo --with-commit stops with exit 2 before the first commit', () => {
  const fresh = join(testRoot, 'fresh');
  initRepository(fresh, { branch: 'main' });
  const plain = runScript(fresh, 'sdd-repo');
  assert.equal(plain.status, 0, plain.stderr);
  const withCommit = runScript(fresh, 'sdd-repo', '--with-commit');
  assert.equal(withCommit.status, 2);
  assert.match(withCommit.stderr, /run 'git init' and make a first commit/);
});

test('the helpers take -C DIR and act on that working tree', () => {
  const other = setupRepo('other');
  git(other, 'add', 'plan-a.md');
  git(other, ...gitIdentity, 'commit', '-qm', 'base');
  writeFileSync(join(other, 'g'), 'z\n');
  git(other, 'add', 'g');
  git(other, ...gitIdentity, 'commit', '-qm', 'next');
  const elsewhere = mkdtempSync(join(testRoot, 'elsewhere-'));

  const ws = runScript(elsewhere, 'sdd-workspace', '-C', other, 'plan-a.md');
  assert.equal(ws.status, 0, ws.stderr);
  assert.equal(dirname(normalize(ws.stdout.trim())), join(other, '.razorback', 'sdd'));

  const brief = runScript(elsewhere, 'task-brief', '-C', other, 'plan-a.md', '1');
  assert.equal(brief.status, 0, brief.stderr);
  assert.ok(normalize(brief.stdout.match(/^wrote (.*): \d+ lines$/m)[1]).startsWith(join(other, '.razorback', 'sdd')));

  const pkg = runScript(elsewhere, 'review-package', '-C', other, 'plan-a.md', 'HEAD~1', 'HEAD');
  assert.equal(pkg.status, 0, pkg.stderr);
  assert.match(pkg.stdout, /1 commit\(s\)/);

  const bad = runScript(elsewhere, 'review-package', '-C', join(testRoot, 'no-such-dir'), 'plan-a.md', 'HEAD~1', 'HEAD');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /bad -C directory/);
});

test('review-package refuses an empty or non-descendant range with exit 3', () => {
  const same = runScript(repo, 'review-package', 'plan-a.md', 'HEAD', 'HEAD');
  assert.equal(same.status, 3);
  assert.match(same.stderr, /empty commit range/);

  const reversed = runScript(repo, 'review-package', 'plan-a.md', 'HEAD', 'HEAD~1');
  assert.equal(reversed.status, 3);
  assert.match(reversed.stderr, /HEAD is not a descendant of BASE/);
});

test('task-brief matches a task id as a whole and keeps its lettered sub-tasks', () => {
  const plan = join(repo, 'plan-ids.md');
  writeFileSync(plan, [
    '# Plan', '', '## Task 6: Six', '', 'six body', '', '### Task 6b: Six bee', '', 'six-bee body', '',
    '## Task 2.1: Two point one', '', 'dotted body', '', '## Task A1: Letter first', '', 'lettered body', '',
    '## Task 61: Sixty-one', '', 'sixty-one body', '',
  ].join('\n'));

  const six = runScript(repo, 'task-brief', 'plan-ids.md', '6', join(testRoot, 'six.md'));
  assert.equal(six.status, 0, six.stderr);
  const sixText = readFileSync(join(testRoot, 'six.md'), 'utf8');
  assert.match(sixText, /six body/);
  assert.match(sixText, /six-bee body/);
  assert.doesNotMatch(sixText, /sixty-one body/);
  assert.doesNotMatch(sixText, /dotted body/);

  for (const [id, body] of [['2.1', 'dotted body'], ['A1', 'lettered body'], ['6b', 'six-bee body']]) {
    const out = join(testRoot, `task-${id}.md`);
    const result = runScript(repo, 'task-brief', 'plan-ids.md', id, out);
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(out, 'utf8'), new RegExp(body));
  }
});

test('task-brief refuses a brief that an unclosed code fence would run to the end of the plan', () => {
  const plan = join(repo, 'plan-fence.md');
  writeFileSync(plan, ['# Plan', '', '## Task 1: One', '', '```bash', 'echo never closed', '', '## Task 2: Two', '', 'two body', ''].join('\n'));
  const out = join(testRoot, 'fence.md');
  const result = runScript(repo, 'task-brief', 'plan-fence.md', '1', out);
  assert.equal(result.status, 4);
  assert.match(result.stderr, /code fence opened at line 5 of plan-fence\.md never closes/);
  assert.ok(!existsSync(out));
});

test('task-brief names the English heading word when a plan has none', () => {
  const plan = join(repo, 'plan-es.md');
  writeFileSync(plan, ['# Plan', '', '## Tarea 1: Primera', '', 'cuerpo', ''].join('\n'));
  const result = runScript(repo, 'task-brief', 'plan-es.md', '1', join(testRoot, 'es.md'));
  assert.equal(result.status, 3);
  assert.match(result.stderr, /must use the English word "Task"/);
  assert.match(result.stderr, /## Tarea 1: Primera/);
});
