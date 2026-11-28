// T12: a new Scrolling block's Design rows replayed from the oracle's rows walk (CAP-ROWSSCROLLING2.json; CAP-ROWSSCROLLING.json
// read alike): Wave Intensity to 150, Text Style to Paragraph, Medium and Large each and back to Small, Item Spacing 0.6em.
// After each: the block's area, the section's rows and the first two words' boxes (left and width); then each Cmd+Z goes back
// one step to the new block. Presses are real mouse input. Writes parity/scrolling-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run scrolling-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, moves as heldMoves, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { blockRows } from './scrolling-blocks.mjs';
import { followRows } from './scrolling-follow.mjs';
import { viewRows } from './scrolling-views.mjs';
import { dragRows } from './scrolling-drag.mjs';
import { keyRows } from './scrolling-keys.mjs';
import { pauseRows } from './scrolling-pause.mjs';
import { fallRows } from './scrolling-falls.mjs';
import { belowRows } from './scrolling-below.mjs';
import { jumpRows } from './scrolling-jumps.mjs';
import { refitRows } from './scrolling-refit.mjs';
import { layoutRows } from './scrolling-layouts.mjs';

if (!process.env.FLUID_SURFACE) throw new Error('set FLUID_SURFACE');
const S = process.env.FLUID_SURFACE;
const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-ROWSSCROLLING2.json', import.meta.url))).tabs.Design.rows;
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(40)} ${ok ? 'match' : `DIFF ${detail}`}`); };
// The read's "area a > b", "section rows a > b" and word boxes for a row, by its press name.
const changeOf = (name) => {
  const ch = R.find((r) => r.name === name && r.change).change, two = (p) => ch.find((c) => c.startsWith(p))?.split(' > ');
  const words = ch.filter((c) => /^(H1|P)\.Marquee-item b:/.test(c)).map((c) => c.replace(/^.*b: /, '').split(' > ').map((s) => s.split(',').map(Number)));
  return { area: two('area ')?.map((s) => s.replace('area ', '').replace(/ /g, '')), rows: two('section rows ')?.map((s) => Number(s.replace('section rows ', ''))), words };
};

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);
const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); ${body} })()`);
// The Chrome this check needs: scrollbars that take no width. A headless Chrome 158 started without --hide-scrollbars=false
// draws 15 px bars; once the Large line makes the page taller than the frame, the frame's bar moves the centred page 7.5 px
// left and 'Large: first word' reads 92.6 against the oracle's 100.1 (task-c7154f23e7531b13). scripts/headless.mjs starts
// Chrome with that flag, but it uses any Chrome already up on the port.
const bar = qs(`const t = document.createElement('div'); t.style.cssText = 'position:absolute;left:0;top:0;width:100px;height:50px;overflow:scroll'; document.body.append(t); const w = t.offsetWidth - t.clientWidth; t.remove(); return JSON.stringify(w);`);
if (bar !== 0) throw new Error(`scrolling-check needs a Chrome whose scrollbars take no width; this one's take ${bar} px. Start it with scripts/headless.mjs (--hide-scrollbars=false) on a free port.`);
// The oracle's probe: one section of 8 rows, the new block at its top.
const sid = qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 8 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const b = fe.model.sections[0].blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(400); return JSON.stringify(s.id);`);
const at = (sel, fx = 0.5) => qs(`const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getBoundingClientRect().width > 0); if (!e) return 'null'; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${fx}, r.top + r.height / 2]);`);
const press = async (sel, fx) => { const p = at(sel, fx); if (!p) return false; mouse(S, 'move', p[0], p[1]); await pause(60); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(40); mouse(S, 'up', p[0], p[1]); await pause(400); return true; };
const state = () => qs(`const s = fe.model.sections[0], b = s.blocks[0]; if (!b) return JSON.stringify({ area: null, rows: s.rows.desktop }); const d = document.getElementById('site-frame').contentDocument; return JSON.stringify({ area: b.layout.desktop.area.join('/'), rows: s.rows.desktop, words: [...d.querySelectorAll('#block-' + b.id + ' .marquee-item')].map((x) => { const q = x.getBoundingClientRect(); return [q.left, q.width]; }) });`);
const near = (a, b, d = 1) => Math.abs(a - b) <= d;
const seen = [state()];
const expect = (what, name, k = 1) => {
  const c = changeOf(name), now = state();
  seen.push(now);
  if (c.area) add(`${what}: area`, now.area === c.area[k], `${now.area} (oracle ${c.area[k]})`);
  if (c.rows) add(`${what}: section rows`, now.rows === c.rows[k], `${now.rows} (oracle ${c.rows[k]})`);
  if (c.words.length) { const w = c.words[0][k]; add(`${what}: first word`, !!now.words?.[0] && near(now.words[0][0], w[0]) && near(now.words[0][1], w[2]), `${JSON.stringify(now.words?.[0])} (oracle ${w[0]},${w[2]})`); }
  return now;
};

if (!(await press('#block-panel [data-btab="Design"]'))) add('Design tab', false, 'not found');
// Wave Intensity: the walk pressed its range at 150 of 180.
await press('#block-panel [data-scr-range="wave"]', 150 / 180);
expect('Wave Intensity 150', 'Wave Intensity');
await press('#block-panel [data-acc-menu="scrollStyle"]');
await press('#shape-pop [data-acc-opt="paragraph"]');
const para = state(); seen.push(para);
add('Paragraph: words', !!para.words && near(para.words[0][1], 104.5) && near(para.words[1][0], 216.8), JSON.stringify(para.words));
await press('#block-panel [aria-label="Medium text size"]'); expect('Medium', 'Medium text size');
await press('#block-panel [aria-label="Small text size"]'); expect('Small from Medium', 'Medium text size', 0);
await press('#block-panel [aria-label="Large text size"]'); expect('Large', 'Large text size');
await press('#block-panel [aria-label="Small text size"]'); expect('Small from Large', 'Large text size', 0);
qs(`const f = document.querySelector('#block-panel input[data-scr-field="spacing"]'); f.value = '0.6em'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
const sp = changeOf('Item Spacing').words[0], now = state(); seen.push(now);
add('Item Spacing 0.6em: second word', !!now.words?.[1] && near(now.words[1][0] - para.words[1][0], sp[1][0] - sp[0][0], 0.3), `moved ${now.words?.[1]?.[0] - para.words[1][0]} (oracle ${sp[1][0] - sp[0][0]})`);
// Each change was one step: Cmd+Z walks back through every state seen.
for (let k = seen.length - 2; k >= 0; k--) {
  qs(`fe.undo(); await sleep(250); return 'true';`);
  const u = state(), want = seen[k];
  const words = (x) => (x.words || []).map((w) => w.map((v) => v.toFixed(1)).join(',')).join(' ');
  add(`undo to step ${k}`, u.area === want.area && u.rows === want.rows && words(u) === words(want), `${u.area} ${u.rows} ${words(u)} (want ${want.area} ${want.rows} ${words(want)})`);
}
// A drag: many inputs show on the block as it goes, letting go is one step. A drag that ends where it began fires no
// change, and its let go is still a step: Cmd+Z after it takes back only that (CAP-T12WAVEDRAG.json N), not the Medium
// press before it; a press after it, then another drag, must still undo one step at a time.
const range = at('#block-panel [data-scr-range="wave"]'), w = qs(`return JSON.stringify(document.querySelector('#block-panel [data-scr-range="wave"]').getBoundingClientRect().width);`);
// A drag is one call, its moves 30 ms apart. A node start for each move put 600 to 830 ms between the drag back's 60 and 30
// at its turn (7 moves) under heavy, and a second there is an undo step of its own (DRAG_PAUSE): 'Drag back to start, Cmd+Z,
// drag' then read Medium at 60 after the Cmd+Z, about 1 run in 3 under load (task-b98e2dd0259cb094).
const drag = async (to, back = false) => { const x0 = range[0] - w / 2 + 4, out = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [x0 + (to - 4) * n / 10, range[1]]); heldMoves(S, [[x0, range[1]], ...out, ...(back ? [...out.slice(0, -1).reverse(), [x0, range[1]]] : [])], { gapMs: 30, held: true }); await pause(400); };
const start = state();
await drag(w * 0.75); const dragged = state();
qs(`fe.undo(); await sleep(250); return 'true';`); const dragUndo = state();
add('Wave dragged to 150: one undo step', dragged.area === changeOf('Wave Intensity').area[1] && dragUndo.area === start.area && dragUndo.rows === start.rows, JSON.stringify({ dragged, dragUndo }));
await drag(w * 0.4, true);
await press('#block-panel [aria-label="Medium text size"]'); const medium = state();
await drag(w * 0.75);
qs(`fe.undo(); await sleep(250); return 'true';`); const back = state();
add('Drag back to start, Medium, drag: undo takes one step', back.area === medium.area && back.rows === medium.rows, JSON.stringify({ medium, back }));
await drag(w * 0.4, true);
qs(`fe.undo(); await sleep(250); return 'true';`); const undone = state();
await drag(w * 0.75);
qs(`fe.undo(); await sleep(250); return 'true';`); const back2 = state();
add('Drag back to start, Cmd+Z, drag: undo takes one step', back2.area === undone.area && back2.rows === undone.rows && undone.area === medium.area && undone.rows === medium.rows, JSON.stringify({ medium, undone, back2 }));
// The Content list (CAP-T12SCROLLLIST.json, each read twice on the oracle, real mouse and keys): a fresh block, then
// the oracle's walk. Each row compares the block's words in order and the list's names with what the oracle drew.
qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 8 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const b = fe.model.sections[0].blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(400); return 'true';`);
if (!(await press('#block-panel [data-btab="Content"]'))) add('Content tab', false, 'not found');
const list = () => qs(`const b = fe.model.sections[0].blocks[0], d = document.getElementById('site-frame').contentDocument, p = document.getElementById('block-panel'); if (!b) return JSON.stringify({ drawn: null, names: [], trash: 0, view: false, field: null, focused: false }); return JSON.stringify({ drawn: [...d.querySelectorAll('#block-' + b.id + ' .marquee-item')].map((x) => x.textContent), names: [...p.querySelectorAll('.bp-scr-row .bp-acc-name')].map((x) => x.textContent), trash: p.querySelectorAll('.bp-scr-row .bp-acc-trash:not([disabled])').length, view: !!p.querySelector('.bp-scr-text'), field: p.querySelector('.bp-scr-text')?.value ?? null, focused: document.activeElement === p.querySelector('.bp-scr-text') });`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lists = [list()];
const want = (what, drawn, more = {}) => { const now = list(); lists.push(now); const ok = same(now.drawn, drawn) && (more.names === undefined || same(now.names, more.names)) && (more.view === undefined || now.view === more.view) && (more.trash === undefined || now.trash === more.trash) && (more.field === undefined || now.field === more.field); add(what, ok, JSON.stringify(now)); return now; };
const nth = (sel, n) => `#block-panel ${sel}:nth-child(${n})`;
// scroll7-a and scroll6-b: a row opens its view, typing shows on the block at each key with the field focused.
await press(`${nth('.bp-scr-row', 1)} .bp-acc-name`);
want('Item view: Text holds the words', ['Dream it', '〰️'], { view: true, field: 'Dream it' });
await press('#block-panel .bp-scr-text', 0.95); browser(S, 'press', 'End'); await pause(100);
for (const k of 'Zq') { browser(S, 'press', k); await pause(120); }
await pause(300);
const typed = want('Typing Zq: on the block at once', ['Dream itZq', '〰️'], { view: true, field: 'Dream itZq' });
add('Typing Zq: the field keeps the focus', typed.focused, JSON.stringify(typed));
await press('#block-panel [data-scr="back"]');
want('Back: the list, its name follows', ['Dream itZq', '〰️'], { view: false, names: ['Dream itZq', '〰️'] });
// scroll6-a/b: Duplicate puts a copy after the item and goes back to the list.
await press(`${nth('.bp-scr-row', 1)} .bp-acc-name`);
await press('#block-panel [data-scr^="dup:"]');
want('Duplicate: a copy after it, back on the list', ['Dream itZq', 'Dream itZq', '〰️'], { view: false, names: ['Dream itZq', 'Dream itZq', '〰️'] });
// scroll6-b, scroll7-a, scroll5-a: Add Item appends "Dream it", also after a rename, and stays on the list.
await press('#block-panel [data-scr="add"]');
want('Add Item: "Dream it" at the end, still the list', ['Dream itZq', 'Dream itZq', '〰️', 'Dream it'], { view: false });
// scroll6-b, scroll8-a: the trash deletes at once.
await press(`${nth('.bp-scr-row', 3)} .bp-acc-trash`);
want('The trash on 〰️ deletes it', ['Dream itZq', 'Dream itZq', 'Dream it'], { view: false });
// scroll7-a: the view's Delete takes the item and goes back to the list.
await press(`${nth('.bp-scr-row', 3)} .bp-acc-name`);
await press('#block-panel [data-scr^="del:"]');
want('View Delete: gone, back on the list', ['Dream itZq', 'Dream itZq'], { view: false, names: ['Dream itZq', 'Dream itZq'] });
// scroll7-a, scroll8-a: down to one item, whose row has no trash.
await press(`${nth('.bp-scr-row', 1)} .bp-acc-trash`);
want('The last item has no trash', ['Dream itZq'], { trash: 0, names: ['Dream itZq'] });
// scroll7-a's undo walk: each change is one step, the typing too (taken at Back): back through the states each step left.
const stepAt = [0, 3, 4, 5, 6, 7, 8];
for (let k = stepAt.length - 2; k >= 0; k--) {
  qs(`fe.undo(); await sleep(250); return 'true';`);
  const u = list(), w = lists[stepAt[k]];
  add(`list undo to step ${k}`, same(u.drawn, w.drawn), `${JSON.stringify(u.drawn)} (want ${JSON.stringify(w.drawn)})`);
}
// scroll8-a: the grip of row 1 held 80 px down: the block keeps its order while held and takes it when let go; one undo step.
const g = at(`${nth('.bp-scr-row', 1)} .bp-scr-grip`);
if (!g) for (const w of ['Grip held', 'Grip let go', 'Grip: one undo step']) add(w, false, 'no grip');
else {
  mouse(S, 'move', g[0], g[1]); await pause(60); mouse(S, 'down', g[0], g[1], { buttons: 1 }); await pause(60);
  for (let k = 1; k <= 16; k++) { mouse(S, 'move', g[0], g[1] + k * 5, { buttons: 1 }); await pause(30); }
  const held = list();
  add('Grip held: the block keeps its order', same(held.drawn, ['Dream it', '〰️']), JSON.stringify(held));
  mouse(S, 'up', g[0], g[1] + 80); await pause(400);
  want('Grip let go: the block takes the order', ['〰️', 'Dream it'], { names: ['〰️', 'Dream it'] });
  qs(`fe.undo(); await sleep(250); return 'true';`);
  want('Grip: one undo step', ['Dream it', '〰️']);
}
// The moving text (CAP-T12WAVE.json, read twice on the oracle at 1600 by 1000, nothing saved): a fresh block, each Design
// row pressed by the real mouse, then the text path's start offset over 1.5 s by animation frame and the path's points at
// the oracle's lengths, in block coordinates.
const WV = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVE.json', import.meta.url))).runs;
const O2 = WV['scroll2-a'].reads, O3 = WV['scroll3-a'].reads, O4 = WV['scroll4-a'].reads;
const fresh = () => qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 8 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const b = fe.model.sections[0].blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
const wave = (lens = []) => qs(`const b = fe.model.sections[0].blocks[0], d = document.getElementById('site-frame').contentDocument, W = d.defaultView, el = b && d.getElementById('block-' + b.id); const fe0 = el && el.closest('.fe-block'), p = el && el.querySelector('.marquee-path'), tp = el && el.querySelector('textPath'), svg = el && el.querySelector('.marquee-svg'); const disp = el && el.querySelector('.marquee-display'); const mask = disp ? W.getComputedStyle(disp).maskImage : null; if (!p || !tp) return JSON.stringify({ none: true, mask }); const bb = fe0.getBoundingClientRect(), mq = el.querySelector('.marquee').getBoundingClientRect(), ctm = p.getScreenCTM(); const pts = ${JSON.stringify(lens)}.map((s) => { const q = p.getPointAtLength(s), sp = new W.DOMPoint(q.x, q.y).matrixTransform(ctm); return [sp.x - mq.left, sp.y - mq.top]; }); const m = [], t0 = W.performance.now(); await new Promise((res) => { const tick = () => { m.push([W.performance.now() - t0, Number(tp.getAttribute('startOffset'))]); if (W.performance.now() - t0 < 1500) W.requestAnimationFrame(tick); else res(); }; W.requestAnimationFrame(tick); }); let T = 0, D = 0; for (let i = 1; i < m.length; i++) { const dv = m[i][1] - m[i - 1][1]; if (Math.abs(dv) < 50) { T += m[i][0] - m[i - 1][0]; D += dv; } } const fs = parseFloat(W.getComputedStyle(svg).fontSize), gapPx = Number(el.querySelector('.marquee').dataset.spacing) * fs, ws = [...el.querySelectorAll('.marquee-item')].map((e) => Math.round(e.getBoundingClientRect().width)); return JSON.stringify({ set: Math.round(ws.reduce((a, v) => a + v + gapPx, 0) * 10) / 10, block: bb.width, mqTop: mq.top - bb.top, mqH: mq.height, L: p.getTotalLength(), pts, rate: T ? D / T * 1000 : 0, lo: Math.min(...m.map((x) => x[1])), hi: Math.max(...m.map((x) => x[1])), h: parseFloat(svg.style.height), shift: parseFloat(svg.style.transform.slice(11)), xs: [...tp.querySelectorAll('tspan')].slice(0, 4).map((t) => Number(t.getAttribute('x'))), mask });`);
// Points in the line's own box (the oracle's .Marquee, ours .marquee): the block around it snaps to grid rows, a layout matter.
const ptsOff = (o, w) => (o.points && w.pts ? Math.max(...o.points.map((q, k) => Math.hypot(w.pts[k][0] - q[3] + o.marquee[0], w.pts[k][1] - q[4] + o.marquee[1]))) : Infinity);
// The emoji item's width is the system font's (24 on a Mac as on the oracle, 31 on Linux), so the set and the later items are
// checked against this page's own measure spans, and the oracle's numbers only up to the first gap ("Dream it" is the web font;
// its rounded width may land 1 px off at a rounding edge: Linux reads 639.8 for the oracle's 640.8 at Large).
const itemsAt = (w, o) => !w.none && Math.abs(w.xs[0]) <= 0.05 && Math.abs(w.xs[1] - o.tspanX[1]) <= 1.05 && Math.abs(w.xs[2] - w.set) <= 0.15 && (w.xs[3] == null || Math.abs(w.xs[3] - w.set - w.xs[1]) <= 0.15);
const moves = (what, o, tol) => { const w = wave(); add(`${what}: ${o.motion.pxPerS} px/s`, !w.none && Math.abs(w.rate - o.motion.pxPerS) <= tol && w.lo > -w.set - 0.5 && w.hi <= 0, w.none ? 'no text path' : `${w.rate.toFixed(2)} px/s, ${w.lo}..${w.hi}`); };
const drawn = (what, o, pointsFrom = o) => { const w = wave((pointsFrom.points || []).map((q) => q[0])); add(`${what}: path ${o.pathLength} long`, !w.none && Math.abs(w.L - o.pathLength) <= 0.6, w.none ? 'no text path' : `${w.L.toFixed(2)}`); add(`${what}: path points`, !w.none && ptsOff(pointsFrom, w) <= 0.6, w.none ? 'no text path' : `off by ${ptsOff(pointsFrom, w).toFixed(2)}`); add(`${what}: drawing ${o.svgHeight} high, down ${o.svgShift}`, !w.none && Math.abs(w.h - o.svgHeight) <= 0.5 && Math.abs(w.shift - o.svgShift) <= 0.05, w.none ? 'no text path' : `${w.h}, ${w.shift}`); return w; };
await fresh();
if (!(await press('#block-panel [data-btab="Design"]'))) add('Design tab', false, 'not found');
moves('A new block moves left', O4.default, 2);
const w0 = drawn('A new block', O4.default);
add('A new block: items at the rounded widths and gaps', itemsAt(w0, O4.default), `${JSON.stringify(w0.xs)}, set ${w0.set}`);
await press('#block-panel [aria-label="Animation speed 2x"]'); moves('Speed 2x', O2['speed 2x'], 3);
await press('#block-panel [aria-label="Animation speed 0.5x"]'); moves('Speed 0.5x', O2['speed 0.5x'], 1.5);
await press('#block-panel [aria-label="Animation speed 1x"]');
await press('#block-panel [aria-label="Animation direction right"]'); moves('Direction right', O4['direction right b'], 2);
await press('#block-panel [aria-label="Animation speed 0.5x"]'); moves('Right at 0.5x', O4['right 0.5x b'], 1.5);
await press('#block-panel [aria-label="Animation speed 1x"]'); await press('#block-panel [aria-label="Animation direction left"]');
for (const [v, o, pts] of [[30, O4['wave 30 b'], O3['wave 30']], [90, O4['wave 90 b'], O3['wave 90']], [180, O4['wave 180 b'], O4['wave 180 b']], [120, O4['wave 120 b'], O4['wave 120 b']]]) {
  await press('#block-panel [data-scr-range="wave"]', Math.min(0.995, v / 180)); await pause(200);
  drawn(`Wave Intensity ${v}`, o, pts);
}
await press('#block-panel [data-scr-range="wave"]', 0.005); await pause(200);
await press('#block-panel input[aria-label="Fade edges"]');
const fade = wave(); add('Fade edges: the gradient mask', fade.mask === O3['fade on b'].fade, `${fade.mask}`);
await press('#block-panel input[aria-label="Fade edges"]');
const unfade = wave(); add('Fade edges off: no mask', unfade.mask === O3['fade off b'].fade && !unfade.none, `${unfade.mask}`);
// Pause on hover, the mouse on the block: the words still move in the editor.
await press('#block-panel input[aria-label="Pause on hover"]');
const onBlock = qs(`const b = fe.model.sections[0].blocks[0], f = document.getElementById('site-frame'), q = f.contentDocument.getElementById('block-' + b.id).getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + q.left + 200, o.top + q.top + q.height / 2]);`);
mouse(S, 'move', onBlock[0], onBlock[1]); await pause(500);
moves('Pause on hover, the mouse on it, in the editor', O3['pause on b, mouse on block'], 2);
mouse(S, 'move', onBlock[0], onBlock[1] + 400); await pause(200);
await press('#block-panel [aria-label="Medium text size"]'); drawn('Medium', O4['medium b']);
await press('#block-panel [aria-label="Large text size"]');
const big = drawn('Large', O3.large);
add('Large: items at the rounded widths and gaps', itemsAt(big, O3.large), `${JSON.stringify(big.xs)}, set ${big.set}`);
await press('#block-panel [aria-label="Small text size"]');
// The path's end follows the block's width: the phone view and a 1100 window.
qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
const ph = wave(); add(`Phone: path ${O3.phone.pathLength} long at ${O3.phone.block[2]} wide`, !ph.none && Math.abs(ph.L - O3.phone.pathLength) <= 0.6, ph.none ? 'no text path' : `${ph.L.toFixed(2)} at ${ph.block}`);
qs(`fe.setBp('desktop'); await sleep(600); return 'true';`);
viewport(S, 1100, 1000); await pause(1200);
const narrow = wave(); add(`Window 1100: path ${O4['window 1100'].pathLength} long at ${O4['window 1100'].block[2]} wide`, !narrow.none && Math.abs(narrow.L - O4['window 1100'].pathLength) <= 0.6, narrow.none ? 'no text path' : `${narrow.L.toFixed(2)} at ${narrow.block}`);
viewport(S, 1600, 1000); await pause(800);
// A block with text and no items (the imported Home page, a heading a layout turns into Scrolling) draws its text too.
const lone = qs(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[0].blocks[0]; delete b.items; b.text = 'Hello wave'; fe.load(next); await sleep(900); const d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + b.id); const ts = el ? [...el.querySelectorAll('textPath tspan')] : []; const t = el && el.querySelector('.marquee-svg text'); return JSON.stringify({ first: ts[0] ? ts[0].textContent : null, n: ts.length, w: t ? Math.round(t.getBBox().width) : 0 });`);
add('Text and no items: the text rides the path', lone.first === 'Hello wave' && lone.w > 1000, JSON.stringify(lone));
// An emptied first item (its Text cleared): the line keeps its height and the other words stay drawn, as on the old code.
const gap = qs(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[0].blocks[0]; b.items = ['', '〰️']; fe.load(next); await sleep(900); const d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + b.id), svg = el && el.querySelector('.marquee-svg'), t = svg && svg.querySelector('text'); return JSON.stringify({ h: svg ? parseFloat(svg.style.height) : null, w: t ? Math.round(t.getBBox().width) : 0, words: t ? [...t.querySelectorAll('tspan')].slice(0, 2).map((x) => x.textContent) : [] });`);
add('An emptied first item: the line keeps its height, the rest drawn', gap.h === O4.default.svgHeight && gap.w > 1000 && gap.words[1] === '〰️', JSON.stringify(gap));
// Attach link (CAP-T12SCROLLLIST.json scroll9-a, scroll10-a): the link editor opens beside the panel, its field at the
// oracle's distance left of the panel and level with the button; a page pick links the whole block, target _self; the Link
// row shows the page, its path, Edit, Copy and Remove Link. Real presses on a fresh block. Escape, once and twice, leaves the
// editor open with its field focused on /about (CAP-T12LINKESC.json R3, alike with scroll10-a); Undo then closes it and
// keeps the link (CAP-T12LINKUNDO.json A).
const SL = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12SCROLLLIST.json', import.meta.url))).runs;
const LK = SL['scroll10-a'].reads, A9 = SL['scroll9-a'].reads, dx9 = A9.field.box[0] - A9.panel.box[0], dy9 = A9.field.box[1] - A9.attachLink.box[1];
await fresh();
await press('#block-panel [data-btab="Content"]');
const box = (sel) => qs(`const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getBoundingClientRect().width > 0); if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10));`);
const linkOf = () => qs(`const b = fe.model.sections[0].blocks[0], d = document.getElementById('site-frame').contentDocument, el = b && d.getElementById('block-' + b.id), a = el && el.querySelector('a.marquee-hitbox'), fb = el && el.closest('.fe-block'); const ab = a && a.getBoundingClientRect(), bb = fb && fb.getBoundingClientRect(); const row = [...document.querySelectorAll('#block-panel .bp-link-name, #block-panel .bp-link-sub, #block-panel [data-link="edit"]:not(.bp-link-url), #block-panel [data-link="copy"], #block-panel [data-link="remove"], #block-panel [data-link="open"]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()); return JSON.stringify({ href: b?.href ?? null, a: a ? [a.getAttribute('href'), a.getAttribute('target')] : null, covers: !!(ab && bb && Math.abs(ab.width - bb.width) < 1 && ab.height > 0.9 * bb.height), row, editor: !document.getElementById('link-popover').hidden });`);
const attach = box('#block-panel [data-link="open"]'), panel = box('#block-panel');
await press('#block-panel [data-link="open"]'); await pause(300);
const field = box('#link-popover .lk-row');
add('Attach link: the link editor opens', !!field && linkOf().editor, `${field}`);
add(`Attach link: its field ${-dx9} left of the panel, ${dy9} below the button`, !!field && !!panel && !!attach && near(field[0] - panel[0], dx9) && near(field[1] - attach[1], dy9) && near(field[2], A9.field.box[2]) && near(field[3], A9.field.box[3]), `field ${field}, panel ${panel}, button ${attach}`);
await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300);
const ESC = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKESC.json', import.meta.url))).runs.R3.reads;
const escaped = () => qs(`const p = document.getElementById('link-popover'), i = p && p.querySelector('.lk-input'); return JSON.stringify({ open: !!p && !p.hidden && !!i && i.getBoundingClientRect().width > 0, focus: !!i && document.activeElement === i, value: i ? i.value : null });`);
for (const [k, what] of [['R3 A Escape', 'Escape'], ['R3 A Escape again', 'Escape again']]) {
  mouse(S, 'move', 10, 10); browser(S, 'press', 'Escape'); await pause(400);
  const o = ESC[k], w = escaped();
  add(`${what} in the link field: the editor stays open, the field focused on ${o.link.popField[0]}`, w.open && w.focus && w.value === o.link.popField[0] && o.focus[1] === 'INPUT', JSON.stringify(w));
}
// Then Undo, as on the oracle after the two Escapes (CAP-T12LINKUNDO.json A, R1 and R2 alike): it closes the editor and keeps the link.
await press('#undo'); await pause(300);
{ const o = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKUNDO.json', import.meta.url))).runs.R1.reads['R1 A Undo'], w = escaped(), href = qs(`return JSON.stringify(fe.model.sections[0].blocks[0].href ?? null);`);
  add('After the two Escapes, Undo: the editor closes, the link stays', !w.open && o.link.popField === null && href === o.link.a[0], JSON.stringify({ ...w, href })); }
const linked = linkOf(), picked = LK['after About, Escape'].link, after = LK['undo the link'].link;
add('A page pick: the block links to it, target _self', linked.href === picked.href && linked.a?.[0] === picked.href && linked.a?.[1] === picked.target, JSON.stringify(linked));
add('The link covers the whole block', linked.covers, JSON.stringify(linked));
add('The Link row: the page, its path, Edit, Copy, Remove Link', JSON.stringify(linked.row) === JSON.stringify(after.linkRow), JSON.stringify(linked.row));
// With a link over the line, Pause on hover still stops the words under the mouse in Preview (inferred: the oracle's published
// pause needs a Save; its editor doesn't pause, as read).
await press('#block-panel [data-btab="Design"]');
await press('#block-panel input[aria-label="Pause on hover"]');
await press('#preview'); await pause(600);
moves('With a link, Pause on hover in Preview, the mouse off', O4.default, 2);
const onLinked = qs(`const b = fe.model.sections[0].blocks[0], f = document.getElementById('site-frame'), q = f.contentDocument.getElementById('block-' + b.id).getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + q.left + 200, o.top + q.top + q.height / 2]);`);
mouse(S, 'move', onLinked[0], onLinked[1]); await pause(400);
const held = wave(); add('With a link, Pause on hover in Preview: the words stop', !held.none && Math.abs(held.rate) < 1, held.none ? 'no text path' : `${held.rate.toFixed(2)} px/s`);
mouse(S, 'move', onLinked[0], onLinked[1] + 400); await pause(200);
await press('#preview'); await pause(600);
// Preview let go of the block: select it again and open its panel on Content.
qs(`const s = fe.model.sections[0], b = s.blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
await press('#block-panel [data-btab="Content"]');
await press('#block-panel [data-link="remove"]'); await pause(300);
const unlinked = linkOf();
add('Remove Link: no link, Attach link again', unlinked.href === null && unlinked.a === null && JSON.stringify(unlinked.row) === '["Attach link"]', JSON.stringify(unlinked));
// A press on Undo with the link editor still open closes it and keeps the link, Redo off; the next press takes the link
// (CAP-T12LINKUNDO.json B, R1 and R2 alike). Real presses on a fresh block.
{ const LU = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKUNDO.json', import.meta.url))).runs.R1.reads;
  const st = () => qs(`const b = fe.model.sections[0].blocks[0], p = document.getElementById('link-popover'); return JSON.stringify({ href: b?.href ?? null, open: !p.hidden, row: [...document.querySelectorAll('#block-panel [data-link]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.dataset.link), redo: !document.getElementById('redo').disabled });`);
  await fresh(); await press('#block-panel [data-btab="Content"]');
  await press('#block-panel [data-link="open"]'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300);
  const o1 = LU['R1 B Undo'], o2 = LU['R1 B Undo again'], redoOn = (o) => o.undo.find((x) => x[0] === 'Redo')[1] === false;
  await press('#undo'); const u1 = st();
  add('Link editor open, Undo: it closes, the link stays', u1.href === o1.link.a[0] && u1.open === (o1.link.popField !== null) && u1.redo === redoOn(o1) && u1.row.includes('remove'), JSON.stringify(u1));
  await press('#undo'); const u2 = st();
  add('Then Undo again: the link goes, Redo on', u2.href === null && o2.link.a === null && u2.redo === redoOn(o2) && JSON.stringify(u2.row) === '["open"]', JSON.stringify(u2));
  // A press down on Undo let go off it closes the editor with no click; Enter on Undo then is a plain Undo and takes the link
  // (review-752; not read on the oracle, so the want is ours: the flag from that press must not swallow it).
  await fresh(); await press('#block-panel [data-btab="Content"]');
  await press('#block-panel [data-link="open"]'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300);
  const u = at('#undo'); mouse(S, 'move', u[0], u[1]); await pause(60); mouse(S, 'down', u[0], u[1], { buttons: 1 }); await pause(40); const away = at('.bar-left', 0.1); mouse(S, 'move', away[0], away[1], { buttons: 1 }); await pause(40); mouse(S, 'up', away[0], away[1]); await pause(300);
  const off = st(); qs(`document.getElementById('undo').focus(); return 'true';`); browser(S, 'press', 'Enter'); await pause(400); const keyed = st();
  add('Undo pressed and let go off it, then Enter on Undo: the link goes', off.href === '/about' && !off.open && keyed.href === null, JSON.stringify({ off, keyed }));
  // Only a pick in an opening on no link yet: not read on the oracle, so these wants are main's (review-752 round 3). The
  // editor reopened by Edit, the same page or another picked there, or the new-tab box pressed after the pick: Undo undoes.
  // (An arrow key on the field's Clear was the step taken after the pick here; it moves nothing now, CAP-T12LINKKEYS.json.)
  const sn = () => qs(`const b = fe.model.sections[0].blocks[0], p = document.getElementById('link-popover'); return JSON.stringify({ blk: !!b, href: b?.href ?? null, newTab: !!b?.newTab, open: !p.hidden, depth: fe.undoDepth, redo: !document.getElementById('redo').disabled });`);
  const about = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); };
  const reopen = async () => { await about(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="edit"]'); await pause(300); };
  const twice = async () => { await press('#undo'); const a = sn(); await press('#undo'); return [a, sn()]; };
  await reopen(); await press('#link-popover .lk-input'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300);
  const same = [sn(), ...await twice()];
  // The second Undo takes Attach link's own step, so the block stays (CAP-T12LINKZ.json Z9 Undo 2).
  add('Reopened by Edit, About again, Undo: link goes', same[0].open && same[0].href === '/about' && same[1].href === null && !same[1].open && same[1].redo && same[2].blk && same[2].href === null, JSON.stringify(same));
  await reopen(); for (const k of ['Meta+a', 'c', 'o', 'n']) { browser(S, 'press', k); await pause(150); } await pause(300); await press('#link-popover .lk-page[aria-label^="Contact"]'); await pause(300);
  const other = [sn(), ...await twice()];
  add('Reopened by Edit, Contact picked, Undo: About', other[0].open && other[0].href === '/contact' && other[1].href === '/about' && !other[1].open && other[1].redo && other[2].href === null, JSON.stringify(other));
  await about(); await press('#link-popover .lk-newtab'); await pause(300);
  const tab = [sn(), ...await twice()];
  add('Pick, then new tab, Undo: the new tab goes', tab[0].open && tab[0].newTab && tab[1].href === '/about' && !tab[1].newTab && !tab[1].open && tab[1].redo && tab[2].href === null, JSON.stringify(tab));
  // Cmd+D, Cmd+Shift+H and the arrows from the link editor leave the block (CAP-T12LINKKEYS.json, R1 and R2 alike; on the
  // oracle with the block selected and no panel, Cmd+D copies it and Cmd+Shift+H hides it, CD and CH): no copy, not hidden,
  // not moved, the editor open, the field as it was. Nothing picked (D0, H0) and after a pick and Escape (D1, H1); Tab to the
  // field's Clear, ArrowRight and ArrowDown, Tab to the new-tab box, ArrowLeft (A1).
  { const K = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKKEYS.json', import.meta.url))).runs.R1.reads;
    const ks = () => qs(`const s = fe.model.sections[0], b = s.blocks[0], p = document.getElementById('link-popover'), f = p.querySelector('.lk-input'), a = document.activeElement; return JSON.stringify({ n: s.blocks.length, area: b.layout.desktop.area.join('/'), hidden: !!b.layout.desktop.hidden, open: !p.hidden, field: !p.hidden && f ? f.value : null, focus: a === f ? 'field' : a?.matches?.('.lk-clear') ? 'clear' : a?.matches?.('.lk-box') ? 'box' : a?.tagName, depth: fe.undoDepth });`);
    const kw = (k) => { const o = K[k]; return { n: o.block.n, area: o.block.area, hidden: o.block.opacity === '0', open: o.pop.field !== null, field: o.pop.field?.[0] ?? null, focus: o.focus[2] === 'Enter link, search, or add files' ? 'field' : o.focus[2] === 'Clear selected page' ? 'clear' : o.focus[1] === 'INPUT' ? 'box' : o.focus[1] }; };
    const same = (w, o, d0) => w.n === o.n && w.area === o.area && w.hidden === o.hidden && w.open === o.open && w.field === o.field && w.focus === o.focus && w.depth === d0;
    qs(`window.__kdp = ''; window.addEventListener('keydown', (e) => { window.__kdp = e.code + ' ' + e.defaultPrevented; }); return 'true';`);
    const kd = () => qs(`return window.__kdp;`);
    const linkOpen = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); };
    const pickEsc = async () => { await about(); mouse(S, 'move', 10, 10); browser(S, 'press', 'Escape'); await pause(400); };
    for (const [sc, setup, k, what] of [['D0', linkOpen, 'Meta+d', 'nothing picked, Cmd+D: no copy'], ['D1', pickEsc, 'Meta+d', 'a pick and Escape, Cmd+D: no copy'], ['H0', linkOpen, 'Meta+Shift+h', 'nothing picked, Cmd+Shift+H: not hidden'], ['H1', pickEsc, 'Meta+Shift+h', 'a pick and Escape, Cmd+Shift+H: not hidden']]) {
      await setup(); const d0 = ks().depth; browser(S, 'press', k); await pause(400); const w = ks(), o = kw(`R1 ${sc} ${k === 'Meta+d' ? 'Cmd+D' : 'Cmd+Shift+H'}`);
      add(`Link field, ${what}`, same(w, o, d0), JSON.stringify({ ours: w, oracle: o }));
      // The browser's own Cmd+Shift+H and Cmd+D (Chrome on a Mac: open the home page in this tab, bookmark this page) stay
      // cancelled, as before #763 (task-83d0746d126345f0, task-a78ac14b16c8d5bd). Headless shows no browser shortcut, so the
      // row reads the keydown's defaultPrevented.
      if (sc[0] === 'H') add(`Link field, ${what.split(',')[0]}, Cmd+Shift+H: the browser default is cancelled`, kd() === 'KeyH true', kd());
      else add(`Link field, ${what.split(',')[0]}, Cmd+D: the browser default is cancelled`, kd() === 'KeyD true', kd());
    }
    // Cmd+Shift+D (Chrome: bookmark all tabs) alike: cancelled, and no copy. Not read on the oracle; the want is main's
    // before #763.
    await linkOpen(); { const d0 = ks().depth; browser(S, 'press', 'Meta+Shift+d'); await pause(400); const w = ks(), p = kd();
      add('Link field, nothing picked, Cmd+Shift+D: the browser default is cancelled, no copy', p === 'KeyD true' && w.n === 1 && w.open && w.depth === d0, JSON.stringify({ w, p })); }
    await about(); const d0 = ks().depth;
    for (const [k, read, what] of [['Tab', 'Tab', 'Tab: the focus on Clear'], ['ArrowRight', 'ArrowRight', 'ArrowRight on Clear: not moved'], ['ArrowDown', 'ArrowDown', 'ArrowDown on Clear: not moved'], ['Tab', 'Tab2', 'Tab again: the focus on the new-tab box'], ['ArrowLeft', 'ArrowLeft', 'ArrowLeft on the box: not moved']]) {
      browser(S, 'press', k); await pause(400); const w = ks(), o = kw(`R1 A1 ${read}`);
      add(`Link editor after a pick, ${what}`, same(w, o, d0), JSON.stringify({ ours: w, oracle: o }));
    } }
  // Keys that edit the link field's text are the field's: Backspace takes one character and the block stays, an arrow moves
  // the caret, not the block, and Shift+S types an S, no stack (task-6235ac4449d70e0a; on main all three act on the block).
  const fk = () => qs(`const b = fe.model.sections[0].blocks[0], p = document.getElementById('link-popover'), f = p.querySelector('.lk-input'); return JSON.stringify({ type: b?.type ?? null, area: b ? b.layout.desktop.area.join('/') : null, open: !p.hidden, field: !p.hidden && f ? f.value : null, depth: fe.undoDepth });`);
  const keys = async (ks) => { for (const k of ks) { browser(S, 'press', k); await pause(200); } await pause(200); };
  await about(); const k0 = fk(); await keys(['End', 'x']); const kx = fk(); await keys(['Backspace']); const kb = fk();
  add('Link field: Backspace takes a character, the block stays', kx.field === '/aboutx' && kb.type === 'scrolling' && kb.open && kb.field === '/about' && kb.depth === k0.depth, JSON.stringify([k0, kx, kb]));
  await about(); await keys(['ArrowLeft', 'ArrowDown']); const ka = fk();
  add('Link field: arrow keys leave the block where it is', ka.type === 'scrolling' && ka.area === k0.area && ka.depth === k0.depth && ka.open, JSON.stringify([k0, ka]));
  await about(); await keys(['End', 'Shift+S']); const ks = fk();
  add('Link field: Shift+S types an S, no stack', ks.type === 'scrolling' && ks.open && ks.field === '/aboutS' && ks.depth === k0.depth, JSON.stringify([k0, ks])); }
// Escape keeps the editor open only as read (a URL link, the page just picked, or nothing picked); elsewhere it closes as
// before (review-757; not read on the oracle, so these wants are ours): Email, the kind menu open.
{ const esc = async (n) => { for (let i = 0; i < n; i++) { mouse(S, 'move', 10, 10); browser(S, 'press', 'Escape'); await pause(400); } return escaped(); };
  const open = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); };
  // Attach link with nothing picked: the first Escape takes the page list, the next ones leave the editor open on its empty
  // field, and Cmd+Z then takes Attach link's own step, Redo on (CAP-T12LINKZ.json Z10 R1 and R2, Z13 J1, all alike).
  { const Z = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKZ.json', import.meta.url))).runs;
    const wz = (r, k) => { const o = Z[r].reads[k]; return { blk: !o.block.gone, open: o.pop.field !== null, focus: o.focus?.[1] === 'INPUT', value: o.pop.field?.[0] ?? null, list: o.pop.options > 0, redo: o.undo.find((x) => x[0] === 'Redo')[1] === false }; };
    const nz = () => qs(`const b = fe.model.sections[0].blocks[0], p = document.getElementById('link-popover'), i = p.querySelector('.lk-input'); return JSON.stringify({ blk: !!b, open: !p.hidden && !!i && i.getBoundingClientRect().width > 0, focus: !!i && document.activeElement === i, value: !p.hidden && i ? i.value : null, list: !p.hidden && !!p.querySelector('.lk-pages:not([hidden])'), redo: !document.getElementById('redo').disabled });`);
    const like = (w, o) => Object.keys(o).every((k) => w[k] === o[k]);
    await open();
    for (const [r, k, j, what] of [['R1', 'R1 Z10 Escape', 'J1 Z13 Escape 1', 'Escape: the list goes, the editor open on its empty field'], ['R1', 'R1 Z10 Escape again', 'J1 Z13 Escape 2', 'Escape again: the editor stays open'], ['J1', null, 'J1 Z13 Escape 3', 'a third Escape: still open']]) {
      await esc(1); const w = nz(), o = wz(r, k || j), o2 = wz('J1', j);
      add(`Nothing picked, ${what}`, like(w, o) && like(o, o2), JSON.stringify({ ours: w, oracle: o }));
    }
    mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
    { const w = nz(), o = wz('R1', 'R1 Z10 Cmd+Z'); add('Nothing picked, Escapes, then Cmd+Z: the block and the editor stay, Redo on', like(w, o), JSON.stringify({ ours: w, oracle: o })); }
    // Only the untouched opening was read: a letter typed and taken back, or Email and back to URL, closes on the second
    // Escape as before (review-764; not read, so these wants are ours).
    await open(); await press('#link-popover .lk-input'); for (const k of ['x', 'Backspace']) { browser(S, 'press', k); await pause(150); }
    { const w = await esc(2); add('Nothing picked, a letter typed and taken back, Escape twice: the editor closes', !w.open, JSON.stringify(w)); }
    await open(); await press('#link-popover .lk-pill'); await press('#link-popover .lk-kind[data-kind="email"]'); await pause(200); await press('#link-popover .lk-pill'); await press('#link-popover .lk-kind[data-kind="url"]'); await pause(300);
    { const w0 = nz(), w = await esc(2); add('Nothing picked, Email and back to URL, Escape twice: the editor closes', w0.open && w0.value === '' && !w.open, JSON.stringify([w0, w])); } }
  await open(); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); await press('#link-popover .lk-pill'); await press('#link-popover .lk-kind[data-kind="email"]'); await pause(300);
  const mail = await esc(1), mailOpen = qs(`return JSON.stringify(!document.getElementById('link-popover').hidden);`);
  add('Picked, then Email, Escape: the editor closes', !mailOpen, JSON.stringify({ ...mail, mailOpen }));
  await open(); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); await press('#link-popover .lk-pill'); await pause(200);
  const menu = await esc(1), menuOpen = qs(`return JSON.stringify(!document.getElementById('link-popover').hidden);`);
  add('Picked, the kind menu open, Escape: the editor closes', !menuOpen, JSON.stringify({ ...menu, menuOpen })); }
// Cmd+Z in the link field after a page pick (CAP-T12LINKZ.json, R1 and R2 alike). Attach link is a step of its own that
// changes nothing seen: Cmd+Z takes the pick, then that step (the block stays, the editor open on /about), then the block.
// Escape after the pick's Cmd+Z leaves the editor open; a press away sets the page in the field again, Redo off.
{ const Z = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12LINKZ.json', import.meta.url))).runs.R1.reads;
  const want = (k) => { const o = Z[k]; return { blk: !o.block.gone, open: o.pop.field !== null, field: o.pop.field?.[0] ?? null, focus: o.focus?.[1] === 'INPUT', redo: o.undo.find((x) => x[0] === 'Redo')[1] === false, row: o.pop.linkRow }; };
  const zs = () => qs(`const b = fe.model.sections[0].blocks[0], p = document.getElementById('link-popover'), f = p.querySelector('.lk-input'); return JSON.stringify({ blk: !!b, href: b?.href ?? null, open: !p.hidden, field: !p.hidden && f ? f.value : null, focus: !!f && document.activeElement === f, redo: !document.getElementById('redo').disabled });`);
  const like = (w, o) => w.blk === o.blk && w.open === o.open && w.field === o.field && w.redo === o.redo && (!o.open || w.focus === o.focus);
  const key = async (k) => { mouse(S, 'move', 10, 10); browser(S, 'press', k); await pause(400); };
  const open = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); };
  const pick = async () => { await open(); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); };
  const away = async () => { await press('#block-panel [data-btab="Content"]'); await pause(300); };
  await pick();
  for (const [n, what] of [[1, 'the pick goes, the editor stays open on it'], [2, 'again: the block stays, the editor open'], [3, 'a third time: the block goes, the editor closes']]) {
    await key('Meta+z'); const w = zs(), o = want(`R1 Z8 Cmd+Z ${n}`);
    add(`Pick, Cmd+Z in the field ${what}`, like(w, o) && w.href === null, JSON.stringify({ ours: w, oracle: o }));
  }
  await pick(); await key('Meta+z');
  for (const [k, what] of [['Escape', 'Escape'], ['Escape again', 'Escape again']]) {
    await key('Escape'); const w = zs(), o = want(`R1 Z3 ${k}`);
    add(`Pick, Cmd+Z, ${what}: the editor stays open on ${o.field}`, like(w, o), JSON.stringify({ ours: w, oracle: o }));
  }
  await away(); { const w = zs(), o = want('R1 Z3 away'); add('Then a press away: the page is set again, Redo off', !w.open && w.href === '/about' && w.redo === o.redo && o.row[0] === 'About', JSON.stringify({ ours: w, oracle: o })); }
  await pick(); await key('Meta+z'); await key('Meta+Shift+z');
  { const w = zs(), o = want('R1 Z5 Cmd+Shift+Z'); add('Pick, Cmd+Z, Cmd+Shift+Z: the pick back, Redo off', like(w, o) && w.href === '/about', JSON.stringify({ ours: w, oracle: o })); }
  await pick(); await away();
  for (const n of [1, 2, 3]) {
    await press('#undo'); await pause(300); const w = zs(), o = want(`R1 Z9 Undo ${n}`);
    add(`Pick, a press away, Undo ${n}: ${['the link goes', 'the block stays', 'the block goes'][n - 1]}`, w.blk === o.blk && !w.open && w.href === null && w.redo === o.redo, JSON.stringify({ ours: w, oracle: o }));
  }
  await open();
  for (const [k, what] of [['Cmd+Z', 'the block and the editor stay, Redo on'], ['Cmd+Z again', 'again: the block goes']]) {
    await key('Meta+z'); const w = zs(), o = want(`R1 Z12 ${k}`);
    add(`Attach link, nothing picked, Cmd+Z: ${what}`, like(w, o), JSON.stringify({ ours: w, oracle: o }));
  } }
// While Attach link's editor is open the panel's Link row still reads Attach link, a page picked in it or not; a press away
// shows the page (CAP-T12LINKZ.json Z1, Z5; CAP-T12LINKKEYS.json A1, D1; R1 and R2 alike). Opened by Edit on a link it has,
// the row keeps the link (not read on the oracle, so the want is main's).
{ const runs = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}`, import.meta.url))).runs;
  const Z = runs('CAP-T12LINKZ.json'), K = runs('CAP-T12LINKKEYS.json');
  const both = (o, k) => { const a = o.R1.reads[`R1 ${k}`].pop, b = o.R2?.reads[`R2 ${k}`]?.pop; return b && JSON.stringify(a.linkRow) === JSON.stringify(b.linkRow) ? a : null; };
  const key = async (k) => { mouse(S, 'move', 10, 10); browser(S, 'press', k); await pause(400); };
  const pick = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); };
  const rowIs = (what, o, extra = true) => { const w = linkOf(); add(what, !!o && extra && w.editor === (o.field !== null) && JSON.stringify(w.row) === JSON.stringify(o.linkRow), JSON.stringify({ ours: w, oracle: o && o.linkRow })); };
  await pick(); rowIs('Link editor open after a pick: the Link row reads Attach link', both(K, 'A1 picked'), linkOf().href === '/about');
  await key('Escape'); rowIs('Then Escape, the editor open: Attach link still', both(K, 'D1 Escape'));
  await pick(); await key('Meta+z'); await key('Meta+Shift+z'); rowIs('Pick, Cmd+Z, Cmd+Shift+Z, the editor open: Attach link still', both(Z, 'Z5 Cmd+Shift+Z'), linkOf().href === '/about');
  await press('#block-panel [data-btab="Content"]'); await pause(300); rowIs('Then a press away: the Link row shows About', both(Z, 'Z5 away'));
  await press('#block-panel [data-link="edit"]'); await pause(300);
  { const w = linkOf(); add('Opened by Edit on its link: the Link row keeps the link', w.editor && JSON.stringify(w.row) === JSON.stringify(Z.R1.reads['R1 Z5 away'].pop.linkRow), JSON.stringify(w)); } }
// A press on the held Attach link (CAP-T12HELDLINK.json, R1 and R2 alike): after a pick it closes the editor and the row
// shows the link; the editor does not open again, the focus is on the row's Edit and no Attach link is left (P1, P2); Escape
// then lets the block go (P1). With nothing picked the editor stays open on its empty field, the focus in it (P0).
{ const H = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12HELDLINK.json', import.meta.url))).runs;
  const both = (k) => { const a = H.R1.reads[`R1 ${k}`], b = H.R2.reads[`R2 ${k}`]; return JSON.stringify([a.pop, a.focus, a.block.sel]) === JSON.stringify([b.pop, b.focus, b.block.sel]) ? a : null; };
  const where = () => qs(`const e = document.activeElement, i = document.querySelector('#link-popover .lk-input'), d = document.getElementById('site-frame').contentDocument; return JSON.stringify({ edit: !!e && e.matches('#block-panel .bp-link-actions [data-link="edit"]'), url: !!e && e.matches('#block-panel .bp-link .bp-link-url'), field: !!e && e === i, attach: [...document.querySelectorAll('#block-panel [data-link="open"]')].some((x) => x.getBoundingClientRect().width > 0), picked: d.querySelectorAll('[data-is-selected="true"]').length, panel: document.getElementById('block-panel').getBoundingClientRect().width > 0 });`);
  const row = (what, o, more) => { const w = linkOf(), f = where(); add(what, !!o && w.editor === (o.pop.field !== null) && JSON.stringify(w.row) === JSON.stringify(o.pop.linkRow) && more(w, f, o), JSON.stringify({ ours: { ...w, ...f }, oracle: o && { ...o.pop, focus: o.focus, sel: o.block.sel } })); };
  const pick = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); await press('#link-popover .lk-page[aria-label="About/about"]'); await pause(300); };
  await pick(); await press('#block-panel [data-link="open"]'); await pause(400);
  row('Held Attach link pressed after a pick: the row shows About', both('P1 pressed'), (w) => w.href === '/about');
  row('Held Attach link pressed: the focus on the row\'s Edit', both('P1 pressed'), (w, f, o) => o.focus[1] === 'BUTTON' && o.focus[2] === 'Edit' && f.edit);
  row('Held Attach link pressed: no Attach link left', both('P2 no Attach link'), (w, f) => !f.attach);
  mouse(S, 'move', 10, 10); browser(S, 'press', 'Escape'); await pause(400);
  row('Then Escape: the block let go, the panel closed', both('P1 Escape'), (w, f, o) => o.block.sel === 'false' && !f.picked && !f.panel);
  await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); await press('#block-panel [data-link="open"]'); await pause(400);
  row('Held Attach link pressed, nothing picked: the editor stays open', both('P0 pressed'), (w, f, o) => w.href === null && o.pop.field[0] === '' && f.field && o.focus[1] === 'INPUT');
  // A link typed in the field and not entered, then a press on Attach link (CAP-T12TYPEDLINK.json T1 and T2, R1 and R2
  // alike): the editor closes on the link, the row shows it, the focus on the row's link itself; none left to press again,
  // and Escape lets the block go.
  const T = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12TYPEDLINK.json', import.meta.url))).runs;
  const twice = (k) => { const a = T.R1.reads[`R1 ${k}`], b = T.R2.reads[`R2 ${k}`]; return JSON.stringify([a.pop, a.focus, a.block.sel]) === JSON.stringify([b.pop, b.focus, b.block.sel]) ? a : null; };
  const typed = async () => { await fresh(); await press('#block-panel [data-btab="Content"]'); await press('#block-panel [data-link="open"]'); await pause(300); for (const k of 'example.com') { browser(S, 'press', k); await pause(60); } await pause(300); };
  await typed();
  row('A link typed, no Enter: the editor open on it, Attach link still', twice('T1 typed'), (w, f, o) => w.href === null && f.field && qs(`return JSON.stringify(document.querySelector('#link-popover .lk-input').value);`) === o.pop.field[0]);
  await press('#block-panel [data-link="open"]'); await pause(400);
  row('Then Attach link pressed: the row shows the typed link', twice('T1 pressed'), (w, f, o) => w.href === o.pop.linkRow[0]);
  row('Then Attach link pressed: the focus on the row\'s link', twice('T1 pressed'), (w, f, o) => o.focus[1] === 'BUTTON' && o.focus[2] === o.pop.linkRow[0] && f.url);
  row('Then Attach link pressed: no Attach link left', twice('T2 no Attach link'), (w, f) => !f.attach);
  mouse(S, 'move', 10, 10); browser(S, 'press', 'Escape'); await pause(400);
  row('A typed link taken, then Escape: the block let go', twice('T1 Escape'), (w, f, o) => o.block.sel === 'false' && !f.picked && !f.panel); }
// The block's rows round a wave, and the line centred in them (CAP-T12WAVEROWS.json, R1 and R2 alike, 18 of 18): X walks
// Wave Intensity up by 30 to 180, down to 0 and to 90 again; Y takes a fresh block straight to 120, 0 and 60. Each step: the
// area, the section's rows, the block's height and the line's top and height in it. Y's 0 falls to 1 row, the line running
// over, where X's 0 keeps 2: a fall of two steps or more moves the block's foot up by the fall (CAP-T12WAVEDROP.json).
{ const WR = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEROWS.json', import.meta.url))).runs.R1.reads;
  const lay = () => qs(`const s = fe.model.sections[0], b = s.blocks[0], d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + b.id), fb = el.closest('.fe-block').getBoundingClientRect(), m = el.querySelector('.marquee').getBoundingClientRect(), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ desktop: b.layout.desktop.area.join('/'), rows: s.rows.desktop, block: r(fb.height), marquee: [r(m.top - fb.top), r(m.height)] });`);
  const same = (what, o) => { const w = lay(), near1 = (a, b) => Math.abs(a - b) <= 0.15; add(what, w.desktop === o.desktop && w.rows === o.rows && near1(w.block, o.block) && near1(w.marquee[0], o.marquee[0]) && near1(w.marquee[1], o.marquee[1]), `${JSON.stringify(w)} (oracle ${JSON.stringify({ desktop: o.desktop, rows: o.rows, block: o.block, marquee: o.marquee })})`); };
  const waveTo = async (v) => { await press('#block-panel [data-scr-range="wave"]', v === 0 ? 0.005 : Math.min(0.995, v / 180)); await pause(300); };
  await fresh(); await press('#block-panel [data-btab="Design"]');
  same('Wave rows X: a new block', WR['R1 X default'].layout);
  for (const [v, k] of [[30, 'up 30'], [60, 'up 60'], [90, 'up 90'], [120, 'up 120'], [150, 'up 150'], [180, 'up 180'], [150, 'down 150'], [120, 'down 120'], [90, 'down 90'], [60, 'down 60'], [30, 'down 30'], [0, 'down 0'], [90, '90 again']]) {
    await waveTo(v); same(`Wave rows X: ${k}`, WR[`R1 X ${k}`].layout);
  }
  await fresh(); await press('#block-panel [data-btab="Design"]');
  await waveTo(120); same('Wave rows Y: a new block to 120', WR['R1 Y 120'].layout);
  await waveTo(0); same('Wave rows Y: 120 to 0, 1 row', WR['R1 Y 0'].layout);
  await waveTo(60); same('Wave rows Y: 0, then 60', WR['R1 Y 60'].layout);
  // Falls of one step and of more, on one block, each path from a rise (CAP-T12WAVEDROP.json, C2 and A2 and B2 the second
  // reads of C1, A1 and B1, alike): C's nine paths, then A's 120>30>0 and B's 180>120>90.
  const WD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEDROP.json', import.meta.url))).runs;
  await fresh(); await press('#block-panel [data-btab="Design"]');
  const walk = async (run, tag, paths) => { const reads = WD[run].reads; for (const [n, steps] of paths) for (const [j, v] of steps.entries()) { const k = `${tag} ${n} ${steps.slice(0, j + 1).join('>')}`; await waveTo(v); same(`Wave fall: ${run[0]} ${k.slice(3)}`, reads[k].layout); } };
  await walk('C1', 'R3', [[1, [180, 90, 30]], [2, [180, 30]], [3, [150, 90, 60]], [4, [180, 120, 60]], [5, [150, 30]], [6, [180, 90, 120]], [7, [180, 60, 30]], [8, [180, 30, 0]], [9, [180, 0]]]);
  await walk('A2', 'R2', [[8, [120, 30, 0]]]);
  await walk('B2', 'R2', [[1, [180, 120, 90]]]);
  // After a fall that left the line running over, Speed, Direction and Pause on hover keep the rows (CAP-T12WAVEREFIT.json,
  // R3; R1 and R2 read alike). A fresh block per plan, the presses in the oracle's order.
  const WF = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEREFIT.json', import.meta.url))).runs.R3.reads;
  const PRESS = { 'Animation speed 2x': '[aria-label="Animation speed 2x"]', 'Animation speed 0.5x': '[aria-label="Animation speed 0.5x"]', 'Animation direction right': '[aria-label="Animation direction right"]', 'Pause on hover': 'input[aria-label="Pause on hover"]' };
  for (const [P, waves, presses] of [['A', [180, 90], ['Animation speed 2x', 'Animation direction right', 'Pause on hover']], ['B', [120, 0], ['Pause on hover', 'Animation speed 0.5x', 'Animation direction right']], ['C', [180, 90], ['Pause on hover', 'Animation direction right', 'Animation speed 0.5x']], ['D', [120, 0], ['Animation direction right', 'Animation speed 2x', 'Pause on hover']]]) {
    await fresh(); await press('#block-panel [data-btab="Design"]');
    for (const v of waves) await waveTo(v);
    const done = [...waves];
    for (const l of presses) {
      done.push(l); await press(`#block-panel ${PRESS[l]}`);
      // The press must have landed: the block's Speed, Direction and Pause on hover as the oracle's controls read.
      const o = WF[`R3 ${P} ${done.join('>')}`].layout, on = (k) => o.ctl.find((c) => c[0] === k)?.[1] === 'true' || o.ctl.find((c) => c[0] === k)?.[1] === true;
      const want = JSON.stringify([on('Animation speed 2x') ? 2 : on('Animation speed 0.5x') ? 0.5 : 1, on('Animation direction right') ? 'right' : 'left', on('Pause on hover')]);
      const got = qs(`const b = fe.model.sections[0].blocks[0]; return JSON.stringify(JSON.stringify([b.speed ?? 1, b.direction || 'left', !!b.pauseHover]));`);
      if (got !== want) add(`Wave refit ${P}: ${done.join('>')}`, false, `controls ${got} (oracle ${want})`); else same(`Wave refit ${P}: ${done.join('>')}`, o);
    }
  }
  // After such a fall Fade edges and Item Spacing keep the rows as well, while Text Size refits them to its line; a block made
  // taller by hand keeps its rows at Fade edges and Speed (CAP-T12REFIT2.json, R2; R1 read alike). Each step and the let go.
  { const RF = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12REFIT2.json', import.meta.url))).runs.R2.reads;
    const P2 = { 'Fade edges': 'input[aria-label="Fade edges"]', 'Large text size': '[aria-label="Large text size"]', 'Medium text size': '[aria-label="Medium text size"]', 'Animation speed 2x': '[aria-label="Animation speed 2x"]' };
    // The bottom handle of the selected block, pulled down dy px by real mouse steps.
    const pullDown = async (dy) => { const p = qs(`const f = document.getElementById('site-frame'), fr = f.getBoundingClientRect(), h = [...f.contentDocument.querySelectorAll('.fe-handle[data-dir="s"]')].find((e) => e.getBoundingClientRect().width > 0); if (!h) return 'null'; const r = h.getBoundingClientRect(); return JSON.stringify([fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2]);`); if (!p) return false; mouse(S, 'move', p[0], p[1]); await pause(60); mouse(S, 'down', p[0], p[1], { buttons: 1 }); for (let n = 1; n <= 8; n++) { mouse(S, 'move', p[0], p[1] + dy * n / 8, { buttons: 1 }); await pause(30); } mouse(S, 'up', p[0], p[1] + dy); await pause(400); return true; };
    // What the press set, as the oracle's controls and ranges read: Fade edges, Text Size, Speed and Item Spacing.
    const controls = (o) => { const on = (k) => o.ctl.some((c) => c[0] === k && (c[1] === 'true' || c[1] === true)); return JSON.stringify([on('Fade edges'), on('Large text size') ? 'L' : on('Medium text size') ? 'M' : 'S', on('Animation speed 2x') ? 2 : 1, Number(o.ranges.find((r) => r[0] === 'Item Spacing')[1])]); };
    for (const [P, pre, l] of [['F', [180, 90], 'Fade edges'], ['G', [180, 90], 'spacing 0.9'], ['H', [180, 90], 'Large text size'], ['I', [120, 0], 'Medium text size'], ['J', ['pull 82'], 'Fade edges'], ['K', ['pull 82'], 'Animation speed 2x']]) {
      await fresh();
      for (const v of pre.filter((v) => typeof v === 'string')) if (!await pullDown(82)) add(`Refit after a fall ${P}: ${v}`, false, 'no bottom handle');
      // The pull closes the panel, as on the oracle: Edit opens it again.
      if (pre.some((v) => typeof v === 'string')) qs(`const b = fe.model.sections[0].blocks[0]; fe.select(fe.model.sections[0].id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
      await press('#block-panel [data-btab="Design"]');
      for (const v of pre.filter((v) => typeof v === 'number')) await waveTo(v);
      const done = [...pre, l].join('>');
      same(`Refit after a fall ${P}: ${pre.join('>')}`, RF[`R2 ${P} ${pre.join('>')}`].layout);
      if (l.startsWith('spacing ')) await press('#block-panel [data-scr-range="spacing"]', 0.9); else await press(`#block-panel ${P2[l]}`);
      await pause(300);
      const o = RF[`R2 ${P} ${done}`].layout, want = controls(o);
      const got = qs(`const b = fe.model.sections[0].blocks[0]; return JSON.stringify(JSON.stringify([!!b.fadeEdges, b.sizeMore ? 'more' : ({ 1.5: 'S', 4: 'M', 8: 'L' })[b.size ?? 1.5] ?? String(b.size), b.speed ?? 1, b.spacing ?? 0.5]));`);
      if (got !== want) add(`Refit after a fall ${P}: ${done}`, false, `controls ${got} (oracle ${want})`); else same(`Refit after a fall ${P}: ${done}`, o);
      qs(`fe.select(null); await sleep(300); return 'true';`);
      same(`Refit after a fall ${P}: ${done}, let go`, RF[`R2 ${P} ${done} let go`].layout);
    }
  }
  // The phone view's own rule (CAP-T12WAVEPHONE.json, R2 and R4; R1 and R3 read alike): a fresh block made on the desktop in a
  // section of 2 phone rows (the oracle's), then the phone view and the plan's presses. The phone area, the section's phone rows,
  // the block, the line in it, and the desktop area that stays.
  const WP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEPHONE.json', import.meta.url))).runs;
  const layP = () => qs(`const s = fe.model.sections[0], b = s.blocks[0], d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + b.id), fb = el.closest('.fe-block').getBoundingClientRect(), m = el.querySelector('.marquee').getBoundingClientRect(), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ desktop: b.layout.desktop.area.join('/'), phone: b.layout.mobile.area.join('/'), rows: s.rows.mobile, block: r(fb.height), marquee: [r(m.top - fb.top), r(m.height)], wave: b.waveMobile ?? b.wave ?? 0 });`);
  const phoneBlock = async () => { qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 2 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); fe.setBp('mobile'); await sleep(800); const b = fe.model.sections[0].blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`); await press('#block-panel [data-btab="Design"]'); };
  for (const [run, P, steps] of [['R2', 1, [180, 90, 30]], ['R2', 2, [120, 0]], ['R2', 3, [180, 0]], ['R2', 4, [30, 60, 90, 120, 150, 180, 150]], ['R2', 5, [120, 30, 0]], ['R4', 6, [180, 150, 120, 90, 60, 30, 0]], ['R4', 7, [150, 120, 90, 60]], ['R4', 8, [60, 30, 0]], ['R4', 9, [90, 60, 0]]]) {
    await phoneBlock();
    const reads = WP[run].reads, near1 = (x, y) => Math.abs(x - y) <= 0.15;
    for (const [j, v] of steps.entries()) {
      await waveTo(v);
      const k = steps.slice(0, j + 1).join('>'), o = reads[`${run} ${P} ${k}`].layout, w = layP();
      // The press must have landed on v (review-760): a press that missed could still pass on rows alone.
      add(`Wave phone ${P}: ${k}`, w.wave === v && w.phone === o.phone && w.rows === o.rows && w.desktop === o.desktop && near1(w.block, o.block) && near1(w.marquee[0], o.marquee[0]) && near1(w.marquee[1], o.marquee[1]), `${JSON.stringify(w)} (oracle ${JSON.stringify({ desktop: o.desktop, phone: o.phone, rows: o.rows, block: o.block, marquee: o.marquee })})`);
    }
  }
  // A real drag along the range in the phone view counts its steps, and Text Size L takes its own rows
  // (CAP-T12PHONEDRAG.json, R1 and R2 alike): 180 dragged to 90 leaves 3 rows (a press leaves 4), 120 dragged to 30 leaves
  // 1 (a press 2), 180 dragged to 0 leaves 1; Large, then 30 and 0: 4, 5 and 3 rows.
  { const PD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12PHONEDRAG.json', import.meta.url))).runs, near1 = (x, y) => Math.abs(x - y) <= 0.15;
    const drag = async (from, to) => { const a = at('#block-panel [data-scr-range="wave"]', Math.max(0.005, Math.min(0.995, from / 180))), b = at('#block-panel [data-scr-range="wave"]', Math.max(0.005, Math.min(0.995, to / 180)));
      mouse(S, 'move', a[0], a[1]); await pause(60); mouse(S, 'down', a[0], a[1], { buttons: 1 }); await pause(60);
      for (let k = 1; k <= 24; k++) { mouse(S, 'move', a[0] + (b[0] - a[0]) * k / 24, a[1], { buttons: 1 }); await pause(30); }
      mouse(S, 'up', b[0], b[1]); await pause(400); };
    for (const [P, steps] of [['a', [180, ['drag', 180, 90]]], ['b', [120, ['drag', 120, 30]]], ['c', ['L', 30, 0]], ['d', [180, ['drag', 180, 0]]]]) {
      await phoneBlock();
      const done = [];
      for (const st of steps) {
        if (st === 'L') await press('#block-panel [aria-label="Large text size"]'); else if (Array.isArray(st)) await drag(st[1], st[2]); else await waveTo(st);
        done.push(st === 'L' ? 'L' : Array.isArray(st) ? `drag ${st[2]}` : String(st));
        const k = done.join('>'), o = PD.R1.reads[`R1 ${P} ${k}`], o2 = PD.R2.reads[`R2 ${P} ${k}`], w = layP(), l = o.layout;
        const size = qs(`return JSON.stringify(document.querySelector('#block-panel [aria-label="Large text size"]')?.getAttribute('aria-checked') === 'true' ? 'L' : 'not L');`);
        add(`Phone ${st === 'L' || done[0] === 'L' ? 'Text Size L' : 'drag'} ${P}: ${k}`, JSON.stringify(l) === JSON.stringify(o2.layout) && String(w.wave) === o.value && (done[0] !== 'L' || size === 'L') && w.phone === l.phone && w.rows === l.rows && w.desktop === l.desktop && near1(w.block, l.block) && near1(w.marquee[0], l.marquee[0]) && near1(w.marquee[1], l.marquee[1]), `${JSON.stringify({ ...w, size })} (oracle ${JSON.stringify({ desktop: l.desktop, phone: l.phone, rows: l.rows, block: l.block, marquee: l.marquee, value: o.value })})`);
      }
    } }
  // In the phone view, a press after a fall that left the line running over (180 to 150: 5 rows for a 180 line): Speed, Fade
  // edges and Item Spacing keep the rows, Text Size refits them (Medium: 7). A block below the Scrolling block in its section,
  // a Text block or a second Scrolling block, follows the foot: it starts on the row the Scrolling block ends on, as it rises
  // and as it falls (CAP-T12PHONE3.json, R2; R1 read alike). Each step and the let go.
  { const PH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12PHONE3.json', import.meta.url))).runs.R2.reads, near1 = (x, y) => Math.abs(x - y) <= 0.15;
    const P3 = { 'Fade edges': 'input[aria-label="Fade edges"]', 'Medium text size': '[aria-label="Medium text size"]', 'Animation speed 2x': '[aria-label="Animation speed 2x"]' };
    // A section as the oracle's: the Scrolling block on 1/2/3/26 (phone 1/2/3/10) and the other block on desktop 1/2/3/10 or
    // 1/2/3/26, phone 3/2/5/10, 4 phone rows.
    const twoBlocks = async (kind) => { qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 4 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); fe.addBlock(s.id, ${JSON.stringify(kind)}, true); await sleep(300); const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0], [a, o] = t.blocks; t.rows = { desktop: 8, mobile: 4 }; a.layout.desktop.area = [1, 2, 3, 26]; a.layout.mobile.area = [1, 2, 3, 10]; o.layout.desktop.area = ${kind === 'Text' ? '[1, 2, 3, 10]' : '[1, 2, 3, 26]'}; o.layout.mobile.area = [3, 2, 5, 10]; fe.load(m); await sleep(300); fe.setBp('mobile'); await sleep(800); fe.select(t.id, a.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`); await press('#block-panel [data-btab="Design"]'); };
    // The other block: its phone area, its top under the Scrolling block's top, and its height.
    const other = () => qs(`const s = fe.model.sections[0], [a, o] = s.blocks, d = document.getElementById('site-frame').contentDocument, q = (b) => d.getElementById('block-' + b.id).closest('.fe-block').getBoundingClientRect(), r = (v) => Math.round(v * 10) / 10; return JSON.stringify(o ? { phone: o.layout.mobile.area.join('/'), desktop: o.layout.desktop.area.join('/'), top: r(q(o).top - q(a).top), height: r(q(o).height) } : null);`);
    const controls = (o) => { const on = (k) => o.ctl.some((c) => c[0] === k && (c[1] === 'true' || c[1] === true)); return JSON.stringify([on('Fade edges'), on('Large text size') ? 'L' : on('Medium text size') ? 'M' : 'S', on('Animation speed 2x') ? 2 : 1, Number(o.ranges.find((r) => r[0] === 'Item Spacing')[1])]); };
    const sameP = (what, o) => { const w = layP(), x = o.all.find((b) => !b.me), t = x && other();
      add(what, w.phone === o.phone && w.rows === o.rows && w.desktop === o.desktop && near1(w.block, o.block) && near1(w.marquee[0], o.marquee[0]) && near1(w.marquee[1], o.marquee[1]) && (!x || (t && t.phone === x.phone && t.desktop === x.desktop && near1(t.top, x.top) && near1(t.height, x.height))), `${JSON.stringify({ ...w, other: t })} (oracle ${JSON.stringify({ desktop: o.desktop, phone: o.phone, rows: o.rows, block: o.block, marquee: o.marquee, other: x })})`); };
    for (const [P, steps, kind] of [['p', [180, 150, 'Animation speed 2x']], ['q', [180, 150, 'Fade edges']], ['r', [180, 150, 'Medium text size']], ['s', [180, 150, 'spacing 0.9']], ['u', [180, 90], 'Text'], ['v', [180, 90], 'Scrolling']]) {
      if (kind) await twoBlocks(kind); else await phoneBlock();
      const done = [];
      for (const st of steps) {
        if (typeof st === 'number') await waveTo(st); else if (st.startsWith('spacing ')) await press('#block-panel [data-scr-range="spacing"]', 0.9); else await press(`#block-panel ${P3[st]}`);
        await pause(300); done.push(String(st));
        const k = done.join('>'), o = PH[`R2 ${P} ${k}`].layout;
        const got = qs(`const b = fe.model.sections[0].blocks[0]; return JSON.stringify(JSON.stringify([!!b.fadeEdges, b.sizeMore ? 'more' : ({ 1.5: 'S', 4: 'M', 8: 'L' })[b.size ?? 1.5] ?? String(b.size), b.speed ?? 1, b.spacing ?? 0.5]));`);
        const wave = qs(`const b = fe.model.sections[0].blocks[0]; return JSON.stringify(b.waveMobile ?? b.wave ?? 0);`);
        // The press must have landed: the block's wave, Fade edges, Text Size, Speed and Item Spacing as the oracle's panel.
        if (got !== controls(o) || String(wave) !== o.ranges.find((r) => r[0] === 'Wave Intensity')[1]) add(`Phone press ${P}: ${k}`, false, `controls ${got} wave ${wave} (oracle ${controls(o)} ${JSON.stringify(o.ranges)})`); else sameP(`Phone press ${P}: ${k}`, o);
      }
      qs(`fe.select(null); await sleep(300); return 'true';`);
      sameP(`Phone press ${P}: ${done.join('>')}, let go`, PH[`R2 ${P} ${done.join('>')} let go`].layout);
    } }
  qs(`fe.setBp('desktop'); await sleep(400); return 'true';`); }
// A Scrolling block among other blocks (CAP-T12BLOCKS.json): which blocks follow its foot, and Cmd+Z (scrolling-blocks.mjs).
await blockRows({ qs, press, add, pause, browser, mouse, S });
// After a wave fall in the phone view the phone still follows a desktop move (CAP-T12FOLLOW.json, scrolling-follow.mjs).
await followRows({ qs, press, add, pause, browser, mouse, S });
await viewRows({ qs, press, add, pause, browser, mouse, S });
// A Wave Intensity drag's undo steps (CAP-T12WAVEDRAG.json): scrolling-drag.mjs.
await dragRows({ qs, press, add, pause, browser, mouse, S });
// Arrow keys on Wave Intensity (CAP-T12WAVEKEYS.json): scrolling-keys.mjs.
await keyRows({ qs, press, add, pause, browser, mouse, S });
// A drag let go on the value a pause left, and a press on another block during a drag (CAP-T12PAUSEBACK.json): scrolling-pause.mjs.
await pauseRows({ qs, press, add, pause, browser, mouse, S });
// A big fall with a Text block on the top row (CAP-T12TOPFALL.json): scrolling-falls.mjs.
await fallRows({ qs, press, add, pause, browser, mouse, S });
// The blocks below as the Wave falls by one step, on the desktop and in the phone view (CAP-T12BELOW.json): scrolling-below.mjs.
await belowRows({ qs, press, add, pause, browser, mouse, S });
// Which blocks follow the foot on a desktop fall of two steps or more, and as it grows past hand-made rows (CAP-T12DRAGJUMP.json,
// CAP-T12GROWSHORT.json): scrolling-jumps.mjs.
await jumpRows({ qs, press, add, pause, browser, mouse, S });
// A Cmd+Z that takes the wave back up, then a desktop move; one in the phone view taking back a desktop fall (CAP-T12REFIT3.json): scrolling-refit.mjs.
await refitRows({ qs, press, add, pause, browser, mouse, S });
// A phone Wave Intensity on a View Layouts pick's Scrolling turn, then the next picks (scrolling-layouts.mjs).
await layoutRows({ qs, press, add, pause, browser, mouse, S });
// Outside the editor the same loop moves the words (marquee.js): in Preview, on the saved page and on the exported page,
// 60 px/s left at 1x as in the editor (O4.default), and Pause on hover stops them only under the mouse. A rate of 0 with
// the mouse off the block is a frozen line, not a pause. Real mouse moves; Save is a real press.
await fresh();
await press('#block-panel [data-btab="Design"]');
await press('#preview'); await pause(600);
const spot = () => qs(`const b = fe.model.sections[0].blocks[0], f = document.getElementById('site-frame'), q = f.contentDocument.getElementById('block-' + b.id).getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + q.left + 200, o.top + q.top + q.height / 2]);`);
const pv = spot();
moves('Preview, the mouse off the block', O4.default, 2);
mouse(S, 'move', pv[0], pv[1]); await pause(400);
moves('Preview, Pause on hover off, the mouse on it', O4.default, 2);
mouse(S, 'move', pv[0], pv[1] + 400); await pause(200);
await press('#preview'); await pause(600);
qs(`const s = fe.model.sections[0], b = s.blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
await press('#block-panel [data-btab="Design"]');
await press('#block-panel input[aria-label="Pause on hover"]');
await press('#preview'); await pause(600);
moves('Pause on hover in Preview, the mouse off', O4.default, 2);
const pv2 = spot();
mouse(S, 'move', pv2[0], pv2[1]); await pause(400);
const pvHeld = wave(); add('Pause on hover in Preview: the words stop', !pvHeld.none && Math.abs(pvHeld.rate) < 1, pvHeld.none ? 'no text path' : `${pvHeld.rate.toFixed(2)} px/s`);
mouse(S, 'move', pv2[0], pv2[1] + 400); await pause(400);
moves('Pause on hover in Preview, the mouse gone: on again', O4.default, 2);
await press('#preview'); await pause(600);
// The page's own line, no editor around it: the start offset over 1.5 s by animation frame, as wave() reads it.
const pageWave = () => qs(`const m = document.querySelector('.marquee'), tp = m && m.querySelector('textPath'), svg = m && m.querySelector('.marquee-svg'); if (!tp) return JSON.stringify({ none: true }); const box = (m.closest('.sqs-block-scrolling') || m).getBoundingClientRect(); const mm = [], t0 = performance.now(); await new Promise((res) => { const tick = () => { mm.push([performance.now() - t0, Number(tp.getAttribute('startOffset'))]); if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); }); let T = 0, D = 0; for (let i = 1; i < mm.length; i++) { const dv = mm[i][1] - mm[i - 1][1]; if (Math.abs(dv) < 50) { T += mm[i][0] - mm[i - 1][0]; D += dv; } } const fs = parseFloat(getComputedStyle(svg).fontSize), gapPx = Number(m.dataset.spacing) * fs, set = [...m.querySelectorAll('.marquee-item')].reduce((a, e) => a + Math.round(e.getBoundingClientRect().width) + gapPx, 0); return JSON.stringify({ rate: T ? D / T * 1000 : 0, lo: Math.min(...mm.map((x) => x[1])), hi: Math.max(...mm.map((x) => x[1])), set, on: [box.left + 200, box.top + box.height / 2] });`);
const onPage = async (where, protocol) => {
  const off = qs(`const e = document.querySelector('.sqs-block-scrolling'); if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify([r.left + 200, r.bottom + 300]);`);
  if (off) { mouse(S, 'move', off[0], off[1]); await pause(400); }
  const w0 = pageWave(), at0 = qs(`return JSON.stringify(location.protocol);`);
  add(`${where}, the mouse off: ${O4.default.motion.pxPerS} px/s`, at0 === protocol && !w0.none && Math.abs(w0.rate - O4.default.motion.pxPerS) <= 2 && w0.lo > -w0.set - 0.5 && w0.hi <= 0, at0 !== protocol ? `on a ${at0} page` : w0.none ? 'no text path' : `${w0.rate.toFixed(2)} px/s, ${w0.lo}..${w0.hi}`);
  if (w0.none) { add(`${where}, Pause on hover, the mouse on it: the words stop`, false, 'no text path'); add(`${where}, the mouse gone: on again`, false, 'no text path'); return; }
  mouse(S, 'move', w0.on[0], w0.on[1]); await pause(400);
  const held2 = pageWave(); add(`${where}, Pause on hover, the mouse on it: the words stop`, !held2.none && Math.abs(held2.rate) < 1, `${held2.rate?.toFixed(2)} px/s`);
  mouse(S, 'move', w0.on[0], w0.on[1] + 400); await pause(400);
  const again = pageWave(); add(`${where}, the mouse gone: on again`, !again.none && Math.abs(again.rate - O4.default.motion.pxPerS) <= 2, `${again.rate?.toFixed(2)} px/s`);
};
await press('#save'); await pause(400);
goto(S, `${BASE}/page.html?saved`); await pause(1500);
await onPage('The saved page', 'http:');
// The exported page (Export's own HTML, render.js exportHtml) of the same saved model, opened as a page of its own.
const exported = qs(`const { exportHtml } = await import('./src/render.js'); const css = await (await fetch('src/site.css')).text(); return JSON.stringify(URL.createObjectURL(new Blob([exportHtml(JSON.parse(localStorage.getItem('fluid-editor:model:v2')), css)], { type: 'text/html' })));`);
goto(S, exported); await pause(1500);
await onPage('The exported page', 'blob:');
// The cases are counted: a findings change that drops a row must not shrink the check unseen.
const CASES = 1471;
writeFileSync(new URL('../parity/scrolling-check.json', import.meta.url), `${JSON.stringify({ check: 'a new Scrolling block\'s Design rows and their undo', pass, total, results }, null, 1)}\n`);
console.log(`\n${pass}/${total} match${total === CASES ? '' : ` (expected ${CASES} cases)`}`);
process.exit(pass === total && total === CASES ? 0 : 1);
