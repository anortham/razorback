# Slash-command parity notes

Verified on 2026-05-12 while comparing Codex and Claude CLI command surfaces.

## Lesson
- Do not assume experimental slash commands exist in both CLIs just because one harness has them.
- Before documenting or depending on a command, check the live `--help` output and the current docs for that specific CLI.

## Practical workflow
- For cross-CLI workflow ideas, verify the command in the target harness first.
- If the command is missing, document the closest supported primitive instead of inventing a parity rule.

## What we checked
- Codex docs explicitly list `/goal` and mark it experimental.
- Claude Code’s current help/docs did not surface a `/goal` command.
