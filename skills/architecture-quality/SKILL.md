---
name: architecture-quality
description: Use when planning or reviewing non-trivial code changes, refactoring architecture, evaluating module boundaries, repeated findings reveal coupling, tests are hard to write because interfaces are unclear, or the user asks for codebase design improvements, complexity reduction, deduplication, or cleanup of existing code.
---

# Architecture Quality

Three modes: **Gate Mode** before non-trivial planning and during review; **Candidate Mode** when structural friction is real and a concrete refactor deserves review; **Audit Mode** when cleanup is itself the request ("reduce complexity," "find duplication") and no change is in flight.

**Core principle:** The interface is the test surface. Tests prove behavior through the caller-facing interface, not private plumbing.

Supporting files: `architecture-language.md` (vocabulary); `analysis-heuristics.md` (Gate Mode finds structural signals, or Audit Mode sweeps); `interface-design.md` (more than one plausible interface lane, or blast radius medium/high); `deepening.md` (a candidate is accepted: classify dependencies, choose the test strategy across the seam).

## Fast Exit

Only for docs wording, formatting, manifest version bumps, fixture updates with no behavior change, typo fixes, or rote migrations with no behavior or interface change. Anything else runs Gate Mode.

## Gate Mode

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

The full shape explains the module/interface, why the change stays local or does not, which tests prove it through the caller-facing interface, and which shortcuts were rejected.

## Review Checklist

These six questions are the canonical compact checklist. They are duplicated verbatim at every architecture-quality enforcement point: the worker self-review in `subagent-driven-development/implementer-prompt.md`, the lead inline review in `subagent-driven-development/SKILL.md`, and the standalone reviewer prompt in `requesting-code-review/code-reviewer.md`. If you edit the questions here, update those three copies to match.

- Does this keep complexity local?
- Is the caller-facing interface smaller than the behavior it unlocks?
- Are tests written through the same interface callers use?
- Did new seams earn their keep?
- Did this avoid speculative extensibility?
- Did it fix the structural cause, not only the symptom?

## Candidate Mode

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

Finds friction and emits candidates; never implements during the sweep.

1. **Read `docs/adr/` first.** Recorded decisions are not re-litigated; a candidate that contradicts an ADR must flag the conflict and justify reopening it. Absent or empty → note it and continue.
2. **Scope the sweep.** Miller `context(query)` on the named area. No area named → rank by recent churn (`git log --oneline` over a meaningful window) and caller count (Miller `trace`/`impact` on entry points) together; high-churn, high-caller first. State the scope — do not boil the whole repo.
3. **Hunt by smell, not by file.** Walk `analysis-heuristics.md`; each heuristic's `Find it` line names the Miller calls. Apply the deletion test to every shallow-looking module.
4. **Do not design interfaces during the sweep.** Interface shape comes after acceptance, via `interface-design.md`.
5. **Emit ranked candidates** in the Candidate Mode template, ordered by strength, ending with the single top recommendation and why.

Strength: **strong** = evidence in hand and the deletion test clearly favors the change; **worth exploring** = real smell, uncertain payoff; **speculative** = pattern matches, thin evidence. Stop when another pass adds no candidates; emit the few worth reviewing and say what was skipped. No real friction found is a valid result — do not manufacture candidates.

## Durable Decisions

Write a short ADR in `docs/adr/` (next `ADR-NNNN`, or the repo-local convention) when an accepted candidate changes module/interface shape, a rejected candidate has a load-bearing reason, a new seam or adapter is established, or repeated findings show a rule future agents should not rediscover. Not for minor cleanup or a fast-exit gate.

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
