import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers/repo.mjs';

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

test('publication approval wait checkpoints the report and authority state before stopping', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const reportStep = finishing.slice(
    finishing.indexOf('### Step 4: Write full report + commit'),
    finishing.indexOf('### Step 4a: Request missing publication authority once')
  );
  const waitStep = finishing.slice(
    finishing.indexOf('### Step 4a: Request missing publication authority once'),
    finishing.indexOf('### Step 5: Push branch')
  );

  assert.match(reportStep, /goldfish:checkpoint/);
  assert.match(reportStep, /workspace-relative report path/);
  assert.match(reportStep, /plan(?:\s+or|\/)task identity/);
  assert.match(reportStep, /branch and worktree/);
  assert.match(reportStep, /tested source commit/);
  assert.match(reportStep, /publication authority[\s\S]*source/);
  assert.match(reportStep, /\bWHAT\b[\s\S]*\bWHY\b[\s\S]*\bHOW\b[\s\S]*\bIMPACT\b/);
  assert.match(reportStep, /\bnext\b/);
  assert.match(reportStep, /absolute project\/worktree root as `workspace`/i);
  assert.match(reportStep, /On a resumed run, compare the latest checkpoint with the report state and authority source/);
  assert.match(reportStep, /checkpoint.*report[\s\S]*same commit/i);
  assert.ok(reportStep.indexOf('goldfish:checkpoint') < reportStep.indexOf('git commit'));
  assert.match(waitStep, /checkpoint.*does not grant.*authority/i);
  assert.match(waitStep, /authority state changes/);
  assert.match(waitStep, /unchanged resume does not create a duplicate checkpoint/i);
});

test('approval routing makes the checkpoint obligation visible before the long execution sequence', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const routing = finishing.slice(finishing.indexOf('### Step 0:'), finishing.indexOf('### Step 1:'));

  assert.match(routing, /approval pause is unfinished work/i);
  assert.match(routing, /checkpoint pointer/i);
  assert.match(routing, /commit them together/i);
  assert.match(read('skills/using-razorback/references/run-recovery.md'), /Name the next action explicitly, even if it is to keep waiting for publication authority/);
});

test('a complete run commits the report once and never writes the PR URL back', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const report = read('skills/finishing-a-development-branch/morning-report-template.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');

  assert.match(finishing, /### Step 6: Create PR\n[\s\S]*### Step 7: Emit terminal pointer/);
  assert.doesNotMatch(finishing, /### Step 8/);
  assert.doesNotMatch(finishing, /Write the PR URL back/);
  assert.match(finishing, /no later commit writes the URL back/);
  assert.match(finishing, /A run that ends `Complete` saves no checkpoint here/);
  for (const text of [finishing, report]) {
    assert.match(text, /gh pr view/);
    assert.doesNotMatch(text, /filled in after PR creation/);
  }
  assert.doesNotMatch(sdd, /PR-URL/);
});

test('other unfinished-work stops reuse the full checkpoint contract', () => {
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  const blockedStep = finishing.slice(
    finishing.indexOf('### Step 1: Verify branch gate'),
    finishing.indexOf('### Step 2: Determine base branch')
  );
  const partialStep = finishing.slice(
    finishing.indexOf('### Step 6: Create PR'),
    finishing.indexOf('### Step 7: Emit terminal pointer')
  );

  assert.match(blockedStep, /Step 4 checkpoint contents/);
  assert.match(blockedStep, /Goldfish is available/);
  assert.match(blockedStep, /next/);
  assert.match(partialStep, /Goldfish is available/);
  assert.match(partialStep, /Step 4 checkpoint contents/);
  assert.match(partialStep, /next/);
  assert.match(partialStep, /Stage the report, checkpoint, and digest when present together/);
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
  assert.match(finishing, /The report is the run's handoff record/);
  assert.match(finishing, /unfinished work[\s\S]*save one `goldfish:checkpoint` before this commit/);
  assert.doesNotMatch(finishing, /this commit needs no separate checkpoint/);
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

test('a plan binds outcomes and contracts, and a better approach inside them is taken and logged', () => {
  const plans = read('skills/writing-plans/SKILL.md');
  const executing = read('skills/executing-plans/SKILL.md');
  const implementer = read('skills/subagent-driven-development/implementer-prompt.md');
  const taxonomy = read('skills/using-razorback/references/blocker-taxonomy.md');

  assert.match(plans, /A plan binds outcomes and contracts, not steps/);
  assert.doesNotMatch(plans, /Full plan/);
  assert.doesNotMatch(executing, /steps exactly/);
  assert.match(executing, /The Approach is a starting point/);
  assert.match(implementer, /The brief's Approach is a starting point, not a script/);
  assert.doesNotMatch(implementer, /Implement exactly the task/);
  assert.match(taxonomy, /A better approach than the plan's Approach/);
});

test('plan files exist for handoff, multi-session, or coordination and do not prewrite code', () => {
  const plans = read('skills/writing-plans/SKILL.md');
  const templates = read('skills/writing-plans/task-templates.md');

  assert.match(plans, /## When to Write a Plan File/);
  assert.match(plans, /\*\*Handoff:\*\*/);
  assert.match(plans, /\*\*Multi-session:\*\*/);
  assert.match(plans, /\*\*Coordination:\*\*/);
  assert.match(plans, /Do not prewrite the implementation/);
  assert.doesNotMatch(plans, /complete code/i);
  assert.match(plans, /proceed without an approval round/);
  assert.doesNotMatch(templates, /```python/);
});

test('one approval covers the design, the reviewer choice, and publication', () => {
  const brainstorming = read('skills/brainstorming/SKILL.md');
  const plans = read('skills/writing-plans/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  assert.match(brainstorming, /Do not ask for approval section by section/);
  assert.match(brainstorming, /the written spec is the one design approval/);
  assert.doesNotMatch(brainstorming, /Ask after each section/);

  for (const text of [brainstorming, plans]) {
    assert.match(text, /whether I may push the branch and open the PR when the run is done/);
    assert.match(text, /pre-merge reviewer/);
  }

  assert.match(plans, /A plan needs its own approval only when it makes a consequential choice the user has not made/);
  assert.match(plans, /Never ask a separate question for push or PR authority/);
  assert.match(plans, /Never infer push or PR authority/);
  assert.doesNotMatch(plans, /Do not ask for missing push or PR authority here/);
  assert.match(finishing, /this stop is the fallback/);
});

test('the branch gate and the source-control check each run once, in the finish skill', () => {
  const executing = read('skills/executing-plans/SKILL.md');
  const sdd = read('skills/subagent-driven-development/SKILL.md');

  for (const skill of [executing, sdd]) {
    assert.match(skill, /runs the branch gate \(Step 1\) and reconciles source-control state \(Step 2a\)/);
    assert.match(skill, /Do not run either check here first/);
  }
  assert.doesNotMatch(sdd, /\*\*Final verification:\*\*/);
  assert.match(sdd, /Clean up only after the finish skill reports `Complete`/);
});
