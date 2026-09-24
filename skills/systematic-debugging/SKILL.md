---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

**Core principle:** find the root cause before any fix. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Phase 1 incomplete → no fix proposals.

## When to Use

Any technical issue: test failures, production bugs, unexpected behavior, build failures, integration issues. Especially under time pressure, when "one quick fix" seems obvious, after fixes that did not work, or when you do not fully understand the issue.

**Not here:** when the output is right but late — a slow endpoint, query, page, job, build, or test suite — use `razorback:diagnosing-performance`. Slowness has no wrong line to trace; it needs measurement.

## The Four Phases

Complete each phase before the next.

### Phase 1: Root Cause Investigation

1. **Read the error completely.** Full stack trace, line numbers, file paths, error codes.
2. **Reproduce consistently.** Exact steps; every time? If not reproducible, gather more data — do not guess. A failing test run is already the reproduction: capture its full output to a file on the first run (long runs in the background), list every failing test id from that file, and reproduce with those ids only through the project runner's own filter (file, name pattern, or id). Never rerun the wide command to re-read output or to find the next failure.
3. **Check recent changes.** Git diff, recent commits, new dependencies, config, environment differences.
4. **Gather evidence across component boundaries** (CI → build → signing, API → service → database). Before proposing fixes, log what enters and exits each component, verify env/config propagation, run once, and read which layer breaks. Show presence, never values:
   ```bash
   echo "IDENTITY: $([ -n "${IDENTITY:-}" ] && echo SET || echo UNSET)"
   ```

<!-- Canonical Redact rule: skills/security-review/SKILL.md — update all copies together. -->
**Redact:**
- Redact every secret in anything you show, quote, or send — write `<REDACTED>` in its place.
- Build loops against env vars so the credential stays in the environment rather than in displayed output.
- From captured artifacts, quote only the lines that carry the signal.

5. **Trace data flow** when the error is deep in the call stack: where does the bad value originate, what called this with it, keep going up to the source. Fix at the source. Read `root-cause-tracing.md` in this directory for the full backward-tracing technique.

code-kb: `get_symbol_context(symbol_name, file_path?)` or `get_symbol_body` on the buggy function; `find_references(symbol_name, direction="callers")` for call sites that can trigger it; `codebase_outline` to orient on the subsystem.

### Phase 2: Pattern Analysis

1. **Find working examples** of similar code with native search and file reads, or code-kb `search_symbols` and `codebase_outline` when useful.
2. **Read the reference implementation completely** before applying its pattern. No skimming.
3. **List every difference** between working and broken, however small. Do not assume "that can't matter".
4. **Understand dependencies** with `get_symbol_context` and `find_references`: components, config, environment, assumptions.

### Phase 3: Hypothesis and Testing

1. **One written hypothesis:** "I think X is the root cause because Y." Specific, not vague.
2. **Smallest change that tests it.** One variable at a time.
3. **Worked → Phase 4. Did not → new hypothesis.** Never stack fixes.
4. **Do not know?** Say "I don't understand X". Research current source with native tools or code-kb, targeted docs, and the smallest verification command. In an approved autonomous run, stop only when the uncertainty matches the blocker taxonomy; outside one, ask one specific question once research is exhausted.

### Phase 4: Implementation

1. **Failing test first** — simplest reproduction, automated when possible. **REQUIRED SUB-SKILL:** razorback:test-driven-development.
2. **Single fix** — run code-kb `blast_radius(symbol='<symbol being changed>')` first for impacted symbols and likely tests. ONE change; no "while I'm here" improvements, no bundled refactoring.
3. **Verify** — rerun only the failing test ids until they pass, then the affected scope once; issue actually resolved. If a wider command failed, rerun that command once, on the changed tree, after every listed id passes; new failures → step 1 with the new ids. Only that final run is completion evidence.
4. **Fix failed?** STOP. Count attempts. Under 3 → Phase 1 with the new information. **3 or more → question the architecture. Do not attempt fix #4.**
5. **3+ failures = architectural problem**, not a failed hypothesis. Signs: each fix reveals new shared state or coupling elsewhere, fixes need "massive refactoring", each fix creates new symptoms. In an approved autonomous run, route through the blocker taxonomy: take a plan-consistent architecture fix and log the decision, or stop as a real blocker when the plan is contradicted or tests are unresolvable. Outside a run, discuss the architecture before more fixes. Use razorback:architecture-quality.

## Red Flags - STOP and Return to Phase 1

Every row below — whether it is your own thought or a redirection from the user — means the same thing: **STOP. Return to Phase 1.**

| Signal | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" / "Quick fix for now, investigate later" | Systematic debugging is FASTER than guess-and-check thrashing. The "later" investigation never happens. |
| "Just try changing X and see if it works" / "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "It's probably X, let me fix that" / "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "Here are the main problems: [lists fixes without investigation]" — proposing solutions before tracing data flow | Fixes proposed before investigation are guesses wearing a diagnosis. |
| "Add multiple changes, run tests" / "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Rerun the suite to see what is still failing" / "The output scrolled, run it again" | The first run's captured output already lists every failing id. Read the file; run the ids. The wide command runs once more, after the ids pass. |
| "Skip the test, I'll manually verify" / "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Pattern says X but I'll adapt it differently" / "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read the reference completely. |
| "I don't fully understand but this might work" | Not understanding IS the finding. Investigate it, don't route around it. |
| **"One more fix attempt" (after 2+ failures)** | 3+ failures = architectural problem. Question the pattern, don't fix again. |
| **Each fix reveals a new problem in a different place** | The coupling is the bug, not the symptom you just patched. |
| User asks "Is that not happening?" | You assumed without verifying. |
| User asks "Will it show us...?" | You should have added evidence gathering. |
| User says "Stop guessing" | You're proposing fixes without understanding. |
| User says "Ultra-think this" | Question fundamentals, not just symptoms. |
| User asks "We're stuck?" (frustrated) | Your approach isn't working. |

## No Root Cause Found

When investigation shows the issue is truly environmental, timing-dependent, or external: document what you investigated, implement appropriate handling (retry, timeout, error message), and add logging for the next time. 95% of "no root cause" cases are incomplete investigation.

## It's working if

- A written hypothesis preceded every fix, and each fix changed exactly one thing.
- The wide test command ran at most twice: once to capture the failing ids, once after they all passed.
- The fix has a failing-test reproduction that now passes.
- No fourth fix was attempted without questioning the architecture.
- Nothing secret appeared unredacted in any output you showed or sent.

## Supporting Techniques

- `root-cause-tracing.md` — trace backward through the call stack to the original trigger
- `defense-in-depth.md` — add validation at multiple layers after finding the root cause
- `condition-based-waiting.md` — replace arbitrary timeouts with condition polling
- `find-polluter.sh` — bisect test ordering to find state pollution

**Related skills:** razorback:diagnosing-performance (right but late); razorback:test-driven-development (Phase 4 failing test); razorback:verification-before-completion (prove the fix before claiming it); razorback:fixing-small-issues — when the root-caused fix meets the quick-fix criteria, execute it there: in place, affected-scope verification, no worktree or baseline suite.
