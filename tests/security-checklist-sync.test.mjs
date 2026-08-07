import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const CANONICAL_HOME = 'skills/security-review/SKILL.md';

const CHECKLIST_COPIES = [
  'skills/requesting-code-review/code-reviewer.md',
  'skills/subagent-driven-development/code-quality-reviewer-prompt.md',
];

const ENFORCEMENT_POINTS = [
  'skills/codex-cli/SKILL.md',
  'skills/claude-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/cursor-agent/SKILL.md',
  'skills/cross-model-convergence/SKILL.md',
  'skills/pre-merge-review/SKILL.md',
  'skills/requesting-code-review/SKILL.md',
];

const SECURITY_MARKER = '**Security:**';
const CHECKLIST_LINE_COUNT = 5;

function securityChecklist(text) {
  const lines = text.split('\n');
  const markerIndex = lines.indexOf(SECURITY_MARKER);
  if (markerIndex === -1) return null;
  return lines.slice(markerIndex + 1, markerIndex + 1 + CHECKLIST_LINE_COUNT).join('\n');
}

function hasProviderRow(text, skill, provider) {
  return new RegExp(`\\|\\s*${skill}\\s*\\|\\s*${provider}\\s*\\|`).test(text);
}

test('the canonical security checklist is five question lines under the marker', () => {
  const canonical = securityChecklist(read(CANONICAL_HOME));
  assert.ok(
    canonical !== null,
    `${CANONICAL_HOME} lost its "${SECURITY_MARKER}" marker line — restore the canonical five-question security checklist under a bare "${SECURITY_MARKER}" line`,
  );
  const lines = canonical.split('\n');
  assert.equal(
    lines.length,
    CHECKLIST_LINE_COUNT,
    `${CANONICAL_HOME} security checklist must be exactly ${CHECKLIST_LINE_COUNT} lines — a shorter block would let truncated copies pass the byte-compare`,
  );
  for (const line of lines) {
    assert.match(
      line,
      /^- .+\?$/,
      `${CANONICAL_HOME} security checklist line "${line}" is not a "- …?" question — restore the five-question shape or the extractor is comparing prose, not the checklist`,
    );
  }
});

test('both checklist copies stay byte-identical to the canonical home', () => {
  const canonical = securityChecklist(read(CANONICAL_HOME));
  assert.ok(
    canonical !== null,
    `${CANONICAL_HOME} lost its "${SECURITY_MARKER}" marker line — restore the canonical checklist before comparing copies`,
  );
  for (const rel of CHECKLIST_COPIES) {
    const copy = securityChecklist(read(rel));
    assert.ok(
      copy !== null,
      `${rel} lost its "${SECURITY_MARKER}" marker line — re-copy the checklist block from ${CANONICAL_HOME} (keep the canonical-home HTML comment directly above the marker)`,
    );
    assert.equal(
      copy,
      canonical,
      `${rel} security checklist drifted from ${CANONICAL_HOME} — update the ${CHECKLIST_LINE_COUNT} lines under "${SECURITY_MARKER}" to match the canonical home byte for byte`,
    );
  }
});

test('the writing-plans verification template keeps the exact Security scope field', () => {
  const field =
    '**Security scope:** [Project-defined secrets-scan and dependency-audit commands run at the branch gate, or `none declared`.]';
  assert.ok(
    read('skills/writing-plans/SKILL.md').includes(field),
    `skills/writing-plans/SKILL.md lost the Security scope template field — restore the exact line "${field}" so every plan declares its scan commands or writes \`none declared\``,
  );
});

test('the morning report template renders the external-model policy status', () => {
  assert.ok(
    read('skills/finishing-a-development-branch/morning-report-template.md').includes('{{policy_status}}'),
    'skills/finishing-a-development-branch/morning-report-template.md lost the {{policy_status}} placeholder — restore it to the External review section so policy outcomes reach the morning report',
  );
});

test('every enforcement point references razorback:security-review', () => {
  for (const rel of ENFORCEMENT_POINTS) {
    assert.ok(
      read(rel).includes('razorback:security-review'),
      `${rel} no longer references razorback:security-review — restore its policy-gate reference so the dispatch checks the external-model policy before repo content leaves the machine`,
    );
  }
});

test('the canonical home documents the policy block, provider mapping, and scan scopes', () => {
  const canonical = read(CANONICAL_HOME);
  for (const line of ['## External model policy', 'Allowed providers:', 'Reviewer choices permitted:']) {
    assert.ok(
      canonical.includes(line),
      `${CANONICAL_HOME} lost the policy block line "${line}" — restore the canonical policy block format so enforcement points can parse repo policies`,
    );
  }
  for (const [skill, provider] of [
    ['claude-cli', 'anthropic'],
    ['codex-cli', 'openai'],
    ['grok-cli', 'xai'],
    ['cursor-agent', 'cursor'],
  ]) {
    assert.ok(
      hasProviderRow(canonical, skill, provider),
      `${CANONICAL_HOME} provider mapping lost the ${skill} → ${provider} row — restore it so dispatch skills can resolve their provider for the policy check`,
    );
  }
  for (const scope of ['security-secrets', 'security-deps']) {
    assert.ok(
      canonical.includes(scope),
      `${CANONICAL_HOME} lost the ${scope} scan scope — restore it so plans and the branch gate can reference it by name`,
    );
  }
});

test('the checklist extractor flags a one-character mutation in a copy', () => {
  const canonicalSample = [
    'Intro prose.',
    SECURITY_MARKER,
    '- Question one?',
    '- Question two?',
    '- Question three?',
    '- Question four?',
    '- Question five?',
    '',
    'Outro prose.',
  ].join('\n');
  const mutatedSample = canonicalSample.replace('three?', 'thre3?');
  assert.notEqual(securityChecklist(mutatedSample), securityChecklist(canonicalSample));
});

test('the checklist extractor flags a sample missing the Security marker', () => {
  const sample = ['Intro prose.', '**Testing:**', '- Question one?'].join('\n');
  assert.equal(securityChecklist(sample), null);
});

test('the checklist extractor accepts the canonical shape with the comment line above the marker', () => {
  const questions = [
    '- Question one?',
    '- Question two?',
    '- Question three?',
    '- Question four?',
    '- Question five?',
  ];
  const bare = ['Intro prose.', SECURITY_MARKER, ...questions].join('\n');
  const withComment = [
    'Intro prose.',
    '<!-- Canonical security checklist: skills/security-review/SKILL.md — update all copies together. -->',
    SECURITY_MARKER,
    ...questions,
  ].join('\n');
  assert.equal(securityChecklist(bare), questions.join('\n'));
  assert.equal(securityChecklist(withComment), securityChecklist(bare));
});
