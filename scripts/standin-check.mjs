// T12: five menu types whose content sets the rows and follows the width, against
// parity/findings/STANDINS.json. Writes parity/standin-check.json. FLUID_SURFACE=cdp:<port> npm run standin-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, drag, mouse, screenshot, browser } from './lib/cmux.mjs';
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
add('Quote at span 6: its content box, inside the padding', near(c.inner, C.Quote.at6.content), c.inner);
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

// T14: where a new one lands, on desktop and the phone (CAP-T14MENU.json, CAP-T14CONTROL.json, CAP-T14LAND.json, CAP-T14HEIGHTS2.json).
viewport(S, 1600, 1000);
await pause(200);
// Types added in turn, each after the frame moves so the new block lands on the given row. Section 1 starts fresh.
const addAll = (types, rows = {}) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await sleep(200); const W = document.getElementById('site-frame').contentWindow, sec = () => W.document.querySelector('section[data-section-id="' + fe.model.sections[1].id + '"]'); W.scrollTo({ top: 0, behavior: 'instant' }); const RW = ${JSON.stringify(rows)}; for (const t of ${JSON.stringify(types)}) { const row = RW[t] ?? 1; W.scrollTo({ top: 0, behavior: 'instant' }); if (row > 1) W.scrollBy({ top: sec().getBoundingClientRect().top + (row - 1) * fe.measure(fe.model.sections[1].id).pitch + 1, behavior: 'instant' }); fe.addBlock(fe.model.sections[1].id, t); await sleep(120); } const x = fe.model.sections[1]; W.scrollTo({ top: 0, behavior: 'instant' }); return JSON.stringify({ rows: x.rows.desktop, areas: x.blocks.map((b) => b.layout.desktop.area.join('/') + ' ' + b.layout.mobile.area.join('/')).sort() }); })()`);
for (const [type, want] of [['Zola', '1/2/17/10 1/2/17/10'], ['Bandsintown', '1/2/6/10 1/2/6/10'], ['OpenTable', '1/2/9/10 1/2/9/10'], ['Flickr', '1/2/10/10 1/2/6/10'], ['SoundCloud', '1/2/9/10 1/2/6/10'], ['Instagram', '1/2/13/10 1/2/13/10'], ['Tock', '1/2/3/20 1/2/3/10']]) {
  const got = addAll([type]);
  add(`${type} lands alone`, got.areas.join() === want, got.areas.join());
}
add('Zola: the section grows to its last row', addAll(['Zola']).rows === 16);
const H2 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T14HEIGHTS2.json', import.meta.url)));
for (const type of ['Instagram', 'Tock', 'SoundCloud', 'Flickr', 'RSS', 'Archive', 'Chart', 'Menu']) {
  const got = addAll([type]), want = H2.reads[`${type} at 1000`].areas[0].join(' ');
  add(`${type} at 1000: desktop and phone`, got.areas.join() === want, `${got.areas.join()} wants ${want}`);
}
// The phone order beside others, each landing on the row its read did (CAP-T14LAND.json's correction).
const LAND = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T14LAND.json', import.meta.url)));
const pairs = (name) => LAND.reads[name].areas.map((p) => p.join(' ')).sort();
const LOWER = { Zola: 3, OpenTable: 3, Bandsintown: 4 };
for (const [name, types] of [['SoundCloud alone', ['SoundCloud']], ['Zola beside it', ['SoundCloud', 'Zola']], ['a second Zola', ['SoundCloud', 'Zola', 'Zola']], ['OpenTable beside them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable']], ['Bandsintown beside them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable', 'Bandsintown']], ['Text after them', ['SoundCloud', 'Zola', 'Zola', 'OpenTable', 'Bandsintown', 'Text']]]) {
  const got = addAll(types, LOWER), want = pairs(name);
  add(`${name}: desktop and phone`, got.areas.join() === want.join() && got.rows === LAND.reads[name].section.rows, `${got.rows} ${got.areas.join()} wants ${LAND.reads[name].section.rows} ${want.join()}`);
}
// By the frame's scroll, on each read (CAP-T14FRAME.json, CAP-T14FRAME2.json): the section's top where the oracle's was, then a real add.
const addScrolled = (i, type, above) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const fresh = next.sections[${i}]; fresh.blocks = []; fresh.rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await sleep(200); const id = fe.model.sections[${i}].id, W = document.getElementById('site-frame').contentWindow, el = W.document.querySelector('section[data-section-id="' + id + '"]'); W.scrollTo({ top: 0, behavior: 'instant' }); W.scrollBy({ top: el.getBoundingClientRect().top + ${above}, behavior: 'instant' }); await sleep(60); const was = -el.getBoundingClientRect().top; fe.addBlock(id, ${JSON.stringify(type)}); await sleep(150); const x = fe.model.sections[${i}], a = x.blocks[0].layout; const top = el.isConnected ? el.getBoundingClientRect().top : W.document.querySelector('section[data-section-id="' + id + '"]').getBoundingClientRect().top; return JSON.stringify({ was, top, rows: x.rows.desktop, area: a.desktop.area.join('/') + ' ' + a.mobile.area.join('/') }); })()`);
for (const name of ['CAP-T14FRAME', 'CAP-T14FRAME2']) {
  const F2 = JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
  for (const [read, r] of Object.entries(F2.reads)) {
    const m = /^(\w+) s(\d) frame by \d+, area$/.exec(read);
    if (!m || !r.areas?.length) continue;
    const box = r.section.box[1], type = m[1], i = +m[2], landed = r.areas[0].join(' ');
    // A section that came back reads 0: the press was at the frame's step in the read's name.
    const back = box === 0, by = back ? +/by (\d+)/.exec(read)[1] : -box;
    const got = addScrolled(i, type, by);
    const topOk = back ? Math.abs(got.top) < 1 : Math.abs(-got.top - by) < 1;
    add(`${read}: ${landed}`, got.area === landed && got.rows === r.section.rows && topOk, `${got.area}, rows ${got.rows}, top ${got.top} wants ${landed}, rows ${r.section.rows}, was ${got.was}`);
  }
}
// Past the last row, below the first section: the new block's middle at the frame's middle, as near as the page allows (CAP-T14BACK.json, CAP-T14PLACE.json).
const readOf = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads;
const BACK = readOf('CAP-T14BACK'), PLACE = readOf('CAP-T14PLACE'), REACH = readOf('CAP-T14REACH');
const blankPage = (n) => evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); while (next.sections.length < ${n}) next.sections.push({ ...JSON.parse(JSON.stringify(next.sections.at(-1))), id: 'more' + next.sections.length }); next.sections = next.sections.slice(0, ${n}); for (const s of next.sections) { s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; } fe.setBp('desktop'); fe.load(next); await new Promise((res) => setTimeout(res, 300)); const W = document.getElementById('site-frame').contentWindow; W.scrollTo({ top: 0, behavior: 'instant' }); return JSON.stringify([...W.document.querySelectorAll('section[data-section-id]')].map((e) => e.getBoundingClientRect().height)); })()`);
const landFrom = (i, type, y) => evalJs(S, `(async () => { const W = document.getElementById('site-frame').contentWindow, id = fe.model.sections[${i}].id; W.scrollTo({ top: ${y}, behavior: 'instant' }); await new Promise((res) => setTimeout(res, 60)); const was = W.scrollY; fe.addBlock(id, ${JSON.stringify(type)}); await new Promise((res) => setTimeout(res, 150)); return JSON.stringify({ was, now: W.scrollY, area: fe.model.sections[${i}].blocks[0].layout.desktop.area.join('/') }); })()`);
for (const [name, r, i, type, n] of [['Text s1 above 400', BACK, 1, 'Text', 4], ['Shape s1 above 400', BACK, 1, 'Shape', 4], ['Line s1 above 400', BACK, 1, 'Line', 4], ['Text s2 above 400', BACK, 2, 'Text', 5], ['s0 above 329', PLACE, 0, 'Text', 3], ['s0 above 500', PLACE, 0, 'Text', 3], ['s1 above 400', PLACE, 1, 'Text', 4]]) {
  const heights = blankPage(n), read = r[name], got = landFrom(i, type, read.atPress.frameY);
  add(`Past the last row, ${name}: from ${read.atPress.frameY} to ${read.afterFrameY}`, got.was === read.atPress.frameY && Math.abs(got.now - read.afterFrameY) <= 1 && got.area.startsWith('1/2/'), `${JSON.stringify(got)} sections ${heights}`);
}
// Add Block rides 26 below the frame's top, and can be pressed there (CAP-T14REACH.json: a real mouse over the section).
blankPage(3);
for (const [name, r] of Object.entries(REACH)) {
  evalJs(S, `(async () => { const W = document.getElementById('site-frame').contentWindow; W.scrollTo({ top: ${r.frameY}, behavior: 'instant' }); return 'true'; })()`);
  await pause(120);
  const over = name.includes('-300') ? 400 : 200; // as the read's mouse, over the section read
  mouse(S, 'move', 800, over); await pause(60); mouse(S, 'move', 801, over + 1); await pause(200);
  const want = r.buttons.find((b) => b.onTop), got = evalJs(S, `(() => { const e = [...document.querySelectorAll('[data-sc="add-block"]')].find((x) => x.getBoundingClientRect().width > 0); if (!e) return 'null'; const c = e.getBoundingClientRect(), x = c.left + c.width / 2, y = c.top + c.height / 2; return JSON.stringify({ x, y, on: !!document.elementFromPoint(x, y)?.closest('[data-sc="add-block"]') }); })()`);
  add(`Add Block, ${name}: its middle ${Math.round(want.at[1])}, on top`, !!got && Math.abs(got.y - want.at[1]) <= 1 && Math.abs(got.x - want.at[0]) <= 1 && got.on, JSON.stringify(got));
}
// The phone view has no Add Block, wherever the mouse is (CAP-T14PLACE.json).
evalJs(S, `(async () => { fe.setBp('mobile'); await new Promise((res) => setTimeout(res, 300)); document.getElementById('site-frame').contentWindow.scrollTo({ top: 0, behavior: 'instant' }); return 'true'; })()`);
for (const y of [200, 500, 700]) {
  mouse(S, 'move', 800, y); await pause(60); mouse(S, 'move', 801, y + 1); await pause(200);
  const got = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('[data-sc="add-block"]')].filter((x) => x.getBoundingClientRect().width > 0).length))()`);
  add(`Phone, the mouse at ${y}: no Add Block`, got === PLACE[`phone mouse at ${y}, hovered`].buttons.length, String(got));
}
evalJs(S, `(async () => { fe.setBp('desktop'); await new Promise((res) => setTimeout(res, 200)); return 'true'; })()`);
// The same by real presses: the frame moved, Add Block, then the tile. Frame by 100 on section 0 lands on row 3.
evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[0]; s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await new Promise((res) => setTimeout(res, 250)); document.getElementById('site-frame').contentWindow.scrollTo({ top: 100, behavior: 'instant' }); return 'true'; })()`);
await pause(200);
const middle = (sel) => evalJs(S, `(() => { const e = [...document.querySelectorAll('${sel}')].find((x) => x.getBoundingClientRect().width > 0); if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]); })()`);
mouse(S, 'move', 800, 300); await pause(300);
const realPress = async (sel) => { const p = middle(sel); if (!p) return false; drag(S, p, p, { steps: 1, holdMs: 30 }); await pause(300); return true; };
const opened = await realPress('[data-sc="add-block"]'), pressed = opened && await realPress('button[data-add="Text"]');
await pause(300);
const real = evalJs(S, `(() => JSON.stringify(fe.model.sections[0].blocks[0]?.layout.desktop.area.join('/') ?? null))()`);
add('Real presses, frame by 100: row 3', pressed && real === '3/2/5/10', `${opened} ${pressed} ${real}`);
// And past the last row, by real presses.
blankPage(4);
evalJs(S, `(async () => { document.getElementById('site-frame').contentWindow.scrollTo({ top: ${BACK['Text s1 above 400'].atPress.frameY}, behavior: 'instant' }); return 'true'; })()`);
await pause(200);
mouse(S, 'move', 800, 200); await pause(60); mouse(S, 'move', 801, 201); await pause(300);
await realPress('[data-sc="add-block"]'); await realPress('button[data-add="Text"]'); await pause(300);
const pressedPast = evalJs(S, `(() => JSON.stringify({ y: document.getElementById('site-frame').contentWindow.scrollY, area: fe.model.sections[1].blocks[0]?.layout.desktop.area.join('/') }))()`);
add('Past the last row, by real presses: to 384', Math.abs(pressedPast.y - BACK['Text s1 above 400'].afterFrameY) <= 1 && pressedPast.area?.startsWith('1/2/'), JSON.stringify(pressedPast));
evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); fe.setBp('desktop'); fe.load(next); return 'true'; })()`);
if (process.env.T14_SHOT) screenshot(S, process.env.T14_SHOT);
viewport(S, 1600, 1400);

// Quote's Content tab (CAP-T12QUOTE.json): span 6 and 6 rows as read, Edit, Content; real keys at the end of each field.
{
  const QT = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12QUOTE.json', import.meta.url)));
  goto(S, `${BASE}/index.html`); await pause(1800);
  place('Quote', 6, 6);
  const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const p = document.getElementById('block-panel'), d = document.getElementById('site-frame').contentDocument; ${body} })()`);
  qs(`fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); p.querySelector('[data-btab="Content"]')?.click(); await sleep(300); return 'true';`);
  const look = () => qs(`const P0 = p.getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; return JSON.stringify({ tabs: [...p.querySelectorAll('[data-btab]')].map((t) => t.textContent), caps: [...p.querySelectorAll('.bp-qf .bp-soccap')].map((e) => { const c = getComputedStyle(e); return { text: e.textContent, box: rel(e), font: c.fontSize + '/' + c.lineHeight + ' ' + c.fontWeight, color: c.color, up: c.textTransform }; }), fields: [...p.querySelectorAll('.bp-qta')].map((e) => { const c = getComputedStyle(e); return { label: e.getAttribute('aria-label'), placeholder: e.placeholder, box: rel(e), font: c.fontSize + '/' + c.lineHeight + ' ' + c.fontWeight, color: c.color, value: e.value }; }), rules: [...p.querySelectorAll('.bp-qf')].map((e) => { const b = rel(e); return [b[0], b[1] + b[3] - 1, b[2], getComputedStyle(e).borderBottomColor]; }) });`);
  const blk = () => qs(`const b = fe.model.sections[1].blocks[0], el = d.querySelector('.fe-block[data-block-id="one"]'), bq = el.querySelector('blockquote'), fc = el.querySelector('figcaption'); return JSON.stringify({ rows: b.layout.desktop.area[2] - b.layout.desktop.area[0], quote: bq.innerHTML.replace(/\\s+/g, ' ').trim(), figcaption: fc ? fc.outerHTML : null, undo: !document.getElementById('undo').disabled });`);
  const key = async (k, w = 150) => { browser(S, 'press', k); await pause(w); };
  const toEnd = async (label) => { const c = qs(`const e = p.querySelector('.bp-qta[aria-label="${label}"]'), r = e.getBoundingClientRect(); return JSON.stringify([r.left + 30, r.top + 11]);`); mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(150); qs(`const e = document.activeElement; e.setSelectionRange(e.value.length, e.value.length); return 'true';`); };
  let L = look();
  add('Quote panel: Content, Design, Animation', L.tabs.join() === 'Content,Design,Animation', L.tabs.join());
  add('Quote panel: the captions as read', L.caps.length === 2 && L.caps.every((c, n) => near(c.box, QT.captions[n].box, 1) && c.text === QT.captions[n].text && c.up === 'uppercase' && c.font === QT.captions[n].font && c.color === QT.captions[n].color), JSON.stringify(L.caps));
  add('Quote panel: the fields as read', L.fields.length === 2 && L.fields.every((f, n) => near(f.box, QT.fields[n].box, 1) && f.font === QT.fields[n].font && f.color === QT.fields[n].color && f.placeholder === QT.fields[n].placeholder && f.label === QT.fields[n].label), JSON.stringify(L.fields));
  add('Quote panel: the rule under Quote', near(L.rules[0].slice(0, 3), [QT.rule.x[0], QT.fields[0].box[1] + QT.fields[0].box[3] + QT.rule.under.Quote, QT.rule.x[1] - QT.rule.x[0] + 1], 1) && L.rules[0][3] === QT.rule.color, JSON.stringify(L.rules));
  const T = QT.typing;
  await toEnd('Quote'); await key('A'); await key('b', 300);
  let k = blk();
  add('Quote: each key shows at once, as read', k.quote === T.afterAb.quote && k.rows === T.afterAb.rows, JSON.stringify(k));
  await key('Enter'); await key('C', 400);
  k = blk(); L = look();
  add('Quote: Enter is a <br>, the rows grow to 7, as read', k.quote === T.afterEnterC.quote && k.rows === T.afterEnterC.rows && near([L.fields[0].box[3]], [66], 0.5), `${JSON.stringify(k)} ${L.fields[0].box}`);
  for (let n = 0; n < 6; n++) for (const ch of ' longer words') await key(ch === ' ' ? 'Space' : ch, 25);
  await pause(400); k = blk(); L = look();
  // The field wraps by our panel font, not the oracle's, so its lines are not compared here; the caption below still follows it.
  add('Quote: a long quote grows the rows to 10, as read', k.quote === T.afterLong.quote && k.rows === T.afterLong.rows && L.caps[1].box[1] === L.fields[0].box[1] + L.fields[0].box[3] + 44, `${k.rows} ${L.fields[0].box} ${L.caps[1].box}`);
  await toEnd('Source'); await key('Meta+a'); await key('Backspace', 400);
  k = blk();
  add('Quote: an empty Source takes the figcaption, 9 rows (named miss: 8)', k.figcaption === T.sourceEmpty.figcaption && k.rows === T.sourceEmpty.rows, JSON.stringify(k));
  qs(`document.activeElement.blur(); await sleep(250); return 'true';`);
  const u = qs(`const b = document.getElementById('undo'), r = b.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  mouse(S, 'move', u[0], u[1]); await pause(60); mouse(S, 'down', u[0], u[1], { buttons: 1 }); await pause(40); mouse(S, 'up', u[0], u[1]); await pause(400);
  k = blk(); L = look();
  add('Quote: one Undo after leaving gives the Source back only', k.figcaption === T.undoAfterLeaving.figcaption && k.quote === T.undoAfterLeaving.quote && k.rows === T.undoAfterLeaving.rows && L.fields[1].value === 'Quote Source', `${JSON.stringify(k)} ${L.fields[1].value}`);
  await toEnd('Quote'); await key('Meta+a'); await key('Backspace', 400);
  k = blk();
  add('Quote: an empty Quote, 3 rows, as read', k.quote === T.quoteEmpty.quote && k.rows === T.quoteEmpty.rows, JSON.stringify(k));
  // Rows from the content (CAP-T12QUOTEROWS.json, refit 1, seen): up as it grows, down to whole rows as it shrinks.
  const QR = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12QUOTEROWS.json', import.meta.url))).reads;
  await toEnd('Source'); for (let n = 0; n < 5; n++) { await key('Enter', 60); await key('x', 200); }
  k = blk();
  add('Quote: Enter in Source is a plain newline, no rows', k.figcaption === `<figcaption class="source">${QR.sourceText.afterFiveEnters}</figcaption>` && k.rows === QR.sourceUp[4].rows, JSON.stringify(k));
  for (let n = 0; n < 10; n++) await key('Backspace', 60);
  await toEnd('Quote'); await key('A', 250);
  const up = [blk().rows];
  for (const ch of ['B', 'C', 'D']) { await key('Enter', 60); await key(ch, 300); up.push(blk().rows); }
  const down = [];
  for (let n = 0; n < 3; n++) { await key('Backspace', 60); await key('Backspace', 300); down.push(blk().rows); }
  const want = [QR.quoteA, ...QR.quoteUp].map((r) => r.rows).join() + ' ' + QR.quoteDown.map((r) => r.rows).join();
  add('Quote: rows grow 3,5,5,6 and shrink 4,4,4, as read (seen)', `${up.join()} ${down.join()}` === want, `${up.join()} ${down.join()} wants ${want}`);
  if (process.env.QUOTE_SHOT) screenshot(S, process.env.QUOTE_SHOT);
}

// Newsletter (CAP-T12NEWSLETTER.json): added at 10 columns by 8 rows, Edit; its panel's boxes; then each edit of the read in
// its order, by real presses and keys, and the block's boxes and rows after each.
{
  const NL = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12NEWSLETTER.json', import.meta.url)));
  const R = Object.fromEntries(NL.reads.map((r) => [r.step, r]));
  const NLP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12NLPOST.json', import.meta.url)));
  goto(S, `${BASE}/index.html`); await pause(1800);
  place('Newsletter', 10, 8);
  const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const p = document.getElementById('block-panel'), d = document.getElementById('site-frame').contentDocument; ${body} })()`);
  qs(`fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
  const blk = () => qs(`const b = fe.model.sections[1].blocks[0], el = d.querySelector('.fe-block[data-block-id="one"]'), Q = el.getBoundingClientRect(); return JSON.stringify({ rows: b.layout.desktop.area[2] - b.layout.desktop.area[0], boxes: [...el.querySelectorAll('h2, p, input, button, fieldset')].map((e) => { const q = e.getBoundingClientRect(); return [e.tagName, [q.left - Q.left, q.top - Q.top, q.width, q.height]]; }) });`);
  const same = (k, step) => k.rows === R[step].rows && k.boxes.length === R[step].boxes.length && k.boxes.every(([t, q], i) => t === R[step].boxes[i][0] && near(q, R[step].boxes[i][1], 0.6));
  const at = (sel) => qs(`const e = p.querySelector(${JSON.stringify(sel)}) || document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center' }); await sleep(50); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  const press = async (sel, w = 300) => { const c = at(sel); mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(w); };
  const key = async (k, w = 120) => { browser(S, 'press', k); await pause(w); };
  const empty = async (label) => { await press(`[data-content][aria-label="${label}"]`, 150); await key('Meta+a'); await key('Backspace', 300); };
  // The panel: tabs, and the fields' and rules' boxes as read (the row of each rule is the top of a 1px line).
  const L = qs(`const P0 = p.getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height]; }; return JSON.stringify({ tabs: [...p.querySelectorAll('[data-btab]')].map((t) => t.textContent), fields: ['Form Name', 'Title', 'Button Text'].map((l) => rel(p.querySelector('[aria-label="' + l + '"][data-content]'))), boxes: [...p.querySelectorAll('.bp-nl-box')].map(rel), rules: [...p.querySelectorAll('.bp-nl-name, .bp-nl-f, .bp-nl-row')].map((e) => { const r = rel(e); return r[1] + r[3] - 1; }) });`);
  add('Newsletter panel: Content, Design, Storage', L.tabs.join() === 'Content,Design,Storage', L.tabs.join());
  add('Newsletter panel: fields, boxes and rules as read', near(L.fields.flat(), [127, 120, 149, 44, 22, 214, 276, 44, 22, 626, 276, 44], 0.5) && near(L.boxes.flat(), [22, 308, 276, 110, 22, 467, 276, 110], 0.5) && near(L.rules, [164, 258, 670, 737, 804], 0.5), JSON.stringify(L));
  let k = blk();
  add('Newsletter: the block at add, as read', same(k, 'start'), JSON.stringify(k));
  // Show Name Field, Layout and Alignment: the rows follow the content up and down (refit 1, seen).
  const look = [];
  await press('input[data-nl-set="nlName"]'); look.push(['nameOn', blk()]);
  await press('input[data-nl-set="nlName"]'); look.push(['nameOff', blk()]);
  await press('[data-btab="Design"]');
  await press('button[aria-label="Stack"]'); look.push(['stack', blk()]);
  await press('button[aria-label="alignLeft"]'); look.push(['stackLeft', blk()]);
  await press('button[aria-label="Float"]'); look.push(['floatLeft', blk()]);
  await press('button[aria-label="alignRight"]'); look.push(['floatRight', blk()]);
  await press('button[aria-label="alignCenter"]'); look.push(['back', blk()]);
  const off = look.filter(([s, b]) => !same(b, s)).map(([s, b]) => `${s} ${b.rows}/${R[s].rows}`);
  add('Newsletter: Show Name Field, Layout, Alignment as read', !off.length, off.join(' '));
  // Title, Description, Disclaimer and Button Text by real keys.
  await press('[data-btab="Content"]');
  const typed = [];
  await empty('Title'); typed.push(['titleEmpty', blk()]);
  await key('H'); await key('i', 300); typed.push(['titleHi', blk()]);
  await empty('Description'); typed.push(['descEmpty', blk()]);
  for (const c of ['A', 'b', 'Enter', 'C', 'd']) await key(c);
  await pause(200); typed.push(['descTwo', blk()]);
  await empty('Disclaimer'); typed.push(['discEmpty', blk()]);
  await empty('Button Text'); typed.push(['btnEmpty', blk()]);
  await key('G'); await key('o', 300); typed.push(['btnGo', blk()]);
  const miss = typed.filter(([s, b]) => !same(b, s)).map(([s, b]) => `${s} ${b.rows}/${R[s].rows}`);
  add('Newsletter: typed Title, Description, Disclaimer, Button Text', !miss.length, miss.join(' '));
  if (process.env.NEWSLETTER_SHOT) screenshot(S, process.env.NEWSLETTER_SHOT);
  // CAP-T12NLPOST.json: the Form Name tip on hover, 11px above the ?; the rows names add; Post-Submit; the phone view.
  const help = at('.bp-nl-help');
  mouse(S, 'move', help[0], help[1]); await pause(150);
  const tip = qs(`const t = document.getElementById('bar-tip'), h = p.querySelector('.bp-nl-help').getBoundingClientRect(), r = t.getBoundingClientRect(); return JSON.stringify({ on: !t.hidden, text: t.textContent.slice(0, 26), box: [r.left - h.left, r.top - h.top, r.width, r.height] });`);
  mouse(S, 'move', help[0] - 200, help[1]); await pause(150);
  const gone = qs(`return JSON.stringify(document.getElementById('bar-tip').hidden);`);
  add('Newsletter: the Form Name tip shows on hover above the ?, as read, and goes', tip.on && tip.text === 'Use a descriptive name to ' && near(tip.box, [-149, -99, 320, 88], 0.6) && gone, JSON.stringify([tip, gone]));
  await press('input[data-nl-set="nlName"]');
  const rows = () => qs(`const P0 = p.getBoundingClientRect().top - p.scrollTop; return JSON.stringify([...p.querySelectorAll('.bp-nl-row')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), r.top - P0, r.height, e.querySelector('input')?.checked ?? null]; }));`);
  const nr = rows(), want = [['Show Name Field', 693, 45, true], ['Require First Name', 738, 45, false], ['Require Last Name', 783, 45, false], ['Post-Submit', 850, 45, null]];
  add('Newsletter: Show Name Field adds Require First and Last Name, off, at the rows read', nr.length === 4 && nr.every((r, i) => r[0] === want[i][0] && near([r[1], r[2]], [want[i][1], want[i][2]], 0.6) && r[3] === want[i][3]), JSON.stringify(nr));
  await press('input[data-nl-set="nlReqFirst"]');
  const req = qs(`const b = fe.model.sections[1].blocks[0]; return JSON.stringify(b.nlReqFirst === true);`);
  await press('#undo');
  const reqUndo = qs(`const b = fe.model.sections[1].blocks[0]; return JSON.stringify([!b.nlReqFirst, b.nlName === true]);`);
  add('Newsletter: Require First Name is one undo step', req && reqUndo.every(Boolean), JSON.stringify([req, reqUndo]));
  const rowsWas = blk().rows;
  await press('[data-ff="post"]');
  const pv = qs(`return JSON.stringify({ title: p.querySelector('.bp-ff-title')?.textContent, segs: [...p.querySelectorAll('.bp-ffp-seg')].map((e) => e.textContent), rows: p.querySelectorAll('.bp-ffp-row').length, html: !!p.querySelector('[data-ff-post="html"]'), msg: p.querySelector('[data-ff-post="message"]')?.textContent });`);
  await press('[data-ff="post-mode:redirect"]');
  const rd = qs(`const b = fe.model.sections[1].blocks[0]; return JSON.stringify({ redirect: b.post?.redirect === true, url: !!p.querySelector('.bp-ffp-link'), fields: b.fields === undefined });`);
  const rowsIn = blk().rows;
  await press('[data-ff="back"]');
  const backTo = qs(`return JSON.stringify(!!p.querySelector('.bp-nl-name') && p.querySelector('[data-btab].is-on')?.textContent);`);
  add('Newsletter: Post-Submit is the form view titled Post-Submit, without Alignment and Position; Back to Content', pv.title === 'Post-Submit' && pv.segs.join() === 'Message,Redirect' && pv.rows === 0 && pv.html && pv.msg === 'Thank you!' && rd.redirect && rd.url && rd.fields && rowsIn === rowsWas && backTo === 'Content', JSON.stringify({ pv, rd, rowsWas, rowsIn, backTo }));
  // The phone view of a new Newsletter with names: each field on its own line, the disclaimer at Small text's size (14.92px).
  qs(`const next = JSON.parse(JSON.stringify(fe.model)), b = next.sections[1].blocks[0]; for (const k of ['nlTitle', 'nlDesc', 'nlDisc', 'nlButton']) delete b[k]; b.nlName = true; fe.load(next); await sleep(350); fe.setBp('mobile'); await sleep(400); return 'true';`);
  const ph = qs(`const el = d.querySelector('.fe-block[data-block-id="one"]'), Q = el.getBoundingClientRect(), r = (s) => { const q = el.querySelector(s).getBoundingClientRect(); return [q.left - Q.left, q.top - Q.top, q.width, q.height]; }; return JSON.stringify({ boxes: ['fieldset', '.first-name', '.last-name', '.form-item.email', '.submit-wrapper', '.newsletter-form-footnote p'].map(r), font: getComputedStyle(el.querySelector('.newsletter-form-footnote p')).fontSize });`);
  qs(`fe.setBp('desktop'); await sleep(200); return 'true';`);
  const PH = NLP.phone.names.boxes;
  // CAP-T12READS-D.json: Stack with names, and an empty line in Description. Boxes from the block, as read.
  const ND = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12READS-D.json', import.meta.url))).newsletter;
  const TAGS = ['H2', 'P', 'FIELDSET', 'INPUT', 'BUTTON'];
  const readBoxes = (tree) => tree.map((l) => l.trim().split(' | ')).filter((c) => TAGS.includes(c[0])).map((c) => [c[0], c[5].split(',').map(Number)]);
  const ourBoxes = () => qs(`const b = fe.model.sections[1].blocks[0], el = d.querySelector('.fe-block[data-block-id="one"]'), Q = el.getBoundingClientRect(); return JSON.stringify({ rows: b.layout.desktop.area[2] - b.layout.desktop.area[0], boxes: [...el.querySelectorAll('${TAGS.join(', ').toLowerCase()}')].map((e) => { const q = e.getBoundingClientRect(); return [e.tagName, [q.left - Q.left, q.top - Q.top, q.width, q.height]]; }) });`);
  const sameBoxes = (k, want) => k.boxes.length === want.length && k.boxes.every(([t, q], i) => t === want[i][0] && near(q, want[i][1], 0.6));
  const fresh = (extra) => qs(`const next = JSON.parse(JSON.stringify(fe.model)), b = next.sections[1].blocks[0]; for (const k of Object.keys(b)) if (k.startsWith('nl') || k === 'post') delete b[k]; Object.assign(b, ${JSON.stringify(extra)}); b.layout.desktop.area = [b.layout.desktop.area[0], b.layout.desktop.area[1], b.layout.desktop.area[0] + ${extra.rows}, b.layout.desktop.area[3]]; delete b.rows; fe.load(next); await sleep(350); fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
  fresh({ nlName: true, rows: ND.stackNames.names.rows });
  await press('[data-btab="Design"]'); await press('button[aria-label="Stack"]');
  const sn = ourBoxes();
  add('Newsletter: Stack with names, the boxes as read', sameBoxes(sn, readBoxes(ND.stackNames.stack.tree)), JSON.stringify(sn));
  // A named miss: the frozen rows rule floors 12.92 to 12 when content shrinks; the oracle keeps 13. No refit fits it and
  // Quote's 6 to 4 at 4.93 (CAP-T12QUOTEROWS.json).
  add('Newsletter: Stack with names, rows as read (named miss)', sn.rows === ND.stackNames.stack.rows, `${sn.rows}/${ND.stackNames.stack.rows}`);
  fresh({ rows: 7 });
  await press('[data-btab="Content"]'); await press('[data-content][aria-label="Description"]', 150); await key('Meta+ArrowDown');
  for (const c of ['Enter', 'Enter', 'Z', 'q']) await key(c);
  await key('Tab', 400);
  const el = ourBoxes();
  add('Newsletter: an empty line in Description is one line tall, rows as read', sameBoxes(el, readBoxes(ND.emptyLine.read.tree)) && el.rows === ND.emptyLine.read.rows, JSON.stringify(el));
  add('Newsletter, phone: the names stack, the button below, the disclaimer at 14.92px, as read', near(ph.boxes.flat(), [PH.fieldset, PH.first, PH.last, PH.email, PH.button, PH.disclaimer].flat(), 0.6) && ph.font === '14.92px', JSON.stringify(ph));
}
// The plain stand-ins' panels (standin-panels.js) against CAP-T12PANELS-A.json to -C.json: every label of each tab at
// the read's place, from the tab row (the read's panel box sits 2px lower); then each in-scope row by a real press
// keeps its value, is one undo step, and leaves the tile's rows alone (CAP-T12PRESS-D.json: none changed the rows).
{
  const PANELS = Object.assign({}, ...['A', 'B', 'C'].map((l) => JSON.parse(readFileSync(new URL(`../parity/findings/CAP-T12PANELS-${l}.json`, import.meta.url))).blocks));
  const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const p = document.getElementById('block-panel'); ${body} })()`);
  const at = (sel) => qs(`const e = p.querySelector(${JSON.stringify(sel)}) || document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center' }); await sleep(50); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  const press = async (sel, w = 300) => { const c = at(sel); mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(w); };
  const key = async (k, w = 120) => { browser(S, 'press', k); await pause(w); };
  const state = () => qs(`const b = fe.model.sections[1].blocks[0]; return JSON.stringify({ sp: b.sp || {}, area: b.layout.desktop.area });`);
  const labels = () => qs(`p.querySelector('.sp-body').scrollTop = 0; await sleep(50); const P0 = p.getBoundingClientRect(); return JSON.stringify([...p.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); }).map((e) => { const r = e.getBoundingClientRect(); return [e.innerText.replace(/\\s+/g, ' ').trim(), r.left - P0.left, r.top - P0.top + r.height / 2]; }));`);
  for (const [name, span, rows] of [['Zola', 8, 16], ['Search Field', 8, 8], ['Donation', 6, 15]]) {
    const R0 = PANELS[name];
    qs(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.rows = { desktop: 40, mobile: 40 }; s.blocks = [{ id: 'one', type: 'shape', fill: '#d9d4ca', radius: '0', label: ${JSON.stringify(name)}, layout: { desktop: { area: [1, 2, ${1 + rows}, ${2 + span}], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, ${1 + rows}, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]; fe.load(next); await sleep(350); fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
    const first = qs(`return JSON.stringify([...p.querySelectorAll('[data-btab]')].map((t) => [t.textContent, t.classList.contains('is-on')]));`);
    add(`${name} panel: tabs as read, opens on Content`, JSON.stringify(first.map(([t]) => t)) === JSON.stringify(R0.tabs) && first[0][1], JSON.stringify(first));
    for (const tab of R0.tabs.filter((t) => t !== 'Animation')) {
      await press(`[data-btab="${tab}"]`);
      // Centres: the read's boxes and ours differ in height. x only for left-set labels: centred and right-set words move
      // with the panel font. Tab names are the shared tab row's. Donation's Design rows are out (0005): only its note.
      const ours = labels(), want = R0.panel[tab][0].text.map((t) => { const m = t.match(/^([\s\S]*) @(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/); return [m[1].replace(/\s+/g, ' ').trim(), +m[2], +m[3] + +m[5] / 2]; })
        .filter(([t]) => !R0.tabs.includes(t) && (name !== 'Donation' || tab !== 'Design' || t.startsWith('Form style')));
      const same = (o, t) => o.toLowerCase() === t.toLowerCase() || (t.length > 60 && o.startsWith(t));
      const miss = want.filter(([t, x, y]) => !ours.some(([o, ox, oy]) => same(o, t) && (x > 60 || Math.abs(ox - x) <= 1.5) && Math.abs(oy - y) <= 1.5)).map(([t, x, y]) => `${t.slice(0, 24)}@${x},${y} ours ${JSON.stringify(ours.filter(([o]) => same(o, t)).map(([, ox, oy]) => [+ox.toFixed(1), +oy.toFixed(1)]))}`);
      add(`${name} panel, ${tab}: every label at its read place`, !miss.length, miss.join(' | '));
    }
  }
  // Presses, on the last block placed and then the others.
  const placeAndEdit = (name, span, rows) => qs(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.blocks = [{ id: 'one', type: 'shape', fill: '#d9d4ca', radius: '0', label: ${JSON.stringify(name)}, layout: { desktop: { area: [1, 2, ${1 + rows}, ${2 + span}], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, ${1 + rows}, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]; fe.load(next); await sleep(350); fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
  const undoOnce = async () => { await press('#undo', 300); };
  placeAndEdit('Zola', 8, 16);
  await press('input[data-sp-field="zolaItems"]', 150); await key('Meta+a'); await key('7'); await key('Tab', 400);
  let z = state(); await undoOnce(); const zu = state();
  await press('input[data-sp-field="zolaItems"]', 150); await key('Meta+a'); await key('4'); await key('0'); await key('Tab', 400);
  const zmax = state();
  await press('[data-btab="Design"]'); await press('input[data-sp-set="zolaPad"]');
  const zp = state();
  add('Zola: Items to Display keeps 7, one undo step, up to 12; Add Padding keeps on; rows stay', z.sp.zolaItems === 7 && zu.sp.zolaItems === undefined && zmax.sp.zolaItems === 12 && zp.sp.zolaPad === true && zp.area[2] === 17, JSON.stringify({ z, zu, zmax, zp }));
  add('Zola: Registry Name is faded and takes nothing', qs(`return JSON.stringify((() => { const e = [...p.querySelectorAll('input')].find((i) => i.getAttribute('aria-label') === 'Registry Name'); return !e || e.disabled; })());`), '');
  placeAndEdit('Search Field', 8, 8);
  await press('input[data-sp-set="sfPage"]');
  await press('[data-btab="Design"]'); await press('button[data-sp-set="sfTheme"][data-v="light"]'); await press('input[data-sp-set="sfPreview"]');
  const sf = state(), on = qs(`return JSON.stringify(p.querySelector('button[data-sp-set="sfTheme"].is-on')?.textContent);`);
  await undoOnce(); const sfu = state();
  add('Search Field: Search specific page, Theme Light, Quick preview off keep their values; one undo each; rows stay', sf.sp.sfPage === true && sf.sp.sfTheme === 'light' && on === 'Light' && sf.sp.sfPreview === false && sfu.sp.sfPreview === undefined && sfu.sp.sfTheme === 'light' && sf.area[2] === 9, JSON.stringify({ sf, on, sfu }));
  placeAndEdit('Donation', 6, 15);
  await press('input[data-sp-field="donButton"]', 150); await key('Meta+a'); await key('G'); await key('o'); await key('Tab', 400);
  const dn = state();
  add('Donation: Button Text keeps Go; payment and Funds rows are faded; rows stay', dn.sp.donButton === 'Go' && dn.area[2] === 16 && qs(`return JSON.stringify([...p.querySelectorAll('.bp-sp-card, .bp-sp-nav')].every((e) => e.disabled));`), JSON.stringify(dn));
  if (process.env.SP_SHOT) screenshot(S, process.env.SP_SHOT);
}
writeFileSync(new URL('../parity/standin-check.json', import.meta.url), `${JSON.stringify({ check: 'content that follows the width', pass, total, results }, null, 1)}\n`);
console.log(`Stand-ins: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
