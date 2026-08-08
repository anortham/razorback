import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const REFERENCE = 'skills/using-razorback/references/source-control-hygiene.md';

test('the source-control hygiene reference defines both checks and the provenance rule', () => {
  const reference = read(REFERENCE);

  assert.match(reference, /## Check A — Inventory before you create/);
  assert.match(reference, /## Check B — Reconcile before you claim done/);
  assert.match(reference, /git worktree list/);
  assert.match(reference, /git log --oneline <base>\.\.<branch>/);
  assert.match(reference, /## Provenance/);
  assert.match(reference, /## Anti-rationalization/);
});

test('provenance covers every location using-git-worktrees actually creates', () => {
  const reference = read(REFERENCE);
  const worktrees = read('skills/using-git-worktrees/SKILL.md');
  const finishing = read('skills/finishing-a-development-branch/SKILL.md');

  for (const location of ['`.worktrees/`', '`worktrees/`', '`~/.config/razorback/worktrees/']) {
    assert.ok(
      reference.includes(location),
      `${REFERENCE} omits the razorback-managed location ${location} from its provenance rule`,
    );
    assert.ok(
      finishing.includes(location),
      `skills/finishing-a-development-branch/SKILL.md omits ${location} from its provenance rule — cleanup silently no-ops for worktrees razorback itself created`,
    );
  }

  assert.ok(
    worktrees.includes('.worktrees/') && worktrees.includes('~/.config/razorback/worktrees/'),
    'skills/using-git-worktrees/SKILL.md no longer documents the locations the provenance rule depends on',
  );

  assert.doesNotMatch(
    finishing,
    /\.claude\/worktrees\//,
    'skills/finishing-a-development-branch/SKILL.md gates worktree cleanup on `.claude/worktrees/`, a path using-git-worktrees never creates',
  );
});

test('worktree creation inventories outstanding worktrees and branches first', () => {
  const skill = read('skills/using-git-worktrees/SKILL.md');

  assert.match(skill, /## Step 0b: Inventory Existing Worktrees and Branches/);
  assert.match(skill, /source-control-hygiene\.md/);
  assert.match(skill, /git branch --no-merged/);
  assert.match(skill, /continuation/i);
  assert.match(skill, /Report what you found before creating anything/i);
});

test('inventory obliges disclosure without blocking worktree creation', () => {
  const skill = read('skills/using-git-worktrees/SKILL.md');

  assert.match(
    skill,
    /does \*\*not\*\* block worktree creation/i,
    'Step 0b must stay a disclosure rule — turning stranded work into a hard stop breaks autonomous execution',
  );
  assert.match(skill, /not a blocker-taxonomy stop/i);
  assert.match(skill, /Create a worktree silently beside another worktree/);
});

test('both execution skills reconcile source-control state before finishing', () => {
  for (const file of ['skills/executing-plans/SKILL.md', 'skills/subagent-driven-development/SKILL.md']) {
    const skill = read(file);
    assert.ok(
      skill.includes('source-control-hygiene.md'),
      `${file} never references the source-control hygiene checks`,
    );
    assert.match(
      skill,
      /Reconcile source-control state/i,
      `${file} hands off to the finish skill without reconciling worktree and branch state`,
    );
  }
});

test('autonomous finish reconciles state and never removes a worktree', () => {
  const skill = read('skills/finishing-a-development-branch/SKILL.md');

  assert.match(skill, /### Step 2a: Reconcile source-control state/);
  assert.match(skill, /Stranded/);
  assert.match(skill, /Never report `Complete` with unaccounted source-control state/);
  assert.match(skill, /Never remove a worktree in Autonomous Mode/);
});

test('the morning report carries a source control section', () => {
  const template = read('skills/finishing-a-development-branch/morning-report-template.md');

  assert.match(template, /## Source control/);
  for (const placeholder of ['{{outstanding_work_summary}}', '{{worktrees_retained}}']) {
    assert.ok(
      template.includes(placeholder),
      `morning-report-template.md lost the ${placeholder} placeholder — restore it so stranded work reaches the morning report`,
    );
  }
});

test('completion claims require source-control evidence', () => {
  const skill = read('skills/verification-before-completion/SKILL.md');

  assert.match(skill, /\| Work is integrated \|/);
  assert.match(skill, /\| Nothing is stranded \|/);
  assert.match(skill, /source-control-hygiene\.md/);
  assert.match(skill, /inventory, not a cleanliness check/i);
});
