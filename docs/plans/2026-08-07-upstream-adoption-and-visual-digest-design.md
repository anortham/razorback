# Upstream Adoption and Visual Digest — Design

**Date:** 2026-08-07
**Status:** Draft — awaiting user review
**Sources:** Comparative audit of superpowers v6.2.0 (HEAD `44c9b2d`) and mattpocock/skills 1.2.3 (HEAD `84fdeff`) vs razorback 0.27.0, recorded in checkpoint `checkpoint_47b6d650` (`.memories/2026-08-07/145440_47b6.md`). Visual-digest decisions from the 2026-08-07 brainstorming session; layout verdict from prototype branch `prototype/plan-digest` (`f4f9b64`).

## Goal

One development cycle with three lanes: (A) fix the five live bugs the audit found, (B) adopt the ranked upstream content improvements, (C) add the visual digest feature. Lanes land as serialized batches in one plan; A has no dependency on B or C.

## Lane A — Bug fixes

1. **`skills/systematic-debugging/find-polluter.sh`** carries the original broken `find` logic (missing `./` prefix, empty result miscounted as 1, `**/` never matches zero directory levels). Port the upstream fix verbatim and port its test suite into razorback's `tests/*.test.mjs` convention.
2. **`hooks/hooks.json`** — add `"shell": "bash"` to both the SessionStart and SubagentStart entries. Without it, Windows silently loses the bootstrap AND the Miller-first subagent injection (PowerShell/CMD cannot parse the polyglot command). Older Claude Code versions ignore the key. Add registration-shape assertions to the hook tests. `hooks-cursor.json` stays untouched (Cursor frozen; runner behavior with a `shell` key unverified — recorded as deferred).
3. **`skills/finishing-a-development-branch/SKILL.md` Interactive Mode** — Step 5 locates the worktree by `git branch --show-current` after Options 1/4 have already checked out the base branch, so cleanup silently no-ops. Fix: capture `WORKTREE_PATH` and the feature branch name up front (Step 1/2), before any checkout or directory change, and restrict cleanup to worktrees under `.claude/worktrees/` (razorback's worktree home — provenance rule: anything elsewhere belongs to the host or the user).
4. **`skills/systematic-debugging/SKILL.md:92-104`** — the instrumentation example runs `env | grep IDENTITY`, printing a credential value into agent-visible output. Rewrite the example so the credential never appears in output (the adjacent `${IDENTITY:+SET}` line is the safe pattern). Pairs with Lane B item 7.
5. **Harness-specific tool names in subagent-consumed prompt files** — `implementer-prompt.md:6`, `brainstorming/spec-document-reviewer-prompt.md:10`, `writing-plans/plan-document-reviewer-prompt.md:10`, `brainstorming/SKILL.md:156`, `pre-merge-review/fix-dispatch-prompt.md:3` name `Agent tool (general-purpose)` etc. outside `<!-- harness:… -->` guards. Wrap or neutralize to capability language. Add a guard test: no file under `skills/` names `Agent tool`, `Task tool`, `general-purpose`, or `subagent_type` outside a harness guard (allowlist for `codex-tools.md`, which IS the mapping).

## Lane B — Upstream adoptions

From **superpowers**:

1. **`writing-good-tests.md`** replaces `skills/test-driven-development/testing-anti-patterns.md`. Carry the two-principle structure (falsifiability + exercise the real thing), the change-detector ban, the mirror-assertion ban, the mutation check, and "behavior, not text". Translate `superpowers:` references to `razorback:`, point the agent-document case at `razorback:writing-skills`' subagent-testing discipline. Broaden the TDD trigger from "when adding mocks" to "when writing or changing any test". Update `code-quality-reviewer-prompt.md`'s test-quality bullet to cite the mutation check.
2. **Region-scoped test assertions** — where razorback's guard tests assert string presence against a whole file, extract the target region first so the test fails when the region is deleted. Candidates: `tests/rule-copies.test.mjs`, `tests/twin-sections.test.mjs`, `tests/security-checklist-sync.test.mjs`; the implementer confirms which of these actually assert against whole files and scopes those only. Same lesson writing-good-tests teaches, applied to razorback's own suite.
3. **SDD fix-loop discipline**, translated to razorback's inline-review model (no new subagent prompt files):
   - **Scoped re-review**: after a fix round, the lead re-reviews with `review-package FIX_BASE HEAD` where FIX_BASE is the head the previous review saw; verdicts every prior finding ADDRESSED / NOT ADDRESSED with file:line ("attempted" is not addressed); inspects the fix diff only for new breakage; anything noticed outside the fix diff goes to a deferred list and never extends the loop.
   - **Fix-report gate**: before re-reviewing, the lead confirms the fix report names covering tests, command, and output. Add the matching requirement to `fix-prompt.md`.
   - **Adjudication at the cap**: keep razorback's cap (3 resumes + 1 reframed attempt). At the cap, rule each open finding into exactly one of: contested (ruling recorded, continue), real-but-deferred (ruling recorded, continue), or **real and load-bearing** (later tasks build on it) → blocker-taxonomy stop. Adjudicate only at the cap; every ruling is a ledger entry; silent discards forbidden.
   - **Minor findings never enter the loop**: ledgered as `Task N: minor (deferred): <one-liner>`; Step 4a points the pre-merge reviewer at that list.
4. **Plan-scoped SDD workspace** — `.razorback/sdd/<plan-basename>/` per plan; `sdd-workspace`, `task-brief`, and `review-package` gain a leading `PLAN_FILE` argument; the `.gitignore` moves up to `.razorback/sdd/.gitignore`; the ledger's first line becomes `# Razorback SDD ledger — plan: <path>`; the plan's own workspace is deleted when the final review is clean. Preserve the `parallel-lead-commit` crash-window reconciliation unchanged — the identity check adds to Recovery, never weakens it. Update all call sites (`SKILL.md`, `implementer-prompt.md`, `fix-prompt.md`) and port the workspace tests. Adopted for hygiene and token cost; upstream's own eval showed no foreign-ledger-adoption failure.
5. **Brief-vs-paste resolution** — `implementer-prompt.md`'s Task Description becomes the task-brief path ("read this first — it is your requirements, with the exact values to use verbatim"); exact values (numbers, magic strings, signatures, test cases) live only in the brief; no pasted prior-task summaries; record `BASE=$(git rev-parse HEAD)` before dispatch, never `HEAD~1`.
6. **Forge-agnostic PR ladder** in `finishing-a-development-branch`: `gh` (preferred, machine-readable URL) → another forge CLI if present (`glab`, `tea`) → the creation URL the forge prints on push → `Status: Partial` with the push recorded. The existing "`gh` missing" branch becomes the last rung.
7. **Redact rule** — a three-sentence canonical block in `security-review/SKILL.md`: redact secrets in anything shown, quoted, or sent (transcripts, reports, external-model payloads); keep credentials in env vars inside loops; quote only signal lines from captured artifacts. Sync verbatim copies where debugging and delegation skills need it via `tests/security-checklist-sync.test.mjs`'s existing pattern. Do not enumerate what a secret looks like.

From **mattpocock/skills**:

8. **`writing-skills` additions**: (a) the no-op test — "does this sentence change behavior versus the default? settle by running the document, not by debate"; a no-op is a line whose removal leaves the GREEN run unchanged; (b) scope the negation rule — negation is earned by an observed rationalization in the RED run; everywhere else, state the positive target (the Iron Law and existing rationalization tables qualify for the exception and do not change); (c) body-template slots: the defining constraint stated in the Overview as plain prose, and an "It's working if" section with signals checkable without reopening the skill (replaces the `Real-World Impact (optional)` slot); (d) record the invocation-axis decision: every razorback skill stays model-invoked, deliberately.
9. **`brainstorming` refinements**: adopt the frontier-empty stop condition (model the open questions as a tree; done when no unanswered question has satisfied prerequisites) alongside the existing wording, and add "finding facts is the agent's job — dispatch a subagent or use Miller for any environment fact; never ask the user for something the repo can answer; don't block the interview on it". Keep one-question-per-message and falsifiable guesses unchanged.
10. **`prototyping/LOGIC.md` second shell**: add the single-file HTML branch — plain HTML/CSS/JS, no build, opens by double-click, labeled state panel in domain language, free-play controls, and tabbed guided walkthroughs (each tab = scenario description + ordered steps, resetting to a known state). Branch choice keyed to who renders the verdict: developer at a terminal → TUI; anyone else or async → HTML. The pure-module discipline is unchanged.

## Lane C — Visual digest

**Decision summary (user-approved 2026-08-07):**

| Decision | Choice |
|---|---|
| Generation | Model-authored digest on a shared component kit; never a mechanical markdown transform |
| Surfaces | Implementation plans, design docs, morning reports |
| Depth | Digest — decisions, status, blockers, acceptance criteria; detail stays in the markdown, linked |
| Timing | Automatic at the three read moments: spec review gate, plan review gate, morning-report write |
| Files | Self-contained single HTML, sibling to its markdown (`<name>.html`), same git fate |
| Layout | **Execution timeline** as the main view + **Decisions / Guardrails tabs** (prototype verdict) |

**Layout spec (from the prototype verdict, branch `prototype/plan-digest`):**
- Header: title, one-line goal, progress figure with meter.
- Main view: vertical timeline spine — one stage per batch/phase with a completion state; task rows in execution order (status word + task + one-line note); **warning flag callouts inline** at the point a criterion was revised or a judgment call recorded; a "you are here" marker on the active task.
- Tabs beside Timeline: **Decisions** (card per ruling: what was found, what landed, what must not be undone) and **Guardrails** (never-touch list, held-constant list, verification gates).
- Footer links the canonical markdown. Digests of completed documents keep the same shape with the timeline fully settled.

**Component kit:** one canonical reference file at `skills/using-razorback/references/digest-kit.md` containing the kit CSS (tokens for light+dark via `prefers-color-scheme`, status chips with icon + label, meter, timeline spine, tabs, flag callouts, stat tile/hero figure) and the layout contract above, with a short authoring rule set: the digest is a view, not a transcript; every sentence earns its place; agents never read the HTML; the markdown stays canonical. The model inlines the kit CSS into each digest so every file stays self-contained. Color values come from the validated dataviz reference palette (status colors icon-paired, text wears text tokens, meters follow the mark specs).

**Wiring (three skill edits):**
- `brainstorming` — at the User Review Gate, also write `<design-doc>.html` and name both files in the review ask.
- `writing-plans` — at plan-review handoff, also write `<plan>.html`.
- `finishing-a-development-branch` — Autonomous Step (morning report): also write the report digest beside the report in `.memories/`.

**Tests:** guard test asserting the kit file exists and that all three wired skills reference `digest-kit.md` inside the step that produces the document (region-scoped, per Lane B item 2's technique).

## Architecture

Content-and-config change set over the existing layout — no new runtime modules. New shared interface: `references/digest-kit.md` (one canonical file, three consumers — same shape as `review-targeting.md`). Changed script contract: the three SDD workspace scripts gain a leading `PLAN_FILE` argument (breaking for call sites, all updated in the same plan; no external consumers). Risk concentrates in the SDD script signature change and hook JSON edits — both covered by existing guard-test patterns. No Architecture Impact beyond these two shapes.

## Out of scope (deferred, not forgotten)

- **wizard skill** (human-in-the-loop procedure generator) — biggest new capability from the audit; its own brainstorm + plan.
- **Compression sweep** — upstream's probes showed naive deletion degrades behavior (8/10 → 5/10); doing this right needs probe-tested rework per file, a separate cycle.
- **Domain-glossary layer / CONTEXT.md**, **RELEASE-NOTES.md**, **`.out-of-scope/` records**, **router-freshness test** — cheap but not this cycle; keep the cycle bounded.
- **Digest for further surfaces** (handoffs, debt ledger, review reports) — after the pattern proves out.
- **Cursor `shell` key verification** — Cursor is frozen.
- **Auditing razorback's own string-presence tests wholesale** — Lane B item 2 fixes the worst offenders only; the full sweep follows adoption of writing-good-tests.

## Acceptance criteria

- [ ] All five Lane A bugs fixed with the named tests; `npm test` green.
- [ ] `testing-anti-patterns.md` gone; `writing-good-tests.md` present with razorback naming; TDD trigger broadened.
- [ ] SDD carries the scoped re-review contract, fix-report gate, cap adjudication, and minor-deferral path; `executing-plans` twin sections stay aligned (twin guard green).
- [ ] `.razorback/sdd/<plan>/` layout live; all script call sites updated; ledger identity header + crash-window rule both present.
- [ ] `implementer-prompt.md` dispatches by brief path; BASE-recording rule present.
- [ ] PR ladder and worktree-path capture landed in `finishing-a-development-branch`.
- [ ] Redact block canonical in `security-review`, synced copies guarded, debugging example fixed.
- [ ] `digest-kit.md` exists; three skills wired; a generated sample digest matches the layout spec (verified against the prototype verdict during review).
- [ ] Version bump + release as a separate action after merge.
