// X2: hold each recorded drag and resize in our editor and compare what the blocks say while held
// with the trace's mid state: near, matching width and height, selected, the grid in one section.
// G5, G6: then hold what parity/findings/GUIDES.json measured and compare the target area, the
// ring box, the center line and the width of the held block. X8, X13, Z3: the group handles, the marquee, the Layers rows. X6, X7, S4, X11, R2, R3, L6, S1: handles by type, modifiers, the phone section handle, touch, normalizing, per-layout values.
// X2: where a held block sits and the center line on phones (HOLD.json).
// Runs on headless Chrome. Writes parity/mid-check.json. Usage: npm run mid-check.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, waitFor, mouse, cdp, browser } from './lib/cmux.mjs';
import { modelFor } from './lib/trace-model.mjs';
import { BASE } from './lib/base.mjs';
import { replayLinkBox, SEE, oracleSees } from './lib/link-box-replay.mjs';
import { PIN_READS, pinBar } from './lib/x8-phone-pin.mjs';
import { T3, PHONE_STEPS, CORNER_STEPS, loadText, pull } from './lib/r2-width-replay.mjs';
import { PHONE_LETGO, phoneLetGo } from './lib/phone-letgo.mjs';

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
const HOLD_IDS = evalJs(S, `JSON.stringify(fe.model.sections[${F.section}].blocks.map((b) => b.id))`);
const hold = (block, dir, dx, dy, drop = false) => evalJs(S, `(async () => { ${FRAME}
  const b = d.querySelector('.fe-block[data-block-id="${HOLD_IDS[block]}"]');
  b.scrollIntoView({ block: 'center' }); await sleep(150);
  // A drag starts from a block not yet selected: from the text of a selected Text it would open the editor (CAP-TEXTPRESS.json).
  fe.select(${dir ? `s.id, '${HOLD_IDS[block]}'` : 'null'}); await sleep(50);
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

// X8: GROUPRESIZE.json. A group of heading and paragraph, held on one of its handles or dropped.
const GR = JSON.parse(readFileSync(new URL('../parity/findings/GROUPRESIZE.json', import.meta.url)));
const holdGroup = (dir, cols, rows, drop = false) => evalJs(S, `(async () => { ${FRAME}
  const [h, p] = s.blocks; const block = (b) => d.querySelector('.fe-block[data-block-id="' + b.id + '"]');
  block(h).scrollIntoView({ block: 'center' }); await sleep(150);
  const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
  const click = (b, shiftKey) => { const r = block(b).getBoundingClientRect(); const c = { ...o, shiftKey, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; block(b).dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); };
  fe.select(s.id, h.id); click(p, true); await sleep(50);
  const m = fe.measure(s.id); const dx = ${cols} * (m.colStart[2] - m.colStart[1]), dy = ${rows} * m.pitch;
  const el = d.querySelector('.fe-indicator.is-group .fe-handle[data-dir="${dir}"]');
  const q = el.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
  el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 }));
  for (let k = 1; k <= 8; k++) { d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + dx * k / 8, clientY: y + dy * k / 8, buttons: 1 })); await sleep(15); }
  await sleep(120);
  const ring = d.querySelector('.fe-transform-indicator');
  const out = { ring: ring && W.getComputedStyle(ring).gridArea, heading: W.getComputedStyle(block(h)).gridArea, paragraph: W.getComputedStyle(block(p)).gridArea };
  d.dispatchEvent(new W.PointerEvent(${drop ? "'pointerup'" : "'pointercancel'"}, { ...o, clientX: x + dx, clientY: y + dy, buttons: 0 }));
  await sleep(100);
  const now = fe.model.sections[${F.section}].blocks;
  out.after = [now[0].layout.desktop.area.join(' / '), now[1].layout.desktop.area.join(' / ')];
  out.undo = fe.canUndo;
  while (fe.canUndo) fe.undo();
  return JSON.stringify(out); })()`);
const groupCases = [];
const parts = (a) => a.split(' / ').map(Number);
for (const c of GR.east) {
  const got = holdGroup('e', c.byCols, 0), [h, p] = [parts(got.heading), parts(got.paragraph)];
  groupCases.push({ name: `group east by ${c.byCols}`, diffs: [h[3] - h[1] !== c.heading && `heading: oracle ${c.heading}, ours ${h[3] - h[1]}`, p[3] - p[1] !== c.paragraph && `paragraph: oracle ${c.paragraph}, ours ${p[3] - p[1]}`, got.after[0] !== '1 / 2 / 5 / 16' && 'cancel kept a change'].filter(Boolean) });
}
for (const c of GR.south) {
  const got = holdGroup('s', 0, c.byRows), [h, p] = [parts(got.heading), parts(got.paragraph)];
  const known = GR.knownMisses.some((k) => k.case === `south by ${c.byRows} rows`);
  const diffs = [h[2] - h[0] !== c.headingRows && `heading: oracle ${c.headingRows}, ours ${h[2] - h[0]}`, p[0] !== c.paragraphStart && `paragraph start: oracle ${c.paragraphStart}, ours ${p[0]}`, p[2] - p[0] !== c.paragraphRows && `paragraph: oracle ${c.paragraphRows}, ours ${p[2] - p[0]}`].filter(Boolean);
  groupCases.push({ name: `group south by ${c.byRows}`, diffs, known });
}
for (const c of GR.drops) {
  const got = holdGroup(c.dir, c.cols, c.rows, true);
  const diffs = [got.after[0] !== c.heading && `heading: oracle ${c.heading}, ours ${got.after[0]}`, got.after[1] !== (c.held?.split('paragraph ')[1] || c.paragraph) && `paragraph: oracle ${c.paragraph}, ours ${got.after[1]}`, !got.undo && 'no undo step'].filter(Boolean);
  const name = `group drop ${c.dir} ${c.cols},${c.rows}`;
  groupCases.push({ name, diffs, known: GR.knownMisses.some((k) => k.case === name) });
}
// Move Forward from the oracle's start: z 1, 2, 3 becomes 2, 3, 1, and the buttons swap.
groupCases.push({ name: 'group move forward', ...(() => {
  const got = evalJs(S, `(async () => { ${FRAME}
    const [h, p] = s.blocks; const block = (b) => d.querySelector('.fe-block[data-block-id="' + b.id + '"]');
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    const click = (b, shiftKey) => { const r = block(b).getBoundingClientRect(); const c = { ...o, shiftKey, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; block(b).dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); };
    fe.select(s.id, h.id); click(p, true); await sleep(50);
    const off = (a) => document.querySelector('[data-tb="' + a + '"]').classList.contains('is-off');
    const zs = () => fe.model.sections[${F.section}].blocks.map((b) => b.layout.desktop.z).join();
    const before = [off('z+'), off('z-'), zs()];
    document.querySelector('[data-tb="z+"]').click(); await sleep(80);
    const after = [off('z+'), off('z-'), zs()];
    while (fe.canUndo) fe.undo();
    return JSON.stringify({ before, after }); })()`);
  const diffs = [JSON.stringify(got.before) !== '[false,true,"1,2,3"]' && `before ${got.before}`, JSON.stringify(got.after) !== '[true,false,"2,3,1"]' && `after ${got.after}`].filter(Boolean);
  return { diffs };
})() });
// X13: the marquee, on the same section. Empty space is left of the blocks and below the paragraph.
const marqueeRun = (startY, moves, withP = false) => evalJs(S, `(async () => { ${FRAME}
  const clear = () => { for (const t of [document, d]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); };
  const [h, p, shape] = s.blocks; const block = (b) => d.querySelector('.fe-block[data-block-id="' + b.id + '"]');
  block(h).scrollIntoView({ block: 'center' }); await sleep(150); clear();
  if (${withP}) fe.select(s.id, p.id);
  const R = (b) => block(b).getBoundingClientRect();
  const sec = block(h).closest('section').getBoundingClientRect(); const x0 = R(h).left - 40;
  const at = { below: R(p).bottom + 40, padding: sec.top + 10, shape: R(shape).bottom + 20 }, pts = { p: [R(p).left + 60, R(p).bottom - 10], shape: [R(shape).left + 40, R(shape).bottom - 10], next: [x0 + 80, sec.bottom + 200], near: [x0 + 29, null], far: [x0 + 30, null], empty: [x0 + 30, R(p).bottom + 80], h: [R(h).left + 40, R(h).top + 20] };
  const start = ${JSON.stringify(startY)} === 'shape' ? [R(shape).left - 30, at.shape] : [x0, at[${JSON.stringify(startY)}]];
  const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
  const box = () => { const e = d.querySelector('.fe-marquee'); return e ? W.getComputedStyle(e).outlineWidth : null; };
  const ids = () => { const k = (id) => ['heading', 'paragraph', 'shape'][s.blocks.findIndex((b) => b.id === id)] || 'other'; return [...d.querySelectorAll('.fe-block[data-is-selected="true"]')].map((e) => k(e.dataset.blockId)).sort().join(); };
  const y0 = W.scrollY; const steps = [];
  const el = d.elementFromPoint(start[0], start[1]);
  el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: start[0], clientY: start[1], buttons: 1 }));
  for (const name of ${JSON.stringify(moves)}) {
    const q = pts[name]; d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: q[0], clientY: q[1] ?? start[1], buttons: 1 }));
    await sleep(30);
    steps.push({ name, box: box(), ids: ids(), toolbar: !document.getElementById('block-toolbar').hidden });
  }
  d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, clientX: 0, clientY: 0, buttons: 0 })); await sleep(50);
  const out = { steps, after: ids(), toolbar: !document.getElementById('block-toolbar').hidden, boxAfter: box(), scrolled: W.scrollY !== y0 };
  clear();
  return JSON.stringify(out); })()`);
const mq = (name, got, want) => groupCases.push({ name: `marquee ${name}`, diffs: Object.entries(want).filter(([k, v]) => JSON.stringify(k.split('.').reduce((a, b) => a?.[b], got)) !== JSON.stringify(v)).map(([k, v]) => `${k}: oracle ${JSON.stringify(v)}, ours ${JSON.stringify(k.split('.').reduce((a, b) => a?.[b], got))}`) });
mq('29px is no box', marqueeRun('below', ['near']), { 'steps.0.box': null, after: '' });
mq('30px is a box', marqueeRun('below', ['far']), { 'steps.0.box': '3px', 'steps.0.toolbar': false });
mq('held outlines only, then the toolbar', marqueeRun('below', ['p']), { 'steps.0.ids': 'paragraph', 'steps.0.toolbar': false, after: 'paragraph', toolbar: true, boxAfter: null });
mq('follows the box while held', marqueeRun('below', ['p', 'empty', 'h', 'empty']), { 'steps.0.ids': 'paragraph', 'steps.1.ids': '', 'steps.2.ids': 'heading,paragraph', 'steps.3.ids': '', after: '' });
mq('starts in the section padding', marqueeRun('padding', ['h']), { 'steps.0.box': '3px', after: 'heading' });
mq('into the next section stays in this one', marqueeRun('below', ['next']), { 'steps.0.box': '3px', 'steps.0.ids': '', after: '', scrolled: false });
mq('over nothing keeps a selection', marqueeRun('below', ['empty'], true), { 'steps.0.ids': 'paragraph', after: 'paragraph' });
mq('over a block replaces it on release', marqueeRun('shape', ['shape'], true), { 'steps.0.ids': 'paragraph,shape', after: 'shape' });
mq('a click clears it', marqueeRun('below', [], true), { after: '' });
// Z3: dragging rows in the Layers list (LAYERS.json). Each step is one row dragged by some pixels.
const LY = JSON.parse(readFileSync(new URL('../parity/findings/LAYERS.json', import.meta.url)));
const layerRun = (steps, remove) => evalJs(S, `(async () => { ${FRAME}
  const names = ['heading', 'paragraph', 'shape']; const ids = s.blocks.map((b) => b.id);
  const panel = document.getElementById('layers-panel'); const out = [];
  d.querySelector('.fe-block[data-block-id="' + ids[0] + '"]').scrollIntoView({ block: 'center' }); await sleep(150);
  fe.select(s.id, ids[0]); await sleep(30);
  ${remove ? `fe.select(s.id, ids[names.indexOf('${remove}')]); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await sleep(50); fe.select(s.id, ids[0]);` : ''}
  document.querySelector('button[data-sc="layers"]').click(); await sleep(50);
  for (const st of ${JSON.stringify(steps)}) {
    const li = panel.querySelectorAll('li[data-layer]')[st.row]; const r = li.getBoundingClientRect();
    const o = { bubbles: true, pointerId: 1, button: 0, clientX: r.left + 40, clientY: r.top + 22 };
    li.dispatchEvent(new PointerEvent('pointerdown', { ...o, buttons: 1 }));
    for (let k = 1; k <= 6; k++) document.dispatchEvent(new PointerEvent('pointermove', { ...o, clientY: o.clientY + st.by * k / 6, buttons: 1 }));
    const held = !!document.querySelector('.lp-ghost') === (Math.abs(st.by) > 8) && (Math.abs(st.by) <= 8 || !!panel.querySelector('.lp-row.is-slot')) && getComputedStyle(li).userSelect === 'none';
    document.dispatchEvent(new PointerEvent('pointerup', { ...o, clientY: o.clientY + st.by }));
    await sleep(40);
    const blocks = fe.model.sections[${F.section}].blocks;
    out.push({ held, rows: [...panel.querySelectorAll('li[data-layer]')].map((e) => names[ids.indexOf(e.dataset.layer)]), z: blocks.map((b) => b.layout.desktop.z) });
  }
  while (fe.canUndo) fe.undo();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return JSON.stringify(out); })()`);
const layerCase = (name, steps, remove) => {
  const got = layerRun(steps, remove);
  steps.forEach((st, k) => groupCases.push({ name: `layers ${name} ${k + 1}`, diffs: [JSON.stringify(got[k].rows) !== JSON.stringify(st.rows) && `rows: oracle ${st.rows}, ours ${got[k].rows}`, JSON.stringify(got[k].z) !== JSON.stringify(st.z) && `z: oracle ${st.z}, ours ${got[k].z}`, !got[k].held && 'no ghost and slot while held'].filter(Boolean) }));
};
{ const r = evalJs(S, `(async () => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="${HOLD_IDS[2]}"]'); b.scrollIntoView({ block: 'center' }); await sleep(150); fe.select(s.id, '${HOLD_IDS[2]}'); await sleep(30);
    document.querySelector('button[data-sc="layers"]').click(); await sleep(50);
    const p = document.getElementById('layers-panel').getBoundingClientRect(), li = document.querySelector('#layers-panel li[data-layer="${HOLD_IDS[2]}"]'), q = li.getBoundingClientRect(), st = getComputedStyle(li), ic = li.querySelector('.lp-icon svg').getBoundingClientRect(), n = li.querySelector('.lp-name').getBoundingClientRect();
    const out = { row: [q.left - p.left, q.width, q.height], bg: getComputedStyle(document.querySelector('#layers-panel li:not(.is-on)')).backgroundColor, radius: st.borderRadius, icon: [ic.left - q.left, ic.top - q.top, ic.width, ic.height], name: n.left - q.left, font: st.fontSize, fill: !!li.querySelector('.lp-icon rect[fill="currentColor"]') };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return JSON.stringify(out); })()`);
  groupCases.push({ name: 'layers row look', diffs: [JSON.stringify(r.row) !== '[11,218,44]' && `row ${r.row}`, r.bg !== 'rgb(249, 249, 249)' && r.bg, r.radius !== '6px' && r.radius, JSON.stringify(r.icon) !== '[17,11,22,22]' && `icon ${r.icon}`, r.name !== 50 && `name ${r.name}`, r.font !== '14px' && r.font, !r.fill && 'shape icon not filled'].filter(Boolean) }); }
layerCase('drags', LY.steps);
layerCase('with a hole', LY.hole.steps, LY.hole.removed);
// X2, G5: where a held block sits (HOLD.json). Every sweep is one hold in a section of its own.
const H = JSON.parse(readFileSync(new URL('../parity/findings/HOLD.json', import.meta.url)));
const area = (x) => x.split(' / ').map(Number);
const holdModel = (sw) => { const b = (id, a, z) => ({ id, type: 'shape', fill: '#d9d4ca', radius: '0', label: id, layout: { desktop: { area: area(a), z, justify: 'flex-start', align: 'flex-start' }, mobile: { area: area(a), z, justify: 'flex-start', align: 'flex-start' } } }); return { version: 1, title: 'hold', sections: [{ id: 'hold', theme: '', height: 'small', valign: 'top', gap: traces[0].section.gap, rowGap: traces[0].section.rowGap, rows: { desktop: sw.rowsD || 8, mobile: sw.rows || 6 }, blocks: [{ ...b('held', sw.area, 1), ...(sw.text ? { type: 'text', html: `<p>${sw.text}</p>` } : {}), ...(sw.image ? { type: 'image', src: '', empty: true } : {}) }, ...(sw.other ? [b('other', sw.other, 2)] : [])] }] }; };
const sweep = (sw, moves, release = 'pointercancel', handle = null) => evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  fe.load(${JSON.stringify(holdModel(sw))}); fe.setBp('${sw.view || 'desktop'}'); await sleep(120);
  W.scrollTo(0, 0); await sleep(30);
  const block = (id) => d.querySelector('.fe-block[data-block-id="' + id + '"]'); const b = block('held'), o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, ...${JSON.stringify(sw.mods || {})} };
  const mid = (e) => { const r = e.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; };
  fe.select('hold', 'held'); await sleep(30);
  ${sw.other ? `{ const c = { ...o, ...mid(block('other')), shiftKey: true }; block('other').dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); await sleep(30); }` : ''}
  const el = ${handle ? `d.querySelector('.fe-handle[data-dir="${handle}"]')` : 'b'}; const c = mid(el); ${sw.pressX !== undefined ? `c.clientX = el.getBoundingClientRect().left + ${sw.pressX};` : ''} const q0 = b.getBoundingClientRect(), bottom = () => d.querySelector('.fluid-engine').getBoundingClientRect().bottom;
  el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, ...c, buttons: 1 }));
  const go = (m) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: c.clientX + m[0], clientY: c.clientY + m[1], buttons: 1 }));
  ${sw.pre ? `go(${JSON.stringify(sw.pre)}); await sleep(15);` : ''}
  const out = [];
  for (const m of ${JSON.stringify(moves)}) { go(m); await sleep(25);
    const ring = d.querySelector('.fe-transform-indicator'), line = d.querySelector('.fe-center-line'), q = b.getBoundingClientRect(), l = line && W.getComputedStyle(line), other = block('other');
    out.push({ ring: ring ? W.getComputedStyle(ring).gridArea : null, bx: q.left - q0.left, by: q.top - q0.top, w: q.width, h: q.height, gapBelow: bottom() - q.bottom, otherTx: other ? other.getBoundingClientRect().left - ${sw.other ? `(() => { const a = fe.measure('hold'); return a.colStart[${area(sw.other || '0 / 1')[1] - 1}]; })()` : '0'} : null, feH: d.querySelector('.fluid-engine').getBoundingClientRect().height, line: !line || l.display === 'none' ? null : l.borderLeftStyle === 'solid' ? 'centered' : 'normal' }); }
  d.dispatchEvent(new W.PointerEvent('${release}', { ...o, buttons: 0 })); await sleep(30);
  const after = fe.model.sections[0].blocks.find((x) => x.id === 'held').layout['${sw.view || 'desktop'}'].area.join(' / ');
  fe.setBp('desktop'); return JSON.stringify({ out, after }); })()`);
for (const sw of H.sweeps) {
  const { out } = sweep(sw, sw.moves.map((m) => [m.dx, m.dy]), 'pointercancel', sw.handle || null);
  sw.moves.forEach((m, k) => {
    const g = out[k], name = `hold ${sw.name} ${m.dx},${m.dy}`;
    const diffs = [];
    if (g.ring !== m.ring) diffs.push(`ring: oracle ${m.ring}, ours ${g.ring}`);
    for (const key of ['bx', 'by', 'w', 'h', 'gapBelow', 'otherTx', 'feH']) if (m[key] !== undefined && !near(g[key], m[key])) diffs.push(`${key}: oracle ${m[key]}, ours ${g[key]}`);
    if (m.line !== undefined && g.line !== m.line) diffs.push(`line: oracle ${m.line}, ours ${g.line}`);
    // The right margin track's first 90px are rule T now (CAP-X2SIX.json): no longer a known miss.
    groupCases.push({ name, diffs, known: H.knownMisses.some((x) => x.sweep === sw.name && x.sweep !== 'from the right margin track' && x.at.includes(m.dx)) });
  });
}
// X2's table from the right margin track, held and moved like HOLD.json's sweep: the mirror on 4 (a Code, never resized), 12 and 13 wide, the left edge
// rule on 6 wide, resized or not (CAP-X2WIDTHS2.json B, CAP-X2WIDTHS3.json H and J, CAP-X2RESIZED.json), and 4, 5 and 6 wide pressed
// clear of the section toolbar (CAP-X2W456B.json R1, R2 agrees). The 6 wide's first 90px are rule T (CAP-X2SIX.json, pressed
// 30% in and on rows 8 to 14, a move right of 1px too).
for (const [file, tag, start] of [['CAP-X2WIDTHS2', 'B', 'B w12 middle coarse'], ['CAP-X2WIDTHS3', 'H', 'H w6 coarse'], ['CAP-X2WIDTHS3', 'J', 'J w13 middle coarse'], ['CAP-X2RESIZED', 'N4', 'N4 code'], ['CAP-X2RESIZED', 'R6', 'R6 shape'], ['CAP-X2W456B', 'R1 w5', 'R1 w5'], ['CAP-X2W456B', 'R1 w4', 'R1 w4'], ['CAP-X2W456B', 'R1 w6', 'R1 w6'], ['CAP-X2SIX', 'R1 A', 'R1 A'], ['CAP-X2SIX', 'R1 B', 'R1 B']]) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url))).reads;
  const at = F[`${start} start`].areas[0][0].replace(/\//g, ' / '), rings = Object.entries(F).filter(([k, v]) => k.startsWith(`${tag} `) && v.ring !== undefined);
  const { out } = sweep({ area: at, pre: [14, 0] }, rings.map(([, v]) => v.at)); // the capture's hold moves 14px first
  rings.forEach(([k, v], i) => { groupCases.push({ name: `hold ${file} ${k}`, diffs: out[i].ring !== v.ring ? [`ring: oracle ${v.ring}, ours ${out[i].ring}`] : [] }); });
}
// Rule T refit 1 at other frame widths, the same 6 wide pressed 30% in (CAP-X2TWIDTHS.json at 1280 and 1920, CAP-X2TREFIT.json at
// 1440, 1560, 1680 and 1760; R2 agrees on every ring). Refit 2 fits refit 1's 3 misses.
{ const miss = {};
  for (const file of ['CAP-X2TWIDTHS', 'CAP-X2TREFIT']) {
    const F2 = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url))).reads;
    for (const w of [...new Set(Object.keys(F2).map((k) => k.match(/^R1 w(\d+) /)?.[1]).filter(Boolean))]) {
      viewport(S, Number(w), 945); await pause(250);
      const rings = Object.entries(F2).filter(([k, v]) => k.startsWith(`R1 w${w} `) && v.ring !== undefined);
      const { out } = sweep({ area: '1 / 21 / 7 / 27', pre: [14, 0] }, rings.map(([, v]) => v.at));
      rings.forEach(([k, v], i) => { groupCases.push({ name: `hold ${file} ${k}`, diffs: out[i].ring !== v.ring ? [`ring: oracle ${v.ring}, ours ${out[i].ring}`] : [], ...(miss[k] ? { known: miss[k] } : {}) }); });
    }
  }
  // Refit 2, the last (CAP-X2T9.json, R2 agrees on every ring): 9 wide at 1600, 6 wide at 1545 and 1672, a 9 wide one line in from
  // the edge at 1760 (the setup drag stopped there, as ours does: the plain move rule), and a 3 wide on rows 8 to 14, built as read facts at 1600.
  const F9 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-X2T9.json', import.meta.url))).reads;
  const miss9 = { 'R1 w6 1545 -1': 'refit 2: M is 61.6, over one column, so it jumps to 19; the oracle keeps 21', 'R1 w6 1545 -20': 'refit 2: as at -1' };
  for (const tag of ['w9 1600', 'w9 1760', 'w6 1545', 'w6 1672', 'w3 rows8']) {
    viewport(S, tag === 'w3 rows8' ? 1600 : Number(tag.split(' ')[1]), 945); await pause(250);
    const at = F9[`R1 ${tag} start`].areas[0][0].replace(/\//g, ' / '), rings = Object.entries(F9).filter(([k, v]) => k.startsWith(`R1 ${tag} `) && v.ring !== undefined);
    const { out } = sweep({ area: at, pre: [14, 0], ...(tag === 'w3 rows8' ? { rowsD: 14 } : {}) }, rings.map(([, v]) => v.at));
    rings.forEach(([k, v], i) => { groupCases.push({ name: `hold CAP-X2T9 ${k}`, diffs: out[i].ring !== v.ring ? [`ring: oracle ${v.ring}, ours ${out[i].ring}`] : [], ...(miss9[k] ? { known: miss9[k] } : {}) }); });
  }
  viewport(S, F.window[0], F.window[1] + 55); await pause(250);
}
{ const r = sweep({ area: H.oneMove.before }, [H.oneMove.move], 'pointerup'); groupCases.push({ name: 'hold one move and a release', diffs: [r.out[0].ring !== null && 'a ring on the first move', r.after !== H.oneMove.after && `drop: ${r.after}`].filter(Boolean) }); }
{ const sw = { view: 'mobile', area: '1 / 2 / 7 / 10', pre: [-12, 0] }; for (const c of H.phoneResize) { const { out } = sweep(sw, [[c.dx, 0]], 'pointercancel', 'e'); groupCases.push({ name: `hold phone resize east ${c.dx}`, diffs: [out[0].ring !== c.ring && `ring: oracle ${c.ring}, ours ${out[0].ring}`, out[0].line !== c.line && `line: oracle ${c.line}, ours ${out[0].line}`].filter(Boolean) }); } }
// X7: Alt and Shift change nothing on a resize, shape or image (CAP-ALT.json, CAP-IMAGEMODS.json).
for (const [what, area0, after, extra] of [['shape', '2 / 15 / 12 / 25', '2 / 15 / 14 / 27', { rowsD: 11 }], ['image', '1 / 2 / 7 / 8', '1 / 2 / 9 / 10', { image: true }]]) for (const [mod, mods] of [['plain', {}], ['Alt', { altKey: true }], ['Shift', { shiftKey: true }]]) {
  const r = sweep({ area: area0, mods, pre: [12, 8], ...extra }, [[60, 40], [125, 75]], 'pointerup', 'se');
  groupCases.push({ name: `${mod} on a ${what} resize`, diffs: [r.after !== after && `drop: oracle ${after}, ours ${r.after}`].filter(Boolean) });
}
// X6: 8 handles with the same cursors on every block type (CAP-HANDLES.json), a 34px hit box, and so
// a press at the middle of a selected one-row Line is on a handle and 30 percent along is not (LINEHIT.json).
{ const got = evalJs(S, `(async () => { const sleep = (m) => new Promise((r) => setTimeout(r, m)); const out = {}; const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow;
    for (const [type, area, extra] of [['line', [1, 2, 2, 6], {}], ['shape', [1, 2, 7, 8], { fill: '#ccc' }], ['image', [1, 2, 7, 8], { src: '', empty: true }], ['form', [1, 2, 7, 8], {}], ['scrolling', [1, 2, 7, 8], {}], ['map', [1, 2, 7, 8], {}], ['social', [1, 2, 7, 8], {}], ['quote', [1, 2, 7, 8], {}], ['button', [1, 2, 3, 8], {}]]) {
      fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [{ id: 'k', type, label: 'k', layout: { desktop: { area, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } }, ...extra }] }] }); await sleep(80); fe.select('s', 'k'); await sleep(60);
      const hs = [...d.querySelectorAll('.fe-handle')]; const q = d.querySelector('.fe-block[data-block-id="k"]').getBoundingClientRect(); const on = (fx) => !!d.elementFromPoint(q.left + q.width * fx, q.top + q.height / 2)?.closest('.fe-handle');
      out[type] = { cursors: hs.map((h) => W.getComputedStyle(h).cursor).join(), size: hs[0] && hs[0].getBoundingClientRect().width, middle: on(0.5), along: on(0.3) }; }
    return JSON.stringify(out); })()`);
  const CUR = 'nw-resize,row-resize,ne-resize,col-resize,se-resize,row-resize,sw-resize,col-resize';
  for (const [type, g] of Object.entries(got)) groupCases.push({ name: `handles on ${type}`, diffs: [g.cursors !== CUR && `cursors ${g.cursors}`, g.size !== 34 && `hit box ${g.size}`, type === 'line' && !g.middle && 'the middle of a Line is not on a handle', g.along && 'a press 30 percent along is on a handle'].filter(Boolean) });
}
// X6 with the real mouse (LINEHIT.json): 30 percent along moves a selected one-row Line, the middle grows it, a click keeps it selected.
{ const load = async (area) => evalJs(S, `(async () => { fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [{ id: 'k', type: 'line', label: 'k', layout: { desktop: { area: ${JSON.stringify(area)}, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 80)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 60)); return JSON.stringify(1); })()`);
  const at = (fx) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('.fe-block[data-block-id="k"]').getBoundingClientRect(); return JSON.stringify({ x: q.left + b.left + b.width * ${fx}, y: q.top + b.top + b.height / 2 }); })()`);
  const area = () => evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.find((x) => x.id === 'k').layout.desktop.area.join('/'))`);
  const selected = () => evalJs(S, `JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('.fe-handle').length === 8)`);
  const press = async (fx, dx, dy) => { const p = at(fx); mouse(S, 'move', p.x, p.y); await pause(40); mouse(S, 'down', p.x, p.y, { buttons: 1 }); await pause(40); if (dx || dy) { mouse(S, 'move', p.x + dx / 2, p.y + dy / 2, { buttons: 1 }); await pause(40); mouse(S, 'move', p.x + dx, p.y + dy, { buttons: 1 }); await pause(60); } mouse(S, 'up', p.x + dx, p.y + dy); await pause(120); };
  await load([3, 4, 4, 8]); await press(0.3, 60, 50); const moved = area();
  await load([4, 5, 5, 9]); await press(0.5, 60, 50); const grown = area();
  await load([1, 2, 2, 6]); await press(0.3, 0, 0); const one = selected(); await pause(500); await press(0.3, 0, 0); const two = selected();
  groupCases.push({ name: 'a selected Line: moved, grown, clicked', diffs: [moved !== '4/5/5/9' && `30 percent along: oracle 4/5/5/9, ours ${moved}`, grown !== '4/5/6/9' && `the middle: oracle 4/5/6/9, ours ${grown}`, !one && 'a click deselected it', !two && 'a second click deselected it'].filter(Boolean) });
}
// X11 with real touch events and a pen (TOUCHHOLD.json), on a page that scrolls.
{ const area0 = [1, 2, 7, 8];
  const load = async () => { evalJs(S, `(async () => { const sec = (id, blocks) => ({ id, theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 6 }, blocks }); fe.load({ version: 1, title: 't', sections: [sec('s', [{ id: 'k', type: 'shape', label: 'k', fill: '#ccc', layout: { desktop: { area: ${JSON.stringify(area0)}, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]), sec('t', []), sec('u', [])] }); fe.select(null); await new Promise((r) => setTimeout(r, 80)); document.getElementById('site-frame').contentWindow.scrollTo(0, 0); window.__c = 0; const d = document.getElementById('site-frame').contentDocument; if (!d.__x11) { d.__x11 = true; d.addEventListener('pointercancel', () => { window.__c++; }, true); d.addEventListener('pointerdown', (e) => { window.__t0 = e.timeStamp; window.__gap = null; }, true); d.addEventListener('pointermove', (e) => { if (window.__gap === null) window.__gap = e.timeStamp - window.__t0; }, true); } return JSON.stringify(1); })()`); await pause(100); };
  const at = (fx, fy) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('.fe-block[data-block-id="k"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width * ${fx}, q.top + b.top + b.height * ${fy}]); })()`);
  const area = () => evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.find((x) => x.id === 'k').layout.desktop.area.join('/'))`);
  const handles = () => evalJs(S, `JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('.fe-handle').length)`);
  const cancels = () => evalJs(S, `JSON.stringify(window.__c)`);
  const touch = (p, dx, dy, holdMs = 0) => cdp(S, { op: 'touch', from: p, to: [p[0] + dx, p[1] + dy], steps: 12, holdMs });
  const walk = [[70, 0, 0, '1/3/7/9'], [125, 0, 0, '1/4/7/10'], [150, 0, 0, '1/4/7/10'], [200, 0, 0, '1/2/7/8', true], [200, 0, 30, '1/2/7/8', true], [200, 0, 60, '1/2/7/8', true], [200, 0, 100, '1/5/7/11'], [200, 0, 800, '1/5/7/11'], [0, 125, 0, '4/2/10/8'], [0, 200, 0, '1/2/7/8', true]];
  // A cancel needs a first move inside the hold. On a busy machine the press can sit past it, and
  // that run tests nothing: read the real gap, try again, and say so if it never came.
  const touchCase = async (name, want, cancelled, press) => {
    for (let tries = 0; tries < 3; tries++) {
      await press(); await pause(150);
      if (cancelled && evalJs(S, `JSON.stringify(window.__gap)`) >= 100) continue;
      groupCases.push({ name, diffs: [area() !== want && `oracle ${want}, ours ${area()}`, (cancels() > 0) !== !!cancelled && `cancelled: oracle ${!!cancelled}, ours ${cancels() > 0}`].filter(Boolean) });
      return;
    }
    console.log(`NOT RUN ${name}: the first move came after the hold, 3 times`);
  };
  for (const [dx, dy, hold, want, cancelled] of walk) await touchCase(`touch ${dx},${dy} after ${hold} ms`, want, cancelled, async () => { await load(); touch(at(0.5, 0.5), dx, dy, hold); });
  await load(); { const p = at(0.5, 0.5); touch(p, 0, 0); await pause(150); }
  groupCases.push({ name: 'a tap selects', diffs: [handles() !== 8 && `${handles()} handles`, area() !== '1/2/7/8' && area()].filter(Boolean) });
  touch(at(1, 1), 70, 70); await pause(150); const h1 = area(), s1 = handles(); touch(at(1, 1), 125, 75); await pause(150); const h2 = area();
  groupCases.push({ name: 'a touch on a handle resizes', diffs: [h1 !== '1/2/9/9' && `oracle 1/2/9/9, ours ${h1}`, h2 !== '1/2/11/11' && `oracle 1/2/11/11, ours ${h2}`, s1 !== 8 && 'not selected after'].filter(Boolean) });
  // At 20 px a move a handle needs the hold a body needs (CAP-X11FAST.json).
  for (const [fx, fy, dx, dy, hold, want, cancelled] of [[1, 0.5, 240, 0, 0, '1/2/7/8', true], [1, 0.5, 240, 0, 60, '1/2/7/8', true], [1, 0.5, 240, 0, 100, '1/2/7/12'], [1, 0.5, 240, 0, 300, '1/2/7/12'], [0.5, 1, 0, 240, 0, '1/2/7/8', true], [0.5, 1, 0, 240, 100, '1/2/13/8'], [1, 0.5, -240, 0, 0, '1/2/7/8', true], [1, 0.5, -120, 0, 100, '1/2/7/6']]) {
    await touchCase(`touch on a handle ${dx},${dy} after ${hold} ms`, want, cancelled, async () => { await load(); evalJs(S, `fe.select('s', 'k')`); await pause(80); touch(at(fx, fy), dx, dy, hold); });
  }
  await load(); { const p = at(1, 0); touch([p[0] + 300, p[1] + 60], 70, 70); await pause(150); }
  groupCases.push({ name: 'a touch on the empty grid', diffs: [area() !== '1/2/7/8' && area(), cancels() !== 1 && `${cancels()} cancels`, handles() !== 0 && 'selected'].filter(Boolean) });
  await load(); { const p = at(0.5, 0.5); cdp(S, { op: 'drag', from: p, to: [p[0] + 200, p[1]], steps: 12, holdMs: 150, pointerType: 'pen' }); await pause(150); }
  groupCases.push({ name: 'a pen drags', diffs: [area() !== '1/5/7/11' && `oracle 1/5/7/11, ours ${area()}`, cancels() !== 0 && 'cancelled'].filter(Boolean) });
  await load(); evalJs(S, `fe.select('s', 'k')`); await pause(80); { const p = at(1, 1); cdp(S, { op: 'drag', from: p, to: [p[0] + 70, p[1] + 70], steps: 12, holdMs: 150, pointerType: 'pen' }); await pause(150); }
  groupCases.push({ name: 'a pen on a handle resizes', diffs: [area() !== '1/2/9/9' && `oracle 1/2/9/9, ours ${area()}`].filter(Boolean) });
}
// R2, R3: when stretched rows normalize and what they become, at 800px (CAP-NORMALIZE.json, CAP-HELDNORMAL.json).
{ const N = JSON.parse(readFileSync(new URL('../parity/findings/CAP-NORMALIZE.json', import.meta.url))).reads, H = JSON.parse(readFileSync(new URL('../parity/findings/CAP-HELDNORMAL.json', import.meta.url))).reads;
  const load = async () => { viewport(S, 800, 900); goto(S, `${BASE}/index.html?replay`); waitFor(S, '(() => !!window.fe)()', 20); await pause(500); evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.querySelector('[data-section-id="' + fe.model.sections[3].id + '"]').scrollIntoView({ block: 'center' }); return 1; })()`); await pause(120); };
  const read = () => evalJs(S, `JSON.stringify({ rows: fe.model.sections[3].rows.desktop, areas: fe.model.sections[3].blocks.map((b) => b.layout.desktop.area.join('/')) })`);
  const kid = () => evalJs(S, `JSON.stringify(fe.model.sections[3].blocks.find((b) => b.layout.desktop.area.join('/') === '4/2/7/12').id)`);
  const at = (k, fx, fy) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('.fe-block[data-block-id="${k}"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width * ${fx}, q.top + b.top + b.height * ${fy}]); })()`);
  const same = (name, got, want) => groupCases.push({ name: `normalize: ${name}`, diffs: [got.rows !== want.section.rows && `rows: oracle ${want.section.rows}, ours ${got.rows}`, ...got.areas.map((x, i) => x !== want.areas[i][0] && `block ${i}: oracle ${want.areas[i][0]}, ours ${x}`)].filter(Boolean) });
  const press = async (p, dx, dy, hold) => { mouse(S, 'move', p[0], p[1]); await pause(40); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(40); for (const f of [1 / 3, 2 / 3, 1]) { mouse(S, 'move', p[0] + dx * f, p[1] + dy * f, { buttons: 1 }); await pause(50); } await pause(80); if (hold) await hold(); };
  await load(); let k = kid();
  evalJs(S, `fe.select(fe.model.sections[3].id, '${k}')`); await pause(150); same('select', read(), N['select 1 after']);
  evalJs(S, `fe.select(null); fe.edit(fe.model.sections[3].id, '${k}')`); await pause(150); same('edit start', read(), N['edit start after']);
  evalJs(S, 'fe.finishEdit()'); await pause(150); same('edit left', read(), N['edit left']);
  await load(); k = kid(); { const p = at(k, 0.5, 0.5); await press(p, 60, 0, () => same('held 60 right', read(), H['held 60 right'])); mouse(S, 'move', p[0], p[1], { buttons: 1 }); await pause(60); mouse(S, 'up', p[0], p[1]); await pause(200); same('dropped home', read(), H['dropped home']); }
  await load(); k = kid(); { const p = at(k, 0.5, 0.5); await press(p, 60, 0); mouse(S, 'up', p[0] + 60, p[1]); await pause(200); same('dragged 60 right', read(), N['dragged 60 right']); }
  await load(); k = kid(); evalJs(S, `fe.select(fe.model.sections[3].id, '${k}')`); await pause(120); { const p = at(k, 1, 1); await press(p, 24, 24); mouse(S, 'move', p[0], p[1], { buttons: 1 }); await pause(60); mouse(S, 'up', p[0], p[1]); await pause(200); same('resize home', read(), N['resize dropped home']); }
  await load(); k = kid(); evalJs(S, `fe.select(fe.model.sections[3].id, '${k}')`); await pause(120); evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); return 1; })()`); await pause(200); same('arrow key', read(), N['arrow key after']);
  // A second section, on a phone (NORMALPHONE.json).
  const P = JSON.parse(readFileSync(new URL('../parity/findings/NORMALPHONE.json', import.meta.url))); const para = (w) => `<p>${w} paragraph with enough words to wrap across a few lines in a narrow column of the grid.</p>`;
  viewport(S, 1600, 1000); await pause(120);
  evalJs(S, `(async () => { const bl = (id, type, d, m, extra) => ({ id, type, label: id, layout: { desktop: { area: d, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: m, z: 1, justify: 'flex-start', align: 'flex-start' } }, ...extra }); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 11, mobile: 10 }, blocks: [bl('t', 'text', [1, 2, 6, 10], [1, 2, 3, 10], { html: ${JSON.stringify(para('First') + para('Second') + para('Third'))} }), bl('h', 'text', [1, 2, 6, 10], [3, 2, 5, 10], { html: '<h3>A short one</h3>' }), bl('k', 'shape', [4, 2, 10, 8], [5, 2, 11, 10], { fill: '#ccc' })] }] }); fe.setBp('mobile'); await new Promise((r) => setTimeout(r, 200)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 80)); const d = document.getElementById('site-frame').contentDocument; d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); return 1; })()`); await pause(250);
  const ph = evalJs(S, `JSON.stringify({ rows: fe.model.sections[0].rows.mobile, a: fe.model.sections[0].blocks.map((b) => b.layout.mobile.area.join('/')) })`); const wp = P.reads['phone arrow'];
  groupCases.push({ name: 'normalize: a second section on a phone', diffs: [ph.rows !== wp.rows && `rows: oracle ${wp.rows}, ours ${ph.rows}`, ...['t', 'h', 'k'].map((n, i) => ph.a[i] !== wp.a[n][0] && `${n}: oracle ${wp.a[n][0]}, ours ${ph.a[i]}`)].filter(Boolean) });
  evalJs(S, `fe.setBp('desktop')`); viewport(S, 1600, 1000);
}
// L6, S1: what is stored per layout (PERLAYOUT.json).
{ const load = async (type) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'middle', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [{ id: 'k', type: '${type}', label: 'k', fill: '#ccc', html: '<p>Some text</p>', layout: { desktop: { area: [1, 2, 7, 8], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); return 1; })()`); await pause(120); };
  const view = async (bp) => { evalJs(S, `(async () => { fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 120)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 80)); if (document.getElementById('block-panel').hidden) document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60); };
  const set = async (k, v) => { evalJs(S, `(() => { const i = document.querySelector('#block-panel input[data-design="${k}"]'); if (i.type === 'checkbox') i.checked = ${JSON.stringify(v)}; else i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`); await pause(120); };
  const look = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), W = f.contentWindow, e = f.contentDocument.querySelector('.fe-block[data-block-id="k"]'), c = W.getComputedStyle(e), q = W.getComputedStyle(e.querySelector('.sqs-block')); const v = (k) => document.querySelector('#block-panel input[data-design="' + k + '"]'); return JSON.stringify({ op: c.opacity, tf: c.transform.slice(0, 16), bd: c.backdropFilter, bg: q.backgroundColor, bw: q.borderTopWidth + ' ' + q.borderTopStyle, blend: c.mixBlendMode, panel: [parseFloat(v('opacity')?.value), parseFloat(v('rotate')?.value), !!v('background')?.checked, !!v('blur')?.checked].join() }); })()`);
  const M = { r20: 'matrix(0.939693,', r5: 'matrix(0.996195,', r30: 'matrix(0.866025,', r40: 'matrix(0.766044,' };
  const check = (name, got, want) => groupCases.push({ name: `per layout: ${name}`, diffs: Object.entries(want).filter(([k, v]) => got[k] !== v).map(([k, v]) => `${k}: oracle ${v}, ours ${got[k]}`) });
  await load('text'); await view('mobile'); await set('opacity', '50'); await set('rotate', '20'); await set('background', true); await set('blur', true);
  check('phone set', look(), { op: '0.5', tf: M.r20, bd: 'blur(15px)', bg: 'rgb(255, 255, 255)', panel: '50,20,true,true' });
  await view('desktop'); check('desktop sees none of it', look(), { op: '1', tf: 'none', bd: 'none', bg: 'rgba(0, 0, 0, 0)', panel: '100,0,false,false' });
  await set('opacity', '80'); await set('rotate', '5'); check('desktop set', look(), { op: '0.8', tf: M.r5, panel: '80,5,false,false' });
  await view('mobile'); check('phone keeps its own', look(), { op: '0.5', tf: M.r20, bd: 'blur(15px)', panel: '50,20,true,true' });
  await load('text'); await view('desktop'); await set('rotate', '30'); await view('mobile'); check('desktop flows down', look(), { op: '1', tf: M.r30, panel: '100,30,false,false' });
  await set('opacity', '50'); check('one phone value', look(), { op: '0.5', tf: M.r30, panel: '50,30,false,false' });
  await view('desktop'); check('desktop keeps its opacity', look(), { op: '1', tf: M.r30 }); await set('rotate', '40'); await set('background', true);
  await view('mobile'); check('later desktop values flow too', look(), { op: '0.5', tf: M.r40, bg: 'rgb(255, 255, 255)', panel: '50,40,true,false' });
  await load('text'); await view('mobile'); evalJs(S, `(() => { document.querySelector('#block-panel [data-dset="stroke"][data-v="solid"]').click(); return 1; })()`); await pause(150); check('phone stroke', look(), { bw: '2px solid' }); await view('desktop'); check('desktop has no stroke', look(), { bw: '0px none' });
  await load('shape'); await view('mobile'); evalJs(S, `(async () => { document.querySelector('#block-panel [data-blend-toggle]').click(); await new Promise((r) => setTimeout(r, 80)); document.querySelector('#block-panel [data-blend="multiply"]').click(); return 1; })()`); await pause(200); check('phone blend', look(), { blend: 'multiply' }); await view('desktop'); check('desktop blend', look(), { blend: 'normal' }); await view('mobile'); check('phone blend again', look(), { blend: 'multiply' });
  await load('text'); evalJs(S, `fe.setBp('mobile')`); await pause(120);
  const sec = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), s = f.contentDocument.querySelector('section[data-section-id="s"]'), g = f.contentWindow.getComputedStyle(s.querySelector('.fluid-engine')); return JSON.stringify({ cls: [...s.classList].filter((x) => /section-height|vertical-align/.test(x)).join(' '), theme: s.getAttribute('data-section-theme'), gap: g.columnGap + ' ' + g.rowGap, rows: fe.model.sections[0].rows }); })()`);
  const rows0 = sec().rows; evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('section[data-section-id="s"]').getBoundingClientRect(); return JSON.stringify(1); })()`);
  const box = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('section[data-section-id="s"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width / 2, q.top + b.top + b.height - 8]); })()`); mouse(S, 'move', box[0], box[1]); await pause(200);
  evalJs(S, `(async () => { const w = (r) => new Promise((x) => setTimeout(x, r)); document.querySelector('#section-chrome [data-sc="edit"]').click(); await w(150); const c = (a, v) => document.querySelector('#section-panel button[data-sact="' + a + '"][data-v="' + v + '"]').click(); c('gap', 'zero'); await w(60); c('height', 'small'); await w(60); c('valign', 'top'); await w(60); c('tab', 'Colors'); await w(80); c('theme', 'dark'); await w(100); return 1; })()`); await pause(150);
  const onPhone = sec(); evalJs(S, `fe.setBp('desktop')`); await pause(150); const onDesk = sec(); const want = { cls: 'section-height--small vertical-alignment--top', theme: 'dark', gap: '0px 0px' };
  for (const [name, got] of [['phone', onPhone], ['desktop', onDesk]]) groupCases.push({ name: `section settings on ${name}`, diffs: Object.entries(want).filter(([k, v]) => got[k] !== v).map(([k, v]) => `${k}: oracle ${v}, ours ${got[k]}`) });
  groupCases.push({ name: 'section rows stay per layout', diffs: [onDesk.rows.desktop !== rows0.desktop && 'desktop rows changed'].filter(Boolean) });
}
// L5: hide on one layout (CAP-HIDETYPES.json, CAP-HIDDENEYE.json).
{ const bl = (id, type, d, m, extra = {}) => ({ id, type, label: id, layout: { desktop: { area: d, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: m, z: 1, justify: 'flex-start', align: 'flex-start' } }, ...extra });
  const load = async (blocks, rows) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: ${JSON.stringify(rows)}, blocks: ${JSON.stringify(blocks)} }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60); };
  const menu = (id, act) => evalJs(S, `(async () => { const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const e = d.querySelector('.fe-block[data-block-id="${id}"]'), q = e.getBoundingClientRect(); e.querySelector('*').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 5, clientY: q.top + 5, button: 2 })); await new Promise((r) => setTimeout(r, 60)); [...document.querySelectorAll('#context-menu [role=menuitem], #context-menu button')].find((x) => x.textContent.trim().startsWith('${act}')).click(); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
  const read = (id) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, q = d.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify({ rows: fe.model.sections[0].rows, w: Math.round(q.width), h: Math.round(q.height), handles: d.querySelectorAll('.fe-handle').length, undo: fe.canUndo }); })()`);
  const phone = async () => { evalJs(S, `fe.setBp('mobile')`); await pause(200); };
  const F = JSON.parse(readFileSync(new URL('../parity/findings/CAP-HIDETYPES.json', import.meta.url))).reads;
  const im = bl('i', 'image', [1, 2, 7, 8], [1, 2, 7, 10], { src: '', empty: true }), bu = bl('b', 'button', [1, 2, 3, 8], [7, 2, 9, 10]), li = bl('l', 'line', [1, 2, 2, 6], [9, 2, 10, 10]);
  await load([im], { desktop: 8, mobile: 6 }); menu('i', 'Hide on desktop'); const h = read('i');
  groupCases.push({ name: 'hide on desktop', diffs: [h.w !== 0 && `width ${h.w}`, h.rows.desktop !== F['Image hidden on desktop'].section.rows && `rows ${h.rows.desktop}`, h.handles && 'still selected', !h.undo && 'no undo step'].filter(Boolean) });
  evalJs(S, 'fe.undo()'); await pause(150); const u = read('i'); groupCases.push({ name: 'hide is one undo step', diffs: [u.w === 0 && 'still hidden', u.undo && 'another step left'].filter(Boolean) });
  for (const [name, blocks, rows, id, want] of [['Image', [im], { desktop: 8, mobile: 6 }, 'i', F['Image phone view']], ['Button', [im, bu], { desktop: 8, mobile: 8 }, 'b', F['Button phone view']], ['Line', [im, bu, li], { desktop: 8, mobile: 9 }, 'l', F['Line phone view']], ['Form', [{ ...im, layout: { ...im.layout, mobile: { ...im.layout.mobile, area: [17, 2, 23, 10] } } }, { ...bu, layout: { ...bu.layout, mobile: { ...bu.layout.mobile, area: [23, 2, 25, 10] } } }, { ...li, layout: { ...li.layout, mobile: { ...li.layout.mobile, area: [25, 2, 26, 10] } } }, bl('f', 'form', [1, 2, 17, 11], [1, 2, 17, 10])], { desktop: 16, mobile: 25 }, 'f', F['Form phone view']]]) {
    await load(blocks, rows); menu(id, 'Hide on mobile'); const d0 = read(id); await phone(); const p = read(id);
    groupCases.push({ name: `hide ${name} on mobile`, diffs: [d0.w === 0 && 'gone on desktop', p.w !== 0 && `phone width ${p.w}`, p.rows.mobile !== want.section.rows && `phone rows: oracle ${want.section.rows}, ours ${p.rows.mobile}`].filter(Boolean) });
  }
  await load([im], { desktop: 8, mobile: 6 }); evalJs(S, `fe.select('s', 'i')`); await pause(80); evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', metaKey: true, shiftKey: true, bubbles: true, cancelable: true })); return 1; })()`); await pause(150); groupCases.push({ name: 'Cmd+Shift+H hides on desktop', diffs: [read('i').w !== 0 && 'not hidden'].filter(Boolean) });
  const box = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('section[data-section-id="s"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width / 2, q.top + b.top + 60]); })()`); mouse(S, 'move', box[0], box[1]); await pause(200);
  const eye = () => evalJs(S, `JSON.stringify([...document.querySelectorAll('.lp-eye')].map((e) => e.getAttribute('aria-label')).join())`);
  evalJs(S, `(async () => { document.querySelector('[data-sc="layers"]').click(); await new Promise((r) => setTimeout(r, 200)); return 1; })()`); const e0 = eye(), grey = evalJs(S, `JSON.stringify(document.querySelector('.lp-row').classList.contains('is-hidden'))`);
  evalJs(S, `(async () => { document.querySelector('.lp-eye').click(); await new Promise((r) => setTimeout(r, 200)); return 1; })()`); const e1 = eye(), back = read('i');
  groupCases.push({ name: 'the eye in Layers', diffs: [e0 !== 'Display Block' && `hidden: oracle Display Block, ours ${e0}`, !grey && 'row not grey', e1 !== 'Hide Block' && `shown: oracle Hide Block, ours ${e1}`, back.w === 0 && 'not back', back.handles && 'selected after'].filter(Boolean) });
  evalJs(S, `(() => { document.querySelector('[data-sc="layers"]').click(); return 1; })()`); await pause(100);
}
// Y4: Copy and Paste keep the oracle's places (CAP-COPYPASTE.json, CAP-SYNTHCLIP.json): one row down and one column right, on top.
{ const bl = (id, type, d, m) => ({ id, type, label: id, layout: { desktop: { area: d, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: m, z: 1, justify: 'flex-start', align: 'flex-start' } } });
  const sec = (id, blocks) => ({ id, theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks });
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [${JSON.stringify(sec('s', [bl('b', 'button', [1, 2, 3, 8], [1, 2, 3, 10]), bl('l', 'line', [1, 2, 2, 6], [3, 2, 4, 10])]))}, ${JSON.stringify(sec('t', [bl('m', 'line', [1, 2, 2, 6], [1, 2, 2, 10])]))}] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60);
  const menu = (id, act) => evalJs(S, `(async () => { const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const e = d.querySelector('.fe-block[data-block-id="${id}"]'), q = e.getBoundingClientRect(); e.querySelector('*').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 5, clientY: q.top + 5, button: 2 })); await new Promise((r) => setTimeout(r, 60)); [...document.querySelectorAll('#context-menu button')].find((x) => x.textContent.trim().startsWith('${act}')).click(); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
  const last = (i) => evalJs(S, `(() => { const b = [...fe.model.sections[${i}].blocks].sort((x, y) => y.layout.mobile.area[0] - x.layout.mobile.area[0])[0]; return JSON.stringify([b.layout.desktop.area.join('/'), b.layout.mobile.area.join('/'), fe.model.sections[${i}].blocks.length]); })()`);
  const keys = (code) => evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '${code.slice(-1).toLowerCase()}', metaKey: true, bubbles: true, cancelable: true })); return 1; })()`);
  const want = (name, got, wa) => groupCases.push({ name: `Y4 ${name}`, diffs: JSON.stringify(got) === JSON.stringify(wa) ? [] : [`oracle ${JSON.stringify(wa)}, ours ${JSON.stringify(got)}`] });
  menu('b', 'Copy'); want('copy changes nothing', last(0), ['1/2/2/6', '3/2/4/10', 2]);
  menu('b', 'Paste'); want('pasted on the source', last(0), ['2/3/4/9', '4/2/6/10', 3]);
  menu('b', 'Paste'); want('pasted again', last(0), ['3/4/5/10', '6/2/8/10', 4]);
  evalJs(S, 'fe.undo()'); await pause(150); want('one undo', last(0), ['2/3/4/9', '4/2/6/10', 3]);
  menu('m', 'Paste'); want('pasted in another section', last(1), ['1/2/3/8', '2/2/4/10', 2]);
  evalJs(S, `(() => { fe.select(null); fe.select('s', 'b'); return 1; })()`); await pause(80); keys('KeyC'); evalJs(S, `fe.select('t', 'm')`); await pause(80); keys('KeyV'); await pause(150); want('Cmd+V on a selected block', last(1), ['2/3/4/9', '4/2/6/10', 3]);
  // U11: the clip outlasts a reload; back on a page without the source, Cmd+V adds it where it was, or one on (CAP-U11RELOAD.json).
  goto(S, `${BASE}/index.html?replay`); await pause(1500);
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [${JSON.stringify(sec('s', [bl('l', 'line', [1, 2, 2, 6], [1, 2, 2, 10])]))}] }); await new Promise((r) => setTimeout(r, 200)); return 1; })()`); await pause(100);
  const over = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('section[data-section-id="s"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width * 0.7, q.top + b.top + 60]); })()`); mouse(S, 'move', over[0], over[1]); await pause(150);
  keys('KeyV'); await pause(150); want('after a reload, Cmd+V with nothing selected', last(0), ['1/2/3/8', '2/2/4/10', 2]);
  evalJs(S, `fe.select('s', 'l')`); await pause(80); keys('KeyV'); await pause(150); want('after a reload, Cmd+V on a selected block', last(0), ['2/3/4/9', '4/2/6/10', 3]);
}
// E7: the link editor's list, Hidden Navigation and Open link in new tab (LINKBOX.json, CAP-LINK.json).
{ const bl = (id, type, extra) => ({ id, type, label: id, ...extra, layout: { desktop: { area: [1, 2, 3, 8], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } });
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', header: { nav: [{ label: 'Services' }, { label: 'About' }, { label: 'Contact' }] }, sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [${JSON.stringify(bl('b', 'button'))}] }] }); await new Promise((r) => setTimeout(r, 120)); fe.select('s', 'b'); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60);
  const r = evalJs(S, `(async () => { const sleep = (t) => new Promise((x) => setTimeout(x, t)); const P = document.getElementById('link-popover'), a = () => document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="b"] a'), B = () => fe.model.sections[0].blocks.find((x) => x.id === 'b'); const out = {};
    const open = async () => { document.querySelector('#block-toolbar button[data-tb="link"]').click(); await sleep(120); }; const inp = () => P.querySelector('.lk-input'); const list = () => P.querySelector('.lk-pages'); const showing = () => [...P.querySelectorAll('.lk-page:not([hidden])')].map((x) => x.getAttribute('aria-label')); const onBox = () => { const q = P.querySelector('.lk-newtab').getBoundingClientRect(); return !!document.elementFromPoint(q.left + 10, q.top + q.height / 2)?.closest('.lk-newtab'); };
    const key = (k) => inp().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await open(); out.groups = [...P.querySelectorAll('.lk-set:not([hidden]) .lk-group')].map((x) => x.textContent); out.pages = showing(); out.coveredOpen = !onBox(); out.focus = document.activeElement === inp(); out.size = [P.getBoundingClientRect().width, Math.round(P.getBoundingClientRect().height)];
    inp().value = '/about'; inp().dispatchEvent(new Event('input', { bubbles: true })); await sleep(50); out.typed = showing(); out.typedGroups = [...P.querySelectorAll('.lk-set:not([hidden]) .lk-group')].map((x) => x.textContent);
    key('Enter'); await sleep(150); out.enter = { href: B().href, open: !P.hidden, list: list().hidden, focus: document.activeElement === inp(), box: onBox(), attr: a().hasAttribute('target') };
    P.querySelector('.lk-box').click(); await sleep(150); out.tick = { model: B().newTab, target: a().getAttribute('target'), open: !P.hidden };
    key('Escape'); await sleep(80); out.escape = P.hidden;
    await open(); P.querySelector('[data-link-box="edit"]').click(); await sleep(60); out.reopen = { checked: P.querySelector('.lk-box').checked, value: inp().value, list: list().hidden, covered: !onBox() };
    [...P.querySelectorAll('.lk-page')].find((x) => x.getAttribute('aria-label') === 'About/about').click(); await sleep(120); P.querySelector('.lk-box').click(); await sleep(120); out.untick = { model: B().newTab ?? false, target: a().hasAttribute('target') };
    inp().value = ''; inp().dispatchEvent(new Event('input', { bubbles: true })); await sleep(40); [...P.querySelectorAll('.lk-page')].find((x) => x.getAttribute('aria-label') === 'Home/home').click(); await sleep(120); out.page = { href: B().href, open: !P.hidden, value: inp().value, list: list().hidden };
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await sleep(50); out.outside = P.hidden;
    return JSON.stringify(out); })()`);
  const lk = (name, ok, got) => groupCases.push({ name: `E7 ${name}`, diffs: ok ? [] : [JSON.stringify(got)] });
  lk('the list groups', r.groups.join() === 'Main Navigation,Hidden Navigation' && r.pages.join() === 'Services/services,About/about,Contact/contact,Home/home', [r.groups, r.pages]);
  lk('the list covers the box, field focused', r.coveredOpen && r.focus && r.size[0] === 320 && r.size[1] === 167, r);
  lk('typing narrows the list', r.typed.join() === 'About/about' && r.typedGroups.join() === 'Main Navigation', [r.typed, r.typedGroups]);
  lk('Enter sets the link and stays open', r.enter.href === '/about' && r.enter.open && r.enter.list && r.enter.focus && r.enter.box && !r.enter.attr, r.enter);
  lk('the box on a button', r.tick.model === true && r.tick.target === '_blank' && r.tick.open && r.escape, [r.tick, r.escape]);
  lk('opened again, Edit: ticked, no list', r.reopen.checked && r.reopen.value === '/about' && r.reopen.list && !r.reopen.covered, r.reopen);
  lk('unticking', r.untick.model === false && !r.untick.target, r.untick);
  lk('a page sets the link and stays open', r.page.href === '/home' && r.page.open && r.page.value === '/home' && r.page.list, r.page);
  lk('a click elsewhere closes', r.outside === true, r.outside);
  // The box a linked Button opens, walked with real keys and presses against the reads. Keys back to it are not read.
  for (const name of ['CAP-E7REOPEN', 'CAP-E7REOPEN2', 'CAP-E7REOPEN3', 'CAP-E7REOPEN4', 'CAP-E7SCORE', 'CAP-E7BOX', 'CAP-E7BOX2']) await replayLinkBox(S, JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url))), (read, diffs) => groupCases.push({ name: `E7 ${name} ${read}`, diffs }));
  // A linked Stack opens the same box, by real presses (CAP-E7BOX2.json): the editor, typed, Enter closes it, then the box,
  // then a press closes it. And a press on the box's row opens the link in a new tab (read from the browser's tabs there).
  { const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-E7BOX2.json', import.meta.url))).reads;
    const shape = (id, c) => ({ id, type: 'shape', label: id, fill: '#ccc', layout: { desktop: { area: [1, c, 7, c + 6], z: 1, justify: 'center', align: 'center' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'center', align: 'center' } } });
    const page = (blocks) => evalJs(S, `(async () => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 10, mobile: 24 }, blocks: ${JSON.stringify(blocks)} }] }); await new Promise((r) => setTimeout(r, 150)); return 1; })()`);
    const lnk = '#block-toolbar [data-tb="link"]';
    const sees = (read) => { const was = oracleSees(R, read), ours = evalJs(S, SEE); return ['view', 'row', 'focus', 'value', 'list', 'copy', 'clear'].filter((k) => JSON.stringify(was[k]) !== JSON.stringify(ours[k])).map((k) => `${k}: oracle ${JSON.stringify(was[k])}, ours ${JSON.stringify(ours[k])}`); };
    page([shape('l', 2), shape('m', 9)]);
    evalJs(S, `(async () => { fe.select('s', 'l'); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const r = d.querySelector('.fe-block[data-block-id="m"]').getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, shiftKey: true, clientX: r.left + 20, clientY: r.top + 20 }; d.elementFromPoint(r.left + 20, r.top + 20).dispatchEvent(new W.PointerEvent('pointerdown', o)); d.dispatchEvent(new W.PointerEvent('pointerup', o)); await new Promise((res) => setTimeout(res, 120)); return 1; })()`);
    browser(S, 'click', '#block-toolbar [data-tb="stack"]'); await pause(300);
    const isStack = evalJs(S, `(() => JSON.stringify(fe.model.sections[0].blocks.some((b) => b.type === 'stack')))()`);
    groupCases.push({ name: 'E7 Stack: two Shapes stacked', diffs: isStack ? [] : ['no stack'] });
    browser(S, 'click', lnk); await pause(200);
    groupCases.push({ name: 'E7 Stack: the editor', diffs: sees('stack editor') });
    cdp(S, { op: 'presses', keys: [...'a.com/some/path'] }); await pause(150);
    groupCases.push({ name: 'E7 Stack: typed', diffs: sees('stack typed') });
    browser(S, 'press', 'Enter'); await pause(200);
    groupCases.push({ name: 'E7 Stack: Enter closes it', diffs: sees('stack after Enter') });
    browser(S, 'click', lnk); await pause(200);
    groupCases.push({ name: 'E7 Stack: reopened, the box', diffs: sees('stack reopened 1') });
    browser(S, 'click', lnk); await pause(200);
    groupCases.push({ name: 'E7 Stack: a press closes it', diffs: sees('stack reopened 2') });
    page([{ id: 'b', type: 'button', label: 'Learn more', href: 'https://a.com/some/path', layout: { desktop: { area: [1, 2, 3, 8], z: 1, justify: 'center', align: 'center' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'center', align: 'center' } } }]);
    evalJs(S, `(() => { fe.select('s', 'b'); return 1; })()`); await pause(150);
    browser(S, 'click', lnk); await pause(200);
    const row = evalJs(S, `(() => { const r = document.querySelector('#link-popover .lk-box-row')?.getBoundingClientRect(); return JSON.stringify(r ? [r.left + r.width / 2, r.top + r.height / 2] : null); })()`);
    if (row) { mouse(S, 'move', ...row); mouse(S, 'down', ...row); mouse(S, 'up', ...row); await pause(150); }
    const opened = evalJs(S, `(() => JSON.stringify(window.__opened || []))()`);
    groupCases.push({ name: 'E7 a press on the row opens the link', diffs: JSON.stringify(opened) === JSON.stringify(['https://a.com/some/path']) ? [] : [JSON.stringify([row, opened])] });
  }
  // Difference 82: the Undo button lets a block selected with only its toolbar go, Cmd+Z keeps it (CAP-82UNDO.json), by real keys and presses.
  { const U = JSON.parse(readFileSync(new URL('../parity/findings/CAP-82UNDO.json', import.meta.url))).reads;
    evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 8 }, blocks: [] }] }); await new Promise((r) => setTimeout(r, 200)); return 1; })()`);
    const read = () => evalJs(S, `(() => { const tb = document.getElementById('block-toolbar'); return JSON.stringify({ selected: !!tb && !tb.hidden && tb.getBoundingClientRect().width > 0, areas: fe.model.sections[0].blocks.map((b) => b.layout.desktop.area.join('/')).sort() }); })()`);
    const pick = async (type) => { const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), id = fe.model.sections[0].blocks.find((b) => b.id.startsWith('${type.toLowerCase()}-')).id, r = f.contentDocument.querySelector('.fe-block[data-block-id="' + id + '"]').getBoundingClientRect(); return JSON.stringify([q.left + r.left + r.width / 2, q.top + r.top + r.height / 2]); })()`); mouse(S, 'move', p[0], p[1]); await pause(40); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(40); mouse(S, 'up', p[0], p[1]); await pause(300); };
    for (const type of ['Shape', 'Button', 'Text']) {
      evalJs(S, `(() => { fe.addBlock('s', ${JSON.stringify(type)}, true); return 1; })()`); await pause(200);
      browser(S, 'press', 'Escape'); await pause(200);
      const got = {};
      await pick(type); browser(S, 'press', 'ArrowRight'); await pause(300); browser(S, 'click', '#undo'); await pause(300); got.Undo = read();
      browser(S, 'press', 'Escape'); await pause(200);
      await pick(type); browser(S, 'press', 'ArrowRight'); await pause(300); browser(S, 'press', 'Meta+z'); await pause(300); got['Cmd+Z'] = read();
      browser(S, 'press', 'Escape'); await pause(200);
      for (const [how, ours] of Object.entries(got)) {
        const r = U[`${type} ${how}`], selected = r.controls.some((c) => ['Edit', 'Remove', 'Duplicate'].includes(c.label)), areas = r.areas.map((a) => a[0]).sort();
        groupCases.push({ name: `82 ${type} ${how}: ${selected ? 'kept' : 'let go'}`, diffs: [ours.selected !== selected && `selected: oracle ${selected}, ours ${ours.selected}`, ours.areas.join() !== areas.join() && `areas: oracle ${areas}, ours ${ours.areas}`].filter(Boolean) });
      }
    } }
  // On text: the target waits for the close, target first, no rel; two paragraphs get a link each.
  evalJs(S, `(async () => { fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [${JSON.stringify(bl('t', 'text', { html: '<p>one</p><p>two</p>' }))}] }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60);
  const t = evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, P = document.getElementById('link-popover'), fb = d.querySelector('.fe-block[data-block-id="t"]'); fe.edit('s', 't'); await sleep(250);
    const ce = d.querySelector('[contenteditable="true"]'); const out = { editing: !!ce }; if (!ce) return JSON.stringify(out); const inner = () => ce.innerHTML.replace(/ style="[^"]*"/g, ''); const pick = async (a) => { const r = d.createRange(); r.selectNodeContents(a); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); await sleep(120); document.querySelector('button[data-fmt="link"]').click(); await sleep(120); };
    const inp = () => P.querySelector('.lk-input'); const key = (k) => inp().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await pick(ce); inp().value = '/about'; key('Enter'); await sleep(120); out.two = inner(); out.open = !P.hidden; P.querySelector('.lk-box').click(); await sleep(80); out.ticked = inner(); key('Escape'); await sleep(120); out.closed = inner();
    await pick(ce.querySelector('a')); out.reopen = P.querySelector('.lk-box').checked; P.querySelector('.lk-box').click(); key('Escape'); await sleep(60); out.listFirst = !P.hidden; key('Escape'); await sleep(120); out.unticked = inner(); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120);
    return JSON.stringify(out); })()`);
  lk('text: one link per paragraph, href only until the close', t.two === '<p><a href="/about">one</a></p><p><a href="/about">two</a></p>' && t.open && t.ticked === t.two, t);
  lk('text: the close writes target first, no rel', t.closed === '<p><a target="_blank" href="/about">one</a></p><p><a target="_blank" href="/about">two</a></p>', t);
  lk('text: reopened ticked, the first Escape takes the list, unticking removes it', t.reopen === true && t.listFirst && t.unticked && !t.unticked.split('</p>')[0].includes('target'), t);
}
// E7: the menu on the URL pill, Email and Phone (LINKMENU.json). File stays off (decision 0005).
{ const bl = (id, type, extra) => ({ id, type, label: id, ...extra, layout: { desktop: { area: [1, 2, 3, 8], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } });
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', header: { nav: [{ label: 'About' }] }, sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [${JSON.stringify(bl('b', 'button'))}] }] }); await new Promise((r) => setTimeout(r, 120)); fe.select('s', 'b'); return 1; })()`); await pause(60);
  const r = evalJs(S, `(async () => { const sleep = (t) => new Promise((x) => setTimeout(x, t)); const P = document.getElementById('link-popover'), Q = document.getElementById('block-panel'), q = (x) => P.querySelector(x), out = {};
    const a = () => document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="b"] a'); const B = () => fe.model.sections[0].blocks.find((x) => x.id === 'b'); const href = () => B().href || '';
    const put = async (f, v) => { const e = q('[data-f="' + f + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); await sleep(40); return e; };
    const key = (e, k) => e.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const menu = async (kind) => { q('.lk-pill').click(); await sleep(40); q('.lk-kind[data-kind="' + kind + '"]').click(); await sleep(60); };
    const row = () => [Q.querySelector('.bp-link-name')?.textContent, Q.querySelector('.bp-link-sub')?.textContent || ''];
    const size = () => { const b = P.getBoundingClientRect(); return [b.width, b.height]; };
    document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(150); Q.querySelector('[data-btab="Content"]').click(); await sleep(120);
    const attach = Q.querySelector('[data-link="open"]'), at = attach.getBoundingClientRect().top; attach.click(); await sleep(120);
    const above = () => at - P.getBoundingClientRect().top;
    const pill = q('.lk-pill').getBoundingClientRect(); out.pill = [Math.round(pill.width), pill.height, pill.left - P.getBoundingClientRect().left, pill.top - P.getBoundingClientRect().top]; out.urlAbove = above(); out.urlSize = size();
    q('.lk-pill').click(); await sleep(40); out.expanded = q('.lk-pill').getAttribute('aria-expanded'); out.rows = [...P.querySelectorAll('.lk-kind, .lk-learn')].map((x) => x.textContent); out.file = q('.lk-kind[data-kind="file"]').disabled; out.checked = [...P.querySelectorAll('.lk-kind')].filter((x) => x.querySelector('.lk-check')).map((x) => x.dataset.kind); out.listHidden = q('.lk-pages').hidden; const mq = q('.lk-menu').getBoundingClientRect(); out.menu = [mq.width, mq.top - P.getBoundingClientRect().top];
    q('.lk-pill').click(); await sleep(40); out.closes = q('.lk-menu').hidden;
    await menu('email'); out.email = { size: size(), above: above(), focus: document.activeElement === q('.lk-pill'), adds: [...P.querySelectorAll('[data-add]')].map((x) => x.textContent), clear: !q('[data-g="to"] .lk-clear').hidden, pill: q('.lk-pill').textContent, hasBox: !!q('.lk-box') };
    const to = await put('to', 'a@example.com'); out.to = href(); out.toClear = !q('[data-g="to"] .lk-clear').hidden; key(to, 'Enter'); await sleep(40); out.enterOpen = !P.hidden;
    await put('subject', 'Hi there'); out.subject = href(); await put('body', 'Line one & two'); out.body = href(); out.attr = a().getAttribute('href');
    q('[data-add="cc"]').click(); await sleep(40); out.ccFocus = document.activeElement === q('[data-f="cc"]'); await put('cc', 'c@example.com'); out.cc = href();
    q('[data-add="bcc"]').click(); await sleep(40); await put('bcc', 'd@example.com'); out.bcc = href(); out.full = { size: size(), above: above(), adds: q('.lk-adds').hidden };
    key(q('[data-f="to"]'), 'Escape'); await sleep(80); out.closed = P.hidden; out.row = row();
    const U = document.getElementById('undo'), Re = document.getElementById('redo'); out.undo = []; for (let k = 0; k < 3; k++) { U.click(); await sleep(60); out.undo.push(href()); } for (let k = 0; k < 3; k++) { Re.click(); await sleep(60); } out.redone = href();
    Q.querySelector('[data-link="edit"]').click(); await sleep(120); out.reopen = { pill: q('.lk-pill').textContent, to: q('[data-f="to"]').value, cc: q('[data-f="cc"]').value, bcc: q('[data-f="bcc"]').value, subject: q('[data-f="subject"]').value, body: q('[data-f="body"]').value, focus: document.activeElement === q('.lk-pill') };
    q('[data-g="to"] .lk-clear').click(); await sleep(50); await put('cc', ''); await put('bcc', ''); await put('body', ''); await put('subject', 'Hi'); out.noTo = href();
    await menu('phone'); out.toPhone = href(); out.phone = { size: size(), radios: [...P.querySelectorAll('.lk-radio')].map((x) => [x.textContent, x.getAttribute('aria-checked')].join()), clear: !!q('.lk-clear') && !q('.lk-clear').hidden, focus: document.activeElement === q('.lk-pill') };
    let f = await put('phone', 'abc'); out.letters = [f.value, href()]; f = await put('phone', '12a3 b-4(5)'); out.mixed = [f.value, href()]; f = await put('phone', '+47 123 45 678'); out.num = [f.value, href()];
    [...P.querySelectorAll('.lk-radio')].find((x) => x.textContent === 'Text').click(); await sleep(50); out.sms = href();
    key(f, 'Enter'); await sleep(80); out.phoneClosed = P.hidden; out.phoneRow = row();
    Q.querySelector('[data-link="edit"]').click(); await sleep(120); out.phoneReopen = [q('.lk-pill').textContent, q('[data-f="phone"]').value, q('.lk-radio[aria-checked="true"]').textContent];
    [...P.querySelectorAll('.lk-radio')].find((x) => x.textContent === 'Call').click(); await sleep(50); out.tel = href();
    await menu('url'); out.toUrl = { href: href(), newTab: B().newTab === true, box: q('.lk-box').checked, focus: document.activeElement === q('.lk-input'), attach: !!Q.querySelector('[data-link="open"]') };
    await menu('phone'); out.afterPhone = href(); const e2 = q('[data-f="phone"]'); key(e2, 'Enter'); await sleep(80); out.emptyEnter = { pill: q('.lk-pill').textContent, open: !P.hidden, box: q('.lk-box').checked, newTab: B().newTab === true };
    const inp = q('.lk-input'); inp.value = '/about'; key(inp, 'Enter'); await sleep(80); out.page = { href: href(), newTab: B().newTab === true }; key(q('.lk-input'), 'Escape'); await sleep(80); out.pageRow = row();
    Q.querySelector('[data-link="remove"]').click(); await sleep(80);
    Q.querySelector('[data-link="open"]').click(); await sleep(120); const dom = q('.lk-input'); dom.value = 'example.com/x'; key(dom, 'Enter'); await sleep(80); out.domain = [href(), dom.value, row()]; key(q('.lk-input'), 'Escape'); await sleep(80); out.domainRow = row();
    Q.querySelector('[data-link="remove"]').click(); await sleep(80); Q.querySelector('[data-link="open"]').click(); await sleep(120); const noE = q('.lk-input'); noE.value = '/about'; noE.dispatchEvent(new Event('input', { bubbles: true })); await sleep(40); key(noE, 'Escape'); await sleep(40); out.noEnter = [!P.hidden, href()]; key(noE, 'Escape'); await sleep(80); out.noEnterClosed = [P.hidden, href()];
    Q.querySelector('[data-link="remove"]').click(); await sleep(80); Q.querySelector('[data-link="open"]').click(); await sleep(120); q('.lk-pill').click(); await sleep(40); q('.lk-learn').click(); await sleep(60); out.learn = P.hidden; return JSON.stringify(out); })()`);
  const lm = (name, ok, got) => groupCases.push({ name: `E7 ${name}`, diffs: ok ? [] : [JSON.stringify(got)] });
  lm('the pill opens the menu, File off', String(r.pill) === '96,28,22,22' && r.expanded === 'true' && r.rows.join() === 'URL,File,Email,Phone,Learn more' && r.file === true && r.checked.join() === 'url' && r.listHidden && String(r.menu) === '142,56' && r.closes, r);
  lm('the URL form stays centred on Attach link', r.urlAbove === 61 && String(r.urlSize) === '320,167', [r.urlAbove, r.urlSize]);
  lm('Email: 320 by 479, 217 above, focus on the pill', String(r.email.size) === '320,479' && r.email.above === 217 && r.email.focus && r.email.adds.join() === 'CC,BCC' && !r.email.clear && r.email.pill === 'Email' && !r.email.hasBox, r.email);
  lm('Email: the href as the oracle writes it', r.to === 'mailto:a@example.com?' && r.toClear && r.enterOpen && r.subject === 'mailto:a@example.com?subject=Hi%20there' && r.body === 'mailto:a@example.com?subject=Hi%20there&body=Line%20one%20%26%20two' && r.attr === r.body, r);
  lm('Email: CC and BCC go first, CC takes the focus', r.ccFocus && r.cc === 'mailto:a@example.com?cc=c%40example.com&subject=Hi%20there&body=Line%20one%20%26%20two' && r.bcc === 'mailto:a@example.com?cc=c%40example.com&bcc=d%40example.com&subject=Hi%20there&body=Line%20one%20%26%20two' && String(r.full.size) === '320,500' && r.full.above === 228 && r.full.adds, [r.cc, r.bcc, r.full]);
  lm('Email: the panel row', r.closed && r.row.join() === 'a@example.com, +2,Email', r.row);
  lm('Email: three undo steps', r.undo[0] === r.cc && r.undo[1] === r.body && r.undo[2] === '' && r.redone === r.bcc, r.undo);
  lm('Email: reopened with the fields filled', r.reopen.pill === 'Email' && r.reopen.to === 'a@example.com' && r.reopen.cc === 'c@example.com' && r.reopen.bcc === 'd@example.com' && r.reopen.subject === 'Hi there' && r.reopen.body === 'Line one & two' && r.reopen.focus, r.reopen);
  lm('Email: no To still writes', r.noTo === 'mailto:?subject=Hi', r.noTo);
  lm('Phone: another kind starts empty, Call on', r.toPhone === '' && String(r.phone.size) === '320,175' && r.phone.radios.join(';') === 'Call,true;Text,false' && r.phone.clear && r.phone.focus, [r.toPhone, r.phone]);
  lm('Phone: digits and a leading plus', r.letters.join() === ',' && r.mixed.join() === '12345,tel:12345' && r.num.join() === '+4712345678,tel:+4712345678' && r.sms === 'sms:+4712345678', r);
  lm('Phone: Enter closes, the row, reopened', r.phoneClosed && r.phoneRow.join() === '+4712345678,Text' && r.phoneReopen.join() === 'Phone,+4712345678,Text' && r.tel === 'tel:+4712345678', r);
  lm('back on URL: empty, box on, target from the old link', r.toUrl.href === '' && r.toUrl.newTab && r.toUrl.box && r.toUrl.focus && r.toUrl.attach, r.toUrl);
  lm('an empty Phone and Enter goes to URL', r.afterPhone === '' && r.emptyEnter.pill === 'URL' && r.emptyEnter.open && r.emptyEnter.box, r.emptyEnter);
  lm('a typed domain gets https, the row shows it alone', r.domain[0] === 'https://example.com/x' && r.domain[1] === r.domain[0] && String(r.domainRow) === 'https://example.com/x,', [r.domain, r.domainRow]);
  lm('typed without Enter counts at the close, after the list goes', r.noEnter[0] && r.noEnter[1] === '' && r.noEnterClosed[0] && r.noEnterClosed[1] === '/about', [r.noEnter, r.noEnterClosed]);
  lm('Learn more closes the editor', r.learn === true, r.learn);
  lm('a page in the panel row', r.page.href === '/about' && r.page.newTab && r.pageRow.join() === 'About,/about', [r.page, r.pageRow]);
  // On text: Email waits for the close; Enter on a number closes and writes.
  evalJs(S, `(async () => { fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [${JSON.stringify(bl('t', 'text', { html: '<p>one</p>' }))}] }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60);
  const t = evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, P = document.getElementById('link-popover'), q = (x) => P.querySelector(x); fe.edit('s', 't'); await sleep(250);
    const ce = d.querySelector('[contenteditable="true"]'); const out = { editing: !!ce }; if (!ce) return JSON.stringify(out); const inner = () => ce.innerHTML.replace(/ style="[^"]*"/g, ''); const pick = async (a) => { const r = d.createRange(); r.selectNodeContents(a); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); await sleep(120); document.querySelector('button[data-fmt="link"]').click(); await sleep(120); };
    const put = async (k, v) => { const e = q('[data-f="' + k + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); await sleep(40); return e; }; const key = (e, k) => e.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); const menu = async (kind) => { q('.lk-pill').click(); await sleep(40); q('.lk-kind[data-kind="' + kind + '"]').click(); await sleep(60); };
    await pick(ce.querySelector('p')); out.top = P.getBoundingClientRect().top; await menu('email'); out.sameTop = P.getBoundingClientRect().top === out.top; await put('to', 'a@example.com'); const s = await put('subject', 'Hi there'); out.open = inner(); key(s, 'Enter'); await sleep(50); out.enterOpen = !P.hidden; out.enter = inner(); key(s, 'Escape'); await sleep(120); out.closed = inner();
    await pick(ce.querySelector('a')); out.reopen = [q('.lk-pill').textContent, q('[data-f="to"]').value, q('[data-f="subject"]').value]; await menu('phone'); const n = await put('phone', '12345'); key(n, 'Enter'); await sleep(120); out.phoneClosed = P.hidden; out.phone = inner();
    await pick(ce.querySelector('a')); await menu('url'); out.backUrl = [q('.lk-box').checked, inner()]; key(q('.lk-input'), 'Escape'); await sleep(40); key(q('.lk-input'), 'Escape'); await sleep(120); out.switched = inner(); out.switchClosed = P.hidden;
    await pick(ce.querySelector('p')); const typed = q('.lk-input'); typed.value = '/about'; typed.dispatchEvent(new Event('input', { bubbles: true })); await sleep(40); key(typed, 'Escape'); await sleep(40); out.typedOpen = !P.hidden; key(typed, 'Escape'); await sleep(120); out.typed = inner(); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120); return JSON.stringify(out); })()`);
  lm('text: Email waits for the close', t.sameTop && t.open === '<p>one</p>' && t.enterOpen && t.enter === '<p>one</p>' && t.closed === '<p><a href="mailto:a@example.com?subject=Hi%20there">one</a></p>', t);
  lm('text: reopened as Email; a number and Enter writes tel', t.reopen.join() === 'Email,a@example.com,Hi there' && t.phoneClosed && t.phone === '<p><a href="tel:12345">one</a></p>', t);
  lm('text: another kind and a close takes the link', t.backUrl[0] === true && t.backUrl[1] === '<p><a href="tel:12345">one</a></p>' && t.switched === '<p>one</p>' && t.switchClosed, t);
  lm('text: typed without Enter counts at the close', t.typedOpen && t.typed === '<p><a href="/about">one</a></p>', t);
}
// U2: how many rows a phone hold shows: the section's own rows, or the normal rows when they were
// stretched, phone first or after two desktop holds (CAP-HOLDROWS*.json; demo section 2, MARKS.json).
{ const U = JSON.parse(readFileSync(new URL('../parity/findings/CAP-HOLDROWS.json', import.meta.url))).reads, T = JSON.parse(readFileSync(new URL('../parity/findings/CAP-HOLDROWS2.json', import.meta.url))).reads;
  const para = ['First', 'Second', 'Third'].map((w) => `<p>${w} paragraph with enough words to wrap across a few lines in a narrow column of the grid.</p>`).join('');
  const lay = (d, m, z) => ({ desktop: { area: d, z, justify: 'flex-start', align: 'flex-start' }, mobile: { area: m, z, justify: 'flex-start', align: 'flex-start' } });
  const load = async (html, rows, a) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: ${JSON.stringify(rows)}, blocks: ${JSON.stringify([{ id: 't', type: 'text', html, layout: lay(a, [1, 2, 3, 10], 1) }, { id: 'k', type: 'shape', fill: '#ccc', radius: '0', layout: lay([1, 2, 7, 8], [3, 2, 9, 10], 2) }])} }] }); await new Promise((r) => setTimeout(r, 200)); return 1; })()`); await pause(100); };
  const view = async (bp) => { evalJs(S, `(async () => { fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 250)); return 1; })()`); await pause(100); };
  const hold = async (id) => {
    const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), W = f.contentWindow, b = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]'); W.scrollTo(0, b.closest('.fluid-engine').getBoundingClientRect().top + W.scrollY - 150); const q = b.getBoundingClientRect(), r = f.getBoundingClientRect(); return JSON.stringify([r.left + q.left + q.width / 2, r.top + q.top + Math.min(q.height / 2, 40)]); })()`);
    mouse(S, 'move', p[0], p[1]); await pause(60); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(60);
    for (let k = 1; k <= 7; k++) { mouse(S, 'move', p[0], p[1] + 2 * k, { buttons: 1 }); await pause(25); }
    await pause(200);
    const n = evalJs(S, `document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${id}"]').closest('.fluid-engine').querySelectorAll('.fe-grid-row').length`);
    mouse(S, 'move', p[0], p[1], { buttons: 1 }); await pause(100); mouse(S, 'up', p[0], p[1]); await pause(200);
    return n;
  };
  const rows = (name, got, want) => groupCases.push({ name: `U2 hold rows ${name}`, diffs: got === want ? [] : [`oracle ${want}, ours ${got}`] });
  await load('<p>x</p>', { desktop: 8, mobile: 8 }, [1, 2, 3, 10]); await view('mobile');
  rows('uniform, phone', await hold('k'), U['phone hold 1'].sel.length);
  await view('desktop'); rows('uniform, desktop', await hold('k'), U['desktop hold 1'].sel.length);
  await hold('k'); await view('mobile'); rows('uniform, phone after desktop holds', await hold('k'), U['phone hold 3'].sel.length);
  await load(para, { desktop: 11, mobile: 8 }, [1, 2, 6, 10]); await view('mobile');
  rows('stretched, phone first', await hold('k'), T['A phone hold 1'].sel.length);
  await load(para, { desktop: 11, mobile: 8 }, [1, 2, 6, 10]);
  rows('stretched, desktop', await hold('k'), T['B desktop hold 1'].sel.length);
  await hold('k'); await view('mobile'); rows('stretched, phone after desktop holds', await hold('k'), T['B phone hold 1'].sel.length);
  goto(S, `${BASE}/index.html`); await pause(1200); await view('mobile');
  rows('demo section 2', await hold(evalJs(S, `JSON.stringify(fe.model.sections[2].blocks.find((b) => b.type === 'shape').id)`)), 14);
  await view('desktop');
}
// A2: after an edit the block DOM follows the phone rows (CAP-ORDER.json). A saved page stays as it
// loads. In a saved page a pair that overlaps with the same z, on desktop or on the phone, keeps its order so
// nothing repaints (ours, not read); in a section made here only a phone overlap holds (CAP-A2SAMEZ, neworder-check).
{ const bl = (id, d, m, z = 1, zm = z) => ({ id, type: 'shape', label: id, fill: '#ccc', radius: '0', layout: { desktop: { area: d, z, justify: 'flex-start', align: 'flex-start' }, mobile: { area: m, z: zm, justify: 'flex-start', align: 'flex-start' } } });
  const sec = (id, blocks) => ({ id, theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 14, mobile: 20 }, blocks });
  const load = async (...sections) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: ${JSON.stringify(sections)} }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60); };
  const dom = (sid = 's') => evalJs(S, `JSON.stringify([...document.getElementById('site-frame').contentDocument.querySelectorAll('section[data-section-id="${sid}"] .fe-block')].map((b) => b.dataset.blockId).join(''))`);
  const modelOrder = (k = 0) => evalJs(S, `JSON.stringify(fe.model.sections[${k}].blocks.map((b) => b.id).join(''))`);
  const view = async (bp) => { evalJs(S, `(async () => { fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 150)); return 1; })()`); await pause(60); };
  const mid = (id) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify([q.left + b.left + b.width / 2, q.top + b.top + b.height / 2]); })()`);
  const drag = async (id, dx, dy) => { const p = mid(id); mouse(S, 'move', p[0], p[1]); await pause(40); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(40); for (const f of [1 / 3, 2 / 3, 1]) { mouse(S, 'move', p[0] + dx * f, p[1] + dy * f, { buttons: 1 }); await pause(40); } mouse(S, 'up', p[0] + dx, p[1] + dy); await pause(160); evalJs(S, 'fe.select(null)'); await pause(60); };
  // What paints on top where two blocks overlap: the real hit test, and the z the browser computes.
  const top = (x, y) => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument; const A = d.querySelector('.fe-block[data-block-id="${x}"]').getBoundingClientRect(), B = d.querySelector('.fe-block[data-block-id="${y}"]').getBoundingClientRect(); return JSON.stringify(d.elementFromPoint((Math.max(A.left, B.left) + Math.min(A.right, B.right)) / 2, (Math.max(A.top, B.top) + Math.min(A.bottom, B.bottom)) / 2)?.closest('.fe-block')?.dataset.blockId ?? null); })()`);
  const ord = (name, got, want) => groupCases.push({ name: `A2 ${name}`, diffs: JSON.stringify(got) === JSON.stringify(want) ? [] : [`want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`] });
  const undoBtn = () => evalJs(S, `(async () => { document.getElementById('undo').click(); await new Promise((r) => setTimeout(r, 120)); return 1; })()`), redoBtn = () => evalJs(S, `(async () => { document.getElementById('redo').click(); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
  // The live read: three added, the first in DOM moved down on the phone.
  const rows3 = [bl('a', [1, 2, 3, 10], [1, 2, 3, 10], 1), bl('b', [4, 2, 6, 8], [3, 2, 5, 10], 2), bl('c', [7, 2, 9, 6], [5, 2, 6, 10], 3)];
  await load(sec('s', rows3)); await view('mobile'); await drag('a', 0, 210); ord('first in DOM moved down on the phone', [dom(), modelOrder()], ['bca', 'bca']); await view('desktop');
  // A saved page in another order: untouched on load and by an edit next door; an edit in it sorts, undo brings it back, redo sorts again.
  const saved = [bl('a', [1, 2, 3, 8], [7, 2, 9, 10], 1), bl('b', [1, 10, 3, 16], [1, 2, 3, 10], 2), bl('c', [5, 2, 7, 8], [4, 2, 6, 10], 3)];
  await load(sec('s', saved), sec('t', [bl('x', [1, 2, 3, 8], [5, 2, 7, 10], 1), bl('y', [5, 2, 7, 8], [1, 2, 3, 10], 2)]));
  ord('a saved page stays as it loads', [dom(), modelOrder()], ['abc', 'abc']);
  await drag('c', 120, 0); ord('an edit sorts its section', [dom(), modelOrder()], ['bca', 'bca']); ord('the section next door stays as it loaded', [dom('t'), modelOrder(1)], ['xy', 'xy']);
  await undoBtn(); ord('undo brings the order back', [dom(), modelOrder()], ['abc', 'abc']); await redoBtn(); ord('redo sorts again', [dom(), modelOrder()], ['bca', 'bca']);
  // Same row on the phone: left to right.
  await load(sec('s', [bl('a', [1, 2, 3, 8], [3, 6, 5, 10], 1), bl('b', [1, 10, 3, 16], [3, 2, 5, 6], 2), bl('c', [5, 2, 7, 8], [1, 2, 3, 10], 3)])); await drag('c', 120, 0); ord('the same phone row goes left to right', dom(), 'cba');
  // Overlapping on desktop with the same z, the phone wants them flipped: held, same paint.
  await load(sec('s', [bl('a', [1, 2, 6, 8], [7, 2, 9, 10]), bl('b', [3, 5, 8, 12], [1, 2, 3, 10]), bl('c', [10, 2, 12, 8], [4, 2, 6, 10], 2)]));
  const before1 = top('a', 'b'); await drag('c', 120, 0); ord('held on desktop: a stays before b, c sorts ahead of a', dom(), 'cab'); ord('held on desktop: the same block on top after an edit', [before1, top('a', 'b')], ['b', 'b']);
  await drag('a', 60, 0); ord('held on desktop: the same block on top after moving one of them', [dom(), top('a', 'b')], ['cab', 'b']);
  // Overlapping only on the phone with the same z: held, so a width switch shows no flip.
  await load(sec('s', [bl('a', [1, 2, 3, 8], [3, 2, 7, 10]), bl('b', [1, 10, 3, 16], [1, 2, 5, 10]), bl('c', [5, 2, 7, 8], [8, 2, 10, 10], 2)]));
  await view('mobile'); const before2 = top('a', 'b'); await view('desktop'); await drag('c', 120, 0); ord('held from the other layout: order kept', dom(), 'abc'); await view('mobile'); ord('held from the other layout: the same block on top on the phone', [before2, top('a', 'b')], ['b', 'b']); await view('desktop');
  // Overlapping with different z: free to sort, z decides the paint.
  await load(sec('s', [bl('a', [1, 2, 6, 8], [7, 2, 9, 10], 2), bl('b', [3, 5, 8, 12], [1, 2, 3, 10], 1), bl('c', [10, 2, 12, 8], [4, 2, 6, 10], 3)]));
  const before3 = top('a', 'b'); await drag('c', 120, 0); ord('different z: sorted, the same block on top', [dom(), before3, top('a', 'b')], ['bca', 'a', 'a']);
  // A chain of three held blocks: a-b and b-c overlap, a and c do not. The phone wants c b a.
  const chain = (d) => [bl('a', [1, 2, 6, 8], [7, 2, 9, 10]), bl('b', [3, 5, 8, 12], [5, 2, 7, 10]), bl('c', [5, 10, 10, 16], [3, 2, 5, 10]), bl('d', [12, 2, 14, 8], d, 2)];
  await load(sec('s', chain([1, 2, 3, 10]))); const ab = top('a', 'b'), bc = top('b', 'c'); await drag('d', 120, 0);
  ord('a chain of three stays in order, a free block goes first', dom(), 'dabc'); ord('a chain of three paints the same', [ab, bc, top('a', 'b'), top('b', 'c')], ['b', 'c', 'b', 'c']);
  await load(sec('s', chain([9, 2, 11, 10]))); await drag('d', 120, 0); ord('a chain of three: a free block last stays last', dom(), 'abcd');
  await load(sec('s', chain([6, 2, 7, 10]))); await drag('d', 120, 0); ord('a chain of three: a free block above its first block goes ahead of it', dom(), 'dabc');
  // Text being edited does not move; the close sorts.
  await load(sec('s', [{ ...bl('t', [1, 2, 3, 8], [5, 2, 7, 10]), type: 'text', html: '<p>one</p>' }, bl('x', [5, 2, 7, 8], [1, 2, 3, 10], 2)]));
  const tx = evalJs(S, `(async () => { const sleep = (m) => new Promise((r) => setTimeout(r, m)); const d = document.getElementById('site-frame').contentDocument; const order = () => [...d.querySelectorAll('section[data-section-id="s"] .fe-block')].map((b) => b.dataset.blockId).join(''); fe.edit('s', 't'); await sleep(200); const ce = d.querySelector('[contenteditable="true"]'); ce.focus(); ce.innerHTML = '<p>two</p>'; ce.dispatchEvent(new Event('input', { bubbles: true })); await sleep(80); const during = order(), focus = d.activeElement === ce; fe.finishEdit(); await sleep(150); return JSON.stringify([during, focus, order()]); })()`);
  ord('text keeps its place while edited, the close sorts', tx, ['tx', true, 'xt']);
  // Run, not only read in the code: every way our editor writes z leaves no new overlapping pair with the same z.
  const sameZ = () => evalJs(S, `(() => { const over = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; const out = []; for (const s of fe.model.sections) s.blocks.forEach((x, n) => s.blocks.slice(n + 1).forEach((y) => { for (const v of ['desktop', 'mobile']) if (x.layout[v].z === y.layout[v].z && over(x.layout[v].area, y.layout[v].area)) out.push(x.id + '-' + y.id + ' ' + v); })); return JSON.stringify(out); })()`);
  await load(sec('s', [bl('a', [1, 2, 6, 8], [1, 2, 6, 10], 1, 3), bl('b', [3, 5, 8, 12], [3, 2, 8, 10], 2, 2), bl('c', [4, 7, 9, 14], [5, 2, 10, 10], 3, 1)]));
  const zs = {}; const act = async (name, js) => { evalJs(S, `(async () => { const sleep = (m) => new Promise((r) => setTimeout(r, m)); const tb = (k) => document.querySelector('#block-toolbar button[data-tb="' + k + '"]'); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const shift = (id) => { const r = d.querySelector('.fe-block[data-block-id="' + id + '"]').getBoundingClientRect(); const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true, shiftKey: true }; const e = d.querySelector('.fe-block[data-block-id="' + id + '"]'); e.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 })); }; ${js} await sleep(150); return 1; })()`); await pause(50); zs[name] = sameZ(); };
  await act('add a block', `fe.addBlock('s', 'Shape');`);
  await act('duplicate', `fe.select('s', 'b'); await sleep(80); tb('duplicate').click();`);
  await act('Move Forward', `fe.select('s', 'a'); await sleep(80); tb('z+').click();`);
  await act('Move Backward', `fe.select('s', 'c'); await sleep(80); tb('z-').click();`);
  await act('stack', `fe.select(null); await sleep(40); fe.select('s', 'a'); await sleep(60); shift('b'); await sleep(80); document.getElementById('site-frame').contentDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', shiftKey: true, bubbles: true, cancelable: true }));`);
  const stacked = evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.some((b) => b.type === 'stack'))`);
  const metaKey = (code) => `document.getElementById('site-frame').contentDocument.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '${code.slice(-1).toLowerCase()}', metaKey: true, bubbles: true, cancelable: true })); await sleep(60);`;
  await act('copy and paste', `fe.select('s', 'c'); await sleep(80); ${metaKey('KeyC')} ${metaKey('KeyV')}`);
  const pasted = evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.length)`);
  await act('unstack', `const st = fe.model.sections[0].blocks.find((b) => b.type === 'stack'); fe.select('s', st.id); await sleep(100); tb('stackopts').click(); await sleep(60); tb('sopt:unstack').click();`);
  const unstacked = evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.some((b) => b.type === 'stack'))`);
  await view('mobile'); await act('Move Forward on the phone', `fe.select('s', 'c'); await sleep(80); tb('z+')?.click();`); await view('desktop');
  ord('z writes leave no same-z overlap', Object.fromEntries(Object.entries(zs).filter(([, v]) => v.length)), {}); ord('z writes: the stack, the paste and the unstack happened', [stacked, pasted, unstacked], [true, 5, false]);
}
// L6: on a phone the block menu has no Copy Properties or Paste Properties; a stack's Corner is per layout (LINKBOX.json).
{ const k = { id: 'k', label: 'k', layout: { desktop: { area: [1, 2, 7, 8], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } };
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [${JSON.stringify({ ...k, type: 'stack', gap: 20, design: { corner: 10 }, designMobile: { corner: 30 }, children: [] })}] }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(60);
  const items = (bp) => evalJs(S, `(async () => { fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 200)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const e = d.querySelector('.fe-block[data-block-id="k"]'), q = e.getBoundingClientRect(); e.querySelector('*').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 5, clientY: q.top + 5, button: 2 })); await new Promise((r) => setTimeout(r, 60)); const m = [...document.querySelectorAll('#context-menu button')].map((x) => x.getAttribute('aria-label')); document.getElementById('context-menu').hidden = true; return JSON.stringify({ m, r: W.getComputedStyle(d.getElementById('block-k')).borderTopLeftRadius }); })()`);
  const de = items('desktop'), ph = items('mobile');
  groupCases.push({ name: 'L6 Copy Properties only on desktop', diffs: [!de.m.includes('Copy Properties') && 'desktop lost it', ph.m.includes('Copy Properties') && 'phone has Copy Properties', ph.m.includes('Paste Properties') && 'phone has Paste Properties'].filter(Boolean) });
  groupCases.push({ name: 'L6 a stack Corner per layout', diffs: [de.r !== '10px' && `desktop ${de.r}`, ph.r !== '30px' && `phone ${ph.r}`].filter(Boolean) });
  evalJs(S, `fe.setBp('desktop')`); await pause(100);
}
// R2: widening and narrowing a text block one column at a time (CAP-TEXTWIDTH.json), with the real mouse.
{ const F = JSON.parse(readFileSync(new URL('../parity/findings/CAP-TEXTWIDTH.json', import.meta.url))); const para = F.steps.find((x) => x[0] === 'pasteMid')[3].replace(/<\/?p>/g, '');
  viewport(S, 1600, 945); await pause(120);
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 12, mobile: 6 }, blocks: [{ id: 't', type: 'text', label: 't', html: ${JSON.stringify(`<p>Start of a l${para}ong text here</p>`)}, layout: { desktop: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 150)); fe.select('s', 't'); await new Promise((r) => setTimeout(r, 150)); return 1; })()`); await pause(60);
  const read = () => evalJs(S, `JSON.stringify({ a: fe.model.sections[0].blocks.find((x) => x.id === 't').layout.desktop.area.join('/'), rows: fe.model.sections[0].rows.desktop })`);
  const handle = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), h = f.contentDocument.querySelector('.fe-handle[data-dir="e"]').getBoundingClientRect(); return JSON.stringify([q.left + h.left + h.width / 2, q.top + h.top + h.height / 2]); })()`);
  const step = async (dx) => { const p = handle(); mouse(S, 'move', p[0], p[1]); await pause(30); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(30); for (let n = 1; n <= 12; n++) { mouse(S, 'move', p[0] + (dx * n) / 12, p[1], { buttons: 1 }); await pause(12); } mouse(S, 'up', p[0] + dx, p[1]); await pause(60); evalJs(S, `fe.select('s', 't')`); await pause(40); };
  const known = { 'wider 5': 'held, the oracle keeps 5 rows for a text of 134.4, 2 of 2 runs, and lets the row go on Escape (CAP-TEXTWIDTH4.json); no width offset explains it while held' };
  const test = (name) => { const r = read(), w = F.reads[name]; const diffs = [r.a !== w.areas[0][0] && `area: oracle ${w.areas[0][0]}, ours ${r.a}`, r.rows !== w.section.rows && `rows: oracle ${w.section.rows}, ours ${r.rows}`].filter(Boolean); groupCases.push({ name: `R2 ${name}`, diffs, ...(known[name] ? { known: known[name] } : {}) }); };
  for (let i = 1; i <= 16; i++) { await step(58.78); test(`wider ${i}`); }
  for (let i = 1; i <= 20; i++) { await step(-58.78); test(`narrower ${i}`); }
  // Let go, the rows follow the text at its real width (CAP-TEXTWIDTH4.json o narrower 20): Escape takes 11 stretched rows to 12.
  { const w = JSON.parse(readFileSync(new URL('../parity/findings/CAP-TEXTWIDTH4.json', import.meta.url))).reads['o narrower 20 let go']; browser(S, 'press', 'Escape'); await pause(150); const r = read(); groupCases.push({ name: 'R2 narrower 20 let go', diffs: [r.rows !== w.section.rows && `rows: oracle ${w.section.rows}, ours ${r.rows}`, r.a !== w.stack[0].desktop && `area: oracle ${w.stack[0].desktop}, ours ${r.a}`].filter(Boolean) }); }
  // A one-row Text narrowed from the middle of its east side, where the south-east corner is on top on both (CAP-ONEROWHANDLE.json):
  // one row at the drop, then the rows its text needs and a section row more when let go (CAP-SINGLEAGAIN.json f3, CAP-TEXTWIDTH7.json f3).
  { const F3 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-SINGLEAGAIN.json', import.meta.url))).reads, t3 = 'Short note about the mill road and the birch trees above it.';
    evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 7, mobile: 6 }, blocks: [{ id: 't', type: 'text', label: 't', html: '<p>${t3}</p>', layout: { desktop: { area: [1, 2, 2, 14], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 200)); fe.select('s', 't'); return 1; })()`); await pause(200);
    for (const [name, after] of [['f3 T3 narrower 4 held', async () => { await step(-235.12); }], ['f3 T3 narrower 4 let go', async () => { browser(S, 'press', 'Escape'); await pause(150); }]]) {
      await after(); const r = read(), w = F3[name];
      groupCases.push({ name: `R2 one row narrowed by its corner, ${name.includes('held') ? 'at the drop' : 'let go'}`, diffs: [r.a !== w.stack[0].desktop && `area: oracle ${w.stack[0].desktop}, ours ${r.a}`, r.rows !== w.section.rows && `rows: oracle ${w.section.rows}, ours ${r.rows}`].filter(Boolean) });
    }
  }
  // The same Text pressed at each corner of its box (CAP-CORNERNARROW.json, two runs alike): at sw, nw and ne a 34px side handle
  // is on top, at se the 10px corner; each narrowing 4 columns keeps one row at the drop and takes 2 and a section row when let go.
  { const C = JSON.parse(readFileSync(new URL('../parity/findings/CAP-CORNERNARROW.json', import.meta.url))).reads, t3 = 'Short note about the mill road and the birch trees above it.';
    for (const [c, dx] of [['sw', 235.12], ['nw', 235.12], ['ne', -235.12], ['se', -235.12]]) {
      evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 7, mobile: 6 }, blocks: [{ id: 't', type: 'text', label: 't', html: '<p>${t3}</p>', layout: { desktop: { area: [1, 2, 2, 14], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 200)); fe.select('s', 't'); return 1; })()`); await pause(200);
      const at = evalJs(S, `(() => { const f = document.getElementById('site-frame'), fr = f.getBoundingClientRect(), d = f.contentDocument, q = d.querySelector('.fe-block[data-block-id="t"]').getBoundingClientRect(); const x = '${c}'.includes('w') ? q.left : q.right, y = '${c}'.includes('n') ? q.top : q.bottom; const e = d.elementFromPoint(x, y), r = e.getBoundingClientRect(); return JSON.stringify({ x: fr.left + x, y: fr.top + y, cursor: f.contentWindow.getComputedStyle(e).cursor, size: [Math.round(r.width), Math.round(r.height)] }); })()`);
      const under = C[`A ${c} press`].under;
      // Which handle: the element's own size isn't compared, the oracle's se reads 10 by 10 yet takes a press 15px off (CAP-ONEROWHANDLE.json).
      groupCases.push({ name: `R2 one-row Text, the handle on top at its ${c} corner`, diffs: [at.cursor !== under.cursor && `oracle ${under.cursor}, ours ${at.cursor}`].filter(Boolean) });
      mouse(S, 'move', at.x, at.y); await pause(30); mouse(S, 'down', at.x, at.y, { buttons: 1 }); await pause(30);
      for (let n = 1; n <= 12; n++) { mouse(S, 'move', at.x + (dx * n) / 12, at.y, { buttons: 1 }); await pause(12); }
      mouse(S, 'up', at.x + dx, at.y); await pause(200);
      for (const when of ['held', 'let go']) {
        if (when === 'let go') { browser(S, 'press', 'Escape'); await pause(150); }
        const r = read(), w = C[`A ${c} narrower 4 ${when}`];
        groupCases.push({ name: `R2 one-row Text narrowed from its ${c} corner, ${when === 'held' ? 'at the drop' : 'let go'}`, diffs: [r.a !== w.stack[0].desktop && `area: oracle ${w.stack[0].desktop}, ours ${r.a}`, r.rows !== w.section.rows && `rows: oracle ${w.section.rows}, ours ${r.rows}`].filter(Boolean) });
      }
    }
  }
  // On a phone, the written Text narrowed and widened a phone column at a time by its east side (CAP-R2PHONE.json, R1 and R2 agree),
  // from the oracle's start: the phone area and rows of the before read.
  { const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-R2PHONE.json', import.meta.url))).reads, b = R['R1 before'];
    loadText(S, { html: `<p>${T3}</p>`, desktop: b.stack[0].desktop.split('/').map(Number), mobile: b.stack[0].phone.split('/').map(Number), rows: { desktop: 8, mobile: b.section.rows }, bp: 'mobile' }); await pause(200);
    for (const [name, part, dx] of PHONE_STEPS) {
      const got = await pull(S, part, dx);
      // Named miss: widened back to 7 columns the oracle keeps the third row at the drop and lets it go with the block, as
      // desktop's wider 5 (R2 rule S, frozen, is for one line only; this text is two lines).
      const known = name === 'wider 2' ? { held: 'the oracle keeps 3 rows at the drop, 2 when let go; ours takes 2 at the drop (rule S is frozen, for one line only)' } : {};
      for (const [when, r] of [['held', got.held], ['let go', got.letGo]]) { const w = R[`R1 ${name} ${when}`].stack[0].phone; groupCases.push({ name: `R2 phone ${name}, ${when === 'held' ? 'at the drop' : 'let go'}`, diffs: r.phone === w ? [] : [`phone area: oracle ${w}, ours ${r.phone}`], ...(known[when] ? { known: known[when] } : {}) }); }
    }
    evalJs(S, `fe.setBp('desktop')`); await pause(100);
  }
  // A taller Text narrowed two columns from each corner (CAP-R2CORNERS.json, R1 and R2 agree), from its before read.
  { const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-R2CORNERS.json', import.meta.url))).reads;
    for (const [c, dx] of CORNER_STEPS) {
      const b = R[`R1 ${c} before`];
      loadText(S, { html: `<p>Start of a l${para}ong text here</p>`, desktop: b.stack[0].desktop.split('/').map(Number), mobile: b.stack[0].phone.split('/').map(Number), rows: { desktop: b.section.rows, mobile: 6 }, bp: 'desktop' }); await pause(200);
      const got = await pull(S, c, dx);
      for (const [when, r] of [['held', got.held], ['let go', got.letGo]]) { const w = R[`R1 ${c} narrower 2 ${when}`].stack[0].desktop; groupCases.push({ name: `R2 taller Text narrowed from its ${c} corner, ${when === 'held' ? 'at the drop' : 'let go'}`, diffs: r.desktop === w ? [] : [`area: oracle ${w}, ours ${r.desktop}`] }); }
    }
  }
  // A widening fall moves the blocks below as a typing shrink does (CAP-R2WIDEFALL.json), from each case's before read.
  { const W = JSON.parse(readFileSync(new URL('../parity/findings/CAP-R2WIDEFALL.json', import.meta.url))); const garden = W.steps.find((x) => x[0] === 'keysFast')[1];
    const area = (t) => t.split('/').map(Number);
    for (const c of ['c1 Line 1 row under', 'c2 Shape far under', 'c3 Shape pushed by the typing', 'c4 Shape lower to the right', 'c5 Shape pushed by 1']) {
      const was = W.reads[`${c} before`], got = W.reads[`${c} let go`], type = c.includes('Line') ? 'line' : 'shape';
      const html = `<p>${garden}</p>${c.startsWith('c5') ? '<p><br></p><p><br></p>' : ''}`;
      const ly = (a) => ({ desktop: { area: area(a), z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } });
      evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: ${was.section.rows}, mobile: 6 }, blocks: [{ id: 't', type: 'text', label: 't', html: ${JSON.stringify(html)}, layout: ${JSON.stringify(ly(was.stack[0].desktop))} }, { id: 'o', type: '${type}', fill: '#ccc', label: 'o', layout: ${JSON.stringify(ly(was.stack[1].desktop))} }] }] }); await new Promise((r) => setTimeout(r, 150)); fe.select('s', 't'); await new Promise((r) => setTimeout(r, 150)); return 1; })()`); await pause(60);
      await step(176.34);
      const r = evalJs(S, `JSON.stringify({ a: fe.model.sections[0].blocks.map((x) => x.layout.desktop.area.join('/')), rows: fe.model.sections[0].rows.desktop })`);
      groupCases.push({ name: `R2 ${c}, widened 3`, diffs: [...got.stack.map((x, k) => r.a[k] !== x.desktop && `${k ? 'other' : 'text'}: oracle ${x.desktop}, ours ${r.a[k]}`), r.rows !== got.section.rows && `rows: oracle ${got.section.rows}, ours ${r.rows}`].filter(Boolean) });
    }
  }
  viewport(S, 1600, 1000); await pause(120);
}
// R2, rule S: a one-line Text widened by its east side keeps its rows at the drop when x of its new right grid line has a fraction
// under 0.5 px, and falls when let go. Two agreeing reads each: CAP-R2SUBPIXEL.json and CAP-R2ENDLINE-A/B/C.json R1 (R2 agrees),
// CAP-R2WIDEDROP.json a1, a4, a6 (CAP-TEXTWIDTH7.json f4, f3, f7 agree). Named miss: column 3 to line 15 falls at the drop.
{ const t3 = 'Short note about the mill road and the birch trees above it.', reads = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}.json`, import.meta.url))).reads;
  const sub = ['w1280 L13', 'w1280 L14', 'w1280 L17', 'w1280 L18', 'w1920 L15', 'c3 L15', 'c3 L17'].map((k) => ['CAP-R2SUBPIXEL', `R1 ${k}`, `R1 ${k} written`]);
  const end = [...['L18', 'L19', 'L20', 'L21'].map((k) => ['CAP-R2ENDLINE-A', `R1 ${k}`]), ...['L22', 'L23', 'L24', 'L25'].map((k) => ['CAP-R2ENDLINE-B', `R1 ${k}`]), ...['c3 L15', 'c3 L16', 'c4 L15', 'c4 L16'].map((k) => ['CAP-R2ENDLINE-C', `R1 ${k}`, `R1 ${k} after move`])];
  const drop = ['a1 T3 wider 1', 'a4 T3 wider 4', 'a6 T3 wider 6'].map((k) => ['CAP-R2WIDEDROP', k]);
  const read = () => evalJs(S, `JSON.stringify({ a: fe.model.sections[0].blocks.find((x) => x.id === 't').layout.desktop.area.join('/'), rows: fe.model.sections[0].rows.desktop })`);
  const handle = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), h = f.contentDocument.querySelector('.fe-handle[data-dir="e"]').getBoundingClientRect(); return JSON.stringify([q.left + h.left + h.width / 2, q.top + h.top + h.height / 2]); })()`);
  for (const [f, key, start] of [...sub, ...end, ...drop]) {
    const R = reads(f), w = /w1280/.test(key) ? 1280 : /w1920/.test(key) ? 1920 : 1600, pitch = w === 1280 ? 49.515625 : 58.78125;
    const from = start ? R[start].stack[0].desktop : '1/2/3/10', a0 = from.split('/').map(Number), held = R[`${key} held`], gone = R[`${key} let go`];
    viewport(S, w, 945); await pause(150);
    evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [{ id: 't', type: 'text', label: 't', html: '<p>${t3}</p>', layout: { desktop: { area: ${JSON.stringify(a0)}, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 200)); fe.select('s', 't'); return 1; })()`); await pause(200);
    const dx = (Number(held.stack[0].desktop.split('/')[3]) - a0[3]) * pitch, p = handle();
    mouse(S, 'move', p[0], p[1]); await pause(30); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(30);
    for (let n = 1; n <= 12; n++) { mouse(S, 'move', p[0] + (dx * n) / 12, p[1], { buttons: 1 }); await pause(12); }
    mouse(S, 'up', p[0] + dx, p[1]); await pause(80);
    for (const [when, o] of [['at the drop', held], ['let go', gone]]) {
      if (o === gone) { browser(S, 'press', 'Escape'); await pause(150); }
      const r = read(), miss = o === held && /c3 L15/.test(key);
      groupCases.push({ name: `R2 rule S, ${f} ${key} ${when}`, diffs: [r.a !== o.stack[0].desktop && `area: oracle ${o.stack[0].desktop}, ours ${r.a}`, r.rows !== o.section.rows && `rows: oracle ${o.section.rows}, ours ${r.rows}`].filter(Boolean), ...(miss ? { known: 'rule S misses it: written on column 3 and widened to line 15 (x .28) the oracle falls at the drop, twice in two sessions' } : {}) });
    }
  }
  viewport(S, 1600, 1000); await pause(120);
}
// R2: after a south resize let go over the block last moved while the page scrolled, the page scrolls so its bottom sits at the
// frame's bottom; let go beside it, or with no such move, it stays (rule H, CAP-R2PTR.json 4 of 4 fresh; CAP-RESIZESCROLL4.json v1
// and v2, CAP-R2X2LAST.json se and sw, CAP-R2REMEMBER.json, CAP-R2TWICE.json); an east resize stays (CAP-RESIZESCROLL3.json t3).
{ const lay = (d) => ({ desktop: { area: d, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } });
  const sec = (id, rows, blocks) => ({ id, theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: rows, mobile: 6 }, blocks });
  const frameJs = `const f = document.getElementById('site-frame'), w = f.contentWindow, d = f.contentDocument, q = f.getBoundingClientRect();`;
  const at = (id, dir) => evalJs(S, `(() => { ${frameJs} const r = (${dir ? `d.querySelector('.fe-handle[data-dir="${dir}"]')` : `d.querySelector('.fe-block[data-block-id="${id}"]')`}).getBoundingClientRect(); return JSON.stringify([q.left + r.left + r.width / 2, q.top + r.top + r.height / 2, q.top + w.innerHeight]); })()`);
  const vTop = () => evalJs(S, `(() => { ${frameJs} return JSON.stringify(q.top + d.querySelector('.fe-block[data-block-id="v"]').getBoundingClientRect().top); })()`);
  const scrolled = () => evalJs(S, `(() => { ${frameJs} return JSON.stringify({ y: w.scrollY, bottom: d.querySelector('.fe-block[data-block-id="v"]').getBoundingClientRect().bottom, h: w.innerHeight }); })()`);
  // [name, the move first, the handle, K's area, how many resizes, scrolls]. K on V's columns lets go over V; on 12 to 18 beside it. A K
  // as wide as V lets go on V's edge: its left edge is over V (sw scrolls), its right edge is not (se does not; CAP-R2X2LAST.json).
  for (const [name, moveFirst, dir, k, times, want] of [['south over it', true, 's', [1, 2, 7, 8], 1, true], ['south-west on its left edge', true, 'sw', [1, 2, 7, 8], 1, true],
    ['south-east over it, narrow', true, 'se', [1, 2, 7, 5], 1, true], ['south-east on its right edge', true, 'se', [1, 2, 7, 8], 1, false],
    ['south beside it', true, 's', [1, 12, 7, 18], 1, false], ['south, no move before', false, 's', [1, 2, 7, 8], 1, false],
    ['east after a move', true, 'e', [1, 2, 7, 8], 1, false], ['south over it twice', true, 's', [1, 2, 7, 8], 2, true]]) {
    const blocks = [{ id: 'v', type: 'shape', fill: '#999', label: 'v', layout: lay([1, 2, 17, 8]) }, { id: 'k', type: 'shape', fill: '#ccc', label: 'k', layout: lay(k) }];
    evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: ${JSON.stringify([sec('s', 16, blocks), sec('n', 8, [])])} }); await new Promise((r) => setTimeout(r, 200)); document.getElementById('site-frame').contentWindow.scrollTo(0, 0); return 1; })()`); await pause(300);
    if (moveFirst) { const p = at('v'); cdp(S, { op: 'drag', from: [p[0], p[1]], to: [p[0], p[2] - 30], steps: 12, holdMs: 200 }); await pause(500); }
    const got = [];
    for (let n = 0; n < times; n++) {
      evalJs(S, `document.getElementById('site-frame').contentWindow.scrollTo(0, 0)`); evalJs(S, `fe.select('s', 'k')`); await pause(200);
      // Pressed where the capture tool presses: the block's own corner or side, not the handle's middle.
      const h = evalJs(S, `(() => { ${frameJs} const r = d.querySelector('.fe-block[data-block-id="k"]').getBoundingClientRect(); return JSON.stringify([q.left + (/w/.test('${dir}') ? r.left : /e/.test('${dir}') ? r.right : r.left + r.width / 2), q.top + (/s/.test('${dir}') ? r.bottom : r.top + r.height / 2)]); })()`), dy = Math.max(60, vTop() + 120 - h[1]);
      cdp(S, { op: 'drag', from: [h[0], h[1]], to: dir === 'e' ? [h[0] + 120, h[1]] : [h[0], h[1] + dy], steps: 12, holdMs: 200 }); await pause(400);
      got.push(scrolled());
    }
    const ok = got.every((g) => (want ? g.y > 0 && Math.abs(g.bottom - g.h) < 1.5 : g.y === 0));
    groupCases.push({ name: `R2 ${name}`, diffs: ok ? [] : [`oracle ${want ? 'the moved block at the bottom' : 'no scroll'}, ours ${JSON.stringify(got)}`] });
  }
  // The last case leaves the page scrolled; the cases after it press blocks at the frame's top.
  evalJs(S, `fe.select(null)`); evalJs(S, `document.getElementById('site-frame').contentWindow.scrollTo(0, 0)`);
}
// X2: which handle drags leave a block selected (HANDLEUP.json, a Text's corner and side: CAP-X2STEPS.json), with the real mouse, a pen and touch.
{ const load = async (type, html = '') => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'large', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 6 }, blocks: [{ id: 'k', type: '${type}', label: 'k', fill: '#ccc', html: '${html}', layout: { desktop: { area: [1, 5, 7, 11], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 120)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(40); };
  const at = (dir) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), h = f.contentDocument.querySelector('.fe-handle[data-dir="${dir}"]').getBoundingClientRect(); return JSON.stringify([q.left + h.left + h.width / 2, q.top + h.top + h.height / 2]); })()`);
  const onSel = () => evalJs(S, `JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('.fe-handle').length > 0)`);
  for (const [name, type, dir, dx, dy, how, want] of [['Shape south 35 down', 'shape', 's', 0, 35, 'mouse', false], ['Shape south 65 down', 'shape', 's', 0, 65, 'mouse', false], ['Shape corner 70, 70', 'shape', 'se', 70, 70, 'mouse', false], ['Shape corner 30, 30', 'shape', 'se', 30, 30, 'mouse', true], ['Shape east 120', 'shape', 'e', 120, 0, 'mouse', true], ['Shape south 35 up', 'shape', 's', 0, -35, 'mouse', true], ['Shape north 80 down', 'shape', 'n', 0, 80, 'mouse', true], ['Shape west 70 left', 'shape', 'w', -70, 0, 'mouse', true], ['Line south 80 down', 'line', 's', 0, 80, 'mouse', false], ['Text south 160 down', 'text', 's', 0, 160, 'mouse', true], ['Text corner 20 right', 'text', 'se', 20, 0, 'mouse', false], ['Text corner 60 right', 'text', 'se', 60, 0, 'mouse', false],
    // CAP-X2EDGES.json: the corners' other ways.
    ['Text corner 5 right', 'text', 'se', 5, 0, 'mouse', false], ['Text corner 10 right', 'text', 'se', 10, 0, 'mouse', false], ['Text corner 15 right', 'text', 'se', 15, 0, 'mouse', false],
    ['Text corner 60 left', 'text', 'se', -60, 0, 'mouse', false], ['Text corner 60 up', 'text', 'se', 0, -60, 'mouse', false], ['Text corner 60 down', 'text', 'se', 0, 60, 'mouse', false],
    ['Text north-east 60 right', 'text', 'ne', 60, 0, 'mouse', true], ['Text north-east 60 up', 'text', 'ne', 0, -60, 'mouse', false],
    ['Text south-west 60 left', 'text', 'sw', -60, 0, 'mouse', false], ['Text south-west 60 down', 'text', 'sw', 0, 60, 'mouse', false],
    ['Text north-west 60 left', 'text', 'nw', -60, 0, 'mouse', true], ['Text north-west 60 up', 'text', 'nw', 0, -60, 'mouse', false],
    // CAP-X2UNREAD.json, twice each: a corner pressed with no move, a top corner pulled down, and up 10, 20 and 40.
    ['Text corner pressed, no move', 'text', 'se', 0, 0, 'mouse', false], ['Text north-east pressed, no move', 'text', 'ne', 0, 0, 'mouse', false],
    ['Text north-east 60 down', 'text', 'ne', 0, 60, 'mouse', true], ['Text north-west 60 down', 'text', 'nw', 0, 60, 'mouse', true],
    ['Text north-east 10 up', 'text', 'ne', 0, -10, 'mouse', false], ['Text north-east 20 up', 'text', 'ne', 0, -20, 'mouse', false], ['Text north-east 40 up', 'text', 'ne', 0, -40, 'mouse', false],
    // CAP-X2LEFT.json, twice each: sw and nw pressed with no move, a top corner moved short of a drag.
    ['Text south-west pressed, no move', 'text', 'sw', 0, 0, 'mouse', false], ['Text north-west pressed, no move', 'text', 'nw', 0, 0, 'mouse', false],
    ['Text north-east 5 right', 'text', 'ne', 5, 0, 'mouse', false], ['Text north-east 9 right', 'text', 'ne', 9, 0, 'mouse', false], ['Text north-west 5 up', 'text', 'nw', 0, -5, 'mouse', false],
['Text east 60 right', 'text', 'e', 60, 0, 'mouse', true], ['Shape corner 70, 70 by pen', 'shape', 'se', 70, 70, 'pen', false], ['Shape corner 70, 70 by touch', 'shape', 'se', 70, 70, 'touch', true],
    // CAP-R2X2LAST.json, twice each: touch keeps it where the mouse lets it go.
    ['Shape south 65 down by touch', 'shape', 's', 0, 65, 'touch', true], ['Text corner 60 down by touch', 'text', 'se', 0, 60, 'touch', true], ['Text north-east 60 up by touch', 'text', 'ne', 0, -60, 'touch', true],
    // CAP-X2TOUCHTYPES.json, twice each: a Button and a Quote work like a Shape, kept by touch and let go by the mouse.
    ['Button corner 70, 70 by touch', 'button', 'se', 70, 70, 'touch', true], ['Button corner 70, 70', 'button', 'se', 70, 70, 'mouse', false],
    ['Quote corner 70, 70 by touch', 'quote', 'se', 70, 70, 'touch', true], ['Quote corner 70, 70', 'quote', 'se', 70, 70, 'mouse', false],
    // CAP-X2TOUCH3.json, twice each: Code, Map and Accordion work the same.
    ...['Code', 'Map', 'Accordion'].flatMap((n) => [[`${n} corner 70, 70 by touch`, n.toLowerCase(), 'se', 70, 70, 'touch', true], [`${n} corner 70, 70`, n.toLowerCase(), 'se', 70, 70, 'mouse', false]])]) {
    await load(type, type === 'text' ? '<p>Some text</p>' : ''); const p = at(dir), to = [p[0] + dx, p[1] + dy];
    if (how === 'touch') cdp(S, { op: 'touch', from: p, to, steps: 10, holdMs: 120 }); else cdp(S, { op: 'drag', from: p, to, steps: 10, holdMs: 80, ...(how === 'pen' ? { pointerType: 'pen' } : {}) });
    await pause(150); const got = onSel(); groupCases.push({ name: `X2 ${name}`, diffs: got === want ? [] : [`oracle selected ${want}, ours ${got}`] });
  }
  // CAP-X2TOPLINE.json, twice each: a top corner pulled 60 out and let go 2 to 8 px above the old top is not selected. Pressed
  // where the capture's handleDrag presses, on the block's own corner, not the handle's middle (1px above it).
  for (const [dir, dx, up] of [['ne', 60, 2], ['ne', 60, 4], ['ne', 60, 6], ['ne', 60, 8], ['nw', -60, 4], ['nw', -60, 6]]) {
    await load('text', '<p>Some text</p>');
    const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), r = f.contentDocument.querySelector('.fe-block[data-block-id="k"]').getBoundingClientRect(); return JSON.stringify([q.left + (/w/.test('${dir}') ? r.left : r.right), q.top + r.top]); })()`);
    cdp(S, { op: 'drag', from: p, to: [p[0] + dx, p[1] - up], steps: 12, holdMs: 200 }); await pause(150);
    const got = onSel(); groupCases.push({ name: `X2 Text ${dir} ${dx > 0 ? 'right' : 'left'} 60, ${up} up`, diffs: got === false ? [] : [`oracle selected false, ours ${got}`] });
  }
  // On a phone (CAP-X2PHONE-A to F.json, each read twice, R1 and R2 agreeing; rule R, refit 2, frozen): pressed on the block's own edge or corner.
  { const R = Object.assign({}, ...['A', 'B', 'C', 'D', 'E', 'F'].map((x) => JSON.parse(readFileSync(new URL(`../parity/findings/CAP-X2PHONE-${x}.json`, import.meta.url))).reads));
    for (const c of PHONE_LETGO) {
      const want = R[`R1 ${c[0]}`].block.data['data-is-selected'] === 'true', got = await phoneLetGo(S, c);
      groupCases.push({ name: `X2 phone ${c[0]}`, diffs: got === want ? [] : [`oracle selected ${want}, ours ${got}`] });
    } }
  // A drag on a selected Text: inside its text it opens the editor and stays, under it the block moves (CAP-TEXTPRESS.json).
  for (const [name, below, moved] of [['on the text', 0, false], ['under the text', 30, true]]) {
    await load('text', '<p>Some text</p>');
    const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), t = f.contentDocument.querySelector('.sqs-html-content').getBoundingClientRect(); return JSON.stringify([q.left + t.left + 60, q.top + t.bottom - 4 + ${below}]); })()`);
    cdp(S, { op: 'drag', from: p, to: [p[0] + 118, p[1]], steps: 12, holdMs: 200 }); await pause(200);
    const got = evalJs(S, `JSON.stringify({ a: fe.model.sections[0].blocks[0].layout.desktop.area[1], open: !document.getElementById('text-bar').hidden })`);
    groupCases.push({ name: `X2 selected Text, a drag ${name}`, diffs: [(got.a !== 5) !== moved && `oracle moved ${moved}, ours column ${got.a}`, got.open === moved && `oracle editor ${!moved}, ours ${got.open}`].filter(Boolean) });
    browser(S, 'press', 'Escape'); await pause(60); browser(S, 'press', 'Escape'); await pause(60);
  }
  // A click, then a second click on a Text: the editor opens and the block toolbar hides, so no edge of it shows by the text
  // bar (an oracle shot with the editor open shows nothing there but the bar's own shadow).
  {
    await load('text', '<p>Some text</p>');
    const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), t = f.contentDocument.querySelector('.sqs-html-content').getBoundingClientRect(); return JSON.stringify([q.left + t.left + 60, q.top + t.top + t.height / 2]); })()`);
    for (let n = 0; n < 2; n++) { mouse(S, 'move', p[0], p[1]); await pause(30); mouse(S, 'down', p[0], p[1], { buttons: 1 }); mouse(S, 'up', p[0], p[1]); await pause(400); }
    const got = evalJs(S, `JSON.stringify({ open: !document.getElementById('text-bar').hidden, tb: !document.getElementById('block-toolbar').hidden })`);
    groupCases.push({ name: 'X2 a second click on a Text: the editor, no block toolbar', diffs: [!got.open && 'oracle editor open, ours closed', got.tb && 'oracle no block toolbar, ours shows it'].filter(Boolean) });
    browser(S, 'press', 'Escape'); await pause(60); browser(S, 'press', 'Escape'); await pause(60);
  }
  // After Write and one Escape: a drag from the text opens the editor again and the block stays (CAP-TEXTPRESS a10,
  // CAP-TEXTPRESS3 r1 and r2); a click there opens nothing (CAP-ESC2.json); from under the text it moves right, closed (CAP-X2UNREAD under).
  for (const [name, dx, open, below = 0] of [['a drag on the text', 118, true], ['a click on the text', 0, false], ['a drag from under the text', 118, false, 30]]) {
    await load('text', '<p>Some text</p>'); evalJs(S, `fe.edit('s', 'k')`); await pause(80); browser(S, 'press', 'Escape'); await pause(80);
    const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), t = f.contentDocument.querySelector('.sqs-html-content').getBoundingClientRect(); return JSON.stringify([q.left + t.left + 60, q.top + t.bottom - 4 + ${below}]); })()`);
    if (dx) cdp(S, { op: 'drag', from: p, to: [p[0] + dx, p[1]], steps: 12, holdMs: 200 }); else { mouse(S, 'move', p[0], p[1]); await pause(30); mouse(S, 'down', p[0], p[1], { buttons: 1 }); mouse(S, 'up', p[0], p[1]); }
    await pause(200);
    const got = evalJs(S, `JSON.stringify({ a: fe.model.sections[0].blocks[0].layout.desktop.area[1], open: !document.getElementById('text-bar').hidden })`);
    groupCases.push({ name: `X2 after Write and one Escape, ${name}`, diffs: [(below ? !(got.a > 5) : got.a !== 5) && `oracle ${below ? 'moves right' : 'stays'}, ours column ${got.a}`, got.open !== open && `oracle editor ${open}, ours ${got.open}`].filter(Boolean) });
    browser(S, 'press', 'Escape'); await pause(60); browser(S, 'press', 'Escape'); await pause(60);
  }
}
// X8: Move Forward with a block between the members (CAP-GROUPFORWARD.json): 1, 2, 3 with the first and last selected.
{ const F = JSON.parse(readFileSync(new URL('../parity/findings/CAP-GROUPFORWARD.json', import.meta.url))).reads; const bl = (id, c, z) => ({ id, type: 'shape', label: id, fill: '#ccc', layout: { desktop: { area: [1 + z, c, 6 + z, c + 8], z, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1 + z, 2, 6 + z, 8], z, justify: 'flex-start', align: 'flex-start' } } });
  evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 24 }, blocks: ${JSON.stringify([bl('a', 2, 1), bl('m', 8, 2), bl('c', 14, 3)])} }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(40);
  const got = evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const block = (id) => d.querySelector('.fe-block[data-block-id="' + id + '"]'); const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 }; const click = (id, shiftKey) => { const r = block(id).getBoundingClientRect(); const c = { ...o, shiftKey, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; block(id).dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); };
    fe.select('s', 'a'); click('c', true); await sleep(60); const zs = () => fe.model.sections[0].blocks.map((b) => b.layout.desktop.z).join(); const press = async (a) => { document.querySelector('[data-tb="' + a + '"]').click(); await sleep(80); }; const out = {};
    await press('z+'); out.once = zs(); await press('z+'); out.twice = zs(); await press('z-'); out.back = zs(); return JSON.stringify(out); })()`);
  for (const [name, read, k] of [['forward once', 'forward once', 'once'], ['forward twice', 'forward twice', 'twice'], ['backward once', 'backward once', 'back']]) groupCases.push({ name: `X8 ${name}`, diffs: got[k] === F[read].zs.join() ? [] : [`oracle ${F[read].zs.join()}, ours ${got[k]}`] });
}
// With a selection the box leaves it alone until release (CAP-X13SEL.json, CAP-X13SEL2.json to CAP-X13SEL5.json), with the real mouse.
{ const shape = (id, c) => ({ id, type: 'shape', label: id, fill: '#ccc', layout: { desktop: { area: [1, c, 7, c + 6], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 8], z: 1, justify: 'flex-start', align: 'flex-start' } } });
  const sec = (id, blocks) => ({ id, theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 10, mobile: 8 }, blocks });
  const load = async (cols) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: ${JSON.stringify([sec('s', Object.entries(cols).map(([id, c]) => shape(id, c))), sec('n', [])])} }); await new Promise((r) => setTimeout(r, 120)); document.getElementById('site-frame').contentWindow.scrollTo(0, 0); return 1; })()`); await pause(120); };
  const rect = (id) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), r = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify({ l: q.left + r.left, r: q.left + r.right, t: q.top + r.top, b: q.top + r.bottom }); })()`);
  const look = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, t = document.getElementById('block-toolbar'); return JSON.stringify({ ids: [...d.querySelectorAll('.fe-block[data-is-selected="true"]')].map((e) => e.dataset.blockId).sort().join(), bar: t.hidden ? '' : t.classList.contains('is-group') ? 'group' : 'one', handles: d.querySelectorAll('.fe-handle').length, label: [...d.querySelectorAll('.fe-label.is-on')].map((e) => e.dataset.for).join() }); })()`);
  const click = async (x, y, mods = []) => { mouse(S, 'move', x, y, { mods }); await pause(30); mouse(S, 'down', x, y, { buttons: 1, mods }); mouse(S, 'up', x, y, { mods }); await pause(90); };
  const hold = async (x, y) => { mouse(S, 'move', x, y); await pause(30); mouse(S, 'down', x, y, { buttons: 1 }); await pause(30); };
  const to = async (x, y) => { mouse(S, 'move', x, y, { buttons: 1 }); await pause(60); };
  const up = async (x, y) => { mouse(S, 'up', x, y); await pause(90); };
  const box = (name, got, want) => groupCases.push({ name: `box with a selection: ${name}`, diffs: Object.entries(want).filter(([k, v]) => got[k] !== v).map(([k, v]) => `${k}: oracle ${JSON.stringify(v)}, ours ${JSON.stringify(got[k])}`) });
  const one = (id, handles = 8) => ({ ids: id, bar: 'one', handles });
  const group = (ids) => ({ ids, bar: 'group', handles: 8 });
  const rings = (ids) => ({ ids, bar: '', handles: 0 });
  const two = { l: 2, r: 14 }, three = { l: 2, m: 8, r: 14 };
  const select = async (...ids) => { const a = rect(ids[0]); await click(a.l + 20, a.t + 20); for (const id of ids.slice(1)) { const q = rect(id); await click(q.l + 20, q.t + 20, ['Shift']); } };
  let L, R, y, x;
  await load(two); await select('l'); L = rect('l'); R = rect('r'); y = (L.t + L.b) / 2; x = (L.r + R.l) / 2;
  await hold(x, y); await to(x + 50, y); box('touching nothing, held', look(), { ...one('l'), label: '' });
  await to(R.l + 40, y); box('on another, the pointer on it', look(), { ids: 'l,r', bar: 'one', handles: 8, label: 'r' });
  await to(R.r + 40, y); box('past another', look(), { ids: 'l,r', bar: 'one', handles: 8, label: '' });
  await to(x + 50, y); box('off another', look(), { ...one('l'), label: '' });
  await up(x + 50, y); box('off another, released', look(), one('l'));
  await hold(x, y); await to(L.r - 40, y); box('on itself, held', look(), { ...one('l'), label: '' }); await up(L.r - 40, y); box('on itself, released', look(), one('l'));
  await hold(x, y); await to(R.l + 40, y); await up(R.l + 40, y); box('on another, released', look(), one('r'));
  await load(two); await hold(x, y); await to(R.l + 40, y); box('nothing selected, held', look(), { ...rings('r'), label: 'r' }); await up(R.l + 40, y); box('nothing selected, released', look(), one('r'));
  await load(three); await select('l'); { const M = rect('m'), Y = L.b + 30; await hold(M.l + 60, Y); await to(M.l - 30, L.b - 30); await up(M.l - 30, L.b - 30); box('one, on itself and another', look(), group('l,m')); }
  await load(two); await select('l', 'r'); box('a group', look(), group('l,r'));
  await hold(x, y); await to(x + 50, y); box('a group, touching nothing, held', look(), { ...group('l,r'), label: '' }); await to(R.l + 40, y); box('a group, on a member, held', look(), group('l,r')); await to(x + 50, y); await up(x + 50, y);
  box('a group, touching nothing, released', look(), rings('l,r'));
  evalJs(S, `(() => { const f = document.getElementById('site-frame').contentDocument; for (const t of [document, f]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()`);
  await pause(60); box('its rings stay on Escape', look(), rings('l,r'));
  await click(x, L.b + 40); box('a click on empty ends the rings', look(), rings(''));
  await select('l', 'r'); await hold(x, y); await to(x + 50, y); await up(x + 50, y); await click(R.l + 20, R.t + 20); box('a click on a block after the rings', look(), one('r'));
  await select('r', 'l'); await hold(x, y); await to(x + 50, y); await up(x + 50, y); await hold(x, y); await to(x + 50, y); box('an empty box after the rings, held', look(), rings('l,r')); await up(x + 50, y); box('an empty box after the rings', look(), rings(''));
  await select('l', 'r'); await hold(x, y); await to(x + 50, y); await up(x + 50, y); await hold(x, y); await to(R.l + 40, y); box('a box on a block after the rings, held', look(), { ...rings('l,r') }); await up(R.l + 40, y); box('a box on a block after the rings', look(), one('r'));
  await select('l', 'r'); await hold(x, y); await to(R.l + 40, y); await up(R.l + 40, y); box('a group, on a member, released', look(), group('l,r'));
  await click(x, L.b + 40); await select('l', 'r'); await hold(x, y); await to(x + 20, y); box('a group, under 30px, held', look(), group('l,r')); await up(x + 20, y); box('a group, under 30px, released', look(), rings(''));
  await load(three); await select('l', 'r'); { const M = rect('m'), Y = L.b + 30; await hold((M.l + M.r) / 2, Y); await to((M.l + M.r) / 2, L.b - 30); box('a group, on another, held', look(), { ids: 'l,m,r', bar: 'group', handles: 8 }); await up((M.l + M.r) / 2, L.b - 30); box('a group takes in another', look(), group('l,m,r')); }
  await load(two); await select('l'); { const n = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), r = f.contentDocument.querySelector('[data-section-id="n"]').getBoundingClientRect(); return JSON.stringify(q.top + r.top + 40); })()`); await hold(x, n); await to(x + 50, n); box('a box in the next section, held', look(), one('l')); await up(x + 50, n); box('a box in the next section, released', look(), one('l')); }
  await click(x, L.b + 40); evalJs(S, `fe.select(null)`);
}
// The group toolbar's buttons (CAP-GROUPBAR.json): Forward and Backward only with a member over a block outside the group.
{ const shape = (id, c, z) => ({ id, type: 'shape', label: id, fill: '#ccc', layout: { desktop: { area: [1, c, 7, c + 6], z, justify: 'center', align: 'center' }, mobile: { area: [1 + (z - 1) * 6, 2, 7 + (z - 1) * 6, 10], z, justify: 'center', align: 'center' } } });
  const load = async (cols, phone) => { evalJs(S, `(async () => { fe.setBp('${phone ? 'mobile' : 'desktop'}'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 10, mobile: 24 }, blocks: ${JSON.stringify(cols.map(([id, c, z]) => shape(id, c, z)))} }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`); await pause(100); };
  const bar = (...ids) => evalJs(S, `(async () => { fe.select('s', ${JSON.stringify(ids[0])}); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; for (const id of ${JSON.stringify(ids.slice(1))}) { const r = d.querySelector('.fe-block[data-block-id="' + id + '"]').getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, shiftKey: true, clientX: r.left + 20, clientY: r.top + 20 }; d.elementFromPoint(r.left + 20, r.top + 20).dispatchEvent(new W.PointerEvent('pointerdown', o)); d.dispatchEvent(new W.PointerEvent('pointerup', o)); } await new Promise((r) => setTimeout(r, 120)); return JSON.stringify([...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => b.getAttribute('aria-label') + (b.classList.contains('is-off') ? ' off' : '')).join()); })()`);
  const four = 'Stack Blocks,Align Group,Duplicate,Remove';
  const G = JSON.parse(readFileSync(new URL('../parity/findings/CAP-GROUPBAR.json', import.meta.url))).reads;
  const seen = (name) => ['Stack Blocks', 'Align Group', 'Move Forward', 'Move Backward', 'Duplicate', 'Remove'].filter((l) => G[name].btnState[l]).map((l) => l + (G[name].btnState[l].disabled ? ' off' : '')).join();
  const gb = (name, read, got) => groupCases.push({ name: `group bar: ${name}`, diffs: got === seen(read) ? [] : [`oracle ${seen(read)}, ours ${got}`] });
  const apart = [['l', 2, 1], ['m', 8, 3], ['r', 14, 2]], over = [['l', 2, 1], ['m', 6, 3], ['r', 14, 2]];
  await load(apart); gb('two apart', 'two apart', bar('l', 'm'));
  await load(apart); gb('three apart', 'three apart', bar('l', 'm', 'r'));
  await load(over); gb('two overlapping', 'two overlapping', bar('l', 'm'));
  await load(over); gb('left and right, middle over left', 'left and right, middle over left', bar('l', 'r'));
  await load(over); gb('middle and right, middle over left', 'middle and right, middle over left', bar('m', 'r'));
  await load(over); gb('all three, one overlap', 'all three, one overlap', bar('l', 'm', 'r'));
  await load(apart, true); gb('phone two', 'phone two', bar('l', 'm'));
  // A pin doesn't count for a group, inside or outside it (CAP-X8PIN.json, CAP-X8PIN2.json; R2 and each other agree). The right one is pinned.
  { const pinIt = () => evalJs(S, `(() => { const b = fe.model.sections[0].blocks.find((x) => x.id === 'r'); b.layout.desktop.sticky = { anchor: 'top', offset: 0 }; fe.load(JSON.parse(JSON.stringify(fe.model))); return 1; })()`);
    for (const [file, read, ids] of [['CAP-X8PIN', 'R1 pin outside', ['l', 'm']], ['CAP-X8PIN', 'R1 pin inside', ['l', 'r']], ['CAP-X8PIN', 'R1 pin inside, middle and right', ['m', 'r']], ['CAP-X8PIN', 'R1 all three, pin inside', ['l', 'm', 'r']], ['CAP-X8PIN2', 'R1 pin outside', ['l', 'm']], ['CAP-X8PIN2', 'R1 pin inside', ['l', 'r']]]) {
      const P = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url))).reads[read];
      const want = ['Stack Blocks', 'Align Group', 'Move Forward', 'Move Backward', 'Duplicate', 'Remove'].filter((l) => P.btnState[l]).map((l) => l + (P.btnState[l].disabled ? ' off' : '')).join();
      await load(apart); pinIt(); await pause(150); const got = bar(...ids);
      groupCases.push({ name: `group bar: ${file} ${read}`, diffs: got === want ? [] : [`oracle ${want}, ours ${got}`] });
    } }
  // On a phone, pinned on desktop (A) or in the phone view (B), read on the phone, and B back on desktop (CAP-X8PINPHONE.json, both builds agree).
  { const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-X8PINPHONE.json', import.meta.url))).reads;
    const ONE = ['Edit', 'Align Vertically', 'Pin', 'Move Forward', 'Move Backward', 'Move Up', 'Move Down', 'Duplicate', 'Remove'], GROUP = ['Stack Blocks', 'Align Group', 'Move Forward', 'Move Backward', 'Duplicate', 'Remove'];
    for (const [v, pinIn, views] of [['A', 'desktop', ['phone']], ['B', 'mobile', ['phone', 'desktop']]]) for (const view of views) for (const [name, ids] of Object.entries(PIN_READS)) {
      const st = R[`${v}1 ${view} ${name}`].btnState, want = (ids.length > 1 ? GROUP : ONE).filter((l) => st[l]).map((l) => l + (st[l].disabled ? ' off' : '')).join();
      const got = await pinBar(S, pinIn, view === 'phone' ? 'mobile' : 'desktop', ids);
      groupCases.push({ name: `pin ${v} (${pinIn === 'desktop' ? 'pinned on desktop' : 'pinned on the phone'}), ${view}: ${name}`, diffs: got === want ? [] : [`oracle ${want}, ours ${got}`] });
    } }
  // On a phone the bar stands beside the phone: first button 27 right of it, 1 under the top block's top for a group, 7 for one block (CAP-PHONE.json, CAP-ACCPHONE.json).
  const barAt = (id) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), r = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(), b = document.querySelector('#block-toolbar > .tb-btn').getBoundingClientRect(); return JSON.stringify([Math.round((b.left - q.right) * 10) / 10, Math.round((b.top - q.top - r.top) * 10) / 10]); })()`);
  const at = (name, got, want) => groupCases.push({ name: `phone bar place: ${name}`, diffs: Math.abs(got[0] - want[0]) <= 1 && Math.abs(got[1] - want[1]) <= 1.5 ? [] : [`oracle ${want}, ours ${got}`] });
  const AP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-ACCPHONE.json', import.meta.url))).reads['phone, selected'], PH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PHONE.json', import.meta.url))).reads['phone selected shape'], FR = { right: 1014, top: 55 };
  for (const [name, F] of [['one block', PH], ['one block, Accordion read', AP]]) { await load(apart, true); evalJs(S, `fe.select('s', 'r')`); await pause(120); const e = F.controls.find((c) => c.label === 'Edit').box; at(name, barAt('r'), [e[0] - FR.right, e[1] - (F.block.box[1] + FR.top)]); }
  // At other widths and scrolled to the canvas top, a group on desktop too (CAP-PHONEBAR.json, CAP-GROUPBARTOP.json). x from the phone's right or the block's left, y in the window.
  const PB = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PHONEBAR.json', import.meta.url))).reads, GT = JSON.parse(readFileSync(new URL('../parity/findings/CAP-GROUPBARTOP.json', import.meta.url))).reads;
  const tall = (id, d, m) => ({ id, type: 'shape', label: id, fill: '#ccc', layout: { desktop: { area: d, z: 1, justify: 'center', align: 'center' }, mobile: { area: m, z: 1, justify: 'center', align: 'center' } } });
  const placed = [['1600 one', PB, 1600, 1], ['1600 one, scrolled 130', PB, 1600, 1], ['1600 one, scrolled 180', PB, 1600, 1], ['1600 one, scrolled 300', PB, 1600, 1], ['1600 group', PB, 1600, 2], ['1600 group, scrolled 180', PB, 1600, 2], ['1280 one', PB, 1280, 1], ['1280 group', PB, 1280, 2], ['1024 one', PB, 1024, 1], ['1024 group', PB, 1024, 2], ['desktop group', GT, 1600, 2], ['desktop group, scrolled 180', GT, 1600, 2], ['desktop group, scrolled 300', GT, 1600, 2]];
  for (const [name, F, width, members] of placed) {
    const phone = !name.startsWith('desktop'), R = F[name], want = R.controls.find((c) => c.label === (members > 1 ? 'Stack Blocks' : 'Edit')).box, blockAt = R.block.box;
    viewport(S, width, 1000); await pause(200);
    evalJs(S, `(async () => { fe.setBp('${phone ? 'mobile' : 'desktop'}'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 80, mobile: 80 }, blocks: ${JSON.stringify([tall('l', [30, 2, 36, 8], [30, 2, 36, 10]), tall('m', [30, 10, 36, 16], [36, 2, 42, 10])])} }] }); await new Promise((r) => setTimeout(r, 150)); return 1; })()`); await pause(100);
    if (members > 1) bar('l', 'm'); else { evalJs(S, `fe.select('s', 'l')`); await pause(120); }
    const got = evalJs(S, `(async () => { const f = document.getElementById('site-frame'), W = f.contentWindow, d = f.contentDocument, q = f.getBoundingClientRect(), el = d.querySelector('.fe-block[data-block-id="l"]'); W.scrollTo({ top: W.scrollY + el.getBoundingClientRect().top - ${blockAt[1]}, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 200)); const b = document.querySelector('#block-toolbar > .tb-btn').getBoundingClientRect(), r = el.getBoundingClientRect(); return JSON.stringify([Math.round((${phone} ? b.left - q.right : b.left - q.left - r.left) * 10) / 10, Math.round(b.top * 10) / 10, Math.round(r.top * 10) / 10]); })()`);
    const wantX = phone ? want[0] - (width + 428) / 2 : want[0] - blockAt[0];
    groupCases.push({ name: `bar place: ${name}`, diffs: Math.abs(got[0] - wantX) <= 1 && Math.abs(got[1] - want[1]) <= 1.5 && Math.abs(got[2] - blockAt[1]) <= 1 ? [] : [`oracle ${wantX},${want[1]} under a block at ${blockAt[1]}; ours ${got}`] });
    evalJs(S, `fe.select(null)`);
  }
  viewport(S, 1600, 1000); await pause(200);
  evalJs(S, `fe.select(null); fe.setBp('desktop')`);
}
// A Shape child (CAP-S3ALIGN.json, CAP-S3ALIGN2.json, CAP-S3HUGFIXED.json, CAP-S3HUGMENU.json): Align Vertically moves it with Stretch off, Hug is grey with Stretch on.
{ const SA = JSON.parse(readFileSync(new URL('../parity/findings/CAP-S3ALIGN.json', import.meta.url))).reads, SB = JSON.parse(readFileSync(new URL('../parity/findings/CAP-S3ALIGN2.json', import.meta.url))).reads;
  const kid = (a, size, extra) => ({ id: 'k2', type: 'shape', fill: '#fff', ...extra, size, layout: { desktop: { area: [1, 1, 5, 9], z: 1, justify: a, align: a }, mobile: { area: [1, 1, 5, 9], z: 1, justify: a, align: a } } });
  const load = async (dir, a, size, extra) => { evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 24 }, blocks: [{ id: 'st', type: 'stack', direction: '${dir}', gap: 20, children: [${JSON.stringify(kid(a, size, extra))}], layout: { desktop: { area: [1, 2, 8, 26], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 8, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 150)); return 1; })()`); await pause(60); };
  const offset = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, b = d.querySelector('.stack-child-container').getBoundingClientRect(), q = d.querySelector('.sqs-shape').getBoundingClientRect(); return JSON.stringify([Math.round(q.top - b.top), Math.round(q.width), Math.round(q.height), Math.round(b.width), Math.round(b.height)]); })()`);
  const read = (F, n) => { const k = F[n].kids.kids[1]; return [Math.round(k.shape[1] - k.box[1]), Math.round(k.shape[2]), Math.round(k.shape[3]), Math.round(k.box[2]), Math.round(k.box[3])]; };
  for (const [dir, word, a, F] of [['row', 'in a row', 'flex-start', SA], ['row', 'in a row', 'center', SA], ['row', 'in a row', 'flex-end', SA], ['column', 'in a column', 'flex-start', SA], ['column', 'in a column', 'center', SB], ['column', 'in a column', 'flex-end', SA]]) {
    const n = `Align ${{ 'flex-start': 'Top', center: 'Center', 'flex-end': 'Bottom' }[a]}, W 100, H 200, Stretch off, ${word}`;
    await load(dir, a, { w: '100px', h: '200px' }, { stretch: false }); const got = offset(), want = read(F, n);
    groupCases.push({ name: `Shape child: ${n}`, diffs: JSON.stringify(got) === JSON.stringify(want) ? [] : [`oracle ${want}, ours ${got}`] });
  }
  await load('row', 'center', { w: '100px', h: '200px' }, {}); { const got = offset(); groupCases.push({ name: 'Shape child: Align with Stretch on moves nothing', diffs: got[0] === 0 && got[2] === 200 ? [] : [`ours ${got}`] }); }
  const H = JSON.parse(readFileSync(new URL('../parity/findings/CAP-S3HUGFIXED.json', import.meta.url))).reads;
  const size = (n) => { const k = H[n].kids.kids[1]; return [Math.round(k.shape[1] - k.box[1]), Math.round(k.shape[2]), Math.round(k.shape[3]), Math.round(k.box[2]), Math.round(k.box[3])]; };
  const hug = (axis) => evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); fe.select('s', 'k2'); await sleep(100); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(150); document.querySelector('#block-panel [data-stack="kidopen:${axis}"]').click(); await sleep(80); const b = document.querySelector('#block-panel [data-stack="kid:${axis}:Hug"]'); const off = b.disabled && b.classList.contains('is-off'); b.click(); await sleep(150); const k = fe.model.sections[0].blocks[0].children[0]; const out = { off, size: k.size }; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return JSON.stringify(out); })()`);
  for (const [name, sz, axis] of [['at Fill, W', undefined, 'w'], ['at Fill, H', undefined, 'h'], ['at Fixed, W', { w: '100px', h: 'Fill' }, 'w'], ['at Fixed, H', { w: '100px', h: '200px' }, 'h']]) {
    await load('row', 'center', sz, {}); const got = hug(axis);
    groupCases.push({ name: `Shape child: Hug is grey, ${name}`, diffs: [!got.off && 'offered', JSON.stringify(got.size) !== JSON.stringify(sz) && `size ${JSON.stringify(got.size)}`].filter(Boolean) });
  }
  await load('row', 'center', { w: 'Hug', h: '200px' }, {}); { const got = offset(), want = size('typed hug'); groupCases.push({ name: 'Shape child: typed hug is 300 wide', diffs: got[3] === want[3] ? [] : [`oracle ${want[3]}, ours ${got[3]}`] }); }
  await load('row', 'center', { w: 'Hug', h: '200px' }, { stretch: false }); { const got = offset(), want = size('stretch off'); groupCases.push({ name: 'Shape child: Hug with Stretch off', diffs: JSON.stringify(got) === JSON.stringify(want) ? [] : [`oracle ${want}, ours ${got}`] }); }
  await load('row', 'center', { w: '100px', h: '200px' }, { stretch: false }); { const got = hug('w'); groupCases.push({ name: 'Shape child: Hug offered with Stretch off', diffs: [got.off && 'grey', got.size?.w !== 'Hug' && `w ${got.size?.w}`].filter(Boolean) }); }
  // The stack's open Gap menu, to the oracle's shot (CAP-GAPMENU.json shot): ring, white toggle, menu 50 below the field's top, 11 above and below, corners 6, two plain rows.
  { const G = JSON.parse(readFileSync(new URL('../parity/findings/CAP-GAPMENU.json', import.meta.url))).shot;
    await load('row', 'center', undefined, {});
    const got = evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); fe.select('s', 'st'); await sleep(100); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(150); document.querySelector('#block-panel [data-stack="gapopen"]').click(); await sleep(100);
      const f = document.querySelector('#block-panel .st-gap'), m = f && f.querySelector('.st-gap-menu'), t = f && f.querySelector('[data-stack="gapopen"]'); if (!m) return JSON.stringify(null);
      const q = f.getBoundingClientRect(), mq = m.getBoundingClientRect(), c = getComputedStyle(f), mc = getComputedStyle(m);
      return JSON.stringify({ ring: c.outlineStyle + ' ' + c.outlineWidth + ' ' + c.outlineColor, toggle: getComputedStyle(t).backgroundColor, up: t.innerHTML.includes('M8 14'), menu: [mq.left - q.left, mq.top - q.top, mq.width, mq.height], pad: [mc.paddingTop, mc.paddingBottom], corner: mc.borderRadius, rows: [...m.querySelectorAll('button')].map((b) => [b.textContent, b.getBoundingClientRect().height, b.querySelectorAll('svg').length]) }); })()`);
    const want = { ring: 'solid 2px rgb(14, 14, 14)', toggle: 'rgb(255, 255, 255)', up: true, menu: [G.menu[0] - G.field[0], G.menu[1] - G.field[1], G.menu[2], G.menu[3]], pad: G.menuPadding.map((v) => `${v}px`), corner: `${G.menuCorner}px`, rows: G.rows.map(([t, h]) => [t, h, 0]) };
    groupCases.push({ name: 'Stack Gap menu open', diffs: JSON.stringify(got) === JSON.stringify(want) ? [] : [`oracle ${JSON.stringify(want)}, ours ${JSON.stringify(got)}`] });
    evalJs(S, `fe.select(null)`); }
  // The Size menu's rows: icon, text and tick to the oracle's boxes, the current row grey, the open toggle white (CAP-SIZEMENU.json, CAP-SIZEMENU2.json, CAP-SIZEMENUH.json).
  const SM = JSON.parse(readFileSync(new URL('../parity/findings/CAP-SIZEMENU.json', import.meta.url))).reads, SH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-SIZEMENUH.json', import.meta.url))).reads;
  const shape = (F) => { const rows = F.panelEls.filter((e) => e.tag === 'div'), out = []; rows.forEach((r) => { const inside = F.panelEls.filter((e) => e.box[1] >= r.box[1] && e.box[1] + e.box[3] <= r.box[1] + r.box[3]); out.push([r.label.replace(/ · .*/, ''), r.box[2], r.box[3], ...inside.filter((e) => e.tag === 'svg').map((e) => [e.box[0] - r.box[0], e.box[1] - r.box[1], e.box[2]]).flat(), inside.find((e) => e.tag === 'p').box[0] - r.box[0]]); }); return out; };
  const menu = (axis) => evalJs(S, `(async () => { const sleep = (x) => new Promise((r) => setTimeout(r, x)); fe.select('s', 'k2'); await sleep(100); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(150); document.querySelector('#block-panel [data-stack="kidopen:${axis}"]').click(); await sleep(80); const P = document.querySelector('#block-panel'), rd = (e) => e.getBoundingClientRect(), rows = [...P.querySelectorAll('.st-size-menu button')]; const out = { rows: rows.map((b) => { const q = rd(b), svgs = [...b.querySelectorAll('svg')]; return [(b.querySelector('span') || b).textContent.replace(/ · .*/, ''), Math.round(q.width), Math.round(q.height), ...svgs.map((e) => [rd(e).left - q.left, rd(e).top - q.top, rd(e).width]).flat(), rd(b.querySelector('span') || b).left - q.left]; }), on: rows.filter((b) => getComputedStyle(b).backgroundColor === 'rgb(242, 242, 242)').map((b) => (b.querySelector('span') || b).textContent.replace(/ · .*/, '')), upright: rows.map((b) => { const e = b.querySelector('svg path'); return !!e && rd(e).height > rd(e).width; }), toggle: getComputedStyle(P.querySelector('.st-gap-toggle.is-open') || P.querySelector('.st-gap-toggle')).backgroundColor }; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return JSON.stringify(out); })()`);
  for (const [name, F, sz, axis, on] of [['W at Fill', SM['Shape W at Fill'], undefined, 'w', 'Fill'], ['W at Fixed', SM['Shape W at Fixed'], { w: '100px', h: 'Fill' }, 'w', 'Fixed'], ['H at Fill', SH['Shape H at Fill'], undefined, 'h', 'Fill']]) {
    await load('row', 'center', sz, {}); const got = menu(axis), want = shape(F), near = (a, b) => a.length === b.length && a.every((v, k) => typeof v === 'string' ? v === b[k] : Math.abs(v - b[k]) <= 1);
    const diffs = want.map((w, k) => !near(w, got.rows[k] || []) && `oracle ${w}, ours ${got.rows[k]}`).filter(Boolean);
    if (got.on.join() !== on) diffs.push(`current row ${got.on}`);
    if (got.toggle !== 'rgb(255, 255, 255)') diffs.push(`toggle ${got.toggle}`);
    if (got.upright.some((u) => u !== (axis === 'h'))) diffs.push(`icons ${got.upright}`);
    groupCases.push({ name: `Size menu: ${name}`, diffs });
  }
  evalJs(S, `fe.select(null)`);
}
// S4 on phones (CAP-S4PHONE.json), with the real mouse: the handle, 90 down, 150 up, desktop stays, a click does nothing.
{ const T = JSON.parse(readFileSync(new URL('../parity/findings/CAP-S4PHONE.json', import.meta.url))).reads;
  viewport(S, 1600, 1000); goto(S, `${BASE}/index.html?replay`); waitFor(S, '(() => !!window.fe)()', 20); await pause(400);
  const secId = evalJs(S, `(() => JSON.stringify(fe.model.sections[2].id))()`);
  const read = (bp) => evalJs(S, `(async () => { fe.select(null); fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 120)); const f = document.getElementById('site-frame'), d = f.contentDocument; const sec = d.querySelector('[data-section-id="${secId}"]'); sec.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 150)); const q = f.getBoundingClientRect(), b = sec.getBoundingClientRect(); return JSON.stringify({ x: q.left + b.left + b.width / 2, y: q.top + b.top + b.height / 2, q: q.left }); })()`);
  const handle = () => evalJs(S, `(() => { const h = document.querySelector('.sc-rows'); if (!h) return JSON.stringify(null); const r = h.getBoundingClientRect(), f = document.getElementById('site-frame').getBoundingClientRect(); return JSON.stringify({ left: r.left - f.left, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }); })()`);
  const rows = (bp) => evalJs(S, `JSON.stringify(fe.model.sections[2].rows.${bp})`);
  const drag = async (by) => { const h = handle(); mouse(S, 'move', h.cx, h.cy); await pause(60); mouse(S, 'down', h.cx, h.cy); await pause(40); if (by) { mouse(S, 'move', h.cx, h.cy + by, { buttons: 1 }); await pause(80); } mouse(S, 'up', h.cx, h.cy + by); await pause(120); };
  const at = read('mobile'); mouse(S, 'move', at.x, at.y); await pause(200);
  const h = handle(); const want = T['phone hovered'].sectionHandle.box;
  groupCases.push({ name: 'phone section handle', diffs: [!h && 'no handle', h && !near(h.left, want[0]) && `left: oracle ${want[0]}, ours ${h.left}`, h && h.w !== want[2] && `width ${h.w}`, h && h.h !== want[3] && `height ${h.h}`].filter(Boolean) });
  const r0 = rows('mobile'), d0 = rows('desktop');
  await drag(90); const down = rows('mobile'); await pause(60); const at2 = read('mobile'); mouse(S, 'move', at2.x, at2.y); await pause(200); await drag(-150); const up = rows('mobile');
  groupCases.push({ name: 'phone section handle drags', diffs: [r0 !== T['phone hovered'].section.rows && `start ${r0}`, down !== T['phone 90 down'].section.rows && `90 down: oracle ${T['phone 90 down'].section.rows}, ours ${down}`, up !== T['phone 150 up'].section.rows && `150 up: oracle ${T['phone 150 up'].section.rows}, ours ${up}`, rows('desktop') !== d0 && 'desktop changed'].filter(Boolean) });
  const at3 = read('desktop'); mouse(S, 'move', at3.x, at3.y); await pause(200); const d1 = rows('desktop'); await drag(0);
  groupCases.push({ name: 'a click on the section handle', diffs: [rows('desktop') !== d1 && 'rows changed'].filter(Boolean) });
  evalJs(S, `fe.setBp('desktop')`);
}
// X8: the group size rule, replayed from the reads. A walk gives each box and each block's px on the oracle, a drop its areas.
{ const reads = Object.assign({}, ...['CAP-X8ROWS', 'CAP-X8ROWS2', 'CAP-X8ROWS3'].map((n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads));
  const TYPES = { v: { type: 'button', label: 'Button' }, w: { type: 'text', html: '' } };
  const play = (areas, type, phone, dir, rings, drop = false) => evalJs(S, `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), bp = '${phone ? 'mobile' : 'desktop'}';
    const nums = ${JSON.stringify(areas)}.map((a) => a[${phone ? 1 : 0}].split('/').map(Number));
    fe.setBp(bp);
    fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 40, mobile: 40 }, blocks: nums.map((a, i) => { const l = { area: a, z: i + 1, justify: 'flex-start', align: 'flex-start' }; return { id: 'b' + i, ...(i === 0 && ${JSON.stringify(type || null)}) || { type: 'shape', fill: '#ccc', radius: '0', label: 'b' + i }, layout: { desktop: l, mobile: l } }; }) }] });
    await sleep(120);
    const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow;
    const block = (i) => d.querySelector('.fe-block[data-block-id="b' + i + '"]');
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    fe.select('s', 'b0'); await sleep(30);
    for (let i = 1; i < nums.length; i++) { const r = block(i).getBoundingClientRect(), c = { ...o, shiftKey: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; block(i).dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); await sleep(30); }
    const m = fe.measure('s'), top = block(0).parentElement.getBoundingClientRect().top;
    const el = d.querySelector('.fe-indicator.is-group .fe-handle[data-dir="${dir}"]'), q = el.getBoundingClientRect(), x0 = q.left + q.width / 2, y0 = q.top + q.height / 2;
    const move = (x, y) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: y, buttons: 1 }));
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x0, clientY: y0, buttons: 1 }));
    move(x0 + 14, y0); await sleep(15); move(x0, y0); await sleep(15);
    const out = []; let x = x0, y = y0;
    for (const [r0, c0, r1, c1] of ${JSON.stringify(rings)}) {
      if ('${dir}'.includes('e')) x = m.colEnd[c1 - 2]; if ('${dir}'.includes('w')) x = m.colStart[c0 - 1];
      if ('${dir}'.includes('s')) y = top + (r1 - 1) * m.pitch - m.rg; if ('${dir}'.includes('n')) y = top + (r0 - 1) * m.pitch;
      move(x, y); await sleep(10);
      out.push({ ring: W.getComputedStyle(d.querySelector('.fe-transform-indicator')).gridArea.replace(/ /g, ''), blocks: nums.map((_, i) => W.getComputedStyle(block(i)).gridArea.replace(/ /g, '')) });
    }
    d.dispatchEvent(new W.PointerEvent(${drop ? "'pointerup'" : "'pointercancel'"}, { ...o, clientX: x, clientY: y, buttons: 0 })); await sleep(60);
    const after = fe.model.sections[0].blocks.map((b) => b.layout[bp].area.join('/'));
    fe.setBp('desktop');
    return JSON.stringify({ out, after }); })()`);
  for (const [name, r] of Object.entries(reads)) {
    if (!r.walk) continue;
    const phone = name === 'x', pitch = phone ? 35 : 41.09, tile = 58.78, start = reads[`${name} start`].areas, w = r.walk;
    const table = new Map();
    for (const leg of ['yOut', 'yBack', 'yHome', 'xOut', 'xBack', 'xHome']) for (const [, row] of w[leg] || []) {
      const [ring, rest] = row.split(' | ');
      table.set(ring, rest.split(' ').map((b) => { const [v, h] = b.split('@'), [t, ht] = v.split('+').map(Number), [l, wd] = (h || '0+0').split('+').map(Number); return { row: Math.round(t / pitch) + 1, rows: Math.round((ht + 11) / pitch), l, cols: Math.round((wd + 11) / tile) }; }));
    }
    const across = w.xOut?.length > 0, L0 = across ? Number(w.from.split(' | ')[1].split(' ')[0].split('@')[1].split('+')[0]) : 0, c0 = Number(start[0][0].split('/')[1]);
    const rings = [...table.keys()].map((k) => k.split('/').map(Number));
    const got = play(start, TYPES[name], phone, w.part, rings);
    const diffs = [];
    rings.forEach((ring, k) => {
      const key = ring.join('/'), g = got.out[k];
      if (g.ring !== key) { diffs.push(`box: oracle ${key}, ours ${g.ring}`); return; }
      table.get(key).forEach((want, i) => {
        const [r0, c1, r1, c2] = g.blocks[i].split('/').map(Number);
        if (across) { const cs = c0 + Math.round((want.l - L0) / tile); if (c1 !== cs || c2 - c1 !== want.cols) diffs.push(`${key} block ${i}: oracle columns ${cs}, ${want.cols} wide, ours ${c1}, ${c2 - c1} wide`); } else if (r0 !== want.row || r1 - r0 !== want.rows) diffs.push(`${key} block ${i}: oracle row ${want.row}, ${want.rows} tall, ours ${r0}, ${r1 - r0} tall`);
      });
    });
    groupCases.push({ name: `group table ${name}`, diffs });
  }
  for (const [name, r] of Object.entries(reads)) {
    if (!/^[biu]\d/.test(name) || / undone$/.test(name)) continue;
    const start = reads[`${name[0]} start`].areas, want = r.areas.map((a) => a[0]);
    const box = want.map((a) => a.split('/').map(Number)), ring = [Math.min(...box.map((a) => a[0])), Math.min(...box.map((a) => a[1])), Math.max(...box.map((a) => a[2])), Math.max(...box.map((a) => a[3]))];
    const got = play(start, null, false, 'se', [ring], true);
    groupCases.push({ name: `group drop by the rule ${name}`, diffs: want.flatMap((a, i) => (got.after[i] === a ? [] : [`block ${i}: oracle ${a}, ours ${got.after[i]}`])) });
  }
  // A written Text made narrower in a group keeps the rows it needed at the press (CAP-X8NEXT.json, c start to c dropped).
  { const N = JSON.parse(readFileSync(new URL('../parity/findings/CAP-X8NEXT.json', import.meta.url))).reads, one = 'Old stones by the water, a bench and a view of the far shore, then the path turns back toward the trees and the long road home.';
    const want = N['c dropped'].areas.map((a) => a[0]), got = play(N['c start'].areas, { type: 'text', html: `<p>${[one, one, one].join(' ')}</p>` }, false, 'e', [[1, 2, 8, 14]], true);
    groupCases.push({ name: 'group drop keeps a written Text short', diffs: want.flatMap((a, i) => (got.after[i] === a ? [] : [`block ${i}: oracle ${a}, ours ${got.after[i]}`])) });
    // The next gesture after it moves rows in, section-wide (CAP-X8LAG*.json): each read whose next gesture is a drag
    // of one block down, replayed from its start: the group made narrower from the east, then that block moved.
    const L = Object.assign({}, ...['CAP-X8LAG', 'CAP-X8LAG2', 'CAP-X8LAG3'].map((n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads));
    const MOVES = { l1: [[1], 0, 2], l3: [[1], 1, 1], l6: [[2], 1, 1], m2: [[1], 0, 2], m4: [[1], 0, 2], n2: [[1], 0, 1], n5: [[1], 0, 1] };
    for (const [n, [members, k, rows]] of Object.entries(MOVES)) {
      const start = L[`${n} start`].areas, box = L[`${n} dropped`].areas.filter((_, i) => i === 0 || members.includes(i)).map((a) => a[0].split('/').map(Number));
      const c1 = Math.max(...box.map((a) => a[3])), want = L[`${n} next`].areas.map((a) => a[0]);
      const got = evalJs(S, `(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        fe.setBp('desktop');
        fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 30, mobile: 40 }, blocks: ${JSON.stringify(start)}.map((a, i) => { const L = (v) => ({ area: v.split('/').map(Number), z: i + 1, justify: 'flex-start', align: 'flex-start' }); return { id: 'b' + i, ...(i === 0 ? { type: 'text', html: ${JSON.stringify(`<p>${[one, one, one].join(' ')}</p>`)} } : { type: 'shape', fill: '#ccc', radius: '0', label: 'b' + i }), layout: { desktop: L(a[0]), mobile: L(a[1]) } }; }) }] });
        await sleep(150);
        const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, block = (i) => d.querySelector('.fe-block[data-block-id="b' + i + '"]');
        const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 }, at = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
        const down = (el, x, y, more = {}) => el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, ...more, clientX: x, clientY: y, buttons: 1 }));
        const move = (x, y) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: y, buttons: 1 }));
        const up = (x, y, more = {}) => d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, ...more, clientX: x, clientY: y, buttons: 0 }));
        fe.select('s', 'b0'); await sleep(30);
        for (const i of ${JSON.stringify(members)}) { const [x, y] = at(block(i)); down(block(i), x, y, { shiftKey: true }); up(x, y, { shiftKey: true }); await sleep(30); }
        const m = fe.measure('s'), h = d.querySelector('.fe-indicator.is-group .fe-handle[data-dir="e"]'), [x0, y0] = at(h);
        down(h, x0, y0); move(x0 + 14, y0); await sleep(15); move(x0, y0); await sleep(15);
        move(m.colEnd[${c1} - 2], y0); await sleep(15); up(m.colEnd[${c1} - 2], y0); await sleep(80);
        fe.select(null); await sleep(30);
        const [bx, by] = at(block(${k}));
        down(block(${k}), bx, by); for (let s = 1; s <= 8; s++) { move(bx, by + s * ${rows} * m.pitch / 8); await sleep(15); } up(bx, by + ${rows} * m.pitch); await sleep(80);
        return JSON.stringify(fe.model.sections[0].blocks.map((b) => b.layout.desktop.area.join('/'))); })()`);
      groupCases.push({ name: `next gesture after a short Text ${n}`, diffs: want.flatMap((a, i) => (got[i] === a ? [] : [`block ${i}: oracle ${a}, ours ${got[i]}`])) });
    } }
}
// 81: a pressed block is selected on let go, not on the press nor while it is dragged (CAP-SELECTLETGO.json, part a and c).
{ const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-SELECTLETGO.json', import.meta.url))).reads, on = (k) => R[k].block.data['data-is-selected'];
  for (const [name, at] of [['a press, 11 px, let go', [0, 11]], ['a press, 14 px, let go', [0, 7, 14]], ['c 35, 70 px, let go', [0, 35, 70]]]) {
    const keys = name[0] === 'a' ? ['a pressed', `a ${at[1]} px`, ...(at[2] ? [`a ${at[2]} px`] : []), 'a let go'] : ['c 35 px', 'c 35 px', 'c 70 px', 'c let go'];
    const got = evalJs(S, `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      fe.setBp('desktop');
      fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 8 }, blocks: [{ id: 'b0', type: 'button', label: 'Button', layout: { desktop: { area: [1, 2, 3, 8], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 3, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] });
      await sleep(150);
      const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, el = d.querySelector('.fe-block[data-block-id="b0"]'), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 }, out = [];
      el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 })); await sleep(30);
      for (const dx of ${JSON.stringify(at)}) { if (dx) d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + dx, clientY: y, buttons: 1 })); await sleep(30); out.push(d.querySelector('.fe-block[data-block-id="b0"]').dataset.isSelected); }
      d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, clientX: x + ${at[at.length - 1]}, clientY: y, buttons: 0 })); await sleep(80);
      out.push(d.querySelector('.fe-block[data-block-id="b0"]').dataset.isSelected);
      fe.select(null);
      return JSON.stringify(out); })()`);
    const want = keys.map(on);
    groupCases.push({ name: `selected on let go: ${name}`, diffs: got.flatMap((v, i) => (v === want[i] ? [] : [`step ${i}: oracle ${want[i]}, ours ${v}`])) });
  }
}
const groupFails = groupCases.filter((c) => c.diffs.length && !c.known);
const groupKnown = groupCases.filter((c) => c.known);
for (const c of groupFails) console.log(`DIFF ${c.name}\n  ${c.diffs.join('\n  ')}`);
for (const c of groupKnown) if (!c.diffs.length) { console.log(`Known miss gone: ${c.name}`); groupFails.push(c); }
console.log(`Group resize, marquee, layers and holds: ${groupCases.length - groupFails.length - groupKnown.length} of ${groupCases.length} match, ${groupKnown.length} named known miss`);
writeFileSync(new URL('../parity/mid-check.json', import.meta.url), JSON.stringify({ check: 'mid-gesture flags, guides, center snap and group resize', pass: pass + guidePass + groupCases.length - groupFails.length - groupKnown.length, known: groupKnown.map((c) => c.name), total: traces.length + groupCases.length + cases.length, results, guides: guideResults, groups: groupCases }, null, 2) + '\n');
process.exit(pass === traces.length && guidePass === cases.length && !groupFails.length ? 0 : 1);
