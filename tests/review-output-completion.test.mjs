import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const validator = join(root, 'skills/codex-cli/scripts/validate-review-output');
const testRoot = mkdtempSync(join(tmpdir(), 'review-output-completion-'));

test.after(() => rmSync(testRoot, { recursive: true, force: true }));

function runValidator(value, name) {
  const resultFile = join(testRoot, name);
  writeFileSync(resultFile, JSON.stringify(value));
  const result = spawnSync(validator, [resultFile], { encoding: 'utf8' });
  return { ...result, diagnostic: result.stderr || result.error?.message || '' };
}

const completeReview = {
  verdict: 'approve',
  summary: 'The complete diff is safe to ship.',
  findings: [],
  next_steps: [],
  review_completed: true,
  files_inspected: ['src/feature.js', 'tests/feature.test.js'],
  commands_run: [],
  evidence: [
    {
      file: 'src/feature.js',
      line_start: 1,
      line_end: 8,
      observation: 'The changed branch returns the validated value.',
    },
  ],
};

test('accepts a complete direct review and writes the normalized object', () => {
  const result = runValidator(completeReview, 'complete.json');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), completeReview);
});

test('accepts a complete Grok envelope and normalizes structured output', () => {
  const result = runValidator(
    {
      type: 'result',
      structuredOutput: completeReview,
      text: JSON.stringify(completeReview),
      usage: { input_tokens: 12, output_tokens: 34 },
    },
    'grok-complete.json',
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), completeReview);
});

test('rejects contradictory structured output and text without partial output', () => {
  const result = runValidator(
    {
      type: 'result',
      structuredOutput: completeReview,
      text: JSON.stringify({ ...completeReview, summary: 'A different result.' }),
    },
    'contradictory.json',
  );

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /review output rejected/i);
  assert.equal(result.stdout, '');
});

test('rejects a placeholder response without completion evidence', () => {
  const result = runValidator(
    {
      type: 'result',
      structuredOutput: {
        verdict: 'approve',
        summary: 'I will inspect the diff next.',
        findings: [],
        next_steps: ['Inspect the diff.'],
        review_completed: false,
        files_inspected: [],
        commands_run: [],
        evidence: [],
      },
    },
    'placeholder.json',
  );

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /review output rejected/i);
  assert.equal(result.stdout, '');
});

test('rejects a malformed envelope without partial output', () => {
  const result = runValidator(
    { type: 'result', structuredOutput: 'not an object' },
    'malformed-envelope.json',
  );

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /review output rejected/i);
  assert.equal(result.stdout, '');
});

test('rejects malformed text without partial output', () => {
  const result = runValidator(
    { type: 'result', text: '{"verdict":"approve"' },
    'malformed-text.json',
  );

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /review output rejected/i);
  assert.equal(result.stdout, '');
});

test('rejects needs-attention when findings are empty', () => {
  const result = runValidator(
    {
      verdict: 'needs-attention',
      summary: 'A review finding is required for this verdict.',
      findings: [],
      next_steps: [],
      review_completed: true,
      files_inspected: ['src/feature.js'],
      commands_run: [],
      evidence: [
        {
          file: 'src/feature.js',
          line_start: 1,
          line_end: 1,
          observation: 'The branch was inspected.',
        },
      ],
    },
    'empty-findings.json',
  );

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /review output rejected/i);
  assert.equal(result.stdout, '');
});

test('rejects empty or duplicate inspected-file and evidence lists', () => {
  const emptyFiles = runValidator(
    { ...completeReview, files_inspected: [] },
    'empty-files.json',
  );
  const duplicateFiles = runValidator(
    { ...completeReview, files_inspected: ['src/feature.js', 'src/feature.js'] },
    'duplicate-files.json',
  );
  const emptyEvidence = runValidator(
    { ...completeReview, evidence: [] },
    'empty-evidence.json',
  );

  for (const result of [emptyFiles, duplicateFiles, emptyEvidence]) {
    assert.notEqual(result.status, 0);
    assert.match(result.diagnostic, /review output rejected/i);
    assert.equal(result.stdout, '');
  }
});

test('schema declares completion evidence as required', () => {
  const schema = JSON.parse(
    readFileSync(join(root, 'skills/codex-cli/schemas/review-output.schema.json'), 'utf8'),
  );

  for (const property of ['review_completed', 'files_inspected', 'commands_run', 'evidence']) {
    assert.ok(schema.required.includes(property), `${property} must be required`);
  }
  assert.equal(schema.properties.review_completed.const, true);
  assert.equal(schema.properties.files_inspected.minItems, 1);
  assert.equal(schema.properties.files_inspected.uniqueItems, true);
  assert.equal(schema.properties.commands_run.type, 'array');
  assert.equal(schema.properties.evidence.minItems, 1);
});
