# Task Templates

Copy the template for the plan type. Both share the same header block (Files,
Interfaces, Contract inputs, File ownership, Serialization required,
Dependency reason); they diverge after it.

## Full Plan Task Template

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact symbols, signatures, data shape, or user-facing contract]
- Produces: [what later tasks rely on — exact function names, parameter and return types, file formats, CLI flags, routes, or events. A task's implementer sees only their own task; this block is how they learn neighboring contracts.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `<project-defined worker red/green command for this behavior>`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `<project-defined worker red/green command for this behavior>`
Expected: PASS

**Step 5: Apply commit mode**

- `serial-worker-commit`: after assigned verification passes, create the owned-file
  worker commit and record the resulting SHA.
- `parallel-lead-commit`: do not commit from the worker lane. Hand the verified
  change to the lead for staging and commit after inline review.

**Acceptance criteria:**
- [ ] [Specific, testable requirement for this task]
- [ ] Tests pass and the change is either committed by the worker or handed to the lead per commit mode
````

## Light Plan Task Template

````markdown
### Task N: [Slice or component name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [exact contract this task depends on]
- Produces: [exact contract future tasks depend on. A task's implementer sees only their own task, so include names and shapes here.]

**Contract inputs:** [Exact shared constraints, prior-task outputs, fixtures, tool contracts, or public strings this task may rely on]

**File ownership:** [Copy the ownership entry from `## Parallel Execution Contract` verbatim]

**Serialization required:** [No / Yes / Not applicable - single task.]

**Dependency reason:** [Required reason from `## Parallel Execution Contract`]

**What to build:** [2-3 sentences describing the feature/change and why]

**Approach:** [Key decisions — which pattern to follow, what to call things, edge cases to handle]

**Acceptance criteria:**
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Worker-scope verification passes and the change is either committed by the worker or handed to the lead per commit mode
````
