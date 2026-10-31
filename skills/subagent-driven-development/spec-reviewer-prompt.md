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

    Use code-kb first for code structure, and native search for literal text:
    1. Orient in a file you do not know yet (code-kb `file_skeleton(file_path)`).
    2. Inspect the symbol the requirement centers on (code-kb `get_symbol_context(symbol_name, file_path?)`,
       which carries its body, callers, and tests to run).
    3. Confirm the implementation connects to the codebase through those callers (code-kb
       `find_references(symbol_name, direction="callers")` for the full list).
    Read the sections the change touches; a missing index result is not proof.

    Report:
    - ✅ Spec compliant
    - ❌ Issues found: [what is missing or extra, with file:line]
```
