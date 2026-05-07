# Architecture Quality Skill Design

**Date:** 2026-05-07
**Status:** Approved in conversation, pending written-spec review
**Motivation:** Razorback has strong process discipline around brainstorming, planning, TDD, delegation, review, and verification. It does not yet have a first-class architecture quality gate that helps agents avoid local shortcuts that make code harder to test, harder to change, and easier to break in the next review cycle.

---

## 1. Context

The driver for this design is repeated review churn in the Julie project. Claude and Codex have been reviewing and fixing findings for weeks, but each cycle still produces as many or more issues. Recent findings point to architectural shortcuts: complexity moved instead of removed, brittle seams, hard-to-test code, duplicated logic, and patches that treat symptoms instead of the structural cause.

Research reviewed for this design:

- `/Users/murphy/sealab/sources/summaries/dev-principles-agent-effectiveness.md`
- `/Users/murphy/sealab/sources/summaries/mattpocock-skills-analysis.md`
- `/Users/murphy/source/mattpocock-skills`
- OpenAI, Martin Fowler, Cloudflare, DORA, Stack Overflow, and recent arXiv sources on agentic code quality and harness engineering

The consistent lesson is boring but important: bigger prompt manuals do not reliably produce better code. The best results come from short guidance, repo-local knowledge, deterministic checks where possible, focused review loops, and explicit architecture constraints.

Razorback should not add a generic principles encyclopedia. It should add a first-class architecture gate with a small operational vocabulary and concrete outputs that shape planning, delegation, review, and durable decisions.

## 2. Goal

Create a first-class `architecture-quality` skill that helps agents preserve or improve module/interface design before implementation, during review, and when repeated findings indicate structural drift.

The skill should:

1. Run by default for non-trivial planning flows.
2. Fast-exit cleanly for mechanical work with no architecture impact.
3. Produce a compact `Architecture Quality` section for plans that touch structure.
4. Propose approval-gated refactor candidates when structural friction is real.
5. Record durable ADR-style decisions only when future agents are likely to rediscover the same issue.
6. Integrate with existing Razorback workflow skills without bloating every prompt.

## 3. Non-Goals

- Do not create a full SOLID, DRY, KISS, or YAGNI rulebook. Those labels are too abstract, and agents can over-apply them into worse designs.
- Do not make every small change pay a heavy architecture tax.
- Do not let agents smuggle unrelated refactors into feature work.
- Do not rely on prose alone where target repos can enforce rules mechanically with linters, type checks, structural tests, or CI.
- Do not replace TDD, code review, or verification. This skill should shape them.

## 4. Skill Shape

New files:

```text
skills/architecture-quality/
  SKILL.md
  architecture-language.md
  analysis-heuristics.md
  interface-design.md
```

### 4.1 `SKILL.md`

`SKILL.md` is the gate. It stays short and defines:

- when the skill must run
- fast-exit rules
- Gate Mode
- Candidate Mode
- required plan output
- durable decision triggers
- workflow integration points

The description should make the trigger obvious:

```yaml
description: Use when planning or reviewing non-trivial code changes, refactoring architecture, evaluating module boundaries, repeated findings reveal coupling, tests are hard to write because interfaces are unclear, or the user asks for codebase design improvements.
```

### 4.2 `architecture-language.md`

This reference defines the controlled vocabulary. Agents should use these terms consistently:

- **Module:** anything with an interface and an implementation.
- **Interface:** everything a caller must know to use the module correctly: types, invariants, ordering, error modes, config, and performance expectations.
- **Implementation:** the code inside a module.
- **Depth:** leverage at the interface. A deep module hides meaningful behavior behind a smaller interface.
- **Locality:** change, bugs, knowledge, and verification concentrate in one place.
- **Leverage:** callers get more capability without learning more details.
- **Seam:** where a module's interface lives.
- **Adapter:** a concrete implementation that satisfies an interface at a seam.
- **Deletion test:** if deleting a module makes complexity disappear, it was probably pass-through ceremony. If deleting it spreads complexity into callers, it was earning its keep.
- **Test surface:** the caller-facing interface through which behavior should be tested.

The core phrase to repeat across the workflow:

> The interface is the test surface.

### 4.3 `analysis-heuristics.md`

This reference holds deeper checks. It should be loaded only when Gate Mode finds structural relevance or when Candidate Mode is requested.

Heuristics:

- shallow/pass-through modules
- duplicated logic that should be centralized
- wrong abstraction level
- tests reaching past the caller-facing interface
- speculative seams and adapters
- shotgun surgery
- swallowed errors or defensive-looking code that fails silently
- primitive obsession when typed/value objects would concentrate invariants
- over-decomposition where a simple function or module became many tiny pieces
- additive-only changes that avoid integrating with existing structure
- review findings that repeat in different files

Each heuristic should include:

- what the smell looks like
- what evidence proves it is real
- when not to act on it
- how it affects tests

### 4.4 `interface-design.md`

This reference is for high-risk interface choices. It should use parallel design lanes when the shape is uncertain and the decision has meaningful blast radius.

Each lane should propose a different module/interface shape, then the lead compares them by:

- depth
- locality
- leverage
- test surface
- seam placement
- adapter strategy
- blast radius

This is not for every refactor. It is for decisions where the first plausible design is likely to be wrong or too narrow.

## 5. Modes

### 5.1 Gate Mode

Gate Mode runs by default in non-trivial planning and applies during review.

It must produce one of two outputs:

```markdown
## Architecture Quality

**No Architecture Impact:** [why this is mechanical or behavior-local]
```

or:

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

Fast exit is allowed only for mechanical work:

- docs wording
- formatting
- manifest version bumps
- fixture updates with no behavior change
- typo fixes
- rote migrations with no behavior or interface change

Full analysis triggers when work touches:

- public APIs or caller-facing interfaces
- module boundaries or new abstractions
- persistence, lifecycle, concurrency, auth, billing, config, hooks, or cross-cutting behavior
- tests that are hard to write or require heavy mocking
- duplicated logic or repeated review findings
- fixes where a local patch appears to treat a symptom

### 5.2 Candidate Mode

Candidate Mode proposes concrete refactor candidates when structural friction is real.

Candidate output:

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

Candidate policy:

- Candidates are approval-gated.
- The agent may recommend folding one into the current plan.
- The user must approve folding it in unless the current task cannot be completed correctly without it.
- Required-for-correctness refactors can be included in the current plan.
- Nice cleanup becomes a separate candidate.
- Rejected candidates with durable reasons can become ADRs.

## 6. Durable Architecture Decisions

Durable decisions are selective side effects, written as short ADR-style notes in `docs/adr/`.

No durable note is written when:

- Gate Mode fast-exits with no architecture impact
- a decision is temporary
- the reason is only "not worth doing right now"
- the change is minor cleanup

Write a durable note when:

- an accepted refactor candidate changes module/interface shape
- a rejected refactor candidate has a load-bearing reason
- a new seam, adapter, public interface, lifecycle pattern, or test surface pattern is established
- repeated review findings reveal an architectural rule worth preserving

ADR format:

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

The purpose is to stop future agents from rediscovering the same argument, not to create paperwork for every design thought.

## 7. Workflow Integration

### 7.1 `brainstorming`

Run `architecture-quality` after initial Julie orientation and before presenting the design for non-trivial work.

The brainstorming design should include the `Architecture Quality` section or a `No Architecture Impact` note. If Candidate Mode finds refactor candidates, present them for user approval before writing the design doc.

### 7.2 `writing-plans`

Every non-mechanical plan must include `Architecture Quality`.

If architecture risk is medium or high, the plan must state:

- which module/interface shape is approved
- which shortcuts were rejected
- what tests should prove through the caller-facing interface
- which worker tier may own the work
- which discovery would invalidate the plan and require escalation

Architecture-sensitive work should not go to unattended implementation-tier workers unless the plan tightly boxes the file ownership, behavior, verification scope, and approved shape.

### 7.3 `subagent-driven-development`

Workers preserve the approved architecture. They do not redesign locally.

Worker prompts should state:

- the approved module/interface shape
- the test surface
- seams/adapters they may or may not introduce
- what discovery counts as a plan mismatch

If Julie or codebase reality contradicts the approved architecture assumptions, the worker reports a plan mismatch instead of freelancing.

The lead inline review checks:

- did the diff keep complexity local?
- is the caller-facing interface smaller than the behavior it unlocks?
- are tests written through the same interface callers use?
- did new seams earn their keep?
- did the implementation avoid speculative extensibility?
- did it fix the structural cause, not only the symptom?

### 7.4 `requesting-code-review`

Standalone review should include architecture checks. Repeated findings should trigger Candidate Mode instead of another patch cycle.

The reviewer should flag:

- new public interfaces with unclear invariants
- tests coupled to implementation details
- pass-through modules
- new seams without real variation or test value
- duplicated logic across changed files
- fixes that move complexity into callers

### 7.5 `receiving-code-review`

External architecture feedback should be evaluated through `architecture-quality` before implementation.

The agent should verify whether the reviewer found a real module/interface problem, a false positive, or a nice cleanup candidate. Correct feedback becomes a fix or candidate. Incorrect feedback gets pushed back with evidence.

### 7.6 `RAZORBACK.md`

Add policy-level lead duties only:

- enforce architecture-quality decisions
- reject worker-local redesigns
- inspect test surface and error paths
- escalate architecture mismatches

Do not duplicate the full skill body in policy.

## 8. Enforcement Checklist

Use this compact checklist at the enforcement points: worker self-review, lead inline review, and standalone review.

```markdown
- Does this keep complexity local?
- Is the caller-facing interface smaller than the behavior it unlocks?
- Are tests written through the same interface callers use?
- Did new seams earn their keep?
- Did this avoid speculative extensibility?
- Did it fix the structural cause, not only the symptom?
```

This checklist should not replace the skill. It is a memory aid at moments where agents are tempted to declare victory.

## 9. Implementation Touch Points

Expected files to update in implementation:

- `skills/architecture-quality/SKILL.md`
- `skills/architecture-quality/architecture-language.md`
- `skills/architecture-quality/analysis-heuristics.md`
- `skills/architecture-quality/interface-design.md`
- `skills/brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md`
- `skills/subagent-driven-development/SKILL.md`
- `skills/subagent-driven-development/implementer-prompt.md`
- `skills/subagent-driven-development/fix-prompt.md`
- `skills/requesting-code-review/SKILL.md`
- `skills/requesting-code-review/code-reviewer.md`
- `skills/receiving-code-review/SKILL.md`
- `skills/test-driven-development/SKILL.md`
- `skills/verification-before-completion/SKILL.md`
- `agents/code-reviewer.md`
- `RAZORBACK.md`

Implementation should avoid broad rewrites of existing skills. Add small hooks and keep the architecture skill as the source of the deeper guidance.

## 10. Acceptance Criteria

- [ ] `architecture-quality` exists as a first-class skill with the four-file structure.
- [ ] Non-trivial planning flows invoke `architecture-quality` by default.
- [ ] Mechanical work can fast-exit with `No Architecture Impact`.
- [ ] Non-mechanical plans include an `Architecture Quality` section.
- [ ] Candidate Mode can propose approval-gated refactor candidates.
- [ ] Durable ADR-style notes are written only for decisions future agents are likely to rediscover.
- [ ] Worker prompts preserve approved architecture instead of allowing local redesign.
- [ ] Lead inline review and standalone review include architecture-quality checks.
- [ ] External architecture feedback is evaluated before implementation.
- [ ] Existing TDD and verification gates remain intact.

## 11. Risks

**Prompt bloat:** Existing Razorback skills are already directive-heavy. The skill should use progressive disclosure and keep `SKILL.md` short.

**Architecture theater:** Agents may produce pretty words without changing outcomes. The output must tie to files, interfaces, tests, and risk.

**Scope creep:** Candidate Mode can become a refactor vending machine. Approval gating and the fold/separate/reject classification should keep it honest.

**Over-abstraction:** Some agents will interpret "architecture quality" as "add interfaces everywhere." The reference must explicitly reject speculative seams and over-decomposition.

**Drift between checklist copies:** The short checklist appears in several enforcement points. Keep it compact and identical, or centralize if it starts to diverge.

## 12. Source Takeaways

- OpenAI's harness engineering writeup argues for short repo guidance, repo-local knowledge, mechanical architecture/taste checks, and recurring cleanup when agent throughput creates drift.
- Martin Fowler frames the problem as feedforward guides, feedback sensors, and self-correction loops.
- Cloudflare's AI review system uses specialized reviewers, a coordinator, structured findings, risk tiers, and explicit "what not to flag" guidance to avoid review noise.
- DORA's 2026 analysis says AI accelerates generation but moves saved time into auditing and verification when engineering systems are weak.
- Stack Overflow's guidance emphasizes explicit, demonstrative, repo-local standards for agents, plus linters and static analysis for basics.
- Pocock's architecture skill contributes the best vocabulary: deep modules, deletion test, locality, leverage, and interface-as-test-surface thinking.

## 13. Implementation Planning Decisions

1. Skill name: `architecture-quality`.
2. ADR numbering policy: implementation should inspect existing `docs/adr/` conventions in the target repo before writing notes. If no convention exists, use the next `ADR-NNNN` number.
3. Candidate Mode should use subagents for interface design only when architecture risk is medium/high, the user asks for alternatives, or the lead cannot confidently choose between plausible interface shapes.
4. The enforcement checklist should be duplicated at prompt enforcement points. Workers and external reviewers often receive only the dispatch prompt, so relying on a reference file alone is too easy to miss.
