---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
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
- `anthropic-best-practices.md` (this directory) carries Anthropic's official authoring guidance.

## SKILL.md Structure

Frontmatter: `name` (letters, numbers, hyphens) and `description` (triggers only; see CSO), 1024 chars max total ([spec](https://agentskills.io/specification)). Every razorback skill stays model-invoked.

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

**Description = when to use, never what the skill does.** A workflow summary in the description becomes a shortcut the agent takes instead of reading the body.

- Start with "Use when..."; list concrete triggers, symptoms, situations.
- Describe the problem (race conditions, flaky results), not language-specific symptoms, unless the skill is technology-specific; then say so.
- Third person (injected into the system prompt). Under 500 characters.

```yaml
# ❌ Summarizes workflow
description: Use when executing plans - dispatches subagent per task with code review between tasks
# ✅ Triggers only, third person, technology-agnostic
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

**Keywords:** the words an agent would search for: error messages, symptoms ("flaky", "hanging"), synonyms ("timeout/hang/freeze"), tool and file names.

**Naming:** verb-first, by what you do or the core insight: `condition-based-waiting` over `async-test-helpers`; gerunds for processes.

**Token efficiency:** getting-started workflows under 150 words each; frequently loaded skills under 200 words; other skills under 500 words. Move flag details to `--help`; cross-reference instead of repeating; one example per pattern; cut dialogue to the shortest form that shows the pattern. No-op test: a sentence whose removal leaves the GREEN subagent run unchanged gets deleted whole. Check with `wc -w`.

**Cross-references:** name only, with a marker: `**REQUIRED SUB-SKILL:** Use razorback:test-driven-development`. Never `@skills/...` links (force-load, burn context) or bare paths.

## Flowcharts and Examples

Flowcharts only for non-obvious decisions, loops where agents stop early, and "A vs B" choices. Reference material → tables; code → markdown blocks; linear steps → numbered lists; labels carry meaning. Style: `graphviz-conventions.dot`; `render-graphs.js` renders to SVG (`--combine` for one file).

One excellent example beats many: complete, runnable, from a real scenario, in the most relevant language. Never five languages or fill-in-the-blank templates.

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
- **GREEN:** write the minimal skill that addresses those rationalizations, nothing hypothetical. Re-run the same scenarios WITH the skill.
- **REFACTOR:** new rationalization → explicit counter → rerun the scenario that exposed it until it holds, then the full set once.

`testing-skills-with-subagents.md` covers pressure scenario design, pressure types, plugging holes, and meta-testing.

## Skill Creation Checklist

One skill at a time: written, tested, deployed before the next starts. Track each item as a task.

- **RED:** pressure scenarios (3+ combined pressures for discipline skills); baseline run without the skill, documented verbatim; failure patterns identified.
- **GREEN:** valid frontmatter; description follows CSO; search keywords; overview with core principle; baseline failures addressed; code inline or linked; one example; scenarios pass with the skill.
- **REFACTOR:** new rationalizations countered; rationalization table and red flags list (discipline skills); re-tested.
- **Quality:** body follows the structure template; no narrative; supporting files only for tools or heavy reference.
- **Deploy:** commit; push to your fork if configured; PR if broadly useful.

## It's working if

- Every new or edited skill has a documented baseline (RED) run and a passing (GREEN) run.
- The rationalization table quotes what baseline agents actually said, not what you imagined.
- The description names triggers only; reading it tells you when, not how.
- Word counts sit inside the token targets, and every sentence survives the no-op test.
