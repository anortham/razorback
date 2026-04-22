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

    You are operating inside an approved plan. The plan text in "Task Description" above is the authoritative spec. If something is ambiguous:

    1. Read the plan context to see if it's disambiguated elsewhere.
    2. Check the surrounding codebase with Julie tools (`get_context`, `deep_dive`, `fast_refs`).
    3. If still ambiguous, pick the plan-consistent option and note the choice in your report (file:line + reason).

    **Only stop and report BLOCKED if** (see blocker taxonomy):
    - Credentials or environment is broken and the plan doesn't say how to recover
    - Your task requires a destructive action not authorized by the plan
    - The code state contradicts a load-bearing plan assumption
    - There's a safety-critical ambiguity (security, data integrity, billing, auth) with no plan answer

    Otherwise, make the call, note it, and proceed.

    ## Codebase Orientation (HARD REQUIREMENT)

    Julie-first orientation is mandatory. Do not start by reading raw files,
    whole diffs, or grep output. Before writing any code, orient yourself using
    Julie's code intelligence tools in this order:

    1. **Understand the area:** `get_context(query='<area described in task>')`
       Returns token-budgeted context: pivots (full code), neighbors (signatures), file map.

    2. **Understand symbols you'll modify:** `deep_dive(symbol='<symbol name>')`
       Shows callers, callees, children, types — everything you need to make safe changes.

    3. **Check impact:** `fast_refs(symbol='<symbol name>')`
       See all references before changing anything. Required — do not skip.

    4. **Read targeted code:** `get_symbols(file_path='<file>', target='<function>')`
       See specific symbols instead of reading entire files.

    5. **Only then read raw code if needed:** after the Julie calls above, read
       the minimum raw code needed for the edit.

    **Do NOT use Glob -> Read -> Grep chains for exploration.** Julie tools return
    targeted, token-efficient context in 1-2 calls instead of 5-8. If you skip
    Julie and start with raw-file exploration, you have broken the workflow.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

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
    - **Julie calls used** - list the `get_context` / `deep_dive` / `fast_refs` / `get_symbols` calls you made and what each one confirmed
    - Self-review findings (if any)
    - **Judgment calls made** - non-obvious decisions in the form `file:line - chose X over Y because [reason]`. Include every ambiguity you resolved without asking. Feeds the morning report's "Judgment calls" section.
    - Any issues or concerns
```
