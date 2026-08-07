import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptUnderTest = join(root, 'skills/systematic-debugging/find-polluter.sh');

const testRoot = mkdtempSync(join(tmpdir(), 'find-polluter-'));
test.after(() => rmSync(testRoot, { recursive: true, force: true }));

function setupProject() {
  const project = join(testRoot, 'project');
  rmSync(project, { recursive: true, force: true });
  mkdirSync(join(project, 'src', 'feature'), { recursive: true });
  mkdirSync(join(project, 'bin'), { recursive: true });
  writeFileSync(join(project, 'src', 'top.test.ts'), "test('top')\n");
  writeFileSync(join(project, 'src', 'feature', 'nested.test.ts'), "test('nested')\n");
  const npmStub = join(project, 'bin', 'npm');
  writeFileSync(npmStub, '#!/usr/bin/env bash\ntouch pollution.marker\n');
  chmodSync(npmStub, 0o755);
  return project;
}

function runPolluter(pattern) {
  const project = setupProject();
  const result = spawnSync('bash', [scriptUnderTest, 'pollution.marker', pattern], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${join(project, 'bin')}${delimiter}${process.env.PATH}` },
  });
  return `${result.stdout}${result.stderr}`;
}

test('documented pattern runs tests and detects pollution', () => {
  const output = runPolluter('src/**/*.test.ts');
  assert.match(output, /FOUND POLLUTER/);
});

test('documented pattern matches nested and top-level test files', () => {
  const output = runPolluter('src/**/*.test.ts');
  assert.match(output, /Found 2 test files/);
});

test('leading ./ on the pattern is accepted', () => {
  const output = runPolluter('./src/**/*.test.ts');
  assert.match(output, /Found 2 test files/);
});

test('empty result counts as 0 and exits via the clean path', () => {
  const output = runPolluter('nomatch/**/*.test.ts');
  assert.match(output, /Found 0 test files/);
  assert.match(output, /No polluter found/);
});
