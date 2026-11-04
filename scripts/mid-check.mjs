// X2: hold each recorded drag and resize in our editor and compare what the blocks say while held
// with the trace's mid state: near, matching width and height, selected, the grid in one section.
// G5, G6: then hold what parity/findings/GUIDES.json measured and compare the target area, the
// ring box, the center line and the width of the held block.
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

// GUIDES.json, on the demo page at the oracle's window. Each hold starts from a clean section.
const F = JSON.parse(readFileSync(new URL('../parity/findings/GUIDES.json', import.meta.url)));
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const FRAME = `const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow; const s = fe.model.sections[${F.section}]; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));`;
viewport(S, F.window[0], F.window[1] + 55);
goto(S, `${BASE}/index.html?replay`);
waitFor(S, '(() => !!window.fe)()', 20);
await pause(800);
// Press on the block or a handle, move by dx, dy, read, then cancel and undo.
const hold = (block, dir, dx, dy, drop = false) => evalJs(S, `(async () => { ${FRAME}
  const b = d.querySelector('.fe-block[data-block-id="' + s.blocks[${block}].id + '"]');
  b.scrollIntoView({ block: 'center' }); await sleep(150);
  fe.select(s.id, s.blocks[${block}].id); await sleep(50);
  const el = ${dir ? `d.querySelector('.fe-handle[data-dir="${dir}"]')` : 'b'};
  const q = el.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
  const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
  el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 }));
  for (let k = 1; k <= 8; k++) { d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + ${dx} * k / 8, clientY: y + ${dy} * k / 8, buttons: 1 })); await sleep(15); }
  await sleep(120);
  const ring = d.querySelector('.fe-transform-indicator'), line = d.querySelector('.fe-center-line');
  const c = ring && W.getComputedStyle(ring), l = line && W.getComputedStyle(line), rb = ring?.getBoundingClientRect(), bb = b.getBoundingClientRect();
  const out = { area: c?.gridArea, ring: rb && [rb.width, rb.height], ringColor: c?.borderLeftColor, line: l && (l.borderLeftStyle === 'solid' ? 'centered' : 'normal'), lineColor: l?.borderLeftColor, block: bb.width, z: W.getComputedStyle(b).zIndex, opacity: W.getComputedStyle(b).opacity };
  d.dispatchEvent(new W.PointerEvent(${drop ? "'pointerup'" : "'pointercancel'"}, { ...o, clientX: x + ${dx}, clientY: y + ${dy}, buttons: 0 }));
  await sleep(100);
  if (${drop}) out.dropped = fe.model.sections[${F.section}].blocks.find((x) => x.id === b.dataset.blockId).layout.desktop.area.join(' / ');
  while (fe.canUndo) fe.undo();
  return JSON.stringify(out); })()`);
const cases = [];
const sn = F.centerSnap;
const colPitch = evalJs(S, `(() => { const s = fe.model.sections[${F.section}]; const m = fe.measure(s.id); return JSON.stringify(m.colStart[2] - m.colStart[1]); })()`);
for (const c of sn.paragraphDrag) cases.push({ name: `paragraph dx ${c.dx}`, got: hold(1, null, c.dx, 0), want: c });
cases.push({ name: 'paragraph drop', got: hold(1, null, sn.paragraphDrop.dx, 0, true), want: { dropped: sn.paragraphDrop.area } });
cases.push({ name: 'shape to the center', got: hold(2, null, sn.shapeDrag.cols * colPitch, 0), want: sn.shapeDrag });
for (const c of sn.shapeResizeWest) cases.push({ name: `shape west ${c.cols}`, got: hold(2, 'w', c.cols * colPitch, 0), want: c });
let guidePass = 0;
const guideResults = [];
for (const { name, got, want } of cases) {
  const diffs = [];
  if (want.area && got.area !== want.area) diffs.push(`area: oracle ${want.area}, ours ${got.area}`);
  if (want.ring && !(near(got.ring?.[0], want.ring[2]) && near(got.ring?.[1], want.ring[3]))) diffs.push(`ring: oracle ${want.ring.slice(2)}, ours ${got.ring}`);
  if (want.line && got.line !== want.line) diffs.push(`line: oracle ${want.line}, ours ${got.line}`);
  if (want.block && !near(got.block, want.block[1])) diffs.push(`block width: oracle ${want.block[1]}, ours ${got.block}`);
  if (want.dropped && got.dropped !== want.dropped) diffs.push(`drop: oracle ${want.dropped}, ours ${got.dropped}`);
  if (want.line === 'centered' && got.lineColor !== 'rgb(255, 184, 2)') diffs.push(`line color ${got.lineColor}`);
  if (want.line === 'normal' && got.lineColor !== 'rgb(2, 122, 255)') diffs.push(`line color ${got.lineColor}`);
  if (want.ring && got.ringColor !== 'rgb(72, 148, 255)') diffs.push(`ring color ${got.ringColor}`);
  if (want.block && got.opacity !== '1') diffs.push(`held block opacity ${got.opacity}`);
  if (!diffs.length) guidePass++;
  else console.log(`DIFF ${name}\n  ${diffs.join('\n  ')}`);
  guideResults.push({ name, pass: !diffs.length, diffs });
}
console.log(`Guides and center snap: ${guidePass} of ${cases.length} holds match`);
writeFileSync(new URL('../parity/mid-check.json', import.meta.url), JSON.stringify({ check: 'mid-gesture flags, guides and center snap', pass: pass + guidePass, total: traces.length + cases.length, results, guides: guideResults }, null, 2) + '\n');
process.exit(pass === traces.length && guidePass === cases.length ? 0 : 1);
