import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const repositoryRoot = dirname(import.meta.dirname);
const script = join(repositoryRoot, 'skills/pre-merge-review/scripts/prepare-review-tree');
const testRoot = mkdtempSync(join(tmpdir(), 'pre-merge-review-isolation-'));

test.after(() => rmSync(testRoot, { recursive: true, force: true }));

const gitIdentity = [
  '-c',
  'user.email=test@example.com',
  '-c',
  'user.name=review-tree-test',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'gc.auto=0',
  '-c',
  'maintenance.auto=false',
];

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function createRepository() {
  const caseRoot = mkdtempSync(join(testRoot, 'case-'));
  const repo = join(caseRoot, 'repo');
  mkdirSync(repo, { recursive: true });
  git(caseRoot, 'init', '-q', '-b', 'main', repo);
  writeFileSync(join(repo, 'tracked.txt'), 'tracked\n');
  git(repo, 'add', 'tracked.txt');
  git(repo, ...gitIdentity, 'commit', '-qm', 'tracked baseline');
  return { caseRoot, repo };
}

function runScript(repo, ref, output) {
  return spawnSync('bash', [script, repo, ref, output], {
    cwd: repo,
    encoding: 'utf8',
  });
}

function commandPath(command) {
  const result = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function portablePath() {
  const bin = mkdtempSync(join(testRoot, 'portable-bin-'));
  for (const command of ['bash', 'git', 'node']) {
    symlinkSync(commandPath(command), join(bin, command));
  }
  const tar = join(bin, 'tar');
  writeFileSync(
    tar,
    `#!/bin/sh
for argument do
  case "$argument" in
    --no-same-owner|--no-same-permissions) exit 90 ;;
  esac
done
exec "${commandPath('tar')}" "$@"
`,
  );
  chmodSync(tar, 0o755);
  return bin;
}

function read(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), 'utf8');
}

function bashBlocks(text) {
  return [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
}

test('exports the reviewed tracked tree without live git metadata or untracked files', () => {
  const { caseRoot, repo } = createRepository();
  writeFileSync(join(repo, 'untracked.txt'), 'must stay out\n');
  const output = join(caseRoot, 'review-tree');

  const result = runScript(repo, 'HEAD', output);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(output, 'tracked.txt'), 'utf8'), 'tracked\n');
  assert.equal(existsSync(join(output, 'untracked.txt')), false);
  assert.equal(existsSync(join(output, '.git')), false);
  assert.ok(relative(repo, output).startsWith('..'), 'review tree must be outside the source repository');
});

test('exports the requested Git ref instead of the current worktree state', () => {
  const { caseRoot, repo } = createRepository();
  writeFileSync(join(repo, 'tracked.txt'), 'later\n');
  writeFileSync(join(repo, 'later.txt'), 'later\n');
  git(repo, 'add', 'tracked.txt', 'later.txt');
  git(repo, ...gitIdentity, 'commit', '-qm', 'later state');
  const output = join(caseRoot, 'review-tree');

  const result = runScript(repo, 'HEAD~1', output);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(output, 'tracked.txt'), 'utf8'), 'tracked\n');
  assert.equal(existsSync(join(output, 'later.txt')), false);
});

test('neutralizes a tracked symlink that resolves outside the exported tree', () => {
  const { caseRoot, repo } = createRepository();
  const outside = join(caseRoot, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'marker.txt'), 'outside\n');
  symlinkSync(outside, join(repo, 'escape-absolute'));
  symlinkSync('../outside', join(repo, 'escape-relative'));
  git(repo, 'add', 'escape-absolute', 'escape-relative');
  git(repo, ...gitIdentity, 'commit', '-qm', 'tracked escaping symlink');
  const output = join(caseRoot, 'review-tree');

  const result = runScript(repo, 'HEAD', output);

  assert.equal(result.status, 0, result.stderr);
  for (const name of ['escape-absolute', 'escape-relative']) {
    const escapedPath = join(output, name);
    if (existsSync(escapedPath)) {
      assert.equal(lstatSync(escapedPath).isSymbolicLink(), false);
    }
    assert.equal(existsSync(join(escapedPath, 'marker.txt')), false);
  }
  assert.equal(readFileSync(join(outside, 'marker.txt'), 'utf8'), 'outside\n');
});

test('rejects an output directory inside the source repository', () => {
  const { repo } = createRepository();
  const output = join(repo, 'review-tree');

  const result = runScript(repo, 'HEAD', output);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside.*repository|repository.*outside/i);
  assert.equal(existsSync(output), false);
});

test('leaves cleanup to the caller after the export process exits', () => {
  const { caseRoot, repo } = createRepository();
  const output = join(caseRoot, 'review-tree');

  const result = runScript(repo, 'HEAD', output);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(output), true);
  rmSync(output, { recursive: true, force: true });
  assert.equal(existsSync(output), false);
});

test('exports without external realpath or GNU-only tar flags', () => {
  const { caseRoot, repo } = createRepository();
  const output = join(caseRoot, 'review-tree');
  const env = { ...process.env, PATH: portablePath() };

  const result = spawnSync('bash', [script, repo, 'HEAD', output], {
    cwd: repo,
    encoding: 'utf8',
    env,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(output, 'tracked.txt'), 'utf8'), 'tracked\n');
});

const CODEX_EXEC = '"$SKILL_DIR/../codex-cli/scripts/codex-exec"';

test('runs both reviewer adapters from the exported tree with their approved isolation flags', () => {
  const skill = read('skills/pre-merge-review/SKILL.md');
  const claude = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const codex = read('skills/pre-merge-review/reviewer-prompts/codex.md');

  const preparationBlock = bashBlocks(skill).find((block) => block.includes('prepare-review-tree'));
  assert.ok(preparationBlock, 'pre-merge skill should invoke the review-tree helper');
  assert.match(preparationBlock, /"\$PROJECT_DIR" "\$REVIEW_REF" "\$REVIEW_ROOT"/);

  const claudeBlock = bashBlocks(claude).find((block) => block.includes('claude -p'));
  assert.ok(claudeBlock, 'pre-merge Claude prompt should document a claude invocation');
  assert.match(claudeBlock, /cd "\$REVIEW_ROOT" && claude -p/);
  assert.match(claudeBlock, /--safe-mode/);
  assert.match(claudeBlock, /--tools "Read,Grep,Glob"/);
  assert.match(claudeBlock, /--strict-mcp-config/);

  const codexBlock = bashBlocks(codex).find((block) => block.includes(CODEX_EXEC));
  assert.ok(codexBlock, 'pre-merge Codex prompt should dispatch through the codex-exec wrapper');
  assert.match(codexBlock, /cd "\$REVIEW_ROOT"[\s\S]*"\$SKILL_DIR\/\.\.\/codex-cli\/scripts\/codex-exec"/);
  assert.match(codexBlock, /-s read-only/);
  assert.match(codexBlock, /--skip-git-repo-check/);
  assert.match(codexBlock, /--ignore-user-config/);
  assert.match(codexBlock, /--ignore-rules/);

  assert.match(skill, /rm -rf -- "\$REVIEW_ROOT"/);
});

test('documents that practical reviewer isolation is not host-wide read confinement', () => {
  assert.match(read('skills/pre-merge-review/SKILL.md'), /not host-wide read confinement/i);
});

test('pre-merge adapters use the selected prompt file on stdin', () => {
  const prompt = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const codex = read('skills/pre-merge-review/reviewer-prompts/codex.md');
  const blocks = bashBlocks(prompt).filter((block) => block.includes('claude -p'));
  const codexBlocks = bashBlocks(codex).filter((block) => block.includes(CODEX_EXEC));

  assert.ok(blocks.some((block) => /< "\$REVIEW_PROMPT_FILE"/.test(block)));
  for (const block of blocks) {
    assert.doesNotMatch(block, /"\$DIFF_AND_CONTEXT"/);
    assert.doesNotMatch(block, /IFS= read -r -d '' DIFF_AND_CONTEXT/);
  }
  assert.ok(codexBlocks.some((block) => /cat "\$REVIEW_PROMPT_FILE" \| "\$SKILL_DIR\/\.\.\/codex-cli\/scripts\/codex-exec"/.test(block)));
  for (const block of codexBlocks) {
    assert.doesNotMatch(block, /echo "\$ADVERSARIAL_PROMPT_WITH_DIFF"/);
  }
});

test('pre-merge payload construction includes the complete diff, stat, and commit log', () => {
  const skill = read('skills/pre-merge-review/SKILL.md');
  const prompt = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const codex = read('skills/pre-merge-review/reviewer-prompts/codex.md');

  assert.match(skill, /DIFF=\$\(git diff[\s\S]*?HEAD/);
  assert.match(skill, /FILE_STAT=\$\(git diff --stat/);
  assert.match(skill, /COMMIT_LOG=\$\(git log --oneline/);
  assert.match(prompt, /Diff:\n\$DIFF/);
  assert.match(codex, /\$FILE_STAT[\s\S]*?\$COMMIT_LOG[\s\S]*?\$DIFF/);
});
