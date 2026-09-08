import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const cli = join(root, 'scripts', 'workflow-eval.mjs');
const fixtureRoot = join(root, 'tests', 'fixtures', 'workflow-eval');
const testRoot = mkdtempSync(join(tmpdir(), 'razorback-workflow-eval-'));

test.after(() => rmSync(testRoot, { recursive: true, force: true }));

function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function prepare(output, options = {}) {
  const args = [
    'prepare',
    '--repo', options.repo ?? root,
    '--source', options.source ?? 'worktree',
    '--output', output,
  ];
  if (options.scenarios) args.push('--scenarios', options.scenarios);
  const result = run(...args);
  assert.equal(result.status, 0, result.stderr);
  return readJson(output);
}

function materializeValidAnswers(packets) {
  const decisions = readJson(join(fixtureRoot, 'valid-decisions.json'));
  return {
    ...decisions,
    cases: decisions.cases.map((decision) => ({
      ...decision,
      packet_id: packets.cases.find(({ id }) => id === decision.id).packet_id,
    })),
  };
}

function grade(packets, answers) {
  const caseDir = mkdtempSync(join(testRoot, 'grade-'));
  const packetsPath = join(caseDir, 'packets.json');
  const answersPath = join(caseDir, 'answers.json');
  const outputPath = join(caseDir, 'report.json');
  writeFileSync(packetsPath, JSON.stringify(packets));
  writeFileSync(answersPath, typeof answers === 'string' ? answers : JSON.stringify(answers));
  const result = run('grade', '--packets', packetsPath, '--answers', answersPath, '--output', outputPath);
  return { result, report: result.status === 0 || result.status === 1 ? readJson(outputPath) : null };
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

test('prepare emits ten blind, source-linked scenario packets', () => {
  const output = join(testRoot, 'blind-packets.json');
  const packets = prepare(output);

  assert.deepEqual(packets.cases.map(({ id }) => id), [
    'approval',
    'push_recovery',
    'checkpoint',
    'single_task',
    'missing_miller',
    'restricted_reviewer',
    'live_tools',
    'instruction_priority',
    'interrupted_run',
    'parallel_commit',
  ]);
  assert.equal(packets.source.kind, 'working-tree');
  assert.match(packets.source.revision, /^[0-9a-f]{40}$/);
  assert.match(packets.source.source_set_hash, /^[0-9a-f]{64}$/);
  assert.ok(packets.action_vocabulary.includes('force_push'));
  assert.deepEqual(packets.answer_schema.required, [
    'id',
    'packet_id',
    'actions',
    'terminal_state',
    'user_questions',
  ]);
  for (const scenario of packets.cases) {
    assert.match(scenario.packet_id, /^[0-9a-f]{64}$/);
    assert.ok(scenario.facts.length > 0);
    assert.ok(scenario.workflow.every(({ path, sha256, text }) => path && /^[0-9a-f]{64}$/.test(sha256) && text));
  }
  const keys = collectKeys(packets);
  for (const oracleKey of ['allowed_actions', 'required_actions', 'forbidden_actions', 'ordered_actions', 'terminal_states']) {
    assert.equal(keys.has(oracleKey), false, `blind packet exposed ${oracleKey}`);
  }
});

test('prepare reads an explicit git ref separately from working-tree content', () => {
  const repo = mkdtempSync(join(testRoot, 'repo-'));
  mkdirSync(join(repo, 'fixtures'), { recursive: true });
  writeFileSync(join(repo, 'workflow.md'), 'baseline workflow\n');
  writeFileSync(join(repo, 'fixtures', 'scenarios.json'), JSON.stringify({
    schema_version: 1,
    scenarios: [{ id: 'sample', facts: ['Choose from current evidence.'], workflow_files: ['workflow.md'] }],
  }));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Workflow Eval Test');
  git(repo, 'config', 'user.email', 'workflow-eval@example.invalid');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'baseline');
  const baselineRevision = git(repo, 'rev-parse', 'HEAD');
  writeFileSync(join(repo, 'workflow.md'), 'revised workflow\n');

  const baseline = prepare(join(repo, 'baseline.json'), {
    repo,
    source: 'HEAD',
    scenarios: join(repo, 'fixtures', 'scenarios.json'),
  });
  const revised = prepare(join(repo, 'revised.json'), {
    repo,
    source: 'worktree',
    scenarios: join(repo, 'fixtures', 'scenarios.json'),
  });

  assert.equal(baseline.source.kind, 'git-ref');
  assert.equal(baseline.source.revision, baselineRevision);
  assert.equal(baseline.cases[0].workflow[0].text, 'baseline workflow\n');
  assert.equal(revised.cases[0].workflow[0].text, 'revised workflow\n');
  assert.notEqual(baseline.source.source_set_hash, revised.source.source_set_hash);
  assert.notEqual(baseline.cases[0].packet_id, revised.cases[0].packet_id);
});

test('git-ref preparation ignores a current working-tree symlink', () => {
  const repo = mkdtempSync(join(testRoot, 'historical-repo-'));
  const outside = join(testRoot, 'historical-outside.md');
  const scenariosPath = join(repo, 'scenarios.json');
  writeFileSync(join(repo, 'workflow.md'), 'committed workflow\n');
  writeFileSync(scenariosPath, JSON.stringify({
    schema_version: 1,
    scenarios: [{ id: 'sample', facts: ['Use historical evidence.'], workflow_files: ['workflow.md'] }],
  }));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Workflow Eval Test');
  git(repo, 'config', 'user.email', 'workflow-eval@example.invalid');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'baseline');
  rmSync(join(repo, 'workflow.md'));
  writeFileSync(outside, 'outside workflow\n');
  symlinkSync(outside, join(repo, 'workflow.md'));

  const baseline = prepare(join(repo, 'baseline.json'), {
    repo,
    source: 'HEAD',
    scenarios: scenariosPath,
  });

  assert.equal(baseline.cases[0].workflow[0].text, 'committed workflow\n');
});

test('grade accepts the checked-in valid decisions when linked to their packets', () => {
  const packets = prepare(join(testRoot, 'valid-packets.json'));
  const { result, report } = grade(packets, materializeValidAnswers(packets));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.success, true);
  assert.deepEqual(report.summary, { total: 10, passed: 10, failed: 0 });
  assert.deepEqual(report.measurements, {
    latency_ms: 'unavailable',
    input_tokens: 'unavailable',
    output_tokens: 'unavailable',
  });
  assert.equal(report.evidence_kind, 'deterministic-fixture');
  assert.match(report.expectation_manifest_hash, /^[0-9a-f]{64}$/);
});

test('grade rejects malformed answer JSON', () => {
  const packets = prepare(join(testRoot, 'malformed-packets.json'));
  const { result } = grade(packets, '{');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid JSON/i);
});

test('grade rejects missing, duplicate, and unknown scenario IDs', () => {
  const packets = prepare(join(testRoot, 'case-set-packets.json'));
  const answers = materializeValidAnswers(packets);

  const missing = structuredClone(answers);
  missing.cases.pop();
  assert.match(grade(packets, missing).report.errors.join('\n'), /missing case parallel_commit/);

  const duplicate = structuredClone(answers);
  duplicate.cases.push(structuredClone(duplicate.cases[0]));
  assert.match(grade(packets, duplicate).report.errors.join('\n'), /duplicate case approval/);

  const unknown = structuredClone(answers);
  unknown.cases.push({ ...structuredClone(unknown.cases[0]), id: 'unknown' });
  assert.match(grade(packets, unknown).report.errors.join('\n'), /unknown case unknown/);
});

test('grade rejects unknown actions, forbidden choices, and duplicate actions', () => {
  const packets = prepare(join(testRoot, 'unsafe-packets.json'));
  const answers = materializeValidAnswers(packets);

  const unknown = structuredClone(answers);
  unknown.cases[0].actions.push('invented_action');
  assert.match(grade(packets, unknown).report.cases[0].reasons.join('\n'), /unknown action invented_action/);

  const forbidden = structuredClone(answers);
  forbidden.cases[0].actions.push('push_branch');
  assert.match(grade(packets, forbidden).report.cases[0].reasons.join('\n'), /forbidden action push_branch/);

  const duplicate = structuredClone(answers);
  duplicate.cases[0].actions.push('complete_local_materials');
  assert.match(grade(packets, duplicate).report.cases[0].reasons.join('\n'), /duplicate action complete_local_materials/);
});

test('grade enforces required operation ordering', () => {
  const packets = prepare(join(testRoot, 'ordered-packets.json'));
  const answers = materializeValidAnswers(packets);
  const pushRecovery = answers.cases.find(({ id }) => id === 'push_recovery');
  pushRecovery.actions = ['retry_push', 'diagnose_network', 'check_remote_tip', 'confirm_remote'];

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'push_recovery').reasons.join('\n'), /retry_push must occur after check_remote_tip/);
});

test('grade requires pre-commit checkpoints before staging', () => {
  const packets = prepare(join(testRoot, 'checkpoint-order-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases.find(({ id }) => id === 'checkpoint').actions = [
    'stage_intended_files',
    'checkpoint_precommit',
    'commit_task',
    'record_commit_sha',
  ];
  answers.cases.find(({ id }) => id === 'parallel_commit').actions = [
    'stage_task_a_files',
    'checkpoint_precommit',
    'commit_task_a',
  ];

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'checkpoint').reasons.join('\n'), /stage_intended_files must occur after checkpoint_precommit/);
  assert.match(report.cases.find(({ id }) => id === 'parallel_commit').reasons.join('\n'), /stage_task_a_files must occur after checkpoint_precommit/);
});

test('grade requires interrupted work reconciliation before completion', () => {
  const packets = prepare(join(testRoot, 'interrupted-order-packets.json'));
  const answers = materializeValidAnswers(packets);
  const interrupted = answers.cases.find(({ id }) => id === 'interrupted_run');
  interrupted.actions = [
    'recall_memory',
    'inspect_plan',
    'inspect_ledger',
    'inspect_git',
    'mark_task_complete',
    'reconcile_uncommitted',
  ];

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'interrupted_run').reasons.join('\n'), /mark_task_complete must occur after reconcile_uncommitted/);
});

test('grade rejects more than one Miller restoration question', () => {
  const packets = prepare(join(testRoot, 'question-range-packets.json'));
  const oneQuestion = materializeValidAnswers(packets);
  const missingMiller = oneQuestion.cases.find(({ id }) => id === 'missing_miller');
  missingMiller.actions = ['preserve_evidence', 'request_miller_enablement'];
  missingMiller.terminal_state = 'awaiting_user';
  missingMiller.user_questions = 1;

  assert.equal(grade(packets, oneQuestion).result.status, 0);

  const twoQuestions = structuredClone(oneQuestion);
  twoQuestions.cases.find(({ id }) => id === 'missing_miller').user_questions = 2;
  const { result, report } = grade(packets, twoQuestions);
  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'missing_miller').reasons.join('\n'), /user_questions must be between 0 and 1/);
});

test('grade still requires exactly one publication approval question', () => {
  const packets = prepare(join(testRoot, 'approval-question-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases.find(({ id }) => id === 'approval').user_questions = 0;

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'approval').reasons.join('\n'), /user_questions must equal 1/);
});

test('grade accepts active simulation terminals for planned delegation sequences', () => {
  const packets = prepare(join(testRoot, 'simulation-terminal-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases.find(({ id }) => id === 'single_task').terminal_state = 'active';
  answers.cases.find(({ id }) => id === 'live_tools').terminal_state = 'active';

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 0, JSON.stringify(report));
});

test('grade requires the full push recovery sequence from the failed attempt', () => {
  const packets = prepare(join(testRoot, 'push-boundary-packets.json'));
  const answers = materializeValidAnswers(packets);
  const recovery = answers.cases.find(({ id }) => id === 'push_recovery');
  recovery.actions = recovery.actions.filter((action) => action !== 'diagnose_network');

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'push_recovery').reasons.join('\n'), /missing required action diagnose_network/);
});

test('grade accepts safe extended workflow sequences', () => {
  const packets = prepare(join(testRoot, 'extended-sequence-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases.find(({ id }) => id === 'push_recovery').terminal_state = 'active';
  answers.cases.find(({ id }) => id === 'checkpoint').actions.push('mark_task_complete');
  answers.cases.find(({ id }) => id === 'single_task').actions = [
    'dispatch_implementer',
    'checkpoint_precommit',
    'worker_commit',
    'lead_spec_review',
    'lead_quality_review',
    'mark_task_complete',
  ];
  answers.cases.find(({ id }) => id === 'restricted_reviewer').actions.push('follow_host_restrictions');
  answers.cases.find(({ id }) => id === 'live_tools').actions.push('mark_task_complete');
  answers.cases.find(({ id }) => id === 'interrupted_run').actions = [
    'recall_memory',
    'inspect_plan',
    'inspect_ledger',
    'inspect_git',
    'reconcile_uncommitted',
    'checkpoint_precommit',
    'stage_intended_files',
    'commit_task',
    'record_commit_sha',
    'mark_task_complete',
  ];
  answers.cases.find(({ id }) => id === 'parallel_commit').actions.push('record_commit_sha', 'mark_task_complete');

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 0, JSON.stringify(report));
});

test('grade rejects optional completion before its evidence', () => {
  const packets = prepare(join(testRoot, 'early-completion-packets.json'));
  const answers = materializeValidAnswers(packets);
  const checkpoint = answers.cases.find(({ id }) => id === 'checkpoint');
  checkpoint.actions = [
    'checkpoint_precommit',
    'stage_intended_files',
    'commit_task',
    'mark_task_complete',
    'record_commit_sha',
  ];

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'checkpoint').reasons.join('\n'), /mark_task_complete must occur after record_commit_sha/);
});

test('grade rejects selected commits without checkpoint and staging prerequisites', () => {
  const packets = prepare(join(testRoot, 'commit-dependency-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases.find(({ id }) => id === 'single_task').actions.splice(1, 0, 'worker_commit');
  const interrupted = answers.cases.find(({ id }) => id === 'interrupted_run');
  interrupted.actions.splice(-1, 0, 'commit_task');

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'single_task').reasons.join('\n'), /worker_commit requires checkpoint_precommit/);
  const interruptedReasons = report.cases.find(({ id }) => id === 'interrupted_run').reasons.join('\n');
  assert.match(interruptedReasons, /commit_task requires checkpoint_precommit/);
  assert.match(interruptedReasons, /commit_task requires stage_intended_files/);
});

test('grade accepts either Miller block outcome and rejects mismatched restoration questions', () => {
  const packets = prepare(join(testRoot, 'miller-outcome-packets.json'));
  const restoration = materializeValidAnswers(packets);
  const missingMiller = restoration.cases.find(({ id }) => id === 'missing_miller');
  missingMiller.actions = ['preserve_evidence', 'request_miller_enablement'];
  missingMiller.terminal_state = 'awaiting_user';
  missingMiller.user_questions = 1;

  assert.equal(grade(packets, restoration).result.status, 0);

  const mismatched = structuredClone(restoration);
  mismatched.cases.find(({ id }) => id === 'missing_miller').user_questions = 0;
  const { result, report } = grade(packets, mismatched);
  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'missing_miller').reasons.join('\n'), /request_miller_enablement requires user_questions between 1 and 1/);
});

test('grade accepts reporting the Miller blocker while asking once for restoration', () => {
  const packets = prepare(join(testRoot, 'combined-miller-outcome-packets.json'));
  const answers = materializeValidAnswers(packets);
  const missingMiller = answers.cases.find(({ id }) => id === 'missing_miller');
  missingMiller.actions = ['preserve_evidence', 'report_blocked', 'request_miller_enablement'];
  missingMiller.terminal_state = 'awaiting_user';
  missingMiller.user_questions = 1;

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 0, JSON.stringify(report));
});

test('grade rejects a Miller restoration request with blocked terminal state', () => {
  const packets = prepare(join(testRoot, 'mismatched-miller-state-packets.json'));
  const answers = materializeValidAnswers(packets);
  const missingMiller = answers.cases.find(({ id }) => id === 'missing_miller');
  missingMiller.actions = ['preserve_evidence', 'report_blocked', 'request_miller_enablement'];
  missingMiller.terminal_state = 'blocked';
  missingMiller.user_questions = 1;

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'missing_miller').reasons.join('\n'), /request_miller_enablement requires terminal_state awaiting_user/);
});

test('grade accepts safe evidence and follow-through alternatives across cases', () => {
  const packets = prepare(join(testRoot, 'safe-alternatives-packets.json'));
  const answers = materializeValidAnswers(packets);
  const singleTask = answers.cases.find(({ id }) => id === 'single_task');
  singleTask.actions = [
    'dispatch_implementer',
    'checkpoint_precommit',
    'worker_commit',
    'lead_spec_review',
    'lead_quality_review',
    'record_commit_sha',
    'mark_task_complete',
  ];
  const missingMiller = answers.cases.find(({ id }) => id === 'missing_miller');
  missingMiller.actions.splice(1, 0, 'report_evidence_gaps');
  const liveTools = answers.cases.find(({ id }) => id === 'live_tools');
  liveTools.actions = [
    'track_durable_plan',
    'spawn_agent',
    'check_agent_completion',
    'lead_spec_review',
    'lead_quality_review',
    'mark_task_complete',
  ];
  answers.cases.find(({ id }) => id === 'parallel_commit').terminal_state = 'active';

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 0, JSON.stringify(report));
});

test('grade rejects unsafe follow-through order and an invented native task tool', () => {
  const packets = prepare(join(testRoot, 'unsafe-alternatives-packets.json'));
  const answers = materializeValidAnswers(packets);
  const singleTask = answers.cases.find(({ id }) => id === 'single_task');
  singleTask.actions = [
    'dispatch_implementer',
    'checkpoint_precommit',
    'record_commit_sha',
    'worker_commit',
    'lead_spec_review',
    'lead_quality_review',
  ];
  const liveTools = answers.cases.find(({ id }) => id === 'live_tools');
  liveTools.actions = [
    'track_durable_plan',
    'use_native_task_tool',
    'spawn_agent',
    'lead_spec_review',
    'check_agent_completion',
    'lead_quality_review',
  ];

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases.find(({ id }) => id === 'single_task').reasons.join('\n'), /record_commit_sha must occur after worker_commit/);
  const liveReasons = report.cases.find(({ id }) => id === 'live_tools').reasons.join('\n');
  assert.match(liveReasons, /forbidden action use_native_task_tool/);
  assert.match(liveReasons, /lead_spec_review must occur after check_agent_completion/);
});

test('grade rejects answers copied from a different packet revision', () => {
  const packets = prepare(join(testRoot, 'linked-packets.json'));
  const answers = materializeValidAnswers(packets);
  answers.cases[0].packet_id = '0'.repeat(64);

  const { result, report } = grade(packets, answers);

  assert.equal(result.status, 1);
  assert.match(report.cases[0].reasons.join('\n'), /packet_id does not match/);
});

test('prepare rejects workflow paths that escape the repository', () => {
  const fixture = mkdtempSync(join(testRoot, 'unsafe-path-'));
  cpSync(join(fixtureRoot, 'scenarios.json'), join(fixture, 'scenarios.json'));
  const scenarios = readJson(join(fixture, 'scenarios.json'));
  scenarios.scenarios[0].workflow_files = ['../outside.md'];
  writeFileSync(join(fixture, 'scenarios.json'), JSON.stringify(scenarios));

  const result = run(
    'prepare',
    '--repo', root,
    '--source', 'worktree',
    '--scenarios', join(fixture, 'scenarios.json'),
    '--output', join(fixture, 'packets.json'),
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /safe repository-relative path/);
});

test('prepare rejects working-tree symlinks that escape the repository', () => {
  const repo = mkdtempSync(join(testRoot, 'symlink-repo-'));
  const outside = join(testRoot, 'outside-workflow.md');
  const scenariosPath = join(repo, 'scenarios.json');
  writeFileSync(outside, 'outside workflow\n');
  symlinkSync(outside, join(repo, 'workflow.md'));
  writeFileSync(scenariosPath, JSON.stringify({
    schema_version: 1,
    scenarios: [{ id: 'sample', facts: ['Use repository evidence.'], workflow_files: ['workflow.md'] }],
  }));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Workflow Eval Test');
  git(repo, 'config', 'user.email', 'workflow-eval@example.invalid');
  git(repo, 'add', 'scenarios.json');
  git(repo, 'commit', '-q', '-m', 'baseline');

  const result = run(
    'prepare',
    '--repo', repo,
    '--source', 'worktree',
    '--scenarios', scenariosPath,
    '--output', join(repo, 'packets.json'),
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /resolves outside repository/);
});
