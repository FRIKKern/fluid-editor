// T11: a new Line, Map and Social Links through the real menu, against parity/findings/T11.json.
// Writes parity/t11-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run t11-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag, browser } from './lib/cmux.mjs';
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
add('Display Social Icon off: icon goes, others close up', r.n === nBefore - 1 && !r.labels.includes('Instagram') && !r.labels.includes('instagram-unauth'), r.labels);
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

// Labels, the grip, typing in Zoom and the phone (T11.json: social.labels, social.phone, map.zoomTyped).
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
({ id } = await fresh('Social Links'));
r = soc();
add('Labels: a row nobody touched', r.labels.join() === F.social.labels.untouched.join(), r.labels);
const hosts = () => q(`return JSON.stringify(fe.model.socialLinks ? fe.model.socialLinks.map((l) => l.url.split('/')[2].split('.')[0]) : null);`);
const canvasHosts = () => q(`return JSON.stringify([...block('${id}').querySelectorAll('nav a')].map((a) => a.getAttribute('href').split('/')[2].split('.')[0]));`);
const gripAt = (n) => q(`const g = panel.querySelectorAll('.bp-soc-grip')[${n}], r = g.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2, g.hasAttribute('data-unbuilt')]);`);
let grip = gripAt(0);
add('Grip: not dim', grip[2] === false);
mouse(S, 'move', grip[0], grip[1]); await pause(40); mouse(S, 'down', grip[0], grip[1], { buttons: 1 }); await pause(40); mouse(S, 'up', grip[0], grip[1]); await pause(300);
add('Grip: a press alone opens no row', q(`return JSON.stringify(panel.querySelectorAll('.bp-soc-row').length === 3 && !fe.model.socialLinks);`));
grip = gripAt(0);
mouse(S, 'move', grip[0], grip[1]); await pause(40); mouse(S, 'down', grip[0], grip[1], { buttons: 1 }); await pause(40);
for (let i = 1; i <= 6; i++) { mouse(S, 'move', grip[0], grip[1] + i * 20, { buttons: 1 }); await pause(30); }
mouse(S, 'up', grip[0], grip[1] + 120); await pause(400);
add('Grip: first below third', hosts().join() === 'facebook,twitter,instagram' && canvasHosts().join() === 'facebook,twitter,instagram', `${hosts()} ${canvasHosts()}`);
add('Grip: the labels go with their rows', soc().labels.join() === 'facebook-unauth,twitter-unauth,instagram-unauth', soc().labels);
q(`fe.undo(); await sleep(280); return 'true';`);
add('Grip: one undo step', canvasHosts().join() === 'instagram,facebook,twitter', canvasHosts());
await click(`panel.querySelector('[data-social="open:0"]')`);
await click(`panel.querySelector('[data-soc-show="0"]')`, 260);
await click(`panel.querySelector('[data-soc-show="0"]')`, 260);
r = soc();
add('Labels: a toggle rewrites the row, seen once', r.labels[0] === F.social.labels.afterToggle && r.labels[1] === F.social.labels.untouched[1], r.labels);

// A Line's toolbar and Align Vertically, read on a new Line (parity/findings/CAP-U4LINE.json).
const LN = JSON.parse(readFileSync(new URL('../parity/findings/CAP-U4LINE.json', import.meta.url)));
const barOf = () => q(`return JSON.stringify([...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => [b.getAttribute('aria-label'), b.getBoundingClientRect().left, b.getBoundingClientRect().top]));`);
const lefts = (r) => r.controls.filter((c) => ['Edit', 'Align Vertically', 'Pin', 'Move Up', 'Move Down', 'Duplicate', 'Remove'].includes(c.label)).map((c) => [c.label, c.box[0]]);
const sameBar = (ours, read) => JSON.stringify(ours.map((b) => [b[0], Math.round((b[1] - ours[0][1]) * 10) / 10])) === JSON.stringify(read.map((b) => [b[0], Math.round((b[1] - read[0][1]) * 10) / 10]));
({ id } = await fresh('Line'));
const lnPick = async () => { browser(S, 'press', 'Escape'); await pause(120); browser(S, 'press', 'Escape'); await pause(120); const c = q(`const f = block('${id}').getBoundingClientRect(), o = fr.getBoundingClientRect(); return JSON.stringify([o.left + f.left + f.width / 2, o.top + f.top + f.height / 2]);`); mouse(S, 'move', c[0], c[1]); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(250); };
await lnPick();
const lnTop = () => q(`const f = block('${id}'), c = f.querySelector('.sqs-block-content'); return JSON.stringify(c.getBoundingClientRect().top - f.getBoundingClientRect().top);`);
const lnPress = (v) => click(`document.querySelector('#block-toolbar [data-tb="${v}"]')`, 300);
const lnBar = barOf();
add('Line bar: five buttons where the oracle has them', sameBar(lnBar, lefts(LN.reads['1 row'])), JSON.stringify(lnBar.map((b) => b[0])));
add('Line bar: 205 wide, 207 with its halo', Math.abs(q(`return JSON.stringify(document.getElementById('block-toolbar').getBoundingClientRect().width);`) - 205) <= 0.5, q(`return JSON.stringify(document.getElementById('block-toolbar').getBoundingClientRect().width);`));
add('Line bar: one line, before Duplicate', q(`return JSON.stringify([...document.querySelectorAll('#block-toolbar > *')].map((e) => e.getAttribute('aria-label') || 'line').join());`) === 'Edit,Align Vertically,Pin,line,Duplicate,Remove', '');
add('A new Line is Center', Math.abs(lnTop() - 6.6) <= 0.6 && q(`const f = block('${id}'); return JSON.stringify(W.getComputedStyle(f.querySelector('.sqs-block')).justifyContent);`) === 'center', lnTop());
await lnPress('align');
add('The menu marks Center', q(`return JSON.stringify(document.querySelector('[data-tb="valign:center"]').classList.contains('tb-open'));`), '');
await lnPress('valign:flex-start');
add('Line, 1 row, Top: 0', Math.abs(lnTop()) <= 0.6, lnTop());
add('A value keeps the menu open', q(`return JSON.stringify(!!document.querySelector('#block-toolbar .tb-vmenu'));`));
q(`fe.undo(); await sleep(250); return 'true';`);
add('One undo back to Center', Math.abs(lnTop() - 6.6) <= 0.6, lnTop());
await lnPress('valign:flex-end');
add('Line, 1 row, Bottom: 13.1', Math.abs(lnTop() - 13.1) <= 0.6, lnTop());
await lnPress('align');
add('A press on Align Vertically closes the menu', q(`return JSON.stringify(!document.querySelector('#block-toolbar .tb-vmenu'));`));
// 4 rows, as on the oracle: a real pull on the east half of the south edge, past the toolbar.
const lnSouth = q(`const f = block('${id}').getBoundingClientRect(), o = fr.getBoundingClientRect(); return JSON.stringify([o.left + f.right, o.top + f.bottom]);`);
drag(S, lnSouth, [lnSouth[0], lnSouth[1] + 130], { steps: 4, holdMs: 60 }); await pause(300);
add('Line: 4 rows high', q(`const c = W.getComputedStyle(block('${id}')); return JSON.stringify(Number(c.gridRowEnd) - Number(c.gridRowStart));`) === 4, '');
add('Line, 4 rows, Bottom: 136.4', Math.abs(lnTop() - 136.4) <= 1, lnTop());
await lnPick(); await lnPress('align'); await lnPress('valign:center');
add('Line, 4 rows, Center: 68.2', Math.abs(lnTop() - 68.2) <= 1, lnTop());
await lnPress('valign:flex-start');
add('Line, 4 rows, Top: 0', Math.abs(lnTop()) <= 0.6, lnTop());
const lnDesk = q(`return JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === '${id}').layout.desktop.justify);`);
q(`document.getElementById('bp-mobile').click(); await sleep(500); return 'true';`);
await lnPick();
add('The phone keeps its own Center', Math.abs(lnTop() - 3.5) <= 0.6 && lnDesk === 'flex-start', lnTop());
const lnPhone = barOf();
add('Line phone bar: Edit, Align, Pin, Remove', lnPhone.map((b) => b[0]).join() === 'Edit,Align Vertically,Pin,Remove', lnPhone.map((b) => b[0]));
await lnPress('align'); await lnPress('valign:flex-end');
add('Line phone Bottom: 7, desktop stays', Math.abs(lnTop() - 7) <= 0.6 && q(`return JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === '${id}').layout.desktop.justify);`) === 'flex-start', lnTop());
await lnPress('align');
q(`fe.addBlock(fe.model.sections[1].id, 'Shape'); await sleep(300); return 'true';`);
await lnPick();
const lnTwo = barOf();
add('Line phone bar with a block above it, as read', sameBar(lnTwo, lefts(LN.reads['phone, second of two'])), JSON.stringify(lnTwo.map((b) => b[0])));
q(`document.getElementById('bp-desktop').click(); await sleep(500); return 'true';`);
await lnPick();
// The buttons stop at window y 81 (CAP-TBTOP.json): the frame's top + 26.
q(`document.getElementById('site-frame').contentWindow.scrollBy({ top: block('${id}').getBoundingClientRect().top - 2, behavior: 'instant' }); await sleep(300); return 'true';`);
const stopY = barOf()[0][2];
add('No room above: the buttons stop at y 81', Math.abs(stopY - 81) <= 0.2, stopY);

// The phone: Line and Map take the measured box; Social Links follows, then keeps its own.
const phoneView = () => click(`document.getElementById('bp-mobile')`, 700);
const deskView = () => click(`document.getElementById('bp-desktop')`, 700);
const frameW = () => q(`return JSON.stringify(document.getElementById('site-frame').contentWindow.innerWidth);`);
const boxOf = () => q(`const f = block('${id}'), b = f.getBoundingClientRect(), c = W.getComputedStyle(f); return JSON.stringify([b.width, b.height, Number(c.gridColumnStart), Number(c.gridColumnEnd), Number(c.gridRowEnd) - Number(c.gridRowStart)]);`);
({ id } = await fresh('Line'));
await phoneView();
add('Phone: the frame', frameW() === F.social.phone.frame, frameW());
let pb = boxOf();
add('Phone: Line', nearAll(pb.slice(0, 2), F.line.phone.box, 1) && pb[2] === 2 && pb[3] === 10 && pb[4] === F.line.phone.rows, pb);
({ id } = await fresh('Map'));
const zf = `panel.querySelector('[data-map-zoomfield]')`;
await tab('Design');
q(`const f = ${zf}; f.value = '${F.map.zoomTyped.typed}'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(260); return 'true';`);
add('Zoom: a typed number is the map zoom', q(`return JSON.stringify(${zf}.value);`) === F.map.zoomTyped.field && map().ctx.location.mapZoom === F.map.zoomTyped.zoom, `${q(`return JSON.stringify(${zf}.value);`)} ${map().ctx.location.mapZoom}`);
await phoneView();
pb = boxOf();
add('Phone: Map', nearAll(pb.slice(0, 2), F.map.phone.box, 1) && pb[2] === 2 && pb[3] === 10 && pb[4] === F.map.phone.rows, pb);
({ id } = await fresh('Social Links'));
const desk0 = soc();
await phoneView();
pb = boxOf(); r = soc();
const PH = F.social.phone;
add('Phone: Social Links box', nearAll(pb.slice(0, 2), PH.box, 1) && pb[2] === 2 && pb[3] === 10 && pb[4] === PH.rows, pb);
add('Phone: icons in the middle, 20 and 12', nearAll(r.first, PH.links[0], 0.6) && r.gap === '12px', `${r.first} ${r.gap}`);
await tab('Design');
const socPress = (k, v) => click(`panel.querySelector('[data-soc-set="${k}"][data-v="${v}"]')`, 300);
const classAt0 = r.cls;
await socPress('iconSize', 'L'); r = soc();
add('Phone L: 28, gap 16', nearAll(r.first.slice(0, 1).concat(r.first[2]), PH.sizes.L.first, 0.6) && r.gap === PH.sizes.L.gap, `${r.first} ${r.gap}`);
add('Phone L: the classes stay the desktop\'s', r.cls === classAt0, r.cls);
add('Phone L: the panel shows it', q(`return JSON.stringify(panel.querySelector('[data-soc-set="iconSize"][data-v="L"]').classList.contains('is-on'));`));
await socPress('iconBorder', 'rounded'); r = soc();
add('Phone Rounded: 36, gap 10, 15%', nearAll(r.first.slice(0, 1).concat(r.first[2]), PH.sizes.LRounded.first, 0.6) && r.gap === PH.sizes.LRounded.gap && r.radius === PH.sizes.LRounded.radius, `${r.first} ${r.gap} ${r.radius}`);
await socPress('iconStyle', 'solid'); r = soc();
add('Phone Solid: ink box', r.bg !== 'rgba(0, 0, 0, 0)', r.bg);
await socPress('iconStyle', 'border'); r = soc();
add('Phone Outline: inset 2px', /inset/.test(r.shadow) && /2px/.test(r.shadow), r.shadow);
await socPress('iconBorder', 'square'); r = soc();
add('Phone Square: no radius', r.radius === PH.style.Square.radius, r.radius);
await socPress('align', 'left'); r = soc();
add('Phone Left: first at 0', near(r.first[0], PH.left.first), r.first);
await deskView(); r = soc();
add('Desktop keeps its own', nearAll(r.first, desk0.first, 0.6) && r.gap === desk0.gap && r.cls === desk0.cls, `${r.first} ${r.gap}`);
await socPress('iconSize', 'XL');
await phoneView(); r = soc();
add('A desktop press does not reach a row the phone set', near(r.first[2], 28 + 8) && r.gap === PH.sizes.LRounded.gap, `${r.first} ${r.gap}`);
add('...but the classes follow the desktop', r.cls.includes('social-icons-size-extra-large'), r.cls);
await socPress('iconBorder', ''); await socPress('iconSize', 'S'); r = soc();
const rowsAfter = boxOf();
add('Phone S again: 1 row, 24 high', rowsAfter[4] === 1 && near(rowsAfter[1], 24, 1), rowsAfter);
({ id } = await fresh('Social Links'));
await tab('Design');
await socPress('iconSize', 'L'); await socPress('iconBorder', 'circle');
const deskLC = soc();
await phoneView(); r = soc();
add('An untouched phone follows the desktop', near(r.first[2], deskLC.first[2]) && r.gap === deskLC.gap && r.radius === '50%', `${r.first} ${r.gap} ${r.radius}`);

// Read 2026-11-06: typed Zoom, how narrow Social Links goes, its Thickness field, with real keys and pulls.
const read26 = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads;
const ZR = read26('CAP-T11ZOOM'), SR = read26('CAP-T11SOCIAL');
const typeIn = async (sel, text) => { browser(S, 'fill', sel, text); browser(S, 'press', 'Enter'); await pause(260); };
const fieldV = (sel) => q(`return JSON.stringify(document.querySelector(${JSON.stringify(sel)}).value);`);
({ id } = await fresh('Map'));
await tab('Design');
const ZF = '#block-panel [data-map-zoomfield]';
const zoomWas = (t) => ZR[`typed "${t}"`].parts.Zoom[1].value;
for (const [t, z] of [['5', 5], ['2.5', 2], ['12.5', 12], ['abc', 12], ['', 12], ['-1', -1], ['99', 99], ['0.3', 0], ['1.2', 1], ['12', 12]]) {
  await typeIn(ZF, t);
  const v = fieldV(ZF), c = map().ctx.location.mapZoom;
  add(`Zoom typed "${t}": field ${zoomWas(t)}, zoom ${z}`, v === zoomWas(t) && c === z, `${v} ${c}`);
}
await typeIn(ZF, '2.5'); await click(`panel.querySelector('[aria-label="increment"]')`, 120);
add('Zoom: increment from a cut 2.5', fieldV(ZF) === ZR['increment from 2.5'].parts.Zoom[1].value, fieldV(ZF));
await click(`panel.querySelector('[aria-label="decrement"]')`, 120); await click(`panel.querySelector('[aria-label="decrement"]')`, 120);
add('Zoom: decrement twice', fieldV(ZF) === ZR['decrement twice'].parts.Zoom[1].value, fieldV(ZF));
// Not read on the oracle, ours: a zoom past the ladder draws at the ladder's end and the buttons step back onto it.
const drawn = () => q(`return JSON.stringify(block('${id}').querySelector('.fe-map g').getAttribute('transform'));`);
await typeIn(ZF, '22'); const at22 = drawn();
await typeIn(ZF, '99');
add('Ours: 99 draws as 22, increment off', drawn() === at22 && q(`return JSON.stringify(panel.querySelector('[aria-label="increment"]').disabled);`), drawn());
await click(`panel.querySelector('[aria-label="decrement"]')`, 120);
add('Ours: decrement from 99 lands on 7', fieldV(ZF) === '7', fieldV(ZF));
await typeIn(ZF, '-1');
await click(`panel.querySelector('[aria-label="increment"]')`, 120);
add('Ours: increment from -1 lands on 0', fieldV(ZF) === '0', fieldV(ZF));

const socPull = async (cols) => {
  const p = q(`fe.select(fe.model.sections[1].id, '${id}'); await sleep(150); const o = fr.getBoundingClientRect(), r = fr.contentDocument.querySelector('.fe-handle[data-dir="e"]').getBoundingClientRect(), m = fe.measure(fe.model.sections[1].id); return JSON.stringify({ x: o.left + r.x + r.width / 2, y: o.top + r.y + r.height / 2, col: m.colStart[2] - m.colStart[1] });`);
  drag(S, [p.x, p.y], [p.x + cols * p.col, p.y]); await pause(350);
};
const areaOf = (view) => q(`return JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === '${id}').layout.${view}.area.join('/'));`);
({ id } = await fresh('Social Links'));
for (const n of [1, 2, 3, 4]) {
  await socPull(-1);
  const want = SR[`e in ${n}`].block.desktop.split('/').map((v, i) => (i === 2 ? null : v)).join('/');
  const got = areaOf('desktop').split('/').map((v, i) => (i === 2 ? null : v)).join('/');
  add(`Social e in ${n}: columns as read`, got === want, `${got} ${want}`);
}
await phoneView();
for (let n = 1; n <= 7; n++) {
  await socPull(-1);
  add(`Social phone e in ${n}`, areaOf('mobile') === SR[`phone e in ${n}`].block.mobile, `${areaOf('mobile')} ${SR[`phone e in ${n}`].block.mobile}`);
}
const nb = boxOf();
add('Social phone: 2 columns wide as read', near(nb[0], SR['phone e in 7'].block.box[2], 1), nb);
await deskView();

({ id } = await fresh('Social Links'));
await tab('Design');
await set('iconBorder', 'circle'); await set('iconStyle', 'border');
const TF = '#block-panel [data-soc-thickfield]';
const thick = () => q(`const t = panel.querySelector('[data-soc-thickfield]'), rg = panel.querySelector('[data-soc-thick]'), seg = panel.querySelector('[data-soc-set="iconStyle"]'), row = rg.getBoundingClientRect(), f = t.getBoundingClientRect(), s = seg.getBoundingClientRect(); return JSON.stringify({ tag: t.tagName, v: t.value, range: rg.value, f: [f.right - (row.left + row.width), f.top - s.bottom, f.width, f.height], r: [row.top - s.bottom, row.width], shadow: W.getComputedStyle(block('${id}').querySelector('nav a')).boxShadow });`);
// The oracle's boxes (CAP-T11SOCIAL.json): the field's right edge 6 in from the slider's, 28 or 29 under the Style row, 22 high.
const oc = (k) => Object.fromEntries(SR[k].controls.filter((c) => /Thickness|Solid/.test(c.label)).map((c) => [c.role + c.label, c]));
const O1 = oc('desktop Circle Outline 1');
const sb = O1['radioSolid'].box, of = O1['input:textThickness'].box, ofr = O1['input:rangeThickness'].box;
let tk = thick();
add('Thickness: a text field, 2px', tk.tag === 'INPUT' && tk.v === '2px', JSON.stringify(tk));
const lab = q(`const t = panel.querySelector('[data-soc-thickfield]').getBoundingClientRect(), l = panel.querySelector('.bp-soc-thick .sp-label').getBoundingClientRect(); return JSON.stringify((l.top + l.height / 2) - (t.top + t.height / 2));`);
add('Thickness: label level with the field', near(lab, 0, 0.6), lab);
add('Thickness: the field box by the slider', near(tk.f[0], of[0] + of[2] - (ofr[0] + ofr[2]), 1) && near(tk.f[1], of[1] - (sb[1] + sb[3]), 1.5) && near(tk.f[2], 28, 2) && near(tk.f[3], of[3], 0.5), JSON.stringify(tk.f));
await typeIn(TF, '4'); tk = thick();
add('Thickness: typed 4 reads 4px, slider 4, inset 4', tk.v === SR['phone Square Outline'].controls.find((c) => c.role === 'input:text').value && tk.range === '4' && /4px/.test(tk.shadow), JSON.stringify(tk));
q(`const t = panel.querySelector('[data-soc-thick]'); t.value = 3; t.dispatchEvent(new Event('input', { bubbles: true })); await sleep(60); return 'true';`);
add('Thickness: the slider drives the field while held', thick().v === '3px', thick().v);
q(`const t = panel.querySelector('[data-soc-thick]'); t.dispatchEvent(new Event('change', { bubbles: true })); await sleep(220); return 'true';`);
await typeIn(TF, 'abc'); add('Thickness: words keep the old value', thick().v === '3px', thick().v);
await typeIn(TF, '99'); add('Ours: 99 stops at 5px, as the stroke field stops', thick().v === '5px', thick().v);
await typeIn(TF, '-5'); add('Ours: -5 stops at 1px', thick().v === '1px', thick().v);
await typeIn(TF, '3.5'); tk = thick(); add('Ours: 3.5 stays, slider 4', tk.v === '3.5px' && tk.range === '4', JSON.stringify(tk));
q(`fe.undo(); await sleep(260); return 'true';`);
add('Thickness: one undo step', thick().v === '1px', thick().v);

// Difference 75: Align Vertically on every tile but Button, Shape and Map (CAP-COVERAGE.json), its menu and what it moves (CAP-75QUOTE, CODE, FORM, VIDEO), a new Image's two more buttons (CAP-75IMAGE, 2, 3).
{
  const read75 = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/CAP-75${n}.json`, import.meta.url))).reads;
  // The bar and any menu under it, each as [label, x from Edit, y from Edit].
  const barOf = (r) => { const edit = r.controls.find((c) => c.label === 'Edit' && c.box[2] === 36); return r.controls.filter((c) => c.role === 'button' && c.box[2] === 36 && c.box[1] >= edit.box[1] && c.box[1] <= edit.box[1] + 47).map((c) => [c.label, +(c.box[0] - edit.box[0]).toFixed(1), +(c.box[1] - edit.box[1]).toFixed(1)]); };
  const ourBar = () => q(`const bar = [...document.querySelectorAll('#block-toolbar button[aria-label]')].filter((e) => e.getBoundingClientRect().width > 0), edit = bar.find((e) => e.getAttribute('aria-label') === 'Edit').getBoundingClientRect(); return JSON.stringify(bar.map((e) => { const c = e.getBoundingClientRect(); return [e.getAttribute('aria-label'), +(c.left - edit.left).toFixed(1), +(c.top - edit.top).toFixed(1)]; }));`);
  const sameBar = (what, r) => { const got = ourBar(), want = barOf(r); add(what, got.length === want.length && want.every((w) => got.some((g) => g[0] === w[0] && near(g[1], w[1], 1) && near(g[2], w[2], 1))), `${JSON.stringify(got)} wants ${JSON.stringify(want)}`); };
  const tb = (act) => q(`const e = document.querySelector('#block-toolbar [data-tb="${act}"]'); e?.click(); await sleep(240); return JSON.stringify(!!e);`); // No throw: a missing button fails the cases after it.
  const pick = async (name, area) => { const { sid, id } = await fresh(name); q(`const next = JSON.parse(JSON.stringify(fe.model)); ${area ? `next.sections[1].blocks.at(-1).layout.desktop.area = ${JSON.stringify(area)};` : ''} fe.load(next); await sleep(250); fe.select('${sid}', '${id}'); await sleep(250); return 'true';`); return id; };
  // Oracle: the gap over the content at Top, under it at Bottom, and how far it moves (Video: the block's content is shorter than the block and doesn't move).
  for (const [type, nm, area, gap, moves] of [['Quote', 'QUOTE', [1, 2, 11, 8], 36.5, true], ['Code', 'CODE', [1, 2, 11, 6], 0, true], ['Form', 'FORM', [1, 2, 21, 11], 0, true], ['Video', 'VIDEO', [1, 2, 13, 10], 0, false]]) {
    const R = read75(nm), id = await pick(type, area);
    const gaps = () => q(`const B = block('${id}').getBoundingClientRect(), c = block('${id}').querySelector('.sqs-block-content > :first-child').getBoundingClientRect(); return JSON.stringify([c.top - B.top, B.bottom - c.bottom]);`);
    tb('align');
    sameBar(`75, ${type}: the bar and its menu`, R.menu);
    const top = gaps();
    add(`75, ${type}: Top, ${gap} over it`, near(top[0], gap, 2), JSON.stringify(top));
    tb('valign:flex-end');
    const low = gaps();
    add(`75, ${type}: ${moves ? `Bottom, ${gap} under it` : 'Bottom, no move'}`, moves ? near(low[1], gap, 2) : near(low[0], top[0], 0.5), JSON.stringify(low));
    add(`75, ${type}: a pick keeps the menu open`, q(`return JSON.stringify(!!document.querySelector('#block-toolbar [data-tb="valign:center"]'));`), 'closed');
    tb('valign:center');
    const mid = gaps();
    add(`75, ${type}: ${moves ? 'Center, even' : 'Center, no move'}`, moves ? near(mid[0], mid[1], 1) : near(mid[0], top[0], 0.5), JSON.stringify(mid));
  }
  // A new Image with no picture: the placeholder doesn't move, what it does to a picture isn't read (no uploads).
  const I1 = read75('IMAGE'), I2 = read75('IMAGE2'), I3 = read75('IMAGE3');
  const img = await pick('Image');
  sameBar('75, Image: the bar', I1.new);
  add('75, Image: Align Vertically starts at center', q(`return JSON.stringify(getComputedStyle(block('${img}').querySelector('.sqs-block')).justifyContent === 'center');`), 'other');
  tb('halign');
  sameBar('75, Image: Align Center opens its menu', I2['h menu']);
  tb('halign');
  sameBar('75, Image: pressed again, it closes', I2['h menu pressed again']);
  tb('align');
  sameBar('75, Image: Align Vertically opens its menu', I2['v menu']);
  tb('align'); tb('halign'); tb('halign:left');
  sameBar('75, Image: Align Left names the button, menu stays', I3.left);
  q(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks.at(-1).layout.desktop.area = [1, 8, 7, 14]; fe.load(next); await sleep(250); fe.select(next.sections[1].id, '${img}'); await sleep(250); return 'true';`);
  tb('link');
  const lk = q(`const p = document.querySelector('#block-toolbar [data-tb="link"]')?.getBoundingClientRect(), i = document.querySelector('#link-popover .lk-row')?.getBoundingClientRect(); return JSON.stringify(p && i ? [i.left + i.width / 2 - (p.left + p.width / 2), i.top - p.top, i.width, i.height] : null);`);
  const lf = I1['link popover'].controls.find((c) => c.role === 'combobox').box, lb = I1['link popover'].controls.find((c) => c.label === 'Open link editor popover').box;
  const lwant = [lf[0] + lf[2] / 2 - (lb[0] + lb[2] / 2), lf[1] - lb[1], lf[2], lf[3]];
  add('75, Image: the link popover and its field', !!lk && lk.every((v, n) => near(v, lwant[n], 2)), `${JSON.stringify(lk)} wants ${JSON.stringify(lwant)}`);
  const hrefNow = q(`const i = document.querySelector('#link-popover .lk-input'); if (!i) return 'null'; i.focus(); i.value = '/services'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(250); return JSON.stringify(fe.model.sections[1].blocks.at(-1).href ?? null);`);
  add('75, Image: a link is kept on the block', hrefNow === '/services', JSON.stringify(hrefNow));
  // A Button, a Shape and a Map have none.
  for (const t of ['Button', 'Map']) { await pick(t); add(`75, ${t}: no Align Vertically`, q(`return JSON.stringify(!document.querySelector('#block-toolbar [data-tb="align"]'));`), 'there'); }
  // Difference 77: a phone's Design has no More actions.
  const vid = await pick('Video');
  q(`document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(250); panel.querySelector('[data-btab="Design"]').click(); await sleep(200); return 'true';`);
  add('77: More actions on desktop', q(`return JSON.stringify(!!panel.querySelector('.bp-more'));`), 'none');
  q(`fe.setBp('mobile'); await sleep(350); fe.select(fe.model.sections[1].id, '${vid}'); await sleep(250); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(250); panel.querySelector('[data-btab="Design"]').click(); await sleep(200); return 'true';`);
  add('77: none on a phone, its Design still there', q(`return JSON.stringify(!panel.hidden && !panel.querySelector('.bp-more') && panel.querySelector('[data-btab="Design"]').classList.length > 0);`), 'there');
  add('75, Video phone: Align Vertically', q(`return JSON.stringify(!!document.querySelector('#block-toolbar [data-tb="align"]'));`), 'none');
  q(`fe.setBp('desktop'); await sleep(200); return 'true';`);
}

// A Video's Blend Mode: a name and a menu (CAP-VBLEND.json, CAP-VBLEND2.json).
{
  const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-VBLEND.json', import.meta.url))).reads, R2 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-VBLEND2.json', import.meta.url))).reads;
  const { sid, id } = await fresh('Video');
  q(`panel.querySelector('[data-btab="Design"]').click(); await sleep(250); panel.querySelector('[data-image-sel="vblend"]')?.scrollIntoView({ block: 'nearest' }); await sleep(100); return 'true';`);
  const P = 578; // The oracle's panel left in these reads.
  const closed = R.closed.controls.find((c) => c.role === 'combobox' && c.label === 'Normal').box;
  const look = q(`const e = panel.querySelector('[data-image-sel="vblend"]'); if (!e) return 'null'; const c = e.getBoundingClientRect(), p = panel.getBoundingClientRect(), l = e.previousElementSibling.getBoundingClientRect(); return JSON.stringify({ role: e.getAttribute('role'), text: e.textContent.trim(), x: c.left - p.left, w: c.width, h: c.height, label: e.previousElementSibling.textContent, labelX: l.left - p.left });`);
  add('Video, Blend Mode: a name and a menu', look?.role === 'combobox' && look.text === 'Normal' && look.label === 'Blend Mode' && near(look.labelX, 22, 1), JSON.stringify(look));
  add('Video, Blend Mode: the menu\'s box', !!look && near(look.x, closed[0] - P, 1) && near(look.w, closed[2], 1) && near(look.h, closed[3], 1), `${JSON.stringify(look)} wants ${closed}`);
  const gaps = q(`const e = panel.querySelector('[data-image-sel="vblend"]'); if (!e) return 'null'; const t = e.getBoundingClientRect().top, head = [...panel.querySelectorAll('.bp-thead')].find((x) => x.textContent === 'Effects'), a = panel.querySelector('.bp-anchor').getBoundingClientRect(), h = head.firstElementChild.getBoundingClientRect(); return JSON.stringify([t - a.bottom, t - (h.top + h.height / 2)]);`);
  add('Video, Blend Mode: 74 under the Anchor, 29 under Effects', !!gaps && near(gaps[0], 74, 2) && near(gaps[1], 29, 2), JSON.stringify(gaps));
  const press = () => q(`const e = panel.querySelector('[data-image-sel="vblend"]'); e?.click(); await sleep(200); return JSON.stringify(!!e);`);
  const list = () => q(`const c = panel.querySelector('[data-image-sel="vblend"]')?.getBoundingClientRect(), r = pop.getBoundingClientRect(), o = [...pop.querySelectorAll('[role="option"]')]; return JSON.stringify(!pop.hidden && c ? { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height, n: o.length, first: o[0]?.textContent, last: o.at(-1)?.textContent, cur: pop.querySelector('.is-cur')?.textContent, row: o[0]?.getBoundingClientRect().height } : null);`);
  press();
  const l1 = list(), o0 = R.list.controls.find((c) => c.label === 'Normal').box;
  add('Video, Blend Mode: no ring while the list is open', q(`return JSON.stringify(getComputedStyle(panel.querySelector('[data-image-sel="vblend"]')).outlineStyle === 'none');`), 'ring');
  add('Video, Blend Mode: its list over it, 9 left, five rows', !!l1 && near(l1.x, o0[0] - closed[0], 1) && near(l1.y, o0[1] - closed[1], 1) && near(l1.w, o0[2], 1) && near(l1.h, 220, 1) && near(l1.row, 44, 0.5), JSON.stringify(l1));
  add('Video, Blend Mode: Normal to Luminosity, sixteen', l1?.n === 16 && l1.first === 'Normal' && l1.last === R['list end'].controls.filter((c) => c.role === 'option').at(-1).label && l1.cur === 'Normal', JSON.stringify(l1));
  q(`pop.querySelector('[data-image-opt="Multiply"]')?.click(); await sleep(300); return 'true';`);
  const after = () => q(`const e = panel.querySelector('[data-image-sel="vblend"]'); return JSON.stringify(e ? { text: e.textContent.trim(), blend: W.getComputedStyle(block('${id}')).mixBlendMode, focus: document.activeElement === e, open: !pop.hidden, ring: getComputedStyle(e).outlineWidth } : null);`);
  const a1 = after();
  add('Video, Blend Mode: Multiply, on the block, closed, and focused', a1?.text === 'Multiply' && a1.blend === R.multiply.block.css.mixBlendMode && a1.focus && !a1.open && a1.ring === '2px', JSON.stringify(a1));
  press(); q(`pop.querySelector('[data-image-opt="Screen"]')?.click(); await sleep(300); return 'true';`);
  add('Video, Blend Mode: Screen, a second read', after()?.blend === R2['screen picked'].block.css.mixBlendMode, JSON.stringify(after()));
  press();
  const l2 = list(), rows = R2['list on Screen'].controls.filter((c) => c.role === 'option');
  add('Video, Blend Mode: another current keeps the list from the top', !!l2 && l2.cur === 'Screen' && near(l2.y, rows[0].box[1] - closed[1], 1), JSON.stringify(l2));
  q(`document.body.click(); await sleep(150); return 'true';`);
  q(`fe.setBp('mobile'); await sleep(350); fe.select('${sid}', '${id}'); await sleep(250); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(250); panel.querySelector('[data-btab="Design"]').click(); await sleep(200); return 'true';`);
  add('Video, Blend Mode: a phone has it too', q(`return JSON.stringify(!!panel.querySelector('[data-image-sel="vblend"]'));`), 'none');
  q(`fe.setBp('desktop'); await sleep(200); return 'true';`);
  // Others keep one button (CAP-COVERAGE.json Text > Design).
  await fresh('Text');
  q(`panel.querySelector('[data-btab="Design"]').click(); await sleep(250); return 'true';`);
  add('Text, Blend Mode: still one button', q(`const e = panel.querySelector('.bp-blend'); return JSON.stringify(!!e && e.getAttribute('role') === 'button' && !panel.querySelector('[data-image-sel="vblend"]'));`), 'not');
}

// U4: the tip's delay (CAP-U4TIPS.json: 517 ms, all within 528) and a Pin slider keeping the unit (CAP-U4PINUNIT.json, CAP-U4PINDRAG.json).
{
  const { id } = await fresh('Quote');
  q(`fe.select(null); await sleep(150); fe.select(fe.model.sections[1].id, '${id}'); await sleep(250); return 'true';`); // Without the panel, so the bar shows.
  add('U4: the bar shows', q(`return JSON.stringify(panel.hidden && !document.getElementById('block-toolbar').hidden);`), 'no');
  const spot = q(`const r = document.querySelector('#block-toolbar [data-tb="duplicate"]').getBoundingClientRect(); return JSON.stringify([r.left + 18, r.top + 18]);`);
  mouse(S, 'move', spot[0] - 300, spot[1] + 300); await pause(300);
  q(`window.__tip = null; const b = document.querySelector('#block-toolbar [data-tb="duplicate"]'), t = document.getElementById('bar-tip'); b.addEventListener('pointerover', () => { const t0 = performance.now(); const go = () => { if (!t.hidden) window.__tip = performance.now() - t0; else requestAnimationFrame(go); }; go(); }, { once: true }); return 'true';`);
  mouse(S, 'move', spot[0], spot[1]); await pause(1000);
  const delay = q(`return JSON.stringify(window.__tip);`);
  add(`U4: the tip shows at about 500 ms (${typeof delay === 'number' ? Math.round(delay) : delay})`, typeof delay === 'number' && delay >= 480 && delay <= 650, String(delay));
  mouse(S, 'move', spot[0] - 300, spot[1] + 300); await pause(200);
  const U = JSON.parse(readFileSync(new URL('../parity/findings/CAP-U4PINUNIT.json', import.meta.url))).reads;
  q(`document.querySelector('#block-toolbar [data-tb="pin"]').click(); await sleep(250); const f = document.querySelector('[data-pin-offset]'); f.focus(); f.value = '5vh'; f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); f.blur(); await sleep(200); return 'true';`);
  const pinNow = () => q(`const c = W.getComputedStyle(block('${id}')); return JSON.stringify({ field: document.querySelector('[data-pin-offset]').value, range: document.querySelector('[data-pin-range]').value, top: fe.model.sections[1].blocks.at(-1).layout.desktop.sticky });`);
  const stepRange = () => { evalJs(S, `(() => { document.querySelector('[data-pin-range]').focus(); return 'true'; })()`); browser(S, 'press', 'ArrowRight'); };
  stepRange(); await pause(200);
  const p1 = pinNow();
  add('U4: a Pin slider key, 5vh to 6vh', p1.field === '6vh' && p1.range === '6' && p1.top.offset === 6 && p1.top.unit === 'vh', JSON.stringify(p1));
  stepRange(); await pause(200);
  const p2 = pinNow();
  add('U4: and to 7vh', p2.field === '7vh' && p2.range === '7' && p2.top.unit === 'vh', JSON.stringify(p2));
  q(`const r = document.querySelector('[data-pin-range]'); r.value = 96; r.dispatchEvent(new Event('input', { bubbles: true })); await sleep(200); return 'true';`);
  const p3 = pinNow();
  add('U4: a drag, to 96vh', p3.field === '96vh' && p3.top.offset === 96 && p3.top.unit === 'vh', JSON.stringify(p3));
  q(`const r = document.querySelector('[data-pin-range]'); const f = document.querySelector('[data-pin-offset]'); f.focus(); f.value = '20px'; f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); f.blur(); await sleep(150); r.value = 21; r.dispatchEvent(new Event('input', { bubbles: true })); await sleep(200); return 'true';`);
  const p4 = pinNow();
  add('U4: from px it stays px', p4.field === '21px' && p4.top.offset === 21 && !p4.top.unit, JSON.stringify(p4));
}

writeFileSync(new URL('../parity/t11-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nT11: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
