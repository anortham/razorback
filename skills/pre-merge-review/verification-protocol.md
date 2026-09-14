# Verification Protocol

External reviewers over-report. Classify every finding against the actual code before acting. Verify with code-kb: `get_symbol_context(symbol_name, file_path?)` for the referenced symbol (`get_symbol_body` only for the symbol the finding centers on), `find_references` when a public API or shared utility is touched, `file_skeleton(file_path)` to confirm the reviewer points at the right region.

## Classifications

| Class | Meaning | Action | Report slot |
|---|---|---|---|
| real-bug | The described defect exists: a caller, callee, edge case, or invariant breaks as claimed | Fix, mandatory | "Verified real, fixed" |
| real-improvement | Not a bug; a legitimate quality gain (naming, coupling, missed edge case, missing boundary error handling) | Fix if scope-contained; else reclassify out-of-scope | "Verified real, fixed" or "Dismissed" |
| false-positive | Reviewer misread the code, invented a path, or flagged an intentional pattern | Dismiss with an evidence-citing reason | "Dismissed" |
| out-of-scope | Real, but outside the plan: unrelated subsystem, architectural decision the plan lacks, or pre-existing and untouched | Dismiss "out of scope, filed as follow-up"; note in Next steps if worth tracking | "Dismissed" + "Next steps" |
| any real finding the lead cannot resolve | Needs human input | Flag with a why-uncertain note | "Flagged for your review" |

The false-positive standard is "I looked and the premise is wrong", not "I don't think that's a problem". Out-of-scope still requires confirming the finding is real before comparing it to the plan's scope.

## Examples

**real-bug.** Reviewer: `refreshToken()` at `src/auth/session.ts:45-58` mutates `session.expiresAt` before validation; a failure at line 71 leaves a future expiry on an invalid token. Lead inspects `refreshToken` (mutation at 47, early return after `validateToken()` without rollback) and traces `expiresAt` to `requireAuth` middleware. Fix: defer the mutation until validation succeeds.

**false-positive.** Reviewer: `fs.readFileSync` at `src/config/load.ts:88-92` has no try/catch. Lead inspects `loadConfig`: the call sits inside a try/catch spanning lines 80-110. Dismissal: "Reviewer missed the outer try/catch at src/config/load.ts:80-110."

**out-of-scope.** Reviewer: string-interpolated SQL at `src/reports/export.ts:120-160`. Lead confirms the interpolation and user-sourced callers, but the plan touches review orchestration only and the issue pre-dates the branch. Dismissal: "Pre-existing injection risk in src/reports/export.ts:120-160, unrelated to this branch's scope. Filed as follow-up."

## Dismissal rule

No dismissal without a written reason in the morning report's "Dismissed" sub-block; the user can override only what they can see. Acceptable reasons cite evidence ("missed the outer try/catch at 80-110", "codebase uses `id` by convention, see CONTRIBUTING.md#naming", "pre-existing, unrelated to scope, filed as follow-up"). Unacceptable: "doesn't apply", "not a real problem", "low priority".

## Flagging rule

Flag instead of fixing when the finding is real and the fix needs a human call:

- Architectural question: the fix crosses a boundary the plan did not authorize.
- Priority trade-off: cost/benefit unclear ("adds 200ms to the hot path").
- Security-boundary call: the fix could tighten or widen an auth/permission scope.

The why-uncertain note names the judgment call ("requires deciding whether to invalidate the session cache on every write; user-visible latency"), never "not sure" or "complicated".
