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

## When to Use

Use for any request to account for the deliberate shortcuts marked with `razorback:` comments — a read-only ledger of what was deferred.

**Not here:** generic TODO/FIXME/HACK audits — that is Miller `search(mode=markers)`. Paying a marker down is a separate change: it re-enters razorback:fixing-small-issues triage (or the standard flow) on its own merits.

## Scan

Search the indexed workspace with Miller first:

`search(query='razorback:', regions=comment)`

`regions=comment` restricts hits to comment regions, which is where the markers
live — it does the "keep only real markers" filtering for you. When the live
Miller schema includes RAZORBACK in its marker vocabulary, also run
`search(query='RAZORBACK', mode=markers)` as a fast comment-region sweep, then
keep only exact debt markers (`# razorback:` / `// razorback:`). Marker
vocabulary is provider-owned, so discover it from the live schema instead of
hard-coding a fixed list.

Use the current Miller search schema rather than assuming `mode=text` covers
every region. For source languages whose comments are not region-tagged, retry a
bounded `mode=source` search and keep only real comment markers. If the audit
intentionally includes prose or documentation markers, run a separate bounded
`mode=content` search and label those results as non-source debt.

Miller's index already excludes vendored, generated, and tool-state content, and
returns ranked hits with file:line — no exclusion flags needed.

Search results are bounded. When Miller reports truncated or omitted results, a
continuation, or a result cap, use the live schema to exhaust the continuation
or narrow the query by supported path, language, or content scopes until every
in-scope result is accounted for. If coverage still cannot be established,
report the evidence gap as an incomplete audit. Never claim a comprehensive or
clean ledger while any result or required scope remains omitted.

If the index is stale, refresh the workspace and repeat the bounded Miller
searches. If Miller remains unavailable or cannot cover a relevant language or
region after that recovery, stop discovery and report an **incomplete audit**.
Name the exact evidence gap and the scopes that did complete. Do not fall back to
shell search and do not present the partial ledger as comprehensive or clean.

For a generic TODO/FIXME/HACK/XXX audit, use `search(mode=markers)` instead of
this skill. Exact parameters and workspace binding come from the live Miller
schema and provider instructions.

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

Nothing found with complete Miller coverage: `No razorback: debt markers. Clean ledger.`

Nothing found with an evidence gap: `Incomplete audit: no markers found in the completed scopes; <missing scope> could not be searched.`

## Boundaries

- **Reads and reports only, changes nothing.** No fixing, no upgrading, no removing markers.
- **Does not persist state.** The ledger is the report. If the user asks for it on disk, ask first, then write it where they say (e.g. `RAZORBACK-DEBT.md`).
- **One-shot.** Run, report, done. It is not a mode and does not stay on.

## It's working if

- Every ledger row came from a real comment marker, with the ceiling and trigger quoted, not invented.
- Markers without an upgrade trigger carry the `no-trigger` tag, and the closing count names them.
- The run changed no files and left no state behind.
