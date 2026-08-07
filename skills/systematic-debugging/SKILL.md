---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

<!-- Canonical Redact rule: skills/security-review/SKILL.md — update all copies together. -->
**Redact:**
- Redact every secret in anything you show, quote, or send — write `<REDACTED>` in its place.
- Build loops against env vars so the credential stays in the environment rather than in displayed output.
- From captured artifacts, quote only the lines that carry the signal.

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See `root-cause-tracing.md` in this directory for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

**Use Miller for investigation:**
- **Inspect** the buggy function — understand callers, callees, type flow with `inspect(target, depth=full)` (the symbol at issue earns `full`)
- **Find references** — find all call sites that might trigger the bug with `trace`
- **Orient** on the broader subsystem with `context`

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - **Search** for similar working code in the codebase with Miller `search`
   - **Orient** for a token-budgeted view of the relevant area with Miller `context`
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - **Inspect** the broken function — see callers, callees, types, children with Miller `inspect(target, depth=full)`
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Research more with Miller, targeted docs, and the smallest relevant verification command
   - In an approved autonomous run, stop only if the uncertainty matches the blocker taxonomy
   - Outside an approved run, ask one specific question if the research path is exhausted

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Use the `razorback:test-driven-development` skill for writing proper failing tests

2. **Implement Single Fix**
   - Before writing the fix, assess the blast radius: Miller `impact(target='<symbol being changed>')` returns the impacted symbols plus the likely tests
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - Required affected scope still green?
   - Issue actually resolved?

4. **If Fix Doesn't Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
   - DON'T attempt Fix #4 without architectural discussion

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

   In an approved autonomous run, route this through the blocker taxonomy:
   if a plan-consistent architecture fix exists, take it and log the decision;
   if the plan is contradicted or tests are unresolvable, stop as a real blocker.
   Outside an approved run, discuss the architecture before attempting more fixes.

   This is NOT a failed hypothesis - this is a wrong architecture.

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

**If 3+ fixes failed:** the problem is structural, not local. Stop patching and question the architecture with razorback:architecture-quality.

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- **`root-cause-tracing.md`** - Trace bugs backward through call stack to find original trigger
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling

**Related skills:**
- **razorback:test-driven-development** - For creating failing test case (Phase 4, Step 1)
- **razorback:verification-before-completion** - Verify fix worked before claiming success
- **razorback:fixing-small-issues** - When the root-caused fix meets the quick-fix criteria, execute it there: in place, affected-scope verification, no worktree or baseline-suite ceremony
