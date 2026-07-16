import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const SKILL_DIR = 'skills/pre-merge-review';

const REVIEWER_PROMPTS = [
  `${SKILL_DIR}/reviewer-prompts/codex.md`,
  `${SKILL_DIR}/reviewer-prompts/claude.md`,
];

const ANCHORS = {
  SKILL_DIR,
  REVIEWER_PROMPTS_DIR: `${SKILL_DIR}/reviewer-prompts`,
};

const PATH_EXPRESSION = new RegExp(
  String.raw`\$(?:\{)?(${Object.keys(ANCHORS).join('|')})(?:\})?((?:\/[^\s"'\`)\]]+)+)`,
  'g',
);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function pathExpressions(source) {
  return [...source.matchAll(PATH_EXPRESSION)].map((match) => ({
    expression: match[0],
    resolved: path.join(ANCHORS[match[1]], match[2].replace(/[.,;:]+$/, '')),
  }));
}

for (const rel of REVIEWER_PROMPTS) {
  test(`${rel} anchors asset paths on a variable the skill actually defines`, () => {
    assert.doesNotMatch(
      read(rel),
      /RAZORBACK_DIR/,
      `${rel} still anchors on $RAZORBACK_DIR, which nothing defines — paths resolve to / and abort under set -u`,
    );
  });

  test(`${rel} references only assets that exist`, () => {
    const expressions = pathExpressions(read(rel));

    assert.ok(
      expressions.length > 0,
      `${rel} has no $SKILL_DIR/… asset references — the extraction regex or the file's anchor convention changed`,
    );

    for (const { expression, resolved } of expressions) {
      assert.ok(
        fs.existsSync(path.join(root, resolved)),
        `${rel} references ${expression}, which resolves to ${resolved} — no such file`,
      );
    }
  });
}

test('reviewer prompts define their anchor before using it', () => {
  for (const rel of REVIEWER_PROMPTS) {
    const source = read(rel);
    const used = new Set(pathExpressions(source).map(({ expression }) => expression.match(/\$(?:\{)?(\w+)/)[1]));

    for (const anchor of used) {
      if (anchor === 'SKILL_DIR') {
        assert.match(
          source,
          /\$SKILL_DIR[^\n]*base directory/,
          `${rel} uses $SKILL_DIR without stating it is the skill's base directory, announced when the skill loads`,
        );
      } else {
        assert.match(
          source,
          new RegExp(String.raw`${anchor}="\$SKILL_DIR`),
          `${rel} uses $${anchor} without deriving it from $SKILL_DIR`,
        );
      }
    }
  }
});
