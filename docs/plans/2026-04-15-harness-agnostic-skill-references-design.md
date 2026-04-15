# Harness-Agnostic Skill References

## Problem

Skill bodies across razorback hardcode `team-driven-development` as the primary parallel-execution path. That skill depends on Claude Code Agent Teams and does not exist in opencode. When opencode users follow these references, they either hit a missing skill or fall back to main-agent execution, losing subagent delegation entirely.

The opencode plugin (`.opencode/plugins/razorback.js`) already rewrites the Execution Model section of `using-razorback` at bootstrap time, but subsequent skill loads return raw file content, so the rewrite does not propagate.

## Research: opencode subagent capabilities

Verified from opencode docs (`/docs/agents/`, `/docs/tools/`):

- Opencode has a `Task` tool that primary agents use to invoke subagents programmatically. Access is controlled via `permission.task` with glob patterns. This is the direct analogue of Claude Code's Agent tool.
- The built-in `general` subagent description says: "Use this to run multiple units of work in parallel." Parallel subagent dispatch is a first-class supported pattern.
- Subagents run in isolated child sessions with keybind navigation between parent and children.
- Two dispatch mechanisms: `@mention` (user-driven, manual) and Task tool (LLM-driven, programmatic).

**What opencode lacks vs. Agent Teams:** persistent named teammates that receive follow-up messages. Each Task-tool invocation produces a fresh subagent. Fixes require a new dispatch with fix context (not a cold restart of the same persistent teammate).

**Conclusion:** opencode supports parallel plan execution via subagents. The razorback gap is not parallelism, it is teammate persistence.

## Design

Match the upstream superpowers pattern: skill bodies reference `subagent-driven-development` as the canonical plan-execution path. `team-driven-development` remains a Claude-Code-only upgrade that the bootstrap's Execution Model promotes as primary on that harness.

### Changes

1. **`skills/subagent-driven-development/SKILL.md`**
   - Update description and intro to reflect that opencode supports parallel dispatch via the Task tool.
   - Revise the "vs. Team-Driven Development" comparison: the real difference is teammate persistence (team-driven) vs. fresh-subagent-per-task (subagent-driven), not parallelism.
   - Add a "Parallel Dispatch" subsection under "The Process" describing how to fan out independent tasks (multiple Task-tool invocations in one turn) and how fixes work without persistent teammates (dispatch a fresh implementer with the fix prompt and prior context).

2. **`skills/brainstorming/SKILL.md`** (lines ~175-188) — replace direct `team-driven-development` references with `subagent-driven-development`. Update the lightweight-implementation dispatch template to use the subagent-driven implementer prompt.

3. **`skills/writing-plans/SKILL.md`** (lines 33, 172-195) — rewrite the "Execution Handoff" section. Offer "this-session execution" (subagent-driven) vs. "separate-session execution" (executing-plans). The light-plan selection rule becomes: same-session subagent execution → light, separate-session handoff → full.

4. **`skills/requesting-code-review/SKILL.md`** (lines 12-14, 31, 59, 70-72) — rename "Mode 1: Inline Review (Team-Driven Development)" to "Mode 1: Inline Review (Plan Execution)" and update references to subagent-driven-development. Inline review still applies; the lead just dispatches fresh subagents instead of messaging persistent teammates.

5. **`skills/dispatching-parallel-agents/SKILL.md`** (line 16) — change the "prefer team-driven-development" note to "prefer subagent-driven-development".

6. **`skills/using-git-worktrees/SKILL.md`** (lines 215-216) — collapse the two harness-specific lines into one: `subagent-driven-development` — REQUIRED before executing any tasks.

7. **`skills/finishing-a-development-branch/SKILL.md`** (line 196) — change "team-driven-development (Step 5)" to "subagent-driven-development (Step 5)".

8. **`skills/executing-plans/SKILL.md`** (lines 3, 12) — change "team-driven-development is not appropriate" / "prefer team-driven-development" to the subagent-driven equivalents.

9. **`skills/using-razorback/SKILL.md`** — unchanged. The Claude Code bootstrap still promotes `team-driven-development` as primary; the opencode plugin's rewrite points at `subagent-driven-development`. This is the single switch point.

10. **`skills/team-driven-development/SKILL.md`** — unchanged. Still valid on Claude Code; still referenced by the Claude Code bootstrap.

## Acceptance Criteria

- [ ] `grep -rn "team-driven" skills/` returns matches only in `team-driven-development/`, `using-razorback/SKILL.md` (bootstrap content), and any explanatory comparisons in `subagent-driven-development/SKILL.md`.
- [ ] Opencode users invoking brainstorming, writing-plans, executing-plans, or dispatching-parallel-agents are pointed at `subagent-driven-development`, never at a Claude-Code-only skill.
- [ ] `subagent-driven-development/SKILL.md` documents parallel dispatch as a supported mode (not only sequential).
- [ ] Claude Code bootstrap behavior is unchanged: `team-driven-development` remains the promoted primary on Claude Code.
- [ ] Opencode bootstrap behavior is unchanged (plugin rewrite still works; no plugin code changes required).

## Out of Scope

- Teammate-persistence emulation in opencode (would require tracking session IDs across Task invocations; not worth it for this pass).
- Plugin-side hot-rewriting of skill bodies (approach B from the brainstorm) — rejected in favor of source-level harness-neutral content.
