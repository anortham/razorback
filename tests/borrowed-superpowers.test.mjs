import { createRequire } from 'node:module';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const root = path.join(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const run = (cmd, args, options = {}) =>
  childProcess.execFileSync(cmd, args, { encoding: 'utf8', ...options });

test('brainstorm companion rejects oversized websocket frames', () => {
  const { decodeFrame } = require('../skills/brainstorming/scripts/server.cjs');
  const frame = Buffer.alloc(14);
  frame[0] = 0x81;
  frame[1] = 0x80 | 127;
  frame.writeBigUInt64BE(BigInt(10 * 1024 * 1024 + 1), 2);

  assert.throws(
    () => decodeFrame(frame),
    /payload exceeds maximum allowed size/
  );
});

test('brainstorm companion has session-key auth and file sandboxing', () => {
  const server = read('skills/brainstorming/scripts/server.cjs');

  assert.match(server, /function isAuthorized\(req\)/);
  assert.match(server, /timingSafeEqual/);
  assert.match(server, /function securityHeaders/);
  assert.match(server, /Cache-Control': 'no-store'/);
  assert.match(server, /X-Frame-Options': 'DENY'/);
  assert.match(server, /function isRegularFileInsideContentDir/);
  assert.match(server, /stat\.isSymbolicLink\(\)/);
  assert.match(server, /fileName\.startsWith\('\.'\)/);
  assert.match(server, /function companionUrl\(\)/);
  assert.match(server, /url: companionUrl\(\)/);
});

test('brainstorm launcher persists port and token for restart-safe sessions', () => {
  const startServer = read('skills/brainstorming/scripts/start-server.sh');
  const stopServer = read('skills/brainstorming/scripts/stop-server.sh');

  assert.match(startServer, /BRAINSTORM_PORT_FILE/);
  assert.match(startServer, /BRAINSTORM_TOKEN_FILE/);
  assert.match(startServer, /BRAINSTORM_IDLE_TIMEOUT_MS/);
  assert.match(stopServer, /server-instance-id/);
  assert.match(stopServer, /stale_pid/);
});

test('subagent-driven-development defines artifact helpers and durable ledger', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  for (const script of [
    'skills/subagent-driven-development/scripts/sdd-workspace',
    'skills/subagent-driven-development/scripts/task-brief',
    'skills/subagent-driven-development/scripts/review-package'
  ]) {
    assert.equal(exists(script), true, `${script} should exist`);
  }

  assert.match(read('skills/subagent-driven-development/scripts/sdd-workspace'), /\.razorback\/sdd/);
  assert.match(read('skills/subagent-driven-development/scripts/task-brief'), /Default OUTFILE: <repo-root>\/\.razorback\/sdd\/task-<N>-brief\.md/);
  assert.match(read('skills/subagent-driven-development/scripts/review-package'), /git diff -U10/);
  assert.match(skill, /## File Handoffs/);
  assert.match(skill, /## Durable Progress/);
  assert.match(skill, /\.razorback\/sdd\/progress\.md/);
  assert.match(skill, /Lead inline review/);
  assert.match(skill, /No reviewer subagents/);
});

test('subagent-driven-development keeps SDD artifacts self-ignored and worktree-local', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-sdd-'));
  const workspaceScript = path.join(root, 'skills/subagent-driven-development/scripts/sdd-workspace');
  const taskBriefScript = path.join(root, 'skills/subagent-driven-development/scripts/task-brief');
  const reviewPackageScript = path.join(root, 'skills/subagent-driven-development/scripts/review-package');

  try {
    const repoInput = path.join(testRoot, 'repo');
    run('git', ['init', '-q', '-b', 'main', repoInput]);
    const repo = run('git', ['rev-parse', '--show-toplevel'], { cwd: repoInput }).trim();

    const dir = run(workspaceScript, [], { cwd: repo }).trim();
    assert.equal(dir, path.join(repo, '.razorback', 'sdd'));
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), '*\n');

    fs.writeFileSync(path.join(dir, 'artifact.md'), 'x\n');
    assert.equal(run('git', ['status', '--porcelain'], { cwd: repo }), '');
    run('git', ['add', '-A'], { cwd: repo });
    assert.equal(run('git', ['diff', '--cached', '--name-only'], { cwd: repo }), '');

    fs.writeFileSync(
      path.join(repo, 'plan.md'),
      '# Plan\n\n## Task 1: First thing\n\nDo the first thing.\n'
    );

    const briefOutput = run(taskBriefScript, ['plan.md', '1'], { cwd: repo });
    const briefPath = briefOutput.match(/^wrote (.*): \d+ lines$/m)?.[1];
    assert.ok(briefPath?.startsWith(dir + path.sep), `brief path should be under ${dir}`);

    const gitIdentity = [
      '-c', 'user.email=t@example.com',
      '-c', 'user.name=t',
      '-c', 'commit.gpgsign=false'
    ];
    run('git', ['add', 'plan.md'], { cwd: repo });
    run('git', [...gitIdentity, 'commit', '-qm', 'c1'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'f'), 'y\n');
    run('git', ['add', 'f'], { cwd: repo });
    run('git', [...gitIdentity, 'commit', '-qm', 'c2'], { cwd: repo });

    const reviewOutput = run(reviewPackageScript, ['HEAD~1', 'HEAD'], { cwd: repo });
    const reviewPath = reviewOutput.match(/^wrote (.*): \d+.*$/m)?.[1];
    assert.ok(reviewPath?.startsWith(dir + path.sep), `review path should be under ${dir}`);

    const worktree = path.join(testRoot, 'wt');
    run('git', ['worktree', 'add', '-q', worktree, '-b', 'wt-feature'], { cwd: repo });
    const worktreeRoot = run('git', ['rev-parse', '--show-toplevel'], { cwd: worktree }).trim();
    const worktreeDir = run(workspaceScript, [], { cwd: worktree }).trim();

    assert.equal(worktreeDir, path.join(worktreeRoot, '.razorback', 'sdd'));
    assert.notEqual(worktreeDir, dir);

    fs.writeFileSync(path.join(worktreeDir, 'artifact.md'), 'y\n');
    assert.equal(run('git', ['status', '--porcelain'], { cwd: worktree }), '');
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
});

test('miller guidance forbids guessed API shapes in active workflows', () => {
  const usingRazorback = read('skills/using-razorback/SKILL.md');
  const writingPlans = read('skills/writing-plans/SKILL.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const implementerPrompt = read('skills/subagent-driven-development/implementer-prompt.md');
  const reviewSkill = read('skills/requesting-code-review/SKILL.md');
  const fixDispatchPrompt = read('skills/pre-merge-review/fix-dispatch-prompt.md');

  const surfaceList =
    /symbol names, function signatures, config shapes, route names, CLI flags, or public contracts/;

  assert.match(usingRazorback, /Do not infer or invent API shapes/);
  assert.match(usingRazorback, surfaceList);
  assert.match(writingPlans, surfaceList);
  assert.match(sdd, /API-shape evidence requirement/);
  assert.match(implementerPrompt, /## API Shape Evidence/);
  assert.match(implementerPrompt, /report the exact Miller calls/);
  assert.match(reviewSkill, /Miller-backed\s+API-shape evidence/);
  assert.match(fixDispatchPrompt, /API-shape evidence/);
});

test('writing-plans carries global constraints and per-task interfaces', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /## Global Constraints/);
  assert.match(skill, /version floors, dependency limits/);
  assert.match(skill, /\*\*Interfaces:\*\*/);
  assert.match(skill, /Consumes:/);
  assert.match(skill, /Produces:/);
  assert.match(skill, /A task's implementer sees only their own task/);
});
