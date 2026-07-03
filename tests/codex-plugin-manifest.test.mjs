import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function readBuffer(relativePath) {
  return fs.readFileSync(path.join(root, relativePath));
}

test('codex plugin manifest matches package metadata and Codex contract', () => {
  const pkg = readJson('package.json');
  const manifest = readJson('.codex-plugin/plugin.json');

  assert.equal(manifest.name, pkg.name);
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.description, pkg.description);
  assert.equal(manifest.homepage, pkg.homepage);
  assert.equal(manifest.repository, pkg.homepage);
  assert.equal(manifest.license, pkg.license);
  assert.equal(manifest.skills, './skills/');
  assert.equal('hooks' in manifest, false);

  assert.deepEqual(manifest.author, {
    name: pkg.author
  });

  assert.deepEqual(manifest.interface, {
    displayName: 'Razorback',
    shortDescription: 'Miller-powered development workflow skills.',
    longDescription:
      'Development workflow skills for Codex with Miller-first orientation, TDD discipline, and subagent-driven execution.',
    developerName: 'anortham',
    category: 'Productivity',
    capabilities: ['Write'],
    websiteURL: pkg.homepage,
    defaultPrompt: [
      'Plan a code change with Miller-first repo grounding.',
      'Run a TDD fix with worker verification and a concise report.',
      'Review a diff for regressions, contract drift, and missing tests.'
    ],
    brandColor: '#B31B1B',
    composerIcon: './assets/app-icon.png',
    logo: './assets/razorback-small.svg',
    logoDark: './assets/razorback-small.svg'
  });
});

test('codex marketplace entry points at the repo plugin root without a version field', () => {
  const marketplace = readJson('.agents/plugins/marketplace.json');

  assert.equal(marketplace.name, 'razorback');
  assert.deepEqual(marketplace.interface, {
    displayName: 'Razorback'
  });
  assert.equal(Array.isArray(marketplace.plugins), true);
  assert.equal(marketplace.plugins.length, 1);

  const [entry] = marketplace.plugins;
  assert.equal(entry.name, 'razorback');
  assert.deepEqual(entry.source, {
    source: 'local',
    path: './'
  });
  assert.deepEqual(entry.policy, {
    installation: 'AVAILABLE',
    authentication: 'ON_INSTALL'
  });
  assert.equal(entry.category, 'Productivity');
  assert.equal('version' in entry, false);
});

test('codex plugin assets exist and app icon is a small valid 64x64 png', () => {
  const svgPath = path.join(root, 'assets/razorback-small.svg');
  assert.equal(fs.existsSync(svgPath), true);
  assert.match(read('assets/razorback-small.svg'), /<svg[\s>]/);

  const png = readBuffer('assets/app-icon.png');
  assert.equal(png.length < 8 * 1024, true);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(png.subarray(0, 8), signature);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 64);
  assert.equal(png.readUInt32BE(20), 64);
});

test('version bump config includes the codex plugin manifest and excludes the marketplace file', () => {
  const versionConfig = readJson('.version-bump.json');

  assert.equal(
    versionConfig.files.some(
      (entry) => entry.path === '.codex-plugin/plugin.json' && entry.field === 'version'
    ),
    true
  );
  assert.equal(
    versionConfig.files.some((entry) => entry.path === '.agents/plugins/marketplace.json'),
    false
  );
});
