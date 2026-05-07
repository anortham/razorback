# Fix Prompt Template (Resume Implementer)

Use this template when resuming the implementer subagent to fix review issues.
The subagent already has full context from its implementation pass.

```
Agent tool (resume: "<implementer-agent-id>"):
  description: "Fix review issues for Task N"
  prompt: |
    The reviewer found issues with your implementation. Fix them.

    ## Review Findings

    [Paste the reviewer's full output here — issues, severity, file:line references]

    ## What to Do

    1. Fix each issue listed above
    2. Fix the structural cause, not only the symptom
    3. Do not weaken tests or introduce speculative seams
    4. Run the assigned verification scope from the plan
    5. Commit the fixes
    6. Report what you changed

    Keep it focused - fix what the reviewer flagged, don't refactor beyond that.

    ## Re-Orientation (REQUIRED before editing)

    Even on a resume, confirm the change with Julie before touching code:

    1. `get_symbols(file_path='<changed file>', target='<symbol or region>')`
       to re-anchor on the exact edit location.
    2. `deep_dive(symbol='<modified symbol>')` for the symbol you are changing.
    3. `fast_refs(symbol='<modified symbol>')` if the fix changes behavior that
       callers could observe.

    Do not start by skimming raw files. Julie-first still applies during fix
    rounds.

    ## Report Format

    When done, report:
    - What you changed
    - Verification scope, command, commit SHA, result, and timestamp
    - **Julie calls used** - list the Julie calls you made during the fix round
    - Any judgment calls made
```

**Why resume instead of fresh dispatch:** You already have the full context — the files
you read, the decisions you made, the tests you wrote. A fresh subagent would spend
most of its token budget just getting back to where you already are. This applies to
iterations 1-3 of the review loop. For the 4th-iteration reframed-context case, see
the section below.

## Reframed-Context Attempt (4th iteration)

When the review loop has exhausted 3 resume attempts (Claude Code) or 3
fresh-dispatch-with-fix-context attempts (opencode) and the task still fails review,
the 4th attempt is a **fresh subagent with reframed context** — not another resume.
The prior implementer's chat context is gone; the fresh subagent starts from a clean
slate with a different framing.

Context available to the fresh subagent:

- **Prior commits (with SHAs)** — for reading (`git show <sha>`, `git log <base>..HEAD`),
  not as a baseline to extend. The fresh subagent can see what was tried without
  re-exploring the codebase.
- **Original task text** — copied from the plan, the same shape as the first dispatch.
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
implementer reports -> lead does inline review -> if issues remain, the task is flagged
in the morning report's "Blockers hit" section and the run continues with remaining
tasks. Escalate to the user only if the failure matches blocker taxonomy #5
(unresolvable test failures blocking the whole plan).

The 4th attempt's value is the reframing, not the freshness. If the lead cannot
articulate a reframe ("try harder" is not a reframe), skip the 4th attempt and go
straight to flag-and-continue.
