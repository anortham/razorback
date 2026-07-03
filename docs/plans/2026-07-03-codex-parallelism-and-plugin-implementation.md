# Codex Parallelism And Plugin Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Implement the approved Codex parallelism contract and first-class Codex plugin distribution surface.

**Architecture:** The plan makes implementation plans the execution contract for safe parallel dispatch, keeps Codex-specific mechanics in the Codex tool mapping, and adds Codex plugin metadata as a distribution adapter over the existing `skills/` tree. Lead-owned gates cover current Codex docs, public plugin manifest interpretation, and final integration.

**Tech Stack:** Markdown skills and docs, JSON manifests, Bash packaging, Node.js `node:test`, `jq`, `git archive`, zip/tar tooling, small checked-in assets.

**Architecture Quality:** Affected modules are `writing-plans`, `subagent-driven-development`, Codex tool mapping, Codex plugin manifests, version sync config, docs, assets, packaging script, and tests. The caller-facing interface is the saved implementation plan; it must name safe parallel batches, file ownership, contract inputs, and serialization reasons. Architecture risk is medium because execution behavior changes, but lead-owned review and verification remain unchanged.

## Global Constraints

- Preserve Razorback's automatic skill activation policy; do not adopt Simplepower's explicit-only invocation model.
- Preserve Razorback's lead-owned per-task inline review; do not add a Simplepower-style batch review+fix agent.
- `Parallel Execution Contract`, `Contract inputs`, `File ownership`, `Serialization required`, and `Dependency reason` are exact prompt-facing terms.
- Approved safe parallel batches are built-in approval for Codex to make multiple `spawn_agent` calls in the same turn.
- Serializing a safe batch requires a recorded dependency or tool-limitation reason; habit or uncertainty is not enough.
- Codex manifest must omit `hooks`; Razorback is not bundling Codex lifecycle hooks in this task, and current plugin validation rejects unsupported manifest fields including `hooks`.
- `.agents/plugins/marketplace.json` is discovery metadata and must not include a version field unless current official Codex docs require one.
- `.codex-plugin/plugin.json` is the Codex version-bearing manifest and must participate in `.version-bump.json`.
- Codex interface assets are local files: `assets/razorback-small.svg` and `assets/app-icon.png`.
- Packaging must include `assets/`, `.codex-plugin/`, `skills/`, `README.md`, and `LICENSE`, and must exclude source-only harness files, tests, docs, hooks, and non-Codex manifests.
- `CLAUDE.md` is the source file; `AGENTS.md` is a symlink and must not be edited separately.
- Current Codex plugin schema, marketplace, asset, and hook-discovery behavior must be grounded with `razorback:grounding-in-current-docs` before writing Codex manifest/package tests.
- If current official Codex docs require per-skill OpenAI metadata files or a marketplace version field not covered here, stop and revise this plan before dispatching file-edit workers.
- No push, release, tag, marketplace publish, or portal upload is in scope.

## Parallel Execution Contract

### Lead Gate 0: Codex Docs Grounding

This gate runs before any file-edit worker dispatch.

**Owner:** Lead

**File ownership:**
- Create: `docs/plans/2026-07-03-codex-plugin-docs-grounding.md`

**Contract inputs:**
- Approved design: `docs/plans/2026-07-03-codex-parallelism-and-plugin-design.md`
- Current official Codex/OpenAI docs found through `razorback:grounding-in-current-docs`
- Current repo evidence from Miller and this plan

**Serialization required:** Yes. Public Codex plugin manifest semantics are external facts and must be verified before workers write tests or manifests.

**Required output:** A short grounding note that records official doc URLs or current-doc lookup results for:
- `.codex-plugin/plugin.json` location and field names
- `.agents/plugins/marketplace.json` location and field names
- whether `hooks` belongs in the plugin manifest for this task
- interface asset fields and whether local asset paths are accepted
- whether `skills/*/agents/openai.yaml` or equivalent per-skill metadata is required
- whether Codex marketplace discovery metadata carries a version field

If the docs conflict with this plan's assumptions, the lead updates this plan before dispatching the parallel batch.

### Parallel Batch A: Contract, Plugin, Packaging, Docs

Dispatch Tasks 1-4 together after Lead Gate 0 passes. These tasks have non-overlapping write scopes. They may rely on the Interface Contract below instead of waiting for each other's uncommitted files.

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: Parallel execution contract in workflow skills | Batch A | `skills/writing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/subagent-driven-development/implementer-prompt.md`, `skills/subagent-driven-development/fix-prompt.md`, `skills/using-razorback/references/codex-tools.md`, `tests/codex-parallelism-contract.test.mjs` | No | Contract inputs cover the shared prompt terms and Codex dispatch behavior. |
| Task 2: Codex plugin metadata, version sync, and assets | Batch A | `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `.version-bump.json`, `assets/razorback-small.svg`, `assets/app-icon.png`, `tests/codex-plugin-manifest.test.mjs` | No | Lead Gate 0 supplies the manifest schema contract. |
| Task 3: Codex packaging script and package tests | Batch A | `scripts/package-codex-plugin.sh`, `tests/codex-package-script.test.mjs` | No | The Interface Contract supplies expected manifest, asset, and package paths before Task 2 files exist. Hermetic fixture tests let the worker run the real package gate before Batch A is committed. |
| Task 4: User-facing docs and harness docs | Batch A | `CLAUDE.md`, `README.md`, `.codex/INSTALL.md`, `docs/README.codex.md` | No | Docs consume the approved install and versioning contract. |

### Interface Contract

Tasks in Batch A may rely on these approved contracts:

- `Parallel Execution Contract` is a required section in full plans.
- One-task full plans may use the compact form:
  - `Single task. No parallel batches.`
  - `File ownership`
  - `Contract inputs`
  - `Serialization required: Not applicable - single task.`
- Multi-task full plans must list parallel batches, file ownership, contract inputs, serialization decisions, and dependency reasons.
- `subagent-driven-development` must dispatch validated safe batches together when subagents are available.
- Codex-specific guidance must explicitly say multiple eligible tasks mean multiple `spawn_agent` calls in one turn.
- Parallel-batch workers must not race on Git commits. For parallel batches, the lead owns staging and commit creation after per-task inline review. Serial workers may keep the existing worker-commit flow.
- `.codex-plugin/plugin.json` must be named `razorback`, version `0.19.0` at initial implementation time, point `skills` to `./skills/`, include required `author` and `interface` metadata, and omit `hooks`.
- `.agents/plugins/marketplace.json` must describe a local URL source `./` for plugin name `razorback` and must not include a version field unless Lead Gate 0 updates the contract.
- `assets/razorback-small.svg` and `assets/app-icon.png` must be checked in and referenced by the Codex plugin manifest.
- `.version-bump.json` must include `.codex-plugin/plugin.json` with field `version`; it must not include `.agents/plugins/marketplace.json` unless Lead Gate 0 proves a version field exists there.
- `scripts/bump-version.sh` already supports dotted JSON fields and should not be modified unless tests prove it cannot handle the new `.version-bump.json` entry.
- Packaging must be rootless and Codex-only. Expected archive contents are `.codex-plugin/plugin.json`, `assets/**`, `skills/**`, `README.md`, and `LICENSE`.
- Since Razorback currently has no checked-in `skills/*/agents/openai.yaml` files, package tests must follow Lead Gate 0. If docs require per-skill metadata, revise this plan before writing those tests.

## File Ownership

| File | Owner | Change type | Responsibility | Parallel safety notes |
|---|---|---|---|---|
| `docs/plans/2026-07-03-codex-plugin-docs-grounding.md` | Lead Gate 0 | create | Record current official Codex docs grounding | Must exist before Batch A dispatch. |
| `skills/writing-plans/SKILL.md` | Task 1 | modify | Require `Parallel Execution Contract` and task-level contract fields | No other task edits this file. |
| `skills/subagent-driven-development/SKILL.md` | Task 1 | modify | Validate and dispatch safe batches; define parallel batch commit mode | No other task edits this file. |
| `skills/subagent-driven-development/implementer-prompt.md` | Task 1 | modify | Add commit-mode instructions for serial vs parallel-batch dispatch | No other task edits this file. |
| `skills/subagent-driven-development/fix-prompt.md` | Task 1 | modify | Preserve commit-mode rules during fix rounds | No other task edits this file. |
| `skills/using-razorback/references/codex-tools.md` | Task 1 | modify | Make same-turn multiple `spawn_agent` dispatch explicit | No other task edits this file. |
| `tests/codex-parallelism-contract.test.mjs` | Task 1 | create | Lock prompt contract and parallel dispatch wording | No other task edits this file. |
| `.codex-plugin/plugin.json` | Task 2 | create | Codex plugin manifest | Consumed by Task 3 through Interface Contract. |
| `.agents/plugins/marketplace.json` | Task 2 | create | Codex plugin source discovery metadata | Consumed by docs; no version unless docs require. |
| `.version-bump.json` | Task 2 | modify | Add `.codex-plugin/plugin.json` version target | No other task edits this file. |
| `assets/razorback-small.svg` | Task 2 | create | Composer icon asset | Task 3 package test checks inclusion through its committed fixture and the lead affected-change gate. |
| `assets/app-icon.png` | Task 2 | create | App icon asset | Task 3 package test checks inclusion through its committed fixture and the lead affected-change gate. |
| `tests/codex-plugin-manifest.test.mjs` | Task 2 | create | Manifest, marketplace, asset, and version sync tests | No other task edits this file. |
| `scripts/package-codex-plugin.sh` | Task 3 | create | Deterministic Codex package builder | Uses the Interface Contract during the worker gate and real Task 2 files when present. |
| `tests/codex-package-script.test.mjs` | Task 3 | create | Package script tests with committed temporary git fixtures | Worker may run real package tests before Task 2 commits because the test creates its own committed fixture. |
| `CLAUDE.md` | Task 4 | modify | Harness split and version-management updates; `AGENTS.md` tracks symlink | No other task edits this file. |
| `README.md` | Task 4 | modify | Codex install/update/version wording | No other task edits this file. |
| `.codex/INSTALL.md` | Task 4 | modify | Prefer plugin install path with symlink fallback | No other task edits this file. |
| `docs/README.codex.md` | Task 4 | modify | Codex usage/install docs for plugin path and parallel dispatch | No other task edits this file. |

## Verification Strategy

**Project source of truth:** `RAZORBACK.md`, `CLAUDE.md`, `README.md`, `.version-bump.json`, and the approved design spec.

**Worker red/green scope:**
- Task 1: `node --test tests/codex-parallelism-contract.test.mjs`
- Task 2: `node --test tests/codex-plugin-manifest.test.mjs` and `./scripts/bump-version.sh --check`
- Task 3: `bash -n scripts/package-codex-plugin.sh` and `node --test tests/codex-package-script.test.mjs`
- Task 4: focused `rg` assertions listed in Task 4

**Worker ceiling:** Workers run only their focused command(s). Task 3's package test must use a committed temporary git repo fixture so it can run during the parallel batch before Task 2 files are committed in the source checkout.

**Worker gate invariant:**
- Task 1 proves workflow prompts require and honor the parallel execution contract.
- Task 2 proves Codex manifest/version/assets are internally consistent.
- Task 3 proves the package script can package a committed fixture, reject dirty fixtures, preserve the manifest's omission of `hooks`, include every skill, and exclude source-only files before the batch is committed.
- Task 4 proves user-facing docs name the new install, harness, and version surfaces.

**Lead affected-change scope after Batch A:** Run:

```bash
node --test tests/codex-parallelism-contract.test.mjs tests/codex-plugin-manifest.test.mjs tests/codex-package-script.test.mjs
./scripts/bump-version.sh --check
git diff --check
```

**Branch gate:** Run:

```bash
node --test tests/*.test.mjs
./scripts/bump-version.sh --audit
git diff --check
```

**Replay/metric evidence:** Not applicable.

**Escalation triggers:**
- Current Codex docs contradict the planned manifest, marketplace, hook, asset, or skill-metadata schema.
- Package tests require adding per-skill metadata files not listed in this plan.
- Any worker needs to edit a file owned by another task.
- Any worker attempts to interpret public plugin schema without the Lead Gate 0 grounding note.
- Parallel-batch commit mode proves unsafe in the current Codex worktree model.

**Assigned verification failure:** Workers stop and report when assigned verification fails unless their task explicitly says the failing test is expected during TDD. The lead owns affected-change and branch-gate acceptance.

**Verification ledger:** Record invariant, command, scope label, commit SHA, result, and timestamp for every worker and lead gate.

## Model Routing

**Project source of truth:** `RAZORBACK.md`.

**Strategy tier:** planning, architecture, decomposition, lead review, finding triage.
- Codex mapping: `gpt-5.5` medium/high when available, otherwise inherit and report limitation.

**Implementation tier:** bounded worker tasks from a clear plan.
- Codex mapping: `gpt-5.4` xhigh when available.

**Mechanical tier:** docs, fixtures, rote edits, formatting, manifests with no gate ownership.
- Codex mapping: `gpt-5.4` low/medium when available.

**Coupled implementation tier:** bounded cross-file work with shallow coupling and disjoint file ownership.
- Codex mapping: `gpt-5.4` high when coupling is shallow and each file verifies independently; `gpt-5.4` xhigh when files must change together, shared invariants are present, or tool-heavy debugging appears.

**Gate-interpretation reviewer:** reading the plan, failing test or replay, and diff to decide whether the test or implementation is wrong.
- Codex mapping: `gpt-5.4` high.

**Escalation tier:** security, subtle correctness, high blast radius, weak tests, repeated failures, gate interpretation.
- Codex mapping: `gpt-5.4` high for first escalation; `gpt-5.5` high/xhigh for top-risk contract or planning failure.

**Worker eligibility:** Batch A workers have explicit file ownership and tests. Public plugin schema interpretation remains lead-owned through Gate 0 and final review.

**Escalation triggers:** Use the triggers in `RAZORBACK.md` plus this plan's Verification Strategy.

**Mechanical exclusion:** Mechanical workers cannot own failing tests, public plugin schema interpretation, or acceptance gates. Task 4 may use mechanical tier because it records decided docs and does not interpret schema.

**Unsupported harness behavior:** If the harness cannot choose models per agent, use `inherit`, note it in the worker report, and continue.

## Implementation Tasks

### Lead Gate 0: Ground Current Codex Plugin Docs

**Files:**
- Create: `docs/plans/2026-07-03-codex-plugin-docs-grounding.md`

**Interfaces:**
- Consumes: `docs/plans/2026-07-03-codex-parallelism-and-plugin-design.md`; official Codex/OpenAI docs discovered by `razorback:grounding-in-current-docs`
- Produces: Grounded manifest and packaging contract consumed by Tasks 2 and 3

**What to build:** Use `razorback:grounding-in-current-docs` to verify current Codex plugin manifest, marketplace, asset, hook-discovery, and per-skill metadata behavior. Save a concise grounding note with official URLs or lookup evidence and the exact decisions workers may rely on.

**Approach:**
- Check this repo first; there is no `.codex-plugin/` or `.agents/plugins/` surface yet.
- Use current official Codex/OpenAI docs for plugin manifest and marketplace behavior. Restrict fallback web browsing to official OpenAI sources.
- Compare docs to Superpowers/Simplepower only as examples, not as authority.
- If docs require a marketplace version field, per-skill metadata files, different asset fields, or different hook suppression than this plan, stop and revise this plan before dispatch.

**Acceptance criteria:**
- [x] Grounding note exists at `docs/plans/2026-07-03-codex-plugin-docs-grounding.md`.
- [x] The note names the official source or explains why official docs were unreachable.
- [x] The note states manifest fields, marketplace version policy, asset fields, hook behavior, and per-skill metadata requirement.
- [x] Any doc conflict is resolved by revising this plan before Batch A.

**Verification:**

```bash
test -f docs/plans/2026-07-03-codex-plugin-docs-grounding.md
rg -n "manifest|marketplace|hooks|asset|metadata|https?://" docs/plans/2026-07-03-codex-plugin-docs-grounding.md
```

### Task 1: Parallel Execution Contract In Workflow Skills

**Parallel batch:** Batch A

**Model tier:** Coupled implementation (`gpt-5.4` xhigh on Codex when supported)

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/fix-prompt.md`
- Modify: `skills/using-razorback/references/codex-tools.md`
- Create: `tests/codex-parallelism-contract.test.mjs`

**Interfaces:**
- Consumes: Approved prompt terms `Parallel Execution Contract`, `Contract inputs`, `File ownership`, `Serialization required`, and `Dependency reason`; existing SDD worker prompt flow; Codex `spawn_agent`/`wait_agent` tool mapping.
- Produces: Updated plan-writing and execution contract that future plans and `subagent-driven-development` use to dispatch safe batches together while leaving parallel-batch commits to the lead.

**Contract inputs:**
- Parallel execution terms and compact single-task form from the approved design.
- Interface Contract statement that parallel-batch workers must not race on Git commits.
- Existing SDD file handoff and durable progress behavior.
- Existing Codex tool mapping for `spawn_agent`, `send_input`, `wait_agent`, and `close_agent`.

**Serialization required:** No.

**What to build:** Make plan-level parallelism mandatory and actionable. Update writing-plans to require the contract fields; update SDD to validate safe batches and dispatch them together; update implementer/fix prompts so parallel-batch workers do not commit directly; update Codex mapping to require multiple `spawn_agent` calls in the same turn for safe batches.

**Approach:**
- In `skills/writing-plans/SKILL.md`, add `Parallel Execution Contract` to the plan header/required sections and task structure. Preserve global constraints, architecture quality, verification, model routing, and light-plan behavior.
- In `skills/subagent-driven-development/SKILL.md`, replace advisory parallel guidance with a validation-and-dispatch rule: a safe batch with 2+ tasks dispatches together when subagents are available.
- Define commit mode:
  - Serial task: worker may commit after assigned verification passes, preserving current behavior.
  - Parallel batch: worker edits only owned files, writes report, and does not commit; lead stages and commits after inline review to avoid Git index races.
- In `implementer-prompt.md` and `fix-prompt.md`, add a filled-in `Commit mode` section so the dispatcher can choose serial-worker-commit or parallel-lead-commit.
- In `codex-tools.md`, say approved safe batches are built-in approval to call multiple `spawn_agent` tools in the same turn; serializing requires a recorded dependency or tool limitation.
- Add `tests/codex-parallelism-contract.test.mjs` with assertions for the required strings and anti-regression cases.

**Acceptance criteria:**
- [ ] `writing-plans` requires `## Parallel Execution Contract`.
- [ ] `writing-plans` documents compact single-task full-plan form.
- [ ] `writing-plans` requires `Contract inputs`, `File ownership`, `Serialization required`, and `Dependency reason`.
- [ ] SDD validates safe batches and dispatches 2+ eligible tasks together.
- [ ] SDD says serializing a safe batch requires a recorded reason.
- [ ] Codex mapping says multiple eligible tasks mean multiple `spawn_agent` calls in the same turn.
- [ ] Implementer/fix prompts support parallel-batch no-commit mode and serial worker-commit mode.
- [ ] Tests lock the above wording.

**Worker verification:**

```bash
node --test tests/codex-parallelism-contract.test.mjs
```

### Task 2: Codex Plugin Metadata, Version Sync, And Assets

**Parallel batch:** Batch A

**Model tier:** Coupled implementation (`gpt-5.4` xhigh on Codex when supported)

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Modify: `.version-bump.json`
- Create: `assets/razorback-small.svg`
- Create: `assets/app-icon.png`
- Create: `tests/codex-plugin-manifest.test.mjs`

**Interfaces:**
- Consumes: Lead Gate 0's grounded Codex manifest and marketplace schema; `package.json` metadata values; approved asset paths; existing `.version-bump.json` file list format.
- Produces: `.codex-plugin/plugin.json` with `version`, `skills`, `author`, interface metadata, and interface asset references, omitting `hooks`; `.agents/plugins/marketplace.json` without a version field unless Gate 0 changes the contract; local assets and version-sync configuration consumed by Task 3 and Task 4.

**Contract inputs:**
- Lead Gate 0 grounding note for current Codex schema.
- Package metadata from `package.json`: name `razorback`, version `0.19.0`, author `anortham`, license `MIT`, homepage `https://github.com/anortham/razorback`.
- Approved asset paths: `./assets/razorback-small.svg` and `./assets/app-icon.png`.
- Version sync policy: `.codex-plugin/plugin.json` has field `version`; `.agents/plugins/marketplace.json` has no version unless Lead Gate 0 revises this plan.

**Serialization required:** No.

**What to build:** Add the Codex manifest, marketplace discovery metadata, assets, and version-sync tests.

**Approach:**
- Create `.codex-plugin/plugin.json` using the grounded schema. Initial values:
  - `name`: `razorback`
  - `version`: `0.19.0`
  - `description`: align with `package.json` / README positioning
  - `homepage` and `repository`: `https://github.com/anortham/razorback`
  - `license`: `MIT`
  - `skills`: `./skills/`
  - interface display name `Razorback`, category matching current Codex docs, local asset paths, and default prompts.
- Create `.agents/plugins/marketplace.json` with plugin name `razorback`, local URL source `./`, install policy, and no version field unless Lead Gate 0 changes the contract.
- Add `.codex-plugin/plugin.json` to `.version-bump.json` with field `version`.
- Create small local assets. The SVG can be a simple static Razorback wordmark/icon. The PNG must be a valid 64x64 app icon under 8 KB, produced from a fixed base64 literal or another deterministic repo-local generation command recorded in the worker report; the manifest test must validate the PNG signature and file size.
- Add `tests/codex-plugin-manifest.test.mjs` to parse JSON, assert manifest values, assert `hooks` is absent, assert marketplace has no version field, assert asset paths exist, and assert `.version-bump.json` includes `.codex-plugin/plugin.json`.

**Acceptance criteria:**
- [ ] `.codex-plugin/plugin.json` exists, parses, and points `skills` to `./skills/`.
- [ ] `.codex-plugin/plugin.json` omits `hooks`.
- [ ] `.agents/plugins/marketplace.json` exists, parses, and has no version field unless Lead Gate 0 changed the contract.
- [ ] `.version-bump.json` includes `.codex-plugin/plugin.json` field `version`.
- [ ] `assets/razorback-small.svg` and `assets/app-icon.png` exist and are referenced by the manifest.
- [ ] `./scripts/bump-version.sh --check` reports six version-bearing manifests after this task.
- [ ] Tests verify the manifest, marketplace, assets, and version sync config.

**Worker verification:**

```bash
node --test tests/codex-plugin-manifest.test.mjs
./scripts/bump-version.sh --check
```

### Task 3: Codex Packaging Script And Package Tests

**Parallel batch:** Batch A

**Model tier:** Coupled implementation (`gpt-5.4` xhigh on Codex when supported)

**Files:**
- Create: `scripts/package-codex-plugin.sh`
- Create: `tests/codex-package-script.test.mjs`

**Interfaces:**
- Consumes: Lead Gate 0's package metadata requirements; Interface Contract paths for `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `assets/razorback-small.svg`, `assets/app-icon.png`, `skills/`, `README.md`, and `LICENSE`.
- Produces: `scripts/package-codex-plugin.sh` CLI with `--output`, `--format`, `--ref`, `--allow-dirty`, and `--keep-stage`; `tests/codex-package-script.test.mjs` that proves the script packages committed fixture content without depending on the source checkout's `HEAD`.

**Contract inputs:**
- Lead Gate 0 grounding note for package metadata requirements.
- Task 2's approved manifest and asset paths from the Interface Contract.
- Superpowers' current packaging script/test behavior as a model, adapted to Razorback and current docs.
- Razorback has `LICENSE` but no `CODE_OF_CONDUCT.md`; package script must not require absent files.

**Serialization required:** No.

**What to build:** Add a Codex-only package builder and tests for archive contents, dirty-worktree behavior, hook preservation, assets, skills, and deterministic metadata where practical.

**Approach:**
- Implement `scripts/package-codex-plugin.sh` with these options:
  - `--output PATH`
  - `--format zip|tar.gz`
  - `--ref REF` defaulting to `HEAD`
  - `--allow-dirty`
  - `--keep-stage`
- Refuse a dirty working tree unless `--allow-dirty` is supplied.
- Use `git archive` for `.codex-plugin`, `assets`, `skills`, `README.md`, and `LICENSE`.
- Exclude `.agents/`, hooks, docs, tests, non-Codex manifests, source-only plugin files, `.memories/`, `.git`, and generated caches from the archive.
- Preserve executable bits for skill scripts.
- Normalize timestamps for repeatable zip/tar output where the platform tools support it.
- Print archive path, format, and SHA-256.
- Package `.codex-plugin/plugin.json` exactly as written, including the absence of `hooks`.
- In `tests/codex-package-script.test.mjs`, create a hermetic temporary git repo fixture by copying `scripts/package-codex-plugin.sh`, `skills/`, `README.md`, `LICENSE`, and the Codex manifest/assets when present; if Task 2 files are not present yet, write fixture-only `.codex-plugin/plugin.json`, `assets/razorback-small.svg`, and `assets/app-icon.png` with the Interface Contract paths. Commit the fixture before invoking the script so `git archive --ref HEAD` packages the fixture's committed tree, not the source checkout's pre-batch `HEAD`.
- In the fixture tests, assert:
  - script refuses dirty fixture worktree by default
  - script works with `--allow-dirty` for dirty-fixture test execution
  - archive contains `.codex-plugin/plugin.json`, `assets/razorback-small.svg`, `assets/app-icon.png`, `README.md`, `LICENSE`, and every `skills/*/SKILL.md` from the source checkout
  - every packaged `skills/*/SKILL.md` has YAML frontmatter with `name` and `description`
  - archive excludes hooks, docs, tests, `.agents`, `.claude-plugin`, `.cursor-plugin`, `.opencode`, `gemini-extension.json`, `package.json`, and `.memories`
  - archive manifest omits `hooks`
  - zip and tar.gz contain the same rootless paths when both tools are available
- If Lead Gate 0 proves per-skill OpenAI metadata files are required, stop and revise this plan before adding broad `skills/*/agents/openai.yaml` files.

**Acceptance criteria:**
- [ ] Packaging script exists and is executable.
- [ ] Packaging script supports zip and tar.gz outputs.
- [ ] Packaging script refuses dirty worktrees by default.
- [ ] Package contents are rootless and Codex-only.
- [ ] Package includes local assets and all skills.
- [ ] Package tests assert every `skills/*/SKILL.md` from the source checkout appears in the archive and has `name` and `description` frontmatter.
- [ ] Package preserves the manifest's omission of `hooks`.
- [ ] Package tests avoid assuming absent `CODE_OF_CONDUCT.md`.
- [ ] Tests cover archive include/exclude rules.

**Worker verification:**

```bash
bash -n scripts/package-codex-plugin.sh
node --test tests/codex-package-script.test.mjs
```

The test must not read package contents from the source checkout's `HEAD`. It must package a committed temporary fixture so it remains valid before the lead commits Batch A.

### Task 4: User-Facing Docs And Harness Docs

**Parallel batch:** Batch A

**Model tier:** Mechanical (`gpt-5.4` low/medium on Codex when supported)

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `.codex/INSTALL.md`
- Modify: `docs/README.codex.md`

**Interfaces:**
- Consumes: Preferred Codex plugin install path; manual symlink fallback path; new six-manifest version policy; `AGENTS.md` symlink-to-`CLAUDE.md` ownership rule.
- Produces: User-facing docs that name the Codex plugin files, preserve manual fallback instructions, document native skill discovery and `multi_agent = true`, and remove stale symlink-only/five-manifest claims.

**Contract inputs:**
- Codex plugin install is preferred when available.
- Manual clone/symlink install remains fallback for local development.
- `CLAUDE.md`/`AGENTS.md` must mention `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, and the new version-bearing manifest count.
- `AGENTS.md` is a symlink to `CLAUDE.md`; do not edit `AGENTS.md` separately.

**Serialization required:** No.

**What to build:** Update active docs so they no longer describe Codex as symlink-only and no longer say only five manifests carry version fields.

**Approach:**
- In `CLAUDE.md`, update Project Structure and Harness Split to list Codex plugin metadata and marketplace files. Update Codex bootstrap text to mention plugin install plus native skill discovery. Update Version management from five manifests to six manifests after `.codex-plugin/plugin.json` is added.
- In `README.md`, update Codex install instructions to prefer plugin installation once `.agents/plugins/marketplace.json` exists. Keep manual symlink instructions as development fallback. Update version-management text from five to six manifests.
- In `.codex/INSTALL.md`, add plugin install path first, manual clone/symlink second, and keep `multi_agent = true`.
- In `docs/README.codex.md`, update Quick Install, Manual Installation, How It Works, Updating, and Troubleshooting to reflect plugin install and symlink fallback.

**Acceptance criteria:**
- [ ] `CLAUDE.md` lists `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json`.
- [ ] `CLAUDE.md` version-management text says six manifests and includes `.codex-plugin/plugin.json`.
- [ ] README Codex section prefers plugin install and keeps manual fallback.
- [ ] `.codex/INSTALL.md` prefers plugin install and keeps manual fallback.
- [ ] `docs/README.codex.md` describes plugin install, native skill discovery, and `multi_agent = true`.
- [ ] No doc says Codex is symlink-only.

**Worker verification:**

```bash
rg -n "\.codex-plugin/plugin\.json" CLAUDE.md
rg -n "\.agents/plugins/marketplace\.json" CLAUDE.md
rg -n "six manifests|six version-bearing manifests" CLAUDE.md
rg -n "six manifests|six version-bearing manifests" README.md
rg -n "plugin install|Codex plugin" README.md
rg -n "manual.*fallback|symlink" README.md
rg -n "plugin install|Codex plugin" .codex/INSTALL.md
rg -n "manual.*fallback|symlink" .codex/INSTALL.md
rg -n "plugin install|Codex plugin" docs/README.codex.md
rg -n "native skill discovery" docs/README.codex.md
rg -n "multi_agent = true" .codex/INSTALL.md docs/README.codex.md
if rg -n "symlink-only|Five manifests|five version-bearing manifests" CLAUDE.md README.md .codex/INSTALL.md docs/README.codex.md; then exit 1; fi
```

## Lead Integration Review

After Batch A workers finish:

1. Confirm each worker stayed in its file ownership.
2. Run the affected-change scope.
3. Do lead inline review per task, including:
   - prompt contract exactness
   - no public plugin schema invention beyond Lead Gate 0
   - package tests meaningful enough to catch missing assets, accidental hooks, and version sync
   - docs not stale against new manifest count
   - parallel batch commit-mode safety
4. Stage and commit reviewed task changes in a controlled order. Parallel-batch workers do not create their own commits.
5. Run branch gate.
6. Use `razorback:finishing-a-development-branch`.

## Done Criteria

- [ ] Lead Gate 0 grounding note exists and confirms or revises Codex schema assumptions.
- [ ] Tasks 1-4 complete and pass worker verification.
- [ ] Lead affected-change verification passes.
- [ ] Lead branch-gate verification passes.
- [ ] Plan checkboxes are ticked as tasks complete.
- [ ] Final report includes verification ledger entries and any docs-grounding URLs.
