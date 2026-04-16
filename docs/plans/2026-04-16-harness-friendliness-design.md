# Harness-Friendliness Pass

**Date:** 2026-04-16
**Status:** Design approved, awaiting implementation plan.

## Context

Razorback diverged from superpowers to add Julie-first exploration and Agent Teams. During that divergence, cross-harness support lagged behind upstream. An audit of the tree surfaced three classes of problem:

1. **Half-wired harness branches.** The SessionStart hook detects Cursor (`CURSOR_PLUGIN_ROOT`) and Copilot CLI (`COPILOT_CLI`), and a `hooks-cursor.json` exists — but neither harness has a manifest, tool-mapping reference, or install documentation. Users who install on those platforms get the bootstrap injected, then hit dead ends when the skill body tells them to "use the Skill tool" without a mapping to their native equivalent.
2. **Broken cross-harness references.** `skills/requesting-code-review/SKILL.md` Mode 2 and `skills/subagent-driven-development/code-quality-reviewer-prompt.md` tell all harnesses to "dispatch the `razorback:code-reviewer` agent." That agent lives in `agents/code-reviewer.md`, which is loaded only by Claude Code. Codex, OpenCode, and Gemini readers hit an unresolvable instruction.
3. **Silent failure modes.** `run-hook.cmd` exits 0 on Windows when no bash is found; the `.opencode/plugins/razorback.js` regex-replace for the Execution Model section falls through silently if the header changes; the `experimental.chat.messages.transform` OpenCode API will rename someday and the plugin will stop injecting with no warning.

Meanwhile, upstream superpowers already solved most of (1) and (2) in v5.0.3–v5.0.7. The cheapest path forward is to port their solutions and fix what both trees still share.

## Goal

Razorback installs and runs cleanly on Claude Code, Cursor, Codex, OpenCode, Copilot CLI, and Gemini CLI. Every skill body that references a platform-specific tool or agent has a documented mapping or fallback. Hook failures are audible, not silent.

## Supported harnesses after this change

| Harness | Install path | Subagent support | Code-reviewer agent |
|---------|--------------|------------------|---------------------|
| Claude Code | `/plugin marketplace add anortham/razorback` | Agent Teams (primary) + Task tool | `razorback:code-reviewer` (direct) |
| Cursor | `/add-plugin razorback` (manual clone for now; marketplace later) | Task tool | via plugin discovery |
| Codex | Clone + symlink into `~/.agents/skills/razorback/` | `spawn_agent` w/ `multi_agent = true` | inline prompt (no plugin agent discovery) |
| OpenCode | `git+https://…#<tag>` in `opencode.json` | Task tool | inline prompt |
| Copilot CLI | `copilot plugin marketplace add anortham/razorback` | `task` tool (+ async bash, `sql` todos) | via plugin marketplace discovery |
| Gemini CLI | `gemini extensions install https://github.com/anortham/razorback` | None — falls back to `executing-plans` | inline review only |

## Out of scope

- Cursor marketplace submission (separate ops task, deferred).
- Codex marketplace sync script (superpowers' `sync-to-codex-plugin.sh`). Codex users keep the symlink install.
- Windows Git Bash replacement. Bash is still required on Windows; this pass only improves the error surface when bash is missing.

## Design by phase

Phases are ordered by dependency. Within a phase, tasks are independent and can be dispatched in parallel.

### Phase 1 — Harness manifests and tool references

All-new files, no existing file edits. Safe to dispatch in parallel.

**`/.cursor-plugin/plugin.json`** — Cursor plugin manifest. Model: superpowers `.cursor-plugin/plugin.json`. Declares `skills: ./skills/`, `agents: ./agents/`, `commands: ./commands/`, `hooks: ./hooks/hooks-cursor.json`. Name/version/author populated from `.claude-plugin/plugin.json`.

**`/gemini-extension.json`** — Gemini extension manifest. Three fields: `name`, `description`, `version`, `contextFileName: GEMINI.md`.

**`/GEMINI.md`** — Two-line file with `@./skills/using-razorback/SKILL.md` and `@./skills/using-razorback/references/gemini-tools.md`. Gemini's `@./` syntax expands includes into context at session start.

**`/skills/using-razorback/references/copilot-tools.md`** — Port superpowers' `copilot-tools.md`. Adjust:
- Replace `superpowers` → `razorback` in named-agent example.
- Add a "Julie on Copilot CLI" note: Julie MCP works via Copilot CLI's MCP support; the same `get_context` / `deep_dive` / `fast_refs` / `get_symbols` directives apply.

**`/skills/using-razorback/references/gemini-tools.md`** — Port superpowers' `gemini-tools.md`. Adjust:
- Add a "Julie on Gemini CLI" note: Julie MCP is supported; tool names unchanged.
- Reinforce the no-subagent fallback: `subagent-driven-development` and `dispatching-parallel-agents` route to `executing-plans` under Gemini.

Acceptance: clone the repo into each of the six harnesses' expected location; each harness loads the manifest without error and surfaces `using-razorback`.

### Phase 2 — `using-razorback/SKILL.md` updates

Single-file edit. Sequence after Phase 1 so the new reference files exist to link to.

Changes:

1. **Add `<SUBAGENT-STOP>` block** at the top of the body (above the existing `<EXTREMELY-IMPORTANT>` block):
   ```
   <SUBAGENT-STOP>
   If you were dispatched as a subagent to execute a specific task, skip this skill.
   </SUBAGENT-STOP>
   ```
   Rationale: Claude Code's SessionStart hook fires in subagent sessions too, and OpenCode's `messages.transform` runs on every user message including those inside subagents. Without this block, each dispatched subagent re-reads the full bootstrap before touching its task, wasting tokens and sometimes confusing the task-delegation framing.

2. **Add "Instruction Priority" section** (ported from superpowers v5.0.7):
   ```
   ## Instruction Priority

   Razorback skills override default system prompt behavior, but **user instructions always take precedence**:

   1. **User's explicit instructions** (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) — highest priority
   2. **Razorback skills** — override default system behavior where they conflict
   3. **Default system prompt** — lowest priority

   If CLAUDE.md, GEMINI.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.
   ```
   Place between the `<EXTREMELY-IMPORTANT>` block and "How to Access Skills."

3. **Extend "How to Access Skills"** with three new rows:
   - **Cursor:** Use the `Skill` tool (same as Claude Code — Cursor's skill system is a superset).
   - **Copilot CLI:** Use the `skill` tool (lowercase). Skills auto-discovered from installed plugins.
   - **Gemini CLI:** Skills activate via `activate_skill`. Gemini loads metadata at session start and activates the full content on demand.

4. **Extend "Platform Adaptation"** section to list all four non-CC tool mapping references:
   - Codex: `references/codex-tools.md`
   - Copilot CLI: `references/copilot-tools.md`
   - Gemini CLI: `references/gemini-tools.md` (loaded automatically via GEMINI.md)
   - OpenCode: injected automatically by the razorback plugin bootstrap

Acceptance: on each supported harness, a fresh session surfaces `using-razorback`, and following the "How to Access Skills" path reaches a valid next tool.

### Phase 3 — Fix `razorback:code-reviewer` cross-harness gap

Two files touched, both edits.

**`skills/requesting-code-review/SKILL.md` Mode 2** — Replace the bare "dispatch the `razorback:code-reviewer` agent" directive with a per-harness fallback table:

| Harness | How to invoke the code reviewer |
|---------|--------------------------------|
| Claude Code | `Agent(subagent_type="razorback:code-reviewer", prompt=<filled template>)` |
| Cursor | same as Claude Code |
| Copilot CLI | `task(agent_type="razorback:code-reviewer", …)` — discovered from installed plugins |
| Codex | `spawn_agent(agent_type="worker", message=<inline the `agents/code-reviewer.md` body + filled template>)` |
| OpenCode | `Task` tool with a general subagent, prompt = `agents/code-reviewer.md` body + filled template |
| Gemini CLI | No subagents — lead does the review inline using the checklist from `code-reviewer.md` |

Codex and OpenCode instructions include an explicit pointer: "The agent's system prompt lives at `agents/code-reviewer.md`. Paste its body into your dispatch message, then append the template placeholders (`{WHAT_WAS_IMPLEMENTED}`, `{BASE_SHA}`, `{HEAD_SHA}`, etc.)."

**`skills/subagent-driven-development/code-quality-reviewer-prompt.md`** — The reference to `Agent tool (razorback:code-reviewer)` is in context of the lead's inline review checklist (not a dispatch). Update to say the lead applies these criteria directly; reference `agents/code-reviewer.md` as the canonical checklist rather than as an agent to dispatch.

Acceptance: a Codex or OpenCode user following `requesting-code-review` Mode 2 can complete a standalone review without hitting an unresolvable instruction.

### Phase 4 — Hook and plugin hardening

Two files touched.

**`hooks/run-hook.cmd`** — In the no-bash-found branch on Windows, replace `exit /b 0` with a stderr warning then exit 0:
```cmd
echo razorback: no bash found on Windows — SessionStart bootstrap disabled.>&2
echo Install Git for Windows ^(https://git-scm.com^) to enable.>&2
exit /b 0
```
Exit code stays 0 so the plugin remains functional; only the bootstrap is disabled. The warning surfaces in Claude Code's hook output so users know why the "You have razorback" announcement is missing.

**`.opencode/plugins/razorback.js`**:

1. In `replaceExecutionModel()`, when the regex misses, emit `console.warn('razorback: Execution Model section not found in using-razorback — OpenCode variant not substituted. Check skill body for header drift.')` instead of silently returning the unchanged body.
2. Wrap the `'experimental.chat.messages.transform'` registration in a try/catch so that if OpenCode renames or removes the hook, the plugin logs the failure and the config hook (skills path registration) still fires.

Acceptance: a deliberate header rename in `using-razorback/SKILL.md` produces a visible `console.warn`; a missing-bash Windows machine shows a clear stderr line in Claude Code's hook log.

### Phase 5 — README and project-instruction refresh

Three files touched.

**`README.md`** — Rewrite the Installation section with six harness subsections. Each subsection: one-liner install, pointer to `docs/README.<harness>.md` if it exists (Codex, OpenCode already have these; Cursor/Copilot/Gemini get short paragraphs inline for now). Keep the Julie prerequisite call-out in the Prerequisites section.

**`CLAUDE.md`** — Update the "Harness split" section to a table with six rows. Add rows for:
- Cursor: `.cursor-plugin/` is Cursor-specific; `hooks/hooks-cursor.json` is Cursor-specific; everything else shared.
- Copilot CLI: reuses Claude Code's `.claude-plugin/` + marketplace.json; adds `skills/using-razorback/references/copilot-tools.md`.
- Gemini CLI: `gemini-extension.json` + `GEMINI.md` + `skills/using-razorback/references/gemini-tools.md`.

**`AGENTS.md`** — Symlink to CLAUDE.md, auto-updates. No direct edit.

Acceptance: a new user reading README can install on any of the six harnesses without leaving the README.

### Phase 6 — Housekeeping

Four small fixes.

1. **Version sync.** `.claude-plugin/marketplace.json` currently shows `0.7.4`; `.claude-plugin/plugin.json` and `package.json` show `0.8.0`. Update marketplace.json to match.
2. **Port `scripts/bump-version.sh` from superpowers.** Adapted to update all version-bearing files in one pass: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`. Usage: `./scripts/bump-version.sh <new-version>`. Keeps future version bumps drift-free.
3. **`.gitignore` += `.julie/`**. The Julie index directory should be local-only. Keep `.julieignore` committed (it tells Julie what to skip).
4. **Clean stale `~/.claude/skills` references** in `skills/writing-skills/examples/CLAUDE_MD_TESTING.md`. Replace hard-coded Claude Code paths with the harness-agnostic phrasing: "your harness's skill directory (e.g., `~/.claude/skills`, `~/.agents/skills/`)."

Acceptance: `git status` on a fresh clone shows no untracked `.julie/`; `./scripts/bump-version.sh 0.8.1` updates all five manifests and prints a summary.

## Risks and open questions

- **Copilot CLI marketplace compatibility with single-repo layout.** Superpowers uses a separate marketplace repo (`obra/superpowers-marketplace`) containing only `marketplace.json`. Razorback uses a single-repo layout where `anortham/razorback` contains both plugin content and the marketplace listing. Claude Code handles single-repo marketplaces; Copilot CLI *should* read the same format but this is not tested. If it rejects the layout, Phase 6 gains a seventh task: add a separate marketplace repo or document the workaround.
- **Gemini `@./` include behavior.** Gemini's extension spec says `contextFileName` is included at session start. Verifying that the `@./` expansion recurses (so the bootstrap + tool mapping both load) is a quick install-and-test step during implementation, not a design-time decision.
- **Cursor SessionStart hook CWD.** `hooks-cursor.json` uses `./hooks/session-start` (relative). Cursor's hook runner is assumed to CWD to the plugin root. Superpowers has the same layout shipping in production, so this is low-risk, but the Phase 1 Cursor manifest should verify the hook fires.

## Execution model

Dependency graph:

- **Phase 1** (manifests, reference files) — no dependencies.
- **Phase 2** (using-razorback body updates) — depends on Phase 1 (references must exist to link to).
- **Phase 3** (code-reviewer fallback) — no hard dependency on Phase 1/2, but lands cleanest after Phase 2 so the `using-razorback` platform-adaptation section is already in its final shape.
- **Phase 4** (hook + plugin hardening) — independent of all others.
- **Phase 5** (README + CLAUDE.md) — depends on everything else (docs describe the final state).
- **Phase 6** — mixed:
  - 6.1 (version sync), 6.3 (`.gitignore`), 6.4 (stale path cleanup) — independent.
  - 6.2 (bump-version.sh port) — depends on Phase 1 because the script enumerates `.cursor-plugin/plugin.json` and `gemini-extension.json`.

Plan execution via `razorback:team-driven-development` on Claude Code:
- Teammate A: Phase 1 (manifests + reference files). Then Phase 2 (using-razorback body) after Phase 1 lands.
- Teammate B: Phase 4 (hook + plugin hardening) in parallel with A. Phase 3 (code-reviewer fallback) after Phase 2 lands.
- Teammate C: Phase 6.1, 6.3, 6.4 (independent housekeeping) in parallel with A and B. Phase 6.2 (bump-version.sh) after Phase 1 lands.
- Lead does Phase 5 (docs) after A/B/C report DONE on all prior phases.

## Acceptance criteria summary

- [ ] `.cursor-plugin/plugin.json`, `gemini-extension.json`, `GEMINI.md` present and valid.
- [ ] `copilot-tools.md` and `gemini-tools.md` present in `skills/using-razorback/references/`.
- [ ] `using-razorback/SKILL.md` contains `<SUBAGENT-STOP>` block, "Instruction Priority" section, and platform instructions for all six harnesses.
- [ ] `requesting-code-review/SKILL.md` Mode 2 documents per-harness code-reviewer invocation.
- [ ] `code-quality-reviewer-prompt.md` no longer implies a dispatched agent.
- [ ] `run-hook.cmd` emits a stderr warning when bash is missing on Windows.
- [ ] `.opencode/plugins/razorback.js` logs when the Execution Model replace misses and guards the experimental hook registration.
- [ ] README Installation covers all six harnesses with working install one-liners.
- [ ] CLAUDE.md harness split is a six-row table.
- [ ] `marketplace.json` version matches `plugin.json` (`0.8.0` or whatever the next bump produces).
- [ ] `scripts/bump-version.sh` updates all five version-bearing files.
- [ ] `.gitignore` excludes `.julie/`.
- [ ] `skills/writing-skills/examples/CLAUDE_MD_TESTING.md` uses harness-agnostic paths.
