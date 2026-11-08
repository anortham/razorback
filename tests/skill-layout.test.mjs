import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const COMPACTION_CUT = 20000;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test('every SKILL.md stays under the Claude Code compaction cut', () => {
  const oversized = readdirSync(skillsDir)
    .map((name) => join(skillsDir, name, 'SKILL.md'))
    .filter((file) => statSync(file).size >= COMPACTION_CUT)
    .map((file) => `${relative(root, file)} is ${statSync(file).size} bytes`);
  assert.deepEqual(oversized, [], `move sometimes-needed sections into references/: ${oversized.join('; ')}`);
});

test('no skill ships pressure scenarios or creation logs', () => {
  const devFiles = walk(skillsDir)
    .filter((file) => /(^|\/)(CREATION-LOG\.md|test-[^/]*\.md)$/.test(file))
    .map((file) => relative(root, file));
  assert.deepEqual(devFiles, []);
});

test('skills run the SDD helpers by absolute path, never by a skill-relative scripts path', () => {
  const relativeInvocation = /`(bash )?(\.\.\/[a-z-]+\/)?scripts\/(sdd-repo|sdd-workspace|task-brief|review-package)/;
  const offenders = walk(skillsDir)
    .filter((file) => file.endsWith('.md'))
    .flatMap((file) => readFileSync(file, 'utf8').split('\n').map((line, index) => ({ file, line, index })))
    .filter(({ line }) => relativeInvocation.test(line))
    .map(({ file, index }) => `${relative(root, file)}:${index + 1}`);
  assert.deepEqual(offenders, []);
});
