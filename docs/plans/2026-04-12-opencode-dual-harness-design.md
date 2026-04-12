# Razorback Dual-Harness Support: Claude Code + OpenCode

**Date:** 2026-04-12
**Status:** Design approved, ready for implementation plan

## Problem

Razorback is currently shipped as a Claude Code plugin. A stale opencode integration exists at `.opencode/plugins/razorback.js` (v0.5.0) but predates the v0.6.0 Agent Teams work, uses a deprecated opencode hook pattern, and requires users to manually symlink skill directories.

The user runs both Claude Code and opencode with other models and wants razorback to work well in both without two separate repos or a high-friction install flow.

## Goals

- Razorback works in opencode with a one-line install.
- No user-facing symlinks or manual path configuration.
- Opencode users get execution-model guidance that matches opencode's capabilities (subagents, no Agent Teams).
- Claude Code experience is unchanged — no regressions, team-driven remains primary.
- Agents and commands stay Claude-Code-only (opencode has different schemas; scope creep if ported).

## Non-Goals

- Porting `agents/` to opencode's agent frontmatter schema.
- Porting `commands/` to opencode's command system.
- Supporting Cursor, Codex, Gemini, or Copilot CLI (future work if demand appears).
- Runtime harness detection inside skills. Harness-specific guidance lives in the bootstrap, not the skills.

## Architecture

Two parallel entry points, one shared skill library.

```
razorback/
├── skills/                      # Shared. Read by both harnesses.
├── agents/                      # Claude Code only.
├── commands/                    # Claude Code only.
├── hooks/                       # Claude Code only.
│   ├── hooks.json               # SessionStart → session-start script
│   └── session-start            # Injects using-razorback + Claude Code execution model
├── .claude-plugin/
│   └── plugin.json              # Claude Code manifest
├── .opencode/
│   ├── INSTALL.md               # Fetched by user, tells opencode how to install
│   └── plugins/razorback.js     # Opencode plugin: config hook + message transform
├── package.json                 # Root; opencode's auto-`bun install` reads this
├── AGENTS.md → CLAUDE.md        # Symlink so opencode picks up project instructions
├── CLAUDE.md                    # Project instructions (both harnesses)
└── README.md                    # Install docs for both harnesses
```

### Opencode plugin (`.opencode/plugins/razorback.js`)

Ports the current superpowers pattern. Two hooks:

**`config` hook** — registers razorback's `skills/` directory:
```js
config: async (config) => {
  config.skills = config.skills || {};
  config.skills.paths = config.skills.paths || [];
  if (!config.skills.paths.includes(razorbackSkillsDir)) {
    config.skills.paths.push(razorbackSkillsDir);
  }
}
```
This removes the symlink requirement. Opencode's native `skill` tool discovers all razorback skills at startup.

**`experimental.chat.messages.transform` hook** — injects bootstrap on first user message:
- Loads `skills/using-razorback/SKILL.md`, strips frontmatter.
- Appends an opencode-flavored "Execution Model" section (see below).
- Appends the tool-mapping table.
- Wraps in `<EXTREMELY_IMPORTANT>` block.
- Injects as a synthetic text part prepended to the first user message.
- Idempotency guard: skip if `EXTREMELY_IMPORTANT` already present in any part.

Why message transform instead of system transform:
1. System messages get re-sent every turn → token bloat on long sessions.
2. Multiple system messages break Qwen and some other non-Claude models.

### Bootstrap differences by harness

| Section | Claude Code bootstrap | OpenCode bootstrap |
|---|---|---|
| Skill tool reference | `Skill` tool | opencode native `skill` tool |
| TodoWrite | `TodoWrite` | `todowrite` |
| Task subagents | `Task` tool | `@mention` syntax |
| Execution model primary | `team-driven-development` | `subagent-driven-development` |
| Execution model fallback | `executing-plans` | `executing-plans` |
| Ad-hoc parallel | `dispatching-parallel-agents` | `dispatching-parallel-agents` |

The Claude Code bootstrap is the current `using-razorback` skill body, injected by the `session-start` hook.
The opencode bootstrap is the same body, with the "Execution Model" section string-replaced by the JS plugin before injection.

### Execution model in opencode

`subagent-driven-development` is currently marked deprecated in `CLAUDE.md` ("kept for reference only"). For opencode it becomes the primary execution path. Required changes:

1. Remove "DEPRECATED" prefix from the skill's frontmatter description.
2. Audit the skill body and update these specifically:
   - Tool references: ensure Julie tools (`get_context`, `deep_dive`, `fast_refs`, `get_symbols`) are named at the exploration points, not Glob/Read/Grep chains.
   - Review flow: update to inline review by lead (matches team-driven) rather than a separate reviewer subagent.
   - Remove any outdated references to process patterns that have since changed.
3. Update `CLAUDE.md`'s "Execution Model" section:
   - Replace "**Primary:** Agent Teams via `team-driven-development` for plans with 2+ independent tasks" with a harness-split block that names team-driven as Claude Code's primary and subagent-driven as opencode's primary.
   - Remove the "`subagent-driven-development` is deprecated; kept for reference only" line.
4. Keep `team-driven-development` as the Claude Code primary. No changes to its content.

Opencode users running sequential/single tasks still use `executing-plans`. Ad-hoc parallel work still uses `dispatching-parallel-agents`. Same as Claude Code.

### Tool mapping (opencode bootstrap appendix)

Shipped as an appended block in the opencode bootstrap:

```
**Tool Mapping for OpenCode:**
- TodoWrite → todowrite
- Task with subagents → @mention
- Skill tool → opencode native skill tool
- Read/Write/Edit/Bash → native tools
```

### Install UX

Install flow for opencode mirrors superpowers:

1. README tells user: `Tell OpenCode: Fetch and follow instructions from https://raw.githubusercontent.com/anortham/razorback/refs/heads/main/.opencode/INSTALL.md`
2. Opencode agent fetches `.opencode/INSTALL.md` and follows it.
3. `.opencode/INSTALL.md` instructs: add `"plugin": ["razorback@git+https://github.com/anortham/razorback.git"]` to `opencode.json` and restart.
4. On next opencode start: git+https fetches the repo, `bun install` runs against root `package.json`, plugin loads, `config` hook registers skills dir, first user message gets bootstrap injected.

Root `package.json` contents (minimal):
```json
{
  "name": "razorback",
  "version": "0.7.0",
  "private": true,
  "type": "module"
}
```

No runtime dependencies needed — the plugin uses only Node/Bun builtins (`path`, `fs`, `os`, `url`).

### AGENTS.md

Symlink `AGENTS.md → CLAUDE.md`. Opencode reads `AGENTS.md` as project instructions by convention; Claude Code reads `CLAUDE.md`. One source of truth, both harnesses pick it up.

CLAUDE.md body stays harness-agnostic where possible. Where it must call out a harness (e.g., "hooks/ is Claude Code only"), it names the harness explicitly.

## Components to change

| File | Action | Notes |
|---|---|---|
| `.opencode/plugins/razorback.js` | Rewrite | Port superpowers pattern: config hook + message transform |
| `.opencode/INSTALL.md` | Create | One-line install instructions for opencode agent to follow |
| `package.json` | Create | Root-level; enables `bun install` on opencode plugin load |
| `AGENTS.md` | Create | Symlink to `CLAUDE.md` |
| `skills/subagent-driven-development/SKILL.md` | Un-deprecate, refresh | Becomes opencode execution primary |
| `CLAUDE.md` | Update | Document dual-harness split, update execution model section |
| `README.md` | Update | Add OpenCode install section with fetch URL |
| `docs/README.opencode.md` | Rewrite | Match current state (Agent Teams → subagents, revived skill, current tool mapping) |

## Data flow

**Claude Code session start:**
1. User opens Claude Code in razorback-enabled project.
2. `SessionStart` hook runs `hooks/session-start`.
3. Script echoes `using-razorback` skill body (Claude Code flavor) into the session.
4. Claude Code loads project `CLAUDE.md`.
5. Agent sees team-driven as execution primary.

**OpenCode session start:**
1. User opens opencode in a project.
2. Opencode reads `opencode.json`, sees razorback plugin entry.
3. Bun installs razorback repo (cached on subsequent starts).
4. Opencode loads `.opencode/plugins/razorback.js`.
5. Plugin's `config` hook runs: razorback's `skills/` dir added to `config.skills.paths`.
6. Opencode loads `AGENTS.md` (symlink to `CLAUDE.md`) as project instructions.
7. User sends first message.
8. Plugin's `messages.transform` hook fires: bootstrap (opencode flavor) injected as text part on first user message.
9. Model sees subagent-driven as execution primary, tool mapping in bootstrap, all skills discoverable via opencode's native `skill` tool.

## Error handling / edge cases

- **Missing `using-razorback` skill file:** Plugin's `getBootstrapContent()` returns `null`; transform hook short-circuits. Opencode still works, just without the bootstrap. Log a warning.
- **Bootstrap already injected:** Idempotency guard checks for `EXTREMELY_IMPORTANT` in any existing part. Prevents double-injection on hot reload.
- **Plugin loaded in non-opencode runtime:** The file is only loaded by opencode, so this case doesn't arise.
- **User edits `opencode.json` incorrectly:** Opencode logs plugin load failure. INSTALL.md troubleshooting section points at `opencode run --print-logs`.
- **AGENTS.md symlink on Windows:** Git handles symlinks on Windows if `core.symlinks` is true. If users hit issues, fallback is a literal copy of CLAUDE.md content. Document in troubleshooting.

## Testing approach

Manual verification, no automated tests for install flow (superpowers doesn't test this either — too much real-harness dependency).

Verification steps:
1. Fresh opencode install in a scratch project with `"plugin": ["razorback@git+<local path>"]`. Confirm `bun install` runs.
2. Start opencode, ask "Tell me about razorback." Confirm response references razorback and mentions subagent-driven as primary (not team-driven).
3. In opencode, invoke `skill` tool with no args. Confirm razorback skills list.
4. Load `brainstorming` skill in opencode. Confirm skill body loads and references opencode-appropriate tools.
5. Open same project in Claude Code. Confirm SessionStart hook still fires, team-driven is still primary, no regression.
6. Check first user message in opencode actually receives the bootstrap part (via opencode logs or by asking the agent to report what it saw).

## Acceptance criteria

- [ ] Fresh opencode install via one-line `opencode.json` entry makes all razorback skills discoverable via opencode's `skill` tool with no symlinks.
- [ ] First user message in opencode gets the razorback bootstrap injected exactly once per session (idempotency holds).
- [ ] Opencode bootstrap names `subagent-driven-development` as primary execution path.
- [ ] Claude Code bootstrap still names `team-driven-development` as primary (no regression).
- [ ] `AGENTS.md` loads as project context in opencode.
- [ ] `subagent-driven-development` skill is un-deprecated, content refreshed to current razorback conventions.
- [ ] `CLAUDE.md` reflects dual-harness reality in the execution model section.
- [ ] `README.md` has a copy-pasteable OpenCode install instruction line.
- [ ] `.opencode/INSTALL.md` is accurate and tells the agent exactly what to add to `opencode.json`.
- [ ] `docs/README.opencode.md` is current (references Agent Teams → subagents mapping, current tool names).
- [ ] Tool-mapping block in opencode bootstrap uses `todowrite` (not stale `update_plan`).

## Open questions

None remaining. User confirmed Option A (revive `subagent-driven-development` as opencode primary).

## References

- Superpowers' opencode plugin (reference implementation): `~/source/superpowers/.opencode/plugins/superpowers.js`
- Superpowers' INSTALL.md: `~/source/superpowers/.opencode/INSTALL.md`
- Opencode plugin docs: https://opencode.ai/docs/plugins/
- Opencode skills docs: https://opencode.ai/docs/skills/
- Opencode agents docs: https://opencode.ai/docs/agents/ (not used — agents stay Claude Code only)
