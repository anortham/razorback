---
name: architecture-quality
description: Use when planning or reviewing non-trivial code changes, refactoring architecture, evaluating module boundaries, repeated findings reveal coupling, tests are hard to write because interfaces are unclear, or the user asks for codebase design improvements, complexity reduction, deduplication, or cleanup of existing code.
---

# Architecture Quality

## Overview

Architecture review runs in three modes: a gate before non-trivial planning and during review, candidates for concrete refactors, and audits when cleanup is itself the request. Mechanical work fast-exits; anything that changes module boundaries, caller-facing interfaces, seams, adapters, or test surface must run the gate.

**Core principle:** The interface is the test surface. Tests should prove behavior through the caller-facing interface, not through private plumbing.

## When to Use

- **Gate Mode** — before planning or reviewing any non-trivial code change.
- **Candidate Mode** — when structural friction is real and a concrete refactor deserves review.
- **Audit Mode** — when the cleanup is itself the request ("reduce complexity," "find duplication," "clean up this area") and no specific change is in flight.

**Not here:** work on the Fast Exit list below — take the fast exit and move on.

Supporting files: `architecture-language.md` for the shared vocabulary; `analysis-heuristics.md` when Gate Mode finds structural signals or Audit Mode is sweeping; `interface-design.md` when the interface shape has more than one plausible lane or the blast radius is medium/high; `deepening.md` when a refactor candidate is accepted, to classify its dependencies and choose the test strategy across the seam.

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

These six questions are the canonical compact checklist. They are duplicated verbatim at every architecture-quality enforcement point: the worker self-review in `subagent-driven-development/implementer-prompt.md`, the lead inline review in `subagent-driven-development/SKILL.md`, and the standalone reviewer prompt in `requesting-code-review/code-reviewer.md`. If you edit the questions here, update those three copies to match.

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
**Strength:** strong / worth exploring / speculative
**Recommendation:** fold into current plan / split into separate plan / reject for now
```

Candidates are approval-gated. Folding non-required candidates into the current plan requires user approval unless the current task cannot be completed correctly without it. Autonomous execution records non-required review-time candidates instead of prompting mid-run.

## Audit Mode

Audit Mode finds friction and emits candidates; it never implements during the sweep.

1. **Read `docs/adr/` first.** Recorded decisions are not re-litigated. Surface a candidate that contradicts an ADR only when the friction is strong enough to justify reopening the decision, and flag the conflict on the candidate. If `docs/adr/` is absent or empty, note that and continue.
2. **Scope the sweep.** Orient with Miller `context(query)` on the area the user named. If no area was named, rank targets by two signals together: recent churn (`git log --oneline` over a meaningful window — deepening pays off where change keeps landing) and caller count (Miller `trace`/`impact` on the obvious entry points — blast radius). High-churn, high-caller modules first. State what you scoped to — do not boil the whole repo.
3. **Hunt by smell, not by file.** Walk the heuristics in `analysis-heuristics.md`; each has a `Find it` line naming the Miller calls that gather its evidence. Apply the deletion test to every shallow-looking module.
4. **Do not design interfaces during the sweep.** Finding friction and designing the fix are separate steps. Interface shape comes after a candidate is accepted, via `interface-design.md` when more than one lane is plausible.
5. **Emit ranked candidates.** Use the Candidate Mode template. Order by strength and end with a top recommendation: the single candidate to tackle first and why.

Strength calibration: **strong** means the evidence is in hand and the deletion test clearly favors the change; **worth exploring** means the smell is real but the payoff is uncertain; **speculative** means the pattern matches but the evidence is thin. Stop the sweep when another heuristic pass adds no new candidates; emit the few worth reviewing and say what was skipped, rather than an exhaustive list.

An audit that finds no real friction says so — do not manufacture candidates to look productive.

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

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "This change is small, skip the gate" | Small diffs move boundaries too. If the work is not on the Fast Exit list, run Gate Mode. |
| "I'll fold this refactor in while I'm here" | Candidates are approval-gated. Record the candidate; do not silently widen the plan. |
| "The audit should just fix what it finds" | An audit sweeps and emits candidates. Implementation starts only after approval. |
| "That ADR is old, ignore it" | Recorded decisions are not re-litigated. Flag the conflict on the candidate instead. |
| "More candidates looks more thorough" | Manufactured findings bury the real ones. No friction found is a valid result. |

## It's working if

- Every non-trivial plan or review carries a Gate Mode block — `No Architecture Impact` with a reason, or the full shape with a risk rating.
- Refactor work started only from an approved candidate, never from "while I'm here".
- Audit sweeps ended with ranked candidates and one top recommendation, not code changes.
- Accepted boundary changes left an ADR behind.
