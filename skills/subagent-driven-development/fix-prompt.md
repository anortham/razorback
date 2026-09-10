# Fix Prompt Template (Resume Implementer)

Send to the stored implementer (Claude Code: `SendMessage` to its agent ID or name; Codex: `followup_task(target=<agent-id>, …)`; opencode: fresh dispatch with the brief path and prior-commit pointer). Iterations 1-3 resume so the worker keeps its context; the 4th is the reframed attempt below.

```
SendMessage (to: "<implementer-agent-id-or-name>"):
  summary: "Fix review issues for Task N"
  message: |
    The reviewer found issues with your implementation. Fix them.

    ## Review Findings

    [Reviewer output — issues, severity, file:line]

    ## Contract inputs

    [Exact shared constraints, fixtures, upstream outputs, tool contracts, or public strings this task may rely on]

    ## File ownership

    [Exact files this task may modify during the fix]

    Report file: [path under the plan's workspace, .razorback/sdd/<plan-key>/]

    ## What to Do

    1. Fix each finding. Fix the structural cause, not only the symptom.
    2. Do not weaken tests or introduce speculative seams. Do not refactor beyond the findings.
    3. Run the assigned verification scope, apply the commit mode, report.

    ## Re-Orientation (REQUIRED before editing)

    Miller first, even on a resume: `inspect(target='<file>')` to re-anchor the edit location;
    `inspect(target='<symbol>', depth=full)` on the symbol you change; `trace(target='<symbol>')`
    if callers could observe the change. Do not infer or invent API shapes — prove symbol names,
    function signatures, config shapes, route names, CLI flags, or public contracts with Miller,
    or say what evidence is missing.

    ## Commit mode

    Commit mode: [serial-worker-commit / parallel-lead-commit]
    Local commit authority: authorized — [implementation request/repo instruction]

    If a user or host instruction explicitly prohibits commits, do not commit; report the exact instruction to the lead as an approval/blocker boundary.

    - `serial-worker-commit`: after assigned verification passes, checkpoint before the commit, explicitly stage the Goldfish checkpoint artifact with only your owned files, commit, and report the resulting SHA.
    - `parallel-lead-commit`: do not checkpoint the batch and do not run `git add` or `git commit`. Edit only your owned files, write the full report to the report file, and report `commit SHA: none - parallel-lead-commit`; the lead checkpoints before the reviewed lead commit.

    ## Report Format

    - What you changed
    - **Covering tests per finding** — the test(s), the exact command, and the output. The
      lead gates re-review on this; a report without it comes back unreviewed.
    - Verification invariant, scope label, command, commit SHA if any, result, timestamp
    - **Miller calls used** and **API-shape evidence** for every shape relied on
    - Judgment calls made
```

## Reframed-Context Attempt (4th iteration)

After 3 failed context-preserving attempts, dispatch a **fresh subagent with reframed context**, not another resume. Give it:

- Prior commit SHAs (`git show`, `git log <base>..HEAD`) — to read, not to extend.
- The task's brief path (SKILL.md Step 2).
- All three rounds of review findings.
- A reframing note stating what to try differently, e.g. "Simplify: core behavior in one file first; prior attempts over-abstracted", "Prior attempts misread X; the plan's intent is Y", or "Split into sub-steps A, B, C and commit each".

The value is the reframing, not the freshness. If the lead cannot state a reframe ("try harder" is not one), skip this attempt. After it, the lead reviews inline; remaining findings go to cap adjudication (SKILL.md Step 3, "Cap adjudication"): contested, real-but-deferred, or real-and-load-bearing — only load-bearing stops the run (blocker taxonomy #5).
