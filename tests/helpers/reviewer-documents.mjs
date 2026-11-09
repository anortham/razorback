/** The skills that run an external reviewer CLI. */
export const REVIEWER_CLI_SKILLS = [
  'skills/claude-cli/SKILL.md',
  'skills/codex-cli/SKILL.md',
  'skills/grok-cli/SKILL.md',
  'skills/agy-cli/SKILL.md',
];

/** The reviewer prompts that pre-merge-review dispatches. */
export const PRE_MERGE_REVIEWER_PROMPTS = [
  'skills/pre-merge-review/reviewer-prompts/claude.md',
  'skills/pre-merge-review/reviewer-prompts/codex.md',
];

/** Every document that tells a reviewer how to run: the CLI skills, pre-merge-review, and its prompts. */
export const REVIEWER_DOCUMENTS = [
  ...REVIEWER_CLI_SKILLS,
  'skills/pre-merge-review/SKILL.md',
  ...PRE_MERGE_REVIEWER_PROMPTS,
];
