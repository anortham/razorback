---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs
---

# Verification Before Completion

A false "passing" is worse than a true "failing". Evidence before claims, always. Violating the letter of this rule is violating the spirit of this rule.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have neither run the verification command in this message nor cited a ledger entry for current HEAD and required scope, you cannot claim it passes.

## The gate

Before any status claim or expression of satisfaction:

1. IDENTIFY the verification scope that proves the claim.
2. RUN the project-defined command for that scope, or cite a verification-ledger entry covering current HEAD and required scope.
3. READ the full output: exit code, failure count.
4. VERIFY the output confirms the claim. If not, state the actual status with evidence.
5. Only then make the claim, with the evidence.

## Evidence table

| Claim | Requires | Not Sufficient | How to verify |
|-------|----------|----------------|---------------|
| Tests pass | Test output or ledger entry for current HEAD and required scope: 0 failures | Stale run, wrong scope, "should pass", a rerun on an unchanged tree | Short output: read it. Long output: capture it to a file on the first run, then search it or read a bounded slice. Never rerun to re-read |
| Linter clean | Linter output: 0 errors | Partial check | Read the output |
| Build succeeds | Build exit 0 | Linter passing, logs look good | Long logs: capture to file, then search or read a bounded slice |
| Bug fixed | Original symptom passes at worker scope | Code changed, assumed fixed | Re-run the original repro |
| Regression test works | Red-green cycle verified | Test passes once | Revert the fix, watch it fail, restore |
| Agent completed | VCS diff shows changes | Agent reports "success" | Read the diff |
| Requirements met | Line-by-line checklist against the plan or spec | Tests passing alone | code-kb `get_symbol_context` or `get_symbol_body` each symbol the requirement names |
| Architecture decision followed | Approved architecture visible in the diff, ADR note, or verified implementation | "Looks aligned" | code-kb `find_references` the boundary; `blast_radius` for what the change reaches |
| Review finding fixed | Fresh verification at the affected scope shows the finding no longer reproduces | Code changed, assumed fixed | code-kb `get_symbol_body` the fixed symbol |
| Work is integrated | `git log --oneline <base>..<branch>` per worktree: every commit landed, pushed, or named in the report | Tests pass, task marked done | Check B of the `razorback:using-razorback` skill's `references/source-control-hygiene.md` |
| Nothing is stranded | `git worktree list` plus `git -C <path> status --short --branch` for each: no unreported dirty tree or unmerged branch | `git worktree list` alone — that is an inventory, not a cleanliness check | Status every listed path |

Also prove API shapes from current source (file reads, or code-kb `find_references` and `get_symbol_context`) before claiming symbol names, signatures, config shapes, routes, CLI flags, or public contracts are correct.

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Declaring a plan complete without statusing every worktree it created
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
| "Partial check is enough" | Less than the claim's scope proves nothing about the claim |
| "The gate wants the full scope, so rerun it after every edit" | The gate applies to the claim, not to each edit. Between edits run the failing ids; the wide command runs once when they pass (razorback:systematic-debugging Phase 4). |
| "Run it again to see the output" | Read the output you have; long output is captured to a file on the first run. A rerun on an unchanged tree is not fresh evidence. |
| "The other worktree isn't my task" | Then name it in the report. Silence is the bug. |
| "Tests pass, so the phase is done" | Passing tests is not integration. Landed is integration. |
| "Different words so rule doesn't apply" | Spirit over letter |

## When to apply

Before any success or completion claim, any expression of satisfaction, committing, PR creation, task completion, moving to the next task, or delegating. Applies to exact phrases, paraphrases, and implications alike. The rule gates claims, not progress notes: describing what you did without asserting it works needs no evidence.

## It's working if

- Every success claim sits next to its evidence — the command and output, or a ledger entry covering current HEAD and the required scope.
- Status reports contain zero "should", "probably", or "seems to".
- Agent success reports were checked against the VCS diff before being repeated.
- Every worktree the run created was statused before "complete" was said.
