// X2: hold each recorded drag and resize in our editor and compare what the blocks say while held
// with the trace's mid state: near, matching width and height, selected, the grid in one section.
// G5, G6: then hold what parity/findings/GUIDES.json measured and compare the target area, the
// ring box, the center line and the width of the held block. X8, X13, Z3: the group handles, the marquee, the Layers rows.
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
layerCase('drags', LY.steps);
layerCase('with a hole', LY.hole.steps, LY.hole.removed);
const groupFails = groupCases.filter((c) => c.diffs.length && !c.known);
const groupKnown = groupCases.filter((c) => c.known);
for (const c of groupFails) console.log(`DIFF ${c.name}\n  ${c.diffs.join('\n  ')}`);
for (const c of groupKnown) if (!c.diffs.length) { console.log(`Known miss gone: ${c.name}`); groupFails.push(c); }
console.log(`Group resize, marquee and layers: ${groupCases.length - groupFails.length - groupKnown.length} of ${groupCases.length} match, ${groupKnown.length} named known miss`);
writeFileSync(new URL('../parity/mid-check.json', import.meta.url), JSON.stringify({ check: 'mid-gesture flags, guides, center snap and group resize', pass: pass + guidePass + groupCases.length - groupFails.length - groupKnown.length, known: groupKnown.map((c) => c.name), total: traces.length + groupCases.length + cases.length, results, guides: guideResults, groups: groupCases }, null, 2) + '\n');
process.exit(pass === traces.length && guidePass === cases.length && !groupFails.length ? 0 : 1);
