# Razorback — Project Instructions

Razorback is a skill set for Claude Code, Codex CLI / ChatGPT desktop app, and OpenCode that diverged from [Superpowers](https://github.com/obra/superpowers). It matches process to each task: clear, ordinary work proceeds directly in the current agent, and planning or delegation is used when a task benefits from it. code-kb MCP is an optional retrieval aid; Goldfish MCP is optional memory. A written plan runs through `executing-plans`, or through `subagent-driven-development` when its tasks are independent or benefit from a separate context.

## External model policy
Allowed providers: anthropic, openai, xai, google
Reviewer choices permitted: codex, claude

**Harness tiers.** Plugin-tier hosts (Claude Code, Codex CLI / ChatGPT desktop app, OpenCode) get a manifest, bootstrap, and full skill set. Cursor is **frozen** — its existing plugin support is documented as-is and receives no new work. Copilot CLI is **instruction-tier**: it gets the instruction-tier ruleset via `.github/copilot-instructions.md` and nothing else. See `docs/adding-a-harness.md` for the tier vocabulary and the per-tier file checklist.

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
hooks/subagent-start               — SubagentStart script injecting the toolchain ruleset into subagents (Claude Code)
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
docs/site/                          — GitHub Pages landing site (deployed by .github/workflows/pages.yml; tests/site-content.test.mjs fails when a skill is added or removed without updating it)
docs/plans/                         — Historical design and implementation plans
docs/specs/                         — Design specifications
```

## Harness split

| Harness | Tier | Harness-specific files | Bootstrap mechanism |
|---------|------|------------------------|---------------------|
| Claude Code | plugin | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `agents/`, `hooks/hooks.json`, `hooks/session-start`, `hooks/subagent-start`, `hooks/run-hook.cmd` | `SessionStart` hook injects `using-razorback` as `hookSpecificOutput.additionalContext`; `SubagentStart` hook injects the toolchain ruleset into dispatched subagents |
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
- `hooks/subagent-start` (Claude Code only) injects the compact toolchain ruleset (evidence rules, optional code-kb) into every dispatched subagent — subagents skip `using-razorback` by design, so this hook is what gives them the toolchain floor.

### Tests
- `npm test` runs the guard suite in `tests/*.test.mjs` (also run by CI via `.github/workflows/test.yml`).
- `scripts/check-rule-copies.mjs` (exercised by `tests/rule-copies.test.mjs`) keeps the instruction-tier ruleset byte-identical across its host copies (`.clinerules/`, `.cursor/rules/`, `.kiro/steering/`, `.windsurf/rules/`, `.github/copilot-instructions.md`, `using-razorback` SKILL.md, `subagent-toolchain.md`).
- The architecture-quality checklist duplication across skills is intentional and test-guarded — do not dedupe it.

## code-kb MCP Integration Pattern

Razorback treats code-kb as an optional retrieval aid. Agents use the retrieval method that supplies sufficient current evidence; native search and file reads are always allowed, and a missing or stale index never blocks work. Skills reference code-kb by **capability** first, and then by the concrete code-kb tool name. Legacy predecessor tool names should appear only as migration/compatibility notes, not as the default workflow.

When modifying skills, name code-kb at exploration/investigation points where it helps, by capability:

| Capability | code-kb tool |
|---|---|
| Orient — directory layout & architecture outline | `codebase_outline(path?, depth?)` |
| List a file's symbols before reading it in full | `file_skeleton(file_path)` |
| Exact / Prefix symbol lookup | `lookup_symbol(query, path?)` |
| Concept / BM25 search over docstrings & signatures | `search_symbols(query, path?)` |
| Inspect a symbol — full implementation body | `get_symbol_body(symbol_name, file_path?)` |
| Surgical context slice — body + callee signatures + types + tests | `get_symbol_context(symbol_name, file_path?)` |
| Find references before changing a public API (callers/callees) | `find_references(symbol_name, direction="callers"|"callees")` |
| Assess impact / blast radius of a change | `blast_radius(symbol?, file?, depth?)` |
| Structural facts — routes, queries, models, config keys | `find_structural_facts(category?)` |

Use your host's native editing tools to modify files.

code-kb indexes symbols, signatures, docstrings, references, and structural facts across the workspace with zero config (`code-kb scan`). CLI 1:1 commands: `code-kb lookup <query>` (exact/prefix symbol lookup) and `code-kb context <symbol>` (symbol context before edits). CLI tool aliases include `code-kb blast-radius` / `code-kb impact` and `code-kb stats` / `code-kb telemetry`.

The evidence rules apply to the lead and every native implementer, reviewer, and fix worker: read the code a change touches, find callers before changing a symbol, and prove API shapes from current source. Restricted external CLI reviewers invoked by `pre-merge-review` run without MCP under an enforced read-only allowlist. The lead supplies a sanitized source-backed evidence bundle, the reviewer reports missing evidence instead of claiming code-kb use, and the lead verifies every finding against current source.

Use evidence-first language in lead-facing skills: "read the code a change touches before editing it" and name code-kb where it helps. In **subagent-facing prompt files** (implementer/fix/reviewer prompts), name the evidence expected inline — e.g. "a file read, or code-kb `get_symbol_context(symbol_name='<symbol>')`" — because dispatched subagents do not receive the using-razorback toolchain table.

## Naming Rules
- All skill cross-references use `razorback:` prefix, never `superpowers:`
- Plugin name in all user-facing text is "razorback" (lowercase)
- SessionStart hook announces "You have razorback."

## Dependencies
- code-kb MCP is **optional** — a retrieval aid for unfamiliar modules, callers, and likely tests. Work completes with native search and file reads when it is missing or stale.
- Goldfish MCP server is **optional** — when available, it holds decision and handoff checkpoints, briefs, and recall. Checkpoints follow its selective policy: a consequential decision, a surprising failure, or unfinished work that needs a handoff. A warranted checkpoint is written before its commit and staged with it. Without Goldfish, the plan, the ledger, and git state carry recovery.

## Execution Model

**Default path:** the current agent does one coherent task directly: no plan file, worker, or task report. Process scales with uncertainty, consequence, and coordination, not with file or line counts. Clear work proceeds; unclear requirements get a question; consequential choices get the user's agreement unless the request already settled them.

**Delegated path:** when a plan has independent tasks, or tasks whose separate context has a clear benefit, and delegation is available and permitted, all plugin-tier harnesses (Claude Code, Codex CLI / ChatGPT desktop app, OpenCode, and frozen Cursor) use `subagent-driven-development`. The lead dispatches fresh implementer subagents, parallel when tasks are independent, with inline review by the lead.

**Shared across all plugin-tier harnesses:**
- **A written plan the current agent runs** (dependent tasks, no delegation, or single-agent selected): `executing-plans`
- **A plan file** only for a handoff, a multi-session effort, or a coordination boundary: `writing-plans`. Plans describe outcomes, constraints, ownership, and checks, not prewritten code.
- **Ad-hoc parallel:** `dispatching-parallel-agents` (independent agent dispatch outside plans)
- **Small, local, reversible fixes:** `fixing-small-issues` (quick-fix tier: objective triage criteria, fix on current checkout, affected-scope verification; no worktree, no baseline suite run; returns to brainstorming triage when the fix outgrows the criteria)
- The agent reviews its completed changes (spec compliance + code quality) — no separate reviewer subagents

**Per-harness bootstrap mechanics:**
- **Claude Code:** `hooks/session-start` reads `skills/using-razorback/SKILL.md` verbatim and injects it via the SessionStart hook.
- **Cursor:** same `hooks/session-start` script; platform detection keys on `CURSOR_PLUGIN_ROOT` and emits `additional_context` (snake_case).
- **Codex CLI / ChatGPT desktop app:** the preferred install path is the Codex plugin defined by `.codex-plugin/plugin.json` and exposed through `.agents/plugins/marketplace.json`; local clone plus `~/.agents/skills/razorback/` symlink remains the development fallback. Native skill discovery loads the installed skills at startup. Users see the raw SKILL.md content; one coherent task runs directly, delegated plan runs use `subagent-driven-development` when the session can spawn workers, and `executing-plans` otherwise. Tool-name mapping lives in `skills/using-razorback/references/codex-tools.md`.
- **OpenCode:** `.opencode/plugins/razorback.js` registers the skills directory and injects the bootstrap on the first user message (via `experimental.chat.messages.transform`). The plugin injects the shared bootstrap verbatim and adds OpenCode tool mapping.
- **Copilot CLI (instruction-tier):** no bootstrap. Copilot reads `.github/copilot-instructions.md` natively, which carries the instruction-tier ruleset and nothing more.

### Autonomy

Once a plan is approved, or the user's request already authorized the work, razorback's execution skills run to completion without inter-task or inter-phase user confirmation. Stops are governed by the blocker taxonomy at `skills/using-razorback/references/blocker-taxonomy.md` (5 real-blocker categories; everything else is decide-and-note). A blocker is real only when the agent cannot resolve it through reasonable plan-consistent judgment. Optional pre-merge external review via `razorback:pre-merge-review` runs between "tests green" and `razorback:finishing-a-development-branch`; the reviewer is chosen per-plan at approval time (codex, claude, or none). The final stop is always PR creation; merge is a separate human or agent action after PR review. See `docs/plans/2026-04-18-autonomous-execution-design.md` for the full rationale.

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
- Proportionate process: clear work proceeds directly; brainstorm, plan, and delegation are used when uncertainty, consequence, or coordination calls for them
- Outcome checks: root-cause investigation, test-first changes, review of completed changes, and truthful completion claims backed by fresh verification
- Anti-rationalization tables in skills (their rows guard both directions: ceremony for clear work, and silent consequential choices)
- Two-pass review of completed changes (spec compliance + code quality, done by the lead or current agent, not separate agents)
- Evidence-first exploration: the smallest sufficient evidence source, with code-kb optional and native search always allowed
- Safeguards: explicit file ownership for parallel edits, source-control hygiene, secret scanning, and approval before push, publish, or release
- Single-repo marketplace layout (Claude Code reads `.claude-plugin/marketplace.json` from this repo; Codex reads `.agents/plugins/marketplace.json`)
- Autonomous-by-default execution (blocker-gated, not task-gated) with optional pre-merge external review
- These conventions are intentionally chosen for token efficiency and quality. `docs/plans/2026-09-24-workflow-comparison.md` records the comparison that tests the proportionate defaults against `v0.44.4`.
