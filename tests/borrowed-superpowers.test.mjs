import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const root = path.join(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

test('brainstorm companion rejects oversized websocket frames', () => {
  const { decodeFrame } = require('../skills/brainstorming/scripts/server.cjs');
  const frame = Buffer.alloc(14);
  frame[0] = 0x81;
  frame[1] = 0x80 | 127;
  frame.writeBigUInt64BE(BigInt(10 * 1024 * 1024 + 1), 2);

  assert.throws(
    () => decodeFrame(frame),
    /payload exceeds maximum allowed size/
  );
});

test('brainstorm companion has session-key auth and file sandboxing', () => {
  const server = read('skills/brainstorming/scripts/server.cjs');

  assert.match(server, /function isAuthorized\(req\)/);
  assert.match(server, /timingSafeEqual/);
  assert.match(server, /function securityHeaders/);
  assert.match(server, /Cache-Control': 'no-store'/);
  assert.match(server, /X-Frame-Options': 'DENY'/);
  assert.match(server, /function isRegularFileInsideContentDir/);
  assert.match(server, /stat\.isSymbolicLink\(\)/);
  assert.match(server, /fileName\.startsWith\('\.'\)/);
  assert.match(server, /function companionUrl\(\)/);
  assert.match(server, /url: companionUrl\(\)/);
});

test('brainstorm launcher persists port and token for restart-safe sessions', () => {
  const startServer = read('skills/brainstorming/scripts/start-server.sh');
  const stopServer = read('skills/brainstorming/scripts/stop-server.sh');

  assert.match(startServer, /BRAINSTORM_PORT_FILE/);
  assert.match(startServer, /BRAINSTORM_TOKEN_FILE/);
  assert.match(startServer, /BRAINSTORM_IDLE_TIMEOUT_MS/);
  assert.match(stopServer, /server-instance-id/);
  assert.match(stopServer, /stale_pid/);
});

test('subagent-driven-development defines artifact helpers and durable ledger', () => {
  const skill = read('skills/subagent-driven-development/SKILL.md');

  for (const script of [
    'skills/subagent-driven-development/scripts/sdd-workspace',
    'skills/subagent-driven-development/scripts/task-brief',
    'skills/subagent-driven-development/scripts/review-package'
  ]) {
    assert.equal(exists(script), true, `${script} should exist`);
  }

  assert.match(read('skills/subagent-driven-development/scripts/sdd-workspace'), /\.razorback\/sdd/);
  assert.match(read('skills/subagent-driven-development/scripts/task-brief'), /Default OUTFILE: <repo-root>\/\.razorback\/sdd\/task-<N>-brief\.md/);
  assert.match(read('skills/subagent-driven-development/scripts/review-package'), /git diff -U10/);
  assert.match(skill, /## File Handoffs/);
  assert.match(skill, /## Durable Progress/);
  assert.match(skill, /\.razorback\/sdd\/progress\.md/);
  assert.match(skill, /Lead inline review/);
  assert.match(skill, /No reviewer subagents/);
});

test('writing-plans carries global constraints and per-task interfaces', () => {
  const skill = read('skills/writing-plans/SKILL.md');

  assert.match(skill, /## Global Constraints/);
  assert.match(skill, /version floors, dependency limits/);
  assert.match(skill, /\*\*Interfaces:\*\*/);
  assert.match(skill, /Consumes:/);
  assert.match(skill, /Produces:/);
  assert.match(skill, /A task's implementer sees only their own task/);
});
