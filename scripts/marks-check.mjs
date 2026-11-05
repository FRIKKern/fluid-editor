// Small marks of the editor chrome against parity/findings/MARKS.json, TOPBAR.json, SECTIONBAR.json, P3.json, PIN.json, TOOLBARS.json, CAP-HEADER.json, S3.json, U5.json, CAP-DIVSHAPES.json and CAP-ADDSECTIONVIEWS.json, with real input in our editor.
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

// U9: where the section chrome and Edit Section's panel go, how they answer the mouse, the Layers list.
const SB = JSON.parse(readFileSync(new URL('../parity/findings/SECTIONBAR.json', import.meta.url)));
const P3 = JSON.parse(readFileSync(new URL('../parity/findings/P3.json', import.meta.url)));
await fresh();
const frameScroll = async (y) => { evalJs(S, `(() => { document.querySelector('iframe').contentWindow.scrollTo({ left: 0, top: ${y}, behavior: 'instant' }); return 'ok'; })()`); await pause(150); };
const chromeBox = (label) => evalJs(S, `(() => { const x = [...document.querySelectorAll('#section-chrome button')].find((b) => b.getAttribute('aria-label') === '${label}'); if (!x) return 'null'; const q = x.getBoundingClientRect(); return JSON.stringify([q.left, q.top, q.width, q.height]); })()`);
const sectionTop = (i) => evalJs(S, `(() => { const s = document.querySelector('iframe').contentDocument.querySelectorAll('main#page .page-section')[${i}]; return JSON.stringify(s.getBoundingClientRect().top + 55); })()`);
const hoverInSection = async (y, x = 60) => { mouse(S, 'move', x, y); await pause(60); mouse(S, 'move', x + 2, y + 1); await pause(260); };
const panelRect = () => evalJs(S, `(() => { const p = document.getElementById('section-panel'); if (p.hidden) return 'null'; const q = p.getBoundingClientRect(); return JSON.stringify([q.left, q.top, q.width, q.height]); })()`);
const pressAt = async (x, y) => { mouse(S, 'move', x, y); await pause(60); mouse(S, 'down', x, y); mouse(S, 'up', x, y); await pause(180); };
const openPanelAt = async (edit, H) => {
  const sy = 914 + 55 + 29 - edit;
  await frameScroll(sy);
  await hoverInSection(Math.min(H - 10, Math.max(70, 914 - sy + 55 + 40)));
  const e = chromeBox('Edit Section');
  await pressAt(e[0] + 60, e[1] + 20);
  const p = panelRect();
  browser(S, 'press', 'Escape'); await pause(120); await hoverBar(800, 20); await pause(180);
  return { e: e[1], p: p && p[1] };
};
for (const [e, want] of SB.panelTop.samples.H1000.filter(([v]) => [84, 222.6, 301, 311, 491, 531, 751, 771, 951].includes(v))) {
  const r = await openPanelAt(e, 1000);
  add(`panel top, Edit at ${e}`, Math.abs(r.e - e) <= 1 && Math.abs(r.p - want) <= 1.5, JSON.stringify([r, want]));
}
viewport(S, 1600, 800); await pause(300);
for (const [e, want] of SB.panelTop.samples.H800.filter(([v]) => [111, 311, 361, 561, 711].includes(v))) {
  const r = await openPanelAt(e, 800);
  add(`panel top, 800 tall, Edit at ${e}`, Math.abs(r.e - e) <= 1 && Math.abs(r.p - want) <= 1.5, JSON.stringify([r, want]));
}
viewport(S, 1600, 1000); await pause(300);
// With the panel open: comes along with the button, stops at H - 476, leaves the section's bottom alone.
await frameScroll(914); await hoverInSection(300);
const pe = chromeBox('Edit Section'); await pressAt(pe[0] + 60, pe[1] + 20);
const during = {};
for (const y of [814, 514, 464, 214, 714, 1014, 1214, 1414]) { await frameScroll(y); during[y] = panelRect()[1]; }
add('open panel follows the button', Math.abs(during[814] - 179) <= 3 && Math.abs(during[514] - 479) <= 3, JSON.stringify(during));
add('open panel stops at H - 476', during[464] === 524 && during[214] === 524 && during[714] === 524, JSON.stringify(during));
add('open panel stays in the section', Math.abs(during[1014] - (1772 - 1014 + 55 + 1 - 476)) <= 1 && during[1414] === 0, JSON.stringify(during));
browser(S, 'press', 'Escape'); await pause(120); await hoverBar(800, 20); await pause(200);
// Stuck chrome, on any scroll; not stopped by the section's bottom.
for (const [sy, y] of [[914, 300], [1214, 300], [1700, 80]]) {
  await frameScroll(sy); await hoverInSection(y);
  const ed = chromeBox('Edit Section'), la = chromeBox('Open Layers Panel'), rm = chromeBox('Remove Section');
  add(`stuck at scroll ${sy}`, Math.abs(ed[1] - 84) <= 1 && Math.abs(la[1] - 81) <= 1 && Math.abs(rm[1] - 236) <= 1, JSON.stringify([ed[1], la[1], rm[1]]));
}
await frameScroll(0); await hoverInSection(700);
add('first section under its header', Math.abs(chromeBox('Edit Section')[1] - 222.6) <= 1 && Math.abs(chromeBox('Open Layers Panel')[1] - 219.6) <= 1);
// Fade: the parts run their animation, the outline does not; it goes after the mouse leaves.
await hoverBar(800, 20); await pause(220);
add('chrome gone after the mouse leaves', evalJs(S, `(() => JSON.stringify(document.getElementById('section-chrome').hidden))()`));
evalJs(S, `(() => { window.__fade = []; const t0 = performance.now(); const id = setInterval(() => { const c = document.querySelector('#section-chrome:not([hidden]) .sc-card'); if (c) window.__fade.push(+getComputedStyle(c).opacity); if (performance.now() - t0 > 20000) clearInterval(id); }, 16); return 'ok'; })()`);
mouse(S, 'move', 60, 400); mouse(S, 'move', 62, 401); await pause(1000);
const fading = evalJs(S, `(() => { const c = getComputedStyle(document.querySelector('.sc-card')), o = getComputedStyle(document.querySelector('.sc-outline')); const seen = window.__fade; return JSON.stringify({ name: c.animationName, time: c.animationDuration, outline: o.animationName, least: Math.min(...seen), last: seen.at(-1) }); })()`);
add('chrome slides in over 0.17s', fading.name === 'sc-in' && fading.time === '0.17s' && fading.outline === 'none' && fading.least < 0.9 && fading.last === 1, JSON.stringify(fading));
// Hover colors.
const hoverColor = async (label) => { await hoverInSection(400); const b = chromeBox(label); mouse(S, 'move', b[0] + 10, b[1] + 10); await pause(100); return evalJs(S, `(() => { const x = [...document.querySelectorAll('#section-chrome button')].find((b) => b.getAttribute('aria-label') === '${label}'); return JSON.stringify(getComputedStyle(x).backgroundColor); })()`); };
for (const [label, ours] of [['Open Layers Panel', 'Layers'], ['Add Block', 'Add Block'], ['Edit Section', 'Edit Section'], ['Duplicate Section', 'Duplicate Section'], ['Remove Section', 'Remove Section']]) {
  const c = await hoverColor(label);
  add(`hover ${label}`, c === SB.hover[ours], c);
}
const addc = await hoverColor('Add Section'); add('hover Add Section stays', addc === 'rgb(2, 122, 255)', addc);
await hoverInSection(400);
for (const [label, want, off] of [['Edit Section', [1416, 95 - 84], 'svg'], ['Add Block', [94, 88 - 81], 'svg']]) {
  const b = chromeBox(label);
  const q = evalJs(S, `(() => { const x = [...document.querySelectorAll('#section-chrome button')].find((b) => b.getAttribute('aria-label') === '${label}'); const r = x.querySelector('${off}').getBoundingClientRect(); const t = x.querySelector('span').getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, t.left]); })()`);
  add(`${label} icon and words`, Math.abs(q[0] - want[0]) <= 0.6 && Math.abs(q[1] - b[1] - want[1]) <= 1 && q[2] === 22 && Math.abs(q[3] - (label === 'Add Block' ? 127 : 1448)) <= 0.6, JSON.stringify(q));
}
// The Layers list, section 0 at rest.
await frameScroll(914); await hoverInSection(300);
const LA = chromeBox('Open Layers Panel'); await pressAt(LA[0] + 18, LA[1] + 18); await pause(100);
const list = evalJs(S, `(() => { const p = document.getElementById('layers-panel'), r = p.querySelector('.lp-row'), t = p.querySelector('.lp-title'); const q = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }; const c = getComputedStyle(r); const tr = document.createRange(); tr.selectNodeContents(t); return JSON.stringify({ panel: q(p), radius: getComputedStyle(p).borderRadius, title: [tr.getBoundingClientRect().left, tr.getBoundingClientRect().top], font: getComputedStyle(t).fontSize + '/' + getComputedStyle(t).lineHeight, row: q(r), rowBg: c.backgroundColor, pitch: q(p.querySelectorAll('.lp-row')[1])[1] - q(r)[1], icon: q(r.querySelector('.lp-icon svg')), name: q(r.querySelector('.lp-name')), layersBg: getComputedStyle(document.querySelector('.sc-layers')).backgroundColor }); })()`);
const LL = SB.layersList;
add('Layers list box and radius', list.panel.every((v, i) => Math.abs(v - LL.box[i]) <= 1) && list.radius === LL.radius, JSON.stringify(list.panel));
add('Layers title', Math.abs(list.title[0] - LL.title.box[0]) <= 1 && Math.abs(list.title[1] - LL.title.box[1]) <= 1 && list.font === '16px/20px', JSON.stringify(list.title));
add('Layers row', Math.abs(list.row[0] - LL.row.x) <= 1 && Math.abs(list.row[2] - LL.row.width) <= 1 && list.row[3] === LL.row.height && list.pitch === LL.row.pitch && list.rowBg === LL.row.bg, JSON.stringify([list.row, list.pitch, list.rowBg]));
add('Layers icon and name', Math.abs(list.icon[0] - LL.row.icon[0]) <= 1 && list.icon[2] === 22 && Math.abs(list.name[0] - LL.row.name.x) <= 1, JSON.stringify([list.icon, list.name]));
add('Layers stays pressed', list.layersBg === SB.hover.layersOpen.match(/rgb\([^)]*\)/)[0], list.layersBg);
const rowY = list.row[1] + 22;
mouse(S, 'move', LL.row.x + 60, rowY); await pause(80);
const rowHover = evalJs(S, `(() => { const r = document.querySelector('#layers-panel .lp-row'), e = r.querySelector('.lp-eye'), q = e.getBoundingClientRect(); return JSON.stringify({ bg: getComputedStyle(r).backgroundColor, eye: e.getAttribute('aria-label'), box: [q.left, q.top, q.width, q.height], rowRight: r.getBoundingClientRect().right }); })()`);
add('Row hover shows the eye', rowHover.bg === LL.row.hoverBg && rowHover.eye === LL.eye.label && rowHover.box[2] === 36 && rowHover.box[3] === 36 && Math.abs(rowHover.rowRight - rowHover.box[0] - rowHover.box[2] - 3) <= 0.6, JSON.stringify(rowHover));
const undoCount = () => evalJs(S, `(() => JSON.stringify(document.getElementById('undo').disabled))()`);
add('Nothing to undo yet', undoCount() === true);
mouse(S, 'move', rowHover.box[0] + 18, rowHover.box[1] + 18); await pause(80);
add('Eye white on hover', evalJs(S, `(() => JSON.stringify(getComputedStyle(document.querySelector('#layers-panel .lp-eye')).backgroundColor))()`) === 'rgb(255, 255, 255)');
mouse(S, 'down', rowHover.box[0] + 18, rowHover.box[1] + 18); mouse(S, 'up', rowHover.box[0] + 18, rowHover.box[1] + 18); await pause(200);
const hid = evalJs(S, `(() => { const p = document.getElementById('layers-panel'), r = p.querySelector('.lp-row'); const bid = r.dataset.layer; return JSON.stringify({ open: !p.hidden, dim: r.classList.contains('is-hidden'), eye: r.querySelector('.lp-eye').getAttribute('aria-label'), shown: getComputedStyle(r.querySelector('.lp-eye')).display !== 'none', gone: !document.querySelector('iframe').contentDocument.querySelector('.fe-block[data-block-id="' + bid + '"]')?.getBoundingClientRect().width, undo: !document.getElementById('undo').disabled }); })()`);
add('Eye hides the block, list stays', hid.open && hid.dim && hid.eye === 'Display Block' && hid.shown && hid.gone && hid.undo, JSON.stringify(hid));
evalJs(S, `(() => { document.querySelector('#layers-panel .lp-eye').click(); return 'ok'; })()`); await pause(120);
add('Display Block brings it back', evalJs(S, `(() => { const r = document.querySelector('#layers-panel .lp-row'); return JSON.stringify(!r.classList.contains('is-hidden') && !!document.querySelector('iframe').contentDocument.querySelector('.fe-block[data-block-id="' + r.dataset.layer + '"]').getBoundingClientRect().width); })()`));
mouse(S, 'move', LL.row.x + 60, rowY); await pause(60); mouse(S, 'down', LL.row.x + 60, rowY); mouse(S, 'up', LL.row.x + 60, rowY); await pause(160); mouse(S, 'move', 800, 900); await pause(120);
const picked = evalJs(S, `(() => { const r = document.querySelector('#layers-panel .lp-row'); return JSON.stringify({ on: r.classList.contains('is-on'), bg: getComputedStyle(r).backgroundColor, eye: getComputedStyle(r.querySelector('.lp-eye')).display !== 'none' }); })()`);
add('Picked row blue with its eye', picked.on && picked.bg === LL.row.pickedBg && picked.eye, JSON.stringify(picked));
browser(S, 'press', 'Escape'); await pause(120);
// Phones.
await fresh();
evalJs(S, `document.getElementById('bp-mobile').click()`); await pause(500);
await frameScroll(900); await hoverInSection(700, 800);
const pl = chromeBox('Open Layers Panel'), ped = chromeBox('Edit Section');
add('Phone Layers and card', pl[0] === 522 && ped[0] === 1043 && !chromeBox('Add Block') && !chromeBox('View Layouts'), JSON.stringify([pl, ped]));
await pressAt(ped[0] + 60, ped[1] + 20);
const pp = panelRect();
add('Phone panel', pp[0] === 1209 && Math.abs(pp[1] - (ped[1] + 49)) <= 1.5, JSON.stringify([pp, ped[1]]));
browser(S, 'press', 'Escape'); await pause(120);
await frameScroll(0); await pause(120);
const lines = evalJs(S, `(() => { const hd = document.querySelector('iframe').contentDocument.getElementById('header').getBoundingClientRect().bottom; const s0 = document.querySelector('iframe').contentDocument.querySelector('main#page .page-section').getBoundingClientRect().bottom; const tops = [...document.querySelectorAll('.phone-line')].map((l) => parseFloat(l.style.top)); const b = getComputedStyle(document.querySelector('.stage'), '::before'); return JSON.stringify({ hd: Math.round(hd), s0: Math.round(s0), tops, under: [b.height, b.backgroundColor], color: getComputedStyle(document.querySelector('.phone-line')).backgroundColor, shadow: getComputedStyle(document.getElementById('site-frame')).boxShadow }); })()`);
add('Phone lines at the header and sections', lines.tops.includes(lines.hd) && lines.tops.includes(lines.s0) && lines.color === SB.phone.lines.color, JSON.stringify(lines));
add('Phone line under the bar', lines.under[0] === '1px' && lines.under[1] === SB.phone.lines['under bar'].match(/rgb\([^)]*\)/)[0], JSON.stringify(lines.under));
add('Phone canvas shadow', lines.shadow.includes('24px'), lines.shadow);

// P3: the custom height's slider and field (parity/findings/P3.json, range).
await fresh();
await frameScroll(914); await hoverInSection(300);
const pc = chromeBox('Edit Section'); await pressAt(pc[0] + 60, pc[1] + 20);
evalJs(S, `(() => { document.querySelector('#section-panel button[aria-label="Custom height"]').click(); return 'ok'; })()`); await pause(200);
const sli = evalJs(S, `(() => { const r = document.querySelector('.sp-custom-height input[type=range]'), t = document.querySelector('.sp-custom-height input[type=text]'), q = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.width]; }; return JSON.stringify({ min: r.min, max: r.max, step: r.step, r: q(r), t: q(t), v: t.value }); })()`);
add('Custom height slider 1 to 100', sli.min === String(P3.range.slider.min) && sli.max === String(P3.range.slider.max) && sli.step === String(P3.range.slider.step) && sli.r[1] === 237 && sli.t[1] === 28, JSON.stringify(sli));
add('Custom height slider and field boxes', Math.abs(sli.r[0] - P3.range.slider.box[0]) <= 1 && Math.abs(sli.t[0] - P3.range.field.box[0]) <= 1, JSON.stringify(sli));
const typeHeight = async (v) => { evalJs(S, `(() => { const t = document.querySelector('.sp-custom-height input[type=text]'); t.focus(); t.select(); return 'ok'; })()`); for (const ch of String(v)) browser(S, 'press', ch); browser(S, 'press', 'Tab'); await pause(200); return evalJs(S, `(() => { const s = document.querySelector('iframe').contentDocument.querySelectorAll('main#page .page-section')[1], c = document.querySelector('iframe').contentWindow.getComputedStyle(s), r = document.querySelector('.sp-custom-height input[type=range]'), t = document.querySelector('.sp-custom-height input[type=text]'); return JSON.stringify({ min: c.minHeight, r: r.value, t: t.value }); })()`); };
for (const v of ['0', '1', '50', '100', '150', '300', '1000']) {
  const r = await typeHeight(v);
  add(`Custom height ${v}`, r.min === P3.range.field.typed[v][0] && r.t === v && r.r === String(Math.max(1, Math.min(100, Number(v)))), JSON.stringify(r));
}

// U4: the toolbar's halo, Align Vertically's menu, Pin's field and slider, phones, tips.
const TB = JSON.parse(readFileSync(new URL('../parity/findings/TOOLBARS.json', import.meta.url)));
const PN = JSON.parse(readFileSync(new URL('../parity/findings/PIN.json', import.meta.url)));
const GEO = JSON.parse(readFileSync(new URL('../parity/findings/TOOLBARGEO.json', import.meta.url)));
await fresh();
const u4sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[${SEC}].id))()`);
const pick = async (id) => { evalJs(S, `(() => { ${FR} fe.select(${JSON.stringify(u4sid)}, '${id}'); W.scrollTo({ left: 0, top: W.scrollY + d.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect().top - 300, behavior: 'instant' }); return 'true'; })()`); await pause(350); };
const tbBox = (sel) => evalJs(S, `(() => { const e = document.querySelector('${sel}'); if (!e) return 'null'; const q = e.getBoundingClientRect(), t = document.getElementById('block-toolbar').getBoundingClientRect(); return JSON.stringify([q.left - t.left, q.top - t.top, q.width, q.height]); })()`);
const tbClick = async (tb) => { const q = evalJs(S, `(() => { const q = document.querySelector('#block-toolbar [data-tb="${tb}"]').getBoundingClientRect(); return JSON.stringify([q.left + 18, q.top + 18]); })()`); mouse(S, 'move', q[0], q[1]); await pause(60); mouse(S, 'down', q[0], q[1], { buttons: 1 }); await pause(30); mouse(S, 'up', q[0], q[1]); await pause(220); };
const open4 = () => evalJs(S, `(() => JSON.stringify({ menu: !!document.querySelector('.tb-vmenu'), pop: !document.getElementById('pin-popover').hidden, sel: !document.getElementById('block-toolbar').hidden }))()`);
const u4near = (a, b, n = 1) => a && a.every((v, i) => Math.abs(v - b[i]) <= n);
await pick(BIDS.text);
const tbs = css('#block-toolbar', 'boxShadow', 'width', 'height');
add('Toolbar keeps 42px, carries the shadow', tbs[2] === '42px' && /0px 6px 24px 1px/.test(tbs[0]) && /0px 0px 1px 1px/.test(tbs[0]) && /0px 0px 0px 1px/.test(tbs[0]), tbs[0]);
await tbClick('align');
const am = TB.alignMenu;
add('Align menu opens', open4().menu === true);
add('Align menu box', u4near(tbBox('.tb-vmenu'), am.box.map((v, i) => v + (i === 0 ? tbBox('[data-tb="align"]')[0] - 85 : 0))), String(tbBox('.tb-vmenu')));
const vm = css('.tb-vmenu', 'backgroundColor', 'borderRadius', 'boxShadow');
add('Align menu look', vm[0] === am.bg && vm[1] === am.radius && vm[2] === am.shadow, vm.join(' | '));
const avOff = tbBox('[data-tb="align"]')[0] - 85;
for (const [v, label] of [['flex-start', 'Align Top'], ['center', 'Align Center'], ['flex-end', 'Align Bottom']]) {
  const q = tbBox(`[data-tb="valign:${v}"]`);
  add(`${label} box`, u4near(q, am.buttons[label].map((x, i) => x + (i === 0 ? avOff : 0))), String(q));
  add(`${label} label`, evalJs(S, `(() => JSON.stringify(document.querySelector('[data-tb="valign:${v}"]').getAttribute('aria-label')))()`) === label);
}
add('Align button grey while open, current grey', css('[data-tb="align"]', 'backgroundColor')[0] === am.openButton && css('[data-tb="valign:flex-start"]', 'backgroundColor')[0] === am.current);
const alignRead = () => evalJs(S, `(() => { ${FR} const rule = (sel, prop) => { const q = [...d.styleSheets].flatMap((x) => { try { return [...x.cssRules]; } catch { return []; } }); const on = W.matchMedia('(min-width: 768px)').matches; const look = (rs) => rs.flatMap((r) => (r.selectorText === sel ? [r.style[prop]] : r.media ? (r.media.mediaText.includes('768') && on ? look([...r.cssRules]) : []) : [])); return look(q).pop(); }; return JSON.stringify({ j: rule('.fe-block-${BIDS.text} .sqs-block', 'justifyContent'), a: rule('.fe-block-${BIDS.text} .sqs-block-alignment-wrapper', 'alignItems') }); })()`);
await tbClick('valign:center');
add('Align Center sets both rules', alignRead().j === 'center' && alignRead().a === 'center', JSON.stringify(alignRead()));
add('A pick keeps the menu open', open4().menu === true);
add('The toolbar button shows the current one', css('[data-tb="valign:center"]', 'backgroundColor')[0] === am.current);
await tbClick('valign:flex-end');
add('Align Bottom sets both rules', alignRead().j === 'flex-end' && alignRead().a === 'flex-end', JSON.stringify(alignRead()));
evalJs(S, `document.getElementById('undo').click()`); await pause(200);
add('One undo per pick', alignRead().j === 'center', JSON.stringify(alignRead()));
evalJs(S, `document.getElementById('undo').click()`); await pause(200);
add('Second undo is back at the top', alignRead().j === 'flex-start', JSON.stringify(alignRead()));
await tbClick('align'); add('Second click closes the menu', open4().menu === false && open4().sel === true);
await tbClick('align'); await tbClick('pin');
add('Pin on the open menu: menu closes, popover opens', open4().menu === false && open4().pop === true, JSON.stringify(open4()));
await tbClick('align');
add('Align on the open popover: popover closes, menu opens', open4().menu === true && open4().pop === false, JSON.stringify(open4()));
browser(S, 'press', 'Escape'); await pause(200);
add('Escape closes the menu, block stays selected', open4().menu === false && open4().sel === true, JSON.stringify(open4()));
await tbClick('pin'); await pause(100); await tbClick('pin');
add('Second Pin click closes the popover, keeps the pin', open4().pop === false && evalJs(S, `(() => { ${FR} return JSON.stringify(W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.text}"]')).position); })()`) === 'sticky');
await tbClick('pin');
browser(S, 'press', 'Escape'); await pause(200);
add('Escape closes the popover, block stays selected', open4().pop === false && open4().sel === true, JSON.stringify(open4()));
browser(S, 'press', 'Escape'); await pause(200);
add('The next Escape deselects', open4().sel === false, JSON.stringify(open4()));
await pick(BIDS.text); await tbClick('align');
const os = at(boxOf(BIDS.shape)); mouse(S, 'move', os[0], os[1]); await pause(60); mouse(S, 'down', os[0], os[1], { buttons: 1 }); await pause(30); mouse(S, 'up', os[0], os[1]); await pause(300);
add('Another block closes the menu', open4().menu === false);

// Pin's field and slider, on the shape.
await fresh();
await pick(BIDS.shape);
await tbClick('pin');
const pinState = () => evalJs(S, `(() => { ${FR} const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]')); const r = document.querySelector('[data-pin-range]'), t = document.querySelector('[data-pin-offset]'); return JSON.stringify({ top: c.top, pos: c.position, field: t.value, range: r.value, min: r.min, max: r.max, step: r.step, w: r.getBoundingClientRect().width }); })()`);
const pin0 = pinState();
add('Slider 0 to 250, step 1', pin0.min === String(PN.range.min) && pin0.max === String(PN.range.max) && pin0.step === String(PN.range.step), JSON.stringify(pin0));
add('Slider width', Math.abs(pin0.w - PN.range.box[0]) <= 1, String(pin0.w));
const typePin = async (v, key = 'Enter') => { browser(S, 'fill', '[data-pin-offset]', v); browser(S, 'press', key); await pause(180); return pinState(); };
for (const [v, [top, range]] of Object.entries(PN.field.read)) {
  const r = await typePin(v);
  add(`Pin field ${v}`, Math.abs(parseFloat(r.top) - parseFloat(top)) <= 1 && r.field === v && r.range === String(range), JSON.stringify(r));
}
await typePin('40px');
for (const v of PN.field.notApplied) {
  const r = await typePin(v);
  add(`Pin field "${v}" not applied, stays`, r.top === '40px' && r.field === v && r.range === '40', JSON.stringify(r));
}
await typePin('40px');
browser(S, 'fill', '[data-pin-offset]', '60'); browser(S, 'press', 'Tab'); await pause(200);
add('Bare number then Tab goes back', pinState().field === '40px' && pinState().top === '40px', JSON.stringify(pinState()));
browser(S, 'fill', '[data-pin-offset]', '70px'); browser(S, 'press', 'Tab'); await pause(200);
add('70px then Tab applies', pinState().top === '70px', JSON.stringify(pinState()));
const focusRange = () => evalJs(S, `(() => { document.querySelector('[data-pin-range]').focus(); return 'true'; })()`);
await typePin('50px');
const shapeArea = () => evalJs(S, `(() => JSON.stringify(fe.model.sections[${SEC}].blocks.find((b) => b.id === '${BIDS.shape}').layout.desktop.area))()`);
const area0 = shapeArea();
for (const [k, want] of [['ArrowRight', '51px'], ['End', '250px'], ['Home', '0px'], ['PageUp', '25px']]) {
  focusRange(); browser(S, 'press', k); await pause(200);
  const r = pinState(); add(`Slider key ${k}`, r.top === want && r.field === want, JSON.stringify(r));
}
add('Slider keys leave the block where it is', JSON.stringify(shapeArea()) === JSON.stringify(area0));
const rb = evalJs(S, `(() => { const q = document.querySelector('[data-pin-range]').getBoundingClientRect(); return JSON.stringify([q.left, q.top, q.width, q.height]); })()`);
const ry = rb[1] + rb[3] / 2, rx = (f) => rb[0] + rb[2] * f;
mouse(S, 'move', rx(0.2), ry); await pause(60); mouse(S, 'down', rx(0.2), ry, { buttons: 1 }); await pause(120);
const seen = [pinState().top];
for (const f of [0.4, 0.6]) { mouse(S, 'move', rx(f), ry, { buttons: 1 }); await pause(120); seen.push(pinState().top); }
mouse(S, 'move', rx(1) + 14, ry, { buttons: 1 }); await pause(120);
add('Slider stops at 250', pinState().top === '250px', JSON.stringify(pinState()));
mouse(S, 'move', rx(0.6), ry, { buttons: 1 }); await pause(120);
add('Slider follows the drag live, field too', new Set(seen).size === 3 && pinState().field === pinState().top, seen.join());
mouse(S, 'up', rx(0.6), ry); await pause(200);
const afterDrag = pinState().top;
evalJs(S, `document.getElementById('undo').click()`); await pause(200);
const oneBack = evalJs(S, `(() => { ${FR} return JSON.stringify(W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]')).top); })()`);
add('Each slider value is one undo', oneBack === '250px', `${afterDrag} then ${oneBack}`);

// Phones: Pin and Align in the layout on screen.
await fresh();
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
await pick(BIDS.shape);
const phoneBar = TB.phoneBars.shape;
const stackOff = () => evalJs(S, `(() => JSON.stringify(['up', 'down'].map((k) => document.querySelector('#block-toolbar [data-tb="' + k + '"]').classList.contains('is-off'))))()`);
add('Bottom of the stack: Move Down off', stackOff().join() === 'false,true', String(stackOff()));
const barItems = () => evalJs(S, `(() => { const t = document.getElementById('block-toolbar'), o = t.getBoundingClientRect(); return JSON.stringify({ w: o.width, b: [...t.querySelectorAll('.tb-btn')].map((x) => [x.getAttribute('aria-label'), x.getBoundingClientRect().left - o.left]), s: [...t.querySelectorAll('.tb-sep')].map((x) => { const q = x.getBoundingClientRect(); return [q.left - o.left, q.top - o.top, q.width, q.height]; }) }); })()`);
const pbar = barItems();
add('Phone shape toolbar width', Math.abs(pbar.w - phoneBar.bar[0]) <= 1, String(pbar.w));
add('Phone shape buttons', pbar.b.every(([l, x]) => Math.abs(phoneBar.buttons[l] - x) <= 1) && pbar.b.length === 5, JSON.stringify(pbar.b));
add('Phone separators', pbar.s.length === 2 && pbar.s.every((q, i) => Math.abs(q[0] - phoneBar.seps[i]) <= 1 && q[2] === 1 && q[3] === 20 && Math.abs(q[1] - 11) <= 1), JSON.stringify(pbar.s));
await tbClick('pin');
const stickyAt = () => evalJs(S, `(() => { ${FR} const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.shape}"]')); return JSON.stringify([c.position, c.top]); })()`);
add('Pin works in Mobile View', stickyAt()[0] === 'sticky' && stickyAt()[1] === '0px' && open4().pop === true, JSON.stringify(stickyAt()));
const baseRule = evalJs(S, `(() => { ${FR} const sheet = [...d.querySelectorAll('style')].map((e) => e.textContent).join('\\n'); const i = sheet.indexOf('.fe-block-${BIDS.shape} {'); return JSON.stringify(sheet.slice(i, i + 200)); })()`);
add('A phone pin goes in the base rule', /position: sticky/.test(baseRule), baseRule);
browser(S, 'fill', '[data-pin-offset]', '30px'); browser(S, 'press', 'Enter'); await pause(200);
add('Phone offset applies', stickyAt()[1] === '30px', JSON.stringify(stickyAt()));
browser(S, 'press', 'Escape'); await pause(200);
await pick(BIDS.head);
add('Top of the stack: Move Up off', stackOff().join() === 'true,false', String(stackOff()));
await pick(BIDS.text);
add('Middle of the stack: both on', stackOff().join() === 'false,false', String(stackOff()));
let tBar = barItems(), tWant = TB.phoneBars.text.buttons;
if (tBar.b.length === 9) tWant = TB.phoneBars.textOverlapping.buttons;
add('Phone text buttons', tBar.b.every(([l, x]) => Math.abs(tWant[l] - x) <= 1), JSON.stringify(tBar.b));
const overlapOn = evalJs(S, `(() => { const s = fe.model.sections[${SEC}], t = s.blocks.find((b) => b.id === '${BIDS.text}'), o = s.blocks.find((b) => b.id === '${BIDS.shape}'); o.layout.mobile.area = [...t.layout.mobile.area]; fe.select(null); fe.select(s.id, t.id); return JSON.stringify(true); })()`);
await pause(250);
tBar = barItems(); tWant = TB.phoneBars.textOverlapping.buttons;
add('Phone text overlapping shows Move Forward and Backward', overlapOn && tBar.b.length === 9 && tBar.b.every(([l, x]) => Math.abs(tWant[l] - x) <= 1), JSON.stringify(tBar.b));
await fresh();
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
const zb = TB.zButtons;
const barWords = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-toolbar .tb-btn')].map((x) => x.getAttribute('aria-label') + (x.classList.contains('is-off') ? ' (off)' : ''))))()`);
await pick(BIDS.head);
add('Phone top of the stack, nothing pinned', barWords().join() === zb.phonePin.before.join(), String(barWords()));
await tbClick('pin'); browser(S, 'press', 'Escape'); await pause(200);
add('Phone pin brings Move Forward and Backward', barWords().join() === zb.phonePin.afterPin.join(), String(barWords()));
await pick(BIDS.text);
add('The next block too', barWords().join() === zb.phonePin.nextBlock.join(), String(barWords()));
await fresh();
const lone = 'yui_3_17_2_1_1793705139153_437';
const loneSid = evalJs(S, `(() => JSON.stringify(fe.model.sections[0].id))()`);
evalJs(S, `(() => { fe.select(${JSON.stringify(loneSid)}, '${lone}'); return 'true'; })()`); await pause(350);
add('Desktop, overlapping nothing', barWords().join() === zb.desktopAlone.before.join(), String(barWords()));
await tbClick('pin'); browser(S, 'press', 'Escape'); await pause(200);
add('Desktop pin brings Move Forward and Backward', barWords().join() === zb.desktopAlone.afterPin.join(), String(barWords()));
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
evalJs(S, `(() => { fe.select(${JSON.stringify(loneSid)}, '${lone}'); return 'true'; })()`); await pause(350);
add('A desktop pin brings none on phones', !barWords().some((x) => x.startsWith('Move Forward')), String(barWords()));
await fresh();
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
await pick(BIDS.text);
await tbClick('align');
await tbClick('valign:flex-end');
const phoneJ = alignRead();
add('Phone align applies', phoneJ.j === 'flex-end' && phoneJ.a === 'flex-end', JSON.stringify(phoneJ));
await tbClick('pin'); browser(S, 'press', 'Escape'); await pause(200);
const pinnedPhone = evalJs(S, `(() => { ${FR} const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.text}"]')); return JSON.stringify(c.position); })()`);
evalJs(S, `(() => { fe.setBp('desktop'); return 'true'; })()`); await pause(600);
const deskC = evalJs(S, `(() => { ${FR} const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.text}"]')); return JSON.stringify({ pos: c.position, top: c.top }); })()`);
add('Phone pin and align stay out of desktop', pinnedPhone === 'sticky' && deskC.pos === 'relative' && deskC.top === '0px' && alignRead().j !== 'flex-end', `${pinnedPhone} ${JSON.stringify(deskC)}`);
await pick(BIDS.text); await tbClick('pin');
add('Desktop pins on its own', evalJs(S, `(() => { ${FR} return JSON.stringify(W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${BIDS.text}"]')).position); })()`) === 'sticky');
browser(S, 'press', 'Escape'); await pause(150);
const saved = evalJs(S, `(() => { const b = fe.model.sections[${SEC}].blocks.find((x) => x.id === '${BIDS.text}'); return JSON.stringify([b.layout.mobile.sticky, b.layout.desktop.sticky, b.layout.mobile.justify]); })()`);
add('Both pins kept in the model', saved[0] && saved[1] && saved[2] === 'flex-end', JSON.stringify(saved));

// Tips: 11px under the button, centred, keys in chips, none on an unavailable button.
await fresh();
await pick(BIDS.text);
const tipOf = async (tb) => { const q = evalJs(S, `(() => { const q = document.querySelector('#block-toolbar [data-tb="${tb}"]').getBoundingClientRect(); return JSON.stringify([q.left, q.top, q.width, q.height]); })()`); moveTo([q[0] + q[2] / 2, q[1] + q[3] / 2]); await moveTo([q[0] + q[2] / 2, q[1] + q[3] / 2 + 1]); await pause(400); const t = evalJs(S, `(() => { const e = document.getElementById('bar-tip'); if (e.hidden) return 'null'; const q = e.getBoundingClientRect(); return JSON.stringify({ text: e.innerText.replace(/\\s+/g, ' ').trim(), box: [q.left, q.top, q.width, q.height] }); })()`); await moveTo([20, 996]); await pause(100); return [q, t]; };
const tipCheck = async (tb, label) => {
  const [q, t] = await tipOf(tb);
  const want = TB.tips.words[label];
  const ok = t && t.text === want[0] && Math.abs(t.box[1] - (q[1] + q[3] + 11)) <= 1 && t.box[3] === 44 && Math.abs(t.box[2] - want[1]) <= 12 && Math.abs(t.box[0] + t.box[2] / 2 - (q[0] + q[2] / 2)) <= 1;
  add(`Tip ${label}`, ok, JSON.stringify(t));
};
for (const [tb, label] of [['write', 'Write'], ['edit', 'Edit'], ['align', 'Align Vertically'], ['pin', 'Pin'], ['duplicate', 'Duplicate'], ['remove', 'Remove']]) await tipCheck(tb, label);
const zOverlap = evalJs(S, `(() => { const s = fe.model.sections[${SEC}], t = s.blocks.find((b) => b.id === '${BIDS.text}'), o = s.blocks.find((b) => b.id === '${BIDS.shape}'); o.layout.desktop.area = [...t.layout.desktop.area]; t.layout.desktop.z = Math.min(...s.blocks.map((x) => x.layout.desktop.z)) - 1; fe.select(null); fe.select(s.id, t.id); return JSON.stringify(true); })()`);
await pause(250);
await tipCheck('z+', 'Move Forward');
const [, offTip] = await tipOf('z-');
add('No tip on an unavailable button', zOverlap && offTip === null, JSON.stringify(offTip));
await tbClick('align'); await moveTo([20, 996]);
for (const [v, label] of [['flex-start', 'Align Top'], ['center', 'Align Center'], ['flex-end', 'Align Bottom']]) await tipCheck(`valign:${v}`, label);
browser(S, 'press', 'Escape'); await pause(150);
await fresh();
evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(600);
await pick(BIDS.text);
for (const [tb, label] of [['up', 'Move Up'], ['down', 'Move Down']]) await tipCheck(tb, label);
const rq = evalJs(S, `(() => { const q = document.querySelector('#block-toolbar [data-tb="remove"]').getBoundingClientRect(); return JSON.stringify([q.left + 18, q.top + 18]); })()`);
moveTo(rq); await pause(350);
await tbClick('remove'); await pause(250);
add('A removed block takes its tip with it', evalJs(S, `(() => JSON.stringify(document.getElementById('bar-tip').hidden))()`) === true);

// P8: the header above 1520px: the larger of 4vw and centred in 1400.
const HD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-HEADER.json', import.meta.url)));
for (const w of [1520, 1700, 1920, 2400]) {
  viewport(S, w, 900); goto(S, `${BASE}/page.html`); await pause(900);
  const r = evalJs(S, `(() => { const q = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }; return JSON.stringify({ wrap: q('.site-header'), title: q('.header-title'), nav: q('.header-nav'), actions: q('.header-actions') }); })()`);
  const o = Object.fromEntries(HD.reads[w].sel.map((x) => [x.cls.split(' ')[0], x.box]));
  const close = (a, b, n = 1) => a.every((v, i) => Math.abs(v - b[i]) <= n);
  add(`Header ${w}: height`, close([r.wrap[3]], [o['header-announcement-bar-wrapper'][3]]), String(r.wrap));
  add(`Header ${w}: title box`, close(r.title, o['header-title']), String(r.title));
  add(`Header ${w}: menu`, close(r.nav, o['header-nav']), String(r.nav));
  add(`Header ${w}: actions`, close(r.actions, o['header-actions']), String(r.actions));
}
viewport(S, 1600, 1000);

// S3: a stack on a blank section, against parity/findings/S3.json round3, with real clicks.
const ST = JSON.parse(readFileSync(new URL('../parity/findings/S3.json', import.meta.url))).round3;
{
  viewport(S, 1600, 1000); goto(S, `${BASE}/`); await pause(1500);
  const area = (a, z) => ({ area: a, z, justify: 'flex-start', align: 'flex-start' });
  const load = (cs) => evalJs(S, `(() => { const m = JSON.parse(JSON.stringify(fe.model)); const s = m.sections[0]; const pad = (t, a, z, extra) => ({ id: t + a[0] + a[1], type: t, ...extra, layout: { desktop: { area: a, z, justify: 'flex-start', align: 'flex-start' }, mobile: { area: a[3] > 10 ? [a[0], 2, a[2], 10] : a, z, justify: 'flex-start', align: 'flex-start' } } }); s.blocks = ${JSON.stringify(cs)}.map(([t, a, z]) => pad(t, a, z, t === 'button' ? { label: 'Learn more' } : t === 'text' ? { html: '<p></p>' } : {})); s.rows = { desktop: 12, mobile: 12 }; m.sections = [s]; fe.load(m); return 'true'; })()`);
  const blockBox = (id) => evalJs(S, `(() => { const f = document.querySelector('iframe').getBoundingClientRect(); const q = document.querySelector('iframe').contentDocument.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify([q.left + f.left, q.top + f.top, q.width, q.height]); })()`);
  const clickAt = async (x, y, mods) => { mouse(S, 'move', x, y); await pause(40); mouse(S, 'down', x, y, { buttons: 1, mods }); await pause(30); mouse(S, 'up', x, y, { mods }); await pause(220); };
  const stackOf = () => evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const W = d.defaultView; const c = d.querySelector('.sqs-stack-container'); if (!c) return JSON.stringify(null); const fe = c.closest('.fe-block'); const q = fe.getBoundingClientRect(); const s = W.getComputedStyle(c), b = W.getComputedStyle(fe.querySelector('.sqs-block')); return JSON.stringify({ id: fe.dataset.blockId, area: W.getComputedStyle(fe).gridArea, z: W.getComputedStyle(fe).zIndex, box: [q.width, q.height], dir: s.flexDirection, jc: s.justifyContent, ai: s.alignItems, gap: s.columnGap, pad: b.padding, bg: b.backgroundColor, radius: [b.borderTopLeftRadius, b.borderTopRightRadius, b.borderBottomRightRadius, b.borderBottomLeftRadius], border: b.borderTopWidth + ' ' + b.borderTopStyle + ' ' + b.borderTopColor, kids: [...c.children].map((k) => { const r = k.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height]; }) }); })()`);
  const tbLabels = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => b.getAttribute('aria-label'))))()`);
  const tbPress = async (act) => { const q = evalJs(S, `(() => { const b = document.querySelector('#block-toolbar [data-tb="${act}"]'); if (!b) return JSON.stringify(null); const r = b.getBoundingClientRect(); return JSON.stringify([r.left + 18, r.top + 18]); })()`); if (!q) return false; await clickAt(q[0], q[1]); return true; };
  const pPress = async (label) => { const q = evalJs(S, `(() => { const b = [...document.querySelectorAll('#block-panel [aria-label]')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)}); if (!b) return JSON.stringify(null); b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`); if (!q) return false; await clickAt(q[0], q[1]); return true; };
  const typeIn = async (label, v) => { evalJs(S, `(() => { const i = [...document.querySelectorAll('#block-panel input')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)}); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(120); };
  const inPanel = (label) => evalJs(S, `(() => { const p = document.querySelector('#block-panel').getBoundingClientRect(); const b = [...document.querySelectorAll('#block-panel [aria-label]')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)}); if (!b) return JSON.stringify(null); const r = b.getBoundingClientRect(); return JSON.stringify([r.left - p.left, r.top - p.top, r.width, r.height]); })()`);
  const value = (label) => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-panel input')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)}).value))()`);
  const near = (a, b, n = 1) => !!a && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= n);
  const nearRows = (a, b, n = 1) => !!a && a.length === b.length && a.every((v, i) => near(v, b[i], n));
  const scrollPanel = (top) => evalJs(S, `(() => { const e = [...document.querySelectorAll('#block-panel *')].find((x) => x.scrollHeight > x.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(x).overflowY)); if (e) e.scrollTop = ${top}; return 'true'; })()`);
  const make = async (cs) => {
    load(cs); await pause(500);
    const ids = cs.map(([t, a]) => t + a[0] + a[1]);
    let q = blockBox(ids[0]); await clickAt(q[0] + q[2] / 2, q[1] + q[3] / 2);
    for (const id of ids.slice(1)) { q = blockBox(id); await clickAt(q[0] + q[2] / 2, q[1] + q[3] / 2, ['Shift']); }
    await tbPress('stack');
    await pause(300);
  };
  // Direction, area, kids and Unstack, in the oracle's two cases.
  for (const [n, c] of ST.cases.entries()) {
    const toArea = (t) => t.split(' / ').map(Number);
    const types = n === 0 ? ['shape', 'button'] : ['button', 'shape'];
    await make(c.before.map((t, k) => [types[k], toArea(t), c.zBefore[k]]));
    const r = stackOf();
    add(`Stack ${c.direction}: direction`, r?.dir === c.direction, r?.dir);
    add(`Stack ${c.direction}: area`, r?.area === c.area, r?.area);
    add(`Stack ${c.direction}: on top of the group`, r && Number(r.z) === c.z, r?.z);
    add(`Stack ${c.direction}: children`, nearRows(r?.kids, c.kids, 12), JSON.stringify(r?.kids));
    await tbPress('stackopts'); await tbPress('sopt:unstack'); await pause(300);
    const un = evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; return JSON.stringify([...d.querySelectorAll('main .fe-block, .fluid-engine .fe-block')].map((b) => [d.defaultView.getComputedStyle(b).gridArea, d.defaultView.getComputedStyle(b).zIndex])); })()`);
    add(`Unstack ${c.direction}: places`, c.unstacked.every((t) => un.some((x) => x[0] === t)), JSON.stringify(un));
    add(`Unstack ${c.direction}: new z`, c.zAfter.every((z) => un.some((x) => Number(x[1]) === z)), JSON.stringify(un));
    evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(300);
    add(`Unstack ${c.direction}: one undo brings the stack back`, stackOf()?.area === c.area);
  }
  // Toolbar and Stack Options on the row case.
  await make([['shape', [1, 2, 7, 8], 1], ['button', [1, 12, 3, 18], 2]]);
  add('Stack toolbar: buttons', JSON.stringify(tbLabels()) === JSON.stringify(ST.toolbar.labels), String(tbLabels()));
  const bar = evalJs(S, `(() => { const t = document.getElementById('block-toolbar').getBoundingClientRect(); return JSON.stringify([t.width, t.height, ...[...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => b.getBoundingClientRect().left - t.left)]); })()`);
  const L = ST.toolbar.buttonLefts;
  add('Stack toolbar: boxes', near(bar, [ST.toolbar.barWidth - 2, 42, L.Edit, L['Open link editor popover'], L['Stack Options'], L.Pin, L.Duplicate, L.Remove], 10) && near(bar.slice(2), [L.Edit, L['Open link editor popover'], L['Stack Options'], L.Pin, L.Duplicate, L.Remove]), String(bar));
  await tbPress('stackopts');
  const menu = evalJs(S, `(() => { const m = document.querySelector('#block-toolbar .tb-vmenu'); const r = m.getBoundingClientRect(); const o = document.querySelector('#block-toolbar [data-tb="stackopts"]').getBoundingClientRect(); return JSON.stringify({ labels: [...m.children].map((b) => b.getAttribute('aria-label')), box: [r.width, r.height], off: r.left + r.width / 2 - o.left - o.width / 2, on: [...m.children].filter((b) => b.classList.contains('tb-open')).map((b) => b.getAttribute('aria-label')), open: document.querySelector('#block-toolbar [data-tb="stackopts"]').classList.contains('tb-open') }); })()`);
  add('Stack Options: labels', JSON.stringify(menu.labels) === JSON.stringify(ST.stackOptions.labels), String(menu.labels));
  add('Stack Options: box, centred', near(menu.box, ST.stackOptions.box) && Math.abs(menu.off) <= 1, JSON.stringify(menu));
  await pause(320);
  add('Stack Options: no tip on the open button', evalJs(S, `(() => JSON.stringify(document.getElementById('bar-tip').hidden))()`) === true);
  add('Stack Options: the current one is on', menu.on.join() === 'Stack Horizontally' && menu.open, String(menu.on));
  await tbPress('sopt:column'); await pause(200);
  const col = stackOf();
  add('Stack Vertically: a column, same area', col.dir === 'column' && col.area === ST.toggle.areaKept.replace('14', '14'), JSON.stringify([col.dir, col.area]));
  add('Stack Vertically: children', nearRows(col.kids, ST.toggle.column.kids, 2), JSON.stringify(col.kids));
  add('Stack Vertically: the stack grows to hold them', near(col.box, ST.toggle.column.box, 2), String(col.box));
  add('A pick keeps the menu open', evalJs(S, `(() => JSON.stringify(!!document.querySelector('#block-toolbar .tb-vmenu')))()`) === true);
  await tbPress('sopt:row'); await pause(200);
  const row = stackOf();
  add('Stack Horizontally: children', nearRows(row.kids, ST.toggle.row.kids, 2), JSON.stringify(row.kids));
  // Clicks and drags on a child belong to the stack.
  const sq = blockBox(row.id);
  await clickAt(sq[0] + 40, sq[1] + 40); await clickAt(sq[0] + 40, sq[1] + 40);
  add('A click on a child keeps the stack', JSON.stringify(tbLabels()) === JSON.stringify(ST.toolbar.labels), String(tbLabels()));
  // Design panel.
  await tbPress('edit'); await pause(300);
  const tabs = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-panel [role=tab][data-btab]')].map((t) => t.textContent)))()`);
  add('Stack panel: tabs', tabs.join() === ST.panel.tabs.join(), String(tabs));
  const PB = ST.panel.boxesInPanel;
  add('Stack panel: Direction', near(inPanel('Column'), PB.Column, 1), String(inPanel('Column')));
  add('Stack panel: Position, first tab', near(inPanel('Top Left'), PB['Top Left'], 1), String(inPanel('Top Left')));
  add('Stack panel: Position, last tab', near(inPanel('Bottom Right'), PB['Bottom Right'], 1), String(inPanel('Bottom Right')));
  add('Stack panel: Gap', near(inPanel('Gap'), PB.gapInput, 1), String(inPanel('Gap')));
  add('Stack panel: Gap options', near(inPanel('Expand gap options'), PB.gapToggle, 1), String(inPanel('Expand gap options')));
  add('Stack panel: Padding', near(inPanel('Padding vertical'), PB.padY, 1) && near(inPanel('Padding horizontal'), PB.padX, 1), String(inPanel('Padding vertical')));
  add('Stack panel: Padding toggle', near(inPanel('Show top, bottom, left, and right padding controls'), PB.padToggle, 1), String(inPanel('Show top, bottom, left, and right padding controls')));
  add('Stack panel: Add fill', near(inPanel('Add fill'), PB.addFill, 1), String(inPanel('Add fill')));
  await pPress('Bottom Right');
  let r = stackOf();
  add('Position in a row: left-right on justify-content', r.jc === 'flex-end' && r.ai === 'flex-end', JSON.stringify([r.jc, r.ai]));
  add('Position Bottom: the button drops, the shape fills', near(r.kids[1].slice(1, 2), [ST.position.rowButtonTop.bottom], 1) && near(r.kids[0].slice(1, 2), [0]), JSON.stringify(r.kids));
  await pPress('Center Left'); r = stackOf();
  add('Position Center: the button centres', near(r.kids[1].slice(1, 2), [ST.position.rowButtonTop.center], 1) && r.jc === 'flex-start' && r.ai === 'center', JSON.stringify(r.kids));
  await pPress('Column'); r = stackOf();
  add('Position in a column: the reverse', r.jc === 'center' && r.ai === 'flex-start', JSON.stringify([r.jc, r.ai]));
  await pPress('Row'); await pPress('Top Left');
  for (const [typed, want] of [['40px', '40px'], ['0px', '0px'], ['100px', '100px'], ['500px', '500px'], ['30', '30px'], ['-5px', '0px'], ['2em', '2px']]) {
    await typeIn('Gap', typed);
    add(`Gap ${typed}`, stackOf().gap === want && value('Gap') === want, `${stackOf().gap} ${value('Gap')}`);
  }
  await typeIn('Gap', 'abc');
  add('Gap: a word keeps the last', stackOf().gap === '2px', stackOf().gap);
  await typeIn('Gap', '20px');
  await pPress('Expand gap options');
  add('Gap options: the rows', near(evalJs(S, `(() => { const p = document.querySelector('#block-panel').getBoundingClientRect(); const b = document.querySelectorAll('.st-gap-menu button')[1].getBoundingClientRect(); return JSON.stringify([b.left - p.left, b.top - p.top, b.width, b.height]); })()`), PB.gapRows[1], 1), '');
  await clickAt(...evalJs(S, `(() => { const b = document.querySelectorAll('.st-gap-menu button')[1].getBoundingClientRect(); return JSON.stringify([b.left + 40, b.top + 20]); })()`));
  r = stackOf();
  add('Gap Fill: spread, no gap, equal children', r.jc === ST.gap.fill.justifyContent && value('Gap') === 'Fill' && near([r.kids[0][2]], [ST.gap.fill.kidWidth], 1), JSON.stringify([r.jc, r.gap, r.kids[0]]));
  await typeIn('Gap', '20px');
  await typeIn('Padding vertical', '40px'); await typeIn('Padding horizontal', '15px'); r = stackOf();
  add('Padding: two values', r.pad === ST.padding.two.padding, r.pad);
  add('Padding: the children move in', near(r.kids[0].slice(0, 3), ST.padding.two.kid.slice(0, 3), 1), JSON.stringify(r.kids[0]));
  await typeIn('Padding vertical', '30'); add('Padding: a bare number is px', value('Padding vertical') === '30px', value('Padding vertical'));
  await typeIn('Padding vertical', '2em'); add('Padding: another unit stays', value('Padding vertical') === '2em', value('Padding vertical'));
  await pPress('Show top, bottom, left, and right padding controls');
  for (const [l, v] of [['Padding top', '1'], ['Padding left', '2'], ['Padding bottom', '3'], ['Padding right', '4']]) await typeIn(l, v);
  add('Padding: four values, in the order read', stackOf().pad === ST.padding.four.padding, stackOf().pad);
  await pPress('Only show vertical and horizontal padding controls');
  await typeIn('Padding vertical', '0px'); await typeIn('Padding horizontal', '0px');
  add('No Corner row before a fill', inPanel('Uniform corner radii') === null);
  await pPress('Add fill'); r = stackOf();
  add('Add fill: white', r.bg === ST.fill.block, r.bg);
  add('Add fill: Color and Remove color', !!inPanel('Color') && !!inPanel('Remove color'));
  await typeIn('Corner', '24px'); r = stackOf();
  add('Corner: all four', r.radius.every((v) => v === ST.corner.uniform.sqsBlockRadius), String(r.radius));
  await typeIn('Corner', '1px');
  await pPress('Individual corner radii');
  for (const [n, v] of [['Top left', '2'], ['Top right', '3'], ['Bottom right', '4']]) await typeIn(`${n} corner radius`, v);
  r = stackOf();
  add('Corner: four, in the order read', r.radius.join() === ST.corner.individual.radius.join(), String(r.radius));
  await pPress('Uniform corner radii'); r = stackOf();
  add('Corner: back to one takes the top left', r.radius.every((v) => v === '2px'), String(r.radius));
  await pPress('Solid Stroke'); r = stackOf();
  add('Solid Stroke', `${r.border}` === '2px solid rgb(0, 0, 0)', r.border);
  add('Solid Stroke: the children sit inside', near(r.kids[0], ST.stroke.kidWithStroke, 1), JSON.stringify(r.kids[0]));
  add('Solid Stroke: its rows', !!inPanel('Stroke Color'));
  await pPress('Dashed Stroke'); add('Dashed Stroke', stackOf().border === '2px dashed rgb(0, 0, 0)', stackOf().border);
  await pPress('No Stroke'); await pPress('Remove color');
  add('Remove color', stackOf().bg === 'rgba(0, 0, 0, 0)', stackOf().bg);
  add('Corner goes with the fill and the stroke', inPanel('Uniform corner radii') === null);
  evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(200);
  // Link: the same editor as buttons.
  await clickAt(sq[0] + 40, sq[1] + 40);
  await tbPress('link'); await pause(200);
  add('Link: the editor opens', evalJs(S, `(() => JSON.stringify(!document.getElementById('link-popover').hidden))()`) === true);
  evalJs(S, `(() => { document.getElementById('link-popover').hidden = true; fe.select(null); return 'true'; })()`); await pause(100);
  // Phones: alone in the section, a column of its own, values kept apart.
  await make([['shape', [1, 2, 7, 8], 1], ['button', [1, 12, 3, 18], 2]]);
  const id = stackOf().id;
  evalJs(S, `(() => { fe.setBp('mobile'); return 'true'; })()`); await pause(500);
  evalJs(S, `(() => { fe.select(fe.model.sections[0].id, ${JSON.stringify(id)}); return 'true'; })()`); await pause(300);
  add('Phone: Edit, Pin, Remove', JSON.stringify(tbLabels()) === JSON.stringify(ST.toolbar.phoneAlone), String(tbLabels()));
  r = stackOf();
  add('Phone: a column', r.dir === 'column', r.dir);
  await tbPress('edit'); await pause(300);
  await pPress('Row'); await pPress('Center'); r = stackOf();
  add('Phone: Direction and Position change the phone', r.dir === 'row' && r.jc === 'center' && r.ai === 'center', JSON.stringify([r.dir, r.jc, r.ai]));
  evalJs(S, `(() => { fe.select(null); fe.setBp('desktop'); return 'true'; })()`); await pause(500); r = stackOf();
  add('Phone values leave the desktop alone', r.dir === 'row' && r.jc === 'flex-start' && r.ai === 'flex-start', JSON.stringify([r.dir, r.jc, r.ai]));
  // The button after Unstack: Align Horizontally.
  await clickAt(sq[0] + 40, sq[1] + 40);
  await tbPress('stackopts'); await tbPress('sopt:unstack'); await pause(300);
  const FB = ST.fitButton;
  const btnId = evalJs(S, `(() => JSON.stringify(fe.model.sections[0].blocks.find((b) => b.type === 'button').id))()`);
  const bq = blockBox(btnId); await clickAt(bq[0] + 2, bq[1] + 2);
  add('Fit button: its toolbar', JSON.stringify(tbLabels()) === JSON.stringify(FB.toolbar), String(tbLabels()));
  const toLeft = () => evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const fe = d.querySelector('.fe-block[data-block-id="${btnId}"]'); return JSON.stringify(fe.querySelector('a').getBoundingClientRect().left - fe.getBoundingClientRect().left); })()`);
  const fw = evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const q = d.querySelector('.fe-block[data-block-id="${btnId}"] a').getBoundingClientRect(); return JSON.stringify([q.width, q.height]); })()`);
  add('Fit button: as tall as read, wide within our font', near([fw[1]], [FB.box[3]], 2) && near([fw[0]], [FB.box[2]], 12), String(fw));
  await tbPress('halign');
  add('Align Horizontally: the menu', JSON.stringify(evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-toolbar .tb-vmenu button')].map((b) => b.getAttribute('aria-label'))))()`)) === JSON.stringify(FB.menu));
  const free = evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const fe = d.querySelector('.fe-block[data-block-id="${btnId}"]'); return JSON.stringify(fe.getBoundingClientRect().width - fe.querySelector('a').getBoundingClientRect().width); })()`);
  add('Align Center: centred', near([toLeft()], [free / 2], 1), String(toLeft()));
  await tbPress('halign:right'); await pause(150);
  add('Align Right', near([toLeft()], [free], 1), String(toLeft()));
  await tbPress('halign:left'); await pause(150);
  add('Align Left', near([toLeft()], [0], 1), String(toLeft()));
  evalJs(S, `(() => { fe.select(null); return 'true'; })()`);
  await pause(100);

  // S3, children from Layers.
  const FL = ST.children.fromLayers, SZ = FL.size.threeInARow;
  const three = [['text', [1, 2, 3, 10], 1], ['button', [1, 9, 3, 15], 2], ['shape', [1, 16, 7, 22], 3]];
  const openLayers = async () => { if (evalJs(S, `(() => JSON.stringify(!document.getElementById('layers-panel').hidden))()`)) return; evalJs(S, `(() => { fe.select(null); return 'true'; })()`); mouse(S, 'move', 800, 700); await pause(200); const q = evalJs(S, `(() => { const b = [...document.querySelectorAll('#section-chrome button')].find((x) => x.getAttribute('aria-label') === 'Open Layers Panel' && x.getBoundingClientRect().width > 0); if (!b) return JSON.stringify(null); const r = b.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`); if (q) { await clickAt(q[0], q[1]); await pause(200); } };
  const layerList = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#layers-panel li[data-layer]')].map((l) => [l.querySelector('.lp-name').textContent, l.querySelector('.lp-name').getBoundingClientRect().left - l.getBoundingClientRect().left, !!l.dataset.kidOf])))()`);
  const pickRow = async (name) => { await openLayers(); const q = evalJs(S, `(() => { const l = [...document.querySelectorAll('#layers-panel li[data-layer]')].find((x) => x.querySelector('.lp-name').textContent === ${JSON.stringify(name)}); if (!l) return JSON.stringify(null); const r = l.getBoundingClientRect(); return JSON.stringify([r.left + 80, r.top + 22]); })()`); if (!q) throw new Error(`No row ${name}: ${JSON.stringify(layerList())}`); await clickAt(q[0], q[1]); await pause(150); };
  const closeUp = async () => { evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(150); };
  await make(three);
  add('Three in a row: children', nearRows(stackOf()?.kids, SZ.start, 3), JSON.stringify(stackOf()?.kids));
  await closeUp(); await openLayers();
  const lr = layerList();
  add('Layers: the stack, then its children', lr.map((x) => x[0]).join() === 'Stack,Text,Button,Shape' && lr.slice(1).every((x) => x[2]), JSON.stringify(lr));
  add('Layers: children sit one step in', Math.abs(lr[1][1] - lr[0][1] - 22) <= 1, JSON.stringify(lr.map((x) => x[1])));
  for (const [row, key] of [['Shape', 'shape'], ['Button', 'button'], ['Text', 'text']]) {
    await pickRow(row);
    add(`${row} child: its toolbar`, JSON.stringify(tbLabels()) === JSON.stringify(FL.toolbars[key]), String(tbLabels()));
  }
  await pickRow('Shape');
  const kidBar = evalJs(S, `(() => { const t = document.getElementById('block-toolbar').getBoundingClientRect(); return JSON.stringify([t.width, ...[...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => b.getBoundingClientRect().left - t.left)]); })()`);
  add('Shape child: the bar', near(kidBar, [FL.shapeBar.box[0] - 2, 4, 49, 94, 134], 1), String(kidBar));
  const marks = evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const k = d.querySelector('.stack-child-container[data-is-selected="true"]'); const q = k.getBoundingClientRect(); return JSON.stringify({ handles: k.querySelectorAll('.fe-handle').length, nw: (() => { const r = k.querySelector('.fe-handle[data-dir="nw"]').getBoundingClientRect(); return [r.left + 17 - q.left, r.top + 17 - q.top]; })(), line: d.querySelectorAll('.fe-indicator.is-member').length }); })()`);
  add('Shape child: eight handles, a line around the stack', marks.handles === 8 && marks.line === 1 && near(marks.nw, [0, 0], 2), JSON.stringify(marks));
  await tbPress('edit'); await pause(300);
  const fieldVal = (a) => value(a);
  const SB = FL.sizeBoxesInPanel;
  add('Size: W field', near(inPanel('W'), SB.wInput, 1), String(inPanel('W')));
  add('Size: W options', near(inPanel('W options'), SB.wToggle, 1), String(inPanel('W options')));
  add('Size: H field', near(inPanel('H'), SB.hInput, 1), String(inPanel('H')));
  add('Size: H options', near(inPanel('H options'), SB.hToggle, 1), String(inPanel('H options')));
  add('Shape child: Fill, Fill', fieldVal('W') === 'Fill' && fieldVal('H') === 'Fill', `${fieldVal('W')} ${fieldVal('H')}`);
  await pPress('W options');
  const opts = evalJs(S, `(() => { const p = document.querySelector('#block-panel').getBoundingClientRect(); return JSON.stringify([...document.querySelectorAll('.st-size-menu button')].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, r.left - p.left, r.top - p.top, r.width, r.height]; })); })()`);
  add('Size: the options', opts.map((o) => o[0]).join() === FL.sizeOptions.join() && opts.every((o, n) => near(o.slice(1), SB.rows[n], 1)), JSON.stringify(opts));
  await pPress('W options');
  await typeIn('W', '200px');
  add('W 200px: the others share the rest', nearRows(stackOf().kids, SZ.w200, 3), JSON.stringify(stackOf().kids));
  await typeIn('H', '100px');
  add('H 100px', near(stackOf().kids[2], SZ.h100, 1), JSON.stringify(stackOf().kids[2]));
  await typeIn('W', '50%');
  add('W 50%: of the stack', nearRows(stackOf().kids, SZ.w50pct, 3), JSON.stringify(stackOf().kids));
  await typeIn('W', 'Hug');
  add('W Hug on a Shape', near(stackOf().kids[2], SZ.wHug, 1), JSON.stringify(stackOf().kids[2]));
  await typeIn('H', 'Hug');
  add('H Hug on a Shape', near(stackOf().kids[2], SZ.hHug, 1), JSON.stringify(stackOf().kids[2]));
  await typeIn('W', 'Fill'); await typeIn('H', 'Fill');
  add('Back to Fill', near(stackOf().kids[2], SZ.back, 1), JSON.stringify(stackOf().kids[2]));
  await closeUp();
  await pickRow('Text'); await tbPress('edit'); await pause(250);
  add('Text child: Fill, Hug', fieldVal('W') === 'Fill' && fieldVal('H') === 'Hug', `${fieldVal('W')} ${fieldVal('H')}`);
  await closeUp();
  await pickRow('Text'); await tbPress('write'); await pause(250);
  add('Write on a Text child edits it', evalJs(S, `(() => JSON.stringify(document.querySelector('iframe').contentDocument.querySelector('.stack-child-container [contenteditable="true"]') !== null))()`) === true);
  evalJs(S, `(() => { fe.finishEdit(); fe.select(null); return 'true'; })()`); await pause(200);
  await pickRow('Shape');
  const sb = blockBox(stackOf().id), kid2 = stackOf().kids[2];
  await clickAt(sb[0] + kid2[0] + 50, sb[1] + 50);
  add('A click on the selected child keeps it', JSON.stringify(tbLabels()) === JSON.stringify(FL.toolbars.shape), String(tbLabels()));
  await pickRow('Shape');
  await tbPress('duplicate'); await pause(200);
  add('Duplicate: the copy after it, sharing the row', nearRows(stackOf().kids, FL.duplicate.after, 3), JSON.stringify(stackOf().kids));
  add('Duplicate: the stack keeps its area', stackOf().area === '1 / 2 / 7 / 22', stackOf().area);
  evalJs(S, `(() => { fe.undo(); fe.select(null); return 'true'; })()`); await pause(200);
  await pickRow('Shape');
  await tbPress('remove'); await pause(200);
  add('Remove a child: the rest share the row', stackOf().kids.length === 2 && near([stackOf().kids[0][2]], [FL.remove.twoLeft[0][2]], 2), JSON.stringify(stackOf().kids));
  await pickRow('Button'); await tbPress('remove'); await pause(200);
  add('Remove: one left, full width', stackOf().kids.length === 1 && near([stackOf().kids[0][2]], [FL.remove.oneLeft[0][2]], 2), JSON.stringify(stackOf().kids));
  await pickRow('Text'); await tbPress('remove'); await pause(200);
  add('Remove the last child: the stack goes', stackOf() === null);
  for (let k = 0; k < 3; k++) evalJs(S, `(() => { fe.undo(); return 'true'; })()`);
  await pause(300);
  add('Each Remove is one undo', stackOf()?.kids.length === 3, String(stackOf()?.kids.length));
  evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(150);
  // Reorder in Layers, hide, and the handles.
  await openLayers();
  const rowAt = (n) => evalJs(S, `(() => { const l = [...document.querySelectorAll('#layers-panel li[data-layer]')].find((x) => x.querySelector('.lp-name').textContent === '${n}'); const r = l.getBoundingClientRect(); return JSON.stringify([r.left + 80, r.top + 22]); })()`);
  const [rx, ry] = rowAt('Shape'), [, ty] = rowAt('Text');
  mouse(S, 'move', rx, ry); await pause(40); mouse(S, 'down', rx, ry, { buttons: 1 });
  for (let k = 1; k <= 8; k++) { mouse(S, 'move', rx, ry + (ty - 14 - ry) * k / 8, { buttons: 1 }); await pause(30); }
  mouse(S, 'up', rx, ty - 14); await pause(250);
  add('A row dragged up reorders the children', layerList().map((x) => x[0]).join() === 'Stack,Shape,Text,Button', String(layerList().map((x) => x[0])));
  add('The canvas follows', evalJs(S, `(() => JSON.stringify(document.querySelector('iframe').contentDocument.querySelector('.stack-child-container').querySelector('.sqs-block-shape') !== null))()`) === true);
  evalJs(S, `(() => { fe.undo(); fe.select(null); return 'true'; })()`); await pause(200);
  await openLayers();
  const [ex, ey] = rowAt('Shape');
  mouse(S, 'move', ex, ey); await pause(150);
  const eye = evalJs(S, `(() => { const l = [...document.querySelectorAll('#layers-panel li[data-layer]')].find((x) => x.querySelector('.lp-name').textContent === 'Shape'); const r = l.querySelector('[data-hide]').getBoundingClientRect(); return JSON.stringify([r.left + 18, r.top + 18]); })()`);
  await clickAt(eye[0], eye[1]); await pause(250);
  add('Hide a child: the others share the row, its row stays', stackOf().kids.filter((k) => k[2] > 0).length === 2 && near(stackOf().kids.filter((k) => k[2] > 0).map((k) => k[2]), [572.3, 572.3], 1) && layerList().length === 4, JSON.stringify([stackOf().kids, layerList().length]));
  evalJs(S, `(() => { fe.undo(); fe.select(null); return 'true'; })()`); await pause(200);
  await make([['text', [1, 2, 3, 10], 1], ['shape', [1, 12, 7, 18], 2]]);
  await closeUp();
  await pickRow('Shape');
  const before = stackOf(), sq2 = blockBox(before.id), k1 = before.kids[1];
  const hx = sq2[0] + k1[0] + k1[2], hy = sq2[1] + k1[1] + k1[3];
  mouse(S, 'move', hx, hy); await pause(40); mouse(S, 'down', hx, hy, { buttons: 1 });
  for (let k = 1; k <= 8; k++) { mouse(S, 'move', hx - 100 * k / 8, hy - 60 * k / 8, { buttons: 1 }); await pause(30); }
  mouse(S, 'up', hx - 100, hy - 60); await pause(250);
  add('A child\'s corner handle: fixed W and H', nearRows(stackOf().kids, FL.handle.after, 12) && near(stackOf().kids[1].slice(2), [before.kids[1][2] - 100, before.kids[1][3] - 60], 1), JSON.stringify(stackOf().kids));
  evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(200);
  add('One undo sizes it back', near(stackOf().kids[1], before.kids[1], 1), JSON.stringify(stackOf().kids[1]));
  await closeUp();
  // The other handles, one edge at a time, and arrow keys.
  await pickRow('Shape');
  for (const [dir, fx, fy, dx, dy, key] of [['e', 1, 0.5, -60, 0, 'east60left'], ['w', 0, 0.5, 60, 0, 'west60right'], ['n', 0.5, 0, 0, 50, 'north50down'], ['s', 0.5, 1, 0, -50, 'south50up'], ['nw', 0, 0, 60, 50, 'northwest']]) {
    const x = sq2[0] + k1[0] + k1[2] * fx, y = sq2[1] + k1[1] + k1[3] * fy;
    mouse(S, 'move', x, y); await pause(40); mouse(S, 'down', x, y, { buttons: 1 });
    for (let k = 1; k <= 6; k++) { mouse(S, 'move', x + dx * k / 6, y + dy * k / 6, { buttons: 1 }); await pause(25); }
    mouse(S, 'up', x + dx, y + dy); await pause(200);
    add(`A child's ${dir} handle`, near(stackOf().kids[1].slice(2), FL.edgeHandles[key].slice(2), 2), JSON.stringify(stackOf().kids[1]));
    evalJs(S, `(() => { fe.undo(); fe.select(fe.model.sections[0].id, ${JSON.stringify(before.id)}); return 'true'; })()`); await pause(150);
    await closeUp(); await pickRow('Shape');
  }
  const areaBefore = stackOf().area;
  browser(S, 'press', 'ArrowRight'); await pause(150); browser(S, 'press', 'ArrowDown'); await pause(150);
  add('Arrow keys on a child do nothing', stackOf().area === areaBefore && near(stackOf().kids[1], before.kids[1], 1), JSON.stringify(stackOf()));
  await closeUp();
  // The gap handle.
  evalJs(S, `(() => { fe.select(fe.model.sections[0].id, ${JSON.stringify(before.id)}); return 'true'; })()`); await pause(250);
  const GH = ST.gapHandle;
  const band = () => evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument; const b = d.querySelector('.stack-gap-handle'); if (!b) return JSON.stringify(null); const f = document.querySelector('iframe').getBoundingClientRect(); const r = b.getBoundingClientRect(), g = b.querySelector('i').getBoundingClientRect(); return JSON.stringify({ box: [r.left + f.left, r.top + f.top, r.width, r.height], grip: [g.width, g.height], o: getComputedStyle(b).opacity, c: getComputedStyle(b).cursor }); })()`);
  let gb = band();
  add('Gap handle: the band, the grip, hidden at rest', near(gb.box.slice(2), GH.row.band, 1) && near(gb.grip, GH.row.grip) && gb.o === '0' && gb.c === GH.row.cursor, JSON.stringify(gb));
  const gx = gb.box[0] + gb.box[2] / 2, gy = gb.box[1] + gb.box[3] / 2;
  mouse(S, 'move', gx, gy); await pause(120);
  add('Gap handle: shows on hover', band().o === '1', band().o);
  mouse(S, 'down', gx, gy, { buttons: 1 }); for (let k = 1; k <= 6; k++) { mouse(S, 'move', gx + 40 * k / 6, gy, { buttons: 1 }); await pause(30); } mouse(S, 'up', gx + 40, gy); await pause(250);
  add('Gap handle: 40px right gives 40px', stackOf().gap === GH.drag.right40, stackOf().gap);
  evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(200);
  add('Gap handle: one undo', stackOf().gap === '20px', stackOf().gap);
  mouse(S, 'move', gx, gy); await pause(60); mouse(S, 'down', gx, gy, { buttons: 1 }); for (let k = 1; k <= 6; k++) { mouse(S, 'move', gx - 40 * k / 6, gy, { buttons: 1 }); await pause(30); } mouse(S, 'up', gx - 40, gy); await pause(250);
  add('Gap handle: 40px left gives 0px', stackOf().gap === GH.drag.left40, stackOf().gap);
  evalJs(S, `(() => { fe.select(null); return 'true'; })()`); await pause(100);
  // Phones keep their own Size.
  const FP = FL.phone;
  await make(three);
  await closeUp(); await pickRow('Shape'); await tbPress('edit'); await pause(250);
  await typeIn('W', '200px'); await typeIn('H', '100px');
  add('Set on desktop: W 200, H 100', nearRows(stackOf().kids, FP.setOnDesktop.desktop, 3), JSON.stringify(stackOf().kids));
  evalJs(S, `(() => { fe.select(null); fe.setBp('mobile'); return 'true'; })()`); await pause(300);
  add('On a phone: W stays Fill, H comes along', nearRows(stackOf().kids, FP.setOnDesktop.phone, 3), JSON.stringify(stackOf().kids));
  for (const [row, key] of [['Text', 'text'], ['Button', 'button'], ['Shape', 'shape']]) {
    await pickRow(row);
    add(`${row} child on a phone: its toolbar`, JSON.stringify(tbLabels()) === JSON.stringify(FP.bars[key]), String(tbLabels()));
  }
  await tbPress('edit'); await pause(250);
  add('On a phone the panel reads Fill, 100px', fieldVal('W') === 'Fill' && fieldVal('H') === '100px', `${fieldVal('W')} ${fieldVal('H')}`);
  await typeIn('W', '50%');
  add('W 50% on a phone', near(stackOf().kids[2].slice(2), [188.3, 100], 1), JSON.stringify(stackOf().kids[2]));
  evalJs(S, `(() => { fe.select(null); fe.setBp('desktop'); return 'true'; })()`); await pause(300);
  add('Set on a phone: desktop keeps its own', near(stackOf().kids[2], FP.setOnDesktop.desktop[2], 1), JSON.stringify(stackOf().kids[2]));
  await closeUp();
  // Transforms on a child.
  await make(three);
  await closeUp(); await pickRow('Shape'); await tbPress('edit'); await pause(250);
  const kidCss = () => evalJs(S, `(() => { const d = document.querySelector('iframe').contentDocument, W = d.defaultView; const k = d.querySelectorAll('.stack-child-container')[2], c = W.getComputedStyle(k), b = W.getComputedStyle(k.querySelector('.sqs-block')); return JSON.stringify({ op: b.opacity, tr: b.transform, kidTr: c.transform }); })()`);
  await typeIn('Opacity', '50'); await typeIn('Rotate', '30');
  const kc = kidCss(), FT = FL.transforms;
  add('Opacity and Rotate on a child: on the block inside', kc.op === FT.rotate30.op && kc.kidTr === 'none' && near(kc.tr.match(/-?[\d.]+/g).map(Number), FT.rotate30.tr.match(/-?[\d.]+/g).map(Number), 0.01), JSON.stringify(kc));
  await closeUp();
  // A Button child that hugs: W Hug.
  await make(three);
  await closeUp(); await pickRow('Button'); await tbPress('edit'); await pause(250);
  evalJs(S, `(() => { document.querySelector('#block-panel [data-btab="Design"]').click(); return 'true'; })()`); await pause(150);
  await typeIn('W', 'Hug');
  add('W Hug on a Button: its own width, the others share', nearRows(stackOf().kids.map((k) => k.slice(0, 3)), FL.size.threeInARow.buttonWHug.map((k) => k.slice(0, 3)), 3), JSON.stringify(stackOf().kids));
  await closeUp();
}

// U5: the Add Block menu against parity/findings/U5.json.
{
  const U = JSON.parse(readFileSync(new URL('../parity/findings/U5.json', import.meta.url))), UM = U.menu;
  const near = (got, want, tol = 0.5) => Array.isArray(got) && got.length === want.length && got.every((v, n) => Math.abs(v - want[n]) <= tol);
  goto(S, `${BASE}/index.html`); await pause(1500);
  const openMenu = async () => { const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 300, o.top + r.top + 120]); })()`); mouse(S, 'move', p[0], p[1]); await pause(400); evalJs(S, `(() => { document.querySelector('[data-sc="add-block"]').click(); return 'true'; })()`); await pause(200); };
  await openMenu();
  const m = evalJs(S, `(() => { const M = document.getElementById('add-block-menu'), q = M.getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top + M.scrollTop, r.width, r.height]; }, cs = getComputedStyle(M); const t = M.querySelector('.am-tile'), ts = getComputedStyle(t), h = getComputedStyle(M.querySelector('.am-head')); return JSON.stringify({ box: [q.width, q.height], radius: cs.borderTopLeftRadius, sh: M.scrollHeight, input: rel(M.querySelector('.am-search')), heads: [...M.querySelectorAll('.am-head')].map((e) => [e.textContent, ...rel(e)]), tiles: [...M.querySelectorAll('.am-tile')].map((e) => [e.textContent, ...rel(e)]), textLeft: t.querySelector('span').getBoundingClientRect().left - t.getBoundingClientRect().left, tile: [ts.backgroundColor, ts.borderTopLeftRadius, ts.fontSize], head: [h.fontSize, h.fontWeight, h.height], focus: document.activeElement === M.querySelector('input') }); })()`);
  add('Add Block: the panel', near(m.box, UM.panel) && m.radius === UM.radius && near([m.sh], [UM.scrollHeight], 1), JSON.stringify([m.box, m.radius, m.sh]));
  add('Add Block: the search box, focused', near(m.input, UM.input, 1) && m.focus, JSON.stringify(m.input));
  add('Add Block: group names and tops', JSON.stringify(m.heads.map((h) => h[0])) === JSON.stringify(UM.groups.map((g) => g.name)) && m.heads.every((h, n) => near([h[2], h[4]], [UM.groups[n].top, UM.headHeight], 1)), JSON.stringify(m.heads.map((h) => [h[0], h[2]])));
  const wantTiles = UM.groups.flatMap((g) => g.tiles);
  add('Add Block: every tile in place', m.tiles.length === wantTiles.length && m.tiles.every((t, n) => t[0] === wantTiles[n].name && near(t.slice(1), [wantTiles[n].left, wantTiles[n].top, ...UM.tile.box], 1)), `${m.tiles.length} of ${wantTiles.length}: ${JSON.stringify(m.tiles.find((t, n) => t[0] !== wantTiles[n]?.name || !near(t.slice(1), [wantTiles[n].left, wantTiles[n].top, ...UM.tile.box], 1)))}`);
  add('Add Block: tile and head styles', near([m.textLeft], [UM.tile.textLeft], 1) && m.tile.join() === [UM.tile.background, UM.tile.radius, UM.tile.font].join() && m.head.join() === [...UM.headFont, `${UM.headHeight}px`].join(), JSON.stringify([m.textLeft, m.tile, m.head]));
  const searchFor = async (q) => { evalJs(S, `(() => { const i = document.querySelector('[data-am="search"]'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 'true'; })()`); await pause(120); };
  const shown = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('.am-tile')].map((t) => t.textContent)))()`);
  await searchFor('co');
  add('Search: the tiles for co, in menu order', shown().join() === U.search.co.join(), shown().join());
  const cl = evalJs(S, `(() => { const r = document.querySelector('[data-am="clear"]').getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`);
  await searchFor('zzzz');
  add('Search: No Results', evalJs(S, `(() => JSON.stringify(document.querySelector('.am-none')?.textContent))()`) === U.search.none && shown().length === 0, String(shown().length));
  mouse(S, 'move', cl[0], cl[1]); await pause(40); mouse(S, 'down', cl[0], cl[1], { buttons: 1 }); await pause(30); mouse(S, 'up', cl[0], cl[1]); await pause(150);
  add('Search: the X clears it, all groups back', shown().length === wantTiles.length && evalJs(S, `(() => JSON.stringify(document.querySelector('[data-am="search"]').value))()`) === '', String(shown().length));
  // A click on a tile: its default place, one undo.
  const added = evalJs(S, `(() => { const s = fe.model.sections[1], n = s.blocks.length; document.querySelector('button[data-add="Quote"]').click(); const b = fe.model.sections[1].blocks.at(-1); const r = [fe.model.sections[1].blocks.length - n, b.layout.desktop.area.join('/'), b.label]; fe.undo(); return JSON.stringify([...r, fe.model.sections[1].blocks.length - n]); })()`);
  add('A tile adds its block, one undo', added.join() === '1,1/2/7/8,Quote,0', added.join());
  // Every type's default size, on an empty section.
  const sizes = evalJs(S, `(() => { const m = JSON.parse(JSON.stringify(fe.model)); m.sections = [{ ...m.sections[0], blocks: [] }]; fe.load(m); const sid = fe.model.sections[0].id, out = {}; for (const n of ${JSON.stringify(Object.keys(U.sizes))}) { fe.addBlock(sid, n); const b = fe.model.sections[0].blocks.at(-1), a = b.layout.desktop.area; out[n] = [a[3] - a[1], a[2] - a[0], a[0], a[1]]; fe.model.sections[0].blocks = []; } return JSON.stringify(out); })()`);
  add('Every type lands at its size, row 1, column 2', Object.entries(U.sizes).every(([n, wh]) => near(sizes[n], [...wh, 1, 2])), JSON.stringify(Object.entries(U.sizes).filter(([n, wh]) => !near(sizes[n], [...wh, 1, 2])).map(([n]) => [n, sizes[n]])));
  // A new block on phones (CAP-PHONE.json, new line): after the block in the same row, the rest move down.
  const CP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PHONE.json', import.meta.url))).reads;
  const ph = evalJs(S, `(() => { const m = JSON.parse(JSON.stringify(fe.model)); const pad = (id, d, p) => ({ id, type: 'shape', fill: '#fff', radius: '0', layout: { desktop: { area: d.split('/').map(Number), z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: p.split('/').map(Number), z: 1, justify: 'flex-start', align: 'flex-start' } } }); m.sections = [{ ...m.sections[0], rows: { desktop: 11, mobile: 10 }, blocks: ${JSON.stringify(CP['before add'].areas)}.map(([d, p], n) => pad('b' + n, d, p)) }]; fe.load(m); const sid = fe.model.sections[0].id; fe.addBlock(sid, 'Line'); const s = fe.model.sections[0]; return JSON.stringify({ line: s.blocks.at(-1).layout, rest: s.blocks.slice(0, 3).map((b) => b.layout.mobile.area.join('/')), rows: s.rows.mobile }); })()`);
  add('A new Line on phones', ph.line.desktop.area.join('/') === CP['new line desktop'].block.desktop && ph.line.mobile.area.join('/') === CP['new line phone'].block.mobile && ph.rows === 11 && ph.rest.join() === '1/2/3/10,4/2/6/10,6/2/12/10', JSON.stringify(ph));
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
}

// U10: a blank section, phones, and the picker's views.
{
  const near = (got, want, tol = 1) => Array.isArray(got) && got.length === want.length && got.every((v, n) => Math.abs(v - want[n]) <= tol);
  const AV = JSON.parse(readFileSync(new URL('../parity/findings/CAP-ADDSECTIONVIEWS.json', import.meta.url))), BS = JSON.parse(readFileSync(new URL('../parity/findings/CAP-BLANKSECTION.json', import.meta.url))).reads, PH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PHONE.json', import.meta.url))).reads['phone hovered section'];
  goto(S, `${BASE}/index.html`); await pause(1500);
  const hoverSec = async (n, setTop) => { const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, sec = d.querySelectorAll('.page-section')[${n}]; ${setTop === undefined ? 'sec.scrollIntoView();' : `d.documentElement.scrollTop += sec.getBoundingClientRect().top - ${setTop};`} const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width / 2, o.top + Math.max(r.top, 0) + 200]); })()`); mouse(S, 'move', p[0] + 3, p[1] + 3); await pause(80); mouse(S, 'move', p[0], p[1]); await pause(400); };
  const clickAt = async (x, y) => { mouse(S, 'move', x, y); await pause(40); mouse(S, 'down', x, y, { buttons: 1 }); await pause(30); mouse(S, 'up', x, y); await pause(200); };
  await hoverSec(2);
  const below = evalJs(S, `(() => { const r = document.querySelector('[data-sc="add-section-below"]').getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`);
  await clickAt(below[0], below[1]);
  const views = () => evalJs(S, `(() => { const D = document.querySelector('.as-dialog').getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - D.left, r.top - D.top, r.width, r.height]; }; return JSON.stringify({ btn: [...document.querySelectorAll('.as-view')].map(rel), on: [...document.querySelectorAll('.as-view')].map((b) => [b.getAttribute('aria-checked'), getComputedStyle(b).backgroundColor]), tile: [...document.querySelectorAll('.as-tile')].map(rel), terms: document.querySelector('.as-terms').textContent }); })()`);
  let v = views();
  const VW = AV.views, onAt = (k) => v.on.map((x, n) => (n === k ? x[0] === 'true' && x[1] === VW.onBackground : x[0] === 'false' && x[1] === 'rgba(0, 0, 0, 0)')).every(Boolean);
  add('Add a Section: three view buttons, Medium on', near(v.btn.flat(), VW.boxes.flat()) && onAt(1), JSON.stringify(v.btn));
  add('Add a Section: AI Terms apply', v.terms === AV.aiTerms.text, v.terms);
  const left = (name) => VW.grid[name].lefts.map((x) => x + VW.grid.frameInDialog[0]);
  const colsRead = () => [...new Set(v.tile.map((t) => t[0]))].sort((a, b) => a - b);
  add('View Medium: two columns of 414', near(colsRead(), left('medium')) && near([v.tile[0][2], v.tile[0][1]], [VW.grid.medium.width, VW.grid.frameInDialog[1]]), JSON.stringify(v.tile[0]));
  for (const [name, k] of [['small', 0], ['large', 2], ['medium', 1]]) {
    const b = evalJs(S, `(() => { const r = document.querySelector('[data-as-view="${name}"]').getBoundingClientRect(); return JSON.stringify([r.left + 18, r.top + 18]); })()`);
    await clickAt(b[0], b[1]); v = views();
    add(`View ${name}: its button, its columns`, onAt(k) && near(v.tile[0].slice(2, 3), [VW.grid[name].width]) && near(colsRead().slice(0, VW.grid[name].lefts.length), left(name)), JSON.stringify([colsRead(), v.tile[0]]));
  }
  // Add Blank, then both layouts.
  evalJs(S, `(() => { document.querySelector('[data-as="blank"]').click(); return 'true'; })()`); await pause(400);
  const grid = (n) => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, sec = d.querySelectorAll('.page-section')[${n}], fe = sec.querySelector('.fluid-engine'), c = fe.ownerDocument.defaultView.getComputedStyle(fe); return JSON.stringify({ rows: c.gridTemplateRows.split(' ').map(parseFloat), gap: c.rowGap, h: sec.getBoundingClientRect().height }); })()`);
  let g = grid(3);
  add('Blank on desktop: 8 rows of 30.1', g.rows.length === 8 && Math.abs(g.rows[0] - 30.1) < 0.2 && g.gap === BS.added.section.rowGap && near([g.h], [BS.added.section.box[3]]), JSON.stringify(g));
  evalJs(S, `(() => { fe.select(null); fe.setBp('mobile'); return 'true'; })()`); await pause(400);
  g = grid(3);
  add('Blank on phones: 2 rows of 24', g.rows.length === 2 && near(g.rows, [24, 24], 0.2) && g.gap === BS.phone.section.rowGap && near([g.h], [BS.phone.section.box[3]]), JSON.stringify(g));
  // Every section on phones, the section 0 bottom among them (ours 995 against 992 in an older reading).
  const phoneH = evalJs(S, `(() => JSON.stringify([...document.getElementById('site-frame').contentDocument.querySelectorAll('.page-section')].map((e) => e.getBoundingClientRect().height)))()`);
  add('Phone: all nine section heights', near(phoneH, BS.phone.sel.map((x) => x.box[3])), JSON.stringify(phoneH));
  // The hovered section on phones, relative to its top (CAP-PHONE.json).
  await hoverSec(2, PH.section.box[1]);
  const box = (sel) => evalJs(S, `(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getBoundingClientRect().width > 0); if (!e) return JSON.stringify(null); const r = e.getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height]); })()`);
  const controls = PH.controls.filter((c) => c.box[1] > 55), secTop = 55 + PH.section.box[1];
  const want = (label, nth = 0) => controls.filter((c) => c.label === label)[nth].box;
  const secNow = evalJs(S, `(() => { const f = document.getElementById('site-frame'), r = f.contentDocument.querySelectorAll('.page-section')[2].getBoundingClientRect(); return JSON.stringify(f.getBoundingClientRect().top + r.top); })()`);
  const same = (name, sel, w, tol = 2) => { const b = box(sel); add(`Phone section: ${name}`, !!b && near([b[0], b[1] - secNow, b[2], b[3]], [w[0], w[1] - secTop, w[2], w[3]], tol), JSON.stringify([b, secNow, w, secTop])); };
  same('Add Section at the top', '[data-sc="add-section-above"]', want('Add Section', 0));
  same('Add Section at the bottom', '[data-sc="add-section-below"]', want('Add Section', 1));
  same('Layers', '[data-sc="layers"]', want('Open Layers Panel'));
  same('Edit Section', '[data-sc="edit"]', want('Open Section Settings'));
  same('Duplicate', '[data-sc="duplicate"]', want('Duplicate Section'));
  same('Save', '[data-sc="save"]', want('Save Section'));
  same('Move Up', '[data-sc="up"]', want('Move Section Up'));
  same('Move Down', '[data-sc="down"]', want('Move Section Down'));
  same('Remove', '[data-sc="remove"]', want('Remove Section'));
  const labels = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-chrome [aria-label]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute('aria-label'))))()`);
  add('Phone section: no Add Block, no View Layouts', !labels.includes('Add Block') && !labels.includes('View Layouts'), labels.join());
  evalJs(S, `(() => { fe.setBp('desktop'); localStorage.clear(); return 'true'; })()`);
}

// P5: divider shapes and sizes, color, custom thickness, Video, Art and Edit Color Theme.
{
  const near = (got, want, tol = 1) => Array.isArray(got) && got.length === want.length && got.every((v, n) => Math.abs(v - want[n]) <= tol);
  const D = JSON.parse(readFileSync(new URL('../parity/findings/CAP-DIVSHAPES.json', import.meta.url)));
  goto(S, `${BASE}/index.html`); await pause(1500);
  const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, sec = d.querySelectorAll('.page-section')[2]; sec.scrollIntoView(); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width / 2, o.top + r.top + 60]); })()`);
  mouse(S, 'move', p[0], p[1]); await pause(400);
  evalJs(S, `(() => { document.querySelector('[data-sc="edit"]').click(); return 'true'; })()`); await pause(300);
  const press = async (sel) => { const ok = evalJs(S, `(() => { const e = document.querySelector(${JSON.stringify(`#section-panel ${sel}`)}); if (!e) return 'false'; e.click(); return 'true'; })()`); await pause(120); return ok; };
  const setVal = async (sel, v) => { evalJs(S, `(() => { const e = document.querySelector(${JSON.stringify(`#section-panel ${sel}`)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(120); };
  // Our edge, as drawn: the stroke's points plus its shift, against the oracle's heights along the section.
  const drawn = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[2], v = sec.querySelector('.section-divider-stroke'), a = v.querySelector('path'), W = sec.getBoundingClientRect().width; const m = /translateX\\((-?[0-9.]+)px\\)/.exec(v.getAttribute('style') || ''); return JSON.stringify({ pts: a.getAttribute('d').slice(1).split(' L').map((q) => q.split(' ').map(Number)), shift: m ? Number(m[1]) / W : 0, band: parseFloat(f.contentWindow.getComputedStyle(sec).paddingBottom), sw: a.style.strokeWidth, stroke: f.contentWindow.getComputedStyle(a).stroke }); })()`);
  const at = (g, t) => { for (let i = 0; i < g.pts.length - 1; i++) { const a = g.pts[i][0] + g.shift, b = g.pts[i + 1][0] + g.shift; if (a <= t && t <= b && b > a) return g.pts[i][1] + ((g.pts[i + 1][1] - g.pts[i][1]) * (t - a)) / (b - a); } return null; };
  // Worst difference in px; near a corner or a jump a reading may be a step to either side.
  const worst = (g, ys) => { let w = 0; ys.forEach((y, n) => { if (y == null) return; const here = [0, -0.002, -0.001, 0.001, 0.002].map((d) => at(g, n / 80 + d)).filter((v) => v != null); if (here.length) w = Math.max(w, Math.min(...here.map((v) => Math.abs(v - y))) * g.band); }); return +w.toFixed(2); };
  await press('input[data-act="divider"]');
  await press('[data-sact="view"][data-v="shape"]');
  const labels = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel .sp-shape-tile')].map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label'), r.width, r.height]; })))()`);
  add('Divider: eight shape tiles of 60 by 50', JSON.stringify(labels.map((v) => v[0])) === JSON.stringify(D.shapes.names) && labels.every((v) => v[1] === 60 && v[2] === 50), JSON.stringify(labels));
  const rows = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel .sp-label')].map((e) => e.textContent)))()`);
  const flips = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel .sp-flip')].map((e) => e.getAttribute('aria-label'))))()`);
  for (const name of D.shapes.names) {
    await press(`[aria-label="${name}"]`);
    add(`Divider: ${name} rows`, JSON.stringify(rows()) === JSON.stringify(D.shapes.rows[name].labels) && JSON.stringify(flips()) === JSON.stringify(D.shapes.rows[name].btn), JSON.stringify([rows(), flips()]));
  }
  await press('[aria-label="Wavy Shape"]');
  for (const k of ['S', 'M', 'L']) { await press(`[data-sact="dividerHeight"][data-v="${k}"]`); add(`Divider: Height ${k} band`, Math.abs(drawn().band - D.sizes.bands1600[k]) <= 0.5, String(drawn().band)); }
  await press('[data-sact="dividerHeight"][data-v="M"]');
  for (const k of ['S', 'M', 'L']) { await press(`[data-sact="dividerWidth"][data-v="${k}"]`); const w = worst(drawn(), D.widthEdges[k]); add(`Divider: Width ${k} edge within 2px`, w <= 2, String(w)); }
  await press('[data-sact="dividerFlip"]');
  { const w = worst(drawn(), D.flipX.wavy); add('Divider: Flip X edge within 2px', w <= 2, String(w)); }
  await press('[data-sact="dividerFlip"]');
  // The case read on every flip: width 40vw, height 10vw, alignment 300px.
  await press('[data-sact="dividerWidth"][data-v="more"]'); await setVal('input[type="range"][data-act="dividerWidth"]', 40);
  await press('[data-sact="dividerHeight"][data-v="more"]'); await setVal('input[type="range"][data-act="dividerHeight"]', 10);
  await setVal('.sp-align-slide', 300);
  for (const [name, key, flipsOn] of [['Slanted Shape', 'slanted', []], ['Slanted Shape', 'slantedY', ['dividerFlipY']], ['Scalloped Shape', 'scalloped', []], ['Scalloped Shape', 'scallopedY', ['dividerFlipY']], ['Scalloped Shape', 'scallopedYX', ['dividerFlipY', 'dividerFlip']], ['Jagged Shape', 'jagged', []], ['Jagged Shape', 'jaggedY', ['dividerFlipY']], ['Jagged Shape', 'jaggedYX', ['dividerFlipY', 'dividerFlip']], ['Rounded Shape', 'rounded', []]]) {
    await press(`[aria-label="${name}"]`);
    for (const f of flipsOn) await press(`[data-sact="${f}"]`);
    const w = worst(drawn(), D.cases[key].ys);
    add(`Divider: ${key} at 40vw, 10vw, 300px within 2px`, w <= 2, String(w));
    for (const f of flipsOn) await press(`[data-sact="${f}"]`);
  }
  await press('[aria-label="Wavy Shape"]');
  await press('.sp-subback');
  await press('[data-sact="dividerThickness"][data-v="more"]'); await setVal('input[type="range"][data-act="dividerThickness"]', 22);
  add('Divider: custom thickness 22px', drawn().sw === D.thickness.at22, drawn().sw);
  await press('[data-sact="dividerThickness"][data-v="M"]');
  await press('[data-sp-color="divider"]');
  const swatches = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#shape-pop input[aria-label^="Color "]')].map((e) => e.getAttribute('aria-label').slice(6))))()`);
  add('Divider: Color has the five swatches', JSON.stringify(swatches) === JSON.stringify(D.color.swatches), JSON.stringify(swatches));
  evalJs(S, `(() => { document.querySelector('#shape-pop input[aria-label="Color #FFCF5A"]').click(); return 'true'; })()`); await pause(150);
  add('Divider: Color picks the stroke', drawn().stroke === D.color.pick, drawn().stroke);
  evalJs(S, `(() => { document.querySelector('#shape-pop [data-color-reset]').click(); return 'true'; })()`); await pause(150);
  add('Divider: Reset to theme', drawn().stroke === D.color.reset, drawn().stroke);
  evalJs(S, `(() => { document.querySelector('[data-sp-color="divider"]').click(); return 'true'; })()`); await pause(100);
  await press('[data-sact="tab"][data-v="Background"]');
  await press('[data-sact="bgKind"][data-v="Video"]');
  add('Video: Add a Video card', evalJs(S, `(() => JSON.stringify(document.querySelector('#section-panel [data-sbg="addVideo"]')?.textContent || ''))()`) === 'Add a Video1 minute max');
  await press('[data-sact="filterOpen"]');
  const opts = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel [role="option"]')].map((e) => e.textContent)))()`);
  add('Video: the eight filters', JSON.stringify(opts) === JSON.stringify(D.video.filters), JSON.stringify(opts));
  await press('[data-sact="bgFilter"][data-v="Blur"]');
  const str = evalJs(S, `(() => { const e = document.querySelector('#section-panel input[aria-label="Filter strength"]'); return JSON.stringify(e ? [Number(e.min), Number(e.max)] : []); })()`);
  add('Video: a filter shows strength 0 to 100', JSON.stringify(str) === JSON.stringify(D.video.strength), JSON.stringify(str));
  const speed = () => evalJs(S, `(() => JSON.stringify(document.querySelector('#section-panel .sp-speed').textContent))()`);
  const seen = [speed()];
  for (let k = 0; k < 2; k++) { await press('[aria-label="Increment"]'); seen.push(speed()); }
  for (let k = 0; k < 4; k++) await press('[aria-label="Decrement"]');
  seen.push(speed());
  add('Video: speed steps .5 up to 2, down to .5', seen.join() === '1 x,1.5 x,2 x,0.5 x', seen.join());
  await press('[data-sact="bgKind"][data-v="Art"]');
  const tiles = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel .sp-art-pick')].map((e) => e.getAttribute('aria-label'))))()`);
  add('Art: ten tiles', tiles.length === 10 && tiles[1] === 'Surface' && tiles[9] === 'Isometric' && tiles.filter((n) => n === 'Gradient').length === 2, JSON.stringify(tiles));
  const artRows = async (id, want) => { await press(`[data-sact="art"][data-v="${id}"]`); await press('[data-sact="view"][data-v="art"]'); const got = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#section-panel .sp-art-color')].map((e) => e.getAttribute('aria-label'))))()`); await press('.sp-subback'); return got.every((n) => want.includes(n)) && got.length > 0; };
  add('Art: Surface color rows', await artRows('surface', D.art.tiles.Surface.rows));
  add('Art: Shapes color rows', await artRows('shapes', D.art.tiles.Shapes.rows));
  add('Art: a pick fills the background', evalJs(S, `(() => JSON.stringify(!!document.getElementById('site-frame').contentDocument.querySelectorAll('.page-section')[2].querySelector('.section-background-art')))()`) === true);
  await press('[data-sact="tab"][data-v="Colors"]');
  await press('.sp-theme-editor'); await pause(300);
  const te = evalJs(S, `(() => { const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }; return JSON.stringify({ title: document.querySelector('#site-styles h1')?.textContent, h1: box('#site-styles h1'), reset: box('#site-styles [data-ss-theme-reset]'), back: document.querySelector('#site-styles .ss-back')?.textContent.trim() }); })()`);
  add('Edit Color Theme: title and back', te.title === 'Edit Color Theme' && te.back === 'Colors', JSON.stringify(te));
  add('Edit Color Theme: boxes', near(te.h1, [1302, 88, 276, 28]) && near(te.reset, D.colorThemeEditor.reset[0].slice(3)), JSON.stringify(te));
  evalJs(S, `(() => { document.querySelector('#site-styles .ss-back').click(); return 'true'; })()`); await pause(200);
  add('Edit Color Theme: back to the Colors tab', evalJs(S, `(() => JSON.stringify(document.querySelector('#section-panel .sp-tab.is-on')?.textContent))()`) === 'Colors');
}

// U12: the rows behind Site Styles: Headings, Paragraphs, Spacing, Animations, lists, tip, theme rows.
{
  const near = (got, want, tol = 1) => Array.isArray(got) && got.length === want.length && got.every((v, n) => Math.abs(v - want[n]) <= tol);
  const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-SITESTYLEROWS.json', import.meta.url)));
  const start = async () => { viewport(S, 1600, 1000); goto(S, `${BASE}/index.html`); await pause(1200); await click('#site-styles-toggle'); await pause(300); };
  const click = async (sel) => { const ok = evalJs(S, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'false'; e.click(); return 'true'; })()`); await pause(120); if (ok !== true && ok !== 'true') add(`U12 pressed ${sel}`, false); };
  const go = async (...views) => { for (const v of views) await click(`[data-ss-view="${v}"]`); };
  const setRange = async (label, v) => { evalJs(S, `(() => { const e = [...document.querySelectorAll('#site-styles input[type=range]')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(200); };
  const boxes = (sel) => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll(${JSON.stringify(`#site-styles ${sel}`)})].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })))()`);
  const page = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const c = (s) => { const e = [...d.querySelectorAll(s)].find((x) => x.getBoundingClientRect().width > 0), g = W.getComputedStyle(e); return [g.fontSize, g.lineHeight, g.letterSpacing, Math.round(e.getBoundingClientRect().width)]; }; return JSON.stringify({ h2: c('h2'), p: c('.sqs-html-content p, p'), title: c('.header-title'), nav: c('.header-nav-item') }); })()`);
  const sameText = (got, want) => got.slice(0, 3).every((v, n) => v === want[n] || Math.abs(parseFloat(v) - parseFloat(want[n])) <= 0.02);
  const inputs = (rows) => rows.filter((r) => r[0] === 'INPUT' && r[3].startsWith('range')).map((r) => r.slice(4));

  // Where the rows go.
  await start(); await go('Fonts', 'Headings');
  add('Headings: back says Fonts, title', evalJs(S, `(() => document.querySelector('#site-styles .ss-back').textContent + '|' + document.querySelector('#site-styles .ss-title').textContent)()`) === 'Fonts|Headings');
  add('Headings: sliders on the measured boxes', near(boxes('input[type=range]').flat(), inputs(R.headings).flat()), JSON.stringify(boxes('input[type=range]')));
  add('Headings: slider limits and values', evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#site-styles input[type=range]')].map((e) => [e.value, e.min, e.max, e.step].join('|'))))()`).join() === R.headings.filter((r) => r[0] === 'INPUT' && r[3].startsWith('range')).map((r) => `${r[2]}|${r[3].split('|').slice(1).join('|')}`).join());
  await click('[data-ss-select="type.h.weight"]');
  add('Weight list: nine options on the measured boxes, current over its row', near(boxes('.ss-option').flat(), R.options.Weight.map((o) => o.slice(1)).flat()), JSON.stringify(boxes('.ss-option')));
  await click('.ss-option[data-v="700"]');
  add('Weight: a pick sets the headings', String(evalJs(S, `(() => document.getElementById('site-frame').contentWindow.getComputedStyle(document.getElementById('site-frame').contentDocument.querySelector('h2')).fontWeight)()`)) === '700');
  await click('[data-ss-select="type.h.tt"]');
  add('Text Transform list on the measured boxes', near(boxes('.ss-option').flat(), R.options['Text'].map((o) => o.slice(1)).flat()), JSON.stringify(boxes('.ss-option')));
  await click('.ss-back');
  add('back goes to Fonts', evalJs(S, `(() => document.querySelector('#site-styles .ss-title').textContent)()`) === 'Fonts');

  // Each slider does what it did on the oracle: size, line height, letter spacing.
  for (const [view, label, key] of [['Headings', 'Line Height', 'H Line Height'], ['Headings', 'Letter Spacing', 'H Letter Spacing'], ['Headings', 'Heading 2', 'H Heading 2'], ['Paragraphs', 'Line Height', 'P Line Height'], ['Paragraphs', 'Letter Spacing', 'P Letter Spacing'], ['Paragraphs', 'Paragraph 2', 'P Paragraph 2']]) {
    await start(); await go('Fonts', view);
    await setRange(label, R.effects[key].set);
    const got = page(), want = R.effects[key].page;
    add(`${key}: headings, title and menu as on the oracle`, sameText(got.h2, want.h2) && sameText(got.title, want.title) && sameText(got.p, want.p) && sameText(got.nav, want.nav), `${JSON.stringify(got)} oracle ${JSON.stringify(want)}`);
  }
  await start(); await go('Fonts', 'Headings');
  const before = page();
  await setRange('Line Height', 2);
  evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(200);
  add('a slider is one undo step', JSON.stringify(page()) === JSON.stringify(before), JSON.stringify(page()));

  // Spacing.
  await start(); await go('Miscellaneous', 'Spacing');
  add('Spacing: sliders on the measured boxes', near(boxes('input[type=range]').flat(), inputs(R.spacing).flat()), JSON.stringify(boxes('input[type=range]')));
  const w0 = page();
  await setRange('Page Width (Max)', R.effects['Sp Page Width (Max)'].set);
  add('Page Width: no change at this window', page().h2[3] === w0.h2[3], JSON.stringify(page()));
  await setRange('Page Width (Max)', 1400);
  await setRange('Site Margin', R.effects['Sp Site Margin'].set);
  const ratio = page().h2[3] / w0.h2[3], oracleRatio = R.effects['Sp Site Margin'].page.h2[3] / R.base.h2[3];
  add('Site Margin: a block narrows as on the oracle', Math.abs(ratio - oracleRatio) <= 0.01, `${ratio} oracle ${oracleRatio}`);

  // Animations.
  await click('.ss-back'); await go('Animations');
  add('Animations: no Speed at None', boxes('.ss-speed').length === 0);
  await click('input[data-v="Fade"]');
  const an = R.animationsAfterFade, inp = an.filter((r) => r[0] === 'INPUT').map((r) => r.slice(4));
  add('Animations: choices on the measured boxes', near(boxes('.ss-radio input').flat(), inp.flat()), JSON.stringify(boxes('.ss-radio input')));
  add('Animations: Speed after a style, Medium on', near(boxes('.ss-speed').flat(), [1304, 560, 90.7, 32, 1394.7, 560, 90.7, 32, 1485.3, 560, 90.7, 32]) && evalJs(S, `(() => document.querySelector('.ss-speed.is-on').textContent)()`) === 'Medium', JSON.stringify(boxes('.ss-speed')));
  await click('.ss-speed[data-v="Fast"]');
  add('Animations: the style and speed are kept', evalJs(S, `(() => JSON.stringify(fe.model.siteStyles.anim))()`).style === 'Fade' && evalJs(S, `(() => JSON.stringify(fe.model.siteStyles.anim))()`).speed === 'Fast');

  // Colors: the tip and a theme's rows.
  await start(); await go('Colors'); await click('[data-ss-help]');
  add('Colors help: the words and box', near(boxes('.ss-tip')[0], R.tip.box) && evalJs(S, `(() => document.querySelector('.ss-tip').textContent)()`) === R.tip.text, JSON.stringify(boxes('.ss-tip')));
  await click('[data-ss-help]'); await click('[data-ss-theme="Lightest 1"]');
  const ct = R.colorTheme, wantRows = Object.values(ct.groups).flatMap((g) => g[1]);
  add('Edit Color Theme: Aa row and named rows', near(boxes('.ss-tr-now')[0], ct.aa) && evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('.ss-theme-row')].map((e) => e.textContent)))()`).join() === wantRows.join() && near(boxes('.ss-theme-row')[0].slice(1, 2), [ct.firstRow]), JSON.stringify(boxes('.ss-tr-now')));
  add('Edit Color Theme: group heads', near(boxes('.ss-theme-h').map((b) => b[1]), Object.values(ct.groups).map((g) => g[0])), JSON.stringify(boxes('.ss-theme-h')));
  await click('.ss-back');
  add('back goes to Colors', evalJs(S, `(() => document.querySelector('#site-styles .ss-title').textContent)()`) === 'Colors');

  // The list panels.
  const L = R.lists;
  await go('EditPalette');
  add('Edit Palette: swatches, map and tabs', near(boxes('.ss-swatch').flat(), L.EditPalette.swatches.map((s) => s.slice(1)).flat()) && near(boxes('.ss-map')[0], L.EditPalette.map) && near(boxes('.ss-tab').map((b) => b[1]), L.EditPalette.tabs.map((t) => t[2])) && near(boxes('.ss-pal-row')[0], L.EditPalette.row), JSON.stringify(boxes('.ss-swatch')));
  add('Edit Palette: colors named', evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('.ss-swatch')].map((e) => e.getAttribute('aria-label'))))()`).join() === L.EditPalette.swatches.map((s) => s[0]).join());
  const palId = evalJs(S, `(() => { const e = document.querySelectorAll('.ss-pal-row')[1]; e.click(); return e.dataset.v; })()`); await pause(150);
  add('Edit Palette: a preset is a pick', evalJs(S, `(() => fe.model.siteStyles?.palette)()`) === palId, palId);
  await start(); await go('Fonts', 'FontPacks');
  const fp = boxes('.ss-pack');
  add('Font Packs: tiles', near(fp[0], L.FontPacks.tile) && Math.abs(fp[1][1] - fp[0][1] - L.FontPacks.pitch) <= 1, JSON.stringify(fp[0]));
  add('Font Packs: tabs', near(boxes('.ss-tab').map((b) => b[2]), L.FontPacks.tabs.map((t) => t[3]), 3), JSON.stringify(boxes('.ss-tab')));
  await click('.ss-pack[data-v="manrope"]');
  add('Font Packs: a tile is a pick', evalJs(S, `(() => JSON.stringify(fe.model.siteStyles.font))()`) === 'manrope' && /Manrope/.test(evalJs(S, `(() => document.getElementById('site-frame').contentWindow.getComputedStyle(document.getElementById('site-frame').contentDocument.querySelector('h2')).fontFamily)()`)));
  await click('.ss-back'); await click('.ss-back'); await go('Buttons', 'ButtonPacks');
  const bp = boxes('.ss-pack');
  add('Button Packs: tiles', near(bp[0], L.ButtonPacks.tile) && Math.abs(bp[1][1] - bp[0][1] - L.ButtonPacks.pitch) <= 1, JSON.stringify(bp[0]));
  await click('.ss-back'); await click('.ss-back'); await go('Forms', 'FormPacks');
  const fm = boxes('.ss-pack');
  add('Form Packs: tiles', near(fm[0], L.FormPacks.tile) && Math.abs(fm[1][1] - fm[0][1] - L.FormPacks.pitch) <= 1, JSON.stringify(fm[0]));

  // Base Size stops where the oracle does (parity/findings/CAP-BASESIZE.json).
  await click('.ss-back'); await click('.ss-back'); await go('Fonts');
  const typeBase = async (v) => { evalJs(S, `(() => { const e = document.querySelector('.ss-base-in'); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(150); return evalJs(S, `(() => document.querySelector('.ss-base-in').value)()`); };
  add('Base Size: 1 gives 12, 999 gives 24', String(await typeBase(1)) === '12' && String(await typeBase(999)) === '24');
  await start();
  viewport(S, 1600, 1000);
}

console.log(`Marks: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/marks-check.json', import.meta.url), `${JSON.stringify({ pass, total, fails }, null, 2)}\n`);
if (pass !== total) process.exit(1);
