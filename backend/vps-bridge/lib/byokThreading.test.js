// Static guard: the queue modules open Redis connections on import, so they
// can't be required in a unit test. Instead check, from source, that BYOK can't
// be silently dropped by a future call site: every callModel(...) passes the
// caller's apiKey and every run* entry point accepts it.
// Run: node --test lib/byokThreading.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

for (const [file, entry] of [
  ['diagnosticQueue.js', /async function runDeepDiagnostic\(payload, \{ apiKey \} = \{\}\)/],
  ['blueprintQueue.js', /async function runBlueprintGeneration\(\{ messages \}, \{ apiKey \} = \{\}\)/],
  ['roadmapQueue.js', /async function runRoadmapGeneration\(\{ messages \}, \{ apiKey \} = \{\}\)/],
]) {
  test(`${file}: entry point takes an apiKey and every model call passes it`, () => {
    const src = read(file);
    assert.match(src, entry);
    assert.match(src, /apiKey \|\| process\.env\.OPENROUTER_API_KEY/, 'callModel falls back to Aivory\'s key');
    const calls = src.match(/await callModel\(\{[^\n]*\}\);/g) || [];
    assert.ok(calls.length >= 2, 'found the call sites');
    for (const c of calls) assert.match(c, /\bapiKey\b/, `call site drops the key: ${c}`);
  });
}

test('the website-context extractor is also run on the caller\'s key', () => {
  assert.match(read('diagnosticQueue.js'), /callExtractor: \(system, user, timeoutMs\) => defaultCallExtractor\(system, user, timeoutMs, apiKey\)/);
  assert.match(read('webContext.js'), /apiKey \|\| process\.env\.OPENROUTER_API_KEY/);
});

test('a job carries only the user id, never a key', () => {
  const server = read('../server.js');
  for (const q of ['blueprintQueue', 'roadmapQueue', 'diagnosticQueue']) {
    const line = server.split('\n').find((l) => l.includes(`${q}.add(`));
    assert.ok(line && /callerUserId: req\.callerUserId/.test(line), `${q} job names the caller`);
    assert.ok(!/api_?key|apiKey/i.test(line), `${q} job must not contain a key`);
  }
  assert.match(read('../worker.js'), /userOpenRouterKey\(job\.data\.callerUserId/);
});
