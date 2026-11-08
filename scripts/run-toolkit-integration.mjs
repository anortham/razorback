#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(import.meta.dirname, '..');
const timeoutMs = 30000;
const indexingAttempts = 40;
const indexingWaitMs = 1000;
const indexingMessage = /^Indexing .+ started; call again in a few seconds\./;

class RunnerError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function parseOptions(args) {
  if (args.length !== 2 || args[0] !== '--config' || !isAbsolute(args[1])) {
    throw new RunnerError('Usage: npm run test:integration -- --config <absolute-path>', 2);
  }
  return { configPath: args[1] };
}

function readConfig(configPath) {
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    throw new RunnerError('Cannot read integration config; provide a readable JSON file.', 2);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || Object.keys(config).sort().join(',') !== 'code_kb,goldfish') {
    throw new RunnerError('Integration config must contain goldfish and code_kb records.', 2);
  }
  for (const name of ['goldfish', 'code_kb']) validateSource(name, config[name]);
  return config;
}

function validateSource(name, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)
    || Object.keys(source).sort().join(',') !== 'args,command,source_root'
    || typeof source.source_root !== 'string' || !isAbsolute(source.source_root)
    || typeof source.command !== 'string' || !isAbsolute(source.command)
    || !Array.isArray(source.args) || !source.args.every((arg) => typeof arg === 'string' && !arg.includes('\0'))) {
    throw new RunnerError(`Integration config has an invalid ${name} record.`, 2);
  }
  const shellNames = new Set(['bash', 'cmd', 'dash', 'fish', 'powershell', 'pwsh', 'sh', 'zsh']);
  const executableNames = [basename(source.command)];
  try {
    executableNames.push(basename(realpathSync(source.command)));
  } catch {}
  if (executableNames.some((name) => shellNames.has(name.toLowerCase().replace(/\.(?:exe|cmd|bat)$/, '')))) {
    throw new RunnerError(`Integration config ${name} command must be an executable, not a shell.`, 2);
  }
}

function runGit(args, cwd, label) {
  const result = spawnSync(findGit(), args, { cwd, encoding: 'utf8', env: gitEnvironment, timeout: 5000 });
  if (result.error || result.status !== 0) throw new RunnerError(`${label} prerequisite failed.`, 2);
  return result.stdout.trim();
}

let gitExecutable;
let gitEnvironment;

function findGit() {
  if (gitExecutable) return gitExecutable;
  const suffixes = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    for (const suffix of suffixes) {
      const candidate = join(directory, `git${suffix}`);
      try {
        accessSync(candidate, constants.X_OK);
        gitExecutable = realpathSync(candidate);
        return gitExecutable;
      } catch {}
    }
  }
  throw new RunnerError('Git is required for the integration checks.', 2);
}

function verifySource(name, source) {
  let sourceRoot;
  let command;
  try {
    sourceRoot = realpathSync(source.source_root);
    command = realpathSync(source.command);
    if (!existsSync(sourceRoot)) throw new Error();
    accessSync(command, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch {
    throw new RunnerError(`The configured ${name} source root or executable is unavailable.`, 2);
  }
  const gitRoot = runGit(['rev-parse', '--show-toplevel'], sourceRoot, `${name} Git root`);
  if (realpathSync.native(sourceRoot) !== realpathSync.native(gitRoot)) {
    throw new RunnerError(`The configured ${name} source_root is not a repository root.`, 2);
  }
  if (runGit(['status', '--porcelain', '--untracked-files=all'], sourceRoot, `${name} Git status`)) {
    throw new RunnerError(`The configured ${name} source_root must have a clean working tree.`, 2);
  }
  return {
    revision: runGit(['rev-parse', 'HEAD'], sourceRoot, `${name} revision`),
    executable_sha256: createHash('sha256').update(readFileSync(command)).digest('hex'),
  };
}

function createFixtureProject(root, name) {
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name, private: true }));
}

function runFixtureGit(args, cwd, environment) {
  execFileSync(findGit(), args, { cwd, env: environment, stdio: 'ignore', timeout: 10000 });
}

function createGitFixtureProject(root, name, environment) {
  createFixtureProject(root, name);
  runFixtureGit(['init', '-q'], root, environment);
  runFixtureGit(['config', 'user.name', 'Razorback toolkit integration'], root, environment);
  runFixtureGit(['config', 'user.email', 'toolkit-integration@example.invalid'], root, environment);
  runFixtureGit(['checkout', '-q', '-b', `toolkit-${name}`], root, environment);
  runFixtureGit(['add', '-A'], root, environment);
  runFixtureGit(['commit', '-q', '-m', `Add ${name} fixture base`], root, environment);
  return {
    branch: runGit(['branch', '--show-current'], root, 'fixture Git branch'),
    sourceCommit: runGit(['rev-parse', 'HEAD'], root, 'fixture Git base'),
  };
}

function commitFixture(root, message, environment) {
  runFixtureGit(['add', '-A'], root, environment);
  runFixtureGit(['commit', '-q', '-m', message], root, environment);
  return runGit(['rev-parse', 'HEAD'], root, 'fixture Git commit');
}

function createCodeKbWorktrees(root, environment) {
  const repository = join(root, 'code-kb-history');
  const alpha = join(root, 'code-kb-alpha');
  const beta = join(root, 'code-kb-beta');
  mkdirSync(repository, { recursive: true });
  runFixtureGit(['init', '-q'], repository, environment);
  runFixtureGit(['config', 'user.name', 'Razorback toolkit integration'], repository, environment);
  runFixtureGit(['config', 'user.email', 'toolkit-integration@example.invalid'], repository, environment);
  runFixtureGit(['commit', '--allow-empty', '-q', '-m', 'integration base'], repository, environment);
  const base = runGit(['rev-parse', 'HEAD'], repository, 'fixture Git base');
  runFixtureGit(['worktree', 'add', '-q', '-b', 'toolkit-alpha', alpha, base], repository, environment);
  runFixtureGit(['worktree', 'add', '-q', '-b', 'toolkit-beta', beta, base], repository, environment);
  createFixtureProject(alpha, 'toolkit-alpha');
  createFixtureProject(beta, 'toolkit-beta');
  writeFileSync(join(alpha, 'src', 'alpha.js'), 'export function workspaceAlphaMarker() { return "alpha"; }\n');
  writeFileSync(join(beta, 'src', 'beta.js'), 'export function workspaceBetaMarker() { return "beta"; }\n');
  mkdirSync(join(alpha, 'docs'), { recursive: true });
  writeFileSync(join(alpha, 'docs', 'coverage.md'), '# anchor_markdown\n\nNative fallback marker: workspaceAlphaMarker()\n');
  for (const worktree of [alpha, beta]) {
    runFixtureGit(['add', '-A'], worktree, environment);
    runFixtureGit(['commit', '-q', '-m', `Add ${basename(worktree)} source`], worktree, environment);
  }
  return { alpha, beta };
}

function runDoctorDuplicateFixture(tempRoot, environment) {
  const fixtureRoot = join(tempRoot, 'doctor');
  const project = join(fixtureRoot, 'project');
  const skillsRegistration = join(fixtureRoot, 'skills-registration');
  const pluginRoot = join(fixtureRoot, 'canonical-plugin');
  const skillText = '---\nname: using-razorback\n---\nToolkit doctor integration fixture.\n';
  mkdirSync(project, { recursive: true });
  mkdirSync(join(skillsRegistration, 'skills', 'using-razorback'), { recursive: true });
  mkdirSync(join(pluginRoot, '.codex-plugin'), { recursive: true });
  mkdirSync(join(pluginRoot, 'skills', 'using-razorback'), { recursive: true });
  writeFileSync(join(skillsRegistration, 'skills', 'using-razorback', 'SKILL.md'), skillText);
  writeFileSync(join(pluginRoot, 'skills', 'using-razorback', 'SKILL.md'), skillText);
  writeFileSync(join(pluginRoot, '.codex-plugin', 'plugin.json'), JSON.stringify({
    name: 'razorback',
    version: '1.2.3',
    skills: 'skills',
  }));
  const skillFile = join(skillsRegistration, 'skills', 'using-razorback', 'SKILL.md');
  const pluginSkillFile = join(pluginRoot, 'skills', 'using-razorback', 'SKILL.md');
  const manifestFile = join(pluginRoot, '.codex-plugin', 'plugin.json');
  const before = [skillFile, pluginSkillFile, manifestFile].map((file) => readFileSync(file, 'utf8'));
  const result = spawnSync(process.execPath, [
    join(projectRoot, 'scripts', 'toolkit-doctor.mjs'),
    '--project-root', project,
    '--host', 'codex',
    '--install-root', skillsRegistration,
    '--install-root', pluginRoot,
    '--json',
  ], { cwd: project, encoding: 'utf8', env: environment, timeout: 10000 });
  if (result.error || result.status !== 1) throw new RunnerError('The read-only toolkit doctor duplicate fixture did not report findings.');
  let doctor;
  try {
    doctor = JSON.parse(result.stdout);
  } catch {
    throw new RunnerError('The read-only toolkit doctor returned invalid JSON.');
  }
  const duplicateCheck = doctor.checks?.find(({ id }) => id === 'duplicate-skills');
  const duplicate = duplicateCheck?.evidence?.duplicates?.find(({ name }) => name === 'using-razorback');
  const selectedRoots = [skillsRegistration, pluginRoot];
  if (doctor.status !== 'findings' || duplicateCheck.status !== 'warning'
    || JSON.stringify(duplicate?.roots) !== JSON.stringify(selectedRoots)
    || duplicate.preferred_root !== pluginRoot
    || JSON.stringify(duplicate.redundant_roots) !== JSON.stringify([skillsRegistration])) {
    throw new RunnerError('The read-only toolkit doctor did not identify the exact duplicate roots and canonical plugin.');
  }
  if (JSON.stringify(before) !== JSON.stringify([skillFile, pluginSkillFile, manifestFile].map((file) => readFileSync(file, 'utf8')))) {
    throw new RunnerError('The read-only toolkit doctor changed an installation fixture.');
  }
  return { canonical_source: 'selected-plugin-root', redundant_source: 'selected-skills-root' };
}

export function createEnvironment(tempRoot, commands = []) {
  const home = join(tempRoot, 'home');
  const temp = join(tempRoot, 'tmp');
  const codeKbHome = join(home, 'code-kb');
  const goldfishHome = join(home, 'goldfish');
  for (const directory of [home, temp, join(home, 'appdata'), join(home, 'config'), join(home, 'data'), join(home, 'cache'), codeKbHome, goldfishHome]) {
    mkdirSync(directory, { recursive: true });
  }
  const gitConfig = join(home, 'gitconfig');
  writeFileSync(gitConfig, '');
  const inherited = process.platform === 'win32'
    ? ['APPDATA', 'COMSPEC', 'HOMEDRIVE', 'HOMEPATH', 'LOCALAPPDATA', 'PATH', 'PATHEXT', 'PROCESSOR_ARCHITECTURE', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432', 'SYSTEMDRIVE', 'SYSTEMROOT', 'TEMP', 'USERNAME', 'USERPROFILE', 'WINDIR']
    : ['HOME', 'LOGNAME', 'PATH', 'SHELL', 'TERM', 'USER'];
  const environment = Object.fromEntries(inherited.map((name) => [name, '']));
  const systemPath = process.platform === 'win32'
    ? [process.env.SYSTEMROOT ? join(process.env.SYSTEMROOT, 'System32') : undefined, process.env.SYSTEMROOT]
    : ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  environment.PATH = [...new Set([
    dirname(findGit()),
    ...commands.map(({ command }) => dirname(realpathSync(command))),
    ...systemPath.filter(Boolean),
  ])].join(delimiter);
  environment.HOME = home;
  environment.USERPROFILE = home;
  environment.APPDATA = join(home, 'appdata');
  environment.LOCALAPPDATA = join(home, 'appdata');
  environment.XDG_CONFIG_HOME = join(home, 'config');
  environment.XDG_DATA_HOME = join(home, 'data');
  environment.XDG_CACHE_HOME = join(home, 'cache');
  environment.TMPDIR = temp;
  environment.TEMP = temp;
  environment.TMP = temp;
  environment.USER = 'razorback-integration';
  environment.LOGNAME = 'razorback-integration';
  environment.USERNAME = 'razorback-integration';
  environment.TERM = 'dumb';
  if (process.platform === 'win32') {
    for (const key of ['SYSTEMROOT', 'SYSTEMDRIVE', 'PROCESSOR_ARCHITECTURE']) {
      environment[key] = process.env[key] ?? '';
    }
    environment.WINDIR = environment.SYSTEMROOT;
    environment.COMSPEC = join(environment.SYSTEMROOT, 'System32', 'cmd.exe');
    environment.PATHEXT = '.COM;.EXE;.BAT;.CMD';
    environment.PROGRAMDATA = join(home, 'data');
    environment.HOMEDRIVE = parse(home).root.replace(/[\\/]+$/, '');
    environment.HOMEPATH = home.slice(environment.HOMEDRIVE.length);
  }
  environment.GOLDFISH_HOME = goldfishHome;
  environment.GOLDFISH_WORKSPACE = '';
  environment.CODE_KB_HOME = codeKbHome;
  environment.CODE_KB_NO_TELEMETRY = '1';
  environment.GIT_CONFIG_NOSYSTEM = '1';
  environment.GIT_CONFIG_GLOBAL = gitConfig;
  return { environment, goldfishHome, home, temp };
}

function resultText(result) {
  return (result?.content ?? []).filter((block) => block.type === 'text').map(({ text }) => text).join('\n');
}

function assertToolResult(result, label) {
  const text = resultText(result);
  if (indexingMessage.test(text)) return text;
  if (result?.isError || !result?.content?.length) throw new RunnerError(`${label} failed.`);
  return text;
}

async function withTimeout(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new RunnerError(`${label} timed out.`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function createClient(Client, StdioClientTransport, config, cwd, environment, label) {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd,
    env: environment,
    stderr: 'pipe',
  });
  transport.stderr?.on('data', () => {});
  const client = new Client({ name: 'razorback-toolkit-integration', version: '1.0.0' });
  try {
    await withTimeout(client.connect(transport), `${label} MCP connection`);
    return client;
  } catch {
    await client.close().catch(() => {});
    throw new RunnerError(`${label} MCP server could not be reached.`);
  }
}

async function callTool(client, name, args, label) {
  try {
    const result = await withTimeout(client.callTool({ name, arguments: args }), label);
    const text = assertToolResult(result, label);
    if (indexingMessage.test(text)) return { indexing: true, text };
    return { indexing: false, text };
  } catch (error) {
    if (error instanceof RunnerError) throw error;
    throw new RunnerError(`${label} failed.`);
  }
}

async function callCodeKb(client, name, args, label) {
  for (let attempt = 0; attempt < indexingAttempts; attempt++) {
    const result = await callTool(client, name, args, label);
    if (!result.indexing) return result.text;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, indexingWaitMs));
  }
  throw new RunnerError(`${label} did not become ready after code-kb reported indexing.`);
}

async function loadClientSdk() {
  try {
    const [{ Client }, { StdioClientTransport }] = await Promise.all([
      import('@modelcontextprotocol/client'),
      import('@modelcontextprotocol/client/stdio'),
    ]);
    return { Client, StdioClientTransport };
  } catch {
    throw new RunnerError('Missing test dependency @modelcontextprotocol/client; install project development dependencies.', 2);
  }
}

export function readClientSdkVersion() {
  const entry = import.meta.resolve('@modelcontextprotocol/client');
  return JSON.parse(readFileSync(new URL('../package.json', entry), 'utf8')).version;
}

async function runIntegration(config, sources, tempRoot, state) {
  let goldfishClient;
  let goldfishResumeClient;
  let codeKbClient;
  const report = {
    schema_version: 1,
    status: 'pass',
    timestamp: new Date().toISOString(),
    sources: {
      goldfish: sources.goldfish,
      code_kb: sources.code_kb,
    },
    checks: [],
  };

  try {
    const goldfishAlpha = join(tempRoot, 'goldfish-alpha');
    const goldfishBeta = join(tempRoot, 'goldfish-beta');
    const alphaGit = createGitFixtureProject(goldfishAlpha, 'goldfish-alpha', state.environment);
    createGitFixtureProject(goldfishBeta, 'goldfish-beta', state.environment);
    const codeKbProjects = createCodeKbWorktrees(join(tempRoot, 'projects'), state.environment);
    const { Client, StdioClientTransport } = await loadClientSdk();
    goldfishClient = await createClient(Client, StdioClientTransport, config.goldfish, goldfishAlpha, state.environment, 'Goldfish');
    codeKbClient = await createClient(Client, StdioClientTransport, config.code_kb, codeKbProjects.alpha, state.environment, 'code-kb');

    const goldfishTools = new Set((await withTimeout(goldfishClient.listTools(), 'Goldfish tool discovery')).tools.map(({ name }) => name));
    if (!goldfishTools.has('checkpoint') || !goldfishTools.has('recall')) throw new RunnerError('Goldfish checkpoint and recall tools were not discovered.');
    const codeKbTools = (await withTimeout(codeKbClient.listTools(), 'code-kb tool discovery')).tools;
    const codeKbToolMap = new Map(codeKbTools.map((tool) => [tool.name, tool]));
    if (!codeKbToolMap.has('file_skeleton') || !codeKbToolMap.has('find_references') || !codeKbToolMap.has('lookup_symbol')) {
      throw new RunnerError('Required code-kb structural tools were not discovered.');
    }
    if (codeKbTools.some((tool) => !tool.inputSchema.required?.includes('project_root'))) {
      throw new RunnerError('A code-kb tool schema omitted required project_root.');
    }
    if (!codeKbToolMap.get('file_skeleton').inputSchema.required?.includes('file_path')) {
      throw new RunnerError('code-kb file_skeleton did not require file_path.');
    }
    report.checks.push('real MCP tool discovery and explicit root schemas');

    const pointer = '.memories/autonomous-run-toolkit-reliability.md';
    const checkpointMarker = `razorback toolkit project alpha ${Date.now()}`;
    const reportPath = join(goldfishAlpha, pointer);
    const nextAction = 'On resume, recall this checkpoint, read the linked report, verify the live branch, worktree, commit, and publication authority, then continue local work.';
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, [
      '# Autonomous run: toolkit reliability',
      '',
      '## Plan and task',
      '',
      '- Plan: `docs/plans/2026-11-03-toolkit-reliability-plan.md`',
      '- Task: R4, real-tool and agent evidence',
      '',
      '## Workspace',
      '',
      `- Branch: ${alphaGit.branch}`,
      `- Worktree: ${goldfishAlpha}`,
      '',
      '## Source tested',
      '',
      `- Tested source commit: ${alphaGit.sourceCommit}`,
      '- The report and its precommit checkpoint are committed together; resume verifies their metadata commit from live Git state.',
      '',
      '## Publication authority',
      '',
      '- State: none for push, pull request creation, or release.',
      '- Source: the task authorizes local implementation and commit only.',
      '',
      '## Next action',
      '',
      `- ${nextAction}`,
      '',
    ].join('\n'));
    const saved = await callTool(goldfishClient, 'checkpoint', {
      workspace: goldfishAlpha,
      description: [
        '## R2 checkpoint fixture',
        '',
        `WHAT: ${checkpointMarker}`,
        'WHY: Verify isolated Goldfish handoff storage.',
        'HOW: Save a regular structured checkpoint pointing to a committed run report.',
        `IMPACT: A fresh session can recover plan, task, tested source commit, authority, and next action from ${pointer}.`,
        '',
        `Plan/task: docs/plans/2026-11-03-toolkit-reliability-plan.md / R4`,
        `Report: ${pointer}`,
        `Tested source commit: ${alphaGit.sourceCommit}`,
        `Branch/worktree: ${alphaGit.branch} / ${goldfishAlpha}`,
        'Publication authority: none for push, pull request creation, or release.',
        'Authority source: the task authorizes local implementation and commit only.',
      ].join('\n'),
      next: nextAction,
    }, 'Goldfish checkpoint');
    if (!saved.text.includes('Checkpoint saved:') || !saved.text.includes('Saved:')) {
      throw new RunnerError('Goldfish did not confirm saving the precommit checkpoint file.');
    }
    const savedFileLine = saved.text.split('\n').find((line) => line.startsWith('Saved: '));
    const savedFileSuffix = ' — include this file in your git commit.';
    const savedFilePath = savedFileLine?.endsWith(savedFileSuffix)
      ? savedFileLine.slice('Saved: '.length, -savedFileSuffix.length)
      : undefined;
    if (!savedFilePath) throw new RunnerError('Goldfish did not return its checkpoint file path.');
    const checkpointFile = realpathSync(savedFilePath);
    const checkpointRelativePath = relative(realpathSync(goldfishAlpha), checkpointFile);
    if (!checkpointRelativePath || checkpointRelativePath.startsWith('..') || isAbsolute(checkpointRelativePath)) {
      throw new RunnerError('Goldfish saved its checkpoint outside the isolated workspace.');
    }
    const checkpointContent = readFileSync(checkpointFile, 'utf8');
    const capturedCommit = runGit(['rev-parse', '--short', alphaGit.sourceCommit], goldfishAlpha, 'Goldfish captured commit');
    if (!saved.text.includes(`Branch: ${alphaGit.branch} @ ${capturedCommit}`)
      || !checkpointContent.includes(`Branch/worktree: ${alphaGit.branch} / ${goldfishAlpha}`)
      || !checkpointContent.includes(`Report: ${pointer}`)
      || !checkpointContent.includes(`Tested source commit: ${alphaGit.sourceCommit}`)
      || !checkpointContent.includes('\nnext:')) {
      throw new RunnerError('Goldfish checkpoint omitted its tested source commit or recovery details.');
    }
    const metadataCommit = commitFixture(goldfishAlpha, 'Commit autonomous run report and checkpoint', state.environment);
    if (metadataCommit === alphaGit.sourceCommit) throw new RunnerError('The handoff report was not committed separately from the tested source.');
    const metadataFiles = runGit(['show', '--format=', '--name-only', metadataCommit], goldfishAlpha, 'Goldfish report commit files')
      .split('\n').filter(Boolean);
    if (!metadataFiles.includes(pointer) || metadataFiles.filter((file) => file.startsWith('.memories/')).length < 2) {
      throw new RunnerError('The report and precommit checkpoint were not committed together.');
    }
    await goldfishClient.close();
    goldfishClient = undefined;
    goldfishResumeClient = await createClient(Client, StdioClientTransport, config.goldfish, goldfishBeta, state.environment, 'Goldfish resume');
    const betaRecall = await callTool(goldfishResumeClient, 'recall', {
      workspace: goldfishBeta,
      limit: 5,
      full: true,
    }, 'Goldfish isolation recall');
    if (betaRecall.text.includes(checkpointMarker) || betaRecall.text.includes(pointer)) {
      throw new RunnerError('Goldfish returned checkpoint content across separate project roots.');
    }
    const alphaRecall = await callTool(goldfishResumeClient, 'recall', {
      workspace: goldfishAlpha,
      limit: 5,
      full: true,
    }, 'Goldfish handoff recall');
    if (!alphaRecall.text.includes(checkpointMarker) || !alphaRecall.text.includes(pointer)
      || !alphaRecall.text.includes(alphaGit.sourceCommit) || !alphaRecall.text.includes(nextAction)) {
      throw new RunnerError('Goldfish recall did not return the saved report pointer.');
    }
    const recalledReport = readFileSync(reportPath, 'utf8');
    if (!recalledReport.includes('Task: R4, real-tool and agent evidence')
      || !recalledReport.includes(`Branch: ${alphaGit.branch}`)
      || !recalledReport.includes(`Worktree: ${goldfishAlpha}`)
      || !recalledReport.includes(`Tested source commit: ${alphaGit.sourceCommit}`)
      || !recalledReport.includes('State: none for push, pull request creation, or release.')
      || !recalledReport.includes('Source: the task authorizes local implementation and commit only.')
      || !recalledReport.includes(nextAction)) {
      throw new RunnerError('The recalled Goldfish report is missing recovery evidence.');
    }
    const liveBranch = runGit(['branch', '--show-current'], goldfishAlpha, 'Goldfish live branch');
    const liveCommit = runGit(['rev-parse', 'HEAD'], goldfishAlpha, 'Goldfish live commit');
    const liveStatus = runGit(['status', '--porcelain', '--untracked-files=all'], goldfishAlpha, 'Goldfish live status');
    if (liveBranch !== alphaGit.branch || liveCommit !== metadataCommit || liveStatus) {
      throw new RunnerError('Goldfish report branch, worktree, or commit did not match live fixture state.');
    }
    report.handoff = {
      report_path: pointer,
      tested_source_commit: alphaGit.sourceCommit,
      report_metadata_commit: metadataCommit,
      publication_authority: 'none',
      live_state_verified: true,
    };
    report.checks.push('Goldfish fresh-session recall reads a committed report with separate tested and metadata commits, live authority, and next action');

    const alphaSkeleton = await callCodeKb(codeKbClient, 'file_skeleton', {
      file_path: 'src/alpha.js',
      project_root: codeKbProjects.alpha,
    }, 'code-kb alpha file skeleton');
    if (!alphaSkeleton.includes('function workspaceAlphaMarker()') || alphaSkeleton.includes('workspaceBetaMarker')) {
      throw new RunnerError('code-kb file_skeleton returned the wrong structure for the alpha worktree.');
    }
    const betaSkeleton = await callCodeKb(codeKbClient, 'file_skeleton', {
      file_path: 'src/beta.js',
      project_root: codeKbProjects.beta,
    }, 'code-kb beta file skeleton');
    if (!betaSkeleton.includes('function workspaceBetaMarker()') || betaSkeleton.includes('workspaceAlphaMarker')) {
      throw new RunnerError('code-kb file_skeleton returned the wrong structure after switching worktrees.');
    }
    const alphaInBeta = await callCodeKb(codeKbClient, 'lookup_symbol', {
      query: 'workspaceAlphaMarker',
      project_root: codeKbProjects.beta,
    }, 'code-kb cross-project negative lookup');
    if (!alphaInBeta.includes('No exact name match;')
      || alphaInBeta.includes('function workspaceAlphaMarker(') || alphaInBeta.includes('src/alpha.js')) {
      throw new RunnerError('code-kb returned alpha declarations when queried within the beta worktree.');
    }
    const alphaAfterSwitch = await callCodeKb(codeKbClient, 'file_skeleton', {
      file_path: 'src/alpha.js',
      project_root: codeKbProjects.alpha,
    }, 'code-kb alpha file skeleton after switching back');
    if (!alphaAfterSwitch.includes('function workspaceAlphaMarker()') || alphaAfterSwitch.includes('workspaceBetaMarker')) {
      throw new RunnerError('code-kb leaked structural results after switching back to the alpha worktree.');
    }
    const markdownSkeleton = await callCodeKb(codeKbClient, 'file_skeleton', {
      file_path: 'docs/coverage.md',
      project_root: codeKbProjects.alpha,
    }, 'code-kb Markdown structural skeleton');
    if (!markdownSkeleton.includes('section anchor_markdown')) {
      throw new RunnerError('code-kb did not return the Markdown heading declaration.');
    }
    const markdownCoverage = await callCodeKb(codeKbClient, 'find_references', {
      symbol_name: 'anchor_markdown',
      file_path: 'docs/coverage.md',
      project_root: codeKbProjects.alpha,
    }, 'code-kb Markdown coverage report');
    if (!markdownCoverage.includes('Coverage: the index records no reference sites in markdown files')) {
      throw new RunnerError('code-kb did not report the documented Markdown reference coverage gap.');
    }
    const markdownSource = readFileSync(join(codeKbProjects.alpha, 'docs', 'coverage.md'), 'utf8');
    const nativeSearchMatches = markdownSource.match(/workspaceAlphaMarker\(\)/g)?.length ?? 0;
    if (nativeSearchMatches !== 1) throw new RunnerError('The native fallback did not find the source reference in the Markdown file.');
    const doctorFixture = runDoctorDuplicateFixture(tempRoot, state.environment);
    report.duplicate_installation = doctorFixture;
    report.unsupported_coverage = { language: 'markdown', warning_verified: true, native_search_matches: nativeSearchMatches };
    report.checks.push('code-kb switches indexes between linked worktrees using each absolute project_root and excludes cross-project declarations');
    report.checks.push('code-kb reports unsupported Markdown reference coverage and native source search finds the missed text');
    report.checks.push('read-only toolkit doctor reports exact duplicate skill roots and a canonical plugin without mutation');
    report.isolation = {
      goldfish_workspaces: 2,
      code_kb_linked_worktrees: 2,
      goldfish_home_isolated: true,
      code_kb_home_isolated: true,
      indexes_and_logs_under_temp: true,
    };
    report.mcp_client = `@modelcontextprotocol/client@${readClientSdkVersion()}`;
    return report;
  } catch (error) {
    if (error instanceof RunnerError) throw error;
    throw new RunnerError('The isolated toolkit integration failed.');
  } finally {
    await Promise.all([goldfishClient, goldfishResumeClient, codeKbClient].filter(Boolean).map((client) => client.close().catch(() => {})));
  }
}

async function main(args) {
  const { configPath } = parseOptions(args);
  const config = readConfig(configPath);
  const tempRoot = mkdtempSync(join(tmpdir(), 'razorback-toolkit-integration-'));
  try {
    const state = createEnvironment(tempRoot);
    gitEnvironment = state.environment;
    const sources = {
      goldfish: verifySource('goldfish', config.goldfish),
      code_kb: verifySource('code-kb', config.code_kb),
    };
    state.environment.PATH = [...new Set([
      ...state.environment.PATH.split(delimiter),
      ...[config.goldfish, config.code_kb].map(({ command }) => dirname(realpathSync(command))),
    ])].join(delimiter);
    const report = await runIntegration(config, sources, tempRoot, state);
    for (const name of ['goldfish', 'code_kb']) {
      const sourceRoot = realpathSync(config[name].source_root);
      const currentRevision = runGit(['rev-parse', 'HEAD'], sourceRoot, `${name} final revision`);
      const currentStatus = runGit(['status', '--porcelain', '--untracked-files=all'], sourceRoot, `${name} final Git status`);
      if (currentRevision !== sources[name].revision || currentStatus) {
        throw new RunnerError(`The configured ${name} source changed during integration.`);
      }
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof RunnerError ? error.message : 'The isolated toolkit integration failed.';
    process.stderr.write(`${message}\n`);
    process.exitCode = error instanceof RunnerError ? error.exitCode : 1;
  });
}
