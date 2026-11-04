// X2: hold each recorded drag and resize in our editor and compare what the blocks say while held
// with the trace's mid state: near, matching width and height, selected, the grid in one section.
// Runs on headless Chrome. Writes parity/mid-check.json. Usage: npm run mid-check.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, waitFor } from './lib/cmux.mjs';
import { modelFor } from './lib/trace-model.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const dir = new URL('../traces/', import.meta.url);
const traces = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter((t) => t.mid && ['drag', 'resize'].includes(t.gesture.kind));
if (!traces.length) throw new Error('no traces with a mid state');

let pass = 0;
const results = [];
for (const t of traces) {
  const g = t.gesture;
  viewport(S, t.oracle.frameWidth, 1000);
  goto(S, `${BASE}/index.html?replay`);
  waitFor(S, '(() => !!window.fe)()', 20);
  for (let k = 0, w = t.oracle.frameWidth; k < 4; k++) {
    const got = evalJs(S, `document.getElementById('site-frame').clientWidth`);
    if (got === t.oracle.frameWidth) break;
    w += t.oracle.frameWidth - got;
    viewport(S, w, 1000);
    await pause(300);
  }
  evalJs(S, `JSON.stringify(fe.load(${JSON.stringify(modelFor(t))}))`);
  if (t.layout !== 'desktop') evalJs(S, `(fe.setBp('${t.layout}'), 1)`);
  await pause(500);
  const ours = evalJs(S, `(async () => {
    const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const block = (id) => d.querySelector('.fe-block[data-block-id="' + id + '"]');
    const click = (id, shiftKey) => { const r = block(id).getBoundingClientRect(); const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true, shiftKey }; block(id).dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 })); d.documentElement.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 })); };
    block(${JSON.stringify(g.target)}).scrollIntoView({ block: 'center' });
    click(${JSON.stringify(g.target)}, false);
    for (const id of ${JSON.stringify(g.also || [])}) click(id, true);
    const m = fe.measure(${JSON.stringify(t.section.id)});
    const dx = ${g.by?.cols || 0} * (m.colStart[2] - m.colStart[1]), dy = ${g.by?.rows || 0} * m.pitch;
    const el = ${g.kind === 'resize' ? `d.querySelector('.fe-handle[data-dir="${g.handle}"]')` : `block(${JSON.stringify(g.target)})`};
    const q = el.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, shiftKey: ${!!g.shift}, altKey: ${!!g.alt} };
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 }));
    for (let k = 1; k <= 12; k++) { d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + dx * k / 12, clientY: y + dy * k / 12, buttons: 1 })); await sleep(25); }
    await sleep(300);
    const out = { grids: [...d.querySelectorAll('.fluid-engine')].filter((e) => e.dataset.gridIsVisible === 'true').length, blocks: {} };
    for (const id of ${JSON.stringify(Object.keys(t.before.blocks))}) { const e = block(id); out.blocks[id] = { near: e.dataset.isNearDraggedBlock, matchW: e.dataset.isMatchingWidth, matchH: e.dataset.isMatchingHeight, selected: e.dataset.isSelected }; }
    d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, clientX: x + dx, clientY: y + dy, buttons: 0 }));
    return JSON.stringify(out); })()`);
  // The recorder lists only blocks with a flag set: a block it left out has all flags false.
  const diffs = [];
  for (const id of Object.keys(t.before.blocks)) {
    const want = t.mid.attrs.find((a) => a.id === id) || {};
    for (const k of ['near', 'matchW', 'matchH', 'selected']) {
      if ((want[k] || 'false') !== ours.blocks[id][k]) diffs.push(`${id.slice(-5)} ${k}: oracle ${want[k] || 'false'}, ours ${ours.blocks[id][k]}`);
    }
  }
  const grids = t.mid.gridVisible.filter((v) => v === 'true').length;
  if (grids !== ours.grids) diffs.push(`visible grids: oracle ${grids}, ours ${ours.grids}`);
  if (!diffs.length) pass++;
  else console.log(`DIFF ${t.id}\n  ${diffs.join('\n  ')}`);
  results.push({ trace: t.id, pass: !diffs.length, diffs });
}
console.log(`Mid-gesture state: ${pass} of ${traces.length} traces match`);
writeFileSync(new URL('../parity/mid-check.json', import.meta.url), JSON.stringify({ check: 'mid-gesture flags', pass, total: traces.length, results }, null, 2) + '\n');
process.exit(pass === traces.length ? 0 : 1);
