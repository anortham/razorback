---
name: harvesting-debt
description: >
  Use when the user says "razorback debt", "harvesting-debt", "debt ledger",
  "what did we defer", "list the shortcuts", or "what did we mark to do later" —
  any request to account for deliberate shortcuts marked with `razorback:` comments.
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

Search the indexed workspace with Miller first:

`search(query='razorback:', mode=text)`

Miller's index already excludes vendored, generated, and tool-state content, and
returns ranked hits with file:line — no exclusion flags needed. Keep only hits that
are comment markers (`# razorback:` / `// razorback:`), not razorback's own skill
cross-references (`razorback:<skill-name>` in prose).

**Grep fallback** (Miller unavailable or index stale after `workspace refresh`):

`grep -rnIE '(#|//) ?razorback:' .`

`-I` skips binary files — without it, any binary whose bytes happen to match
(including Miller's own index) prints a useless `Binary file … matches` row.
Full form with exclusions:

```
grep -rnIE '(#|//) ?razorback:' . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=build --exclude-dir=target --exclude-dir=out \
  --exclude-dir=skills --exclude-dir=docs --exclude-dir=commands \
  --exclude-dir=agents --exclude-dir=.memories \
  --exclude-dir=.miller --exclude-dir=.razorback --exclude-dir=.claude
```

The `skills/`/`docs/`/`commands/`/`agents/`/`.memories/` exclusions matter only
in the razorback repo itself, where prose skill cross-references
(`razorback:<skill-name>`) would flood the ledger; the rest cut vendored, build,
and tool-state noise (`.miller/`, `.razorback/`, `.claude/` quote markers in
reports or index the marker bytes).

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
