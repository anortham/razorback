import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('writing-plans requires the parallel execution contract header and fields', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /## Parallel Execution Contract/);
  assert.match(skill, /\*\*Contract inputs:\*\*/);
  assert.match(skill, /\*\*File ownership:\*\*/);
  assert.match(skill, /\*\*Serialization required:\*\*/);
  assert.match(skill, /\*\*Dependency reason:\*\*/);
});

test('writing-plans documents the compact single-task full-plan form', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /## Compact Single-Task Full-Plan Form/);
  assert.match(skill, /Not applicable - single task\./);
});

test('writing-plans routes task completion through commit mode instead of direct commit only', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /Apply commit mode/);
  assert.match(skill, /serial-worker-commit/);
  assert.match(skill, /parallel-lead-commit/);
  assert.doesNotMatch(skill, /verify pass → commit/);
  assert.doesNotMatch(skill, /\*\*Step 5: Commit\*\*/);
  assert.doesNotMatch(skill, /git add/);
  assert.doesNotMatch(skill, /git commit/);
  assert.doesNotMatch(skill, /worker-scope verification green, committed/i);
  assert.doesNotMatch(skill, /Tests pass and changes committed/);
  assert.doesNotMatch(skill, /Worker-scope verification passes, committed/);
  assert.doesNotMatch(skill, /frequent commits/);
});

test('subagent-driven-development validates safe batches and commit modes', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /safe batch with 2\+ eligible tasks dispatches together/i);
  assert.match(skill, /Serializing a safe batch requires a recorded dependency or tool limitation/i);
  assert.match(skill, /parallel-lead-commit/);
  assert.match(skill, /serial-worker-commit/);
});

test('implementer and fix prompts support lead-commit and worker-commit modes', () => {
  const implementerPrompt = read('skills/subagent-driven-development/implementer-prompt.md');
  const fixPrompt = read('skills/subagent-driven-development/fix-prompt.md');

  for (const prompt of [implementerPrompt, fixPrompt]) {
    assert.match(prompt, /## Commit mode/);
    assert.match(prompt, /serial-worker-commit/);
    assert.match(prompt, /parallel-lead-commit/);
  }
});

test('codex tools require parallel safe batches to use multiple spawn_agent calls in one turn', () => {
  const codexTools = read('skills/using-razorback/references/codex-tools.md');

  assert.match(codexTools, /multiple eligible safe tasks mean multiple `spawn_agent` calls in the same turn/i);
  assert.match(codexTools, /serializing requires a recorded dependency or tool limitation/i);
});
