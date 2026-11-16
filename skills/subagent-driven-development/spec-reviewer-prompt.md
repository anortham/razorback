# Spec Compliance Review Checklist

The lead applies this directly during inline review; it is not dispatched as a subagent. `./code-quality-reviewer-prompt.md` covers the other half of the pass.

**Purpose:** the implementer built what was requested — nothing more, nothing less.

```
Lead inline review — spec compliance for Task N:

    ## What Was Requested

    Read this first — it is your requirements, with the exact values to use
    verbatim: [brief path printed by task-brief, .razorback/sdd/<plan-key>/task-N-brief.md]

    ## What Implementer Claims They Built

    [From implementer's report]

    ## Do Not Trust the Report

    Verify by reading code, not the report. Compare implementation to requirements line by line.

    - Missing: anything requested but skipped, or claimed but not implemented?
    - Extra: anything built that was not requested, over-engineered, or "nice to have"?
    - Misread: wrong interpretation, wrong problem, right feature done the wrong way?

    ## How to Review

    1. Read the sections the change touches.
    2. Read the symbol the requirement centers on.
    3. Search for its callers and confirm the implementation connects to the codebase
       through them. A search that finds no caller is not proof that none exists.

    The spec is a vision document: for behavior it is silent on, judge by what a reasonable
    person using this software would expect, and grade the finding by its effect on that
    person, not by whether the spec names the trigger.

    Report:
    - ✅ Spec compliant
    - ❌ Issues found: [what is missing or extra, with file:line]
    - Declined to judge: [each behavior set aside as outside the plan or spec, with the reason;
      the lead rules on every line, so nothing is dropped silently. `None` when empty]
```
