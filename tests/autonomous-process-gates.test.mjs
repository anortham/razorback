import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('brainstorming keeps pre-plan approval gates before implementation', () => {
  const skill = read('skills/brainstorming/SKILL.md');

  assert.match(skill, /get user approval/);
  assert.match(skill, /User reviews written spec/);
  assert.match(skill, /Only proceed once the user approves/);
  assert.match(skill, /MUST present it and get approval/);
});

test('brainstorming can offer visual companion before the plan is approved', () => {
  const skill = read('skills/brainstorming/SKILL.md');

  assert.match(skill, /This offer MUST be its own message/);
  assert.match(skill, /Wait for the user's response before continuing/);
});

test('brainstorming resolves reversible details without manufacturing user stops', () => {
  const skill = read('skills/brainstorming/SKILL.md');

  assert.match(skill, /infer and record routine, reversible details/i);
  assert.match(skill, /product intent, safety, scope, or architecture/i);
  assert.doesNotMatch(skill, /frontier is empty AND/);
});

test('writing-plans requires approval, then starts without post-approval prompts', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /wait for explicit approval/i);
  assert.match(skill, /reply \*\*approved\*\*/i);
  assert.match(skill, /last human stop before autonomous execution/i);
  assert.doesNotMatch(skill, /External review before PR\?/i);
  assert.match(skill, /default reviewer choice is `none`/i);
  assert.match(skill, /invoke the execution skill immediately/i);
});

test('plan execution finishes through autonomous mode rather than an options menu', () => {
  const skill = read('skills/executing-plans/SKILL.md');

  assert.doesNotMatch(skill, /present options, execute choice/i);
  assert.match(skill, /Autonomous Mode/);
});

test('worktree setup uses deterministic defaults instead of asking mid-flow', () => {
  const skill = read('skills/using-git-worktrees/SKILL.md');

  assert.doesNotMatch(skill, /Where should I create worktrees/);
  assert.doesNotMatch(skill, /Which would you prefer/);
  assert.doesNotMatch(skill, /ask whether to proceed or investigate/i);
  assert.match(skill, /Default to `.worktrees\/`/);
  assert.match(skill, /do not proceed/i);
});

test('supporting skills route autonomous uncertainty through blocker taxonomy', () => {
  const receivingReview = read('skills/receiving-code-review/SKILL.md');
  const debugging = read('skills/systematic-debugging/SKILL.md');
  const tdd = read('skills/test-driven-development/SKILL.md');

  assert.doesNotMatch(receivingReview, /Should I \[investigate\/ask\/proceed\]\?/);
  assert.doesNotMatch(receivingReview, /Stop and discuss with your human partner first/);
  assert.match(receivingReview, /blocker taxonomy/i);

  assert.doesNotMatch(debugging, /Discuss with your human partner before attempting more fixes/);
  assert.doesNotMatch(debugging, /Ask for help/);
  assert.match(debugging, /blocker taxonomy/i);

  assert.doesNotMatch(tdd, /Exceptions \(ask your human partner\)/);
  assert.doesNotMatch(tdd, /Ask your human partner/);
  assert.doesNotMatch(tdd, /human partner's permission/i);
  assert.match(tdd, /planned exception/i);
});

test('autonomy is goal-independent and recoverable failures exhaust repair paths before stopping', () => {
  const taxonomy = read('skills/using-razorback/references/blocker-taxonomy.md');
  const security = read('skills/security-review/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  assert.match(taxonomy, /with or without a goal runner/i);
  assert.match(security, /diagnose, repair, and rerun/i);
  assert.match(security, /safe, plan-consistent recovery paths are exhausted/i);
  assert.match(finishing, /Do not classify the first failed run as blocker taxonomy #5/i);
  assert.match(finishing, /diagnose, repair, and rerun/i);
});

test('pre-merge review proceeds without allowlist enforcement when no policy exists', () => {
  const security = read('skills/security-review/SKILL.md');
  const preMerge = read('skills/pre-merge-review/SKILL.md');

  assert.match(security, /When no policy block exists, proceed/i);
  assert.match(preMerge, /When no external-model policy block exists, proceed/i);
});

test('subagent execution describes both pre-merge passes without implying a re-review loop', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /one general pass plus one security pass/i);
  assert.doesNotMatch(skill, /Single pass; no round-two review/);
});
