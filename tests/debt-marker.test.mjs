import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('harvesting-debt has the frontmatter fields repo convention requires', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');

  assert.match(skill, /^---\n/);
  assert.match(skill, /\nname: harvesting-debt\n/);
  assert.match(skill, /\ndescription:/);
});

test('harvesting-debt description carries its trigger phrases', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');
  const frontmatter = skill.split('---')[1];

  for (const phrase of [
    'what did we defer',
    'list the shortcuts',
    'debt ledger',
    'harvesting-debt',
    'razorback debt',
  ]) {
    assert.ok(
      frontmatter.includes(phrase),
      `description must contain trigger phrase: ${phrase}`,
    );
  }
});

test('the debt-marker convention is documented in both skills', () => {
  const harvest = read('skills/harvesting-debt/SKILL.md');
  const quickFix = read('skills/fixing-small-issues/SKILL.md');

  const marker = /# razorback: <ceiling>, <upgrade trigger>/;
  assert.match(harvest, marker);
  assert.match(quickFix, marker);

  // C-family comment prefix is called out, not just the hash form.
  assert.match(harvest, /\/\//);
});

test('harvesting-debt scans with an exclusion-aware grep', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');

  assert.match(skill, /grep -rnE '\(#\|\/\/\) \?razorback:'/);
  for (const excluded of [
    'node_modules',
    '.git',
    'skills/',
    'docs/',
    'commands/',
    'agents/',
    '.memories/',
  ]) {
    assert.ok(
      skill.includes(excluded),
      `scan guidance must name the excluded path: ${excluded}`,
    );
  }
  // The rationale for excluding razorback's own doc dirs must be stated.
  assert.match(skill, /cross-reference/i);
});

test('harvesting-debt defines the ledger row format and the no-trigger flag', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');

  assert.match(
    skill,
    /<file>:<line>, <what was simplified>\. ceiling: <the limit named>\. upgrade: <the trigger to revisit>\./,
  );
  assert.match(skill, /no-trigger/);
  assert.match(skill, /silently rot/);
  assert.match(skill, /<N> markers, <M> with no trigger\./);
  assert.match(skill, /Clean ledger/);
});

test('harvesting-debt states its one-shot, read-only boundary', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');

  assert.match(skill, /Reads and reports only, changes nothing/);
  assert.match(skill, /One-shot/);
  assert.match(skill, /does not persist/i);
});

test('fixing-small-issues tells the fixer to mark a deliberate shortcut', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /cuts a real corner with a known ceiling/);
  assert.match(skill, /razorback:harvesting-debt/);
  // The report/summary format mentions markers left behind.
  assert.match(skill, /marker/i);
});

test('fixing-small-issues triage criteria survive the marker edit unchanged', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  // Load-bearing triage phrases — protected by CLAUDE.md "What Not to Change".
  assert.match(skill, /The quick-fix tier applies only when ALL criteria hold/);
  assert.match(skill, /≤ 2 source files/);
  assert.match(skill, /~20 changed lines/);
  assert.match(skill, /single `git revert`/);
  assert.match(skill, /Confirmed with Miller evidence/);
  assert.match(
    skill,
    /\*\*Any criterion fails or cannot be measured → exit this skill\.\*\*/,
  );
  assert.match(skill, /An unknown is a failure, not a pass/);
  assert.match(skill, /NO INFRASTRUCTURE BEFORE INVESTIGATION/);
  assert.match(skill, /Affected scope only/);
});
