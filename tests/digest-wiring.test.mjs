import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const KIT = 'skills/using-razorback/references/digest-kit.md';

const WIRING = [
  {
    file: 'skills/brainstorming/SKILL.md',
    heading: '## After the Design',
    moment: 'the User Review Gate',
  },
  {
    file: 'skills/writing-plans/SKILL.md',
    heading: '## Execution Handoff',
    moment: 'the plan-save announcement',
  },
  {
    file: 'skills/finishing-a-development-branch/SKILL.md',
    heading: '### Step 3: Render morning report',
    moment: 'the morning-report rendering',
  },
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function extractSection(text, heading, file) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  assert.notEqual(
    start,
    -1,
    `${file} lost the region "${heading}" — the digest wiring lives inside it; restore the heading, or move the wiring and update tests/digest-wiring.test.mjs to the new region`
  );
  const level = heading.match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const next = lines[i].match(/^(#+)\s/);
    if (next && next[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

test('the digest kit exists and declares the .digest scope class', () => {
  const kit = read(KIT);

  assert.ok(
    kit.includes('<section class="digest">'),
    `${KIT} no longer wraps digests in <section class="digest"> — the wiring in the three read-moment skills and every generated digest depend on that wrapper`
  );
  assert.ok(
    kit.includes('.digest {'),
    `${KIT} no longer scopes its CSS under .digest — restore the .digest scope class so kit styles cannot leak or collide`
  );
});

for (const { file, heading, moment } of WIRING) {
  test(`${file} wires the digest into ${moment}`, () => {
    const region = extractSection(read(file), heading, file);

    assert.match(
      region,
      /digest-kit\.md/,
      `${file} region "${heading}" no longer references digest-kit.md — ${moment} must define the opt-in .html digest per the kit`
    );

    assert.match(
      region,
      /opt-in/,
      `${file} region "${heading}" no longer marks the digest as opt-in — digests are written only when the user asks, never unprompted`
    );
  });
}
