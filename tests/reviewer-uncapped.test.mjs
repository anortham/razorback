import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REVIEWER_DOCS = [
  'skills/claude-cli/SKILL.md',
  'skills/codex-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/agy-cli/SKILL.md',
  'skills/pre-merge-review/SKILL.md',
  'skills/pre-merge-review/reviewer-prompts/claude.md',
  'skills/pre-merge-review/reviewer-prompts/codex.md',
];

const FAILSAFE_TIMEOUT_DOCS = [
  'skills/claude-cli/SKILL.md',
  'skills/codex-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/agy-cli/SKILL.md',
  'skills/pre-merge-review/reviewer-prompts/claude.md',
  'skills/pre-merge-review/reviewer-prompts/codex.md',
];

const REVIEWER_CLI_SKILLS = [
  'skills/claude-cli/SKILL.md',
  'skills/codex-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/agy-cli/SKILL.md',
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function normalized(text) {
  return text.replace(/\s+/g, ' ');
}

function capOccurrences(text, flag) {
  return text
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text: line }) => new RegExp(`${flag}[= ]+[\\d.]`).test(line));
}

test('no reviewer recipe passes a turn cap', () => {
  for (const rel of REVIEWER_DOCS) {
    assert.deepEqual(
      capOccurrences(read(rel), '--max-turns'),
      [],
      `${rel} passes --max-turns a value — reviewer recipes are uncapped, scope comes from the prompt`,
    );
  }
});

test('no reviewer recipe passes a spend cap', () => {
  for (const rel of REVIEWER_DOCS) {
    assert.deepEqual(
      capOccurrences(read(rel), '--max-budget-usd'),
      [],
      `${rel} passes --max-budget-usd a value — reviewer recipes set no dollar ceiling`,
    );
  }
});

test('the cap scanner distinguishes a passed value from prose naming the flag', () => {
  assert.deepEqual(capOccurrences('  --max-turns 15 \\', '--max-turns'), [{ line: 1, text: '  --max-turns 15 \\' }]);
  assert.deepEqual(capOccurrences('do NOT add `--max-turns` back', '--max-turns'), []);
  assert.deepEqual(capOccurrences('  --max-budget-usd 5.00 \\', '--max-budget-usd'), [
    { line: 1, text: '  --max-budget-usd 5.00 \\' },
  ]);
});

test('every reviewer CLI skill limits the no-caps policy to one invocation', () => {
  for (const rel of REVIEWER_CLI_SKILLS) {
    assert.match(
      read(rel),
      /No per-invocation turn\/spend caps/,
      `${rel} does not limit its no-caps Defaults policy to one reviewer invocation`,
    );
  }
});

test('every reviewer CLI call consumes its caller campaign budget', () => {
  for (const rel of REVIEWER_CLI_SKILLS) {
    const doc = normalized(read(rel));
    assert.match(
      doc,
      /Every CLI call counts once against the caller's campaign `external_invocation_budget`/,
      `${rel} does not count each provider invocation against the caller campaign`,
    );
    assert.match(
      doc,
      /one internally uncapped invocation does not waive the campaign budget/i,
      `${rel} lets an internally uncapped invocation imply an uncapped campaign`,
    );
  }
});

test('every reviewer CLI skill routes repeats and multi-reviewer dispatch through the campaign skill', () => {
  for (const rel of REVIEWER_CLI_SKILLS) {
    assert.match(
      normalized(read(rel)),
      /Before a second review call or any multi-reviewer dispatch[^.]*`razorback:managing-review-campaigns`/,
      `${rel} does not require the canonical campaign policy before repeating or adding reviewers`,
    );
  }
});

test('every reviewer doc frames its timeout as a failsafe, not a budget', () => {
  for (const rel of FAILSAFE_TIMEOUT_DOCS) {
    const doc = read(rel);
    assert.match(
      doc,
      /failsafe/i,
      `${rel} does not call its timeout a failsafe — a timeout presented as a budget invites capping the review`,
    );
    assert.match(
      doc,
      /1800000/,
      `${rel} does not pin the 30-minute failsafe timeout`,
    );
    assert.doesNotMatch(
      doc,
      /\b(600000|1200000)\b/,
      `${rel} still documents a sub-30-minute review timeout — the failsafe is a single flat value`,
    );
  }
});

const RERUN_ESCALATIONS = [
  /rais(e|ing) [^.]*timeout[^.]*re-run/i,
  /split(ting)? the (review|diff)[^.]*(smaller|chunks)/i,
];

function rerunEscalations(text) {
  return text
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text: line }) => !/\bdo not\b|\bdon't\b|\bnever\b/i.test(line))
    .filter(({ text: line }) => RERUN_ESCALATIONS.some((pattern) => pattern.test(line)));
}

test('no reviewer doc tells the lead to re-run a burned attempt', () => {
  for (const rel of REVIEWER_DOCS) {
    assert.deepEqual(
      rerunEscalations(read(rel)),
      [],
      `${rel} tells the lead to retry a dead run — a second full attempt is the runaway, not a long review`,
    );
  }
});

test('the re-run scanner catches the escalation wording it replaced', () => {
  const raiseAndRetry = "- **Timeout** — first raise the Bash tool's timeout parameter and re-run.";
  assert.equal(rerunEscalations(raiseAndRetry).length, 1);

  const splitAndRetry = 'If it still times out, split the review into smaller chunks rather than retrying.';
  assert.equal(rerunEscalations(splitAndRetry).length, 1);

  const prohibition = 'Do NOT raise the timeout and re-run, and do NOT split the diff into smaller chunks.';
  assert.deepEqual(rerunEscalations(prohibition), []);
});
