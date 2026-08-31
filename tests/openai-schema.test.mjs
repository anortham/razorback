import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'skills/codex-cli/scripts/openai-schema');
const canonical = path.join(root, 'skills/codex-cli/schemas/review-output.schema.json');

const REJECTED_BY_OPENAI = [
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'patternProperties',
  'propertyNames',
];

const run = (...args) => spawnSync(script, args, { encoding: 'utf8' });

function keysIn(value, found = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => keysIn(item, found));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      keysIn(child, found);
    }
  }
  return found;
}

test('the canonical schema still declares the strict constraints', () => {
  const keys = keysIn(JSON.parse(fs.readFileSync(canonical, 'utf8')));

  assert.ok(keys.has('uniqueItems'), 'the canonical schema keeps its full expressiveness');
  assert.ok(keys.has('minItems'));
});

test('strips every keyword OpenAI structured outputs rejects', () => {
  const result = run();

  assert.equal(result.status, 0, result.stderr);
  const keys = keysIn(JSON.parse(result.stdout));
  for (const keyword of [...REJECTED_BY_OPENAI, '$schema']) {
    assert.ok(!keys.has(keyword), `sanitized schema still carries ${keyword}`);
  }
});

test('keeps the shape codex needs to produce a valid review', () => {
  const schema = JSON.parse(run().stdout);

  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    schema.required,
    JSON.parse(fs.readFileSync(canonical, 'utf8')).required,
    'required fields must survive sanitizing — they are what the validator checks',
  );
  assert.deepEqual(schema.properties.verdict.enum, ['approve', 'needs-attention']);
  assert.deepEqual(schema.properties.review_completed.enum, [true]);
  assert.equal(schema.properties.files_inspected.items.type, 'string');
  assert.equal(schema.properties.findings.items.additionalProperties, false);
});

test('rejects a missing schema file instead of emitting a partial one', () => {
  const result = run(path.join(root, 'no-such-schema.json'));

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
});

test('no skill hands codex the canonical schema file directly', () => {
  const callers = [
    'skills/codex-cli/SKILL.md',
    'skills/pre-merge-review/reviewer-prompts/codex.md',
  ];

  for (const rel of callers) {
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const line of source.split('\n')) {
      if (!line.includes('--output-schema')) continue;
      assert.ok(
        !line.includes('review-output.schema.json'),
        `${rel} passes the canonical schema to --output-schema; OpenAI rejects it with HTTP 400. Sanitize it with openai-schema first.\n  ${line.trim()}`,
      );
    }
  }
});
