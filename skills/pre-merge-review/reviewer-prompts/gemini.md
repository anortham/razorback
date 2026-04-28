# Reviewer Prompt: gemini

Invocation and parsing instructions for running `gemini` as the pre-merge adversarial reviewer.

**Critical distinction from codex/claude:** gemini has **NO `--json-schema` or `--output-schema` flag** (verified against `gemini --help` on 2026-04-18). Passing the schema is prompt-side only — we inline the schema into the user prompt and ask gemini to conform. `-o json` then wraps the model response in a metadata envelope:

```json
{
  "session_id": "...",
  "response": "...",
  "stats": { "models": { "gemini-3-pro": { "tokens": { "prompt": N, "completion": M } } } }
}
```

The `.response` field is plain text, **often fenced in markdown** (```` ```json … ``` ````). That means parsing requires envelope-unwrap plus markdown-strip plus a fallback. All of this lives in the parsing protocol below.

## Preconditions

- `gemini --version` returns successfully.
- Gemini is authenticated (auth is handled interactively on first use — no separate status command). If the first run fails with an auth error, this is **blocker taxonomy #1** (credentials broken) — stop, surface, do not push.
- Step 1 of the pre-merge-review flow has already built `$DIFF`, `$FILE_STAT`, `$COMMIT_LOG`, `$PROJECT_DIR`, and (optionally) `$USER_FOCUS`.

## Build the adversarial prompt

Use the same adversarial framing as codex/claude. The template is inlined below as `$ADVERSARIAL_TEMPLATE`. Substitute `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`, and `{{REVIEW_INPUT}}` the same way the codex and claude paths do. The schema is also inlined because gemini has no `--json-schema` / `--output-schema` flag — we append it to the user prompt and rely on gemini to conform.

## Invocation

```bash
ADVERSARIAL_TEMPLATE=$(cat <<'ADV_EOF'
You are performing an adversarial software review.
Your job is to break confidence in the change, not to validate it.

Target: {{TARGET_LABEL}}
User focus: {{USER_FOCUS}}

OPERATING STANCE:
Default to skepticism. Assume the change can fail in subtle, high-cost, or
user-visible ways until evidence says otherwise. Do not give credit for good
intent, partial fixes, or likely follow-up work. If something only works on
the happy path, treat that as a real weakness.

ATTACK SURFACE (prioritize expensive, dangerous, or hard-to-detect failures):
- Auth, permissions, tenant isolation, and trust boundaries
- Data loss, corruption, duplication, and irreversible state changes
- Rollback safety, retries, partial failure, and idempotency gaps
- Race conditions, ordering assumptions, stale state, and re-entrancy
- Empty-state, null, timeout, and degraded dependency behavior
- Version skew, schema drift, migration hazards, and compatibility regressions
- Observability gaps that would hide failure or make recovery harder

REVIEW METHOD:
Actively try to disprove the change. Look for violated invariants, missing
guards, unhandled failure paths, and assumptions that stop being true under
stress. Trace how bad inputs, retries, concurrent actions, or partially
completed operations move through the code. If the user supplied a focus area,
weight it heavily, but still report any other material issue you can defend.
You may inspect repository files via whatever read-only mechanism your harness
provides. Do not modify files.

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
ADV_EOF
)

SCHEMA_JSON=$(cat <<'SCHEMA_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["verdict", "summary", "findings", "next_steps"],
  "properties": {
    "verdict": { "type": "string", "enum": ["approve", "needs-attention"] },
    "summary": { "type": "string", "minLength": 1 },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["severity", "title", "body", "file", "line_start", "line_end", "confidence", "recommendation"],
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
          "title": { "type": "string", "minLength": 1 },
          "body": { "type": "string", "minLength": 1 },
          "file": { "type": "string", "minLength": 1 },
          "line_start": { "type": "integer", "minimum": 1 },
          "line_end": { "type": "integer", "minimum": 1 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "recommendation": { "type": "string" }
        }
      }
    },
    "next_steps": { "type": "array", "items": { "type": "string", "minLength": 1 } }
  }
}
SCHEMA_EOF
)

# Substitute target-specific placeholders into the template. Use bash
# parameter expansion so the `{{TARGET_LABEL}}` / `{{USER_FOCUS}}` /
# `{{REVIEW_INPUT}}` tokens are replaced with actual values before the
# prompt reaches gemini. Without this step gemini receives literal
# placeholder text and loses focus / commit-log / file-stat context.
TARGET_LABEL="$FILE_STAT (branch: base..HEAD)"
REVIEW_INPUT="Files changed:
$FILE_STAT

Commit log:
$COMMIT_LOG

Diff:
$DIFF"

FINAL_PROMPT="${ADVERSARIAL_TEMPLATE//\{\{TARGET_LABEL\}\}/$TARGET_LABEL}"
FINAL_PROMPT="${FINAL_PROMPT//\{\{USER_FOCUS\}\}/${USER_FOCUS:-none specified}}"
FINAL_PROMPT="${FINAL_PROMPT//\{\{REVIEW_INPUT\}\}/$REVIEW_INPUT}"

GEMINI_MODEL="${RAZORBACK_GEMINI_REVIEW_MODEL:-gemini-3-pro}"

cd "$PROJECT_DIR" && gemini -o json -m "$GEMINI_MODEL" --yolo \
  "$FINAL_PROMPT

Return your response as a JSON object matching this schema:
$SCHEMA_JSON" 2>/dev/null
```

Flag rationale:

- `-o json` — wraps the model response in the envelope described above. Without this, the model output lands as raw text on stdout with no metadata. We want the envelope so we can extract `stats.models.*.tokens` for cost tracking.
- `-m "$GEMINI_MODEL"` - strategy or escalation tier from the plan's Model Routing section. Do not use mechanical-tier models for adversarial review.
- `--yolo` — **required** so gemini auto-approves its own `Read` tool calls. Without it, gemini stalls waiting for interactive approval. We still instruct gemini by prompt to be read-only (no file writes). `--yolo` widens gemini's auto-approval for tools, not its file-write authorization; the read-only behavior is enforced by prompt.
- No `--json-schema` / `--output-schema` — the flag does not exist. The schema is inlined into the prompt.
- `2>/dev/null` — drops gemini's auth messages and debug info from stderr.

**Timeout:** at least `600000` ms (10 min). Escalation-tier models on a large diff can take minutes.

## Parsing protocol (5 sub-steps — the lead executes this)

1. **Unwrap the envelope.** Extract the model's text from `.response`:

   ```bash
   MODEL_TEXT=$(jq -r '.response' < gemini-output.json)
   ```

   Also capture tokens for the cost line in the morning report:

   ```bash
   TOKENS=$(jq -r '.stats.models | to_entries[0].value.tokens' < gemini-output.json)
   # yields something like {"prompt":12345,"completion":678}
   ```

2. **Strip markdown code fences if present.** Gemini often wraps its JSON in a fenced block. The fence lines start with ``` and an optional language tag.

   ```bash
   CLEANED=$(echo "$MODEL_TEXT" | sed -E 's/^```(json)?$//; s/^```$//' | sed '/^$/d')
   ```

   (The `sed '/^$/d'` drops the now-empty fence-line rows. Keep internal blank lines inside strings by doing the fence-strip before the empty-line prune — the above does that because the empty lines it prunes are the ones the first `sed` just emptied.)

3. **Validate the cleaned text is parseable JSON:**

   ```bash
   echo "$CLEANED" | jq empty
   ```

   `jq empty` exits non-zero if the input is not JSON. If this fails, go to sub-step 4's retry.

4. **Validate against the shared schema.** Run a schema check (using `ajv`, `check-jsonschema`, or a project helper that walks the shape manually). If validation fails:

   - **Retry once** with a stricter prompt. Re-invoke gemini with the same context but prepend:

     > IMPORTANT: Return ONLY the JSON object. Do not wrap it in markdown fences. Do not add any prose before or after. Your entire response must be valid JSON conforming to the schema.

   - If the retry output still fails schema validation, **fall back to a structured-markdown parser**. Gemini's second-best output mode is structured markdown; regex-match on blocks of the form:

     ```
     ## Finding N
     - Severity: <critical|high|medium|low>
     - File: path/to/file.ext:line_start-line_end
     - Title: <short title>
     - Body: <detailed description>
     - Recommendation: <concrete change>
     ```

     Parse each block into the shared finding shape. `confidence` is not present in the markdown fallback — default it to `0.7` and note in the morning report that the finding came from the fallback parser (so the user knows confidence was not reviewer-reported).

5. **Normalize to the shared finding shape before Step 4.** Whether the output came from the JSON path or the markdown fallback, every finding handed to verification must have the fields defined in the shared schema (inlined above, canonical at `skills/codex-cli/schemas/review-output.schema.json` in the razorback plugin): `severity`, `title`, `body`, `file`, `line_start`, `line_end`, `confidence`, `recommendation`. Missing fields are filled with conservative defaults (`confidence=0.7`, `line_end=line_start` if only one line was given) and the fallback use is noted in the morning report.

## Cost / token logging

Log `stats.models.*.tokens` from the envelope into the morning report's per-reviewer cost line:

```
External review cost (gemini): prompt=12345, completion=678 tokens
```

**Asymmetry note:** this field is unique to gemini. `codex` and `claude` do not surface per-request token counts in their JSON output. Render the cost line for gemini only; for the other two reviewers, note "cost not reported by CLI" or omit the line entirely.

## Yolo + read-only guarantee

`--yolo` is required so gemini auto-approves its own tool invocations and does not stall waiting for interactive confirmation — notably including file reads and shell commands. The adversarial prompt instructs gemini to be read-only ("Do not modify files") but that is prompt-level only. If gemini disobeys and writes a file anyway, that is an integrity failure — abort the review, revert the unauthorized change with `git checkout -- <file>`, log the incident in the morning report as a flagged concern, and consider switching the reviewer choice to codex or claude for this run. Do not push a branch that contains reviewer-originated writes.

## Error handling

**Reviewer unavailability is a blocker when the user chose this reviewer at plan approval.** Stop the run, do NOT push, do NOT create a PR, emit a partial morning report with `Status: Blocked` and the specific failure in `Blockers hit`, and exit.

Unavailability triggers:

- **Auth failure** (gemini first-call auth error) → **blocker taxonomy #1** (credentials broken). Tell the user to authenticate gemini interactively.
- **Rate limit exhausted** (free tier 60 req/min, 1000/day; gemini auto-retries with backoff internally, but if the single review call still 429s after that) → **blocker taxonomy #1** — credentials work but the backing service is unavailable. Suggest retry-after-cooldown or switching to a different reviewer choice on the next run.
- **Empty stdout** → **blocker taxonomy #1**. Remove `2>/dev/null` and re-run to surface stderr in the blocker note.
- **Envelope missing** (stdout is not valid JSON at the envelope level) → **blocker taxonomy #1**. `-o json` failed upstream. Common cause: `--yolo` prompting approval that the runtime blocked.
- **Schema violation that persists after the retry AND the markdown fallback fails** (parsing protocol sub-step 4 exhausted all paths) → **blocker taxonomy #5** (unresolvable — the reviewer is producing unusable output). The retry + fallback is gemini's built-in equivalent of codex/claude's "retry once"; once both fail, treat it as terminal.
- **Reviewer-originated file writes** (gemini disobeys the read-only prompt and edits a file despite `--yolo` being intended only for tool auto-approval) → **blocker taxonomy #2** (destructive action not authorized by the plan). Abort the review, revert the unauthorized change with `git checkout -- <file>`, and block the run. See "Yolo + read-only guarantee" above.

**Not a blocker:**

- **Timeout (Bash-level)** — first raise the Bash tool's timeout and re-run. Splitting the diff breaks cross-file reasoning and is a last resort. Only if generous timeouts also fail does this become a blocker (taxonomy #1 — service unavailable).
