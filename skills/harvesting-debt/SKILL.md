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

## Scan (code-kb only)

1. `search_symbols(query='razorback:')` — search indexed symbol names, docstrings, signatures, and declarations for debt markers.
2. `lookup_symbol(query='razorback')` — prefix/exact symbol search.
3. Language symbols and structural annotations: check structural facts with `find_structural_facts` if custom marker categories are indexed.

code-kb's index already excludes vendored, generated, and tool-state content and returns file:line.

**Coverage.** Results are bounded. On truncated or omitted results, a continuation, or a result cap: exhaust the continuation or narrow the query by path until every in-scope result is accounted for. If the index is stale, run `code-kb scan` to refresh the index and repeat. If coverage still cannot be established, or code-kb cannot cover a relevant file or scope (such as inline comments unindexed by AST symbol tables), stop discovery and report an **incomplete audit**: name the exact evidence gap and the scopes that completed. Do not fall back to shell search (e.g., shell grep). Never claim a comprehensive or clean ledger while any result or scope remains omitted.

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
