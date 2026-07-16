# Skill authoring best practices

> Learn how to write effective Skills that Claude can discover and use successfully.

Razorback-specific authoring rules live in SKILL.md; this file carries Anthropic's official guidance that complements them.

Good Skills are concise, well-structured, and tested with real usage. This guide covers the practical authoring decisions behind them.

For conceptual background on how Skills work, see the [Skills overview](/en/docs/agents-and-tools/agent-skills/overview).

## Core principles

### Concise is key

The [context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) is a public good. Your Skill shares the context window with everything else Claude needs to know, including:

* The system prompt
* Conversation history
* Other Skills' metadata
* Your actual request

Not every token in your Skill has an immediate cost — only metadata is pre-loaded, and files are read on demand (see Runtime environment below). But being concise in SKILL.md still matters: once Claude loads it, every token competes with conversation history and other context.

**Default assumption**: Claude is already very smart. Only add context it doesn't already have, and challenge each piece: "Does Claude really need this explanation?" "Can I assume Claude knows this?" "Does this paragraph justify its token cost?"

**Good example: Concise** (approximately 50 tokens):

````markdown  theme={null}
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**Bad example: Too verbose** (approximately 150 tokens) — same section, three times the tokens:

```markdown  theme={null}
PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
```

The concise version assumes Claude knows what PDFs are and how libraries work.

### Set appropriate degrees of freedom

Match the level of specificity to the task's fragility and variability.

**High freedom** (text-based instructions):

Use when:

* Multiple approaches are valid
* Decisions depend on context
* Heuristics guide the approach

Example:

```markdown  theme={null}
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

**Medium freedom** (pseudocode or scripts with parameters):

Use when:

* A preferred pattern exists
* Some variation is acceptable
* Configuration affects behavior

Example:

````markdown  theme={null}
## Generate report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
    # Optionally include visualizations
```
````

**Low freedom** (specific scripts, few or no parameters):

Use when:

* Operations are fragile and error-prone
* Consistency is critical
* A specific sequence must be followed

Example:

````markdown  theme={null}
## Database migration

Run exactly this script:

```bash
python scripts/migrate.py --verify --backup
```

Do not modify the command or add additional flags.
````

**Analogy**: think of Claude as a robot exploring a path. A narrow bridge with cliffs on both sides has one safe way forward — give exact instructions and guardrails (low freedom). An open field has many routes to success — give general direction and trust Claude to find the best one (high freedom).

### Test with all models you plan to use

Skills act as additions to models, so effectiveness depends on the underlying model. Test with each model you plan to use, asking:

* **Claude Haiku** (fast, economical): Does the Skill provide enough guidance?
* **Claude Sonnet** (balanced): Is the Skill clear and efficient?
* **Claude Opus** (powerful reasoning): Does the Skill avoid over-explaining?

What works perfectly for Opus might need more detail for Haiku. Aim for instructions that work well with all of them.

## Skill structure

<Note>
  For complete Skill structure details, see the [Skills overview](/en/docs/agents-and-tools/agent-skills/overview#skill-structure). Frontmatter fields and description rules: see SKILL.md.
</Note>

### Progressive disclosure patterns

SKILL.md serves as an overview that points Claude to detailed materials as needed, like a table of contents in an onboarding guide. For how progressive disclosure works, see [How Skills work](/en/docs/agents-and-tools/agent-skills/overview#how-skills-work).

**Practical guidance:** keep the SKILL.md body under 500 lines for optimal performance, splitting content into separate files as you approach that limit. The patterns below organize instructions, code, and resources.

#### From simple to complex

A basic Skill is just a SKILL.md file containing metadata and instructions. As it grows, bundle additional content that Claude loads only when needed, until the directory looks like this:

```
pdf/
├── SKILL.md              # Main instructions (loaded when triggered)
├── FORMS.md              # Form-filling guide (loaded as needed)
├── reference.md          # API reference (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/
    ├── analyze_form.py   # Utility script (executed, not loaded)
    ├── fill_form.py      # Form filling script
    └── validate.py       # Validation script
```

#### Pattern 1: High-level guide with references

````markdown  theme={null}
---
name: PDF Processing
description: Extracts text and tables from PDF files, fills forms, and merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## Quick start

Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
````

Claude loads FORMS.md, REFERENCE.md, or EXAMPLES.md only when needed.

#### Pattern 2: Domain-specific organization

For Skills with multiple domains, organize content by domain to avoid loading irrelevant context. When a user asks about sales metrics, Claude only needs to read sales-related schemas, not finance or marketing data. This keeps token usage low and context focused.

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

````markdown SKILL.md theme={null}
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline, accounts → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features, adoption → See [reference/product.md](reference/product.md)
**Marketing**: Campaigns, attribution, email → See [reference/marketing.md](reference/marketing.md)

## Quick search

Find specific metrics using grep:

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
grep -i "api usage" reference/product.md
```
````

#### Pattern 3: Conditional details

A variant of Pattern 1: keep the common path inline and link out only for the branches most users won't take. A DOCX Processing SKILL.md would explain simple edits inline ("modify the XML directly") while deferring the rest — **For tracked changes**: See [REDLINING.md](REDLINING.md); **For OOXML details**: See [OOXML.md](OOXML.md) — so Claude reads those files only when the user needs those features.

### Avoid deeply nested references

Claude may partially read files when they're referenced from other referenced files. When encountering nested references, Claude might use commands like `head -100` to preview content rather than reading entire files, resulting in incomplete information.

**Keep references one level deep from SKILL.md**. All reference files should link directly from SKILL.md to ensure Claude reads complete files when needed.

**Bad example: Too deep** — SKILL.md points to advanced.md, which points to details.md, which finally holds the actual information:

```markdown  theme={null}
# SKILL.md
See [advanced.md](advanced.md)...

# advanced.md
See [details.md](details.md)...

# details.md
Here's the actual information...
```

**Good**: every reference file links directly from SKILL.md — the Pattern 1 layout above.

### Structure longer reference files with table of contents

For reference files longer than 100 lines, include a table of contents at the top so Claude can see the full scope of available information even when previewing with partial reads, then read the whole file or jump to a section.

```markdown  theme={null}
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...
```

For how this filesystem-based architecture enables progressive disclosure, see [Runtime environment](#runtime-environment) below.

## Workflows and feedback loops

### Use workflows for complex tasks

Break complex operations into clear, sequential steps. For particularly complex workflows, provide a checklist that Claude can copy into its response and check off as it progresses.

**Example 1: Research synthesis workflow** (for Skills without code):

````markdown  theme={null}
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```

**Step 1: Read all source documents** — review each document in `sources/`, noting main arguments and supporting evidence.

**Step 2: Identify key themes** — look for patterns across sources. What recurs? Where do sources agree or disagree?

**Step 3: Cross-reference claims** — for each major claim, verify it appears in the source material and note which source supports it.

**Step 4: Create structured summary** — organize findings by theme: main claim, supporting evidence, conflicting viewpoints (if any).

**Step 5: Verify citations** — check that every claim references the correct source document. If citations are incomplete, return to Step 3.
````

This example shows how workflows apply to analysis tasks that don't require code. The checklist pattern works for any complex, multi-step process.

**Example 2: PDF form filling workflow** (for Skills with code):

````markdown  theme={null}
## PDF form filling workflow

Copy this checklist and check off items as you complete them:

```
Task Progress:
- [ ] Step 1: Analyze the form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill the form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)
```

**Step 1: Analyze the form** — `python scripts/analyze_form.py input.pdf` extracts form fields and their locations, saving to `fields.json`.

**Step 2: Create field mapping** — edit `fields.json` to add values for each field.

**Step 3: Validate mapping** — `python scripts/validate_fields.py fields.json`. Fix any validation errors before continuing.

**Step 4: Fill the form** — `python scripts/fill_form.py input.pdf fields.json output.pdf`

**Step 5: Verify output** — `python scripts/verify_output.py output.pdf`. If verification fails, return to Step 2.
````

Clear steps prevent Claude from skipping critical validation. The checklist helps both Claude and you track progress through multi-step workflows.

### Implement feedback loops

**Common pattern**: Run validator → fix errors → repeat

This pattern greatly improves output quality.

```markdown  theme={null}
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues in the XML
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild: `python ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. Test the output document
```

The validation loop catches errors early. **The validator doesn't have to be a script** — for Skills without code, a reference document works the same way: "Draft content following STYLE\_GUIDE.md → review against its checklist (terminology consistency, standard example format, required sections) → note each issue with a section reference and revise → only proceed when all requirements are met." Claude performs the check by reading and comparing.

## Content guidelines

### Avoid time-sensitive information

Don't include information that will become outdated — "If you're doing this before August 2025, use the old API. After August 2025, use the new API." is wrong the moment the date passes. Put superseded material in an "old patterns" section instead:

```markdown  theme={null}
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>

The v1 API used: `api.example.com/v1/messages`

This endpoint is no longer supported.
</details>
```

This gives historical context without cluttering the main content.

### Use consistent terminology

Choose one term and use it throughout the Skill — consistency helps Claude understand and follow instructions.

* ✓ Always "API endpoint" / always "field" / always "extract"
* ✗ Mixing "API endpoint", "URL", "API route", "path"; or "field", "box", "element", "control"; or "extract", "pull", "get", "retrieve"

## Common patterns

### Template pattern

Provide templates for output format. One template serves any strictness level; the framing line above it sets the freedom.

````markdown  theme={null}
## Report structure

# Strict (API responses, data formats): "ALWAYS use this exact template structure:"
# Flexible (adaptation is useful): "Here is a sensible default format, but use your
# best judgment based on the analysis. Adjust sections as needed."

```markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```
````

### Examples pattern

For Skills where output quality depends on seeing examples, provide input/output pairs just like in regular prompting:

````markdown  theme={null}
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

Follow this style: type(scope): brief description, then detailed explanation.
````

Examples help Claude understand the desired style and level of detail more clearly than descriptions alone.

### Conditional workflow pattern

Guide Claude through decision points:

```markdown  theme={null}
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

<Tip>
  If workflows become large or complicated with many steps, consider pushing them into separate files and tell Claude to read the appropriate file based on the task at hand.
</Tip>

## Evaluation and iteration

### Build evaluations first

**Create evaluations BEFORE writing extensive documentation.** This ensures your Skill solves real problems rather than documenting imagined ones.

**Evaluation-driven development:**

1. **Identify gaps**: Run Claude on representative tasks without a Skill. Document specific failures or missing context
2. **Create evaluations**: Build three scenarios that test these gaps
3. **Establish baseline**: Measure Claude's performance without the Skill
4. **Write minimal instructions**: Create just enough content to address the gaps and pass evaluations
5. **Iterate**: Execute evaluations, compare against baseline, and refine

This approach ensures you're solving actual problems rather than anticipating requirements that may never materialize.

**Evaluation structure**:

```json  theme={null}
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file and save it to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads the PDF file using an appropriate PDF processing library or command-line tool",
    "Extracts text content from all pages in the document without missing any pages",
    "Saves the extracted text to a file named output.txt in a clear, readable format"
  ]
}
```

<Note>
  This example demonstrates a data-driven evaluation with a simple testing rubric. We do not currently provide a built-in way to run these evaluations. Users can create their own evaluation system. Evaluations are your source of truth for measuring Skill effectiveness.
</Note>

### Develop Skills iteratively with Claude

The most effective Skill development process involves Claude itself. Work with one instance of Claude ("Claude A") to create a Skill that will be used by other instances ("Claude B"). Claude A helps you design and refine instructions, while Claude B tests them in real tasks. This works because Claude models understand both how to write effective agent instructions and what information agents need.

**Creating a new Skill:**

1. **Complete a task without a Skill**: work through the problem with Claude A using normal prompting. Notice what context, preferences, and procedural knowledge you repeatedly provide.

2. **Identify the reusable pattern**: what you provided that would help on similar future tasks. After a BigQuery analysis, that might be table names, field definitions, filtering rules ("always exclude test accounts"), and common query patterns.

3. **Ask Claude A to create the Skill**: "Create a Skill that captures this BigQuery analysis pattern we just used. Include the table schemas, naming conventions, and the rule about filtering test accounts."

   <Tip>
     Claude models understand the Skill format and structure natively. You don't need special system prompts or a "writing skills" skill to get Claude to help create Skills. Simply ask Claude to create a Skill and it will generate properly structured SKILL.md content with appropriate frontmatter and body content.
   </Tip>

4. **Review for conciseness**: check Claude A hasn't added unnecessary explanation. "Remove the explanation about what win rate means - Claude already knows that."

5. **Improve information architecture**: "Organize this so the table schema is in a separate reference file. We might add more tables later."

**Then iterate — the same loop improves new and existing Skills alike:**

Give Claude B (a fresh instance with the Skill loaded) *real* tasks, not test scenarios. Observe where it struggles, succeeds, or makes unexpected choices. Bring specifics back to Claude A: "I asked for a regional sales report and Claude B forgot to filter out test accounts, even though the Skill mentions this rule — maybe it's not prominent enough?" Claude A might suggest reorganizing to make rules prominent, using stronger language ("MUST filter" over "always filter"), or restructuring the workflow. Apply, re-test, repeat as new scenarios appear.

**Gathering team feedback:** share Skills with teammates and observe their usage. Ask: does the Skill activate when expected? Are instructions clear? What's missing? Their blind spots differ from yours.

**Why this approach works**: Claude A understands agent needs, you provide domain expertise, Claude B reveals gaps through real usage, and refinement follows observed behavior rather than assumptions.

### Observe how Claude navigates Skills

While observing Claude B above, watch specifically for:

* **Unexpected exploration paths**: Does Claude read files in an order you didn't anticipate? Your structure isn't as intuitive as you thought
* **Missed connections**: Does Claude fail to follow references to important files? Your links need to be more explicit or prominent
* **Overreliance on certain sections**: If Claude repeatedly reads the same file, that content probably belongs in the main SKILL.md
* **Ignored content**: If Claude never accesses a bundled file, it's unnecessary or poorly signaled in the main instructions

## Anti-patterns to avoid

### Avoid Windows-style paths

Always use forward slashes in file paths, even on Windows:

* ✓ **Good**: `scripts/helper.py`, `reference/guide.md`
* ✗ **Avoid**: `scripts\helper.py`, `reference\guide.md`

Unix-style paths work across all platforms, while Windows-style paths cause errors on Unix systems.

### Avoid offering too many options

Don't present multiple approaches unless necessary. Provide a default with an escape hatch:

* ✗ **Confusing**: "You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."
* ✓ **A default plus the exception**: "Use pdfplumber for text extraction. For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

## Advanced: Skills with executable code

The sections below focus on Skills that include executable scripts. If your Skill uses only markdown instructions, you can stop here.

### Solve, don't punt

In scripts, handle error conditions rather than punting to Claude.

**Good example: Handle errors explicitly**:

```python  theme={null}
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        # Create file with default content instead of failing
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        # Provide alternative instead of failing
        print(f"Cannot access {path}, using default")
        return ''
```

**Bad example: Punt to Claude**:

```python  theme={null}
def process_file(path):
    # Just fail and let Claude figure it out
    return open(path).read()
```

Justify and document configuration parameters too, to avoid "voodoo constants" (Ousterhout's law). If you don't know the right value, how will Claude?

**Good example: Self-documenting**:

```python  theme={null}
# HTTP requests typically complete within 30 seconds
# Longer timeout accounts for slow connections
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
# Most intermittent failures resolve by the second retry
MAX_RETRIES = 3
```

**Bad example: Magic numbers**:

```python  theme={null}
TIMEOUT = 47  # Why 47?
RETRIES = 5   # Why 5?
```

### Provide utility scripts

Even if Claude could write a script, pre-made scripts are more reliable than generated code, save tokens and time, and stay consistent across uses. They work alongside instruction files: forms.md references the script, and Claude executes it without loading its contents into context.

**Important distinction**: Make clear in your instructions whether Claude should:

* **Execute the script** (most common): "Run `analyze_form.py` to extract fields"
* **Read it as reference** (for complex logic): "See `analyze_form.py` for the field extraction algorithm"

Execution is preferred for most utility scripts — more reliable and more efficient. See [Runtime environment](#runtime-environment) below for how script execution works.

**Example**:

````markdown  theme={null}
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF

```bash
python scripts/analyze_form.py input.pdf > fields.json
```

Output format:
```json
{
  "field_name": {"type": "text", "x": 100, "y": 200},
  "signature": {"type": "sig", "x": 150, "y": 500}
}
```

**validate_boxes.py**: Check for overlapping bounding boxes

```bash
python scripts/validate_boxes.py fields.json
# Returns: "OK" or lists conflicts
```

**fill_form.py**: Apply field values to PDF

```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```
````

### Use visual analysis

When inputs can be rendered as images, have Claude analyze them — its vision capabilities help it understand layouts and structures:

````markdown  theme={null}
## Form layout analysis

1. Convert PDF to images: `python scripts/pdf_to_images.py form.pdf`
2. Analyze each page image to identify form fields
3. Claude sees field locations and types visually
````

<Note>
  In this example, you'd need to write the `pdf_to_images.py` script.
</Note>

### Create verifiable intermediate outputs

When Claude performs complex, open-ended tasks, it can make mistakes. The "plan-validate-execute" pattern catches errors early by having Claude first create a plan in a structured format, then validate that plan with a script before executing it.

**Example**: Imagine asking Claude to update 50 form fields in a PDF based on a spreadsheet. Without validation, Claude might reference non-existent fields, create conflicting values, miss required fields, or apply updates incorrectly.

**Solution**: Use the workflow pattern shown above (PDF form filling), but add an intermediate `changes.json` file that gets validated before applying changes. The workflow becomes: analyze → **create plan file** → **validate plan** → execute → verify.

**Why this pattern works:**

* **Catches errors early**: Validation finds problems before changes are applied
* **Machine-verifiable**: Scripts provide objective verification
* **Reversible planning**: Claude can iterate on the plan without touching originals
* **Clear debugging**: Error messages point to specific problems

**When to use**: Batch operations, destructive changes, complex validation rules, high-stakes operations.

**Implementation tip**: Make validation scripts verbose with specific error messages like "Field 'signature\_date' not found. Available fields: customer\_name, order\_total, signature\_date\_signed" to help Claude fix issues.

### Package dependencies

Skills run in the code execution environment with platform-specific limitations:

* **claude.ai**: Can install packages from npm and PyPI and pull from GitHub repositories
* **Anthropic API**: Has no network access and no runtime package installation

List required packages in your SKILL.md and verify they're available in the [code execution tool documentation](/en/docs/agents-and-tools/tool-use/code-execution-tool). Never assume a package is installed: write "Install required package: `pip install pypdf`" followed by the usage, not "Use the pdf library to process the file."

### Runtime environment

Skills run in a code execution environment with filesystem access, bash commands, and code execution capabilities. For the conceptual explanation of this architecture, see [The Skills architecture](/en/docs/agents-and-tools/agent-skills/overview#the-skills-architecture) in the overview.

**How Claude accesses Skills:**

1. **Metadata pre-loaded**: At startup, the name and description from all Skills' YAML frontmatter are loaded into the system prompt
2. **Files read on-demand**: Claude uses bash Read tools to access SKILL.md and other files from the filesystem when needed
3. **Scripts executed efficiently**: Utility scripts can be executed via bash without loading their full contents into context. Only the script's output consumes tokens
4. **No context penalty for large files**: Reference files, data, or documentation don't consume context tokens until actually read — bundle complete API docs, extensive examples, and large datasets freely

**How this affects your authoring:** Claude navigates your skill directory like a filesystem, so name files by content (`form_validation_rules.md`, not `doc2.md`) and organize by domain or feature (see Pattern 2 above). Test that Claude can navigate your structure using real requests.

Taking the domain-organized `bigquery-skill/` layout above: when the user asks about revenue, Claude reads SKILL.md, sees the reference to `reference/finance.md`, and invokes bash to read just that file. sales.md and product.md stay on the filesystem at zero context cost until needed. This filesystem-based model is what enables progressive disclosure.

For complete details on the technical architecture, see [How Skills work](/en/docs/agents-and-tools/agent-skills/overview#how-skills-work) in the Skills overview.

### MCP tool references

If your Skill uses MCP (Model Context Protocol) tools, always use fully qualified tool names to avoid "tool not found" errors.

**Format**: `ServerName:tool_name` — the server name, then the tool within it.

```markdown  theme={null}
Use the BigQuery:bigquery_schema tool to retrieve table schemas.
Use the GitHub:create_issue tool to create issues.
```

Without the server prefix, Claude may fail to locate the tool, especially when multiple MCP servers are available.
