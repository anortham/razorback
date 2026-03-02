# Razorback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:executing-plans to implement this plan task-by-task. (Until Razorback exists, use superpowers:executing-plans.)

**Goal:** Fork Superpowers v4.3.1 into Razorback with Julie/Goldfish tool awareness injected at every exploration and persistence point.

**Architecture:** Direct fork of all 14 skills, 3 subagent prompts, 1 agent, 3 commands, and hook infrastructure. Each file copied from `~/source/superpowers/` and modified with specific Julie/Goldfish injection points. All `superpowers:` references renamed to `razorback:`.

**Tech Stack:** Markdown skills, bash hooks, Claude Code plugin system. Dependencies: Julie MCP server, Goldfish MCP server.

**Source:** `~/source/superpowers/` (v4.3.1, MIT licensed)
**Target:** `~/source/razorback/`

---

### Task 1: Project Infrastructure

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `LICENSE`
- Create: `.gitignore`

**Step 1: Create plugin manifest**

```json
{
  "name": "razorback",
  "description": "Julie/Goldfish-aware development workflow skills. Fork of Superpowers with explicit code intelligence and developer memory integration.",
  "version": "0.1.0",
  "author": {
    "name": "Murphy"
  },
  "homepage": "https://github.com/murphy/razorback",
  "license": "MIT",
  "keywords": ["skills", "tdd", "debugging", "julie", "goldfish", "workflows"]
}
```

**Step 2: Copy LICENSE from Superpowers**

```bash
cp ~/source/superpowers/LICENSE ~/source/razorback/LICENSE
```

**Step 3: Create .gitignore**

```
.DS_Store
*.swp
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add .claude-plugin/plugin.json LICENSE .gitignore
git commit -m "chore: project infrastructure (plugin manifest, license, gitignore)"
```

---

### Task 2: Hook Infrastructure

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/run-hook.cmd`
- Create: `hooks/session-start`

**Step 1: Copy hooks from Superpowers**

```bash
cp -r ~/source/superpowers/hooks ~/source/razorback/hooks
```

**Step 2: Modify hooks/session-start**

Replace the `session_context` line to reference razorback instead of superpowers. Change:
```bash
session_context="<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n**Below is the full content of your 'superpowers:using-superpowers' skill...
```

To:
```bash
session_context="<EXTREMELY_IMPORTANT>\nYou have razorback.\n\n**Below is the full content of your 'razorback:using-razorback' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n${using_superpowers_escaped}\n\n${warning_escaped}\n</EXTREMELY_IMPORTANT>"
```

Also update the skill path from `using-superpowers/SKILL.md` to `using-razorback/SKILL.md`:
```bash
using_superpowers_content=$(cat "${PLUGIN_ROOT}/skills/using-razorback/SKILL.md" 2>&1 || echo "Error reading using-razorback skill")
```

And update the legacy check to warn about superpowers → razorback migration (or remove it entirely since Razorback has no legacy).

**Step 3: Verify hook file is executable**

```bash
chmod +x ~/source/razorback/hooks/session-start
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add hooks/
git commit -m "chore: hook infrastructure (session-start with razorback branding)"
```

---

### Task 3: Entry Point Skill — using-razorback

**Files:**
- Create: `skills/using-razorback/SKILL.md`

**Step 1: Copy and rename**

```bash
mkdir -p ~/source/razorback/skills/using-razorback
cp ~/source/superpowers/skills/using-superpowers/SKILL.md ~/source/razorback/skills/using-razorback/SKILL.md
```

**Step 2: Update frontmatter**

Change:
```yaml
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
```

To:
```yaml
name: using-razorback
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
```

**Step 3: Replace all `superpowers:` skill references with `razorback:`**

Throughout the file, replace `superpowers:` with `razorback:` in skill references.

**Step 4: Add toolchain section**

After the "## User Instructions" section (at the end of the file), add:

```markdown

## Your Toolchain

Razorback skills assume these MCP servers are available and MUST be used:

**Julie** (code intelligence — use instead of Glob/Grep/Read chains):
- `get_context(query)` — Token-budgeted codebase orientation (pivots + neighbors + file map)
- `deep_dive(symbol)` — Understand a symbol before modifying it (callers, callees, types, children)
- `fast_search(query)` — Find code by text or definition
- `fast_refs(symbol)` — Find all references to a symbol (REQUIRED before modifying any symbol)
- `get_symbols(file_path)` — See file structure without reading full content
- `rename_symbol(old, new)` — Safe workspace-wide renames

**Goldfish** (developer memory — use for session continuity):
- `checkpoint(description)` — Save progress at meaningful milestones
- `recall()` — Restore context from prior sessions
- `plan(action, ...)` — Persist and track multi-session plans

**Rules:**
1. Use Julie tools for ALL codebase exploration. Do NOT fall back to Glob → Read → Grep chains.
2. Use `get_symbols` before Read to see file structure first.
3. Use `deep_dive` before modifying any symbol.
4. Use `fast_refs` before changing any symbol to check impact.
5. Use Goldfish `recall` at session start if prior context might exist.
6. Use Goldfish `checkpoint` after completing meaningful milestones.
7. Use Goldfish `plan` to persist implementation plans.
```

**Step 5: Commit**

```bash
cd ~/source/razorback
git add skills/using-razorback/
git commit -m "feat: using-razorback entry point skill with toolchain section"
```

---

### Task 4: Implementer Prompt Template (Highest Impact)

**Files:**
- Create: `skills/subagent-driven-development/implementer-prompt.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/subagent-driven-development
cp ~/source/superpowers/skills/subagent-driven-development/implementer-prompt.md ~/source/razorback/skills/subagent-driven-development/
```

**Step 2: Add Julie orientation block**

After the "## Before You Begin" section's existing content about asking questions, add a new section:

```markdown
    ## Codebase Orientation (REQUIRED before coding)

    Before writing any code, orient yourself using Julie's code intelligence tools:

    1. **Understand the area:** `get_context(query='<area described in task>')`
       Returns token-budgeted context: pivots (full code), neighbors (signatures), file map.

    2. **Understand symbols you'll modify:** `deep_dive(symbol='<symbol name>')`
       Shows callers, callees, children, types — everything you need to make safe changes.

    3. **Check impact:** `fast_refs(symbol='<symbol name>')`
       See all references before changing anything. Required — do not skip.

    4. **Read targeted code:** `get_symbols(file_path='<file>', target='<function>')`
       See specific symbols instead of reading entire files.

    **Do NOT use Glob → Read → Grep chains for exploration.** Julie tools return
    targeted, token-efficient context in 1-2 calls instead of 5-8.
```

**Step 3: Commit**

```bash
cd ~/source/razorback
git add skills/subagent-driven-development/implementer-prompt.md
git commit -m "feat: implementer prompt with Julie codebase orientation"
```

---

### Task 5: Reviewer Prompt Templates

**Files:**
- Create: `skills/subagent-driven-development/spec-reviewer-prompt.md`
- Create: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

**Step 1: Copy from Superpowers**

```bash
cp ~/source/superpowers/skills/subagent-driven-development/spec-reviewer-prompt.md ~/source/razorback/skills/subagent-driven-development/
cp ~/source/superpowers/skills/subagent-driven-development/code-quality-reviewer-prompt.md ~/source/razorback/skills/subagent-driven-development/
```

**Step 2: Modify spec-reviewer-prompt.md**

After the "## Your Job" section's instruction to "Read the implementation code and verify", add:

```markdown
    ## How to Review (Use Julie tools)

    Use code intelligence tools for efficient, targeted review:

    1. `get_symbols(file_path='<changed file>')` — See file structure before reading full content
    2. `fast_refs(symbol='<new/changed symbol>')` — Verify implementation connects to rest of codebase
    3. `deep_dive(symbol='<key symbol>')` — Understand symbol context if behavior unclear

    Only use Read for specific sections identified by get_symbols. Do NOT read entire files.
```

**Step 3: Modify code-quality-reviewer-prompt.md**

The current file is very short (just a template reference). Replace the entire content with:

```markdown
# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

~~~
Task tool (razorback:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]

  ADDITIONAL CONTEXT FOR REVIEWER:
  Use Julie tools for impact analysis:
  - deep_dive(symbol) on modified symbols to understand callers/callees/types
  - fast_refs(symbol) to verify changes don't break dependents
  - get_symbols(file_path) to review file structure without reading entire files
~~~

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add skills/subagent-driven-development/spec-reviewer-prompt.md skills/subagent-driven-development/code-quality-reviewer-prompt.md
git commit -m "feat: reviewer prompts with Julie-aware review instructions"
```

---

### Task 6: Subagent-Driven Development Orchestrating Skill

**Files:**
- Create: `skills/subagent-driven-development/SKILL.md`

**Step 1: Copy from Superpowers**

```bash
cp ~/source/superpowers/skills/subagent-driven-development/SKILL.md ~/source/razorback/skills/subagent-driven-development/
```

**Step 2: Replace all `superpowers:` with `razorback:`**

Throughout the file, replace every `superpowers:` reference with `razorback:`.

**Step 3: Add Goldfish checkpoint instruction**

In the process flow, after "Mark task complete in TodoWrite", add a note:

After the "Mark task complete in TodoWrite" → "More tasks remain?" flow description, in the "## Example Workflow" section, add a checkpoint step after each task completion:

Find the line:
```
[Mark Task 1 complete]
```

And add after it:
```
[Checkpoint: goldfish:checkpoint("Completed Task 1: Hook installation script")]
```

Do the same for Task 2 and the pattern should be clear for subsequent tasks.

**Step 4: Add Julie/Goldfish note to Efficiency gains section**

In the "## Advantages" section under "**Efficiency gains:**", add:

```markdown
- Julie tools replace Glob/Grep/Read chains (2-3 calls vs 5-8 for orientation)
- Goldfish checkpoints persist progress across context compaction
```

**Step 5: Commit**

```bash
cd ~/source/razorback
git add skills/subagent-driven-development/SKILL.md
git commit -m "feat: subagent-driven-development with razorback refs and Goldfish checkpoints"
```

---

### Task 7: Brainstorming Skill

**Files:**
- Create: `skills/brainstorming/SKILL.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/brainstorming
cp ~/source/superpowers/skills/brainstorming/SKILL.md ~/source/razorback/skills/brainstorming/
```

**Step 2: Replace `superpowers:` with `razorback:`**

**Step 3: Modify step 1 of the checklist**

Change:
```markdown
1. **Explore project context** — check files, docs, recent commits
```

To:
```markdown
1. **Explore project context** — use `julie:get_context` to orient on the relevant codebase area, use `goldfish:recall` to check for prior decisions or related work, check recent commits
```

**Step 4: Modify step 6 of the checklist**

Change:
```markdown
6. **Transition to implementation** — invoke writing-plans skill to create implementation plan
```

To:
```markdown
6. **Transition to implementation** — save design to `goldfish:plan` for persistence, then invoke writing-plans skill to create implementation plan
```

**Step 5: Add Goldfish note to "After the Design" section**

In the "## After the Design" section, before "**Documentation:**", add:

```markdown
**Memory:**
- Save the design as a Goldfish plan: `goldfish:plan(action='save', title='...', content='...', activate=true)`
- This ensures the design survives context compaction and is visible in future sessions via `goldfish:recall()`

```

**Step 6: Commit**

```bash
cd ~/source/razorback
git add skills/brainstorming/
git commit -m "feat: brainstorming skill with Julie exploration and Goldfish persistence"
```

---

### Task 8: Writing Plans Skill

**Files:**
- Create: `skills/writing-plans/SKILL.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/writing-plans
cp ~/source/superpowers/skills/writing-plans/SKILL.md ~/source/razorback/skills/writing-plans/
```

**Step 2: Replace `superpowers:` with `razorback:`**

**Step 3: Update plan header template**

In the plan document header template, change:
```markdown
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
```

To:
```markdown
> **For Claude:** REQUIRED SUB-SKILL: Use razorback:executing-plans to implement this plan task-by-task.
```

**Step 4: Add Goldfish plan persistence to "Execution Handoff"**

Before the execution handoff options, add:

```markdown
**Save plan to Goldfish for persistence:**

```
goldfish:plan(action='save', title='<feature-name> implementation', content='<plan summary>', activate=true)
```

This ensures the plan survives context compaction and is visible across sessions.

```

**Step 5: Commit**

```bash
cd ~/source/razorback
git add skills/writing-plans/
git commit -m "feat: writing-plans skill with Goldfish plan persistence"
```

---

### Task 9: Systematic Debugging Skill + Sub-Techniques

**Files:**
- Create: `skills/systematic-debugging/SKILL.md`
- Create: `skills/systematic-debugging/root-cause-tracing.md`
- Create: `skills/systematic-debugging/defense-in-depth.md`
- Create: `skills/systematic-debugging/condition-based-waiting.md`
- Create: `skills/systematic-debugging/condition-based-waiting-example.ts`
- Create: `skills/systematic-debugging/find-polluter.sh`
- Copy test files as-is (CREATION-LOG.md, test-*.md)

**Step 1: Copy entire directory from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/systematic-debugging
cp ~/source/superpowers/skills/systematic-debugging/* ~/source/razorback/skills/systematic-debugging/
```

**Step 2: Modify SKILL.md — replace `superpowers:` with `razorback:`**

**Step 3: Add Julie tools to Phase 1 (Root Cause Investigation)**

The skill describes a 4-phase debugging process. In Phase 1 (the investigation phase), after existing guidance about reading errors and reproducing, add:

```markdown
**Use Julie for investigation:**
- `deep_dive(symbol='<buggy function>')` — understand callers, callees, type flow
- `fast_refs(symbol='<function>')` — find all call sites that might trigger the bug
- `get_context(query='<error area>')` — orient on the broader subsystem
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add skills/systematic-debugging/
git commit -m "feat: systematic-debugging skill with Julie investigation tools"
```

---

### Task 10: Requesting Code Review Skill + Code Reviewer Template

**Files:**
- Create: `skills/requesting-code-review/SKILL.md`
- Create: `skills/requesting-code-review/code-reviewer.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/requesting-code-review
cp ~/source/superpowers/skills/requesting-code-review/SKILL.md ~/source/razorback/skills/requesting-code-review/
cp ~/source/superpowers/skills/requesting-code-review/code-reviewer.md ~/source/razorback/skills/requesting-code-review/
```

**Step 2: Replace `superpowers:` with `razorback:` in both files**

**Step 3: Add Julie to code-reviewer.md review checklist**

In the "## Review Checklist" section, add a new subsection after "**Production Readiness:**":

```markdown
**Impact Analysis (use Julie tools):**
- `deep_dive(symbol)` on key modified symbols — understand callers, callees, types
- `fast_refs(symbol)` on changed public APIs — verify no broken dependents
- `get_symbols(file_path)` on modified files — review structure before reading full content
- Use targeted Read only for specific sections, not entire files
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add skills/requesting-code-review/
git commit -m "feat: code review skill with Julie impact analysis"
```

---

### Task 11: Verification Before Completion Skill

**Files:**
- Create: `skills/verification-before-completion/SKILL.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/verification-before-completion
cp ~/source/superpowers/skills/verification-before-completion/SKILL.md ~/source/razorback/skills/verification-before-completion/
```

**Step 2: Add Julie + Goldfish to verification**

After the "## Common Failures" table, add:

```markdown
## Tool-Assisted Verification

**Use Julie to verify code changes:**
- `fast_refs(symbol)` on all modified/new symbols — verify nothing is broken
- `deep_dive(symbol)` on changed public APIs — confirm callers still work

**Use Goldfish to record verification:**
- `checkpoint(description='Verified: <what was verified and evidence>')` after completing verification
```

**Step 3: Commit**

```bash
cd ~/source/razorback
git add skills/verification-before-completion/
git commit -m "feat: verification skill with Julie refs check and Goldfish checkpoint"
```

---

### Task 12: Executing Plans + Finishing a Development Branch

**Files:**
- Create: `skills/executing-plans/SKILL.md`
- Create: `skills/finishing-a-development-branch/SKILL.md`

**Step 1: Copy both from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/executing-plans
mkdir -p ~/source/razorback/skills/finishing-a-development-branch
cp ~/source/superpowers/skills/executing-plans/SKILL.md ~/source/razorback/skills/executing-plans/
cp ~/source/superpowers/skills/finishing-a-development-branch/SKILL.md ~/source/razorback/skills/finishing-a-development-branch/
```

**Step 2: Replace `superpowers:` with `razorback:` in both files**

**Step 3: Modify executing-plans — add recall and checkpoint**

In "### Step 1: Load and Review Plan", before "1. Read plan file", add:

```markdown
0. Check Goldfish for context: `goldfish:recall()` — restore any prior session context
```

In "### Step 2: Execute Batch", after "4. Mark as completed", add:

```markdown
5. Checkpoint progress: `goldfish:checkpoint("Completed batch: <task names>")` after each batch
```

**Step 4: Modify finishing-a-development-branch — add Goldfish completion**

After "### Step 5: Cleanup Worktree", add a new section:

```markdown
### Step 6: Record Completion

After cleanup, save the completed work to memory:
```
goldfish:checkpoint("Completed <feature-name>: <summary of what was built>")
```

If a Goldfish plan is active for this work:
```
goldfish:plan(action='complete')
```
```

**Step 5: Commit**

```bash
cd ~/source/razorback
git add skills/executing-plans/ skills/finishing-a-development-branch/
git commit -m "feat: executing-plans with recall/checkpoint, finishing-branch with plan completion"
```

---

### Task 13: Receiving Code Review + Test-Driven Development

**Files:**
- Create: `skills/receiving-code-review/SKILL.md`
- Create: `skills/test-driven-development/SKILL.md`
- Create: `skills/test-driven-development/testing-anti-patterns.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/receiving-code-review
mkdir -p ~/source/razorback/skills/test-driven-development
cp ~/source/superpowers/skills/receiving-code-review/SKILL.md ~/source/razorback/skills/receiving-code-review/
cp ~/source/superpowers/skills/test-driven-development/SKILL.md ~/source/razorback/skills/test-driven-development/
cp ~/source/superpowers/skills/test-driven-development/testing-anti-patterns.md ~/source/razorback/skills/test-driven-development/
```

**Step 2: Replace `superpowers:` with `razorback:` in all files**

**Step 3: Modify receiving-code-review — add Julie verification**

In the "## Source-Specific Handling" → "### From External Reviewers" section, after the existing checks, add to the verification steps:

```markdown
  6. Check: Use `deep_dive(symbol)` to understand full context of the code being discussed
  7. Check: Use `fast_refs(symbol)` to verify suggested changes won't break callers
```

**Step 4: Modify test-driven-development — minor Julie injection**

In the "## When Stuck" table, add a row:

```markdown
| Don't know existing patterns | `get_symbols(file_path, mode='structure')` to see test file organization |
```

**Step 5: Commit**

```bash
cd ~/source/razorback
git add skills/receiving-code-review/ skills/test-driven-development/
git commit -m "feat: receiving-code-review with Julie verification, TDD with get_symbols hint"
```

---

### Task 14: Low/No-Change Skills

**Files:**
- Create: `skills/dispatching-parallel-agents/SKILL.md`
- Create: `skills/using-git-worktrees/SKILL.md`
- Create: `skills/writing-skills/` (entire directory)

**Step 1: Copy all from Superpowers**

```bash
mkdir -p ~/source/razorback/skills/dispatching-parallel-agents
mkdir -p ~/source/razorback/skills/using-git-worktrees
mkdir -p ~/source/razorback/skills/writing-skills

cp ~/source/superpowers/skills/dispatching-parallel-agents/SKILL.md ~/source/razorback/skills/dispatching-parallel-agents/
cp ~/source/superpowers/skills/using-git-worktrees/SKILL.md ~/source/razorback/skills/using-git-worktrees/
cp -r ~/source/superpowers/skills/writing-skills/* ~/source/razorback/skills/writing-skills/
```

**Step 2: Replace `superpowers:` with `razorback:` in all .md files**

```bash
cd ~/source/razorback
find skills/dispatching-parallel-agents skills/using-git-worktrees skills/writing-skills -name "*.md" -exec sed -i '' 's/superpowers:/razorback:/g' {} +
```

**Step 3: Minor injection in dispatching-parallel-agents**

In the "### 2. Create Focused Agent Tasks" section, after "Each agent gets:", add a bullet:

```markdown
- **Tool guidance:** Use `get_context(query)` to orient independently rather than Glob/Read chains
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add skills/dispatching-parallel-agents/ skills/using-git-worktrees/ skills/writing-skills/
git commit -m "feat: dispatching-parallel-agents, using-git-worktrees, writing-skills (minimal changes)"
```

---

### Task 15: Agent and Command Files

**Files:**
- Create: `agents/code-reviewer.md`
- Create: `commands/brainstorm.md`
- Create: `commands/write-plan.md`
- Create: `commands/execute-plan.md`

**Step 1: Copy from Superpowers**

```bash
mkdir -p ~/source/razorback/agents
mkdir -p ~/source/razorback/commands
cp ~/source/superpowers/agents/code-reviewer.md ~/source/razorback/agents/
cp ~/source/superpowers/commands/brainstorm.md ~/source/razorback/commands/
cp ~/source/superpowers/commands/write-plan.md ~/source/razorback/commands/
cp ~/source/superpowers/commands/execute-plan.md ~/source/razorback/commands/
```

**Step 2: Replace `superpowers:` with `razorback:` in all files**

**Step 3: Add Julie tools to agents/code-reviewer.md**

In the agent's review process, after the existing "2. **Code Quality Assessment**" section, add:

```markdown
   - Use `julie:deep_dive(symbol)` on key modified symbols to understand callers, callees, types
   - Use `julie:fast_refs(symbol)` on changed public APIs to verify no broken dependents
   - Use `julie:get_symbols(file_path)` to review file structure before reading full content
```

**Step 4: Commit**

```bash
cd ~/source/razorback
git add agents/ commands/
git commit -m "feat: code-reviewer agent with Julie tools, commands with razorback refs"
```

---

### Task 16: README

**Files:**
- Create: `README.md`

**Step 1: Write README**

```markdown
# Razorback

**Julie/Goldfish-aware development workflow skills for Claude Code.**

Razorback is a fork of [Superpowers](https://github.com/obra/superpowers) (v4.3.1) that adds explicit awareness of two MCP servers to every skill and subagent prompt:

- **[Julie](https://github.com/murphy/julie)** — Code intelligence (search, symbols, references, context)
- **[Goldfish](https://github.com/murphy/goldfish)** — Developer memory (checkpoints, recall, plans)

## Why?

Superpowers produces high-quality results but burns tokens and time because every agent (controller and subagents) explores the codebase using generic Glob/Grep/Read chains. Razorback keeps the exact same proven workflow but routes all exploration through Julie's purpose-built tools and all state management through Goldfish's memory system.

**Same process. Better tools. Faster results.**

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Julie MCP Server](https://github.com/murphy/julie) — must be configured and indexing your workspace
- [Goldfish MCP Server](https://github.com/murphy/goldfish) — must be configured

## Installation

```bash
claude plugin add razorback
```

Or for development:
```bash
claude --plugin-dir ~/source/razorback
```

## What Changed from Superpowers

**Everything kept:**
- All 14 skills with identical process flows
- Same brainstorming → planning → TDD → execution → review → completion workflow
- Same two-stage code review (spec compliance + code quality)
- Same anti-rationalization tables and red flags
- Same SessionStart hook for skill activation

**What was added:**
- Julie tool calls at every exploration point (get_context, deep_dive, fast_refs, get_symbols)
- Goldfish integration for plan persistence and session continuity
- Toolchain documentation in the entry-point skill
- Checkpoint instructions at milestone completion points

## Skills

| Skill | Julie Integration | Goldfish Integration |
|-------|-------------------|---------------------|
| using-razorback | Toolchain docs | Toolchain docs |
| brainstorming | get_context for exploration | recall + plan for persistence |
| writing-plans | — | plan(save) for persistence |
| subagent-driven-development | — | checkpoint per task |
| executing-plans | — | recall + checkpoint per batch |
| test-driven-development | get_symbols for patterns | — |
| systematic-debugging | deep_dive + fast_refs | — |
| requesting-code-review | deep_dive + fast_refs | — |
| receiving-code-review | deep_dive + fast_refs | — |
| verification-before-completion | fast_refs for impact | checkpoint for evidence |
| finishing-a-development-branch | — | checkpoint + plan(complete) |
| dispatching-parallel-agents | get_context hint | — |
| using-git-worktrees | — | — |
| writing-skills | — | — |

## Subagent Prompt Changes

| Prompt | Julie Integration |
|--------|-------------------|
| implementer-prompt.md | Full orientation block: get_context → deep_dive → fast_refs → get_symbols |
| spec-reviewer-prompt.md | get_symbols + fast_refs for targeted review |
| code-quality-reviewer-prompt.md | deep_dive + fast_refs for impact analysis |

## License

MIT (forked from Superpowers, also MIT)

## Credits

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent.
```

**Step 2: Commit**

```bash
cd ~/source/razorback
git add README.md
git commit -m "docs: README explaining Razorback and differences from Superpowers"
```

---

## Execution Notes

- Tasks 1-3 set up infrastructure
- Tasks 4-6 are highest impact (subagent prompts + orchestrating skill)
- Tasks 7-11 are high/medium impact skills
- Tasks 12-14 are lower impact / minimal changes
- Tasks 15-16 are supporting files

**Total estimated files:** ~35 files across skills/, agents/, commands/, hooks/
**Total estimated changes from Superpowers:** ~200 lines added across all files (injection points)
