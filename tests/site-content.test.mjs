import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const page = fs.readFileSync(path.join(root, 'docs', 'site', 'index.html'), 'utf8');
const skillDirs = fs
  .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const matchAll = (pattern) => [...page.matchAll(pattern)].map((match) => match[1]);

test('site lists every skill directory and no removed skill', () => {
  const listed = [...new Set(matchAll(/data-skill="([^"]+)"/g))].sort();
  assert.deepEqual(listed, skillDirs);
});

test('site hero states the real skill count', () => {
  const counts = matchAll(/data-skill-count[^>]*>\s*(\d+)/g);
  assert.ok(counts.length > 0, 'no element carries data-skill-count');
  for (const count of counts) assert.equal(Number(count), skillDirs.length);
});

test('site does not hard-code the package version', () => {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(page.includes(version), false, `index.html contains ${version}`);
});

test('every in-page anchor link points to an existing id', () => {
  const ids = new Set(matchAll(/\sid="([^"]+)"/g));
  const targets = matchAll(/href="#([^"]*)"/g);
  assert.ok(targets.length > 0);
  const missing = targets.filter((target) => !ids.has(target));
  assert.deepEqual(missing, []);
});
