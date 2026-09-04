import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const VARIANTS = { codex: 'Codex', claude: 'Claude', grok: 'Grok', agy: 'Antigravity' };

const QUARTET_SHARED_SECTIONS = ['OPERATING STANCE', 'FINDING BAR', 'CALIBRATION', 'GROUNDING', 'INPUT TRUST'];

const TRIO_ONLY_SECTIONS = ['ATTACK SURFACE'];

const SHARED_SECTIONS = [...QUARTET_SHARED_SECTIONS, ...TRIO_ONLY_SECTIONS];

const SECURITY_PROMPT = 'skills/security-review/security-adversarial-prompt.txt';

function promptPath(cli) {
  return `skills/${cli}-cli/adversarial-prompt.txt`;
}

function readPrompt(cli) {
  return readFileSync(join(root, promptPath(cli)), 'utf8');
}

function readSecurityPrompt() {
  return readFileSync(join(root, SECURITY_PROMPT), 'utf8');
}

function labeledQuartet() {
  return [
    ...Object.keys(VARIANTS).map((cli) => [promptPath(cli), readPrompt(cli)]),
    [SECURITY_PROMPT, readSecurityPrompt()],
  ];
}

function section(promptText, label, name) {
  const paragraph = promptText.split(/\n\n+/).find((p) => p.startsWith(name));
  assert.ok(paragraph, `${label} is missing the "${name}" section`);
  return paragraph;
}

test('trio keeps shared sections byte-identical', () => {
  const [base, ...others] = Object.keys(VARIANTS);
  for (const name of SHARED_SECTIONS) {
    const expected = section(readPrompt(base), promptPath(base), name);
    for (const cli of others) {
      assert.equal(
        section(readPrompt(cli), promptPath(cli), name),
        expected,
        `${promptPath(cli)} "${name}" drifted from ${promptPath(base)} — claude-cli/SKILL.md requires keeping the three in sync`,
      );
    }
  }
});

test('quartet keeps stance, finding bar, calibration, and grounding byte-identical', () => {
  const [[baseLabel, baseText], ...others] = labeledQuartet();
  for (const name of QUARTET_SHARED_SECTIONS) {
    const expected = section(baseText, baseLabel, name);
    for (const [label, text] of others) {
      assert.equal(
        section(text, label, name),
        expected,
        `${label} "${name}" drifted from ${baseLabel} — this section is shared byte for byte across the trio and ${SECURITY_PROMPT}; re-sync all four files (only ATTACK SURFACE stays trio-only)`,
      );
    }
  }
});

test('the security prompt opens with the pinned neutral sentence', () => {
  assert.equal(
    readSecurityPrompt().split('\n')[0],
    'You are performing an adversarial security review.',
    `${SECURITY_PROMPT} line 1 changed — restore the pinned model-neutral opening so any reviewer CLI can carry the security pass`,
  );
});

test('trio differs on the opening line only by model name', () => {
  for (const [cli, model] of Object.entries(VARIANTS)) {
    assert.equal(
      readPrompt(cli).split('\n')[0],
      `You are ${model} performing an adversarial software review.`,
    );
  }
});

test('quartet declares placeholders in the canonical order', () => {
  for (const [label, text] of labeledQuartet()) {
    const order = [...text.matchAll(/\{\{[A-Z_]+\}\}/g)].map((match) => match[0]);
    assert.deepEqual(
      order,
      ['{{TARGET_LABEL}}', '{{USER_FOCUS}}', '{{REVIEW_INPUT}}'],
      `${label} placeholder order`,
    );
  }
});

test('the section extractor flags a one-character mutation in a quartet-shared section', () => {
  const sample = [
    'You are performing an adversarial security review.',
    '',
    'CALIBRATION:',
    'Prefer one strong finding over several weak ones.',
    '',
    'GROUNDING:',
    'Every finding must be defensible from the provided context.',
  ].join('\n');
  const mutated = sample.replace('strong', 'str0ng');
  assert.notEqual(section(mutated, 'sample', 'CALIBRATION'), section(sample, 'sample', 'CALIBRATION'));
  assert.equal(section(mutated, 'sample', 'GROUNDING'), section(sample, 'sample', 'GROUNDING'));
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
