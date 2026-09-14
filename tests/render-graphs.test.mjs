import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = fs.readFileSync(path.join(root, 'skills/writing-skills/render-graphs.js'), 'utf8');

test('render-graphs.js uses cross-platform execFileSync and does not probe with which', () => {
  assert.match(script, /execFileSync/);
  assert.doesNotMatch(script, /which dot/);
  assert.match(script, /execFileSync\(['"]dot['"],\s*\[\s*['"]-V['"]\s*\]/);
  assert.match(script, /execFileSync\(['"]dot['"],\s*\[\s*['"]-Tsvg['"]\s*\]/);
});
