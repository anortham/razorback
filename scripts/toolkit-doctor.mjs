import fs from 'node:fs';
import path from 'node:path';

const VALID_HOSTS = new Set(['claude', 'codex']);
const MAX_SKILL_ENTRIES = 4096;
const SAFE_VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SAFE_SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function argumentError(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function parseArguments(argv) {
  const options = { installRoots: [], json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--json') {
      if (options.json) argumentError('Duplicate --json option.');
      options.json = true;
      continue;
    }
    if (!['--project-root', '--host', '--install-root'].includes(option)) {
      argumentError('Unknown option.');
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) argumentError(`Missing value for ${option}.`);
    index += 1;
    if (option === '--project-root') {
      if (options.projectRoot) argumentError('Duplicate --project-root option.');
      options.projectRoot = value;
    } else if (option === '--host') {
      if (options.host) argumentError('Duplicate --host option.');
      options.host = value;
    } else {
      options.installRoots.push(value);
    }
  }

  if (!options.projectRoot) argumentError('Provide --project-root <absolute-path>.');
  if (!options.host || !VALID_HOSTS.has(options.host)) argumentError('Provide --host claude or --host codex.');
  if (options.installRoots.length === 0) argumentError('Provide at least one --install-root <absolute-path>.');
  return options;
}

function canonicalDirectory(input, label) {
  if (!path.isAbsolute(input)) argumentError(`${label} must be an absolute path.`);
  try {
    const resolved = fs.realpathSync(input);
    if (!fs.statSync(resolved).isDirectory()) argumentError(`${label} must be a directory.`);
    return resolved;
  } catch {
    argumentError(`${label} must be an existing, readable directory.`);
  }
  return undefined;
}

function selectedRootStatus(input, boundaries, label) {
  return resolveExplicitRoot(input, boundaries, label, 40);
}

function resolveExplicitRoot(input, boundaries, label, linksRemaining) {
  if (!path.isAbsolute(input)) argumentError(`${label} must be an absolute path.`);
  if (linksRemaining < 0) return { input: path.resolve(input), rootStatus: 'unknown' };
  const absolute = path.resolve(input);
  const root = path.parse(absolute).root;
  const segments = absolute.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    current = path.join(current, segment);
    let item;
    try {
      item = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') argumentError(`${label} must be an existing directory.`);
      argumentError(`${label} must be a readable directory.`);
    }
    if (!item.isSymbolicLink()) continue;
    let target;
    try {
      target = path.resolve(path.dirname(current), fs.readlinkSync(current));
    } catch {
      return { input: absolute, rootStatus: 'unknown' };
    }
    if (!boundaries.some(boundary => isWithin(boundary, target))) return { input: absolute, rootStatus: 'unknown' };
    return {
      ...resolveExplicitRoot(path.join(target, ...segments.slice(index + 1)), boundaries, label, linksRemaining - 1),
      input: absolute,
    };
  }
  const resolved = canonicalDirectory(absolute, label);
  return { input: absolute, root: resolved, rootStatus: 'pass' };
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function containingRoot(candidate, roots) {
  return roots.find(root => isWithin(root, candidate));
}

function resolveSelectedPath(candidate, roots, linksRemaining = 40) {
  const absolute = path.resolve(candidate);
  const selectedRoot = containingRoot(absolute, roots);
  if (!selectedRoot) return { status: 'outside' };
  if (linksRemaining < 0) return { status: 'unknown' };

  const relative = path.relative(selectedRoot, absolute);
  const segments = relative ? relative.split(path.sep) : [];
  let current = selectedRoot;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === '' || segment === '.') continue;
    current = path.join(current, segment);
    let item;
    try {
      item = fs.lstatSync(current);
    } catch (error) {
      return error.code === 'ENOENT' ? { status: 'missing' } : { status: 'unknown' };
    }
    if (!item.isSymbolicLink()) continue;

    let target;
    try {
      target = path.resolve(path.dirname(current), fs.readlinkSync(current));
    } catch {
      return { status: 'unknown' };
    }
    if (!containingRoot(target, roots)) return { status: 'outside' };
    const rest = segments.slice(index + 1);
    return resolveSelectedPath(path.join(target, ...rest), roots, linksRemaining - 1);
  }

  return { status: 'ok', path: current };
}

function safeJson(root, relativePath, roots) {
  const resolved = resolveSelectedPath(path.join(root, relativePath), roots);
  if (resolved.status !== 'ok') return resolved;
  try {
    const metadata = fs.statSync(resolved.path);
    if (!metadata.isFile() || metadata.size > 1024 * 1024) return { status: 'invalid' };
    return { status: 'ok', value: JSON.parse(fs.readFileSync(resolved.path, 'utf8')) };
  } catch {
    return { status: 'invalid' };
  }
}

function safeDirectory(root, relativePath, roots) {
  const resolved = resolveSelectedPath(path.join(root, relativePath), roots);
  if (resolved.status !== 'ok') return resolved;
  try {
    if (!fs.statSync(resolved.path).isDirectory()) return { status: 'invalid' };
    return resolved;
  } catch {
    return { status: 'invalid' };
  }
}

function safeFileExists(root, relativePath, roots) {
  const resolved = resolveSelectedPath(path.join(root, relativePath), roots);
  if (resolved.status !== 'ok') return resolved;
  try {
    return fs.statSync(resolved.path).isFile() ? { status: 'ok' } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

function installationLayout(root, roots, host) {
  const manifestPath = host === 'claude' ? '.claude-plugin/plugin.json' : '.codex-plugin/plugin.json';
  const manifestResult = safeJson(root, manifestPath, roots);
  const manifest = manifestResult.status === 'ok' && manifestResult.value && typeof manifestResult.value === 'object'
    ? manifestResult.value
    : null;
  const declaredSkills = host === 'codex' ? manifest?.skills : undefined;
  const skillsPathSupported = typeof declaredSkills !== 'string' || (declaredSkills.length > 0 && !path.isAbsolute(declaredSkills));
  const skillPath = host === 'codex' && typeof declaredSkills === 'string' ? declaredSkills : 'skills';
  let resolvedSkills = skillsPathSupported ? safeDirectory(root, skillPath, roots) : { status: 'unknown' };
  if (host === 'codex' && typeof declaredSkills !== 'string' && resolvedSkills.status === 'missing') {
    resolvedSkills = safeDirectory(root, '.', roots);
  }
  return { manifestPath, manifest, manifestResult, skillPath, skillsPathSupported, resolvedSkills };
}

function listSkills(installation, roots) {
  const { layout } = installation;
  if (!installation.root) return { status: 'unknown', names: [], reason: 'selected installation root is outside selected roots' };
  if (!layout.manifest && layout.manifestResult.status === 'outside') {
    return { status: 'unknown', names: [], reason: 'plugin manifest target is outside selected roots' };
  }
  if (layout.resolvedSkills.status !== 'ok') {
    return {
      status: 'unknown',
      names: [],
      reason: `skills path is ${layout.resolvedSkills.status}`,
    };
  }

  let directory;
  const entries = [];
  try {
    directory = fs.opendirSync(layout.resolvedSkills.path);
    while (true) {
      const entry = directory.readSync();
      if (!entry) break;
      entries.push(entry);
      if (entries.length > MAX_SKILL_ENTRIES) break;
    }
  } catch {
    return { status: 'unknown', names: [], reason: 'skills directory cannot be listed' };
  } finally {
    directory?.closeSync();
  }
  if (entries.length > MAX_SKILL_ENTRIES) {
    return { status: 'unknown', names: [], reason: 'skills directory exceeds the inspection limit' };
  }

  const names = [];
  let unknown = false;
  for (const entry of entries) {
    const entryPath = path.join(layout.resolvedSkills.path, entry.name);
    const resolvedEntry = resolveSelectedPath(entryPath, roots);
    if (resolvedEntry.status === 'outside' || resolvedEntry.status === 'unknown') {
      unknown = true;
      continue;
    }
    if (resolvedEntry.status !== 'ok') continue;
    let isDirectory;
    try {
      isDirectory = fs.statSync(resolvedEntry.path).isDirectory();
    } catch {
      unknown = true;
      continue;
    }
    if (!isDirectory) continue;
    const skillFile = safeFileExists(resolvedEntry.path, 'SKILL.md', roots);
    if (skillFile.status === 'ok') {
      if (SAFE_SKILL_NAME.test(entry.name)) names.push(entry.name);
      else unknown = true;
    } else if (skillFile.status === 'outside' || skillFile.status === 'unknown') unknown = true;
  }
  return { status: unknown ? 'unknown' : 'pass', names, reason: unknown ? 'some skill links could not be inspected safely' : undefined };
}

function inspectHooks(root, roots, host) {
  if (host === 'codex') {
    return { status: 'pass', evidence: { required: [], basis: 'Codex installation docs use native skill discovery.' } };
  }

  const hooks = safeJson(root, 'hooks/hooks.json', roots);
  if (hooks.status !== 'ok' || !hooks.value || typeof hooks.value !== 'object') {
    return { status: hooks.status === 'missing' ? 'fail' : 'unknown', evidence: { hooks_config: hooks.status } };
  }
  if (!hooks.value.hooks || typeof hooks.value.hooks !== 'object' || Array.isArray(hooks.value.hooks)) {
    return { status: 'unknown', evidence: { hooks_config: 'unsupported-shape' } };
  }
  const requiredByEvent = { SessionStart: 'session-start', SubagentStart: 'subagent-start' };
  const assets = new Set([
    'hooks/run-hook.cmd',
    'hooks/session-start',
    'hooks/subagent-start',
    'skills/using-razorback/SKILL.md',
    'skills/using-razorback/references/subagent-toolchain.md',
  ]);
  const invalidRegistrations = [];
  let configurationValid = true;
  for (const [eventName, subcommand] of Object.entries(requiredByEvent)) {
    const registrations = hooks.value.hooks?.[eventName];
    if (!Array.isArray(registrations) || registrations.length === 0 || !registrations.some(registration => {
      const commands = Array.isArray(registration?.hooks) ? registration.hooks.map(hook => hook?.command).filter(value => typeof value === 'string') : [];
      return commands.some(command => command.includes('${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd') && command.endsWith(subcommand));
    })) {
      configurationValid = false;
      invalidRegistrations.push(eventName);
    }
  }

  const missing = [];
  const unknownAssets = [];
  for (const asset of assets) {
    const result = safeFileExists(root, asset, roots);
    if (result.status === 'outside' || result.status === 'unknown') unknownAssets.push(asset);
    else if (result.status !== 'ok') missing.push(asset);
  }
  const status = unknownAssets.length > 0 ? 'unknown' : configurationValid && missing.length === 0 ? 'pass' : 'fail';
  return { status, evidence: { required: [...assets], missing, unknown_assets: unknownAssets, invalid_registrations: invalidRegistrations } };
}

function capabilityStatus(host, installation) {
  const { layout, skills } = installation;
  if (!layout.manifest || layout.manifest.name !== 'razorback') return { status: 'unknown', evidence: { reason: 'recognized plugin manifest not found' } };
  if (host === 'codex') {
    if (typeof layout.manifest.skills !== 'string' || !layout.skillsPathSupported) return { status: 'unknown', evidence: { reason: 'skills-path-unsupported' } };
    if (layout.resolvedSkills.status !== 'ok') return { status: 'unknown', evidence: { reason: 'declared skills path could not be inspected' } };
    if (skills.status === 'unknown') return { status: 'unknown', evidence: { reason: skills.reason } };
    return skills.names.length > 0
      ? { status: 'pass', evidence: { skill_count: skills.names.length, bootstrap: 'native skill discovery' } }
      : { status: 'fail', evidence: { skill_count: 0, bootstrap: 'native skill discovery' } };
  }

  if (!installation.version || layout.resolvedSkills.status !== 'ok') {
    return { status: 'unknown', evidence: { reason: 'plugin version or skills directory cannot be established' } };
  }
  if (installation.hooks.status === 'fail') return { status: 'fail', evidence: { reason: 'required plugin hook registration or asset is missing' } };
  if (installation.hooks.status === 'unknown') return { status: 'unknown', evidence: { reason: 'required plugin hook assets could not be inspected' } };
  if (skills.status === 'unknown') return { status: 'unknown', evidence: { reason: skills.reason } };
  if (skills.names.length === 0) return { status: 'fail', evidence: { skill_count: 0 } };
  return { status: 'pass', evidence: { skill_count: skills.names.length, bootstrap: 'plugin hooks' } };
}

function preferredRoot(installs) {
  const ranked = installs.map(install => ({
    root: install.input,
    score: Number(install.layout.manifest?.name === 'razorback' && Boolean(install.version) && install.capabilities.status === 'pass'),
  })).sort((left, right) => right.score - left.score || left.root.localeCompare(right.root));
  if (!ranked.length || ranked[0].score === 0 || (ranked.length > 1 && ranked[0].score === ranked[1].score)) return undefined;
  return ranked[0].root;
}

function selectedInstallations(inputs, host, projectRootInput) {
  const selectedPaths = [projectRootInput, ...inputs].map(input => path.resolve(input));
  const installations = inputs.map(input => selectedRootStatus(input, selectedPaths, '--install-root'));
  const projectRoot = selectedRootStatus(projectRootInput, selectedPaths, '--project-root');
  const roots = installations.map(installation => installation.root).filter(Boolean);
  const allowedRoots = [...new Set([...roots, projectRoot.root].filter(Boolean))];
  return {
    projectRoot,
    installs: installations.map(installation => {
    if (!installation.root) {
      return {
        ...installation,
        layout: { manifest: null, manifestResult: { status: 'unknown' }, resolvedSkills: { status: 'unknown' } },
        version: undefined,
        skills: { status: 'unknown', names: [], reason: 'selected-root-outside-scope' },
        capabilities: { status: 'unknown', evidence: { reason: 'selected-root-outside-scope' } },
        hooks: { status: 'unknown', evidence: { reason: 'selected-root-outside-scope' } },
      };
    }
    const layout = installationLayout(installation.root, allowedRoots, host);
    const versionValue = layout.manifest?.version;
    const version = layout.manifest?.name === 'razorback' && typeof versionValue === 'string' && SAFE_VERSION.test(versionValue)
      ? versionValue
      : undefined;
    const item = { ...installation, layout, version };
    item.skills = listSkills(item, allowedRoots);
    item.hooks = inspectHooks(item.root, allowedRoots, host);
    item.capabilities = capabilityStatus(host, item);
    return item;
    }),
  };
}

function createReport(projectRootInput, host, rootInputs) {
  const selected = selectedInstallations(rootInputs, host, projectRootInput);
  const installs = selected.installs;
  const projectRoot = selected.projectRoot.root ?? selected.projectRoot.input;
  const rootGroups = new Map();
  for (const install of installs) {
    if (!install.root) continue;
    rootGroups.set(install.root, [...(rootGroups.get(install.root) ?? []), install.input]);
  }
  const duplicateRoots = [...rootGroups]
    .filter(([, selectedPaths]) => selectedPaths.length > 1)
    .map(([canonicalRoot, selectedPaths]) => ({ canonical_root: canonicalRoot, registrations: selectedPaths }));

  const skillsByName = new Map();
  for (const install of installs) {
    for (const name of install.skills.names) {
      skillsByName.set(name, [...(skillsByName.get(name) ?? []), install.input]);
    }
  }
  const duplicateSkills = [...skillsByName]
    .filter(([, matchedRoots]) => matchedRoots.length > 1)
    .map(([name, matchedRoots]) => {
      const preferred = preferredRoot(installs.filter(install => matchedRoots.includes(install.input)));
      return {
        name,
        roots: matchedRoots,
        preferred_root: preferred,
        redundant_roots: preferred ? matchedRoots.filter(root => root !== preferred) : [],
      };
    });

  const versions = installs.map(install => ({ root: install.input, version: install.version ?? 'unknown' }));
  const knownVersions = [...new Set(installs.map(install => install.version).filter(Boolean))];
  const versionStatus = installs.every(install => install.version) ? (knownVersions.length > 1 ? 'warning' : 'pass') : 'unknown';
  const skillStatus = installs.some(install => install.skills.status === 'unknown') ? 'unknown'
    : duplicateSkills.length > 0 ? 'warning' : 'pass';
  const capabilityStatuses = installs.map(install => install.capabilities.status);
  const capabilitiesStatus = capabilityStatuses.includes('fail') ? 'fail'
    : capabilityStatuses.includes('unknown') ? 'unknown' : 'pass';
  const hookStatus = installs.map(install => install.hooks.status).includes('fail') ? 'fail'
    : installs.map(install => install.hooks.status).includes('unknown') ? 'unknown' : 'pass';

  const duplicateRootStatus = installs.some(install => install.rootStatus === 'unknown') ? 'unknown'
    : duplicateRoots.length > 0 ? 'warning' : 'pass';
  const checks = [
    { id: 'workspace-root', status: selected.projectRoot.rootStatus, evidence: { project_root: projectRoot, explicitly_selected: true } },
    {
      id: 'workspace-root-binding',
      status: 'unknown',
      evidence: {
        project_root: projectRoot,
        install_roots: installs.map(install => install.input),
        explicitly_selected: true,
        project_root_status: selected.projectRoot.rootStatus,
        reason: 'active host binding cannot be established from static files',
      },
    },
    { id: 'versions', status: versionStatus, evidence: { installs: versions } },
    {
      id: 'duplicate-roots',
      status: duplicateRootStatus,
      evidence: { duplicates: duplicateRoots, preferred_source: preferredRoot(installs) ?? 'unknown' },
    },
    { id: 'skills', status: skillStatus === 'warning' ? 'pass' : skillStatus, evidence: { installs: installs.map(install => ({ root: install.input, total: install.skills.names.length, status: install.skills.status })) } },
    { id: 'duplicate-skills', status: duplicateSkills.length > 0 ? 'warning' : skillStatus, evidence: { duplicates: duplicateSkills, counts: installs.map(install => ({ root: install.input, total: install.skills.names.length })) } },
    { id: 'hook-assets', status: hookStatus, evidence: { installs: installs.map(install => ({ root: install.input, status: install.hooks.status, ...install.hooks.evidence })) } },
    { id: 'capabilities', status: capabilitiesStatus, evidence: { host, installs: installs.map(install => ({ root: install.input, status: install.capabilities.status, ...install.capabilities.evidence })) } },
  ];
  return { schema_version: 1, status: checks.every(check => check.status === 'pass') ? 'ok' : 'findings', checks };
}

function printText(report) {
  process.stdout.write(`Toolkit doctor: ${report.status}\n`);
  for (const check of report.checks) {
    process.stdout.write(`${check.id}: ${check.status} ${JSON.stringify(check.evidence)}\n`);
  }
}

const options = parseArguments(process.argv.slice(2));
const report = createReport(options.projectRoot, options.host, options.installRoots);
if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else printText(report);
if (report.status !== 'ok') process.exitCode = 1;
