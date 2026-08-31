# Fix Prompt Template (Resume Implementer)

Use this template when resuming the implementer subagent to fix review issues.
The subagent already has full context from its implementation pass.

On Claude Code, resume = `SendMessage` to the stored implementer's agent ID or
name with this prompt as the message (older builds exposed a `resume` parameter
on the `Agent` tool instead). On Codex, resume = `followup_task(target=<agent-id>, …)`.

```
SendMessage (to: "<implementer-agent-id-or-name>"):
  summary: "Fix review issues for Task N"
  message: |
    The reviewer found issues with your implementation. Fix them.

    ## Review Findings

    [Paste the reviewer's full output here — issues, severity, file:line references]

    ## Contract inputs

    [Exact shared constraints, fixtures, upstream outputs, tool contracts, or public strings this task may rely on]

    ## File ownership

    [Exact files this task may modify during the fix]

    Report file: [path under the plan's workspace, .razorback/sdd/<plan-key>/]

    ## What to Do

    1. Fix each issue listed above
    2. Fix the structural cause, not only the symptom
    3. Do not weaken tests or introduce speculative seams
    4. Run the assigned verification scope from the plan
    5. Apply the assigned commit mode
    6. Report what you changed

    Keep it focused - fix what the reviewer flagged, don't refactor beyond that.

    ## Re-Orientation (REQUIRED before editing)

    Even on a resume, confirm the change with Miller before touching code:

    1. List the file's symbols to re-anchor on the exact edit location
       (Miller `inspect(target='<file>')`).
    2. Inspect the symbol you are changing
       (Miller `inspect(target='<symbol>', depth=full)`).
    3. Find references if the fix changes behavior callers could observe
       (Miller `trace(target='<symbol>')`).

    Do not start by skimming raw files. Miller-first still applies during fix rounds.
    Do not infer or invent API shapes. Use Miller to discover symbol names, function
    signatures, config shapes, route names, CLI flags, or public contracts before
    relying on them. If Miller cannot prove the shape, say what evidence is missing
    instead of guessing.

    ## Commit mode

    Commit mode: [serial-worker-commit / parallel-lead-commit]

    - `serial-worker-commit`: after assigned verification passes, you may commit
      only your owned files and report the resulting SHA.
    - `parallel-lead-commit`: do not run `git add` or `git commit`. Edit only
      your owned files, write the full report to the report file, and report
      `commit SHA: none - parallel-lead-commit`.

    ## Report Format

    When done, report:
    - What you changed
    - **Covering tests per finding** - for each finding you fixed, name the
      test(s) that cover the fix, the exact command you ran, and the output.
      The lead gates re-review on this evidence; a report without it comes
      back to you unreviewed.
    - Verification invariant, scope label, command, commit SHA if any, result, and timestamp
    - **Miller calls used** - list the orient / inspect / find-references calls you made during the fix round
    - **API-shape evidence** - list the Miller evidence for any symbol names, function signatures, config shapes, route names, CLI flags, or public contracts you relied on
    - Any judgment calls made
```

**Why resume instead of fresh dispatch:** You already have the full context — the files
you read, the decisions you made, the tests you wrote. A fresh subagent would spend
most of its token budget just getting back to where you already are. This applies to
iterations 1-3 of the review loop. For the 4th-iteration reframed-context case, see
the section below.

## Reframed-Context Attempt (4th iteration)

When the review loop has exhausted 3 resume attempts (Claude Code), 3
`followup_task` attempts (Codex), or 3 fresh-dispatch-with-fix-context attempts
(opencode) and the task still fails review,
the 4th attempt is a **fresh subagent with reframed context** — not another resume.
The prior implementer's chat context is gone; the fresh subagent starts from a clean
slate with a different framing.

Context available to the fresh subagent:

- **Prior commits (with SHAs)** — for reading (`git show <sha>`, `git log <base>..HEAD`),
  not as a baseline to extend. The fresh subagent can see what was tried without
  re-exploring the codebase.
- **The task's brief path** — the single source of task requirements (SKILL.md Step 2), the same shape as the first dispatch.
- **All prior review-finding iterations** — rounds 1, 2, 3 of reviewer feedback, so
  the fresh subagent can see what kept failing.
- **Reframing note from the lead** — an explicit statement of what to try differently.
  Without this, fresh-dispatch is just a more expensive resume.

Reframing examples (the lead picks one that fits the failure mode):

- "We're trying a different angle because the prior framing didn't converge — here's
  what to try differently: [specific redirection]."
- "Simplify: implement just the core behavior in a single file first; we can
  refactor after. The prior attempts over-abstracted."
- "The prior attempts misinterpreted X; the plan's actual intent is Y."
- "Different decomposition: split the task into sub-steps A, B, C and commit each
  separately."

The fresh subagent still follows the standard review loop after its attempt:
implementer reports -> lead does inline review -> if issues remain, the lead
adjudicates at the cap (SKILL.md Step 3, "Cap adjudication"): each open finding
is ruled contested, real-but-deferred, or real-and-load-bearing, and only a
load-bearing ruling stops the run (blocker taxonomy #5).

The 4th attempt's value is the reframing, not the freshness. If the lead cannot
articulate a reframe ("try harder" is not a reframe), skip the 4th attempt and go
straight to cap adjudication.
