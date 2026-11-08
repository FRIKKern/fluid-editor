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
  add('Quote: an empty Source takes the figcaption, 9 rows', k.figcaption === T.sourceEmpty.figcaption && k.rows === T.sourceEmpty.rows, JSON.stringify(k));
  qs(`document.activeElement.blur(); await sleep(250); return 'true';`);
  const u = qs(`const b = document.getElementById('undo'), r = b.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  mouse(S, 'move', u[0], u[1]); await pause(60); mouse(S, 'down', u[0], u[1], { buttons: 1 }); await pause(40); mouse(S, 'up', u[0], u[1]); await pause(400);
  k = blk(); L = look();
  add('Quote: one Undo after leaving gives the Source back only', k.figcaption === T.undoAfterLeaving.figcaption && k.quote === T.undoAfterLeaving.quote && k.rows === T.undoAfterLeaving.rows && L.fields[1].value === 'Quote Source', `${JSON.stringify(k)} ${L.fields[1].value}`);
  await toEnd('Quote'); await key('Meta+a'); await key('Backspace', 400);
  k = blk();
  add('Quote: an empty Quote, 3 rows, as read', k.quote === T.quoteEmpty.quote && k.rows === T.quoteEmpty.rows, JSON.stringify(k));
  if (process.env.QUOTE_SHOT) screenshot(S, process.env.QUOTE_SHOT);
}
writeFileSync(new URL('../parity/standin-check.json', import.meta.url), `${JSON.stringify({ check: 'content that follows the width', pass, total, results }, null, 1)}\n`);
console.log(`Stand-ins: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
