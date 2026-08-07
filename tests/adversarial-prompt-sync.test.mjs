import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const VARIANTS = { codex: 'Codex', claude: 'Claude', grok: 'Grok' };

const SHARED_SECTIONS = ['OPERATING STANCE', 'ATTACK SURFACE', 'FINDING BAR', 'CALIBRATION', 'GROUNDING'];

function readPrompt(cli) {
  return readFileSync(join(root, 'skills', `${cli}-cli`, 'adversarial-prompt.txt'), 'utf8');
}

function section(promptText, cli, name) {
  const paragraph = promptText.split(/\n\n+/).find((p) => p.startsWith(name));
  assert.ok(paragraph, `${cli}-cli adversarial-prompt.txt is missing the "${name}" section`);
  return paragraph;
}

test('trio keeps shared sections byte-identical', () => {
  const [base, ...others] = Object.keys(VARIANTS);
  for (const name of SHARED_SECTIONS) {
    const expected = section(readPrompt(base), base, name);
    for (const cli of others) {
      assert.equal(
        section(readPrompt(cli), cli, name),
        expected,
        `${cli}-cli adversarial-prompt.txt "${name}" drifted from ${base}-cli — claude-cli/SKILL.md requires keeping the three in sync`,
      );
    }
  }
});

test('trio differs on the opening line only by model name', () => {
  for (const [cli, model] of Object.entries(VARIANTS)) {
    assert.equal(
      readPrompt(cli).split('\n')[0],
      `You are ${model} performing an adversarial software review.`,
    );
  }
});

test('trio declares placeholders in the canonical order', () => {
  for (const cli of Object.keys(VARIANTS)) {
    const order = [...readPrompt(cli).matchAll(/\{\{[A-Z_]+\}\}/g)].map((match) => match[0]);
    assert.deepEqual(
      order,
      ['{{TARGET_LABEL}}', '{{USER_FOCUS}}', '{{REVIEW_INPUT}}'],
      `${cli}-cli placeholder order`,
    );
  }
});

test('claude prompt instructs only allowlisted tools', () => {
  const prompt = readPrompt('claude');
  const flattened = prompt.replace(/\s+/g, ' ');

  assert.doesNotMatch(
    prompt,
    /\bBash\b/,
    'claude-cli/adversarial-prompt.txt names Bash, but the claude reviewer allowlist is --tools "Read,Grep,Glob" — the prompt must not instruct a tool the CLI blocks',
  );
  assert.ok(
    flattened.includes('Investigate read-only with the Read, Grep, and Glob tools. Do not modify files.'),
    'claude adversarial prompt must carry the canonical read-only tool sentence',
  );
});
