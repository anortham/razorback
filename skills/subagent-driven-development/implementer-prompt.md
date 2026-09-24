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

    Re-read the brief and Contract inputs, then check current source with native tools or code-kb. If still
    ambiguous, pick the plan-consistent option and note it in your report (file:line + reason).

    Stop and report BLOCKED only for the blocker taxonomy
    (`skills/using-razorback/references/blocker-taxonomy.md`): broken credentials/env with no
    plan recovery; a destructive action the plan does not authorize; code state contradicting
    a load-bearing plan assumption; safety-critical ambiguity (security, data integrity,
    billing, auth) with no plan answer; test failures that do not converge.

    ## Codebase Orientation

    Read the code the change touches before writing code. Use the smallest sufficient
    evidence source: a search or file read for a named file, error, or string; code-kb for
    an unfamiliar module (`codebase_outline(path?, depth?)`, `file_skeleton(file_path)`,
    `get_symbol_context(symbol_name, file_path?)`). Find a symbol's callers before changing
    it (`find_references(symbol_name, direction="callers")` or a search). If code-kb is
    missing or its index is stale, use native search and file reads.

    ## API Shape Evidence

    Do not infer or invent API shapes. Confirm symbol names, function signatures, config
    shapes, route names, CLI flags, or public contracts from current source before relying
    on them. In your report, name the evidence that proved each shape; if the evidence
    cannot prove one, say what is missing and take the safest plan-consistent path.
    Repo evidence covers this repo only: for external framework/library/API surfaces use the verified
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

    Worker red/green scope (per change): [worker-red-green command from plan]
    Worker ceiling (once, on the final tree): [worker-ceiling command from plan]

    - Run the lowest-cost repo-defined command that proves the changed behavior: the
      repo's runner narrowed with its own filter (file, name pattern, or id). Never invent
      a runner. After a failure, rerun only the failing test ids until they pass, then the
      assigned scope once; capture wide output to a file instead of rerunning to read it.
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

    - `serial-worker-commit`: after assigned verification passes, stage only your owned files, commit, and report the resulting SHA. If this commit records a consequential decision or a surprising failure, write a Goldfish checkpoint before the commit and stage its artifact with your files. If Goldfish is unavailable, record the decision or failure in your report and continue.
    - `parallel-lead-commit`: do not checkpoint and do not run `git add` or `git commit`. Edit only your owned files, write the full report to the report file, and report `commit SHA: none - parallel-lead-commit`; the lead owns the commit.

    ## You Do Not Dispatch Subagents

    Do all of this task's work yourself. Never spawn a subagent to
    implement part of the task, and above all never spawn a reviewer to
    check your work. Self-review (below) means reading your own diff.
    Review is the lead's job: after you report, the lead conducts
    an inline review against your diff. A reviewer you spawn duplicates
    that review at full cost, and its approval counts for nothing in
    the process. If you catch yourself thinking "an independent review
    would strengthen my report" — that review is already scheduled.
    Report instead.

    ## Self-Review

    Before reporting: every requirement implemented, edge cases handled, names accurate,
    nothing beyond the request (YAGNI), existing patterns followed, tests verify behavior
    (not mocks). Fix what you find first.

    ## Report Format

    - What you implemented; files changed
    - Verification invariant, scope label, command, commit SHA if any, result, timestamp;
      hard-gate vs report-only metrics when relevant
    - **API-shape evidence** — the search, file read, or code-kb call that confirmed each
      symbol name, signature, config shape, route, CLI flag, or public contract relied on
    - **Judgment calls made** — `file:line - chose X over Y because [reason]`, one per
      ambiguity resolved without asking (feeds the morning report)
    - Self-review findings, issues, concerns
```
