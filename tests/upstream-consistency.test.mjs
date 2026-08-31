import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const CAP_POINTER = /canonical three-way cap contract is in `razorback:subagent-driven-development` Step 3 \("Cap adjudication"\)\./;

test('standalone reviewer catches a removed mutation-check requirement', () => {
  const body = read('skills/requesting-code-review/code-reviewer.md');
  const testing = body.slice(body.indexOf('**Testing:**'), body.indexOf('**Requirements:**'));

  assert.match(
    testing,
    /- Run the mutation check from `test-driven-development\/writing-good-tests\.md`: mentally mutate the production code; a test should fail for each realistic mutation\./,
    'standalone reviewer Testing checklist must require the canonical mutation check'
  );
});

test('cap callers catch a missing pointer to SDD cap adjudication', () => {
  const callers = [
    read('skills/requesting-code-review/SKILL.md'),
    read('skills/cursor-agent/SKILL.md'),
    read('skills/using-razorback/references/blocker-taxonomy.md'),
  ];

  assert.ok(
    callers.every((body) => CAP_POINTER.test(body)),
    'requesting-code-review, cursor-agent, and blocker taxonomy must point to SDD Step 3'
  );
});

test('spec reviewer catches inline task text instead of the canonical brief path', () => {
  const body = read('skills/subagent-driven-development/spec-reviewer-prompt.md');
  const requested = body.slice(body.indexOf('## What Was Requested'), body.indexOf('## What Implementer Claims They Built'));

  assert.match(
    requested,
    /Read this first — it is your requirements, with the exact values to use\s+verbatim: \[brief path printed by task-brief, \.razorback\/sdd\/<plan-key>\/task-N-brief\.md\]/,
    'spec review must source requirements from the plan-scoped task brief'
  );
});

test('parallel dispatch catches missing Miller refresh between write batches', () => {
  const body = read('skills/subagent-driven-development/SKILL.md');
  const parallelDispatch = body.slice(
    body.indexOf('### Parallel Dispatch (Independent Tasks)'),
    body.indexOf('## Step 3: Lead Inline Review')
  );

  assert.match(
    parallelDispatch,
    /After a completed batch of file writes, run Miller `workspace refresh` before the next dispatch\./,
    'parallel dispatch must refresh Miller after a write batch before dispatching again'
  );
});
