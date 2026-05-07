---
name: architecture-quality
description: Use when planning or reviewing non-trivial code changes, refactoring architecture, evaluating module boundaries, repeated findings reveal coupling, tests are hard to write because interfaces are unclear, or the user asks for codebase design improvements.
---

# Architecture Quality

Use this skill before you plan or review non-trivial code changes. If the work is mechanical, fast exit. If it changes module boundaries, caller-facing interfaces, seams, adapters, or test surface, this skill must run.

Read `architecture-language.md` for the shared vocabulary. Use `analysis-heuristics.md` when Gate Mode finds structural signals. Use `interface-design.md` when the interface shape has more than one plausible lane or the blast radius is medium/high.

The interface is the test surface. Tests should prove behavior through the caller-facing interface, not through private plumbing.

## Fast Exit

Fast exit is allowed only for docs wording, formatting, manifest version bumps, fixture updates with no behavior change, typo fixes, or rote migrations with no behavior or interface change. If none of those apply, use Gate Mode.

## Gate Mode

Gate Mode runs by default for non-trivial planning and during review.

```markdown
## Architecture Quality

**No Architecture Impact:** [why this is mechanical or behavior-local]
```

or

```markdown
## Architecture Quality

**Affected modules:** ...
**Caller-facing interface:** ...
**Depth/locality check:** ...
**Test surface:** ...
**Seams/adapters:** ...
**Rejected shortcuts:** ...
**Architecture risk:** low / medium / high
```

Use `No Architecture Impact` when the work is mechanical or behavior-local. Otherwise Gate Mode must explain the module/interface shape, why the change stays local or does not, what tests prove it through the caller-facing interface, and which shortcuts were rejected.

## Review Checklist

These six questions are the canonical compact checklist. They are duplicated verbatim at every architecture-quality enforcement point (worker self-review, lead inline review, standalone reviewer prompt). Edit them here first; the drift test in `tests/architecture-quality-checklist.test.mjs` then fails everywhere else until the copies are updated to match.

- Does this keep complexity local?
- Is the caller-facing interface smaller than the behavior it unlocks?
- Are tests written through the same interface callers use?
- Did new seams earn their keep?
- Did this avoid speculative extensibility?
- Did it fix the structural cause, not only the symptom?

## Candidate Mode

Use Candidate Mode when structural friction is real and a concrete refactor candidate deserves review.

```markdown
### Candidate: [Name]

**Files:** ...
**Current friction:** ...
**Deletion test:** ...
**Proposed module/interface:** ...
**Why this improves locality/leverage:** ...
**Test surface:** ...
**Risk:** low / medium / high
**Recommendation:** fold into current plan / split into separate plan / reject for now
```

Candidates are approval-gated. Folding non-required candidates into the current plan requires user approval unless the current task cannot be completed correctly without it. Autonomous execution records non-required review-time candidates instead of prompting mid-run.

## Durable Decisions

Selective architecture decisions become short ADR-style notes in `docs/adr/`. Use the next available `ADR-NNNN` number, or follow the repo-local convention if one already exists. Write a note when an accepted refactor candidate changes module/interface shape, a rejected candidate has a load-bearing reason, a new seam or adapter is established, or repeated review findings show a rule future agents should not rediscover.

ADR shape:

```markdown
# ADR-NNNN: [Decision]

## Context
What structural problem or repeated finding led here.

## Decision
What we will do, or what we are rejecting.

## Consequences
What this makes easier, what it makes harder.

## Applies To
Files/modules/patterns affected.

## Future Agents
What agents should do or avoid when touching this area.
```

Do not write an ADR for minor cleanup or when Gate Mode fast-exits with no architecture impact.
