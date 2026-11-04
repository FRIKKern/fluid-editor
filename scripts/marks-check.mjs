// Small marks of the editor chrome against parity/findings/MARKS.json and TOPBAR.json, with real input in our editor.
// Writes parity/marks-check.json. Usage: npm run marks-check (FLUID_SURFACE=cdp:<port> FLUID_PORT=<port>).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, browser, drag, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/MARKS.json', import.meta.url)));
let pass = 0, total = 0;
const fails = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; else { fails.push(what); console.log(`${what.padEnd(48)} DIFF ${detail}`); } };
const fresh = async () => {
  goto(S, `${BASE}/index.html`); await pause(800);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(1500);
};
viewport(S, 1600, 1000);

// U13: the block panel's drag limits, and where it reopens.
await fresh();
const shape = evalJs(S, `(() => { for (const s of fe.model.sections) for (const b of s.blocks) if (b.type === 'shape') { fe.select(s.id, b.id); return JSON.stringify([s.id, b.id]); } return 'null'; })()`);
await pause(300);
browser(S, 'click', '[data-tb="edit"]'); await pause(400);
const box = () => evalJs(S, `(() => { const p = document.querySelector('#block-panel'); if (p.hidden) return 'null'; const q = p.getBoundingClientRect(); return JSON.stringify([q.left, q.top, q.width, q.height]); })()`);
const grab = (b) => [b[0] + b[2] - 30, b[1] + 10];
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
const first = box();
const [dx, dy] = F.panelMove.dragBy;
drag(S, grab(first), [grab(first)[0] + dx, grab(first)[1] + dy]); await pause(200);
const moved = box();
add('panel follows the drag', near(moved, [first[0] + dx, first[1] + dy, first[2], first[3]]), `${moved} from ${first}`);
drag(S, grab(moved), [1590, 990]); await pause(200);
let b = box();
add('panel stops toward the bottom right', near(b.slice(0, 2), [1600 + 6 - b[2], 1000 + 22 - b[3]]), String(b));
drag(S, grab(b), [5, 5]); await pause(200);
b = box();
add('panel stops toward the top left', near(b.slice(0, 2), F.panelMove.towardTopLeft.slice(0, 2)), String(b));
drag(S, grab(b), [900, 400]); await pause(200);
browser(S, 'press', 'Escape'); await pause(300);
add('Escape closes the panel', box() === null);
evalJs(S, `(() => { fe.select(${JSON.stringify(shape[0])}, ${JSON.stringify(shape[1])}); return 'true'; })()`); await pause(200);
browser(S, 'click', '[data-tb="edit"]'); await pause(400);
b = box();
add('panel reopens at its first place', near(b, first), `${b} first ${first}`);

// U2: how the grid is drawn, at the widths read on the oracle. A 14px hold, never dropped on a new cell.
const R = (a, b) => Math.abs(a - b) <= 0.01;
const readGrid = () => evalJs(S, `(() => {
  const d = document.querySelector('iframe').contentDocument, W = d.defaultView;
  const fe = d.querySelector('.fluid-engine[data-grid-is-visible="true"]');
  const row = fe.querySelector('.fe-grid-row'), svg = row.querySelector('svg');
  const p = svg.querySelector('pattern'), c = p.querySelector('rect'), q = svg.getBoundingClientRect(), cs = W.getComputedStyle(row);
  const A = (e, n) => e.getAttribute(n);
  return JSON.stringify({ left: q.left - fe.getBoundingClientRect().left, width: q.width, section: fe.getBoundingClientRect().width, rowH: row.getBoundingClientRect().height, opacity: cs.opacity, z: cs.zIndex, tile: parseFloat(A(p, 'width')), cellW: parseFloat(A(c, 'width')), cellH: parseFloat(A(c, 'height')), attrs: [A(c, 'x'), A(c, 'y'), A(c, 'rx'), A(c, 'stroke-width'), A(c, 'stroke'), A(c, 'fill'), A(p, 'height'), A(p, 'patternUnits')].join(' ') });
})()`);
for (const [name, w, mode] of [['1600', 1600, 'desktop'], ['1280', 1280, 'desktop'], ['phone', 1600, 'mobile']]) {
  viewport(S, w, 1000);
  await fresh();
  if (mode === 'mobile') { evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600); }
  const want = F.grid.readings[name];
  const at = evalJs(S, `(() => { const f = document.querySelector('iframe'), d = f.contentDocument, W = d.defaultView; const s = fe.model.sections[2], b = s.blocks.find((x) => x.type === 'shape'); const el = d.querySelector('.fe-block[data-block-id="' + b.id + '"]'); W.scrollTo(0, el.closest('.fluid-engine').getBoundingClientRect().top + W.scrollY - 150); const q = el.getBoundingClientRect(), r = f.getBoundingClientRect(); return JSON.stringify([q.left + r.left + q.width / 2, q.top + r.top + q.height / 2]); })()`);
  mouse(S, 'move', at[0], at[1]); mouse(S, 'down', at[0], at[1], { buttons: 1 });
  for (let k = 1; k <= 7; k++) { mouse(S, 'move', at[0], at[1] + 2 * k, { buttons: 1 }); await pause(25); }
  await pause(200);
  const g = readGrid();
  mouse(S, 'up', at[0], at[1] + 14, { buttons: 0 }); await pause(200);
  add(`grid box ${name}`, R(g.section, want.section) && R(g.left, want.left) && R(g.width, want.section - want.inset), JSON.stringify(g));
  add(`grid tile and cell ${name}`, R(g.tile, want.tile) && R(g.cellW, want.cellW) && R(g.cellH, want.cellH) && R(g.rowH, want.rowH), JSON.stringify(g));
  add(`grid cell look ${name}`, g.attrs === '0.5 0.5 3 1 #B7B7B7 #F2F2F240 100% userSpaceOnUse' && g.opacity === String(F.grid.row.opacity) && g.z === F.grid.row.zIndex, `${g.attrs} ${g.opacity} ${g.z}`);
}
viewport(S, 1600, 1000);

// U3, Z5: hover, selection, text editing and groups, with real mouse moves.
const SEC = 2;
const BIDS = { head: 'yui_3_17_2_1_1793705593367_15917', text: 'yui_3_17_2_1_1793705593367_16145', shape: 'yui_3_17_2_1_1793705593367_16395' };
const FR = `const f = document.querySelector('iframe'), d = f.contentDocument, W = d.defaultView, fr = f.getBoundingClientRect();`;
const boxOf = (id) => evalJs(S, `(() => { ${FR} const q = d.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify([q.left + fr.left, q.top + fr.top, q.width, q.height]); })()`);
const state = () => evalJs(S, `(() => { ${FR}
  const ind = [...d.querySelectorAll('.fe-indicator')].map((e) => ({ cls: e.className, z: W.getComputedStyle(e).zIndex, top: e.getBoundingClientRect().top + fr.top, handles: e.querySelectorAll('.fe-handle').length, inner: W.getComputedStyle(e, '::before').borderTopColor, outer: W.getComputedStyle(e, '::after').borderTopColor }));
  const pills = [...d.querySelectorAll('.fe-label')].filter((e) => W.getComputedStyle(e).opacity === '1').map((e) => { const q = e.getBoundingClientRect(), t = e.firstElementChild, c = W.getComputedStyle(t); return { id: e.dataset.for, z: W.getComputedStyle(e).zIndex, x: q.left + fr.left, y: q.top + fr.top, w: q.width, h: q.height, text: t.textContent, font: [c.fontSize, c.lineHeight, c.letterSpacing, c.textTransform, c.fontWeight, c.backgroundColor, c.color, c.paddingLeft].join(' '), radius: W.getComputedStyle(e).borderRadius }; });
  return JSON.stringify({ ind, pills, grid: d.querySelectorAll('.fluid-engine[data-grid-is-visible="true"]').length }); })()`);
const at = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
const moveTo = async ([x, y]) => { mouse(S, 'move', x, y); await pause(120); };
const away = () => moveTo([20, 996]);
viewport(S, 1600, 1000);
await fresh();
evalJs(S, `(() => { ${FR} W.scrollTo({ left: 0, top: W.scrollY + d.querySelector('.fe-block[data-block-id="${BIDS.text}"]').getBoundingClientRect().top - 354.6, behavior: 'instant' }); return 'true'; })()`);
await pause(300);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[${SEC}].id))()`);
const zs = evalJs(S, `(() => JSON.stringify(Object.fromEntries(fe.model.sections[${SEC}].blocks.map((b) => [b.id, b.layout[fe.bp].z]))))()`);
const [shapeBox, textBox, headBox] = [boxOf(BIDS.shape), boxOf(BIDS.text), boxOf(BIDS.head)];
await away();
let st = state();
add('nothing at rest', st.ind.length === 0 && st.pills.length === 0, JSON.stringify(st));
await moveTo(at(shapeBox));
st = state();
const ringsOk = (i) => i && i.inner === 'rgb(2, 122, 255)' && i.outer === 'rgb(108, 164, 244)';
add('hover: rings at 10000 + z, no handles', st.ind.length === 1 && st.ind[0].z === String(10000 + zs[BIDS.shape]) && ringsOk(st.ind[0]) && st.ind[0].handles === 0, JSON.stringify(st.ind));
const p0 = st.pills[0] || {};
add('hover: the pill, 22px above at the left', st.pills.length === 1 && p0.id === BIDS.shape && near([p0.x, p0.y, p0.h], [shapeBox[0], shapeBox[1] - 22, 16]) && p0.z === '1000000' && p0.radius === '3px', JSON.stringify(p0));
add('pill look', p0.font === '9.75px 16px 0.75px uppercase 500 rgb(2, 122, 255) rgb(255, 255, 255) 8px', p0.font);
add('pill text and width', p0.text === 'Shape' && Math.abs(p0.w - F.labels.width.Shape) <= 1, `${p0.text} ${p0.w}`);
// The strip above the paragraph takes the pointer, on top of the heading.
const strip = [textBox[0] + 20, textBox[1] - 14];
await moveTo(strip);
st = state();
add('pill strip: no hover under it', st.ind.length === 0 && st.pills.length === 0, JSON.stringify(st));
const stripEl = evalJs(S, `(() => { ${FR} const e = d.elementFromPoint(${strip[0]} - fr.left, ${strip[1]} - fr.top); return JSON.stringify([e.className, W.getComputedStyle(e).cursor]); })()`);
add('pill strip: the cursor is auto', stripEl[0] === 'fe-label' && stripEl[1] === 'auto', String(stripEl));
await moveTo([textBox[0] + 200, textBox[1] - 14]);
st = state();
add('beside the strip the heading gets hover', st.pills[0]?.id === BIDS.head, JSON.stringify(st.pills));
await away();
// Selected: on top, eight handles at the oracle's boxes.
evalJs(S, `(() => { fe.select(${JSON.stringify(sid)}, '${BIDS.shape}'); return 'true'; })()`); await pause(200);
st = state();
add('selected: rings at 999999, eight handles, no pill', st.ind.length === 1 && st.ind[0].z === '999999' && ringsOk(st.ind[0]) && st.ind[0].handles === 8 && !st.pills.length, JSON.stringify(st));
const hs = evalJs(S, `(() => { ${FR} return JSON.stringify([...d.querySelectorAll('.fe-handle')].map((e) => { const q = e.getBoundingClientRect(), c = W.getComputedStyle(e), m = W.getComputedStyle(e, '::before'); return [q.left + fr.left, q.top + fr.top, q.width, q.height, c.cursor, m.width, m.height, m.backgroundColor, m.borderTopWidth, m.borderTopColor]; })); })()`);
const shift = shapeBox[1] - F.handles.shape.block[1];
add('handle hit boxes', hs.length === 8 && hs.every((h, k) => near([h[0], h[1] - shift, h[2], h[3]], [...F.handles.shape.hit[k], 34, 34])), JSON.stringify(hs.map((h) => h.slice(0, 4))));
add('handle cursors', hs.map((h) => h[4].replace('-resize', '')).join(' ') === 'nw row ne col se row sw col', hs.map((h) => h[4]).join(' '));
add('handle marks', hs.every((h) => h.slice(5).join(' ') === '10px 10px rgb(255, 255, 255) 2px rgb(2, 122, 255)'), JSON.stringify(hs[0]));
await moveTo(at(shapeBox));
st = state();
add('hover on the selected block adds nothing', st.ind.length === 1 && !st.pills.length, JSON.stringify(st));
await moveTo(at(textBox));
st = state();
add('hover on another while one is selected', st.ind.length === 2 && st.ind[1].z === String(10000 + zs[BIDS.text]) && st.ind[0].z === '999999' && st.pills[0]?.id === BIDS.text, JSON.stringify(st));
await away();
evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(100);
// Text editing keeps rings and handles.
evalJs(S, `(() => { fe.edit(${JSON.stringify(sid)}, '${BIDS.text}'); return 'true'; })()`); await pause(300);
st = state();
add('text editing: rings and handles stay', st.ind.length === 1 && st.ind[0].z === '999999' && ringsOk(st.ind[0]) && st.ind[0].handles === 8 && !st.pills.length, JSON.stringify(st));
const noOutline = evalJs(S, `(() => { ${FR} return JSON.stringify(W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.text}"]')).outlineStyle); })()`);
add('text editing: no outline of its own', noOutline === 'none', noOutline);
await moveTo(at(shapeBox));
st = state();
add('text editing: another block still gets hover', st.pills[0]?.id === BIDS.shape, JSON.stringify(st.pills));
await away();
evalJs(S, `(() => { fe.finishEdit(); fe.select(null); return 'true'; })()`); await pause(200);
// Held: nothing but the gesture's own marks.
const c0 = at(shapeBox);
mouse(S, 'move', c0[0], c0[1]); mouse(S, 'down', c0[0], c0[1], { buttons: 1 });
for (let k = 1; k <= 7; k++) { mouse(S, 'move', c0[0], c0[1] + 2 * k, { buttons: 1 }); await pause(25); }
await pause(150);
st = state();
add('held: no rings, no pill', st.grid === 1 && st.ind.length === 0 && !st.pills.length, JSON.stringify(st));
mouse(S, 'up', c0[0], c0[1] + 14, { buttons: 0 }); await pause(200);
evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(100);
// The pill follows the block after a drop and a nudge.
const pillAt = () => evalJs(S, `(() => { ${FR} const b = d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]').getBoundingClientRect(), g = d.querySelector('.fe-label[data-for="${BIDS.shape}"]').getBoundingClientRect(); return JSON.stringify([g.left - b.left, g.top - b.top]); })()`);
mouse(S, 'move', c0[0], c0[1]); mouse(S, 'down', c0[0], c0[1], { buttons: 1 });
for (let k = 1; k <= 12; k++) { mouse(S, 'move', c0[0] - 10 * k, c0[1] + 10 * k, { buttons: 1 }); await pause(20); }
mouse(S, 'up', c0[0] - 120, c0[1] + 120, { buttons: 0 }); await pause(300);
add('pill after a drop', near(pillAt(), [0, -22]), String(pillAt()));
browser(S, 'press', 'ArrowRight'); await pause(200);
add('pill after a nudge', near(pillAt(), [0, -22]), String(pillAt()));
evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(100);
// Group: the oracle's marquee, heading and paragraph.
await fresh();
evalJs(S, `(() => { ${FR} W.scrollTo({ left: 0, top: W.scrollY + d.querySelector('.fe-block[data-block-id="${BIDS.text}"]').getBoundingClientRect().top - 354.6, behavior: 'instant' }); return 'true'; })()`);
await pause(300);
const [X0, Y0, X1, Y1] = [60, headBox[1] + 10, 500, textBox[1] + 40];
mouse(S, 'move', X0, Y0); mouse(S, 'down', X0, Y0, { buttons: 1 });
for (let k = 1; k <= 10; k++) { mouse(S, 'move', X0 + (X1 - X0) * k / 10, Y0 + (Y1 - Y0) * k / 10, { buttons: 1 }); await pause(30); }
const textSel = evalJs(S, `(() => { ${FR} return JSON.stringify(String(W.getSelection())); })()`);
add('marquee selects no text', textSel === '', textSel);
mouse(S, 'up', X1, Y1, { buttons: 0 }); await pause(300);
await away();
st = state();
const mem = st.ind.filter((i) => i.cls.includes('is-member')), box_ = st.ind.find((i) => i.cls.includes('is-group'));
add('group: members at 10000 + z with faint rings', mem.length === 2 && mem[0].z === String(10000 + zs[BIDS.head]) && mem[1].z === String(10000 + zs[BIDS.text]) && mem.every((i) => i.inner === 'rgba(2, 122, 255, 0.49)' && i.outer === 'rgba(72, 148, 255, 0.7)'), JSON.stringify(mem));
add('group: the box at 999999 with its lines', box_?.z === '999999' && box_.inner === 'rgb(72, 148, 255)' && box_.outer === 'rgb(2, 122, 255)', JSON.stringify(box_));
await moveTo(at(textBox));
st = state();
add('group: hover on a member adds nothing', st.ind.length === 3 && !st.pills.length, JSON.stringify(st.pills));
await moveTo(at(shapeBox));
st = state();
add('group: hover on another block', st.ind.length === 4 && st.pills[0]?.id === BIDS.shape, JSON.stringify(st.pills));
await away();
// Phones: the same rings, pill and handles (read in Mobile View at 1600 by 1000).
await fresh();
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
evalJs(S, `(() => { ${FR} W.scrollTo({ left: 0, top: W.scrollY + d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]').getBoundingClientRect().top - 300, behavior: 'instant' }); return 'true'; })()`);
await pause(300);
const phoneBox = boxOf(BIDS.shape);
await moveTo(at(phoneBox));
st = state();
add('phone: hover and pill', st.ind[0]?.z === String(10000 + zs[BIDS.shape]) && near([st.pills[0]?.x, st.pills[0]?.y], [phoneBox[0], phoneBox[1] - 22]), JSON.stringify(st));
await away();
evalJs(S, `(() => { fe.select(${JSON.stringify(sid)}, '${BIDS.shape}'); return 'true'; })()`); await pause(200);
const hp = evalJs(S, `(() => { ${FR} const b = d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]').getBoundingClientRect(); return JSON.stringify([...d.querySelectorAll('.fe-handle')].map((e) => { const q = e.getBoundingClientRect(); return [q.left - b.left, q.top - b.top, q.width]; })); })()`);
add('phone: handle boxes', near(hp[0], [-18, -18, 34]) && near(hp[4], [phoneBox[2] - 16, phoneBox[3] - 16, 34]), JSON.stringify(hp));
evalJs(S, `(() => { fe.setBp('desktop'); fe.select(null); return 'true'; })()`); await pause(300);
// Labels of every type the Add Block menu gives. Width within 2px: Clarkson is not in the repo (O2).
await fresh();
const named = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const out = {}; ${FR}
  const sid0 = fe.model.sections[${SEC}].id;
  for (const n of ['Text', 'Button', 'Shape', 'Image', 'Scrolling', 'Form', 'Video', 'Accordion', 'Line', 'Code', 'Embed']) {
    const before = new Set(fe.model.sections[${SEC}].blocks.map((b) => b.id));
    fe.addBlock(sid0, n); await sleep(60);
    const id = fe.model.sections[${SEC}].blocks.find((b) => !before.has(b.id)).id;
    const g = d.querySelector('.fe-label[data-for="' + id + '"]'); out[n] = [g.firstElementChild.textContent, g.getBoundingClientRect().width];
    fe.select(null);
  }
  return JSON.stringify(out); })()`);
for (const [n, [txt, w]] of Object.entries(named)) add(`label ${n}`, txt === n && Math.abs(w - F.labels.width[n]) <= 2, `${txt} ${w} oracle ${F.labels.width[n]}`);

// U6: the top bar's looks, tooltips, keys and the exit dialog (parity/findings/TOPBAR.json).
const T = JSON.parse(readFileSync(new URL('../parity/findings/TOPBAR.json', import.meta.url)));
await fresh();
const css = (sel, ...props) => evalJs(S, `(() => { const c = getComputedStyle(document.querySelector('${sel}')); return JSON.stringify([${props.map((p) => `c['${p}']`).join()}]); })()`);
const barTip = () => evalJs(S, `(() => { const e = document.getElementById('bar-tip'); if (e.hidden) return 'null'; const b = (x) => { const q = x.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }; return JSON.stringify({ text: e.firstChild.textContent, box: b(e), chips: [...e.querySelectorAll('kbd')].map(b) }); })()`);
const barAway = async () => { mouse(S, 'move', 800, 700); await pause(120); };
const hoverBar = async (x, y = 27) => { mouse(S, 'move', x, y); await pause(150); };
const near4 = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 4);
await barAway();
add('Save off: grey, not allowed', JSON.stringify(css('#save', 'backgroundColor', 'cursor')) === JSON.stringify([T.states.save.off.bg, T.states.save.off.cursor]), JSON.stringify(css('#save', 'backgroundColor', 'cursor')));
await hoverBar(40); add('Save off: no tooltip', barTip() === null, JSON.stringify(barTip()));
await hoverBar(100); add('Exit: no tooltip, grey words', barTip() === null && css('#exit', 'color')[0] === T.states.exit.hoverColor, css('#exit', 'color')[0]);
await barAway();
add('Undo off at .2', css('#undo', 'opacity')[0] === String(T.states.undo.offOpacity), css('#undo', 'opacity')[0]);
add('Bar group grey with 2px line', JSON.stringify(css('.tb-seg', 'backgroundColor', 'borderTopWidth')) === JSON.stringify([T.states.device.bg, '2px']), JSON.stringify(css('.tb-seg', 'backgroundColor', 'borderTopWidth')));
add('Selected device dark, other grey', css('#bp-desktop', 'color')[0] === T.states.device.on.color && css('#bp-mobile', 'color')[0] === T.states.device.off.color);
const tipCases = [['Desktop View', 1413], ['Mobile View', 1459], ['Site Styles', 1513], ['Preview', 1560]];
for (const [name, x] of tipCases) {
  await hoverBar(x);
  const t = barTip(), want = T.tips.boxes[name];
  add(`tooltip ${name}`, t && t.text === name && t.box[1] === want[1] && t.box[3] === want[3] && near4(t.box, want), JSON.stringify(t));
}
await hoverBar(1560);
add('Preview tooltip keeps 22px from the right', barTip().box[0] + barTip().box[2] === 1578, JSON.stringify(barTip().box));
add('Preview tooltip has three chips', barTip().chips.length === 3 && barTip().chips.every((c, i) => near4(c, T.tips.chips.Preview[i])), JSON.stringify(barTip().chips));
add('Preview grey on hover', css('#preview', 'backgroundColor')[0] === T.states.preview.hoverGreyColor, css('#preview', 'backgroundColor')[0]);
await hoverBar(1513); add('Site Styles grey on hover', css('#site-styles-toggle', 'backgroundColor')[0] === T.states.siteStyles.hoverGrey);
await hoverBar(1459); add('Mobile dark on hover, no fill', css('#bp-mobile', 'color')[0] === T.states.device.off.hoverColor && css('#bp-mobile', 'backgroundColor')[0] === 'rgba(0, 0, 0, 0)', JSON.stringify(css('#bp-mobile', 'color', 'backgroundColor')));
await barAway();
add('Tooltip gone when the mouse leaves', barTip() === null);
const SHAPE_ID = evalJs(S, `(() => { for (const s of fe.model.sections) for (const b of s.blocks) if (b.type === 'shape') { fe.select(s.id, b.id); return JSON.stringify(b.id); } return 'null'; })()`);
browser(S, 'press', 'Delete'); await pause(300);
add('Deleted a block for the dirty bar', SHAPE_ID && evalJs(S, `(() => JSON.stringify(!document.getElementById('save').disabled && !document.getElementById('undo').disabled))()`));
add('Save on: dark', css('#save', 'backgroundColor')[0] === T.states.save.on.bg);
await hoverBar(40);
add('Save on: hover and tooltip', css('#save', 'backgroundColor')[0] === T.states.save.on.hoverBg && barTip()?.text === 'Save Changes' && barTip().box[0] === 11 && barTip().box[1] === T.tips.boxes['Save Changes'][1] && barTip().chips.length === 2, JSON.stringify(barTip()));
await hoverBar(163);
add('Undo on: 36 grey, no tooltip', css('#undo', 'backgroundColor')[0] === T.states.undo.greyColor && barTip() === null && JSON.stringify(css('#undo', 'height')) === JSON.stringify(['36px']), JSON.stringify(css('#undo', 'backgroundColor', 'height')));
await hoverBar(163, T.states.undo.hit[1] + 1);
add('Undo answers above its grey box', css('#undo', 'backgroundColor')[0] === T.states.undo.greyColor, css('#undo', 'backgroundColor')[0]);
await barAway();
const keyOn = (where, code, key, shift) => evalJs(S, `(() => { const f = document.querySelector('iframe'); const t = ${where === 'frame' ? 'f.contentDocument' : 'document'}; t.body.dispatchEvent(new (${where === 'frame' ? 'f.contentWindow' : 'window'}.KeyboardEvent)('keydown', { bubbles: true, cancelable: true, metaKey: true, shiftKey: ${shift}, key: '${key}', code: '${code}' })); return 'ok'; })()`);
// The dialog, while the page has unsaved changes.
mouse(S, 'move', 100, 27); await pause(120); mouse(S, 'down', 100, 27); mouse(S, 'up', 100, 27); await pause(350);
const dlg = evalJs(S, `(() => { const b = (x) => { const q = document.querySelector(x).getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }; return JSON.stringify({ open: !document.getElementById('exit-dialog').hidden, box: b('#exit-dialog'), overlay: b('#exit-overlay'), save: b('#exit-save'), exit: b('#exit-discard') }); })()`);
add('Dialog opens at the oracle box', dlg.open && dlg.box.every((v, i) => Math.abs(v - T.dialog.box[i]) <= 0.5), JSON.stringify(dlg.box));
add('Dialog buttons end at 387, gap 22', Math.abs(dlg.exit[0] + dlg.exit[2] - T.dialog.row.rightEdge) <= 0.5 && Math.abs(dlg.exit[0] - dlg.save[0] - dlg.save[2] - T.dialog.row.gap) <= 0.5 && dlg.exit[3] === T.dialog.row.height, JSON.stringify([dlg.save, dlg.exit]));
add('Overlay covers the window', dlg.overlay[0] === 0 && dlg.overlay[1] === 0 && dlg.overlay[2] === 1600 && dlg.overlay[3] === 1000, JSON.stringify(dlg.overlay));
add('Overlay color', css('#exit-overlay', 'backgroundColor')[0] === 'rgba(231, 231, 231, 0.6)');
add('Dialog shadow and padding', css('#exit-dialog', 'paddingTop')[0] === '27px' && css('#exit-dialog', 'boxShadow')[0].includes('64px'));
add('Dialog Exit red', css('#exit-discard', 'color')[0] === T.dialog.exit.color);
const dbox = dlg.save;
mouse(S, 'move', dbox[0] + 8, dbox[1] + 18); await pause(120); add('Dialog Save grey on hover', css('#exit-save', 'color')[0] === T.dialog.save.hover, css('#exit-save', 'color')[0]);
mouse(S, 'move', dlg.exit[0] + 8, dlg.exit[1] + 18); await pause(120); add('Dialog Exit dark red on hover', css('#exit-discard', 'color')[0] === T.dialog.exit.hover, css('#exit-discard', 'color')[0]);
mouse(S, 'move', 800, 700); await pause(100); mouse(S, 'down', 800, 700); mouse(S, 'up', 800, 700); await pause(200);
add('A click on the overlay closes it', evalJs(S, `(() => JSON.stringify(document.getElementById('exit-dialog').hidden && document.getElementById('exit-overlay').hidden))()`));
evalJs(S, `document.getElementById('exit').click()`); await pause(200); browser(S, 'press', 'Escape'); await pause(200);
add('Escape closes it', evalJs(S, `(() => JSON.stringify(document.getElementById('exit-dialog').hidden && document.getElementById('exit-overlay').hidden))()`));
// Cmd+Shift+P and Cmd+S, from the bar's document and from inside the canvas.
const isPreview = () => evalJs(S, `(() => JSON.stringify(document.body.classList.contains('is-preview')))()`);
keyOn('top', 'KeyP', 'p', true); await pause(300);
add('Cmd+Shift+P opens preview', isPreview() === true);
const scrollAt = () => evalJs(S, `(() => JSON.stringify(document.querySelector('iframe').contentWindow.scrollY))()`);
evalJs(S, `(() => { document.querySelector('iframe').contentWindow.scrollTo({ left: 0, top: 700, behavior: 'instant' }); return 'ok'; })()`); await pause(200);
const before = scrollAt();
await hoverBar(1513);
add('Reload tooltip', barTip()?.text === 'Reload' && barTip().box[1] === T.tips.boxes.Reload[1] && near4(barTip().box, T.tips.boxes.Reload), JSON.stringify(barTip()));
mouse(S, 'down', 1513, 27); mouse(S, 'up', 1513, 27); await pause(300);
add('Reload keeps the scroll', scrollAt() === before, `${before} ${scrollAt()}`);
await hoverBar(1560);
add('Close tooltip, X icon', barTip()?.text === 'Close' && barTip().box[1] === T.tips.boxes.Close[1] && evalJs(S, `(() => JSON.stringify(getComputedStyle(document.querySelector('#preview .tb-close')).display !== 'none' && getComputedStyle(document.querySelector('#preview .tb-play')).display === 'none'))()`), JSON.stringify(barTip()));
await barAway();
add('Preview button white at rest', css('#preview', 'backgroundColor')[0] === 'rgba(0, 0, 0, 0)', css('#preview', 'backgroundColor')[0]);
keyOn('frame', 'KeyP', 'p', true); await pause(300);
add('Cmd+Shift+P in the canvas leaves preview', isPreview() === false);
const dirty = () => evalJs(S, `(() => JSON.stringify(!document.getElementById('save').disabled))()`);
keyOn('frame', 'KeyS', 's', false); await pause(300);
add('Cmd+S in the canvas saves', dirty() === false);
const held = evalJs(S, `(() => JSON.stringify(localStorage.length))()`);
keyOn('top', 'KeyS', 's', false); await pause(200);
add('Cmd+S with nothing to save does nothing', dirty() === false && evalJs(S, `(() => JSON.stringify(localStorage.length))()`) === held);

console.log(`Marks: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/marks-check.json', import.meta.url), `${JSON.stringify({ pass, total, fails }, null, 2)}\n`);
if (pass !== total) process.exit(1);
