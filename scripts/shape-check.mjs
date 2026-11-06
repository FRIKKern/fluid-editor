// T6: a new Shape through the real menu, then Shape style, corners, Stretch off, Color and Stroke
// against parity/findings/SHAPESTYLES.json and CAP-SHAPEWIDE.json. The curves are ours, so a shape's
// box, name and proportions are compared, not its drawing.
// Writes parity/shape-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run shape-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, screenshot } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

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
add('Its corner loses half the stroke', ink.rx === '7px', ink.rx);
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
writeFileSync(new URL('../parity/shape-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nShape: ${pass}/${total}`);
if (process.env.SHOT) screenshot(S, process.env.SHOT);
process.exit(pass === total ? 0 : 1);
