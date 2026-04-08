# Razorback Revival: Team-First, Julie-Powered Workflow

**Date:** 2026-04-08
**Version Target:** 0.6.0

## Problem

Razorback v0.5.0 (forked from Superpowers v4.3.1) has the right process discipline but burns too many tokens. Full ceremony costs ~380-400K tokens for moderate features. Each subagent cold-starts with no codebase knowledge, re-exploring with Glob/Grep/Read chains. Subagents can't communicate with siblings or share discoveries.

## Decision

Diverge intentionally from superpowers. Keep the proven ceremony (brainstorm, plan, TDD, execute, review, finish). Replace the subagent execution model with Claude Agent Teams. Cherry-pick token-saving improvements from Superpowers v5. Deepen Julie integration everywhere.

### Rejected Alternatives
- **Faithful fork**: Constrains us to upstream decisions and multi-platform bloat we don't need.
- **Clean-room rebuild**: The ceremony works. Too much risk redesigning from scratch before dogfooding.
- **Cherry-pick + bolt-on**: Two execution models (subagents + teams) side-by-side is confusing.

## Design

### Execution Model

```
Plan has 2+ independent tasks  ->  team-driven-development (NEW)
Plan has 1 task / sequential   ->  executing-plans (single agent)
Ad-hoc parallel work           ->  dispatching-parallel-agents (updated for teams)
```

### Team-Driven Development

Replaces `subagent-driven-development` as the primary execution model.

**Lead responsibilities:**
1. Read plan, identify task dependencies, group independent tasks
2. Define file ownership boundaries per teammate (prevents conflicts)
3. Create team with N implementer teammates (max 3-5)
4. Inject Julie tool directives into each teammate spawn prompt
5. Monitor progress via messages
6. Inline review when teammate reports DONE
7. Message teammate directly for fixes (they already have context)
8. Final verification when all tasks complete

**Key advantage over subagents:** Teammates persist. Fixes don't require cold restart. The lead messages the existing teammate who already has full context.

**Review model:** Lead does inline review. No reviewer subagents or teammates. Superpowers v5.0.6 proved inline self-review works (25 min -> 30s, no quality loss).

### Cherry-Picks from Superpowers v5

**Adopted:**
- Plan depth concept (Full vs Light) in writing-plans
- Mandatory codebase orientation with Julie in writing-plans
- Status protocol (DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT)

**Skipped:**
- Multi-platform support (Cursor, Copilot CLI, OpenCode, Gemini, Codex)
- Visual brainstorming companion
- Three-path brainstorming model (we keep all ceremony steps, just optimize them)
- Batch execution in executing-plans (less relevant with teams)

### Julie Integration Pattern

Every skill gets explicit Julie directives at exploration/investigation points:
- `get_context(query)` for initial orientation
- `deep_dive(symbol)` before modifying any symbol
- `fast_refs(symbol)` before changing public APIs
- `get_symbols(file_path)` before reading full files
- `edit_file`/`edit_symbol` as default edit pattern

### Skill Changes

| Skill | Action | Key Changes |
|-------|--------|-------------|
| team-driven-development | NEW | Primary execution with Agent Teams |
| brainstorming | Update | Julie exploration directives |
| writing-plans | Update | Plan depth (Full/Light), Julie codebase orientation |
| executing-plans | Update | Julie directives, single-agent fallback path |
| systematic-debugging | No change | Julie directives already present from v0.5.0 |
| test-driven-development | No change | Julie directives already present from v0.5.0 |
| requesting-code-review | Update | Restructured for inline review (Mode 1) + standalone (Mode 2) |
| verification-before-completion | No change | Julie directives already present from v0.5.0 |
| dispatching-parallel-agents | Update | Reference teams for multi-task work |
| using-razorback | Update | New skill list, team-first language |
| subagent-driven-development | Deprecate | Redirect to team-driven-development |

## Verification

- Install razorback in a test project
- Run brainstorming session, verify Julie directives appear
- Create a plan and execute with team-driven-development
- Verify teammates get Julie directives in spawn prompts
- Verify lead can message teammates for fixes
- Compare token usage against ~380K baseline
