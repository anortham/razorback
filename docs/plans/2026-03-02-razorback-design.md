# Razorback Design Document

**Date:** 2026-03-02
**Status:** Approved
**Author:** Murphy + Claude

## Overview

Razorback is a Claude Code plugin that forks [Superpowers](https://github.com/obra/superpowers) (v4.3.1, MIT) and adds explicit awareness of two MCP servers:

- **Julie** — Code intelligence (search, symbols, references, context)
- **Goldfish** — Developer memory (checkpoints, recall, plans)

The hypothesis: keeping Superpowers' proven workflow (brainstorming → planning → TDD → subagent execution → two-stage review → verification) but making every step explicitly use Julie/Goldfish tools will produce **measurable improvements in speed and token efficiency** without sacrificing quality.

## Motivation

Superpowers produces good results but is slow and token-heavy. Analysis revealed the cost isn't from skill file sizes (~14K tokens loaded on-demand) but from the **process execution**:

- **Exploration overhead:** Every agent (controller + subagents) rediscovers the codebase using generic Glob/Grep/Read chains. A single exploration phase takes 5-8 rounds.
- **Subagent multiplier:** For a 3-task plan with two-stage review, there are ~9 subagent spawns, each re-exploring from scratch. Total: ~39-56 exploration rounds.
- **No session continuity:** Each session starts fresh with no memory of prior work.

Julie and Goldfish are purpose-built to solve these exact problems:
- Julie's `get_context` replaces 5-6 Glob/Grep/Read rounds with 1 token-budgeted call
- Julie's `deep_dive` replaces 3-4 tool chains with 1 call showing callers, callees, types
- Goldfish's `recall` eliminates cross-session re-orientation entirely
- Goldfish's `plan` persists plans across context compaction

## Design Decisions

### Faithful Fork
Keep all 14 Superpowers skills, same process flow, same hooks, same subagent model. Only modify content to add Julie/Goldfish tool calls. This isolates the variable for comparison.

### Injection Points Strategy
Rather than rewriting skills, we add Julie/Goldfish tool calls at specific "injection points" — places where generic exploration or state management currently happens.

### Goldfish Plans Primary
Use Goldfish for plan persistence instead of Superpowers' file-based plans. Goldfish plans survive context compaction and show up in `recall()`.

### Hard Dependencies
Julie and Goldfish MCP servers are required. No fallback to generic tools. This keeps skills simple (no conditionals).

### General Plugin
Designed for anyone with Julie + Goldfish installed, not specific to any project.

## Injection Points Map

### Highest Impact (subagent prompts — run per task)

**implementer-prompt.md** — Add Julie orientation block:
```
Before implementing, orient yourself:
1. julie:get_context(query='<area>') — understand the relevant code
2. julie:deep_dive(symbol='<symbol>') — see callers, callees, types
3. julie:fast_refs(symbol='<symbol>') — check who depends on it
4. julie:get_symbols(file_path, target='<fn>') — read specific symbols
Do NOT use Glob → Read → Grep chains when Julie tools are available.
```

**spec-reviewer-prompt.md** — Add Julie-aware review:
```
Use julie:get_symbols to see file structure before reading files.
Use julie:fast_refs to verify implementation connects correctly.
Only use Read for specific sections identified by get_symbols.
```

**code-quality-reviewer-prompt.md** — Add impact analysis:
```
Use julie:deep_dive on modified symbols for full context.
Use julie:fast_refs to verify changes don't break dependents.
Use julie:get_symbols to review structure without full file reads.
```

### High Impact (orchestrating skills)

| Skill | Injection | Tools Used |
|-------|-----------|------------|
| brainstorming | "Explore project context" step | get_context, recall |
| writing-plans | Plan persistence | goldfish:plan(save) |
| systematic-debugging | Phase 1 investigation | deep_dive, fast_refs |
| code-reviewer agent | Impact analysis | deep_dive, fast_refs |
| verification-before-completion | Verify nothing broken | fast_refs, checkpoint |
| receiving-code-review | Before implementing feedback | deep_dive, fast_refs |

### Medium Impact (session continuity)

| Skill | Injection | Tools Used |
|-------|-----------|------------|
| session-start hook | Restore prior context | recall hint |
| executing-plans | Session start + progress | recall, checkpoint |
| finishing-a-development-branch | Capture completed work | checkpoint, plan(complete) |

### Low/No Impact

| Skill | Change |
|-------|--------|
| test-driven-development | Minor: get_symbols for test patterns |
| dispatching-parallel-agents | Minor: get_context hint for parallel agents |
| using-git-worktrees | No change (pure git workflow) |
| writing-skills | No change (meta-skill) |

## What Stays Unchanged

- Process flow: Brainstorm → Plan → Execute → Review → Finish
- Subagent model: Fresh subagent per task
- Two-stage review: Spec compliance → Code quality
- TDD enforcement: Same discipline, same red flags
- Hard-gate on brainstorming: Still enforced
- Anti-rationalization tables: Kept verbatim
- Skill triggering: Same SessionStart hook pattern

## Project Structure

```
razorback/
├── .claude-plugin/
│   └── plugin.json
├── skills/                          (all 14, forked + modified)
│   ├── brainstorming/SKILL.md
│   ├── dispatching-parallel-agents/SKILL.md
│   ├── executing-plans/SKILL.md
│   ├── finishing-a-development-branch/SKILL.md
│   ├── receiving-code-review/SKILL.md
│   ├── requesting-code-review/
│   │   ├── SKILL.md
│   │   └── code-reviewer.md
│   ├── subagent-driven-development/
│   │   ├── SKILL.md
│   │   ├── implementer-prompt.md
│   │   ├── spec-reviewer-prompt.md
│   │   └── code-quality-reviewer-prompt.md
│   ├── systematic-debugging/
│   │   ├── SKILL.md
│   │   └── (sub-technique files)
│   ├── test-driven-development/
│   │   ├── SKILL.md
│   │   └── testing-anti-patterns.md
│   ├── using-git-worktrees/SKILL.md
│   ├── using-razorback/SKILL.md
│   ├── verification-before-completion/SKILL.md
│   ├── writing-plans/SKILL.md
│   └── writing-skills/SKILL.md
├── agents/
│   └── code-reviewer.md
├── hooks/
│   ├── hooks.json
│   ├── run-hook.cmd
│   └── session-start
├── commands/
│   ├── brainstorm.md
│   ├── write-plan.md
│   └── execute-plan.md
├── docs/plans/
│   └── 2026-03-02-razorback-design.md
├── LICENSE
└── README.md
```

## Expected Improvements

| Metric | Superpowers | Razorback (projected) |
|--------|-------------|----------------------|
| Exploration rounds per agent | 5-8 | 2-3 |
| Total rounds (3-task plan) | 39-56 | 13-24 |
| Tokens per exploration | ~7-8K | ~3-5K |
| Cross-session re-orientation | 5-10 rounds | 1-2 rounds |
| Estimated wall-clock improvement | baseline | ~40-50% faster |

## Success Criteria

1. Complete the same task with Razorback and Superpowers
2. Razorback completes faster (wall-clock)
3. Quality of output is equivalent or better
4. Subagents demonstrably use Julie tools instead of Glob/Grep/Read chains

## Risks

- **Julie index not ready:** If Julie hasn't indexed the workspace, tools return empty results. Mitigation: skills could hint to check index health.
- **Goldfish not configured:** If Goldfish MCP isn't set up, memory tools fail. Mitigation: hard requirement documented clearly.
- **Subagent compliance:** Subagents might ignore Julie instructions and fall back to generic tools. Mitigation: strong wording in prompts ("Do NOT use Glob → Read → Grep chains").
- **Token overhead of instructions:** Adding Julie/Goldfish instructions to every prompt slightly increases prompt size. Net effect should still be positive due to fewer rounds.
