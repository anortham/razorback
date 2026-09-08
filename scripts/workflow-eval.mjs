#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const defaultScenariosPath = resolve(projectRoot, 'tests/fixtures/workflow-eval/scenarios.json');
const expectationsPath = resolve(projectRoot, 'tests/fixtures/workflow-eval/expectations.json');
const terminalStates = ['active', 'awaiting_user', 'blocked', 'complete'];

class CliError extends Error {}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new CliError(`Cannot read ${label} at ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`${label} contains invalid JSON: ${error.message}`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new CliError(`Expected --name value arguments, received ${flag ?? '<end>'}`);
    }
    const name = flag.slice(2);
    if (Object.hasOwn(options, name)) throw new CliError(`Duplicate option --${name}`);
    options[name] = value;
  }
  return options;
}

function onlyOptions(options, allowed) {
  for (const name of Object.keys(options)) {
    if (!allowed.includes(name)) throw new CliError(`Unknown option --${name}`);
  }
}

function requireOption(options, name) {
  if (!options[name]) throw new CliError(`Missing required option --${name}`);
  return options[name];
}

function validateRepo(path) {
  const repo = resolve(path);
  try {
    if (!statSync(repo).isDirectory()) throw new Error('not a directory');
  } catch (error) {
    throw new CliError(`Invalid repository path ${path}: ${error.message}`);
  }
  return repo;
}

function validateWorkflowPath(repo, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\0') || path.includes(':')) {
    throw new CliError(`Workflow path must be a safe repository-relative path: ${String(path)}`);
  }
  const absolute = resolve(repo, path);
  const fromRepo = relative(repo, absolute);
  if (!fromRepo || fromRepo === '..' || fromRepo.startsWith(`..${sep}`) || isAbsolute(fromRepo)) {
    throw new CliError(`Workflow path must be a safe repository-relative path: ${path}`);
  }
  return { absolute, relative: fromRepo.split(sep).join('/') };
}

function readWorkingTreeFile(repo, validated) {
  let canonical;
  try {
    canonical = realpathSync(validated.absolute);
  } catch (error) {
    throw new CliError(`Cannot resolve workflow file ${validated.relative}: ${error.message}`);
  }
  const fromRepo = relative(repo, canonical);
  if (fromRepo === '..' || fromRepo.startsWith(`..${sep}`) || isAbsolute(fromRepo)) {
    throw new CliError(`Workflow path ${validated.relative} resolves outside repository`);
  }
  try {
    return readFileSync(canonical, 'utf8');
  } catch (error) {
    throw new CliError(`Cannot read workflow file ${validated.relative}: ${error.message}`);
  }
}

function git(repo, args, label) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new CliError(`${label} failed: ${result.error.message}`);
  if (result.status !== 0) throw new CliError(`${label} failed: ${result.stderr.trim() || `exit ${result.status}`}`);
  return result.stdout;
}

function loadScenarioManifest(path) {
  const manifest = readJson(path, 'scenario manifest');
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.scenarios) || manifest.scenarios.length === 0) {
    throw new CliError('Scenario manifest must use schema_version 1 and contain scenarios');
  }
  const ids = new Set();
  for (const scenario of manifest.scenarios) {
    if (!scenario || typeof scenario.id !== 'string' || !scenario.id || ids.has(scenario.id)) {
      throw new CliError(`Scenario IDs must be unique non-empty strings: ${String(scenario?.id)}`);
    }
    ids.add(scenario.id);
    if (!Array.isArray(scenario.facts) || !scenario.facts.every((fact) => typeof fact === 'string' && fact)) {
      throw new CliError(`Scenario ${scenario.id} must contain non-empty fact strings`);
    }
    if (!Array.isArray(scenario.workflow_files) || !scenario.workflow_files.length) {
      throw new CliError(`Scenario ${scenario.id} must contain workflow_files`);
    }
  }
  return manifest;
}

function loadExpectations() {
  const manifest = readJson(expectationsPath, 'trusted expectation manifest');
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new CliError('Trusted expectation manifest must use schema_version 1 and contain cases');
  }
  const ids = new Set();
  for (const expectation of manifest.cases) {
    if (!expectation || typeof expectation.id !== 'string' || ids.has(expectation.id)) {
      throw new CliError(`Trusted expectation IDs must be unique: ${String(expectation?.id)}`);
    }
    ids.add(expectation.id);
    for (const field of ['allowed_actions', 'required_actions', 'forbidden_actions', 'ordered_actions', 'terminal_states']) {
      if (!Array.isArray(expectation[field])) throw new CliError(`Expectation ${expectation.id} must contain ${field}`);
    }
    const hasExactQuestions = Number.isInteger(expectation.user_questions) && expectation.user_questions >= 0;
    const hasQuestionRange = Array.isArray(expectation.user_question_range)
      && expectation.user_question_range.length === 2
      && expectation.user_question_range.every((value) => Number.isInteger(value) && value >= 0)
      && expectation.user_question_range[0] <= expectation.user_question_range[1];
    if (hasExactQuestions === hasQuestionRange) {
      throw new CliError(`Expectation ${expectation.id} must define one valid user question constraint`);
    }
    for (const field of ['any_of_actions', 'mutually_exclusive_actions']) {
      if (expectation[field] !== undefined && (!Array.isArray(expectation[field])
        || !expectation[field].every((group) => Array.isArray(group) && group.length > 0
          && group.every((action) => typeof action === 'string')))) {
        throw new CliError(`Expectation ${expectation.id} has invalid ${field}`);
      }
    }
    if (expectation.required_if_selected !== undefined
      && (!expectation.required_if_selected || typeof expectation.required_if_selected !== 'object'
        || Array.isArray(expectation.required_if_selected)
        || !Object.values(expectation.required_if_selected).every((actions) => Array.isArray(actions)
          && actions.every((action) => typeof action === 'string')))) {
      throw new CliError(`Expectation ${expectation.id} has invalid required_if_selected`);
    }
    if (expectation.conditional_outcomes !== undefined
      && (!Array.isArray(expectation.conditional_outcomes)
        || !expectation.conditional_outcomes.every((outcome) => outcome
          && Array.isArray(outcome.when_all) && outcome.when_all.length > 0
          && outcome.when_all.every((action) => typeof action === 'string')
          && Array.isArray(outcome.when_none)
          && outcome.when_none.every((action) => typeof action === 'string')
          && Array.isArray(outcome.terminal_states) && outcome.terminal_states.length > 0
          && Array.isArray(outcome.user_question_range) && outcome.user_question_range.length === 2))) {
      throw new CliError(`Expectation ${expectation.id} has invalid conditional_outcomes`);
    }
  }
  return manifest;
}

function actionVocabulary(expectations) {
  const actions = new Set();
  for (const expectation of expectations.cases) {
    for (const field of ['allowed_actions', 'required_actions', 'forbidden_actions']) {
      for (const action of expectation[field]) actions.add(action);
    }
  }
  return [...actions].sort();
}

function prepare(options) {
  onlyOptions(options, ['repo', 'source', 'scenarios', 'output']);
  const repo = validateRepo(options.repo ?? process.cwd());
  const sourceName = options.source ?? 'worktree';
  const output = resolve(requireOption(options, 'output'));
  const scenariosPath = resolve(options.scenarios ?? defaultScenariosPath);
  const scenarios = loadScenarioManifest(scenariosPath);
  const expectations = loadExpectations();
  const vocabulary = actionVocabulary(expectations);
  let revision;
  let kind;
  if (sourceName === 'worktree') {
    kind = 'working-tree';
    revision = git(repo, ['rev-parse', '--verify', '--end-of-options', 'HEAD^{commit}'], 'Resolve working-tree HEAD').trim();
  } else {
    kind = 'git-ref';
    revision = git(repo, ['rev-parse', '--verify', '--end-of-options', `${sourceName}^{commit}`], `Resolve git ref ${sourceName}`).trim();
  }

  const contents = new Map();
  const readWorkflow = (path) => {
    const validated = validateWorkflowPath(repo, path);
    if (!contents.has(validated.relative)) {
      const text = kind === 'working-tree'
        ? readWorkingTreeFile(repo, validated)
        : git(repo, ['show', '--end-of-options', `${revision}:${validated.relative}`], `Read ${validated.relative} from ${sourceName}`);
      contents.set(validated.relative, { path: validated.relative, sha256: sha256(text), text });
    }
    return contents.get(validated.relative);
  };

  for (const scenario of scenarios.scenarios) {
    for (const path of scenario.workflow_files) readWorkflow(path);
  }
  const sourceSetHash = sha256(JSON.stringify(
    [...contents.values()].map(({ path, sha256: contentHash }) => ({ path, sha256: contentHash })).sort((a, b) => a.path.localeCompare(b.path)),
  ));
  const source = {
    kind,
    requested: sourceName,
    revision,
    source_set_hash: sourceSetHash,
  };
  const cases = scenarios.scenarios.map((scenario) => {
    const workflow = scenario.workflow_files.map(readWorkflow);
    const packet = { id: scenario.id, facts: scenario.facts, workflow };
    return {
      ...packet,
      packet_id: sha256(JSON.stringify({ schema_version: 1, source, ...packet })),
    };
  });
  const packets = {
    schema_version: 1,
    source,
    action_vocabulary: vocabulary,
    answer_schema: {
      top_level: {
        schema_version: 1,
        evidence_kind: ['agent-run', 'deterministic-fixture'],
        cases: 'array containing exactly one answer for every packet case',
      },
      required: ['id', 'packet_id', 'actions', 'terminal_state', 'user_questions'],
      action: `one of action_vocabulary; list actions in execution order`,
      terminal_state: terminalStates,
      terminal_state_meanings: {
        active: 'the evaluated sequence reached its safe boundary and the larger workflow continues later',
        awaiting_user: 'the next safe action requires a user answer or authority',
        blocked: 'the evaluated sequence cannot continue through a safe available action',
        complete: 'the evaluated sequence and its required evidence are finished',
      },
      user_questions: 'non-negative integer',
      metrics: 'optional object; include only genuine harness measurements with measurement_source',
    },
    cases,
  };
  writeJson(output, packets);
  process.stdout.write(`${output}\n`);
}

function validatePacketBundle(packets) {
  if (packets?.schema_version !== 1 || !packets.source || !Array.isArray(packets.cases) || !Array.isArray(packets.action_vocabulary)) {
    throw new CliError('Packet bundle is malformed');
  }
  const ids = new Set();
  const contentByPath = new Map();
  for (const scenario of packets.cases) {
    if (!scenario || typeof scenario.id !== 'string' || ids.has(scenario.id) || !Array.isArray(scenario.facts) || !Array.isArray(scenario.workflow)) {
      throw new CliError(`Packet bundle has an invalid or duplicate case: ${String(scenario?.id)}`);
    }
    ids.add(scenario.id);
    for (const item of scenario.workflow) {
      if (!item || typeof item.path !== 'string' || typeof item.text !== 'string' || item.sha256 !== sha256(item.text)) {
        throw new CliError(`Packet ${scenario.id} has invalid workflow content`);
      }
      const prior = contentByPath.get(item.path);
      if (prior && prior !== item.sha256) throw new CliError(`Packet bundle disagrees on content for ${item.path}`);
      contentByPath.set(item.path, item.sha256);
    }
    const packet = { id: scenario.id, facts: scenario.facts, workflow: scenario.workflow };
    const expectedId = sha256(JSON.stringify({ schema_version: 1, source: packets.source, ...packet }));
    if (scenario.packet_id !== expectedId) throw new CliError(`Packet ${scenario.id} has an invalid packet_id`);
  }
  const sourceSetHash = sha256(JSON.stringify(
    [...contentByPath].map(([path, contentHash]) => ({ path, sha256: contentHash })).sort((a, b) => a.path.localeCompare(b.path)),
  ));
  if (packets.source.source_set_hash !== sourceSetHash) throw new CliError('Packet bundle has an invalid source_set_hash');
}

function answerShapeReasons(answer, vocabulary) {
  const reasons = [];
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return ['answer must be an object'];
  const allowedFields = new Set(['id', 'packet_id', 'actions', 'terminal_state', 'user_questions', 'metrics']);
  for (const field of Object.keys(answer)) {
    if (!allowedFields.has(field)) reasons.push(`unknown answer field ${field}`);
  }
  if (typeof answer.packet_id !== 'string') reasons.push('packet_id must be a string');
  if (!Array.isArray(answer.actions) || !answer.actions.every((action) => typeof action === 'string')) {
    reasons.push('actions must be an array of strings');
  } else {
    const seen = new Set();
    for (const action of answer.actions) {
      if (seen.has(action)) reasons.push(`duplicate action ${action}`);
      seen.add(action);
      if (!vocabulary.has(action)) reasons.push(`unknown action ${action}`);
    }
  }
  if (!terminalStates.includes(answer.terminal_state)) reasons.push(`invalid terminal_state ${String(answer.terminal_state)}`);
  if (!Number.isInteger(answer.user_questions) || answer.user_questions < 0) {
    reasons.push('user_questions must be a non-negative integer');
  }
  if (answer.metrics !== undefined) {
    if (!answer.metrics || typeof answer.metrics !== 'object' || Array.isArray(answer.metrics)) {
      reasons.push('metrics must be an object');
    } else {
      if (typeof answer.metrics.measurement_source !== 'string' || !answer.metrics.measurement_source) {
        reasons.push('metrics require measurement_source');
      }
      for (const field of ['latency_ms', 'input_tokens', 'output_tokens']) {
        if (answer.metrics[field] !== undefined && (!Number.isFinite(answer.metrics[field]) || answer.metrics[field] < 0)) {
          reasons.push(`${field} must be a non-negative number`);
        }
      }
    }
  }
  return reasons;
}

function gradeCase(answer, packet, expectation, vocabulary) {
  const reasons = answerShapeReasons(answer, vocabulary);
  if (!answer || typeof answer !== 'object' || !Array.isArray(answer.actions)) return reasons;
  if (answer.packet_id !== packet.packet_id) reasons.push('packet_id does not match the graded packet');
  const positions = new Map(answer.actions.map((action, index) => [action, index]));
  for (const action of expectation.required_actions) {
    if (!positions.has(action)) reasons.push(`missing required action ${action}`);
  }
  for (const group of expectation.any_of_actions ?? []) {
    if (!group.some((action) => positions.has(action))) reasons.push(`requires one of ${group.join(', ')}`);
  }
  for (const group of expectation.mutually_exclusive_actions ?? []) {
    const selected = group.filter((action) => positions.has(action));
    if (selected.length > 1) reasons.push(`actions are mutually exclusive: ${selected.join(', ')}`);
  }
  for (const [selectedAction, dependencies] of Object.entries(expectation.required_if_selected ?? {})) {
    if (!positions.has(selectedAction)) continue;
    for (const dependency of dependencies) {
      if (!positions.has(dependency)) reasons.push(`${selectedAction} requires ${dependency}`);
    }
  }
  for (const action of answer.actions) {
    if (expectation.forbidden_actions.includes(action)) reasons.push(`forbidden action ${action}`);
    else if (!expectation.allowed_actions.includes(action)) reasons.push(`action ${action} is not allowed for scenario`);
  }
  for (const [before, after] of expectation.ordered_actions) {
    if (positions.has(before) && positions.has(after) && positions.get(before) > positions.get(after)) {
      reasons.push(`${after} must occur after ${before}`);
    }
  }
  if (!expectation.terminal_states.includes(answer.terminal_state)) {
    reasons.push(`terminal_state ${String(answer.terminal_state)} is not allowed`);
  }
  if (expectation.user_question_range) {
    const [minimum, maximum] = expectation.user_question_range;
    if (answer.user_questions < minimum || answer.user_questions > maximum) {
      reasons.push(`user_questions must be between ${minimum} and ${maximum}`);
    }
  } else if (answer.user_questions !== expectation.user_questions) {
    reasons.push(`user_questions must equal ${expectation.user_questions}`);
  }
  for (const outcome of expectation.conditional_outcomes ?? []) {
    if (!outcome.when_all.every((action) => positions.has(action))
      || !outcome.when_none.every((action) => !positions.has(action))) continue;
    const condition = outcome.when_all.join('+');
    if (!outcome.terminal_states.includes(answer.terminal_state)) {
      reasons.push(`${condition} requires terminal_state ${outcome.terminal_states.join(' or ')}`);
    }
    const [minimum, maximum] = outcome.user_question_range;
    if (answer.user_questions < minimum || answer.user_questions > maximum) {
      reasons.push(`${condition} requires user_questions between ${minimum} and ${maximum}`);
    }
  }
  return reasons;
}

function aggregateMeasurements(answers) {
  const fields = ['latency_ms', 'input_tokens', 'output_tokens'];
  return Object.fromEntries(fields.map((field) => {
    const values = answers.map((answer) => answer.metrics?.[field]);
    return [field, values.every((value) => Number.isFinite(value))
      ? values.reduce((sum, value) => sum + value, 0)
      : 'unavailable'];
  }));
}

function grade(options) {
  onlyOptions(options, ['packets', 'answers', 'output']);
  const packets = readJson(resolve(requireOption(options, 'packets')), 'packet bundle');
  const answers = readJson(resolve(requireOption(options, 'answers')), 'answer file');
  const output = resolve(requireOption(options, 'output'));
  const expectations = loadExpectations();
  validatePacketBundle(packets);
  if (answers?.schema_version !== 1 || !Array.isArray(answers.cases)) {
    throw new CliError('Answer file must use schema_version 1 and contain cases');
  }
  if (!['agent-run', 'deterministic-fixture'].includes(answers.evidence_kind)) {
    throw new CliError('Answer file must declare evidence_kind as agent-run or deterministic-fixture');
  }

  const errors = [];
  const packetById = new Map(packets.cases.map((packet) => [packet.id, packet]));
  const expectationById = new Map(expectations.cases.map((expectation) => [expectation.id, expectation]));
  const packetIds = [...packetById.keys()];
  if (packetIds.length !== expectationById.size || packetIds.some((id) => !expectationById.has(id))) {
    throw new CliError('Packet case set does not match the trusted expectation manifest');
  }
  const answerById = new Map();
  for (const answer of answers.cases) {
    const id = answer?.id;
    if (typeof id !== 'string') {
      errors.push('answer case has an invalid id');
    } else if (answerById.has(id)) {
      errors.push(`duplicate case ${id}`);
    } else if (!packetById.has(id)) {
      errors.push(`unknown case ${id}`);
    } else {
      answerById.set(id, answer);
    }
  }
  for (const id of packetIds) {
    if (!answerById.has(id)) errors.push(`missing case ${id}`);
  }

  const vocabulary = new Set(packets.action_vocabulary);
  const caseResults = packetIds.map((id) => {
    const answer = answerById.get(id);
    const reasons = answer
      ? gradeCase(answer, packetById.get(id), expectationById.get(id), vocabulary)
      : ['answer is missing'];
    return { id, passed: reasons.length === 0, reasons };
  });
  const failed = caseResults.filter(({ passed }) => !passed).length;
  const report = {
    schema_version: 1,
    success: errors.length === 0 && failed === 0,
    evidence_kind: answers.evidence_kind,
    expectation_manifest_hash: sha256(readFileSync(expectationsPath)),
    packet_source: packets.source,
    summary: { total: caseResults.length, passed: caseResults.length - failed, failed },
    measurements: aggregateMeasurements([...answerById.values()]),
    errors,
    cases: caseResults,
  };
  writeJson(output, report);
  process.stdout.write(`${output}\n`);
  if (!report.success) process.exitCode = 1;
}

function usage() {
  return [
    'Usage:',
    '  workflow-eval.mjs prepare --repo PATH --source REF|worktree --output FILE [--scenarios FILE]',
    '  workflow-eval.mjs grade --packets FILE --answers FILE --output FILE',
  ].join('\n');
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') {
    process.stdout.write(`${usage()}\n`);
  } else if (command === 'prepare') {
    prepare(parseOptions(args));
  } else if (command === 'grade') {
    grade(parseOptions(args));
  } else {
    throw new CliError(`Unknown command ${command}\n${usage()}`);
  }
} catch (error) {
  if (!(error instanceof CliError)) throw error;
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
