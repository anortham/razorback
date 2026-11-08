# Fix loop

Part of `razorback:subagent-driven-development` Step 4. Read it before every fix round, even when you read it earlier in this session: it holds the resume path, the scoped re-review, and the campaign boundary, and your memory of it does not survive compaction.

## Routing a fix

Send `fix-prompt.md` (the skill directory) with the findings to the saved implementer via the harness follow-up path (`references/harness-dispatch.md`); it keeps its orientation context. Iterations 1-3 preserve context; the 4th attempt is a fresh reframed dispatch with the prior-commit pointer (Step 3, "Review cap").

## Scoped re-review

1. Gate the fix report: covering tests, exact command, output. Missing evidence bounces the report; that is not a fix iteration.
2. Build the fix diff: `review-package PLAN_FILE FIX_BASE HEAD` by its absolute path (FIX_BASE = the head the previous review saw).
3. Verdict every prior finding ADDRESSED or NOT ADDRESSED with file:line. "Attempted" is not ADDRESSED.
4. Inspect only the fix diff for new breakage.
5. Observations outside the fix diff never extend the loop: ledger them at observed severity; Critical/Important go to cap adjudication; a blocker-taxonomy match stops the run.
6. Write the fix-round ledger line (`references/ledger.md`).

## Review campaign boundary

The routine scoped fix review here does not start a review campaign: three context-preserving attempts plus the optional reframed 4th attempt, each with lead-only scoped re-review. If a review reopens broad discovery or dispatches an external reviewer, invoke `razorback:managing-review-campaigns` first: one immutable campaign setup, count every external CLI call, close on terminal status.
