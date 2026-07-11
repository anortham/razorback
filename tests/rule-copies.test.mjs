import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = path.join(import.meta.dirname, '..');
const checker = path.join(root, 'scripts', 'check-rule-copies.mjs');

const CANONICAL = 'skills/using-razorback/references/instruction-tier.md';
const SKILL = 'skills/using-razorback/SKILL.md';
const SUBAGENT = 'skills/using-razorback/references/subagent-toolchain.md';
const COPIES = [
  '.cursor/rules/razorback.mdc',
  '.windsurf/rules/razorback.md',
  '.clinerules/razorback.md',
  '.kiro/steering/razorback.md',
];

function runChecker(targetRoot) {
  return spawnSync(process.execPath, [checker, targetRoot], { encoding: 'utf8' });
}

// Build a throwaway copy of just the files the checker reads, so a fixture can
// drift one of them without touching the real repo.
function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-rule-copies-'));
  for (const rel of [CANONICAL, SKILL, SUBAGENT, ...COPIES]) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  }
  return dir;
}

function edit(dir, rel, transform) {
  const file = path.join(dir, rel);
  fs.writeFileSync(file, transform(fs.readFileSync(file, 'utf8')));
}

test('checker passes against the real repo', () => {
  const result = runChecker(root);
  assert.equal(result.status, 0, `checker failed:\n${result.stdout}${result.stderr}`);
});

test('canonical carries no Skill-tool or razorback: skill references', () => {
  const canonical = fs.readFileSync(path.join(root, CANONICAL), 'utf8');
  assert.equal(/razorback:[a-z-]+/.test(canonical), false, 'canonical references a razorback: skill');
  assert.equal(/\bSkill tool\b/i.test(canonical), false, 'canonical references the Skill tool');
});

test('checker fails when a host copy drifts from the canonical body', () => {
  const dir = makeFixture();
  edit(dir, '.clinerules/razorback.md', (text) => `${text}\nDrifted line.\n`);

  const result = runChecker(dir);
  assert.equal(result.status, 1, 'expected exit 1 for a drifted copy');
  assert.match(result.stderr, /\.clinerules\/razorback\.md/);
});

test('checker fails when a rule invariant is missing from SKILL.md', () => {
  const dir = makeFixture();
  edit(dir, SKILL, (text) => text.replace('Inspect a symbol before modifying it', 'Look at a symbol first'));

  const result = runChecker(dir);
  assert.equal(result.status, 1, 'expected exit 1 for a missing invariant');
  assert.match(result.stderr, /invariant/i);
});

test('checker fails when a rule invariant is missing from the canonical', () => {
  const dir = makeFixture();
  edit(dir, CANONICAL, (text) => text.replace('Do not infer or invent API shapes', 'Guess the API shape'));

  const result = runChecker(dir);
  assert.equal(result.status, 1, 'expected exit 1 for a missing invariant');
  assert.match(result.stderr, /invariant/i);
});

// subagent-toolchain.md restates the same six rules for dispatched subagents. It is not
// byte-comparable to the canonical (different framing, extra worktree-state clause), so it
// is held to the invariant layer only — a reworded rule there must still trip the checker.
test('checker fails when a rule invariant is missing from subagent-toolchain.md', () => {
  const dir = makeFixture();
  edit(dir, SUBAGENT, (text) =>
    text.replace("Find a symbol's references before changing it", 'Look around a bit first')
  );

  const result = runChecker(dir);
  assert.equal(result.status, 1, 'expected exit 1 for a missing invariant');
  assert.match(result.stderr, /subagent-toolchain\.md is missing rule invariant/);
});
