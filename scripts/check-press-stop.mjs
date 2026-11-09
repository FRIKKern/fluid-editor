// oracle-capture's step loop ends the run at the first step that fails, so a key meant for a field
// never reaches the page after a press that didn't land (2026-11-09). Stand-in steps, no Chrome.
// Usage: node scripts/check-press-stop.mjs
import { readFileSync } from 'node:fs';
import { runSteps, waitUntil } from './oracle/run-steps.mjs';

let fails = 0, total = 0;
const is = (what, ok) => { total++; if (!ok) { fails++; console.log(`press stop DIFF ${what}`); } };

// Each stand-in step logs that it ran. pressNamed and pressText fail as the real ones do: by a throw, or by an error written.
const run = async (steps, extra = {}) => {
  const ran = [], errors = [], failed = [];
  const STEPS = {
    toPage: async () => ran.push('toPage'),
    read: async () => ran.push('read'),
    pressNamed: async (label) => { ran.push('pressNamed'); if (label === 'gone') throw new Error('nothing labelled gone'); },
    add: async (ok) => { ran.push('add'); if (!ok) errors.push('add: not pressed, covered'); },
    press: async (key) => ran.push(`press ${key}`),
    keys: async (text) => ran.push(`keys ${text}`),
  };
  const out = await runSteps(steps, { STEPS, errors, onFail: async (op) => failed.push(op), ...extra });
  return { ...out, ran, errors, failed };
};

let r = await run([['toPage', 'P'], ['pressNamed', 'gone'], ['press', 'Meta+a'], ['press', 'Backspace'], ['read', 'a']]);
is('a press that throws stops the key steps after it', JSON.stringify(r.ran) === JSON.stringify(['toPage', 'pressNamed']));
is('the run says it stopped', r.stopped && /stopped after pressNamed: it failed, so the 3 later steps did not run/.test(r.errors.at(-1)));
is('the press error is kept', /pressNamed \["gone"\]: nothing labelled gone/.test(r.errors[0]));
is('onFail runs once, for the failed step (it lets go of a held mouse)', JSON.stringify(r.failed) === JSON.stringify(['pressNamed']));

r = await run([['toPage', 'P'], ['add', false], ['keys', 'x'], ['read', 'a']]);
is('a press that writes an error without a throw stops too', JSON.stringify(r.ran) === JSON.stringify(['toPage', 'add']) && r.stopped);

r = await run([['toPage', 'P'], ['pressNamed', 'Write'], ['add', true], ['keys', 'x'], ['read', 'a']]);
is('a run with no failure runs every step', r.ran.length === 5 && !r.stopped && r.errors.length === 0);

r = await run([['toPage', 'P'], ['pressNamed', 'gone']]);
is('a failed last step says nothing about later steps', r.stopped && r.errors.length === 1);

r = await run([['toPage', 'P'], ['nope'], ['keys', 'x']]);
is('an unknown step stops the run instead of throwing', r.stopped && /stopped before nope/.test(r.errors[0]) && r.ran.length === 1);

r = await run([['toPage', 'P'], ['keys', 'x']], { guard: (op) => (op === 'keys' ? 'the frame is on /other' : null) });
is('a guard stops before its step', JSON.stringify(r.ran) === JSON.stringify(['toPage']) && /stopped before keys: the frame is on \/other/.test(r.errors[0]));

// The read-back waits for the frame (waitUntil), with a stand-in clock: a page that loads late is still read, one that never
// loads gives null once the limit has passed, and oracle-capture then fails the run loudly.
{
  let calls = 0, slept = 0; const sleep = async (ms) => { slept += ms; };
  const late = await waitUntil(() => (++calls >= 4 ? { path: '/p' } : null), 30000, 500, sleep);
  is('a frame that loads late is waited for', late?.path === '/p' && calls === 4 && slept === 1500);
  slept = 0;
  const never = await waitUntil(() => null, 30000, 500, sleep);
  is('a frame that never loads gives null at the limit, no sooner', never === null && slept === 30000);
}
const cap = readFileSync(new URL('./oracle-capture.mjs', import.meta.url), 'utf8');
is('no fixed pause before the read-back', !/reload\(S\); await pause\(/.test(cap));
is('a read-back that times out fails the run', /await waitUntil\(loaded, 30000\)[\s\S]{0,400}process\.exitCode = 1/.test(cap));

// oracle-capture uses this loop, and writes the finding in the same finally that leaves without saving.
const src = readFileSync(new URL('./oracle-capture.mjs', import.meta.url), 'utf8');
is('oracle-capture runs its steps through runSteps', /await runSteps\(recipe\.steps,/.test(src));
const fin = src.slice(src.lastIndexOf('} finally {'));
is('the finally exits, reads back and writes', /exitWithoutSaving\(\)[\s\S]*readBack[\s\S]*writeFileSync\(file, text\)/.test(fin));

console.log(`press stop ${fails ? 'FAILS' : 'ok'}: ${total - fails} of ${total}`);
process.exit(fails ? 1 : 0);
