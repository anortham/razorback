import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const skillDir = join(root, 'skills', 'report-issue');
const skill = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');

test('report-issue files only against the razorback repository', () => {
  const repos = [...skill.matchAll(/--repo (\S+)/g)].map((match) => match[1]);
  assert.ok(repos.length > 0);
  assert.deepEqual([...new Set(repos)], ['anortham/razorback']);
  assert.match(skill, /https:\/\/github\.com\/anortham\/razorback\/issues\/new/);
});

test('report-issue redaction helper path resolves from the skill directory', () => {
  const [, relative] = skill.match(/"\$SKILL_DIR\/([^"]+redact-outbound)"/);
  assert.ok(existsSync(join(skillDir, relative)), relative);
});

test('report-issue submits only the redacted, user-approved body', () => {
  assert.match(skill, /--body-file <scratch>\/razorback-issue\.redacted\.md/);
  assert.match(skill, /Wait for the answer/);
  assert.match(skill, /Do not submit the unredacted file/);
});

test('report-issue reads the version from every plugin-tier manifest', () => {
  for (const manifest of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'package.json']) {
    assert.ok(skill.includes(`"$ROOT/${manifest}"`), manifest);
    assert.ok(existsSync(join(root, manifest)), manifest);
  }
});
