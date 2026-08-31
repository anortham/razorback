import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = join(root, 'skills', 'codex-cli');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function extractConstructionBlock() {
  const lines = read('skills/codex-cli/SKILL.md').split('\n');
  const start = lines.findIndex((line) => line.startsWith('TEMPLATE=$(cat'));

  assert.notEqual(
    start,
    -1,
    'skills/codex-cli/SKILL.md must contain a bash block that builds the adversarial instruction from the template',
  );

  const end = lines.findIndex((line, index) => index > start && line.startsWith('ADVERSARIAL_INSTRUCTION='));
  assert.notEqual(end, -1, 'the construction block must render the adversarial instruction before preparing the review workspace');
  const block = lines.slice(start, end + 1);

  assert.ok(
    block.some((line) => line.startsWith('ADVERSARIAL_INSTRUCTION=')),
    'the construction block must assign ADVERSARIAL_INSTRUCTION',
  );

  return block.join('\n');
}

function runConstruction({ target, diff }) {
  const script = `${extractConstructionBlock()}\nprintf '%s' "$ADVERSARIAL_INSTRUCTION"`;

  return execFileSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      SKILL_DIR: skillDir,
      TARGET: target,
      DIFF: diff,
    },
  });
}

const HOSTILE_TARGET = 'auth & billing (3 files changed)';
const HOSTILE_DIFF = [
  '+if (ready && enabled) {',
  '+  log("\\1 retry & backoff");',
  '+}',
  '+# trailing backslash \\',
  '+# lone ampersand &',
].join('\n');

function expectedPrompt({ target, focus, diff }) {
  const template = readFileSync(join(skillDir, 'adversarial-prompt.txt'), 'utf8')
    .replace(/\n$/, '');

  const [beforeTarget, afterTarget] = splitOnce(template, '{{TARGET_LABEL}}');
  const [beforeFocus, afterFocus] = splitOnce(afterTarget, '{{USER_FOCUS}}');
  const [beforeInput, afterInput] = splitOnce(afterFocus, '{{REVIEW_INPUT}}');

  assert.equal(
    afterInput,
    '',
    'template must end with {{REVIEW_INPUT}}; the construction drops anything after it',
  );

  return beforeTarget + target + beforeFocus + focus + beforeInput + diff;
}

function splitOnce(text, placeholder) {
  const at = text.indexOf(placeholder);
  assert.notEqual(at, -1, `template must contain ${placeholder}`);
  return [text.slice(0, at), text.slice(at + placeholder.length)];
}

test('template declares placeholders in the order the construction splits them', () => {
  const template = readFileSync(join(skillDir, 'adversarial-prompt.txt'), 'utf8');
  const order = [...template.matchAll(/\{\{[A-Z_]+\}\}/g)].map((m) => m[0]);

  assert.deepEqual(order, ['{{TARGET_LABEL}}', '{{USER_FOCUS}}', '{{REVIEW_INPUT}}']);
});

test('construction reproduces target and focus containing && and backslashes byte for byte', () => {
  const actual = runConstruction({ target: HOSTILE_TARGET, diff: HOSTILE_DIFF });

  assert.equal(
    actual,
    expectedPrompt({
      target: HOSTILE_TARGET,
      focus: 'none specified',
      diff: '',
    }),
  );
});

test('construction defaults the focus line when FOCUS is unset', () => {
  const actual = runConstruction({ target: 'x', diff: 'y' });

  assert.match(actual, /^User focus: none specified$/m);
});

test('construction never duplicates a placeholder into the rendered prompt', () => {
  const actual = runConstruction({ target: HOSTILE_TARGET, diff: HOSTILE_DIFF });

  assert.doesNotMatch(actual, /\{\{TARGET_LABEL\}\}/);
  assert.doesNotMatch(actual, /\{\{USER_FOCUS\}\}/);
  assert.doesNotMatch(actual, /\{\{REVIEW_INPUT\}\}/);
});

test('adversarial instruction leaves the hostile diff for bundle transport', () => {
  const actual = runConstruction({ target: HOSTILE_TARGET, diff: HOSTILE_DIFF });

  assert.doesNotMatch(actual, /ready && enabled/);
  assert.doesNotMatch(actual, /trailing backslash/);
});

test('construction does not use pattern substitution with an expanding replacement', () => {
  const block = extractConstructionBlock();

  assert.doesNotMatch(
    block,
    /\$\{[A-Za-z_][A-Za-z_0-9]*\/\//,
    'bash >=5.2 expands & and backslashes in ${var//pat/repl} replacements (patsub_replacement), corrupting diffs',
  );
});
