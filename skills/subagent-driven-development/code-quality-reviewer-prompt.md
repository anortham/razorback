# Code Quality Reviewer Prompt Template

The lead applies this checklist directly during inline review. For standalone (Mode 2) reviews, see the per-harness dispatch table in `requesting-code-review/SKILL.md`.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only run this checklist after spec compliance review passes.**

### Review Checklist

Use template at `requesting-code-review/code-reviewer.md` with these placeholders:

- `WHAT_WAS_IMPLEMENTED`: [from implementer's report]
- `PLAN_OR_REQUIREMENTS`: Task N from [plan-file]
- `BASE_SHA`: [commit before task]
- `HEAD_SHA`: [current commit]
- `DESCRIPTION`: [task summary]

Use Julie tools for impact analysis:

- `deep_dive(symbol)` on modified symbols to understand callers/callees/types
- `fast_refs(symbol)` to verify changes don't break dependents
- `get_symbols(file_path)` to review file structure without reading entire files

**Code reviewer returns:** Findings (Critical/Important/Minor), optional Open Questions / Assumptions, Assessment
