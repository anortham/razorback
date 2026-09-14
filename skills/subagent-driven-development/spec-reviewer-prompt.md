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

    ## How to Review (use code-kb)

    1. `file_skeleton(file_path)` — inspect symbols before reading any file.
    2. `find_references(symbol_name, direction="callers")` — confirm the implementation connects to the codebase.
    3. `get_context_slice(symbol_name, file_path?)` when behavior is unclear;
       `get_symbol_body(symbol_name, file_path?)` only for the symbol the question centers on.
    Read only the sections the symbol listing points to; never whole files.

    Report:
    - ✅ Spec compliant
    - ❌ Issues found: [what is missing or extra, with file:line]
```
