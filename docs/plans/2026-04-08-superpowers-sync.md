# Superpowers Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:executing-plans to implement this plan task-by-task.

**Goal:** Sync razorback with superpowers upstream improvements while preserving razorback identity.

**Architecture:** Three independent workstreams: infrastructure (hooks/commands), brainstorming skill (biggest change), and remaining skill updates. All touch separate files, fully parallelizable.

**Spec:** `docs/specs/2026-04-08-superpowers-sync-design.md`

---

### Task 1: Infrastructure (hooks + commands)

**Files:**
- Modify: `hooks/session-start`
- Modify: `hooks/hooks.json`
- Create: `hooks/hooks-cursor.json`
- Modify: `commands/brainstorm.md`
- Modify: `commands/execute-plan.md`
- Modify: `commands/write-plan.md`

**What to build:** Update hooks infrastructure for bash 5.3+ compatibility and multi-platform support. Deprecate slash commands in favor of direct skill invocation.

**Approach:**
- session-start: Replace heredoc JSON output with printf. Add platform detection (CURSOR_PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT, COPILOT_CLI) to emit only the JSON field each platform consumes. Keep razorback naming, keep `${BASH_SOURCE[0]:-$0}`, skip legacy skills directory warning.
- hooks.json: Change matcher to `startup|clear|compact` (drop `resume`). Use double-quotes around command path.
- hooks-cursor.json: Simple Cursor-specific hooks file with just `./hooks/session-start`.
- commands: Mark all three deprecated, tell user to invoke skills directly. Use `razorback:` prefix in deprecation messages.

**Reference:** Superpowers source at `~/source/superpowers/hooks/` for the exact printf/platform-detection logic.

**Acceptance criteria:**
- [ ] session-start uses printf, not heredoc
- [ ] Platform detection emits correct JSON for Cursor, Claude Code, Copilot CLI
- [ ] hooks.json matcher is `startup|clear|compact`, double-quoted command
- [ ] hooks-cursor.json exists
- [ ] All three commands deprecated with messages pointing to razorback skills
- [ ] All references say razorback, not superpowers
- [ ] Tests: run `bash hooks/session-start` and verify valid JSON output

### Task 2: Brainstorming skill update

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Create: `skills/brainstorming/spec-document-reviewer-prompt.md`
- Create: `skills/brainstorming/visual-companion.md`
- Create: `skills/brainstorming/scripts/server.cjs`
- Create: `skills/brainstorming/scripts/helper.js`
- Create: `skills/brainstorming/scripts/frame-template.html`
- Create: `skills/brainstorming/scripts/start-server.sh`
- Create: `skills/brainstorming/scripts/stop-server.sh`

**What to build:** Add spec self-review, user spec review, visual companion, and reviewer prompt template to the brainstorming skill. This is the largest task.

**Approach:**
- SKILL.md: Add two new steps to all three paths (after "Write design doc"):
  - Spec self-review: quick inline check for placeholders, contradictions, ambiguity, scope
  - User reviews written spec: ask user to review the spec file before proceeding
  - Update the process flow diagram to include these steps
  - Add a "Visual Companion" section explaining when/how to offer it (reference visual-companion.md)
- spec-document-reviewer-prompt.md: Copy from superpowers, change `superpowers` to `razorback` in naming, change `docs/superpowers/specs/` to `docs/specs/`.
- visual-companion.md: Copy from superpowers, change `.superpowers/brainstorm/` to `.razorback/brainstorm/`, change `superpowers` references to `razorback`.
- scripts/: Copy all 5 files from superpowers. In start-server.sh and stop-server.sh, change `.superpowers/` to `.razorback/` in path references.
- Keep existing 3-path approach, Julie integration, lightweight implementation section entirely intact.

**Reference:** Superpowers source at `~/source/superpowers/skills/brainstorming/` for all new files and the upstream SKILL.md for the spec review steps.

**Acceptance criteria:**
- [ ] SKILL.md has spec self-review and user spec review steps in all three paths
- [ ] Process flow diagram updated with new steps
- [ ] Visual companion section present with reference to visual-companion.md
- [ ] spec-document-reviewer-prompt.md exists with razorback naming
- [ ] visual-companion.md exists with `.razorback/` paths
- [ ] scripts/ contains all 5 files with `.razorback/` paths
- [ ] 3-path approach (Full/Fast/Lightweight) preserved
- [ ] Julie integration preserved
- [ ] All references say razorback, not superpowers

### Task 3: Remaining skill updates

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Create: `skills/writing-plans/plan-document-reviewer-prompt.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`
- Modify: `skills/writing-skills/SKILL.md`

**What to build:** Merge upstream improvements into four skills and add a reviewer prompt template.

**Approach:**

*writing-plans/SKILL.md:* Add three new sections after "Plan Depth: Full vs. Light" and before "Codebase Orientation":
- "Scope Check": If spec covers multiple independent subsystems, suggest breaking into separate plans. One plan per subsystem, each producing working testable software.
- "File Structure": Before defining tasks, map out which files will be created/modified. Design units with clear boundaries. Prefer smaller focused files. Follow established patterns in existing codebases.
- "No Placeholders": Explicit ban list (TBD, TODO, "add appropriate error handling", "similar to Task N", etc.). Every step must contain actual content.
Keep Full/Light plan depth, Julie codebase orientation, all existing content.

*writing-plans/plan-document-reviewer-prompt.md:* Copy from superpowers, change `superpowers` to `razorback`.

*executing-plans/SKILL.md:* Replace Steps 2-4 (Execute Batch, Report, Continue) with a single "Execute Tasks" step. For each task: mark in_progress, orient with Julie tools, follow steps exactly, run verifications, mark completed. After all tasks: proceed to Step 3 (Complete Development, was Step 5). Remove batch size references and "Ready for feedback" checkpoint.

*dispatching-parallel-agents/SKILL.md:* Add intro paragraph after the Overview heading: "You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history -- you construct exactly what they need. This also preserves your own context for coordination work."

*writing-skills/SKILL.md:* In the SKILL.md Structure section, change the frontmatter field note from "Only two fields supported: `name` and `description`" to "Two required fields: `name` and `description` (see [agentskills.io/specification](https://agentskills.io/specification) for all supported fields)".

**Reference:** Superpowers source at `~/source/superpowers/skills/` for exact wording of new sections.

**Acceptance criteria:**
- [ ] writing-plans has Scope Check, File Structure, No Placeholders sections
- [ ] writing-plans still has Full/Light plan depth and Julie orientation
- [ ] plan-document-reviewer-prompt.md exists with razorback naming
- [ ] executing-plans has no batch execution, runs all tasks then completes
- [ ] executing-plans still has Julie orientation instructions
- [ ] dispatching-parallel-agents has context isolation intro
- [ ] dispatching-parallel-agents still has team-driven-development recommendation and Julie guidance
- [ ] writing-skills references agentskills.io spec
- [ ] All references say razorback, not superpowers
