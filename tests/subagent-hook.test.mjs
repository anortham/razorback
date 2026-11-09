import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { bashPath, forksStartedBy, hookPayload, runIsolated as runIsolatedShell, runWithClosedStdout, stracePath, withSandbox } from './helpers/hook-harness.mjs';
import { read, root } from './helpers/repo.mjs';

const hook = join(root, 'hooks/subagent-start');
const wrapper = join(root, 'hooks/run-hook.cmd');

function runSubagentStart(env = {}) {
  return execFileSync('bash', [hook], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...env },
  });
}

function runIsolated(args, options = {}) {
  return runIsolatedShell(bashPath, args, { CLAUDE_PLUGIN_ROOT: root }, options);
}

function nestedPayload(stdout) {
  return hookPayload('SubagentStart', stdout);
}

function inSandbox(fn) {
  return withSandbox('razorback-subagent-start-', fn);
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

test('subagent-start injects the retrieval ruleset with code-kb first for code structure', () => {
  const { additionalContext } = JSON.parse(runSubagentStart()).hookSpecificOutput;

  assert.match(additionalContext, /`file_skeleton` on a folder or a file you do not know, to orient/);
  assert.doesNotMatch(additionalContext, /`file_skeleton` before a full read/);
  assert.doesNotMatch(additionalContext, /optional retrieval aid/);
  assert.doesNotMatch(additionalContext, /smallest sufficient evidence/);
  assert.doesNotMatch(additionalContext, /MUST be used/);
  assert.doesNotMatch(additionalContext, /Do NOT fall back to Glob/);
  assert.match(additionalContext, /When the evidence cannot prove a shape/);
  // Capability table entries.
  assert.match(additionalContext, /file_skeleton\(file_path=<folder>\)/);
  assert.match(additionalContext, /file_skeleton\(file_path, public_only\?\)/);
  assert.match(additionalContext, /lookup_symbol\(query, path\?, kind\?\)/);
  assert.match(additionalContext, /get_symbol_body\(symbol_name, file_path\?\)/);
  assert.match(additionalContext, /get_symbol_context\(symbol_name, file_path\?\)/);
  assert.match(additionalContext, /find_references\(symbol_name, direction="callers"\|"callees"\)/);
  assert.match(additionalContext, /blast_radius\(symbol\?, file\?, depth\?\)/);
  assert.match(additionalContext, /check_edit\(base\?\)/);
  assert.match(additionalContext, /Every code-kb call takes `project_root`/);
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
  assert.equal(entry.shell, 'bash');
  assert.equal(
    entry.command,
    '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" subagent-start',
  );
  assert.equal(entry.async, false);
});

test('subagent-start emits the SubagentStart shape when PATH is empty', () => {
  const payload = nestedPayload(runIsolated([hook]));

  assert.match(payload, /Use code-kb first for code structure/);
  assert.doesNotMatch(payload, /Error reading subagent-toolchain reference/);
});

test('run-hook.cmd dispatches subagent-start when PATH is empty', () => {
  const payload = nestedPayload(runIsolated([wrapper, 'subagent-start']));

  assert.match(payload, /Use code-kb first for code structure/);
});

test('subagent-start run by bare filename from hooks/ still resolves the plugin root', () => {
  const payload = nestedPayload(runIsolated(['subagent-start'], { cwd: join(root, 'hooks') }));

  assert.doesNotMatch(payload, /Error reading subagent-toolchain reference/);
});

test('subagent-start exits 0 silently when stdout is closed early', () => {
  inSandbox((sandbox) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const args of [[hook], [wrapper, 'subagent-start']]) {
        const { status, stderr } = runWithClosedStdout(sandbox, args);

        assert.equal(status, 0, `${args.join(' ')} exited ${status}`);
        assert.equal(stderr, '', `${args.join(' ')} wrote to stderr`);
      }
    }
  });
});

test('subagent-start starts no child processes', { skip: !stracePath }, () => {
  inSandbox((sandbox) => {
    assert.deepEqual(forksStartedBy(sandbox, [hook]), []);
  });
});

test('hooks/subagent-start uses bash builtins only', () => {
  const script = read('hooks/subagent-start');

  assert.doesNotMatch(script, /\$\(/);
  assert.doesNotMatch(script, /\b(awk|cat|dirname|sed|grep|pwd)\b/);
  assert.doesNotMatch(script, /<</);
  assert.match(script, /^case "\$0" in$/m);
  assert.match(script, /IFS= read -r -d '' toolchain_content < "\$toolchain_md"/);
  assert.match(script, /^emit_json\(\) \{$/m);
  assert.match(script, /trap '' PIPE/);
  assert.match(script, /printf "\$@" 2>\/dev\/null \|\| true/);
  assert.doesNotMatch(script, /^\s*printf '\{/m);
});

test('subagent hook is Claude Code only - cursor hooks stay untouched', () => {
  const cursorHooks = JSON.parse(read('hooks/hooks-cursor.json'));

  assert.equal(
    JSON.stringify(cursorHooks).includes('subagent-start'),
    false,
    'hooks-cursor.json must not register the Claude-Code-only SubagentStart hook',
  );
});
