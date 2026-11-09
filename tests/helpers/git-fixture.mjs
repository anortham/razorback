import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const NO_BACKGROUND_MAINTENANCE = { 'gc.auto': '0', 'maintenance.auto': 'false' };

function gitWith(options, ...args) {
  const result = spawnSync('git', args, { encoding: 'utf8', ...options });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

/** Runs git in `cwd`, asserts that it exits 0, and returns stdout. */
export function git(cwd, ...args) {
  return gitWith({ cwd }, ...args);
}

/** Returns the `-c` flags that give one git command a fixed identity, no signing, and no background maintenance. */
export function identityFlags(name, email) {
  return [
    '-c', `user.email=${email}`,
    '-c', `user.name=${name}`,
    '-c', 'commit.gpgsign=false',
    ...Object.entries(NO_BACKGROUND_MAINTENANCE).flatMap(([key, value]) => ['-c', `${key}=${value}`]),
  ];
}

/** Creates a git repository at `dir` with gc.auto=0 and maintenance.auto=false, because a commit can start a detached maintenance process that writes into .git while a test deletes the tree. */
export function initRepository(dir, { branch, config = {}, env } = {}) {
  const options = env ? { env } : {};
  gitWith(options, 'init', '-q', ...(branch ? ['-b', branch] : []), dir);
  for (const [key, value] of Object.entries({ ...NO_BACKGROUND_MAINTENANCE, ...config })) {
    gitWith(options, '-C', dir, 'config', key, value);
  }
  return dir;
}

/** Deletes a temp tree and retries when a file is still busy or the directory is not yet empty. */
export function removeTree(dir) {
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
