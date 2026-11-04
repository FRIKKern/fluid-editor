// H6: record one gesture on the oracle into traces/<id>.json (QUALITY.md, O1).
// Read, do one gesture, read, undo until Undo is disabled, then reload and check
// that the saved layout came back. Refuses to start if the page has unsaved changes.
//
// node scripts/oracle-record.mjs --surface surface:40 --id T0001-key-right --journey J07 \
//   --items R1,R4,Y1 --section 0 --target first --keys ArrowRight
import { writeFileSync } from 'node:fs';
import { browser, evalJs, waitFor, reload, pause } from './lib/cmux.mjs';
import { READY, LOADED, ENTER_EDIT, READ, SELECT, KEY, BUTTON } from './oracle/snippets.mjs';
import { validate, diffStates } from './lib/trace.mjs';
import { pitch, hold, release, blockEl, handleEl, click } from './oracle/ui.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const surface = arg('surface', process.env.ORACLE_SURFACE || 'surface:40');
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
  browser(surface, 'click', '#fx-target');
  waitFor(surface, `(() => document.getElementById('sqs-site-frame').contentDocument.location.pathname === ${JSON.stringify(pagePath)} && !!document.getElementById('sqs-site-frame').contentDocument.querySelector('main#page .fluid-engine'))()`, 30);
}

function ensureEditing() {
  if (evalJs(surface, READY) === true) return;
  ensurePage();
  evalJs(surface, ENTER_EDIT);
  waitFor(surface, READY, 30);
}

const state = (s) => ({ rows: s.rows, blocks: s.blocks });

// The editor reopens in the last device view; traces are desktop unless --mobile.
async function setView() {
  const wantMobile = args.includes('--mobile');
  const w = evalJs(surface, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentWindow.innerWidth))()`);
  if ((w < 768) !== wantMobile) await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '${wantMobile ? 'Mobile' : 'Desktop'} View')`, { wait: 2500 });
}
ensureEditing();
await setView();
const before = evalJs(surface, READ(index));
if (!before.saveDisabled) throw new Error('The oracle has unsaved changes. Save or discard them by hand first; the recorder never touches unsaved work.');
const t = arg('target', 'first');
const target = t === 'first' ? Object.keys(before.blocks)[0] : /^\d+$/.test(t) ? Object.keys(before.blocks)[Number(t)] : t;

evalJs(surface, SELECT(index, target));
await pause(400);
// --also 3,4: Shift-add more blocks (by index in the section) to the selection.
const also = (arg('also', '') || '').split(',').filter(Boolean).map((k) => Object.keys(before.blocks)[Number(k)]);
for (const id of also) {
  evalJs(surface, `(async () => { const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;
    const b = d.querySelectorAll('main#page .fluid-engine')[${index}].querySelector('.fe-block[data-block-id="${id}"]'); const q = b.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, composed: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', view: W, shiftKey: true };
    for (const t of ['pointerdown', 'mousedown']) b.dispatchEvent(new (t.startsWith('pointer') ? W.PointerEvent : W.MouseEvent)(t, { ...o, buttons: 1 }));
    for (const t of ['pointerup', 'mouseup', 'click']) b.dispatchEvent(new (t.startsWith('pointer') ? W.PointerEvent : W.MouseEvent)(t, { ...o, buttons: 0 }));
    return 'true'; })()`);
  await pause(600);
}
// Where the target sits in the canvas window when the gesture starts: replay scrolls to the
// same place, so edge effects such as auto-scroll (G7) happen at the same distance.
const view = evalJs(surface, `(() => { const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  const b = d.querySelectorAll('main#page .fluid-engine')[${index}].querySelector('.fe-block[data-block-id="${target}"]'); const q = b.getBoundingClientRect();
  return JSON.stringify({ blockTop: Math.round(q.top * 10) / 10, innerHeight: W.innerHeight, innerWidth: W.innerWidth }); })()`);
// Gesture: keys (default), a drag of the block, or a resize from one handle, in grid units.
const dragBy = arg('drag');
const resizeDir = arg('resize');
const by = (arg('by', dragBy || '0,0')).split(',').map(Number);
const mods = { shift: args.includes('--shift'), alt: args.includes('--alt') };
let gesture = { kind: 'key', target, keys };
let mid = null;
const buttonName = arg('button');
if (buttonName) {
  // A block toolbar button, clicked like a person (cmux click), e.g. "Move Forward".
  // "Align Group>Align Left" clicks each button in turn.
  for (const name of buttonName.split('>')) {
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === ${'${JSON.stringify(name)}'} && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 60)`.replace('${JSON.stringify(name)}', JSON.stringify(name)), { wait: 1200 });
  }
  gesture = { kind: 'button', target, button: buttonName, ...(also.length && { also }) };
} else if (dragBy || resizeDir) {
  const p = pitch(index);
  const [fx, fy] = arg('grab', '0.5,0.5').split(',').map(Number);
  const find = resizeDir ? handleEl(index, target, resizeDir) : blockEl(index, target);
  mid = await hold(find, by[0] * p.col, by[1] * p.row, { fx: resizeDir ? 0.5 : fx, fy: resizeDir ? 0.5 : fy, ...mods });
  await release(mods);
  gesture = resizeDir ? { kind: 'resize', target, handle: resizeDir, by: { cols: by[0], rows: by[1] }, ...(mods.shift && { shift: true }), ...(mods.alt && { alt: true }) }
    : { kind: 'drag', target, grab: [fx, fy], by: { cols: by[0], rows: by[1] }, ...(mods.shift && { shift: true }), ...(mods.alt && { alt: true }) };
} else {
  for (const k of keys) {
    evalJs(surface, KEY(index, target, k));
    await pause(400);
  }
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
await setView();
const reloaded = evalJs(surface, READ(index));
const left = diffStates(state(before), state(reloaded));
if (left.length) throw new Error(`The oracle did not come back to the saved layout:\n${left.join('\n')}`);

// Shift-added blocks travel with every gesture kind, not only buttons, so replay selects them too.
if (also.length && !gesture.also) gesture.also = also;
const trace = {
  id,
  journey: arg('journey', 'J07'),
  items: arg('items', 'R1').split(','),
  oracle: { editor: 'https://halibut-keyboard-jlhd.squarespace.com/config/pages', page: pagePath, capturedAt: new Date().toISOString().slice(0, 10), frameWidth: before.frameWidth },
  layout: before.layout,
  section: { id: before.sectionId, index, gap: before.gap, rowGap: before.rowGap },
  view,
  content: before.content,
  before: state(before),
  gesture,
  ...(mid && { mid }),
  after: state(after),
  undo: { steps, afterUndo: state(afterUndo), restored: true, restoredBy: 'reload' },
  notes: [
    ...diffStates(state(before), state(after)).map((d) => `gesture changed ${d}`),
    ...diffStates(state(before), state(afterUndo)).map((d) => `after undo, still ${d}`),
  ],
};
if (!diffStates(trace.before, trace.after).length && !args.includes('--allow-no-change')) throw new Error('The gesture changed nothing on the oracle; no trace written (no skip-pass). Use --allow-no-change when "nothing happens" is the finding.');
const errors = validate(trace, `${id}.json`);
if (errors.length) throw new Error(errors.join('\n'));
writeFileSync(new URL(`../traces/${id}.json`, import.meta.url), JSON.stringify(trace, null, 2) + '\n');
console.log(`wrote traces/${id}.json`);
console.log(trace.notes.join('\n'));
