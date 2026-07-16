# Verification Protocol

The rules the lead applies to each reviewer finding before deciding whether to fix, dismiss, or flag it. External reviewers over-report; every finding gets classified against the actual code before any action is taken.

## Classification

Every finding falls into exactly one of four buckets:

### real-bug

The code actually has the defect described. A caller, callee, edge case, or invariant breaks in the way the reviewer claims. Fix is **mandatory**.

**Verify with Miller**:

- **Inspect the referenced symbol** with `inspect(target, depth=overview)` — confirm the symbol exists, check its callers/callees/types to see if the described path is real; escalate to `depth=full` only for the symbol the finding centers on.
- **Find references** with `trace` — if the finding touches a public API or shared utility, check the full reference graph to size the impact.
- **List the file's symbols** with `inspect` — scan the file's structure to confirm the reviewer is pointing at the right region.

**Example — real-bug:**

> Reviewer: "In `src/auth/session.ts:45-58`, `refreshToken()` mutates `session.expiresAt` before the new token is validated. If validation fails at line 71, the session is left with a future-dated expiry pointing at an invalid token — next request appears authenticated but has no valid credential."
>
> Lead verifies:
> - Inspect `refreshToken` — confirms the function mutates `session.expiresAt` at line 47, calls `validateToken()` at line 71, and returns early on validation failure without rolling back the mutation.
> - Find references to `session.expiresAt` — confirms `expiresAt` is read by middleware `requireAuth` at `src/middleware/auth.ts:22` for "is session still valid?" checks.
> - Classification: **real-bug**. Fix: roll back `expiresAt` mutation in the validation-failure branch, or defer the mutation until after `validateToken()` succeeds.

### real-improvement

Not a bug, but a legitimate quality improvement — better naming, reduced coupling, a missed edge case that matters, missing error handling at a genuine boundary. Fix is **recommended unless it expands scope beyond the plan**. If the fix would pull in unrelated subsystems or require architectural decisions the plan doesn't cover, reclassify as **out-of-scope** and flag it for follow-up.

**Verify with Miller:** same capabilities as real-bug. The goal is to confirm the described improvement is applicable to the code as written, not to a hypothetical version of it.

**Example — real-improvement:**

> Reviewer: "The `parseReviewOutput()` helper in `src/review/parse.ts:12-40` catches a generic `Error` and re-throws with context, but loses the original stack. Consider `cause: err` in the re-throw so downstream logs keep the stack trace."
>
> Lead verifies:
> - List symbols in `src/review/parse.ts` / inspect `parseReviewOutput` — confirms the helper catches `Error` at line 34 and throws `new Error('failed to parse review output: ' + err.message)` without preserving cause.
> - Find references to `parseReviewOutput` — 3 callers, all inside the review flow, all log the thrown error.
> - Classification: **real-improvement**. Fix is small (single-line change), scope is contained, and the better stack traces would help future debugging. Apply.

### false-positive

The reviewer misread the code, invented a code path that doesn't exist, or flagged a pattern the codebase uses intentionally. Dismiss with a written reason.

**Verify with Miller:** verify by checking the actual code. The standard of evidence is "I looked and the reviewer's premise is wrong" — not "I don't think that's a problem."

**Example — false-positive:**

> Reviewer: "In `src/config/load.ts:88-92`, you call `fs.readFileSync` without a try/catch. If the config file is missing the process will crash."
>
> Lead verifies:
> - List symbols in `src/config/load.ts` / inspect `loadConfig` — reads the function. The `readFileSync` call is inside a `try { ... } catch (err) { ... }` block that starts at line 80 and closes at line 110. The reviewer missed the outer try.
> - Classification: **false-positive**. Dismissal reason for the morning report: "Reviewer missed the outer try/catch at src/config/load.ts:80-110 that wraps the readFileSync call. The error path is already handled."

### out-of-scope

Real finding, but outside the plan's scope — it touches an unrelated subsystem, or the fix requires architectural decisions the plan doesn't cover, or the issue pre-dates this branch and isn't touched by the current changes. Dismiss with "out of scope, filed as follow-up" (or an equivalent specific reason) and, if the issue merits tracking, note it in the morning report's "Next steps" section so the user can file a ticket.

**Verify with Miller:** confirm the finding is real and well-grounded (same verification as real-bug / real-improvement), then compare against the plan's stated scope.

**Example — out-of-scope:**

> Reviewer: "The SQL queries in `src/reports/export.ts:120-160` build strings with interpolation rather than parameterized queries. This is an injection risk if any input is user-controlled."
>
> Lead verifies:
> - Inspect `exportReport` — confirms the interpolation is real at lines 128, 141, 154.
> - Find references to `exportReport` — the callers pass user-sourced `reportId`, so the risk is real.
> - But: the current plan is "add pre-merge external review" — touches review orchestration, not the reports subsystem. The SQL issue is pre-existing, unrelated to this branch's changes, and fixing it would expand scope into the reports subsystem and likely require a security review.
> - Classification: **out-of-scope**. Dismissal reason for the morning report: "Pre-existing injection risk in src/reports/export.ts:120-160, unrelated to this branch's scope (pre-merge review orchestration). Filed as a follow-up ticket for the reports subsystem."

## Dismissal rule

**No finding is dismissed without a written reason.** The reason goes into the morning report's "Dismissed" sub-block under External review. The user reads those reasons when reviewing the PR and can override any of them — but they can only override what they can see. Silent dismissals defeat the entire point of running an external reviewer.

Acceptable dismissal reasons cite evidence: "reviewer missed the outer try/catch at line 80-110", "codebase uses `id` by convention — see CONTRIBUTING.md#naming", "pre-existing issue unrelated to this branch's scope, filed as follow-up". Unacceptable dismissal reasons hand-wave: "doesn't apply here", "not a real problem", "low priority".

## Flagging rule

If a finding is real (real-bug or real-improvement) **AND** the lead cannot determine the right fix without human input, do **NOT** attempt a fix. Flag it in the morning report's "Flagged for your review" sub-block with a short "why uncertain" note.

Cases that warrant flagging rather than fixing:

- **Architectural question.** The finding is valid but the right fix touches a system boundary that the plan did not pre-authorize (e.g. "should this cache layer be invalidated on write or on read?").
- **Priority trade-off.** The fix is obvious in direction but the cost/benefit isn't clear without user input (e.g. "fixing this adds 200ms to the hot path — is that acceptable?").
- **Security-boundary call.** The finding touches an auth or permission boundary and the fix could either tighten or widen scope in ways that need human review.

Acceptable "why uncertain" notes cite the specific judgment call: "fixing requires deciding whether to invalidate the session cache on every write — has user-visible latency impact, needs your call". Unacceptable: "not sure", "complicated", "beyond my pay grade".

## Summary

| Classification | Action | Morning-report slot |
|---|---|---|
| real-bug | Fix via fresh implementer subagent | "Verified real, fixed" |
| real-improvement | Fix if scope-contained; else reclassify out-of-scope | "Verified real, fixed" (or "Dismissed" if reclassified) |
| false-positive | Dismiss with evidence-grounded reason | "Dismissed" |
| out-of-scope | Dismiss with scope-grounded reason; consider filing follow-up | "Dismissed" + possible "Next steps" entry |
| (any real finding the lead can't resolve) | Flag with "why uncertain" note | "Flagged for your review" |
