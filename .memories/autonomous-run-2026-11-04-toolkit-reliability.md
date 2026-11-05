# Toolkit reliability run report

Status: R1–R4 implementation and local verification completed on 2026-11-04. The final selected-revision combined gate passed at 19:52 UTC. The user's later publication approval and the v0.49.0 release work are recorded in the update at the end. Earlier pending-dependency text below records the original overnight handoff; see the final closure at the end.

## Scope and authority

Plan: `docs/plans/2026-11-03-toolkit-reliability-plan.md`, R1–R4. The user authorized implementation, useful subagents, verification, and local commits on 2026-11-03: "Implement docs/plans/2026-11-03-toolkit-reliability-plan.md. Use subagents where useful, verify, and commit locally. Don't push or release." The user later confirmed "goldfish completed, code-kb is running."

The 2026-11-03 implementation approval prohibited push and release. The user later approved integration, versioning, verification, push, tag, and GitHub release on 2026-11-04; this supersedes the original publication limit. No PR is part of the direct release path. Installation cleanup remains ungranted. External pre-merge reviewer: none. Security scanner scope: none declared by the plan. Privacy, process isolation, and direct-argv checks are required behavior tests.

Worktree: `/home/murphy/.config/razorback/worktrees/razorback/toolkit-reliability`.
Branch: `feat/toolkit-reliability`. Base: `7d870642287539d1261d2ee7e223db8a30a2a88e`.
Final tested source: `f4d7433be110335c4753c5125673067b45acaf0a`. The following handoff commit changes only the report, plan acceptance checkboxes, checkpoint, and evidence; it is separate from the tested implementation commit.

## Implementation

- R1, `117c761`: consistent recoverable-baseline rules and a bounded no-test-surface exception, preserving quick-fix limits and final branch gates.
- R2, `e2110fd` plus reviewed follow-ups: checkpoint-linked reports before unfinished stops, source and metadata SHA separation, live-state and authority verification on recovery, and no duplicate checkpoint for unchanged state.
- R3, `97bf9dd`: explicit-root, read-only toolkit doctor with text/JSON output, bounded symlink resolution, version/duplicate/hook/capability checks, and unknown runtime binding.
- R4, `6dcd2d5` plus expectation repairs: real isolated MCP runner and five blind workflow cases. The runner launches argv without a shell, scrubs inherited environment, uses temporary homes/projects/indexes, verifies explicit roots, and records source revisions and executable hashes. Ordinary tests skip the external case; the explicit command fails on missing prerequisites.
- `1101dc2`: synchronize optional generated npm lockfile root versions without changing dependency pins. CI installs the development-only MCP client using `npm ci --ignore-scripts`. No plugin version bump.

Four Luna implementers owned disjoint tasks; the lead reviewed their source and results, integrated their work, and fixed boundary and integration defects. Astra supplied selective read-only planning advice about the evaluator. All implementation work stayed in this worktree. The R-prefixed task headings required manual brief extraction because the existing helper accepts numeric headings; the helper itself was unchanged.

## Verification

| Scope | Command/evidence | Tested source | Result |
|---|---|---|---|
| Baseline | `npm test` | `7d87064` | 467 passed |
| R1 worker | `node --test tests/autonomous-process-gates.test.mjs tests/quick-fix-tier.test.mjs` | R1 diff committed as `117c761` | 23 passed |
| R2 worker | `node --test tests/workflow-execution-contracts.test.mjs tests/twin-sections.test.mjs` | R2 diff committed as `e2110fd` | 19 passed |
| R3 worker | `node --test tests/toolkit-doctor.test.mjs` | R3 diff committed as `97bf9dd` | 13 passed |
| Integrated R1–R3 | Five affected test files | `1101dc2`, outside R4 changes | 55 passed |
| Generated lock metadata | Version audit/sync/release test files | `1101dc2` | 22 passed; regression red then green |
| R4 affected scope | `node --test tests/workflow-eval.test.mjs tests/toolkit-integration.test.mjs` | R4 diff committed as `6dcd2d5` | 41 passed, one explicit external skip |
| Final evaluator | `node --test tests/workflow-eval.test.mjs` | native-evidence repair | 34 passed; new regressions red then green |
| Final local branch gate | `TMPDIR=<task-worktree>/.razorback/test-tmp npm test` | `f4d7433be110335c4753c5125673067b45acaf0a` | 505 passed, zero failed, one explicit external skip |
| Actual toolkit decisions | `toolkit-reliability-evidence/behavior-acceptance.json` | `d058cf3` and `f4d7433`, unchanged agent-facing source bytes | Two passing fresh observations per required case |
| Exploratory real services | `npm run test:integration -- --config <ignored-local-config>` | Goldfish `431f40c`, code-kb baseline `f290fdc`; runner committed as `6dcd2d5` | Passed at 2026-11-04 01:46 UTC; not final combined acceptance |

The final local command completed on 2026-11-04 UTC. Raw output and SHA-256 are committed in `toolkit-reliability-evidence/npm-test-final.log` and `verification-final.json`. The single skip states that `RAZORBACK_TOOLKIT_INTEGRATION_CONFIG` must name explicit local prerequisites. No model calls run in the ordinary suite or integration runner. Windows was not verified natively for Razorback in this session.

The exact development-only client pin is `@modelcontextprotocol/client@2.4.0`. The initial 2.0.0 trial produced npm advisories, so the lead patched it and verified zero npm vulnerabilities before the R4 source commit. The disclosed issues concern HTTP/OAuth, while this runner uses stdio. See [OAuth advisory](https://github.com/advisories/GHSA-6qxp-vccf-f47h) and [redirect advisory](https://github.com/advisories/GHSA-6prh-2h8m-c8cw).

## Fresh-agent evidence and preserved failures

All decision participants were fresh native `spawn_agent` sessions with `fork_turns: none`, model `gpt-6-sol`, reasoning `high`. The native API does not expose a harness version, model backend revision, token usage, or latency. Those measurements remain unavailable. Participants saw only blind scenario facts, the complete action vocabulary/schema, and unchanged included workflow text. Expectations and fixture answers were excluded.

| Frozen collection | Original results | Preserved evidence |
|---|---|---|
| Full bundle 1 | 8/15 and 8/15 | `agent-protocol.json`, `agent-run-1.json` through `agent-run-2.json`, original reports, `agent-attempts-batch-1.json` |
| Full bundle 2 | 13/15 and 11/15 | `agent-protocol-v2.json`, runs/reports 3–4, `agent-attempts-batch-2.json` |
| Full bundle 3 | 11/15 and 12/15 | `agent-protocol-v3.json`, runs/reports 5–6, `agent-attempts-batch-3.json` |
| First per-case collection | 2/5 and 1/5 | `agent-protocol-case-scoped.json`, `agent-case-scoped-result.json`, original views/prompts/answers/reports |
| Prospective per-case collection | 2/5 and 4/5 | `agent-protocol-case-final.json`, `agent-final-scoped-result.json`, original views/prompts/answers/reports |
| Three affected cases after repairs | 3/3 and 3/3 | `agent-protocol-affected.json`, `agent-affected-scoped-result.json`, original views/prompts/answers/reports |

Early bundled traces genuinely omitted the pre-approval checkpoint; guidance now foregrounds it. Other failures exposed over-restrictive expectation lists that rejected source-required commits, root binding, live Git inspection, recovery reviews, or permitted continuation. Red/green tests cover each source-backed correction. The missing-tool scenario now states its go/no-go boundary explicitly, without supplying expected actions.

Source review also corrected an invented mandatory gap report in the missing-tool case. Bootstrap rule 5 requires reporting evidence that cannot establish an API shape. It does not require inventing a gap merely because code-kb is absent when native source, caller search, and focused reproduction provide evidence. The unsupported-structural-coverage case still requires a gap report. Mandatory source/caller/reproduction, checkpoint/commit, authority, root-binding, and coverage boundaries remain enforced. The final amendments accept permitted plan/Git inspection, static warning reads, evidence preservation, and next-action identification with relevant ordering checks.

Every completed output and original grading report remains unchanged. Nothing was retrospectively counted as passing, and no fixture answers were added to agent results. The documented per-case collection removes unrelated legacy scenarios from each participant's context. The trusted full-bundle grader is unchanged: its raw five-case reports exit 1 with exactly ten intentionally missing legacy cases; its three-case reports retain exactly twelve missing cases. Scoped acceptance requires zero failed selected cases and exactly those expected missing-case errors. No full 15-case agent success is claimed.

Final scope acceptance uses six fresh passing decisions for the three repaired cases, plus four passing decisions for the two unchanged cases from the preceding prospective collection. The acceptance artifact checks their expectation entries for equality and their agent-facing source-set hashes for equality. Each original report remains bound to its own original packet IDs and source revision. All five required cases have two passing observations. The earlier failures prevent a broad reliability, comparative improvement, token-saving, or latency claim.

## Real-service status and remaining gate

Goldfish G1 is completed at clean worktree `/home/murphy/source/goldfish/.worktrees/toolkit-hardening`, branch `feat/toolkit-hardening`, commit `431f40c0c4f237f9f687f626ef0c155912c0284d`. Its runtime was verified upstream at `d93420d`; later commits record metadata. The exploratory runner selected `431f40c`.

code-kb's active worktree is `/home/murphy/.codex/worktrees/dd7b/code-kb`, branch `toolkit-efficiency`, last inspected clean at `98644c4aff7bd5489b59d279cb611471f573b91a`. K3 is still running after an unexposed fixture-setup repair. No K3/K4 selection exists. The `3dc4d5d` candidate is not accepted, and the exploratory baseline is not a substitute for the required final disposition.

The real-service smoke passed after source-backed assertion corrections: Goldfish stores a short captured SHA and folds YAML, and code-kb's negative lookup may include suggestions. The runner verifies the full tested SHA in the report, next action through fresh recall, and absent declarations rather than fragile formatting. The committed raw artifact is `toolkit-reliability-evidence/baseline-integration-smoke.json`.

Isolated Git rejected a globally ignored local settings file in the code-kb main checkout. No user file was changed. The exploratory smoke therefore used a clean detached `f290fdc` source snapshot under this task's ignored scratch directory, with the baseline executable. That task-owned snapshot was removed using ordinary `git worktree remove` after verifying it was clean; no unrelated worktree was removed. Its ignored launch config is retained as `.razorback/toolkit-integration-smoke-used.json` for historical inspection and contains a removed fixture path. It must not be reused as the final config. No machine-specific launch configuration is committed.

Next: after code-kb completes K3/K4, read its final candidate/baseline disposition and runtime manifest, verify the selected clean source and executable, and create a fresh explicit ignored integration config. Recheck Goldfish, Razorback, and all related worktrees. Run `npm run test:integration -- --config <absolute-config>` against those selected revisions. Record both source commits and executable hashes before marking R4 complete. A documented negative result that selects the unchanged baseline is allowed by the plan. A moving or discarded candidate is not.

## Installation findings

The read-only doctor reproduced 32 duplicate skills in the selected roots. Exact redundant registrations: `/home/murphy/.codex/skills/razorback` and `/home/murphy/.agents/skills/razorback`; both symlink to `/home/murphy/source/razorback/skills`. The selected cached plugin `/home/murphy/.codex/plugins/cache/razorback/razorback/0.48.8` is the canonical installed source. Runtime host binding remains unknown from static metadata. Raw findings: `toolkit-reliability-evidence/doctor.json`.

Cleanup requires separate user authority: remove only the two redundant symlink registrations, retain the source and cached plugin trees, restart the host, and verify its fresh inventory. This run made no installation changes. Equivalent Goldfish registration paths were absent, so this report does not claim a current Goldfish duplicate.

## Source-control and recovery

The original Razorback main checkout remains clean at `7d87064`, one planning commit ahead of origin. The retained `linear-hardening` worktree remains clean at `23a2fb7`; it is an ancestor of main and unrelated to this task. All task implementation and evidence commits remain on `feat/toolkit-reliability`. No task changes are stranded in another Razorback worktree.

An unexpected `/tmp` user quota caused `EDQUOT` despite available filesystem space. Failing test IDs passed with task-local TMPDIR, then the affected wider scope passed. Later verification consistently used task-local TMPDIR; no other session's files were deleted. Earlier smoke and command logs remain ignored scratch evidence; the final raw results and all agent attempts are committed here.

A final Goldfish checkpoint points to this report and records the tested source, plan/task, branch/worktree, user authority source, and remaining next action before its metadata commit. On resume, recall it using this exact worktree as workspace, read this report, and verify current Git state, tested evidence, authority, and external disposition before acting. An unchanged resume needs no new checkpoint. At that checkpoint's creation, push/release remained prohibited; the later approval is recorded below.

## Final combined gate closed, 2026-11-04 19:52 UTC

The coordinating Goldfish session selected clean Goldfish `431f40c` and code-kb `571e7fa` after the frozen experiment rejected and restored its candidate. The retained code-kb binary is the verified current 2.12.0 runtime from source `f290fdc`, hash `d3f913db2025339a3496f85017eeaee98542f78afa2f654aacbdf2cc108221d2`; Julie remains 3.11.0. Native Git comparison confirmed the final efficiency branch has unchanged runtime sources and dependency manifests.

With runner `78c1a07`, a fresh explicit ignored config and task-local TMPDIR, `npm run test:integration -- --config <absolute-config>` passed all five real-service/structural checks. The report is committed as `toolkit-reliability-evidence/final-integration.json`. Current packet source-set hash `cee06cf461b8b531ebb102bd9e5733256514d35485385ea67918e46700eb5556`, all ten answer/report hashes, and the 505-pass local-test log hash were independently verified. Existing scoped agent evidence remains valid; no new model trials were dispatched.

This closes R4. Preserve earlier failed outputs, limits and the old smoke config as historical evidence. Do not rerun the unchanged final gate merely because the earlier section says pending. Only metadata changes follow this tested runner revision. At that time, integration, publication, and installation cleanup still needed separate authorization. The separate Julie 3.12 branch required its own selection and acceptance if included in a rollout. Full assessment: `/home/murphy/source/goldfish/.worktrees/toolkit-hardening/docs/reviews/2026-11-04-toolkit-plan-evaluation.md`.

## v0.49.0 release update, 2026-11-05

The user later explicitly approved Razorback integration, versioning, verification, push, tag, and GitHub publication with "approved, do all of it." This supersedes the implementation request's earlier local-only limit. Duplicate registration cleanup remains separate and unauthorized.

The clean `feat/toolkit-reliability` tip `1b3575f` was fast-forwarded into `main`. The release commit is `4ebc9d3a6ae5d1f8c82f7744383bafc01e89a4e2`; its annotated `v0.49.0` tag points to that commit. The version bump used `scripts/bump-version.sh 0.49.0`; all five declared manifests and both npm lock root versions agree, with dependency pins unchanged.

Verification on the release source: `npm test` passed 505 tests with one explicit external-integration skip; `scripts/bump-version.sh --check 0.49.0` and `--audit` passed. The latest combined gate passed all five checks against Goldfish `0f74184` and the Julie 3.12 code-kb runtime built from `a07c195` (SHA-256 `ae131d03aebabf97a72296e873444c5c6c8436be1dfa5b24eb64dca09d32ffb7`). The blind workflow evidence remains scoped to two passing fresh-agent observations per required case; earlier failures remain preserved. No full 15-case model success or performance claim is made.

After creating the local tag, `git fetch origin` pruned it because global `/home/murphy/.gitconfig` sets `fetch.pruneTags=true`. The remote still had `main` at `e53a9ee` and did not have `v0.49.0`; no remote ref was changed. The same annotated tag was recreated at `4ebc9d3`, and global Git configuration was left untouched.

Publication completed on 2026-11-05 at 01:03:49 UTC. `git push --follow-tags origin main` advanced `main` to `03e6763da2e45684d66641dd5fced2f953ce337f` and published annotated tag `v0.49.0` at release commit `4ebc9d3a6ae5d1f8c82f7744383bafc01e89a4e2`. `scripts/bump-version.sh --release 0.49.0` created [the GitHub release](https://github.com/anortham/razorback/releases/tag/v0.49.0).

GitHub Actions passed for both refs: branch `main` at `03e6763` passed run [41945827302](https://github.com/anortham/razorback/actions/runs/41945827302); tag `v0.49.0` at `4ebc9d3` passed run [41945827229](https://github.com/anortham/razorback/actions/runs/41945827229). The tag workflow includes the manifest-to-tag version check. This release leaves the duplicate global registration cleanup unauthorized and untouched.
