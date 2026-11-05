// T4: an image's Shape picker through real presses, against parity/findings/IMAGESHAPES.json.
// Writes parity/image-shape-check.json. Usage: npm run image-shape-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGESHAPES.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(46)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const made = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Image"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Content"]')?.click(); await sleep(150); const c = document.createElement('canvas'); c.width = 896; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#2d6'; g.fillRect(0, 0, 896, 1200); const blob = await new Promise((res) => c.toBlob(res, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'room.png', { type: 'image/png' })); const inp = P.querySelector('[data-image-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); await sleep(600); return JSON.stringify({ sid: s.id, bid: b.id, panel: !P.hidden }); })()`);
const { sid, bid } = made;
const M = `fe.model.sections.find((s) => s.id === '${sid}').blocks.find((b) => b.id === '${bid}')`;
const PX = `const P = document.getElementById('block-panel'), P0 = P.getBoundingClientRect(); const fr = document.getElementById('site-frame'), d = fr.contentDocument, W = fr.contentWindow; const blk = d.getElementById('block-${bid}'); const box = blk.querySelector('.fluid-image-container'), q = blk.closest('.fe-block').getBoundingClientRect(); const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height]; };`;
const R = (js) => evalJs(S, `(() => { ${PX} return JSON.stringify(${js}); })()`);
const act = async (js, wait = 300) => { evalJs(S, `(() => { ${PX} ${js}; return 'true'; })()`); await pause(wait); };
const center = (sel) => R(`(() => { const e = ${sel}; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const press = async (sel, wait = 300) => { const c = center(sel); mouse(S, 'move', c[0], c[1]); await pause(30); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(wait); };
const undo = () => act(`document.getElementById('undo').click()`, 300);
const tile = (name) => `[...P.querySelectorAll('.bp-ishape-tile')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(name)})`;
const tab = (t) => press(`P.querySelector('[data-image-tab="${t}"]')`);
const mode = (m) => press(`P.querySelector('[data-image-mode="${m}"]')`);
const nav = () => press(`P.querySelector('[data-image-nav="shape"]')`, 350);
const back = () => press(`P.querySelector('[data-image-nav="back"]')`, 350);
const curTab = () => R(`P.querySelector('.bp-ishape-tab.is-on').textContent`);
const chosen = () => R(`[...P.querySelectorAll('.bp-ishape-tile.is-on')].map((e) => e.getAttribute('aria-label'))`);
// Clip and box of the picture; hit() asks the page whether a point of the box is inside the clip.
const clip = () => R(`(() => { const c = W.getComputedStyle(box).clipPath, id = c.match(/#([^"')]+)/)?.[1], def = id && d.getElementById(id); return { clip: c, units: def?.getAttribute('clipPathUnits'), d: def?.querySelector('path')?.getAttribute('d'), box: [box.getBoundingClientRect().width, box.getBoundingClientRect().height], block: [q.width, q.height], off: [box.getBoundingClientRect().left - q.left, box.getBoundingClientRect().top - q.top] }; })()`);
const hit = (u, v) => R(`(() => { blk.closest('.fe-block').scrollIntoView({ block: 'center' }); const r = box.getBoundingClientRect(); const e = d.elementFromPoint(r.left + r.width * ${u}, r.top + r.height * ${v}); return !!e && box.contains(e); })()`);

// Fill to Shape: the row, then the picker.
await act(`P.querySelector('[data-btab="Design"]').click()`, 280);
await mode('shape');
const row = R(`(() => { const e = P.querySelector('[data-image-nav="shape"]'), l = e.querySelector('.sp-label'), r = l.getBoundingClientRect(); return { top: r.top - P0.top + r.height / 2, label: l.textContent, value: e.querySelector('.bp-chip-v').textContent.trim(), dim: e.hasAttribute('data-unbuilt') }; })()`);
add('The Shape row is a button with no value', row.label === F.row.label && row.value === '' && !row.dim, JSON.stringify(row));
add('The Shape row sits where measured', Math.abs(row.top - (F.row.top + 11)) <= 3, JSON.stringify(row));
const start = clip();
add('A new Shape is a circle', start.clip.startsWith('circle') , start.clip);
await nav();
const view = R(`{ back: rel(P.querySelector('[data-image-nav="back"]')), title: P.querySelector('.bp-ishape-head span').textContent, tabs: [...P.querySelectorAll('[data-image-tab]')].map((e) => [e.dataset.imageTab, ...rel(e), getComputedStyle(e).color, getComputedStyle(e).fontSize]) }`);
add('Back sits where measured', near(view.back, F.view.back, 4), JSON.stringify(view.back));
add('Title is Shape', view.title === 'Shape');
for (const t of view.tabs) add(`Tab ${t[0]} box`, near(t.slice(1, 5), F.view.tabs[t[0]]), JSON.stringify(t));
add('Opens on 1:1, tab colors', view.tabs[0][5] === F.view.tabColor.on && view.tabs[1][5] === F.view.tabColor.off && view.tabs[0][6] === F.view.tabFont, JSON.stringify(view.tabs));
add('Circle is chosen', JSON.stringify(chosen()) === '["Circle"]', JSON.stringify(chosen()));
// Every tile of every tab: the name, the order, the box, the drawn size.
for (const t of Object.keys(F.names)) {
  await tab(t);
  const rows = R(`[...P.querySelectorAll('.bp-ishape-tile')].map((e) => ({ name: e.getAttribute('aria-label'), box: rel(e), path: rel(e.querySelector('.bp-ishape-fill')), fill: getComputedStyle(e.querySelector('.bp-ishape-fill')).fill }))`);
  add(`${t}: names and order`, JSON.stringify(rows.map((r) => r.name)) === JSON.stringify(F.names[t]), JSON.stringify(rows.map((r) => r.name)));
  const tileAt = (i) => [F.tile.columns[i % 3], F.tile.first[1] + F.tile.rowPitch * Math.floor(i / 3), ...F.tile.box];
  add(`${t}: tile boxes`, rows.every((r, i) => near(r.box, tileAt(i), 1)), JSON.stringify(rows.slice(0, 4).map((r) => r.box)));
  add(`${t}: drawn size`, rows.every((r) => near(r.path.slice(2), F.tile.drawn[t], 2.2)), JSON.stringify(rows.filter((r) => !near(r.path.slice(2), F.tile.drawn[t], 2.2)).map((r) => [r.name, r.path])));
  add(`${t}: drawn in the middle`, rows.every((r) => near([r.path[0] + r.path[2] / 2 - r.box[0], r.path[1] + r.path[3] / 2 - r.box[1]], [48, 44], 1.5)), JSON.stringify(rows.slice(0, 3).map((r) => r.path)));
  add(`${t}: fill`, rows.every((r) => r.fill === F.tile.fill), rows[0].fill);
}
const before = clip();
await tab('2:3');
add('A tab changes the list only', clip().clip === before.clip && R(`${M}.imageShape ?? null`) === null);

// Every shape: the press writes it, the clip stretches with the box, the box stays.
let wrote = 0, bad = [];
for (const t of Object.keys(F.names)) {
  await tab(t);
  for (const name of F.names[t]) {
    await press(tile(name), 180);
    const c = clip();
    const ok = (name === 'Circle' ? c.clip.startsWith('circle') : c.units === 'objectBoundingBox' && c.d?.length > 5) && JSON.stringify(chosen()) === JSON.stringify([name]);
    if (ok) wrote++; else bad.push([name, c.clip, chosen()]);
  }
}
add('All 35 press to their clip and ring', wrote === 35 && bad.length === 0, JSON.stringify(bad));
await tab('3:2'); await press(tile('Horizontal oval'));
let c = clip();
const side = Math.min(...c.block);
add('A 3:2 shape keeps the square box', near(c.box, [side, side]), JSON.stringify(c));
add('The box stays centred', near(c.off, [(c.block[0] - side) / 2, (c.block[1] - side) / 2]), JSON.stringify(c));
hit(0.5, 0.5); await pause(250);
const ovalHits = [hit(0.42, 0.03), hit(0.03, 0.03), hit(0.5, 0.5)];
add('Horizontal oval draws as a circle in it', JSON.stringify(ovalHits) === '[true,false,true]', JSON.stringify(ovalHits));
await tab('2:3'); await press(tile('Arched window'));
add('Arched window fills the bottom corners', hit(0.02, 0.98) === true && hit(0.02, 0.02) === false);
await press(tile('Hourglass'));
add('Hourglass is cut at the waist', hit(0.1, 0.5) === false && hit(0.5, 0.5) === true && hit(0.1, 0.05) === true);
// Reopening: the chosen shape's tab, also after looking at another.
await tab('1:1'); await back();
add('Back returns to Design', R(`!!P.querySelector('[data-image-mode]') && !P.querySelector('.bp-ishape-grid')`) === true);
await nav();
add('Reopens on the shape\'s tab', R(`P.querySelector('.bp-ishape-tab.is-on').textContent`) === '2:3' && JSON.stringify(chosen()) === '["Hourglass"]', curTab());
// The list scrolls under Back, the tabs go with it.
await tab('1:1');
const sc = R(`(() => { let e = P; while (e && e.scrollHeight <= e.clientHeight + 20) e = e.parentElement; e.scrollTop = e.scrollHeight; return { top: e.scrollTop, back: rel(P.querySelector('[data-image-nav="back"]'))[1], tabs: rel(P.querySelector('[data-image-tab]'))[1] }; })()`);
add('Back stays while the list scrolls', sc.top > 0 && Math.abs(sc.back - F.scroll.back) <= 4 && sc.tabs < 55, JSON.stringify(sc));
await act(`P.querySelector('[data-image-tab="2:3"]').click()`, 200);
add('A new tab starts at the top', R(`rel(P.querySelector('[data-image-tab]'))[1]`) === F.view.tabs['1:1'][1], R(`rel(P.querySelector('[data-image-tab]'))`));
await back();
// Stretch keeps the shape.
await press(`P.querySelector('input[data-image-set="stretch"]').closest('label')`);
c = clip();
add('Stretch: the box fills the block, shape kept', near(c.box, c.block) && c.d && c.units === 'objectBoundingBox', JSON.stringify(c));
await press(`P.querySelector('input[data-image-set="stretch"]').closest('label')`);
c = clip();
add('Stretch off: the square again', near(c.box, [side, side]) && !!c.d, JSON.stringify(c));
// Fill and Fit have no clip, and Shape brings it back.
await mode('fill'); c = clip();
add('Fill has no clip', c.clip === 'none', c.clip);
await mode('shape'); c = clip();
add('Shape brings it back', !!c.d && R(`${M}.imageShape`) === 'hourglass', JSON.stringify(c));
await mode('fit'); c = clip();
add('Fit has no clip', c.clip === 'none', c.clip);
await mode('shape');
// One undo step per pick, and Circle leaves nothing on the block.
await nav(); await tab('1:1'); await press(tile('Gear'));
add('Gear is written', R(`${M}.imageShape`) === 'gear');
await undo();
add('One undo step back to Hourglass', R(`${M}.imageShape`) === 'hourglass', R(`${M}.imageShape`));
add('The picker stays open through undo', R(`!!P.querySelector('.bp-ishape-grid')`) === true);
await press(tile('Circle'));
add('Circle writes nothing on the block', R(`${M}.imageShape ?? null`) === null && clip().clip.startsWith('circle'), clip().clip);
// A pick stays on its image: the next new image opens on Fit (IMAGESHAPES.leak).
await press(tile('Gear'));
const off = evalJs(S, `(() => { const f = document.getElementById('site-frame'), r = f.contentDocument.querySelectorAll('.page-section')[1].getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width - 60, 500]); })()`);
mouse(S, 'move', off[0], off[1]); await pause(60); mouse(S, 'down', off[0], off[1], { buttons: 1 }); await pause(40); mouse(S, 'up', off[0], off[1]); await pause(350);
const next = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Image"]').click(); await sleep(450); const b = fe.model.sections[1].blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Design"]')?.click(); await sleep(250); return JSON.stringify({ id: b.id, shape: b.imageShape ?? null, on: [...P.querySelectorAll('[data-image-mode][aria-checked="true"]')].map((e) => e.textContent) }); })()`);
add('After a pick: a new image opens on Fit', next.id !== bid && next.shape === null && next.on.join() === F.leak.next, JSON.stringify(next));
add('After a pick: the first image keeps its shape', R(`${M}.imageShape`) === 'gear', R(`${M}.imageShape`));
writeFileSync(new URL('../parity/image-shape-check.json', import.meta.url), `${JSON.stringify({ check: 'an image Shape picker', pass, total, results }, null, 1)}\n`);
console.log(`Image shapes: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
