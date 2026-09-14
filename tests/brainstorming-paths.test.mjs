import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = fs.readFileSync(path.join(root, 'skills/brainstorming/SKILL.md'), 'utf8');

test('brainstorming defines the three paths: spike, bounded, architectural', () => {
  assert.match(skill, /## Three Paths/);
  assert.match(skill, /\*\*Spike\*\*/);
  assert.match(skill, /\*\*Bounded\*\*/);
  assert.match(skill, /\*\*Architectural\*\*/);
});

test('brainstorming enforces saying classification out loud and one-way ratchet', () => {
  assert.match(skill, /classify the request and say the classification out loud/i);
  assert.match(skill, /When in doubt between two paths, take the heavier one/i);
  assert.match(skill, /one-way ratchet|ratchet is one-way/i);
  assert.match(skill, /hidden complexity discovered mid-task upgrades the path/i);
});

test('bounded path presents short design in chat without requiring plan or spec doc files', () => {
  assert.match(skill, /present a short design in chat/i);
  assert.match(skill, /No spec file, no implementation plan document/i);
  assert.match(skill, /STOP and wait for an explicit yes|STOP and wait/i);
});

test('spike path produces recommendations and pairs with prototyping', () => {
  assert.match(skill, /Report findings as a recommendation/i);
  assert.match(skill, /throwaway/i);
});

test('approval gate holds unconditionally across all paths', () => {
  assert.match(skill, /ceremony scales with the task;\s*the approval gate never does/i);
  assert.match(skill, /Anti-Pattern: "Too Simple To Need Approval"/i);
});
