import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SDD = 'skills/subagent-driven-development/SKILL.md';
const PLANS = 'skills/executing-plans/SKILL.md';

// subagent-driven-development and executing-plans are alternative-load skills: a run
// loads one or the other, never both. That makes their shared sections invisible to
// each other, and they have drifted apart before. These three sections are deliberate
// near-twins, so every line that differs must be a listed, named divergence.
const TWINS = [
  {
    heading: '## Blockers',
    divergences: [
      {
        name: 'executing-plans spells out the reason-your-way-forward bias rule; SDD leaves it to the taxonomy',
        plans: /^- A blocker is real only when you cannot reason your way to a plan-consistent path forward\.$/,
      },
      {
        name: 'closing line: executing-plans adds "If a reasonable path exists, take it."',
        sdd: /^Anything else: pick the plan-consistent option, note the choice in your report, continue\. Full definitions in the taxonomy\.$/,
        plans: /^Anything else: pick the plan-consistent option, note the choice in your report, continue\. If a reasonable path exists, take it\. Full definitions in the taxonomy\.$/,
      },
    ],
    invariants: [
      { name: 'points at the authoritative taxonomy', match: /blocker-taxonomy\.md/ },
      { name: 'press-on-and-flag bias rule', match: /When in doubt, press on and flag/ },
      { name: 'no silently swallowed judgment calls', match: /Never silently swallow a judgment call/ },
      { name: 'blocker #1 credentials', match: /Credentials \/ auth \/ env broken/ },
      { name: 'blocker #2 destructive action', match: /Destructive action not authorized by the plan/ },
      { name: 'blocker #3 plan-contradicting data', match: /Plan-contradicting data/ },
      { name: 'blocker #4 safety-critical ambiguity', match: /Safety-critical ambiguity/ },
      { name: 'blocker #5 unresolvable test failures', match: /Unresolvable test failures/ },
      { name: 'everything else is decide-and-note', match: /Anything else: pick the plan-consistent option/ },
    ],
  },
  {
    heading: '## Recovery',
    divergences: [
      {
        name: 'SDD scopes the sequence in its lead-in; executing-plans scopes it in a standalone paragraph plus a separate lead-in',
        sdd: /^On detecting a resumed run \(post-compaction note, .*\), the lead follows this fixed orientation sequence before continuing:$/,
        plans: /^This sequence runs \*\*only on a resumed run\*\* — a post-compaction note, .* skip it and keep going\.$/,
      },
      {
        name: 'executing-plans lead-in sentence for the numbered steps',
        plans: /^On a resumed run, orient before continuing:$/,
      },
      {
        name: 'SDD-only step 7: reconcile parallel-lead-commit gaps (executing-plans is single-agent, so it has no lead-commit crash window)',
        sdd: /^7\. Reconcile `parallel-lead-commit` gaps: .* Do not trust a completion record that has no verifiable commit\.$/,
      },
      {
        name: 'final step renumbered by SDD’s extra step 7 (SDD 8 vs executing-plans 7)',
        sdd: /^8\. Identify the next incomplete task and resume execution\.$/,
        plans: /^7\. Identify the next incomplete task and resume execution\.$/,
      },
      {
        name: 'SDD-only trailer: fresh runs enter at Step 1, and prior-session subagent IDs die at compaction',
        sdd: /^This sequence runs only on resumed runs\. .* treat any needed fix as a fresh dispatch with prior-commit context\.$/,
      },
    ],
    invariants: [
      { name: 'sequence is scoped to resumed runs only', match: /only on a resumed run|only on resumed runs/i },
      { name: 'step 1 goldfish:recall', match: /`goldfish:recall` — retrieve the active brief and recent checkpoints\./ },
      { name: 'step 2 read plan checkboxes', match: /Read the plan file, noting which acceptance-criteria checkboxes are already `\[x\]`\./ },
      { name: 'step 3 check the TaskList', match: /Check the TaskList for completed \/ in-progress \/ pending tasks\./ },
      { name: 'step 4 verify against git log', match: /`git log --oneline <base>\.\.HEAD` — verify what is actually committed\./ },
      { name: 'final step resumes at the next incomplete task', match: /Identify the next incomplete task and resume execution\./ },
    ],
  },
  {
    // This pair shares no verbatim lines — both sides state the same rules in their own
    // prose. The line compare therefore proves nothing here and the invariant layer below
    // is the real guard: reword freely, but a dropped rule must fail.
    heading: '## Checkpoints',
    divergences: [
      {
        name: 'SDD enumerates four fixed checkpoint moments; executing-plans checkpoints per phase or every few tasks',
        sdd: /^The lead writes a `goldfish:checkpoint` at four points during the run\. .*$/,
        plans: /^Write a `goldfish:checkpoint` at phase boundaries \(or, for a flat task list, every few completed tasks\) .*$/,
      },
      {
        name: 'SDD-only checkpoint moment 1: phase boundary',
        sdd: /^1\. \*\*Phase boundary\*\* — after each phase of a multi-phase plan: .*$/,
      },
      {
        name: 'SDD-only checkpoint moment 2: pre-review (SDD has Step 4a; executing-plans has no subagent review phase)',
        sdd: /^2\. \*\*Pre-review\*\* — before Step 4a begins .*$/,
      },
      {
        name: 'SDD-only checkpoint moment 3: post-review',
        sdd: /^3\. \*\*Post-review\*\* — after Step 4a completes: .*$/,
      },
      {
        name: 'SDD-only checkpoint moment 4: post-PR',
        sdd: /^4\. \*\*Post-PR\*\* — after `finishing-a-development-branch` creates the PR: final state\.$/,
      },
      {
        name: 'granularity rule: SDD states it standalone (adds "not per subagent dispatch"); executing-plans folds it into the non-blocking paragraph',
        sdd: /^Checkpoint at phase granularity, not per task or per subagent dispatch\. .*$/,
      },
      {
        name: 'non-blocking rule phrased per skill (SDD "never a stop"; executing-plans "It is **not** a stop" plus the folded-in granularity rule)',
        sdd: /^A checkpoint is a fast, non-blocking memory write — never a stop, .*$/,
        plans: /^A checkpoint is a fast, non-blocking memory write\. It is \*\*not\*\* a stop, .*$/,
      },
    ],
    invariants: [
      { name: 'uses goldfish:checkpoint', match: /`goldfish:checkpoint`/ },
      { name: 'survives auto-compaction and session restarts', match: /auto-compaction and session restarts/ },
      { name: 'a checkpoint is a fast, non-blocking memory write', match: /A checkpoint is a fast, non-blocking memory write/ },
      { name: 'never a stop, a gate, or a reason to ask the user', match: /a stop, a review gate, or a reason to ask the user anything/ },
      { name: 'a phase boundary is a trigger, not a stop', match: /A phase boundary is a checkpoint trigger, not a stop: finishing a phase never means pausing for confirmation\./ },
      { name: 'write it and continue immediately', match: /immediately continue/ },
      { name: 'per-task checkpoints are noise', match: /per-task checkpoints are noise/i },
    ],
  },
];

function extractSection(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const next = lines[i].match(/^(#+)\s/);
    if (next && next[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines
    .slice(start + 1, end)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line !== '');
}

// Returns everything a reviewer needs to judge the pair: divergent lines nobody claimed
// (new drift) and allowlist entries that no longer match (a rotting allowlist).
function compareTwin(sddLines, plansLines, divergences) {
  const inPlans = new Set(plansLines);
  const inSdd = new Set(sddLines);
  const onlyInSdd = sddLines.filter((line) => !inPlans.has(line));
  const onlyInPlans = plansLines.filter((line) => !inSdd.has(line));

  const claims = (line, side) => divergences.some((d) => d[side]?.test(line));

  return {
    unclaimedInSdd: onlyInSdd.filter((line) => !claims(line, 'sdd')),
    unclaimedInPlans: onlyInPlans.filter((line) => !claims(line, 'plans')),
    stale: divergences
      .filter(
        (d) =>
          (d.sdd && !onlyInSdd.some((line) => d.sdd.test(line))) ||
          (d.plans && !onlyInPlans.some((line) => d.plans.test(line)))
      )
      .map((d) => d.name),
  };
}

const sddText = readFileSync(join(root, SDD), 'utf8');
const plansText = readFileSync(join(root, PLANS), 'utf8');

for (const twin of TWINS) {
  test(`${twin.heading} stays a twin across both execution skills`, () => {
    const result = compareTwin(
      extractSection(sddText, twin.heading),
      extractSection(plansText, twin.heading),
      twin.divergences
    );

    assert.deepEqual(
      result.unclaimedInSdd,
      [],
      `${SDD} ${twin.heading} drifted. Mirror the change in ${PLANS}, or add a named divergence to TWINS.`
    );
    assert.deepEqual(
      result.unclaimedInPlans,
      [],
      `${PLANS} ${twin.heading} drifted. Mirror the change in ${SDD}, or add a named divergence to TWINS.`
    );
    assert.deepEqual(
      result.stale,
      [],
      `Allowlisted divergences for ${twin.heading} no longer match anything — the sections converged, so delete these entries.`
    );
  });

  // The line compare only proves the text matches. These assert the rules themselves are
  // present on both sides, which is the whole guard for a pair that shares no verbatim lines.
  test(`${twin.heading} keeps its shared rules in both execution skills`, () => {
    const sections = { [SDD]: extractSection(sddText, twin.heading).join('\n'), [PLANS]: extractSection(plansText, twin.heading).join('\n') };

    for (const [file, section] of Object.entries(sections)) {
      for (const invariant of twin.invariants) {
        assert.match(section, invariant.match, `${file} ${twin.heading} lost rule invariant: ${invariant.name}`);
      }
    }
  });
}

test('a divergence nobody allowlisted is reported against the side that drifted', () => {
  const result = compareTwin(
    ['shared rule', 'known SDD extra', 'sneaky new SDD line'],
    ['shared rule', 'sneaky new plans line'],
    [{ name: 'known SDD extra', sdd: /^known SDD extra$/ }]
  );

  assert.deepEqual(result.unclaimedInSdd, ['sneaky new SDD line']);
  assert.deepEqual(result.unclaimedInPlans, ['sneaky new plans line']);
  assert.deepEqual(result.stale, []);
});

test('an allowlist entry that matches nothing is reported as stale', () => {
  const result = compareTwin(
    ['shared rule'],
    ['shared rule'],
    [{ name: 'divergence that was since reconciled', sdd: /^gone$/ }]
  );

  assert.deepEqual(result.stale, ['divergence that was since reconciled']);
});

test('twin sections are compared with whitespace normalized, not byte-for-byte', () => {
  const section = extractSection('## H\n\n-   a   rule\n    wrapped   oddly\n\n## Next\n', '## H');

  assert.deepEqual(section, ['- a rule', 'wrapped oddly']);
});
