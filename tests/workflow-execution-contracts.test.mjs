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
  assert.match(finishing, /authority metadata updates[\s\S]*stage the report[\s\S]*before push/i);
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

test('checkpoints follow the selective policy and travel with their commit', () => {
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const implementer = read('skills/subagent-driven-development/implementer-prompt.md');
  const fix = read('skills/subagent-driven-development/fix-prompt.md');
  const executing = read('skills/executing-plans/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  for (const content of [sdd, executing]) {
    assert.match(content, /only when it carries information a later session needs/);
    assert.match(content, /Routine commits and phase boundaries need no checkpoint/);
    assert.match(content, /If Goldfish is unavailable/);
    assert.doesNotMatch(content, /checkpoint`? before (?:each|every) commit/i);
  }
  for (const content of [implementer, fix]) {
    assert.match(content, /write a Goldfish checkpoint before the commit and stage its artifact with your files/);
  }
  assert.match(sdd, /commit before you record/i);
  assert.match(sdd, /real commit SHA/i);
  assert.match(sdd, /do not emit a duplicate checkpoint after finishing returns/i);
  assert.match(finishing, /Step 7[\s\S]*PR-URL metadata commit[\s\S]*checkpoint artifact/i);
  assert.match(finishing, /The report is the run's handoff record, so this commit needs no separate checkpoint/);
  assert.doesNotMatch(finishing, /Checkpoint before every commit in this skill/);
});


test('one coherent task stays with the current agent and delegation needs a reason', () => {
  const brainstorming = read('skills/brainstorming/SKILL.md');
  const plans = read('skills/writing-plans/SKILL.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');
  const executing = read('skills/executing-plans/SKILL.md');

  for (const content of [brainstorming, plans, sdd, executing]) {
    assert.doesNotMatch(content, /including (for )?one task/i);
  }
  for (const content of [plans, sdd, executing]) {
    assert.match(content, /independent tasks, or tasks whose separate context has a clear benefit/i);
  }
  assert.match(sdd, /One coherent task → the current agent does it/);
  assert.match(sdd, /serialized lane/i);
  assert.match(executing, /This is the default way to run a plan: the current agent does the work/);
  assert.match(brainstorming, /the current agent does the work directly \(TDD applies\)\. No plan file, worker, or task report\./);
});

test('plan files exist for handoff, multi-session, or coordination and do not prewrite code', () => {
  const plans = read('skills/writing-plans/SKILL.md');
  const templates = read('skills/writing-plans/task-templates.md');

  assert.match(plans, /## When to Write a Plan File/);
  assert.match(plans, /\*\*Handoff:\*\*/);
  assert.match(plans, /\*\*Multi-session:\*\*/);
  assert.match(plans, /\*\*Coordination:\*\*/);
  assert.match(plans, /Neither prewrites the implementation/);
  assert.doesNotMatch(plans, /complete code/i);
  assert.match(plans, /proceed without a second approval round/);
  assert.doesNotMatch(templates, /```python/);
});
