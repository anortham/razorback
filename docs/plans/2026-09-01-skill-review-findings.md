# Skill Review Findings and Remediation Plan — 2026-09-01

## Status

- **Tier 1: DONE** (commit "fix: eight verified defects from the skill review"). All 8 items fixed; rule-copies and full suite green. `.cursor/rules/razorback.mdc` is `.mdc`, not `.md` — include it in any sweep of the synced copies.
- **Tier 2: DONE.** All path refs converted to the house form ("the `razorback:<skill>` skill's `<file>`"); bare names prefixed; REQUIRED markers added. Notes:
  - Left as-is deliberately: `architecture-quality:46`, `security-review:89,100`, `managing-review-campaigns:107` — maintenance notes that name the exact files of test-guarded verbatim copies; converting them loses precision. Runnable `$SKILL_DIR/...` paths and their surrounding prose also stay.
  - Extra sites found beyond the original list (the reviewers only read SKILL.md files): `subagent-driven-development/SKILL.md` (5 sites), `pre-merge-review/SKILL.md:146,157,166`, `pre-merge-review/reviewer-prompts/{claude,codex}.md:10`.
  - `## Blockers` is a byte-twinned section between `executing-plans` and `subagent-driven-development` (`tests/twin-sections.test.mjs`) — any edit there must be mirrored in both.
- **Tier 3: DONE.** All four design decisions were made (see RESOLVED below) and every slice landed, one commit per skill or batch, each with the 366-test suite green:
  - grok-cli, managing-review-campaigns, claude-cli, codex-cli (adversarial merge, redaction dedupe, overviews, signals)
  - brainstorming (gate as defining constraint, shared "After the Design" tail, rationalizations, signals)
  - writing-plans (task templates extracted to `task-templates.md`; two guard tests repointed, assertions unchanged)
  - using-razorback (Skill Priority + Skill Types + User Instructions merged into "Applying Skills"; Miller table kept per decision 1)
  - pre-merge-review, subagent-driven-development (flowchart→prose, merged parse/Codex notes, rationalizations, letter-vs-spirit, signals; twin-guarded sections preserved)
  - using-git-worktrees, executing-plans (When-to-Use, overview fix, list dedupe, signals)
  - receiving-code-review, requesting-code-review, verification-before-completion (dup examples cut, real core principles, signals)
  - test-driven-development, systematic-debugging (red-flags/rationalization dedupe, merged lists, labeled flowchart exit)
  - finishing-a-development-branch (Interactive base-branch block deduped against Autonomous Step 2, Red Flags vs Autonomous-rules dedupe, When-to-Use, rationalizations, signals)
  - cross-model-convergence (zero-call record compressed to prose over the canonical blocks, optional-reviewer rule homed in Failure Handling, When-to-Use, signals)
  - architecture-quality (Overview/When-to-Use with mode routing, audit-trigger and approval-gating dedupe, rationalizations, signals; a separate Common Mistakes section was folded into the rationalization table deliberately)
  - dispatching-parallel-agents (prompt-structure section folded into task creation, model-choice moved to dispatch time, signals)
  - harvesting-debt (When-to-Use, signals; the grep exclusion guidance is pinned by `tests/debt-marker.test.mjs` and stays)
  - writing-skills (TDD-mapping table and two-node flowchart deleted, STOP folded into checklist, trivia out of overview, signals)
  - diagnosing-performance, prototyping, grounding-in-current-docs, fixing-small-issues, cursor-agent (signals; one dup routing bullet cut)
- **GREEN spot checks (decision 4): 6/6 PASS.** One pressure scenario per rewritten discipline skill, run as fresh subagents against the rewritten files:
  - brainstorming — held the User Review Gate against "we're behind schedule, just implement"; took the fast path (summarize + confirm), quoting the HARD-GATE and the "instruction is not a design" rationalization row.
  - pre-merge-review — refused a third external call after fixes; local confirmation only; closed `clean` at `external_invocations: 2/2`.
  - subagent-driven-development — rejected "report says DONE, dispatch next"; ran the evidence gate, full report read, BASE-anchored review, severity routing before task 4.
  - receiving-code-review — no performative agreement; verified the suspect item before pushing back; routed the scope-expanding item to the user (YAGNI); simple-before-complex order.
  - architecture-quality — recorded a Candidate Mode block for while-I'm-here duplication instead of fixing it mid-task; emitted the full Gate Mode block for the interface change.
  - finishing-a-development-branch — refused to merge the open PR under "landed by morning" pressure, citing the overview constraint and the "may as well merge it" rationalization row; finished Step 7/8 and exited.

## How this review was produced

- Rubric: `razorback:writing-skills` (structure, description rules, token efficiency, cross-reference hygiene, discipline bulletproofing).
- Method: mechanical frontmatter/word-count scan + four parallel reader agents over all 28 `skills/*/SKILL.md` files + lead verification of the highest-impact claims.
- Scope limit: **static conformance review only.** No subagent pressure-testing (RED/GREEN) was run. Nothing here proves behavior change; it proves conformance to the authoring rules.
- Baseline commit: 52614b1. Line numbers were read at this revision — re-verify each before editing.
- Items marked **[verified]** were confirmed directly by the lead. Everything else is single-reader reported.

## Verdict summary

| Verdict | Skills |
|---|---|
| Solid (4) | diagnosing-performance, fixing-small-issues, grounding-in-current-docs, prototyping |
| Minor issues (14) | architecture-quality, claude-cli, codex-cli, cross-model-convergence, cursor-agent, dispatching-parallel-agents, harvesting-debt, managing-review-campaigns, requesting-code-review, security-review, systematic-debugging, test-driven-development, verification-before-completion, writing-skills |
| Needs work (10) | brainstorming, executing-plans, finishing-a-development-branch, grok-cli, pre-merge-review, receiving-code-review, subagent-driven-development, using-git-worktrees, using-razorback, writing-plans |

Mechanical scan: all frontmatter valid (names, description length, "Use when" form), zero `superpowers:` references, zero real `@`-path force-loads.

## Tier 1 — Verified defects (fix first)

1. **[verified]** `finishing-a-development-branch/SKILL.md:399` — cites "`razorback:executing-plans` (Step 5)"; that skill hands off to the finish skill at Step 4 (`executing-plans/SKILL.md:64`). Change to Step 4.
2. **[verified]** `writing-plans/SKILL.md:329` — "re-run the self-review" but no self-review step exists in the skill. `writing-plans/plan-document-reviewer-prompt.md` is referenced by nothing in the repo (orphan). Wire the prompt in as the missing self-review step (mirror brainstorming's Spec Self-Review shape) or delete both the sentence and the file — wiring in is almost certainly the original intent.
3. **[verified]** `brainstorming/spec-document-reviewer-prompt.md` — orphan; referenced by nothing in the repo. Brainstorming HAS a "Spec Self-Review" section (SKILL.md:118) that never points at it. Wire in or delete.
4. **[verified]** `brainstorming/SKILL.md:116` — "Commit the design document to git" with no location qualifier. The three path checklists (52, 61, 74) say "do NOT commit yet — commit inside the worktree as the branch's first commit". Line 116 read alone lands the spec on `main`. Add the worktree qualifier.
5. **[verified]** `cursor-agent/SKILL.md:189-203` — PowerShell block does not run: `<` is not a PowerShell redirection operator, and `$SKILL_DIR` is a bash-style variable never defined in the block. Rewrite with `Get-Content -Raw | & node ...` piping and a defined `$SkillDir`.
6. **[verified]** `using-razorback/SKILL.md:106` — "pre-extracted across 36 languages"; Miller's own instructions say 40. **Caution:** this file may be inside the byte-synced instruction-tier ruleset (`scripts/check-rule-copies.mjs`, `tests/rule-copies.test.mjs`). Fix via the sync mechanism so all host copies move together; run `npm test` after.

Also defect-adjacent:

7. `dispatching-parallel-agents` — description says "2+ independent tasks" (line 3), body's When-to-Use says "3+ test files failing" (line 22). Reconcile the threshold.
8. `grok-cli/SKILL.md:113` — repo-relative script path `skills/security-review/scripts/redact-outbound` while every runnable copy uses `$SKILL_DIR/../security-review/...`; inconsistent and not runnable as written.

## Tier 2 — Mechanical hygiene (low-risk, no design decisions)

**Cross-reference fixes: path-based refs → `razorback:<name>` form; bare skill names → prefixed. Sites found:**

- `executing-plans/SKILL.md:25,67,74,133` — `../using-razorback/references/blocker-taxonomy.md` and `source-control-hygiene.md` path refs.
- `using-git-worktrees/SKILL.md:45` — `../using-razorback/references/source-control-hygiene.md`.
- `verification-before-completion/SKILL.md:53` — same target as above.
- `finishing-a-development-branch/SKILL.md:71,333,346,378` — path refs into another skill's reference doc; `:404` bare `using-git-worktrees`.
- `writing-plans/SKILL.md:18` — `../using-razorback/references/blocker-taxonomy.md` (parenthetical admits the path doesn't resolve).
- `architecture-quality/SKILL.md:46` — paths to `subagent-driven-development/implementer-prompt.md` and `requesting-code-review/code-reviewer.md`.
- `brainstorming/SKILL.md:164,188` — path refs; `:65,79,141` bare "writing-plans".
- `claude-cli/SKILL.md:227,353` and `codex-cli/SKILL.md:169,266` and `grok-cli/SKILL.md:209,446` — `../security-review/review-payload.md` relative doc refs (route the *contract* through `razorback:security-review`; runnable `$SKILL_DIR` script paths can stay).
- `security-review/SKILL.md:89,100` — `skills/architecture-quality/SKILL.md`, `skills/systematic-debugging/SKILL.md` paths.
- `managing-review-campaigns/SKILL.md:107` — path to `skills/codex-cli/schemas/review-output.schema.json`.
- `cursor-agent/SKILL.md:105` — bare `subagent-driven-development` (correct form used at :270).
- `using-git-worktrees/SKILL.md:253-256,263-264` — bare sibling names next to a correctly prefixed one at :260.
- `diagnosing-performance/SKILL.md:52` — path ref `systematic-debugging/condition-based-waiting.md`.
- `receiving-code-review/SKILL.md:46,93,97` — "blocker taxonomy" invoked with no pointer to where it lives.
- `pre-merge-review/SKILL.md:20-23,349-353` — bare backticked skill names; `:291,297,357-359` path refs.
- `test-driven-development/SKILL.md:309-313` — "Debugging Integration" prescribes debugging with no `razorback:systematic-debugging` reference.
- `finishing-a-development-branch/morning-report-template.md:31-32` — frozen path ref `skills/executing-plans/SKILL.md:42` inside a template.

**Missing requirement markers (add REQUIRED SUB-SKILL / REQUIRED BACKGROUND):**

- `systematic-debugging/SKILL.md:196` — TDD ref marked "MUST have before fixing" without the marker.
- `requesting-code-review/SKILL.md:85,100` — security-review gate and receiving-code-review are load-bearing, unmarked.

## Tier 3 — Structural work (larger edits; some need decisions)

### Intra-skill deduplication (worst first)

- `grok-cli` (5,442 words): redaction guard pasted ~10× (121-130, 174-178, 244-250, 354-358, 488-494, 577-581, 637-641, 650-654, 663-667, 674-678, 705-709); Adversarial Review Steps 2-3 (450-543) re-derive Code Review Steps 2-3 (213-336), ~90 duplicated lines; 294-295 repeats 104-106; 545-560 repeats 271-281; Resuming section gives 4 instances of one pattern each with its own redaction block.
- `subagent-driven-development` (5,513 words): 56-60 vs 370-374 near-verbatim; 342-348 reprints the blocker taxonomy 6 lines after declaring the file authoritative (336); 321-322 re-narrates pre-merge-review's whole pipeline; lead-staging rule restated at 148, 267, 411-412; Codex tool availability explained at 15 and 446.
- `claude-cli`: ~40-line artifact-prep block verbatim at 250-288 and 370-406 (+ explainer repeated 290-296, 423-427); 8-line redact block ×7 (160-167, 187-194, 262-268, 382-388, 464-471, 476-484, 504-509).
- `codex-cli`: artifact-prep duplicated 194-231 vs 310-343; 128 KiB paragraph 234-240 vs 356-360; redaction ×7; Cross-Project and Resuming each show one pattern twice.
- `brainstorming` (2,456 words): three path checklists (49-79) are one checklist ×3; "After the Design" (112-144) is a fourth restatement.
- `finishing-a-development-branch`: base-branch resolution block duplicated 47-62 vs 214-228; Red Flags (375-394) restate Autonomous Mode rules (165-172).
- `using-git-worktrees`: every rule ×3 (Quick Reference 174-192, Common Mistakes 194-224, Red Flags 226-248); Always list (241-248) is pure inversion of Never list.
- `receiving-code-review`: unclear-items example printed twice (60-67, 211-216); no-performative-agreement rule ×4; four pseudo-code IF/THEN blocks encoding plain prose (78-99, 107-113, 119-128, 132-138).
- `writing-plans` (2,992 words): task templates verbatim-duplicated 212-227 vs 280-295; serialization rules stated a third time at 268-273 after 186-198.
- `executing-plans`: 81-88 reprints the blocker taxonomy after :74 declares the reference authoritative; 90-96 re-derives blocker #3 handling from :25 and :84.
- `pre-merge-review`: 159-218 restates security-review's redaction section + near-identical bash; :141 restates the policy-check procedure; Step 3 parse blocks duplicated (226-229 vs 233-236).
- `requesting-code-review`: redaction bash 50-61 copied verbatim; placeholders listed twice (80, 92-97); pre-merge carve-out stated 4× (3, 47-48, 106, 117).
- `test-driven-development`: Red Flags list (229-245) near-verbatim duplicates Rationalizations table (213-227); Iron Law ×3 (34-46, 245, 323-330); two full examples of the identical RED→GREEN cycle (85-172, 247-282) — cut the second.
- `systematic-debugging`: 37-42 vs 44-47 same list twice; "3+ failed fixes → structural" rule ×3 within 50 lines (210-234, 251-252, 259); Miller guidance restated 131-134, 141-142, 156-159.
- `verification-before-completion`: Key Patterns (90-120) re-encodes Common Failures table (42-54); The Bottom Line (147-153) restates Iron Law + Gate Function; Why This Matters (122-129) is motivation, not behavior.
- `cross-model-convergence`: zero-reviewer record (39-62) reprints canonical setup (68-81); optional-reviewer degradation rule ×3 (94, 100, 131); redaction block copied from security-review it already gates on.
- `architecture-quality`: audit-mode trigger stated twice (8, 77); approval-gating stated twice (73, 87).
- `dispatching-parallel-agents`: agent-prompt requirements ×3 (45-50, 90-93, 118-128); 51-57 restates Miller block that executing-plans:33-39 carries and the subagent hook injects; 83-86 dispatch-time content in the wrong section.
- `writing-skills`: RED-GREEN presented ×3 (32-43, 271-279, 296-316); Iron Law reproduces test-driven-development's near-verbatim while declaring it REQUIRED BACKGROUND; STOP section (281-290) adds nothing over 294 + 204-208.
- `managing-review-campaigns`: 83-103 is a 21-line grok CLI quirk that belongs in `razorback:grok-cli` (not even cross-referenced); :33 duplicates a pre-merge-review red flag.
- `harvesting-debt`: 66-71 spends six lines on exclusions that matter only in the razorback repo itself.

**Cross-skill copy to consolidate:** the security-review outbound-redaction snippet exists in at least 6 places (security-review canonical + pre-merge-review, requesting-code-review, cross-model-convergence, claude-cli ×7, codex-cli ×7, grok-cli ×10). Decide one canonical statement + pointer pattern. (The security *checklist* duplication is test-guarded intentional — leave it.)

### Missing template sections

- **"It's working if" signals: missing in ~24 of 28.** Present-ish only in diagnosing-performance (Success Criteria column). Notably absent even in writing-skills, which mandates the section.
- **When-NOT-to-use / When-to-Use missing:** claude-cli, codex-cli, grok-cli (also no mutual routing between them), security-review, managing-review-campaigns, cross-model-convergence, writing-plans, using-git-worktrees (buried at :260), finishing-a-development-branch, executing-plans, receiving-code-review, harvesting-debt, requesting-code-review (partial).
- **Common-mistakes section missing:** executing-plans, harvesting-debt, requesting-code-review, writing-plans, writing-skills, architecture-quality.

### Discipline skills missing rationalization tables / closures

| Skill | Has | Missing |
|---|---|---|
| brainstorming (HARD-GATE) | one anti-pattern (43-45) | Excuse/Reality table, red flags, letter-vs-spirit |
| pre-merge-review | red flags (330-340) | Excuse/Reality table, letter-vs-spirit |
| subagent-driven-development | red flags (403-425) | Excuse/Reality table, letter-vs-spirit |
| receiving-code-review | Forbidden Responses, Bottom Line | Excuse/Reality table |
| architecture-quality | Fast Exit only | all three |
| finishing-a-development-branch | red flags, Always list | Excuse/Reality table |
| executing-plans | anti-pause prose (102) | table + red flags |
| security-review | anti-rationalization table (107-115) | red flags, "It's working if" |
| cross-model-convergence | table (143-151) | letter-vs-spirit |
| grounding-in-current-docs | table (mislabeled "Red Flags", 36) | behavior red-flags list |

House-style models to copy from: systematic-debugging:240-257, diagnosing-performance:235-256, verification-before-completion:42-54.

### Overview / structure defects

- `pre-merge-review:10` — overview narrates the entire 7-step pipeline (~130 words); the named "shortcut" defect. Its ```dot flowchart (58-92) is a linear pipeline with step-heading labels — delete per rubric.
- `executing-plans:10` — overview is a process summary; no principle, no constraint.
- `codex-cli:8-10` — capability list, no defining constraint (contrast claude-cli:10-11, which is exemplary).
- `grok-cli` — no Overview at all; the most load-bearing fact (never pass `--json-schema` on the review pass — it collapses to one turn with zero findings) is buried at :283.
- `brainstorming:10-12` — overview summarizes process; constraint lives in the gate block.
- `requesting-code-review:10` — "Review early, review often" platitude; real differentiator (lead reviews inline, never dispatches a reviewer during plan execution) buried at :14/:105.
- `finishing-a-development-branch:12` — pipeline as principle; real constraint (autonomous stops at PR, merge never automatic) only at :167.
- `dispatching-parallel-agents:10-16` — 4-paragraph overview; constraint (agents never inherit session context) buried.
- `using-razorback` — no title/Overview structure at all (opens with SUBAGENT-STOP then "The Rule").
- `writing-skills:18-20` — file-location trivia inside the Overview.
- `test-driven-development` dot flowchart :67 — unlabeled `verify_green -> next` edge makes the loop exit ambiguous.
- `subagent-driven-development` dot (24-41) — borderline; four bullets would carry it at a third the tokens.
- `writing-skills` dot (171-182) — two-node decision restated more precisely in prose below; delete per its own rule.

### Supporting-file issues

- Orphans: `brainstorming/spec-document-reviewer-prompt.md`, `writing-plans/plan-document-reviewer-prompt.md` (Tier 1 items 2-3).
- Under the heavy-reference bar / belongs inline: `architecture-quality/architecture-language.md` (16L), `deepening.md` (23L), `interface-design.md` (55L); `claude-cli/references/programmatic-billing.md` (40L); `codex-cli/references/follow-goals.md` (21L); `prototyping/UI.md` (45L, arguably LOGIC.md 68L too).
- `subagent-driven-development/code-quality-reviewer-prompt.md` (36L) — line 385 says it is never dispatched; inline or delete. `spec-reviewer-prompt.md` (77L) same shape.
- Justified (leave): analysis-heuristics.md, bottleneck-catalog.md, measurement-playbook.md, writing-good-tests.md, root-cause-tracing.md, defense-in-depth.md, condition-based-waiting.md + example.ts + find-polluter.sh, morning-report-template.md, adversarial prompts, schemas/, scripts/, digest-kit.md, writing-skills' references, using-razorback/references (short but byte-sync canon).

### Size vs targets (writing-skills: <500 words; always-loaded <200)

26 of 28 exceed 500. Worst: subagent-driven-development 5,513; grok-cli 5,442; codex-cli 4,105; claude-cli 3,898; pre-merge-review 3,873; writing-plans 2,992; finishing-a-development-branch 2,943; writing-skills 2,521; brainstorming 2,456. Under target: grounding-in-current-docs (453). **`using-razorback` is ~970 words and loads into every session against a <200 target** — the one place the target is not advisory.

## Open design decisions — RESOLVED 2026-09-01 (user approved)

1. using-razorback: **keep the Miller table** (toolchain floor for Codex/OpenCode); trim the Skill Priority / Skill Types / User Instructions restatements instead.
2. Redaction snippet: **one runnable copy per file**; every other occurrence in that file becomes a one-line pointer to it.
3. writing-plans: **extract the task templates** to a supporting template file; body keeps one short example + pointer.
4. Tier 3 testing bar: **npm test everywhere + one GREEN subagent scenario per rewritten discipline skill** (brainstorming, pre-merge-review, subagent-driven-development, receiving-code-review, architecture-quality, finishing-a-development-branch). No baseline RED runs.

**Tier 3 corrections found during execution:** the "blocker taxonomy reprinted in full" dedupe items for `executing-plans` (81-88) and `subagent-driven-development` (342-348) are WRONG — `tests/twin-sections.test.mjs` invariants require the five blocker lines present in both `## Blockers` sections. That duplication is guard-mandated; leave it.

## Original decision framing (for the record)

1. **using-razorback Miller table (L92-119, ~¼ of the always-loaded file).** In Claude Code sessions it triplicates content (Miller MCP instructions + SubagentStart hook) and has already drifted (36 vs 40). BUT Codex/OpenCode users see this file without Miller's MCP instructions necessarily present. Options: keep (fix drift only); slim to capability names; move to a per-harness mechanism. Not a mechanical trim.
2. **Redaction-snippet canonicalization pattern** — one statement in security-review + "wrap every payload" pointer elsewhere? Affects 6 skills and their runnable blocks.
3. **writing-plans template extraction** — moving the two task templates to a supporting file cuts the body ~⅓; changes how the skill is consumed.
4. **Pressure-testing bar for these edits.** writing-skills' Iron Law requires RED/GREEN subagent testing for every skill edit. Proposed: Tier 1 + Tier 2 (factual/mechanical) proceed on `npm test` + re-read verification; Tier 3 behavioral edits (tables, dedupe of discipline text, restructures) get at minimum a GREEN-run spot check on the most rationalization-prone skills. Confirm or tighten.

## Execution order

1. Tier 1 defects (items 1-8) — commit per coherent group.
2. Tier 2 cross-reference + marker hygiene — mechanical, one commit.
3. Tier 3 in slices, worst-first: grok-cli, subagent-driven-development, claude/codex-cli, brainstorming, pre-merge-review, then the rest; missing sections + discipline tables per skill as each is touched (touch each file once).
4. Open decisions resolved with user before their slices.
5. `npm test` after every slice (rule-copies guard especially); full re-read of any edited section.
