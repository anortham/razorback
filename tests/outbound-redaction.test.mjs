import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const script = join(root, 'skills/security-review/scripts/redact-outbound');
const privateKeyBegin = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
const privateKeyEnd = ['-----END ', 'PRIVATE KEY-----'].join('');
const credentialAuthority = ['alice:', 'correct-horse-battery-staple'].join('');
const providerTokens = [
  ['ghp_', 'A'.repeat(36)],
  ['glpat-', 'B'.repeat(24)],
  ['xoxb-', '000000000000-000000000000-' + 'C'.repeat(24)],
  ['sk-proj-', 'D'.repeat(36)],
  ['sk-ant-api03-', 'E'.repeat(36)],
  ['AKIA', '0000000000000000'],
].map(([prefix, value]) => prefix + value);

function runRedactor(input, environment = {}) {
  return spawnSync(script, {
    cwd: root,
    env: { ...process.env, ...environment },
    input,
    encoding: 'utf8',
  });
}

const CASES = [
  {
    name: 'empty input is unchanged',
    input: '',
    expected: '',
    environment: {},
    secrets: [],
    mutation: 'Returning a placeholder for empty input would change an otherwise valid payload.',
  },
  {
    name: 'ordinary lookalikes remain unchanged',
    input: 'tokenized keyboard monkey monkey=value sk-short ghp_public xoxb-short AKIA123 TOKENIZER=public not_a_marker=value',
    expected: 'tokenized keyboard monkey monkey=value sk-short ghp_public xoxb-short AKIA123 TOKENIZER=public not_a_marker=value',
    environment: {},
    secrets: [],
    mutation: 'Using unbounded marker matching would redact benign words and non-sensitive assignments.',
  },
  {
    name: 'trailing newlines and other payload bytes are preserved',
    input: 'review body\n',
    expected: 'review body\n',
    environment: {},
    secrets: [],
    mutation: 'Trimming stdin before replacement would change the payload shape sent to the provider.',
  },
  {
    name: 'sensitive environment values are replaced at every occurrence',
    input: 'first env-secret-value-123 second env-api-token-value-456 third env-key-value-789 fourth env-password-value-012 fifth env-credential-value-345 sixth env-connection-string-value-678 seventh env-secret-value-123',
    expected: 'first <REDACTED> second <REDACTED> third <REDACTED> fourth <REDACTED> fifth <REDACTED> sixth <REDACTED> seventh <REDACTED>',
    environment: {
      RAZORBACK_TEST_SECRET: 'env-secret-value-123',
      RAZORBACK_TEST_API_TOKEN: 'env-api-token-value-456',
      RAZORBACK_TEST_KEY: 'env-key-value-789',
      RAZORBACK_TEST_PASSWORD: 'env-password-value-012',
      RAZORBACK_TEST_CREDENTIAL: 'env-credential-value-345',
      RAZORBACK_TEST_CONNECTION_STRING: 'env-connection-string-value-678',
    },
    secrets: ['env-secret-value-123', 'env-api-token-value-456'],
    mutation: 'Replacing only the first occurrence or ignoring environment-derived values would leak a later match.',
  },
  {
    name: 'short sensitive environment values fail closed when present',
    input: 'example text x line 1',
    expected: null,
    status: 1,
    environment: { API_KEY: 'x' },
    secrets: ['x'],
    mutation: 'Replacing a short environment value globally would corrupt benign payload text instead of failing closed.',
  },
  {
    name: 'short sensitive environment values absent from the payload are ignored',
    input: 'safe review body',
    expected: 'safe review body',
    environment: { API_KEY: 'x' },
    secrets: [],
    mutation: 'Failing on an absent short environment value would block a safe dispatch unnecessarily.',
  },
  {
    name: 'unterminated quoted sensitive assignments fail closed',
    input: 'api_key="unterminated-secret',
    expected: null,
    status: 1,
    environment: {},
    secrets: ['unterminated-secret'],
    mutation: 'Accepting an unterminated quoted assignment would forward its credential value unchanged.',
  },
  {
    name: 'benign unmatched quotes remain unchanged',
    input: 'description="unterminated',
    expected: 'description="unterminated',
    environment: {},
    secrets: [],
    mutation: 'Treating every unmatched quote as sensitive would alter harmless prose instead of protecting credentials.',
  },
  {
    name: 'private key blocks are replaced as one value',
    input: `before\n${privateKeyBegin}\nbase64-material\n${privateKeyEnd}\nafter`,
    expected: 'before\n<REDACTED>\nafter',
    environment: {},
    secrets: ['base64-material'],
    mutation: 'Matching only a key line would leave private-key material or delimiters in the outbound payload.',
  },
  {
    name: 'unterminated private key input fails closed',
    input: `prefix\n${privateKeyBegin}\ntruncated-material`,
    expected: null,
    status: 1,
    environment: {},
    secrets: ['truncated-material'],
    mutation: 'Sending a malformed private-key block would leak possible key material instead of stopping the dispatch.',
  },
  {
    name: 'common provider token formats are replaced',
    input: providerTokens.join(' '),
    expected: '<REDACTED> <REDACTED> <REDACTED> <REDACTED> <REDACTED> <REDACTED>',
    environment: {},
    secrets: [
      ...providerTokens,
    ],
    mutation: 'Removing one provider pattern would leave that provider token visible while the other formats still pass.',
  },
  {
    name: 'credential-bearing URL authority is replaced while the host remains',
    input: `Connect at https://${credentialAuthority}@example.com/path?q=1`,
    expected: 'Connect at https://<REDACTED>@example.com/path?q=1',
    environment: {},
    secrets: [credentialAuthority],
    mutation: 'Redacting only the password or the entire URL would either leak the authority or destroy useful routing context.',
  },
  {
    name: 'common assignment forms preserve their keys and separators',
    input: 'API_TOKEN = "quoted value with spaces"\npassword: single-value\nclient_secret => \'another-value\'\nKEY: raw-key-value\n{"apiKey":"json-value", "client_secret": "json-secret", "clientSecret": "camel-value"}',
    expected: 'API_TOKEN = "<REDACTED>"\npassword: <REDACTED>\nclient_secret => \'<REDACTED>\'\nKEY: <REDACTED>\n{"apiKey":"<REDACTED>", "client_secret": "<REDACTED>", "clientSecret": "<REDACTED>"}',
    environment: {},
    secrets: ['quoted value with spaces', 'single-value', 'another-value', 'raw-key-value', 'json-value', 'json-secret', 'camel-value'],
    mutation: 'Skipping one assignment separator or dropping its quote would leave a common credential representation exposed.',
  },
];

for (const { name, input, expected, status = 0, environment, secrets, mutation } of CASES) {
  test(`${name} (${mutation})`, () => {
    const result = runRedactor(input, environment);
    assert.equal(result.status, status, result.stderr || 'redactor returned an unexpected exit status');
    if (status !== 0) {
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'redact-outbound: unable to process input\n');
    } else {
      assert.equal(result.stdout, expected);
      assert.equal(result.stderr, '');
    }
    for (const secret of secrets) {
      assert.equal(result.stdout.includes(secret), false);
      assert.equal(result.stderr.includes(secret), false);
    }
  });
}
