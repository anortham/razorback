import assert from 'node:assert/strict';
import test from 'node:test';
import { read } from './helpers/repo.mjs';

test('isolated workers and publication can proceed without a Goldfish checkpoint', () => {
  for (const path of ['subagent-driven-development/implementer-prompt.md', 'subagent-driven-development/fix-prompt.md']) {
    assert.match(read(`skills/${path}`), /If Goldfish is unavailable, record the decision or failure in your report/i, path);
  }
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  assert.match(finishing, /If Goldfish is unavailable, the report and git state remain sufficient for recovery/);
  assert.doesNotMatch(finishing, /git add <checkpoint-path>/);
});
