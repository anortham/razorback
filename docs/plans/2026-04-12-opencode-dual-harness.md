# OpenCode Dual-Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:executing-plans to implement this plan task-by-task (or razorback:team-driven-development if executing as a team).

**Goal:** Bring razorback's opencode integration up to parity with Claude Code — one-line install, no symlinks, harness-aware execution model guidance, no Claude Code regressions.

**Architecture:** Single repo, two entry points. Claude Code uses the existing `SessionStart` hook. OpenCode uses a JS plugin (`config` hook to register skills dir, `messages.transform` hook to inject bootstrap on first user message). Bootstrap content comes from `skills/using-razorback/SKILL.md`, with the Execution Model section string-replaced by the JS plugin for opencode (names `subagent-driven-development` as primary instead of `team-driven-development`). Skills/agents/commands stay where they are; opencode only consumes `skills/`.

**Tech Stack:** Node/Bun ESM for the opencode plugin (no runtime deps). Existing bash hooks remain for Claude Code. Markdown for all docs and skills.

**Reference spec:** `docs/plans/2026-04-12-opencode-dual-harness-design.md`

---

## File Structure

| File | Action | Owner task |
|---|---|---|
| `.opencode/plugins/razorback.js` | Rewrite | Task 1 |
| `.opencode/INSTALL.md` | Create | Task 1 |
| `package.json` | Create (root) | Task 1 |
| `AGENTS.md` | Create (symlink → `CLAUDE.md`) | Task 1 |
| `skills/subagent-driven-development/SKILL.md` | Un-deprecate, refresh | Task 2 |
| `CLAUDE.md` | Update execution model section | Task 3 |
| `README.md` | Add OpenCode install section, update skills table | Task 3 |
| `docs/README.opencode.md` | Rewrite for v0.6.x + no-symlink install | Task 4 |

No file is touched by more than one task. Parallel-safe.

---

## Task 1: OpenCode install infrastructure

**Files:**
- Rewrite: `.opencode/plugins/razorback.js`
- Create: `.opencode/INSTALL.md`
- Create: `package.json`
- Create: `AGENTS.md` (symlink to `CLAUDE.md`)

**What to build:** The full opencode-install UX. The JS plugin registers the skills dir via `config` hook (kills the symlink requirement) and injects the razorback bootstrap on the first user message via `experimental.chat.messages.transform` (not system transform — avoids token bloat and Qwen breakage). Install is one line in `opencode.json`. `AGENTS.md` lets opencode pick up project instructions from `CLAUDE.md`.

**Approach:**

1. **JS plugin** (`.opencode/plugins/razorback.js`)
   - Port `~/source/superpowers/.opencode/plugins/superpowers.js` as the starting point. Rename `SuperpowersPlugin` → `RazorbackPlugin`, adjust skill dir resolution to `path.resolve(__dirname, '../../skills')`.
   - Keep: frontmatter extraction helper, path normalization helper, bootstrap loader, `<EXTREMELY_IMPORTANT>` wrapper, idempotency guard.
   - **Config hook** — push `razorbackSkillsDir` onto `config.skills.paths`, guarding against duplicates. Same shape as superpowers.
   - **Messages transform hook** — `'experimental.chat.messages.transform': async (_input, output) => {...}`. Skip if empty or already injected. Prepend a synthetic text part to the first user message.
   - **Execution Model replacement** — before wrapping, string-replace the `## Execution Model` section in the loaded skill body with the opencode flavor (text below). Match from `## Execution Model` up to but not including the next line starting with `## `. If the section isn't found, fall through without replacement (defensive — the skill body is authoritative but don't blow up if it gets refactored).
   - **OpenCode Execution Model text** to inject:
     ```
     ## Execution Model

     When executing implementation plans:

     - **2+ independent tasks:** Use `razorback:subagent-driven-development` (fresh subagent per task, inline review by lead)
     - **1 task or sequential:** Use `razorback:executing-plans` (single agent, batch execution)
     - **Ad-hoc parallel work:** Use `razorback:dispatching-parallel-agents` (independent agent dispatch)

     Subagent-driven is the primary execution path in opencode. Agent Teams are not available in opencode — use subagents via @mention. Lead does inline review of each subagent's output (spec compliance + code quality).
     ```
   - **Tool mapping block** (appended after the skill body, before closing `</EXTREMELY_IMPORTANT>`):
     ```
     **Tool Mapping for OpenCode:**
     When skills reference tools, substitute OpenCode equivalents:
     - `TodoWrite` → `todowrite`
     - `Task` with subagents → opencode's `@mention` syntax
     - `Skill` tool → opencode's native `skill` tool
     - `Read`/`Write`/`Edit`/`Bash` → your native tools

     Use OpenCode's native `skill` tool to list and load skills.
     ```
   - Remove the stale `experimental.chat.system.transform` hook entirely. Do not leave it for compat — superpowers moved off it deliberately.
   - Keep the comment block at the top accurate: "Injects razorback bootstrap via message transform (not system) to avoid per-turn token bloat and multi-system-message issues with some models. Registers skills directory via config hook — no symlinks required."

2. **`.opencode/INSTALL.md`** — mirror superpowers' structure (`~/source/superpowers/.opencode/INSTALL.md`). Content:
   - Prerequisites: OpenCode.ai + Julie MCP (razorback-specific requirement superpowers doesn't have).
   - Install: add one line to `opencode.json`: `"plugin": ["razorback@git+https://github.com/anortham/razorback.git"]`. Restart opencode.
   - Verify: ask opencode "Tell me about razorback."
   - Migration section: how to remove the old symlink-based install (paths from current `docs/README.opencode.md`).
   - Usage: `use skill tool to list skills` / `use skill tool to load razorback/brainstorming`.
   - Pinning a version: `razorback@git+https://github.com/anortham/razorback.git#v0.7.0`.
   - Troubleshooting: plugin not loading, skills not found, tool mapping reminder.

3. **`package.json`** — minimal root manifest so opencode's auto-`bun install` works:
   ```json
   {
     "name": "razorback",
     "version": "0.7.0",
     "description": "Team-first, Julie-powered development workflow. Now cross-harness.",
     "private": true,
     "type": "module",
     "author": "anortham",
     "license": "MIT",
     "homepage": "https://github.com/anortham/razorback"
   }
   ```
   No `dependencies` block — the plugin uses only Node/Bun builtins.

4. **`AGENTS.md`** — symlink to `CLAUDE.md`:
   ```bash
   ln -s CLAUDE.md AGENTS.md
   ```
   Git tracks symlinks fine; on Windows, users need `core.symlinks=true` which is already standard guidance.

**Acceptance criteria:**
- [ ] `.opencode/plugins/razorback.js` loads without errors in opencode (verify via `opencode run --print-logs`).
- [ ] First user message in opencode gets bootstrap injected exactly once (idempotency guard works).
- [ ] Second and later user messages are NOT re-injected.
- [ ] The opencode bootstrap references `subagent-driven-development` as primary (not team-driven).
- [ ] Tool-mapping block uses `todowrite` (not stale `update_plan`).
- [ ] `skill` tool in opencode lists all razorback skills with no manual symlinks.
- [ ] `.opencode/INSTALL.md` install line is copy-pasteable and correct.
- [ ] Root `package.json` parses as valid JSON, `"type": "module"` set.
- [ ] `AGENTS.md` resolves to `CLAUDE.md` when opened in opencode.
- [ ] No `experimental.chat.system.transform` hook remains in the plugin.
- [ ] Committed as one logical commit with message: `feat: modernize opencode plugin and install UX`.

---

## Task 2: Un-deprecate and refresh subagent-driven-development

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`

**What to build:** Revive `subagent-driven-development` as the opencode execution primary. Currently marked DEPRECATED with a banner redirecting to `team-driven-development`. Body is still mostly usable but has a few places that need attention.

**Approach:**

1. **Frontmatter** — change `description` from `"DEPRECATED: Use razorback:team-driven-development instead. Kept for reference only."` to something like: `"Execute an implementation plan by dispatching a fresh subagent per task with inline review by the lead. Primary execution path for opencode (no Agent Teams)."`
2. **Remove the DEPRECATED banner** — delete the `# Subagent-Driven Development (DEPRECATED)` H1 through the first `---` separator (the block that redirects to team-driven). Replace with clean intro.
3. **Tool references audit** — scan the body for:
   - References to `TaskCreate`/`TaskUpdate`: opencode equivalent is `todowrite`. Leave the Claude Code names in the skill body (the bootstrap's tool-mapping block handles substitution at model-read time); don't duplicate the translation here.
   - References to `Glob`/`Grep`/`Read` chains for orientation: replace with Julie directives (`get_context`, `deep_dive`, `fast_refs`, `get_symbols`) consistent with other razorback skills. The current body already mentions Julie in the "Efficiency gains" section ("Julie tools replace Glob/Grep/Read chains"), so this may be a minor edit.
4. **Review flow audit** — current skill dispatches separate spec-reviewer and code-quality-reviewer subagents. For consistency with team-driven, update to: **lead does inline review (spec compliance + code quality) in a single pass**, same as team-driven. Dispatching separate reviewer subagents is the old pattern; delete the "Dispatch spec reviewer" and "Dispatch code quality reviewer" nodes from the process graph. The "When to Skip Spec Review" section can stay but reframe: it's when the lead does a lighter-touch review, not when a separate subagent is skipped.
5. **Prompt templates** — the skill references `./spec-reviewer-prompt.md`, `./code-quality-reviewer-prompt.md`, `./implementer-prompt.md`, `./fix-prompt.md`. Check which exist in the same directory. If the reviewer prompts exist, leave them (still referenced by `README.md`'s template table). Update the skill body to note that reviewer prompts are optional/legacy — lead uses the checklists inline. The implementer-prompt and fix-prompt stay in active use.
6. **"Red Flags" section** — remove references to separate reviewers (e.g., "**start code quality review before spec compliance is done** (wrong order)"). Replace with inline-review red flags.
7. **Integration section** — keep links to `using-git-worktrees`, `writing-plans`, `requesting-code-review`, `finishing-a-development-branch`, `test-driven-development`, `executing-plans`. Remove any "deprecated, use team-driven instead" language.

Keep the skill's core value prop: fresh subagent per task, resume for fixes (Agent tool `resume` parameter), efficiency gains over manual execution.

**Acceptance criteria:**
- [ ] Frontmatter `description` no longer contains "DEPRECATED".
- [ ] No H1 banner redirecting to team-driven-development.
- [ ] Julie tools named at exploration points (not Glob/Grep/Read chains).
- [ ] Review flow describes inline review by lead (spec compliance + code quality in one pass), matching team-driven's pattern.
- [ ] Process diagram updated — no separate spec-reviewer / code-quality-reviewer subagent nodes.
- [ ] Red Flags section does not reference separate reviewer ordering.
- [ ] Skill reads as first-class (opencode's primary), not a fallback or legacy option.
- [ ] Committed separately: `feat: revive subagent-driven-development as opencode execution primary`.

---

## Task 3: Update project-level docs (CLAUDE.md + README.md)

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**What to build:** Reflect the dual-harness reality in the two docs users/agents see first.

**Approach:**

1. **CLAUDE.md** — update the "Execution Model" section:
   - Current text:
     ```
     ## Execution Model
     - **Primary:** Agent Teams via `team-driven-development` for plans with 2+ independent tasks
     - **Fallback:** Single-agent via `executing-plans` for sequential/single-task work
     - **Ad-hoc:** `dispatching-parallel-agents` for independent parallel tasks outside plans
     - Lead does inline review (spec compliance + code quality) instead of dispatching reviewer subagents
     - `subagent-driven-development` is deprecated; kept for reference only
     ```
   - Replace with:
     ```
     ## Execution Model

     **Primary execution path depends on harness:**
     - **Claude Code:** `team-driven-development` (Agent Teams, parallel teammates, inline review)
     - **OpenCode:** `subagent-driven-development` (fresh subagent per task, inline review by lead)

     **Shared across both harnesses:**
     - **Sequential/single-task:** `executing-plans` (single agent, batch execution)
     - **Ad-hoc parallel:** `dispatching-parallel-agents` (independent agent dispatch)
     - Lead does inline review (spec compliance + code quality) — no separate reviewer subagents

     The opencode bootstrap is injected by `.opencode/plugins/razorback.js` and substitutes the appropriate Execution Model guidance at session start.
     ```
   - Also update the "Project Structure" section if it mentions `.opencode/` or plugin layout — add notes that `agents/`, `commands/`, `hooks/` are Claude-Code-only and `.opencode/` is opencode-only.

2. **README.md** — three changes:
   - **Tagline** — current says "**Team-first, Julie-powered development workflow for Claude Code.**". Update to something like "**Julie-powered development workflow for Claude Code and OpenCode.**" Adjust the first paragraph to note it works in both harnesses.
   - **Installation section** — add an "## OpenCode" subsection after the existing Claude Code install options. Content mirrors superpowers' README:
     ```
     ### OpenCode

     Tell OpenCode:

     ```
     Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.opencode/INSTALL.md
     ```

     **Detailed docs:** [docs/README.opencode.md](docs/README.opencode.md)
     ```
   - **Skills table** — un-strikethrough `subagent-driven-development` and update its Purpose column. New row:
     ```
     | subagent-driven-development | Primary execution in OpenCode: fresh subagent per task, inline review by lead |
     ```
     Also update `team-driven-development`'s Purpose column if it claims to be "primary" without qualification — add "(Claude Code)" qualifier or note it's Claude Code's primary.

**Acceptance criteria:**
- [ ] `CLAUDE.md` execution model section names team-driven (Claude Code) and subagent-driven (OpenCode) as primary per-harness.
- [ ] `CLAUDE.md` no longer says `subagent-driven-development` is deprecated.
- [ ] `README.md` tagline reflects multi-harness support.
- [ ] `README.md` has an OpenCode install section with the "Tell OpenCode: Fetch and follow instructions from..." line and the raw.githubusercontent.com URL.
- [ ] `README.md` skills table shows `subagent-driven-development` as active, not strikethrough.
- [ ] Committed: `docs: reflect dual-harness support in CLAUDE.md and README`.

---

## Task 4: Rewrite docs/README.opencode.md

**Files:**
- Rewrite: `docs/README.opencode.md`

**What to build:** Replace the 276-line symlink-based install guide with a current guide matching the v0.6.x plugin pattern and v0.7.0's no-symlink install.

**Approach:**

1. **Drop all symlink-based install content.** The Windows cmd/PowerShell/Git Bash sections assume manual symlinks. Those are gone — `opencode.json` plugin entry replaces them all. Windows users need no special flow now.
2. **Structure the new doc** (use `~/source/superpowers/docs/README.opencode.md` as the reference skeleton):
   - **Intro** — one paragraph: razorback for opencode, Julie MCP required.
   - **Installation** — one line in `opencode.json`: `"plugin": ["razorback@git+https://github.com/anortham/razorback.git"]`. Restart. Verify by asking "Tell me about razorback."
   - **Migrating from the old symlink install** — keep the removal steps from the current doc (users of v0.5.0 era need these). Reference the paths: `~/.config/opencode/plugins/razorback.js`, `~/.config/opencode/skills/razorback`, optionally the cloned repo at `~/.config/opencode/razorback`. Also mention removing any `skills.paths` entry they added manually.
   - **Usage** — `use skill tool to list skills`, `use skill tool to load razorback/brainstorming`.
   - **Personal skills** — `~/.config/opencode/skills/<name>/SKILL.md`. Skill Priority: project > personal > razorback.
   - **Project skills** — `.opencode/skills/<name>/SKILL.md`.
   - **Updating** — restart opencode; plugin re-fetches from git. Pin via `#v0.7.0`.
   - **How it works** — two hooks: `config` registers skills dir, `experimental.chat.messages.transform` injects bootstrap on first user message. Agent Teams unavailable → subagent-driven is the execution primary in opencode.
   - **Tool mapping** — same table as the bootstrap injection.
   - **Troubleshooting** — plugin not loading (`opencode run --print-logs "hello" 2>&1 | grep -i razorback`), skills not found (`skill` tool list), bootstrap not appearing (opencode version supports messages.transform). Remove all Windows-specific symlink troubleshooting.
3. **Delete all Windows-specific install paths.** The plugin approach is platform-agnostic — no cmd/PowerShell/Git Bash variants needed.
4. **Reference Julie requirement** — call out that razorback skills require Julie MCP (opencode-native pattern; same as Claude Code install).

**Acceptance criteria:**
- [ ] `docs/README.opencode.md` no longer contains `mklink`, `ln -s`, `/J` junctions, or `Developer Mode` instructions.
- [ ] Install section is a one-line `opencode.json` addition.
- [ ] "Migrating from symlink install" section tells v0.5.0 users how to clean up.
- [ ] Tool mapping uses `todowrite` (not `update_plan`).
- [ ] How-it-works section names `messages.transform` (not `system.transform`).
- [ ] Execution model mention names subagent-driven as opencode primary.
- [ ] Julie MCP listed as prerequisite.
- [ ] Committed: `docs: rewrite OpenCode install guide for plugin-based install`.

---

## Verification (after all tasks)

Manual end-to-end test in opencode:

1. In a scratch project, add `{"plugin": ["razorback@git+file:///Users/murphy/source/razorback"]}` to `opencode.json`. (Local path; avoids waiting for GitHub push.)
2. Start opencode. Confirm `bun install` runs against root `package.json` with no errors.
3. Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i razorback` — plugin should log as loaded.
4. Ask opencode: "Tell me about razorback." Expected: response references razorback, mentions subagent-driven as primary, does NOT claim Agent Teams are available.
5. Invoke the `skill` tool with no args. Expected: razorback skills listed (brainstorming, writing-plans, subagent-driven-development, etc.).
6. Load `razorback/subagent-driven-development` via `skill` tool. Expected: skill body loads, no DEPRECATED banner.
7. In the same project, start Claude Code. Expected: `SessionStart` hook fires, team-driven is still named as primary, no regressions.
8. Check `AGENTS.md` resolves — `cat AGENTS.md` should show the full `CLAUDE.md` content.

## Conventions

- Commit each task separately. Commit messages match the suggested strings in each task.
- Use Julie tools (`deep_dive`, `edit_file`, `edit_symbol`, `get_symbols`) for modifications. Avoid Read+Edit unless Julie can't handle it.
- Follow TDD only where it applies — most of this work is config/docs/skill-text and has no unit tests. The verification steps above are the test plan.
- Frequent commits: one per task. If a task grows beyond its scope, stop and reassess.
