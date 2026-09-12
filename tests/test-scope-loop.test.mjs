import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

test('systematic-debugging owns the after-failure loop: ids first, wide command once', () => {
  const skill = read('skills/systematic-debugging/SKILL.md');

  assert.match(skill, /capture its full output to a file on the first run/);
  assert.match(skill, /reproduce with those ids only through the project runner's own filter/);
  assert.match(skill, /Never rerun the wide command to re-read output or to find the next failure/);
  assert.match(skill, /rerun only the failing test ids until they pass, then the affected scope once/);
  assert.match(skill, /rerun that command once, on the changed tree, after every listed id passes/);
  assert.match(skill, /Rerun the suite to see what is still failing/);
  assert.match(skill, /The wide test command ran at most twice/);
});

test('the toolchain floor forbids reruns on an unchanged tree and names the failing-id loop', () => {
  for (const relativePath of [
    'skills/using-razorback/SKILL.md',
    'skills/using-razorback/references/instruction-tier.md',
    'skills/using-razorback/references/subagent-toolchain.md',
  ]) {
    const text = read(relativePath);
    assert.match(text, /Do not rerun any scope on an unchanged tree/, relativePath);
    assert.match(text, /capture a wide run's output to a file/, relativePath);
    assert.match(text, /rerun only the failing test ids/, relativePath);
  }
});

test('failure points in the execution skills point at the loop instead of the wide command', () => {
  const tdd = read('skills/test-driven-development/SKILL.md');
  assert.match(tdd, /Run only the new test: the project runner narrowed with its own filter/);
  assert.match(tdd, /run the assigned worker scope once on the final tree/);
  assert.match(tdd, /rerun only the failing test ids until they pass, then the scope once more/);
  assert.doesNotMatch(tdd, /Run the project-defined worker-scope command/);

  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  assert.match(finishing, /rerun the failed scope once when every id passes, not after each repair/);
  assert.match(finishing, /after the last landing, rerun Step 1 once/);

  const verification = read('skills/verification-before-completion/SKILL.md');
  assert.match(verification, /The gate applies to the claim, not to each edit/);
  assert.match(verification, /A rerun on an unchanged tree is not fresh evidence/);

  const quickFix = read('skills/fixing-small-issues/SKILL.md');
  assert.match(quickFix, /A failing test iterates on its own id until it passes; the impacted set runs once after/);

  const implementer = read('skills/subagent-driven-development/implementer-prompt.md');
  assert.match(implementer, /Worker red\/green scope \(per change\)/);
  assert.match(implementer, /Worker ceiling \(once, on the final tree\)/);
  assert.match(implementer, /rerun only the failing test ids until they pass, then the\s+assigned scope once/);
  assert.doesNotMatch(implementer, /never\s+invent runner commands/);

  const fix = read('skills/subagent-driven-development/fix-prompt.md');
  assert.match(fix, /Verify each fix with its covering test/);

  const preMergeFix = read('skills/pre-merge-review/fix-dispatch-prompt.md');
  assert.match(preMergeFix, /Iterate on that\s+test alone through the runner's own filter until it passes/);
  assert.match(preMergeFix, /run the assigned verification scope from the plan once/);
});

test('no skill bakes a runner into the after-failure examples', () => {
  const tracing = read('skills/systematic-debugging/root-cause-tracing.md');
  assert.doesNotMatch(tracing, /npm test/);
  assert.match(tracing, /<failing-test command>/);
});
