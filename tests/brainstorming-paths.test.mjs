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

test('brainstorming says the classification out loud and re-classifies in both directions', () => {
  assert.match(skill, /classify the request and say the classification out loud/i);
  assert.match(skill, /hidden complexity discovered mid-task upgrades the path/i);
  assert.match(skill, /simpler than it looked, once you understand it, takes the lighter path/i);
  assert.doesNotMatch(skill, /take the heavier one/i);
  assert.doesNotMatch(skill, /one-way ratchet|ratchet is one-way|Nothing downgrades/i);
});

test('bounded path presents short design in chat and waits only on open choices', () => {
  assert.match(skill, /present a short design in chat/i);
  assert.match(skill, /No spec file, no implementation plan document/i);
  assert.match(skill, /wait for the user's answer on each consequential choice their request did not settle/i);
});

test('spike path produces recommendations and pairs with prototyping', () => {
  assert.match(skill, /Report findings as a recommendation/i);
  assert.match(skill, /throwaway/i);
});

test('clear work proceeds directly while consequential choices still get attention', () => {
  assert.match(skill, /Clear and low-consequence[\s\S]*leave this skill and do the work/);
  assert.match(skill, /A choice the user's request already settles needs no second approval/);
  assert.match(skill, /\*\*Silent consequential choices\.\*\*/);
  assert.match(skill, /Unclear[\s\S]*ask the question that separates them/);
  assert.doesNotMatch(skill, /the approval gate never does/i);
  assert.doesNotMatch(skill, /Too Simple To Need Approval/i);
});
