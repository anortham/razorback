import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { accessSync, constants, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function runSubagentStart(env = {}) {
  return execFileSync('bash', [join(root, 'hooks/subagent-start')], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...env },
  });
}

test('subagent-start emits the Claude Code SubagentStart hookSpecificOutput shape', () => {
  const stdout = runSubagentStart();
  const parsed = JSON.parse(stdout);

  assert.ok(parsed.hookSpecificOutput, 'expected hookSpecificOutput envelope');
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.equal(typeof parsed.hookSpecificOutput.additionalContext, 'string');
  assert.ok(
    parsed.hookSpecificOutput.additionalContext.length > 0,
    'additionalContext must not be empty',
  );

  // Raw stdout is dropped for SubagentStart; only the nested shape is read, so
  // emit that key alone (no additional_context / additionalContext siblings).
  assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput']);
});

test('subagent-start injects the Miller-first ruleset', () => {
  const { additionalContext } = JSON.parse(runSubagentStart()).hookSpecificOutput;

  assert.match(additionalContext, /Miller/);
  // The six exploration rules, carried verbatim from using-razorback.
  assert.match(additionalContext, /Inspect a symbol before modifying it\./);
  assert.match(
    additionalContext,
    /Use Miller for ALL codebase exploration\. Do NOT fall back to Glob . Read . Grep chains\./,
  );
  assert.match(additionalContext, /List a file's symbols before reading it in full\./);
  assert.match(
    additionalContext,
    /Find a symbol's references before changing it, to check impact\./,
  );
  assert.match(additionalContext, /Do not infer or invent API shapes\./);
  assert.match(additionalContext, /When Miller cannot prove a shape/);
  // Capability table entries.
  assert.match(additionalContext, /inspect\(symbol, depth=summary\\\|overview\\\|full\)/);
  assert.match(additionalContext, /impact\(target\)/);
  assert.match(additionalContext, /patterns\(\.\.\.\)/);
  assert.match(additionalContext, /content\(\.\.\.\)/);
  // Subagent-specific worktree-state reporting requirement.
  assert.match(additionalContext, /worktree/i);
  assert.match(additionalContext, /path, branch, commit, (and )?dirty state/i);
});

test('subagent-start escapes the reference content so it round-trips through JSON', () => {
  const stdout = runSubagentStart();
  const { additionalContext } = JSON.parse(stdout).hookSpecificOutput;
  const source = read('skills/using-razorback/references/subagent-toolchain.md');

  // The escaped payload rehydrates the reference file verbatim: newlines,
  // quotes, backslashes and table pipes all survive the JSON round-trip.
  assert.ok(
    additionalContext.includes(source.trim()),
    'additionalContext must contain the unmodified subagent-toolchain.md content',
  );
  // The JSON string value must carry escaped newlines, not raw ones.
  const payload = stdout.slice(stdout.indexOf('"additionalContext"'));
  assert.match(payload, /\\n/);
});

test('subagent-toolchain reference stays compact and carries no skill-invocation instructions', () => {
  const reference = read('skills/using-razorback/references/subagent-toolchain.md');
  const lines = reference.trim().split('\n');

  assert.ok(lines.length <= 45, `expected a compact ruleset, got ${lines.length} lines`);
  // Subagents skip using-razorback by design (<SUBAGENT-STOP>); no Skill-tool nudges.
  assert.doesNotMatch(reference, /Skill tool/i);
  assert.doesNotMatch(reference, /using-razorback/);
});

test('hooks/subagent-start is an executable, extensionless bash script', () => {
  const script = read('hooks/subagent-start');

  assert.match(script, /^#!\/usr\/bin\/env bash/);
  assert.match(script, /set -euo pipefail/);
  // Mirrors session-start's escaping approach; printf (bash 5.3 heredoc hang).
  assert.match(script, /escape_for_json/);
  assert.match(script, /printf/);
  // Deliberately skipped: agent-type matcher.
  assert.match(script, /add agent-type matcher if Explore-agent noise shows up/);

  accessSync(join(root, 'hooks/subagent-start'), constants.X_OK);
});

test('hooks.json is valid JSON and registers both SessionStart and SubagentStart', () => {
  const hooks = JSON.parse(read('hooks/hooks.json')).hooks;

  assert.ok(Array.isArray(hooks.SessionStart), 'SessionStart must stay registered');
  assert.equal(hooks.SessionStart[0].matcher, 'startup|clear|compact');
  assert.equal(
    hooks.SessionStart[0].hooks[0].command,
    '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start',
  );

  assert.ok(Array.isArray(hooks.SubagentStart), 'SubagentStart must be registered');
  assert.equal(hooks.SubagentStart.length, 1);
  // SubagentStart entries take no matcher.
  assert.equal(hooks.SubagentStart[0].matcher, undefined);

  const entry = hooks.SubagentStart[0].hooks[0];
  assert.equal(entry.type, 'command');
  assert.equal(
    entry.command,
    '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" subagent-start',
  );
  assert.equal(entry.async, false);
});

test('subagent hook is Claude Code only - cursor hooks stay untouched', () => {
  const cursorHooks = JSON.parse(read('hooks/hooks-cursor.json'));

  assert.equal(
    JSON.stringify(cursorHooks).includes('subagent-start'),
    false,
    'hooks-cursor.json must not register the Claude-Code-only SubagentStart hook',
  );
});
