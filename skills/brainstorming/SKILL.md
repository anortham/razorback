---
name: brainstorming
description: "Use when starting any creative work - creating a feature, building a component, adding functionality, or changing designed behavior - before writing code or invoking any implementation skill. Small defect repairs and tweaks triage through razorback:fixing-small-issues first."
---

# Brainstorming Ideas Into Designs

Turn an idea into a written, user-approved design before any implementation, however simple the task looks.

Start by classifying how much process the request needs, then work through your path: understand the context, refine the idea, present a design, and get user approval.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have told the user what you intend and they have approved it. This applies to EVERY task on EVERY path below — the ceremony scales with the task; the approval gate never does.
</HARD-GATE>

**One exception:** an empirical design question (settled only by running code) takes the razorback:prototyping off-ramp: announce the question, get a one-line go-ahead, build the throwaway instrument, return with the user's verdict. The gate still bars production code.

## Triage First: Is This Design Work?

A defect or tweak that meets the quick-fix criteria (≤ 2 source files, ~20 changed lines, no contract changes, reversible) is repair work: route it to razorback:fixing-small-issues. If it outgrows the criteria there, it escalates back here with its evidence.

This is a measured gate, not a judgment call. "Feels simple" is not a criterion; the Rationalizations table applies to everything that does not measurably fit the quick-fix tier.

## Three Paths

Before your first question, classify the request and say the classification out loud — "this looks bounded, so I'll present a short design here rather than write a spec" — so the user can override it:

- **Spike** — a feasibility question ("can we...", "is it possible...", "quick and dirty is fine") whose output is an answer, not code you keep. Pairs with `razorback:prototyping`. Present the question and what you'll try in 2-3 sentences, get a nod, then find out as cheaply as correctness allows. No design doc, no spec file. Report findings as a recommendation; anything you built stays labeled throwaway.
- **Bounded** — a well-scoped change to code that already exists in this repo: a new flag, a small endpoint, a one-file fix. Understanding the kind of app is not enough — bounded means the flow you are changing is already here to read. If there is no existing flow to change, the task is not bounded. Ask the clarifying questions that matter, present a short design in chat (approach, files touched, testing), and STOP and wait for an explicit yes. Implementation starts only after the user says yes to that design — a bounded task's approval is as hard a gate as an architectural one. No spec file, no implementation plan document.
- **Architectural** — new projects, new subsystems, changes that restructure how components fit together or alter interfaces others depend on. Follow the full process: questions, approaches, sectioned design, written spec, then the `razorback:writing-plans` skill.

When in doubt between two paths, take the heavier one. The ratchet is one-way: hidden complexity discovered mid-task upgrades the path — stop, say so, and step up. Nothing downgrades mid-task.

## Anti-Pattern: "Too Simple To Need Approval"

Every path ends with the user approving your intent before implementation. A todo list, a single-function utility, a config change — the design may be two sentences in chat, but you MUST present it and get approval. "Simple" tasks are where unexamined assumptions cause the most wasted work. The ceremony scales with the task; the approval gate never does. What scales with simplicity is the artifact, never the approval.

## Path Workflows

Every path starts with code-kb orientation (`codebase_outline`, `file_skeleton`, `lookup_symbol`, `find_references`; no Glob → Read → Grep chains) plus `git log --oneline -10`.

### Spike Workflow
1. **Explore project context** via code-kb enough to frame the probe.
2. **Present question + probe plan** — 2-3 sentences.
3. **Get approval** — a nod is enough.
4. **Investigate** — as cheaply as correctness allows (pairs with `razorback:prototyping`).
5. **Report findings as a recommendation**; label anything built as throwaway.

### Bounded Workflow
1. **Explore project context** via code-kb (check files, docs, recent commits).
2. **Ask clarifying questions** — one at a time, the ones that matter.
3. **Present a short design in chat** — approach, files touched, testing.
4. **Get approval** — STOP and wait for an explicit yes; presenting the design and starting in the same breath is skipping the gate.
5. **Implement** — proceed with the normal development workflow (TDD applies):
   - **Delegation is available and permitted:** `razorback:subagent-driven-development`, including for one task.
   - **No delegation, or single-agent execution explicitly selected:** `razorback:executing-plans` (or normal TDD workflow).
   - **Done:** `razorback:finishing-a-development-branch`.

### Architectural Workflow
1. **Offer the visual companion** if visual questions are likely (own message; see below).
2. **Ask clarifying questions**, one per message (see "Interviewing").
3. **Propose 2-3 approaches** with trade-offs; lead with your recommendation and why.
4. **Run `razorback:architecture-quality`** for non-trivial work and capture the approved module/interface shape before presenting the design. No architecture impact → note `No Architecture Impact`.
5. **Present the design** in sections scaled to complexity (a few sentences up to 200-300 words): architecture, components, data flow, error handling, testing. Ask after each section whether it looks right and get user approval before moving on.
6. **Proceed to "After the Design"**.

**Terminal states are path-bound:** Architectural invokes `razorback:writing-plans`. Bounded proceeds to execution. Spike reports findings as a recommendation. No other exits.

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
| "This is too simple to need a design" | Simple means a short design, not no design. Two sentences in chat, then approval. |
| "I'll call it bounded and skip the spec" | Reaching for a label to skip work IS the doubt — take the heavier path. |
| "It's bounded and the design is obvious — I'll start while they read it" | The gate is the approval, not the design's length. Present, then stop until you hear yes. |
| "I understand this kind of app, so it's bounded" | Bounded measures the repo, not your familiarity. A new project has no existing flow — it is architectural. |
| "The user already told me what to build" | An instruction is not a design. Summarize it and get confirmation — that costs minutes. |
| "I'll just scaffold while we talk" | Scaffolding is implementation. The gate bars it until approval. |
| "The spike works, so I'll keep the code" | A spike's output is an answer. Keeping the code is a new request — classify it. |
| "It grew, but I'm almost done — no need to re-classify" | Hidden complexity upgrades the path mid-task. Stop and say so. |
| "They approved the spike, so the follow-up change is approved too" | Each task gets its own classification and its own approval. |
| "A quick prototype will settle this" | Only through the razorback:prototyping off-ramp, with a one-line go-ahead. Throwaway instrument, never production code. |
| "The design is obvious from the codebase" | Then the short design costs one message. Write it and get the yes. |

## Red Flags — STOP

- Any production file write before the user approved a design
- Presenting the design and starting in the same breath
- Invoking writing-plans or an implementer before spec approval
- "While you review that, I'll get started on..."
- A design doc committed on the current branch instead of the task worktree

All of these mean: stop, return to the gate, get the approval.

## It's working if

- The request was classified and the classification said out loud before the first question.
- Every path ended with user approval before any implementation began.
- Bounded designs were presented directly in chat with no spec file.
- Architectural specs landed in the task worktree as the branch's first commit, not on `main`.
- Questions went out one at a time, each carrying a falsifiable guess.
- The session exited through its path's terminal state.
