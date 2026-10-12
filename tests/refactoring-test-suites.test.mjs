import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(root, 'skills/refactoring-test-suites/SKILL.md'), 'utf8');

test('refactoring-test-suites names its trigger and its sibling boundary', () => {
  assert.match(skill, /^---\nname: refactoring-test-suites\ndescription: Cuts a test suite's run time and test count .* Use when a suite is slow or bloated/);
  assert.match(skill, /Not for writing new tests \(razorback:test-driven-development\)\.\n---/);
});

test('refactoring-test-suites states the deletion law verbatim', () => {
  assert.match(skill, /NO DELETED TEST WITHOUT A KEPT TEST THAT FAILS FOR THE SAME BUG/);
});

test('refactoring-test-suites puts speed fixes before deletions and guards against regrowth', () => {
  const find = skill.indexOf('**Find the time before you delete anything.**');
  const cut = skill.indexOf('**Map rules across layers, then cut duplication.**');
  const regrowth = skill.indexOf('**Stop the regrowth.**');
  assert.ok(find > 0 && find < cut && cut < regrowth);
  assert.match(skill, /The user owns these rules: show the diff and get agreement\./);
});
