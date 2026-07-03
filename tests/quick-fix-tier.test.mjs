import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('fixing-small-issues defines objective entry criteria, not judgment calls', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /≤ 2 source files/);
  assert.match(skill, /~20 changed lines/);
  assert.match(skill, /single `git revert`/);
  assert.match(skill, /Confirmed with Miller evidence/);
  assert.match(skill, /An unknown is a failure, not a pass/);
  assert.doesNotMatch(skill, /RAZORBACK\.md/);
});

test('fixing-small-issues enforces investigation before infrastructure', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /NO INFRASTRUCTURE BEFORE INVESTIGATION/);
  assert.match(skill, /Running any test suite before opening the implicated code/);
  assert.match(skill, /Never calls:\*\* razorback:using-git-worktrees/);
});

test('fixing-small-issues removes the consent interruption for the quick-fix tier', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /No user consent is needed to proceed/);
  assert.match(skill, /Asking re-imports the interruption/);
});

test('fixing-small-issues defines objective escalation triggers', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /3rd source file/);
  assert.match(skill, /second fix attempt fails/i);
  assert.match(skill, /shared or public code/);
  assert.match(skill, /tier change, not a failure/);
  assert.match(skill, /where the root cause lives, not by how small you can make the diff/);
});

test('fixing-small-issues counters rationalization in both directions', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  // downscaling abuse
  assert.match(skill, /Measure files and lines against the criteria/);
  assert.match(skill, /Tiny fixes regress too/);
  // ceremony reflex
  assert.match(skill, /run the full suite first/);
  assert.match(skill, /Affected scope only/);
});

test('fixing-small-issues keeps TDD and verification discipline', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /razorback:test-driven-development/);
  assert.match(skill, /razorback:verification-before-completion/);
  assert.match(skill, /failing regression test first/);
});

test('brainstorming triages quick fixes away before choosing a path', () => {
  const skill = read('skills/brainstorming/SKILL.md');

  assert.match(skill, /## Triage First: Is This Design Work\?/);
  assert.match(skill, /razorback:fixing-small-issues/);
  assert.match(skill, /measured gate, not a judgment call/);
});

test('using-razorback routes quick fixes in the execution model', () => {
  const skill = read('skills/using-razorback/SKILL.md');

  assert.match(skill, /razorback:fixing-small-issues/);
});

test('using-git-worktrees exempts the quick-fix tier without a consent question', () => {
  const skill = read('skills/using-git-worktrees/SKILL.md');

  assert.match(skill, /Never called by:\*\* razorback:fixing-small-issues/);
  assert.match(skill, /no consent question needed/);
});

test('systematic-debugging hands qualifying fixes to the quick-fix tier', () => {
  const skill = read('skills/systematic-debugging/SKILL.md');

  assert.match(skill, /razorback:fixing-small-issues/);
});

test('fixing-small-issues carries its own scoped verification policy', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /NO INFRASTRUCTURE BEFORE INVESTIGATION/);
  assert.match(skill, /Affected scope only/);
  assert.match(skill, /full suite runs at the branch gate/i);
  assert.doesNotMatch(skill, /repo-root `RAZORBACK\.md`/);
});
