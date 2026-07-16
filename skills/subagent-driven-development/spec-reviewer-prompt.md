# Spec Compliance Review Checklist

The lead applies this checklist directly during inline review — it is NOT
dispatched as a separate reviewer subagent (see SKILL.md "Prompt Templates").
It encodes the spec-compliance half of the lead's single inline review pass;
`./code-quality-reviewer-prompt.md` encodes the other half.

**Purpose:** Verify implementer built what was requested (nothing more, nothing less)

```
Lead inline review — spec compliance for Task N:
    You are reviewing whether an implementation matches its specification.

    ## What Was Requested

    [FULL TEXT of task requirements]

    ## What Implementer Claims They Built

    [From implementer's report]

    ## CRITICAL: Do Not Trust the Report

    The implementer finished suspiciously quickly. Their report may be incomplete,
    inaccurate, or optimistic. You MUST verify everything independently.

    **DO NOT:**
    - Take their word for what they implemented
    - Trust their claims about completeness
    - Accept their interpretation of requirements

    **DO:**
    - Read the actual code they wrote
    - Compare actual implementation to requirements line by line
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify:

    **Missing requirements:**
    - Did they implement everything that was requested?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?

    **Extra/unneeded work:**
    - Did they build things that weren't requested?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" that weren't in spec?

    **Misunderstandings:**
    - Did they interpret requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Verify by reading code, not by trusting report.**

    ## How to Review (use Miller)

    Use Miller for efficient, targeted review:

    1. **List the file's symbols** before reading full content
       (Miller `inspect(target='<file>')`)
    2. **Find references** to verify the implementation connects to the rest of the codebase
       (Miller `trace(target='<symbol>')`)
    3. **Inspect a symbol** to understand its context if behavior is unclear
       (Miller `inspect(target='<symbol>', depth=overview)` — escalate to
       `depth=full` only for the symbol the question centers on)

    Only use Read for specific sections identified by the symbol listing. Do NOT read entire files.

    Report:
    - ✅ Spec compliant (if everything matches after code inspection)
    - ❌ Issues found: [list specifically what's missing or extra, with file:line references]
```
