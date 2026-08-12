import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const skill = () => read('skills/diagnosing-performance/SKILL.md');
const catalog = () => read('skills/diagnosing-performance/bottleneck-catalog.md');
const playbook = () => read('skills/diagnosing-performance/measurement-playbook.md');

test('diagnosing-performance declares frontmatter that names its trigger', () => {
  const body = skill();

  assert.match(body, /^---\nname: diagnosing-performance\ndescription: Use when something is slow/);
  assert.match(body, /before proposing any optimization, cache, index, or parallelism\.\n---/);
});

test('diagnosing-performance states the two-number law verbatim', () => {
  assert.match(skill(), /NO PERFORMANCE CHANGE WITHOUT A BEFORE NUMBER AND AN AFTER NUMBER/);
});

test('diagnosing-performance permits a code-read hypothesis but never a code-read proof', () => {
  const body = skill();

  assert.match(body, /Reading code is legitimate evidence for a hypothesis/);
  assert.match(body, /Reading code is never evidence that the fix worked/);
  assert.match(body, /A change you cannot prove is a change you must revert/);
});

test('diagnosing-performance carries the four phases in order', () => {
  const body = skill();
  const phases = [
    '### Phase 1: Establish the Baseline',
    '### Phase 2: Locate the Cost',
    '### Phase 3: Name the Cause',
    '### Phase 4: Fix and Prove',
  ];

  let cursor = -1;
  for (const heading of phases) {
    const at = body.indexOf(heading);
    assert.ok(at > cursor, `${heading} missing or out of order`);
    cursor = at;
  }
});

test('diagnosing-performance counters the four standard optimization reflexes', () => {
  const body = skill();

  assert.match(body, /\| "Let me add a cache" \|/);
  assert.match(body, /\| "It just needs an index" \|/);
  assert.match(body, /\| "Let me parallelize it" \|/);
  assert.match(body, /\| "It's faster on my machine now" \| One run is noise/);
});

test('diagnosing-performance red flag table is deep enough to bind under pressure', () => {
  const body = skill();
  const table = body.slice(body.indexOf('## Red Flags'), body.indexOf('## Quick Reference'));
  const rows = table.split('\n').filter((line) => /^\| .+ \| .+ \|$/.test(line));

  assert.ok(rows.length >= 12, `expected at least 12 red-flag rows, found ${rows.length}`);
});

test('diagnosing-performance requires a recorded baseline and an identical re-measurement', () => {
  const body = skill();

  assert.match(body, /Discard the first run/);
  assert.match(body, /Report p95, not the mean/);
  assert.match(body, /Same workload, same data volume, same warm-up, same number of runs, same metric/);
  assert.match(body, /A baseline you remember is a baseline you will misremember in your favor/);
});

test('diagnosing-performance caps failed fixes and routes structural cost to architecture', () => {
  const body = skill();

  assert.match(body, /Do not attempt fix #4/);
  assert.match(body, /razorback:architecture-quality/);
});

test('diagnosing-performance excludes itself from the quick-fix tier', () => {
  assert.match(skill(), /A performance change is not quick-fix tier/);
});

test('diagnosing-performance prefers count guards over wall-clock guards', () => {
  const body = skill();

  assert.match(body, /Prefer a count assertion/);
  assert.match(body, /A timing assertion only as a last resort/);
  assert.match(body, /flaky guard gets deleted within a month/);
});

test('bottleneck catalog covers every layer the design named', () => {
  const body = catalog();
  const layers = [
    '## 1. Database and Data Access',
    '## 2. Async, Concurrency, and Parallelism',
    '## 3. Network and Service Boundaries',
    '## 4. Algorithms and Data Structures',
    '## 5. Memory and Allocation',
    '## 6. Caching',
    '## 7. Startup, Build, and Test Suite',
    '## 8. Client and Rendering',
  ];

  for (const layer of layers) {
    assert.match(body, new RegExp(layer.replace(/[.,]/g, '\\$&')), `missing catalog layer: ${layer}`);
  }
});

test('bottleneck catalog names the causes the user asked for by name', () => {
  const body = catalog();

  assert.match(body, /\*\*N\+1\*\*/);
  assert.match(body, /\*\*Sequential awaits in a loop\*\*/);
  assert.match(body, /\*\*Unbounded fan-out\*\*/);
  assert.match(body, /\*\*Sync-over-async\*\*/);
  assert.match(body, /\*\*Thread-pool or event-loop starvation\*\*/);
  assert.match(body, /\*\*Deep `OFFSET` paging\*\*/);
  assert.match(body, /\*\*Unusable index\*\*/);
  assert.match(body, /\*\*Cartesian join\*\*/);
});

test('every bottleneck catalog row carries a confirmation step', () => {
  const body = catalog();
  const rows = body
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*-+/.test(line) && !/^\| Symptom \|/.test(line));

  assert.ok(rows.length >= 60, `expected at least 60 catalog rows, found ${rows.length}`);
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1);
    assert.equal(cells.length, 4, `catalog row is not symptom/cause/confirm/fix: ${row}`);
    assert.ok(cells[2].trim().length > 0, `catalog row has no confirmation step: ${row}`);
  }
});

test('bottleneck catalog refuses to force an unmatched measurement into a row', () => {
  assert.match(catalog(), /## Not in the Catalog/);
});

test('measurement playbook fixes the workload and prefers counts to timings', () => {
  const body = playbook();

  assert.match(body, /## Workload Rules/);
  assert.match(body, /## Counting Beats Timing/);
  assert.match(body, /A measurement is a comparison/);
  assert.match(body, /fixed request rate/);
});

test('measurement playbook names concrete tools per stack', () => {
  const body = playbook();

  for (const tool of ['EXPLAIN (ANALYZE, BUFFERS)', 'dotnet-counters', 'py-spy', 'async-profiler', 'pprof', 'hyperfine']) {
    assert.ok(body.includes(tool), `playbook does not name ${tool}`);
  }
});

test('measurement playbook ranks regression guards by flakiness', () => {
  const body = playbook();

  assert.match(body, /## Guarding the Fix/);
  assert.match(body, /A count assertion/);
  assert.match(body, /A wall-clock threshold, last/);
  assert.match(body, /razorback:test-driven-development/);
});

test('systematic-debugging routes slowness out to diagnosing-performance', () => {
  const body = read('skills/systematic-debugging/SKILL.md');

  assert.match(body, /razorback:diagnosing-performance/);
  assert.match(body, /the output is right but late/);
  assert.doesNotMatch(body.slice(body.indexOf('## When to Use'), body.indexOf('### Phase 1')), /^- Performance problems$/m);
});

test('diagnosing-performance cross-references only skills that exist', () => {
  const skills = new Set(
    readdirSync(join(root, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  for (const body of [skill(), catalog(), playbook()]) {
    assert.doesNotMatch(body, /superpowers:/);

    const referenced = [...body.matchAll(/razorback:([a-z-]+)/g)].map((match) => match[1]);
    assert.ok(referenced.length > 0, 'expected at least one razorback: cross-reference');
    for (const name of referenced) {
      assert.ok(skills.has(name), `razorback:${name} does not name a skill directory`);
    }
  }
});

test('diagnosing-performance supporting files resolve on disk', () => {
  const body = skill();

  for (const path of ['bottleneck-catalog.md', 'measurement-playbook.md']) {
    assert.ok(body.includes(path), `SKILL.md does not point at ${path}`);
    assert.doesNotThrow(() => read(join('skills/diagnosing-performance', path)));
  }

  const crossSkillLink = '../systematic-debugging/condition-based-waiting.md';
  assert.ok(catalog().includes(crossSkillLink));
  assert.doesNotThrow(() => read('skills/systematic-debugging/condition-based-waiting.md'));
});
