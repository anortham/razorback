#!/usr/bin/env node
// Keeps the instruction-tier ruleset in sync across its host copies.
//
// Layer 1: every host copy, once its host-specific frontmatter is stripped, must
// byte-equal the canonical body.
// Layer 2: SKILL.md is the runtime source of truth, and subagent-toolchain.md is the
// dispatched-subagent restatement. Both carry the six exploration rules but legitimately
// differ in framing and length, so neither can be byte-compared. Instead, assert the
// load-bearing rules survive verbatim in ALL THREE files. Rewording a rule in any one of
// them trips this, which is the reminder to propagate it to the other two.
//
// Usage: node scripts/check-rule-copies.mjs [root]   (root defaults to the repo root)
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(import.meta.dirname, '..');

const read = (relPath) =>
  fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n').trim();

const stripFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
const trim = (text) => text.trim();

const CANONICAL_PATH = 'skills/using-razorback/references/instruction-tier.md';
const SKILL_PATH = 'skills/using-razorback/SKILL.md';
const SUBAGENT_PATH = 'skills/using-razorback/references/subagent-toolchain.md';

// Compact copies: same body as the canonical, host-specific frontmatter stripped.
const COPIES = [
  ['.cursor/rules/razorback.mdc', stripFrontmatter],
  ['.windsurf/rules/razorback.md', trim],
  ['.clinerules/razorback.md', trim],
  ['.kiro/steering/razorback.md', stripFrontmatter],
];

// Load-bearing rules that must appear verbatim in EVERY invariant source below.
const INVARIANTS = [
  'Miller MCP is available and MUST be used', // the hard requirement itself
  'Do NOT fall back to Glob → Read → Grep chains', // no raw-file reflex
  "List a file's symbols before reading it in full",
  'Inspect a symbol before modifying it',
  "Find a symbol's references before changing it",
  'Do not infer or invent API shapes',
  'choose the safest plan-consistent path', // evidence-gap rule
];

// The three files that restate the exploration rules. Not byte-comparable to each other:
// the canonical is the compact instruction-tier ruleset, SKILL.md is the full runtime skill,
// and subagent-toolchain.md is the dispatched-subagent restatement.
const INVARIANT_SOURCES = [CANONICAL_PATH, SKILL_PATH, SUBAGENT_PATH];

const canonical = read(CANONICAL_PATH);

let failed = false;

for (const [relPath, normalize] of COPIES) {
  if (normalize(read(relPath)) !== canonical) {
    console.error(`${relPath} drifted from ${CANONICAL_PATH}`);
    failed = true;
  }
}

for (const label of INVARIANT_SOURCES) {
  const text = read(label);
  for (const phrase of INVARIANTS) {
    if (!text.includes(phrase)) {
      console.error(`${label} is missing rule invariant: "${phrase}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    `Update the copied rule text, or propagate the rule wording across: ${INVARIANT_SOURCES.join(', ')}.`
  );
  process.exit(1);
}

console.log(
  `${COPIES.length} rule copies match ${CANONICAL_PATH}; ` +
    `${INVARIANTS.length} rule invariants present in all ${INVARIANT_SOURCES.length} sources ` +
    `(${INVARIANT_SOURCES.join(', ')}).`
);
