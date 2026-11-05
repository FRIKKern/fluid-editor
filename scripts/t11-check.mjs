// T11: a new Line, Map and Social Links through the real menu, against parity/findings/T11.json.
// Writes parity/t11-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run t11-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/T11.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(50)} ${ok ? 'match' : `DIFF ${detail ?? ''}`}`); };
const near = (a, b, tol = 0.7) => Math.abs(a - b) <= tol;
const nearAll = (a, b, tol) => a.length === b.length && a.every((v, i) => near(v, b[i], tol));

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
const fresh = async (name) => {
  goto(S, `${BASE}/index.html`); await pause(1600);
  const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
  mouse(S, 'move', spot[0], spot[1]); await pause(350);
  return evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="${name}"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(250); return JSON.stringify({ sid: s.id, id: b.id }); })()`);
};
const q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'); const pop = document.getElementById('shape-pop'); const fr = document.getElementById('site-frame'); const W = fr.contentWindow; const block = (id) => fr.contentDocument.querySelector('.fe-block[data-block-id="' + id + '"]'); const P = () => panel.getBoundingClientRect(); const rel = (e) => { const r = e.getBoundingClientRect(), o = P(); return [r.left - o.left, r.top - o.top + panel.scrollTop, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; const box = (e, q) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; ${body} })()`);
const click = (sel, wait = 240) => q(`const e = (${sel}); if (!e) throw new Error('no element: ' + ${JSON.stringify(sel)}); e.click(); await sleep(${wait}); return 'true';`);
const tab = (t) => click(`panel.querySelector('[data-btab="${t}"]')`);
const tabs = () => q(`return JSON.stringify([...panel.querySelectorAll('[data-btab]')].map((t) => t.textContent));`);
const words = () => q(`return JSON.stringify([...panel.querySelectorAll('.sp-body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()));`);

// Line
let { id } = await fresh('Line');
const line = q(`const f = block('${id}'), q = f.getBoundingClientRect(), W2 = fr.contentWindow, c = W2.getComputedStyle(f); const content = f.querySelector('.sqs-block-content'), hr = f.querySelector('hr'); return JSON.stringify({ area: [c.gridRowStart, c.gridColumnStart, c.gridRowEnd, c.gridColumnEnd].map(Number), box: [q.width, q.height], content: box(content, q), hr: box(hr, q), bg: W2.getComputedStyle(hr).backgroundColor, ink: W2.getComputedStyle(f).color });`);
add('Line: area', line.area.join() === F.line.area.join(), line.area);
add('Line: block', nearAll(line.box, F.line.box), line.box);
add('Line: content box', nearAll(line.content, F.line.content), line.content);
add('Line: 1px rule', nearAll(line.hr, F.line.hr), line.hr);
add('Line: rule in the section ink', line.bg === line.ink, `${line.bg} ${line.ink}`);
add('Line: Design and Animation tabs', tabs().join() === F.line.tabs.join(), tabs());
add('Line: Design has transforms alone', q(`return JSON.stringify(!panel.querySelector('input[data-design="background"]') && !!panel.querySelector('input[data-design="opacity"]'));`));

// Social Links
({ id } = await fresh('Social Links'));
const soc = () => q(`const f = block('${id}'), q = f.getBoundingClientRect(), c = W.getComputedStyle(f), o = f.querySelector('.sqs-svg-icon--outer'), n = f.querySelector('nav'), as = [...f.querySelectorAll('nav a')], first = as[0], svg = first?.querySelector('svg'), ct = f.querySelector('.sqs-block-content'); const s1 = first && W.getComputedStyle(first); return JSON.stringify({ rows: Number(c.gridRowEnd) - Number(c.gridRowStart), area: [c.gridRowStart, c.gridColumnStart, c.gridRowEnd, c.gridColumnEnd].map(Number), size: [q.width, q.height], content: [ct.getBoundingClientRect().top - q.top, ct.getBoundingClientRect().height], gap: W.getComputedStyle(n).gap, cls: o.className, n: as.length, labels: as.map((a) => a.getAttribute('aria-label')), first: first && box(first, q), svg: first && box(svg, first.getBoundingClientRect()), radius: s1?.borderRadius, shadow: s1?.boxShadow, bg: s1?.backgroundColor, blockBg: W.getComputedStyle(f.querySelector('.sqs-block')).backgroundColor, firstFill: svg && W.getComputedStyle(svg.querySelector('.sqs-use--icon') || svg).fill, mask: !!svg?.querySelector('mask') });`);
const set = (k, v) => click(`panel.querySelector('[data-soc-set="${k}"][data-v="${v}"]')`);
let r = soc();
add('Social: area and box', r.area.join() === F.social.area.join() && nearAll(r.size, F.social.box), `${r.area} ${r.size}`);
add('Social: the oracle classes', r.cls === F.social.classes, r.cls);
add('Social: three icons, 20 apart 12', r.n === 3 && r.gap === '12px' && nearAll(r.first, [70.1, 0, 20, 20]), `${r.n} ${r.gap} ${r.first}`);
add('Social: svg twice the link at -50%', nearAll(r.svg, [-10, -10, 40, 40]), r.svg);
add('Social: tabs', tabs().join() === F.social.tabs.join(), tabs());
add('Social: starts on Content', q(`return JSON.stringify(panel.querySelector('[data-btab="Content"]').classList.contains('is-on'));`));
const row0 = q(`const R = panel.querySelector('.bp-soc-row'); const name = R.querySelector('.bp-soc-name'), st = R.querySelector('.bp-soc-state'), go = R.querySelector('.bp-soc-go'), addB = panel.querySelector('.bp-soc-add'); return JSON.stringify({ h: R.getBoundingClientRect().height, name: rel(name).slice(0, 2), state: rel(st), go: rel(go), add: rel(addB), text: name.textContent, s: st.textContent, aria: go.getAttribute('aria-label') });`);
const C = F.social.content;
add('Social: a row is 56 high', row0.h === C.row.height, row0.h);
add('Social: row name and state where they are', nearAll(row0.name, C.row.label.slice(0, 2), 1.5) && nearAll(row0.state, C.row.state, 1.5), `${row0.name} ${row0.state}`);
add('Social: row arrow', nearAll(row0.go, C.row.chevron, 1.5) && row0.aria === 'Navigate to /squarespace', `${row0.go} ${row0.aria}`);
add('Social: Add Social Link box', nearAll(row0.add, C.add, 1.5), row0.add);
add('Social: rows read /squarespace, visible', row0.text === '/squarespace' && row0.s === 'visible');

await tab('Design');
const seg = () => q(`return JSON.stringify([...panel.querySelectorAll('.bp-sgrp')].map(rel));`);
const sg = seg();
add('Social: Border, Alignment and Size groups', sg.length === 3 && near(sg[0][1], 119, 1.5) && near(sg[1][1], 212, 1.5) && near(sg[2][1], 305, 1.5) && near(sg[0][0], 16) && near(sg[0][2], 288), JSON.stringify(sg));
add('Social: Background row under them', near(q(`return JSON.stringify(rel(panel.querySelector('input[data-design="background"]').closest('.sp-row'))[1]);`), 344, 1.5));
const dw = words();
add('Social: the words in order', ['Border', 'Alignment', 'Size', 'XS', 'S', 'M', 'L', 'XL', 'Background', 'Stroke', 'Blend Mode', 'Blur'].every((w, i, a) => dw.indexOf(w) >= 0 && (i === 0 || dw.indexOf(w) > dw.indexOf(a[i - 1]))), dw.join());
// Rows and sizes in the oracle's own order, so the row rule shows.
const NONE = F.social.none, BORDER = F.social.border;
const WORD = { XS: 'extra-small', S: 'small', M: 'medium', L: 'large', XL: 'extra-large' };
for (const [z, rows] of F.social.sequences) {
  await set('iconSize', z);
  r = soc();
  add(`Size ${z}: ${NONE[z][0]}px, gap ${NONE[z][1]}, ${rows} row${rows > 1 ? 's' : ''}`, near(r.first[2], NONE[z][0]) && r.gap === `${NONE[z][1]}px` && r.rows === rows && r.cls.includes(`social-icons-size-${WORD[z]}`), `${r.first} ${r.gap} ${r.rows} ${r.cls}`);
}
for (const [a, x] of Object.entries(F.social.alignFirstX)) {
  await set('align', a.toLowerCase());
  r = soc();
  add(`Alignment ${a}: first icon at ${x}`, near(r.first[0], x), r.first);
}
await set('align', 'center');
for (const [name, v] of [['Square', 'square'], ['Circle', 'circle'], ['Rounded', 'rounded']]) {
  await set('iconBorder', v);
  r = soc();
  add(`${name}: S is 28, gap 8, radius ${F.social.radius[name]}`, near(r.first[2], 28) && r.gap === '8px' && r.radius === F.social.radius[name] && r.cls.includes(`social-icons-shape-${v}`) && r.cls.includes('social-icons-style-knockout'), `${r.first} ${r.gap} ${r.radius} ${r.cls}`);
  add(`${name}: svg fills the link, mask cut`, nearAll(r.svg, [0, 0, 28, 28]) && r.mask, `${r.svg} ${r.mask}`);
}
for (const z of ['XS', 'M', 'L', 'XL']) {
  await set('iconSize', z);
  r = soc();
  add(`Border size ${z}: ${BORDER[z][0]}px, gap ${BORDER[z][1]}`, near(r.first[2], BORDER[z][0]) && r.gap === `${BORDER[z][1]}px`, `${r.first} ${r.gap}`);
}
await set('iconSize', 'S');
add('Style: three choices under Border', q(`return JSON.stringify([...panel.querySelectorAll('[data-soc-set="iconStyle"]')].map((b) => b.textContent).join() === ${JSON.stringify(Object.keys(F.social.styles).join())});`));
await set('iconStyle', 'border');
r = soc();
const [lo, hi, step, def] = F.social.styles.Outline.thickness;
const range = q(`const t = panel.querySelector('[data-soc-thick]'); return JSON.stringify([t.min, t.max, t.step, t.value].map(Number));`);
add('Outline: Thickness 1 to 5, 2 by default', range.join() === [lo, hi, step, def].join(), range);
add('Outline: inset 2px of the ink, no fill', /inset/.test(r.shadow) && /2px/.test(r.shadow) && r.bg === 'rgba(0, 0, 0, 0)' && r.cls.includes('social-icons-style-border'), `${r.shadow} ${r.bg}`);
q(`const t = panel.querySelector('[data-soc-thick]'); t.value = 5; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); await sleep(220); return 'true';`);
r = soc();
add('Outline: Thickness 5', /5px/.test(r.shadow), r.shadow);
const under = q(`return JSON.stringify(rel(panel.querySelectorAll('.bp-soccap')[1]));`);
add('Outline: Alignment moves to 313', near(under[1], 313, 1.5), under);
await set('iconStyle', 'solid');
r = soc();
add('Solid: ink box, lightAccent glyph', r.bg !== 'rgba(0, 0, 0, 0)' && r.cls.includes('social-icons-style-solid') && /^rgb\(\d+, \d+, \d+\)$/.test(r.firstFill) && r.firstFill !== r.bg, `${r.bg} ${r.firstFill}`);
await set('iconBorder', '');
r = soc();
add('None: back to 20 and 12, regular', near(r.first[2], 20) && r.gap === '12px' && r.cls.includes('social-icons-style-regular'), `${r.first} ${r.gap} ${r.cls}`);
await click(`panel.querySelector('input[data-design="background"]')`, 300);
r = soc();
const bw = words();
add('Background: white, padding 6%', r.blockBg === F.social.background.blockBg && near(r.content[1], F.social.background.content[1]) && near(r.first[1], F.social.background.firstY), `${r.blockBg} ${r.content} ${r.first}`);
add('Background: its rows in order', ['Background', 'Background Color', 'Stroke', 'Corner', 'Padding', 'Blend Mode', 'Blur'].every((w, i, a) => bw.indexOf(w) >= 0 && (i === 0 || bw.indexOf(w) > bw.indexOf(a[i - 1]))), bw.join());
await click(`panel.querySelector('input[data-design="background"]')`, 300);

// The list: one for the whole site, in the browser here.
await tab('Content');
const type = (text) => q(`const f = panel.querySelector('[data-soc-add]') || panel.querySelector('[data-soc-url]'); f.focus(); f.value = ${JSON.stringify(text)}; f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sleep(240); return 'true';`);
const list = () => q(`return JSON.stringify([...panel.querySelectorAll('.bp-soc-row')].map((x) => [x.querySelector('.bp-soc-name').textContent, x.querySelector('.bp-soc-state').textContent]));`);
await click(`panel.querySelector('[data-social="add"]')`);
add('Add: a field takes its place, focused', q(`return JSON.stringify(document.activeElement === panel.querySelector('[data-soc-add]') && !panel.querySelector('.bp-soc-add'));`));
for (const t of F.social.typed) {
  const before = list().length;
  const text = t.typed === 'hello' ? 'hello' : t.typed.includes('youtube') ? 'https://www.youtube.com/abc' : t.typed.includes('mailto') ? 'mailto:a@example.com' : 'https://example.com/me';
  if (!q(`return JSON.stringify(!!panel.querySelector('[data-soc-add]'));`)) await click(`panel.querySelector('[data-social="add"]')`);
  await type(text);
  if (t.error) {
    add(`Add ${text}: ${t.error}`, q(`return JSON.stringify(panel.querySelector('.bp-soc-err')?.textContent);`) === t.error && list().length === before);
  } else {
    const l = list(), want = t.label === 'the whole text' ? text : t.label;
    r = soc();
    add(`Add ${text}: named ${want}, icon ${t.aria}`, l.length === before + 1 && l.at(-1)[0] === want && l.at(-1)[1] === 'visible' && r.labels.at(-1) === t.aria, `${JSON.stringify(l.at(-1))} ${r.labels}`);
  }
}
q(`const f = panel.querySelector('[data-soc-add]'); f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await sleep(200); return 'true';`);
await click(`panel.querySelector('[data-social="open:0"]')`);
const det = q(`const w = [...panel.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()); w.push(panel.querySelector('.bp-back').textContent.trim()); return JSON.stringify({ w, tabs: panel.querySelectorAll('[data-btab]').length, v: panel.querySelector('[data-soc-url]').value });`);
add('Row: Back, title, Profile Link, switch, Delete', [F.social.detail.title, F.social.detail.field, F.social.detail.switch, F.social.detail.delete].every((x) => det.w.includes(x)) && det.w.includes('Back') && det.tabs === 0, det.w.join());
add('Row: Profile Link holds the link', det.v.endsWith(F.social.detail.value), det.v);
const nBefore = soc().n;
await click(`panel.querySelector('[data-soc-show="0"]')`, 260);
r = soc();
add('Display Social Icon off: icon goes, others close up', r.n === nBefore - 1 && !r.labels.includes('Instagram'), r.labels);
await click(`panel.querySelector('[data-social="back"]')`);
add('The row then reads hidden', list()[0][1] === F.social.hidden.state, list()[0]);
await click(`panel.querySelector('[data-social="open:0"]')`);
await click(`panel.querySelector('[data-social="delete:0"]')`);
const dlg = q(`const d = document.querySelector('.ss-confirm-box'), r = d.getBoundingClientRect(); return JSON.stringify({ box: [r.left, r.top, r.width, r.height].map(Math.round), t: document.getElementById('ss-confirm-title').textContent, b: document.getElementById('ss-confirm-body').textContent, btn: [...d.querySelectorAll('button')].map((x) => x.textContent) });`);
add('Delete asks first, as on the oracle', dlg.t === F.social.dialog.title && dlg.b === F.social.dialog.body && dlg.btn.join() === F.social.dialog.buttons.join() && nearAll(dlg.box, F.social.dialog.box, 2), JSON.stringify(dlg));
await click(`[...document.querySelectorAll('.ss-confirm-box button')][0]`);
add('Cancel keeps the row', list().length === 0 && q(`return JSON.stringify(document.getElementById('ss-confirm').hidden);`) && JSON.parse(JSON.stringify(fe_len())) === nBefore);
function fe_len() { return q(`return JSON.stringify(fe.model.socialLinks.length);`); }
await click(`panel.querySelector('[data-social="delete:0"]')`);
await click(`document.getElementById('ss-confirm-reset')`, 300);
add('Delete takes it from the list', fe_len() === nBefore - 1 && list().length === nBefore - 1, `${fe_len()} ${list().length} ${nBefore}`);
add('Reset dialog keeps its own word', q(`document.getElementById('ss-confirm').hidden = true; return JSON.stringify(document.getElementById('ss-confirm').classList.contains('is-social') === false);`));
const undone = q(`const had = fe.model.socialLinks.length; fe.undo(); await sleep(280); return JSON.stringify([had, fe.model.socialLinks.length]);`);
add('Undo brings a deleted row back', undone[1] === undone[0] + 1, undone);

// Map
({ id } = await fresh('Map'));
const map = () => q(`const f = block('${id}'), q = f.getBoundingClientRect(), c = W.getComputedStyle(f), pm = f.querySelector('.page-map'), pin = f.querySelector('.fe-map-pin'), ctl = f.querySelector('.fe-map-controls'); return JSON.stringify({ area: [c.gridRowStart, c.gridColumnStart, c.gridRowEnd, c.gridColumnEnd].map(Number), size: [q.width, q.height], map: box(pm, q), ctx: JSON.parse(pm.dataset.context), tip: [pin.getBoundingClientRect().left + pin.getBoundingClientRect().width / 2 - q.left, pin.getBoundingClientRect().bottom - q.top], ctl: ctl && box(ctl, q), labels: !!f.querySelector('.m-label'), hills: !!f.querySelector('.m-hill'), land: W.getComputedStyle(pm).getPropertyValue('--m-land') });`);
r = map();
add('Map: area and box', r.area.join() === F.map.area.join() && nearAll(r.size, F.map.box), `${r.area} ${r.size}`);
add('Map: fills the block', nearAll(r.map, [0, 0, F.map.box[0], F.map.box[1]]), r.map);
add('Map: defaults', r.ctx.style === F.map.defaults.style && r.ctx.labels === F.map.defaults.labels && r.ctx.terrain === F.map.defaults.terrain && r.ctx.controls === F.map.defaults.controls && r.ctx.location.mapZoom === F.map.defaults.zoom, JSON.stringify(r.ctx));
add('Map: pin tip at the middle', near(r.tip[0], F.map.box[0] / 2, 1) && near(r.tip[1], F.map.box[1] / 2, 1), r.tip);
add('Map: tabs', tabs().join() === F.map.tabs.join(), tabs());
const fields = q(`return JSON.stringify([...panel.querySelectorAll('.bp-mapf')].map((l) => { const i = l.querySelector('input'); return { label: l.querySelector('.bp-soccap').textContent, placeholder: i.placeholder, box: rel(i) }; }));`);
add('Map: the four fields, placeholders and boxes', fields.length === 4 && fields.every((x, i) => x.label === F.map.fields[i].label && x.placeholder === F.map.fields[i].placeholder && nearAll(x.box, F.map.fields[i].box, 1.5)), JSON.stringify(fields));
await tab('Design');
const dbox = q(`return JSON.stringify({ picker: rel(panel.querySelector('.bp-map-style')), zoom: rel(panel.querySelector('[data-map-zoomfield]')), dec: rel(panel.querySelector('[aria-label="decrement"]')), inc: rel(panel.querySelector('[aria-label="increment"]')), v: panel.querySelector('[data-map-zoomfield]').value });`);
add('Map: picker box', nearAll(dbox.picker, F.map.picker, 1.5), dbox.picker);
add('Map: Zoom field and buttons', nearAll(dbox.zoom, F.map.zoomField, 1.5) && nearAll(dbox.dec, F.map.decrement, 1.5) && nearAll(dbox.inc, F.map.increment, 1.5) && dbox.v === '1', JSON.stringify(dbox));
const mw = words();
add('Map: Design words in order', ['Grayscale', 'Elements', 'Zoom', 'x', 'Labels', 'Terrain', 'Controls', 'Transforms'].every((w, i, a) => mw.indexOf(w) >= 0 && (i === 0 || mw.indexOf(w) > mw.indexOf(a[i - 1]))), mw.join());
await click(`panel.querySelector('.bp-map-style')`);
const popup = q(`const r = pop.getBoundingClientRect(), t = panel.querySelector('.bp-map-style').getBoundingClientRect(), on = pop.querySelector('.is-on').getBoundingClientRect(); return JSON.stringify({ names: [...pop.querySelectorAll('[data-map-pick]')].map((b) => b.querySelector('span').textContent), w: r.width, h: r.height, row: on.height, over: [on.left - t.left, on.top - t.top], check: !!pop.querySelector('.is-on svg:last-child') });`);
add('Map: style list, in order', popup.names.join() === F.map.styles.map(([n]) => n).join(), popup.names);
add('Map: list 276 by 540, rows of 88', popup.w === F.map.stylePopup.box[2] && popup.h === F.map.stylePopup.box[3] && popup.row === F.map.stylePopup.row, JSON.stringify(popup));
add('Map: the chosen row sits over the picker, with a check', near(popup.over[0], 0, 1) && near(popup.over[1], 0, 1) && popup.check, popup.over);
await click(`panel.querySelector('.bp-map-style')`);
add('Map: pressing the picker again closes the list', q(`return JSON.stringify(pop.hidden);`));
const lands = new Set();
for (const [n, v] of F.map.styles) {
  await click(`panel.querySelector('.bp-map-style')`);
  await click(`pop.querySelector('[data-map-pick="${v}"]')`, 260);
  r = map(); lands.add(r.land);
  add(`Map style ${n} is ${v}`, r.ctx.style === v && q(`return JSON.stringify(panel.querySelector('.bp-map-style').textContent.trim());`) === n, r.ctx.style);
}
add('Map: six looks', lands.size === 6, [...lands].join());
await click(`panel.querySelector('.bp-map-style')`);
await click(`pop.querySelector('[data-map-pick="2"]')`, 260);
const ladder = F.map.zoomLadder;
let zok = true, bad = '';
for (let z = 11; z >= 0; z--) { await click(`panel.querySelector('[aria-label="decrement"]')`, 60); const v = q(`return JSON.stringify(panel.querySelector('[data-map-zoomfield]').value);`); const c = map().ctx.location.mapZoom; if (v !== ladder[z] || c !== z) { zok = false; bad = `${z} ${v} ${c}`; } }
add('Zoom down: the ladder to 0, then disabled', zok && q(`return JSON.stringify(panel.querySelector('[aria-label="decrement"]').disabled);`), bad);
zok = true;
for (let z = 1; z <= 22; z++) { await click(`panel.querySelector('[aria-label="increment"]')`, 60); const v = q(`return JSON.stringify(panel.querySelector('[data-map-zoomfield]').value);`); const c = map().ctx.location.mapZoom; if (v !== ladder[z] || c !== z) { zok = false; bad = `${z} ${v} ${c}`; } }
add('Zoom up: the ladder to 7, then disabled', zok && q(`return JSON.stringify(panel.querySelector('[aria-label="increment"]').disabled);`), bad);
await click(`panel.querySelector('[data-map-set="mapLabels"]')`, 200);
r = map(); add('Labels off', r.ctx.labels === false && !r.labels, JSON.stringify(r.ctx));
await click(`panel.querySelector('[data-map-set="mapTerrain"]')`, 200);
r = map(); add('Terrain on', r.ctx.terrain === true && r.hills, JSON.stringify(r.ctx));
await click(`panel.querySelector('[data-map-set="mapControls"]')`, 200);
r = map();
const cb = F.map.controls.box;
add('Controls on: the zoom box in place', r.ctx.controls === true && r.ctl && near(r.ctl[0], cb[0] - 100, 3) && near(r.ctl[1], cb[1] - 298, 3) && near(r.ctl[2], cb[2]) && near(r.ctl[3], cb[3]), r.ctl);
const pad = q(`const was = JSON.stringify(fe.model.sections[1].blocks.at(-1).mapStyle); fe.undo(); await sleep(250); return JSON.stringify(fe.model.sections[1].blocks.at(-1).mapControls ?? false);`);
add('One undo step per press', pad === false, pad);

writeFileSync(new URL('../parity/t11-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nT11: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
