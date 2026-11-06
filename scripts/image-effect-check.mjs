// T4: Image Effect on a new image with a picture, through real presses, against
// parity/findings/IMAGEEFFECT.json. Writes parity/image-effect-check.json. Usage: npm run image-effect-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEEFFECT.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(48)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);
const KIND = { Liquid: 'liquid', 'Film grain': 'grain', Parallax: 'parallax', Circles: 'circles', Lines: 'lines' };

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const made = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Image"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Content"]')?.click(); await sleep(150); const c = document.createElement('canvas'); c.width = 896; c.height = 1200; const g = c.getContext('2d'); const l = g.createLinearGradient(0, 0, 896, 1200); l.addColorStop(0, '#26d'); l.addColorStop(1, '#fc3'); g.fillStyle = l; g.fillRect(0, 0, 896, 1200); const blob = await new Promise((res) => c.toBlob(res, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'room.png', { type: 'image/png' })); const inp = P.querySelector('[data-image-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); await sleep(600); P.querySelector('[data-btab="Design"]').click(); await sleep(200); return JSON.stringify({ sid: s.id, bid: b.id }); })()`);
const { sid, bid } = made;
const M = `fe.model.sections.find((s) => s.id === '${sid}').blocks.find((b) => b.id === '${bid}')`;
const PX = `const P = document.getElementById('block-panel'), P0 = P.getBoundingClientRect(); const d = document.getElementById('site-frame').contentDocument; const blk = d.getElementById('block-${bid}');`;
const R = (js) => evalJs(S, `(() => { ${PX} return JSON.stringify(${js}); })()`);
const press = async (sel, wait = 300) => {
  const c = R(`(() => { const e = ${sel}; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return { x, y, top: e === t || e.contains(t) }; })()`);
  if (!c.top) throw new Error(`not on top: ${sel}`);
  mouse(S, 'move', c.x, c.y); await pause(30); mouse(S, 'down', c.x, c.y, { buttons: 1 }); await pause(30); mouse(S, 'up', c.x, c.y); await pause(wait);
};
const undo = async () => { evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(350); };
const effect = () => evalJs(S, `(() => JSON.stringify(${M}.effect || null))()`);
const REL = `const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height]; };`;

// The row.
const row = R(`(() => { const e = P.querySelector('[aria-label="Navigate to Image Effect"]'); return { there: !!e, text: e?.textContent.trim() }; })()`);
add('Design has the row', row.there && row.text === 'Image Effect', JSON.stringify(row));
await press(`P.querySelector('[data-fx-nav="list"]')`, 400);

// The list.
const list = R(`(() => { ${REL} const tiles = [...P.querySelectorAll('.bp-fx-tile')]; return { back: rel(P.querySelector('.bp-back')), title: P.querySelector('.bp-ishape-head span').textContent, titleY: (() => { const r = rel(P.querySelector('.bp-ishape-head span')); return r[1] + r[3] / 2; })(), tiles: tiles.map(rel), names: tiles.map((t) => t.getAttribute('aria-label')), none: tiles[0].textContent.trim(), note: rel(P.querySelector('.bp-fx-note')), noteText: P.querySelector('.bp-fx-note').textContent, on: tiles.filter((t) => t.classList.contains('is-on')).map((t) => t.getAttribute('aria-label')) }; })()`);
add('Back', near(list.back, F.list.back, 3), JSON.stringify(list.back));
add('Title', list.title === F.list.title.text && Math.abs(list.titleY - F.list.title.centreY) <= 2, JSON.stringify([list.title, list.titleY]));
add('Six tiles in order', JSON.stringify(list.names) === JSON.stringify(F.list.order) && list.none === F.list.noneText, JSON.stringify(list.names));
add('Tile boxes', list.tiles.every((t, i) => near(t, F.list.tiles[i])), JSON.stringify(list.tiles));
add('WebGL note', list.noteText === F.list.note.text && near(list.note, F.list.note.box, 2), JSON.stringify(list.note));
add('Starts on None', JSON.stringify(list.on) === '["None"]', JSON.stringify(list.on));
await pause(500);
add('Tiles draw the picture', R(`[...P.querySelectorAll('canvas[data-fx-still]')].every((c) => c.getContext('2d').getImageData(60, 50, 1, 1).data[3] === 255)`) === true);

// A pick: the canvas sits between the picture and the overlay, and None brings the picture back.
await press(`P.querySelector('[data-fx-tile="liquid"]')`, 900);
const live = () => R(`(() => { const box = blk.querySelector('.imageEffectContainer'), img = blk.querySelector('img'), wrap = blk.querySelector('.fluid-image-container'); if (!box) return { box: false, img: d.defaultView.getComputedStyle(img).visibility }; const b = box.getBoundingClientRect(), w = wrap.getBoundingClientRect(), c = box.querySelector('canvas'); return { box: true, same: Math.abs(b.width - w.width) < 1 && Math.abs(b.height - w.height) < 1, canvas: [c.width, c.height], img: d.defaultView.getComputedStyle(img).visibility, after: img.nextElementSibling === box, drew: !!c.getContext('webgl')?.getParameter(c.getContext('webgl').VIEWPORT)[2] }; })()`);
let l = live();
add('Liquid: canvas in the picture box', l.box && l.same && l.after && l.canvas[0] > 0, JSON.stringify(l));
add('Liquid: the picture hides', l.img === 'hidden', JSON.stringify(l));
add('Liquid: defaults', JSON.stringify(effect()) !== 'null' && effect().complexity === 2 && effect().intensity === 10 && effect().seed === 100, JSON.stringify(effect()));
const chosen = R(`(() => { ${REL} const t = P.querySelector('.bp-fx-tile.is-on'), o = rel(t); return { name: t.getAttribute('aria-label'), crop: rel(t.querySelector('.bp-fx-crop'))[3], acts: [...t.querySelectorAll('.bp-fx-act')].map((b) => { const r = rel(b); return [b.getAttribute('aria-label'), r[0] - o[0], r[1] - o[1], r[2], r[3]]; }) }; })()`);
add('Chosen tile keeps a picture 57 tall', chosen.name === 'Liquid' && chosen.crop === 57, JSON.stringify(chosen));
for (const [name, box] of Object.entries(F.list.chosen.buttons)) { const a = chosen.acts.find((x) => x[0] === name); add(`Chosen tile: ${name}`, a && near(a.slice(1), box, 1.5), JSON.stringify(a)); }
const pix = () => R(`(() => { const c = blk.querySelector('.imageEffectContainer canvas'); const g = c.getContext('webgl'); const p = new Uint8Array(4); g.readPixels(c.width >> 1, c.height >> 1, 1, 1, g.RGBA, g.UNSIGNED_BYTE, p); return [...p]; })()`);
const px = pix();
add('The canvas draws', px[3] === 255 && px[0] + px[1] + px[2] > 0, JSON.stringify(px));

const v1 = effect();
await press(`P.querySelector('.bp-fx-tile.is-on [data-fx-shuffle]')`, 400);
add('Shuffle changes the values', JSON.stringify(effect()) !== JSON.stringify(v1), JSON.stringify(effect()));
add('Shuffle leaves Motion alone', effect().speed === v1.speed && effect().morph === v1.morph, JSON.stringify(effect()));
await undo();
add('Shuffle is one undo step, the view stays', JSON.stringify(effect()) === JSON.stringify(v1) && R(`!!P.querySelector('.bp-fx-grid')`) === true, JSON.stringify(effect()));
await press(`P.querySelector('[data-fx-tile="lines"]')`, 500);
await press(`P.querySelector('[data-fx-tile="liquid"]')`, 500);
add('A tile starts from its defaults', JSON.stringify(effect()) === JSON.stringify(v1), JSON.stringify(effect()));
await press(`P.querySelector('[data-fx-tile="none"]')`, 500);
l = live();
add('None: no canvas, the picture back', !l.box && l.img === 'visible', JSON.stringify(l));
await undo();
add('None is one undo step', effect()?.kind === 'liquid', JSON.stringify(effect()));

// Each effect's settings against the oracle's rows, all groups open.
const ROWS = `(() => { const out = []; const p0 = P.getBoundingClientRect(), st = P.scrollTop; for (const e of P.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; const y = Math.round(r.top - p0.top + st), x = Math.round(r.left - p0.left); if (e.matches('input[type=range]')) out.push(['range', e.getAttribute('aria-label'), +e.min, +e.max, +e.value, y]); else if (e.matches('input[type=checkbox]')) out.push(['switch', e.getAttribute('aria-label'), e.checked, y]); else if (e.matches('.bp-fx-group')) out.push(['group', e.textContent.trim(), null, x, y, Math.round(r.width), 44]); else if (e.matches('.bp-fx-opt')) out.push(['seg', e.getAttribute('aria-label'), e.getAttribute('aria-checked') === 'true', x, y, Math.round(r.width), Math.round(r.height)]); else if (e.matches('.bp-fx-shuffle')) out.push(['button', 'Shuffle Settings', null, x, y, Math.round(r.width), Math.round(r.height)]); else if (e.matches('.bp-fx-seglabel')) out.push(['text', e.textContent.trim(), 0, y]); else if (e.matches('.bp-fx-sel')) out.push(['select', e.textContent.trim(), y]); } return out; })()`;
const yOf = (r) => ({ range: 5, switch: 3, group: 4, seg: 4, button: 4, text: 3, select: 2 })[r[0]];
for (const [name, want] of Object.entries(F.settings)) {
  await press(`P.querySelector('[data-fx-tile="${KIND[name]}"], .bp-fx-tile.is-on[aria-label="${name}"]')`, 500);
  await press(`P.querySelector('.bp-fx-tile.is-on [data-fx-nav="settings"]')`, 400);
  const closed = R(`[...P.querySelectorAll('.bp-fx-group')].map((g) => [g.textContent.trim(), g.getAttribute('aria-expanded')])`);
  add(`${name}: groups start closed`, JSON.stringify(closed.map((g) => g[0])) === JSON.stringify(want.groups) && closed.every((g) => g[1] === 'false'), JSON.stringify(closed));
  for (const g of want.groups) await press(`P.querySelector('[data-fx-group="${g}"]')`, 200);
  evalJs(S, `(() => { document.getElementById('block-panel').scrollTop = 0; return 'true'; })()`);
  const rows = R(ROWS), wantRows = want.rows.filter((r) => r[0] !== 'text' || r[2] === 0).map((r) => r.map((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ') : v)));
  const key = (r) => (r[0] === 'select' ? [r[0]] : r[0] === 'seg' ? [r[0], r[1], r[2]] : r[0] === 'range' ? r.slice(0, 5) : r[0] === 'switch' ? r.slice(0, 3) : r.slice(0, 2));
  const same = JSON.stringify(rows.map(key)) === JSON.stringify(wantRows.map(key));
  const norm = (r) => (r[0] === 'text' ? [r[0], r[1].toLowerCase()] : key(r));
  const sameN = JSON.stringify(rows.map(norm)) === JSON.stringify(wantRows.map(norm));
  add(`${name}: rows, ranges, defaults, order`, same || sameN, `\n  ours ${JSON.stringify(rows.map(norm))}\n  want ${JSON.stringify(wantRows.map(norm))}`);
  const off = rows.map((r, i) => (wantRows[i] ? Math.abs(r[yOf(r)] - wantRows[i][yOf(wantRows[i])]) : 99));
  add(`${name}: row tops within 3px`, off.every((v) => v <= 3), JSON.stringify(rows.map((r, i) => `${r[1]}:${r[yOf(r)]}/${wantRows[i]?.[yOf(wantRows[i])]}`).filter((_, i) => off[i] > 3)));
  const bad = rows.filter((r) => r[0] === 'seg' || r[0] === 'button').map((r) => { const w = wantRows.find((x) => x[0] === r[0] && x[1] === r[1]); return w && near(r.slice(3, 7).filter((_, i) => i !== 1), w.slice(3, 7).filter((_, i) => i !== 1), 2) ? null : r[1]; }).filter(Boolean);
  add(`${name}: seg boxes`, !bad.length, JSON.stringify(bad));
  evalJs(S, `(() => { document.getElementById('block-panel').scrollTop = 0; return 'true'; })()`);
  await press(`P.querySelector('[data-fx-nav="back"]')`, 400);
  add(`${name}: Back goes to the list`, R(`!!P.querySelector('.bp-fx-grid')`) === true);
}

// A seg's presets, and that its last choice shows the rows.
await press(`P.querySelector('[data-fx-tile="circles"], .bp-fx-tile.is-on[aria-label="Circles"]')`, 500);
await press(`P.querySelector('.bp-fx-tile.is-on [data-fx-nav="settings"]')`, 400);
await press(`P.querySelector('[data-fx-group="Shape and Size"]')`, 250);
const seg = (key, val) => `P.querySelector('[data-fx-seg="${key}"][data-fx-val="${val}"]')`;
await press(seg('complex', 'High'), 300);
let e = effect(), want = F.presets['Circles.Complexity'].High;
add('Complexity High: its values', e.even === want['Scale even'] && e.odd === want['Scale odd'] && e.taperEven === want['Taper even'] && e.taperOdd === want['Taper odd'], JSON.stringify(e));
await undo();
add('A seg is one undo step', effect().complex === 'Low' && effect().even === 100, JSON.stringify(effect()));
await press(seg('complex', 'Complexity'), 300);
add('The last choice shows its rows', R(`!!P.querySelector('input[type=range][aria-label="Taper odd"]')`) === true);
const fills = R(`(() => { const f = (l) => { const i = P.querySelector('input[type=range][aria-label="' + l + '"]'); return [parseFloat(i.style.getPropertyValue('--from')), parseFloat(i.style.getPropertyValue('--to'))]; }; return { even: f('Taper even'), odd: f('Taper odd'), scale: f('Scale even') }; })()`);
add('Taper fills from the middle', near(fills.even, [50, 60], 0.1) && near(fills.odd, [40, 50], 0.1) && fills.scale[0] === 0, JSON.stringify(fills));
// Limit rings.
const swOn = `P.querySelector('input[aria-label="Limit rings"]').closest('label')`;
await press(seg('scale', 'Scale'), 200);
await press(swOn, 300);
add('Limit rings shows Ring count at 5', R(`P.querySelector('input[type=range][aria-label="Ring count"]')?.value`) === String(F.settingsNotes.ringCount.start), R(`P.querySelector('input[type=range][aria-label="Ring count"]')?.value`));
await undo();
add('A switch is one undo step', effect().limit === false && R(`!P.querySelector('input[aria-label="Ring count"]')`) === true);
// A slider: live, then one undo step on let go.
const before = effect();
const track = R(`(() => { const i = P.querySelector('input[type=range][aria-label="Center offset"]'); i.scrollIntoView({ block: 'nearest' }); const r = i.getBoundingClientRect(); return [r.left, r.top + r.height / 2, r.width]; })()`);
const x0 = track[0] + track[2] * 0.2, x1 = track[0] + track[2] * 0.7;
mouse(S, 'move', x0, track[1]); await pause(30); mouse(S, 'down', x0, track[1], { buttons: 1 }); await pause(50);
for (let i = 1; i <= 5; i++) { mouse(S, 'move', x0 + ((x1 - x0) * i) / 5, track[1], { buttons: 1 }); await pause(40); }
const mid = R(`JSON.parse(blk.querySelector('.imageEffectContainer').dataset.effect).a[0]`);
const midField = R(`P.querySelector('input[type=text][aria-label="Center offset"]').value`);
mouse(S, 'up', x1, track[1]); await pause(300);
add('A slider moves the drawing as it goes', mid > before.offset + 20 && String(mid) === midField, JSON.stringify([mid, midField]));
add('The value stays on let go', Math.abs(effect().offset - 70) <= 2, JSON.stringify(effect().offset));
await undo();
add('A slider is one undo step', effect().offset === before.offset, JSON.stringify(effect().offset));
// A field clamps.
await press(`P.querySelector('input[type=text][aria-label="Center offset"]')`, 60);
evalJs(S, `(() => { const i = document.querySelector('#block-panel input[type=text][aria-label="Center offset"]'); i.value = '500'; i.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(300);
add('A field keeps to its range', effect().offset === 100, JSON.stringify(effect().offset));
await undo();
// Interaction.
await press(`P.querySelector('[data-fx-group="Motion"]')`, 250);
await press(`P.querySelector('[data-fx-sel="interaction"]')`, 250);
const menu = R(`(() => { const m = document.getElementById('shape-pop'), r = m.getBoundingClientRect(); return { left: r.left - P0.left, w: r.width, over: r.top - P.querySelector('[data-fx-sel="interaction"]').getBoundingClientRect().top, items: [...m.querySelectorAll('button')].map((b) => [b.textContent.trim(), b.getBoundingClientRect().height, b.classList.contains('is-cur')]) }; })()`);
add('Interaction menu', menu.left === F.settingsNotes.menu.left && menu.over === F.settingsNotes.menu.overRow && menu.w === F.settingsNotes.menu.width && JSON.stringify(menu.items.map((i) => i[0])) === JSON.stringify(F.settingsNotes.menu.items) && menu.items.every((i) => i[1] === 45) && menu.items[0][2], JSON.stringify(menu));
await press(`document.querySelector('#shape-pop [data-fx-opt="None"]')`, 300);
add('None hides Intensity and Speed', effect().interaction === 'None' && R(`!P.querySelector('input[type=range][aria-label="Speed"]')`) === true, JSON.stringify(effect().interaction));
await undo();
add('Interaction is one undo step', effect().interaction === 'Mouse', JSON.stringify(effect().interaction));

// Back, Back leaves for Design; the overlay stays above the effect.
await press(`P.querySelector('[data-fx-nav="back"]')`, 300);
await press(`P.querySelector('[data-fx-nav="back"]')`, 300);
add('Back leaves the list for Design', R(`!!P.querySelector('[data-fx-nav="list"]')`) === true);
const order = R(`[...blk.querySelector('.fluid-image-container').children].map((c) => c.tagName + (c.className ? '.' + c.className.split(' ')[0] : ''))`);
add('The picture, then the effect', JSON.stringify(order.slice(0, 2)) === '["IMG","DIV.imageEffectContainer"]', JSON.stringify(order));
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`, 400);
add('Overlay sits on top', R(`blk.querySelector('.fluid-image-container').lastElementChild.classList.contains('fluidImageOverlay')`) === true);
await undo();
add('No other image took the effect', evalJs(S, `(() => JSON.stringify(fe.model.sections.flatMap((s) => s.blocks).filter((b) => b.effect && b.id !== '${bid}').length))()`) === 0);

// The saved page draws it too, with no editor around it.
evalJs(S, `(() => { document.getElementById('save').click(); return 'true'; })()`);
await pause(600);
goto(S, `${BASE}/page.html?saved`); await pause(1200);
evalJs(S, `(() => { document.querySelector('.imageEffectContainer').scrollIntoView(); return 'true'; })()`); await pause(500);
const page = evalJs(S, `(() => { const box = document.querySelector('.imageEffectContainer.is-on'); if (!box) return JSON.stringify(null); const c = box.querySelector('canvas'), g = c.getContext('webgl'), p = new Uint8Array(4); g.readPixels(c.width >> 1, c.height >> 1, 1, 1, g.RGBA, g.UNSIGNED_BYTE, p); return JSON.stringify({ w: c.width, a: p[3], img: getComputedStyle(box.parentElement.querySelector('img')).visibility, k: JSON.parse(box.dataset.effect).k }); })()`);
add('The page draws it, the picture hidden', page && page.w > 0 && page.a === 255 && page.img === 'hidden' && page.k === 3, JSON.stringify(page));

writeFileSync(new URL('../parity/image-effect-check.json', import.meta.url), `${JSON.stringify({ check: 'Image Effect', pass, total, results }, null, 1)}\n`);
console.log(`Image effect: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
