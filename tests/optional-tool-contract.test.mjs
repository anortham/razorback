import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('installation and Codex guidance allow native tools without MCP dependencies', () => {
  for (const path of ['.codex/INSTALL.md', '.opencode/INSTALL.md', 'skills/using-razorback/references/codex-tools.md']) {
    const text = read(path);
    assert.match(text, /code-kb[^\n]*optional/i, path);
    assert.match(text, /native search and file reads/i, path);
    assert.doesNotMatch(text, /assumes both code-kb and Goldfish are available|requires it \(unlike superpowers|exploration directives[^\n]*require it|Install and configure code-kb before using razorback/i, path);
  }
});

test('testing and review skills retain a native source inspection path', () => {
  for (const path of ['test-driven-development/SKILL.md', 'systematic-debugging/SKILL.md', 'receiving-code-review/SKILL.md', 'requesting-code-review/SKILL.md', 'pre-merge-review/verification-protocol.md']) {
    const text = read(`skills/${path}`);
    assert.match(text, /native search and file reads/i, path);
    assert.doesNotMatch(text, /Inspect the symbol with code-kb|Verify every finding with code-kb|Verify with code-kb:/i, path);
  }
});

test('document reviewers verify missing index results against source', () => {
  for (const path of ['brainstorming/spec-document-reviewer-prompt.md', 'writing-plans/plan-document-reviewer-prompt.md']) {
    const text = read(`skills/${path}`);
    assert.match(text, /native search and file reads/i, path);
    assert.match(text, /missing index result is not proof/i, path);
    assert.doesNotMatch(text, /Do not read whole files|CLI flag that code-kb cannot find/i, path);
  }
});

test('isolated workers and publication can proceed without a Goldfish checkpoint', () => {
  for (const path of ['subagent-driven-development/implementer-prompt.md', 'subagent-driven-development/fix-prompt.md']) {
    assert.match(read(`skills/${path}`), /If Goldfish is unavailable, record the decision or failure in your report/i, path);
  }
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');
  assert.match(finishing, /Without Goldfish, the run report carries the handoff/i);
  assert.doesNotMatch(finishing, /git add <checkpoint-path>/);
});
