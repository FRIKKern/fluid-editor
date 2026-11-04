// T4: press Fit, Fill and Shape in our image block's Edit > Design tab and compare where the
// picture sits with the rule measured on the oracle (parity/findings/IMAGEMODES.json), within
// 1px, and that the block keeps its size. Our block has its own size, so the rule is applied to each side's block: it is first
// checked on the oracle's numbers, then on ours. Also checks the pressed button and undo.
// Writes parity/image-check.json. Usage: npm run image-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEMODES.json', import.meta.url)));
const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1);
// Where a picture of aspect a sits in a block W by H: as large as fits, centred. [left, top, width, height].
const contain = (W, H, a) => { const w = Math.min(W, H * a); const h = w / a; return [(W - w) / 2, (H - h) / 2, w, h]; };
const RULE = {
  Fit: (W, H, a = F.aspect) => contain(W, H, a),
  Fill: (W, H) => [0, 0, W, H],
  Shape: (W, H) => contain(W, H, 1),
};

let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(28)} ${ok ? 'match' : `DIFF ${detail}`}`); };

for (const [mode, rule] of Object.entries(RULE)) {
  const o = F[mode];
  add(`${mode} rule on the oracle`, near(o.container, rule(o.block[2], o.block[3])), `oracle ${o.container}, rule ${rule(o.block[2], o.block[3])}`);
}

// The shape and Fit images found on the oracle's pages, wide and tall blocks alike. A sample the
// finding marks unexplained is not counted.
for (const x of F.samples.filter((y) => !y.unexplained)) add(`sample ${x.block.join('x')}`, near(x.box, contain(x.block[0], x.block[1], x.aspect)), `oracle ${x.box}, rule ${contain(x.block[0], x.block[1], x.aspect)}`);

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

// Turn the first plain block of section 1 into an image; the panel needs one to act on.
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const b = s.blocks.find((x) => x.type === 'text'); const keep = { id: b.id, layout: b.layout }; for (const k of Object.keys(b)) delete b[k]; Object.assign(b, keep, { type: 'image', alt: '', aspect: ${F.aspect} }); fe.load(next); await sleep(400); fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(250); document.querySelector('#block-panel [data-btab="Design"]').click(); await sleep(100); return JSON.stringify(b.id); })()`);
const press = (mode) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const d = document.getElementById('site-frame').contentDocument; const btn = document.querySelector('#block-panel button[aria-label="${mode}"]'); if (!btn) return JSON.stringify(null); btn.click(); await sleep(300);
  const fb = d.querySelector('.fe-block[data-block-id="${id}"]'); const q = fb.getBoundingClientRect(); const c = fb.querySelector('.fluid-image-container').getBoundingClientRect();
  return JSON.stringify({ block: [q.width, q.height], box: [c.left - q.left, c.top - q.top, c.width, c.height], on: [...document.querySelectorAll('#block-panel [data-image-mode]')].filter((x) => x.getAttribute('aria-checked') === 'true').map((x) => x.getAttribute('aria-label')), clip: d.defaultView.getComputedStyle(fb.querySelector('.fluid-image-container')).clipPath }); })()`);

const start = press('Fill');
for (const mode of ['Fit', 'Shape', 'Fill']) {
  const r = press(mode);
  if (!r) { add(`${mode} button`, false, 'no button in the panel'); continue; }
  const want = RULE[mode](r.block[0], r.block[1]);
  add(`${mode} box`, near(r.box, want), `ours ${r.box.map((v) => v.toFixed(1))}, rule ${want.map((v) => v.toFixed(1))}`);
  add(`${mode} keeps the block size`, near(r.block, start.block), `block ${r.block}, was ${start.block}`);
  add(`${mode} pressed`, r.on.length === 1 && r.on[0] === mode, `pressed ${r.on}`);
  add(`${mode} clip`, (mode === 'Shape') === (r.clip !== 'none'), `clip ${r.clip}`);
}

// Fill is the default, so pressing Fit once and undoing must bring Fill back in one step.
press('Fit');
const undone = evalJs(S, `(async () => { const before = JSON.stringify(fe.model); document.getElementById('undo')?.click(); await new Promise((res) => setTimeout(res, 300)); const b = fe.model.sections[1].blocks.find((x) => x.id === ${JSON.stringify(id)}); return JSON.stringify({ changed: before !== JSON.stringify(fe.model), mode: b.mode || 'fill' }); })()`);
add('Undo is one step', undone.changed && undone.mode === 'fill', JSON.stringify(undone));

// Content tab (labels from IMAGEMODES.json contentTab): Replace with a picture from this computer,
// a generated 400 by 200 red one, which keeps its aspect in Fit; Link, alt text and Remove. Each
// is one undo step. Nothing here touches the oracle.
const content = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const d = document.getElementById('site-frame').contentDocument; const fb = () => d.querySelector('.fe-block[data-block-id="${id}"]'); const model = () => fe.model.sections[1].blocks.find((x) => x.id === ${JSON.stringify(id)}); const P = document.getElementById('block-panel'); const out = {};
  P.querySelector('[data-btab="Content"]').click(); await sleep(150);
  out.labels = [...P.querySelectorAll('.bp-pic-actions button, .bp-flabel')].map((x) => x.textContent);
  const c = document.createElement('canvas'); c.width = 400; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#d00'; g.fillRect(0, 0, 400, 200);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'red.png', { type: 'image/png' }));
  const inp = P.querySelector('[data-image-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); await sleep(500);
  const img = fb().querySelector('.fluid-image-container img'); out.aspect = model().aspect; out.picture = !!img && img.naturalWidth === 400 && img.naturalHeight === 200; out.fill = img && d.defaultView.getComputedStyle(img).objectFit;
  P.querySelector('[data-btab="Design"]').click(); await sleep(100); P.querySelector('[data-image-mode="fit"]').click(); await sleep(200); out.fit = d.defaultView.getComputedStyle(fb().querySelector('.fluid-image-container img')).objectFit; const q = fb().querySelector('.fluid-image-container').getBoundingClientRect(); out.fitAspect = q.width / q.height; document.getElementById('undo').click(); await sleep(200);
  document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(150); P.querySelector('[data-btab="Content"]').click(); await sleep(150);
  const a = P.querySelector('input[data-content="alt"]'); a.value = 'A red picture'; a.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); out.alt = fb().querySelector('.fluid-image-container img').alt;
  P.querySelector('[data-link="open"]').click(); await sleep(150); const lk = document.querySelector('#link-popover .lk-input'); lk.value = '/services'; lk.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(200); out.href = fb().querySelector('a.sqs-block-image-link')?.getAttribute('href'); const box = fb().querySelector('.fluid-image-container').getBoundingClientRect(), bq = fb().getBoundingClientRect(); out.linkedFills = Math.abs(box.width - bq.width) < 1 && Math.abs(box.height - bq.height) < 1;
  document.getElementById('undo').click(); await sleep(200); out.undoLink = !fb().querySelector('a.sqs-block-image-link');
  P.querySelector('[data-image-act="remove"]')?.click(); await sleep(200); out.removed = !fb().querySelector('img') && !model().src; document.getElementById('undo').click(); await sleep(200); out.undoRemove = !!fb().querySelector('img');
  return JSON.stringify(out); })()`);
add('Content tab rows', content.labels.join() === F.contentTab.join(), content.labels.join());
add('Replace shows the picture', content.picture && content.fill === 'cover' && content.aspect === 2, JSON.stringify(content));
add('Fit keeps the whole picture', content.fit === 'contain' && Math.abs(content.fitAspect - 2) < 0.02, JSON.stringify(content));
add('Alt text on the picture', content.alt === 'A red picture', content.alt);
add('Link wraps, block filled', content.href === '/services' && content.linkedFills, JSON.stringify(content));
add('Undo removes the link', content.undoLink, '');
add('Remove, then undo', content.removed && content.undoRemove, JSON.stringify(content));

// Corner (Fit and Fill, IMAGEMODES.json designFit; Shape has none, designShape): the picture box
// gets the radius, the picture is clipped by it, one undo step.
const corner = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const d = document.getElementById('site-frame').contentDocument; const c = () => d.querySelector('.fe-block[data-block-id="${id}"] .fluid-image-container'); const P = document.getElementById('block-panel'); const out = {};
  P.querySelector('[data-btab="Design"]').click(); await sleep(150);
  const f = P.querySelector('input[aria-label="Corner"]'); out.has = !!f; f.value = '24'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); const st = d.defaultView.getComputedStyle(c()); out.radius = st.borderRadius; out.overflow = st.overflow;
  out.inShape = (P.querySelector('[data-image-mode="shape"]').click(), await sleep(250), !!P.querySelector('input[aria-label="Corner"]')); document.getElementById('undo').click(); await sleep(250);
  document.getElementById('undo').click(); await sleep(250); out.undone = d.defaultView.getComputedStyle(c()).borderRadius; return JSON.stringify(out); })()`);
add('Corner rounds the picture', corner.has && corner.radius === '24px' && corner.overflow === 'hidden', JSON.stringify(corner));
add('Corner is not on Shape', corner.inShape === false, JSON.stringify(corner));
add('Corner undo is one step', corner.undone === '0px', JSON.stringify(corner));

// New blocks through the real Add Block menu, against parity/findings/MEDIAEMPTY.json.
const M = JSON.parse(readFileSync(new URL('../parity/findings/MEDIAEMPTY.json', import.meta.url)));
const box1 = (a, b, d = 0.6) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= d);
const addNew = async (name) => {
  goto(S, `${BASE}/index.html`); await pause(1000);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(1800);
  const spot = evalJs(S, `(() => { const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
  mouse(S, 'move', spot[0], spot[1]); await pause(500);
  return evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(250); document.querySelector('button[data-add="${name}"]').click(); await sleep(400); const s = fe.model.sections[1], b = s.blocks.at(-1); fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(300); const L = b.layout.desktop.area; return JSON.stringify({ id: b.id, sid: s.id, rows: L[2] - L[0], cols: L[3] - L[1], tab: document.querySelector('#block-panel [role="tab"][aria-selected="true"]')?.textContent }); })()`);
};
const words = () => evalJs(S, `(() => JSON.stringify(document.getElementById('block-panel').textContent.replace(/\\s+/g, ' ').trim()))()`);
const tabTo = async (t) => { evalJs(S, `(() => { document.querySelector('#block-panel [data-btab="${t}"]').click(); return 'true'; })()`); await pause(250); };
const hasAll = (text, list) => list.filter((t) => !text.toLowerCase().includes(t.toLowerCase()));

const img = await addNew('Image');
add('Image opens on Content', img.tab === M.image.openTab, img.tab);
add('Image is 6 by 6', img.rows === M.image.area[2] - M.image.area[0] && img.cols === M.image.area[3] - M.image.area[1], `${img.rows} ${img.cols}`);
const empty = evalJs(S, `(() => { const e = document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${img.id}"]'); const q = e.querySelector('.fluid-image-component-empty-state-node'), p = q?.querySelector('.fluid-image-add'), r = q?.getBoundingClientRect(), o = e.getBoundingClientRect(), a = p?.getBoundingClientRect(); return JSON.stringify({ fills: !!q && Math.abs(r.width - o.width) < 1 && Math.abs(r.height - o.height) < 1, centred: !!a && Math.abs(a.x + a.width / 2 - o.x - o.width / 2) < 1 && Math.abs(a.y + a.height / 2 - o.y - o.height / 2) < 1, plus: a ? [a.width, a.height] : null, bg: q && getComputedStyle(q).backgroundColor, pic: !!e.querySelector('.fluid-image-container') }); })()`);
add('Empty image is white with a +', empty.fills && empty.centred && empty.bg === 'rgb(255, 255, 255)' && !empty.pic && box1(empty.plus, M.image.addButton), JSON.stringify(empty));
let lost = hasAll(words(), M.image.panels.Content.slice(3));
add('Empty image Content rows', !lost.length && !/Alternate Filename/.test(words()), lost.join() || words());
await tabTo('Design');
const fitOn = evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel [data-image-mode][aria-checked="true"]')?.textContent))()`);
add('Fit is the default', fitOn === M.image.defaultMode, fitOn);
lost = hasAll(words(), ['Corner', 'Transforms']);
add('Empty image Design rows', !lost.length && !/Overlay|Lightbox|Image Effect/.test(words()), lost.join() || words());

const vid = await addNew('Video');
add('Video opens on Content', vid.tab === M.video.openTab, vid.tab);
const ph = evalJs(S, `(() => { const e = document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${vid.id}"]'), o = e.getBoundingClientRect(); const box = (q) => { const r = e.querySelector(q).getBoundingClientRect(); return [r.x - o.x, r.y - o.y, r.width, r.height]; }; const c = getComputedStyle(e.querySelector('.sqs-block-video-placeholder')); return JSON.stringify({ ph: box('.sqs-block-video-placeholder'), icon: box('.sqs-block-video-placeholder__ui'), bg: c.backgroundImage, color: c.backgroundColor }); })()`);
add('Video placeholder box', box1(ph.ph, M.video.placeholder.box), ph.ph.join());
add('Video icon box', box1(ph.icon, M.video.icon), ph.icon.join());
add('Video gradient and colour', ph.bg === M.video.placeholder.gradient && ph.color === M.video.placeholder.color, `${ph.bg} ${ph.color}`);
lost = hasAll(words(), M.video.panels.Content.slice(3));
add('Video Content rows', !lost.length, lost.join());
await tabTo('Design');
const order = words(), at = M.video.panels.Design.slice(3).filter((t) => t !== 'Normal' && t !== 'Scale' && t !== 'Offset' && t !== 'Skew' && t !== 'Anchor').map((t) => order.indexOf(t));
add('Video Design rows in order', at.every((n, k) => n >= 0 && (!k || n > at[k - 1])), at.join());
const areaOf = () => evalJs(S, `(() => JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === '${vid.id}').layout.desktop.area))()`);
const pull = async (dir, dc, dr) => {
  const p = evalJs(S, `(async () => { fe.select('${vid.sid}', '${vid.id}'); await new Promise((res) => setTimeout(res, 200)); const f = document.getElementById('site-frame'), o = f.getBoundingClientRect(), d = f.contentDocument, r = d.querySelector('.fe-handle[data-dir="${dir}"]').getBoundingClientRect(), m = fe.measure('${vid.sid}'); return JSON.stringify({ x: o.left + r.x + r.width / 2, y: o.top + r.y + r.height / 2, col: m.colStart[2] - m.colStart[1], row: m.pitch }); })()`);
  drag(S, [p.x, p.y], [p.x + dc * p.col, p.y + dr * p.row]); await pause(400);
  return areaOf();
};
for (const [label, dir, dc, dr] of [['e 2 cols', 'e', 2, 0], ['s 2 rows', 's', 0, 2], ['se -2 cols', 'se', -2, 0]]) {
  const got = await pull(dir, dc, dr), want = M.video.resize[label].to;
  add(`Video resize ${label}`, got.join() === want.join(), `${got.join()} want ${want.join()}`);
}

console.log(`Image modes: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/image-check.json', import.meta.url), JSON.stringify({ check: 'image Fit, Fill and Shape', tolerance: 1, pass, total, results }, null, 2) + '\n');
if (!total || pass !== total) process.exitCode = 1;
