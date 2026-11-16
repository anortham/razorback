import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { read, root } from './helpers/repo.mjs';

const activeMatches = (pattern) => {
  const result = spawnSync('git', [
    'grep', '--untracked', '-n', '-E', pattern, '--', '.',
    ':!docs/plans', ':!docs/specs', ':!.memories', ':!TODO.md', ':!.gitignore',
    ':!tests/workflow-tool-contracts.test.mjs',
  ], { cwd: root, encoding: 'utf8' });
  assert.ok(result.status === 0 || result.status === 1, result.stderr || result.error?.message);
  return result.stdout.trim();
};

test('bootstrap states achievable instruction priority and capability-based execution routing', () => {
  const skill = read('skills/using-razorback/SKILL.md');

  assert.doesNotMatch(skill, /skills override default system prompt behavior/i);
  assert.match(skill, /system and developer instructions/i);
  assert.match(skill, /override razorback skill defaults/);
  assert.match(skill, /delegation is available and permitted/i);
  assert.match(skill, /\*\*Default:\*\* the current agent does one coherent task directly\. No plan file, no worker, no task report\./);
  assert.doesNotMatch(skill, /including a single task/i);
  assert.doesNotMatch(skill, /\*\*2\+ tasks:\*\*/);
});

test('bootstrap chooses process from risk instead of forcing skill loads', () => {
  const skill = read('skills/using-razorback/SKILL.md');

  assert.doesNotMatch(skill, /1% chance/);
  assert.doesNotMatch(skill, /YOU DO NOT HAVE A CHOICE/);
  assert.doesNotMatch(skill, /before any response or action/i);
  assert.match(skill, /Clear, ordinary work proceeds directly/);
  assert.match(skill, /\*\*Uncertainty:\*\*/);
  assert.match(skill, /\*\*Consequence:\*\*/);
  assert.match(skill, /\*\*Coordination:\*\*/);
  assert.match(skill, /A file or line count alone is not a risk assessment/);
  assert.match(skill, /A bug fix still finds the root cause/);
});

test('Codex mapping follows live schemas and treats wait wakeups as notifications', () => {
  const mapping = read('skills/using-razorback/references/codex-tools.md');

  assert.doesNotMatch(mapping, /verified on codex/i);
  assert.doesNotMatch(mapping, /there is no `agent_type`/);
  assert.doesNotMatch(mapping, /`update_plan`/);
  assert.match(mapping, /live callable tool schemas/i);
  assert.match(mapping, /message, timeout, or completion/i);
  assert.match(mapping, /inspect the returned status or completion payload/i);
  assert.match(mapping, /durable plan, checklist, or execution ledger/i);
});

test('external reviewers receive a lead-built source evidence bundle without MCP access', () => {
  const preMerge = read('skills/pre-merge-review/SKILL.md');
  const claude = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const codex = read('skills/pre-merge-review/reviewer-prompts/codex.md');

  for (const text of [preMerge, claude, codex]) {
    assert.match(text, /missing evidence/i);
  }

  assert.match(preMerge, /SOURCE_EVIDENCE/);
  assert.match(claude, /Lead source evidence:\n\$SOURCE_EVIDENCE/);
  assert.match(codex, /\$SOURCE_EVIDENCE/);
});

test('active files do not name code-kb or its tools', () => {
  const result = activeMatches(
    '(code-kb|code_kb|file_skeleton|lookup_symbol|get_symbol_body|get_symbol_context|find_references|blast_radius|check_edit)'
  );

  assert.equal(result, '', `Active repository files must not name code-kb or a code-kb tool:\n${result}`);
});
