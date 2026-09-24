---
name: prototyping
description: Use when a design question resists discussion — a state model with more edge cases than fit in your head, a UI the user keeps flip-flopping on because nobody can picture it, or behavior only knowable by running it — before writing a design doc or implementation plan for that question.
---

# Prototyping

A prototype is **throwaway code that answers one design question**. Arguable questions (tradeoffs, boundaries, naming, sequencing) stay in razorback:brainstorming. Empirical questions, settled only by running code, get an instrument.

**Core principle: you build the instrument; the user renders the verdict.** A prototype that ends with you announcing the answer has failed, however correct the answer is.

## When to Use

Symptoms: the dialogue loops on "would this feel right?"; the user flip-flops between imagined options; edge cases outgrow what anyone can hold in their head; anyone says "we won't know until we see/run it."

Not for: something built is misbehaving → razorback:systematic-debugging; small reversible tweak → razorback:fixing-small-issues; unknown external API behavior → razorback:grounding-in-current-docs first, prototype only if current docs cannot settle it.

## The Brainstorming Off-Ramp

This skill runs as an off-ramp from razorback:brainstorming. Its HARD-GATE holds: no production code for a consequential choice the user has not made. A prototype is a disposable instrument, and this skill is the only sanctioned lane for code mid-brainstorm.

Before any prototype code, announce **"Prototyping to settle: <question>"** (one line) and get the user's go-ahead. When answered, return to brainstorming with the verdict; the design doc records the verdict, the question, and the prototype branch pointer. The flow continues (writing-plans or lightweight implementation).

## Pick a Branch

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md): interactive shell (TUI or single-file HTML) over a pure, portable module.
- **"What should this look like?"** → [UI.md](UI.md): structurally different variants on a real route.

If ambiguous and the user is unreachable: backend module → logic; page or component → UI. State the assumption at the top of the prototype.

## Rules (both branches)

1. **One question per prototype**, written down before any code.
2. **The user drives.** Build something the user pushes through cases or flips between by hand. Scripted checks may supplement, never replace: a script only covers cases you imagined.
3. **No production code in the same pass.** Do not write, port, or "while I'm at it" the real implementation until the verdict has gone back through brainstorming and an approved design. Schedule pressure is the trigger for this violation, not an excuse.
4. **Throwaway from day one, marked as such.** In-memory state, no tests, no error handling beyond runnable, no abstractions. Name files and routes so a reader sees "prototype".
5. **Surface the full state** after every action (logic) or on every variant switch (UI).
6. **Orient with code-kb first.** `codebase_outline`/`file_skeleton` the module or page the prototype sits next to, so it speaks the project's vocabulary.
7. **Capture when answered.** Never delete the prototype, never leave it in main.

## Capture

The prototype is a primary source. When the question is settled:

1. Record the verdict and question in the design doc, plus a goldfish checkpoint (what was settled, why, what it unblocks).
2. `git switch -c prototype/<slug>`, commit all prototype files, `git switch -` back. The branch is never merged; the working branch is clean again.
3. Reference the branch name in the design doc next to the verdict.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "The case space is huge — I'll settle it myself and verify with tests" | You built evidence for your pick. The user never saw the cases. Build the drivable instrument instead. |
| "We're behind — I'll write the real implementation while I'm at it" | Production code before an approved design. The hard gate exists precisely for this moment. |
| "I deleted the harness once the port was green — one source of truth" | The prototype is the primary source. Capture it on the throwaway branch. |
| "Delete the losing variants" | Losers are evidence too — they document what was rejected and why. Branch, don't bin. |
| "A test suite is basically an interactive prototype" | Tests check cases you thought of. Driving finds the ones you didn't. |
| "A fresh empty route is cleaner to prototype on" | An empty route is a vacuum — every variant looks fine in isolation. Embed in the real page. |

## Red Flags — STOP

- Prototype code written before the question is stated
- Production paths (`src/`, real routes) receiving non-prototype-named files mid-brainstorm
- You are about to tell the user the answer instead of handing them the run command
- `rm` or "clean up" aimed at a prototype that answered its question
- The prototype grew tests, persistence, or a second question

**All of these mean: stop, restate the question, return to the instrument.**

## It's working if

- The question was written down and announced before any prototype code existed.
- The user drove the instrument and rendered the verdict; you never announced the answer.
- The prototype lives on a `prototype/<slug>` branch, referenced from the design doc.
- No production code was written until the verdict went back through brainstorming.
