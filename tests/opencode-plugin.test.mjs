import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const root = path.join(import.meta.dirname, '..');
const pluginPath = path.join(root, '.opencode', 'plugins', 'razorback.js');
const mod = await import(pathToFileURL(pluginPath).href);

const MARKER = '<EXTREMELY_IMPORTANT>\nYou have razorback.';

async function makeTransform() {
  const hooks = await mod.RazorbackPlugin({ client: {}, directory: root });
  return hooks['experimental.chat.messages.transform'];
}

function makeOutput(text) {
  return {
    messages: [{
      info: { role: 'user' },
      parts: [{ type: 'text', text }],
    }],
  };
}

function bootstrapParts(output) {
  return output.messages[0].parts.filter(
    (part) => part.type === 'text' && part.text.startsWith(MARKER),
  );
}

test('exports BOOTSTRAP_MARKER equal to the bootstrap opening', () => {
  assert.equal(mod.BOOTSTRAP_MARKER, MARKER);
});

test('injects a bootstrap that starts with the marker', async () => {
  const transform = await makeTransform();
  const output = makeOutput('Plan the feature');
  await transform({}, output);
  assert.equal(output.messages[0].parts.length, 2);
  assert.equal(bootstrapParts(output).length, 1);
  assert.equal(output.messages[0].parts[1].text, 'Plan the feature');
});

test('injects when the first user message merely mentions EXTREMELY_IMPORTANT', async () => {
  const transform = await makeTransform();
  const output = makeOutput("Is there an 'EXTREMELY_IMPORTANT' block in your context?");
  await transform({}, output);
  assert.equal(bootstrapParts(output).length, 1);
  await transform({}, output);
  assert.equal(bootstrapParts(output).length, 1);
});

test('leaves a first user message that already starts with the marker alone', async () => {
  const transform = await makeTransform();
  const output = makeOutput(`${MARKER}\n\nalready injected`);
  const before = structuredClone(output);
  await transform({}, output);
  assert.deepEqual(output, before);
});

test('tool mapping tells the model to drop the razorback: prefix for skill ids', async () => {
  const transform = await makeTransform();
  const output = makeOutput('Load a skill');
  await transform({}, output);
  const [bootstrap] = bootstrapParts(output);
  assert.match(bootstrap.text, /razorback:[a-z0-9-]+/);
  assert.ok(bootstrap.text.includes('drop the `razorback:` prefix'));
  assert.ok(bootstrap.text.includes('`razorback:brainstorming` → `skill` with `name: "brainstorming"`'));
});
