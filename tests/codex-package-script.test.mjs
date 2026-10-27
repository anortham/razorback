import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const sourceScript = path.join(root, 'scripts/package-codex-plugin.sh');

const run = (cmd, args, options = {}) =>
  childProcess.execFileSync(cmd, args, { encoding: 'utf8', ...options });

const runResult = (cmd, args, options = {}) =>
  childProcess.spawnSync(cmd, args, { encoding: 'utf8', ...options });

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commandAvailable(cmd) {
  return runResult('sh', ['-c', `command -v ${cmd}`]).status === 0;
}

const hasZip = commandAvailable('zip') && commandAvailable('unzip');
const hasTarGz = commandAvailable('tar') && commandAvailable('gzip');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writePng(filePath) {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sN8Y7QAAAAASUVORK5CYII=';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
}

function listSkillFiles(baseDir) {
  const results = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'SKILL.md') {
        results.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return results
    .map((fullPath) => path.relative(root, fullPath).split(path.sep).join('/'))
    .sort();
}

function listExecutableTrackedSkillFiles(repoDir) {
  return run('git', ['-C', repoDir, 'ls-files', '-s', '--', 'skills'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [mode, , , ...pathParts] = line.split(/\s+/);
      return {
        mode,
        relativePath: pathParts.join(' ')
      };
    })
    .filter(({ mode }) => (parseInt(mode.slice(-3), 8) & 0o111) !== 0)
    .map(({ relativePath }) => relativePath)
    .sort();
}

function ensureFrontmatter(content, relativePath) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, `${relativePath} should start with YAML frontmatter`);
  assert.match(match[1], /^name:\s*.+$/m, `${relativePath} frontmatter should define name`);
  assert.match(match[1], /^description:\s*.+$/m, `${relativePath} frontmatter should define description`);
}

function assertOutput(stdout, archivePath, format, { expectStage = false } = {}) {
  assert.match(stdout, new RegExp(`^Archive:\\s+${escapeRegExp(archivePath)}$`, 'm'));
  assert.match(stdout, new RegExp(`^Format:\\s+${escapeRegExp(format)}$`, 'm'));

  const shaMatch = stdout.match(/^SHA-256:\s+([a-f0-9]{64})$/im);
  assert.ok(shaMatch, 'script output should print a SHA-256 digest');

  const actualSha = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  assert.equal(shaMatch[1], actualSha);

  if (!expectStage) {
    return null;
  }

  const stageMatch = stdout.match(/^Stage:\s+(.+)$/m);
  assert.ok(stageMatch, 'script output should print the preserved stage path');
  return stageMatch[1];
}

function listArchiveEntries(format, archivePath) {
  const output =
    format === 'zip'
      ? run('unzip', ['-Z1', archivePath])
      : run('tar', ['-tzf', '-'], { input: fs.readFileSync(archivePath) });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.endsWith('/'))
    .sort();
}

function extractArchive(format, archivePath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (format === 'zip') {
    run('unzip', ['-q', archivePath, '-d', destDir]);
    return;
  }
  run('tar', ['-xzf', '-'], { cwd: destDir, input: fs.readFileSync(archivePath) });
}

function createFixture() {
  assert.equal(fs.existsSync(sourceScript), true, 'scripts/package-codex-plugin.sh should exist');
  assert.match(
    run('git', ['-C', root, 'ls-files', '-s', '--', 'scripts/package-codex-plugin.sh']),
    /^100755 /,
    'scripts/package-codex-plugin.sh should be tracked as executable'
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'razorback-codex-package-'));
  const repo = path.join(tempRoot, 'repo');
  const scriptPath = path.join(repo, 'scripts/package-codex-plugin.sh');

  run('git', ['init', '-q', '-b', 'main', repo]);
  run('git', ['-C', repo, 'config', 'gc.auto', '0']);
  run('git', ['-C', repo, 'config', 'maintenance.auto', 'false']);
  run('git', ['-C', repo, 'config', 'user.email', 't@example.com']);
  run('git', ['-C', repo, 'config', 'user.name', 't']);
  run('git', ['-C', repo, 'config', 'commit.gpgsign', 'false']);
  run('git', ['-C', repo, 'config', 'core.autocrlf', 'false']);

  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.copyFileSync(sourceScript, scriptPath);
  fs.chmodSync(scriptPath, 0o755);

  fs.cpSync(path.join(root, 'skills'), path.join(repo, 'skills'), { recursive: true });
  fs.copyFileSync(path.join(root, 'README.md'), path.join(repo, 'README.md'));
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(repo, 'LICENSE'));

  const sourceManifest = path.join(root, '.codex-plugin', 'plugin.json');
  const sourceSvg = path.join(root, 'assets', 'razorback-small.svg');
  const sourcePng = path.join(root, 'assets', 'app-icon.png');
  const fixtureManifest = path.join(repo, '.codex-plugin', 'plugin.json');
  const fixtureSvg = path.join(repo, 'assets', 'razorback-small.svg');
  const fixturePng = path.join(repo, 'assets', 'app-icon.png');

  if (fs.existsSync(sourceManifest)) {
    fs.mkdirSync(path.dirname(fixtureManifest), { recursive: true });
    fs.copyFileSync(sourceManifest, fixtureManifest);
  } else {
    writeFile(
      fixtureManifest,
      `${JSON.stringify({
        name: 'razorback',
        version: '0.0.0',
        description: 'Razorback skills for Codex',
        author: 'anortham',
        skills: './skills/',
        interface: {
          composerIcon: './assets/razorback-small.svg',
          logo: './assets/app-icon.png',
          logoDark: './assets/app-icon.png'
        }
      }, null, 2)}\n`
    );
  }

  if (fs.existsSync(sourceSvg)) {
    fs.mkdirSync(path.dirname(fixtureSvg), { recursive: true });
    fs.copyFileSync(sourceSvg, fixtureSvg);
  } else {
    writeFile(
      fixtureSvg,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#111"/></svg>\n'
    );
  }

  if (fs.existsSync(sourcePng)) {
    fs.mkdirSync(path.dirname(fixturePng), { recursive: true });
    fs.copyFileSync(sourcePng, fixturePng);
  } else {
    writePng(fixturePng);
  }

  writeFile(path.join(repo, '.agents/plugins/marketplace.json'), '{ "plugins": [] }\n');
  writeFile(path.join(repo, 'hooks/hooks.json'), '{ "hooks": [] }\n');
  writeFile(path.join(repo, 'hooks/session-start'), '#!/usr/bin/env bash\n');
  writeFile(path.join(repo, 'docs/notes.md'), '# docs\n');
  writeFile(path.join(repo, 'tests/ignored.test.mjs'), 'export {};\n');
  writeFile(path.join(repo, '.claude-plugin/plugin.json'), '{}\n');
  writeFile(path.join(repo, '.cursor-plugin/plugin.json'), '{}\n');
  writeFile(path.join(repo, '.opencode/plugins/razorback.js'), 'export {};\n');
  writeFile(path.join(repo, '.memories/checkpoint.md'), '# memory\n');
  writeFile(path.join(repo, '.code-kb/artifact.db'), 'cache\n');
  writeFile(path.join(repo, 'package.json'), '{ "name": "fixture" }\n');

  run('git', ['-C', repo, 'add', '.']);
  const sourceExecutables = listExecutableTrackedSkillFiles(root);
  if (sourceExecutables.length > 0) {
    run('git', ['-C', repo, 'update-index', '--chmod=+x', '--', ...sourceExecutables]);
  }
  run('git', ['-C', repo, 'commit', '-qm', 'fixture']);

  return {
    tempRoot,
    repo,
    scriptPath,
    readmeAtCommit: fs.readFileSync(path.join(repo, 'README.md'), 'utf8')
  };
}

function cleanupFixture(fixture, extraPaths = []) {
  for (const extraPath of extraPaths) {
    if (extraPath && fs.existsSync(extraPath)) {
      fs.rmSync(extraPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
  fs.rmSync(fixture.tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

test('packages a rootless Codex-only archive with every skill and no manifest hooks', { skip: !hasZip || !hasTarGz }, () => {
  const fixture = createFixture();
  const expectedSkillFiles = listSkillFiles(path.join(root, 'skills'));
  const expectedExecutableSkillFiles = listExecutableTrackedSkillFiles(fixture.repo);
  const zipArchive = path.join(fixture.tempRoot, 'razorback-codex.zip');
  const tarArchive = path.join(fixture.tempRoot, 'razorback-codex.tar.gz');

  try {
    const zipOutput = run('bash', [fixture.scriptPath, '--output', zipArchive, '--format', 'zip'], { cwd: fixture.repo });
    const tarOutput = run('bash', [fixture.scriptPath, '--output', tarArchive, '--format', 'tar.gz'], { cwd: fixture.repo });

    assertOutput(zipOutput, zipArchive, 'zip');
    assertOutput(tarOutput, tarArchive, 'tar.gz');
    assert.equal(fs.existsSync(zipArchive), true);
    assert.equal(fs.existsSync(tarArchive), true);

    const zipEntries = listArchiveEntries('zip', zipArchive);
    const tarEntries = listArchiveEntries('tar.gz', tarArchive);

    assert.deepEqual(zipEntries, tarEntries, 'zip and tar.gz should contain the same rootless file paths');
    assert.ok(
      expectedExecutableSkillFiles.length > 0,
      'fixture should contain at least one tracked executable skill script'
    );

    for (const requiredPath of [
      '.codex-plugin/plugin.json',
      'assets/razorback-small.svg',
      'assets/app-icon.png',
      'README.md',
      'LICENSE',
      ...expectedSkillFiles
    ]) {
      assert.ok(zipEntries.includes(requiredPath), `${requiredPath} should be packaged`);
    }

    for (const forbiddenPath of [
      '.agents/plugins/marketplace.json',
      'hooks/hooks.json',
      'hooks/session-start',
      'docs/notes.md',
      'tests/ignored.test.mjs',
      '.claude-plugin/plugin.json',
      '.cursor-plugin/plugin.json',
      '.opencode/plugins/razorback.js',
      '.memories/checkpoint.md',
      '.code-kb/artifact.db',
      'package.json'
    ]) {
      assert.equal(zipEntries.includes(forbiddenPath), false, `${forbiddenPath} should be excluded`);
    }

    const unzipDir = path.join(fixture.tempRoot, 'zip-out');
    extractArchive('zip', zipArchive, unzipDir);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(unzipDir, '.codex-plugin', 'plugin.json'), 'utf8')
    );
    assert.equal(Object.hasOwn(manifest, 'hooks'), false, 'manifest should omit hooks');

    for (const relativePath of expectedSkillFiles) {
      ensureFrontmatter(fs.readFileSync(path.join(unzipDir, relativePath), 'utf8'), relativePath);
    }

    const tarModes = new Map(
      run('tar', ['-tvzf', '-'], { input: fs.readFileSync(tarArchive) })
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim().split(/\s+/))
        .map((fields) => [fields.at(-1).replace(/^\.\//, ''), fields[0]])
    );
    assert.ok(expectedExecutableSkillFiles.length > 0, 'the fixture should track executable skill files');
    for (const relativePath of expectedExecutableSkillFiles) {
      assert.match(
        tarModes.get(relativePath) ?? '',
        /^-..x/,
        `${relativePath} should preserve an executable bit in the tar.gz archive`
      );
    }
  } finally {
    cleanupFixture(fixture);
  }
});

test('refuses dirty fixtures by default and --allow-dirty still packages committed HEAD', { skip: !hasZip }, () => {
  const fixture = createFixture();
  const archivePath = path.join(fixture.tempRoot, 'dirty.zip');

  try {
    fs.writeFileSync(path.join(fixture.repo, 'README.md'), `${fixture.readmeAtCommit}\ndirty working tree\n`);

    const failure = runResult('bash', [fixture.scriptPath, '--output', archivePath, '--format', 'zip'], {
      cwd: fixture.repo
    });
    assert.notEqual(failure.status, 0, 'dirty fixtures should be rejected by default');
    assert.match(`${failure.stderr}${failure.stdout}`, /dirty/i);

    const output = run(
      'bash',
      [fixture.scriptPath, '--output', archivePath, '--format', 'zip', '--allow-dirty'],
      { cwd: fixture.repo }
    );
    assertOutput(output, archivePath, 'zip');

    const unzipDir = path.join(fixture.tempRoot, 'dirty-out');
    extractArchive('zip', archivePath, unzipDir);
    assert.equal(fs.readFileSync(path.join(unzipDir, 'README.md'), 'utf8'), fixture.readmeAtCommit);
  } finally {
    cleanupFixture(fixture);
  }
});

test('supports --ref and --keep-stage against committed fixture history', { skip: !hasTarGz }, () => {
  const fixture = createFixture();
  const archivePath = path.join(fixture.tempRoot, 'previous.tar.gz');
  const previousReadme = fixture.readmeAtCommit;

  try {
    fs.writeFileSync(path.join(fixture.repo, 'README.md'), 'newer commit\n');
    run('git', ['-C', fixture.repo, 'add', 'README.md']);
    run('git', ['-C', fixture.repo, 'commit', '-qm', 'second']);

    const output = run(
      'bash',
      [fixture.scriptPath, '--output', archivePath, '--format', 'tar.gz', '--ref', 'HEAD~1', '--keep-stage'],
      { cwd: fixture.repo }
    );
    const printedStagePath = assertOutput(output, archivePath, 'tar.gz', { expectStage: true });
    const stagePath = process.platform === 'win32' && printedStagePath?.startsWith('/')
      ? run('cygpath', ['-w', printedStagePath]).trim()
      : printedStagePath;

    assert.ok(stagePath);
    assert.equal(fs.existsSync(stagePath), true, 'stage directory should be preserved with --keep-stage');

    const extractDir = path.join(fixture.tempRoot, 'ref-out');
    extractArchive('tar.gz', archivePath, extractDir);
    assert.equal(fs.readFileSync(path.join(extractDir, 'README.md'), 'utf8'), previousReadme);

    cleanupFixture(fixture, [stagePath]);
  } catch (error) {
    cleanupFixture(fixture);
    throw error;
  }
});
