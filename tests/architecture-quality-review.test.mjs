import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('requesting-code-review exposes architecture-quality enforcement', () => {
  const skill = read('skills/requesting-code-review/SKILL.md');

  assert.match(skill, /architecture-quality/);
  assert.match(skill, /repeated findings/);
  assert.match(skill, /Candidate Mode/);
  assert.match(skill, /approved architecture/);
});

test('requesting-code-review delegates planned pre-merge external review to pre-merge-review', () => {
  const skill = read('skills/requesting-code-review/SKILL.md');

  assert.match(skill, /standalone review is for ad-hoc or baseline review/i);
  assert.match(skill, /planned pre-merge external review/i);
  assert.match(skill, /razorback:pre-merge-review/);
});

test('requesting-code-review checklist includes compact architecture checks', () => {
  const reviewer = read('skills/requesting-code-review/code-reviewer.md');

  assert.match(reviewer, /Does this keep complexity local\?/);
  assert.match(reviewer, /same interface callers use/);
  assert.match(reviewer, /speculative extensibility/);
});

test('code-reviewer agent keeps architecture review concrete', () => {
  const agent = read('agents/code-reviewer.md');

  assert.match(agent, /caller-facing interface/);
  assert.match(agent, /test surface/);
  assert.match(agent, /architecture drift/);
  assert.match(agent, /repeated findings/);
});

test('receiving-code-review routes architecture feedback through architecture-quality', () => {
  const skill = read('skills/receiving-code-review/SKILL.md');

  assert.match(
    skill,
    /external architecture feedback is evaluated through `(?:razorback:)?architecture-quality` before implementation/i,
  );
});

test('receiving-code-review distinguishes unclear human direction from autonomous external review findings', () => {
  const skill = read('skills/receiving-code-review/SKILL.md');

  assert.match(skill, /Unclear human direction blocks implementation/i);
  assert.match(skill, /Unclear external-review items during an approved autonomous run/i);
  assert.match(skill, /flag the\s+unclear item for review and continue/i);
});

test('test-driven-development keeps the interface as the test surface', () => {
  const skill = read('skills/test-driven-development/SKILL.md');

  assert.match(skill, /The interface is the test surface/);
});

test('verification-before-completion requires evidence for architecture and review fixes', () => {
  const skill = read('skills/verification-before-completion/SKILL.md');

  assert.match(skill, /architecture decision followed/i);
  assert.match(skill, /requirements met/i);
  assert.match(skill, /review finding fixed/i);
});

test('subagent-driven-development gives the lead architecture-quality enforcement duties', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  assert.match(skill, /approved architecture/);
  assert.match(skill, /reject worker-local redesigns/);
});

test('README skill table includes architecture-quality', () => {
  const readme = read('README.md');

  assert.match(readme, /\|\s*architecture-quality\s*\|/);
});
