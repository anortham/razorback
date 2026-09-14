# Fix Dispatch Prompt Template

Routes one verified external-review finding into the harness-native fix flow: a fresh implementer worker when delegation exists, the same sections as an inline checklist otherwise. One dispatch per finding by default; see the same-file edge case below.

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

    [The symbol or code region this finding touches, plus one short note if public API impact matters. No raw inspect/trace output; you re-orient with code-kb before editing.]

    ## Plan context

    [Two sentences on what the plan was doing in this area.]

    ## Scope boundary (critical)

    Fix ONLY this finding. Do not refactor, expand scope, or improve nearby code.
    If the fix reveals an unrelated issue, note it in your report and stop.

    If the fix requires a structural change the finding does not spell out (a
    new helper, a signature change with other callers), report BLOCKED with a
    short description and do not apply the fix. The lead will reclassify.

    ## Orientation (REQUIRED before coding)

    1. Inspect file outline with code-kb `file_skeleton(file_path)`.
    2. Inspect the symbol, its callers and callees, with code-kb
       `get_context_slice(symbol_name, file_path?)` or `get_symbol_body(symbol_name, file_path?)`.
    3. Find references with code-kb `find_references(symbol_name, direction="callers")` if your fix
       changes caller-visible behavior.

    Do NOT use Glob -> Read -> Grep chains or start from raw files or diffs.
    Do not infer or invent API shapes: discover symbol names, function
    signatures, config shapes, route names, CLI flags, and public contracts with
    code-kb before relying on them. If code-kb cannot prove the shape, say what
    evidence is missing instead of guessing.

    ## Your job

    1. Apply the minimum change that resolves the finding.
    2. Add or update the test that would have caught it (real-bug findings;
       skip when a test is not meaningful for a real-improvement). Iterate on that
       test alone through the runner's own filter until it passes.
    3. Then run the assigned verification scope from the plan once:

       ```
       [scope label and concrete command from the plan's Verification Strategy]
       ```

       It must pass before you commit. Do not run broader scopes unassigned.

    4. Commit as `fix(review): <finding short title>`. One commit per finding.

    ## Report format (required)

    Plain text, not JSON:

    **Status:** DONE | BLOCKED

    - What you changed (file:line references)
    - Commit SHA (first 7 chars)
    - Verification scope, command, commit SHA, result, and timestamp
    - **code-kb calls used** - the skeleton / slice / body / refs calls you made before editing
    - **API-shape evidence** - the code-kb evidence for any symbol names, function signatures, config shapes, route names, CLI flags, or public contracts you relied on
    - Observations for the morning report's judgment-calls log

    If BLOCKED: what blocked you and what the lead needs to do (re-dispatch
    with more context, reclassify, or surface to the user).
```

## Edge case: multiple findings on the same file

Never dispatch parallel workers on one file. Either:

- **Serialize** (independent findings): one worker per finding, run sequentially, one commit each.
- **Batch** (coupled findings): one worker, all findings numbered under `## Findings`, each file:line under `## Location`, scope boundary reworded to "Fix ONLY these N findings as a coherent set", single commit `fix(review): address N findings in <file>` listing each title.

Do NOT batch across files; one worker per file at most.

## Why fresh workers

The review runs after implementation ends, so implementer context may be gone, and the implementer who wrote the code is the one most likely to rationalize around a defect in it. A fresh worker reads the finding, reads the code, applies the fix, and leaves.
