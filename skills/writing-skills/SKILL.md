---
name: writing-skills
description: Writes and tests razorback skills test-first, with baseline runs without the skill, a minimal SKILL.md, and pressure scenarios until agents comply. Use when creating or editing a skill, writing its frontmatter or description, or verifying a skill before deployment.
---

# Writing Skills

Writing a skill is TDD applied to process documentation: run pressure scenarios with subagents, watch them fail without the skill, write the skill, watch them pass, close loopholes.

**Core principle:** if you did not watch an agent fail without the skill, you do not know whether the skill teaches the right thing.

**REQUIRED BACKGROUND:** razorback:test-driven-development (RED-GREEN-REFACTOR).

## When to Create a Skill

Create when the technique was not obvious, you would reuse it across projects, and it applies broadly. Not for one-off solutions, well-documented standard practice, project-specific conventions (CLAUDE.md), or mechanical constraints (automate with validation). A skill is a reusable technique or reference, never a narrative of one session.

## File Organization

- Flat namespace. Personal skills: `~/.claude/skills` (Claude Code), `~/.agents/skills/` (Codex).
- Keep inline: principles, concepts, code patterns under 50 lines. Separate files only for heavy reference (100+ lines) and reusable tools.
- `anthropic-best-practices.md` (this directory) is a verbatim copy of Anthropic's [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), with its fetch date. Re-fetch it when the upstream guide changes; this file names each place razorback departs from it.

## SKILL.md Structure

Frontmatter ([spec](https://agentskills.io/specification)): `name` is 64 characters max, lowercase letters, numbers, and hyphens only, no XML tags, and must not contain "anthropic" or "claude" (`claude-cli` predates this rule and keeps its name for compatibility). `description` is non-empty, 1024 characters max, no XML tags (see CSO). Every razorback skill stays model-invoked.

```markdown
## Overview          — core principle in 1-2 sentences plus the defining constraint that makes this skill differ from the default, as plain prose
## When to Use       — symptoms, use cases, when NOT to use
## Core Pattern      — before/after comparison
## Quick Reference   — table or bullets
## Implementation    — inline code, or a link for heavy reference
## Common Mistakes   — what goes wrong + fixes
## It's working if   — signals checkable without reopening the skill
```

## Claude Search Optimization (CSO)

**Description = what the skill gives, then when to use it.** The agent picks one skill from many by this text alone.

- First sentence: what the skill does or produces, in third person ("Finds…", "Runs…"). State the outcome, never the step sequence: a step summary becomes a shortcut the agent takes instead of reading the body.
- Then "Use when..." with concrete triggers, symptoms, and the phrases users say.
- End with a boundary when a sibling skill is close: "Not for X (razorback:Y)."
- Describe the problem (race conditions, flaky results), not language-specific symptoms, unless the skill is technology-specific; then say so.
- Third person throughout (injected into the system prompt): no "you" or "your". Under 500 characters.

```yaml
# ❌ Summarizes the steps
description: Use when executing plans - dispatches subagent per task with code review between tasks
# ❌ Triggers only: the agent cannot tell what it gets
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
# ✅ Outcome, then triggers
description: Replaces arbitrary sleeps with waits on the real condition. Use when tests have race conditions, timing dependencies, or pass/fail inconsistently.
```

**Keywords:** the words an agent would search for: error messages, symptoms ("flaky", "hanging"), synonyms ("timeout/hang/freeze"), tool and file names.

**Naming:** gerunds for process and technique skills (`fixing-small-issues`, `writing-plans`); `<tool>-cli` for skills that drive one external model CLI (`codex-cli`). Name by what you do or the core insight: `condition-based-waiting` over `async-test-helpers`. Never vague names (`helper`, `utils`).

**Token efficiency:** getting-started workflows under 150 words each; frequently loaded skills under 200 words; other skills under 500 words. Move flag details to `--help`; cross-reference instead of repeating; one example per pattern; cut dialogue to the shortest form that shows the pattern. No-op test: a sentence whose removal leaves the GREEN subagent run unchanged gets deleted whole. Check with `wc -w`.

**Cross-references:** name only, with a marker: `**REQUIRED SUB-SKILL:** Use razorback:test-driven-development`. Never `@skills/...` links (force-load, burn context) or bare paths.

## Flowcharts and Examples

Flowcharts only for non-obvious decisions, loops where agents stop early, and "A vs B" choices. Reference material → tables; code → markdown blocks; linear steps → numbered lists; labels carry meaning. Read `graphviz-conventions.dot` for the style. To render, run `node "$SKILL_DIR/render-graphs.js" <skill-directory> [--combine]`, where `SKILL_DIR` is this skill's directory; it needs Node.js and Graphviz `dot` on `PATH`, and exits nonzero when a diagram fails.

One excellent example beats many: complete, runnable, from a real scenario, in the most relevant language. Never the same example in five languages. When the output format matters, give a template and say whether it is strict ("use exactly this structure") or a default ("adapt as needed").

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Applies to new skills and to edits. Wrote or edited before testing? Delete it and start over. No exceptions for "simple additions", "just a section", or "documentation updates"; no keeping untested changes as "reference"; no "adapting" while tests run.

## Skill Types and How to Test Each

| Type | Test with | Passes when the agent |
|------|-----------|------------------|
| **Technique** (concrete steps) | Application scenarios; edge-case variations; missing-information tests | applies it correctly to a new scenario |
| **Pattern** (way of thinking) | Recognition and application scenarios; counter-examples | identifies when and how to apply it |
| **Reference** (API docs, syntax) | Retrieval and application scenarios; gap testing | finds and correctly applies the information |
| **Discipline-enforcing** (rules) | Academic questions; pressure scenarios; combined pressures (time + sunk cost + exhaustion); a counter per rationalization found | follows the rule under maximum pressure |

## Common Rationalizations for Skipping Testing

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps, unclear sections. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. 15 min testing saves hours. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Testing is less tedious than debugging bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested skill wastes more time fixing it later. |

**All of these mean: Test before deploying. No exceptions.**

## Bulletproofing Discipline Skills

Agents find loopholes under pressure (`persuasion-principles.md` covers why the counters work).

- Close every loophole explicitly: forbid the specific workarounds, as the Iron Law does.
- Add early: `**Violating the letter of the rules is violating the spirit of the rules.**`
- Quote the baseline (RED) run verbatim in an `| Excuse | Reality |` table.
- Put violation symptoms in the description: `use when implementing any feature or bugfix, before writing implementation code`.
- Add a `## Red Flags - STOP` list of self-check phrases ("I already manually tested it", "This is different because...") ending in the corrective action.

## RED-GREEN-REFACTOR for Skills

- **RED:** run the pressure scenario with a subagent WITHOUT the skill. Record choices and rationalizations verbatim, and which pressures triggered violations.
- **GREEN:** write the minimal skill that addresses those rationalizations, nothing hypothetical. Re-run the same scenarios WITH the skill, on each model the skill targets, including the smallest: guidance that is enough for Opus can be too thin for Haiku.
- **REFACTOR:** new rationalization → explicit counter → rerun the scenario that exposed it until it holds, then the full set once.

`testing-skills-with-subagents.md` covers pressure scenario design, pressure types, plugging holes, and meta-testing. `examples/CLAUDE_MD_TESTING.md` is a worked scenario set for one documentation variant.

## Skill Creation Checklist

One skill at a time: written, tested, deployed before the next starts. Track each item as a task.

- **RED:** at least three scenarios (3+ combined pressures for discipline skills); baseline run without the skill, documented verbatim; failure patterns identified.
- **GREEN:** valid frontmatter; description follows CSO; search keywords; overview with core principle; baseline failures addressed; code inline or linked; one example; scenarios pass with the skill on each target model.
- **REFACTOR:** new rationalizations countered; rationalization table and red flags list (discipline skills); re-tested.
- **Quality:** body follows the structure template; no narrative; supporting files only for tools or heavy reference, each linked directly from SKILL.md, with a contents list when over 100 lines; no dated or version-pinned statements outside an old-patterns note.
- **Deploy:** commit; push to your fork if configured; PR if broadly useful.

## It's working if

- Every new or edited skill has a documented baseline (RED) run and a passing (GREEN) run.
- The rationalization table quotes what baseline agents actually said, not what you imagined.
- The description says what the skill gives and when to use it; it never lists the steps.
- Word counts sit inside the token targets, and every sentence survives the no-op test.
