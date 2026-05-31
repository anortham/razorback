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

Use your code-intelligence MCP (julie or miller — whichever is installed) for impact analysis:

- **Inspect** modified symbols to understand callers/callees/types (julie `deep_dive(symbol)` / miller `inspect(target, depth=full)`)
- **Find references** to verify changes don't break dependents (julie `fast_refs(symbol)` / miller `trace(target)`)
- **List a file's symbols** to review structure without reading entire files (julie `get_symbols(file_path)` / miller `inspect(target)`)

**Code reviewer returns:** Findings (Critical/Important/Minor), optional Open Questions / Assumptions, Assessment
