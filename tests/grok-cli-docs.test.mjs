import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function grokModelsLines(text) {
  return text
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text: line }) => /\bgrok models\b/.test(line));
}

test('grok models lines that swallow stderr are the false-logout recipe', () => {
  const drifted = [
    'grok models 2>/dev/null',
    '| Pre-flight / auth check | any | `grok models 2>/dev/null` (prints login state + model list) |',
  ].join('\n');
  assert.deepEqual(
    grokModelsLines(drifted).filter(({ text }) => /2>\s*\/dev\/null/.test(text)),
    [
      { line: 1, text: 'grok models 2>/dev/null' },
      {
        line: 2,
        text: '| Pre-flight / auth check | any | `grok models 2>/dev/null` (prints login state + model list) |',
      },
    ],
  );
  assert.equal(
    grokModelsLines('grok models\n# You are logged in with grok.com.').filter(({ text }) =>
      /2>\s*\/dev\/null/.test(text),
    ).length,
    0,
  );
});

test('grok-cli never runs grok models with stderr discarded', () => {
  const skill = read('skills/grok-cli/SKILL.md');
  assert.deepEqual(
    grokModelsLines(skill).filter(({ text }) => /2>\s*\/dev\/null/.test(text)),
    [],
    'grok models 2>/dev/null hides command-not-found and network errors, then the skill treats empty output as logout',
  );
});

test('grok-cli does not treat a failed grok models probe as logout', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.doesNotMatch(
    skill,
    /If it errors or prints nothing, the user is not logged in/,
  );
  assert.doesNotMatch(
    skill,
    /prints `You are logged in with grok\.com\.` plus the model list when authed, and\s+errors when not/,
  );
  assert.doesNotMatch(
    skill,
    /`grok models` errors or prints no model list/,
  );
});

test('grok-cli classifies grok models by the login line, not exit status or a model list', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.match(skill, /You are logged in with grok\.com\./);
  assert.match(skill, /You are not authenticated\./);
  assert.match(skill, /always prints a model list/i);
  assert.match(skill, /exits 0/i);
});

test('grok-cli tells the user to grok login only when auth.json is actually missing', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.match(skill, /~\/\.grok\/auth\.json/);
  assert.match(
    skill,
    /You are not authenticated\.[\s\S]*auth\.json[\s\S]*grok login/,
  );
  assert.match(
    skill,
    /auth\.json[\s\S]*exists[\s\S]*[Dd]o \*\*not\*\* run `grok login`/,
  );
  assert.match(
    skill,
    /command not found[\s\S]*[Dd]o \*\*not\*\* run `grok login`/,
  );
  assert.match(
    skill,
    /timeout[\s\S]*[Dd]o \*\*not\*\* run `grok login`/,
  );
  assert.match(skill, /~\/\.local\/bin/);
  assert.match(skill, /~\/\.grok\/bin/);
});

test('grok-cli headless invocations preserve stderr for startup diagnostics', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.doesNotMatch(
    skill,
    /2>\s*\/dev\/null/,
    'headless Grok recipes must leave stderr available for banners and startup failures',
  );
  assert.match(
    skill,
    /Grok 1\.0\.13 puts banners and startup failures on stderr[\s\S]*stdout\/?JSON remains clean[\s\S]*stderr must remain available/i,
  );
});

test('grok-cli documents the Grok 1.0.13 built-in sandbox profiles', () => {
  const skill = read('skills/grok-cli/SKILL.md');
  const normalized = skill.replace(/\s+/g, ' ');

  assert.match(
    normalized,
    /built-in profiles are `off`, `workspace`, `devbox`, `read-only`, and `strict`\./i,
  );
  assert.match(
    normalized,
    /There is no built-in `none` or `danger-full-access` profile\./,
  );
});

test('grok-cli classifies sandbox startup failures and requires a new approved fallback campaign', () => {
  const skill = read('skills/grok-cli/SKILL.md');
  const normalized = skill.replace(/\s+/g, ' ');

  for (const pattern of [
    /sandbox profile resolve failed/i,
    /runtime-socket/i,
    /\/run\/podman\/podman\.sock/i,
    /other runtime sockets/i,
    /denied paths unprotected/i,
    /missing or unusable `?bwrap`?/i,
    /pre-session host\/sandbox failure/i,
    /not a model crash/i,
    /not `permission_cancelled`/i,
    /failed CLI call consumes the campaign invocation/i,
    /do not auto-retry in the same review campaign/i,
    /new explicit user-approved campaign/i,
    /`--sandbox off`/i,
    /kernel filesystem and child-network enforcement are disabled/i,
    /read-only tool allowlist/i,
    /`--tools "Read,Grep,Glob"`/i,
  ]) {
    assert.match(normalized, pattern);
  }
});

test('grok code review transports large bundles through the shared artifact contract', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.match(skill, /complete redacted bundle/i);
  assert.match(skill, /prepare-review-artifact/);
  assert.match(skill, /payload over 128 KiB/i);
  assert.match(skill, /prompt-file.*prompt transport.*review-artifact|review-artifact.*prompt-file.*prompt transport/is);
  assert.match(skill, /validate-review-output\s+RESULT_FILE/i);
  assert.match(skill, /review_completed/);
  assert.match(skill, /tool use.*not.*completion|completion.*not.*tool use/is);
  assert.doesNotMatch(skill, /--no-plan/);
});

test('grok validation failure reaches the bounded continuation branch', () => {
  const skill = read('skills/grok-cli/SKILL.md');
  const codeReview = skill.slice(
    skill.indexOf('### Code Review (read-only)'),
    skill.indexOf('### Standalone Review Completion'),
  );
  const validation = codeReview.indexOf('validate-review-output" "$RESULT_FILE"');
  const continuation = codeReview.indexOf('grok -c --prompt-file');

  assert.ok(validation >= 0, 'code review must validate the first result');
  assert.ok(continuation > validation, 'validation failure must branch to continuation');
  assert.match(
    codeReview,
    /if[\s\S]*validate-review-output" "\$RESULT_FILE"[\s\S]*else[\s\S]*if \[ "\$SESSION_CREATED" != true \][\s\S]*exit 1[\s\S]*fi[\s\S]*grok -c --prompt-file/,
  );
});

test('grok status variables reset immediately before each invocation', () => {
  const skill = read('skills/grok-cli/SKILL.md');
  const codeReview = skill.slice(
    skill.indexOf('### Code Review (read-only)'),
    skill.indexOf('### Standalone Review Completion'),
  );

  assert.match(codeReview, /GROK_STATUS=0\s+grok --prompt-file/);
  assert.match(codeReview, /CONTINUATION_STATUS=0\s+grok -c --prompt-file/);
});

test('grok continuation is one same-session completion attempt', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.match(skill, /external_invocation_budget.*2/i);
  assert.match(skill, /first.*failed completion validation/i);
  assert.match(skill, /same current-directory session/i);
  assert.match(skill, /grok -c --prompt-file/);
  assert.match(skill, /omit[s]? `--sandbox`|without `--sandbox`/i);
  assert.match(skill, /no third call|third invocation/i);
  assert.match(skill, /not a fresh sweep|not.*post-fix/i);
});

test('grok sandbox fallback does not use inspect as a capability probe', () => {
  const skill = read('skills/grok-cli/SKILL.md');

  assert.match(skill, /sandbox startup failure.*no session.*continuation/is);
  assert.match(skill, /`grok inspect`.*not.*sandbox.*probe/is);
  assert.match(skill, /new.*campaign.*`--sandbox off`/is);
});
