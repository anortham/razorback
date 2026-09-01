---
name: grounding-in-current-docs
description: Use when writing code against an external framework, library, or API — especially a version or feature newer than your training data, an unfamiliar dependency, or behavior that may have changed (new directives, breaking changes, renamed options, deprecations, changed defaults).
---

# Grounding in Current Docs

Miller is the source of truth for the repo. This skill covers truth *outside* the repo: external framework, library, and API behavior. Training knowledge of external APIs goes stale, and plausible-from-memory code that compiles can still be semantically wrong.

## The Rule

Before writing code against an external API where your knowledge could be stale:

1. **Check the repo first.** Miller `search` for existing usage of the same API in this codebase — working code already in the repo is the cheapest ground truth, and repo conventions win over docs.
2. **Fetch the current official docs** for the specific feature with your harness's web tool (WebFetch on Claude Code, web search on Codex; prefer a token-efficient fetcher when one is available). Official source, not blog posts.
3. **Verify the exact surface:** name, signature/options, semantics, version gates, deprecation notes. When the verified behavior differs from common knowledge, cite the doc URL in the task notes or commit message.
4. **Verify once per feature per session.** Record what you verified (Goldfish checkpoint or a note in the plan) instead of re-fetching.

If the docs are unreachable, this is not a blocker: prefer the repo's existing pattern, proceed with the best available evidence, and flag the unverified assumption in the task notes so review can check it.

This applies to dispatched implementers too: if a task touches a staleness-risk API, the lead puts the verified surface (or the doc URL) in the task prompt so workers don't code from memory.

## When It Triggers

- The plan or user names a version or feature you cannot date confidently ("new in vX", recent release)
- A dependency this repo has never used before
- API behavior tests will not catch — caching semantics, defaults, ordering, security flags, lifecycle timing
- Debugging where the fix depends on documented behavior rather than repo code

## When NOT to Fetch

- The repo already uses the API and Miller shows the pattern — follow the repo.
- Long-settled APIs you have high confidence in (standard library basics).
- Never fetch ceremonially for every import. This skill targets staleness *risk*, not ritual.

## Red Flags

| Excuse | Reality |
|---|---|
| "I know this API" | New-in-version features are exactly where memory is wrong. Check the version. |
| "It compiles / tests pass" | Tests rarely encode semantics like caching, defaults, or ordering. Verify the documented behavior. |
| "Fetching docs wastes tokens" | One bounded fetch is cheaper than a wrong-semantics bug found in review — or in production. |
| "The blog post / old answer says…" | Secondary sources fossilize old versions. Official docs for the version in the lockfile. |

## It's working if

- Code against a staleness-risk API was preceded by a repo-pattern check or a doc fetch, and the surface it uses matches what was verified.
- Behavior that differs from common knowledge carries the doc URL in the task notes or commit message.
- Each feature was verified once per session, not re-fetched ceremonially.
