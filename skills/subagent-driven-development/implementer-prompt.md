# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Agent tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description

    [FULL TEXT of task from plan - paste it here, don't make subagent read file]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task description

    **Ask them now.** Raise any concerns before starting work.

    ## Codebase Orientation (REQUIRED before coding)

    Before writing any code, orient yourself using Julie's code intelligence tools:

    1. **Understand the area:** `get_context(query='<area described in task>')`
       Returns token-budgeted context: pivots (full code), neighbors (signatures), file map.

    2. **Understand symbols you'll modify:** `deep_dive(symbol='<symbol name>')`
       Shows callers, callees, children, types — everything you need to make safe changes.

    3. **Check impact:** `fast_refs(symbol='<symbol name>')`
       See all references before changing anything. Required — do not skip.

    4. **Read targeted code:** `get_symbols(file_path='<file>', target='<function>')`
       See specific symbols instead of reading entire files.

    **Do NOT use Glob → Read → Grep chains for exploration.** Julie tools return
    targeted, token-efficient context in 1-2 calls instead of 5-8.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    When done, report:
    - What you implemented
    - What you tested and test results
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns
```
