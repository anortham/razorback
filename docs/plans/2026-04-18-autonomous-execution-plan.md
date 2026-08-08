# Autonomous Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use razorback:team-driven-development to implement this plan. Parallel execution is possible by phase (see File Ownership); fan out teammates per task within a phase.

> **Completed and superseded in part (v0.29.0, 2026-08-08).** This plan shipped. The claude-cli command it specifies in Phase 1 is a historical record and no longer matches what razorback ships — do not copy it. `--bare` was dropped, the allowlist became `Read,Grep,Glob` with `--strict-mcp-config`, Julie was replaced by Miller, skills moved into the plugin, and v0.29.0 removed the `--max-turns` and `--max-budget-usd` caps. The live invocation is `skills/pre-merge-review/reviewer-prompts/claude.md`.

**Goal:** Make razorback run approved plans to completion overnight — kill interactive stop-points, add pre-merge external review, make execution compaction-durable — per `docs/plans/2026-04-18-autonomous-execution-design.md`.

**Architecture:** Five phases. Phase 1 creates shared reference assets (blocker taxonomy, morning-report template, new `claude-cli` skill). Phase 2 creates the orchestration skill (`pre-merge-review`). Phase 3 modifies the six existing execution-flow skills in parallel (clean file ownership, no overlaps). Phase 4 updates razorback-project docs. Phase 5 is lead-driven integration verification. All modifications reference the shared assets rather than inlining, to stay DRY.

**Tech Stack:** Markdown skill files (no compiled code), YAML frontmatter, JSON Schema for external-reviewer output, Bash invocations for CLI-based reviewers, goldfish MCP for checkpoints, Julie MCP for orientation.

**Reference:** Design spec at `docs/plans/2026-04-18-autonomous-execution-design.md`. All section references below (§1, §2, …) refer to that document.

---

## File Structure

**New files (created by Phase 1 and 2):**

- `skills/using-razorback/references/blocker-taxonomy.md` — the 5 real blockers + 2 bias rules from design §2, referenced by execution skills
- `skills/finishing-a-development-branch/morning-report-template.md` — the report format from design §7
- `skills/pre-merge-review/SKILL.md` — new skill that orchestrates external review per design §4
- `skills/pre-merge-review/reviewer-prompts/codex.md` — review-invocation instructions for codex-cli
- `skills/pre-merge-review/reviewer-prompts/gemini.md` — review-invocation instructions for gemini-cli (text-parse path since gemini has no JSON schema)
- `skills/pre-merge-review/reviewer-prompts/claude.md` — review-invocation instructions for claude-cli
- `skills/pre-merge-review/verification-protocol.md` — how the lead classifies findings (real/improvement/false-positive/out-of-scope)
- `skills/pre-merge-review/fix-dispatch-prompt.md` — implementer prompt template for verified-finding fixes
- `~/.claude/skills/claude-cli/SKILL.md` — new user-global skill mirroring codex-cli per design §5
- `~/.claude/skills/claude-cli/adversarial-prompt.txt` — adversarial system-prompt template
- `~/.claude/skills/claude-cli/schemas/review-output.schema.json` — JSON Schema for `--json-schema` flag (copy of codex-cli's)

**Modified files (Phase 3):**

- `skills/writing-plans/SKILL.md` — remove handoff prompt, capture reviewer choice
- `skills/executing-plans/SKILL.md` — reference blocker taxonomy, remove inter-task gates
- `skills/finishing-a-development-branch/SKILL.md` — add mode-selection rule, autonomous mode, morning-report emission
- `skills/team-driven-development/SKILL.md` — blocker taxonomy, pre-merge-review integration, checkpointing, recovery, iteration-cap change
- `skills/team-driven-development/implementer-prompt.md` — decide-and-note language
- `skills/subagent-driven-development/SKILL.md` — same as team-driven-development
- `skills/subagent-driven-development/implementer-prompt.md` — decide-and-note language
- `skills/subagent-driven-development/fix-prompt.md` — reframed-context language for Nth-attempt fixes

**Modified files (Phase 4):**

- `CLAUDE.md` — philosophy note: razorback runs to completion by default
- `README.md` — execution model section updated with autonomous-by-default framing

---

## Phase 1 — Foundation (parallel, 3 tasks)

### Task 1: Blocker taxonomy reference

**Files:**
- Create: `skills/using-razorback/references/blocker-taxonomy.md`

**What to build:** A concise markdown reference encoding design §2 verbatim. Used by `executing-plans`, `team-driven-development`, `subagent-driven-development`, and the two implementer prompts via a short reference link instead of inlining the list (DRY).

**Approach:**
- Two sections: "Real blockers (stop and report)" with the 5 categories, and "Not a blocker (decide + log)" with the 6 non-categories.
- Close with the two bias rules: "When in doubt, press on and flag" and "Never silently swallow a judgment call".
- No frontmatter (it's a reference doc, not a skill).
- Keep under 80 lines — this is a look-up reference, not an essay.

**Acceptance criteria:**
- [ ] File exists at the path above
- [ ] Contains all 5 real-blocker categories from design §2, phrased verbatim
- [ ] Contains all 6 non-blocker bullets from design §2
- [ ] Contains the two bias rules
- [ ] Under 80 lines
- [ ] Committed with message `docs: add blocker-taxonomy reference for autonomous execution`

---

### Task 2: Morning report template

**Files:**
- Create: `skills/finishing-a-development-branch/morning-report-template.md`

**What to build:** The exact report format from design §7.1, with placeholders the emitting skill fills in. Lives alongside `finishing-a-development-branch/SKILL.md` so the skill can reference `./morning-report-template.md`.

**Approach:**
- Single markdown file with the template body from design §7.1
- Use `{{placeholder}}` syntax for fillable fields (plan name, status, PR URL, duration, phases counts, etc.)
- Include a short header comment explaining: "This template is rendered into the PR description (summary sections only), a file at `.memories/autonomous-run-YYYY-MM-DD-<slug>.md`, and the final terminal output."
- No frontmatter.

**Acceptance criteria:**
- [ ] File exists at the path above
- [ ] Contains all 9 sections from design §7.1 (Status/Summary/What shipped/Judgment calls/External review/Tests/Blockers/Files changed/Next steps)
- [ ] Placeholders are clearly marked
- [ ] Header comment describes the three emission destinations
- [ ] Committed with message `docs: add morning-report template for autonomous execution finish`

---

### Task 3: `claude-cli` skill

**Files:**
- Create: `~/.claude/skills/claude-cli/SKILL.md`
- Create: `~/.claude/skills/claude-cli/adversarial-prompt.txt`
- Create: `~/.claude/skills/claude-cli/schemas/review-output.schema.json`

**What to build:** A user-global skill that invokes `claude -p` for second-opinion, code-review, and adversarial-review modes, mirroring `~/.claude/skills/codex-cli/SKILL.md`. This is the third reviewer option for the pre-merge external review.

**Approach:**
- Read `~/.claude/skills/codex-cli/SKILL.md` first and use it as the structural template.
- `SKILL.md` frontmatter: `name: claude-cli`, description mirrors codex-cli's phrasing but references Claude — "Use when user says 'ask claude', 'get claude's take', 'fresh claude review', etc."
- Three modes: Second Opinion, Code Review, Adversarial Review — same shape as codex-cli.
- Adversarial command uses the validated flag set from design §5:
  ```
  claude -p --bare --no-session-persistence --dangerously-skip-permissions \
    --output-format json --json-schema "$(cat schemas/review-output.schema.json)" \
    --tools "Read,Bash" --max-turns 15 --max-budget-usd 5.00 \
    --model opus --system-prompt-file ~/.claude/skills/claude-cli/adversarial-prompt.txt \
    "$DIFF_AND_CONTEXT"
  ```
- Explain each flag's rationale (as codex-cli's SKILL.md does).
- `adversarial-prompt.txt` is a copy of codex-cli's adversarial prompt template (found inside `codex-cli/SKILL.md` — "You are Codex performing an adversarial software review"). Rename "Codex" → "Claude" and adapt tool references to Claude's built-ins (Read, Bash) rather than Codex's tool set. Preserve all attack-surface categories and the JSON-schema return directive.
- `schemas/review-output.schema.json` is a verbatim copy of `~/.claude/skills/codex-cli/schemas/review-output.schema.json`. Reusing the schema keeps downstream parsing uniform across reviewers.
- Critical-evaluation section: same as codex-cli's — "Claude is a peer, not an authority", but note that this is *a different Claude instance* with isolated context, and the calling agent should still evaluate findings critically.
- Error handling: auth via `claude auth status`, rate limits, timeout, "not installed" (check `claude --version`).
- Quick Reference table at the bottom in the codex-cli style.

**Acceptance criteria:**
- [ ] All three files exist at the paths above (note: `~/.claude/skills/` is user-global, outside the razorback repo)
- [ ] `SKILL.md` frontmatter has `name: claude-cli` and a descriptive `description`
- [ ] Three modes documented: Second Opinion, Code Review, Adversarial Review
- [ ] Adversarial command uses the exact flag set from design §5 (verify all 11 flags appear)
- [ ] `adversarial-prompt.txt` preserves all attack-surface categories from codex-cli's template, with model references updated
- [ ] `schemas/review-output.schema.json` matches codex-cli's schema byte-for-byte
- [ ] Critical-evaluation section notes that fresh-Claude isolation is the review's value, not model superiority
- [ ] Quick Reference table present
- [ ] Committed (git commit in the user-global repo if versioned; otherwise note that the files are created and verify with `ls -la`)

**Note on commit:** `~/.claude/skills/` may or may not be a git repo. If it is, commit there with message `feat: add claude-cli skill for adversarial review`. If not, just create the files and verify with a final `ls ~/.claude/skills/claude-cli/ && ls ~/.claude/skills/claude-cli/schemas/`.

---

## Phase 2 — Orchestration (1 task, depends on Phase 1)

### Task 4: `pre-merge-review` skill

**Files:**
- Create: `skills/pre-merge-review/SKILL.md`
- Create: `skills/pre-merge-review/reviewer-prompts/codex.md`
- Create: `skills/pre-merge-review/reviewer-prompts/gemini.md`
- Create: `skills/pre-merge-review/reviewer-prompts/claude.md`
- Create: `skills/pre-merge-review/verification-protocol.md`
- Create: `skills/pre-merge-review/fix-dispatch-prompt.md`

**What to build:** The orchestration skill that runs between "all tests green" and `finishing-a-development-branch`, per design §4.2. Reusable by both `team-driven-development` and `subagent-driven-development`. Gated on the per-plan reviewer choice.

**Approach:**

`SKILL.md` frontmatter:
- `name: pre-merge-review`
- `description: Use after all tasks are complete and tests pass, before finishing-a-development-branch, when a pre-merge external reviewer was chosen at plan approval time (codex, gemini, or claude). Builds diff, dispatches the chosen reviewer, verifies findings, dispatches fresh implementer subagents for verified fixes, and emits a summary for the morning report.`

`SKILL.md` body structure:
1. **Overview** — one paragraph, design §4 summary
2. **When to invoke** — only when reviewer was chosen; skip entirely if "none"
3. **Process** — the 7-step flow from design §4.2, with a graphviz-style `digraph` per razorback skill conventions
4. **Step 1: Build diff + context** — `git diff <base>..HEAD` plus file list + commit messages + plan path. Exact shell commands.
5. **Step 2: Dispatch reviewer** — references the appropriate `reviewer-prompts/<name>.md` based on choice
6. **Step 3: Parse findings** — JSON parse for codex/claude, structured-text parse for gemini
7. **Step 4: Verify findings** — references `verification-protocol.md`
8. **Step 5: Dispatch fresh implementer per verified finding** — references `fix-dispatch-prompt.md`, one Agent call per finding (or grouped by file when findings cluster on the same file)
9. **Step 6: Re-run tests** — project-specific test command
10. **Step 7: Emit summary for morning report** — structured block matching design §7.1's "External review" section
11. **Red flags** — never loop external review, never let reviewer fix (reviewer is read-only), never silently dismiss findings
12. **Integration** — called by `team-driven-development` / `subagent-driven-development`; calls `codex-cli` / `gemini-cli` / `claude-cli` skills

`reviewer-prompts/codex.md`:
- Invocation command using codex-cli's adversarial mode with JSON schema output
- Full command with `--output-schema ~/.claude/skills/codex-cli/schemas/review-output.schema.json`
- Expected output format (JSON conforming to the schema)

`reviewer-prompts/gemini.md`:
- Gemini has NO `--json-schema` / `--output-schema` flag (verified against `gemini --help` on 2026-04-18). `-o json` wraps the model response in a metadata envelope: `{session_id, response, stats: {models: {...: {tokens: ...}}}}` where `.response` is plain text (often fenced in markdown ```\`\`\`json ... \`\`\````).
- Invocation command:
  ```bash
  cd "$PROJECT_DIR" && gemini -o json -m gemini-3-pro --yolo \
    "$(cat adversarial-prompt.md)

  Return your response as a JSON object matching this schema:
  $(cat ~/.claude/skills/codex-cli/schemas/review-output.schema.json)

  Diff to review:
  $DIFF" 2>/dev/null
  ```
- Parsing protocol (documented in the skill, executed by the lead after dispatch):
  1. Parse envelope with `jq -r '.response'` to extract the model's text
  2. Strip markdown code fences if present: `sed -E 's/^```(json)?$//; s/```$//'`
  3. `jq empty` to validate it's parseable JSON
  4. Validate against the shared schema (same file as codex/claude use). If invalid, retry once with a stricter prompt; if still invalid, fall back to a structured-markdown parser (regex over `## Finding N` blocks with `Severity:`, `File:`, `Body:`, `Recommendation:` fields)
  5. Normalize to the shared finding shape before handing to the verification step
- Log `stats.models.*.tokens` from the envelope to the morning report for cost tracking (gemini provides this; codex/claude don't in their JSON output — note the asymmetry in the skill)

`reviewer-prompts/claude.md`:
- Invocation command using claude-cli's adversarial mode (created in Task 3) with JSON schema output
- Full command matching the one in Task 3 §5

`verification-protocol.md`:
- Classification rules: real-bug / real-improvement / false-positive / out-of-scope
- For each finding: use `julie:deep_dive` on referenced symbol, `julie:fast_refs` to check impact, `julie:get_symbols` on file
- Concrete examples of each classification
- Dismissal requires a written reason; reasons go into the morning report

`fix-dispatch-prompt.md`:
- Template for dispatching a fresh implementer to fix one verified finding
- Fields: finding text, file + line range, relevant symbol context (from Julie), plan context summary
- Implementer scope: fix only this finding; do not refactor; commit separately
- Matches the shape of `subagent-driven-development/implementer-prompt.md` but scoped to a single finding

**Acceptance criteria:**
- [ ] All 6 files exist at the paths above
- [ ] `SKILL.md` has valid frontmatter with `name: pre-merge-review` and a complete description
- [ ] `SKILL.md` contains a graphviz `digraph` for the 7-step flow
- [ ] `SKILL.md` explicitly handles the gemini envelope-unwrap + fallback-parser path (noted as different from codex/claude schema-enforced JSON path)
- [ ] Three reviewer-prompt files each contain a complete, runnable invocation command
- [ ] `verification-protocol.md` has concrete examples of each of the 4 classifications
- [ ] `fix-dispatch-prompt.md` template is scoped to a single finding (no multi-finding batching that could compound errors)
- [ ] Red-flags section forbids looping external review, reviewer-edits-code, and silent dismissals
- [ ] Committed with message `feat: add pre-merge-review skill for autonomous external review`

---

## Phase 3 — Modify execution-flow skills (parallel, 5 tasks)

All five tasks in Phase 3 edit different files and can run in parallel. Each must complete before Phase 4 begins.

### Task 5: `writing-plans` changes

**Files:**
- Modify: `skills/writing-plans/SKILL.md` (current lines 172–196, the "Execution Handoff" section)

**What to build:** Remove the interactive execution-choice prompt. Replace with a streamlined transition that captures the pre-merge-reviewer choice and hands off to the right execution skill.

**Approach:**
- Delete the entire "Execution Handoff" section (the "Plan complete and saved… Which approach?" block).
- Replace with a new "Execution Handoff" section that:
  - States: "Plan saved to `<path>`. Capturing reviewer choice before execution starts."
  - Asks ONE question (only if the user hasn't already specified): "External review before PR? (none / codex / gemini / claude)"
  - After the answer (or if already given): announce which execution skill will run (team-driven-development on Claude Code; subagent-driven-development elsewhere; executing-plans for single-task plans) and invoke it.
- Keep the "If separate-session execution chosen" branch — this remains a valid option if the user explicitly asks for async handoff.
- Update the "Plan Document Header" requirement earlier in the file: change `REQUIRED SUB-SKILL: Use razorback:executing-plans` to `REQUIRED SUB-SKILL: Use razorback:team-driven-development (or subagent-driven-development on non-Claude-Code harnesses)`.

**Acceptance criteria:**
- [ ] "Which approach?" prompt is removed
- [ ] A single reviewer-choice question replaces it, asked only if the user hasn't already specified a choice
- [ ] Plan-document-header instruction points to team-driven-development (or subagent-driven-development) as the default, with executing-plans as the single-task fallback
- [ ] Separate-session branch is preserved for explicit async handoff
- [ ] No references to the blocker taxonomy yet — writing-plans doesn't need them; taxonomy lives in execution skills
- [ ] Committed with message `feat(writing-plans): remove execution-handoff prompt, capture reviewer choice`

---

### Task 6: `executing-plans` changes

**Files:**
- Modify: `skills/executing-plans/SKILL.md` (sections: "When to Stop and Ask for Help", lines ~45–53; "Remember" list, line ~63–69)

**What to build:** Remove the soft-blocker language. Replace with a reference to the blocker taxonomy. Remove inter-task user-confirmation expectations.

**Approach:**
- Replace the "When to Stop and Ask for Help" section with a new "Blockers" section that links to `skills/using-razorback/references/blocker-taxonomy.md` and states the two bias rules inline.
- Remove the line "Ask for clarification rather than guessing" (it contradicts the new decide-and-note stance).
- Remove the "When to Revisit Earlier Steps" section's "Partner updates the plan based on your feedback" bullet — replace with "If a teammate flags a plan-contradicting state, re-read the plan and use Julie to check current state; if the plan is still valid, continue; if not, stop per blocker taxonomy #3."
- In the "Remember" list, replace "Stop when blocked, don't guess" with "Stop only for real blockers; decide + note otherwise (see blocker taxonomy)".
- No new Recovery section here — `executing-plans` is a single-agent batch skill; the Recovery section belongs in team/subagent-driven.

**Acceptance criteria:**
- [ ] "When to Stop and Ask for Help" is replaced with a "Blockers" section referencing the taxonomy
- [ ] Two bias rules present inline
- [ ] "Ask for clarification rather than guessing" line removed
- [ ] "Stop when blocked, don't guess" replaced in the Remember list
- [ ] Committed with message `feat(executing-plans): reference blocker taxonomy, remove interactive gates`

---

### Task 7: `finishing-a-development-branch` changes

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- References: `skills/finishing-a-development-branch/morning-report-template.md` (created in Task 2)

**What to build:** Add the mode-selection rule at the top. Implement autonomous mode that pushes + PRs without prompting and emits the morning report. Keep interactive mode behind the 4-option menu.

**Approach:**
- Add a new "Mode Selection" section at the top of the skill (right after "Core principle"), containing the mode-selection rule from design §3.4: autonomous default when called at the tail of an execution skill, interactive when user-invoked, autonomous for ambiguous cases.
- Add a new "Autonomous Mode" section that describes the push + PR flow:
  1. Verify tests pass (reuse current Step 1 logic)
  2. Determine base branch (reuse current Step 2 logic)
  3. Push branch: `git push -u origin <branch>`
  4. Render morning report by filling `morning-report-template.md` placeholders
  5. Create PR: `gh pr create --title "<plan name>" --body "$(rendered_report_summary)"`
  6. Write full report to `.memories/autonomous-run-YYYY-MM-DD-<slug>.md` and commit it on the branch
  7. Emit terminal one-liner: `Done. PR: <URL>. Report: <path>.`
- Preserve current Steps 3–5 (the 4-option menu and cleanup) under a renamed "Interactive Mode" section.
- Update the "Called by" list in Integration: clarify that autonomous mode is triggered when called at the tail of executing-plans/team-driven-development/subagent-driven-development, and interactive mode is triggered by direct user invocation.
- Update Red Flags: add "Never merge in autonomous mode — merge is always a separate human (or agent) action after PR review".

**Acceptance criteria:**
- [ ] Mode Selection section appears at the top with the rule from design §3.4
- [ ] Autonomous Mode section has all 7 steps of the push+PR+report flow
- [ ] Interactive Mode section preserves the 4-option menu unchanged
- [ ] Morning report is emitted to all three destinations (PR description summary, `.memories/` file, terminal one-liner)
- [ ] Red-flag added: no merge in autonomous mode
- [ ] Committed with message `feat(finish-branch): add autonomous mode with morning report emission`

---

### Task 8: `team-driven-development` SKILL + implementer-prompt

**Files:**
- Modify: `skills/team-driven-development/SKILL.md`
- Modify: `skills/team-driven-development/implementer-prompt.md`

**What to build:** Integrate blocker taxonomy, pre-merge-review step, checkpointing, recovery sequence, and the new iteration-cap behavior. Update the implementer prompt to the decide-and-note stance.

**Approach for `SKILL.md`:**
- Add a "Blockers" section referencing `skills/using-razorback/references/blocker-taxonomy.md`. State the two bias rules inline.
- Add a "Checkpoints" section (design §6.3): phase-boundary, pre-review, post-review, post-PR goldfish checkpoints. Include example `goldfish:checkpoint` invocation syntax.
- Add a "Recovery" section (design §6.4): the fixed 5-step orientation sequence triggered on resumed runs.
- Update Step 5 (Complete) to insert a new sub-step between "Final verification" and "Use razorback:finishing-a-development-branch":
  - **Step 5a: Pre-merge review (if chosen)** — if the user chose codex/gemini/claude at plan approval, invoke `razorback:pre-merge-review`. If "none" or unchosen, skip.
- Change the iteration-cap behavior in "Step 4: Fix Issues via Message":
  - Current: "Review cap: 3 iterations max. If a teammate can't resolve issues in 3 rounds, escalate to the user."
  - New: "Review cap: 3 iterations via SendMessage. If not resolved, dispatch a fresh implementer teammate (new name) with reframed context — different file ownership framing, explicit disambiguation from the plan, or simpler task decomposition. If the fresh attempt still fails, flag the task in the morning report and continue with remaining work. Escalate to the user only if the failure matches blocker taxonomy #5 (unresolvable test failures blocking the whole plan)."
- Remove the line "If no response, spawn a new teammate for their remaining tasks. This is the fallback, not the default." — with the new iteration cap, fresh-teammate dispatch IS the default third attempt.
- Update "Red Flags": remove any language requiring user confirmation between tasks or phases.

**Approach for `implementer-prompt.md`:**
- Replace the "Before You Begin" block's ask-questions-now language with the decide-and-note block from design §3.3 (verbatim).
- Remove the "While you work" line that says "It's always OK to pause and clarify."
- Keep the "Report Format" section but add a new required field: `Judgment calls made` — a list of non-obvious decisions with `file:line — chose X over Y because [reason]`. This feeds the morning report.

**Acceptance criteria:**
- [ ] Blockers section added, referencing the taxonomy file, with both bias rules
- [ ] Checkpoints section has all 4 checkpoint triggers from design §6.3
- [ ] Recovery section has the 5-step orientation sequence from design §6.4
- [ ] Step 5a (pre-merge review) is inserted before Step 5 (finishing-a-development-branch)
- [ ] Iteration cap: 3 SendMessage rounds → fresh teammate with reframed context → flag-and-continue
- [ ] "Red Flags" contains no user-confirmation-between-tasks language
- [ ] `implementer-prompt.md` "Before You Begin" replaced with the decide-and-note block
- [ ] `implementer-prompt.md` has a new "Judgment calls made" required report field
- [ ] Committed with message `feat(team-driven): blocker taxonomy, pre-merge review, checkpointing, decide-and-note`

---

### Task 9: `subagent-driven-development` SKILL + implementer-prompt + fix-prompt

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/fix-prompt.md`

**What to build:** Same conceptual changes as Task 8 but for subagent-driven. Additionally, update `fix-prompt.md` for the reframed-context Nth-attempt case.

**Approach for `SKILL.md`:**
- Mirror Task 8's changes to `team-driven-development/SKILL.md`:
  - Blockers section → taxonomy reference + bias rules
  - Checkpoints section → design §6.3
  - Recovery section → design §6.4
  - New Step 4a (pre-merge review) before Step 5 (Complete)
  - Iteration-cap change: 3 resume attempts on Claude Code (or 3 fresh-dispatch-with-fix-context attempts on opencode) → fresh implementer with reframed context → flag-and-continue. Escalate only for blocker taxonomy #5.
- Update Red Flags: remove "dispatch a fresh subagent for fixes when resume is possible" — the new rule is: resume for iterations 1–3, fresh-with-reframed-context for iteration 4.

**Approach for `implementer-prompt.md`:**
- Identical changes to Task 8's `team-driven-development/implementer-prompt.md`:
  - Decide-and-note block replacing ask-questions-now
  - Remove "It's always OK to pause and clarify"
  - Add "Judgment calls made" report field

**Approach for `fix-prompt.md`:**
- Add a new section "Reframed-Context Attempt (4th iteration)" explaining:
  - When invoked with this prompt variant, the implementer is a fresh subagent (not a resume)
  - Context: the prior implementer's commits are referenced for reading-only (so the fresh agent can see what was tried); the prior implementer's chat context is gone
  - The fix-prompt body should include: original task text, prior commits + their summaries, all prior review-finding iterations, the specific reframing ("we're trying a different angle because the prior framing didn't converge — here's what to try differently")
  - The fresh subagent still follows the standard review/fix loop after its attempt

**Acceptance criteria:**
- [ ] `SKILL.md` mirrors Task 8's changes (blockers, checkpoints, recovery, pre-merge-review step, iteration-cap change)
- [ ] Iteration cap allows 3 resume attempts before fresh-with-reframed-context
- [ ] Red Flag about resume-over-fresh is updated to reflect the new 3-then-fresh rule
- [ ] `implementer-prompt.md` matches Task 8's implementer-prompt changes
- [ ] `fix-prompt.md` has a new "Reframed-Context Attempt" section for the 4th-iteration case
- [ ] Committed with message `feat(subagent-driven): blocker taxonomy, pre-merge review, checkpointing, decide-and-note`

---

## Phase 4 — Project docs (1 task, after Phase 3)

### Task 10: CLAUDE.md + README.md philosophy updates

**Files:**
- Modify: `CLAUDE.md` (razorback project, sections: "Execution Model", "What Not to Change")
- Modify: `README.md` (razorback project, sections: "Execution Model" if present, feature highlights)

**What to build:** Document the new default: razorback runs approved plans to completion; stops only for real blockers. Reference the blocker taxonomy. Note the pre-merge-review option.

**Approach for `CLAUDE.md`:**
- In "Execution Model" section, add a short "Autonomy" subsection stating: "Once a plan is approved, razorback's execution skills run to completion without inter-task or inter-phase user confirmation. Stops are governed by the blocker taxonomy at `skills/using-razorback/references/blocker-taxonomy.md`. See `docs/plans/2026-04-18-autonomous-execution-design.md` for the full rationale."
- In "What Not to Change" section, add: "Autonomous-by-default execution (blocker-gated, not task-gated)"
- Mention pre-merge-review briefly: "Optional pre-merge external review via codex-cli / gemini-cli / claude-cli, chosen per-plan at approval time"

**Approach for `README.md`:**
- If there's an "Execution Model" section, add a bullet: "Runs approved plans to completion overnight — only real blockers wake the user"
- In the feature highlights near the top, add: "Autonomous execution of approved plans with pre-merge external review (optional)"
- Link to the design doc for interested readers.

**Acceptance criteria:**
- [ ] `CLAUDE.md` "Execution Model" has an Autonomy subsection referencing the blocker taxonomy
- [ ] `CLAUDE.md` "What Not to Change" includes autonomous-by-default
- [ ] `README.md` feature highlights mention autonomous execution
- [ ] Neither doc contradicts the new default behavior anywhere
- [ ] Committed with message `docs: document autonomous-by-default execution model`

---

## Phase 5 — Integration verification (lead)

Not a dispatchable task. Run after all Phase 1–4 commits land. The lead performs these checks inline:

1. **Cross-reference audit:** grep for `blocker-taxonomy.md`, `morning-report-template.md`, `pre-merge-review`, `decide-and-note` / "Judgment calls made" — verify every reference resolves to a real file/section.
2. **No dangling "ask the user" language:** grep execution skills for `ask the user`, `ask your partner`, `escalate to user`, `human partner` — verify each remaining hit is appropriate (e.g. a real blocker case).
3. **Flow simulation:** read the four skills in the order an autonomous run would hit them (writing-plans → team-driven-development → pre-merge-review → finishing-a-development-branch) and confirm the handoffs are coherent.
4. **Acceptance-criteria sweep:** tick every checkbox in Tasks 1–10's acceptance criteria.
5. **Tests:** run `./scripts/bump-version.sh --check` to confirm no version drift; run any repo-level lint/format checks.
6. **Commit + PR:** run `razorback:finishing-a-development-branch` (interactive mode — this run is the bootstrap, executed under the OLD flow, so the 4-option menu still applies here). Choose option 2 (Push + PR).

---

## Remember

- **Julie + Goldfish required.** Implementers use `julie:get_context`, `julie:get_symbols`, `julie:deep_dive` for orientation; `julie:fast_refs` before changing any cross-referenced symbol. Goldfish is used for the new Checkpoints/Recovery language but not invoked during plan implementation itself.
- **TDD applies to code.** Most tasks here edit markdown skill files — TDD in the "write failing test first" sense doesn't apply, but each change is verifiable against its acceptance criteria.
- **DRY.** Every blocker-taxonomy reference links to the shared file. Every morning-report reference links to the shared template. No inlining — drift is the enemy.
- **Commit per task.** One commit per task, matching the commit-message template in each task's acceptance criteria.
- **File ownership respected.** No two teammates edit the same file. Phase 3's five tasks touch distinct files; safe to parallelize.
- **This plan bootstraps the new behavior.** It's executed under the OLD (pre-autonomous) flow. After this lands, future plans execute under the NEW (autonomous) flow.
