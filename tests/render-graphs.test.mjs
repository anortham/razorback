import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers/repo.mjs';

const script = read('skills/writing-skills/render-graphs.js');

test('render-graphs.js uses cross-platform execFileSync and does not probe with which', () => {
  assert.match(script, /execFileSync/);
  assert.doesNotMatch(script, /which dot/);
  assert.match(script, /execFileSync\(['"]dot['"],\s*\[\s*['"]-V['"]\s*\]/);
  assert.match(script, /execFileSync\(['"]dot['"],\s*\[\s*['"]-Tsvg['"]\s*\]/);
});
