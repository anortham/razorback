# Interface Design

Use this file when there are two or more plausible module/interface shapes and the decision has meaningful blast radius. This is where parallel design lanes help. It is not for every cleanup.

## When To Compare Lanes

Use parallel design lanes when the shape is uncertain, the caller-facing interface could be smaller or clearer in more than one way, or the risk is medium/high.

Assign each lane an opposing design constraint so the lanes diverge instead of converging on variations of the first idea:

- **Minimal:** 1–3 entry points, maximum leverage per entry point.
- **Flexible:** support many use cases and extension.
- **Common-caller:** make the most common caller's case trivial.
- **Ports & adapters:** when cross-seam dependencies exist per `deepening.md`.

Each lane should spell out:

- the module/interface shape
- the seam placement
- the adapter strategy
- the test surface
- the expected blast radius
- the risk

## How To Compare

Compare the lanes by the same criteria every time:

- depth
- locality
- leverage
- test surface
- seam placement
- adapter strategy
- blast radius
- risk medium/high

Choose the lane that keeps complexity local, makes the caller obligations smaller, and needs the fewest speculative seams.

## Lane Template

```markdown
### Lane: [Name]

- Module/interface shape:
- Seam placement:
- Adapter strategy:
- Test surface:
- Blast radius:
- Risk: low / medium / high
```

If the first plausible shape is obviously too wide, too shallow, or too coupled, say so and compare another lane before committing. The point is to choose a better interface, not to admire options.

End with an opinionated recommendation: one lane, or a named hybrid when elements from different lanes combine well — never a menu.
