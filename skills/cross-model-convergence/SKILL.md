---
name: cross-model-convergence
description: Use when the user wants two models to check each other's work until clean — "have codex verify my findings and find more", "go back and forth until clean", "loop until you both agree there are no problems left" — when an audit should run to convergence under /loop or another goal-driven runner, or when a design decision needs adversarial challenge before building: "doubt this", "challenge this decision", or architecture risk rated medium/high.
---

# Cross-Model Convergence

The lead — whichever agent and harness is running this skill — and an external reviewer alternate find → verify → fix rounds until a full round is clean. **Agreement is not the terminator; evidence is.** A clean round, not a compliment, ends the loop.

The reviewer must be a different model from the lead. Calling your own model's CLI is self-review; a single-model clean round never counts as double-clean.

**Announce at start:** "I'm using the cross-model-convergence skill with [reviewer] on [problem class]."

**REQUIRED SUB-SKILLS:** razorback:architecture-quality (Audit Mode), one reviewer channel (razorback:codex-cli, razorback:claude-cli, or razorback:cursor-agent in read-only mode) pointing at a model that is not the lead, razorback:receiving-code-review, razorback:test-driven-development, razorback:verification-before-completion.

## Setup (Round 0)

Write these down in the conversation before the first sweep. They cannot be changed mid-loop.

- **Problem class:** default is architectural cleanup via `architecture-quality` Audit Mode. The user can name another class (security, error handling, dead code); the sweep method changes, the loop does not.
- **Reviewer:** any external CLI skill whose model differs from the lead — codex-cli or claude-cli. A Claude lead defaults to codex-cli; a Codex lead picks claude-cli. cursor-agent is eligible only when the user explicitly named Cursor for this run (its own skill gates on explicit user request); it reviews read-only (`--mode ask` with `--trust`, never `--force`).
- **Severity floor** (the nitpick line). Defaults — a finding does NOT count when it is: pure style or naming with no maintainability impact; an unmeasured micro-optimization; `speculative` strength; blocked by a heuristic's "do not act when" line; or a churn-heavy rewrite with marginal benefit. Disputed-but-real items are not nitpicks; they go in the report.
- **Round cap:** default 4 (initial audit + 3 fix rounds). The cap bounds *discovery*, not fixing of already-verified defects.

## The Loop

1. **Sweep.** Run the problem-class audit (Audit Mode for architecture). Verify your own findings with Miller `inspect`/`trace` evidence before sending — rigor is symmetric, not just for the reviewer's claims.
2. **Dispatch to reviewer:** "Here are N verified findings: [list with file:line and evidence]. (a) Verify or refute each, naming what you checked. (b) Independently hunt for problems in the same class that this list misses." Reviewer dispatches are read-only — state "verify and report only; do not modify any file" and diff-check the worktree after each reviewer call — revert any reviewer edit and note it; it does not consume the cap. If the channel is stateless, re-supply the merged list and prior fixes inline each round; use session resume where the channel offers it (e.g. cursor-agent `create-chat`/`--resume`).
3. **Triage the response** with `receiving-code-review` rigor: confirm each reviewer finding in code before accepting it. Unconfirmable claims get pushed back with evidence, not implemented. Reviewer evidence need not be Miller-based — file:line plus reasoning counts; the lead re-verifies with Miller either way.
4. **User gate — once, after round 1:** present the merged, deduplicated list with strength ratings; get approval of the fix scope. Under an unattended goal-driven run, this gate is satisfied by the pre-approved Setup plus recording the merged list (Goldfish checkpoint) instead of prompting mid-run.
5. **Fix** approved items with TDD; verify with `verification-before-completion`.
6. **Re-review round:** your own re-sweep, plus the reviewer re-prompted adversarially: "For each fix, name the file and how you verified it. Then name the weakest remaining areas in this class regardless of the fixes."
7. **Termination check** (below). Checkpoint with Goldfish at the end of every round — round number, merged list, approved scope, fixed/disputed/parked items, and the reviewer session handle (e.g. cursor-agent chat id) — so the loop survives compaction and goal-driver re-runs; every re-run starts by recalling that state.

New findings inside the approved problem class and above the floor are fixed in the next round without re-asking. Reviewer proposals *beyond* the approved scope (new modules, redesigns) are evaluated, ranked, and parked as candidates for the final report — they do not count as open issues and cannot hold convergence hostage.

## Termination

DONE only when one full round is **double-clean**:

- every approved finding is fixed and verified (tests green, original finding no longer reproducible), and
- your own re-sweep finds nothing new above the floor, and
- the reviewer's substantiated re-check surfaces nothing new above the floor —

all in the **same** round.

**Content-free approval is not a clean signal.** If the reviewer replies with praise and no specifics ("all fixes look great!"), it didn't look. Re-prompt requiring per-fix verification detail before counting the round clean. One substantiated re-check is required; don't loop the reviewer for compliments.

**At the cap:** stop discovering, report honestly — what was fixed, what remains with severity, and a recommendation. Hitting the cap is a status report, not a failure. Exception: a verified real defect found at the cap still gets fixed, followed by one bounded confirmation pass (reviewer verifies that fix only — no new discovery sweep).

## Failure Handling

- **Reviewer unavailable or erroring:** swap to another external reviewer skill and say so — the floor and cap are load-bearing, the reviewer identity is not. No reviewer available? Report blocked; a single-model clean round never counts as double-clean.
- **Reviewer stays content-free:** two re-prompts maximum. Still no specifics? Treat that re-check as failed, report it, and stop — don't loop for compliments.
- **Disputed finding:** one push-back cycle with evidence each way. Still disputed? Record it as disputed in the report and move on — disputes don't count as open-above-floor and don't block convergence.
- **Fix-induced regression:** a defect your fix introduced is yours regardless of problem class — fix it; it does not consume the discovery cap.
- **User approves nothing at the gate:** the run ends as an audit — deliver the merged findings report, no fix loop. Partial approval shrinks scope to the approved subset.
- **Failed confirmation pass at the cap:** one re-fix and re-confirm. Still failing? Revert or report it as remaining — do not start a new discovery loop.

## Doubt Pass (pre-implementation)

A bounded, fix-free variant for challenging a design decision BEFORE anything is built — when course-correction is cheapest. Run it during brainstorming when the architecture-quality gate rates risk medium/high, or whenever the user asks to doubt or challenge a decision. Low-risk designs skip it.

1. **CLAIM:** state the decision and its load-bearing assumptions in 3-5 sentences — what was chosen, what was rejected, why.
2. **DOUBT:** send the claim to an external reviewer (same rules as the main loop: different model from the lead, read-only): "Try to refute this decision. Attack the assumptions, name concrete failure modes, and say what you would choose instead and why — specific to this repo's constraints."
3. **RECONCILE:** triage with `receiving-code-review` rigor — verify each refutation against the codebase (Miller) and the requirements. A refutation that survives verification changes the design; one that does not gets recorded with the evidence against it.
4. **STOP:** maximum 3 doubt cycles; stop early when a cycle produces no new surviving refutation.

The Doubt Pass adds no user gate and no stop point: it runs inside brainstorming's existing flow, and its outcome — the decision, surviving objections, and how each was resolved — lands in the design doc that flows to the already-existing spec review. It never implements anything.

## Goal-Driver Integration

The goal predicate, for Claude Code's `/loop`, Codex's `goal` command, or any until-condition runner:

> Terminal state reached: either (a) one full round is double-clean — zero new findings above the written severity floor from both the lead's re-sweep and the reviewer's substantiated re-check, all approved fixes verified — or (b) the round cap is reached and the final status report has been emitted.

The cap must be part of the predicate: a success-only goal loops forever on a codebase that does not converge.

Emit this block at the end of every round — print it in the round output *and* include it in the round checkpoint — so the driver (and the user) can see state at a glance; a driver's check can key on `clean_round: yes` or `round: <cap>/<cap>`:

```text
CONVERGENCE STATUS
round: 2/4
fixed_this_round: 3
open_above_floor: 1
parked_out_of_scope: 2
clean_round: no
```

For unattended runs, Setup (problem class, reviewer, floor, cap) must be user-approved before the driver starts; the loop then runs to the goal or the cap without prompting, recording instead of asking.

## Red Flags — STOP

| Rationalization | Reality |
|---|---|
| "The reviewer said it looks great, we're done" | Praise without specifics means it didn't look. Re-prompt for evidence. |
| "This finding is just a nitpick" (decided mid-round) | The floor was written in Setup. Judge against it; don't redraw it. |
| "One more round will finish it" (at the cap) | The cap is the cap. Report remainders. |
| "The reviewer suggested it, so I should implement it" | Out-of-scope proposals get parked, not implemented. |
| "We've both gone quiet, that's agreement" | Convergence is a double-clean round, not mutual exhaustion. |
| "My own findings don't need verification" | Rigor is symmetric. Verify before sending. |
