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
