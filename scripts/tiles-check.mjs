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
const FIELDS = { x: (b) => b[0], y: (b) => b[1], w: (b) => b[2], h: (b) => b[3], cx: (b) => b[0] + b[2] / 2, cy: (b) => b[1] + b[3] / 2 };
const compare = (map, leaves, got) => {
  const miss = [];
  for (const [test, sel, fields] of map) {
    const want = leaves.map(leaf).filter(test), have = got[sel];
    if (want.length !== have.length) { miss.push(`${sel}: ${have.length} for ${want.length}`); continue; }
    want.forEach((w, i) => { const bad = fields.filter((k) => Math.abs(FIELDS[k](w.box) - FIELDS[k](have[i])) > 1.5); if (bad.length) miss.push(`${sel}[${i}] ${bad.join('')}: ${have[i].map((v) => v.toFixed(1))} read ${w.box}`); });
  }
  return miss;
};
const by = (cls, tag) => (l) => (cls == null || l.cls.startsWith(cls)) && (!tag || l.tag === tag);

// Product (CAP-T12PRESS-A.json at 6 columns, -E.json pulled to 3): the title's width and the description's height follow
// the font and the description's unread text, so they are left out; the words are compared by their centres.
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
const RUNS = [
  { name: 'Product at 6 columns', file: 'CAP-T12PRESS-A', block: 'Product', span: 6, rows: 10, map: PRODUCT },
  { name: 'Product at 3 columns', file: 'CAP-T12PRESS-E', block: 'Product', span: 3, rows: 10, map: PRODUCT },
];
// A step of the read, pressed on our panel: a switch by its key, a menu by its value.
const act = async (block, step, tab) => {
  if (step.tab !== tab.now) { await press(`[data-btab="${step.tab}"]`); tab.now = step.tab; }
  if (block === 'Product' && step.sw) return press(`input[data-sp-set="${PRODUCT_KEYS[step.sw]}"]`);
  if (block === 'Product' && step.menu) return pick('pdRatio', step.pick);
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
    const what = s.step.sw ? `${s.step.sw} ${s.note.now ? 'on' : 'off'}` : `${s.step.menu} ${s.note.pick}`;
    add(`${run.name}, step ${i + 1}: ${what}`, !miss.length, miss.join(' | '));
  }
}

// Undo and Redo take the drawing back and forth with the value.
placeAndEdit('Product', 6, 10);
await press('input[data-sp-set="pdImage"]');
const image = () => qs(`return JSON.stringify(!!document.getElementById('site-frame').contentDocument.querySelector('#block-one .product-image'));`);
const off = image(); qs(`document.getElementById('undo').click(); await sleep(400); return '1';`); const back = image(); qs(`document.getElementById('redo').click(); await sleep(400); return '1';`);
add('Product: Image off, Undo draws it again, Redo takes it away', !off && back && !image(), JSON.stringify({ off, back }));

writeFileSync(new URL('../parity/tiles-check.json', import.meta.url), `${JSON.stringify({ check: 'what the plain stand-in tiles draw', pass, total, results }, null, 1)}\n`);
console.log(`Tiles: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
