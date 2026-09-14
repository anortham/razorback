# Code Quality Reviewer Prompt Template

The lead applies this checklist directly during inline review, after spec compliance passes. Standalone (Mode 2) reviews use the dispatch table in `requesting-code-review/SKILL.md`.

**Purpose:** the implementation is clean, tested, maintainable.

Use `requesting-code-review/code-reviewer.md` with: `WHAT_WAS_IMPLEMENTED` (implementer report), `PLAN_OR_REQUIREMENTS` (Task N from plan), `BASE_SHA`, `HEAD_SHA`, `DESCRIPTION`.

code-kb: `get_symbol_context(symbol_name, file_path?)` on modified symbols (`get_symbol_body` for the change's core); `find_references(symbol_name, direction="callers")` to check dependents; `file_skeleton(file_path)` to review structure without reading whole files.

**Test quality:**
- Run the mutation check from `test-driven-development/writing-good-tests.md`: mentally mutate the production code; a test should fail for each realistic mutation.

<!-- Canonical security checklist: skills/security-review/SKILL.md — update all copies together. -->
**Security:**
- No secrets, credentials, tokens, or connection strings in the diff?
- Input validated at trust boundaries (injection, path traversal, unsafe deserialization)?
- Authorization checked on new or changed routes/APIs?
- New dependencies vetted (source, maintenance, known CVEs)?
- No sensitive data written to logs or error messages?

**Returns:** Findings (Critical/Important/Minor), optional Open Questions / Assumptions, Assessment
