---
name: prototyping
description: Use when a design question resists discussion — a state model with more edge cases than fit in your head, a UI the user keeps flip-flopping on because nobody can picture it, or behavior only knowable by running it — before writing a design doc or implementation plan for that question.
---

# Prototyping

## Overview

A prototype is **throwaway code that answers one design question**. Design questions come in two kinds. **Arguable** questions are settled by reasoning about tradeoffs — stay in razorback:brainstorming. **Empirical** questions are settled only by contact with running code — stop arguing and build the instrument.

**Core principle: you build the instrument; the user renders the verdict.** A prototype that ends with you announcing the answer has failed, however correct the answer is.

## When to Use

Symptoms: the design dialogue loops on "would this feel right?"; the user flip-flops between imagined options; edge-case enumeration outgrows what anyone can hold in their head; anyone says "we won't know until we see/run it."

When NOT to use:
- Question decidable by reasoning (tradeoffs, boundaries, naming, sequencing) → stay in razorback:brainstorming
- Something already built is misbehaving → razorback:systematic-debugging
- Small reversible defect or tweak → razorback:fixing-small-issues
- Unknown external API behavior → razorback:grounding-in-current-docs first; prototype only if current docs can't settle it

## The Brainstorming Off-Ramp

This skill runs as an off-ramp from razorback:brainstorming, and its HARD-GATE still holds: no implementation code before an approved design. A prototype is not implementation — it is a disposable instrument for answering a question, and this skill is the only sanctioned lane for writing code mid-brainstorm.

Before writing any prototype code, announce: **"Prototyping to settle: <question>"** — one line, get the user's go-ahead. When the question is answered, return to brainstorming with the verdict; the design doc records the verdict, the question it settled, and the prototype branch pointer. The flow then continues as normal (writing-plans or lightweight implementation).

## Pick a Branch

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md) — interactive shell over a pure, portable module; shell choice — TUI or single-file HTML — inside LOGIC.md.
- **"What should this look like?"** → [UI.md](UI.md) — structurally different variants on a real route.

Getting this wrong wastes the whole prototype. If genuinely ambiguous and the user is unreachable: a backend module → logic; a page or component → UI. State the assumption at the top of the prototype.

## Rules (both branches)

1. **One question per prototype**, written down before any code.
2. **The user drives.** Build something the user pushes through cases or flips between by hand. Scripted checks may supplement interactive driving, never replace it — a script only exercises cases you imagined; the point is the cases you didn't.
3. **No production code in the same pass.** Do not write, port, or "while I'm at it" the real implementation until the verdict has gone back through brainstorming and an approved design. Schedule pressure is the trigger for this violation, not an excuse for it.
4. **Throwaway from day one, marked as such.** In-memory state, no tests, no error handling beyond runnable, no abstractions. Name files and routes so a casual reader sees "prototype."
5. **Surface the full state** after every action (logic) or on every variant switch (UI).
6. **Orient with Miller first.** `context`/`inspect` the module or page the prototype sits next to before building — the prototype should speak the project's existing vocabulary and conventions.
7. **Capture when answered** — see below. Never delete the prototype, never leave it in main.

## Capture

The prototype is a **primary source** — runnable evidence the verdict came from. When the question is settled:

1. Record the **answer** durably: verdict + question in the design doc, and a goldfish checkpoint (WHAT was settled, WHY, what it unblocks).
2. Commit the prototype to a throwaway branch: `git switch -c prototype/<slug>`, commit all prototype files, `git switch -` back. The branch is never merged; the working branch is clean again.
3. Reference the branch name in the design doc next to the verdict.

Main keeps only the validated decision; the raw exploration stays one `git switch` away.

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
- The prototype lives on a `prototype/<slug>` branch, referenced from the design doc — not deleted, not in main.
- No production code was written until the verdict went back through brainstorming.
