# Audit Remediation and Harness Descope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Drop Gemini CLI support entirely, demote Copilot CLI to instruction-tier, and remediate the 2026-07-16 skills audit findings (verified drift bugs, Miller canon gaps, cross-skill duplication, hot-path token waste).

**Architecture:** Content-and-config change set over the existing plugin layout. Four serialized phases: (1) harness descope shrinks the surface, (2) correctness fixes to the now-smaller canon, (3) dedup/trim of skill content, (4) Miller-usage insertions. Duplication policy: content loaded together in one run gets deduped to a canonical file + reference; content loaded in *alternative* paths (e.g. executing-plans vs subagent-driven-development) keeps its copy but gains a byte-compare guard test, matching the existing `check-rule-copies.mjs` pattern.

**Tech Stack:** Markdown skills, bash hooks, Node test runner (`node --test`), existing guard scripts (`scripts/check-rule-copies.mjs`, `scripts/bump-version.sh`).

**Architecture Quality:** No new modules or interfaces. Shape change: plugin loses two harness adapters (Gemini deleted, Copilot reduced to an instruction-tier rules copy). Main risk: hook JSON emission and rule-copy sync regressions — mitigated by the guard suite and a JSON-validity check on hook output. Workers report plan mismatches instead of redesigning.

## Global Constraints

- Supported harnesses after this plan: **Claude Code and Codex/ChatGPT and OpenCode (plugin-tier), Copilot CLI (instruction-tier only), Cursor (frozen — existing support left exactly as-is, deferred)**.
- **Never modify:** `.cursor-plugin/`, `hooks/hooks-cursor.json`, `skills/cursor-agent/`, `.cursor/rules/` (except automatic propagation by `check-rule-copies.mjs`). Cursor work is explicitly deferred by the user.
- Keep the two intentional, test-guarded duplications: instruction-tier ruleset host copies; architecture-quality checklist across skills.
- Do not change process flows, anti-rationalization tables, two-pass inline review, Miller-first exploration, single-repo marketplace layout, or autonomous-by-default execution (CLAUDE.md "What Not to Change") — except where this plan explicitly amends the harness list.
- All skill cross-references use the `razorback:` prefix; never `@` file links.
- Version stays `0.22.0` — no version bump in this plan (release is a separate action).
- The `codex` desktop app is now branded "ChatGPT (desktop app)" — use "Codex CLI / ChatGPT desktop app" wherever harness naming is updated.
- Razorback pins no Codex/Claude/Gemini model names by design ("inherit the current default"); do not introduce any model pins.
- Miller canonical signatures (post-Task 4): `search(query, mode=auto|text|symbol|file|markers|content|source|external|web|all-text)`, `inspect(target, depth=summary|overview|full)`, `trace(target)`, `impact(target)`, `edit(operation, target)`, `patterns(...)`, `content(...)`, `workspace(...)`, `context(query)`.
- Dispatched-subagent prompt files keep their inline Miller sections — they are the floor on Codex/OpenCode, which have no SubagentStart hook. Do not trim them.

## Verification Strategy

**Project source of truth:** `CLAUDE.md` (Tests section), `package.json` scripts, `.github/workflows/test.yml`.

**Worker red/green scope:** `npm test` (full guard suite, ~2s) plus the task-specific grep/JSON assertions named in each task's acceptance criteria.

**Worker ceiling:** `npm test` + `node scripts/check-rule-copies.mjs` + `./scripts/bump-version.sh --check`. Workers run nothing broader.

**Worker gate invariant:** `npm test` green proves no guard regression (rule-copy sync, manifest versions, structural invariants). Task-specific greps prove the removal/insertion the task claims.

**Lead affected-change scope:** after each batch: `npm test && node scripts/check-rule-copies.mjs && ./scripts/bump-version.sh --check`, plus `bash hooks/session-start | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` with `CLAUDE_PLUGIN_ROOT` set when hooks changed.

**Branch gate:** `npm test` + `./scripts/bump-version.sh --audit` + repo-wide residual grep: `grep -ri 'gemini\|copilot' --include='*.md' --include='*.json' --include='*.js' skills/ hooks/ agents/ .claude-plugin/ .codex-plugin/` returns only allowlisted remnants (Task 3 defines the allowlist).

**Replay/metric evidence:** none — no hard-gate metrics; grep outputs are report-only evidence attached to reports.

**Escalation triggers:** any change to `hooks/session-start`, `hooks/subagent-start`, or `scripts/check-rule-copies.mjs` requires the lead affected-change scope immediately, not batched.

**Assigned verification failure:** Workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate. Tasks 1, 6, and 8 explicitly update/extend tests and guard scripts as part of their scope.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, timestamp. Reuse passing entries for unchanged HEAD.

## Parallel Execution Contract

Batches run in order (A → B → C → D). Within a batch, tasks are safe to dispatch together. Commit mode for all multi-task batches: `parallel-lead-commit`.

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Infra descope | Batch A | Delete: `gemini-extension.json`, `GEMINI.md`. Modify: `hooks/session-start`, `.version-bump.json`, `scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`, any test referencing gemini manifests. Create: `.github/copilot-instructions.md` | No | None - safe parallel batch. |
| Task 2: Reviewer/delegation descope | Batch A | Delete: `skills/gemini-cli/`, `skills/using-razorback/references/gemini-tools.md`, `skills/using-razorback/references/copilot-tools.md`, `skills/pre-merge-review/reviewer-prompts/gemini.md`. Modify: `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/writing-plans/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/finishing-a-development-branch/morning-report-template.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/brainstorming/visual-companion.md`, `skills/codex-cli/SKILL.md` (gemini/copilot mentions only), `skills/claude-cli/SKILL.md` (gemini/copilot mentions only) | No | None - safe parallel batch. |
| Task 3: Execution-skill descope | Batch A | Modify: `skills/using-razorback/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/requesting-code-review/SKILL.md`, `CLAUDE.md`, `README.md`. Create: `docs/adding-a-harness.md` | No | None - safe parallel batch. |
| Task 4: Miller canon fix | Batch B | Modify: `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md` (toolchain table region only), host copies via sync (`.clinerules/`, `.cursor/rules/`, `.kiro/steering/`, `.windsurf/rules/`, `.github/copilot-instructions.md`) | Yes | Batch B runs after Batch A: Task 1 adds the new Copilot host copy this task must sync; Task 3 edits other regions of `using-razorback/SKILL.md`. |
| Task 5: Drift-bug fixes | Batch B | Modify: `skills/finishing-a-development-branch/SKILL.md`, `skills/writing-plans/SKILL.md:77-82` region, `skills/subagent-driven-development/implementer-prompt.md`, `skills/harvesting-debt/SKILL.md` | Yes | Batch B runs after Batch A: Tasks 2–3 edit `writing-plans` and SDD files first. |
| Task 6: CI + hygiene | Batch B | Modify: `.github/workflows/test.yml`, `scripts/bump-version.sh`, `.gitignore`. Delete: `skills/.DS_Store`, `skills/brainstorming/.DS_Store` (untrack) | Yes | Batch B runs after Batch A: Task 1 changes `.version-bump.json` manifest list that the tag gate reads. |
| Task 7: CLI-skill dedup | Batch C | Modify: `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`. Create: `skills/codex-cli/adversarial-prompt.txt`, `skills/using-razorback/references/review-targeting.md`. Delete: none (`skills/claude-cli/adversarial-prompt.txt` stays canonical) | Yes | Batch C runs after Batch B: Task 2 purged gemini content from these files first. |
| Task 8: SDD/executing-plans slim + twin guard | Batch C | Modify: `skills/subagent-driven-development/SKILL.md` (incl. frontmatter description), `skills/executing-plans/SKILL.md` (incl. frontmatter description). Create: `tests/twin-sections.test.mjs` | Yes | Batch C runs after Batch B: Tasks 3 and 5 edit these files first. |
| Task 9: Hot-path trim + harness-filtered injection | Batch C | Modify: `skills/using-razorback/SKILL.md` (body outside the synced toolchain region, incl. frontmatter description), `hooks/session-start`. Create/extend: `tests/session-start.test.mjs` (or extend existing hook test) | Yes | Batch C runs after Batch B: Task 4 finalizes the synced table region this task must not touch. |
| Task 10: writing-skills trim + description fixes | Batch C | Modify: `skills/writing-skills/SKILL.md`, `skills/writing-skills/anthropic-best-practices.md`, frontmatter descriptions only of `skills/using-git-worktrees/SKILL.md`, `skills/receiving-code-review/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/requesting-code-review/SKILL.md` | No | None - safe parallel batch (Batch C). |
| Task 11: Remaining internal dedup | Batch C | Modify: `skills/systematic-debugging/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/writing-plans/SKILL.md` (template sections), `skills/brainstorming/SKILL.md` (incl. frontmatter description) | Yes | Batch C runs after Batch B: Task 5 edits `writing-plans` first. |
| Task 12: Miller insertions — investigation skills | Batch D | Modify: `skills/fixing-small-issues/SKILL.md`, `skills/verification-before-completion/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md` | Yes | Batch D runs after Batch C: Task 11 restructures `systematic-debugging` first. |
| Task 13: Miller insertions — review surfaces + mapping parity | Batch D | Modify: `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/brainstorming/spec-document-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md` (review steps region), `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `agents/code-reviewer.md`, `skills/receiving-code-review/SKILL.md`, `skills/test-driven-development/SKILL.md`, `skills/using-razorback/references/codex-tools.md` | Yes | Batch D runs after Batch C: Tasks 8–10 restructure SDD/requesting-code-review/receiving-code-review first. |

---

## Batch A — Harness descope

### Task 1: Infra descope (Gemini out, Copilot to instruction-tier)

**Files:**
- Delete: `gemini-extension.json`, `GEMINI.md`
- Modify: `hooks/session-start`, `.version-bump.json`, `scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`, any other test asserting six manifests or gemini paths (search `tests/` for `gemini-extension`)
- Create: `.github/copilot-instructions.md`
- Test: `npm test`

**Interfaces:**
- Consumes: current `.version-bump.json` file list (6 manifests); `check-rule-copies.mjs` host-copy list; `hooks/session-start` platform branches (`CURSOR_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` + `COPILOT_CLI` / else).
- Produces: 5-manifest version set (`package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.claude-plugin/marketplace.json`); `.github/copilot-instructions.md` as a new synced host copy of the instruction-tier ruleset; a `session-start` with no `COPILOT_CLI` special-case (Tasks 4 and 9 depend on both).

**Contract inputs:** Instruction-tier canonical body lives in `skills/using-razorback/references/instruction-tier.md`; `check-rule-copies.mjs` is the sync mechanism and `tests/rule-copies.test.mjs` the guard.

**File ownership:** Delete: `gemini-extension.json`, `GEMINI.md`. Modify: `hooks/session-start`, `.version-bump.json`, `scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`, any test referencing gemini manifests. Create: `.github/copilot-instructions.md`

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Remove the two Gemini bootstrap artifacts and Gemini's version-manifest entry. Demote Copilot CLI: delete its env-var special-case from `hooks/session-start` (the `else` branch already emits SDK-standard top-level `additionalContext`; keep it as the unknown-platform fallback and update the comment), and give Copilot users the instruction-tier floor via `.github/copilot-instructions.md` (Copilot reads this path natively), registered as a new host copy in `check-rule-copies.mjs`.

**Approach:** Mirror how the existing four host copies are declared in `check-rule-copies.mjs` (inspect the script's copy list with Miller before editing). Run the script once to generate the new copy, then `npm test`. In `hooks/session-start`, the resulting branch logic is: `CURSOR_PLUGIN_ROOT` → snake_case; `CLAUDE_PLUGIN_ROOT` → nested `hookSpecificOutput`; else → SDK-standard top-level (comment: "unknown platform fallback").

**Acceptance criteria:**
- [x] `gemini-extension.json` and `GEMINI.md` deleted; `grep -r 'gemini-extension\|GEMINI.md' --include='*.json' --include='*.mjs' --include='*.sh' . --exclude-dir=node_modules --exclude-dir=docs --exclude-dir=.memories --exclude-dir=.claude` → no hits
- [x] `./scripts/bump-version.sh --check` passes with 5 manifests
- [x] `.github/copilot-instructions.md` exists, byte-synced by `check-rule-copies.mjs`, guarded by `tests/rule-copies.test.mjs`
- [x] `COPILOT_CLI` no longer referenced in `hooks/session-start`; `CLAUDE_PLUGIN_ROOT=x bash hooks/session-start` emits valid JSON with `hookSpecificOutput`
- [x] Tests pass and the change is handed to the lead per commit mode

### Task 2: Reviewer/delegation descope (Gemini skill + reviewer role out, Copilot tools file out)

**Files:**
- Delete: `skills/gemini-cli/` (whole dir), `skills/using-razorback/references/gemini-tools.md`, `skills/using-razorback/references/copilot-tools.md`, `skills/pre-merge-review/reviewer-prompts/gemini.md`
- Modify: `skills/pre-merge-review/SKILL.md`, `skills/pre-merge-review/fix-dispatch-prompt.md`, `skills/writing-plans/SKILL.md` (reviewer-choice enumerations), `skills/cross-model-convergence/SKILL.md`, `skills/finishing-a-development-branch/morning-report-template.md`, `skills/grounding-in-current-docs/SKILL.md`, `skills/brainstorming/visual-companion.md`, `skills/codex-cli/SKILL.md`, `skills/claude-cli/SKILL.md`
- Test: `npm test`

**Interfaces:**
- Consumes: current reviewer-choice contract `none | codex | gemini | claude` (pre-merge-review, writing-plans Execution Handoff, SDD Step 4a).
- Produces: reviewer-choice contract **`none | codex | claude`** — every later task and skill must use this enumeration.

**Contract inputs:** The Gemini CLI product is retired (user decision 2026-07-16); both the host support AND the `gemini` reviewer/delegation role are dropped. Cursor files are out of bounds.

**File ownership:** as listed in the contract table row for Task 2.

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Remove Gemini as a reviewer option and as a delegation target, and remove the Copilot tool-mapping file. In each modified skill, remove gemini rows/paragraphs/enumeration entries and Copilot harness rows; do not restructure anything else (dedup comes in Batch C).

**Approach:** `grep -n -i 'gemini\|copilot' <file>` per owned file; remove or rewrite each hit minimally. In `cross-model-convergence`, Gemini disappears as an example pairing — the skill's model-agnostic protocol stays. Where "second opinion" lists name models, the remaining set is codex/claude/cursor-agent (cursor-agent skill itself is untouched).

**Acceptance criteria:**
- [x] `skills/gemini-cli/`, `gemini-tools.md`, `copilot-tools.md`, `reviewer-prompts/gemini.md` deleted
- [x] `grep -ri 'gemini' skills/pre-merge-review skills/writing-plans skills/cross-model-convergence skills/finishing-a-development-branch skills/grounding-in-current-docs skills/brainstorming skills/codex-cli skills/claude-cli` → no hits
- [x] Reviewer choice reads `none | codex | claude` everywhere in owned files
- [x] Tests pass and the change is handed to the lead per commit mode

### Task 3: Execution-skill descope + docs

**Files:**
- Modify: `skills/using-razorback/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/requesting-code-review/SKILL.md`, `CLAUDE.md`, `README.md`
- Create: `docs/adding-a-harness.md`
- Test: `npm test`

**Interfaces:**
- Consumes: current 6-harness tables/paragraphs in each owned file.
- Produces: 4-harness surface — Claude Code, Codex CLI / ChatGPT desktop app, OpenCode, Cursor (frozen) — plus a one-line Copilot instruction-tier note where harness support is enumerated. `docs/adding-a-harness.md` checklist (Tasks 9+ and future harness work consume it).

**Contract inputs:** Reviewer-choice contract from Task 2 (`none | codex | claude`). Do not touch `using-razorback`'s toolchain table region (synced; Task 4 owns it) — harness paragraphs and Platform Adaptation bullets only. Do not touch `.cursor-plugin/` or cursor hook files.

**File ownership:** as listed in the contract table row for Task 3.

**Serialization required:** No

**Dependency reason:** None - safe parallel batch.

**What to build:** Remove Gemini rows/paragraphs and demote Copilot mentions across the execution skills; update `CLAUDE.md` (harness-split table, Execution Model, What Not to Change marketplace line, project structure listing) and `README.md` to the 4+1 harness story with "Codex CLI / ChatGPT desktop app" naming. Write `docs/adding-a-harness.md`: a checklist of every file a new harness touches (manifest, marketplace entry, version-bump list, session-start branch, tools reference, using-razorback access paragraph, dispatch-mechanism rows in SDD/dispatching-parallel-agents, CLAUDE.md table, tests), plus the tier vocabulary (plugin-tier / skill-tier / instruction-tier) and the adapter rule ("keep adapters thin; point hosts at existing skills/ and hooks/ files").

**Approach:** Grep-driven minimal edits as in Task 2. In SDD, delete the Gemini bullet from Dispatch mechanism, Parallel Dispatch, and follow-up-behavior lists; leave the Claude Code / Codex / OpenCode / Copilot text otherwise intact except Copilot rows, which are removed (Copilot is no longer a dispatch-documented harness).

**Acceptance criteria:**
- [x] `grep -ri 'gemini' skills/using-razorback skills/subagent-driven-development skills/dispatching-parallel-agents skills/executing-plans skills/requesting-code-review CLAUDE.md README.md` → no hits
- [x] Copilot appears in owned files only as an instruction-tier mention (CLAUDE.md/README) — no dispatch rows, no hook claims, no access-instructions paragraph
- [x] `docs/adding-a-harness.md` exists with the file checklist and tier vocabulary
- [x] Residual-grep allowlist for the branch gate is recorded in the task report (expected remnants: `docs/plans/`, `.memories/`, `skills/cursor-agent/` if any)
- [x] Tests pass and the change is handed to the lead per commit mode

---

## Batch B — Correctness + canon

### Task 4: Fix the Miller canonical table (synced source)

**Files:**
- Modify: `skills/using-razorback/references/instruction-tier.md`, `skills/using-razorback/references/subagent-toolchain.md`, `skills/using-razorback/SKILL.md` (toolchain table region), host copies regenerated via `node scripts/check-rule-copies.mjs`
- Test: `npm test`

**Interfaces:**
- Consumes: live Miller MCP schema (verified 2026-07-16): `search` modes `auto|text|symbol|file|markers|content|source|external|web|all-text`; `inspect` depths `summary|overview|full`; tools `patterns`, `content` exist.
- Produces: corrected canonical signatures (Global Constraints block above) that Tasks 12–13 and all future skills cite.

**Contract inputs:** Sync mechanism from Task 1 (now includes `.github/copilot-instructions.md`).

**File ownership:** as listed in the contract table row for Task 4.

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A: Task 1 adds the new Copilot host copy this task must sync; Task 3 edits other regions of `using-razorback/SKILL.md`.

**What to build:** Update the capability table in all three source files: (a) full `search` mode list with one-phrase guidance — `markers` for TODO/FIXME/marker audits, `source` for source-body text, `content` for docs/prose, `external`/`web`/`all-text` listed without elaboration; (b) `inspect` row becomes two rows or one row with depth guidance: `overview` for the first read of a symbol (bounded refs + body preview), `full` when editing it; (c) add `patterns` (pre-extracted routes/config-keys/doc-structure facts) and `content` (import + search large text: logs, CI output) rows. Keep the table compact — one line per capability; this content is hot-path (subagent-toolchain is injected into every Claude Code subagent).

**Approach:** Edit `instruction-tier.md` first (canonical), then mirror in `subagent-toolchain.md` and `using-razorback/SKILL.md`, then run the sync script and verify byte-identity via `npm test`. Net growth of `subagent-toolchain.md` must stay under +60 words (hot-path budget).

**Acceptance criteria:**
- [x] All three sources + all five host copies list the 10 search modes, 3 inspect depths, and 9 tools (adds `patterns`, `content`)
- [x] `node scripts/check-rule-copies.mjs` clean; `npm test` green
- [x] `wc -w skills/using-razorback/references/subagent-toolchain.md` ≤ 347 (287 + 60) — landed at 344
- [x] Tests pass and the change is handed to the lead per commit mode

### Task 5: Verified drift-bug fixes

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md` (Interactive Step 2, currently lines 158–170), `skills/writing-plans/SKILL.md` (Codebase Orientation item 4, currently line ~80), `skills/subagent-driven-development/implementer-prompt.md` (blocker block, currently lines 35–40), `skills/harvesting-debt/SKILL.md` (search invocation, currently line ~34)
- Test: `npm test`

**Interfaces:**
- Consumes: Autonomous Step 2 base-resolution script (`finishing-a-development-branch/SKILL.md:41-60`) as the canonical; blocker taxonomy at `skills/using-razorback/references/blocker-taxonomy.md`; corrected Miller canon from Task 4.
- Produces: one base-resolution script used by both modes; a 5-item blocker block in the implementer prompt matching the taxonomy.

**Contract inputs:** Task 4's canonical signatures (`mode=markers`, `impact(target)`).

**File ownership:** as listed in the contract table row for Task 5.

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A: Tasks 2–3 edit `writing-plans` and SDD files first.

**What to build:** (a) Replace Interactive Step 2's main/master-only script with the Autonomous Step 2 resolution (`$PLAN_BASE` → `origin/HEAD` → main → master), keeping the interactive fallback question for the no-resolution case. (b) `writing-plans` orientation item 4: "**Assess impact:** Miller `impact(target)` — impacted symbols plus likely tests"; keep `trace` as the find-references item. (c) Implementer-prompt blocker block: add the missing 5th item (unresolvable test failures after repeated attempts) and a one-line pointer to the taxonomy file as authoritative. (d) `harvesting-debt`: switch the `razorback:` marker sweep to `search(query='razorback:', mode=markers)` with `mode=text` noted as fallback when markers miss non-comment occurrences.

**Approach:** Inspect each site with Miller (`search(query='<section heading>', mode=content)`) to confirm current line positions post-Batch-A before editing.

**Acceptance criteria:**
- [x] Both finishing-a-development-branch modes resolve `$BASE_BRANCH` identically (diff of the two script blocks differs only in the interactive fallback question)
- [x] `grep -n 'Assess impact' skills/writing-plans/SKILL.md` names `impact`, not `trace`
- [x] Implementer prompt lists 5 blocker items + taxonomy pointer
- [x] ~~`grep -n 'mode=markers' skills/harvesting-debt/SKILL.md` hits~~ **Criterion revised during execution:** live Miller probes proved `mode=markers` is a closed TODO/FIXME/HACK/XXX vocabulary that rejects `razorback:`. Landed `regions=comment` as the primary (verified working), `mode=text` as fallback, plus an inline note that `mode=markers` does not apply — which satisfies this fix's actual intent (comment-scoped marker sweep).
- [x] Tests pass and the change is handed to the lead per commit mode

### Task 6: CI tag gate + repo hygiene

**Files:**
- Modify: `.github/workflows/test.yml`, `scripts/bump-version.sh`, `.gitignore`
- Delete (untrack): `skills/.DS_Store`, `skills/brainstorming/.DS_Store`
- Test: `npm test` + manual `--check` invocations

**Interfaces:**
- Consumes: 5-manifest `.version-bump.json` from Task 1.
- Produces: `bump-version.sh --check` accepts an optional expected-version argument (`--check <version>`), exiting non-zero when the shared version ≠ expected; CI invokes it with the tag on tag builds.

**Contract inputs:** The "all manifests stale together" failure mode: mutual agreement passes while the release moves on. The gate must compare against an external truth (the git tag), not internal agreement.

**File ownership:** as listed in the contract table row for Task 6.

**Serialization required:** Yes

**Dependency reason:** Batch B runs after Batch A: Task 1 changes `.version-bump.json` manifest list that the tag gate reads.

**What to build:** (a) Extend `bump-version.sh --check` to take an optional expected version and fail on mismatch. (b) In `test.yml`, add a step gated on `github.ref_type == 'tag'` that runs `./scripts/bump-version.sh --check "${GITHUB_REF_NAME#v}"`. (c) Add `.DS_Store` to `.gitignore` and `git rm --cached` the two tracked copies.

**Approach:** Follow the existing option-parsing style in `bump-version.sh`. Add a test case to the existing version-script test file if one exercises `--check` (search `tests/` for `bump-version`); extend it with an expected-version mismatch case.

**Acceptance criteria:**
- [x] `./scripts/bump-version.sh --check 0.22.0` exits 0; `--check 9.9.9` exits non-zero with a clear message (mutation-tested)
- [x] `test.yml` runs the tag-equality check on tag refs only — replaced a pre-existing package.json-only jq gate with the strictly-stronger 5-manifest form
- [x] `git ls-files | grep -i ds_store` → empty; `.gitignore` covers `.DS_Store` — **criterion was already true:** audit finding was stale (.DS_Store never tracked in any commit; ignored since before this branch); no untrack action existed to take
- [x] Tests pass and the change is handed to the lead per commit mode

---

## Batch C — Dedup + hot path

### Task 7: CLI-skill dedup (adversarial prompt, schema, review targeting)

**Files:**
- Modify: `skills/claude-cli/SKILL.md`, `skills/codex-cli/SKILL.md`, `skills/pre-merge-review/reviewer-prompts/claude.md`, `skills/pre-merge-review/reviewer-prompts/codex.md`
- Create: `skills/codex-cli/adversarial-prompt.txt`, `skills/using-razorback/references/review-targeting.md`
- Test: `npm test`

**Interfaces:**
- Consumes: existing `skills/claude-cli/adversarial-prompt.txt` (canonical, already correct); `skills/codex-cli/schemas/review-output.schema.json` (canonical schema).
- Produces: `skills/codex-cli/adversarial-prompt.txt` (Codex variant, extracted from `codex-cli/SKILL.md:284-328`); `references/review-targeting.md` (the shared scope-selection + `SHORTSTAT` sizing block); command snippets in all four files that `cat` the canonical files at invocation time (e.g. `--system-prompt-file "$SKILL_DIR/adversarial-prompt.txt"` / `"$(cat .../adversarial-prompt.txt)"`, `--output-schema .../review-output.schema.json`).

**Contract inputs:** Reviewer prompts and CLI skills can be loaded in the same run (pre-merge-review loads a reviewer prompt while the CLI skill may also be loaded) — so this is same-run duplication and must become file references, not guarded copies. Also fold in `claude-cli`'s internal repeats: the `< /dev/null` stdin rule stated once in prose + kept in code blocks; flag list once (keep the Quick Reference table, drop the redundant baseline-flags paragraph).

**File ownership:** as listed in the contract table row for Task 7.

**Serialization required:** Yes

**Dependency reason:** Batch C runs after Batch B: Task 2 purged gemini content from these files first.

**What to build:** Remove all inline copies of the adversarial prompt (claude-cli SKILL.md:308-359, codex-cli SKILL.md:284-328, both reviewer-prompt files) and the inline `SCHEMA_JSON` blobs (claude-cli:247, :304, reviewer-prompts/claude.md), replacing each with the file-reference invocation. Extract Review Targeting to the shared reference; both CLI skills point at it ("load `references/review-targeting.md` from razorback's using-razorback references when selecting scope") and keep only a 2-line summary inline.

**Approach:** The reviewer-prompt files are templates the lead fills — they can instruct "read the canonical prompt file at `<skill-base>/adversarial-prompt.txt` and pass it via `--system-prompt-file`" instead of embedding text. Verify each command still resolves paths from the skill base directory announced at load time. Word-count check after: `claude-cli/SKILL.md` target ≤ 2,600w (from 3,524), `codex-cli/SKILL.md` ≤ 2,700w (from 3,274).

**Acceptance criteria:**
- [x] `grep -c 'OPERATING STANCE' skills/ -r` → exactly 2 hits (the two canonical .txt files)
- [x] Inline `SCHEMA_JSON` blobs gone; all schema references point at `review-output.schema.json` — via `jq -c 'del(."$schema")'`, byte-equal to the old inline string (the plan's suggested `tr -d '\n'` would have shipped the `$schema` key Claude's validator rejects)
- [x] Review Targeting exists once, in `references/review-targeting.md`; both CLI skills reference it
- [x] Word-count targets: codex-cli 2,585 ≤ 2,700 ✓; **claude-cli criterion revised during execution:** ≤2,600 was arithmetically unreachable in scope (zero-replacement floor is 2,833 — the audit's recoverable estimate counted tokens for single-line JSON that `wc -w` scores as 1 word); landed 2,828, all flagged duplication removed. Residual `--bare` rationale ×5 (~100w) noted as optional follow-up.
- [x] Tests pass (all tests exercising Task 7 files green; suite redness is sibling in-flight TDD) and the change is handed to the lead per commit mode

### Task 8: SDD slim + executing-plans twin guard

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md` (body + frontmatter description), `skills/executing-plans/SKILL.md` (frontmatter description only, unless twin alignment requires a body touch)
- Create: `tests/twin-sections.test.mjs`
- Test: `npm test`

**Interfaces:**
- Consumes: current SDD SKILL.md structure (post Batch A/B edits).
- Produces: SDD ≤ 3,400 words (from ~4,700 post-descope); a guard test asserting the Blockers / Recovery / Checkpoints sections of SDD and executing-plans stay semantically locked (normalize whitespace + the one known intentional divergence: SDD's extra Recovery step 5, encoded in the test).

**Contract inputs:** Alternative-load duplication policy (Architecture note): executing-plans and SDD are never loaded together, so their twin sections keep both copies but gain a guard. Fix-routing/staging/iteration-cap rules ARE same-file repeats — dedupe those.

**File ownership:** as listed in the contract table row for Task 8.

**Serialization required:** Yes

**Dependency reason:** Batch C runs after Batch B: Tasks 3 and 5 edit these files first.

**What to build:** In SDD SKILL.md: (a) delete the `## Advantages` section entirely; (b) compress `## Example Workflow` to ≤ 15 lines (one task, one fix round, no invented dialogue); (c) fix-round routing stated once in Step 4 — Red Flags and "If review finds issues" become one-line pointers to Step 4; (d) `parallel-lead-commit` staging rule stated once (Commit Mode Contract) — other sites become one-line pointers; (e) iteration cap stated once (Step 3); (f) dispatch-mechanism list stated once at top — Parallel Dispatch section references it instead of re-enumerating; (g) `## The Process` digraph: delete (the numbered Steps 1–5 carry it; per writing-skills, flowcharts are for non-obvious decisions only — keep the small When-to-Use digraph). Frontmatter descriptions: SDD → `Use when executing an approved implementation plan in the current session and the harness can launch subagents.` (drop the fallback-routing sentence — the body covers routing); executing-plans → `Use when executing a written implementation plan single-agent — separate-session, single-task, or no-delegation runs.` (triggers only).

**Approach:** Make the guard test data-driven like `rule-copies.test.mjs`: a list of `{file, heading}` pairs, extract-section helper, normalized compare. Do NOT restructure executing-plans' body beyond what twin alignment requires — its own copy is load-bearing.

**Acceptance criteria:**
- [ ] `wc -w skills/subagent-driven-development/SKILL.md` ≤ 3,400
- [ ] Fix routing, staging rule, iteration cap, dispatch list each stated exactly once (grep evidence in report)
- [ ] `tests/twin-sections.test.mjs` fails when a twin section is edited on one side only (demonstrated in report via temporary mutation, then reverted)
- [ ] Both frontmatter descriptions contain no workflow/process summary
- [ ] Tests pass and the change is handed to the lead per commit mode

### Task 9: using-razorback hot-path trim + harness-filtered injection

**Files:**
- Modify: `skills/using-razorback/SKILL.md` (body outside the synced toolchain region; frontmatter description), `hooks/session-start`
- Create/extend: `tests/session-start.test.mjs` (create if no hook test exists; search `tests/` first)
- Test: `npm test`

**Interfaces:**
- Consumes: 4-harness access sections from Task 3; final synced table from Task 4.
- Produces: SKILL.md ≤ 950 words (from 1,332); `session-start` that strips other-harness access paragraphs from the injected payload using HTML-comment markers (`<!-- harness:claude-code -->` … `<!-- /harness -->`), keeping the on-disk file complete for native-discovery harnesses (Codex reads SKILL.md raw).

**Contract inputs:** The synced toolchain region is owned by `check-rule-copies.mjs` — body edits must not touch it. Codex/OpenCode never run this hook; their users see the full file, so the file itself must remain self-contained.

**File ownership:** as listed in the contract table row for Task 9.

**Serialization required:** Yes

**Dependency reason:** Batch C runs after Batch B: Task 4 finalizes the synced table region this task must not touch.

**What to build:** Body trim: (a) merge the `<EXTREMELY-IMPORTANT>` block and `## The Rule` into one statement of the 1% rule; (b) delete the `digraph skill_flow` except the one non-obvious branch (EnterPlanMode → brainstormed?) which becomes two prose lines; (c) cut Red Flags rows that restate each other (12 → ~7, keeping one representative per rationalization family); (d) delete `## Project Policy Discovery`; (e) compress `## Skill Types` + `## User Instructions` to one line each; (f) wrap each harness access paragraph in harness markers. Hook: sed-strip non-matching harness blocks when the platform is known (Claude Code / Cursor branches); unknown-platform fallback injects unfiltered. Frontmatter description: triggers only (`Use when starting any conversation, before any response or action including clarifying questions`).

**Approach:** Bash marker-stripping must be a small awk/sed block with a test: feed the current SKILL.md through the filter for each branch and assert (1) valid JSON output, (2) own-harness paragraph present, (3) other-harness paragraphs absent, (4) toolchain table intact. Keep the existing printf-not-heredoc workaround and JSON escaping untouched.

**Acceptance criteria:**
- [ ] `wc -w skills/using-razorback/SKILL.md` ≤ 950; anti-rationalization Red Flags table still present (CLAUDE.md What-Not-to-Change)
- [ ] `CLAUDE_PLUGIN_ROOT=x bash hooks/session-start` output: valid JSON, contains Claude Code access text, contains zero `In Codex`/`In OpenCode`/`In Cursor` paragraphs, contains the full Miller table
- [ ] File on disk still documents all 4 harnesses (for native-discovery readers)
- [ ] Hook test covers both branches + fallback; `npm test` green
- [ ] Tests pass and the change is handed to the lead per commit mode

### Task 10: writing-skills trim + description fixes

**Files:**
- Modify: `skills/writing-skills/SKILL.md`, `skills/writing-skills/anthropic-best-practices.md`, frontmatter description only in: `skills/using-git-worktrees/SKILL.md`, `skills/receiving-code-review/SKILL.md`, `skills/cross-model-convergence/SKILL.md`, `skills/requesting-code-review/SKILL.md`
- Test: `npm test`

**Interfaces:**
- Consumes: writing-skills' own rules (description = triggers only, <500 chars; skills <500w target; one statement per rule).
- Produces: writing-skills SKILL.md ≤ 2,100 words; anthropic-best-practices.md ≤ 4,200 words; four compliant descriptions.

**Contract inputs:** Do not weaken the Iron Law, the rationalization tables, or the RED-GREEN-REFACTOR mapping — consolidation only: each rule stated once in its strongest form.

**File ownership:** as listed in the contract table row for Task 10.

**Serialization required:** No

**Dependency reason:** None - safe parallel batch (Batch C).

**What to build:** SKILL.md: merge the 4 statements of "description = when, not what" into the CSO section; merge the 4 "skills ARE TDD" statements into Overview + one Bottom Line sentence; fix the duplicate `### 4.` numbering; merge `## Directory Structure` with `## File Organization`; merge the 3 anti-rationalization blocks into one table + one STOP rule; delete `## Anti-Patterns` entries that restate earlier sections. anthropic-best-practices.md: delete the `<img srcset>` blob, fix duplicated headings, delete sections fully covered by SKILL.md (keep official-guidance content that SKILL.md lacks; add a one-line "razorback additions live in SKILL.md" pointer). Descriptions (triggers only, ≤ 500 chars): cross-model-convergence (drop the protocol summary), using-git-worktrees (drop the mechanism clause), receiving-code-review (drop the stance clause), requesting-code-review (drop the routing sentence).

**Approach:** For each merged rule, keep the version with the strongest example. Report before/after word counts.

**Acceptance criteria:**
- [ ] Word targets met; no rule appears more than once (spot-grep evidence for the 4 known repeats)
- [ ] All four descriptions ≤ 500 chars, start with "Use when", contain no process/workflow clauses
- [ ] Iron Law, rationalization table, red-flags list, checklist all still present
- [ ] Tests pass and the change is handed to the lead per commit mode

### Task 11: Remaining internal dedup

**Files:**
- Modify: `skills/systematic-debugging/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md`, `skills/writing-plans/SKILL.md`, `skills/brainstorming/SKILL.md` (body + frontmatter description)
- Test: `npm test`

**Interfaces:**
- Consumes: post-Batch-B content of all four files.
- Produces: consolidated single-statement rules; Task 12 consumes the restructured systematic-debugging.

**Contract inputs:** Preserve anti-rationalization content (consolidate, never delete outright). Do not touch writing-plans' Execution Handoff (already updated by Task 2) or Codebase Orientation (Task 5).

**File ownership:** as listed in the contract table row for Task 11.

**Serialization required:** Yes

**Dependency reason:** Batch C runs after Batch B: Task 5 edits `writing-plans` first.

**What to build:** systematic-debugging: merge the three stacked stop-blocks (Red Flags / Signals You're Doing It Wrong / Common Rationalizations) into one table + one STOP rule, dropping duplicate rows. dispatching-parallel-agents: state use/don't-use criteria once (delete the When-NOT-to-Use restatement and the flowchart that mirrors the bullets; keep whichever single form is clearest); merge `## Verification` into the Review step; replace its harness dispatch table with a pointer to SDD's dispatch-mechanism list plus the one fact SDD lacks. writing-plans: collapse the three overlapping task templates to two (full + light) by folding the compact single-task form into the full template as a note; state Global Constraints and Verification Strategy requirements once each (template shows shape, prose states the rule — remove the echo). brainstorming: replace the `## Process Flow` digraph with the numbered process it duplicates (linear pipeline, not a decision); description → triggers only.

**Approach:** For each consolidation, diff-check that no unique rule text was lost (every deleted line's content must exist elsewhere in the file or be a pure restatement — list them in the report).

**Acceptance criteria:**
- [ ] systematic-debugging has exactly one stop-block; dispatching-parallel-agents states don't-use criteria once; writing-plans has two task templates; brainstorming has no linear-pipeline digraph
- [ ] brainstorming description ≤ 500 chars, triggers only
- [ ] No unique rule lost (deletion audit in report)
- [ ] Tests pass and the change is handed to the lead per commit mode

---

## Batch D — Miller insertions + parity

### Task 12: Miller insertions — investigation skills

**Files:**
- Modify: `skills/fixing-small-issues/SKILL.md`, `skills/verification-before-completion/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `skills/systematic-debugging/root-cause-tracing.md`
- Test: `npm test`

**Interfaces:**
- Consumes: Task 4 canonical signatures; Task 11's restructured systematic-debugging.
- Produces: `impact(target)` named at every affected-scope decision point; `content` named for large-output reading.

**Contract inputs:** Capability-first phrasing for lead-facing text, concrete signature where the command matters (CLAUDE.md convention).

**File ownership:** as listed in the contract table row for Task 12.

**Serialization required:** Yes

**Dependency reason:** Batch D runs after Batch C: Task 11 restructures `systematic-debugging` first.

**What to build:** fixing-small-issues: Step 4 opens with "compute the affected scope: Miller `impact(target='<changed symbol>')` returns impacted symbols plus likely tests — run those"; the shared/public-code escalation trigger names `trace`/`impact` as the check. verification-before-completion: add a "How to verify" Miller column/line to the Common Failures rows that are code-verifiable (requirements met → `inspect`; architecture followed → `trace`/`impact`; review finding fixed → `inspect` the fixed symbol); mention `content` for reading long test/build output. systematic-debugging: Phase 4 (implementation) gains "before writing the fix, `impact(target)` the symbol you're changing"; root-cause-tracing.md: reading large test/CI output goes through Miller `content` import instead of piping through grep (keep the grep line as the no-Miller fallback).

**Approach:** Insertions only — no restructuring beyond the sentence being added to.

**Acceptance criteria:**
- [ ] `grep -n 'impact(' skills/fixing-small-issues/SKILL.md skills/systematic-debugging/SKILL.md` → hits at Step 4 and Phase 4 respectively
- [ ] verification-before-completion Common Failures rows carry Miller verification hooks
- [ ] root-cause-tracing names `content` with grep as fallback
- [ ] Tests pass and the change is handed to the lead per commit mode

### Task 13: Miller insertions — review surfaces + mapping parity

**Files:**
- Modify: `skills/writing-plans/plan-document-reviewer-prompt.md`, `skills/brainstorming/spec-document-reviewer-prompt.md`, `skills/subagent-driven-development/SKILL.md` (Step 3 review lists), `skills/subagent-driven-development/spec-reviewer-prompt.md`, `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, `skills/requesting-code-review/SKILL.md`, `skills/requesting-code-review/code-reviewer.md`, `agents/code-reviewer.md`, `skills/receiving-code-review/SKILL.md`, `skills/test-driven-development/SKILL.md`, `skills/using-razorback/references/codex-tools.md`
- Test: `npm test`

**Interfaces:**
- Consumes: Task 4 canonical signatures; Task 8's slimmed SDD Step 3.
- Produces: every review recipe reads `inspect(target, depth=overview)` first / `depth=full` only when editing; both document-reviewer prompts carry an inline Miller directive; `codex-tools.md` covers all 9 Miller tools.

**Contract inputs:** Subagent-facing prompt files name Miller inline (they are the floor on Codex/OpenCode). The 7 bare-word `inspect depth=full` sites normalize to `inspect(target, depth=...)` form.

**File ownership:** as listed in the contract table row for Task 13.

**Serialization required:** Yes

**Dependency reason:** Batch D runs after Batch C: Tasks 8–10 restructure SDD/requesting-code-review/receiving-code-review first.

**What to build:** (a) plan-document-reviewer-prompt: add a "verify buildability with Miller" block — every file path in the plan resolves (`search(query='<path>', mode=file)`), every named symbol exists (`inspect(target='<symbol>', depth=overview)`), APIs the plan invents get flagged; (b) spec-document-reviewer-prompt: same shape for scope/YAGNI checks against code reality; (c) review recipes in the nine remaining files: first symbol read becomes `depth=overview`, escalate to `depth=full` for symbols being edited or centrally at issue; normalize the bare-word signature sites (systematic-debugging and writing-plans sites were handled in Tasks 5/11/12 — verify, don't re-edit); (d) `codex-tools.md`: add `edit`, `workspace`, `patterns`, `content` rows to the Miller enumeration so it matches the canonical table.

**Approach:** Mechanical, grep-driven. Report the full list of normalized sites.

**Acceptance criteria:**
- [ ] `grep -rn 'inspect depth=full' skills/ agents/` → zero bare-word hits
- [ ] Both document-reviewer prompts name Miller tools inline with signatures
- [ ] `depth=overview` appears as the first-read guidance in every owned review recipe
- [ ] `codex-tools.md` enumerates all 9 Miller tools
- [ ] Tests pass and the change is handed to the lead per commit mode

---

## Out of Scope (deferred, not forgotten)

- **All Cursor work** (user decision): `composer-2.5-fast` model pin, `.cursor-plugin/`, `hooks/hooks-cursor.json`, empirical verification of whether Cursor surfaces hook `additional_context` (upstream-bug reports say it may not).
- **AGENTS.md Windows symlink hazard** (checkout as plain file on native Windows breaks Codex/OpenCode bootstrap) — needs a design decision: real file + byte-equality guard vs. `.gitattributes` handling.
- **Exported-TARGETS version-sync refactor** (context-mode pattern) — existing `.version-bump.json` + tests already guard drift; tag gate (Task 6) closes the real hole.
- **OpenCode tools reference file** — mapping is injected by `.opencode/plugins/razorback.js`; auditing that plugin's Miller coverage is a separate task.
- **Full RED-GREEN subagent testing of every edited skill** — right-sized for this mechanical pass to guard tests + lead inline review + deletion audits; the two behavior-riskiest edits (descriptions, using-razorback trim) get lead review against writing-skills rules. Residual risk noted.
- **Version bump / release** — separate action after this branch merges.
