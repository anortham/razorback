# Ponytail Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Adopt four packaging and skill-design patterns from the ponytail repo (studied 2026-07-11 at `~/source/ponytail`): CI enforcement of tests and version sync, automatic Miller-rule injection into subagents, an instruction-tier ruleset for editors without plugin support, and a greppable shortcut-debt marker convention.

**Architecture:** All four tasks are additive and independent. No existing skill process flows change. The instruction-tier ruleset is a new compact distillation (not a copy of `using-razorback`, which assumes the Skill tool); a drift-check script with canary invariants keeps its host copies aligned, mirroring ponytail's `check-rule-copies.js`. The subagent hook reuses the existing `run-hook.cmd` → extensionless-bash pattern.

**Tech Stack:** Bash (hooks), GitHub Actions, Node `node --test` (existing `tests/*.test.mjs` convention), Markdown skills.

**Architecture Quality:** No Architecture Impact — additive files plus small edits to two skills and one manifest; no module boundaries change.

**Plan type:** Light plan — intended for subagent-driven execution in a follow-up session after approval.

## Global Constraints

- Plugin name in all user-facing text is "razorback" (lowercase); skill cross-references use the `razorback:` prefix.
- Hook scripts are extensionless bash files invoked through `hooks/run-hook.cmd` (polyglot cmd/bash wrapper). Do not introduce Node-based hooks in this plan.
- Do not modify anything in CLAUDE.md's "What Not to Change" list (process flows, anti-rationalization tables, two-pass inline review, Miller-first exploration, single-repo marketplace layout, autonomous-by-default execution).
- The instruction-tier ruleset must work WITHOUT the Skill tool: Miller-first exploration rules plus core discipline only. It must not instruct hosts to invoke skills they cannot load.
- The shortcut-debt comment marker is `razorback:` followed by ceiling and upgrade trigger, e.g. `# razorback: global lock, per-account locks if throughput matters`. Debt scans must exclude `skills/`, `docs/`, `commands/`, `agents/`, `.memories/`, and `node_modules/` so skill cross-references (`razorback:<skill-name>`) never pollute the ledger.
- Version stays 0.20.2; this plan ships no release.

## Verification Strategy

**Project source of truth:** CLAUDE.md (repo root) + existing `tests/*.test.mjs` conventions; version tooling documented in CLAUDE.md § Version management.

**Worker red/green scope:** `node --test tests/<task-specific>.test.mjs` for the test file(s) the task owns.

**Worker ceiling:** `node --test tests/*.test.mjs`. Workers do not run `bump-version.sh --audit` or any release tooling.

**Worker gate invariant:** Each task's new/edited test file fails before the change and passes after; no pre-existing test regresses.

**Lead affected-change scope:** `node --test tests/*.test.mjs` after each accepted task.

**Branch gate:** `node --test tests/*.test.mjs && ./scripts/bump-version.sh --audit` (audit proves no new undeclared version references; new files in `docs/plans/` are already audit-excluded).

**Replay/metric evidence:** None — all gates are hard test gates.

**Escalation triggers:** Any change to `hooks/session-start` shared code paths (Task 2 must NOT touch it; if a worker finds it must, stop and report a plan mismatch). CI workflow (Task 1) cannot be fully verified locally — verify YAML with `node -e` JSON/YAML parse or `actionlint` if available, and state in the report that the live run happens on first push.

**Assigned verification failure:** Workers stop and report when assigned verification fails.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp per task.

## Parallel Execution Contract

Commit mode: `parallel-lead-commit` for Batch A (workers hand verified diffs to the lead; lead stages and commits after inline review).

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: CI workflow + test script | Batch A | Create: `.github/workflows/test.yml`, `tests/ci-workflow.test.mjs`. Modify: `package.json` (add `scripts.test` only) | No | None - safe parallel batch. |
| Task 2: SubagentStart Miller-injection hook | Batch A | Create: `hooks/subagent-start`, `skills/using-razorback/references/subagent-toolchain.md`, `tests/subagent-hook.test.mjs`. Modify: `hooks/hooks.json` | No | None - safe parallel batch. |
| Task 3: Instruction-tier ruleset + drift check | Batch A | Create: `skills/using-razorback/references/instruction-tier.md`, `.cursor/rules/razorback.mdc`, `.windsurf/rules/razorback.md`, `.clinerules/razorback.md`, `.kiro/steering/razorback.md`, `scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`. Modify: `docs/README pointers only if a README section exists (none today — skip)` | No | None - safe parallel batch. |
| Task 4: Shortcut-debt marker + harvest skill | Batch A | Create: `skills/harvesting-debt/SKILL.md`, `tests/debt-marker.test.mjs`. Modify: `skills/fixing-small-issues/SKILL.md` | No | None - safe parallel batch. |

File-ownership note: Tasks 1–4 all create separate `tests/*.test.mjs` files and never edit the same file. `package.json` is touched only by Task 1; `hooks/hooks.json` only by Task 2.

---

### Task 1: CI workflow + package test script

**Files:**
- Create: `.github/workflows/test.yml`
- Create: `tests/ci-workflow.test.mjs`
- Modify: `package.json` (add `"scripts": { "test": "node --test tests/*.test.mjs" }`)

**Interfaces:**
- Consumes: existing `tests/*.test.mjs` files (all currently pass); `scripts/bump-version.sh --check` / `--audit` exit codes (0 = clean).
- Produces: `npm test` as the canonical local + CI test entrypoint; CI green/red status on push, PR, and version tags.

**Contract inputs:** Version manifests listed in `.version-bump.json`; current version 0.20.2; razorback has no npm dependencies (no `npm ci` needed — plain checkout suffices).

**File ownership:** Create: `.github/workflows/test.yml`, `tests/ci-workflow.test.mjs`. Modify: `package.json` (add `scripts.test` only)

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** A GitHub Actions workflow that runs the full test suite and the version audit on every push to main, every PR, and every `v*` tag. On tag runs, additionally assert the tag equals the shared manifest version — this closes ponytail's "all manifests stale together" failure mode (their issue #260), which mutual-agreement checks like `bump-version.sh --check` cannot catch.

**Approach:**
- Workflow: checkout → setup-node 22 → `npm test` → `./scripts/bump-version.sh --audit` → tag-gate step guarded by `if: github.ref_type == 'tag'` comparing `jq -r .version package.json` against `${GITHUB_REF_NAME#v}` and exiting 1 on mismatch.
- Triggers: `push: {branches: [main], tags: ['v*']}` and `pull_request`.
- `tests/ci-workflow.test.mjs` asserts (following the existing content-assertion style of `version-sync.test.mjs`): the workflow file exists, runs `npm test`, runs `bump-version.sh --audit`, and contains the tag-version comparison; and `package.json` has the `test` script.
- Mirror ponytail's `.github/workflows/test.yml` shape but strip the Python/MCP steps razorback doesn't need.

**Acceptance criteria:**
- [x] `npm test` runs all existing tests and passes locally.
- [x] Workflow contains push/PR/tag triggers, audit step, and tag-version gate.
- [x] `node --test tests/ci-workflow.test.mjs` fails before the workflow exists and passes after.
- [x] Worker-scope verification passes and the change is handed to the lead per commit mode.

### Task 2: SubagentStart Miller-injection hook (Claude Code)

**Files:**
- Create: `hooks/subagent-start`
- Create: `skills/using-razorback/references/subagent-toolchain.md`
- Create: `tests/subagent-hook.test.mjs`
- Modify: `hooks/hooks.json`

**Interfaces:**
- Consumes: `hooks/run-hook.cmd <script-name>` dispatch convention (Task 2 verifies run-hook.cmd forwards its argument to the named extensionless script — read it with Miller before writing; if it hardcodes `session-start`, extend it to pass through the script name and cover that in the test).
- Produces: every Claude Code subagent receives the compact Miller toolchain rules as `SubagentStart` context, removing the need for dispatch prompts to restate Miller usage from scratch (prompt files may still name task-specific symbols).

**Contract inputs:** Claude Code `SubagentStart` hook contract: stdout JSON `{"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": "..."}}` (raw stdout is dropped for this event — verified in ponytail's `hooks/ponytail-runtime.js`). `hooks/hooks.json` currently has only a `SessionStart` entry; `SubagentStart` entries take no `matcher`.

**File ownership:** Create: `hooks/subagent-start`, `skills/using-razorback/references/subagent-toolchain.md`, `tests/subagent-hook.test.mjs`. Modify: `hooks/hooks.json`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** A `SubagentStart` hook that injects a compact (~30-line) Miller-first ruleset into every dispatched subagent. Today, subagent prompts must name Miller inline because subagents never see the `using-razorback` toolchain table (CLAUDE.md § Miller MCP Integration Pattern); this makes the floor automatic.

**Approach:**
- `subagent-toolchain.md`: the Miller capability table + the 6 exploration rules from `using-razorback`, plus the worktree-state-reporting requirement for subagents (path, branch, commit, dirty state), and nothing else. No skill-invocation instructions — subagents skip `using-razorback` by design (`<SUBAGENT-STOP>`).
- `hooks/subagent-start`: bash, same JSON-escaping pattern as `hooks/session-start` (reuse the `escape_for_json` approach; do not source or modify `session-start`). Emits only the Claude Code `hookSpecificOutput` shape — this hook is registered only in `hooks/hooks.json` (Claude Code); `hooks-cursor.json` is untouched.
- `hooks/hooks.json`: add a `SubagentStart` block alongside `SessionStart`, command `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" subagent-start`.
- `tests/subagent-hook.test.mjs`: execute `hooks/subagent-start` with `CLAUDE_PLUGIN_ROOT` set, parse stdout as JSON, assert `hookSpecificOutput.hookEventName === "SubagentStart"` and that `additionalContext` contains "Miller" and the inspect-before-modify rule; assert `hooks.json` registers the event.
- Deliberately skipped (note in report): ponytail-style matcher env var (`PONYTAIL_SUBAGENT_MATCHER`) to filter agent types — add later if read-only Explore agents prove noisy. `# razorback: injects into all subagents, add agent-type matcher if Explore-agent noise shows up.`

**Acceptance criteria:**
- [ ] Running `CLAUDE_PLUGIN_ROOT=$PWD hooks/subagent-start` emits valid JSON in the SubagentStart `hookSpecificOutput` shape containing the Miller rules.
- [ ] `hooks/hooks.json` remains valid JSON and registers both SessionStart and SubagentStart.
- [ ] `node --test tests/subagent-hook.test.mjs` passes; no existing test regresses.
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode.

### Task 3: Instruction-tier ruleset + drift check

**Files:**
- Create: `skills/using-razorback/references/instruction-tier.md` (canonical)
- Create: `.cursor/rules/razorback.mdc`, `.windsurf/rules/razorback.md`, `.clinerules/razorback.md`, `.kiro/steering/razorback.md` (copies)
- Create: `scripts/check-rule-copies.mjs`
- Create: `tests/rule-copies.test.mjs`

**Interfaces:**
- Consumes: rule content distilled from `skills/using-razorback/SKILL.md` (Miller table + exploration rules) — read the current wording with Miller `search(mode=content)` before distilling; do not paraphrase the six exploration rules, carry them verbatim.
- Produces: a copy-into-your-project ruleset for hosts razorback has no plugin for (Cursor-rules-only setups, Windsurf, Cline, Kiro); `scripts/check-rule-copies.mjs` as the drift gate CI runs via `npm test` (the test file wraps it).

**Contract inputs:** Ponytail's two-layer pattern (`~/source/ponytail/scripts/check-rule-copies.js`): (1) byte-compare each copy against the canonical after stripping host frontmatter, (2) a pinned INVARIANTS list of load-bearing phrases that must appear verbatim in BOTH the canonical file and `skills/using-razorback/SKILL.md`, so a reword in either file trips CI and forces propagation.

**File ownership:** Create: `skills/using-razorback/references/instruction-tier.md`, `.cursor/rules/razorback.mdc`, `.windsurf/rules/razorback.md`, `.clinerules/razorback.md`, `.kiro/steering/razorback.md`, `scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** A ~40-line always-on ruleset for instruction-tier hosts: Miller-first exploration (the capability table + the six rules), inspect-before-modify / trace-before-API-change discipline, and the core process order (understand → plan → test-first → verify before claiming done) stated as rules rather than skill invocations. Plus the drift checker that keeps the four host copies and the canonical aligned.

**Approach:**
- Canonical body must NOT mention the Skill tool, skill names, or `razorback:` skill references — instruction-tier hosts can't load them.
- `.cursor/rules/razorback.mdc` gets Cursor's `alwaysApply: true` frontmatter; `.kiro/steering/` gets Kiro frontmatter if its format requires it; the other copies are the bare body. The checker strips frontmatter before comparing (reuse ponytail's `stripFrontmatter` regex approach).
- Suggested initial INVARIANTS (adjust to final wording): "inspect a symbol before modifying it", "find references before changing a public API", "Do not infer or invent API shapes", "verification before claiming complete".
- `tests/rule-copies.test.mjs` spawns `node scripts/check-rule-copies.mjs` and asserts exit 0; also asserts the checker fails (exit 1) when run against a temp-dir fixture with a deliberately drifted copy.
- Add a short "Instruction-tier hosts" row block to CLAUDE.md's harness table? NO — CLAUDE.md edits are lead-discretion after review; worker leaves CLAUDE.md untouched and notes the follow-up in the report.

**Acceptance criteria:**
- [ ] All four copies match the canonical body exactly (post-frontmatter-strip); checker exits 0.
- [ ] Checker exits 1 on a drifted copy and on a missing invariant (covered by fixture test).
- [ ] Canonical contains no Skill-tool or `razorback:<skill>` references.
- [ ] `node --test tests/rule-copies.test.mjs` passes; no existing test regresses.
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode.

### Task 4: Shortcut-debt marker convention + harvest skill

**Files:**
- Create: `skills/harvesting-debt/SKILL.md`
- Create: `tests/debt-marker.test.mjs`
- Modify: `skills/fixing-small-issues/SKILL.md`

**Interfaces:**
- Consumes: the quick-fix tier's existing structure — inspect `skills/fixing-small-issues/SKILL.md` with Miller `search(mode=content)` first and add the marker rule where the fix-execution guidance lives, matching its voice.
- Produces: the `razorback:` ceiling-comment convention (`# razorback: <ceiling>, <upgrade trigger>`) and a `razorback:harvesting-debt` skill that greps target repos for the markers and reports a ledger.

**Contract inputs:** Marker grep from ponytail, adapted: `grep -rnE '(#|//) ?razorback:' .` excluding `node_modules`, `.git`, build output, and (for the razorback repo itself) `skills/`, `docs/`, `commands/`, `agents/`, `.memories/` — the exclusions keep skill cross-references out of the ledger (Global Constraints).

**File ownership:** Create: `skills/harvesting-debt/SKILL.md`, `tests/debt-marker.test.mjs`. Modify: `skills/fixing-small-issues/SKILL.md`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Ponytail's debt-ledger idea for razorback's quick-fix tier: deliberate shortcuts that cut a real corner with a known ceiling get a greppable comment naming the ceiling and the trigger to revisit; a one-shot skill harvests every marker into a ledger and flags markers with no trigger (`no-trigger` tag — those are the ones that rot).

**Approach:**
- `fixing-small-issues` edit is small: one rule in the fix guidance — "If the quick fix cuts a real corner with a known ceiling, mark it: `# razorback: <ceiling>, <upgrade trigger>`" — plus one line in the report format mentioning any markers left. Do not alter the triage criteria or escalation rules (What Not to Change).
- `harvesting-debt/SKILL.md`: frontmatter description with trigger phrases ("what did we defer", "list the shortcuts", "debt ledger", "/harvesting-debt", "razorback debt"); body = scan command, one-row-per-marker output format grouped by file (`<file>:<line>, <what>. ceiling: <limit>. upgrade: <trigger>.`), `no-trigger` flagging, and an explicit one-shot boundary (reports, changes nothing). Model directly on `~/source/ponytail/skills/ponytail-debt/SKILL.md`.
- `tests/debt-marker.test.mjs`: content assertions in the existing style — marker syntax documented in both skills, harvest skill has required frontmatter fields, scan command excludes the razorback-internal directories, one-shot boundary stated.

**Acceptance criteria:**
- [ ] Marker rule present in `fixing-small-issues` without changing its triage criteria.
- [ ] `harvesting-debt` skill exists with valid frontmatter and the exclusion-aware scan.
- [ ] `node --test tests/debt-marker.test.mjs` passes; no existing test regresses.
- [ ] Worker-scope verification passes and the change is handed to the lead per commit mode.

---

## Deferred (out of scope, recorded for later)

- **Node-based hook runtime** (ponytail's `ponytail-runtime.js`): would make hooks unit-testable and truly cross-platform on Windows, but replaces razorback's working polyglot-bash pattern — separate design decision.
- **Mode/intensity levels** with flag-file persistence and statusline badge: no current razorback concept maps cleanly (candidate: review strictness or autonomy level).
- **npm publishing** of the OpenCode plugin (`@anortham/razorback`) to replace checkout-only install.
- **Agentic benchmark harness** (headless sessions scored on resulting `git diff`, with a control arm): would substantiate razorback's token-efficiency claims; largest deferred item, likely its own plan.
- **Subagent-type matcher env var** for Task 2's hook (see Task 2 note).
- **Portability doc** (`docs/agent-portability.md` equivalent) formalizing plugin-tier vs instruction-tier — write after Task 3 lands and the tier split is real.

## Source Material

Studied at `~/source/ponytail` (v4.8.4, 2026-07-11): `skills/ponytail/SKILL.md`, `AGENTS.md`, `docs/agent-portability.md`, `scripts/check-rule-copies.js`, `scripts/check-versions.js`, `hooks/ponytail-runtime.js`, `hooks/claude-codex-hooks.json`, `.opencode/plugins/ponytail.mjs`, `.github/workflows/test.yml`, `benchmarks/results/2026-06-18-agentic.md`. Goldfish checkpoint: `checkpoint_60bda8fd`.
