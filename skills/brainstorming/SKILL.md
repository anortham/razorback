---
name: brainstorming
description: "Use when starting any creative work - creating a feature, building a component, adding functionality, or changing designed behavior - before writing code or invoking any implementation skill. Small defect repairs and tweaks triage through razorback:fixing-small-issues first."
---

# Brainstorming Ideas Into Designs

## Overview

Turn ideas into approved designs through natural collaborative dialogue, before any implementation begins. The defining constraint: no code, no scaffolding, no implementation skill until a written design exists and the user has approved it — however simple the task looks.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have a design and the user has approved it.
</HARD-GATE>

**One exception:** when a design question is empirical — settleable only by running code, not by more discussion — take the razorback:prototyping off-ramp: announce the question, get a one-line go-ahead, build the throwaway instrument, return here with the user's verdict. Prototype code is not implementation; the gate still bars all production code.

## Triage First: Is This Design Work?

Before choosing a path, check the tier. A reported defect or a small tweak that meets the quick-fix criteria (≤ 2 source files, ~20 changed lines, no contract changes, reversible — see razorback:fixing-small-issues) is repair work, not design work: route it to razorback:fixing-small-issues instead of running this skill. Investigation happens there first; if the issue outgrows the criteria, it escalates back here with its evidence.

This is a measured gate, not a judgment call. "Feels simple" is not a criterion — the Rationalizations table below still applies to everything that doesn't measurably fit the quick-fix tier. Brainstorming remains mandatory for creating features, building components, adding functionality, or changing designed behavior.

## Choosing the Right Path

Three paths, scaled to the situation:

| Path | When | Steps | Exit to |
|------|------|-------|---------|
| **Full process** | Requirements unclear, multiple approaches | Q&A → approaches → design → doc | writing-plans |
| **Fast path** | Design agreed, but task is large or multi-session | Summarize → confirm → doc | writing-plans |
| **Lightweight** | Design agreed AND task is moderate (< ~300 lines new code, same-session) | Summarize → confirm → doc with acceptance criteria | dispatch implementer directly |

**How to tell the difference:**
- **Full process:** Requirements are vague, multiple valid approaches exist, you have real questions about scope/constraints/tradeoffs
- **Fast path:** Design is agreed but the task is large enough to benefit from a formal plan (multi-task, multi-session, or complex enough that an implementer needs detailed guidance)
- **Lightweight:** Design is agreed, task is moderate, execution is same-session. A formal plan would just restate the design. Go straight to implementation + code quality review.

The anti-rationalization check: can you articulate the agreed design in concrete terms (components, data flow, key decisions)? If yes, fast path or lightweight. If you're hand-waving with "it's basically just X," you need the full process. The choice between fast path and lightweight depends on task size and complexity, not on how well you understand it.

## Checklist

Every path ends in the same tail — the "After the Design" sequence below (doc → self-review → doubt pass when triggered → user gate → worktree → exit). The paths differ only in how the design gets agreed:

**Lightweight** (design agreed, moderate task, same-session):
1. **Explore project context** — use Miller to orient, check recent commits
2. **Summarize agreed design with acceptance criteria** - present for user confirmation. Note the approved module/interface shape, or `No Architecture Impact` for mechanical work. The design doc doubles as the implementer's spec — include the acceptance criteria checklist.
3. **Run "After the Design"** — exit: dispatch the implementer directly ("Lightweight Implementation" below)

**Fast path** (design agreed, large or multi-session task):
1. **Explore project context** — use Miller to orient, check recent commits
2. **Summarize agreed design** - present concrete summary for user confirmation. Note the approved module/interface shape, or `No Architecture Impact` for mechanical work — writing-plans copies this into the plan's Architecture Quality header.
3. **Run "After the Design"** — exit: invoke razorback:writing-plans (in the worktree)

**Full process** (requirements unclear or multiple approaches):
1. **Explore project context** — use Miller to orient on the relevant codebase area, check recent commits
2. **Offer visual companion** (if topic will involve visual questions) - this is its own message, not combined with a clarifying question. See the Visual Companion section below.
3. **Ask clarifying questions** - one at a time, understand purpose/constraints/success criteria
4. **Propose 2-3 approaches** - with trade-offs and your recommendation
5. **Run `razorback:architecture-quality`** - for non-trivial work, capture the approved module/interface shape before presenting the design. If the task has no architecture impact, note `No Architecture Impact`.
6. **Present design** - in sections scaled to their complexity, get user approval after each section
7. **Run "After the Design"** — exit: invoke razorback:writing-plans (in the worktree)

**Terminal states:** Either invoke razorback:writing-plans (full/fast path) or proceed to lightweight implementation (see below). These are the only two exits from brainstorming.

## The Process

**Understanding the idea:**
- Orient with Miller first: use `context` for token-budgeted codebase context, `inspect` to understand file structure and key symbols, and `trace` when references matter. Do NOT fall back to Glob → Read → Grep chains.
- For non-trivial work, run `razorback:architecture-quality` after that orientation and once requirements are clear enough to assess structure, before presenting the design. If the task has no architecture impact, record `No Architecture Impact` and continue.
- Check recent commits: `git log --oneline -10`
- Infer and record routine, reversible details instead of turning them into user questions
- Ask only unresolved questions whose answers materially change product intent, safety, scope, or architecture; ask them one at a time
- Attach your best guess to every question and make it falsifiable: "I'm guessing X because Y — is that right?" A confirmed guess advances the design; a corrected one is the cheapest correction you'll ever get. In multiple choice, put your guess first and label it as your guess.
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple messages
- Focus on understanding: purpose, constraints, success criteria
- Finding facts is the agent's job: for any environment fact (what the repo contains, what a tool supports, what a config declares), use Miller or dispatch a subagent — never ask the user for something the repo can answer, and don't block the interview on the lookup; only questions downstream of that fact wait
- Model the open design questions as a tree: a question is on the frontier when its prerequisites are settled
- When the dialogue loops on a question only running code can answer — the feel of a state model, the look of a page — stop arguing and take the razorback:prototyping off-ramp; record the verdict in the design when you return
- Stop asking when no frontier question can materially change product intent, safety, scope, or architecture, you can state the purpose, constraints, and success criteria in your own words, and your last material question produced no correction — then move to approaches. Routine reversible details do not keep the frontier open; record the chosen defaults in the design and continue.

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation (all paths):**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Do NOT commit yet — the design doc is committed in the task worktree as the branch's first commit (isolated-workspace step below)

**Spec Self-Review:**
After writing the spec document, look at it with fresh eyes:

1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague requirements? Fix them.
2. **Internal consistency:** Do any sections contradict each other? Does the architecture match the feature descriptions?
3. **Scope check:** Is this focused enough for a single implementation plan, or does it need decomposition?
4. **Ambiguity check:** Could any requirement be interpreted two different ways? If so, pick one and make it explicit.

Fix any issues inline. No need to re-review, just fix and move on. When the session can dispatch subagents, you may instead dispatch a fresh-eyes reviewer using `spec-document-reviewer-prompt.md` (this directory).

**Doubt pass (full process only, conditional):**
If `razorback:architecture-quality` rated the risk medium/high, run the Doubt Pass from `razorback:cross-model-convergence` and fold surviving objections into the spec. This is lead work inside the flow, not a user gate.

**User Review Gate:** User reviews written spec.
After the spec review loop passes, ask the user to review the written spec before proceeding. The spec's visual digest — `<design-doc>.html` beside the markdown, sibling basename, composed per the `razorback:using-razorback` skill's `references/digest-kit.md` — is opt-in: write it only when the user asked for a digest in this session or in project instructions. Never generate one unprompted.

> "Spec written to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

When a digest was requested, add to the ask: "with a visual digest at `<design-doc>.html`".

Wait for the user's response. If they request changes, make them and re-run the spec review loop. Only proceed once the user approves.

**Isolated workspace (all paths, after spec approval):**
- **REQUIRED SUB-SKILL:** razorback:using-git-worktrees — set up the isolated workspace the implementation will run in. Skip only with explicit user consent (small same-session work on a plain feature branch).
- Move the design doc into the worktree and commit it there as the branch's first commit — untracked files do NOT follow into a new worktree. The plan is then written and executed in that worktree.

**Full/fast path → writing-plans:**
- Invoke razorback:writing-plans (in the worktree) to create an implementation plan

**Lightweight → direct implementation:**
- See "Lightweight Implementation" below

## Lightweight Implementation

For moderate, well-understood tasks executed in the same session. Skips writing-plans — dispatches directly to implementation.

**The design doc IS the plan.** Make sure it includes:
- What to build and why
- Which files to create/modify (exact paths from Miller)
- Acceptance criteria checklist
- Key decisions and edge cases

**If the task has 2+ independent parts:** Use `razorback:subagent-driven-development`. The design doc serves as the plan. Dispatch one implementer subagent per independent part in parallel, assigning file ownership to prevent conflicts.

**If the task is a single coherent unit:** Dispatch one implementer using the prompt template from `razorback:subagent-driven-development`.

```
Dispatch one implementer subagent:
  description: "Implement [feature name]"
  prompt: |
    [Follow subagent-driven-development/implementer-prompt.md template]
    Task description = the design doc
    Context = conversational agreement
```

**Review:** Lead does inline review when the implementer reports back (spec compliance + code quality). If issues found, route the fix per `razorback:subagent-driven-development` (resume on Claude Code, fresh dispatch with fix context on opencode).

**Done:** After review passes, use razorback:finishing-a-development-branch.

## Visual Companion

A browser-based companion for showing mockups, diagrams, and visual options during brainstorming. Available as a tool, not a mode. Accepting the companion means it's available for questions that benefit from visual treatment; it does NOT mean every question goes through the browser.

**Offering the companion:** When you anticipate that upcoming questions will involve visual content (mockups, layouts, diagrams), offer it once for consent:
> "Some of what we're working on might be easier to explain if I can show it to you in a web browser. I can put together mockups, diagrams, comparisons, and other visuals as we go. This feature is still new and can be token-intensive. Want to try it? (Requires opening a local URL)"

**This offer MUST be its own message.** Do not combine it with clarifying questions, context summaries, or any other content. The message should contain ONLY the offer above and nothing else. Wait for the user's response before continuing. If they decline, proceed with text-only brainstorming.

**Per-question decision:** Even after the user accepts, decide FOR EACH QUESTION whether to use the browser or the terminal. The test: **would the user understand this better by seeing it than reading it?**

- **Use the browser** for content that IS visual (mockups, wireframes, layout comparisons, architecture diagrams, side-by-side visual designs)
- **Use the terminal** for content that is text (requirements questions, conceptual choices, tradeoff lists, A/B/C/D text options, scope decisions)

If they agree to the companion, read the detailed guide before proceeding:
`skills/brainstorming/visual-companion.md`

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Guess, then ask** - Every question carries a falsifiable guess; expose your prior so one word can correct it
- **Facts are the agent's job** - Fetch environment facts with Miller or a subagent; ask the user for decisions, not lookups
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design, get approval before moving on
- **Be flexible** - Go back and clarify when something doesn't make sense

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
