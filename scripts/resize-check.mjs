// T14: add each block type through the real Add Block menu, pull its handles with the mouse, and
// compare the grid area after each pull with the oracle's (parity/findings/BLOCKTYPES.json). A
// picture is compared in Fit, Fill and Shape. Stand-in types are compared too; what their content
// would do is a named miss.
// Writes parity/resize-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run resize-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/BLOCKTYPES.json', import.meta.url)));
// A type's start row in BLOCKTYPES is not where it lands (CAP-LANDING.json correction): the tool's scroll
// moved some. In an empty section they land at row 1, and a pull changes the same rows.
const LANDING = JSON.parse(readFileSync(new URL('../parity/findings/CAP-LANDING.json', import.meta.url)));
const FRESH = (name) => LANDING.fromU5[name] ?? LANDING.fresh[name]?.area;
// Named misses: on the oracle these types hold live content whose reads change from run to run
// (STANDINS.json). Ours are stand-ins of the right size with no such content.
const CONTENT = { Summary: ['se', 's', 'e'], Zola: ['s', 'e'], Bandsintown: ['se', 's', 'e'] };
// Under 0005: the content needs an outside service and a real account or listing. Still named, never dropped.
const OUT_OF_SCOPE = ['Zola', 'Bandsintown'];
const named = [];
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail, known = false) => { total++; if (ok) pass++; else if (known) named.push(what); results.push({ what, ok, ...(!ok && known ? { named: true, ...(OUT_OF_SCOPE.includes(what.split(' ')[0]) ? { outOfScope: '0005' } : {}) } : {}) }); console.log(`${what.padEnd(34)} ${ok ? 'match' : `${known ? 'NAMED' : 'DIFF'} ${detail}`}`); };
const same = (a, b) => a.join() === b.join();

ensureVisible(S);
viewport(S, 1600, 1400);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
const empty = (blocks = '[]') => evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = ${blocks}; s.rows = { desktop: Math.max(40, ...s.blocks.map((b) => b.layout.desktop.area[2])), mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
const areaOf = (id) => evalJs(S, `(() => JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === ${JSON.stringify(id)}).layout.desktop.area))()`);
// A handle on the page's right edge hangs half off it, so grab the half that is on the page.
// A handle low in the window is scrolled up first, or the drag scrolls the page and adds a row.
const pull = async (id, dir, cols, rows) => {
  const p = evalJs(S, `(async () => { fe.select(${JSON.stringify(sid)}, ${JSON.stringify(id)}); await new Promise((res) => setTimeout(res, 150)); const f = document.getElementById('site-frame'), o = f.getBoundingClientRect(), d = f.contentDocument, h = d.querySelector('.fe-handle[data-dir="${dir}"]'); if (o.top + h.getBoundingClientRect().bottom > innerHeight - 250) { d.scrollingElement.scrollTop += 600; await new Promise((res) => setTimeout(res, 150)); } const r = h.getBoundingClientRect(), m = fe.measure(${JSON.stringify(sid)}); return JSON.stringify({ x: Math.min(o.left + r.x + r.width / 2, innerWidth - 2), y: o.top + r.y + r.height / 2, col: m.colStart[2] - m.colStart[1], row: m.pitch }); })()`);
  drag(S, [p.x, p.y], [p.x + cols * p.col, p.y + rows * p.row]); await pause(350);
  return areaOf(id);
};

// A new block of each type we build, through the menu.
for (const [name, want] of Object.entries(F.types)) {
  const spot = empty();
  mouse(S, 'move', spot[0], spot[1]); await pause(350);
  const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const had = new Set(fe.model.sections[1].blocks.map((x) => x.id)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); const t = document.querySelector('button[data-add="${name}"]'); if (!t) { document.getElementById('add-block-menu').hidden = true; return JSON.stringify(null); } t.click(); await sleep(350); return JSON.stringify(fe.model.sections[1].blocks.find((x) => !had.has(x.id)).id); })()`);
  if (!id) continue; // not built here
  const lands = FRESH(name) ?? want.area, down = want.area[0] - lands[0];
  add(`${name} lands where the oracle's does`, same(areaOf(id), lands), `${areaOf(id).join('/')} want ${lands.join('/')}`);
  for (const [dir, cols, rows, , to] of want.drags) {
    const got = await pull(id, dir, cols, rows), wanted = [to[0] - down, to[1], to[2] - down, to[3]];
    add(`${name} ${dir} ${cols},${rows}`, same(got, wanted), `${got.join('/')}, oracle ${wanted.join('/')}`, CONTENT[name]?.includes(dir));
  }
}

// A block with a picture, from the same area the oracle's started at.
const PIC = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="569" height="763"><rect width="569" height="763" fill="red"/></svg>');
for (const [mode, label] of [['fill', 'Fill'], ['shape', 'Shape'], ['fit', 'Fit']]) {
  const steps = Object.entries(F.imageWithPicture[label]).filter(([k]) => /^(se|s|e) /.test(k));
  empty(JSON.stringify([{ id: 'pic', type: 'image', alt: '', src: PIC, mode, aspect: 569 / 763, layout: { desktop: { area: steps[0][1][0], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 9, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]));
  for (const [k, [, to]] of steps) {
    const [dir, a, b] = k.split(/[ ]/);
    const cols = dir === 's' ? 0 : Number(a), rows = dir === 'e' ? 0 : dir === 's' ? Number(a) : Number(b);
    const got = await pull('pic', dir, cols, rows);
    // A block starting in the gutter snaps columns as read (BLOCKTYPES.json columnSnap, built since): every column compared.
    add(`${label} picture ${k}`, same(got, to), `${got.join('/')}, oracle ${to.join('/')}`);
  }
}

console.log(`Resize: ${pass} of ${total} checks match, ${named.length} named known misses`);
writeFileSync(new URL('../parity/resize-check.json', import.meta.url), `${JSON.stringify({ check: 'block types resize as on the oracle', pass, total, named, results }, null, 2)}\n`);
if (!total || pass + named.length !== total) process.exitCode = 1;
