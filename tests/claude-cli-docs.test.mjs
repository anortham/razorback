import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = '/Users/murphy/source/razorback';

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function commandBlockHasBare(text) {
  return /```bash[\s\S]*?claude -p[\s\S]*?\n\s*--bare \\/.test(text);
}

test('claude-cli skill says bare mode is not used', () => {
  const skill = read('skills/claude-cli/SKILL.md');

  assert.match(
    skill,
    /Do not use `--bare`[\s\S]*?OAuth[\s\S]*?keychain/i,
  );
  assert.doesNotMatch(
    skill,
    /All invocations use `opus` with `--bare --no-session-persistence`/,
  );
  assert.equal(commandBlockHasBare(skill), false);
});

test('pre-merge claude reviewer prompt keeps auth-compatible defaults', () => {
  const prompt = read('skills/pre-merge-review/reviewer-prompts/claude.md');

  assert.match(prompt, /Do not add `--bare`[\s\S]*?OAuth/i);
  assert.equal(commandBlockHasBare(prompt), false);
});

test('README stops advertising bare mode as the default claude-cli path', () => {
  const readme = read('README.md');

  assert.doesNotMatch(
    readme,
    /\| claude-cli \| Invokes `claude -p` in isolated `--bare` mode/,
  );
  assert.match(readme, /\| claude-cli \| Invokes `claude -p` for second opinions/);
});
