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
  'skills/agy-cli/SKILL.md',
  'skills/cursor-agent/SKILL.md',
  'skills/cross-model-convergence/SKILL.md',
  'skills/pre-merge-review/SKILL.md',
  'skills/requesting-code-review/SKILL.md',
];

const SECURITY_MARKER = '**Security:**';
const CHECKLIST_LINE_COUNT = 5;

const REDACT_MARKER = '**Redact:**';
const REDACT_LINE_COUNT = 3;
const REDACT_COPY = 'skills/systematic-debugging/SKILL.md';
const REDACTION_HELPER = /(?:skills\/security-review\/scripts\/redact-outbound|\$SKILL_DIR\/\.\.\/security-review\/scripts\/redact-outbound)/;

function markerBlock(text, marker, lineCount) {
  const lines = text.split('\n');
  const markerIndex = lines.indexOf(marker);
  if (markerIndex === -1) return null;
  return lines.slice(markerIndex + 1, markerIndex + 1 + lineCount).join('\n');
}

function securityChecklist(text) {
  return markerBlock(text, SECURITY_MARKER, CHECKLIST_LINE_COUNT);
}

function redactBlock(text) {
  return markerBlock(text, REDACT_MARKER, REDACT_LINE_COUNT);
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

test('the canonical Redact block is three rule lines under the ## Redact section', () => {
  const canonical = read(CANONICAL_HOME);
  assert.ok(
    canonical.includes('## Redact'),
    `${CANONICAL_HOME} lost its "## Redact" section — restore the canonical three-rule redaction block alongside the other canonical blocks`,
  );
  const block = redactBlock(canonical);
  assert.ok(
    block !== null,
    `${CANONICAL_HOME} lost its "${REDACT_MARKER}" marker line — restore the canonical three-rule redaction block under a bare "${REDACT_MARKER}" line`,
  );
  const lines = block.split('\n');
  assert.equal(
    lines.length,
    REDACT_LINE_COUNT,
    `${CANONICAL_HOME} Redact block must be exactly ${REDACT_LINE_COUNT} lines — a shorter block would let truncated copies pass the byte-compare`,
  );
  for (const line of lines) {
    assert.match(
      line,
      /^- .+\.$/,
      `${CANONICAL_HOME} Redact line "${line}" is not a "- …." rule — restore the three-rule shape or the extractor is comparing prose, not the block`,
    );
  }
  assert.ok(
    block.includes('<REDACTED>'),
    `${CANONICAL_HOME} Redact block lost the \`<REDACTED>\` placeholder — restore the rule that names the exact replacement text`,
  );
});

test('the systematic-debugging Redact copy stays byte-identical to the canonical home', () => {
  const canonical = redactBlock(read(CANONICAL_HOME));
  assert.ok(
    canonical !== null,
    `${CANONICAL_HOME} lost its "${REDACT_MARKER}" marker line — restore the canonical Redact block before comparing copies`,
  );
  const copy = redactBlock(read(REDACT_COPY));
  assert.ok(
    copy !== null,
    `${REDACT_COPY} lost its "${REDACT_MARKER}" marker line — re-copy the Redact block from ${CANONICAL_HOME} (keep the canonical-home HTML comment directly above the marker)`,
  );
  assert.equal(
    copy,
    canonical,
    `${REDACT_COPY} Redact block drifted from ${CANONICAL_HOME} — update the ${REDACT_LINE_COUNT} lines under "${REDACT_MARKER}" to match the canonical home byte for byte`,
  );
});

test('the debugging instrumentation example never prints a credential value', () => {
  const text = read(REDACT_COPY);
  assert.ok(
    !text.includes('env | grep IDENTITY'),
    `${REDACT_COPY} reintroduced "env | grep IDENTITY" — that prints the credential value into agent-visible output; use the $([ -n "\${IDENTITY:-}" ] && echo SET || echo UNSET) presence check instead`,
  );
  assert.ok(
    !text.includes('${IDENTITY:+SET}${IDENTITY:-UNSET}'),
    `${REDACT_COPY} reintroduced the \${IDENTITY:+SET}\${IDENTITY:-UNSET} pattern — \${IDENTITY:-UNSET} expands to the credential value when IDENTITY is set, so the line prints SET<value> into agent-visible output; use $([ -n "\${IDENTITY:-}" ] && echo SET || echo UNSET) instead`,
  );
  assert.ok(
    text.includes('$([ -n "${IDENTITY:-}" ] && echo SET || echo UNSET)'),
    `${REDACT_COPY} lost the $([ -n "\${IDENTITY:-}" ] && echo SET || echo UNSET) presence check — the instrumentation example must show that a credential is present without any expansion of its value reaching output`,
  );
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

test('the morning report renders the policy status above the replaceable External review section', () => {
  const template = read('skills/finishing-a-development-branch/morning-report-template.md');
  const placeholderIndex = template.indexOf('{{policy_status}}');
  const sectionIndex = template.indexOf('## External review');
  assert.ok(
    placeholderIndex >= 0,
    'skills/finishing-a-development-branch/morning-report-template.md lost the {{policy_status}} placeholder — restore it to the always-rendered header block so policy outcomes reach the morning report',
  );
  assert.ok(
    placeholderIndex < sectionIndex,
    'skills/finishing-a-development-branch/morning-report-template.md renders {{policy_status}} inside the External review section — move it above the "## External review" heading so the reviewer=none wholesale replacement cannot delete the policy disclosure',
  );
});

test('every branch-gate consumer executes the declared Security scope', () => {
  for (const rel of [
    'skills/executing-plans/SKILL.md',
    'skills/subagent-driven-development/SKILL.md',
    'skills/finishing-a-development-branch/SKILL.md',
  ]) {
    assert.ok(
      read(rel).includes('declared Security scope'),
      `${rel} lost the phrase "declared Security scope" — restore the branch-gate step that runs the plan's declared Security scope commands so scan scopes are executed, not just declared`,
    );
  }
});

test('the canonical home rechecks the chosen reviewer against the permitted list at dispatch time', () => {
  const phrase = 'When a policy block exists, the chosen reviewer must also appear in `Reviewer choices permitted:`';
  assert.ok(
    read(CANONICAL_HOME).includes(phrase),
    `${CANONICAL_HOME} lost the dispatch-time reviewer recheck — restore the exact phrase "${phrase}" so reviewer dispatches re-validate the reviewer against the policy instead of trusting plan-approval validation`,
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

test('every enforcement point redacts its payload and fails closed before dispatch', () => {
  for (const rel of ENFORCEMENT_POINTS) {
    const text = read(rel);
    const guarded = [...text.matchAll(new RegExp(REDACTION_HELPER.source, 'g'))].some(({ index }) =>
      new RegExp(`${REDACTION_HELPER.source}[\\s\\S]{0,1000}(?:exit|return) 1`).test(text.slice(index)),
    );
    assert.ok(
      guarded,
      `${rel} does not invoke ${REDACTION_HELPER} with a nonzero failure guard — redact the final payload before dispatch and stop on helper failure`,
    );
  }
});

test('the repository declares the exact external-model policy values', () => {
  const policy = [
    '## External model policy',
    'Allowed providers: anthropic, openai',
    'Reviewer choices permitted: codex, claude',
  ].join('\n');
  assert.ok(
    read('CLAUDE.md').includes(policy),
    `CLAUDE.md lost the exact approved external-model policy block — restore:\n${policy}`,
  );
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
    ['agy-cli', 'google'],
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

test('both reviewer prompt files wire the security pass', () => {
  for (const rel of [
    'skills/pre-merge-review/reviewer-prompts/codex.md',
    'skills/pre-merge-review/reviewer-prompts/claude.md',
  ]) {
    const text = read(rel);
    assert.ok(
      text.includes('## Security pass'),
      `${rel} lost its "## Security pass" section — restore it so pre-merge review can dispatch the dedicated security pass through this reviewer`,
    );
    assert.ok(
      text.includes('security-adversarial-prompt.txt'),
      `${rel} no longer references security-adversarial-prompt.txt — point the Security pass section back at the canonical prompt in skills/security-review/`,
    );
  }
});

test('the pre-merge orchestration keeps the dual-flagged dedupe vocabulary', () => {
  assert.ok(
    read('skills/pre-merge-review/SKILL.md').includes('dual-flagged'),
    'skills/pre-merge-review/SKILL.md lost the exact term "dual-flagged" — restore the dedupe rule that collapses a defect flagged by both passes into one finding',
  );
});

test('the pre-merge policy gate rechecks the policy immediately before each pass', () => {
  const text = read('skills/pre-merge-review/SKILL.md');
  assert.ok(
    text.includes('re-read the policy immediately before each pass'),
    'skills/pre-merge-review/SKILL.md lost the per-pass policy recheck — restore "re-read the policy immediately before each pass" so a policy revoked while the general pass runs fails closed before the security pass receives the diff',
  );
  assert.ok(
    !text.includes('applies once per review'),
    'skills/pre-merge-review/SKILL.md reintroduced the once-per-review policy shortcut — one check for two dispatches means a policy revoked mid-run would still leak the diff to the second pass; recheck the policy immediately before each dispatch instead',
  );
});

test('the morning report template renders the per-pass counts and the cost note', () => {
  const template = read('skills/finishing-a-development-branch/morning-report-template.md');
  for (const placeholder of ['{{general_findings_count}}', '{{security_findings_count}}', '{{cost_note}}']) {
    assert.ok(
      template.includes(placeholder),
      `skills/finishing-a-development-branch/morning-report-template.md lost the ${placeholder} placeholder — restore it so two-pass review results reach the morning report`,
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
