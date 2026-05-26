# Codex /goal verification

Verified on 2026-05-12.

## What exists
- Codex CLI interactive slash commands include `/goal`.
- OpenAI docs describe it as an *experimental task goal*.
- The docs note it requires `features.goals`.

## Practical implications
- Use `/goal` only in interactive Codex sessions.
- If the goal feature is not enabled, don’t document or rely on it as a guaranteed control surface.
- For task tracking workflows, treat `/goal` as a session-level objective, not as a replacement for planning/review commands.

## Verification notes
- `codex exec --help` surfaces resume/shell/session options, but slash commands live in the interactive UI docs.
- OpenAI’s slash-command docs list `/goal` alongside `/model`, `/plan`, `/review`, and `/status`.
