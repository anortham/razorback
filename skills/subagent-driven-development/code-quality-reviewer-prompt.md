# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

~~~
Agent tool (razorback:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]

  ADDITIONAL CONTEXT FOR REVIEWER:
  Use Julie tools for impact analysis:
  - deep_dive(symbol) on modified symbols to understand callers/callees/types
  - fast_refs(symbol) to verify changes don't break dependents
  - get_symbols(file_path) to review file structure without reading entire files
~~~

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
