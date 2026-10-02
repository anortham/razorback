---
name: report-issue
description: Files a GitHub issue against razorback with an environment bundle (razorback version, harness, model, OS, optional tools) after the user approves the exact text. Use when the user runs /report-issue, says a razorback skill or hook misbehaved, or asks to file a bug or feature request against razorback.
---

# Report a razorback Issue

File a GitHub issue against `anortham/razorback`. Never file it against the repository the user works in. Nothing leaves the machine before the user approves the exact text in step 5.

**Announce at start:** "I'm using the report-issue skill to file an issue against razorback."

**Not here:** a problem in code-kb, Goldfish, or the host itself. Send code-kb problems to `anortham/code-kb` and Goldfish problems to `anortham/goldfish` (each has its own `report-issue` skill), and host problems to the host's own tracker.

## Steps

1. Ask the user one question with four parts: what went wrong, what they expected, which skill or hook was involved, and the prompt or steps that cause it. Skip the parts they already gave. Keep the title under 80 characters.
2. Collect the environment. `SKILL_DIR` is this skill's directory, the base directory the host names when it loads this skill.

```bash
ROOT=$(builtin cd -P "$SKILL_DIR/../.." && pwd)
grep -h -m1 '"version"' "$ROOT/.claude-plugin/plugin.json" "$ROOT/.codex-plugin/plugin.json" "$ROOT/package.json" 2>/dev/null | head -1
[ -e "$ROOT/.git" ] && git -C "$ROOT" rev-parse --short HEAD && git -C "$ROOT" status --porcelain | wc -l
uname -srm
code-kb --version
```

   Also record the host and its version (`claude --version`, `codex --version`, or `opencode --version`), the model you run as, and whether the Goldfish tools are in this session. On Windows without bash, use `ver` in place of `uname`. A command that fails gives `unknown` or `not installed`, not a stop.
3. Write the body to `<scratch>/razorback-issue.md` in this shape:

```markdown
### Environment
- razorback: <version>, <plugin install | git clone at <sha>, <n> local changes>
- Host: <harness> <version>
- Model: <model>
- OS: <os>
- code-kb: <version | not installed>; Goldfish: <available | not available>

### Skill or hook
<name>

### What happened
### Expected
### Reproduction
```

   Replace the home directory with `~` everywhere. Quote only the skill lines at fault. Do not include the user's source code, file contents, environment variables, or the session transcript.
4. Redact the body, and submit only the redacted file:

```bash
if ! "$SKILL_DIR/../security-review/scripts/redact-outbound" < <scratch>/razorback-issue.md > <scratch>/razorback-issue.redacted.md; then
  echo "outbound redaction failed" >&2
fi
```

   If redaction fails, stop and tell the user. Do not submit the unredacted file.
5. Show the user the whole redacted file. If `gh` works, also show possible duplicates from `gh issue list --repo anortham/razorback --state all --search "<keywords>"`. Ask what must change. Wait for the answer. Edit the file, then show it again until the user says it is approved. Do not shorten this step.
6. Submit the approved file:
   - If `gh auth status` succeeds, run
     `gh issue create --repo anortham/razorback --title "<title>" --body-file <scratch>/razorback-issue.redacted.md`
     and give the user the issue link.
   - Otherwise give the user the title, the path of the approved file, and `https://github.com/anortham/razorback/issues/new`. Tell them to paste the file as the body.

## It's working if

- The submitted body is the approved file, byte for byte.
- The body starts with `### Environment` and names the razorback version and the host.
- No absolute home path, token, or private source code appears in the body.
- The user has one link: the created issue or the new-issue page to paste into.
