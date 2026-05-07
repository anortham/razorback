import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const CANONICAL_QUESTIONS = [
  'Does this keep complexity local?',
  'Is the caller-facing interface smaller than the behavior it unlocks?',
  'Are tests written through the same interface callers use?',
  'Did new seams earn their keep?',
  'Did this avoid speculative extensibility?',
  'Did it fix the structural cause, not only the symptom?',
];

const ENFORCEMENT_POINTS = [
  'skills/architecture-quality/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'skills/subagent-driven-development/implementer-prompt.md',
  'skills/requesting-code-review/code-reviewer.md',
];

test('architecture-quality SKILL.md is the canonical source of the checklist', () => {
  const skill = read('skills/architecture-quality/SKILL.md');
  assert.match(skill, /## Review Checklist/);

  for (const question of CANONICAL_QUESTIONS) {
    assert.ok(
      skill.includes(question),
      `architecture-quality/SKILL.md is missing canonical question: ${question}`,
    );
  }
});

for (const filePath of ENFORCEMENT_POINTS) {
  test(`${filePath} contains all six canonical checklist questions verbatim`, () => {
    const content = read(filePath);
    for (const question of CANONICAL_QUESTIONS) {
      assert.ok(
        content.includes(question),
        `${filePath} is missing canonical checklist question: ${question}`,
      );
    }
  });
}
