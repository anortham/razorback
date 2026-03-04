# Razorback Process Evaluation — TODO

## Context

Observed during a real implementation session (Julie project, 2026-03-04): embedding Python sidecar source into a Rust binary for distribution. A well-understood, moderate-sized feature (~150 lines of new logic).

## The Hard Numbers

### Token usage from subagent reports

| Subagent | Tokens | Duration | Purpose |
|----------|--------|----------|---------|
| Implementer (Tasks 2+3) | 72,460 | 8.5 min | Actual implementation |
| Spec reviewer | 42,132 | 1 min | Verified spec compliance |
| Code quality reviewer | 65,464 | 2.5 min | Found real issues |
| Fix subagent | 118,932 | 12 min | Fixed review issues |
| **Subagent total** | **~299,000** | **~24 min** | |

Plus main conversation (brainstorming, design, planning, dispatching): ~80-100K tokens. **Total: ~380-400K tokens, ~30 minutes.**

### What was actually built

```
860 insertions, 474 deletions across 9 code files
~150 lines of genuinely new logic (extraction + fallback chain)
~280 lines of tests (6 new + 8 moved)
~330 lines of refactored code (moved, not new)
```

### Estimated cost without full razorback process

~80-100K tokens, ~10-15 minutes. Direct implementation after conversational design agreement, 1 subagent for implementation, 1 for code review.

**The razorback process roughly 3-4x'd the token cost and 2-3x'd the wall time** for this task.

## Where the Process Added Value

**Code quality reviewer (65K tokens):** Caught `include_dir!` bloat (248KB of `uv.lock` silently embedded in binary) and 500-line file limit violation. Real issues that wouldn't have been caught in the implementation flow. This review alone justified its cost.

## Where the Process Burned Tokens for No Benefit

### Brainstorming skill (~15 min, ~40K tokens)
The approach was already agreed upon in conversation. The skill forced structured "one question at a time" flow and formal design doc, but the design was already clear. The doc is fine to have, but the *ceremony* was redundant.

### Spec reviewer (~42K tokens)
Rubber-stamped well-specified work. Said "everything matches" — which is expected when the implementer had a detailed plan with exact code snippets. More useful when specs are vague and there's room for misinterpretation. Here it was pure overhead.

### Fix subagent (~119K tokens — the most expensive one)
Started from zero context. A resumed implementer subagent or direct edits would have been much cheaper. The "fresh subagent per action" pattern is clean but expensive when the fix is small relative to the orientation cost.

### Writing-plans skill
The 427-line implementation plan with exact code snippets is useful for async handoffs to other developers. For an AI implementing it 30 seconds later in the same session, it's mostly restating things already known.

## Per-Skill Assessment

| Skill | Designed For | Overkill When | Verdict |
|-------|-------------|---------------|---------|
| **Brainstorming** | Fuzzy requirements, multiple approaches | Design is already discussed and agreed | Make optional for clear tasks |
| **Writing-plans** | Multi-session work, team handoffs | Same-session implementation | Make optional for single-session work |
| **Spec review** | Ambiguous specs, complex multi-part features | Detailed plans with exact code | Skip for well-specified small features |
| **Code quality review** | Always | Rarely | **Keep mandatory — consistently valuable** |
| **Subagent-driven dev** | Large multi-task plans with independent steps | Small features (< ~300 lines new code) | Add task-size threshold |

## Recommendations to Evaluate

1. **Task-size gating:** If estimated new code < 300 lines and approach is agreed, skip brainstorming + writing-plans + spec review. Go straight to implement + code quality review.

2. **Resume over fresh subagents for fixes:** When the code quality reviewer finds issues, resume the implementer subagent instead of dispatching a fresh fix subagent. The orientation cost of a fresh subagent is wasted tokens.

3. **Collapse plan + implement for same-session work:** If executing immediately (not handing off), the plan can be lighter — bullet points instead of full code snippets. The implementer subagent reads the codebase anyway.

4. **Keep code quality review always:** It consistently finds real issues (embedding bloat, file size violations, visibility concerns). The ROI is high even for small features.

5. **Consider a "lightweight mode":** For moderate tasks — conversational design agreement → single implementer subagent → code quality review. Three steps instead of seven. This is basically what superpowers was before razorback added the extra ceremony.

## Quality Note

The *quality of the output* was consistently good across both superpowers and razorback. The extra process didn't noticeably improve the final code — the code quality review caught the same issues it would have caught without the preceding ceremony. The question is whether the process overhead is justified by the quality delta, and for moderate tasks, it doesn't appear to be.

---

*Filed: 2026-03-04 from Julie sidecar binary distribution session*
