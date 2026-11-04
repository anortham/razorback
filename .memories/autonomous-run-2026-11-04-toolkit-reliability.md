# Toolkit reliability run report

Status: In progress. Final combined acceptance is pending external prerequisites.

## Scope and authority

Plan: `docs/plans/2026-11-03-toolkit-reliability-plan.md`, tasks R1–R4.

The user authorized implementation, useful subagents, verification, and local commits on 2026-11-03. The user explicitly said: "Don’t push or release." Push and release are prohibited for this run; PR creation and installation cleanup were not authorized. This is a local implementation handoff, not a publication approval request. External reviewer: none. Additional security scanners: none declared by the plan.

Worktree: `/home/murphy/.config/razorback/worktrees/razorback/toolkit-reliability`.
Branch: `feat/toolkit-reliability`. Base: `7d870642287539d1261d2ee7e223db8a30a2a88e`.

## Work completed

- R1: consistent baseline recovery and the bounded no-test-surface exception; local commit `117c761`.
- R2: checkpoint-linked handoffs and recovery; commit `e2110fd`.
- R3: explicitly scoped static doctor; commit `97bf9dd`. Live inspection reproduced 32 duplicate skills.
- R4: runner and five blind cases implemented; lead is completing verification. Real-service smoke passed; fresh-agent trials are pending.

## Verification ledger

| Scope | Command | Tested source | Result | UTC time |
|---|---|---|---|---|
| baseline | `npm test` | `7d87064` | 467 passed | 2026-11-04 |
| worker-ceiling R1 | `node --test tests/autonomous-process-gates.test.mjs tests/quick-fix-tier.test.mjs` | R1 diff committed as `117c761` | 23 passed | 2026-11-04 00:58 |

The final tested source commit will be recorded separately from this report's later metadata commit. No final branch gate has yet been claimed.

## External prerequisite state

Goldfish source: `/home/murphy/source/goldfish`, `main`, `9504fa8` at initial inspection. Its G1 import containment implementation was absent. code-kb source: `/home/murphy/source/code-kb`, `main`, `f290fdc` at initial inspection. Its K3/K4 selected candidate/baseline disposition was absent. Both checkouts contained planning commits. These baselines can support exploratory runner smoke testing; they cannot satisfy the final combined gate.

The explicit test configuration lives in ignored `.razorback/toolkit-integration.json`. It contains absolute argv launch inputs confirmed from source manifests/docs. No machine-specific launch configuration is committed.

## Installation findings and proposed cleanup

The inspected exact registrations are `/home/murphy/.codex/skills/razorback` and `/home/murphy/.agents/skills/razorback`; both are symlinks to `/home/murphy/source/razorback/skills`. The selected cached plugin is `/home/murphy/.codex/plugins/cache/razorback/razorback/0.48.8`. The Codex install documentation prefers the plugin path; the local symlinks are the development fallback.

Proposed cleanup, awaiting separate authority: remove only those two redundant symlink registrations, retain the source checkout and cached plugin tree, then restart the host and verify its fresh discovered skill inventory. This run makes no installation changes. The two equivalent Goldfish registration paths were absent during this inspection, so the earlier Goldfish duplicate observation is not claimed as a current finding.

## Decisions and limits

- The plan's R-prefixed task headings are unsupported by the numeric-only task-brief helper. Briefs were extracted directly without changing the helper.
- R4 runner construction began against stable contracts while R3 finished. The design explicitly permits earlier construction; shared package edits remain serialized, and final acceptance waits for reviewed R3 and external prerequisites.
- SDK contracts were initially verified from installed Goldfish `@modelcontextprotocol/client` 2.0.0 declarations, Goldfish tests, and the official tutorial at https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/get-started/first-client.md. No hand-written MCP protocol client is used.
- Existing `linear-hardening` worktree is unrelated, clean, and had no commits ahead of main during initial inventory. The original main checkout remains outside this task's edits.

## Next action

Finish and verify the Razorback-owned work. When Goldfish G1 and the final code-kb K3/K4 disposition exist, select their exact clean revisions, supply an explicit ignored test config, and run the strict combined gate. Preserve the user's no-push/no-release direction.

## Lead verification updates

- The integrated R1–R3 affected-change command passed 55 tests. The generated-lock maintenance change is committed as `1101dc2`; all 22 focused version checks passed. CI now installs the dev client with `npm ci --ignore-scripts`.
- Patched exact development-only SDK pin to 2.4.0 after npm reported advisories against 2.0.0; `npm audit --audit-level=high` now reports zero vulnerabilities. The advisories cover HTTP/OAuth use, not the stdio fixture transport. Sources: [OAuth advisory](https://github.com/advisories/GHSA-6qxp-vccf-f47h) and [redirect advisory](https://github.com/advisories/GHSA-6prh-2h8m-c8cw).
- Goldfish completed its hardening work at clean checkout `/home/murphy/source/goldfish/.worktrees/toolkit-hardening`, HEAD `431f40c` (runtime tested upstream at `d93420d`, later metadata only). The explicit smoke selects it.
- code-kb main is clean under the user's normal Git configuration but has a globally ignored local settings file. Isolated Git deliberately ignores global configuration and rejected it. No user file was changed. The smoke therefore uses a clean detached `f290fdc` source worktree under `.razorback/code-kb-smoke-source`, with the existing baseline executable. The active `toolkit-efficiency` worktree is still preparing K1; no K3/K4 selection exists.
- Real-service smoke attempt 6 passed at 2026-11-04 01:46 UTC. Earlier attempts exposed source-backed runner assertion errors: Goldfish stores a short captured SHA, its YAML folds the long next field, and code-kb negative lookups can prepend suggestions. Assertions now verify full tested SHA and worktree in the description, `next` through fresh recall, and absent declarations rather than exact missing-path formatting. Failed attempts remain in ignored `.razorback/integration-smoke-*` artifacts.
- The next focused run hit `EDQUOT` (errno 122) in `/tmp`; `findmnt` confirms a user-quota-enabled tmpfs with free filesystem space. Verification now uses task-local `.razorback/test-tmp` as TMPDIR. Only task-owned temporary data is moved; nothing belonging to another session is deleted. Failed test IDs are being rerun before the wider affected scope.

## First behavioral batch and follow-up

Both actual fresh sessions scored 8/15 under their original frozen oracle, with only two of five new cases passing in each. Raw outputs and original grading reports are immutable in `toolkit-reliability-evidence/`; `agent-attempts-batch-1.json` records their hashes. The agent omitted the required pre-approval checkpoint. Other failures exposed rejected source-required actions and undefined distinctions among test/gap action labels.

After selective Astra planning advice, the lead corrected those oracle defects without removing the checkpoint, authority, source, caller, focused-evidence, or continuation requirements. Guidance now foregrounds the pre-approval checkpoint and explicitly names the recovery next action. The three new regression assertions were red before the fix and green afterward. A second two-session batch will use new content-bound packets and uniformly clarified collection instructions. Old attempts will not be regraded or relabeled as passing. The initial full local suite reported 499 pass, one failure, one skip; its single failure was an exact-wording fallback guard, repaired and verified narrowly. Final branch verification is still required after the follow-up.


### Remaining oracle defects found by batch two

Batch two closed as failed under its own frozen protocol: 13/15 and 11/15. Both actual traces now include the approval checkpoint. Remaining false positives rejected committing that checkpoint, explicit workspace binding, Git inspection, or continuing after a coverage report. Finishing Step 4, explicit-root policy, and the scenario continuation boundaries require or permit these actions. The oracle now accepts them and strengthens approval acceptance to require checkpoint, staging, and commit in order before asking. A new regression was red before the correction and green afterward; omission of the commit remains rejected. The missing-tool case now asks explicitly for the go/no-go decision after evidence gathering, resolving an ambiguous stage boundary without supplying action names or hidden predicates.

The original two protocols and all four outputs/reports stay immutable and failed under their respective original oracles. This source-backed repair is a new bounded post-fix verification batch, not an extension or retrospective regrade of batch two. The earlier stop assumption was invalid because the oracle still contradicted required source actions; leaving those defects would violate the task's correctness requirement. Freeze two fresh sessions on the same pin after deterministic verification. No efficiency, comparative quality, or causal score-improvement claim follows from these calibration runs.


### Case-scoped collection

Batch three is closed with frozen results 11/15 and 12/15. It still contains genuine omitted checkpoint/gap steps, plus rejected recovery inspections that the shared Recovery source permits. Those remaining oracle contradictions were fixed with red/green regressions; no mandatory checkpoint, commit, evidence, or authority gate was removed.

The documented collection method permits one case plus the bundle source, vocabulary, and schema. The remaining verification therefore uses two fresh contexts per required toolkit case, without the ten unrelated legacy scenarios in each context. All six earlier bundled outputs remain unchanged and are not reclassified as passing. This changes collection granularity, not the grader or its full-case-set requirement. The original full packet bundle stays immutable. The grader's complete reports will retain the ten intentional out-of-scope missing-case errors; a separate scoped result can pass only if all five required cases pass and those are the only missing cases. No fixture answers or retagged historical answers are supplied. This scope is exactly the five new cases required by R4, and no full-bundle agent success will be claimed.


### Case-scoped results and final oracle repair

Ten actual fresh sessions completed. The frozen scoped results were 2/5 and 1/5; their complete reports retain exactly the ten expected missing legacy cases and are preserved without regrading. Source inspection showed the fallback policy only requires reporting an actual evidence gap, not inventing one solely because code-kb is unavailable. The scenario provides native source, caller search, and focused reproduction. Requiring a gap report there was an oracle defect. Unsupported structural coverage still requires a gap report. The oracle also rejected source-permitted task reconciliation, continuation, Git inspection, next-action identification, evidence preservation, and equivalent gap labels. These source-backed corrections have a red/green regression; all 34 evaluator tests pass. No mandatory source/caller/reproduction, authority, root-binding, unsupported-coverage, or checkpoint gate is removed. The completed batch remains failed. A separate prospective validation after committing these fixes is needed; it cannot reuse those outputs or claim that they passed.
