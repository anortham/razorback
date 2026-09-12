---
id: inner-loop-test-isolation
title: Inner-loop test isolation
status: active
created: 2026-09-12T18:12:34.925Z
updated: 2026-09-12T21:14:04.028Z
tags:
  - verification
  - process
  - skills
---

## Goal

Stop agents from iterating on the full test suite after small edits, without lowering thoroughness.

## Why now

Advisory scope rules already exist in using-razorback, instruction-tier, TDD, SDD, and fixing-small-issues. Agents still rerun the wide command after each failure. Work that should take an hour takes a day.

## Constraints

- No new skill.
- No host-project CLAUDE.md campaign as the fix.
- Binding procedure lives in existing test skills (approach A, user confirmed 2026-09-12).
- Do not weaken the branch gate.
- Language-agnostic: specialize a known runner; do not invent a new one.
- One home per fact.

## Success criteria

- After a test command fails, the next runs use only the failing test ids until those pass, then the previous wider command runs once.
- Inner-loop evidence is not treated as a shortcut.
- Full suite still runs once at the branch gate.

## Status (2026-09-12)

Implemented on branch `test-scope-loop`, GREEN-verified on fixtures. Canonical home: systematic-debugging Phase 1.2 (reproduce = failing ids from the captured first run) and Phase 4.3 (ids until green, then the wide command once). Floor rule 7 / instruction-tier rule 5 carry the compact form: "Do not rerun any scope on an unchanged tree" + capture-to-file + failing-id loop; host copies synced; check-rule-copies invariants now 10. Pointers in TDD Verify RED/GREEN, finishing Step 1, fixing-small-issues Step 4, SDD implementer/fix prompts, pre-merge fix prompt, verification-before-completion rationalizations. Guard test: tests/test-scope-loop.test.mjs.

Evidence: RED runs showed the real waste was rerunning a *failing* wide run on an unchanged tree to re-read piped output (4 of 7 lead runs at medium/low effort); the old rule only forbade rerunning a *passing* scope. GREEN: 0 wide reruns on unchanged trees in 7 runs.

## References

- Fixture + results: session scratchpad (runs/red-*, runs/green-*, red-sweep.json, red-gate-runs.json, green-runs.json).
- Approach A: procedure in TDD, systematic-debugging, verification-before-completion, SDD worker/fix prompts.
