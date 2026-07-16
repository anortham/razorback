# Adding a Harness

Razorback supports a small, deliberate set of harnesses. Adding one is a commitment: every file below is a place the new harness can drift, and each supported harness multiplies the surface every later change has to touch. Read the tiers first and pick the cheapest one that delivers the value.

## Tiers

**plugin-tier** — the full product: manifest, bootstrap, skills, agents, delegated execution. The host loads razorback as a plugin and discovers skills natively. Current: Claude Code, Codex CLI / ChatGPT desktop app, OpenCode. Cursor is plugin-tier but **frozen** — documented as-is, no new work.

**skill-tier** — the host discovers `skills/` but has no plugin manifest or hook. Skills load; bootstrap is manual or absent. No current occupants; use when a host has skill discovery but no plugin system.

**instruction-tier** — the host reads a single instructions file and nothing else. It gets the Miller-first ruleset (`skills/using-razorback/references/instruction-tier.md`) as a synced host copy, no skills and no delegation. Current: Copilot CLI (`.github/copilot-instructions.md`), plus `.clinerules/`, `.cursor/rules/`, `.kiro/steering/`, `.windsurf/rules/`.

**Default to instruction-tier.** Promote only when the host can actually run delegated execution and someone will maintain it.

## The Adapter Rule

Keep adapters thin. A harness adapter points its host at the files that already exist — `skills/`, `hooks/session-start`, `agents/` — and it declares nothing that duplicates them. If an adapter needs its own copy of skill content, tool guidance, or the ruleset, that copy must be generated and test-guarded (see `scripts/check-rule-copies.mjs`), never hand-maintained. A harness that cannot be supported by a thin adapter does not get support.

## Checklist: instruction-tier

- [ ] `scripts/check-rule-copies.mjs` — add the host's path + frontmatter normalizer to `COPIES`
- [ ] Run `node scripts/check-rule-copies.mjs` to generate the copy; commit it
- [ ] `tests/rule-copies.test.mjs` — confirm the new copy is covered
- [ ] `CLAUDE.md` — harness-split table row (tier = instruction)
- [ ] `README.md` — install section stating instruction-tier scope (ruleset only)

## Checklist: plugin-tier

Everything in the instruction-tier list is *not* required — plugin-tier hosts get the ruleset through `using-razorback`. Instead:

- [ ] **Manifest** — `<host>-plugin/plugin.json` declaring skills, agents, hooks (model on `.claude-plugin/plugin.json`)
- [ ] **Marketplace entry** — if the host has one (`.claude-plugin/marketplace.json` for Claude Code; `.agents/plugins/marketplace.json` for Codex)
- [ ] **Version-bump list** — add the manifest to `.version-bump.json` `files[]`; `tests/version-sync.test.mjs` and `tests/version-audit.test.mjs` enforce it
- [ ] **Bootstrap** — a `hooks/session-start` branch emitting the host's JSON shape, or a host-native injector (OpenCode uses `.opencode/plugins/razorback.js`). Reuse `hooks/session-start`; do not fork it
- [ ] **Hook config** — `hooks/hooks-<host>.json` if the host's schema differs from `hooks/hooks.json`
- [ ] **Tools reference** — `skills/using-razorback/references/<host>-tools.md` mapping Claude Code tool names to the host's, only if the host cannot inject its own mapping
- [ ] **using-razorback access paragraph** — an "In `<host>`:" entry under `## How to Access Skills`, plus a `## Platform Adaptation` bullet if a tools reference exists
- [ ] **Dispatch-mechanism rows** — `skills/subagent-driven-development/SKILL.md` (Dispatch mechanism, Parallel Dispatch, Harness-specific follow-up behavior), `skills/dispatching-parallel-agents/SKILL.md` dispatch table, `skills/requesting-code-review/SKILL.md` Mode 2 table, `skills/subagent-driven-development/fix-prompt.md` resume-vs-fresh-dispatch list
- [ ] **`CLAUDE.md`** — harness-split table row, Project Structure entry, Execution Model bootstrap-mechanics bullet
- [ ] **`README.md`** — Requirements line, Install section, Updating section, After Installation bootstrap list
- [ ] **Tests** — a manifest guard test (model on `tests/codex-plugin-manifest.test.mjs`); a hook test if a `session-start` branch was added (model on `tests/subagent-hook.test.mjs`)
- [ ] **Install doc** — `.<host>/INSTALL.md` if the install path needs more than a one-liner

## Before You Start

Verify the host actually supports what you plan to claim: skill discovery, subagent dispatch, and a bootstrap injection point. A host without subagent dispatch cannot be sold as a `subagent-driven-development` harness — it falls back to `executing-plans`, and the docs must say so. Confirm against the host's live tool list, not its docs.
