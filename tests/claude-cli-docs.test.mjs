import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = expectedRoot;

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function commandBlockHasBare(text) {
  return /```bash[\s\S]*?claude -p[\s\S]*?\n\s*--bare \\/.test(text);
}

test('documentation tests read from the checked-out repository', () => {
  assert.equal(root, expectedRoot);
});

test('claude-cli skill says bare mode is not used', () => {
  const skill = read('skills/claude-cli/SKILL.md');

  assert.match(
    skill,
    /Do not use `--bare`[\s\S]*?OAuth[\s\S]*?keychain/i,
  );
  assert.doesNotMatch(
    skill,
    /All invocations use `opus` with `--bare --no-session-persistence`/,
  );
  assert.equal(commandBlockHasBare(skill), false);
});

test('pre-merge claude reviewer prompt keeps auth-compatible defaults', () => {
  const prompt = read('skills/pre-merge-review/reviewer-prompts/claude.md');

  assert.match(prompt, /Do not add `--bare`[\s\S]*?OAuth/i);
  assert.equal(commandBlockHasBare(prompt), false);
});

test('README stops advertising bare mode as the default claude-cli path', () => {
  const readme = read('README.md');

  assert.doesNotMatch(
    readme,
    /\| claude-cli \| Invokes `claude -p` in isolated `--bare` mode/,
  );
  assert.match(readme, /\| claude-cli \| Invokes `claude -p` for second opinions/);
});

const CLAUDE_INVOCATION_DOCS = [
  'skills/claude-cli/SKILL.md',
  'skills/pre-merge-review/SKILL.md',
  'skills/pre-merge-review/reviewer-prompts/claude.md',
];

function bashBlocks(text) {
  return [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
}

test('claude invocation blocks pin the read-only allowlist', () => {
  for (const rel of CLAUDE_INVOCATION_DOCS) {
    for (const block of bashBlocks(read(rel))) {
      if (!block.includes('claude -p') || !block.includes('--tools')) continue;

      assert.match(
        block,
        /--tools "Read,Grep,Glob"/,
        `${rel} has a claude -p block whose --tools value is not the canonical "Read,Grep,Glob" allowlist`,
      );
      assert.doesNotMatch(
        block,
        /--tools "[^"]*Bash[^"]*"/,
        `${rel} allowlists Bash in a claude -p block — an unrestricted Bash tool can write files, so the read-only claim would be prompt-deep only`,
      );
      assert.ok(
        block.includes('--strict-mcp-config'),
        `${rel} has a claude -p --tools block without --strict-mcp-config — MCP servers from user/project settings can carry write-capable tools into the session`,
      );
    }
  }
});

test('Read,Bash appears only in the documented anti-pattern warning', () => {
  for (const rel of ['skills/pre-merge-review/SKILL.md', 'skills/pre-merge-review/reviewer-prompts/claude.md']) {
    assert.doesNotMatch(
      read(rel),
      /Read,Bash/,
      `${rel} names the Read,Bash tool set — the claude reviewer allowlist is "Read,Grep,Glob" (see the validated baseline flags in reviewer-prompts/claude.md)`,
    );
  }

  const lines = read('skills/claude-cli/SKILL.md').split('\n');
  const offenders = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includes('Read,Bash'))
    .filter(({ index }) => !/Do NOT treat/.test(lines.slice(Math.max(0, index - 1), index + 1).join(' ')))
    .map(({ index }) => index + 1);

  assert.deepEqual(
    offenders,
    [],
    'skills/claude-cli/SKILL.md may name Read,Bash only in the "Do NOT treat" anti-pattern warning',
  );
});
