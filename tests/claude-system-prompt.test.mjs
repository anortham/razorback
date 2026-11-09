import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeTree } from './helpers/git-fixture.mjs';
import { bashBlocks } from './helpers/markdown.mjs';
import { read, root } from './helpers/repo.mjs';

const script = join(root, 'skills/claude-cli/scripts/render-system-prompt');
const TEMPLATES = [
  'skills/claude-cli/adversarial-prompt.txt',
  'skills/security-review/security-adversarial-prompt.txt',
];
const CLAUDE_SYSTEM_PROMPT_DOCS = [
  'skills/claude-cli/SKILL.md',
  'skills/pre-merge-review/reviewer-prompts/claude.md',
];

function render(templatePath) {
  return spawnSync(process.execPath, [script, templatePath], { encoding: 'utf8' });
}

test('rendered system prompt keeps the stance and leaves no placeholder', () => {
  for (const rel of TEMPLATES) {
    const template = read(rel);
    const result = render(join(root, rel));

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /\{\{[A-Z_]+\}\}/, `${rel} rendered with a placeholder left`);
    assert.match(result.stdout, /^Target: stated in the user message$/m);
    assert.match(result.stdout, /^User focus: stated in the user message$/m);
    assert.match(result.stdout, /REPOSITORY CONTEXT:\nThe user message, or the bundle file that it names, holds the review input\.\n$/);

    const stance = template.slice(template.indexOf('OPERATING STANCE:'), template.indexOf('REPOSITORY CONTEXT:'));
    assert.ok(result.stdout.includes(stance), `${rel} lost stance text in the render`);
  }
});

test('render refuses a template that lacks a placeholder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'razorback-system-prompt-'));
  try {
    const template = join(dir, 'template.txt');
    writeFileSync(template, 'Target: {{TARGET_LABEL}}\nUser focus: {{USER_FOCUS}}\n');

    const result = render(template);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /REVIEW_INPUT/);
  } finally {
    removeTree(dir);
  }
});

test('claude recipes pass a rendered system prompt, never the raw template', () => {
  for (const rel of CLAUDE_SYSTEM_PROMPT_DOCS) {
    const blocks = bashBlocks(read(rel));
    const flags = blocks.flatMap((block) => [...block.matchAll(/--system-prompt-file (\S+)/g)].map((match) => match[1]));

    assert.ok(flags.length > 0, `${rel} should pass --system-prompt-file`);
    for (const value of flags) {
      assert.equal(value, '"$SYSTEM_PROMPT_FILE"', `${rel} passes ${value}`);
    }
    assert.ok(
      blocks.some((block) => /scripts\/render-system-prompt" "[^"]+" > "\$SYSTEM_PROMPT_FILE"/.test(block)),
      `${rel} should render the template into $SYSTEM_PROMPT_FILE`,
    );
  }
});
