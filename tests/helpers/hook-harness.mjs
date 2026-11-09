import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root } from './repo.mjs';

/** Returns the path of a command in a form Node can spawn, or an empty string when the command is missing. */
export function locate(command) {
  const resolve = process.platform === 'win32' ? `cygpath -m "$(command -v ${command})"` : `command -v ${command}`;
  const result = spawnSync('bash', ['-c', resolve], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

/** Path of bash. */
export const bashPath = locate('bash');

/** Path of strace on Linux, or an empty string. */
export const stracePath = process.platform === 'linux' ? locate('strace') : '';

/** Runs a shell with an empty PATH and returns stdout. */
export function runIsolated(shell, args, env = {}, options = {}) {
  return execFileSync(shell, args, {
    encoding: 'utf8',
    env: { PATH: '', HOME: tmpdir(), ...env },
    ...options,
  });
}

/** Asserts the Claude Code envelope of a hook event and returns its additionalContext. */
export function hookPayload(hookEventName, stdout) {
  const parsed = JSON.parse(stdout);
  assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput']);
  assert.equal(parsed.hookSpecificOutput.hookEventName, hookEventName);
  return parsed.hookSpecificOutput.additionalContext;
}

/** Calls `fn` with a new temp directory and removes the directory afterwards. */
export function withSandbox(prefix, fn) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  try {
    return fn(sandbox);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

/** Runs a hook command line through bash with stdout closed early; returns the exit status and stderr. */
export function runWithClosedStdout(sandbox, args) {
  const errFile = join(sandbox, 'stderr.txt');
  const result = spawnSync(
    bashPath,
    ['-c', '"$@" 2>"$ERR_FILE" | :; exit "${PIPESTATUS[0]}"', '_', bashPath, ...args],
    { encoding: 'utf8', env: { PATH: '', HOME: sandbox, CLAUDE_PLUGIN_ROOT: root, ERR_FILE: errFile } },
  );
  return { status: result.status, stderr: readFileSync(errFile, 'utf8') };
}

/** Runs a hook command line under strace and returns the trace lines of each child process it started. */
export function forksStartedBy(sandbox, args) {
  const log = join(sandbox, 'forks.log');
  const result = spawnSync(
    stracePath,
    ['-f', '-qq', '-e', 'trace=fork,vfork,clone,clone3', '-o', log, bashPath, ...args],
    { encoding: 'utf8', env: { PATH: '', HOME: sandbox, CLAUDE_PLUGIN_ROOT: root } },
  );

  assert.equal(result.status, 0, result.stderr);
  return readFileSync(log, 'utf8').split('\n').filter((line) => /(fork|clone3?)\(/.test(line));
}
