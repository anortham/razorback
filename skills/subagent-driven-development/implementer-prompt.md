# Implementer Subagent Prompt Template

```
Dispatch one implementer subagent:
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Brief

    Read this first — it is your requirements, with the exact values to use
    verbatim: [brief path printed by task-brief, .razorback/sdd/<plan-key>/task-N-brief.md]

    The brief is the single source of task requirements; exact values live there, not here.

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Contract inputs

    [Interfaces and decisions from earlier tasks this task consumes, plus the lead's
    resolution of known ambiguities. Not a summary of prior tasks.]

    ## File ownership

    [Exact files this task may modify]

    ## Ambiguity

    Re-read the brief and Contract inputs, then check the codebase with Miller. If still
    ambiguous, pick the plan-consistent option and note it in your report (file:line + reason).

    Stop and report BLOCKED only for the blocker taxonomy
    (`skills/using-razorback/references/blocker-taxonomy.md`): broken credentials/env with no
    plan recovery; a destructive action the plan does not authorize; code state contradicting
    a load-bearing plan assumption; safety-critical ambiguity (security, data integrity,
    billing, auth) with no plan answer; test failures that do not converge.

    ## Codebase Orientation (HARD REQUIREMENT)

    Miller first, before reading raw files or writing code:
    1. Orient: Miller `context(query='<area>')`.
    2. Inspect each symbol you will modify: Miller `inspect(target='<name>', depth=full)`.
    3. Find references before changing anything: Miller `trace(target='<name>')`.
    4. List a file's symbols instead of reading it whole: Miller `inspect(target='<file>')`.
    5. Only then read the minimum raw code the edit needs.
    No Glob -> Read -> Grep chains.

    ## API Shape Evidence

    Do not infer or invent API shapes. Use Miller to prove symbol names, function
    signatures, config shapes, route names, CLI flags, or public contracts before relying
    on them. In your report, report the exact Miller calls that proved each shape; if Miller
    cannot prove one, say what evidence is missing and take the safest plan-consistent path.
    Miller covers this repo only: for external framework/library/API surfaces use the verified
    surface or doc URL in your task, never training memory; if none is given, say so and follow
    the repo's existing usage pattern.

    ## Architecture Quality

    The approved module/interface shape in the plan is part of the spec.
    - Preserve the approved module/interface shape. Do not redesign locally.
    - If code reality contradicts the approved shape, report a plan mismatch.
    - Does this keep complexity local?
    - Is the caller-facing interface smaller than the behavior it unlocks?
    - Are tests written through the same interface callers use?
    - Did new seams earn their keep?
    - Did this avoid speculative extensibility?
    - Did it fix the structural cause, not only the symptom?

    ## Your Job

    Implement exactly the task (TDD when the task says so), verify with the assigned worker
    scope, apply the commit mode, self-review, report.

    Work from: [directory]
    Report file: [path under the plan's workspace, .razorback/sdd/<plan-key>/]

    ## Verification Scope

    Assigned worker scope: [worker-red-green / worker-ceiling command from plan]

    - Run the lowest-cost repo-defined command that proves the changed behavior; never
      invent runner commands.
    - State the invariant each assigned test, replay, metric, or acceptance gate proves; for
      replay/metric evidence, separate hard gates from report-only metrics.
    - If assigned verification fails, stop and report BLOCKED unless the plan says to update
      that gate. Never commit failing verification.
    - Do not own affected-change, branch-gate, or expensive-specialist scopes; a broad command
      run for diagnostics is diagnostic output, not acceptance evidence.
    - Report invariant, scope label, command, commit SHA, result, and timestamp.

    ## Commit mode

    Commit mode: [serial-worker-commit / parallel-lead-commit]
    Local commit authority: authorized — [implementation request/repo instruction]

    If a user or host instruction explicitly prohibits commits, do not commit; report the exact instruction to the lead as an approval/blocker boundary.

    - `serial-worker-commit`: after assigned verification passes, checkpoint before the commit, explicitly stage the Goldfish checkpoint artifact with only your owned files, commit, and report the resulting SHA.
    - `parallel-lead-commit`: do not checkpoint the batch and do not run `git add` or `git commit`. Edit only your owned files, write the full report to the report file, and report `commit SHA: none - parallel-lead-commit`; the lead checkpoints before the reviewed lead commit.

    ## Self-Review

    Before reporting: every requirement implemented, edge cases handled, names accurate,
    nothing beyond the request (YAGNI), existing patterns followed, tests verify behavior
    (not mocks). Fix what you find first.

    ## Report Format

    - What you implemented; files changed
    - Verification invariant, scope label, command, commit SHA if any, result, timestamp;
      hard-gate vs report-only metrics when relevant
    - **Miller calls used** — each orient / inspect / trace / list-symbols call and what it confirmed
    - **API-shape evidence** — Miller evidence for every symbol name, signature, config shape,
      route, CLI flag, or public contract relied on
    - **Judgment calls made** — `file:line - chose X over Y because [reason]`, one per
      ambiguity resolved without asking (feeds the morning report)
    - Self-review findings, issues, concerns
```
