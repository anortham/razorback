import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('agy-cli documents agy models pre-flight check without discarding stderr', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /agy models/);
  assert.doesNotMatch(skill, /agy models 2>\s*\/dev\/null/);
});

test('agy-cli documents dangerously-skip-permissions for headless runs', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /--dangerously-skip-permissions/);
  assert.match(skill, /auto-approve/i);
  assert.match(skill, /auto-denied|permission/i);
});

test('agy-cli documents sandbox profile for read-only reviews', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /--sandbox/);
  assert.match(skill, /terminal restrictions/i);
});

test('agy-cli documents disable-slash-commands in print mode', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /--disable-slash-commands/);
  assert.match(skill, /slash command/i);
});

test('agy-cli documents schema sanitization for Gemini API compatibility', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /del\(\."\$schema"\)/);
  assert.match(skill, /review_completed/);
  assert.match(skill, /boolean/);
});

test('agy-cli documents piping prompt from file without -p', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /flag needs an argument: -p/);
  assert.match(skill, /< "\$REVIEW_PROMPT_FILE"/);
  assert.match(skill, /omit `-p`/i);
});

test('agy-cli documents session resumption with -c and --conversation', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /agy -c/);
  assert.match(skill, /--conversation/);
});

test('agy-cli defines the Google provider for policy check', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /Provider for this skill: `google`/);
});

test('agy-cli passes --print-timeout 30m on review invocation', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /--print-timeout 30m/);
  assert.match(skill, /5m0s/);
});

test('agy-cli cleans up raw PAYLOAD_FILE before artifact preparation', () => {
  const skill = read('skills/agy-cli/SKILL.md');
  assert.match(skill, /echo "outbound redaction failed" >&2\s+exit 1\s+fi\s+rm -f -- "\$PAYLOAD_FILE"/);
});

