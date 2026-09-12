---
name: brainstorming
description: "Use when starting any creative work - creating a feature, building a component, adding functionality, or changing designed behavior - before writing code or invoking any implementation skill. Small defect repairs and tweaks triage through razorback:fixing-small-issues first."
---

# Brainstorming Ideas Into Designs

Turn an idea into a written, user-approved design before any implementation, however simple the task looks.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have a design and the user has approved it.
</HARD-GATE>

**One exception:** an empirical design question (settled only by running code) takes the razorback:prototyping off-ramp: announce the question, get a one-line go-ahead, build the throwaway instrument, return with the user's verdict. The gate still bars production code.

## Triage First: Is This Design Work?

A defect or tweak that meets the quick-fix criteria (≤ 2 source files, ~20 changed lines, no contract changes, reversible) is repair work: route it to razorback:fixing-small-issues. If it outgrows the criteria there, it escalates back here with its evidence.

This is a measured gate, not a judgment call. "Feels simple" is not a criterion; the Rationalizations table applies to everything that does not measurably fit the quick-fix tier.

## Choosing the Right Path

| Path | When | Steps | Exit to |
|------|------|-------|---------|
| **Full process** | Requirements vague, multiple valid approaches, open questions on scope/constraints/tradeoffs | Q&A → approaches → design → doc | razorback:writing-plans |
| **Fast path** | Design agreed; task large, multi-task, or multi-session | Summarize → confirm → doc | razorback:writing-plans |
| **Lightweight** | Design agreed; task moderate (< ~300 lines new code, same-session) | Summarize → confirm → doc with acceptance criteria | execution skill by delegation availability |

Test: can you state the agreed design concretely (components, data flow, key decisions)? Yes → fast path or lightweight, by task size. "It's basically just X" → full process.

Every path starts with Miller orientation (`context`, `inspect`, `trace`; no Glob → Read → Grep chains) plus `git log --oneline -10`, and ends in "After the Design".

**Fast path / Lightweight:** summarize the agreed design for user confirmation. Note the approved module/interface shape, or `No Architecture Impact` for mechanical work; writing-plans copies this into the plan header. Lightweight: include an acceptance criteria checklist; the doc is the implementer's spec.

**Full process:**
1. Offer the visual companion if visual questions are likely (own message; see below).
2. Ask clarifying questions, one per message (see "Interviewing").
3. Propose 2-3 approaches with trade-offs; lead with your recommendation and why.
4. Run `razorback:architecture-quality` for non-trivial work and capture the approved module/interface shape before presenting the design. No architecture impact → note `No Architecture Impact`.
5. Present the design in sections scaled to complexity (a few sentences up to 200-300 words): architecture, components, data flow, error handling, testing. Ask after each section whether it looks right and get user approval before moving on.

**Terminal states:** invoke razorback:writing-plans, or proceed to Lightweight Implementation. No other exits.

## Interviewing

- Infer and record routine, reversible details instead of asking. Ask only unresolved questions whose answers materially change product intent, safety, scope, or architecture.
- One question per message, with a falsifiable guess: "I'm guessing X because Y — is that right?" Prefer multiple choice; guess first, labelled.
- Environment facts (repo contents, tool support, config values) come from Miller or a subagent, never the user. Only questions downstream of that fact wait.
- A question is on the frontier when its prerequisites are settled. If the dialogue loops on a question only running code can answer, take the razorback:prototyping off-ramp and record the verdict on return.
- Stop asking when no frontier question can materially change product intent, safety, scope, or architecture, you can state purpose, constraints, and success criteria in your own words, and your last material question produced no correction. Record chosen defaults and move on.

## After the Design

1. **Write the design** to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Do not commit yet.
2. **Spec self-review:** placeholder scan (TBD, TODO, vague requirements), internal consistency, scope (one plan's worth?), ambiguity (pick one reading, make it explicit). Fix inline. If the session can dispatch subagents, you may instead dispatch a reviewer with `spec-document-reviewer-prompt.md` (this directory).
3. **Doubt pass (full process, conditional):** if `razorback:architecture-quality` rated risk medium/high, run the Doubt Pass from `razorback:cross-model-convergence` and fold surviving objections into the spec. Lead work, not a user gate.
4. **User Review Gate:** User reviews written spec. Ask:
   > "Spec written to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

   The visual digest (`<design-doc>.html`, sibling basename, composed per the `razorback:using-razorback` skill's `references/digest-kit.md`) is opt-in: write it only when the user asked for a digest in this session or in project instructions, then add "with a visual digest at `<design-doc>.html`" to the ask. Never generate one unprompted. If the user requests changes, make them and re-run the self-review. Only proceed once the user approves.
5. **Isolated workspace:** REQUIRED SUB-SKILL razorback:using-git-worktrees. Skip only with explicit user consent (small same-session work on a plain feature branch). Move the design doc into the worktree and commit it there as the branch's first commit; untracked files do not follow into a new worktree.
6. **Exit:** full/fast path → invoke razorback:writing-plans in the worktree. Lightweight → below.

## Lightweight Implementation

The design doc is the plan: what to build and why, exact file paths from Miller, acceptance criteria, the worker verification scope (repo runner narrowed to the change; full suite at the branch gate), key decisions and edge cases.

- **Delegation is available and permitted:** `razorback:subagent-driven-development`, including for one task; parallel for independent parts with distinct file ownership, serialized for dependent ones. Use `subagent-driven-development/implementer-prompt.md` with the design doc as the task. The lead reviews inline (spec compliance + code quality) and routes fixes through the same skill.
- **No delegation, or single-agent execution explicitly selected:** `razorback:executing-plans` with the design doc as the plan.
- **Done:** razorback:finishing-a-development-branch.

## Visual Companion

A browser tool for mockups, diagrams, and visual options; not a mode. When visual questions are likely, offer it once:

> "Some of what we're working on might be easier to explain if I can show it to you in a web browser. I can put together mockups, diagrams, comparisons, and other visuals as we go. This feature is still new and can be token-intensive. Want to try it? (Requires opening a local URL)"

**This offer MUST be its own message** with no other content. Wait for the user's response before continuing. Declined → text only. Accepted → read `visual-companion.md` (this directory), then decide per question: browser only when seeing beats reading (mockups, layouts, diagrams, side-by-side designs); terminal for text (requirements, tradeoffs, A/B/C options, scope).

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "This is too simple to need a design" | A todo list, a one-function utility, a config change — all go through this. Simple work is where unexamined assumptions waste the most; the design can be short, but you MUST present it and get approval. |
| "The user already told me what to build" | An instruction is not a design. Summarize it and get confirmation — that is the fast path, and it costs minutes. |
| "I'll just scaffold while we talk" | Scaffolding is implementation. The gate bars it until approval. |
| "A quick prototype will settle this" | Only through the razorback:prototyping off-ramp, with a one-line go-ahead. Throwaway instrument, never production code. |
| "The design is obvious from the codebase" | Then the summary costs one message. Write it and get the yes. |

## Red Flags — STOP

- Any production file write before the user approved a design
- Invoking writing-plans or an implementer before spec approval
- "While you review that, I'll get started on..."
- A design doc committed on the current branch instead of the task worktree

All of these mean: stop, return to the gate, get the approval.

## It's working if

- A written, user-approved design doc exists before any implementation action.
- The doc landed in the task worktree as the branch's first commit, not on `main`.
- Questions went out one at a time, each carrying a falsifiable guess.
- The session exited through one of the two terminal states, nothing else.
