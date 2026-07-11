import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const WORKFLOW = '.github/workflows/test.yml';

test('CI workflow file exists', () => {
  assert.equal(
    fs.existsSync(path.join(root, WORKFLOW)),
    true,
    `${WORKFLOW} must exist so tests and the version audit run in CI`
  );
});

test('CI workflow triggers on push to main, v* tags, and pull requests', () => {
  const workflow = readText(WORKFLOW);

  assert.match(workflow, /^on:$/m, 'workflow must declare an `on:` trigger block');
  assert.match(workflow, /^\s+push:$/m, 'workflow must trigger on push');
  assert.match(workflow, /branches:\s*\[\s*main\s*\]/, 'push must be scoped to the main branch');
  assert.match(workflow, /tags:\s*\[\s*'v\*'\s*\]/, "push must include the 'v*' tag pattern");
  assert.match(workflow, /^\s+pull_request:$/m, 'workflow must trigger on pull_request');
});

test('CI workflow checks out the repo and sets up Node 22', () => {
  const workflow = readText(WORKFLOW);

  assert.match(workflow, /uses:\s*actions\/checkout@v4/, 'workflow must check out the repo');
  assert.match(workflow, /uses:\s*actions\/setup-node@v4/, 'workflow must set up Node');
  assert.match(workflow, /node-version:\s*'22'/, 'workflow must pin Node 22');
});

test('CI workflow runs the full test suite', () => {
  const workflow = readText(WORKFLOW);
  assert.match(workflow, /run:\s*npm test$/m, 'workflow must run `npm test`');
});

test('CI workflow runs the version audit', () => {
  const workflow = readText(WORKFLOW);
  assert.match(
    workflow,
    /run:\s*\.\/scripts\/bump-version\.sh --audit$/m,
    'workflow must run `./scripts/bump-version.sh --audit` to detect version drift'
  );
});

test('CI workflow gates v* tags on the tag matching the manifest version', () => {
  const workflow = readText(WORKFLOW);

  // The audit only proves the manifests agree with each other. It cannot catch
  // the case where every manifest is stale together, so tag runs must also
  // compare the tag name against the shared manifest version.
  assert.match(
    workflow,
    /if:\s*github\.ref_type == 'tag'/,
    'the tag-version gate must be guarded by `if: github.ref_type == \'tag\'`'
  );
  assert.match(
    workflow,
    /jq -r \.version package\.json/,
    'the tag gate must read the manifest version from package.json'
  );
  assert.match(
    workflow,
    /\$\{GITHUB_REF_NAME#v\}/,
    'the tag gate must strip the leading `v` from the tag name'
  );

  // Scope the failure assertion to the gate step itself, so an `exit 1`
  // elsewhere in the workflow could never satisfy this test.
  const gateStep = workflow.slice(workflow.indexOf("if: github.ref_type == 'tag'"));
  assert.match(
    gateStep,
    /exit 1/,
    'the tag gate must fail the run when the tag and manifest version disagree'
  );
});

test('package.json exposes a test script that runs the node:test suite', () => {
  const pkg = readJson('package.json');

  assert.equal(
    typeof pkg.scripts?.test,
    'string',
    'package.json must define a `test` script so CI and contributors can run `npm test`'
  );
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.mjs');
});
