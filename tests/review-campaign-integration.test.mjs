import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('cross-model convergence declares one immutable three-round campaign', async () => {
  const skill = await read('skills/cross-model-convergence/SKILL.md');

  assert.match(skill, /razorback:managing-review-campaigns/);
  assert.match(skill, /workflow: convergence/);
  assert.match(skill, /evidence_target: cross-model-reviewed/);
  assert.match(skill, /participants: lead, <selected different-model reviewers>/);
  assert.match(skill, /external_invocation_budget: <selected external reviewers \+ 1>/);
  assert.match(skill, /max_rounds: 3/);
  assert.match(skill, /round: 0\/3/);
  assert.match(skill, /one selected external reviewer yields budget 2; two selected external reviewers yield budget 3/i);
  assert.match(skill, /Select the different-model reviewers explicitly requested or deliberately chosen for this campaign/i);
  assert.match(skill, /Dispatch each selected reviewer exactly once/i);
  assert.match(skill, /different model from the lead/);
  assert.match(skill, /campaign_closed: yes/);
  assert.doesNotMatch(skill, /The lead and one external reviewer/);
  assert.doesNotMatch(skill, /Select all available/i);
  assert.doesNotMatch(skill, /default 4 \(initial audit \+ 3 fix rounds\)/);
});

test('pre-merge review accounts for exactly two external passes and local confirmation', async () => {
  const skill = await read('skills/pre-merge-review/SKILL.md');

  assert.match(skill, /razorback:managing-review-campaigns/);
  assert.match(skill, /workflow: pre-merge/);
  assert.match(skill, /evidence_target: external-reviewed/);
  assert.match(skill, /external_invocation_budget: 2/);
  assert.match(skill, /max_rounds: 2/);
  assert.match(skill, /external_invocations: 0\/2/);
  assert.match(skill, /general pass[\s\S]*external_invocations: 1\/2/);
  assert.match(skill, /security pass[\s\S]*external_invocations: 2\/2/);
  assert.match(skill, /local confirmation/i);
  assert.match(skill, /without a post-fix external re-review/i);
});

test('pre-merge reviewer prompts consume malformed output without retrying a pass', async () => {
  for (const reviewer of ['codex', 'claude']) {
    const prompt = await read(`skills/pre-merge-review/reviewer-prompts/${reviewer}.md`);

    assert.match(prompt, /Malformed or schema-invalid output consumes this pass's invocation and blocks the campaign; do not retry\./);
    assert.match(prompt, /schema-valid partial output exists[\s\S]*use it/i);
    assert.doesNotMatch(prompt, /retry \*\*once\*\*/i);
    assert.doesNotMatch(prompt, /single-retry rule/i);
    assert.doesNotMatch(prompt, /persists after one retry/i);
    assert.doesNotMatch(prompt, /truncated review is usually re-run in full/i);
  }
});

test('routine scoped SDD fix review stays outside campaign management', async () => {
  const skill = await read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /routine scoped fix review[\s\S]*does not start a review campaign/i);
  assert.match(skill, /broad discovery or dispatches an external reviewer[\s\S]*razorback:managing-review-campaigns/i);
  assert.match(skill, /4th attempt/);
});

test('delegated execution checkpoints and recovery preserve campaign terminal state', async () => {
  const skill = await read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /immutable REVIEW CAMPAIGN setup and current counters/i);
  assert.match(skill, /REVIEW CAMPAIGN STATUS/);
  assert.match(skill, /campaign_closed: yes[\s\S]*terminal/i);
  assert.match(skill, /do not dispatch another reviewer/i);
});

test('single-agent execution checkpoints and recovery preserve campaign terminal state', async () => {
  const skill = await read('skills/executing-plans/SKILL.md');

  assert.match(skill, /immutable REVIEW CAMPAIGN setup and current counters/i);
  assert.match(skill, /REVIEW CAMPAIGN STATUS/);
  assert.match(skill, /campaign_closed: yes[\s\S]*terminal/i);
  assert.match(skill, /do not dispatch another reviewer/i);
});

test('morning report renders bounded campaign evidence', async () => {
  const template = await read('skills/finishing-a-development-branch/morning-report-template.md');

  assert.match(template, /Review campaign/);
  assert.match(template, /\{\{review_campaign_state\}\}/);
  assert.match(template, /\{\{review_campaign_evidence\}\}/);
  assert.match(template, /\{\{review_campaign_round\}\}/);
  assert.match(template, /\{\{review_campaign_external_invocations\}\}/);
  assert.match(template, /\{\{review_campaign_open_critical_high\}\}/);
  assert.match(template, /\{\{review_campaign_open_medium_low\}\}/);
});
