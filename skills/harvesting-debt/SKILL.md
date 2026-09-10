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

**Not here:** generic TODO/FIXME/HACK audits — that is Miller `search(mode=markers)`. Paying a marker down is a separate change that re-enters razorback:fixing-small-issues triage or the standard flow.

## Scan (Miller only)

1. `search(query='razorback:', regions=comment)` — comment regions are where markers live.
2. When the live schema lists RAZORBACK in its marker vocabulary, also run `search(query='RAZORBACK', mode=markers)` and keep only exact `# razorback:` / `// razorback:` hits. Marker vocabulary is provider-owned; read it from the live schema, do not hard-code it.
3. Languages whose comments are not region-tagged: a bounded `mode=source` search, keep only real comment markers.
4. Prose or documentation markers, if in scope: a separate bounded `mode=content` search, labeled non-source debt.

Miller's index already excludes vendored, generated, and tool-state content and returns file:line.

**Coverage.** Results are bounded. On truncated or omitted results, a continuation, or a result cap: exhaust the continuation or narrow the query by path, language, or content scope until every in-scope result is accounted for. If the index is stale, refresh the workspace and repeat. If coverage still cannot be established, or Miller cannot cover a relevant language or region, stop discovery and report an **incomplete audit**: name the exact evidence gap and the scopes that completed. Do not fall back to shell search. Never claim a comprehensive or clean ledger while any result or scope remains omitted.

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
