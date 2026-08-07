import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const skillsDir = path.join(root, 'skills');

const BANNED_TOKENS = ['Agent tool', 'Task tool', 'general-purpose', 'subagent_type'];

const ALLOWLIST = new Set(['skills/using-razorback/references/codex-tools.md']);

const HARNESS_REGION = /<!--\s*harness:[^>]*-->[\s\S]*?<!--\s*\/harness\s*-->/g;

function skillFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return skillFiles(full);
    return entry.isFile() ? [full] : [];
  });
}

function stripHarnessRegions(source) {
  return source.replace(HARNESS_REGION, (region) => region.replace(/[^\n]/g, ''));
}

function unguardedHits(token) {
  const hits = [];
  for (const file of skillFiles(skillsDir)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (ALLOWLIST.has(rel)) continue;
    const lines = stripHarnessRegions(fs.readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (line.includes(token)) hits.push(`${rel}:${index + 1}`);
    });
  }
  return hits;
}

test('allowlisted mapping file exists', () => {
  for (const rel of ALLOWLIST) {
    assert.ok(
      fs.existsSync(path.join(root, rel)),
      `${rel} is allowlisted but does not exist — update the allowlist to the mapping file's real path`,
    );
  }
});

for (const token of BANNED_TOKENS) {
  test(`skills/ has no unguarded "${token}" references`, () => {
    assert.deepEqual(
      unguardedHits(token),
      [],
      `Prompt sites must use capability language ("Dispatch one implementer subagent:"); ` +
        `per-harness tool names belong in skills/using-razorback/references/codex-tools.md ` +
        `or inside <!-- harness:… --><!-- /harness --> guards`,
    );
  });
}
