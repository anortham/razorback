# Codex /goal verification

Verified on 2026-05-12; re-verified on 2026-07-08 against codex-cli 0.143.0.

## What exists
- Codex CLI interactive slash commands include `/goal`.
- The backing `goals` feature flag is now **stable and enabled by default**
  (`codex features list` reports `goals  stable  true` on 0.143.0). No opt-in
  is required anymore.

## Practical implications
- Use `/goal` only in interactive Codex sessions; there is no `codex exec`
  equivalent.
- For task tracking workflows, treat `/goal` as a session-level objective, not
  as a replacement for planning/review commands.

## Verification notes
- Check current state with `codex features list | grep goals` — this reports
  the stage (experimental/stable) and effective on/off state.
- `codex exec --help` surfaces resume/review options, but slash commands live
  in the interactive UI docs.
