import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bashPath, forksStartedBy, hookPayload, locate, runIsolated, runWithClosedStdout, stracePath, withSandbox } from './helpers/hook-harness.mjs';
import { read, root } from './helpers/repo.mjs';

const hook = join(root, 'hooks/session-start');
const wrapper = join(root, 'hooks/run-hook.cmd');

const zshPath = locate('zsh');

function nestedPayload(stdout) {
  return hookPayload('SessionStart', stdout);
}

function inSandbox(fn) {
  return withSandbox('razorback-session-start-', fn);
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

test('check-rule-copies exposes exactly the thirteen rule invariants this hook must carry', () => {
  assert.equal(RULE_INVARIANTS.length, 13, `parsed invariants: ${JSON.stringify(RULE_INVARIANTS)}`);
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

test('every branch carries the full code-kb toolchain table', () => {
  const tableRows = [
    /\| \*\*Orient\*\* .* \| `file_skeleton\(file_path=<folder>\)` \|/,
    /\| `file_skeleton\(file_path, public_only\?\)` \|/,
    /\| `lookup_symbol\(query, path\?, kind\?\)` \|/,
    /\| `get_symbol_body\(symbol_name, file_path\?\)` \|/,
    /\| `get_symbol_context\(symbol_name, file_path\?\)` \|/,
    /`find_references\(symbol_name, direction="callers"\|"callees"\)`/,
    /\| `blast_radius\(symbol\?, file\?, depth\?\)` \|/,
    /\| `check_edit\(base\?\)` \|/,
  ];

  for (const [branch, payload] of Object.entries(payloadOf)) {
    const text = payload();
    assert.match(text, /## Your Toolchain/, `${branch} must carry the toolchain section`);
    for (const row of tableRows) {
      assert.match(text, row, `${branch} is missing toolchain row ${row}`);
    }
    assert.match(text, /Use your host's native editing tools to modify files\./, `${branch} is missing the native-editing directive`);
  }
});

test('every branch carries all thirteen check-rule-copies invariants', () => {
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

test('harness filtering treats a marker with an invalid id as ordinary content', () => {
  inSandbox((sandbox) => {
    mkdirSync(join(sandbox, 'hooks'), { recursive: true });
    mkdirSync(join(sandbox, 'skills/using-razorback'), { recursive: true });
    copyFileSync(hook, join(sandbox, 'hooks/session-start'));
    writeFileSync(
      join(sandbox, 'skills/using-razorback/SKILL.md'),
      [
        '<!-- harness:claude-code -->',
        'KEEP CLAUDE',
        '<!-- /harness -->',
        '<!-- harness:Not Valid -->',
        'ODD MARKER LINE',
        '<!-- harness:codex -->',
        'DROP CODEX',
        '<!-- /harness -->',
        'TAIL',
        '',
        '',
      ].join('\n'),
    );

    const payload = nestedPayload(runSessionStart({ CLAUDE_PLUGIN_ROOT: sandbox }, sandbox));

    assert.match(payload, /KEEP CLAUDE\n<!-- harness:Not Valid -->\nODD MARKER LINE\nTAIL\n<\/EXTREMELY_IMPORTANT>$/);
    assert.doesNotMatch(payload, /DROP CODEX/);
  });
});

test('session-start emits the filtered Claude Code shape when PATH is empty', () => {
  const payload = nestedPayload(runIsolated(bashPath, [hook], { CLAUDE_PLUGIN_ROOT: root }));

  assert.match(payload, /You have razorback\./);
  assert.match(payload, ACCESS_TEXT['claude-code']);
  assert.doesNotMatch(payload, ACCESS_TEXT.cursor);
  assert.doesNotMatch(payload, /Error reading using-razorback skill/);
});

test('session-start emits the Cursor shape when PATH is empty', () => {
  const parsed = JSON.parse(runIsolated(bashPath, [hook], { CURSOR_PLUGIN_ROOT: root }));

  assert.deepEqual(Object.keys(parsed), ['additional_context']);
  assert.match(parsed.additional_context, ACCESS_TEXT.cursor);
  assert.doesNotMatch(parsed.additional_context, ACCESS_TEXT['claude-code']);
});

test('run-hook.cmd dispatches session-start when PATH is empty', () => {
  const payload = nestedPayload(runIsolated(bashPath, [wrapper, 'session-start'], { CLAUDE_PLUGIN_ROOT: root }));

  assert.match(payload, /You have razorback\./);
  assert.doesNotMatch(payload, /Error reading using-razorback skill/);
});

test('session-start run by bare filename from hooks/ still resolves the plugin root', () => {
  const payload = nestedPayload(
    runIsolated(bashPath, ['session-start'], { CLAUDE_PLUGIN_ROOT: root }, { cwd: join(root, 'hooks') }),
  );

  assert.match(payload, ACCESS_TEXT['claude-code']);
  assert.doesNotMatch(payload, /Error reading using-razorback skill/);
});

test('run-hook.cmd run by bare filename from hooks/ still dispatches session-start', () => {
  const payload = nestedPayload(
    runIsolated(bashPath, ['run-hook.cmd', 'session-start'], { CLAUDE_PLUGIN_ROOT: root }, { cwd: join(root, 'hooks') }),
  );

  assert.match(payload, ACCESS_TEXT['claude-code']);
});

test('session-start reached through a backslash path still reads the skill', { skip: process.platform === 'win32' }, () => {
  inSandbox((sandbox) => {
    symlinkSync(join(root, 'hooks'), join(sandbox, 'hooks'));
    symlinkSync(join(root, 'skills'), join(sandbox, 'skills'));
    symlinkSync(hook, join(sandbox, 'hooks\\session-start'));

    const payload = nestedPayload(
      runIsolated(bashPath, ['hooks\\session-start'], { CLAUDE_PLUGIN_ROOT: root }, { cwd: sandbox }),
    );

    assert.match(payload, ACCESS_TEXT['claude-code']);
    assert.doesNotMatch(payload, /Error reading using-razorback skill/);
  });
});

test('session-start exits 0 silently when stdout is closed early', () => {
  inSandbox((sandbox) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const args of [[hook], [wrapper, 'session-start']]) {
        const { status, stderr } = runWithClosedStdout(sandbox, args);
        assert.equal(status, 0, `${args.join(' ')} exited ${status}`);
        assert.equal(stderr, '', `${args.join(' ')} wrote to stderr`);
      }
    }
  });
});

test('run-hook.cmd run by zsh without bash on PATH dispatches session-start through zsh', { skip: !zshPath }, () => {
  inSandbox((sandbox) => {
    const binDir = join(sandbox, 'bin');
    mkdirSync(binDir);
    symlinkSync(zshPath, join(binDir, 'zsh'));

    const payload = nestedPayload(runIsolated(zshPath, [wrapper, 'session-start'], { PATH: binDir, CLAUDE_PLUGIN_ROOT: root }));

    assert.match(payload, /You have razorback\./);
  });
});

test('run-hook.cmd exits 0 silently when neither bash nor zsh is on PATH', { skip: !zshPath }, () => {
  const result = spawnSync(zshPath, [wrapper, 'session-start'], {
    encoding: 'utf8',
    env: { PATH: '', HOME: tmpdir(), CLAUDE_PLUGIN_ROOT: root },
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('session-start and run-hook.cmd start no child processes', { skip: !stracePath }, () => {
  inSandbox((sandbox) => {
    for (const args of [[hook], [wrapper, 'session-start']]) {
      assert.deepEqual(forksStartedBy(sandbox, args), [], `${args.join(' ')} started child processes`);
    }
  });
});

test('hooks/session-start uses bash builtins only', () => {
  const script = read('hooks/session-start');

  assert.doesNotMatch(script, /\$\(/);
  assert.doesNotMatch(script, /\b(awk|cat|dirname|sed|grep|pwd)\b/);
  assert.doesNotMatch(script, /<</);
  assert.match(script, /^case "\$0" in$/m);
  assert.match(script, /IFS= read -r -d '' using_razorback_content < "\$skill_md"/);
  assert.match(script, /while IFS= read -r line/);
  assert.match(script, /^emit_json\(\) \{$/m);
  assert.match(script, /trap '' PIPE/);
  assert.match(script, /printf "\$@" 2>\/dev\/null \|\| true/);
  assert.doesNotMatch(script, /^\s*printf '\{/m);
});

test('hooks/run-hook.cmd stays a polyglot that resolves bash without PATH or dirname', () => {
  const script = read('hooks/run-hook.cmd');
  const [cmdHalf, bashHalf] = script.split('\nCMDBLOCK\n');

  assert.match(script, /^: << 'CMDBLOCK'\n@echo off\n/);
  assert.equal(typeof bashHalf, 'string');

  assert.match(cmdHalf, /^setlocal$/m);
  assert.match(cmdHalf, /if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\\Programs\\Git\\bin\\bash\.exe"/);
  assert.match(cmdHalf, /'"%SystemRoot%\\System32\\where\.exe" \$PATH:bash 2\^>nul'/);
  assert.match(cmdHalf, /if not "%%~xB"==""/);
  assert.match(cmdHalf, /"%SystemRoot%\\System32\\"/);
  assert.match(cmdHalf, /"%SystemRoot%\\Sysnative\\"/);
  assert.match(cmdHalf, /"%LOCALAPPDATA%\\Microsoft\\WindowsApps\\"/);
  assert.match(cmdHalf, /razorback: no bash found on Windows/);
  assert.match(cmdHalf, /\n"%BASH_EXE%" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9\nexit \/b %ERRORLEVEL%$/);
  assert.doesNotMatch(cmdHalf, /^where bash/m);
  assert.doesNotMatch(cmdHalf, /\(\n[^)]*"%BASH_EXE%"/);

  assert.doesNotMatch(bashHalf, /\$\(/);
  assert.doesNotMatch(bashHalf, /\bdirname\b/);
  assert.match(bashHalf, /^case "\$0" in$/m);
  assert.match(bashHalf, /if \[ -n "\$\{BASH:-\}" \]; then\n\s+shell="\$BASH"/);
  assert.match(bashHalf, /elif command -v bash >\/dev\/null 2>&1; then\n\s+shell="bash"/);
  assert.match(bashHalf, /elif command -v zsh >\/dev\/null 2>&1; then\n\s+shell="zsh"/);
  assert.match(bashHalf, /else\n\s+exit 0\nfi/);
  assert.match(bashHalf, /exec "\$shell" "\$\{SCRIPT_DIR\}\/\$\{SCRIPT_NAME\}" "\$@"/);
});
