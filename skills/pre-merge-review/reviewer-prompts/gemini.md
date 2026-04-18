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

Use the same adversarial framing as codex/claude. Copy `~/.claude/skills/codex-cli/SKILL.md` "Adversarial Prompt Template" text (or the copy embedded in `~/.claude/skills/claude-cli/adversarial-prompt.txt`) into the user prompt, then append the schema and the diff inline because gemini cannot accept a schema file as a flag.

## Invocation

```bash
cd "$PROJECT_DIR" && gemini -o json -m gemini-3-pro --yolo \
  "$(cat reviewer-prompts/gemini-adversarial-prompt.txt 2>/dev/null || echo "$ADVERSARIAL_PROMPT_FROM_CODEX_CLI")

Return your response as a JSON object matching this schema:
$(cat ~/.claude/skills/codex-cli/schemas/review-output.schema.json)

Diff to review:
$DIFF" 2>/dev/null
```

Flag rationale:

- `-o json` — wraps the model response in the envelope described above. Without this, the model output lands as raw text on stdout with no metadata. We want the envelope so we can extract `stats.models.*.tokens` for cost tracking.
- `-m gemini-3-pro` — strongest reviewer-grade model. `gemini-2.5-flash` is too shallow for adversarial review.
- `--yolo` — **required** so gemini auto-approves its own `Read` tool calls. Without it, gemini stalls waiting for interactive approval. We still instruct gemini by prompt to be read-only (no file writes). `--yolo` widens gemini's auto-approval for tools, not its file-write authorization; the read-only behavior is enforced by prompt.
- No `--json-schema` / `--output-schema` — the flag does not exist. The schema is inlined into the prompt.
- `2>/dev/null` — drops gemini's auth messages and debug info from stderr.

**Timeout:** at least `600000` ms (10 min). Gemini 3 Pro on a large diff can take minutes.

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

5. **Normalize to the shared finding shape before Step 4.** Whether the output came from the JSON path or the markdown fallback, every finding handed to verification must have the fields defined in `~/.claude/skills/codex-cli/schemas/review-output.schema.json`: `severity`, `title`, `body`, `file`, `line_start`, `line_end`, `confidence`, `recommendation`. Missing fields are filled with conservative defaults (`confidence=0.7`, `line_end=line_start` if only one line was given) and the fallback use is noted in the morning report.

## Cost / token logging

Log `stats.models.*.tokens` from the envelope into the morning report's per-reviewer cost line:

```
External review cost (gemini): prompt=12345, completion=678 tokens
```

**Asymmetry note:** this field is unique to gemini. `codex` and `claude` do not surface per-request token counts in their JSON output. Render the cost line for gemini only; for the other two reviewers, note "cost not reported by CLI" or omit the line entirely.

## Yolo + read-only guarantee

`--yolo` is required for gemini to auto-approve its own Read tool calls, but the adversarial prompt explicitly instructs gemini to be read-only: "Use Read to inspect files. Do not modify files." If gemini disobeys and writes a file anyway, that is an integrity failure — abort the review, revert the unauthorized change with `git checkout --`, log the incident in the morning report as a flagged concern, and consider switching the reviewer choice to codex or claude for this run. Do not push a branch that contains reviewer-originated writes.

## Error handling

- **Auth / unreachable** → blocker taxonomy #1. Stop, surface, do not push.
- **Rate limits** — free tier is 60 req/min, 1000/day. Gemini auto-retries with backoff internally, but if the single review call 429s, log "reviewer unavailable" in the morning report and proceed without findings (single pass rule).
- **Timeout** — raise the Bash tool timeout. Splitting the diff breaks cross-file reasoning.
- **Envelope missing** — if stdout is not valid JSON at all (envelope level), `-o json` failed upstream. Remove `2>/dev/null` and re-run to see the stderr. Common cause: `--yolo` prompting approval that the runtime blocked.
