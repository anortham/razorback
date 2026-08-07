import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function runSessionStart(env = {}, pluginRoot = root) {
  return execFileSync('bash', [join(pluginRoot, 'hooks/session-start')], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: '', CURSOR_PLUGIN_ROOT: '', ...env },
  });
}

const claudeCode = () => JSON.parse(runSessionStart({ CLAUDE_PLUGIN_ROOT: root }));
const cursor = () => JSON.parse(runSessionStart({ CURSOR_PLUGIN_ROOT: root }));
const fallback = () => JSON.parse(runSessionStart());

const payloadOf = {
  'claude-code': () => claudeCode().hookSpecificOutput.additionalContext,
  cursor: () => cursor().additional_context,
  fallback: () => fallback().additionalContext,
};

const RULE_INVARIANTS = (() => {
  const source = read('scripts/check-rule-copies.mjs');
  const block = source.match(/const INVARIANTS = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'check-rule-copies.mjs must expose an INVARIANTS array');
  return [...block[1].matchAll(/^\s*(['"])((?:\\.|(?!\1).)*)\1\s*,/gm)].map((m) => m[2]);
})();

const ACCESS_TEXT = {
  'claude-code': /\*\*In Claude Code:\*\*/,
  cursor: /\*\*In Cursor:\*\*/,
  codex: /\*\*In Codex \(CLI or desktop app\):\*\*/,
  opencode: /\*\*In OpenCode:\*\*/,
};

test('check-rule-copies exposes exactly the seven rule invariants this hook must carry', () => {
  assert.equal(RULE_INVARIANTS.length, 7, `parsed invariants: ${JSON.stringify(RULE_INVARIANTS)}`);
});

test('session-start emits the Claude Code SessionStart hookSpecificOutput shape', () => {
  const parsed = claudeCode();

  assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput']);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(typeof parsed.hookSpecificOutput.additionalContext, 'string');
  assert.ok(parsed.hookSpecificOutput.additionalContext.length > 0);
});

test('session-start emits the Cursor snake_case additional_context shape', () => {
  const parsed = cursor();

  assert.deepEqual(Object.keys(parsed), ['additional_context']);
  assert.equal(typeof parsed.additional_context, 'string');
  assert.ok(parsed.additional_context.length > 0);
});

test('session-start falls back to the SDK-standard top-level additionalContext shape', () => {
  const parsed = fallback();

  assert.deepEqual(Object.keys(parsed), ['additionalContext']);
  assert.equal(typeof parsed.additionalContext, 'string');
  assert.ok(parsed.additionalContext.length > 0);
});

test('cursor branch wins when both plugin-root vars are set', () => {
  const parsed = JSON.parse(runSessionStart({ CURSOR_PLUGIN_ROOT: root, CLAUDE_PLUGIN_ROOT: root }));

  assert.deepEqual(Object.keys(parsed), ['additional_context']);
});

test('every branch injects the razorback bootstrap envelope', () => {
  for (const [branch, payload] of Object.entries(payloadOf)) {
    assert.match(payload(), /You have razorback\./, `${branch} must announce razorback`);
    assert.match(payload(), /razorback:using-razorback/, `${branch} must name the skill`);
  }
});

test('claude-code branch keeps its own access text and strips other harnesses', () => {
  const payload = payloadOf['claude-code']();

  assert.match(payload, ACCESS_TEXT['claude-code']);
  for (const id of ['cursor', 'codex', 'opencode']) {
    assert.doesNotMatch(payload, ACCESS_TEXT[id], `claude-code payload must not carry ${id} access text`);
  }
});

test('cursor branch keeps its own access text and strips other harnesses', () => {
  const payload = payloadOf.cursor();

  assert.match(payload, ACCESS_TEXT.cursor);
  for (const id of ['claude-code', 'codex', 'opencode']) {
    assert.doesNotMatch(payload, ACCESS_TEXT[id], `cursor payload must not carry ${id} access text`);
  }
});

test('unknown-platform fallback injects every harness unfiltered', () => {
  const payload = payloadOf.fallback();

  for (const [id, pattern] of Object.entries(ACCESS_TEXT)) {
    assert.match(payload, pattern, `fallback payload must carry ${id} access text`);
  }
});

test('filtered branches strip the platform-adaptation bullets of other harnesses', () => {
  for (const branch of ['claude-code', 'cursor']) {
    const payload = payloadOf[branch]();

    assert.doesNotMatch(payload, /- \*\*Codex:\*\*/, `${branch} must not carry the Codex tool mapping`);
    assert.doesNotMatch(payload, /- \*\*OpenCode:\*\*/, `${branch} must not carry the OpenCode tool mapping`);
  }
});

test('filtered branches consume the harness markers rather than leaking them', () => {
  for (const branch of ['claude-code', 'cursor']) {
    assert.doesNotMatch(payloadOf[branch](), /<!-- \/?harness/, `${branch} must not leak marker comments`);
  }
});

test('unknown-platform fallback injects SKILL.md verbatim, markers included', () => {
  // Nothing identifies the reader, so nothing may be stripped; the markers ride
  // along as inert HTML comments.
  assert.ok(payloadOf.fallback().includes(read('skills/using-razorback/SKILL.md').trim()));
});

test('every branch carries the full Miller toolchain table', () => {
  const tableRows = [
    /\| \*\*Orient\*\* .* \| `context\(query\)` \|/,
    /`search\(query, mode=auto\\\|text\\\|symbol\\\|file\\\|markers\\\|content\\\|source\\\|external\\\|web\\\|all-text\)`/,
    /\| `inspect\(target='<file>'\)` \|/,
    /`inspect\(target='<symbol>', depth=summary\\\|overview\\\|full\)`/,
    /\| `trace\(target\)` \|/,
    /\| `impact\(target\)` \|/,
    /\| `patterns\(\.\.\.\)` \|/,
    /\| `content\(\.\.\.\)` \|/,
    /\| `edit\(operation, target\)` \|/,
    /\| `workspace\(\.\.\.\)` \|/,
  ];

  for (const [branch, payload] of Object.entries(payloadOf)) {
    const text = payload();
    assert.match(text, /## Your Toolchain/, `${branch} must carry the toolchain section`);
    for (const row of tableRows) {
      assert.match(text, row, `${branch} is missing toolchain row ${row}`);
    }
  }
});

test('every branch carries all seven check-rule-copies invariants', () => {
  for (const [branch, payload] of Object.entries(payloadOf)) {
    const text = payload();
    for (const phrase of RULE_INVARIANTS) {
      assert.ok(text.includes(phrase), `${branch} payload is missing rule invariant: "${phrase}"`);
    }
  }
});

test('harness filtering fails open when the skill carries no markers', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'razorback-session-start-'));
  try {
    mkdirSync(join(sandbox, 'hooks'), { recursive: true });
    mkdirSync(join(sandbox, 'skills/using-razorback'), { recursive: true });
    copyFileSync(join(root, 'hooks/session-start'), join(sandbox, 'hooks/session-start'));

    const unmarked = read('skills/using-razorback/SKILL.md')
      .split('\n')
      .filter((line) => !/^<!-- \/?harness/.test(line))
      .join('\n');
    writeFileSync(join(sandbox, 'skills/using-razorback/SKILL.md'), unmarked);

    const parsed = JSON.parse(runSessionStart({ CLAUDE_PLUGIN_ROOT: sandbox }, sandbox));
    const payload = parsed.hookSpecificOutput.additionalContext;

    for (const [id, pattern] of Object.entries(ACCESS_TEXT)) {
      assert.match(payload, pattern, `markerless skill must inject ${id} access text unfiltered`);
    }
    assert.ok(payload.includes(unmarked.trim()), 'markerless skill must be injected verbatim');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('harness filtering fails open rather than injecting an empty payload', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'razorback-session-start-'));
  try {
    mkdirSync(join(sandbox, 'hooks'), { recursive: true });
    mkdirSync(join(sandbox, 'skills/using-razorback'), { recursive: true });
    copyFileSync(join(root, 'hooks/session-start'), join(sandbox, 'hooks/session-start'));

    // Every line belongs to another harness, so a filter without an empty-result
    // guard would strip the skill down to nothing.
    writeFileSync(
      join(sandbox, 'skills/using-razorback/SKILL.md'),
      '<!-- harness:codex -->\nCODEX ONLY BOOTSTRAP\n<!-- /harness -->\n',
    );

    const payload = JSON.parse(runSessionStart({ CLAUDE_PLUGIN_ROOT: sandbox }, sandbox))
      .hookSpecificOutput.additionalContext;

    assert.match(payload, /CODEX ONLY BOOTSTRAP/, 'an empty filter result must fall back to full content');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('hooks.json dispatches session-start through bash with the unchanged polyglot command', () => {
  const entry = JSON.parse(read('hooks/hooks.json')).hooks.SessionStart[0].hooks[0];

  assert.equal(entry.type, 'command');
  assert.equal(entry.shell, 'bash');
  assert.equal(entry.command, '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start');
});

test('hooks/session-start keeps its hardened bash contract', () => {
  const script = read('hooks/session-start');

  assert.match(script, /^#!\/usr\/bin\/env bash/);
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /escape_for_json/);
  // printf, not heredoc: bash 5.3+ hangs on heredocs here.
  assert.match(script, /printf/);
  assert.doesNotMatch(script, /<<-?\s*['"]?EOF/);
});
