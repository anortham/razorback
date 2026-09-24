---
name: harvesting-debt
description: >
  Use when the user says "razorback debt", "harvesting-debt", "debt ledger",
  "what did we defer", "list the shortcuts", or "what did we mark to do later" —
  any request to account for deliberate shortcuts marked with `razorback:` comments.
---

# Harvesting Debt

Collects every deliberate-shortcut marker into one read-only ledger so a deferral cannot quietly become permanent.

**The convention:** `# razorback: <ceiling>, <upgrade trigger>` (`//` in C-family languages). Example: `# razorback: global lock, per-account locks if throughput matters`.

**Announce at start:** "I'm using the harvesting-debt skill to build the debt ledger."

**Not here:** generic TODO/FIXME/HACK audits. Paying a marker down is a separate change that re-enters razorback:fixing-small-issues triage or the standard flow.

## Scan

Markers are comments, so search their literal text:

1. The host's text search over tracked source, for example `rg -n 'razorback:'`, excluding vendored, generated, and tool-state directories.
2. Optional: code-kb `search_symbols(query='razorback:')` and `lookup_symbol` add markers that sit in indexed docstrings. Run `code-kb scan` first if the index is stale.

**Coverage.** Results are bounded. On truncated or omitted results, a continuation, or a result cap: exhaust the continuation or narrow the query by path until every in-scope result is accounted for. If coverage still cannot be established for a relevant file or scope, stop discovery and report an **incomplete audit**: name the exact evidence gap and the scopes that completed. Never claim a comprehensive or clean ledger while any result or scope remains omitted.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

Quote the ceiling and trigger from the comment; invent neither. Owner per row: `git blame -L<line>,<line> -- <file>`.

Tag any marker with no upgrade trigger `no-trigger`. Those silently rot — a ceiling with no trigger is a permanent decision nobody agreed to.

End with `<N> markers, <M> with no trigger.`

- Nothing found, complete coverage: `No razorback: debt markers. Clean ledger.`
- Nothing found, evidence gap: `Incomplete audit: no markers found in the completed scopes; <missing scope> could not be searched.`

## Boundaries

- **Reads and reports only, changes nothing.** No fixing, upgrading, or removing markers.
- **Does not persist state.** The ledger is the report; write it to disk only if the user asks, where they say.
- **One-shot.** Run, report, done. Not a mode.

## It's working if

- Every row came from a real comment marker, ceiling and trigger quoted.
- Markers without a trigger carry `no-trigger`, and the closing count names them.
- No files changed, no state left behind.
