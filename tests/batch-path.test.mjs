import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

test('fixing-small-issues runs a list of small items as one batch with one gate and one PR', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /## Batch mode/);
  assert.match(skill, /One branch for the whole batch/);
  assert.match(skill, /per item, never against the sum/);
  assert.match(skill, /Never a gate or a PR per item/);
  assert.match(skill, /One hard item never promotes the whole list to a plan/);
  assert.doesNotMatch(skill, /open a PR where the project is branch-gated/);
  assert.match(skill, /The PR belongs to the branch, not to the item/);
});

test('fixing-small-issues names the per-item PR and the plan-for-a-list as rationalizations', () => {
  const skill = read('skills/fixing-small-issues/SKILL.md');

  assert.match(skill, /so eleven PRs/);
  assert.match(skill, /A list of small items is a batch, not a plan/);
  assert.match(skill, /after each item of a batch/);
});

test('brainstorming triage and using-razorback route a list of small items to batch mode', () => {
  const brainstorming = read('skills/brainstorming/SKILL.md');
  const bootstrap = read('skills/using-razorback/SKILL.md');

  assert.match(brainstorming, /\*\*A list of small, independent items\*\*[\s\S]*leave this skill/);
  assert.match(brainstorming, /An item count is not a reason for a plan/);
  assert.match(bootstrap, /\*\*A list of small, independent items:\*\* `razorback:fixing-small-issues` Batch mode/);
  assert.match(bootstrap, /one branch, one gate, one PR/);
});

test('writing-plans and finishing keep plan ceremony away from a batch of small items', () => {
  const plans = read('skills/writing-plans/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  assert.match(plans, /An item count is never the reason/);
  assert.match(finishing, /Batch mode/);
  assert.match(finishing, /morning report and its metadata commits belong to plan runs/);
});

test('the instruction-tier ruleset carries the one-batch rule', () => {
  const ruleset = read('skills/using-razorback/references/instruction-tier.md');

  assert.match(ruleset, /A list of such items is one batch: one branch, one branch gate, one PR, never a gate or a PR per item/);
});

test('the site describes batch mode', () => {
  const page = read('docs/site/index.html');

  assert.match(page, /Batch mode/);
  assert.match(page, /one branch, one branch gate, one pull request/);
});
