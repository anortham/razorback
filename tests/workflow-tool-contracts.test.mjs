import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const activeMatches = (pattern) => {
  const result = spawnSync('git', [
    'grep', '--untracked', '-n', '-E', pattern, '--', '.',
    ':!docs/plans', ':!.memories', ':!tests/workflow-tool-contracts.test.mjs',
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
  assert.match(skill, /including a single task/i);
  assert.match(skill, /explicitly selects single-agent execution/i);
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

test('debt audit stays code-kb-only and reports incomplete evidence honestly', () => {
  const skill = read('skills/harvesting-debt/SKILL.md');

  assert.doesNotMatch(skill, /grep -rn/);
  assert.doesNotMatch(skill, /\*\*Grep fallback\*\*/);
  assert.match(skill, /search_symbols/);
  assert.match(skill, /incomplete audit/i);
  assert.match(skill, /evidence gap/i);
});

test('external reviewers receive a lead-built code-kb evidence bundle without MCP access', () => {
  const bootstrap = read('skills/using-razorback/SKILL.md');
  const subagent = read('skills/using-razorback/references/subagent-toolchain.md');
  const canonical = read('skills/using-razorback/references/instruction-tier.md');
  const project = read('CLAUDE.md');
  const preMerge = read('skills/pre-merge-review/SKILL.md');
  const claude = read('skills/pre-merge-review/reviewer-prompts/claude.md');
  const codex = read('skills/pre-merge-review/reviewer-prompts/codex.md');

  for (const text of [bootstrap, subagent, canonical, project]) {
    assert.match(text, /external CLI reviewers/i);
    assert.match(text, /code-kb-backed\s+evidence/i);
  }

  for (const text of [preMerge, claude, codex]) {
    assert.match(text, /does not run code-kb/i);
    assert.match(text, /missing evidence/i);
  }

  assert.match(preMerge, /CODE_KB_EVIDENCE/);
  assert.match(claude, /Lead code-kb evidence:\n\$CODE_KB_EVIDENCE/);
  assert.match(codex, /\$CODE_KB_EVIDENCE/);
  assert.match(claude, /--strict-mcp-config/);
  assert.match(claude, /--tools "Read,Grep,Glob"/);
  assert.doesNotMatch(claude, /--tools "[^"]*Bash/);
  assert.match(codex, /-s read-only/);
});

test('active files do not reference legacy code-kb tool names find_symbol, get_context_slice, or code_kb_stats', () => {
  const result = activeMatches('(find_symbol|get_context_slice|code_kb_stats)');

  assert.equal(
    result,
    '',
    `Active repository files must not name find_symbol, get_context_slice, or code_kb_stats:\n${result}`
  );
});

test('active guidance uses native editing tools instead of code-kb edit tools', () => {
  const guidance = [
    'skills/using-razorback/SKILL.md',
    'skills/using-razorback/references/instruction-tier.md',
    'skills/using-razorback/references/subagent-toolchain.md',
  ];

  for (const file of guidance) {
    assert.match(read(file), /Use your host's native editing tools to modify files\./);
  }

  const result = activeMatches('replace_symbol_body');

  assert.equal(result, '', `Active repository files still reference the removed edit tool:\n${result}`);
});
