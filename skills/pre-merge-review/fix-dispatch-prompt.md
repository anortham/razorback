# Fix Dispatch Prompt Template

Use this template when routing a single verified finding from the external reviewer into the harness-native fix flow. On harnesses with delegation, dispatch a fresh `general-purpose` implementer worker. On Gemini or any no-delegation run, use the same sections as an inline checklist. One worker dispatch per finding is the default; see the batching edge case at the bottom for when findings cluster on one file.

The template mirrors the shape of `skills/subagent-driven-development/implementer-prompt.md` but is scoped to one finding — no multi-task list, no file ownership negotiation across tasks, just a targeted fix.

## Template

```
Fresh implementer dispatch (delegation available):
  description: "Fix review finding: [short finding title]"
  prompt: |
    You are fixing a single verified finding from an external pre-merge code review.

    ## Finding

    [FULL finding text from the reviewer output — title, severity, body, recommendation. Paste verbatim; do not summarize.]

    ## Location

    File: [path/to/file.ext]
    Lines: [line_start]-[line_end]

    ## Symbol target

    [Name the symbol or code region this finding touches. Include one short note if the public API impact matters. Do not paste raw `julie:deep_dive` or `julie:fast_refs` output here. The person applying the fix will re-orient with Julie before editing.]

    ## Plan context

    [Two-sentence summary of what the plan was doing in this area. Example:
    "This branch added pre-merge external review orchestration. The change in
    src/review/parse.ts wires gemini's envelope-unwrap parser into the findings
    normalization step."]

    ## Model Routing

    Assigned tier: [implementation / mechanical / strategy / escalation]
    Harness mapping: [model/reasoning setting or inherit]

    If the finding exposes hidden invariants, weak tests, public API risk, or
    repeated failure, use the strategy/escalation tier. If the harness cannot
    choose model or reasoning per worker, use inherit and report that limitation.

    ## Scope boundary (critical)

    Fix ONLY this finding. Do not refactor. Do not expand scope. Do not "improve
    nearby code." If the fix reveals an unrelated issue, note it in your report
    and stop — do not attempt to address it.

    If the fix requires a structural change the finding doesn't spell out (e.g.
    extracting a helper, changing a function signature that has other callers),
    report BLOCKED with a short description and do not apply the fix. The lead
    will reclassify the finding (likely to flagged-for-your-review) and you will
    be re-dispatched with clearer direction if needed.

    ## Orientation (REQUIRED before coding)

    Julie-first orientation is mandatory here too. Even though the lead has
    provided symbol context above, confirm it yourself with Julie before
    editing:

    1. `julie:get_symbols(file_path='<file>', target='<function or region>')` -
       see the exact structure of what you're about to change.
    2. `julie:deep_dive(symbol='<symbol>')` - re-check the symbol's callers,
       callees, and surrounding semantics before changing it.
    3. `julie:fast_refs(symbol='<symbol>')` - re-check impact if your fix changes
       behavior visible to callers.

    Do NOT use Glob -> Read -> Grep chains for exploration, and do not start by
    opening raw files or raw diffs. Julie tools return targeted, token-efficient
    context.

    ## Your job

    1. Apply the minimum change that resolves the finding.
    2. Add or update tests that would have caught the defect (if the finding
       describes a real-bug). For real-improvement findings where a test is not
       meaningful, skip this — quality changes don't always have test coverage.
    3. Run the assigned verification scope from the plan:

       ```
       [scope label and concrete command from the plan's Verification Strategy]
       ```

       The assigned scope must pass before you commit. Do not run broader scopes
       unless the lead assigned them.

    4. Commit with message prefix `fix(review): ` followed by the finding's short
       title. Example: `fix(review): preserve error cause in parseReviewOutput`.
       One commit per finding. Do not bundle unrelated changes.

    ## Report format (required)

    When done, report in plain text (not JSON):

    **Status:** DONE | BLOCKED

    - What you changed (file:line references)
    - Commit SHA (first 7 chars)
    - Verification scope, command, commit SHA, result, and timestamp
    - **Julie calls used** - list the Julie calls you made before editing
    - Any observations that belong in the morning report's judgment-calls log
      (e.g. "chose to preserve original stack via cause rather than rethrowing
      raw err because cause is supported by the project's Node version")

    If BLOCKED, describe what blocked you and what the lead needs to do:
    re-dispatch with more context, reclassify the finding, or surface it to the
    user.
```

## Edge case: multiple findings on the same file

If the reviewer flagged 2+ verified findings on the same file, do **not** dispatch parallel workers for them - they would collide on file ownership. Two options:

**Option A — serialize (preferred when the findings are independent):**

Dispatch one worker per finding, but run them sequentially. Wait for each to report DONE before starting the next. Each commits its own fix.

**Option B — batch (preferred when findings share code paths or the fixes are coupled):**

One worker dispatch, all findings listed in the prompt, single commit with all fixes. Use this template with these modifications:

- "## Finding" -> "## Findings" (plural, numbered list).
- "## Location" -> list each finding's file:line.
- "## Scope boundary" - update: "Fix ONLY these N findings. Apply them as a coherent set - if the findings overlap, one coordinated fix may be cleaner than N isolated ones, but still do not expand scope beyond the listed findings."
- "## Commit" - single commit with message `fix(review): address N findings in <file>` and a body listing each finding's short title.

File ownership prevents conflicts because the single worker owns the file for the duration of its run.

**Do NOT batch across files.** One worker per file at most - if the batch spans multiple files you lose the "fix only this one thing" discipline that makes review-fix dispatches low-risk.

## Why fresh workers (not existing implementation-phase workers)

The external review runs after the implementation phase has ended. Fresh workers work at any point in the timeline regardless of worker state. They also come with no implementation-phase bias that might rationalize around a finding - the implementer who wrote the code is the one most likely to explain away a real defect in it.

A fresh worker reads the finding, reads the code, applies the fix, and leaves. That's the right shape for review-originated work.
