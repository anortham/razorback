# Toolkit Reliability Implementation Plan

> **Status:** Implementation authorized on 2026-11-03. User requested implementation, useful subagents, verification, and local commits; no push or release. R1–R3 and the R4 source are implemented; verification details are in `.memories/autonomous-run-2026-11-04-toolkit-reliability.md`. Goldfish G1 is ready; final combined acceptance still requires the code-kb K3/K4 selection.
>
> **For agentic workers:** After implementation approval, use `razorback:subagent-driven-development` for independent tasks when delegation is available and permitted. Otherwise use `razorback:executing-plans`.

**Goal:** Make Razorback's process rules consistent, its Goldfish handoffs recoverable, and the three-tool setup diagnosable and verifiable without adding routine ceremony.

**Architecture:** Razorback continues to own workflow policy and host packaging. Its new toolkit doctor is an explicitly scoped, read-only diagnostic; a separate opt-in integration runner checks real Goldfish and code-kb services in temporary projects. Fresh-agent workflow decisions remain a distinct evidence class from deterministic integration checks.

**Tech Stack:** Markdown skills and docs, Node.js scripts and `node:test`, MCP client/server contracts discovered from the current Goldfish and code-kb repositories.

**Spec:** This plan's `Design Contract` section. Optional coordination reference: [AI toolkit coordination plan](/home/murphy/source/goldfish/docs/plans/2026-11-03-ai-toolkit-coordination-plan.md). The local contracts below are sufficient to execute this Razorback plan independently.

**Architecture Quality:** Preserve the existing three-tool boundary. The primary risks are divergent copies of workflow rules, memory that cannot be recalled, and a diagnostic that becomes an installer. Keep diagnostics bounded and read-only, and keep combined service checks opt-in.

**Reviewed baseline:** `/home/murphy/source/razorback`, `main`, `e53a9ee4848df6519e91de7ff0a1b7fdc25ede8e`, version 0.48.8. Recheck live state and retained worktrees before implementation; the prior review passed 467 tests, which is baseline evidence only.

## Design Contract

### Process policy

- A failed baseline is evidence to investigate. Repair a relevant, recoverable failure when the approved task safely covers it. If an unrelated failure cannot be repaired within scope, record it and proceed only when an isolated affected-change check still proves the task; otherwise stop under the blocker taxonomy. Do not silently waive a failure or classify the first failure as unrecoverable. Isolated progress is not permission to publish with a failing required branch gate; preserve the final verification boundary.
- TDD remains the default for features, bug fixes, and behavior changes. A missing existing test is not itself an exception. A no-test-surface exception is allowed only when automation is unsuitable for the observable behavior, the reason and a concrete before/after observation are recorded, and stricter project instructions do not prohibit it. The exception does not waive tests for other behavior in the same change.
- Preserve the measured quick-fix scope and escalation rules. Keep the baseline recovery and TDD exception rules consistent across the entry skill, canonical references, and tests that guard them.

### Goldfish handoff

- Before an unfinished-work stop, including the publication-approval wait, save a Goldfish checkpoint using its existing tool and checkpoint format. Include a workspace-relative path to the committed Razorback run report, plan/task identity, current branch and worktree, the source commit actually tested, publication-authority state and its source, and a useful `next` action.
- Use Goldfish's existing structured checkpoint quality contract. Do not add a report index, storage format, import flag, or new Goldfish dependency. When Goldfish is unavailable, the report and git state remain the recovery path.
- On resume, recall the checkpoint, read its linked report, and verify current branch, worktree, commit, verification evidence, and authority against live state before acting. A checkpoint records prior user-granted authority and its source; it does not create new authority. Never infer push or PR permission from implementation approval.
- Save a new checkpoint only when durable task state changes, such as entering an approval wait or recording a created PR. An unchanged resume does not create a duplicate checkpoint. Keep the report and checkpoint staged with the commit they describe.

### Read-only toolkit doctor

- Add the new opt-in invocation `npm run doctor -- --project-root <absolute-path> --host <claude|codex> --install-root <absolute-path> [--install-root <absolute-path> ...] [--json]`. It requires one or more selected installation roots so a local skills tree and a cached plugin tree can both be inspected. Do not infer paths from the local machine, scan outside supplied roots, or change host installation/configuration.
- Follow a symlink only when its resolved target is contained by one of the explicitly selected roots. If the link target is outside them, report it as unknown without reading the target.
- Report selected plugin/skill versions, duplicate skill registrations or roots, project/workspace root binding, required hook assets, and capability mismatches. Say `unknown` when an active host contract cannot be established from known metadata; do not claim runtime connectivity from static files.
- Provide text output by default and JSON with `--json`: `schema_version: 1`, overall `ok|findings` status, and per-check identifiers/status/evidence. Per-check status is `pass|warning|unknown|fail`. Exit 0 only when all checks pass; exit 1 when any check is warning, unknown, or fail; exit 2 for invalid arguments or unusable roots. Evidence may include version strings, normalized paths under supplied roots, asset presence, and counts. Never emit environment values, credentials, or whole config files.
- The command does not connect to MCP servers, access the network, install/update/uninstall plugins, repair files, or delete caches. It reports an exact redundant registration and a preferred canonical source when determinable. Removing an actual duplicate is a separate action requiring explicit user authorization; if later authorized, change only the selected registration and verify the host's discovered skills.

### Combined checks and behavioral evidence

- Add an opt-in integration command that uses actual local Goldfish and code-kb server binaries, launched using commands confirmed from their current manifests/docs. Keep their executable paths/arguments in an explicit test-only input, not committed machine paths or Razorback runtime dependencies.
- Run integration checks with isolated temporary projects and homes. Set Goldfish's workspace to each fixture's absolute root; set code-kb's `project_root` to the current fixture/worktree on every request. Prove that one project's result cannot leak into another. Never read or write the user's real Goldfish home.
- Ordinary `npm test` must clearly skip the external integration case when its explicit prerequisites are absent. The explicit integration command must fail with a useful prerequisite error instead of reporting a skip as success.
- Integration smoke checks prove real tool contracts, not agent decisions. Extend the existing blind workflow evaluator for worktree changes, approval-pause recovery, missing-tool native fallback, duplicate installations, and unsupported code-kb structural coverage. Keep deterministic fixtures labeled `deterministic-fixture`; label data `agent-run` only when collected from an actual fresh-agent run. Do not make paid model calls in ordinary tests.
- Final combined acceptance requires Goldfish G1 and the code-kb revision selected after K3/K4, either its verified candidate or its unchanged baseline with a documented negative result. The integration runner can be built earlier; do not mark the final combined gate passed against a discarded candidate. Discover their final launch and tool contracts from those checked-out revisions; do not invent flags or parameter shapes.

### Non-goals

- No implementation in Goldfish or code-kb, no global installation cleanup, no push/publish/release, and no changes to model/provider policy.
- The doctor may recommend an exact duplicate-registration cleanup and canonical install, but it does not execute it. Actual cleanup needs separate user authority; after approval, remove only the selected redundant registration, never a whole source/cache tree, then verify the host's fresh skill inventory.
- No recurring hooks, background service, new Goldfish storage/index format, automatic tool installation, or automatic mutation of host config.
- No claim that deterministic test fixtures demonstrate model behavior, code-kb accuracy, token savings, or whole-task latency.

## Global Constraints

- Preserve the Razorback, Goldfish, and code-kb responsibility boundaries; cross-repository calls use the existing MCP contracts.
- Follow TDD for production behavior; prose-only changes use focused contract tests and existing copy/link guards.
- No new production dependency on Goldfish or code-kb. Any MCP test client is development-only and must follow the repository's current dependency/lockfile practice.
- All integration data, project roots, Goldfish homes, and code-kb index artifacts stay under a per-run temporary directory.
- Explicit roots are required for diagnostics and tool calls. Never substitute the process working directory for a tool's workspace/project root.
- Do not expose secrets or dump client configuration in logs, errors, doctor output, or test artifacts.
- Existing user instructions and stricter repository policies take precedence over Razorback defaults.
- This plan grants no implementation, push, PR, release, or installation-cleanup authority. External reviewer choice is `none` unless the user separately selects one.

---

## Verification Strategy

**Project source of truth:** `CLAUDE.md`, `package.json`, `.github/workflows/test.yml`, `skills/writing-plans/task-templates.md`, and `docs/workflow-evaluation.md`.

**Worker red/green scope:** Each task runs the focused `node --test` files listed below. For production behavior, add the failing test before implementation. Prose changes update their contract assertions in the same task.

**Worker ceiling:** Focused tests for the owned files and a source/link/copy review. Do not run the combined tool integration during ordinary worker loops.

**Worker gate invariant:** Every assigned contradiction, handoff state, doctor result, or integration case has a test that fails when that contract is violated. A skipped external integration is recorded as skipped, never as passed.

**Lead affected-change scope:** Run the focused R1–R4 test files after integrating their batches; inspect every Razorback skill, test, script, and documentation surface changed by the plan.

**Branch gate:** Run `npm test` once on the final tree. Then run `npm run test:integration -- --config /absolute/test-config.json` against the selected Goldfish/code-kb revisions. Complete the expensive fresh-agent gate below before reporting behavioral acceptance.

**Security scope:** `none declared`. The doctor privacy tests and isolated-home integration checks are required behavior tests, not substitutes for any project-level security scanner.

**Expensive specialist:** After deterministic checks, run the five new blind scenarios at least twice each in separate fresh sessions on one pinned active harness/model. Record harness/model version, packet IDs, per-case outputs, and genuine measurements only. No model call belongs in `npm test` or the deterministic integration command. If required model access is unavailable, record that as a blocker/limited handoff; do not mark behavioral acceptance complete.

**Replay/metric evidence:** Process-contract and integration assertions are hard gates. Fresh-agent decisions are a separate hard acceptance gate; token and latency measurements are unavailable unless the native harness supplies them for those same runs.

**Escalation triggers:** Any requirement to mutate host installs/config, expose config values, add recurring hooks, change Goldfish storage, or rely on an undocumented external API is a plan mismatch. Stop that part and report the concrete source evidence for a plan decision.

**Assigned verification failure:** Diagnose and repair while a safe path remains. A worker reports an unrelated or unresolvable baseline failure with its exact command and evidence; do not silently edit outside ownership.

**Verification ledger:** Record command, scope label, HEAD, result, timestamp, and any integration skip/missing-prerequisite reason. Reuse passing evidence only for the same HEAD and scope.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| R1: Align process policy | A | `skills/using-git-worktrees/SKILL.md`, `skills/using-razorback/references/blocker-taxonomy.md`, `skills/fixing-small-issues/SKILL.md`, `skills/test-driven-development/SKILL.md`, `tests/autonomous-process-gates.test.mjs`, `tests/quick-fix-tier.test.mjs` | No | None - safe parallel batch. |
| R2: Recoverable Goldfish handoffs | A | `skills/finishing-a-development-branch/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `tests/workflow-execution-contracts.test.mjs`, `tests/twin-sections.test.mjs` | No | None - safe parallel batch. |
| R3: Read-only toolkit doctor | A | `scripts/toolkit-doctor.mjs`, `tests/toolkit-doctor.test.mjs`, `package.json`, `README.md` | No | None - safe parallel batch. |
| R4: Real-tool and agent evidence | B | `scripts/run-toolkit-integration.mjs`, `tests/toolkit-integration.test.mjs`, `tests/fixtures/workflow-eval/scenarios.json`, `tests/fixtures/workflow-eval/expectations.json`, `tests/fixtures/workflow-eval/valid-decisions.json`, `tests/workflow-eval.test.mjs`, `docs/workflow-evaluation.md`, `package.json`, conditional new `package-lock.json` | Yes | R4 consumes R1–R3 contracts, adds the second package script after R3, and requires Goldfish G1 plus the final code-kb candidate/baseline disposition after K3/K4. |

R1–R3 may run together with `parallel-lead-commit`; each worker owns only its row's files and hands its verified diff to the lead. R4 runs serially after batch A and cross-repository prerequisites, also with `parallel-lead-commit`. Do not run integration against moving prerequisite branches.

## Task R1: Align baseline recovery and TDD exceptions

**Files:**
- Modify: `skills/using-git-worktrees/SKILL.md`
- Modify: `skills/using-razorback/references/blocker-taxonomy.md`
- Modify: `skills/fixing-small-issues/SKILL.md`
- Modify: `skills/test-driven-development/SKILL.md`
- Test: `tests/autonomous-process-gates.test.mjs`
- Test: `tests/quick-fix-tier.test.mjs`

**Interfaces:**
- Consumes: The current blocker categories and quick-fix criteria in the named files.
- Produces: One consistent recovery rule and one narrowly bounded no-test-surface exception across the active process skills.

**Contract inputs:** The `Process policy` section above; stricter user/project rules always win. The line/file/reversibility quick-fix thresholds do not change.

**File ownership:** `skills/using-git-worktrees/SKILL.md`, `skills/using-razorback/references/blocker-taxonomy.md`, `skills/fixing-small-issues/SKILL.md`, `skills/test-driven-development/SKILL.md`, `tests/autonomous-process-gates.test.mjs`, `tests/quick-fix-tier.test.mjs`.

**Serialization required:** No.

**Dependency reason:** None - safe parallel batch.

**What to build:** Make worktree baseline handling follow the blocker taxonomy's diagnose/recover/record rules. Reconcile TDD and quick-fix wording so an absent test is not itself permission to skip one, and a genuine lack of suitable automation requires a recorded observable check.

**Approach:** Update focused assertions first to cover a recoverable baseline, an unrelated failure with an isolated affected check, an unresolvable failure, a missing-but-addable test, a justified no-test-surface case, and stricter project policy. Then update the skills and run the focused tests.

**Acceptance criteria:**
- [x] Baseline guidance distinguishes safe relevant recovery, an unrelated failure with valid isolated evidence, and a failure that blocks reliable verification; it does not call the first failure unrecoverable.
- [x] TDD remains the default; lack of an existing test is not an exception, and a no-test-surface exception requires a reason automation is unsuitable plus observable before/after evidence.
- [x] Stricter project instructions can prohibit the exception, and neither rule weakens feature/bugfix tests or quick-fix escalation criteria.
- [x] `node --test tests/autonomous-process-gates.test.mjs tests/quick-fix-tier.test.mjs` passes.
- [x] Worker-scope verification passes; hand the owned diff to the lead per `parallel-lead-commit`.

## Task R2: Make publication pauses recoverable through Goldfish

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md` (`## Recovery`)
- Modify: `skills/subagent-driven-development/SKILL.md` (`## Recovery`)
- Test: `tests/workflow-execution-contracts.test.mjs`
- Test: `tests/twin-sections.test.mjs`

**Interfaces:**
- Consumes: The current autonomous run report path, Goldfish checkpoint/recall contract, and authority ledger.
- Produces: A checkpoint pointer and resume sequence shared by finishing and both plan-execution recovery sections; fresh execution reads the linked report before choosing the next task.

**Contract inputs:** The `Goldfish handoff` section above; existing Goldfish workspace binding and checkpoint fields; no new storage format or report index.

**File ownership:** `skills/finishing-a-development-branch/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `tests/workflow-execution-contracts.test.mjs`, `tests/twin-sections.test.mjs`.

**Serialization required:** No.

**Dependency reason:** None - safe parallel batch.

**What to build:** Save a Goldfish checkpoint before stopping at the publication-approval wait, with `next` and a workspace-relative pointer to the prepared run report. Resume by recalling that pointer, reading the report, and reconciling current source-control and authority evidence before continuing.

**Approach:** Keep the report as the full record and the checkpoint as a compact retrieval pointer. Record the tested source commit separately from later report-only metadata commits. Define state transitions that warrant a checkpoint and ensure an unchanged resume does not save a duplicate. Preserve the no-Goldfish report/git fallback.

**Acceptance criteria:**
- [x] The pre-approval stop writes one checkpoint whose body satisfies Goldfish's existing quality format and includes the report path, plan/task, branch/worktree, tested commit, authority source/state, and next action.
- [x] Both `## Recovery` sections recall the checkpoint, read the linked report before choosing a task, and verify live git, verification, and authority state; the checkpoint itself never grants missing publication authority.
- [x] Post-PR state is captured only as a changed handoff, and resuming without a meaningful state change creates no duplicate checkpoint.
- [x] Goldfish absence leaves an explicit report/git recovery path and does not block the workflow.
- [x] `node --test tests/workflow-execution-contracts.test.mjs tests/twin-sections.test.mjs` passes.
- [x] Worker-scope verification passes; hand the owned diff to the lead per `parallel-lead-commit`.

## Task R3: Add a scoped, read-only toolkit doctor

**Files:**
- Create: `scripts/toolkit-doctor.mjs`
- Create/test: `tests/toolkit-doctor.test.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run doctor -- --project-root <absolute-path> --host <claude|codex> --install-root <absolute-path> [--install-root <absolute-path> ...] [--json]` plus the currently documented Claude/Codex manifests/config surfaces. The command, repeatable flag, initial host set, and schema are new contracts.
- Produces: Text by default or JSON `schema_version: 1` with overall `ok|findings` and check records `{id, status, evidence}`. Check status is `pass|warning|unknown|fail`; exit 0 means every check passed, exit 1 means any check did not pass, and exit 2 means invalid arguments or unusable roots.

**Contract inputs:** The `Read-only toolkit doctor` section above. The JSON schema and command are new Razorback interfaces, not existing flags. Implement only known host config shapes and report unsupported shapes as unknown.

**File ownership:** `scripts/toolkit-doctor.mjs`, `tests/toolkit-doctor.test.mjs`, `package.json`, `README.md`.

**Serialization required:** No.

**Dependency reason:** None - safe parallel batch.

**What to build:** Add a small, opt-in diagnostic for the explicitly selected project, installation root, and host. Report version drift, duplicate skill roots/registrations, root binding, required hook-asset presence, and capability mismatches without mutating the installation.

**Approach:** Derive supported Claude/Codex metadata from current manifests, install docs, and plugin code. Use temporary fixture roots for tests; include a secret sentinel in fixture config and prove it never appears in output. Resolve symlinks only when the target lies inside one of the selected roots; otherwise report unknown without reading it. Do not probe live MCP servers or infer unknown runtime state from static files. The report identifies a preferred canonical install and exact redundant registration when evidence supports them. Cleanup is a separate authorized operation: remove only the selected redundant registration, then capture a fresh host skill inventory; never delete whole source/cache trees.

**Acceptance criteria:**
- [x] The command requires an explicit project root, at least one repeatable installation root, and `claude` or `codex`; it refuses paths outside selected roots and never silently scans a real home directory.
- [x] A symlink target is read only when its resolved path is contained by one of the selected roots; otherwise output reports unknown.
- [x] Text and JSON outputs cover version, duplicate, binding, hook-asset, and capability checks; unsupported facts are `unknown`, not reported as healthy.
- [x] Neither output, stdout/stderr diagnostics, nor tests expose secret values or whole config contents.
- [x] The command performs no network, MCP invocation, install/uninstall, config write, or cache deletion.
- [x] The README documents invocation, output meanings, limitations, and that deleting a duplicate requires separate approval.
- [x] For the observed workstation duplicates, record the exact proposed redundant registration changes and canonical source. After separate approval, remove only those registrations and verify a fresh host inventory; otherwise record cleanup as awaiting authority, not completed by the diagnostic.
- [x] `node --test tests/toolkit-doctor.test.mjs` passes, including invalid-root, duplicate-install, unknown-host-shape, and redaction cases.
- [x] Worker-scope verification passes; hand the owned diff to the lead per `parallel-lead-commit`.

## Task R4: Verify real integrations and expand behavioral scenarios

**Files:**
- Create: `scripts/run-toolkit-integration.mjs`
- Create: `tests/toolkit-integration.test.mjs`
- Modify: `package.json`
- Create if a development-only MCP client dependency is added: `package-lock.json`
- Modify: `tests/fixtures/workflow-eval/scenarios.json`
- Modify: `tests/fixtures/workflow-eval/expectations.json`
- Modify: `tests/fixtures/workflow-eval/valid-decisions.json`
- Modify: `tests/workflow-eval.test.mjs`
- Modify: `docs/workflow-evaluation.md`

**Interfaces:**
- Consumes: R1–R3 behavior, Goldfish G1 and the final code-kb candidate or documented baseline selected after K3/K4, their current documented launch/tool contracts, and explicit test-only launch configuration.
- Produces: `npm run test:integration -- --config /absolute/test-config.json` as a strict opt-in command and a temporary-home/tool acceptance report. The ordinary `npm test` path skips external integration with a clear reason when its config/prerequisites are absent.

**Contract inputs:** The `Combined checks and behavioral evidence` section above. The integration config and command are new test-only interfaces; do not put local executable paths in source control. Do not add a production dependency on either tool.

**File ownership:** `scripts/run-toolkit-integration.mjs`, `tests/toolkit-integration.test.mjs`, `tests/fixtures/workflow-eval/scenarios.json`, `tests/fixtures/workflow-eval/expectations.json`, `tests/fixtures/workflow-eval/valid-decisions.json`, `tests/workflow-eval.test.mjs`, `docs/workflow-evaluation.md`, `package.json`, conditional new `package-lock.json`.

**Serialization required:** Yes.

**Dependency reason:** R4 must test the final R1–R3 contracts and wait for Goldfish G1 and the final code-kb K3/K4 disposition for final acceptance. Runner construction can proceed earlier against stable contracts. It also adds `test:integration` after R3's package-script change.

**What to build:** Exercise real local Goldfish and code-kb services only in isolated temporary workspaces and homes. Separately extend the blind decision evaluator so fresh agents face the toolkit's recovery, fallback, and installation-conflict cases without leaking grading predicates into their packets.

**Approach:** The integration launcher accepts executable/argument arrays in an explicit ignored config file and resolves those commands from current repository documentation; it must not shell-evaluate strings or print the config. Use a supported MCP client in test-only dependencies if needed; do not build a partial protocol client. Ordinary tests skip if integrations are absent, while the explicit command preflights and fails clearly. Add blind cases for switching worktrees/roots, resuming an approval pause, using native tools when one MCP is unavailable, detecting duplicate registrations, and falling back to native reads when code-kb cannot establish structural coverage. Keep deterministic fixtures and real agent-run evidence distinct.

**Acceptance criteria:**
- [x] Temporary Goldfish saves and recalls a checkpoint under the intended absolute workspace and isolated home; a second workspace does not inherit the first workspace's project memory, and recall returns the R2 report pointer.
- [x] The external integration config contains `goldfish` and `code_kb` records, each with `source_root`, executable `command`, and string-array `args`. The runner launches argv directly without a shell, records each source revision, and never prints the config; the config is not committed.
- [ ] Fresh-session recovery retrieves the R2 pointer, reads the report, verifies the tested commit and current authority, and identifies the next action without duplicate saves when state is unchanged; it is covered by the required fresh-agent runs.
- [x] Code-kb requests use the current absolute `project_root` after a worktree switch and return only the selected fixture's structural result; unsupported coverage leads to the documented native-read fallback.
- [x] Duplicate-install fixtures produce a doctor finding with exact selected roots and a preferred canonical location; the integration suite does not remove or rewrite any registration.
- [x] Ordinary `npm test` emits an explicit skip reason when integration config is absent; `npm run test:integration -- --config /absolute/test-config.json` fails when required config or binaries are missing. This command is new.
- [x] Integration subprocesses use temporary home/project/index paths, scrub inherited sensitive environment values, and leave the real Goldfish home and host installation untouched.
- [x] Blind packets cover all five requested decision cases; their grading expectations stay outside packets and fixture answers are labeled `deterministic-fixture`.
- [ ] `node --test tests/workflow-eval.test.mjs tests/toolkit-integration.test.mjs` passes; the explicit integration command passes against the selected local services.
- [ ] Each of the five new scenarios has at least two actual fresh-agent runs on the same pinned harness/model after deterministic checks; reports use `agent-run` only for actual runs and record missing measurements as unavailable. No model calls are part of `npm test` or the integration command.
- [ ] Actual agent-run outputs satisfy the trusted expected actions, order, and authority boundaries for all five scenarios. Preserve failing attempts; fix the responsible guidance before any new content-bound packet run, and never relabel fixture answers as successful agent evidence.
- [ ] If fresh-agent access is unavailable, report behavioral acceptance as blocked/limited with the missing prerequisite; do not mark R4 complete.
- [x] Worker-scope verification passes; hand the owned diff to the lead per `parallel-lead-commit`.

## Handoff and approval

- **Implementation status:** R1–R3 complete; R4 source implemented and local checks recorded in the run report. R4 remains incomplete until the selected code-kb K3/K4 revision passes combined acceptance. Fresh-agent and final local-suite results are recorded in the report, which remains the live evidence ledger.
- **Implementation approval:** User explicitly authorized this plan on 2026-11-03: "Implement docs/plans/2026-11-03-toolkit-reliability-plan.md. Use subagents where useful, verify, and commit locally. Don’t push or release." Coordination and prerequisite plans were read; live source states were checked.
- **Reviewer choice:** `none` unless the implementation approval or a later spec names `codex` or `claude`.
- **Local commit authority:** Authorized by the implementation request; lead stages reviewed paths and commits locally.
- **Push / PR / release / installation cleanup:** Not authorized. The user explicitly prohibited push and release; keep this work local without requesting publication authority.
- **Recommended start after approval:** Start R1–R3 as one disjoint batch; review and integrate their exact diffs, then build R4 against the stable contracts. Its final combined gate waits for Goldfish G1 and the selected code-kb revision after K3/K4. Run Razorback's `npm test` once at its final local branch gate, then run the explicitly configured three-tool integration command and record all selected revisions.


## Execution notes

- R1 committed as `117c761`; R2 as `e2110fd`; R3 as `97bf9dd`, after lead review and focused gates.
- R3's live diagnostic found 32 duplicate skills through the two selected symlinks and cached plugin. Exact proposed registration-only cleanup is recorded in `.memories/autonomous-run-2026-11-04-toolkit-reliability.md`; it awaits separate authority.
- R4 introduces a generated npm lockfile. The lead additionally owns `.version-bump.json`, `scripts/bump-version.sh`, and `tests/version-audit.test.mjs` so future bumps keep its two root metadata versions synchronized without changing dependency pins. The five authoritative manifests remain the source of truth; generated lock metadata is excluded from the advisory undeclared-reference audit. The new regression failed before the fix and passed afterward; all 22 focused version checks passed. No project version was bumped.
- R4 runner construction started against stable contracts before R3 finished. Shared package edits remained serialized until R3 was committed. Final combined acceptance still waits for Goldfish G1 and the code-kb K3/K4 selection.

- R4 affected scope passed 41 tests with one explicit external skip after the `/tmp` quota recovery. The real-service baseline smoke passed with Goldfish `431f40c`, code-kb `f290fdc`, and the patched development-only client 2.4.0. Final combined acceptance remains pending code-kb selection. The lead added `.github/workflows/test.yml` dependency installation and isolated Git setup in the new tests. SDK install advisories were resolved before committing; `npm audit --audit-level=high` reports zero vulnerabilities.


### Behavioral gate follow-up

The first two actual fresh `gpt-6-sol`/high native sessions each scored 8/15 under the original frozen oracle; only worktree switching and unsupported-coverage fallback passed among the five new cases. Original packets, protocols, outputs, and reports are preserved unchanged. No retrospective regrade is used as agent success evidence.

A selective read-only Astra planning review separated source-required actions incorrectly rejected by the oracle from actual omissions. The lead applied these corrections and retained all publication, source-evidence, and authority boundaries:

| Surface | Source-backed correction |
|---|---|
| Approval | Permit authority/worktree checks required by finishing Steps 0/2a; still require a precommit checkpoint before requesting authority. |
| Single task | Permit focused tests required by TDD before review. |
| Interrupted run | Permit next-action selection and continuation after reconciliation and any actual commit record. |
| Approval-pause recovery | Permit live-commit verification, but retain explicit next-action identification and forbid another checkpoint or publication. |
| Duplicate installations | Permit reporting uncertainty required by the static doctor's unknown-runtime contract. |
| Missing tools | Accept focused reproduction or focused tests, and equivalent gap-reporting labels. Caller search itself supplies native text-search evidence; still require source reads, callers, focused evidence, gap reporting, and continuation. |

The pre-approval checkpoint reminder is now prominent in authority routing, and both Recovery sections explicitly require naming the next action. Three covering assertions failed before these changes and passed afterward. Collection instructions now uniformly require complete sequences and explicit intermediate decisions; no case-specific grading hints are supplied. One additional two-session batch on the same pinned harness/model will use newly generated packets and a frozen bundle/protocol hash. Its scores are not a causal comparison with the corrected original oracle. Any remaining failure stays recorded as incomplete behavioral acceptance.
