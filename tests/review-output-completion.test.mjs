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

test('accepts a complete Antigravity envelope and normalizes structured output', () => {
  const result = runValidator(
    {
      conversation_id: '12345678-1234-1234-1234-123456789abc',
      status: 'SUCCESS',
      response: 'Review completed.\n',
      duration_seconds: 2.5,
      num_turns: 1,
      structured_output: completeReview,
      usage: { input_tokens: 12, output_tokens: 34 },
    },
    'agy-complete.json',
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
  assert.equal(schema.properties.review_completed.type, 'boolean');
  assert.deepEqual(schema.properties.review_completed.enum, [true]);
  assert.equal(schema.properties.review_completed.const, undefined);
  assert.equal(schema.allOf, undefined);
  assert.equal(schema.properties.files_inspected.minItems, 1);
  assert.equal(schema.properties.files_inspected.uniqueItems, true);
  assert.equal(schema.properties.commands_run.type, 'array');
  assert.equal(schema.properties.evidence.minItems, 1);
});

test('accepts the final turn when the envelope text holds several turns', () => {
  const planning = {
    ...completeReview,
    verdict: 'needs-attention',
    summary: 'I will read the review bundle and inspect the code.',
    findings: [],
    next_steps: ['Read the review bundle'],
  };
  const text = `${JSON.stringify(planning)}${JSON.stringify(completeReview)}`;

  const result = runValidator({ text }, 'multi-turn-text.json');

  assert.equal(result.status, 0, result.diagnostic);
  assert.deepEqual(JSON.parse(result.stdout), completeReview);
});

test('rejects a multi-turn envelope whose final turn is still incomplete', () => {
  const planning = {
    ...completeReview,
    verdict: 'needs-attention',
    summary: 'I will keep reading the bundle.',
    findings: [],
    next_steps: ['Read the rest'],
  };
  const text = `${JSON.stringify(completeReview)}${JSON.stringify(planning)}`;

  const result = runValidator({ text }, 'multi-turn-unfinished.json');

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
});

test('rejects a review that cites only the razorback review bundle', () => {
  const bundleOnly = {
    ...completeReview,
    files_inspected: ['/tmp/razorback-review-tree.AbC123/.razorback-review/review-input.md'],
    evidence: [
      {
        file: '/tmp/razorback-review-tree.AbC123/.razorback-review/review-input.md',
        line_start: 1,
        line_end: 1,
        observation: 'Starting review bundle read',
      },
    ],
  };

  const result = runValidator(bundleOnly, 'bundle-only.json');

  assert.notEqual(result.status, 0);
  assert.match(result.diagnostic, /only the review bundle/);
  assert.equal(result.stdout, '');
});

test('accepts a review that reads the bundle and also cites reviewed files', () => {
  const bundlePlusCode = {
    ...completeReview,
    files_inspected: [
      '/tmp/razorback-review-tree.AbC123/.razorback-review/review-input.md',
      'src/cart.js',
    ],
    evidence: [
      {
        file: '/tmp/razorback-review-tree.AbC123/.razorback-review/review-input.md',
        line_start: 1,
        line_end: 1,
        observation: 'Read the bundle to find the review scope.',
      },
      {
        file: 'src/cart.js',
        line_start: 3,
        line_end: 5,
        observation: 'The loop runs past the final index.',
      },
    ],
  };

  const result = runValidator(bundlePlusCode, 'bundle-plus-code.json');

  assert.equal(result.status, 0, result.diagnostic);
});
