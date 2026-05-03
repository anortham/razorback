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
  const gemini = read('skills/gemini-cli/SKILL.md');

  assert.doesNotMatch(receivingReview, /Should I \[investigate\/ask\/proceed\]\?/);
  assert.doesNotMatch(receivingReview, /Stop and discuss with your human partner first/);
  assert.match(receivingReview, /blocker taxonomy/i);

  assert.doesNotMatch(debugging, /Discuss with your human partner before attempting more fixes/);
  assert.doesNotMatch(debugging, /Ask for help/);
  assert.match(debugging, /blocker taxonomy/i);

  assert.doesNotMatch(tdd, /Exceptions \(ask your human partner\)/);
  assert.doesNotMatch(tdd, /Ask your human partner/);
  assert.match(tdd, /planned exception/i);

  assert.doesNotMatch(gemini, /ask the user what to do/i);
  assert.match(gemini, /blocker taxonomy/i);
});
