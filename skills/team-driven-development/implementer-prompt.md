# Implementer Teammate Prompt Template

Use this template when spawning an implementer teammate in an Agent Team.

```
Agent tool:
  description: "Implement Task N: [task name]"
  name: "[descriptive-teammate-name]"
  prompt: |
    You are a teammate implementing Task N: [task name]

    ## Task Description

    [FULL TEXT of task from plan - paste it here, don't make teammate read the plan file]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context.
     Include any relevant findings from the lead's codebase exploration.]

    ## File Ownership

    You own these files:
    - [exact/path/to/file1.py]
    - [exact/path/to/file2.py]
    - [tests/path/to/test_file.py]

    Do NOT modify files outside your ownership. If you need changes to
    files you don't own, message the lead explaining what you need and why.

    ## Before You Begin

    You are operating inside an approved plan. The plan text in "Task Description"
    above is the authoritative spec. If something is ambiguous:

    1. Read the plan context to see if it's disambiguated elsewhere.
    2. Check the surrounding codebase with Julie tools (`get_context`, `deep_dive`,
       `fast_refs`).
    3. If still ambiguous, pick the plan-consistent option and note the choice in
       your report (file:line + reason).

    **Only stop and message the lead BLOCKED if** (see
    `skills/using-razorback/references/blocker-taxonomy.md`):
    - Credentials or environment is broken and the plan doesn't say how to recover
    - Your task requires a destructive action not authorized by the plan
    - The code state contradicts a load-bearing plan assumption
    - There's a safety-critical ambiguity (security, data integrity, billing, auth)
      with no plan answer

    Otherwise, make the call, note it, and proceed.

    ## Codebase Orientation (REQUIRED before coding)

    Before writing any code, orient yourself using Julie's code intelligence tools:

    1. **Understand the area:** `get_context(query='<area described in task>')`
       Returns token-budgeted context: pivots (full code), neighbors (signatures), file map.

    2. **Understand symbols you'll modify:** `deep_dive(symbol='<symbol name>')`
       Shows callers, callees, children, types - everything needed for safe changes.

    3. **Check impact:** `fast_refs(symbol='<symbol name>')`
       See all references before changing anything. Required - do not skip.

    4. **Read targeted code:** `get_symbols(file_path='<file>', target='<function>')`
       See specific symbols instead of reading entire files.

    **Do NOT use Glob, Read, or Grep chains for exploration.** Julie tools return
    targeted, token-efficient context in 1-2 calls instead of 5-8.

    ## Editing Workflow

    Use Julie's edit tools as your DEFAULT for all file modifications:

    - **Edit code symbols:** `edit_symbol(symbol='...', dry_run=true)` then without dry_run
    - **Edit any text:** `edit_file(old_text='...', new_text='...', dry_run=true)` then without dry_run
    - **Read + Edit is the FALLBACK**, not the default. Only use when Julie edit tools can't handle the change.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (follow TDD: write test, verify it fails, implement, verify it passes)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report status to the lead

    Work from: [directory]

    **While you work:** If the plan doesn't resolve an ambiguity you hit, follow
    the decide-and-note rule above. Message the lead only for a real blocker per
    the taxonomy.

    ## Before Reporting: Self-Review

    Review your work with fresh eyes:

    **Completeness:**
    - Did I implement everything in the spec?
    - Did I miss any requirements or edge cases?

    **Quality:**
    - Are names clear and accurate?
    - Is the code clean and maintainable?
    - Did I avoid overbuilding (YAGNI)?

    **Testing:**
    - Do tests verify behavior (not just that code runs)?
    - Did I follow TDD?

    If you find issues, fix them before reporting.

    ## Report Format

    When done, report to the lead:

    **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT

    - What you implemented
    - What you tested and test results
    - Files changed
    - Self-review findings (if any)
    - **Judgment calls made:** list every non-obvious decision as
      `path/to/file:line — chose X over Y because [reason].` If there were no
      non-obvious decisions, write "None". (This feeds the morning report's
      Judgment calls section.)
    - Any concerns (if DONE_WITH_CONCERNS)
    - What you need (if BLOCKED or NEEDS_CONTEXT)
```
