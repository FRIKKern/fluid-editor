// T6: a new Shape through the real menu, then Shape style, corners, Stretch off, Color and Stroke
// against parity/findings/SHAPESTYLES.json and CAP-SHAPEWIDE.json. The curves are ours, so a shape's
// box, name and proportions are compared, not its drawing.
// Writes parity/shape-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run shape-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, screenshot, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { rectPath } from '../app/src/render.js';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/SHAPESTYLES.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(46)} ${ok ? 'match' : `DIFF ${detail ?? ''}`}`); };
const near = (a, b, tol = 1) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol);

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const had = new Set(fe.model.sections[1].blocks.map((x) => x.id)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Shape"]').click(); await sleep(400); return JSON.stringify(fe.model.sections[1].blocks.find((x) => !had.has(x.id))?.id ?? null); })()`);
const q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'); const pop = document.getElementById('shape-pop'); const block = () => document.getElementById('site-frame').contentDocument.querySelector('.fe-block-${id}'); const model = () => fe.model.sections[1].blocks.find((b) => b.id === '${id}'); const drawn = () => block().querySelector('svg path, svg rect, svg .x, .sqs-shape'); ${body} })()`);
const openDesign = () => q(`fe.select('${sid}', '${id}'); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
const act = (name) => q(`panel.querySelector('[data-shape-act="${name}"]').click(); await sleep(250); return 'true';`);
const shapeBox = () => q(`const s = block().querySelector('.sqs-shape'), r = s.getBoundingClientRect(), b = block().getBoundingClientRect(); return JSON.stringify([r.left - b.left, r.top - b.top, r.width, r.height].map((v) => Math.round(v * 10) / 10));`);
const pickShape = (label) => q(`panel.querySelector('[data-shape-act="style"]').click(); await sleep(200); const t = pop.querySelector('[aria-label="${label}"]'); if (!t) return JSON.stringify(false); t.click(); await sleep(250); return JSON.stringify(true);`);
openDesign();
add('A new Shape lands at 1/2/7/8', q(`return JSON.stringify(model().layout.desktop.area.join('/'));`) === '1/2/7/8');
add('The block is 341.7 by 235.6', near(q(`const b = block().getBoundingClientRect(); return JSON.stringify([b.width, b.height]);`), F.stretchOff.block));

// The rows, in order.
const order = q(`const at = (s) => { const e = [...panel.querySelectorAll('.sp-label, .sh-head, .bp-thead span')].find((x) => x.textContent.trim() === s); return e ? e.getBoundingClientRect().top : -1; }; return JSON.stringify(['Shape style', 'Stretch', 'Styling', 'Color', 'Blend Mode', 'Stroke', 'Drop Shadow', 'Blur', 'Transforms'].map(at));`);
add('Rows in the oracle\'s order', order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), order.join());
add('The style button is 276 by 103', near(q(`const r = panel.querySelector('.sh-style').getBoundingClientRect(); return JSON.stringify([r.width, r.height]);`), [276, 103]));

// Every name in the picker, in order; each fills the block with Stretch on.
act('style');
const names = q(`return JSON.stringify([...pop.querySelectorAll('.sh-tile')].map((t) => t.getAttribute('aria-label')));`);
add('The picker lists all 29, in order', names.join() === F.style.shapes.map((s) => s[0]).join(), names.join());
add('A tile is 77 by 77 in 3 columns', near(q(`const a = [...pop.querySelectorAll('.sh-tile')]; const r = a[0].getBoundingClientRect(); return JSON.stringify([r.width, r.height, new Set(a.map((t) => Math.round(t.getBoundingClientRect().left))).size]);`), [77, 77, 3]));
q(`panel.querySelector('[data-shape-act="style"]').click(); await sleep(100); return 'true';`);
for (const [label, name, w, h] of F.style.shapes) {
  pickShape(label);
  const got = q(`const c = block().querySelector('[data-shape-name]'), s = block().querySelector('.sqs-shape'), r = s.getBoundingClientRect(); return JSON.stringify({ name: c.dataset.shapeName, vb: s.getAttribute('viewBox'), pres: s.getAttribute('preserveAspectRatio'), w: r.width, h: r.height, radius: !!panel.querySelector('[data-shape-act="uniform"]'), closed: pop.hidden, pieces: (s.querySelector('path')?.getAttribute('d').match(/M/gi) || []).length });`);
  const vbOk = label === 'Rectangle' ? got.vb === null : got.vb === `0 0 ${w} ${h}`;
  add(`${label}: ${name}, its proportions, fills the block`, got.name === name && vbOk && (label === 'Rectangle' || got.pres === 'none') && near([got.w, got.h], F.stretchOff.block) && got.radius === (label === 'Rectangle') && got.closed && got.pieces === (label === 'Rectangle' ? 0 : 1), JSON.stringify(got));
}

// Stretch off: its own proportions, centred.
const stretch = () => q(`const c = panel.querySelector('[data-shape="stretch"]'); c.click(); await sleep(250); return 'true';`);
const indexOf = (label) => F.style.shapes.find((s) => s[0] === label);
for (const [label, want] of Object.entries(F.stretchOff.boxes)) {
  pickShape(label); stretch();
  const got = shapeBox();
  add(`Stretch off: ${label}`, near(got, want, 0.6), `${got.join()} want ${want.join()}`);
  add(`${label} loses the stretch mark`, q(`return JSON.stringify(!block().querySelector('.sqs-block').classList.contains('sqs-stretched'));`));
  stretch();
}
indexOf('Rectangle');
pickShape('Rectangle');

// Corners.
const typeField = (sel, v) => q(`const f = panel.querySelector('${sel}'); f.value = '${v}'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(220); return 'true';`);
act('individual');
add('Individual shows four fields', q(`return JSON.stringify([...panel.querySelectorAll('.sh-corner')].map((x) => x.getAttribute('aria-label')));`).join() === F.corners.fields.join());
F.corners.typed.forEach((v, n) => typeField(`.sh-corner[data-shape="corner:${n}"]`, v));
const corners = q(`const s = getComputedStyle(block().querySelector('.sqs-shape')); return JSON.stringify([s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius]);`);
add('Each corner takes its own value', corners.join() === '10px,20px,30px,40px', corners.join());
add('The Uniform field reads Mixed', q(`return JSON.stringify(panel.querySelector('[data-shape="radius"]').value);`) === F.corners.uniformField);
act('uniform');
const uni = q(`const s = getComputedStyle(block().querySelector('.sqs-shape')); return JSON.stringify({ c: [s.borderTopLeftRadius, s.borderBottomRightRadius], f: panel.querySelector('[data-shape="radius"]').value });`);
add('Uniform takes the top left\'s value', uni.c.join() === '10px,10px' && uni.f === '10px', JSON.stringify(uni));

// Color.
const fillNow = () => q(`const s = block().querySelector('.sqs-shape'); const svg = s.tagName === 'svg'; return JSON.stringify(svg ? getComputedStyle(s.querySelector('path, rect')).fill : getComputedStyle(s).backgroundColor);`);
add('Starts white', fillNow() === F.color.start.fill, fillNow());
act('color');
const pop0 = q(`return JSON.stringify({ w: pop.getBoundingClientRect().width, labels: [...pop.querySelectorAll('.sh-swatch input')].map((x) => x.getAttribute('aria-label')), checked: pop.querySelector('input:checked')?.getAttribute('aria-label'), reset: !!pop.querySelector('[data-color-reset]'), plus: !!pop.querySelector('[aria-label="Custom color"]'), bar: !!pop.querySelector('[aria-label="Opacity slider"]') });`);
add('Five swatches, 300 wide', pop0.w === F.color.popup.width && pop0.labels.join() === F.color.swatches.map((h) => `Color ${h}`).join(), JSON.stringify(pop0));
add('White checked, no Reset, + and the bar', pop0.checked === `Color ${F.color.start.checked}` && !pop0.reset && pop0.plus && pop0.bar, JSON.stringify(pop0));
const pickSwatch = (hex) => q(`const c = pop.querySelector('[aria-label="Color ${hex}"]'); c.click(); await sleep(250); return 'true';`);
pickSwatch(F.color.picked.swatch);
add(`${F.color.picked.swatch} fills it, Reset appears`, fillNow() === F.color.picked.fill && q(`return JSON.stringify(!!pop.querySelector('[data-color-reset]'));`), fillNow());
q(`const a = pop.querySelector('[data-color-alpha]'); a.value = 49; a.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
add('The bar writes rgba at 0.49', fillNow() === F.color.opacity.fill, fillNow());
q(`pop.querySelector('[data-color-custom]').click(); await sleep(200); return 'true';`);
const custom = q(`return JSON.stringify({ map: !!pop.querySelector('[aria-label="Color Map"]'), hue: !!pop.querySelector('[aria-label="Hue slider"]'), bar: !!pop.querySelector('[aria-label="Opacity slider"]'), fields: [...pop.querySelectorAll('[data-color-field]')].map((x) => x.getAttribute('aria-label')), formats: [...pop.querySelectorAll('[data-color-format] option')].map((x) => x.textContent), swatches: pop.querySelectorAll('.sh-swatch').length, values: [...pop.querySelectorAll('[data-color-field]')].map((x) => x.value), reset: !!pop.querySelector('[data-color-reset]') });`);
add('Custom: map, hue, bar, six swatches', custom.map && custom.hue && custom.bar && custom.swatches === 6 && custom.reset, JSON.stringify(custom));
add('Custom: Red, Green, Blue, Alpha', custom.fields.join() === 'Red,Green,Blue,Alpha' && custom.values.join() === '255,207,90,49%', JSON.stringify(custom));
add('Custom: formats Hex, RGB, HSL', custom.formats.join() === F.color.custom.formats.join(), custom.formats.join());
q(`const f = pop.querySelector('[data-color-field="Red"]'); f.value = '10'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
add('A typed Red writes the fill', fillNow() === 'rgba(10, 207, 90, 0.49)', fillNow());
q(`const m = pop.querySelector('[data-color-format]'); m.value = 'hex'; m.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`);
add('Hex shows the value', q(`return JSON.stringify(pop.querySelector('[data-color-field="Hex"]').value);`) === '#0ACF5A');
const undoOne = q(`const was = model().color; pop.querySelector('[data-color-reset]').click(); await sleep(250); const gone = fe.model.sections[1].blocks.find((b) => b.id === '${id}').color; fe.undo(); await sleep(300); return JSON.stringify(gone === undefined && model().color === was);`);
add('Reset is one undo step', undoOne);
const openPop = (name) => { if (q(`return JSON.stringify(!pop || pop.hidden);`)) act(name); };
openDesign(); openPop('color');
q(`pop.querySelector('[data-color-reset]').click(); await sleep(250); return 'true';`);
add('Reset to theme: white, no Reset', fillNow() === F.color.reset.fill && !q(`return JSON.stringify(!!pop.querySelector('[data-color-reset]'));`), fillNow());
q(`if (!pop.hidden) panel.querySelector('[data-shape-act="color"]').click(); await sleep(150); return 'true';`);

// Stroke.
const dset = (k, v) => q(`panel.querySelector('[data-dset="${k}"][data-v="${v}"]').click(); await sleep(250); return 'true';`);
const inkOf = () => q(`const p = block().querySelector('svg path, svg rect'); if (!p) return JSON.stringify(null); const c = getComputedStyle(p), r = p.getBoundingClientRect(), b = block().getBoundingClientRect(); return JSON.stringify({ stroke: c.stroke, w: c.strokeWidth, dash: c.strokeDasharray, ve: c.vectorEffect, box: [r.left - b.left, r.top - b.top, r.width, r.height].map((v) => Math.round(v * 10) / 10), rx: c.rx });`);
add('Stroke lists three', q(`return JSON.stringify([...panel.querySelectorAll('[data-dset="stroke"]')].map((x) => x.getAttribute('aria-label')));`).join() === F.stroke.options.join());
dset('stroke', 'solid');
let ink = inkOf();
add('Solid starts at M, black', ink?.w === `${F.stroke.width.M}px` && ink.stroke === F.stroke.color.start && ink.dash === 'none', JSON.stringify(ink));
add('A rectangle\'s stroke sits outside its box', near(ink.box, F.stroke.rect.drawn, 0.6), ink.box.join());
const arcNow = () => q(`return JSON.stringify(block().querySelector('svg path').getAttribute('d'));`);
add('Its corner loses half the stroke', /^M[\d.]+,-3 H[\d.]+ A7,7 /.test(arcNow()), arcNow());
for (const k of ['S', 'L', 'M']) { dset('strokeSize', k); add(`Thickness ${k}: ${F.stroke.width[k]}px`, inkOf().w === `${F.stroke.width[k]}px`, inkOf().w); }
dset('stroke', 'dashed');
for (const k of ['S', 'L', 'M']) { dset('strokeSize', k); const got = inkOf(); add(`Dashed ${k}: ${F.stroke.dash[k]}`, got.dash === F.stroke.dash[k], got.dash); }
dset('strokeSize', 'custom');
add('Three dots open a range, 6px', q(`const r = panel.querySelector('input[type="range"][data-design="strokePx"]'); return JSON.stringify(!!r && r.value === '6' && panel.querySelector('.sh-range input[type="text"]').value === '6px');`));
dset('strokeSize', 'M'); dset('stroke', 'solid');
act('strokeColor');
const sp = q(`return JSON.stringify({ n: pop.querySelectorAll('.sh-swatch').length, bar: !!pop.querySelector('[aria-label="Opacity slider"]'), plus: !!pop.querySelector('[aria-label="Custom color"]') });`);
add('Stroke Color: swatches, +, no bar', sp.n === 5 && !sp.bar && sp.plus, JSON.stringify(sp));
pickSwatch(F.stroke.color.picked.swatch);
add(`${F.stroke.color.picked.swatch} on the stroke`, inkOf().stroke === F.stroke.color.picked.stroke, inkOf().stroke);
act('strokeColor');
pickShape('Circle');
ink = inkOf();
add('A circle keeps 6px, non-scaling', ink.w === '6px' && ink.ve === F.stroke.other.effect, JSON.stringify(ink));
dset('stroke', '');
add('No Stroke takes it away', inkOf().stroke === 'none', inkOf().stroke);

// One undo step for a style.
const undoShape = q(`const before = model().shape; panel.querySelector('[data-shape-act="style"]').click(); await sleep(150); pop.querySelector('[aria-label="Egg"]').click(); await sleep(250); const egg = model().shape; fe.undo(); await sleep(300); return JSON.stringify(egg === 'egg' && model().shape === before);`);
add('A style is one undo step', undoShape);

// Stretch off in a wider block (CAP-SHAPEWIDE.json): a 400 by 399.9 square, centred across, top flush.
q(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.find((x) => x.id === '${id}'); delete b.shape; b.stretch = false; delete b.corners; b.layout.desktop.area = [1, 2, 11, 12]; fe.load(next); await sleep(350); return 'true';`);
const wide = q(`const b = block().getBoundingClientRect(), r = block().querySelector('.sqs-shape').getBoundingClientRect(); return JSON.stringify({ w: b.width, h: b.height, x: r.left - b.left, y: r.top - b.top, sw: r.width, sh: r.height });`);
add('A wide block: square, centred, top flush', Math.abs(wide.sw - wide.h) < 1 && Math.abs(wide.x - (wide.w - wide.sw) / 2) < 1 && Math.abs(wide.y) < 0.6, JSON.stringify(wide));

// Where the panel and its popups sit, and how tall the popups are (CAP-T6PLACE.json, CAP-T6RANGE.json, CAP-T6RESET.json).
const read26 = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads;
const PL = read26('CAP-T6PLACE'), RG = read26('CAP-T6RANGE'), RS = read26('CAP-T6RESET');
const lastBox = (r, name) => r.boxes[name].at(-1);
const panelOf = (r) => r.boxes.Design[2];
const moveTo = (area) => q(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.find((x) => x.id === '${id}'); delete b.shape; b.stretch = true; delete b.strokeColor; if (b.design) delete b.design.strokeColor; delete b.color; b.layout.desktop.area = ${JSON.stringify(area)}; fe.load(next); await sleep(300); return 'true';`);
const popInfo = () => q(`const p = pop.getBoundingClientRect(), pn = panel.getBoundingClientRect(), plus = pop.querySelector('[aria-label="Custom color"]')?.getBoundingClientRect(), rs = pop.querySelector('[data-color-reset]')?.getBoundingClientRect(), sw = pop.querySelector('.sh-swatches').getBoundingClientRect(); return JSON.stringify({ hidden: pop.hidden, box: [p.left, p.top, p.width, p.height], panel: [pn.left, pn.top, pn.width], plus: plus && [plus.left - p.left, plus.top - p.top, plus.width, plus.height], row: [sw.left - p.left, sw.top - p.top, sw.width, sw.height], reset: rs && [rs.left - p.left, rs.top - p.top, rs.width, rs.height], bar: !!pop.querySelector('[aria-label="Opacity slider"]') });`);
for (const [name, area, panelRead, popRead] of [['left', [1, 2, 7, 8], 'left popup', 'left popup'], ['middle', [1, 10, 7, 16], 'middle popup', 'middle popup'], ['right', [1, 18, 7, 24], 'right popup', 'right popup']]) {
  moveTo(area); openDesign(); act('color');
  const i = popInfo(), ob = lastBox(PL[popRead], 'Custom color'), op = panelOf(PL[panelRead]), blockBox = PL[popRead].block.box;
  add(`Panel at ${name}: x as read`, near([i.panel[0]], [op[0]], 1.5), `${i.panel[0]} ${op[0]}`);
  add(`Color popup at ${name}: x and size as read`, near([i.box[0], i.box[2], i.box[3]], [ob[0], ob[2], ob[3]], 1.5), `${i.box} ${ob}`);
  if (name === 'right') add('Panel at right sits over the block', i.panel[0] < blockBox[0] + blockBox[2]);
  act('color');
}
moveTo([1, 2, 7, 8]); openDesign();
dset('stroke', 'solid');
act('strokeColor');
let si = popInfo();
const SO = RG['stroke color open'].boxes, SP = RG['stroke color picked'].boxes;
const rowMid = () => q(`const r = panel.querySelector('[data-shape-act="strokeColor"]').getBoundingClientRect(); return JSON.stringify(r.top + r.height / 2);`);
const rowRead = RG['stroke color picked'].controls.find((c) => c.label === 'Stroke Color').box, midRead = rowRead[1] + rowRead[3] / 2;
const popMid = (b) => b[1] + b[3] / 2;
add('Stroke Color popup: 300 by 80', near(si.box.slice(2), SO['Custom color'].at(-1).slice(2), 0.6), si.box);
add('Stroke Color popup: + where read', near(si.plus, [SO['Custom color'][0][0] - SO['Custom color'].at(-1)[0], SO['Custom color'][0][1] - SO['Custom color'].at(-1)[1], 34, 34], 1), si.plus);
add('Stroke Color popup: no bar, no Reset', !si.bar && !si.reset, JSON.stringify(si));
add('Stroke Color popup: its middle from the row as read', near([popMid(si.box) - rowMid()], [popMid(SO['Custom color'].at(-1)) - midRead], 1), `${popMid(si.box) - rowMid()}`);
q(`pop.querySelector('[aria-label="Color #B564F7"]').click(); await sleep(250); return 'true';`);
si = popInfo();
const pk = SP['Custom color'].at(-1), rsRead = RG['stroke color picked'].controls.find((c) => c.label === 'Reset to theme').box;
add('After a swatch: 300 by 146', near(si.box.slice(2), pk.slice(2), 0.6), si.box);
add('After a swatch: Opacity and Reset', si.bar === RS['start stroke picked'].has['Opacity slider'] && !!si.reset === RS['start stroke picked'].has['Reset to theme'], JSON.stringify(si));
add('After a swatch: Reset where read', near(si.reset, [rsRead[0] - pk[0], rsRead[1] - pk[1], rsRead[2], rsRead[3]], 1), si.reset);
add('After a swatch: its middle from the row as read', near([popMid(si.box) - rowMid()], [popMid(pk) - midRead], 1), `${popMid(si.box) - rowMid()}`);
q(`pop.querySelector('[data-color-reset]').click(); await sleep(250); return 'true';`);
si = popInfo();
add('Stroke Reset takes the bar away', si.bar === RS['start stroke reset'].has['Opacity slider'] && !!si.reset === RS['start stroke reset'].has['Reset to theme'] && near(si.box.slice(2), [300, 80], 0.6), JSON.stringify(si));
act('strokeColor'); act('color');
q(`pop.querySelector('[aria-label="Color #FFCF5A"]').click(); await sleep(250); return 'true';`);
si = popInfo();
add('Color after a swatch: as Stroke, 146', si.bar === RS['start color picked'].has['Opacity slider'] && !!si.reset === RS['start color picked'].has['Reset to theme'] && near(si.box.slice(2), [300, 146], 0.6), JSON.stringify(si));
q(`pop.querySelector('[data-color-reset]').click(); await sleep(250); return 'true';`);
si = popInfo();
add('Color Reset keeps the bar', si.bar === RS['start color reset'].has['Opacity slider'] && !!si.reset === RS['start color reset'].has['Reset to theme'] && near(si.box.slice(2), [300, 107], 0.6), JSON.stringify(si));
act('color');

// A new Shape's color and stroke follow the section theme, on all ten, and a picked color stays (CAP-T6THEME.json, CAP-T6RESET.json).
const TH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6THEME.json', import.meta.url))).reads;
const THEMES = { 'Lightest 1': 'white', 'Lightest 2': 'white-bold', 'Light 1': 'light', 'Light 2': 'light-bold', 'Bright 1': 'bright-inverse', 'Bright 2': 'bright', 'Dark 1': 'dark', 'Dark 2': 'dark-bold', 'Darkest 1': 'black', 'Darkest 2': 'black-bold' };
const paint = () => q(`const s = block().querySelector('.sqs-shape'); const e = s.tagName === 'svg' ? s.querySelector('path, rect') : s; const c = getComputedStyle(e); return JSON.stringify({ fill: s.tagName === 'svg' ? c.fill : c.backgroundColor, stroke: s.tagName === 'svg' ? c.stroke : 'none', sw: panel.querySelector('[data-shape-act="color"] i')?.style.background, ssw: panel.querySelector('[data-shape-act="strokeColor"] i')?.style.background });`);
const setUp = (theme, change) => q(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].theme = ${JSON.stringify(theme)}; const b = next.sections[1].blocks.find((x) => x.id === '${id}'); delete b.color; delete b.fill; delete b.design; delete b.designMobile; b.shape = 'rectangle'; ${change} fe.load(next); await sleep(300); fe.select('${sid}', '${id}'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
for (const [name, attr] of Object.entries(THEMES)) {
  const plain = TH[`${name}: plain`].style, picked = TH[`${name}: picked`].style;
  setUp(attr, '');
  let p = paint();
  add(`${name}: a new Shape's color`, p.fill === plain.fill && p.sw === plain.fill, JSON.stringify(p));
  setUp(attr, `b.design = { stroke: 'solid', strokeSize: 'M' }; b.color = '${picked.fill}';`);
  p = paint();
  add(`${name}: a picked color stays, its stroke follows`, p.fill === picked.fill && `${p.stroke} 6px` === picked.stroke && p.ssw === p.stroke, JSON.stringify(p));
}
const RD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6RESET.json', import.meta.url))).reads;
setUp('dark', `b.design = { stroke: 'solid', strokeSize: 'M', strokeColor: 'rgb(181, 100, 247)' };`);
let dp = paint();
add('Dark 1: a picked stroke', `${dp.stroke} 6px` === RD['dark stroke picked'].style.stroke, JSON.stringify(dp));
act('strokeColor');
q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`);
dp = paint();
add('Dark 1: Reset to theme gives the theme\'s stroke', `${dp.stroke} 6px` === RD['dark stroke reset'].style.stroke, JSON.stringify(dp));
add('Dark 1: then no Reset and no Opacity', q(`return JSON.stringify(!pop.querySelector('[data-color-reset]') && !pop.querySelector('.sh-alpha, [data-color-alpha]'));`) === true);
// Color, Stroke and Stroke Color per layout (CAP-T6LAYOUT.json), and Reset to theme on a phone (CAP-T6RESET.json, CAP-T6FOLLOW.json).
const LAY = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6LAYOUT.json', import.meta.url))).reads, FOL = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6FOLLOW.json', import.meta.url))).reads;
const view = (v) => q(`document.getElementById('bp-${v}').click(); await sleep(450); fe.select('${sid}', '${id}'); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
const seen = () => q(`const box = [...block().querySelectorAll('.sqs-shape-block-container')].find((c) => getComputedStyle(c).display !== 'none'); const s = box.querySelector('.sqs-shape'), e = s.tagName === 'svg' ? s.querySelector('path, rect') : s, c = getComputedStyle(e), r = box.getBoundingClientRect(); return JSON.stringify({ fill: s.tagName === 'svg' ? c.fill : c.backgroundColor, stroke: s.tagName === 'svg' && c.stroke !== 'none' ? c.stroke + ' ' + c.strokeWidth : 'none 1px', boxes: block().querySelectorAll('.sqs-shape-block-container').length, wide: r.width > 0 });`);
const swatch = (rowKey, hex) => { act(rowKey); q(`pop.querySelector('[aria-label="Color ${hex}"]').click(); await sleep(200); return 'true';`); act(rowKey); };
const segment = (label) => q(`panel.querySelector('[aria-label="${label}"]').click(); await sleep(200); return 'true';`);
const same = (got, read) => got.fill === read.style.fill && got.stroke === read.style.stroke && got.wide;
setUp('light', '');
view('mobile');
swatch('color', '#FFCF5A'); segment('Solid Stroke'); swatch('strokeColor', '#B564F7');
let ly = seen();
add('A phone Color and Stroke draw on the phone', same(ly, LAY['phone set']), JSON.stringify(ly));
view('desktop'); ly = seen();
add('Desktop stays as it was', same(ly, LAY['desktop after phone']), JSON.stringify(ly));
swatch('color', '#F2B8B4'); segment('Dashed Stroke'); swatch('strokeColor', '#000000'); ly = seen();
add('Desktop sets its own', same(ly, LAY['desktop set']), JSON.stringify(ly));
view('mobile'); ly = seen();
add('The phone keeps its own', same(ly, LAY['phone keeps its own']), JSON.stringify(ly));
view('desktop');
setUp('light', '');
swatch('color', '#FFCF5A'); segment('Solid Stroke'); swatch('strokeColor', '#B564F7');
view('mobile'); ly = seen();
add('Desktop values reach a phone that set none', same(ly, LAY['second, phone flows']) && ly.boxes === 1, JSON.stringify(ly));
act('strokeColor');
add('A value that flows down shows Reset and Opacity', q(`return JSON.stringify(!!pop.querySelector('[data-color-reset]') && !!pop.querySelector('.sh-alpha, [data-color-alpha]'));`) === true);
q(`pop.querySelector('[aria-label="Color #FFCF5A"]').click(); await sleep(200); return 'true';`);
add('A phone pick: Reset and Opacity', q(`return JSON.stringify(!!pop.querySelector('[data-color-reset]') && !!pop.querySelector('.sh-alpha, [data-color-alpha]'));`) === true);
q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`); act('strokeColor');
ly = seen();
add('Reset to theme on a phone gives desktop\'s stroke', ly.stroke === FOL['phone stroke reset'].style.stroke && ly.boxes === 1, JSON.stringify(ly));
swatch('color', '#FFCF5A'); ly = seen();
add('A phone Color', ly.fill === FOL['phone color own'].style.fill, JSON.stringify(ly));
act('color'); q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`); act('color'); ly = seen();
add('Reset to theme on a phone gives desktop\'s color', ly.fill === 'rgb(255, 207, 90)' && ly.boxes === 1, JSON.stringify(ly));
view('desktop');
swatch('strokeColor', '#000000'); swatch('color', '#F2B8B4');
view('mobile'); ly = seen();
add('After Reset the phone follows a later desktop change', same(ly, FOL['phone after desktop change']), JSON.stringify(ly));
view('desktop');
// The phone button, its menu and the dotted labels (CAP-L6PHONEBTN.json, CAP-L6MENU.json, CAP-L6RESETALL.json, CAP-L6PUSH.json, CAP-L6GOTO.json).
const browserKey = (k) => { q(`panel.querySelector('[data-phone-btn]').focus(); return 'true';`); browser(S, 'press', k); return pause(150); };
const MENU = JSON.parse(readFileSync(new URL('../parity/findings/CAP-L6MENU.json', import.meta.url)));
const RALL = JSON.parse(readFileSync(new URL('../parity/findings/CAP-L6RESETALL.json', import.meta.url))).reads, PUSH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-L6PUSH.json', import.meta.url))).reads;
const pBtn = () => q(`const e = panel.querySelector('[data-phone-btn]'); if (!e) return JSON.stringify(null); const r = e.getBoundingClientRect(), o = panel.getBoundingClientRect(); return JSON.stringify({ at: [o.right - r.right, r.top - o.top, r.width, r.height], off: e.disabled, cursor: getComputedStyle(e).cursor, color: getComputedStyle(e).color, dotted: [...panel.querySelectorAll('.is-phone-set')].map((x) => x.textContent.trim()) });`);
const fill = (key, v) => q(`const i = panel.querySelector('input[data-design="${key}"]'); i.focus(); i.value = '${v}'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); await sleep(150); return 'true';`);
const vals = () => q(`const v = (k) => panel.querySelector('input[data-design="' + k + '"]').value; return JSON.stringify({ Rotate: [v('rotate')], Scale: [v('sx'), v('sy')], Offset: [v('tx'), v('ty')] });`);
const nums = (rows) => JSON.stringify(Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.map(parseFloat)])));
const menuOpen = () => q(`panel.querySelector('[data-phone-btn]').click(); await sleep(80); const m = document.getElementById('phone-menu'), b = panel.querySelector('[data-phone-btn]').getBoundingClientRect(), r = m.getBoundingClientRect(), c = getComputedStyle(m.children[0]); return JSON.stringify({ shown: !m.hidden, rows: [...m.querySelectorAll('[role=menuitem]')].map((x) => [x.textContent, x.getBoundingClientRect().height, x.getBoundingClientRect().top - r.top]), size: [r.width, r.height], left: r.left - b.left, bottom: r.bottom - b.top, font: [c.fontSize, c.fontWeight, c.lineHeight, c.color], shadow: getComputedStyle(m).boxShadow, sep: m.querySelector('[role=separator]').getBoundingClientRect().height });`);
const pressMenu = (act) => q(`document.querySelector('[data-phone-act="${act}"]').click(); await sleep(250); return 'true';`);
const setPhoneShape = () => { setUp('light', ''); fill('rotate', '30'); fill('sx', '120'); view('mobile'); };
setPhoneShape();
let pb = pBtn();
add('Phone button: 36 by 36, 10 from the right and top', near(pb.at, [10, 10, 36, 36], 0.5), JSON.stringify(pb.at));
add('Phone button: disabled with no phone values', pb.off && pb.cursor === 'not-allowed' && pb.dotted.length === 0, JSON.stringify(pb));
q(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.find((x) => x.id === '${id}'); b.layout.mobile.area = b.layout.mobile.area.map((v, i) => i % 2 === 0 ? v + 2 : v); fe.load(next); await sleep(300); fe.select('${sid}', '${id}'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
add('Phone button: a move alone leaves it disabled', pBtn().off === true);
fill('rotate', '45'); fill('tx', '20'); segment('Solid Stroke'); swatch('color', '#FFCF5A');
pb = pBtn();
add('Phone button: a Design value turns it on', pb.off === false && pb.cursor === 'pointer' && pb.color === 'rgb(14, 14, 14)', JSON.stringify(pb));
const wantDots = Object.keys(RALL.before.leaves).filter((k) => RALL.before.leaves[k]);
add('Dotted labels on the rows the phone set', wantDots.every((k) => pb.dotted.includes(k)) && !pb.dotted.includes('Scale'), pb.dotted.join());
const dotLook = q(`const e = panel.querySelector('.is-phone-set'), c = getComputedStyle(e); return JSON.stringify([c.textDecorationStyle, c.textDecorationThickness, c.textDecorationColor, c.textUnderlineOffset]);`);
add('Dotted label: as read', dotLook.join() === [MENU.label.textDecorationStyle, MENU.label.textDecorationThickness, MENU.label.textDecorationColor, MENU.label.textUnderlineOffset].join(), dotLook.join());
const before = { vals: vals(), seen: seen() };
q(`panel.style.top = '320px'; return 'true';`);
const mo = menuOpen();
add('Menu: three rows and a line, in order', mo.shown && mo.rows.map((r) => r[0]).join() === 'Reset all overrides,Push to desktop,Go to desktop' && near(mo.rows.map((r) => r[2]), [0, 46, 93], 0.5) && mo.sep === 1, JSON.stringify(mo.rows));
add('Menu: its size and place by the button', near(mo.size, [166.75, 139], 0.5) && Math.abs(mo.left + 59.4) <= 0.5 && Math.abs(mo.bottom - 11.5) <= 0.5, JSON.stringify(mo));
add('Menu: its text and shadow', mo.font.join() === '14px,500,22px,rgb(14, 14, 14)' && /0px 4px 16px/.test(mo.shadow), JSON.stringify([mo.font, mo.shadow]));
browserKey('Escape');
add('Menu: Escape closes it, the panel stays', q(`return JSON.stringify(document.getElementById('phone-menu').hidden && !panel.hidden);`) === true);
menuOpen(); pressMenu('reset');
const resetVals = vals(), resetSeen = seen(); pb = pBtn();
add('Reset all overrides: the phone follows desktop', nums(resetVals) === nums(RALL['after reset'].rows) && same(resetSeen, RALL['after reset']), JSON.stringify([resetVals, resetSeen]));
add('Reset all overrides: dots gone, the button off, the place kept', pb.off && !pb.dotted.length && q(`return JSON.stringify(model().layout.mobile.area[0] > 1 && !model().designMobile);`) === true, JSON.stringify(pb));
q(`document.getElementById('undo').click(); await sleep(250); return 'true';`);
add('Reset all overrides: one undo step', JSON.stringify(vals()) === JSON.stringify(before.vals), JSON.stringify(vals()));
const placeBefore = q(`return JSON.stringify(model().layout);`);
menuOpen(); pressMenu('push');
const pushVals = vals(), pushSeen = seen(); pb = pBtn();
add('Push to desktop: the phone keeps what it drew', nums(pushVals) === nums(PUSH['after push'].rows) && same(pushSeen, PUSH['after push']), JSON.stringify([pushVals, pushSeen]));
add('Push to desktop: dots gone, the button off', pb.off && !pb.dotted.length, JSON.stringify(pb));
add('Push to desktop: places do not move', JSON.stringify(q(`return JSON.stringify(model().layout);`)) === JSON.stringify(placeBefore));
view('desktop');
const deskPush = { vals: vals(), seen: seen() };
add('Push to desktop: desktop has the values', nums(deskPush.vals) === nums(PUSH['desktop after'].rows) && same(deskPush.seen, PUSH['desktop after']), JSON.stringify(deskPush));
add('No phone button on desktop', pBtn() === null);
view('mobile'); fill('rotate', '45');
menuOpen(); pressMenu('go'); await pause(600);
const go = q(`return JSON.stringify({ desktop: document.getElementById('bp-desktop').classList.contains('is-on'), rotate: panel.querySelector('input[data-design="rotate"]')?.value, open: !panel.hidden, kept: model().designMobile?.rotate });`);
add('Go to desktop: the view changes, desktop\'s values show, nothing is written', go.desktop && go.open && go.rotate === deskPush.vals.Rotate[0] && go.kept === 45, JSON.stringify(go));
// The rows of a new Shape, Anchor, Corner per layout and Color's Reset on a flowing phone (CAP-L6ROWS.json, CAP-L6ANCHOR.json, CAP-L6CORNER.json).
const L6 = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url)));
const AN = L6('CAP-L6ANCHOR'), CO = L6('CAP-L6CORNER'), RW = L6('CAP-L6ROWS');
const popHidden = () => q(`return JSON.stringify(pop.hidden);`) === true;
const press = (sel2) => { const r = q(`const e = ${sel2}; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return JSON.stringify([b.left + b.width / 2, b.top + b.height / 2]);`); mouse(S, 'move', r[0], r[1]); mouse(S, 'down', r[0], r[1], { buttons: 1 }); mouse(S, 'up', r[0], r[1]); return pause(250); };
const anchorBtn = `panel.querySelector('.bp-anchor')`, place = (n) => `[...pop.querySelectorAll('.an-anchor-row')].find((e) => e.textContent === '${n}')`;
view('desktop'); setUp('light', '');
const at = q(`const P = panel.getBoundingClientRect(), s = panel.scrollTop; const top = (e) => Math.round((e.getBoundingClientRect().top - P.top + s) * 10) / 10; const label = (t) => [...panel.querySelectorAll('.sp-label')].find((e) => e.textContent === t).closest('.sp-row, .bp-trow'); const c = (e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.height / 2 - P.top + s) * 10) / 10; }; return JSON.stringify({ style: top(panel.querySelector('.sh-style')), field: top(panel.querySelector('[data-shape="radius"]').closest('label')), stretch: c(label('Stretch')), styling: c([...panel.querySelectorAll('.bp-thead span')].find((e) => e.textContent === 'Styling')), color: top(label('Color')), blend: top(label('Blend Mode')), dropShadow: c(label('Drop Shadow')), blur: c(label('Blur')), opacity: top(panel.querySelector('input[data-design="opacity"]').closest('label')), anchor: top(panel.querySelector('.bp-anchor')), more: c(panel.querySelector('[data-shape-act="more"]')) });`);
add('A new Shape: rows under the panel\'s top as read', near([at.style, at.field, at.stretch, at.styling, at.color, at.blend, at.dropShadow, at.blur, at.opacity, at.anchor], [104, 213, 296, 371, 379, 427, 540, 585, 682, 937], 1.5), JSON.stringify(at));
q(`panel.style.left = '461px'; panel.style.top = '301px'; return 'true';`);
await press(`panel.querySelector('[data-shape-act="color"]')`);
const cp = q(`const p = pop.getBoundingClientRect(), s = panel.querySelector('[data-shape-act="color"]').getBoundingClientRect(); return JSON.stringify([p.bottom - s.bottom, p.width, p.height]);`);
add('Color popup: its bottom 5.5 under the swatch, 300 by 107', near(cp, [5.5, 300, RW.colorPopup.noReset[3]], 1), JSON.stringify(cp));
// The Custom color view (CAP-L6ROWS.json): it grows around the middle.
const smallMid = q(`const p = pop.getBoundingClientRect(); return JSON.stringify(p.top + p.height / 2);`);
q(`pop.querySelector('[aria-label="Custom color"]').click(); await sleep(250); return 'true';`);
const cv = q(`const p = pop.getBoundingClientRect(), r = (e) => { const b = e.getBoundingClientRect(); return [b.left - p.left, b.top - p.top, b.width, b.height]; }, sw = [...pop.querySelectorAll('.sh-swatch input')]; return JSON.stringify({ size: [p.width, p.height], mid: p.top + p.height / 2, swatches: sw.map((e) => r(e)[0]), sixth: sw.at(-1).checked && sw.filter((e) => e.checked).length === 1, y: r(sw[0])[1], hue: r(pop.querySelector('[aria-label="Hue slider"]')), map: r(pop.querySelector('[aria-label="Color Map"]')), reset: r(pop.querySelector('[data-color-reset]')) });`);
const CU = RW.customView;
add('Custom color: its size, and its middle as it was', near(cv.size, CU.size, 1) && near([cv.mid], [smallMid], 1), JSON.stringify(cv));
add('Custom color: six swatches 46 apart, the last ringed', near(cv.swatches, CU.swatchLefts, 1.5) && cv.sixth && near([cv.y], [CU.swatchTop], 1), JSON.stringify(cv.swatches));
add('Custom color: thumbs and Reset where read', near(cv.map.slice(0, 2), CU.mapThumb, 1) && near(cv.hue.slice(0, 2), CU.hueThumb, 1) && near(cv.reset, CU.reset, 1.5), JSON.stringify([cv.map, cv.hue, cv.reset]));
q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`);
if (!popHidden()) await press(`panel.querySelector('[data-shape-act="color"]')`);
setUp('light', '');
// Which side the popup takes (CAP-L6ROWS.json): 11 must stay free at the screen's edge.
const sides = [];
for (const [right, left] of RW.flip.read) { q(`panel.style.left = '${right - 320}px'; return 'true';`); await press(`panel.querySelector('[data-shape-act="color"]')`); sides.push(q(`return JSON.stringify(pop.getBoundingClientRect().left);`)); await press(`panel.querySelector('[data-shape-act="color"]')`); if (Math.abs(sides.at(-1) - left) > 0.6) add(`Color popup at a panel right of ${right}`, false, `${sides.at(-1)} ${left}`); }
add('Color popup: the side it takes, at each place read', near(sides, RW.flip.read.map((r) => r[1]), 0.6), sides.join());
setUp('light', '');
add('Anchor: the last row, a 44 by 44 button', near(q(`const P = panel.getBoundingClientRect(), r = ${anchorBtn}.getBoundingClientRect(); return JSON.stringify([r.left - P.left, r.width, r.height]);`), [254, 44, 44], 0.6));
const glyphDot = () => q(`const c = [...${anchorBtn}.querySelectorAll('circle')].at(-1); return JSON.stringify([+c.getAttribute('cx'), +c.getAttribute('cy'), +c.getAttribute('r')]);`);
add('Anchor: its dot at the middle', near(glyphDot(), [11, 11, 2.5], 0.01));
add('Anchor: closed, as read', q(`const c = getComputedStyle(${anchorBtn}); return JSON.stringify([c.backgroundColor, c.borderRadius].join());`) === `${AN.row.button.bgClosed},${AN.row.button.radius}`);
await press(anchorBtn);
const ap = () => q(`if (pop.hidden) return JSON.stringify(null); const p = pop.getBoundingClientRect(), P = panel.getBoundingClientRect(), b = ${anchorBtn}.getBoundingClientRect(); const rows = [...pop.querySelectorAll('.an-anchor-row')]; return JSON.stringify({ box: [p.left - P.right, p.width, p.height], bottom: p.bottom - b.bottom, focus: document.activeElement.getAttribute('aria-label'), names: rows.map((r) => r.textContent), on: rows.filter((r) => r.classList.contains('is-on')).map((r) => r.textContent), bg: getComputedStyle(${anchorBtn}).backgroundColor, x: pop.querySelector('[data-anchor="ox"]').value, y: pop.querySelector('[data-anchor="oy"]').value, origin: getComputedStyle(block()).transformOrigin, vars: [getComputedStyle(block()).getPropertyValue('--origin-x').trim() || '50%', getComputedStyle(block()).getPropertyValue('--origin-y').trim() || '50%'] });`);
let an = ap();
add('Position: 300 by 485, 11 right of the panel, bottom on the button', near(an.box, [11, 300, 485], 0.6) && Math.abs(an.bottom) <= 0.6, JSON.stringify(an));
add('Position: X has the focus, Center is on, the button darkens', an.focus === 'X' && an.on.join() === 'Center' && an.bg === AN.row.button.bgOpen, JSON.stringify(an));
add('Position: nine places in order', an.names.join() === Object.keys(AN.places).join(), an.names.join());
const look = q(`const c = (e) => getComputedStyle(e), h = pop.querySelector('.an-anchor-head'), r = pop.querySelector('.an-anchor-row'), P = pop.getBoundingClientRect(), hb = h.getBoundingClientRect(), bx = pop.querySelector('.an-anchor-box').getBoundingClientRect(), rb = r.getBoundingClientRect(), g = r.querySelector('svg').getBoundingClientRect(), t = r.querySelector('span').getBoundingClientRect(); return JSON.stringify({ head: [parseFloat(c(h).paddingLeft), hb.top - P.top, c(h).fontWeight], box: [bx.left - P.left, bx.top - P.top, bx.width, bx.height], row: [rb.top - P.top, rb.height, g.left - P.left, g.width, t.left - P.left, c(r.querySelector('span')).fontSize], shadow: c(pop).boxShadow, focus: c(pop.querySelector('.an-anchor-box')).boxShadow });`);
add('Position: its look as read', near(look.head.slice(0, 2), [11, 6], 0.6) && look.head[2] === '500' && near(look.box, [11, 39, 136, 44], 0.6) && near(look.row.slice(0, 5), [89, 44, 11, 22, 44], 0.6) && look.row[5] === '14px' && /0px 6px 24px/.test(look.shadow), JSON.stringify(look));
let placesOk = [];
for (const [name, want] of Object.entries(AN.places)) { await press(place(name)); const g = ap(); if (!(g && g.on.join() === name && g.x === want.x && g.y === want.y && g.vars.join() === want.origin.join())) placesOk.push(name + JSON.stringify(g)); }
add('Position: each place sets X, Y and the origin, and stays open', !placesOk.length, placesOk.join());
add('Anchor: its dot shows the place', near(glyphDot(), [20, 20, 2.5], 0.01));
q(`document.getElementById('undo').click(); await sleep(250); return 'true';`);
await pause(100);
add('Position: a place takes one undo step, and the popup follows', ap().x === '50%' && ap().y === '100%', JSON.stringify(ap()));
const typeAxis = (k, v) => q(`const i = pop.querySelector('[data-anchor="${k}"]'); i.focus(); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`);
const axes = () => q(`return JSON.stringify([pop.querySelector('[data-anchor="ox"]').value, pop.querySelector('[data-anchor="oy"]').value, getComputedStyle(block()).getPropertyValue('--origin-x').trim(), document.activeElement.getAttribute('aria-label')]);`);
typeAxis('ox', '25'); let ax = axes(), on25 = ap().on;
add('X typed: 25 gives 25%, no place on, the focus stays', ax[0] === AN.typed['25'] && ax[2] === '25%' && !on25.length && ax[3] === 'X', JSON.stringify(ax));
add('X typed: the dot goes there', near(glyphDot().slice(0, 1), [6.5], 0.01));
typeAxis('ox', '-20'); add('X typed: below 0 holds', axes()[0] === AN.typed['-20']);
typeAxis('ox', '150'); add('X typed: over 100 holds', axes()[0] === AN.typed['150']);
typeAxis('oy', '33.3'); add('Y typed: a decimal holds', axes()[1] === AN.typed['33.3']);
typeAxis('ox', '30px'); add('X typed: 30px gives 30%', axes()[0] === AN.typed['30px']);
typeAxis('ox', 'abc'); add('X typed: words go back', axes()[0] === '30%');
typeAxis('ox', ''); add('X typed: nothing goes back', axes()[0] === '30%');
typeAxis('ox', '100000'); add('X typed: a big number, no limit, with its comma', axes()[0] === AN.typed['100000'] && axes()[2] === '100000%', JSON.stringify(axes()));
q(`pop.querySelector('[data-anchor="oy"]').focus(); return 'true';`);
await press(place('Top Right'));
const hitX = q(`document.activeElement.blur(); const r = pop.querySelector('[data-anchor="ox"]').closest('label').querySelector('.sc-r').getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
mouse(S, 'move', hitX[0], hitX[1]); mouse(S, 'down', hitX[0], hitX[1], { buttons: 1 }); for (let k = 1; k <= 5; k++) mouse(S, 'move', hitX[0] - 10 * k, hitX[1], { buttons: 1 }); mouse(S, 'up', hitX[0] - 50, hitX[1]); await pause(250);
add('X: a drag on its edge, 0.4 per pixel', axes()[0] === AN.drag.after, JSON.stringify(axes()));
browser(S, 'press', 'Escape'); await pause(200);
add('Position: Escape closes it, the panel stays, the block stays selected', q(`return JSON.stringify(pop.hidden && !panel.hidden && !!document.querySelector('#block-toolbar') && getComputedStyle(${anchorBtn}).backgroundColor === '${AN.row.button.bgClosed}');`) === true);
await press(anchorBtn); await press(anchorBtn);
add('Position: a second press closes it', popHidden());
await press(anchorBtn); await press(`[...panel.querySelectorAll('.sp-label')].find((e) => e.textContent === 'Anchor')`);
add('Position: a press on the panel closes it', popHidden());
q(`panel.style.left = '${AN.popup.noRoom.panel[0]}px'; return 'true';`); await press(anchorBtn);
add('Position: with no room, 11 left of the panel', near([q(`return JSON.stringify(pop.getBoundingClientRect().left);`)], [AN.popup.noRoom.popup[0]], 0.6), JSON.stringify(ap()));
await press(place('Top Left')); browser(S, 'press', 'Escape'); await pause(200);
// Copy transforms carries Anchor.
const moreMenu = (name) => q(`panel.querySelector('[data-shape-act="more"]').click(); await sleep(150); pop.querySelector('[data-more="${name}"]').click(); await sleep(250); return 'true';`);
moreMenu('copy');
await press(anchorBtn); await press(place('Bottom Right')); browser(S, 'press', 'Escape'); await pause(200);
moreMenu('paste');
add('Copy transforms carries Anchor', q(`return JSON.stringify(getComputedStyle(block()).getPropertyValue('--origin-x').trim() + getComputedStyle(block()).getPropertyValue('--origin-y').trim());`) === '0%0%');
// Per layout.
setUp('light', '');
await press(anchorBtn); await press(place('Bottom Right')); browser(S, 'press', 'Escape'); await pause(200);
view('mobile');
const originNow = () => q(`const c = getComputedStyle(block()); return JSON.stringify(c.getPropertyValue('--origin-x').trim() + ' ' + c.getPropertyValue('--origin-y').trim());`);
const dotsNow = () => q(`return JSON.stringify([...panel.querySelectorAll('.is-phone-set')].map((e) => e.textContent));`);
add('Anchor: desktop\'s flows to a phone that set none, no dots, the button off', originNow() === `${AN.perLayout.flows.ox} ${AN.perLayout.flows.oy}` && !dotsNow().length && pBtn().off, JSON.stringify([originNow(), dotsNow()]));
await press(anchorBtn); await press(place('Top Left')); browser(S, 'press', 'Escape'); await pause(200);
add('Anchor: set on a phone, dotted, the button on', originNow() === '0% 0%' && dotsNow().includes('Anchor') && !pBtn().off, JSON.stringify([originNow(), dotsNow()]));
view('desktop');
add('Anchor: desktop keeps its own', originNow() === '100% 100%', originNow());
await press(anchorBtn); await press(place('Center Right')); browser(S, 'press', 'Escape'); await pause(200);
view('mobile');
add('Anchor: the phone keeps its own', originNow() === '0% 0%', originNow());
pBtn(); menuOpen(); pressMenu('reset');
add('Reset all overrides: Anchor flows again', originNow() === '100% 50%', originNow());
await press(anchorBtn); typeAxis('ox', '10'); browser(S, 'press', 'Escape'); await pause(200);
add('X typed on a phone holds Y', q(`return JSON.stringify([model().designMobile.ox, model().designMobile.oy].join());`) === '10,50', JSON.stringify(q(`return JSON.stringify(model().designMobile);`)));
menuOpen(); pressMenu('push'); view('desktop');
add('Push to desktop: desktop takes Anchor', originNow() === '10% 50%', originNow());
// Corner per layout: a Shape.
const cornerNow = () => q(`const box = [...block().querySelectorAll('.sqs-shape-block-container')].find((c) => getComputedStyle(c).display !== 'none'); const s = box.querySelector('.sqs-shape'), e = s.tagName === 'svg' ? s.querySelector('rect, path') : s; return JSON.stringify([panel.querySelector('[data-shape="radius"]').value, getComputedStyle(e).borderTopLeftRadius, [...panel.querySelectorAll('[data-shape-act="uniform"], [data-shape-act="individual"]')].map((b) => b.getAttribute('aria-checked')).join(), panel.querySelectorAll('.sh-corner').length]);`);
const typeCorner = (v) => q(`const i = panel.querySelector('[data-shape="radius"]'); i.focus(); i.value = '${v}'; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`);
setUp('light', '');
typeCorner('8'); view('mobile');
add('Corner: desktop\'s flows to a phone that set none', cornerNow().slice(0, 2).join() === '8px,8px' && pBtn().off, JSON.stringify(cornerNow()));
typeCorner('12');
add('Corner: set on a phone, drawn there, the button on', cornerNow().slice(0, 2).join() === `${CO.shape.phone12.value},12px` && !pBtn().off, JSON.stringify(cornerNow()));
const shapeFocus = q(`const i = panel.querySelector('[data-shape="radius"]'); i.focus(); await sleep(50); const r = i.closest('label').querySelector('.sc-reset'); return JSON.stringify([getComputedStyle(r).opacity, r.getAttribute('aria-label')]);`);
add('Corner: Reset shows while the field has focus', shapeFocus.join() === '1,Reset to default value', shapeFocus.join());
view('desktop');
add('Corner: desktop keeps its own', cornerNow()[0] === CO.shape.desktopKeeps.value, JSON.stringify(cornerNow()));
typeCorner('20'); view('mobile');
add('Corner: the phone keeps its own', cornerNow()[0] === CO.shape.phoneKeeps.value, JSON.stringify(cornerNow()));
const pressRadio = (act2) => q(`panel.querySelector('[data-shape-act="${act2}"]').click(); await sleep(200); return 'true';`);
pressRadio('individual');
add('Corner: Individual on a phone, four fields of its value', cornerNow().join() === '12px,12px,false,true,4', JSON.stringify(cornerNow()));
view('desktop');
add('Corner: desktop stays Uniform', cornerNow().join() === '20px,20px,true,false,0', JSON.stringify(cornerNow()));
view('mobile');
add('Corner: four equal read as Uniform when the view comes back', cornerNow().join() === '12px,12px,true,false,0', JSON.stringify(cornerNow()));
q(`const i = panel.querySelector('[data-shape="radius"]'); i.focus(); await sleep(30); i.closest('label').querySelector('.sc-reset').click(); await sleep(200); return 'true';`);
add('Corner: Reset on a phone gives 0, the phone\'s own', cornerNow()[0] === CO.shape.reset.phoneReset && q(`return JSON.stringify(model().designMobile.corner);`) === 0, JSON.stringify(cornerNow()));
q(`document.activeElement.blur(); return 'true';`);
const hitC = q(`const r = panel.querySelector('[data-shape="radius"]').closest('label').querySelector('.sc-r').getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
mouse(S, 'move', hitC[0], hitC[1]); mouse(S, 'down', hitC[0], hitC[1], { buttons: 1 }); for (let k = 1; k <= 5; k++) mouse(S, 'move', hitC[0] + 10 * k, hitC[1], { buttons: 1 }); mouse(S, 'up', hitC[0] + 50, hitC[1]); await pause(250);
add('Corner: a drag on its edge, 0.4 per pixel', cornerNow()[0] === CO.shape.drag.after, JSON.stringify(cornerNow()));
menuOpen(); pressMenu('reset');
add('Reset all overrides: Corner flows again, the button off', cornerNow()[0] === '20px' && pBtn().off, JSON.stringify(cornerNow()));
pressRadio('individual');
add('Corner: Individual on a flowing phone writes nothing', pBtn().off && cornerNow().join() === '20px,20px,false,true,4', JSON.stringify(cornerNow()));
pressRadio('uniform');
add('Corner: Uniform after it makes the value the phone\'s', !pBtn().off && cornerNow()[0] === '20px', JSON.stringify(cornerNow()));
typeCorner('12'); menuOpen(); pressMenu('push'); view('desktop');
add('Push to desktop: desktop takes Corner', cornerNow().slice(0, 2).join() === `${CO.shape.push.desktop},12px` && q(`return JSON.stringify(model().radius);`) === '12px', JSON.stringify(cornerNow()));
// Corner per layout: an Image with four corners too.
const imgId = 'l6image';
q(`const next = JSON.parse(JSON.stringify(fe.model)); const o = next.sections[1].blocks.find((x) => x.id === '${id}'); next.sections[1].blocks.push({ id: '${imgId}', type: 'image', mode: 'fill', layout: { desktop: { area: [10, 2, 16, 8], z: 9 }, mobile: { area: [12, 2, 18, 8], z: 9 } } }); fe.load(next); await sleep(300); fe.select('${sid}', '${imgId}'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
const imgNow = () => q(`const f = document.getElementById('site-frame').contentDocument.querySelector('.fe-block-${imgId} .fluid-image-container'); return JSON.stringify([panel.querySelector('[data-shape="radius"]').value, getComputedStyle(f).borderTopLeftRadius, [...panel.querySelectorAll('.is-phone-set')].map((e) => e.textContent).join()]);`);
const imgView = (v) => q(`document.getElementById('bp-${v}').click(); await sleep(450); fe.select('${sid}', '${imgId}'); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
typeCorner('8'); imgView('mobile');
add('Image Corner: desktop\'s flows to the phone, no dot', imgNow().join() === '8px,8px,', imgNow().join());
typeCorner('12');
add('Image Corner: set on a phone, drawn there, dotted', imgNow().join() === `${CO.image.phone12.val},12px,Corner`, imgNow().join());
imgView('desktop');
add('Image Corner: desktop keeps its own', imgNow().join() === `${CO.image.desktopKeeps8.val},8px,`, imgNow().join());
imgView('mobile'); pressRadio('individual');
q(`const i = panel.querySelector('[aria-label="Top left corner radius"]'); i.focus(); i.value = '4'; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`);
add('Image Corner: a mixed set on the phone reads Mixed', imgNow()[0] === CO.image.mixed.val, imgNow().join());
imgView('desktop'); imgView('mobile');
add('Image Corner: mixed stays when the view comes back', imgNow()[0] === 'Mixed', imgNow().join());
pressRadio('uniform');
add('Image Corner: Uniform takes the first corner', imgNow()[0] === CO.image.uniformFromMixed.val, imgNow().join());
imgView('desktop');
q(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks = next.sections[1].blocks.filter((x) => x.id !== '${imgId}'); fe.load(next); await sleep(300); return 'true';`);
// Color's Reset on a phone while desktop's value flows down.
setUp('light', '');
swatch('color', '#F2B8B4'); view('mobile');
act('color');
const fl = q(`const p = pop.getBoundingClientRect(), s = panel.querySelector('[data-shape-act="color"]').getBoundingClientRect(); return JSON.stringify({ reset: !!pop.querySelector('[data-color-reset]'), opacity: !!pop.querySelector('.sh-alpha, [data-color-alpha]'), h: p.height, bottom: p.bottom - s.bottom });`);
add('Color flowing to a phone: Reset and Opacity as read', fl.reset === RW.resetWhileFlowing.popup.reset && fl.opacity === RW.resetWhileFlowing.popup.opacity && near([fl.h, fl.bottom], [RW.colorPopup.withReset[3], 5.5], 1.5), JSON.stringify(fl));
q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`);
const afterFlow = q(`return JSON.stringify({ reset: !!pop.querySelector('[data-color-reset]'), dots: [...panel.querySelectorAll('.is-phone-set')].map((e) => e.textContent), on: !panel.querySelector('[data-phone-btn]').disabled });`);
act('color');
const seenFill = () => seen().fill;
add('Reset on a flowing phone: the color stays, Color dotted, no Reset', seenFill() === RW.resetWhileFlowing.afterReset.fill && afterFlow.reset === RW.resetWhileFlowing.afterReset.resetStillShown && afterFlow.dots.join() === 'Color', JSON.stringify([afterFlow, seenFill()]));
view('desktop'); swatch('color', '#B564F7'); view('mobile');
add('Reset on a flowing phone: then a desktop change reaches it, still dotted', seenFill() === RW.resetWhileFlowing.phoneFollows.fill && dotsNow().join() === 'Color', JSON.stringify([seenFill(), dotsNow()]));
view('desktop');
// Four corners and a stroke (CAP-T6CORNERS.json), and the Custom color view (CAP-T6CUSTOM.json).
{
  const C = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6CORNERS.json', import.meta.url))), U = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6CUSTOM.json', import.meta.url)));
  const [W, H] = [342, 236];
  const W0 = { nostroke: 0, solidS: 2, solidM: 6, solidL: 15, dashS: 2, dashM: 6, dashL: 15 };
  for (const [k, w] of Object.entries(W0)) add(`The path rule, ${k}`, rectPath(W, H, C.corners, w) === C.reads[k].d, rectPath(W, H, C.corners, w));
  add('The path rule, radii that do not fit', rectPath(W, H, C.big.corners, 6) === C.big.stroked.d && rectPath(W, H, C.big.corners, 0) === C.big.off.d, rectPath(W, H, C.big.corners, 6));
  q(`const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.find((x) => x.id === '${id}'); for (const k of ['shape', 'radius', 'corners', 'color', 'designMobile', 'design']) delete b[k]; b.stretch = true; fe.load(next); await sleep(300); return 'true';`);
  openDesign();
  const setCorners = (v) => q(`const u = panel.querySelector('[aria-label="Individual corner radii"]'); if (u.getAttribute('aria-checked') !== 'true') { u.click(); await sleep(150); } const labels = ['Top left', 'Top right', 'Bottom right', 'Bottom left']; const vals = ${JSON.stringify(v)}; for (let i = 0; i < 4; i++) { const f = panel.querySelector('[aria-label="' + labels[i] + ' corner radius"]'); f.value = vals[i]; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(120); } return 'true';`);
  const drawnNow = () => q(`const s = block().querySelector('svg.sqs-shape'), p = s?.querySelector('path'), c = p && getComputedStyle(p); return JSON.stringify(p ? { W: s.clientWidth, H: s.clientHeight, d: p.getAttribute('d'), cap: c.strokeLinecap, join: c.strokeLinejoin, dash: c.strokeDasharray, w: c.strokeWidth, ve: c.vectorEffect } : null);`);
  setCorners(C.corners);
  const isDiv = q(`return JSON.stringify(!!block().querySelector('div.sqs-shape') && !block().querySelector('svg.sqs-shape'));`);
  add('No stroke: ours a div, its corners in CSS', isDiv && q(`return JSON.stringify(getComputedStyle(block().querySelector('.sqs-shape')).borderRadius);`) === '5px 10px 20px 40px', String(isDiv));
  for (const [v, size, w, dash] of [['solid', 'S', 2, 'none'], ['solid', 'M', 6, 'none'], ['solid', 'L', 15, 'none'], ['dashed', 'S', 2, F.stroke.dash.S], ['dashed', 'M', 6, F.stroke.dash.M], ['dashed', 'L', 15, F.stroke.dash.L]]) {
    dset('stroke', v); dset('strokeSize', size);
    const g = drawnNow();
    add(`Four corners, ${v} ${size}: the path, caps and joins`, g && g.d === rectPath(g.W, g.H, C.corners, w) && g.cap === 'square' && g.join === 'miter' && g.dash === dash && g.w === `${w}px` && g.ve === 'non-scaling-stroke', JSON.stringify(g));
  }
  dset('stroke', 'solid'); dset('strokeSize', 'M');
  viewport(S, 1300, 1000); await pause(500);
  const g2 = drawnNow();
  add('The path follows the box when the window changes', g2.d === rectPath(g2.W, g2.H, C.corners, 6), JSON.stringify(g2));
  viewport(S, 1600, 1000); await pause(500);
  setCorners(C.big.corners);
  const g3 = drawnNow();
  add('A corner of 0 has no arc, a big one shrinks', g3.d === rectPath(g3.W, g3.H, C.big.corners, 6) && /V-3 Z$/.test(g3.d), JSON.stringify(g3));
  dset('stroke', '');
  q(`panel.querySelector('[aria-label="Uniform corner radii"]').click(); await sleep(200); return 'true';`);
  // The Custom color view.
  act('color');
  q(`pop.querySelector('[aria-label="Custom color"]').click(); await sleep(250); return 'true';`);
  const tv = (sel) => q(`const e = ${sel}, c = getComputedStyle(e); return JSON.stringify({ bw: c.borderTopWidth, bc: c.borderTopColor, shadow: c.boxShadow, w: e.offsetWidth });`);
  const shadow = U.thumbs[0].shadow;
  for (const L of ['Color Map', 'Hue slider']) { const g = tv(`pop.querySelector('[aria-label="${L}"]')`); add(`${L} thumb as read`, g.bw === '3px' && g.bc === 'rgb(255, 255, 255)' && g.shadow === shadow && g.w === 16, JSON.stringify(g)); }
  const ot = q(`const rule = [...document.styleSheets].flatMap((s) => [...s.cssRules]).find((x) => x.selectorText === '.sh-opacity::-webkit-slider-thumb'); return JSON.stringify({ bw: rule.style.borderTopWidth, shadow: rule.style.boxShadow, w: rule.style.width });`);
  add('Opacity thumb as read', ot.bw === '3px' && ot.w === '16px' && ot.shadow.replace(/ 0px/g, ' 0') === shadow.replace(/ 0px/g, ' 0'), JSON.stringify(ot));
  const cells = () => q(`const p = pop.getBoundingClientRect(); const r = (e) => { const b = e.getBoundingClientRect(); return [b.left - p.left, b.top - p.top, b.width, b.height]; }; return JSON.stringify({ select: r(pop.querySelector('[data-color-format]')), cells: [...pop.querySelectorAll('[data-color-field]')].map(r), bar: !!pop.querySelector('.sh-opacity'), reset: r(pop.querySelector('[data-color-reset]')), right: [...pop.querySelectorAll('[data-color-field]')].map((e) => getComputedStyle(e).borderRightWidth) });`);
  const wantCells = (rows) => rows.filter((x) => x.el === 'DIV' && x.role !== 'combobox').map((x) => x.box);
  const sel = (rows) => rows.find((x) => x.role === 'combobox').box;
  const fmt = (v) => q(`const m = pop.querySelector('[data-color-format]'); m.value = '${v}'; m.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`);
  const same = (g, rows) => near(g.select, sel(rows), 0.7) && g.cells.length === wantCells(rows).length && g.cells.every((c, i) => near(c, wantCells(rows)[i], 0.7));
  let g4 = cells();
  add('RGB row: the menu and four cells as read', same(g4, U.rgb), JSON.stringify(g4));
  add('RGB row: a line between the cells', g4.right.join() === '1px,1px,1px,0px', g4.right.join());
  fmt('hsl'); g4 = cells();
  add('HSL row as read', same(g4, U.hsl), JSON.stringify(g4));
  fmt('hex'); g4 = cells();
  add('Hex row as read, no bar, no Alpha', same(g4, U.hex) && !g4.bar, JSON.stringify(g4));
  fmt('rgb');
  const fmtBox = () => q(`const s = pop.querySelector('[data-color-format]'), l = pop.querySelector('.sh-fmtlist'); if (!l) return JSON.stringify(null); const a = s.getBoundingClientRect(), b = l.getBoundingClientRect(); return JSON.stringify({ off: [b.left - a.left, b.top - a.bottom, b.width, b.height], rows: [...l.children].map((x) => x.textContent), cur: l.querySelector('.is-cur').textContent });`);
  q(`pop.querySelector('[data-color-format]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); await sleep(120); return 'true';`);
  const fb = fmtBox();
  add('Format menu: three rows, 6 under it, RGB marked', fb && near(fb.off, [-3, 6, 79, 132], 1) && fb.rows.join() === 'Hex,RGB,HSL' && fb.cur === 'RGB', JSON.stringify(fb));
  q(`pop.querySelector('[data-fmt-opt="hsl"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); await sleep(250); return 'true';`);
  add('Format menu: a row sets the format and closes', q(`return JSON.stringify(!pop.querySelector('.sh-fmtlist') && !!pop.querySelector('[data-color-field="Hue"]'));`));
  fmt('rgb');
  q(`pop.querySelector('[data-color-reset]').click(); await sleep(200); return 'true';`);
  if (!popHidden()) act('color');
}
writeFileSync(new URL('../parity/shape-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nShape: ${pass}/${total}`);
if (process.env.SHOT) screenshot(S, process.env.SHOT);
process.exit(pass === total ? 0 : 1);
