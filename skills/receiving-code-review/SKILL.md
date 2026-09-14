---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable
---

# Code Review Reception

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

Use before implementing any review item, from an external reviewer or the user. Not for choosing or dispatching reviewers: razorback:requesting-code-review (standalone) or razorback:pre-merge-review (planned).

## The Response Pattern

1. READ the complete feedback without reacting.
2. UNDERSTAND: restate the requirement in your own words, or ask.
3. VERIFY against codebase reality.
4. EVALUATE: technically sound for THIS codebase?
5. RESPOND: technical acknowledgment or reasoned pushback.
6. IMPLEMENT one item at a time; run each item's covering test. The affected scope runs once after the last item.

## Forbidden Responses

Never "You're absolutely right!", "Great point!", "Thanks for catching that!", any gratitude, or "Let me implement that now" before verification. Instead: restate the requirement, ask a clarifying question, push back with technical reasoning, or just start working. If you catch yourself about to write "Thanks": delete it and state the fix.

## Handling Unclear Feedback

**Unclear external-review items during an approved autonomous run (the common case):** verify the clear items, fix independently verifiable real issues, flag the unclear item for review and continue, noting it in the report, unless it matches the blocker taxonomy (`razorback:using-razorback` `references/blocker-taxonomy.md`). One vague external suggestion never blocks unrelated safe fixes or stops the run.

**Unclear human direction blocks implementation (interactive review from the user, outside an approved run):** stop and ask about every unclear item before implementing any of them; items may be related, and partial understanding sends the whole fix the wrong way. "Fix 1-6" with 4 and 5 unclear → "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."

## Source-Specific Handling

**From the user:** trusted; implement after understanding. Still ask if scope is unclear. No performative agreement.

**From external reviewers:** be skeptical, but check carefully.

```
BEFORE implementing:
  1. Technically correct for THIS codebase?
  2. Breaks existing functionality?
  3. Reason for the current implementation?
  4. Works on all platforms/versions?
  5. Does the reviewer have the full context?
  6. Inspect the symbol with code-kb `get_context_slice`; `get_symbol_body` for the symbol the feedback centers on
  7. Find references with code-kb `find_references` so the change won't break callers

IF suggestion seems wrong: push back with technical reasoning
IF can't easily verify:
  Investigate with code-kb and the smallest relevant verification command.
  Autonomous run: classify as flagged-for-review in the report and continue unless it matches the blocker taxonomy.
  Interactive: ask one specific clarifying question.
IF conflicts with the user's prior decisions:
  Autonomous run: keep the prior decision, flag the conflict in the report, continue unless it matches the blocker taxonomy.
  Interactive: ask one specific question before overriding.
```

External architecture feedback is evaluated through `razorback:architecture-quality` before implementation.

**YAGNI check:** when a reviewer suggests "implementing properly", find references with code-kb `find_references`. Unused → "This endpoint isn't called. Remove it (YAGNI)?" Used → implement properly. The reviewer doesn't set scope; the user does.

## Implementation Order

1. Clarify anything unclear first.
2. Blocking issues (breaks, security), then simple fixes (typos, imports), then complex fixes (refactoring, logic).
3. Test each fix with its covering test; after the last fix, run the affected scope once for regressions.

## When To Push Back

Push back when the suggestion breaks existing functionality, the reviewer lacks context, it violates YAGNI, it is incorrect for this stack, legacy/compatibility reasons exist, or it conflicts with the user's architectural decisions. Use technical reasoning, ask specific questions, reference working tests/code, involve the user if architectural.

Example: reviewer says "Remove legacy code" → "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"

## Acknowledging and Correcting

Correct feedback: "Fixed. [what changed]" or "Good catch - [issue]. Fixed in [location]." Or just fix it; the code shows you heard.

Wrong pushback: "You were right - I checked [X] and it does [Y]. Implementing now." No long apology, no defending the pushback.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | Investigate, then classify under blocker taxonomy or flag for review |

## GitHub Thread Replies

Reply to inline review comments in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "The reviewer is probably right, just implement it" | Verify against the codebase first. Reviewers lack context; blind implementation ships their mistakes as yours. |
| "It's faster to agree and move on" | Performative agreement is review theater. State the requirement or act. |
| "I'll do the clear items now and circle back" | Interactive review: clarify everything first — items interact. Autonomous run: fix the verifiable, flag the unclear in the report. |
| "Pushing back looks defensive" | Technical correctness beats social comfort. Push back with evidence, involve the user if architectural. |

## It's working if

- Every implemented item was verified against the code first; every dismissed one carries technical reasoning.
- Replies contain zero gratitude or agreement filler.
- Fixes landed one at a time, each tested, blocking issues first.
