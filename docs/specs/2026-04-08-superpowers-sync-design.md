# Sync Razorback with Superpowers Upstream

**Date:** 2026-04-08
**Status:** Approved

## Goal

Cherry-pick improvements from superpowers (upstream) while preserving razorback's identity: Julie integration, Agent Teams, 3-path brainstorming, light plans, and lead inline review.

## Changes

### 1. Infrastructure

#### 1a. session-start hook
- Adopt printf instead of heredoc (bash 5.3+ hang fix, superpowers#571)
- Adopt platform detection: emit only the JSON field the current platform consumes (Cursor, Claude Code, Copilot CLI)
- Keep razorback naming and `using-razorback` skill reference
- Keep `${BASH_SOURCE[0]:-$0}` for SCRIPT_DIR (more robust than bare `$0`)
- Skip legacy skills directory warning (superpowers-specific)

#### 1b. hooks.json
- Remove `resume` from matcher: `startup|clear|compact`
- Fix quoting: double-quotes around command path instead of single-quotes

#### 1c. hooks-cursor.json (new file)
- Add Cursor-specific hooks file matching superpowers format

#### 1d. commands/ (deprecate all three)
- brainstorm.md, execute-plan.md, write-plan.md: mark deprecated, point to skills
- Skills are directly invocable via `/skill-name`, commands are redundant

### 2. Skill Content Improvements

#### 2a. brainstorming/SKILL.md
Merge these upstream additions into our existing content:
- Add spec self-review step (after writing design doc, before user review)
- Add user reviews written spec step (user reviews the file, not just the terminal summary)
- Keep our 3-path approach (Full/Fast/Lightweight) and Julie integration
- Update the process flow diagram to include new steps
- Save path remains `docs/specs/` (not superpowers' `docs/superpowers/specs/`)

#### 2b. brainstorming/spec-document-reviewer-prompt.md (new file)
- Copy from superpowers, adapt naming to razorback

#### 2c. brainstorming/visual-companion.md (new file)
- Copy from superpowers, adapt paths (`.razorback/brainstorm/` instead of `.superpowers/brainstorm/`)

#### 2d. brainstorming/scripts/ (new directory)
- Copy server.cjs, helper.js, frame-template.html, start-server.sh, stop-server.sh from superpowers
- Update path references from `.superpowers/` to `.razorback/`

#### 2e. writing-plans/SKILL.md
Merge these upstream additions into our existing content:
- Add "Scope Check" section (split multi-subsystem specs into separate plans)
- Add "File Structure" section (map files before defining tasks)
- Add "No Placeholders" section (explicit ban on TODOs, TBDs, vague instructions)
- Keep our Full vs Light plan depth distinction
- Keep Julie codebase orientation section
- Save path remains `docs/plans/`

#### 2f. writing-plans/plan-document-reviewer-prompt.md (new file)
- Copy from superpowers, adapt naming to razorback

#### 2g. executing-plans/SKILL.md
- Remove batch execution model (Steps 2-4 collapse into: execute all tasks, then report)
- Align with superpowers' "execute all, complete development" flow
- Keep Julie orientation instructions
- Keep razorback naming

#### 2h. dispatching-parallel-agents/SKILL.md
- Add context isolation intro paragraph from superpowers
- Keep our team-driven-development recommendation and Julie tool guidance

#### 2i. writing-skills/SKILL.md
- Add agentskills.io spec link for frontmatter fields
- Keep razorback naming

### 3. Explicitly Unchanged

These are razorback innovations and must not be reverted:

- 3-path brainstorming (Full/Fast/Lightweight) in brainstorming
- Full vs Light plan depth in writing-plans
- Julie tool integration points in all skills
- Lead inline review model in requesting-code-review
- team-driven-development skill (razorback-only)
- code-reviewer agent with Julie instructions
- `razorback:` naming throughout
- `TaskCreate` usage (not TodoWrite)
- `${BASH_SOURCE[0]:-$0}` in session-start (more robust)

## Acceptance Criteria

- [ ] session-start uses printf, detects platform, emits correct JSON shape
- [ ] hooks.json matcher is `startup|clear|compact`, command uses double-quotes
- [ ] hooks-cursor.json exists and works
- [ ] All three commands are deprecated with messages pointing to skills
- [ ] brainstorming has spec self-review, user spec review, visual companion, reviewer prompt
- [ ] brainstorming/scripts/ contains working visual companion server
- [ ] writing-plans has Scope Check, File Structure, No Placeholders sections, reviewer prompt
- [ ] executing-plans runs all tasks then reports (no batching)
- [ ] dispatching-parallel-agents has context isolation intro
- [ ] writing-skills references agentskills.io spec
- [ ] All razorback innovations preserved (3-path, light plans, Julie, inline review)
- [ ] All `razorback:` naming correct (no `superpowers:` references introduced)
- [ ] All path references use `docs/specs/` and `docs/plans/` (not superpowers paths)
