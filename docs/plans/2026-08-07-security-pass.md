# Pre-Merge Security Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use razorback:subagent-driven-development when subagent delegation is available. Fall back to razorback:executing-plans for single-task, tightly-sequential, or no-delegation runs.

**Goal:** Pre-merge review runs a dedicated security pass — a second dispatch of the chosen reviewer with a security-only adversarial prompt — whenever a reviewer is chosen.

**Architecture:** One canonical, model-neutral security prompt in the lane's home (`security-review`); `pre-merge-review` orchestrates two dispatches and one merged, pass-tagged finding list; reviewer-prompts stay thin invocation wrappers; guard suites extend to a quartet shared-section byte-sync plus presence checks.

**Tech Stack:** Markdown skill docs, one prompt asset, Node.js built-in test runner.

**Architecture Quality:** From the approved design (`2026-08-07-security-pass-design.md`): additive, low risk; canonical prompt in `security-review`, referenced not duplicated; the two checklist-style guard families extend rather than fork. Workers report plan mismatches instead of redesigning.

**Spec:** `docs/plans/2026-08-07-security-pass-design.md` (approved 2026-08-07, reviewer choice for this run: codex).

## Global Constraints

- **The canonical prompt file** `skills/security-review/security-adversarial-prompt.txt` is created with EXACTLY this content (the OPERATING STANCE, FINDING BAR, CALIBRATION, and GROUNDING sections are byte-identical to the existing trio — the extended sync guard enforces it):

  ```
  You are performing an adversarial security review.
  Your job is to break confidence in the change, not to validate it.

  Target: {{TARGET_LABEL}}
  User focus: {{USER_FOCUS}}

  OPERATING STANCE:
  Default to skepticism. Assume the change can fail in subtle, high-cost, or
  user-visible ways until evidence says otherwise. Do not give credit for good
  intent, partial fixes, or likely follow-up work. If something only works on
  the happy path, treat that as a real weakness.

  ATTACK SURFACE (security only — prioritize expensive, dangerous, or hard-to-detect failures):
  - Injection in every form (SQL, command, template) and unsafe deserialization
  - Authentication, authorization, session handling, and tenant isolation
  - Secrets, tokens, and keys: presence in code or logs, weak storage, weak transport
  - Sensitive-data flows: what is collected, logged, cached, or sent to third parties
  - SSRF, path traversal, and unvalidated redirects or file access
  - Dependency and supply-chain risk: new packages, pinned versions, typosquats
  - Crypto misuse: home-rolled primitives, weak modes, bad randomness

  REVIEW METHOD:
  Actively try to disprove the change. Look for violated invariants, missing
  guards, unhandled failure paths, and assumptions that stop being true under
  stress. Trace how bad inputs, retries, concurrent actions, or partially
  completed operations move through the code. If the user supplied a focus area,
  weight it heavily, but still report any other material issue you can defend.
  Investigate read-only; do not modify files.

  FINDING BAR:
  Report only material findings. No style feedback, naming feedback, low-value
  cleanup, or speculative concerns without evidence. Each finding must answer:
  1. What can go wrong?
  2. Why is this code path vulnerable?
  3. What is the likely impact?
  4. What concrete change would reduce the risk?

  CALIBRATION:
  Prefer one strong finding over several weak ones. Do not dilute serious issues
  with filler. If the change looks safe, say so directly and return no findings.

  GROUNDING:
  Every finding must be defensible from the provided context. Do not invent
  files, lines, code paths, or runtime behavior you cannot support. If a
  conclusion depends on an inference, state that explicitly and keep the
  confidence honest.

  Return JSON matching the provided schema.

  REPOSITORY CONTEXT:
  {{REVIEW_INPUT}}
  ```

- **Pass vocabulary:** findings are tagged `general` / `security`; a defect flagged by both passes is collapsed and noted `dual-flagged` (guards key on `dual-flagged`).
- **Morning-report pass line**, added in the External review section directly below the section's reviewer-values comment:
  `- **Passes:** general {{general_findings_count}} / security {{security_findings_count}}`
- **Reviewer-prompts section heading:** `## Security pass`, referencing `security-adversarial-prompt.txt` via `$SKILL_DIR/../security-review/security-adversarial-prompt.txt`.
- **Blocker rule:** a security-pass failure is reviewer unavailability — same triggers and protocol as the general pass; never a silent skip.
- **Guard shared-section set for the quartet:** `OPERATING STANCE`, `FINDING BAR`, `CALIBRATION`, `GROUNDING`. `ATTACK SURFACE` stays trio-only. Security prompt opening line is exactly `You are performing an adversarial security review.`
- No changes to grok/cursor skills, scan scopes, manifests, or instruction-tier copies. No version bump in this plan.

## Verification Strategy

**Project source of truth:** `CLAUDE.md` — `npm test` + `./scripts/bump-version.sh --audit`; CI mirrors both.

**Worker red/green scope:** Task 5: `node --test tests/adversarial-prompt-sync.test.mjs tests/security-checklist-sync.test.mjs`. Tasks 1–4 are content tasks: verify landed content against the pinned strings; `npm test` once as sanity ceiling (Task 1 note: the CURRENT sync guard only byte-compares the trio, so the new prompt does not affect it until Task 5 extends it).

**Worker ceiling:** `npm test`.

**Worker gate invariant:** Task 5's extended guards pass against the landed tree AND its negative meta-tests prove the quartet guard flags a mutated shared section.

**Lead affected-change scope:** `npm test` after the batch and after Task 5.

**Branch gate:** `npm test && ./scripts/bump-version.sh --audit`.

**Security scope:** none declared — this repo is prose + guard tests with zero runtime dependencies; adopting scanners for razorback itself remains recorded follow-up work.

**Replay/metric evidence:** not applicable.

**Escalation triggers:** any needed edit to the trio prompt files, grok/cursor skills, or rule-copy-guarded files is a plan mismatch — stop and report.

**Assigned verification failure:** workers stop and report when assigned verification fails, unless this plan explicitly says to update that gate.

**Verification ledger:** record invariant, command, scope label, commit SHA, result, timestamp per worker gate, batch check, and branch gate.

## Parallel Execution Contract

| Task | Parallel batch | File ownership | Serialization required | Dependency reason |
|---|---|---|---|---|
| Task 1: canonical security prompt | Batch A | Create: `skills/security-review/security-adversarial-prompt.txt` | No | None - safe parallel batch. |
| Task 2: pre-merge-review flow | Batch A | Modify: `skills/pre-merge-review/SKILL.md` | No | None - safe parallel batch. |
| Task 3: reviewer invocation docs | Batch A | Modify: `skills/pre-merge-review/reviewer-prompts/codex.md`, `skills/pre-merge-review/reviewer-prompts/claude.md` | No | None - safe parallel batch. |
| Task 4: morning report + cross-ref | Batch A | Modify: `skills/finishing-a-development-branch/morning-report-template.md`, `skills/security-review/SKILL.md` | No | None - safe parallel batch. |
| Task 5: guard extensions | None - serial (after Batch A) | Modify: `tests/adversarial-prompt-sync.test.mjs`, `tests/security-checklist-sync.test.mjs` | Yes | Asserts content landed by Tasks 1–4 — must run against the finished Batch A tree. |

Commit mode: `parallel-lead-commit` — workers hand verified diffs to the lead; the lead reviews inline, stages owned files plus the plan, and commits.

### Task 1: canonical security prompt

**Files:**
- Create: `skills/security-review/security-adversarial-prompt.txt`

**Interfaces:**
- Consumes: the pinned file content in Global Constraints — byte-exact, including the trailing newline after `{{REVIEW_INPUT}}`.
- Produces: the prompt asset Tasks 2, 3, and 5 reference.

**Contract inputs:** Global Constraints prompt block, copied exactly (strip the plan's 2-space fence indentation).

**File ownership:** Create: `skills/security-review/security-adversarial-prompt.txt`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**What to build:** The file, byte-exact. Verify the four shared sections byte-match the trio's by comparing against `skills/codex-cli/adversarial-prompt.txt` (Miller/read the landed trio file — do not trust memory).

**Acceptance criteria:**
- [x] File matches the pinned content; the four shared sections byte-match the trio; placeholders in canonical order.

### Task 2: pre-merge-review flow

**Files:**
- Modify: `skills/pre-merge-review/SKILL.md`

**Interfaces:**
- Consumes: pass vocabulary and blocker rule from Global Constraints.
- Produces: the orchestration text Tasks 3's sections plug into; the `dual-flagged` phrase Task 5 keys on.

**Contract inputs:** Design §2. Edit sites: Overview paragraph (name both passes); the dot process diagram (Step 2/3 nodes mention both passes — keep the diagram shape, adjust labels); Step 2 (dispatch both passes — general prompt then the canonical security prompt per the reviewer-prompts files; policy gate applies once, same provider); Step 3 (parse both outputs into one merged list, tag each finding `general` / `security`); Step 4 (add the dedupe rule: a defect flagged by both passes is collapsed to one finding and noted `dual-flagged` — a confidence signal for classification, never double-counted work); Step 7 (emit per-pass counts for the template's Passes line); Red flags (add: skipping the security pass when a reviewer is chosen is the silent-downgrade red flag; the single-pass rule applies to each pass).

**File ownership:** Modify: `skills/pre-merge-review/SKILL.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] All six edit sites landed; the exact string `dual-flagged` present; reviewer-unavailability wording covers either pass; no invocation details inlined (those live in reviewer-prompts).

### Task 3: reviewer invocation docs

**Files:**
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md`
- Modify: `skills/pre-merge-review/reviewer-prompts/claude.md`

**Interfaces:**
- Consumes: the `## Security pass` heading + prompt path convention from Global Constraints; each file's existing invocation and error-handling structure.
- Produces: runnable second-pass invocations Task 5's presence guard asserts.

**Contract inputs:** Each file gains a `## Security pass` section after its parsing/error-handling material: codex — same `codex exec --ephemeral --color never -s read-only --output-schema` invocation with the adversarial prompt built from `$SKILL_DIR/../security-review/security-adversarial-prompt.txt` (same placeholder-split construction as the general pass; reference it rather than duplicating the construction block), output to `reviewer-output-security.json`; claude — same validated baseline flags with `--system-prompt-file` pointed at the canonical security prompt, output to a second file. State by reference: parse rules, cost notes, and error handling identical to the general pass; a security-pass failure is reviewer unavailability with the same triggers (blocker — never a silent skip). Mind `tests/reviewer-prompt-assets.test.mjs`: every `$SKILL_DIR/…` path you write must resolve to a real file.

**File ownership:** Modify: both reviewer-prompts files
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] Both files carry the `## Security pass` section with a resolvable prompt path and the blocker statement; `node --test tests/reviewer-prompt-assets.test.mjs` green.

### Task 4: morning report + cross-ref

**Files:**
- Modify: `skills/finishing-a-development-branch/morning-report-template.md`
- Modify: `skills/security-review/SKILL.md`

**Interfaces:**
- Consumes: the pinned Passes line and pass-label convention from Global Constraints.
- Produces: the `{{general_findings_count}}` / `{{security_findings_count}}` placeholders Task 5 asserts.

**Contract inputs:** Template — add the pinned Passes line in the External review section directly below the reviewer-values comment; annotate the per-finding sub-block comments so finding titles carry their pass label (e.g. `[security]` prefix) and dual-flagged findings say so; extend the cost-note comment to cover two invocations (claude sums the actual cost of both passes; codex reports no counts — v0.29.0 removed the spend cap this line originally referenced). security-review/SKILL.md — one short paragraph (place it after the Check procedure material, before the Security Checklist section): pre-merge review runs a dedicated security pass using this skill's `security-adversarial-prompt.txt` whenever a reviewer is chosen; trigger semantics live in `razorback:pre-merge-review`. Do not disturb any content guarded by `tests/security-checklist-sync.test.mjs`.

**File ownership:** Modify: `skills/finishing-a-development-branch/morning-report-template.md`, `skills/security-review/SKILL.md`
**Serialization required:** No
**Dependency reason:** None - safe parallel batch.

**Acceptance criteria:**
- [x] Passes line byte-exact; pass-label and dual-flag annotations present; cross-ref paragraph placed; existing guards green (`node --test tests/security-checklist-sync.test.mjs`). (Accepted extra: `- **Cost:** {{cost_note}}` line — the template had no cost slot; Task 5 guards it.)

### Task 5: guard extensions

**Files:**
- Modify: `tests/adversarial-prompt-sync.test.mjs`
- Modify: `tests/security-checklist-sync.test.mjs`

**Interfaces:**
- Consumes: landed content from Tasks 1–4; the quartet shared-section set, opening line, and pinned strings from Global Constraints.
- Produces: CI guards for every security-pass invariant.

**Contract inputs:** adversarial-prompt-sync — extend: the quartet (trio + `skills/security-review/security-adversarial-prompt.txt`) keeps `OPERATING STANCE`, `FINDING BAR`, `CALIBRATION`, `GROUNDING` byte-identical (`ATTACK SURFACE` comparisons stay trio-only); the security prompt's opening line equals the pinned neutral sentence; the security prompt declares placeholders in canonical order; add a negative meta-test proving the quartet guard flags a mutated shared-section sample. security-checklist-sync — presence guards: both reviewer-prompts contain `## Security pass` and `security-adversarial-prompt.txt`; `pre-merge-review/SKILL.md` contains `dual-flagged`; the template contains both `{{general_findings_count}}` and `{{security_findings_count}}`. House idioms; zero comments in test bodies; assertion messages name the file and the fix.

**File ownership:** Modify: both test files
**Serialization required:** Yes
**Dependency reason:** Asserts content landed by Tasks 1–4 — must run against the finished Batch A tree.

**Acceptance criteria:**
- [x] `node --test tests/adversarial-prompt-sync.test.mjs tests/security-checklist-sync.test.mjs` green with the new guards (22/22); meta-test proves detection; `npm test` green (195/195).

## Completion

After Batch A review + commits, Task 5 review + commit, and the branch gate: `razorback:pre-merge-review` with reviewer codex (both passes — this run dogfoods the feature it ships, policy status: no policy declared), then `razorback:finishing-a-development-branch` (push, PR against main, morning report with per-pass counts).
