import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson, root } from './repo.mjs';

/** Test options that skip a test when jq, which bump-version.sh needs, is missing. */
export const requiresJq = { skip: spawnSync('sh', ['-c', 'command -v jq']).status !== 0 && 'bump-version.sh needs jq on PATH' };

/** Copies bump-version.sh, its config, and the declared manifests from the working tree, not from HEAD, into a new temp directory. */
export function copyBumpVersionFiles(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const copy = (relativePath) => {
    const dest = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, relativePath), dest);
  };

  copy('.version-bump.json');
  copy('scripts/bump-version.sh');
  fs.chmodSync(path.join(dir, 'scripts/bump-version.sh'), 0o755);
  for (const entry of readJson('.version-bump.json').files) copy(entry.path);

  return dir;
}

/** Runs the copy of bump-version.sh inside a fixture directory. */
export function bumpVersion(dir, ...args) {
  return spawnSync('bash', [path.join(dir, 'scripts/bump-version.sh'), ...args], { cwd: dir, encoding: 'utf8' });
}

/** Runs the copy of bump-version.sh with a jq that ends each output line with CRLF, as jq for Windows does. */
export function bumpVersionWithCrlfJq(dir, ...args) {
  const realJq = spawnSync('sh', ['-c', 'command -v jq'], { encoding: 'utf8' }).stdout.trim();
  const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-crlf-jq-'));
  try {
    const shim = path.join(shimDir, 'jq');
    fs.writeFileSync(shim, `#!/bin/sh\n"${realJq}" "$@" | sed 's/$/\\r/'\n`);
    fs.chmodSync(shim, 0o755);
    return spawnSync('bash', [path.join(dir, 'scripts/bump-version.sh'), ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${shimDir}${path.delimiter}${process.env.PATH}` },
    });
  } finally {
    fs.rmSync(shimDir, { recursive: true, force: true });
  }
}
