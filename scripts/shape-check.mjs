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

writeFileSync(new URL('../parity/shape-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nShape: ${pass}/${total}`);
if (process.env.SHOT) screenshot(S, process.env.SHOT);
process.exit(pass === total ? 0 : 1);
