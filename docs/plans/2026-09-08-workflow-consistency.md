# Workflow consistency and behavioral evaluation

## Direction and authorization

The user approved fixing all findings from the September 8 workflow assessment. Preserve the personal Miller/Goldfish workflow, existing process stages, two-pass lead review, deliberate architecture-checklist copies, and frozen Cursor support. Implement and verify locally; this request does not authorize push, deployment, release, or external paid model calls. The previously uncommitted Miller-guidance edit is copied into this worktree and preserved in the final result; its original source copy remains untouched.

Task worktree: `/home/murphy/.config/razorback/worktrees/razorback/workflow-consistency`, branch `codex/workflow-consistency`, base `464d4d317c206335e0b67ffdbc4f45a8e962b5e8`. The clean `codex/linear-hardening` worktree remains separate.

## Design

Razorback owns task routing, approval boundaries, recovery, and verification. Live Miller instructions own code-intelligence operations. Live Goldfish instructions own memory binding and checkpoint requirements. System/developer instructions retain their actual priority; repository instructions and skills cannot redefine it.

Plan approval records execution authority separately from push and PR authority. Local commits follow the existing user/repository rules; this fix adds no new commit-approval gate or pending-commit execution state. Explicit restrictions on committing remain existing approval boundaries. Already-authorized pushes and PRs remain autonomous. If publication needs approval, complete local implementation, verification, and review materials first, then ask only for the missing authority. Render awaiting-approval status before committing the report; persist approval-resumption metadata and check cleanliness before any push. Recover transient push failures safely; inspect the remote before retrying an uncertain result, never force-push or rewrite history without authorization.

Checkpoint before each commit that Goldfish requires, stage that checkpoint with the intended source changes, and record the actual commit SHA in the task ledger afterward. Phase checkpoints remain useful but cannot suppress required pre-commit memory. Serial workers own their checkpoint; parallel workers leave checkpoint/staging/commit ownership to the lead.

Use delegation when available and consistent with the user's instructions, including a single task. Serialize dependent tasks; task count alone does not disable delegation. A missing native task tool uses durable plan/ledger tracking rather than an invented tool.

The explicit exception to direct Miller access is a restricted external review process that cannot load MCP. The lead still grounds the review with Miller and supplies a sanitized evidence bundle. Preserve the reviewer's enforced read-only environment; this exception does not permit general grep fallbacks during development or debt auditing.

Behavioral evaluation uses checked-in raw scenarios, blind packets containing the selected workflow text, structured agent decisions, and a deterministic grader. Expectations stay outside the blind packet. Include ordered-action and forbidden-action checks, missing/duplicate case handling, and provenance. Model dispatch stays harness-native and explicit; CI validates the runner and fixtures without credentials or model spend. Record actual baseline and revised agent outputs honestly; a passing baseline is not a fabricated regression.

## Architecture Quality

- Affected modules: workflow skill contracts and host copies; an independent local evaluation CLI.
- Caller-facing interface: consistent instructions plus a prepare/grade command for scenario packets and agent answers.
- Depth/locality: keep tool implementation details with their providers and evaluation validation in one module; no new workflow engine or provider SDK.
- Test surface: existing skill/host guards, new contract guards, evaluation CLI subprocess tests, fresh-agent scenario runs.
- Seams/adapters: the evaluation packet/answer files are the sole boundary to a model; no new network dependency.
- Rejected shortcuts: weakening read-only reviewers, silently permitting grep, claiming phrase checks prove agent behavior, hardcoding an always-green answer set, or pushing without authority.
- Architecture risk: low; existing workflow remains, contradictions are resolved, evaluator is isolated from production execution.

## Parallel Execution Contract

All implementation workers use `parallel-lead-commit`; none stages or commits. The lead reviews the integrated files, checkpoints, and commits the verified result. The user approved the fixes in this session; no redundant design/plan approval is needed.

| Task | Ownership | Serialization required | Dependency reason |
|---|---|---|---|
| A: execution contracts | writing-plans, finishing, SDD/executing-plans, brainstorming and their prompts; dedicated execution guards | No | Distinct from tool guidance and evaluator |
| B: tool/instruction contracts | using-razorback, codex mapping, harvesting-debt, restricted-review guidance, CLAUDE.md and synchronized host rule copies; dedicated tool guards | No | Must coordinate only the single-task routing wording with A |
| C: behavioral evaluation | evaluation script, scenario fixtures, runner tests, usage documentation, package.json command | No | Can prepare baseline packets before edits and later prepare revised packets from integrated files |
| D: integration | lead plan/checkpoint/review; fix routing to owning worker | Yes | Requires A-C output |

## Acceptance criteria

- [x] Approval/finish contract distinguishes local implementation from push/PR authority, preserves existing commit rules, and respects prior authorization.
- [x] Push failures use bounded safe recovery and remote-state checks; genuine permission/auth/history blockers remain boundaries.
- [x] Goldfish pre-commit checkpoint requirements and explicit staging align across serial/parallel execution and finish.
- [x] All current single-task routing descriptions agree and no-delegation fallback remains usable.
- [x] Instruction priority is correct and pending live-Miller guidance is preserved.
- [x] Restricted external reviewer exception is explicit at enforcement points without weakening isolation.
- [x] Debt audit uses current Miller modes, handles unavailable tools without forbidden shell search, and reports incomplete evidence honestly.
- [x] Codex mapping defers to live schemas, handles message wakes versus completion, and gives a durable task-tracking fallback.
- [x] Repeatable blind decision scenarios cover approvals, recovery, checkpoints, single tasks, unavailable Miller, restricted reviewers, live tools, instruction priority, compaction, and parallel staging.
- [x] Grader rejects incomplete/malformed/unsafe decisions; expectations never enter evaluator packets.
- [x] Fresh baseline and revised agent runs are recorded; behavior results are distinguished from deterministic guard results.
- [x] Host-copy checks, focused tests, complete suite, whitespace check, and version audit pass.
- [x] Original source edit remains unchanged and all worktrees are accounted for.

## Verification Strategy

- Baseline: existing `npm test`, captured once during worktree setup.
- Worker scope: `node --test tests/<owned-test>.test.mjs` plus existing focused guard files discovered with Miller; new guards fail on old instructions before edits.
- Behavioral scope: prepare blind packets, dispatch fresh native Sol evaluators, grade their captured structured outputs, and repair any failed scenario before repeating that scope.
- Branch gate: `npm test`, `git diff --check`, `./scripts/bump-version.sh --audit`, plus behavioral results for the integrated workflow.
- Security scopes: no new dependencies or outbound model transport; runner tests must establish no model calls and no packet leakage of expected answers. Existing full-suite security guards remain required.
- External reviewer: none. Lead performs specification and quality review.

## Progress

- [x] Assessment findings verified against current files; unrelated worktree inventoried.
- [x] Isolated baseline and current-rule decision experiment recorded.
- [x] A: execution contracts implemented and reviewed.
- [x] B: tool/instruction contracts implemented and reviewed.
- [x] C: evaluation runner and scenarios implemented and reviewed.
- [x] D: integrated verification, memory checkpoint, local commit, final state report.

## Integration decisions

- Lead review removed an unnecessary missing-commit-authority state proposed during implementation. It was outside the original push/PR finding and created conflicts with SHA-based recovery and pre-merge review. Existing explicit commit restrictions remain binding; routine implementation does not acquire another approval gate.
- Before formal behavioral grading, lead review found oracle gaps: completion could precede reconciliation, and staging could precede checkpoint creation. These are corrected with order constraints. Scenario boundaries distinguish a planned successful sequence from an immediate next action, and missing-service reports may include one legitimate restoration question. The earlier frozen-packet run is a pilot, not a formal before/after score.


## Final verification ledger

- Worker A: original execution guards failed 4/4, then affected scopes passed 78/78; final post-PR checkpoint correction passed 36/36.
- Worker B: original tool guards failed 4/4, then affected scopes passed 80/80; debt coverage follow-up passed 12/12; hook-invariant integration correction passed 25/25.
- Worker C: evaluator CLI tests began RED; final suite passed 25/25, including safe alternatives, unsafe ordering, mismatched packet IDs, and path safety.
- Integrated branch gate: `npm test` passed 419/419, zero failed/skipped, 5.210 seconds; `git diff --check` and `./scripts/bump-version.sh --audit` passed. All five manifests remain synchronized; no release was requested.
- Blind paired runs: baseline and revised answers each passed 10/10 under the identical final expectation hash `3351b6a84ac4227557fa7e3b257d8028162a3968fc6effd4333689d8e2c3e30e`. Frozen revised packets matched a fresh preparation from the final workflow files before commit.
- This is decision-regression evidence, not evidence of increased compliance, lower token cost, or successful real-host execution. Early non-passing scores exposed scorer false positives and were calibrated against the intended behavior; packets and model answers were not rewritten to pass.
- Source review: lead checked specification compliance and code quality, routed corrections to Sol owners, and inspected the final grader with Miller. Miller source/content indexes refreshed to revision 6098; vector draining still reports a resident-leader requirement, so no semantic-retrieval health claim is made.
- Evidence: `.memories/2026-09-08/workflow-evaluation/` contains frozen compressed packets, untouched answers, final reports with rubric hash, calibration reports, worker reports, and the compressed full-suite log.
- Source checkout remains main with its original bootstrap edit (SHA-256 `683dae713ee6578db7235ec231890f77a604a49c58ff068cd738ccc86cff9deb`) and review checkpoint untouched. The existing linear-hardening worktree is clean with no commits unique to main. All task changes are kept on codex/workflow-consistency for a local commit; no push, PR, installation, or release is authorized or performed.
