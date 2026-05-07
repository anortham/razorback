import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('architecture-quality skill has the approved gate shape', () => {
  const skill = read('skills/architecture-quality/SKILL.md');

  assert.match(skill, /^---\nname: architecture-quality\n/m);
  assert.match(
    skill,
    /description: .*planning or reviewing non-trivial code changes/i,
  );
  assert.match(skill, /Gate Mode/);
  assert.match(skill, /Candidate Mode/);
  assert.match(skill, /No Architecture Impact/);
  assert.match(skill, /docs\/adr\//);
  assert.match(skill, /The interface is the test surface/);

  assert.match(skill, /\*\*Affected modules:\*\*/);
  assert.match(skill, /\*\*Caller-facing interface:\*\*/);
  assert.match(skill, /\*\*Depth\/locality check:\*\*/);
  assert.match(skill, /\*\*Test surface:\*\*/);
  assert.match(skill, /\*\*Seams\/adapters:\*\*/);
  assert.match(skill, /\*\*Rejected shortcuts:\*\*/);
  assert.match(skill, /\*\*Architecture risk:\*\*/);

  assert.match(skill, /\*\*Files:\*\*/);
  assert.match(skill, /\*\*Current friction:\*\*/);
  assert.match(skill, /\*\*Deletion test:\*\*/);
  assert.match(skill, /\*\*Proposed module\/interface:\*\*/);
  assert.match(skill, /\*\*Why this improves locality\/leverage:\*\*/);
  assert.match(skill, /\*\*Test surface:\*\*/);
  assert.match(skill, /\*\*Risk:\*\*/);
  assert.match(skill, /\*\*Recommendation:\*\*/);

  assert.match(
    skill,
    /folding non-required candidates into the current plan requires user approval unless the current task cannot be completed correctly without it/i,
  );
  assert.match(
    skill,
    /autonomous execution records non-required review-time candidates instead of prompting mid-run/i,
  );

  assert.match(skill, /ADR-NNNN/);
  assert.match(skill, /## Context/);
  assert.match(skill, /## Decision/);
  assert.match(skill, /## Consequences/);
  assert.match(skill, /## Applies To/);
  assert.match(skill, /## Future Agents/);
});

test('architecture-language defines the controlled vocabulary', () => {
  const language = read('skills/architecture-quality/architecture-language.md');

  assert.match(language, /\*\*Module:\*\*/);
  assert.match(language, /\*\*Interface:\*\*/);
  assert.match(language, /\*\*Implementation:\*\*/);
  assert.match(language, /\*\*Depth:\*\*/);
  assert.match(language, /\*\*Locality:\*\*/);
  assert.match(language, /\*\*Leverage:\*\*/);
  assert.match(language, /\*\*Seam:\*\*/);
  assert.match(language, /\*\*Adapter:\*\*/);
  assert.match(language, /\*\*Deletion test:\*\*/);
  assert.match(language, /\*\*Test surface:\*\*/);
});

test('analysis heuristics cover the structural smells and the stop condition', () => {
  const heuristics = read('skills/architecture-quality/analysis-heuristics.md');

  assert.match(heuristics, /pass-through modules/i);
  assert.match(heuristics, /duplicated logic/i);
  assert.match(heuristics, /wrong abstraction level/i);
  assert.match(heuristics, /tests reaching past the caller-facing interface/i);
  assert.match(heuristics, /speculative seams/i);
  assert.match(heuristics, /shotgun surgery/i);
  assert.match(heuristics, /swallowed errors/i);
  assert.match(heuristics, /primitive obsession/i);
  assert.match(heuristics, /over-decomposition/i);
  assert.match(heuristics, /additive-only changes/i);
  assert.match(heuristics, /repeated review findings/i);
  assert.match(heuristics, /when not to act/i);
});

test('interface design explains the decision dimensions', () => {
  const design = read('skills/architecture-quality/interface-design.md');

  assert.match(design, /parallel design lanes/i);
  assert.match(design, /\bdepth\b/i);
  assert.match(design, /\blocality\b/i);
  assert.match(design, /test surface/i);
  assert.match(design, /seam placement/i);
  assert.match(design, /adapter strategy/i);
  assert.match(design, /blast radius/i);
  assert.match(design, /risk medium\/high/i);
});
