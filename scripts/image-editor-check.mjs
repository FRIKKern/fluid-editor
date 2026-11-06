// T4: the Edit menu and the full-screen image editor on a new image with a picture, through real
// presses, against parity/findings/IMAGEEDITOR.json. Writes parity/image-editor-check.json.
// Usage: npm run image-editor-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { filterPixel, startState, toneOf, saturationFactor, ratioBox } from '../app/src/image-edit.js';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEEDITOR.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(48)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

// The arithmetic against what the oracle drew.
for (const [name, list] of Object.entries(F.filter.samples)) {
  const e = list.reduce((sum, [i, o]) => { const p = filterPixel(name, ...i); return sum + (Math.abs(p[0] - o[0]) + Math.abs(p[1] - o[1]) + Math.abs(p[2] - o[2])) / 3; }, 0) / list.length;
  add(`Filter ${name}: mean error under 4 levels`, e < 4, e.toFixed(1));
}
const a0 = startState().adjust;
add('Brightness adds 49 at 97', Math.round(toneOf(100, { ...a0, Brightness: 97 })) === 149);
add('Highlights grow with the square', Math.abs(toneOf(240, { ...a0, Highlights: -97 }) - (240 - 107)) < 1, String(toneOf(240, { ...a0, Highlights: -97 })));
add('Shadows at their middle', Math.abs(toneOf(144, { ...a0, Shadows: 97 }) - 174.7) < 0.1, String(toneOf(144, { ...a0, Shadows: 97 })));
for (const [v, k] of Object.entries(F.tone.Saturation.factor)) add(`Saturation factor at ${v}`, Math.abs(saturationFactor(Number(v)) - k) < 0.03, String(saturationFactor(Number(v))));
for (const [n, f] of Object.entries(F.crop.frames)) if (n !== 'note') {
  const b = ratioBox(n, 896, 1200), box = [341 + b[0] * 598, 89 + b[1] * 801, b[2] * 598, b[3] * 801];
  add(`Ratio ${n}: the frame's rule`, near(box, f, 3), JSON.stringify(box));
}

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
// The picture: left half red, right half blue, top dark, bottom light, so a flip and a turn can be read.
const made = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Image"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Content"]')?.click(); await sleep(150); const c = document.createElement('canvas'); c.width = 896; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#c04030'; g.fillRect(0, 0, 448, 600); g.fillStyle = '#3040c0'; g.fillRect(448, 0, 448, 600); g.fillStyle = '#e09080'; g.fillRect(0, 600, 448, 600); g.fillStyle = '#8090e0'; g.fillRect(448, 600, 448, 600); const blob = await new Promise((res) => c.toBlob(res, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'room.png', { type: 'image/png' })); const inp = P.querySelector('[data-image-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); await sleep(600); return JSON.stringify({ sid: s.id, bid: b.id }); })()`);
const { sid, bid } = made;
const M = `fe.model.sections.find((s) => s.id === '${sid}').blocks.find((b) => b.id === '${bid}')`;
const PX = `const P = document.getElementById('block-panel'), E = document.getElementById('image-editor'), C = E?.querySelector('.ie-canvas'); const B = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };`;
const R = (js) => evalJs(S, `(() => { ${PX} return JSON.stringify(${js}); })()`);
const press = async (sel, wait = 300) => {
  const c = R(`(() => { const e = ${sel}; if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return { x, y, top: e === t || e.contains(t) }; })()`);
  if (!c?.top) throw new Error(`not on top: ${sel}`);
  mouse(S, 'move', c.x, c.y); await pause(30); mouse(S, 'down', c.x, c.y, { buttons: 1 }); await pause(30); mouse(S, 'up', c.x, c.y); await pause(wait);
};
const drag = async (x0, y0, x1, y1, during) => {
  mouse(S, 'move', x0, y0); await pause(30); mouse(S, 'down', x0, y0, { buttons: 1 }); await pause(40);
  for (let i = 1; i <= 5; i++) { mouse(S, 'move', x0 + ((x1 - x0) * i) / 5, y0 + ((y1 - y0) * i) / 5, { buttons: 1 }); await pause(30); }
  const seen = during ? during() : null;
  mouse(S, 'up', x1, y1); await pause(300);
  return seen;
};
const pixel = (fx, fy) => R(`(() => { const d = C.getContext('2d').getImageData(Math.floor(C.width * ${fx}), Math.floor(C.height * ${fy}), 1, 1).data; return [d[0], d[1], d[2]]; })()`);
const srcOf = () => evalJs(S, `(() => JSON.stringify(${M}.src))()`);
const set = async (sel, v) => { evalJs(S, `(() => { const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${v}; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(300); };
const openEditor = async () => { await press(`P.querySelector('[data-image-act="edit"]')`, 250); await press(`document.querySelector('[data-image-edit]')`, 700); };
const state = () => R(`({ undo: !E.querySelector('[data-ie="undo"]').disabled, redo: !E.querySelector('[data-ie="redo"]').disabled, reset: E.querySelector('[data-ie="reset"]') ? !E.querySelector('[data-ie="reset"]').disabled : null })`);

// The menu.
const src0 = srcOf();
await press(`P.querySelector('[data-image-act="edit"]')`, 250);
const menu = R(`(() => { const m = document.getElementById('shape-pop'), q = B(m), b = B(P.querySelector('[data-image-act="edit"]')); return { off: [q[0] - b[0], q[1] - b[1], q[2], q[3]], rows: [...m.querySelectorAll('button')].map((x) => [x.textContent.trim(), B(x)[3], x.disabled]) }; })()`);
const mb = F.menu.box, eb = F.menu.editButton;
add('Menu sits by Edit', near(menu.off, [mb[0] - eb[0], mb[1] - eb[1], mb[2], mb[3]]), JSON.stringify(menu.off));
add('Its rows', JSON.stringify(menu.rows.map((r) => r[0].replace(/\s*AI$/, ''))) === JSON.stringify(F.menu.rows) && menu.rows.every((r) => r[1] === F.menu.rowHeight), JSON.stringify(menu.rows));
add('The AI rows are named as not built', menu.rows[0][2] && menu.rows[1][2] && !menu.rows[2][2], JSON.stringify(menu.rows));
await press(`document.querySelector('[data-image-edit]')`, 700);

// Adjust.
const bar = R(`({ save: B(E.querySelector('[data-ie="save"]')), cancel: B(E.querySelector('[data-ie="cancel"]')), undo: B(E.querySelector('[data-ie="undo"]')), redo: B(E.querySelector('[data-ie="redo"]')), tabs: [...E.querySelectorAll('[data-ie-tab]')].map((t) => { const q = B(t); return [t.getAttribute('aria-label'), q[0] + q[2] / 2]; }), pic: B(C) })`);
for (const k of ['save', 'cancel', 'undo', 'redo']) add(`Bar: ${k}`, near(bar[k], F.bar[k]), JSON.stringify(bar[k]));
add('Tabs', JSON.stringify(bar.tabs.map((t) => t[0])) === JSON.stringify(F.bar.tabs) && near(bar.tabs.map((t) => t[1]), F.bar.tabCentres), JSON.stringify(bar.tabs));
add('Adjust: the picture', near(bar.pic, [312, 89, 655, 877], 2.5), JSON.stringify(bar.pic));
const rows = R(`[...E.querySelectorAll('.ie-row')].map((r) => { const i = r.querySelector('input[type=range]'), q = B(i), l = B(r.querySelector('span')); return [i.getAttribute('aria-label'), +i.min, +i.max, l[1], q[0], q[1], q[3]]; })`);
add('Adjust: seven rows', JSON.stringify(rows.map((r) => r.slice(0, 3))) === JSON.stringify(F.adjust.rows.map((r) => r.slice(0, 3))), JSON.stringify(rows));
add('Adjust: row tops', rows.every((r, i) => Math.abs(r[3] - F.adjust.rows[i][3]) <= 1 && Math.abs(r[4] - F.adjust.range[0]) <= 2 && r[6] === F.adjust.range[2]), JSON.stringify(rows));
add('Reset is off, Undo and Redo off', JSON.stringify(state()) === '{"undo":false,"redo":false,"reset":false}', JSON.stringify(state()));
add('Reset box', near(R(`B(E.querySelector('[data-ie="reset"]'))`), F.adjust.reset), JSON.stringify(R(`B(E.querySelector('[data-ie="reset"]'))`)));
add('Picture drawn', near(pixel(0.25, 0.25), [0xc0, 0x40, 0x30], 3), JSON.stringify(pixel(0.25, 0.25)));
// A slider, by real drag.
const tr = R(`B(E.querySelector('input[type=range][aria-label="Brightness"]'))`);
await drag(tr[0] + tr[2] / 2, tr[1] + 22, tr[0] + tr[2] * 0.75, tr[1] + 22);
const bv = R(`+E.querySelector('input[type=range][aria-label="Brightness"]').value`);
add('Brightness moves by drag and its field follows', bv > 30 && bv < 70 && R(`E.querySelector('input[type=text][aria-label="Brightness"]').value`) === String(bv), String(bv));
const lit = pixel(0.25, 0.25);
add('The picture lightens by the rule', near(lit, [0xc0 + Math.round((bv * 49) / 97), 0x40 + Math.round((bv * 49) / 97), 0x30 + Math.round((bv * 49) / 97)], 3), JSON.stringify(lit));
add('Then Undo and Reset are on', state().undo && state().reset, JSON.stringify(state()));
await press(`E.querySelector('[data-ie="undo"]')`, 300);
add('A slider is one undo step', R(`+E.querySelector('input[type=range][aria-label="Brightness"]').value`) === 0 && state().redo && !state().undo, JSON.stringify(state()));
await press(`E.querySelector('[data-ie="redo"]')`, 300);
add('Redo brings it back', R(`+E.querySelector('input[type=range][aria-label="Brightness"]').value`) === bv);
await set('input[type=range][aria-label="Saturation"]', -100);
const gray = pixel(0.25, 0.25);
add('Saturation -100 goes to the brightest channel', gray[0] === gray[1] && gray[1] === gray[2] && gray[0] >= lit[0] - 1, JSON.stringify(gray));
await set('input[type=range][aria-label="Saturation"]', 0);
await set('input[type=range][aria-label="Blur"]', 50);
add('Blur softens the edge between colours', (() => { const m = pixel(0.5, 0.25); return m[2] > 80 && m[0] > 80; })(), JSON.stringify(pixel(0.5, 0.25)));
await press(`E.querySelector('[data-ie="reset"]')`, 300);
add('Reset clears the sliders, and stays on the undo list', R(`[...E.querySelectorAll('.ie-row input[type=range]')].every((i) => +i.value === 0)`) === true && state().undo && !state().reset, JSON.stringify(state()));
evalJs(S, `(() => { const f = document.querySelector('#image-editor input[type=text][aria-label="Contrast"]'); f.value = '500'; f.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(300);
add('A field keeps to its range', R(`+E.querySelector('input[type=range][aria-label="Contrast"]').value`) === 100);
await press(`E.querySelector('[data-ie="reset"]')`, 300);

// Crop.
await press(`E.querySelector('[data-ie-tab="crop"]')`, 400);
add('Crop: the picture', near(R(`B(C)`), F.picture.cropBox, 2.5), JSON.stringify(R(`B(C)`)));
const cropRows = R(`Object.fromEntries([...E.querySelectorAll('.ie-opt')].map((b) => [b.textContent.trim(), B(b)]))`);
const badRows = Object.entries(F.crop.rows).filter(([n, q]) => !cropRows[n] || !near(cropRows[n], q)).map(([n]) => n);
add('Crop: every row', !badRows.length, JSON.stringify(badRows));
add('Crop: Original is on', R(`E.querySelector('.ie-opt.is-on').textContent.trim()`) === 'Original');
add('Crop: Reset box', near(R(`B(E.querySelector('[data-ie="reset"]'))`), F.crop.reset), JSON.stringify(R(`B(E.querySelector('[data-ie="reset"]'))`)));
add('Crop: straighten slider', near(R(`B(E.querySelector('[data-ie-straight]'))`), F.crop.straighten.range, 2), JSON.stringify(R(`B(E.querySelector('[data-ie-straight]'))`)));
const frameBox = () => R(`B(E.querySelector('.ie-box'))`);
for (const [n, f] of Object.entries(F.crop.frames)) if (n !== 'note') {
  await press(`E.querySelector('[data-ie-ratio="${n}"]')`, 250);
  add(`Frame at ${n}`, near(frameBox(), f, 3), JSON.stringify(frameBox()));
}
add('Only Custom has edge bars', R(`E.querySelectorAll('.ie-mid').length`) === 0);
const corner = R(`getComputedStyle(E.querySelector('.ie-nw')).borderTopWidth + ' ' + B(E.querySelector('.ie-nw'))[2]`);
add('Corner handle 26 long, 4 thick', corner === '4px 26', corner);
await press(`E.querySelector('[data-ie="undo"]')`, 250);
add('A ratio is one undo step', near(frameBox(), F.crop.frames['3:2'], 2.5), JSON.stringify(frameBox()));
await press(`E.querySelector('[data-ie-ratio="Custom"]')`, 250);
add('Custom keeps the frame and adds the bars', near(frameBox(), F.crop.frames['3:2'], 2.5) && R(`E.querySelectorAll('.ie-mid').length`) === 4);
const f0 = frameBox();
const grid = await drag(f0[0] + f0[2] / 2, f0[1] + f0[3] / 2, f0[0] + f0[2] / 2 + 20, f0[1] + f0[3] / 2 + 50, () => R(`getComputedStyle(E.querySelector('.ie-box u')).display`));
add('Thirds show while it goes', grid === 'block', String(grid));
const f1 = frameBox();
add('Inside moves the frame, kept in the picture', near([f1[0] - f0[0], f1[1] - f0[1]], [0, 50], 1.5) && f1[2] === f0[2], JSON.stringify(f1));
await drag(f1[0] + f1[2] - 3, f1[1] + f1[3] - 3, f1[0] + f1[2] - 103, f1[1] + f1[3] - 53);
const f2 = frameBox();
add('A corner resizes on Custom', near([f2[0], f2[1], f2[2], f2[3]], [f1[0], f1[1], f1[2] - 100, f1[3] - 50], 1.5), JSON.stringify(f2));
await press(`E.querySelector('[data-ie="reset"]')`, 300);
add('Reset brings it all back', near(frameBox(), F.picture.cropBox, 2.5) && R(`E.querySelector('.ie-opt.is-on').textContent.trim()`) === 'Original', JSON.stringify(frameBox()));
await press(`E.querySelector('[data-ie-act="flipX"]')`, 300);
add('Flip X mirrors', near(pixel(0.25, 0.25), [0x30, 0x40, 0xc0], 3), JSON.stringify(pixel(0.25, 0.25)));
await press(`E.querySelector('[data-ie-act="flipY"]')`, 300);
add('Flip Y mirrors', near(pixel(0.25, 0.25), [0x80, 0x90, 0xe0], 3), JSON.stringify(pixel(0.25, 0.25)));
await press(`E.querySelector('[data-ie="reset"]')`, 300);
await press(`E.querySelector('[data-ie-act="right"]')`, 400);
const t = R(`B(C)`);
add('90 refits the picture to the view', near(t, [640 - 536.5, 89, 1073, 801], 3), JSON.stringify(t));
add('90 turns clockwise', near(pixel(0.75, 0.25), [0xc0, 0x40, 0x30], 3) && near(pixel(0.25, 0.25), [0xe0, 0x90, 0x80], 3), JSON.stringify([pixel(0.75, 0.25), pixel(0.25, 0.25)]));
await press(`E.querySelector('[data-ie-act="left"]')`, 400);
add('-90 turns it back', near(pixel(0.25, 0.25), [0xc0, 0x40, 0x30], 3) && near(R(`B(C)`), F.picture.cropBox, 2.5));
await press(`E.querySelector('[data-ie="reset"]')`, 300);
await set('[data-ie-straight]', 15);
const st = pixel(0.03, 0.03);
add('Straighten leaves no corner empty', R(`(() => { const g = C.getContext('2d'); return [[1, 1], [C.width - 2, 1], [1, C.height - 2], [C.width - 2, C.height - 2]].every(([x, y]) => g.getImageData(x, y, 1, 1).data[3] === 255); })()`) === true, JSON.stringify(st));
await press(`E.querySelector('[data-ie="reset"]')`, 300);
// A crop shows alone on Adjust and Filter.
await press(`E.querySelector('[data-ie-ratio="1:1"]')`, 250);
await press(`E.querySelector('[data-ie-tab="adjust"]')`, 400);
add('Adjust draws only the crop', near(R(`B(C)`), [640 - 438.5, 89, 877, 877], 3), JSON.stringify(R(`B(C)`)));
add('and has no frame', R(`E.querySelector('.ie-frame').hidden`) === true);
add('Adjust Reset leaves the crop', R(`E.querySelector('[data-ie="reset"]').disabled`) === true);
await press(`E.querySelector('[data-ie-tab="filter"]')`, 500);
add('Filter draws only the crop', near(R(`B(C)`), [640 - 400.5, 89, 801, 801], 3), JSON.stringify(R(`B(C)`)));

// Filter.
const tiles = R(`[...E.querySelectorAll('.ie-tile')].map((b) => [b.getAttribute('aria-label'), ...B(b)])`);
add('Filter: the order', JSON.stringify(tiles.map((x) => x[0])) === JSON.stringify(F.filter.order), JSON.stringify(tiles.map((x) => x[0])));
add('Filter: tile boxes', tiles.slice(0, 10).every((x, i) => near(x.slice(1), [F.filter.tiles.lefts[i % 2], F.filter.tiles.firstTop + F.filter.tiles.pitch * (i >> 1), 136, 136], 1.5)), JSON.stringify(tiles.slice(0, 4)));
add('Original is chosen, no Strength', R(`E.querySelector('.ie-tile.is-on').getAttribute('aria-label')`) === 'Original' && R(`!E.querySelector('[data-ie-strength]')`) === true);
const plain = pixel(0.25, 0.25);
await press(`E.querySelector('[data-ie-filter="Voyager"]')`, 400);
const voy = pixel(0.25, 0.25);
add('A filter draws, here gray', voy[0] === voy[1] && voy[1] === voy[2] && voy[0] !== plain[0], JSON.stringify(voy));
add('Strength shows at 100', R(`+E.querySelector('[data-ie-strength]').value`) === 100 && near(R(`B(E.querySelector('[data-ie-strength]'))`), F.filter.strength.range, 2), JSON.stringify(R(`B(E.querySelector('[data-ie-strength]'))`)));
await set('[data-ie-strength]', 50);
const half = pixel(0.25, 0.25);
add('Strength 50 is a straight mix', near(half, plain.map((v, i) => (v + voy[i]) / 2), 2), JSON.stringify(half));
add('Its label follows', R(`E.querySelector('.ie-strength output').textContent`) === '50 %');
await press(`E.querySelector('[data-ie-filter="Frieze"]')`, 400);
add('A low tile comes into reach', R(`E.querySelector('.ie-tile.is-on').getAttribute('aria-label')`) === 'Frieze', 'scrolled');
await press(`E.querySelector('[data-ie-filter="Original"]')`, 400);

// Cancel.
await press(`E.querySelector('[data-ie="cancel"]')`, 300);
const dlg = R(`(() => { const d = E.querySelector('.ie-dialog'); return d && { text: d.querySelector('p').textContent, btn: [...d.querySelectorAll('button')].map((b) => b.textContent), box: B(d) }; })()`);
add('Cancel asks when something changed', dlg && dlg.text === "Are you sure you want to discard your changes? This can't be undone." && JSON.stringify(dlg.btn) === '["Resume","Discard"]', JSON.stringify(dlg));
add('Its box', dlg && near(dlg.box, F.cancel.box, 3), JSON.stringify(dlg?.box));
await press(`E.querySelector('[data-ie="resume"]')`, 250);
add('Resume stays in the editor', R(`!!E && !E.querySelector('.ie-dialog')`) === true);
await press(`E.querySelector('[data-ie="cancel"]')`, 250);
await press(`E.querySelector('[data-ie="discard"]')`, 400);
add('Discard leaves, the picture as it was', R(`!E`) === true && srcOf() === src0);
await openEditor();
await press(`E.querySelector('[data-ie="cancel"]')`, 300);
add('Cancel with nothing set leaves at once', R(`!E`) === true);

// Save, in ours only.
await openEditor();
await press(`E.querySelector('[data-ie-tab="crop"]')`, 300);
await press(`E.querySelector('[data-ie-ratio="16:9"]')`, 300);
await press(`E.querySelector('[data-ie="save"]')`, 700);
const saved = evalJs(S, `(() => { const b = ${M}; return JSON.stringify({ aspect: b.aspect, name: b.filename }); })()`);
add('Save writes a picture of the crop', R(`!E`) === true && srcOf() !== src0 && Math.abs(saved.aspect - 16 / 9) < 0.01, JSON.stringify(saved));
add('The name stays', saved.name === 'room.png', JSON.stringify(saved));
evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(400);
add('Save is one undo step on the page', srcOf() === src0);
add('No other image changed', evalJs(S, `(() => JSON.stringify(fe.model.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'image' && b.id !== '${bid}' && b.filename === 'room.png').length))()`) === 0);

writeFileSync(new URL('../parity/image-editor-check.json', import.meta.url), `${JSON.stringify({ check: 'Edit menu and image editor', pass, total, results }, null, 1)}\n`);
console.log(`Image editor: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
