import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('implementer prompt forbids dispatching subagents or reviewers', () => {
  const prompt = read('skills/subagent-driven-development/implementer-prompt.md');
  assert.match(prompt, /## You Do Not Dispatch Subagents/);
  assert.match(prompt, /Do all of this task's work yourself\./);
  assert.match(prompt, /Never spawn a subagent to\s+implement part of the task/);
  assert.match(prompt, /never spawn a reviewer to\s+check your work/);
});

test('fix prompt forbids dispatching subagents or reviewers', () => {
  const prompt = read('skills/subagent-driven-development/fix-prompt.md');
  assert.match(prompt, /## You Do Not Dispatch Subagents/);
  assert.match(prompt, /Do all of this task's work yourself\./);
  assert.match(prompt, /never spawn a reviewer to\s+check your work/);
});

test('code reviewer agent prompt forbids dispatching child subagents', () => {
  const prompt = read('skills/requesting-code-review/code-reviewer.md');
  assert.match(prompt, /## You Do Not Dispatch Subagents/);
  assert.match(prompt, /Do all of this review yourself\./);
  assert.match(prompt, /Never spawn a subagent to review part\s+of the diff/);
});

test('SDD skill rationalization table flags worker-spawned reviewers', () => {
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  assert.match(sdd, /The implementer spawned its own reviewer/);
  assert.match(sdd, /duplicate seat reviewing the same diff/);
});
