// T12: five menu types whose content sets the rows and follows the width, against
// parity/findings/STANDINS.json. Writes parity/standin-check.json. FLUID_SURFACE=cdp:<port> npm run standin-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/STANDINS.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(44)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

ensureVisible(S);
viewport(S, 1600, 1400);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
// One block of a type at a span and row count, as if the menu had made it.
const place = (type, span, rows) => evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.rows = { desktop: 40, mobile: 40 }; s.blocks = [{ id: 'one', type: 'shape', fill: '#d9d4ca', radius: '0', label: ${JSON.stringify(type)}, standin: ${JSON.stringify(type.toLowerCase())}, layout: { desktop: { area: [1, 2, ${1 + rows}, ${2 + span}], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, ${1 + rows}, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]; fe.load(next); await new Promise((res) => setTimeout(res, 350)); document.getElementById('site-frame').contentDocument.querySelectorAll('.page-section')[1].scrollIntoView(); await new Promise((res) => setTimeout(res, 150)); return 'true'; })()`);
const area = () => evalJs(S, `(() => JSON.stringify(fe.model.sections[1].blocks[0].layout.desktop.area))()`);
const pull = async (dir, cols, rows) => {
  const p = evalJs(S, `(async () => { fe.select(${JSON.stringify(sid)}, 'one'); await new Promise((res) => setTimeout(res, 150)); const f = document.getElementById('site-frame'), o = f.getBoundingClientRect(), d = f.contentDocument, h = d.querySelector('.fe-handle[data-dir="${dir}"]'), r = h.getBoundingClientRect(), g = d.defaultView.getComputedStyle(d.querySelectorAll('.fluid-engine')[1]), cols = g.gridTemplateColumns.split(' ').map(parseFloat); return JSON.stringify({ x: o.left + r.left + r.width / 2, y: o.top + r.top + r.height / 2, col: cols[3] + parseFloat(g.columnGap), row: parseFloat(g.gridTemplateRows) + parseFloat(g.rowGap) }); })()`);
  drag(S, [p.x, p.y], [p.x + cols * p.col, p.y + rows * p.row]); await pause(350);
  return area();
};
const content = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, b = d.querySelector('.fe-block[data-block-id="one"]') || d.getElementById('block-one').closest('.fe-block'), q = b.getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }, pick = (s) => { const e = b.querySelector(s); return e ? rel(e) : null; }; return JSON.stringify({ block: rel(b), inner: pick('.sqs-block-content'), figure: pick('figure'), quote: pick('blockquote'), source: pick('.source'), picture: pick('.fe-chart svg'), status: pick('.fe-status'), title: pick('.fe-status-title'), message: pick('.fe-status-message'), tile: pick('.fe-tiles span') }); })()`);

// The boxes inside, at the widths they were read.
const C = F.content;
place('Quote', 6, 6); let c = content();
add('Quote at span 6: the block', near(c.block.slice(2), C.Quote.at6.block), c.block);
add('Quote at span 6: its text box and wrap', Math.abs(c.figure[3] + 2 * C.Quote.figureMargin + 2 * c.block[2] * 0.06 - (C.Quote.at6.content[3] + 2 * C.Quote.at6.content[0])) <= 1.5 && Math.abs(c.figure[0] - C.Quote.at6.content[0]) <= 1, c.figure);
for (const [span, k] of [[8, 'at8'], [10, 'at10'], [12, 'at12']]) {
  place('Quote', span, 6); c = content();
  add(`Quote at span ${span}: text height follows the wrap`, Math.abs(c.figure[3] + 2 * C.Quote.figureMargin - C.Quote[k].content[3]) <= 1.5, c.figure);
}
place('Chart', 8, 8); c = content();
add('Chart at span 8: the picture', near(c.picture, C.Chart.at8.picture), c.picture);
add('Chart at span 8: the content', Math.abs(c.inner[3] - C.Chart.at8.content[3]) <= 1, c.inner);
place('SoundCloud', 8, 8); c = content();
add('SoundCloud at span 8: the content', near(c.inner, C.SoundCloud.at8.content), c.inner);
add('SoundCloud at span 8: the status box', near(c.status, C.SoundCloud.at8.status), c.status);
add('SoundCloud at span 8: title and message', near(c.title, C.SoundCloud.at8.title) && near(c.message, C.SoundCloud.at8.message), `${c.title} ${c.message}`);
for (const type of C.gallery.types) {
  place(type, 8, 9); c = content();
  add(`${type} at span 8: the content`, near(c.inner, C.gallery.at8.content), c.inner);
  add(`${type} at span 8: a tile`, near(c.tile, C.gallery.at8.tile), c.tile);
}

// The least rows at each width.
for (const type of ['Quote', 'Chart', 'SoundCloud', 'Flickr', 'Instagram']) {
  for (const [span, rows] of Object.entries(F.minRows[type])) {
    place(type, Number(span), 20);
    const a = await pull('s', 0, -30);
    add(`${type} span ${span}: the least rows`, a[2] - a[0] === rows, `${a[2] - a[0]}, oracle ${rows}`);
  }
}
// Widening: the rows after the pull, before any other gesture.
for (const type of ['Chart', 'Flickr', 'SoundCloud']) {
  const w = F.widen[type];
  place(type, w.from[0], w.from[1]);
  const a = await pull('e', w.to[0] - w.from[0], 0);
  add(`${type} widened: its rows`, a[2] - a[0] === w.to[1] && a[3] - a[1] === w.to[0], a.join('/'));
}

// T14: where a new one lands, on desktop and the phone (CAP-T14ZOLA.json, CAP-T14BANDS.json, CAP-T14OPENTABLE.json, CAP-T14CONTROL.json, CAP-T14LAND.json).
const addAll = (types) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await sleep(200); for (const t of ${JSON.stringify(types)}) { fe.addBlock(fe.model.sections[1].id, t); await sleep(120); } const x = fe.model.sections[1]; return JSON.stringify({ rows: x.rows.desktop, areas: x.blocks.map((b) => b.layout.desktop.area.join('/') + ' ' + b.layout.mobile.area.join('/')).sort() }); })()`);
viewport(S, 1600, 1000); // the three that start lower do so under 1200 high
const LAND = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T14LAND.json', import.meta.url)));
const pairs = (name) => LAND.reads[name].areas.map((p) => p.join(' ')).sort();
for (const [type, want] of [['Zola', '3/2/19/10 1/2/17/10'], ['Bandsintown', '4/2/9/10 1/2/6/10'], ['OpenTable', '3/2/11/10 1/2/9/10'], ['Flickr', '1/2/10/10 1/2/6/10'], ['SoundCloud', '1/2/9/10 1/2/6/10'], ['Instagram', '1/2/13/10 1/2/13/10'], ['Tock', '1/2/3/20 1/2/3/10']]) {
  const got = addAll([type]);
  add(`${type} lands alone`, got.areas.join() === want, got.areas.join());
}
add('Zola: the section grows to its last row', addAll(['Zola']).rows === 18);
for (const [name, types] of [['SoundCloud alone', ['SoundCloud']], ['Zola beside it', ['SoundCloud', 'Zola']], ['a second Zola', ['SoundCloud', 'Zola', 'Zola']], ['OpenTable beside them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable']], ['Bandsintown beside them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable', 'Bandsintown']], ['Text after them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable', 'Bandsintown', 'Text']]]) {
  const got = addAll(types), want = pairs(name);
  add(`${name}: desktop and phone`, got.areas.join() === want.join() && got.rows === LAND.reads[name].section.rows, `${got.rows} ${got.areas.join()} wants ${LAND.reads[name].section.rows} ${want.join()}`);
}

// The start row by window height, and types that stay on row 1 at 1000 high (CAP-T14HEIGHTS.json, CAP-T14HEIGHTS2.json).
for (const name of ['CAP-T14HEIGHTS', 'CAP-T14HEIGHTS2']) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
  for (const [read, r] of Object.entries(F.reads)) {
    const m = /^(\w+) at (\d+)$/.exec(read);
    viewport(S, 1600, +m[2]); await pause(200);
    const got = addAll([m[1]]), want = r.areas[0].join(' ');
    add(`${read}: desktop and phone`, got.areas.join() === want, `${got.areas.join()} wants ${want}`);
  }
}

writeFileSync(new URL('../parity/standin-check.json', import.meta.url), `${JSON.stringify({ check: 'content that follows the width', pass, total, results }, null, 1)}\n`);
console.log(`Stand-ins: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
