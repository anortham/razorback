# Razorback — Project Instructions

Razorback is a skill set for Claude Code, Codex CLI / ChatGPT desktop app, and OpenCode that diverged from [Superpowers](https://github.com/obra/superpowers). It uses Miller MCP for token-efficient codebase orientation. Plan execution routes through `subagent-driven-development` on harnesses that support delegation, and through `executing-plans` otherwise.

## External model policy
Allowed providers: anthropic, openai
Reviewer choices permitted: codex, claude

**Harness tiers.** Plugin-tier hosts (Claude Code, Codex CLI / ChatGPT desktop app, OpenCode) get a manifest, bootstrap, and full skill set. Cursor is **frozen** — its existing plugin support is documented as-is and receives no new work. Copilot CLI is **instruction-tier**: it gets the Miller-first ruleset via `.github/copilot-instructions.md` and nothing else. See `docs/adding-a-harness.md` for the tier vocabulary and the per-tier file checklist.

## Project Structure

```
.claude-plugin/plugin.json        — Claude Code plugin manifest
.claude-plugin/marketplace.json   — Marketplace listing (Claude Code reads this)
.codex-plugin/plugin.json         — Codex plugin manifest
.agents/plugins/marketplace.json  — Repo-scoped Codex plugin marketplace entry
.cursor-plugin/plugin.json        — Cursor plugin manifest (frozen harness)
skills/*/SKILL.md                  — Skill definitions (frontmatter + markdown body)
agents/*.md                        — Agent definitions (Claude Code / Cursor)
hooks/hooks.json                   — Claude Code hook configuration (SessionStart + SubagentStart)
hooks/hooks-cursor.json            — Cursor hook configuration (sessionStart, camelCase)
hooks/session-start                — Polyglot bash script injecting using-razorback
hooks/subagent-start               — SubagentStart script injecting the Miller-first ruleset into subagents (Claude Code)
hooks/run-hook.cmd                 — Cross-platform polyglot wrapper (bash/cmd)
.opencode/plugins/razorback.js     — OpenCode plugin (config hook + messages.transform)
.codex/INSTALL.md                  — Codex install instructions
scripts/bump-version.sh            — Version sync across manifests
scripts/check-rule-copies.mjs      — Syncs the instruction-tier ruleset across its host copies
scripts/package-codex-plugin.sh    — Builds the Codex plugin package
.clinerules/, .cursor/rules/, .kiro/steering/, .windsurf/rules/, .github/copilot-instructions.md — Host copies of the instruction-tier ruleset (synced, test-guarded)
tests/*.test.mjs                   — Repo guard tests (`npm test`)
.github/workflows/test.yml         — CI: runs npm test
.version-bump.json                 — Config for bump-version.sh (file list + audit excludes)
index.js                           — OpenCode package entry point (stub)
assets/                            — Plugin icons
docs/adding-a-harness.md            — Tier vocabulary + file checklist for adding a harness
docs/plans/                         — Historical design and implementation plans
docs/specs/                         — Design specifications
```

## Harness split

| Harness | Tier | Harness-specific files | Bootstrap mechanism |
|---------|------|------------------------|---------------------|
| Claude Code | plugin | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `agents/`, `hooks/hooks.json`, `hooks/session-start`, `hooks/subagent-start`, `hooks/run-hook.cmd` | `SessionStart` hook injects `using-razorback` as `hookSpecificOutput.additionalContext`; `SubagentStart` hook injects the Miller-first ruleset into dispatched subagents |
| Codex CLI / ChatGPT desktop app | plugin | `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `.codex/INSTALL.md`, `skills/using-razorback/references/codex-tools.md` | Preferred: install the Codex plugin from the repo-scoped marketplace entry. Fallback: local clone plus `~/.agents/skills/razorback/` symlink. Native skill discovery loads the installed skills at startup. |
| OpenCode | plugin | `.opencode/plugins/razorback.js`, `AGENTS.md` symlink, `package.json`, `index.js` | Plugin's `config` hook registers skills path; `experimental.chat.messages.transform` injects bootstrap into first user message |
| Cursor (frozen) | plugin | `.cursor-plugin/plugin.json`, `hooks/hooks-cursor.json` (reuses `hooks/session-start`) | `sessionStart` hook injects `using-razorback` as `additional_context` (snake_case) |
| Copilot CLI | instruction | `.github/copilot-instructions.md` (a synced host copy of the instruction-tier ruleset) | Copilot reads `.github/copilot-instructions.md` natively — no manifest, no hook, no skill loading |

The ChatGPT desktop app was rebranded from Codex; both share the Codex plugin path above. Cursor is frozen: its support is documented as-is and gets no new work.

**Shared across all plugin-tier harnesses:** `skills/`, `CLAUDE.md` (symlinked as `AGENTS.md`), `docs/`, `scripts/bump-version.sh`, `.version-bump.json`.

## Key Conventions

### Skill Files
- Each skill lives in `skills/<skill-name>/SKILL.md`
- YAML frontmatter: `name` and `description` fields are required
- Body is the skill content — loaded and presented to the AI when invoked
- Skills reference other skills with `razorback:<skill-name>` syntax
- Supporting files (prompts, examples) live alongside SKILL.md in the same directory
- Tool-name mappings for non-Claude-Code harnesses live in `skills/using-razorback/references/codex-tools.md` (OpenCode's mapping is injected by its plugin bootstrap)

### Agent Files
- Live in `agents/<agent-name>.md`
- YAML frontmatter: `name`, `description`, `model` fields
- Body is the system prompt for the agent
- Discoverable as named plugin agents on Claude Code and Cursor. On Codex / OpenCode, agents are dispatched via inline-prompt concatenation (see `skills/requesting-code-review/SKILL.md` Mode 2 for the pattern).

### Hooks
- `hooks.json` defines Claude Code hook triggers (SessionStart + SubagentStart); `hooks-cursor.json` defines Cursor's (camelCase schema).
- Hook scripts are extensionless bash files for cross-platform compatibility.
- `run-hook.cmd` is a polyglot that works as both a cmd.exe batch file and bash script. On Windows without Git Bash, it emits a stderr warning and exits 0 (plugin still loads, bootstrap disabled).
- `hooks/session-start` detects the harness from the `CURSOR_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` env vars and emits the JSON shape that harness expects; unknown platforms fall back to the SDK-standard top-level `additionalContext`.
- `hooks/subagent-start` (Claude Code only) injects the compact Miller-first ruleset into every dispatched subagent — subagents skip `using-razorback` by design, so this hook is what gives them the toolchain floor.

### Tests
- `npm test` runs the guard suite in `tests/*.test.mjs` (also run by CI via `.github/workflows/test.yml`).
- `scripts/check-rule-copies.mjs` (exercised by `tests/rule-copies.test.mjs`) keeps the instruction-tier ruleset byte-identical across its host copies (`.clinerules/`, `.cursor/rules/`, `.kiro/steering/`, `.windsurf/rules/`, `.github/copilot-instructions.md`, `using-razorback` SKILL.md, `subagent-toolchain.md`).
- The architecture-quality checklist duplication across skills is intentional and test-guarded — do not dedupe it.

## Miller MCP Integration Pattern

Razorback works with Miller as its orientation and symbol-awareness layer. Skills reference Miller by **capability** first, and then by the concrete Miller tool name. Legacy predecessor tool names should appear only as migration/compatibility notes, not as the default workflow.

When modifying skills, add tool awareness at exploration/investigation points by capability:

| Capability | Miller tool |
|---|---|
| Search code (text, symbol, file/path, or concept) | `search(query, mode?)` |
| Orient on the codebase | `context(query)` |
| Inspect a symbol before modifying it | `inspect(target, depth=full)` |
| Find references before changing a public API | `trace(target)` |
| List a file's symbols before reading it | `inspect(target)` |
| Assess impact / blast radius | `impact(target)` |
| Manage the workspace index | `workspace(...)` |

Miller's `search` is lexical-first with a `mode=auto|text|symbol|file|content` selector. Use `mode=content` for docs/prose content and `inspect(target, depth=full)` for symbol bodies, callers, and callees.

Miller-first applies to the lead and to every dispatched implementer, reviewer, and fix worker, regardless of harness.

Use directive, capability-first language in lead-facing skills: "inspect a symbol BEFORE modifying it" and name Miller where the command matters. In **subagent-facing prompt files** (implementer/fix/reviewer prompts), name Miller inline — e.g. "inspect the symbol with Miller `inspect(target='<symbol>', depth=full)`" — because dispatched subagents do not receive the using-razorback toolchain table.

## Naming Rules
- All skill cross-references use `razorback:` prefix, never `superpowers:`
- Plugin name in all user-facing text is "razorback" (lowercase)
- SessionStart hook announces "You have razorback."

## Dependencies
- Miller MCP is a **hard requirement** — no fallback to generic tools for codebase exploration
- Goldfish MCP server is a **hard requirement** — used for persistent memory (checkpoints, briefs, recall) and compaction-durable execution during long autonomous runs
- Skills assume both Miller and Goldfish are configured and available

## Execution Model

**Primary execution path:** All plugin-tier harnesses (Claude Code, Codex CLI / ChatGPT desktop app, OpenCode, and frozen Cursor) support `subagent-driven-development`. The lead dispatches fresh implementer subagents per task, parallel when tasks are independent, inline review by lead.

**Shared across all plugin-tier harnesses:**
- **Sequential/single-task:** `executing-plans` (single agent, batch execution)
- **Ad-hoc parallel:** `dispatching-parallel-agents` (independent agent dispatch outside plans)
- **Small, local, reversible fixes:** `fixing-small-issues` (quick-fix tier: objective triage criteria, fix on current checkout, affected-scope verification; no worktree, no baseline suite run; escalates to the standard flow when the fix outgrows the criteria)
- Lead does inline review (spec compliance + code quality) — no separate reviewer subagents

**Per-harness bootstrap mechanics:**
- **Claude Code:** `hooks/session-start` reads `skills/using-razorback/SKILL.md` verbatim and injects it via the SessionStart hook.
- **Cursor:** same `hooks/session-start` script; platform detection keys on `CURSOR_PLUGIN_ROOT` and emits `additional_context` (snake_case).
- **Codex CLI / ChatGPT desktop app:** the preferred install path is the Codex plugin defined by `.codex-plugin/plugin.json` and exposed through `.agents/plugins/marketplace.json`; local clone plus `~/.agents/skills/razorback/` symlink remains the development fallback. Native skill discovery loads the installed skills at startup. Users see the raw SKILL.md content; delegated runs use `subagent-driven-development` when the session can spawn workers, and fall back to `executing-plans` otherwise. Tool-name mapping lives in `skills/using-razorback/references/codex-tools.md`.
- **OpenCode:** `.opencode/plugins/razorback.js` registers the skills directory and injects the bootstrap on the first user message (via `experimental.chat.messages.transform`). The plugin injects the shared bootstrap verbatim and adds OpenCode tool mapping.
- **Copilot CLI (instruction-tier):** no bootstrap. Copilot reads `.github/copilot-instructions.md` natively, which carries the Miller-first ruleset and nothing more.

### Autonomy

Once a plan is approved, razorback's execution skills run to completion without inter-task or inter-phase user confirmation. Stops are governed by the blocker taxonomy at `skills/using-razorback/references/blocker-taxonomy.md` (5 real-blocker categories; everything else is decide-and-note). A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. Optional pre-merge external review via `razorback:pre-merge-review` runs between "tests green" and `razorback:finishing-a-development-branch`; the reviewer is chosen per-plan at approval time (codex, claude, or none). The final stop is always PR creation; merge is a separate human or agent action after PR review. See `docs/plans/2026-04-18-autonomous-execution-design.md` for the full rationale.

## Version management

Razorback now has five version-bearing manifests (`package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`). Keep them in sync with `./scripts/bump-version.sh`:

- `--check` reports current versions and detects drift
- `--check <version>` also requires the agreed version to equal `<version>`; CI passes the git tag on tag builds so manifests that went stale together cannot ship
- `--audit` runs `--check` plus grep-scans the repo for undeclared version references
- `<new-version>` bumps all five in one pass
- `--release [version]` publishes the GitHub release for tag `v<version>` (defaults to the agreed manifest version); `--dry-run` prints the title and notes without publishing, `--notes-file PATH` substitutes hand-written notes

The release step is the last one in the sequence: bump → commit `release: X.Y.Z <summary>` → `git tag -a vX.Y.Z` → `git push --follow-tags` → `--release`. The commit subject becomes the release title and its body becomes the release notes, so write the release commit message as the changelog entry. `--release` verifies the tagged commit's own manifests declare the version, so an older tag can be back-filled safely.

The `.version-bump.json` config drives the script. `.memories/` and `docs/plans/` are excluded from the audit because they freeze the version string at time of writing.

## What Not to Change
- Process flows (brainstorm → plan → TDD → execute → review → finish)
- Anti-rationalization tables in skills
- Two-pass inline review (spec compliance + code quality, done by lead, not separate agents)
- Miller-first exploration (no Glob/Read/Grep chains)
- Single-repo marketplace layout (Claude Code reads `.claude-plugin/marketplace.json` from this repo; Codex reads `.agents/plugins/marketplace.json`)
- Autonomous-by-default execution (blocker-gated, not task-gated) with optional pre-merge external review
- These conventions are intentionally chosen for token efficiency and quality
