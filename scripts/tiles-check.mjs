// T12: what the plain stand-in tiles draw inside (app/src/standin-tiles.js). Each run of the oracle's press reads is played
// again by real presses on the tile's panel, and the tile's boxes are compared with the leaf boxes read after each press
// (parity/findings/CAP-T12PRESS-A.json to -E.json). Writes parity/tiles-check.json. FLUID_SURFACE=cdp:<port> npm run tiles-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const read = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}.json`, import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(60)} ${ok ? 'match' : `DIFF ${detail}`}`); };

ensureVisible(S);
viewport(S, 1600, 1400);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const p = document.getElementById('block-panel'); ${body} })()`);
const press = async (sel, w = 300) => {
  const c = qs(`const e = p.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center' }); await sleep(50); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(w);
};
const pick = (key, v) => qs(`const s = p.querySelector('select[data-sp-set="${key}"]'); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
// A new tile of the type at a span and rows, its panel open on Content.
const placeAndEdit = (name, span, rows) => qs(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.rows = { desktop: 40, mobile: 40 }; s.blocks = [{ id: 'one', type: 'shape', fill: '#d9d4ca', radius: '0', label: ${JSON.stringify(name)}, layout: { desktop: { area: [1, 2, ${1 + rows}, ${2 + span}], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, ${1 + rows}, 10], z: 1, justify: 'flex-start', align: 'flex-start' } } }]; fe.load(next); await sleep(350); fe.select(${JSON.stringify(sid)}, 'one'); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
// Our boxes, from the block's top left, for each selector the map names.
const ours = (sels) => qs(`const d = document.getElementById('site-frame').contentDocument, b = d.getElementById('block-one').closest('.fe-block'), q = b.getBoundingClientRect(); return JSON.stringify(Object.fromEntries(${JSON.stringify(sels)}.map((s) => [s, [...b.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height]; }).filter((r) => r[2] || r[3])])));`);
// A read leaf: "TAG | class | text | ... | x,y,w,h | font | color | background".
const leaf = (l) => { const f = l.split(' | '); return { tag: f[0].trim(), cls: f[1].trim(), text: f[2], box: f[4].split(',').map(Number) }; };
// Fields compared: a box (x, y, w, h), or a centre where the box is the font's (cx, cy), within 1.5px.
// wb: the width, left out only where both boxes are a word's (100 or under, they follow the font).
const FIELDS = { x: (b) => b[0], y: (b) => b[1], w: (b) => b[2], wb: (b) => b[2], h: (b) => b[3], cx: (b) => b[0] + b[2] / 2, cy: (b) => b[1] + b[3] / 2 };
const compare = (map, leaves, got) => {
  const miss = [];
  for (const [test, sel, fields] of map) {
    const want = leaves.map(leaf).filter(test), have = got[sel];
    if (want.length !== have.length) { miss.push(`${sel}: ${have.length} for ${want.length}`); continue; }
    want.forEach((w, i) => { const bad = fields.filter((k) => !(k === 'wb' && w.box[2] <= 100 && have[i][2] <= 100) && Math.abs(FIELDS[k](w.box) - FIELDS[k](have[i])) > 1.5); if (bad.length) miss.push(`${sel}[${i}] ${bad.join('')}: ${have[i].map((v) => v.toFixed(1))} read ${w.box}`); });
  }
  return miss;
};
const by = (cls, tag) => (l) => (cls == null || l.cls.startsWith(cls)) && (!tag || l.tag === tag);

// Product (CAP-T12PRESS-A.json at 6 columns, -E.json pulled to 3): the title's width and the description's height follow
// the font and the description's unread text, so they are left out; the words are compared by their centres. Not compared:
// the paths inside the icon and buttons (ours are our own), the quantity's 4px highlight (clear) and the editor's overlays.
const PRODUCT = [
  [by('product-block-action-menu', 'svg'), '.product-add-icon', ['x', 'y', 'w', 'h']],
  [by('fs-unmask', 'SPAN'), '.product-add-text', ['cx', 'cy']],
  [by('product-title'), '.product-title', ['x', 'y', 'h']],
  [by('product-price'), '.product-price', ['x', 'y', 'w', 'h']],
  [by('', 'P'), '.product-excerpt p', ['x', 'y', 'w']],
  [by('form-input-effects-border'), '.product-quantity', ['x', 'y', 'w', 'h']],
  [by('decrease-button'), '.decrease-button', ['x', 'y', 'w', 'h']],
  [by('', 'INPUT'), '.product-quantity input', ['x', 'y', 'w', 'h']],
  [by('increase-button'), '.increase-button', ['x', 'y', 'w', 'h']],
  [by('sqs-add-to-cart-button'), '.sqs-add-to-cart-button', ['x', 'y', 'w', 'h']],
  [by('add-to-cart-text'), '.add-to-cart-text', ['cx', 'cy']],
];
const PRODUCT_KEYS = { Image: 'pdImage', Title: 'pdTitle', Price: 'pdPrice', Description: 'pdDesc', 'Add to Cart Button': 'pdCart', 'Product Quick View': 'pdQuick' };
// Menu (CAP-T12PRESS-C.json at 12 columns; the default's boxes the same in CAP-T12PANELS-B.json and CAP-T12READS-E.json): the
// menu names' widths follow the font, so only their line is compared. The price's number is a text node, not a leaf.
const MENU = [
  [by('menu-select-labels', 'LABEL'), '.menu-select-labels', ['y', 'h']],
  [by('menu-section-title'), '.menu-section-title', ['x', 'y', 'w', 'h']],
  [by('menu-item-title'), '.menu-item-title', ['x', 'y', 'w', 'h']],
  [by('menu-item-description'), '.menu-item-description', ['x', 'y', 'w', 'h']],
  [by('currency-sign'), '.currency-sign', ['x', 'y', 'w', 'h']],
];
// Archive (CAP-T12PRESS-B.json at 8 columns): a name with its count is no leaf in the read, so ours is taken without one; the
// count is compared by its line. Not drawn: the status box (its title is a leaf in the read, its look is not read).
const ARCHIVE_MAP = [
  [by('archive-group-name-link', 'A'), '.archive-group-name-link:not(:has(.archive-group-count))', ['x', 'y', 'wb', 'h']],
  [by('archive-group-count'), '.archive-group-count', ['y', 'h']],
  [by('archive-item-link'), '.archive-item-link', ['x', 'y', 'w', 'h']],
  [by('archive-item-date-after'), '.archive-item-date-after', ['x', 'y', 'w', 'h']],
];
const RUNS = [
  { name: 'Product at 6 columns', file: 'CAP-T12PRESS-A', block: 'Product', span: 6, rows: 10, map: PRODUCT },
  { name: 'Product at 3 columns', file: 'CAP-T12PRESS-E', block: 'Product', span: 3, rows: 10, map: PRODUCT },
  { name: 'Menu at 12 columns', file: 'CAP-T12PRESS-C', block: 'Menu', span: 12, rows: 28, map: MENU },
  { name: 'Archive at 8 columns', file: 'CAP-T12PRESS-B', block: 'Archive', span: 8, rows: 21, map: ARCHIVE_MAP },
];
// A step of the read, pressed on our panel: a switch by its key, a menu by its value.
const act = async (block, step, tab) => {
  if (step.tab !== tab.now) { await press(`[data-btab="${step.tab}"]`); tab.now = step.tab; }
  if (block === 'Product' && step.sw) return press(`input[data-sp-set="${PRODUCT_KEYS[step.sw]}"]`);
  if (block === 'Product' && step.menu) return pick('pdRatio', step.pick);
  // The menu's text as typed and left (one change); Layout and Currency Symbol by their menus.
  if (block === 'Menu' && step.type) return qs(`const t = p.querySelector('textarea[data-sp-field="mnText"]'); t.focus(); t.value = ${JSON.stringify(step.value)}; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); t.blur(); await sleep(300); return 'true';`);
  if (block === 'Menu' && step.menu) return pick(step.menu === 'Multi-Column' ? 'mnLayout' : 'mnCurrency', step.pick);
  if (block === 'Archive' && step.sw) return press(step.sw === 'Dates ascending' ? 'input[aria-label="Dates ascending"]' : `input[data-sp-set="${step.sw === 'Item date' ? 'arDate' : 'arCount'}"]`);
  if (block === 'Archive' && step.radio) return press(`button[data-sp-set="${step.radio === 'Columns' ? 'arColumns' : 'arAlign'}"][data-v="${step.value}"]`);
  if (block === 'Archive' && step.menu) return pick(step.menu === 'Month' ? 'arGroup' : 'arLayout', step.pick);
  throw new Error(`no press for ${JSON.stringify(step)}`);
};

for (const run of RUNS) {
  const R = read(run.file).blocks[run.block], sels = run.map.map(([, s]) => s);
  placeAndEdit(run.block, run.span, run.rows);
  const tab = { now: 'Content' };
  let miss = compare(run.map, R.start.leaves, ours(sels));
  add(`${run.name}: as added`, !miss.length, miss.join(' | '));
  for (const [i, s] of R.steps.entries()) {
    await act(run.block, { ...s.step, pick: s.note?.pick }, tab);
    miss = compare(run.map, s.after.leaves, ours(sels));
    const what = s.step.sw ? `${s.step.sw} ${s.note.now ? 'on' : 'off'}` : s.step.type ? `${s.step.type} typed` : s.step.radio ? `${s.step.radio} ${s.step.value}` : `${s.step.menu} ${s.note.pick}`;
    add(`${run.name}, step ${i + 1}: ${what}`, !miss.length, miss.join(' | '));
  }
}

// A second run (CAP-ROWSMENU.json, the default text): the first section's items 276.8 high in two columns, 395.2 when Centered.
placeAndEdit('Menu', 12, 28);
const items = () => qs(`const e = document.getElementById('site-frame').contentDocument.querySelector('#block-one .menu-items'); return JSON.stringify(e && Math.round(e.getBoundingClientRect().height * 10) / 10);`);
const cols = items(); await press('[data-btab="Design"]'); pick('mnLayout', 'Centered'); const centred = items();
add('Menu: the first section 276.8 high in two columns, 395.2 Centered', cols != null && Math.abs(cols - 276.8) <= 1.5 && centred != null && Math.abs(centred - 395.2) <= 1.5, JSON.stringify({ cols, centred }));

// A second run (CAP-ROWSARCHIVE.json, by Year, List): Alignment centre puts each name at its column's middle (99.8 of 199.6);
// Columns off makes one column, the groups 459.3 wide.
placeAndEdit('Archive', 8, 21);
pick('arGroup', 'Year'); await press('[data-btab="Design"]'); pick('arLayout', 'List'); await press('button[data-sp-set="arAlign"][data-v="center"]');
const arBox = (sel) => qs(`const d = document.getElementById('site-frame').contentDocument, b = d.getElementById('block-one'), e = b && b.querySelector(${JSON.stringify(sel)}); if (!e) return 'null'; const q = b.getBoundingClientRect(), r = e.getBoundingClientRect(); return JSON.stringify([r.left - q.left, r.width]);`);
const named = arBox('.archive-group-name-link'); await press('button[data-sp-set="arColumns"][data-v="false"]'); const one = arBox('.archive-group');
add('Archive by Year in List: a name centred in its column; Columns off, one column', named != null && Math.abs(named[0] + named[1] / 2 - 99.8) <= 1.5 && one != null && Math.abs(one[1] - 459.3) <= 1.5, JSON.stringify({ named, one }));

// Undo and Redo take the drawing back and forth with the value.
placeAndEdit('Product', 6, 10);
await press('input[data-sp-set="pdImage"]');
const image = () => qs(`return JSON.stringify(!!document.getElementById('site-frame').contentDocument.querySelector('#block-one .product-image'));`);
const off = image(); qs(`document.getElementById('undo').click(); await sleep(400); return '1';`); const back = image(); qs(`document.getElementById('redo').click(); await sleep(400); return '1';`);
add('Product: Image off, Undo draws it again, Redo takes it away', !off && back && !image(), JSON.stringify({ off, back }));

// A tile in a Stack is a Shape child (S3.json): a Product stacked with a Text by Shift+S, then H typed Hug is 150 tall and
// W typed Hug 300 wide, as the plain stand-in was before it drew its content (#609 took the Shape class off it: 20 by 20).
qs(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1], at = (a) => ({ area: a, z: 1, justify: 'flex-start', align: 'flex-start' }); s.rows = { desktop: 40, mobile: 40 }; s.blocks = [{ id: 't', type: 'text', html: '<p>one</p>', layout: { desktop: at([1, 2, 3, 8]), mobile: at([1, 2, 3, 10]) } }, { id: 'one', type: 'shape', fill: '#d9d4ca', radius: '0', label: 'Product', layout: { desktop: at([4, 2, 12, 8]), mobile: at([4, 2, 12, 10]) } }]; fe.load(next); await sleep(350);
  const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, e = d.querySelector('.fe-block[data-block-id="one"]'), r = e.getBoundingClientRect(), o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true, shiftKey: true };
  fe.select(null); await sleep(40); fe.select(${JSON.stringify(sid)}, 't'); await sleep(60); e.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 })); await sleep(80);
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', shiftKey: true, bubbles: true, cancelable: true })); await sleep(300);
  fe.select(${JSON.stringify(sid)}, 'one'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
const kidBox = () => qs(`const st = fe.model.sections[1].blocks.find((b) => b.type === 'stack'), e = st && document.getElementById('site-frame').contentDocument.getElementById('block-' + st.id + '-one'), c = e && e.closest('.stack-child-container'); if (!c) return 'null'; const r = c.getBoundingClientRect(); return JSON.stringify({ kids: st.children.map((k) => k.id), cls: e.className, size: st.children.find((k) => k.id === 'one').size, w: Math.round(r.width), h: Math.round(r.height) });`);
await press('[data-btab="Design"]');
const typeSize = (axis) => qs(`const i = p.querySelector('input[data-stack-field="k${axis}"]'); if (!i) return 'false'; i.value = 'Hug'; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
const hTyped = typeSize('h'), hHug = kidBox(), wTyped = typeSize('w'), both = kidBox();
add('Product stacked with a Text: H Hug 150 tall, then W Hug 300 wide', hTyped && wTyped && hHug?.kids.join() === 't,one' && /\bfe-drawn-tile\b/.test(hHug.cls) && hHug.size?.h === 'Hug' && hHug.h === 150 && both?.h === 150 && both.w === 300 && JSON.stringify(both.size) === '{"h":"Hug","w":"Hug"}', JSON.stringify({ hHug, both }));

writeFileSync(new URL('../parity/tiles-check.json', import.meta.url), `${JSON.stringify({ check: 'what the plain stand-in tiles draw', pass, total, results }, null, 1)}\n`);
console.log(`Tiles: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
