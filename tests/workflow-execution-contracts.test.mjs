import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

test('implementation approval records publication authority separately', () => {
  const plans = read('skills/writing-plans/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const report = read('skills/finishing-a-development-branch/morning-report-template.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const executing = read('skills/executing-plans/SKILL.md');

  assert.match(plans, /local_commit_authority: authorized/);
  assert.match(plans, /push_authority/);
  assert.match(plans, /pr_authority/);
  assert.match(plans, /Implementation approval does not imply publication authority/i);
  assert.match(finishing, /Awaiting publication approval/);
  assert.match(finishing, /local work and review materials are ready/i);
  assert.match(finishing, /Step 4a owns the single request/i);
  assert.doesNotMatch([plans, finishing, sdd, executing].join('\n'), /pending_commit_paths/);
  assert.match(report, /Publication authority/);
});

test('awaiting-publication status is committed before the approval request', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const renderStep = finishing.indexOf('### Step 3: Render morning report');
  const awaitingStatus = finishing.indexOf('Status: Awaiting publication approval', renderStep);
  const commitStep = finishing.indexOf('### Step 4: Write full report + commit');
  const requestStep = finishing.indexOf('### Step 4a: Request missing publication authority once');

  assert.ok(renderStep < awaitingStatus && awaitingStatus < commitStep);
  assert.ok(commitStep < requestStep);
  assert.match(finishing, /ask using the prepared report/i);
  assert.match(finishing, /authority metadata updates[\s\S]*checkpoint[\s\S]*explicitly stage[\s\S]*before push/i);
  assert.match(finishing, /source-control state check/i);
});

test('authorized push recovery checks remote state and bounds retries', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  assert.match(finishing, /inspect the exact failure/i);
  assert.match(finishing, /remote branch state/i);
  assert.match(finishing, /already landed/i);
  assert.match(finishing, /bounded/i);
  assert.match(finishing, /transient/i);
  assert.match(finishing, /reconciliation that changes HEAD invalidates prior evidence/i);
  assert.match(finishing, /Never merge the PR or target branch/i);
  assert.match(finishing, /never.*force.push/is);
  assert.doesNotMatch(finishing, /If the push is rejected[\s\S]{0,400}emit the terminal pointer, and exit/i);
});

test('every workflow commit has a Goldfish pre-commit checkpoint', () => {
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const implementer = read('skills/subagent-driven-development/implementer-prompt.md');
  const fix = read('skills/subagent-driven-development/fix-prompt.md');
  const executing = read('skills/executing-plans/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  for (const content of [sdd, implementer, fix, executing, finishing]) {
    assert.match(content, /checkpoint`? before (?:each|every|the) commit/i);
  }
  assert.match(sdd, /parallel-lead-commit[\s\S]*lead checkpoints/i);
  assert.match(sdd, /commit before you record/i);
  assert.match(sdd, /real commit SHA/i);
  assert.match(sdd, /do not emit a duplicate checkpoint after finishing returns/i);
  assert.match(finishing, /Step 7[\s\S]*PR-URL metadata commit[\s\S]*checkpoint artifact/i);
  assert.doesNotMatch(sdd, /per-task checkpoints are noise/i);
  assert.doesNotMatch(executing, /per-task checkpoints are noise/i);
});

test('task routing follows delegation availability rather than task count', () => {
  const brainstorming = read('skills/brainstorming/SKILL.md');
  const plans = read('skills/writing-plans/SKILL.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const executing = read('skills/executing-plans/SKILL.md');

  for (const content of [brainstorming, plans, sdd, executing]) {
    assert.match(content, /delegation is available/i);
    assert.match(content, /no delegation/i);
  }
  assert.match(sdd, /including one task/i);
  assert.match(sdd, /serialized/i);
  assert.match(executing, /explicitly selected single-agent/i);
  assert.doesNotMatch(brainstorming, /If the task is a single coherent unit:\*\* Dispatch one implementer/);
});
