import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

// Resolve a dotted field path like "plugins.0.version" against a parsed manifest.
function resolveField(obj, dottedField) {
  return dottedField.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

test('every version-bearing manifest in .version-bump.json matches package.json', () => {
  const pkg = readJson('package.json');
  const config = readJson('.version-bump.json');

  assert.equal(Array.isArray(config.files), true);
  // Five version-bearing manifests as documented in CLAUDE.md / README.md.
  assert.equal(config.files.length, 5);

  for (const entry of config.files) {
    const manifest = readJson(entry.path);
    const value = resolveField(manifest, entry.field);
    assert.equal(
      value,
      pkg.version,
      `${entry.path} (${entry.field}) = ${value}, expected ${pkg.version}`
    );
  }
});
