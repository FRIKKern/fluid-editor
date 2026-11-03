// H6: record one gesture on the oracle into traces/<id>.json (QUALITY.md, O1).
// Read, do one gesture, read, undo until Undo is disabled, then reload and check
// that the saved layout came back. Refuses to start if the page has unsaved changes.
//
// node scripts/oracle-record.mjs --surface surface:40 --id T0001-key-right --journey J07 \
//   --items R1,R4,Y1 --section 0 --target first --keys ArrowRight
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { evalJs, waitFor, reload, pause } from './lib/cmux.mjs';
import { READY, LOADED, ENTER_EDIT, READ, SELECT, KEY, BUTTON } from './oracle/snippets.mjs';
import { validate, diffStates } from './lib/trace.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const surface = arg('surface', 'surface:40');
const index = Number(arg('section', '0'));
const keys = arg('keys', 'ArrowRight').split(',');
const id = arg('id');
const pageTitle = arg('page', 'How Fluid Engine works');
const pagePath = arg('path', '/how-fluid-engine-works');
if (!id) throw new Error('--id is required, like T0001-key-right');

// The editor opens on Home after a reload; pick our page in the pages panel.
function ensurePage() {
  waitFor(surface, LOADED);
  const path = evalJs(surface, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentDocument.location.pathname))()`);
  if (path === pagePath) return;
  evalJs(surface, `(() => { const e = [...document.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(pageTitle)} && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left < 400)[0]; document.querySelectorAll('#fx-target').forEach((y) => y.removeAttribute('id')); e.id = 'fx-target'; return 'true'; })()`);
  execFileSync('cmux', ['browser', '--surface', surface, 'click', '#fx-target']);
  waitFor(surface, `(() => document.getElementById('sqs-site-frame').contentDocument.location.pathname === ${JSON.stringify(pagePath)} && !!document.getElementById('sqs-site-frame').contentDocument.querySelector('main#page .fluid-engine'))()`, 30);
}

function ensureEditing() {
  if (evalJs(surface, READY) === true) return;
  ensurePage();
  evalJs(surface, ENTER_EDIT);
  waitFor(surface, READY, 30);
}

const state = (s) => ({ rows: s.rows, blocks: s.blocks });

ensureEditing();
const before = evalJs(surface, READ(index));
if (!before.saveDisabled) throw new Error('The oracle has unsaved changes. Save or discard them by hand first; the recorder never touches unsaved work.');
const t = arg('target', 'first');
const target = t === 'first' ? Object.keys(before.blocks)[0] : /^\d+$/.test(t) ? Object.keys(before.blocks)[Number(t)] : t;

evalJs(surface, SELECT(index, target));
await pause(400);
for (const k of keys) {
  evalJs(surface, KEY(index, target, k));
  await pause(400);
}
// The editor applies a move a moment later; wait for the state to change (up to 4s).
let after = evalJs(surface, READ(index));
for (let t = 0; t < 8 && !diffStates(state(before), state(after)).length; t++) {
  await pause(500);
  after = evalJs(surface, READ(index));
}
await pause(600);
after = evalJs(surface, READ(index));

let steps = 0;
while (steps < 10 && evalJs(surface, BUTTON('Undo')) === true) {
  steps++;
  await pause(900);
}
const afterUndo = evalJs(surface, READ(index));

reload(surface);
ensurePage();
evalJs(surface, ENTER_EDIT);
waitFor(surface, READY, 30);
const reloaded = evalJs(surface, READ(index));
const left = diffStates(state(before), state(reloaded));
if (left.length) throw new Error(`The oracle did not come back to the saved layout:\n${left.join('\n')}`);

const trace = {
  id,
  journey: arg('journey', 'J07'),
  items: arg('items', 'R1').split(','),
  oracle: { editor: 'https://halibut-keyboard-jlhd.squarespace.com/config/pages', page: pagePath, capturedAt: new Date().toISOString().slice(0, 10), frameWidth: before.frameWidth },
  layout: before.layout,
  section: { id: before.sectionId, index, gap: before.gap, rowGap: before.rowGap },
  content: before.content,
  before: state(before),
  gesture: { kind: 'key', target, keys },
  after: state(after),
  undo: { steps, afterUndo: state(afterUndo), restored: true, restoredBy: 'reload' },
  notes: [
    ...diffStates(state(before), state(after)).map((d) => `gesture changed ${d}`),
    ...diffStates(state(before), state(afterUndo)).map((d) => `after undo, still ${d}`),
  ],
};
if (!diffStates(trace.before, trace.after).length) throw new Error('The gesture changed nothing on the oracle; no trace written (no skip-pass).');
const errors = validate(trace, `${id}.json`);
if (errors.length) throw new Error(errors.join('\n'));
writeFileSync(new URL(`../traces/${id}.json`, import.meta.url), JSON.stringify(trace, null, 2) + '\n');
console.log(`wrote traces/${id}.json`);
console.log(trace.notes.join('\n'));
