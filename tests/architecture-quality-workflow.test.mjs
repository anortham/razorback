import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relPath) {
  return readFileSync(resolve(root, relPath), 'utf8');
}

function expectSnippets(filePath, snippets) {
  const content = read(filePath);
  for (const snippet of snippets) {
    assert.ok(
      content.includes(snippet),
      `${filePath} is missing required text: ${snippet}`,
    );
  }
}

test('brainstorming skill includes architecture-quality gate', () => {
  const content = read('skills/brainstorming/SKILL.md');
  expectSnippets('skills/brainstorming/SKILL.md', [
    'razorback:architecture-quality',
    'non-trivial',
    'No Architecture Impact',
    'before presenting the design',
  ]);
  assert.ok(
    content.indexOf('Propose 2-3 approaches') <
      content.indexOf('Run `razorback:architecture-quality`'),
    'brainstorming should assess architecture after requirements and approaches are clear',
  );
});

test('writing-plans skill records architecture output in non-mechanical plans', () => {
  expectSnippets('skills/writing-plans/SKILL.md', [
    'Architecture Quality',
    'Non-mechanical',
    'approved module/interface shape',
    'architecture risk',
    'plan mismatch',
  ]);
});

test('subagent-driven-development enforces approved architecture during dispatch and review', () => {
  expectSnippets('skills/subagent-driven-development/SKILL.md', [
    'architecture-quality',
    'approved architecture',
    'plan mismatch',
    'Does this keep complexity local?',
    'same interface callers use',
    'speculative extensibility',
  ]);
});

test('implementer prompt preserves architecture shape and reports plan mismatch', () => {
  expectSnippets('skills/subagent-driven-development/implementer-prompt.md', [
    'approved module/interface shape',
    'Do not redesign locally',
    'report a plan mismatch',
    'Does this keep complexity local?',
    'same interface callers use',
    'speculative extensibility',
  ]);
});

test('fix prompt emphasizes the structural cause and test discipline', () => {
  expectSnippets('skills/subagent-driven-development/fix-prompt.md', [
    'Fix the structural cause',
    'Do not weaken tests',
  ]);
});

test('executing-plans preserves approved architecture in autonomous execution', () => {
  expectSnippets('skills/executing-plans/SKILL.md', [
    'approved architecture',
    'architecture-quality',
    'plan mismatch',
    'Candidate Mode',
  ]);
});
