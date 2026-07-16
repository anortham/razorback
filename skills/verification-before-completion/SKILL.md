---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have neither run the verification command in this message nor cited a ledger entry for current HEAD and required scope, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What verification scope proves this claim?
2. RUN: Execute the project-defined command for that scope, or cite a verification-ledger entry that covers current HEAD and required scope
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient | How to verify |
|-------|----------|----------------|---------------|
| Tests pass | Test command output or ledger entry for current HEAD and required scope: 0 failures | Stale run, wrong scope, "should pass" | Long output: capture to a file, then Miller `content(operation='import', path='<file>')` + `content(operation='search', query='<failure>')` — never paste the whole run |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation | Read the output |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good | Long build logs: Miller `content(...)` import, then search for the failure |
| Bug fixed | Original symptom passes at worker scope | Code changed, assumed fixed | Re-run the original repro |
| Regression test works | Red-green cycle verified | Test passes once | Revert the fix, watch it fail |
| Agent completed | VCS diff shows changes | Agent reports "success" | Read the diff |
| Requirements met | Line-by-line checklist against the plan or spec | Tests passing alone | Miller `inspect(target)` each symbol the requirement names — the code, not the claim |
| Architecture decision followed | Approved architecture visible in the diff, ADR note, or verified implementation | "Looks aligned", verbal recall | Miller `trace(target)` the boundary it must respect; `impact(target)` for what the change actually reaches |
| Review finding fixed | Fresh verification at the affected scope shows the specific reviewer finding no longer reproduces | Code changed, assumed fixed | Miller `inspect(target, depth=full)` the fixed symbol and read the body |

## Tool-Assisted Verification

**Use Miller to verify code changes:**
- **Find references** to all modified/new symbols — verify nothing is broken with `trace`
- **Inspect** changed public APIs — confirm callers still work with `inspect(target, depth=full)` (the symbol you changed earns `full`)
- **Prove API shapes** — confirm symbol names, function signatures, config shapes, route names, CLI flags, and public contracts with Miller before claiming they are correct

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run project-defined command for required scope] [See: 34/34 pass] "Required verification passes"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Why This Matters

Unverified completion claims are how trust breaks:
- The user stops believing "done" - every later claim gets re-checked
- Undefined functions ship - would crash
- Missing requirements ship - incomplete features
- Time is wasted on false completion → redirect → rework
- Honesty about state is the contract; a false "passing" is worse than a true "failing"

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
