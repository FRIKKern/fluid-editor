// T12: a new Scrolling block's Design rows replayed from the oracle's rows walk (CAP-ROWSSCROLLING2.json; CAP-ROWSSCROLLING.json
// read alike): Wave Intensity to 150, Text Style to Paragraph, Medium and Large each and back to Small, Item Spacing 0.6em.
// After each: the block's area, the section's rows and the first two words' boxes (left and width); then each Cmd+Z goes back
// one step to the new block. Presses are real mouse input. Writes parity/scrolling-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run scrolling-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

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
// change; a press after it, then another drag, must still undo one step at a time.
const range = at('#block-panel [data-scr-range="wave"]'), w = qs(`return JSON.stringify(document.querySelector('#block-panel [data-scr-range="wave"]').getBoundingClientRect().width);`);
const drag = async (to, back = false) => { const x0 = range[0] - w / 2 + 4; mouse(S, 'move', x0, range[1]); await pause(60); mouse(S, 'down', x0, range[1], { buttons: 1 }); for (let n = 1; n <= 10; n++) { mouse(S, 'move', x0 + (to - 4) * n / 10, range[1], { buttons: 1 }); await pause(30); } if (back) for (let n = 9; n >= 0; n--) { mouse(S, 'move', x0 + (to - 4) * n / 10, range[1], { buttons: 1 }); await pause(30); } const x = back ? x0 : x0 + to - 4; mouse(S, 'up', x, range[1]); await pause(400); };
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
add('Drag back to start, Cmd+Z, drag: undo takes one step', back2.area === undone.area && back2.rows === undone.rows && undone.area !== medium.area, JSON.stringify({ undone, back2 }));
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
// The cases are counted: a findings change that drops a row must not shrink the check unseen.
const CASES = 45;
writeFileSync(new URL('../parity/scrolling-check.json', import.meta.url), `${JSON.stringify({ check: 'a new Scrolling block\'s Design rows and their undo', pass, total, results }, null, 1)}\n`);
console.log(`\n${pass}/${total} match${total === CASES ? '' : ` (expected ${CASES} cases)`}`);
process.exit(pass === total && total === CASES ? 0 : 1);
