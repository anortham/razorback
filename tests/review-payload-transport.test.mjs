import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const repositoryRoot = dirname(import.meta.dirname);
const helper = join(repositoryRoot, 'skills/security-review/scripts/prepare-review-artifact');
const redactor = join(repositoryRoot, 'skills/security-review/scripts/redact-outbound');
const testRoot = mkdtempSync(join(tmpdir(), 'review-payload-transport-'));

test.after(() => rmSync(testRoot, { recursive: true, force: true }));

function completeBundle(size) {
  const prefix = [
    'Target: branch feature: 4 files changed, main..HEAD',
    'File stat:',
    '  4 files changed, 200 insertions(+), 20 deletions(-)',
    'Commit log:',
    'abc1234 review transport',
    'Diff:',
    '',
  ].join('\n');
  return `${prefix}${'diff-line\n'.repeat(Math.ceil((size - prefix.length) / 10))}`.slice(0, size);
}

function runHelper(payload, name) {
  const workspace = mkdtempSync(join(testRoot, `${name}-workspace-`));
  const payloadFile = join(testRoot, `${name}.md`);
  writeFileSync(payloadFile, payload, { mode: 0o600 });
  const result = spawnSync(helper, [workspace, payloadFile], {
    encoding: 'utf8',
  });
  return { payloadFile, result, workspace };
}

function redact(payload) {
  const result = spawnSync(redactor, [], { encoding: 'utf8', input: payload });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('large redacted review bundles are stored in the reviewer workspace', () => {
  const payload = completeBundle(276 * 1024);
  const { result, workspace } = runHelper(payload, 'large');

  assert.equal(result.status, 0, result.stderr);
  const artifact = result.stdout.trim();
  assert.ok(artifact, 'large payloads must return an artifact path');
  assert.equal(relative(workspace, artifact).startsWith('..'), false);
  assert.equal(readFileSync(artifact, 'utf8'), payload);
  assert.equal(statSync(artifact).mode & 0o777, 0o600);
  assert.equal(statSync(dirname(artifact)).mode & 0o777, 0o700);
  assert.ok(artifact.length < 4096, 'the artifact path must be safe to put in a prompt');
  const prompt = `Review the complete bundle at ${artifact}. Return only the required completion schema.`;
  assert.ok(Buffer.byteLength(prompt) < 4096, 'large-review prompt must remain bounded');
  assert.doesNotMatch(prompt, /diff-line/);
});

test('small redacted review bundles remain inline and create no artifact', () => {
  const { result, workspace } = runHelper(completeBundle(1024), 'small');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'inline');
  assert.equal(existsSync(join(workspace, '.razorback-review')), false);
});

test('small redacted review bundles require every labelled section', () => {
  const payload = completeBundle(1024).replace('Diff:\n', '');
  const { result, workspace } = runHelper(payload, 'small-missing-section');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing required section: Diff:/i);
  assert.equal(existsSync(join(workspace, '.razorback-review')), false);
});

test('small prompts carry redacted instructions and large wrappers stay static', () => {
  const secretFocus = 'xai-abcdefghijklmnopqrstuvwxyz123456';
  const payload = [
    'Review the complete code-change bundle and return only the required completion schema.',
    `Focus area: ${secretFocus}`,
    '',
    completeBundle(1024),
  ].join('\n');
  const redactedPayload = redact(payload);
  const { result, workspace, payloadFile } = runHelper(redactedPayload, 'instruction');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'inline');
  assert.match(readFileSync(payloadFile, 'utf8'), /Review the complete code-change bundle/);
  assert.match(readFileSync(payloadFile, 'utf8'), /Focus area: <REDACTED>/);
  assert.doesNotMatch(readFileSync(payloadFile, 'utf8'), new RegExp(secretFocus));
  assert.equal(existsSync(join(workspace, '.razorback-review')), false);

  const instructionDocs = [
    'skills/grok-cli/SKILL.md',
    'skills/claude-cli/SKILL.md',
    'skills/codex-cli/SKILL.md',
  ];
  for (const relativePath of instructionDocs) {
    const text = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    assert.match(text, /printf '%s\\n(?:\\n)?' "\$REVIEW_INSTRUCTION"/,
      `${relativePath} must put its review instruction in the redacted payload`);
    assert.match(text, /Focus area: %s\\n.*\$FOCUS|Focus area: %s\\n.*\$USER_FOCUS/s,
      `${relativePath} must put focus text in the redacted payload`);
  }

  const wrapperDocs = [
    ...instructionDocs,
    'skills/pre-merge-review/SKILL.md',
    'skills/pre-merge-review/reviewer-prompts/claude.md',
    'skills/pre-merge-review/reviewer-prompts/codex.md',
  ];
  for (const relativePath of wrapperDocs) {
    const text = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    assert.match(text, /Read and follow the complete redacted review bundle at:/,
      `${relativePath} must use the static large-review wrapper`);
    assert.doesNotMatch(text, /printf[\s\S]{0,300}\$REVIEW_INSTRUCTION[\s\S]{0,120}\$REVIEW_ARTIFACT/,
      `${relativePath} must not interpolate the unredacted instruction into the large wrapper`);
  }
});

test('review artifacts cannot be placed in a workspace with live Git metadata', () => {
  const payload = completeBundle(276 * 1024);
  const { result, workspace, payloadFile } = runHelper(payload, 'git-root');
  writeFileSync(join(workspace, '.git'), 'live metadata marker\n');

  const retry = spawnSync(helper, [workspace, payloadFile], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(retry.status, 0);
  assert.match(retry.stderr, /must not contain \.git/i);
});

test('large review recipes use the shared artifact contract and bounded prompt', () => {
  const docs = [
    'skills/grok-cli/SKILL.md',
    'skills/claude-cli/SKILL.md',
    'skills/codex-cli/SKILL.md',
    'skills/pre-merge-review/SKILL.md',
    'skills/pre-merge-review/reviewer-prompts/claude.md',
    'skills/pre-merge-review/reviewer-prompts/codex.md',
  ];
  for (const relativePath of docs) {
    const text = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    assert.match(text, /prepare-review-artifact/, `${relativePath} must use the shared helper`);
    assert.match(text, /REVIEW_ARTIFACT/, `${relativePath} must name the large-review artifact`);
    assert.match(text, /bounded|concise|small prompt/i, `${relativePath} must keep large prompts bounded`);
  }
});

test('large review prompts point to the artifact instead of reloading its bytes', () => {
  const docs = [
    'skills/grok-cli/SKILL.md',
    'skills/claude-cli/SKILL.md',
    'skills/codex-cli/SKILL.md',
    'skills/pre-merge-review/SKILL.md',
    'skills/pre-merge-review/reviewer-prompts/claude.md',
    'skills/pre-merge-review/reviewer-prompts/codex.md',
  ];
  for (const relativePath of docs) {
    const text = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    assert.match(text, /complete redacted (?:review )?bundle/i, `${relativePath} must document the bundle`);
    assert.match(text, /artifact path|review artifact/i, `${relativePath} must tell the reviewer where the bundle is`);
  }
});
