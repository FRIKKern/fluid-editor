// X2: hold each recorded drag and resize in our editor and compare what the blocks say while held
// with the trace's mid state: near, matching width and height, selected, the grid in one section.
// G5, G6: then hold what parity/findings/GUIDES.json measured and compare the target area, the
// ring box, the center line and the width of the held block. X8, X13, Z3: the group handles, the marquee, the Layers rows. X6, X7, S4: handles by type, modifiers, the phone section handle.
// X2: where a held block sits and the center line on phones (HOLD.json).
// Runs on headless Chrome. Writes parity/mid-check.json. Usage: npm run mid-check.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, waitFor, mouse } from './lib/cmux.mjs';
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
    const held = !!document.querySelector('.lp-ghost') === (Math.abs(st.by) >= 4) && (Math.abs(st.by) < 4 || !!panel.querySelector('.lp-row.is-slot')) && getComputedStyle(li).userSelect === 'none';
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
{ const r = evalJs(S, `(async () => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="' + s.blocks[2].id + '"]'); b.scrollIntoView({ block: 'center' }); await sleep(150); fe.select(s.id, s.blocks[2].id); await sleep(30);
    document.querySelector('button[data-sc="layers"]').click(); await sleep(50);
    const p = document.getElementById('layers-panel').getBoundingClientRect(), li = document.querySelector('#layers-panel li[data-layer="' + s.blocks[2].id + '"]'), q = li.getBoundingClientRect(), st = getComputedStyle(li), ic = li.querySelector('.lp-icon svg').getBoundingClientRect(), n = li.querySelector('.lp-name').getBoundingClientRect();
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
  const after = fe.model.sections[0].blocks[0].layout['${sw.view || 'desktop'}'].area.join(' / ');
  fe.setBp('desktop'); return JSON.stringify({ out, after }); })()`);
for (const sw of H.sweeps) {
  const { out } = sweep(sw, sw.moves.map((m) => [m.dx, m.dy]), 'pointercancel', sw.handle || null);
  sw.moves.forEach((m, k) => {
    const g = out[k], name = `hold ${sw.name} ${m.dx},${m.dy}`;
    const diffs = [];
    if (g.ring !== m.ring) diffs.push(`ring: oracle ${m.ring}, ours ${g.ring}`);
    for (const key of ['bx', 'by', 'w', 'h', 'gapBelow', 'otherTx', 'feH']) if (m[key] !== undefined && !near(g[key], m[key])) diffs.push(`${key}: oracle ${m[key]}, ours ${g[key]}`);
    if (m.line !== undefined && g.line !== m.line) diffs.push(`line: oracle ${m.line}, ours ${g.line}`);
    groupCases.push({ name, diffs, known: H.knownMisses.some((x) => x.sweep === sw.name && x.at.includes(m.dx)) });
  });
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
      const hs = [...d.querySelectorAll('.fe-handle')]; const q = d.querySelector('.fe-block').getBoundingClientRect(); const on = (fx) => !!d.elementFromPoint(q.left + q.width * fx, q.top + q.height / 2)?.closest('.fe-handle');
      out[type] = { cursors: hs.map((h) => W.getComputedStyle(h).cursor).join(), size: hs[0] && hs[0].getBoundingClientRect().width, middle: on(0.5), along: on(0.3) }; }
    return JSON.stringify(out); })()`);
  const CUR = 'nw-resize,row-resize,ne-resize,col-resize,se-resize,row-resize,sw-resize,col-resize';
  for (const [type, g] of Object.entries(got)) groupCases.push({ name: `handles on ${type}`, diffs: [g.cursors !== CUR && `cursors ${g.cursors}`, g.size !== 34 && `hit box ${g.size}`, type === 'line' && !g.middle && 'the middle of a Line is not on a handle', g.along && 'a press 30 percent along is on a handle'].filter(Boolean) });
}
// X6 with the real mouse (LINEHIT.json): 30 percent along moves a selected one-row Line, the middle grows it, a click keeps it selected.
{ const load = async (area) => evalJs(S, `(async () => { fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 6 }, blocks: [{ id: 'k', type: 'line', label: 'k', layout: { desktop: { area: ${JSON.stringify(area)}, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); await new Promise((r) => setTimeout(r, 80)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 60)); return JSON.stringify(1); })()`);
  const at = (fx) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), b = f.contentDocument.querySelector('.fe-block').getBoundingClientRect(); return JSON.stringify({ x: q.left + b.left + b.width * ${fx}, y: q.top + b.top + b.height / 2 }); })()`);
  const area = () => evalJs(S, `JSON.stringify(fe.model.sections[0].blocks[0].layout.desktop.area.join('/'))`);
  const selected = () => evalJs(S, `JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('.fe-handle').length === 8)`);
  const press = async (fx, dx, dy) => { const p = at(fx); mouse(S, 'move', p.x, p.y); await pause(40); mouse(S, 'down', p.x, p.y, { buttons: 1 }); await pause(40); if (dx || dy) { mouse(S, 'move', p.x + dx / 2, p.y + dy / 2, { buttons: 1 }); await pause(40); mouse(S, 'move', p.x + dx, p.y + dy, { buttons: 1 }); await pause(60); } mouse(S, 'up', p.x + dx, p.y + dy); await pause(120); };
  await load([3, 4, 4, 8]); await press(0.3, 60, 50); const moved = area();
  await load([4, 5, 5, 9]); await press(0.5, 60, 50); const grown = area();
  await load([1, 2, 2, 6]); await press(0.3, 0, 0); const one = selected(); await pause(500); await press(0.3, 0, 0); const two = selected();
  groupCases.push({ name: 'a selected Line: moved, grown, clicked', diffs: [moved !== '4/5/5/9' && `30 percent along: oracle 4/5/5/9, ours ${moved}`, grown !== '4/5/6/9' && `the middle: oracle 4/5/6/9, ours ${grown}`, !one && 'a click deselected it', !two && 'a second click deselected it'].filter(Boolean) });
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
const groupFails = groupCases.filter((c) => c.diffs.length && !c.known);
const groupKnown = groupCases.filter((c) => c.known);
for (const c of groupFails) console.log(`DIFF ${c.name}\n  ${c.diffs.join('\n  ')}`);
for (const c of groupKnown) if (!c.diffs.length) { console.log(`Known miss gone: ${c.name}`); groupFails.push(c); }
console.log(`Group resize, marquee, layers and holds: ${groupCases.length - groupFails.length - groupKnown.length} of ${groupCases.length} match, ${groupKnown.length} named known miss`);
writeFileSync(new URL('../parity/mid-check.json', import.meta.url), JSON.stringify({ check: 'mid-gesture flags, guides, center snap and group resize', pass: pass + guidePass + groupCases.length - groupFails.length - groupKnown.length, known: groupKnown.map((c) => c.name), total: traces.length + groupCases.length + cases.length, results, guides: guideResults, groups: groupCases }, null, 2) + '\n');
process.exit(pass === traces.length && guidePass === cases.length && !groupFails.length ? 0 : 1);
