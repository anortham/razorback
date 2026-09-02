import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = join(root, 'skills/codex-cli/scripts/codex-exec');

const read = (rel) => readFileSync(join(root, rel), 'utf8');

function bashPath(windowsPath) {
  return spawnSync('bash', ['-c', 'cygpath -u "$1" 2>/dev/null || printf "%s" "$1"', '_', windowsPath], {
    encoding: 'utf8',
  }).stdout.trim();
}

function executable(path, body) {
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'codex-preflight-'));
  const storeDir = join(base, 'WindowsApps', 'Microsoft.PowerShell_7');
  const msiDir = join(base, 'PowerShell', '7');
  const bin = join(base, 'bin');
  for (const dir of [storeDir, msiDir, bin]) mkdirSync(dir, { recursive: true });
  executable(join(storeDir, 'pwsh.exe'), '#!/usr/bin/env bash\nexit 0\n');
  executable(join(msiDir, 'pwsh.exe'), '#!/usr/bin/env bash\nexit 0\n');
  executable(
    join(bin, 'codex'),
    [
      '#!/usr/bin/env bash',
      'if [ "$1" = "sandbox" ]; then',
      '  case "$3" in *WindowsApps*) echo "CreateProcessAsUserW failed: 5 (Access is denied.)" >&2; exit 1;; esac',
      '  exit 0',
      'fi',
      'printf "codex %s\\n" "$*"',
      'command -v pwsh.exe || command -v pwsh',
    ].join('\n') + '\n',
  );
  return { base, storeDir, msiDir, bin };
}

function run(fx, extraEnv = {}) {
  const pathEntries = [bashPath(fx.bin), bashPath(fx.storeDir)];
  for (const entry of (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    if (entry) pathEntries.push(bashPath(entry));
  }
  const env = {
    ...process.env,
    OS: 'Windows_NT',
    RAZORBACK_PWSH_DIR: bashPath(fx.msiDir),
    ...extraEnv,
  };
  return spawnSync(
    'bash',
    ['-c', 'export PATH="$1"; shift; "$0" "$@"', wrapper, pathEntries.join(':'), '--ephemeral', '-s', 'read-only', 'prompt'],
    { encoding: 'utf8', env },
  );
}

test('codex-exec prefers the MSI pwsh when PATH resolves the Store build', () => {
  const fx = fixture();
  try {
    const result = run(fx);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^codex exec --ephemeral -s read-only prompt$/m);
    assert.match(result.stdout, /PowerShell\/7\/pwsh\.exe$/m);
    assert.doesNotMatch(result.stdout, /WindowsApps/);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test('codex-exec stops before any model turn when the sandbox cannot spawn the shell', () => {
  const fx = fixture();
  try {
    rmSync(fx.msiDir, { recursive: true, force: true });
    const result = run(fx);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /CreateProcessAsUserW failed: 5/);
    assert.match(result.stderr, /No codex invocation was consumed/);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test('codex-exec is a transparent pass-through off Windows', () => {
  const fx = fixture();
  try {
    const result = run(fx, { OS: 'Linux' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^codex exec --ephemeral -s read-only prompt$/m);
    assert.match(result.stdout, /WindowsApps/);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test('codex-cli recipes dispatch through the codex-exec wrapper', () => {
  const skill = read('skills/codex-cli/SKILL.md');
  const bashBlocks = [...skill.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]);
  const bare = bashBlocks.filter((block) => /^\s*(cat [^|]*\| *)?codex exec\b/m.test(block));
  assert.equal(bare.length, 0, `bare \`codex exec\` in recipe blocks:\n${bare.join('\n---\n')}`);
  assert.match(skill, /"\$SKILL_DIR\/scripts\/codex-exec"/);
  assert.match(skill, /WindowsApps/);
  assert.doesNotMatch(skill, /GPO|locked-down/);
});

test('pre-merge codex reviewer prompt dispatches through the codex-exec wrapper', () => {
  const prompt = read('skills/pre-merge-review/reviewer-prompts/codex.md');
  assert.match(prompt, /"\$SKILL_DIR\/\.\.\/codex-cli\/scripts\/codex-exec" \\/);
  assert.doesNotMatch(prompt, /\| codex exec \\/);
  assert.match(prompt, /preflight[\s\S]*?exit(?:s| code) 2[\s\S]*?not (?:a )?consumed/i);
});

test('review campaigns do not count a failed preflight as a consumed invocation', () => {
  const skill = read('skills/managing-review-campaigns/SKILL.md');
  assert.match(skill, /preflight[\s\S]*?consumes no invocation/i);
});
