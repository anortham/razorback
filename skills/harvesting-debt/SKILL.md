---
name: harvesting-debt
description: >
  Harvest every `razorback:` shortcut marker in the codebase into a debt ledger, so the
  deliberate corners cut on the quick-fix tier get tracked instead of rotting into
  "later means never". Use when the user says "razorback debt", "harvesting-debt",
  "debt ledger", "what did we defer", "list the shortcuts", or "what did we mark to do
  later". One-shot report, changes nothing.
---

# Harvesting Debt

## Overview

A deliberate shortcut is fine. An *unmarked* deliberate shortcut is how a known
ceiling turns into an unknown outage. Every deliberate corner cut — most often on
the razorback:fixing-small-issues quick-fix tier — is marked with a comment naming
its ceiling and the trigger to revisit it. This skill collects those markers into
one ledger so a deferral can't quietly become permanent.

**The convention:**

```
# razorback: <ceiling>, <upgrade trigger>
```

Use `//` instead of `#` in C-family languages (JS/TS, C, C++, C#, Java, Go, Rust,
Swift). Example: `# razorback: global lock, per-account locks if throughput matters`.

**Announce at start:** "I'm using the harvesting-debt skill to build the debt ledger."

## Scan

Grep the repo for comment markers:

`grep -rnE '(#|//) ?razorback:' .`

Exclude, at minimum:

- `node_modules/`, `.git/`, and build output (`dist/`, `build/`, `target/`, `out/`) — vendored and generated noise.
- **In the razorback repo itself:** `skills/`, `docs/`, `commands/`, `agents/`, `.memories/`. Razorback's own skill **cross-reference** syntax is `razorback:<skill-name>` (e.g. `razorback:writing-plans`), and those prose references would otherwise flood the ledger with rows that are not debt at all. The comment prefix filters most of it; excluding these directories filters the rest.

Example with exclusions:

```
grep -rnE '(#|//) ?razorback:' . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=build --exclude-dir=target --exclude-dir=out \
  --exclude-dir=skills --exclude-dir=docs --exclude-dir=commands \
  --exclude-dir=agents --exclude-dir=.memories
```

Add comment prefixes your stack uses (`--`, `;`, `%`) if the codebase needs them.
Each surviving hit is one ledger row.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

The convention is `# razorback: <ceiling>, <upgrade trigger>`, so pull the ceiling
and the trigger straight from the comment — do not invent either. Want an owner per
row? add `git blame -L<line>,<line> -- <file>`.

**Flag the rot risk:** any marker that names no upgrade trigger gets a `no-trigger`
tag. Those are the ones that silently rot — a ceiling with no trigger to revisit it
is a permanent decision that nobody agreed to make.

End with `<N> markers, <M> with no trigger.`

Nothing found: `No razorback: debt markers. Clean ledger.`

## Boundaries

- **Reads and reports only, changes nothing.** No fixing, no upgrading, no removing markers.
- **Does not persist state.** The ledger is the report. If the user asks for it on disk, ask first, then write it where they say (e.g. `RAZORBACK-DEBT.md`).
- **One-shot.** Run, report, done. It is not a mode and does not stay on.

Paying a marker down is a separate change: it re-enters
razorback:fixing-small-issues triage (or the standard flow) on its own merits.
