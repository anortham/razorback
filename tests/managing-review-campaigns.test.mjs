import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('campaign setup is immutable and budgets external invocations separately from rounds', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  assert.match(skill, /^---\nname: managing-review-campaigns\n/m);
  assert.match(skill, /description: Use when .*review.*repeat.*multiple reviewers.*clean review/is);
  assert.match(skill, /REVIEW CAMPAIGN\nscope: <problem class and change range>\nworkflow: ordinary \| pre-merge \| convergence\nparticipants: <lead and selected reviewers>\nrequired_reviewers: <names or none>\nevidence_target: lead-only \| fresh-session \| external-reviewed \| cross-model-reviewed\nseverity_floor: <default medium>\ndiscovery_scopes: <named scopes>\nexternal_invocation_budget: <integer>\nmax_rounds: <1-3>\nround: 0\/<max>\nexternal_invocations: 0\/<budget>/);
  assert.match(skill, /participants and budgets cannot grow mid-campaign/i);
  assert.match(skill, /setup fields.*immutable.*counters.*only increase/is);
  assert.match(skill, /each (?:external )?CLI call counts as one external invocation/i);
  assert.match(skill, /rounds and total (?:external )?reviewer invocations are hard-capped/i);
  assert.match(skill, /no per-invocation turn\/spend caps/i);
  assert.match(skill, /\| Standalone external \| One selected reviewer \| Lead \| 2 \| 2/);
  assert.match(skill, /completion validation/i);
  assert.match(skill, /same current-directory session/i);
  assert.match(skill, /no third call|third invocation/i);
});

test('availability labels evidence honestly without blocking ordinary lead-only completion', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  for (const label of [
    'lead-only',
    'fresh-session',
    'external-reviewed',
    'cross-model-reviewed',
  ]) {
    assert.match(skill, new RegExp(`\\| .*${label}.* \\|`));
  }

  assert.match(skill, /ordinary review may complete/i);
  assert.match(skill, /never reported as cross-model/i);
  assert.match(skill, /named by the user.*required by repo instructions.*approved plan/is);
  assert.match(skill, /explicit reviewer.*unavailable.*block/is);
  assert.match(skill, /optional participant lost mid-campaign.*not retried or replaced/is);
  assert.match(skill, /unavailable optional participant.*record/is);
  assert.match(skill, /required reviewer obligation is satisfied once usable evidence covers every declared required discovery scope/i);
  assert.match(skill, /optional confirmation.*does not retroactively block/i);
});

test('three round ceiling permits Round 3 only for objective fix regressions', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  assert.match(skill, /Round 1[^\n]*discovery/i);
  assert.match(skill, /freeze the accepted finding set/i);
  assert.match(skill, /Round 2[^\n]*scoped confirmation/i);
  for (const disposition of ['addressed', 'not addressed', 'contested', 'deferred']) {
    assert.match(skill, new RegExp(`\\b${disposition}\\b`));
  }
  assert.match(skill, /outside the fix diff.*cannot extend the campaign/is);
  assert.match(skill, /new medium\/low observation.*cannot authorize another external sweep/is);
  assert.match(skill, /Round 3[^\n]*exceptional targeted confirmation/i);
  assert.match(skill, /only when the lead verifies a new critical\/high regression introduced inside the fix diff/i);
  assert.match(skill, /reviewer disagreement is not a trigger/i);
  assert.match(skill, /broad discovery is forbidden/i);
  assert.match(skill, /stop after (?:Round 3|the round) regardless of outcome/i);
  assert.match(skill, /extra reviewers never add rounds/i);
  assert.match(skill, /at most one (?:external )?confirmer/i);
  assert.match(skill, /Ordinary lead-only \| Lead sweep \| Lead \| 0 \| 2/);
});

test('closure uses canonical severity, evidence, and finite terminal states', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  assert.match(skill, /critical.*high.*medium.*low/is);
  assert.match(skill, /skills\/codex-cli\/schemas\/review-output\.schema\.json/);
  for (const evidence of ['red-to-green test', 'existing covering test', 'inspection-only']) {
    assert.match(skill, new RegExp(`\\b${evidence}\\b`));
  }
  assert.match(skill, /fix, dismissal, dispute, or deferral reason/i);
  assert.match(skill, /majority vote.*cannot override code evidence, scope, or the campaign budget/is);
  assert.match(skill, /state: clean \| capped \| blocked/);
  assert.match(skill, /evidence: lead-only \| fresh-session \| external-reviewed \| cross-model-reviewed/);
  assert.match(skill, /open_critical_high: 0/);
  assert.match(skill, /open_medium_low: 2/);
  assert.match(skill, /open_above_floor: 1/);
  assert.match(skill, /deferred finding at or above the severity floor remains open/i);
  assert.match(skill, /exhausted external budget stops external dispatch but does not prevent an already-permitted lead-only confirmation/i);
  assert.match(skill, /capped.*no permitted action remains.*above-floor finding/is);
  assert.match(skill, /campaign_closed: yes/);
  assert.match(skill, /clean.*capped.*blocked.*terminal/is);
});

test('discipline counters the observed runaway-review rationalizations', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  assert.match(skill, /## Observed Rationalizations/);
  assert.match(skill, /one more (?:pair|review).*budget/is);
  assert.match(skill, /inflate severity.*Round 3/is);
  assert.match(skill, /majority vote.*evidence/is);
  assert.match(skill, /reset (?:the )?counters.*compaction|compaction.*reset (?:the )?counters/is);
  assert.match(skill, /## Red Flags/);
  assert.match(skill, /campaign_closed: yes.*terminal/is);
});

test('campaign completion continuation cannot become a fresh sweep', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');

  assert.match(skill, /one bounded continuation/i);
  assert.match(skill, /same session/i);
  assert.match(skill, /only.*failed completion validation/i);
  assert.match(skill, /sandbox startup failure.*no session.*cannot.*continuation/is);
  assert.match(skill, /second invalid.*blocked|capped/is);
  assert.doesNotMatch(skill, /--no-plan/);
});

test('README lists the canonical campaign skill', () => {
  const readme = read('README.md');

  assert.match(readme, /\| managing-review-campaigns \| .*bounded.*review/i);
});
