---
name: brainstorming
description: "Use when requirements are unclear, when a change makes a consequential design choice (a new subsystem, a public interface, stored data, security, or hard-to-reverse behavior), or when the user asks to brainstorm or design. Clear, ordinary work proceeds without it; small defect repairs go to razorback:fixing-small-issues."
---

# Brainstorming Ideas Into Designs

Turn an unclear or consequential idea into a design the user agrees with. Spend attention where a wrong guess is expensive, and nowhere else.

<HARD-GATE>
Do NOT write production code for a consequential design choice the user has not made or agreed to. Tell the user the choice and your recommendation, then wait for their answer. A choice the user's request already settles needs no second approval.
</HARD-GATE>

**One exception:** an empirical design question (settled only by running code) takes the razorback:prototyping off-ramp: announce the question, get a one-line go-ahead, build the throwaway instrument, return with the user's verdict. The gate still bars production code.

## Triage First: How Much Process?

Judge the request by uncertainty, consequence, and coordination, not by size:

- **Clear and low-consequence** (the request says what to build, and a wrong detail is cheap to fix): leave this skill and do the work. A small defect or tweak goes to razorback:fixing-small-issues.
- **Unclear** (two readings of the request give different results): ask the question that separates them, then re-triage.
- **Consequential** (hard to reverse, or it changes a public contract, stored data, security, or other people's work): pick a path below.
- **Needs coordination** (the work spans sessions, agents, or people): take the architectural path, whose written spec and plan give the handoff a home.

A file or line count alone is not a risk assessment. A one-line change to an auth check is consequential; a wide mechanical rename may not be.

## Three Paths

Before your first question, classify the request and say the classification out loud — "this looks bounded, so I'll present a short design here rather than write a spec" — so the user can override it:

- **Spike** — a feasibility question ("can we...", "is it possible...", "quick and dirty is fine") whose output is an answer, not code you keep. Pairs with `razorback:prototyping`. State the question and what you'll try in 2-3 sentences, then find out as cheaply as correctness allows. No design doc, no spec file. Report findings as a recommendation; anything you built stays labeled throwaway.
- **Bounded** — a change to code that already exists in this repo, with one or two consequential choices: a new flag, a small endpoint, a changed default. Bounded means the flow you are changing is already here to read. Ask only the clarifying questions that change the result, present a short design in chat (approach, files touched, testing), and wait for the user's answer on the choices they have not already made. No spec file, no implementation plan document.
- **Architectural** — new projects, new subsystems, changes that restructure how components fit together or alter interfaces others depend on. Follow the full process: questions, approaches, sectioned design, written spec, then the `razorback:writing-plans` skill.

Re-classify when the evidence changes. Hidden complexity discovered mid-task upgrades the path: stop, say so, and step up. A task that turns out simpler than it looked, once you understand it, takes the lighter path: say so and continue.

## Anti-Patterns

**Ceremony for clear work.** A design, spec, or approval round for a change the user already specified wastes their time and yours. Once you understand the task and the user's request settles its choices, proceed.

**Silent consequential choices.** A choice that is hard to reverse or that others depend on gets named before code is written, however small the diff. "It's only a few lines" is not a reason to decide alone.

## Path Workflows

Every path starts with code-kb orientation (`codebase_outline`, `file_skeleton`, `lookup_symbol`, `find_references`; no Glob → Read → Grep chains) plus `git log --oneline -10`.

### Spike Workflow
1. **Explore project context** via code-kb enough to frame the probe.
2. **State question + probe plan** — 2-3 sentences.
3. **Investigate** — as cheaply as correctness allows (pairs with `razorback:prototyping`).
4. **Report findings as a recommendation**; label anything built as throwaway.

### Bounded Workflow
1. **Explore project context** via code-kb (check files, docs, recent commits).
2. **Ask clarifying questions** — one at a time, the ones that matter.
3. **Present a short design in chat** — approach, files touched, testing.
4. **Get agreement on open choices** — wait for the user's answer on each consequential choice their request did not settle. Presenting an open choice and starting in the same breath is skipping the gate.
5. **Implement** — the current agent does the work directly (TDD applies). No plan file, worker, or task report. Delegate only an independent part, or a part whose separate context has a clear benefit (`razorback:dispatching-parallel-agents`).
6. **Done** — verify, commit, and report in chat. Use `razorback:finishing-a-development-branch` when the branch is ready to integrate.

### Architectural Workflow
1. **Offer the visual companion** if visual questions are likely (own message; see below).
2. **Ask clarifying questions**, one per message (see "Interviewing").
3. **Propose 2-3 approaches** with trade-offs; lead with your recommendation and why.
4. **Run `razorback:architecture-quality`** for non-trivial work and capture the approved module/interface shape before presenting the design. No architecture impact → note `No Architecture Impact`.
5. **Present the design** in sections scaled to complexity (a few sentences up to 200-300 words): architecture, components, data flow, error handling, testing. Ask after each section whether it looks right and get user approval before moving on.
6. **Proceed to "After the Design"**.

**Terminal states are path-bound:** Architectural invokes `razorback:writing-plans`. Bounded proceeds to execution. Spike reports findings as a recommendation. Triage, or a re-classification to a lighter path, exits to direct work. No other exits.

## Interviewing

- Infer and record routine, reversible details instead of asking. Ask only unresolved questions whose answers materially change product intent, safety, scope, or architecture.
- One question per message, with a falsifiable guess: "I'm guessing X because Y — is that right?" Prefer multiple choice; guess first, labelled.
- Environment facts (repo contents, tool support, config values) come from code-kb or a subagent, never the user. Only questions downstream of that fact wait.
- A question is on the frontier when its prerequisites are settled. If the dialogue loops on a question only running code can answer, take the razorback:prototyping off-ramp and record the verdict on return.
- Stop asking when no frontier question can materially change product intent, safety, scope, or architecture, you can state purpose, constraints, and success criteria in your own words, and your last material question produced no correction. Record chosen defaults and move on.

## After the Design

1. **Write the design** to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Do not commit yet.
2. **Spec self-review:** placeholder scan (TBD, TODO, vague requirements), internal consistency, scope (one plan's worth?), ambiguity (pick one reading, make it explicit). Fix inline. If the session can dispatch subagents, you may instead dispatch a reviewer with `spec-document-reviewer-prompt.md` (this directory).
3. **Doubt pass (conditional):** if `razorback:architecture-quality` rated risk medium/high, run the Doubt Pass from `razorback:cross-model-convergence` and fold surviving objections into the spec. Lead work, not a user gate.
4. **User Review Gate:** User reviews written spec. Ask:
   > "Spec written to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

   The visual digest (`<design-doc>.html`, sibling basename, composed per the `razorback:using-razorback` skill's `references/digest-kit.md`) is opt-in: write it only when the user asked for a digest in this session or in project instructions, then add "with a visual digest at `<design-doc>.html`" to the ask. Never generate one unprompted. If the user requests changes, make them and re-run the self-review. Only proceed once the user approves.
5. **Isolated workspace:** REQUIRED SUB-SKILL razorback:using-git-worktrees. Skip only with explicit user consent (small same-session work on a plain feature branch). Move the design doc into the worktree and commit it there as the branch's first commit; untracked files do not follow into a new worktree.
6. **Exit:** invoke `razorback:writing-plans` in the worktree.

## Visual Companion

A browser tool for mockups, diagrams, and visual options; not a mode. When visual questions are likely, offer it once:

> "Some of what we're working on might be easier to explain if I can show it to you in a web browser. I can put together mockups, diagrams, comparisons, and other visuals as we go. This feature is still new and can be token-intensive. Want to try it? (Requires opening a local URL)"

**This offer MUST be its own message** with no other content. Wait for the user's response before continuing. Declined → text only. Accepted → read `visual-companion.md` (this directory), then decide per question: browser only when seeing beats reading (mockups, layouts, diagrams, side-by-side designs); terminal for text (requirements, tradeoffs, A/B/C options, scope).

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's small, so no design choice is involved" | Size is not risk. A small change to a contract, data, or security gets its choice named first. |
| "I'll call it bounded and skip the spec" | Bounded means the flow already exists here to read. A new subsystem is architectural. |
| "I understand this kind of app, so it's bounded" | Bounded measures the repo, not your familiarity. A new project has no existing flow — it is architectural. |
| "The user told me what to build, so every choice is settled" | The request settles the choices it names. An open consequential choice still goes to the user. |
| "The user told me exactly what to build, but I'll present a design anyway" | A choice the request settles needs no second approval. Proceed. |
| "I'll just scaffold while we talk" | Scaffolding for an open consequential choice is implementation. The gate bars it until the user answers. |
| "The spike works, so I'll keep the code" | A spike's output is an answer. Keeping the code is a new request — classify it. |
| "It grew, but I'm almost done — no need to re-classify" | Hidden complexity upgrades the path mid-task. Stop and say so. |
| "I classified it architectural, so I must finish the full process" | Once the task is understood and simpler than it looked, take the lighter path and say so. |
| "A quick prototype will settle this" | Only through the razorback:prototyping off-ramp, with a one-line go-ahead. Throwaway instrument, never production code. |

## Red Flags — STOP

- A production file write that settles a consequential choice the user has not made
- Presenting an open choice and starting in the same breath
- Invoking writing-plans or an implementer before spec approval on the architectural path
- "While you review that, I'll get started on..."
- A design doc committed on the current branch instead of the task worktree

All of these mean: stop, name the open choice, and wait for the user's answer.

## It's working if

- Clear, low-consequence requests went straight to the work, with no design round.
- Ambiguous requests got the one question that separates their readings.
- Every consequential choice the user had not made was named, and code waited for their answer.
- Bounded designs were presented directly in chat with no spec file.
- Architectural specs landed in the task worktree as the branch's first commit, not on `main`.
- Questions went out one at a time, each carrying a falsifiable guess.
- The session exited through its path's terminal state.
