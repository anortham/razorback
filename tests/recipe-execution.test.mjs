import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DELEGATION_SKILLS = [
  'skills/claude-cli/SKILL.md',
  'skills/codex-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/cursor-agent/SKILL.md',
  'skills/agy-cli/SKILL.md',
];

const HEADING = '## Running These Recipes';

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const section = (source) => {
  const start = source.indexOf(HEADING);
  if (start < 0) return null;
  const next = source.indexOf('\n## ', start + HEADING.length);
  return source.slice(start, next < 0 ? source.length : next).trimEnd();
};

for (const rel of DELEGATION_SKILLS) {
  test(`${rel} defines SKILL_DIR before the first recipe uses it`, () => {
    const source = read(rel);
    const heading = source.indexOf(HEADING);
    assert.ok(heading >= 0, `${rel} is missing the "${HEADING}" section`);

    const firstUse = source.indexOf('$SKILL_DIR');
    assert.ok(firstUse >= 0, `${rel} never uses $SKILL_DIR`);
    assert.ok(
      heading < firstUse,
      `${rel} uses $SKILL_DIR at offset ${firstUse} before defining it at ${heading}`,
    );
  });

  test(`${rel} requires one shell invocation per recipe`, () => {
    const body = section(read(rel));
    assert.match(body, /ONE shell invocation/);
    assert.match(body, /do not\s+survive between harness tool calls/);
    assert.match(body, /^set -u$/m);
  });
}

test('every delegation skill carries the identical execution preamble', () => {
  const [first, ...rest] = DELEGATION_SKILLS.map((rel) => [rel, section(read(rel))]);
  for (const [rel, body] of rest) {
    assert.equal(
      body,
      first[1],
      `${rel} drifted from the preamble in ${first[0]} — keep the copies byte-identical`,
    );
  }
});
