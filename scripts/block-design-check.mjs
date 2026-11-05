// T15: a new Text through the real menu, then Stroke, Background, Padding, Corner, Blur and More
// actions in the oracle's order, against parity/findings/BLOCKDESIGN.json.
// Writes parity/block-design-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run block-design-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, browser, cdp } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/BLOCKDESIGN.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(46)} ${ok ? 'match' : `DIFF ${detail ?? ''}`}`); };
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Text"]').click(); await sleep(400); return JSON.stringify(fe.model.sections[1].blocks.at(-1)?.id ?? null); })()`);
const q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'); const pop = document.getElementById('shape-pop'); const fr = document.getElementById('site-frame'); const block = () => fr.contentDocument.querySelector('.fe-block-${id}'); const model = () => fe.model.sections[1].blocks.find((b) => b.id === '${id}'); ${body} })()`);
const openDesign = () => q(`if (document.activeElement?.closest?.('#site-frame')) document.activeElement.blur(); fe.select('${sid}', '${id}'); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
const read = () => q(`const f = block(), W = fr.contentWindow, sq = f.querySelector('.sqs-block'), c = W.getComputedStyle(sq), h = W.getComputedStyle(f.querySelector('.sqs-html-content')), fe2 = W.getComputedStyle(f), a = model().layout.desktop.area; return JSON.stringify({ h: f.getBoundingClientRect().height, area: a.join('/'), border: c.borderTopStyle === 'none' ? 'none' : c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, bg: c.backgroundColor, radius: c.borderTopLeftRadius, radiusTR: c.borderTopRightRadius, pad: parseFloat(h.paddingTop), padL: parseFloat(h.paddingLeft), cls: sq.className, op: fe2.opacity, blurB: fe2.backdropFilter, blurF: fe2.filter });`);
const click = (sel, wait = 260) => q(`const e = (${sel}); if (!e) throw new Error('no element: ' + ${JSON.stringify(sel)}); e.click(); await sleep(${wait}); return 'true';`);
const dset = (k, v) => click(`panel.querySelector('[data-dset="${k}"][data-v="${v}"]')`);
const act = (name) => click(`panel.querySelector('[data-shape-act="${name}"]')`);
const onoff = (key) => click(`panel.querySelector('input[data-design="${key}"]')`);
const type = (sel, v) => { q(`const e = ${sel}; e.value = '${v}'; e.dispatchEvent(new Event('change', { bubbles: true })); await sleep(260); return 'true';`); };
const labels = () => q(`return JSON.stringify([...panel.querySelectorAll('.sp-label, .bp-subhead, .bp-thead > span:first-child')].map((e) => e.textContent.trim()));`);
const rowsOk = (want) => { const got = labels().filter((x) => !['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'].includes(x)); return [want.join() === got.join(), got.join()]; };

openDesign();
let r = read();
add('A new Text lands at 1/2/3/10, 71 tall', r.area === F.start.area && near(r.h, F.start.h), `${r.area} ${r.h}`);
let t = rowsOk(F.rowsOff); add('Rows with nothing on', t[0], t[1]);

for (const step of F.sequence) {
  if (step.do === 'stroke solid') dset('stroke', 'solid');
  if (step.do === 'stroke color #B564F7') {
    t = rowsOk(F.rowsWithStroke); add('Rows with a stroke', t[0], t[1]);
    act('strokeColor');
    const p = q(`return JSON.stringify({ sw: [...pop.querySelectorAll('.sh-swatch input')].map((x) => x.getAttribute('aria-label')), on: pop.querySelector('input:checked')?.getAttribute('aria-label'), plus: !!pop.querySelector('[aria-label="Custom color"]'), bar: !!pop.querySelector('[aria-label="Opacity slider"]'), reset: !!pop.querySelector('[data-color-reset]') });`);
    const w = F.strokeColorPopup;
    add('Stroke Color: swatches, +, bar, Reset', p.sw.join() === w.swatches.map((h) => `Color ${h}`).join() && p.on === `Color ${w.checked}` && p.plus === w.custom && p.bar === w.opacity && p.reset === w.reset, JSON.stringify(p));
    click(`pop.querySelector('[aria-label="Color #B564F7"]')`);
    click(`panel.querySelector('[data-shape-act="strokeColor"]')`);
  }
  if (step.do === 'thickness L') dset('strokeSize', 'L');
  if (step.do === 'thickness S') dset('strokeSize', 'S');
  if (step.do === 'thickness M') dset('strokeSize', 'M');
  if (step.do === 'stroke dashed') dset('stroke', 'dashed');
  if (step.do === 'stroke none') dset('stroke', '');
  if (step.do === 'background on') onoff('background');
  if (step.do === 'padding S') { t = rowsOk(F.rowsWithBackground); add('Rows with a background', t[0], t[1]); dset('pad', 'S'); }
  if (step.do === 'padding L') dset('pad', 'L');
  if (step.do === 'background off') onoff('background');
  await pause(150);
  r = read();
  const fails = [];
  if (!near(r.h, step.h)) fails.push(`h ${r.h}`);
  if (step.border && r.border !== step.border) fails.push(r.border);
  if (step.bg && r.bg !== step.bg) fails.push(r.bg);
  if (step.pad != null && !near(r.pad, step.pad)) fails.push(`pad ${r.pad}`);
  if (step.cls && !r.cls.includes(step.cls)) fails.push(r.cls);
  add(`${step.do}: height, border, padding`, !fails.length, fails.join(' '));
}

// Background Color.
onoff('background'); act('bgColor');
const bgp = q(`return JSON.stringify({ on: pop.querySelector('input:checked')?.getAttribute('aria-label'), plus: !!pop.querySelector('[aria-label="Custom color"]'), bar: !!pop.querySelector('[aria-label="Opacity slider"]'), reset: !!pop.querySelector('[data-color-reset]') });`);
add('Background Color: white, +, bar, no Reset', bgp.on === `Color ${F.backgroundColorPopup.checked}` && bgp.plus && bgp.bar && !bgp.reset, JSON.stringify(bgp));
click(`pop.querySelector('[aria-label="Color ${F.backgroundColorPopup.picked.swatch}"]')`);
r = read();
add('A swatch fills it, Reset appears', r.bg === F.backgroundColorPopup.picked.bg && q(`return JSON.stringify(!!pop.querySelector('[data-color-reset]'));`), r.bg);
click(`pop.querySelector('[data-color-reset]')`);
add('Reset to theme gives white', read().bg === F.backgroundColorPopup.resetGoesTo, read().bg);
act('bgColor');

// Corner, on a background.
const CORNER = `panel.querySelector('input[data-stack-field="corner"]')`;
type(CORNER, F.corner.typed);
r = read();
add('Corner 12 rounds the block', r.radius === F.corner.radius, r.radius);
click(`panel.querySelector('[data-stack="corners:1"]')`);
add('Individual shows four fields', q(`return JSON.stringify([...panel.querySelectorAll('.st-corners input')].map((x) => x.getAttribute('aria-label')));`).join() === F.corner.fields.join());
F.corner.individual.typed.forEach((v, n) => type(`panel.querySelector('input[data-stack-field="c${n}"]')`, v));
r = read();
add('Corners differ, Uniform reads Mixed', r.radius === '8px' && r.radiusTR === '14px' && q(`return JSON.stringify(${CORNER}.value);`) === F.corner.individual.uniformField, `${r.radius} ${r.radiusTR}`);
click(`panel.querySelector('[data-stack="corners:0"]')`);
r = read();
add('Back to Uniform: the top left\'s', r.radius === '8px' && r.radiusTR === '8px', `${r.radius} ${r.radiusTR}`);
onoff('background');

// Blur.
onoff('blur');
const blur0 = q(`return JSON.stringify({ seg: [...panel.querySelectorAll('.bp-seg2 button')].map((x) => x.textContent.trim()), on: panel.querySelector('.bp-seg2 .is-on')?.textContent.trim(), note: panel.querySelector('.bp-blur-note')?.textContent, range: (() => { const e = panel.querySelector('input[type="range"][data-design="blurPx"]'); return e && [e.min, e.max, e.step, e.value].map(Number); })(), text: panel.querySelector('input[type="text"][data-design="blurPx"]')?.value });`);
const b = F.blur;
add('Blur: Element or Backdrop, note, 0 to 100', blur0.seg.join() === b.options.join() && blur0.on === b.default && blur0.note === b.note && blur0.range.join() === [b.amount.min, b.amount.max, b.amount.step, b.amount.start].join() && blur0.text === '15px', JSON.stringify(blur0));
add('It starts as a backdrop at 15px', read().blurB === 'blur(15px)', read().blurB);
type(`panel.querySelector('input[type="text"][data-design="blurPx"]')`, b.typed);
r = read();
add('Amount 40: backdrop', r.blurB === b.backdrop.backdropFilter && r.blurF === b.backdrop.filter, `${r.blurB} ${r.blurF}`);
dset('blurKind', 'element');
r = read();
add('Element: filter, no note', r.blurB === b.element.backdropFilter && r.blurF === b.element.filter && !q(`return JSON.stringify(!!panel.querySelector('.bp-blur-note'));`), `${r.blurB} ${r.blurF}`);
onoff('blur');
r = read();
add('Blur off clears both', r.blurB === 'none' && r.blurF === 'none', `${r.blurB} ${r.blurF}`);

// Custom Thickness and Padding, on a stroke.
// The oracle read these on a fresh block, so start from one.
q(`const n = JSON.parse(JSON.stringify(fe.model)); const x = n.sections[1].blocks.find((o) => o.id === '${id}'); delete x.design; delete x.designMobile; x.layout.desktop.area = [1, 2, 3, 10]; fe.load(n); await sleep(350); return 'true';`);
openDesign();
dset('stroke', 'solid');
dset('strokeSize', 'custom');
const th = q(`const e = panel.querySelector('.sh-range input[type="range"]'); return JSON.stringify({ r: [e.min, e.max, e.step].map(Number), w: e.getBoundingClientRect().width, t: panel.querySelector('.sh-range input[type="text"]').value });`);
const c = F.thicknessCustom;
add('Three dots: a range from 0 to 50, 212 wide', th.r.join() === [c.range.min, c.range.max, c.range.step].join() && th.w === c.range.width && th.t === c.startsAt, JSON.stringify(th));
type(`panel.querySelector('.sh-range input[type="text"]')`, c.typed);
r = read();
add('Thickness 30: border, height, padding', r.border.startsWith(c.border) && near(r.h, c.h) && near(r.pad, c.pad), JSON.stringify(r));
dset('pad', 'L'); dset('pad', 'custom');
const pc = F.paddingCustom;
const ranges = q(`return JSON.stringify([...panel.querySelectorAll('.bp-range')].map((e) => { const x = e.querySelector('input[type="range"]'); return { l: e.querySelector('.sp-label').textContent, r: [x.min, x.max, x.step, x.value].map(Number), w: x.getBoundingClientRect().width, t: e.querySelector('input[type="text"]').value }; }));`);
add('Custom Padding: two ranges from 0 to 20', ranges.map((x) => x.l).join() === pc.labels.join() && ranges.every((x) => x.r.join() === `${pc.range.min},${pc.range.max},${pc.range.step},12` && x.t === '12%'), JSON.stringify(ranges));
type(`panel.querySelector('input[type="text"][data-design="padY"]')`, pc.typed['Top & Bottom']);
type(`panel.querySelector('input[type="text"][data-design="padX"]')`, pc.typed['Left & Right']);
r = read();
add('Typed 5 and 15: top and left padding', near(r.pad, pc.withStroke30.padTop) && near(r.padL, pc.withStroke30.padLeft), `${r.pad} ${r.padL}`);
dset('stroke', '');

// A block pulled tall keeps what the fit did not take.
q(`const n = JSON.parse(JSON.stringify(fe.model)); const x = n.sections[1].blocks.find((o) => o.id === '${id}'); delete x.design; delete x.designMobile; x.layout.desktop.area = [1, 2, 9, 10]; fe.load(n); await sleep(350); return 'true';`);
openDesign();
const want = F.rowsRule.steps.slice(1);
const doRule = [() => onoff('background'), () => dset('pad', 'S'), () => dset('pad', 'L'), () => onoff('background')];
want.forEach(([name, area], n) => { doRule[n](); const got = read().area; add(`Pulled tall, ${name}: ${area}`, got === area, got); });

// More actions.
q(`const f = panel.querySelector('input[data-design="opacity"]'); f.value = 50; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
add('Opacity 50 lands', read().op === '0.5', read().op);
act('more');
const more = q(`const b = panel.querySelector('.bp-more').getBoundingClientRect(), o = [...pop.querySelectorAll('[role=option]')], p = pop.getBoundingClientRect(); return JSON.stringify({ names: o.map((x) => x.textContent), dx: p.left - b.left, dy: p.top - b.top, w: p.width, h: o[0].getBoundingClientRect().height });`);
const m = F.moreActions;
add('More actions: Copy and Paste, placed', more.names.join() === m.options.join() && more.dx === m.menu.offsetFromButton[0] && more.dy === m.menu.offsetFromButton[1] && more.w === m.menu.width && more.h === m.menu.rowHeight, JSON.stringify(more));
click(`pop.querySelector('[data-more="copy"]')`);
add('A pick closes it', q(`return JSON.stringify(pop.hidden);`));
q(`const f = panel.querySelector('input[data-design="opacity"]'); f.value = 100; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
act('more');
click(`pop.querySelector('[data-more="paste"]')`);
add('Paste brings 50 back, one undo step', read().op === '0.5' && q(`fe.undo(); await sleep(300); return JSON.stringify(getComputedStyle(block()).opacity === '1');`), read().op);

writeFileSync(new URL('../parity/block-design-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nBlock design: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
