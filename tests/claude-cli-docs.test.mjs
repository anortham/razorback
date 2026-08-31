import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('pre-merge claude reviewer invocation enables the verified safe mode', () => {
  const prompt = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const blocks = bashBlocks(prompt).filter((block) => block.includes('claude -p'));

  assert.ok(blocks.length > 0, 'pre-merge claude prompt should document a claude invocation');
  for (const block of blocks) {
    assert.match(block, /--safe-mode/, 'pre-merge claude must use the verified safe-mode combination');
  }
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

function nonCanonicalToolsOccurrences(text) {
  const lines = text.split('\n');
  const occurrences = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/--tools "([^"]+)"/g)) {
      if (match[1] === 'Read,Grep,Glob') continue;
      const context = lines.slice(Math.max(0, index - 1), index + 1).join(' ');
      if (/Do NOT treat/.test(context)) continue;
      occurrences.push({ line: index + 1, value: match[1] });
    }
  });
  return occurrences;
}

test('every documented claude --tools value pins the read-only allowlist, inline code included', () => {
  for (const rel of CLAUDE_INVOCATION_DOCS) {
    assert.deepEqual(
      nonCanonicalToolsOccurrences(read(rel)),
      [],
      `${rel} documents a --tools value other than the canonical "Read,Grep,Glob" allowlist outside the "Do NOT treat" anti-pattern warning`,
    );
  }
});

test('large Claude review payloads use redacted-file stdin instead of a positional argument', () => {
  for (const rel of ['skills/claude-cli/SKILL.md', 'skills/pre-merge-review/reviewer-prompts/claude.md']) {
    const text = read(rel);
    const blocks = bashBlocks(text).filter((block) => block.includes('claude -p') && (block.includes('--output-format json') || rel.includes('reviewer-prompts/claude.md')));
    assert.ok(blocks.some((block) => /< "\$REDACTED_(?:PAYLOAD|PROMPT)_FILE"/.test(block)), `${rel} must redirect the final redacted file to Claude`);
    for (const block of blocks.filter((candidate) => /REDACTED_(?:PAYLOAD|PROMPT)_FILE/.test(candidate))) {
      assert.doesNotMatch(block, /"\$REDACTED_PROMPT"\s*</, `${rel} must not pass a large prompt as a positional argument`);
    }
  }
});

test('file and stdin transport preserve a 276 KiB review payload without one positional argument', () => {
  const payload = 'review-payload-'.repeat(Math.ceil((276 * 1024) / 15)).slice(0, 276 * 1024);
  const script = 'const fs = require("node:fs"); process.stdout.write(process.argv[1] === "file" ? fs.readFileSync(process.argv[2]) : fs.readFileSync(0));';
  const file = join(expectedRoot, 'tests', `.payload-${process.pid}`);
  try {
    writeFileSync(file, payload);
    const fromFile = spawnSync(process.execPath, ['-e', script, 'file', file], { encoding: 'utf8' });
    const fromStdin = spawnSync(process.execPath, ['-e', script, 'stdin', '-'], { input: payload, encoding: 'utf8' });

    assert.equal(fromFile.status, 0, fromFile.stderr);
    assert.equal(fromStdin.status, 0, fromStdin.stderr);
    assert.equal(fromFile.stdout, payload);
    assert.equal(fromStdin.stdout, payload);
    assert.equal(fromFile.error, undefined);
    assert.equal(fromStdin.error, undefined);
  } finally {
    rmSync(file, { force: true });
  }
});

test('the --tools scanner catches inline drift the fenced-block guard cannot see', () => {
  const inlineDrift = 'Calls `claude -p --dangerously-skip-permissions --tools "Read,Write" --max-turns 15 …`.';
  assert.deepEqual(nonCanonicalToolsOccurrences(inlineDrift), [{ line: 1, value: 'Read,Write' }]);

  const historicalDrift = 'Calls `claude -p --tools "Read,Bash" --max-turns 15 …`.';
  assert.deepEqual(nonCanonicalToolsOccurrences(historicalDrift), [{ line: 1, value: 'Read,Bash' }]);

  const canonical = 'Calls `claude -p --tools "Read,Grep,Glob" --strict-mcp-config …`.';
  assert.deepEqual(nonCanonicalToolsOccurrences(canonical), []);

  const antiPattern = 'out of the session. Do NOT treat\n  `--tools "Read,Bash"` as read-only — an unrestricted Bash tool can write';
  assert.deepEqual(nonCanonicalToolsOccurrences(antiPattern), []);
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
