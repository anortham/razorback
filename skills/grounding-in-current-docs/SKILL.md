---
name: grounding-in-current-docs
description: Use when writing code against an external framework, library, or API — especially a version or feature newer than your training data, an unfamiliar dependency, or behavior that may have changed (new directives, breaking changes, renamed options, deprecations, changed defaults).
---

# Grounding in Current Docs

code-kb is the source of truth inside the repo. This skill covers truth outside it: external framework, library, and API behavior, where memory goes stale and plausible code that compiles is still semantically wrong.

## The Rule

Before coding against an external API where your knowledge could be stale:

1. **Check the repo first.** code-kb `search_symbols` or `lookup_symbol` for existing usage. Working code in the repo is the cheapest ground truth, and repo conventions win over docs.
2. **Fetch the current official docs** for the specific feature with your harness's web tool (WebFetch on Claude Code, web search on Codex; prefer a token-efficient fetcher when available). Official source, not blog posts.
3. **Verify the exact surface:** name, signature/options, semantics, version gates, deprecations. When verified behavior differs from common knowledge, cite the doc URL in the task notes or commit message.
4. **Verify once per feature per session.** Record it (Goldfish checkpoint or plan note) instead of re-fetching.

Docs unreachable is not a blocker: follow the repo's pattern, proceed on the best evidence, and flag the unverified assumption in the task notes for review.

Leads: when a task touches a staleness-risk API, put the verified surface (or doc URL) in the task prompt so dispatched implementers do not code from memory.

## Triggers

- A version or feature you cannot date confidently ("new in vX", recent release)
- A dependency this repo has never used
- Behavior tests will not catch — caching semantics, defaults, ordering, security flags, lifecycle timing
- A fix that depends on documented behavior rather than repo code

## Do Not Fetch

- The repo already uses the API and code-kb shows the pattern — follow the repo.
- Long-settled APIs you know well (standard library basics).
- Never fetch ceremonially for every import. Target staleness risk, not ritual.

## Red Flags

| Excuse | Reality |
|---|---|
| "I know this API" | New-in-version features are exactly where memory is wrong. Check the version. |
| "It compiles / tests pass" | Tests rarely encode semantics like caching, defaults, or ordering. Verify the documented behavior. |
| "Fetching docs wastes tokens" | One bounded fetch is cheaper than a wrong-semantics bug found in review — or in production. |
| "The blog post / old answer says…" | Secondary sources fossilize old versions. Official docs for the version in the lockfile. |

## It's working if

- Code against a staleness-risk API followed a repo-pattern check or a doc fetch, and uses the surface that was verified.
- Behavior that differs from common knowledge carries the doc URL in the task notes or commit message.
- Each feature was verified once per session.
