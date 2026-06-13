import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('cursor-agent skill pins Composer and keeps the lead as reviewer', () => {
  const skill = read('skills/cursor-agent/SKILL.md');

  assert.match(skill, /composer-2\.5-fast/);
  assert.match(skill, /stays the lead/i);
  assert.match(skill, /Cursor Agent is the implementer/i);
  assert.match(skill, /lead reviews/i);
  // Skill is shared across all harnesses; lead must stay harness-neutral.
  assert.doesNotMatch(skill, /\bCodex\b/);
});

test('cursor-agent skill documents bounded implementation commands', () => {
  const skill = read('skills/cursor-agent/SKILL.md');

  assert.match(skill, /cursor-agent -p/);
  assert.match(skill, /--workspace "\$WORKSPACE"/);
  assert.match(skill, /--model composer-2\.5-fast/);
  assert.match(skill, /--trust/);
  assert.match(skill, /--force/);
  assert.match(skill, /no push, no release, no deploy/i);
});

test('cursor-agent skill requires review and fix iterations', () => {
  const skill = read('skills/cursor-agent/SKILL.md');

  assert.match(skill, /Review cap: 3 iterations/i);
  assert.match(skill, /--resume "\$CHAT_ID"/);
  assert.match(skill, /create-chat/);
  assert.match(skill, /fresh Cursor run/i);
  assert.match(skill, /re-review/i);
  // `cursor-agent ls`/`resume` are interactive TUIs and fail headless;
  // the skill must warn against relying on them.
  assert.match(skill, /interactive TUI/i);
});

test('subagent-driven-development points explicit Composer delegation to cursor-agent', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /cursor-agent/);
  // Model pinning lives in cursor-agent/SKILL.md only; neutral skills must not
  // duplicate hard-coded model names.
  assert.doesNotMatch(skill, /composer-2\.5-fast/);
  assert.match(skill, /razorback:cursor-agent/);
});

test('README skill table includes cursor-agent', () => {
  const readme = read('README.md');

  assert.match(readme, /\|\s*cursor-agent\s*\|/);
  assert.match(readme, /Composer 2\.5 Fast/);
});
