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

Use Miller for impact analysis:

- **Inspect** modified symbols to understand callers/callees/types with Miller `inspect(target='<symbol>', depth=overview)` — escalate to `depth=full` for the symbols the change centers on
- **Find references** to verify changes don't break dependents with `trace(target='<symbol>')`
- **List a file's symbols** to review structure without reading entire files with `inspect(target='<file>')`

**Test quality:**
- Run the mutation check from `test-driven-development/writing-good-tests.md`: mentally mutate the production code; a test should fail for each realistic mutation.

<!-- Canonical security checklist: skills/security-review/SKILL.md — update all copies together. -->
**Security:**
- No secrets, credentials, tokens, or connection strings in the diff?
- Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
- Authorization checked on new or changed routes/APIs?
- New dependencies vetted (source, maintenance, known CVEs)?
- No sensitive data written to logs or error messages?

**Code reviewer returns:** Findings (Critical/Important/Minor), optional Open Questions / Assumptions, Assessment
