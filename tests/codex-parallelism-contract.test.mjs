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
  const compact = section(skill, '## Compact Single-Task Full-Plan Form');
  assert.match(compact, /Not applicable - single task\./);
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

test('planning and dispatch do not require Razorback-owned model routing', () => {
  const writingPlans = read('skills/writing-plans/SKILL.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const implementerPrompt = read('skills/subagent-driven-development/implementer-prompt.md');
  const codexTools = read('skills/using-razorback/references/codex-tools.md');

  for (const content of [writingPlans, sdd, implementerPrompt, codexTools]) {
    assert.doesNotMatch(content, /RAZORBACK\.md/);
    assert.doesNotMatch(content, /Model Routing/);
    assert.doesNotMatch(content, /model-routing tier/i);
    assert.doesNotMatch(content, /mechanical tier/i);
    assert.doesNotMatch(content, /strategy tier/i);
    assert.doesNotMatch(content, /gate-review/i);
  }

  assert.match(sdd, /Use the harness default model unless/i);
  assert.match(codexTools, /Model choice is left to the lead agent/i);
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

// Bind each commit-mode name to its actual git behavior, so an inverted or
// corrupted definition fails instead of passing on mere string presence.
test('commit modes are bound to their git behavior in the worker prompts', () => {
  const implementerPrompt = read('skills/subagent-driven-development/implementer-prompt.md');
  const fixPrompt = read('skills/subagent-driven-development/fix-prompt.md');

  for (const prompt of [implementerPrompt, fixPrompt]) {
    assert.match(prompt, /`parallel-lead-commit`: do not run `git add` or `git commit`/);
    assert.match(prompt, /`serial-worker-commit`: after assigned verification passes, you may commit/);
  }
});

// Lock the parallel-lead-commit durability contract: commit before recording,
// record a real SHA (never "pending"), scope lead staging, and reconcile on resume.
test('subagent-driven-development enforces the parallel-lead-commit durability contract', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  // Lead stages only owned files, never a broad add that sweeps sibling edits.
  assert.match(skill, /Never `git add -A`/);
  // Commit precedes the durable-progress record, and that record carries a real SHA.
  assert.match(skill, /the lead commits first, then records the SHA/);
  assert.match(skill, /lead commit <sha7>/);
  // The old record-before-commit "pending" marker must be gone.
  assert.doesNotMatch(skill, /lead commit pending/);
  // Recovery treats a missing/pending SHA as incomplete, not done.
  assert.match(skill, /INCOMPLETE/);
});

test('parallel-lead-commit includes plan progress in the lead commit', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /tick the task's acceptance-criteria\s+checkboxes before staging/i);
  assert.match(skill, /stage the reviewed task's owned files plus the\s+plan file/i);
  assert.match(skill, /then write the durable-progress line with the real commit SHA/i);
  assert.doesNotMatch(skill, /lead first stages that task's owned files and commits/i);
});

// The four contract fields must live inside EACH plan form, not just somewhere
// in the file — otherwise deleting them from the light or compact form passes.
test('light and compact plan forms each carry the parallel-contract task fields', () => {
  const skill = read('skills/writing-plans/SKILL.md');
  const fields = [
    /\*\*Contract inputs:\*\*/,
    /\*\*File ownership:\*\*/,
    /\*\*Serialization required:\*\*/,
    /\*\*Dependency reason:\*\*/,
  ];

  const templates = read('skills/writing-plans/task-templates.md');
  const lightPlan = section(templates, '## Light Plan Task Template');
  const compact = section(skill, '## Compact Single-Task Full-Plan Form');

  for (const field of fields) {
    assert.match(lightPlan, field);
    assert.match(compact, field);
  }
});

test('pre-merge-review carries no model-tier routing vocabulary', () => {
  const preMerge = read('skills/pre-merge-review/SKILL.md');
  const fixDispatch = read('skills/pre-merge-review/fix-dispatch-prompt.md');

  for (const content of [preMerge, fixDispatch]) {
    assert.doesNotMatch(content, /model tier/i);
    assert.doesNotMatch(content, /Model Routing/);
    assert.doesNotMatch(content, /mechanical tier/i);
    assert.doesNotMatch(content, /strategy tier/i);
    assert.doesNotMatch(content, /gate-review/i);
  }
});

// Extract a markdown section from its heading up to the next `## ` heading,
// ignoring `## ` lines that live inside fenced code blocks (the plan forms embed
// ````markdown examples that themselves contain `## Parallel Execution Contract`).
// Fence length is tracked so a nested ```python block does not close an outer ````fence.
function section(content, heading) {
  const lines = content.split('\n');
  const startIdx = lines.indexOf(heading);
  assert.notEqual(startIdx, -1, `missing section: ${heading}`);
  const out = [lines[startIdx]];
  let fenceLen = 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,})/);
    if (fence) {
      const len = fence[1].length;
      if (fenceLen === 0) fenceLen = len;
      else if (len >= fenceLen) fenceLen = 0;
    }
    if (fenceLen === 0 && /^## /.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}
