import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(import.meta.dirname, '..');

const RULESET_COPIES = [
  '.clinerules/razorback.md',
  '.cursor/rules/razorback.mdc',
  '.github/copilot-instructions.md',
  '.kiro/steering/razorback.md',
  '.windsurf/rules/razorback.md',
];

const GUIDANCE_DOCS = [
  'CLAUDE.md',
  'README.md',
  'docs/README.codex.md',
  'docs/README.opencode.md',
  '.codex/INSTALL.md',
  '.opencode/INSTALL.md',
];

function guidanceFiles() {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'skills', 'agents', 'hooks'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const tracked = result.stdout.split('\n').filter((path) => /\.(md|mdc)$|^hooks\/[^.]+$/.test(path));
  return [...tracked, ...RULESET_COPIES, ...GUIDANCE_DOCS];
}

function sentencesOf(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n(?=\s*(?:[-*|#>]|\d+\.\s|\n|$))/)
    .map((unit) => unit.replace(/\s+/g, ' ').trim())
    .flatMap((unit) => unit.split(/(?<=[.!?])\s+(?=[A-Z*`(\d])/));
}

const SKELETON_BEFORE_EVERY_READ = [
  /file_skeleton[^.;]{0,80}\bbefore (?:a |every |any |each |you )?(?:full |line-range )?read/i,
  /\bbefore (?:you read|reading) (?:it|a source file|the file)\b[^.;]{0,80}file_skeleton/i,
  /\bbefore you `?read`?[^.;]{0,60}\bcall `?file_skeleton/i,
  /file_skeleton[^.;]{0,160}\bfirst, then (?:a )?file reads?\b/i,
];

const CONTEXT_THEN_REQUIRED_DRILL_DOWNS = [
  /get_symbol_context`?;\s*to pick the tests to run, call `?blast_radius/i,
  /get_symbol_context[^.;]{0,120}\bthen\b[^.;]{0,40}\b(?:find_references|blast_radius)/i,
];

const LOOKUP_THEN_BODY = /lookup_symbol`?,? then `?get_symbol_body/i;

const DRILL_DOWN_WORDING = /full list|drill-down|drill down/i;

function chainsDrillDownsAfterContext(sentence) {
  const context = sentence.indexOf('get_symbol_context');
  if (context === -1) return false;
  const references = sentence.indexOf('find_references', context);
  const radius = sentence.indexOf('blast_radius', context);
  if (references === -1 || radius === -1 || DRILL_DOWN_WORDING.test(sentence)) return false;
  const end = Math.max(references + 'find_references'.length, radius + 'blast_radius'.length);
  const span = sentence.slice(context, end).replace(/`/g, '');
  const plainToolList = /^get_symbol_context(?:,? (?:and )?[a-z_]+)+$/;
  return !plainToolList.test(span);
}

export function routingViolations(path, text) {
  const violations = [];
  for (const sentence of sentencesOf(text)) {
    for (const pattern of SKELETON_BEFORE_EVERY_READ) {
      if (pattern.test(sentence)) violations.push(`${path}: file_skeleton before every read: "${sentence}"`);
    }
    for (const pattern of CONTEXT_THEN_REQUIRED_DRILL_DOWNS) {
      if (pattern.test(sentence)) violations.push(`${path}: required drill-down after get_symbol_context: "${sentence}"`);
    }
    if (LOOKUP_THEN_BODY.test(sentence)) {
      violations.push(`${path}: get_symbol_body required after lookup_symbol: "${sentence}"`);
    }
    if (chainsDrillDownsAfterContext(sentence)) {
      violations.push(`${path}: find_references and blast_radius chained after get_symbol_context: "${sentence}"`);
    }
  }
  return violations;
}

test('the routing guard flags the code-kb 2.11 wording', () => {
  const old = [
    '1. Use code-kb first for code structure: `lookup_symbol`, then `get_symbol_body` or `get_symbol_context`, for a symbol by name; `file_skeleton` before a full read of a file that is not small; `find_references` for callers; `blast_radius` for the tests a change affects.',
    '| **List a file\'s symbols** before you read it, in full or by line range | `file_skeleton(file_path)` |',
    '- **Before you `Read`, `cat`, `head`, or `sed -n` a source file**, call `file_skeleton` on it.',
    '- **Before you change a symbol**, call `get_symbol_context`; to pick the tests to run, call `blast_radius`.',
    'Re-read the code you change: code-kb `file_skeleton(file_path)` and\n    `get_symbol_context(symbol_name, file_path?)` first, then a file read for the lines you edit.',
    'code-kb: `get_symbol_context` on the slow function; `find_references(symbol_name)` for every call site; `blast_radius` before the fix.',
  ];
  for (const line of old) {
    assert.notDeepEqual(routingViolations('old', line), [], `the guard must flag: ${line}`);
  }
});

test('the routing guard accepts the code-kb 2.12 wording', () => {
  const current = [
    '1. Use code-kb first for code structure: `file_skeleton` on a folder or a file you do not know yet, to orient; `get_symbol_context` before you change a symbol: it carries the body, callers, tests to run, and types; `find_references` and `blast_radius` give the full list when that summary is not enough.',
    '- **Read the file you will edit**, since the editor needs it.',
    '| **Orient** — a folder, or a file you do not know yet | `file_skeleton(file_path, public_only?)` |',
    '- **code-kb MCP (optional)** adds purpose-built tools — `file_skeleton`, `lookup_symbol`, `get_symbol_body`, `get_symbol_context`, `find_references`, `blast_radius`, and `check_edit` — for unfamiliar modules.',
  ];
  for (const line of current) {
    assert.deepEqual(routingViolations('current', line), []);
  }
});

test('no skill, agent, hook, ruleset copy, or guide requires file_skeleton before every Read or chained drill-downs after get_symbol_context', () => {
  const violations = guidanceFiles().flatMap((path) =>
    routingViolations(path, readFileSync(join(root, path), 'utf8')),
  );
  assert.deepEqual(violations, []);
});
