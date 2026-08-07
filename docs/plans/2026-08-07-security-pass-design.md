# Pre-Merge Security Pass Design

**Status:** Draft for user review (brainstormed 2026-08-07; decisions confirmed via structured Q&A)
**Origin:** Follow-on to the security lane (`docs/plans/2026-08-07-security-lane-design.md`). The lane gave the general pre-merge reviewer one security attack-surface bullet; this design gives pre-merge review a dedicated security pass with real depth.

## Why

Pre-merge review runs one adversarial pass in which security competes with six other attack-surface categories for the reviewer's attention. For a security-critical org, one bullet is not a security review. A dedicated pass reviews the same diff with a security-only stance, at the cost of one extra reviewer invocation on runs that already pay for review.

## Confirmed decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Shape | Dedicated second reviewer dispatch with a security-only adversarial prompt — same CLI, same JSON schema, findings folded into the same verify/classify/fix flow. |
| 2 | Trigger | Rides the reviewer choice: reviewer chosen → the same CLI runs both passes; reviewer `none` → neither. No new knobs. An org that wants security review always mandates a reviewer via its External model policy block. |

## Design

### 1. Canonical security prompt: `skills/security-review/security-adversarial-prompt.txt`

Same placeholder contract as the existing trio, in the same order: `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, `{{REVIEW_INPUT}}`.

Section plan (shared sections stay byte-identical to the trio; the sync guard enforces it):

- **Opening line (unique, fixed):** `You are performing an adversarial security review.` — deliberately model-neutral so one file serves codex and claude; the second line ("Your job is to break confidence in the change, not to validate it.") matches the trio.
- **OPERATING STANCE:** byte-identical to the trio (the skepticism stance is generic).
- **ATTACK SURFACE (security-only, replaces the trio's list):**
  - Injection in every form (SQL/command/template) and unsafe deserialization
  - Authentication, authorization, session handling, and tenant isolation
  - Secrets, tokens, keys: presence in code or logs, weak storage, weak transport
  - Sensitive-data flows: what is collected, logged, cached, or sent to third parties
  - SSRF, path traversal, and unvalidated redirects/file access
  - Dependency and supply-chain risk: new packages, pinned versions, typosquats
  - Crypto misuse: home-rolled primitives, weak modes, bad randomness
- **REVIEW METHOD:** trio wording with a tool-neutral read-only sentence: `Investigate read-only; do not modify files.` (no per-CLI variant family — this is what lets one file serve both reviewers).
- **FINDING BAR, CALIBRATION, GROUNDING:** byte-identical to the trio.
- **Tail:** `Return JSON matching the provided schema.` + `REPOSITORY CONTEXT:` + `{{REVIEW_INPUT}}` — matching the trio.

### 2. Flow change in `skills/pre-merge-review/SKILL.md`

- **Step 2 (dispatch):** when a reviewer is chosen, dispatch the chosen CLI twice against the same diff and schema: first the general pass (existing prompt), then the security pass (the canonical prompt above, wired per the reviewer-prompts files). The external-model policy gate applies once — same provider for both passes.
- **Step 3 (parse):** parse both outputs with the existing per-CLI rules into one merged finding list; each finding is tagged with its pass (`general` / `security`).
- **Step 4 (verify):** one added dedupe rule — when both passes flag the same defect (same file/lines/root issue), collapse to one finding and note it as dual-flagged. Dual-flagging is a confidence signal for classification, never double-counted work.
- **Steps 5–6:** unchanged (fix dispatch, verification).
- **Step 7 (report):** emit per-pass counts alongside the aggregate (see §4).
- **Red flags additions:** skipping the security pass when a reviewer is chosen is the silent-downgrade red flag; the single-pass rule applies to each pass — no re-review loop for either.
- **Overview/process diagram:** updated to name both passes.

### 3. Reviewer invocation docs

`skills/pre-merge-review/reviewer-prompts/codex.md` and `claude.md` each gain a **Security pass** section:

- **codex:** same `codex exec --ephemeral -s read-only --output-schema …` invocation, with the adversarial prompt built from `$SKILL_DIR/../security-review/security-adversarial-prompt.txt` (same placeholder-split construction), output to a second file (e.g. `reviewer-output-security.json`).
- **claude:** same validated baseline flags, with `--system-prompt-file` pointed at the canonical security prompt, output to a second file.
- Parse rules, cost/token notes, and error handling are the same as the general pass, stated by reference. **A security-pass failure is reviewer unavailability — a blocker with the same triggers and protocol as the general pass, never a silent skip.**

### 4. Morning report: `skills/finishing-a-development-branch/morning-report-template.md`

In the External review section:

- Add a per-pass count line directly under the section heading area: `- **Passes:** general {{general_findings_count}} / security {{security_findings_count}}`
- Aggregate placeholders (`{{findings_total}}`, fixed/dismissed/flagged counts) now cover both passes combined.
- Per-finding sub-blocks carry the pass label (e.g. a `[security]` prefix on the finding title); dual-flagged findings say so.
- Cost note covers both invocations: claude up to two `--max-budget-usd` caps per run; codex still reports no per-request counts.

### 5. Cross-reference: `skills/security-review/SKILL.md`

One short paragraph in the canonical lane skill: pre-merge review runs a dedicated security pass using this skill's `security-adversarial-prompt.txt` whenever a reviewer is chosen; trigger semantics live in `razorback:pre-merge-review`.

### 6. Guard tests

- **`tests/adversarial-prompt-sync.test.mjs`:**
  - The quartet (trio + security prompt) keeps `OPERATING STANCE`, `FINDING BAR`, `CALIBRATION`, `GROUNDING` byte-identical. `ATTACK SURFACE` remains trio-only (the security prompt's is deliberately different).
  - The security prompt's opening line equals the fixed neutral sentence.
  - The security prompt declares the placeholders in canonical order.
- **`tests/security-checklist-sync.test.mjs`:**
  - Both reviewer-prompts files contain a Security pass section referencing `security-adversarial-prompt.txt`.
  - `pre-merge-review/SKILL.md` references the security pass and the dedupe rule (keyed on a pinned phrase).
  - The morning-report template contains `{{general_findings_count}}` and `{{security_findings_count}}`.

## Edge cases

- **Both passes clean:** normal clean-review path; report shows `general 0 / security 0`.
- **Same defect flagged by both passes:** dedupe to one finding, mark dual-flagged; classify once, fix once.
- **General pass succeeds, security pass unavailable (or vice versa):** reviewer unavailability — blocker; stop, no push, no PR, partial report. The user chose a reviewer; half a review is a silent downgrade.
- **Cost:** each pass keeps its own caps. The claude worst case doubles to 2 × `--max-budget-usd`. Codex reports no counts (existing note stands).
- **Policy gate:** one provider check covers both passes (same CLI); the dispatch-time reviewer recheck from the lane applies unchanged.

## File inventory

- Create: `skills/security-review/security-adversarial-prompt.txt`
- Modify: `skills/pre-merge-review/SKILL.md` (overview/diagram, Steps 2, 3, 4, 7, red flags)
- Modify: `skills/pre-merge-review/reviewer-prompts/codex.md` (Security pass section)
- Modify: `skills/pre-merge-review/reviewer-prompts/claude.md` (Security pass section)
- Modify: `skills/finishing-a-development-branch/morning-report-template.md` (per-pass counts, pass labels, cost note)
- Modify: `skills/security-review/SKILL.md` (cross-reference paragraph)
- Modify: `tests/adversarial-prompt-sync.test.mjs` (quartet shared-section guard, opening line, placeholder order)
- Modify: `tests/security-checklist-sync.test.mjs` (presence guards)

## Acceptance criteria

- [ ] The canonical security prompt exists with the section plan above; shared sections byte-match the trio.
- [ ] Pre-merge review dispatches both passes when a reviewer is chosen, parses both, tags findings by pass, and dedupes dual-flags.
- [ ] Both reviewer-prompts files carry runnable security-pass invocations with the same error-handling contract.
- [ ] The morning report renders per-pass counts and pass labels.
- [ ] Guard suites extended; `npm test` green; version audit clean.
- [ ] No re-review loop for either pass; skipping the security pass with a reviewer chosen is a documented red flag.

## Out of scope

- grok-cli / cursor-agent (not pre-merge reviewers).
- Scan scopes (already run at the branch gate).
- Cross-model split (general pass on one CLI, security pass on another) — rejected below.
- A separate security reviewer choice knob (rejected in Q&A: rides the reviewer choice).

## Rejected alternatives

- **Deepening the single pass** — security keeps competing with six other categories for attention; depth requires a dedicated stance.
- **Conditional security pass (diff-triggered)** — trigger criteria are a new judgment surface that fails open on misclassified diffs; the chosen design is deterministic.
- **Per-CLI security prompt variants** — a second sync-guarded prompt family for wording differences a tool-neutral sentence eliminates.
- **Cross-model passes** — doubles auth/policy surface and violates "one reviewer choice"; cross-model checking already exists as `razorback:cross-model-convergence`.

## Architecture Quality

**Affected modules:** skills + guard tests only; one new prompt asset, seven file edits.
**Caller-facing interface:** the security prompt's placeholder contract (identical to the trio), two new template placeholders, and the pass-tag vocabulary (`general` / `security`).
**Depth/locality check:** the security stance lives in one canonical prompt; the flow references it; reviewer-prompts stay thin invocation wrappers.
**Test surface:** guards assert through the same files agents read — shared-section byte-sync, placeholder order, presence of the pass wiring.
**Rejected shortcuts:** duplicating the general prompt per CLI for the security pass (new drift family); putting the security prompt inside pre-merge-review (the lane's canonical home is `security-review`).
**Architecture risk:** low — additive, guard-locked, no interface breaks.
