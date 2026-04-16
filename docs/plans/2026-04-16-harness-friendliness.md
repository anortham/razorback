# Harness-Friendliness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:team-driven-development to implement this plan. Tasks are grouped by teammate below; dispatch three teammates in parallel on the independent work, then lead handles final docs.

**Goal:** Ship first-class support for Claude Code, Cursor, Codex, OpenCode, Copilot CLI, and Gemini CLI; fix the internally-broken `razorback:code-reviewer` reference; make hook failures audible.

**Architecture:** Port superpowers' Cursor/Gemini/Copilot manifests + tool-mapping references verbatim (with razorback branding). Extend `using-razorback` with `<SUBAGENT-STOP>` + Instruction Priority sections. Add per-harness fallback table to code-reviewer references. Harden hook/plugin failure modes. Port superpowers' `.version-bump.json`-driven bump script to prevent manifest drift.

**Tech Stack:** Bash scripts, JSON manifests, markdown skill bodies, Node.js (OpenCode plugin), `jq` (bump script).

**Design spec:** `docs/plans/2026-04-16-harness-friendliness-design.md`

---

## Teammate A: Harness manifests + bootstrap skill

Owns Phase 1 (new manifest files) and Phase 2 (using-razorback body). Phase 2 starts after Phase 1 lands so the "Platform Adaptation" section can reference the new files.

### Task A1: Cursor plugin manifest

**Files:**
- Create: `.cursor-plugin/plugin.json`

**What to build:** Cursor-format plugin manifest that points to the existing `skills/`, `agents/`, `commands/`, and `hooks/hooks-cursor.json`. Modeled on superpowers' `.cursor-plugin/plugin.json`.

**Approach:**
- Name `razorback`, displayName `Razorback`, version matches `.claude-plugin/plugin.json` (`0.8.0` at time of writing)
- Author: `Alan Northam`, homepage `https://github.com/anortham/razorback`, license `MIT`
- Keywords match `.claude-plugin/plugin.json` keywords
- Declare: `"skills": "./skills/"`, `"agents": "./agents/"`, `"commands": "./commands/"`, `"hooks": "./hooks/hooks-cursor.json"`
- Reference: read `/Users/murphy/source/superpowers/.cursor-plugin/plugin.json` for the exact field shape

**Acceptance criteria:**
- [ ] File is valid JSON
- [ ] All declared paths exist in the repo
- [ ] Version matches `.claude-plugin/plugin.json`
- [ ] Committed

### Task A2: Gemini extension manifest + GEMINI.md

**Files:**
- Create: `gemini-extension.json`
- Create: `GEMINI.md`

**What to build:** Minimal Gemini extension manifest and a context file that includes the using-razorback skill + Gemini tool mapping via Gemini's `@./` include syntax.

**Approach:**
- `gemini-extension.json`: four fields only — `name`, `description`, `version`, `contextFileName: GEMINI.md`. Match `name` to plugin name, version to `.claude-plugin/plugin.json`
- `GEMINI.md`: two lines
  ```
  @./skills/using-razorback/SKILL.md
  @./skills/using-razorback/references/gemini-tools.md
  ```
- Reference: `/Users/murphy/source/superpowers/gemini-extension.json` and `GEMINI.md`

**Acceptance criteria:**
- [ ] `gemini-extension.json` is valid JSON with all four fields
- [ ] `GEMINI.md` has the two `@./` include lines and nothing else
- [ ] Committed

### Task A3: Copilot CLI tool mapping reference

**Files:**
- Create: `skills/using-razorback/references/copilot-tools.md`

**What to build:** Claude Code → Copilot CLI tool equivalence reference, ported from superpowers with razorback branding and a Julie note.

**Approach:**
- Start from `/Users/murphy/source/superpowers/skills/using-superpowers/references/copilot-tools.md`
- Global replace `superpowers` → `razorback` (case-preserving; only one occurrence, in the named-agent row example)
- After the main tool table, add a "Julie on Copilot CLI" section:
  > Julie MCP works via Copilot CLI's MCP support. Razorback's Julie directives (`get_context`, `deep_dive`, `fast_refs`, `get_symbols`) apply unchanged — Julie tool names don't vary by harness.

**Acceptance criteria:**
- [ ] Tool mapping table complete (Read/Write/Edit/Bash/Grep/Glob/Skill/WebFetch/Task/TodoWrite/WebSearch/EnterPlanMode)
- [ ] Agent-type section references `razorback:code-reviewer`, not `superpowers:code-reviewer`
- [ ] Julie note present
- [ ] Committed

### Task A4: Gemini CLI tool mapping reference

**Files:**
- Create: `skills/using-razorback/references/gemini-tools.md`

**What to build:** Claude Code → Gemini CLI tool equivalence reference, ported from superpowers with razorback branding and razorback-specific notes.

**Approach:**
- Start from `/Users/murphy/source/superpowers/skills/using-superpowers/references/gemini-tools.md`
- Keep the tool mapping table verbatim (Gemini is harness-agnostic in its tool names)
- Keep the "No subagent support" section; update the skill-name reference line to say: "`razorback:subagent-driven-development` and `razorback:dispatching-parallel-agents` fall back to single-session execution via `razorback:executing-plans`"
- Add a "Julie on Gemini CLI" section: Julie MCP is supported; tool names unchanged; the exploration directives in skill bodies apply.

**Acceptance criteria:**
- [ ] Tool mapping table present
- [ ] Razorback-prefixed skill names in no-subagent note
- [ ] Julie note present
- [ ] Committed

### Task A5: using-razorback/SKILL.md body updates

**Files:**
- Modify: `skills/using-razorback/SKILL.md`

**What to build:** Four changes to the bootstrap skill: SUBAGENT-STOP block, Instruction Priority section, extended platform instructions, extended tool-mapping pointers.

**Approach:**
- **Above the existing `<EXTREMELY-IMPORTANT>` block,** insert:
  ```
  <SUBAGENT-STOP>
  If you were dispatched as a subagent to execute a specific task, skip this skill.
  </SUBAGENT-STOP>
  ```
- **Between the `<EXTREMELY-IMPORTANT>` block and `## How to Access Skills`,** insert a new section ported from superpowers' `using-superpowers/SKILL.md` "Instruction Priority" section. Replace `Superpowers` → `Razorback`. Keep the three-tier priority list and the CLAUDE.md/GEMINI.md/AGENTS.md example.
- **In `## How to Access Skills`,** add entries for Cursor, Copilot CLI, and Gemini CLI. Model the entries on the existing Claude Code / Codex / OpenCode entries. Keep the four existing entries. The order should be: Claude Code, Cursor, Codex, OpenCode, Copilot CLI, Gemini CLI.
- **In `## Platform Adaptation`,** expand the bullet list to cover all four non-CC mapping sources:
  - Codex: `references/codex-tools.md`
  - Copilot CLI: `references/copilot-tools.md`
  - Gemini CLI: `references/gemini-tools.md` (loaded automatically via `GEMINI.md`)
  - OpenCode: injected automatically by the razorback plugin bootstrap
- Use Julie to read the current skill before editing: `get_symbols(file_path='skills/using-razorback/SKILL.md')`

**Acceptance criteria:**
- [ ] `<SUBAGENT-STOP>` block present at top
- [ ] "Instruction Priority" section present
- [ ] "How to Access Skills" lists all six harnesses
- [ ] "Platform Adaptation" references all four mapping sources
- [ ] Existing content (Red Flags table, Execution Model, Skill Priority, Skill Types, User Instructions, Your Toolchain) preserved unchanged
- [ ] Committed

---

## Teammate B: Code-reviewer fallback + hook hardening

Owns Phase 3 (after Phase 2 lands — Task B1 depends on A5) and Phase 4 (independent — can run first).

### Task B1: Per-harness code-reviewer fallback in requesting-code-review

**Files:**
- Modify: `skills/requesting-code-review/SKILL.md`

**What to build:** Replace the bare `razorback:code-reviewer` dispatch directive in Mode 2 with a six-harness fallback table, so Codex/OpenCode/Gemini users don't hit an unresolvable instruction.

**Approach:**
- Use `get_symbols(file_path='skills/requesting-code-review/SKILL.md')` to locate Mode 2 ("Mode 2: Standalone Review")
- Replace the current step-2 instruction ("Use Agent tool with razorback:code-reviewer type, fill template at `code-reviewer.md`") with a harness-aware table:

  | Harness | How to invoke |
  |---------|---------------|
  | Claude Code | `Agent(subagent_type="razorback:code-reviewer", prompt=<filled template>)` |
  | Cursor | Same as Claude Code (plugin agents exposed through the Skill tool's agent discovery) |
  | Copilot CLI | `task(agent_type="razorback:code-reviewer", …)` — plugin agents auto-discovered |
  | Codex | `spawn_agent(agent_type="worker", message=<see note below>)` |
  | OpenCode | `Task` tool with `general` subagent (message built as in the note below) |
  | Gemini CLI | No subagents — lead applies the reviewer checklist inline |

- Below the table, add an explicit two-file note for the inline-prompt harnesses: "The reviewer uses two files. `agents/code-reviewer.md` holds the reviewer's system-prompt body (its behavioral spec). `requesting-code-review/code-reviewer.md` is the task template with placeholders (`{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`). On Claude Code / Cursor / Copilot CLI the agent discovery wires these together automatically. On Codex and OpenCode, build the dispatch message by concatenating: (1) `agents/code-reviewer.md` body (strip the frontmatter), then (2) the filled-in `requesting-code-review/code-reviewer.md` template. Send that as the subagent's task message."
- Keep the template placeholder list (`{WHAT_WAS_IMPLEMENTED}`, `{PLAN_OR_REQUIREMENTS}`, `{BASE_SHA}`, `{HEAD_SHA}`, `{DESCRIPTION}`) unchanged — it applies to all harnesses
- Leave Mode 1 (inline review during plan execution) unchanged

**Acceptance criteria:**
- [ ] Six-harness fallback table present in Mode 2
- [ ] Two-file note distinguishing `agents/code-reviewer.md` (system prompt) from `requesting-code-review/code-reviewer.md` (task template), with dispatch-message construction steps for Codex/OpenCode
- [ ] Template placeholder list unchanged
- [ ] Mode 1 unchanged
- [ ] Committed

### Task B2: Clarify code-quality-reviewer-prompt.md

**Files:**
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

**What to build:** Reframe the prompt template as a *checklist the lead applies inline* rather than a dispatch template for a Claude-Code-only agent. The current framing leaks Claude Code assumptions into every harness's review flow.

**Approach:**
- Read current file; it's ~27 lines
- Replace the code fence that starts `Agent tool (razorback:code-reviewer):` with a heading like "### Review Checklist" followed by the existing content (template placeholders, Julie directive list) as plain markdown — no `Agent tool (...)` framing
- Add a one-line note at the top: "The lead applies this checklist directly during inline review. For standalone (Mode 2) reviews, see the per-harness dispatch table in `requesting-code-review/SKILL.md`."
- Keep the "Code reviewer returns" line at the bottom
- Preserve the `agents/code-reviewer.md` placeholder semantics — the template still drives what the reviewer (whether human or dispatched agent) does

**Acceptance criteria:**
- [ ] No `Agent tool (razorback:code-reviewer):` framing
- [ ] Points to `requesting-code-review/SKILL.md` for standalone dispatch
- [ ] Julie directive list preserved
- [ ] Committed

### Task B3: run-hook.cmd audible Windows warning

**Files:**
- Modify: `hooks/run-hook.cmd:37-39`

**What to build:** When Git Bash is not found on Windows, emit a stderr warning before the silent exit so users know why the bootstrap didn't fire.

**Approach:**
- Current lines 37-39 say `REM No bash found - exit silently rather than error` then `exit /b 0`
- Replace with three lines:
  ```cmd
  echo razorback: no bash found on Windows -- SessionStart bootstrap disabled.>&2
  echo Install Git for Windows ^(https://git-scm.com^) to enable.>&2
  exit /b 0
  ```
- Keep exit code 0 so the hook registration doesn't fail the whole plugin
- Update the comment above the exit to reflect the new behavior: `REM No bash found - warn on stderr, exit 0 so plugin still loads.`

**Acceptance criteria:**
- [ ] Stderr warning emitted on Windows-without-bash path
- [ ] Exit code still 0
- [ ] Comment updated
- [ ] Committed

### Task B4: OpenCode plugin defensive logging

**Files:**
- Modify: `.opencode/plugins/razorback.js`

**What to build:** Two guards. First, when `replaceExecutionModel` regex misses, emit a `console.warn` instead of silently returning the unchanged body. Second, guard the `experimental.chat.messages.transform` hook registration so OpenCode API renames are logged rather than silent no-ops.

**Approach:**
- Use `get_symbols(file_path='.opencode/plugins/razorback.js')` to locate `replaceExecutionModel` and the returned plugin object
- In `replaceExecutionModel`: before the `if (!re.test(body)) return body;` return, add `console.warn('razorback: Execution Model section not found in using-razorback body — OpenCode variant not substituted. Check skill body for header drift.');`
- The `experimental.chat.messages.transform` handler is defined as a value on the returned plugin object. Wrap its body in try/catch that logs `console.warn('razorback: messages.transform hook failed:', err)` on error. This catches runtime errors but not API disappearance. For API disappearance, add a one-line startup log in the exported function: after registering `config`, check if `'experimental.chat.messages.transform'` is a key OpenCode recognizes. Since the harness decides which keys to wire up, the best available signal is to add a comment warning future maintainers: if OpenCode stabilizes this hook (removes `experimental.` prefix), the plugin will silently stop injecting until the key is updated. Add that comment above the hook.

**Acceptance criteria:**
- [ ] `console.warn` in `replaceExecutionModel` miss path
- [ ] try/catch around `messages.transform` body with `console.warn` on error
- [ ] Comment above the hook key warns about the `experimental.` prefix rename risk
- [ ] Existing behavior (inject-once logic, bootstrap content) preserved
- [ ] Committed

---

## Teammate C: Housekeeping + bump-version.sh

Owns Phase 6 (independent from A/B except C2 depends on A1 + A2).

### Task C1: Sync marketplace.json version

**Files:**
- Modify: `.claude-plugin/marketplace.json`

**What to build:** Bump the embedded plugin version from `0.7.4` to `0.8.0` so it matches `.claude-plugin/plugin.json` and `package.json`.

**Approach:**
- Single field edit: `plugins[0].version` from `"0.7.4"` to `"0.8.0"`
- Verify alignment with `.claude-plugin/plugin.json:version` before committing

**Acceptance criteria:**
- [ ] `plugins[0].version` matches `.claude-plugin/plugin.json:version`
- [ ] JSON still valid
- [ ] Committed

### Task C2: Port bump-version.sh + .version-bump.json

**Depends on:** A1 (needs `.cursor-plugin/plugin.json` to exist) and A2 (needs `gemini-extension.json`). Dispatch only after those two report DONE.

**Files:**
- Create: `scripts/bump-version.sh`
- Create: `.version-bump.json`

**What to build:** Port superpowers' bump-version.sh + config-driven manifest list, adapted to razorback's five version-bearing files.

**Approach:**
- Copy `/Users/murphy/source/superpowers/scripts/bump-version.sh` verbatim (it reads `.version-bump.json` and is project-agnostic); `chmod +x`
- Create `.version-bump.json` with razorback's files:
  ```json
  {
    "files": [
      { "path": "package.json", "field": "version" },
      { "path": ".claude-plugin/plugin.json", "field": "version" },
      { "path": ".cursor-plugin/plugin.json", "field": "version" },
      { "path": ".claude-plugin/marketplace.json", "field": "plugins.0.version" },
      { "path": "gemini-extension.json", "field": "version" }
    ],
    "audit": {
      "exclude": [
        "RELEASE-NOTES.md",
        "node_modules",
        ".git",
        ".version-bump.json",
        "scripts/bump-version.sh"
      ]
    }
  }
  ```
  (Razorback has no CHANGELOG.md to exclude; everything else matches superpowers.)
- Test: `./scripts/bump-version.sh --check` should report all five files at the current version with no drift (assuming C1 already landed). Do not actually bump the version as part of this task — just verify the script works.

**Acceptance criteria:**
- [ ] `scripts/bump-version.sh` executable and identical to superpowers' version
- [ ] `.version-bump.json` lists all five manifests
- [ ] `./scripts/bump-version.sh --check` reports "All declared files are in sync at 0.8.0"
- [ ] Script and config committed

### Task C3: .gitignore += .julie/

**Files:**
- Modify: `.gitignore`

**What to build:** Exclude Julie's local index directory from git.

**Approach:**
- Append `.julie/` to `.gitignore`
- Verify `.julieignore` stays tracked (it configures Julie's indexing and should be committed)

**Acceptance criteria:**
- [ ] `.julie/` listed in `.gitignore`
- [ ] `git status` on a clean tree shows no pending changes related to `.julie/`
- [ ] `.julieignore` still tracked
- [ ] Committed

### Task C4: Harness-agnostic skill paths in writing-skills example

**Files:**
- Modify: `skills/writing-skills/examples/CLAUDE_MD_TESTING.md`

**What to build:** Replace hard-coded `~/.claude/skills/` references with harness-agnostic phrasing so the testing scenarios make sense on any harness.

**Approach:**
- Use `get_symbols` / `grep` to locate all `~/.claude/skills` occurrences (there are ~14 based on earlier grep)
- For each occurrence, decide by context:
  - Inside a scenario that's explicitly about Claude Code workflow: leave it, add an inline note the first time it appears ("example uses Claude Code paths; other harnesses use `~/.agents/skills/` etc.")
  - Inside generic CLAUDE.md variant examples (Variants A/B/C/D): rewrite to say "your skills directory" or "your harness's skill location", since these variants are testing skill *documentation*, not Claude-Code-specific behavior
- Preserve the test protocol, scenarios, and success criteria — only update path references
- Do not change the file's purpose (it's still testing CLAUDE.md documentation variants); this is just a readability pass for non-CC readers

**Acceptance criteria:**
- [ ] No bare `~/.claude/skills` references in Variant examples (A through D)
- [ ] Scenario-level references either kept with a leading context note or generalized
- [ ] Test protocol, success criteria, and expected results sections unchanged
- [ ] Committed

---

## Lead: Docs (Phase 5)

Dispatch after Teammates A/B/C report DONE on all their tasks. Single task, done inline — no teammate needed.

### Task L1: README Installation + CLAUDE.md harness split

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**What to build:** Six-harness install section in README, six-row harness-split table in CLAUDE.md.

**Approach:**

**README.md — Installation section rewrite:**
- Keep the existing Prerequisites section (Julie MCP, multi_agent for Codex)
- Replace the current Installation section with six subsections in this order: Claude Code, Cursor, Codex, OpenCode, Copilot CLI, Gemini CLI
- For each harness, give the one-liner install plus a one-sentence pointer to detailed docs if they exist (`docs/README.<harness>.md` for Codex/OpenCode; inline for the others for now)
- Harness install one-liners:
  - Claude Code: `/plugin marketplace add anortham/razorback` + `/plugin install razorback@razorback` (current wording is fine, preserve)
  - Cursor: "Cursor marketplace submission pending. For now: clone the repo and load via Cursor's `plugin load /path/to/razorback` (or whatever Cursor's local-plugin mechanism is — verify before shipping)." Mark this install path as "manual until marketplace listing."
  - Codex: preserve current wording (fetch-and-follow `.codex/INSTALL.md`)
  - OpenCode: preserve current wording (fetch-and-follow `.opencode/INSTALL.md`)
  - Copilot CLI: `copilot plugin marketplace add anortham/razorback` + `copilot plugin install razorback@razorback`
  - Gemini CLI: `gemini extensions install https://github.com/anortham/razorback`
- Update the Updating section to cover the new harnesses (Copilot CLI: `copilot plugin update razorback`; Gemini: `gemini extensions update razorback`; Cursor: follow marketplace update once submitted, manual git pull for now)

**CLAUDE.md — Harness split table:**
- Replace the current "Harness split:" bullet list under "Project Structure" with a six-row table:

  | Harness | Harness-specific files | Shared files |
  |---------|------------------------|--------------|
  | Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `agents/`, `commands/`, `hooks/hooks.json`, `hooks/session-start`, `hooks/run-hook.cmd` | `skills/`, `CLAUDE.md`, `docs/` |
  | Cursor | `.cursor-plugin/plugin.json`, `hooks/hooks-cursor.json` (reuses `hooks/session-start`) | `skills/`, `agents/`, `commands/`, `CLAUDE.md`, `docs/` |
  | Codex | `.codex/INSTALL.md`, `skills/using-razorback/references/codex-tools.md` | `skills/`, `CLAUDE.md`→`AGENTS.md` symlink, `docs/` |
  | OpenCode | `.opencode/`, `AGENTS.md` symlink, `package.json`, `index.js` | `skills/`, `docs/` |
  | Copilot CLI | `skills/using-razorback/references/copilot-tools.md` (reuses `.claude-plugin/` manifests) | all of Claude Code's |
  | Gemini CLI | `gemini-extension.json`, `GEMINI.md`, `skills/using-razorback/references/gemini-tools.md` | `skills/`, `AGENTS.md` |

- Update the "Per-harness bootstrap mechanics" subsection to describe all six bootstrap paths (Claude Code = SessionStart hook, Cursor = SessionStart hook with `additional_context`, Codex = native skill discovery, OpenCode = plugin messages.transform, Copilot CLI = SessionStart hook with `additionalContext`, Gemini CLI = `GEMINI.md` `@./` includes)

**AGENTS.md is a symlink to CLAUDE.md — auto-tracks. No direct edit.**

**Acceptance criteria:**
- [ ] README Installation has six subsections, each with a working one-liner (or explicit "manual until marketplace" note for Cursor)
- [ ] README Updating covers all six harnesses
- [ ] CLAUDE.md harness-split is a six-row table
- [ ] CLAUDE.md bootstrap-mechanics section covers all six harnesses
- [ ] `AGENTS.md` symlink still points to CLAUDE.md
- [ ] Committed

---

## Final verification (lead, after L1)

Run these checks before handing off to `razorback:finishing-a-development-branch`:

1. **Manifest validity:** `jq . .claude-plugin/plugin.json .claude-plugin/marketplace.json .cursor-plugin/plugin.json gemini-extension.json package.json` — all parse cleanly.
2. **Version sync:** `./scripts/bump-version.sh --check` — reports all five at `0.8.0` with no drift.
3. **Audit:** `./scripts/bump-version.sh --audit` — no undeclared files contain the version string.
4. **Skill body integrity:** `grep -n "razorback:code-reviewer" skills/` — matches appear only in `requesting-code-review/SKILL.md` (fallback table) and `using-razorback/references/copilot-tools.md` (agent-type example). Not in `code-quality-reviewer-prompt.md` as a dispatch directive.
5. **Bootstrap content:** on Claude Code, a fresh session shows the `<SUBAGENT-STOP>` and "Instruction Priority" blocks in the injected bootstrap.
6. **Integration:** full repo loads as a plugin on Claude Code without error (existing smoke test).

---

## Self-review notes

- **Julie directives embedded per task** where file location isn't obvious from the task text (A5, B1, B2, B4, C4). Tasks with exact paths (A1-A4, B3, C1-C3) don't need orientation steps.
- **No placeholders** in the plan: every file path is concrete, every content decision is made, every acceptance criterion is testable.
- **Dependencies explicit:** A5 after A1-A4; B1 after A5; C2 after A1+A2; L1 after everything.
- **File ownership clean:** A edits `skills/using-razorback/`; B edits `skills/requesting-code-review/`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `hooks/run-hook.cmd`, `.opencode/plugins/razorback.js`; C edits `.claude-plugin/marketplace.json`, `scripts/`, `.version-bump.json`, `.gitignore`, `skills/writing-skills/examples/`. No overlap.
- **L1's Cursor install one-liner is provisional** — the plan notes the implementer should verify Cursor's local-plugin load mechanism before finalizing the wording. This is the only spot where the plan asks the implementer to verify rather than execute a decided path.
