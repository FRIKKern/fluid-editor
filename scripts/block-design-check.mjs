// T15: a new Text through the real menu, then Stroke, Background, Padding, Corner, Blur and More
// actions in the oracle's order, against parity/findings/BLOCKDESIGN.json.
// Writes parity/block-design-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run block-design-check.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
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
dset('blurKind', '');
r = read();
add('Back to Backdrop keeps the amount', r.blurB === b.backdrop.backdropFilter && r.blurF === b.backdrop.filter, `${r.blurB} ${r.blurF}`);
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

// Reset to default value shows while its field has focus, and a hover shows nothing (CAP-L6RESET.json), with real keys and a real mouse.
const RS = JSON.parse(readFileSync(new URL('../parity/findings/CAP-L6RESET.json', import.meta.url))).reads;
await openDesign();
const rstOf = (key) => q(`const f = panel.querySelector('input[data-design="${key}"]'); f.scrollIntoView({ block: 'center' }); const box = f.closest('.sc-box'), e = box.querySelector('.sc-reset'), r = e.getBoundingClientRect(), c = getComputedStyle(e), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), b = box.getBoundingClientRect(); return JSON.stringify({ on: c.opacity === '1' && c.pointerEvents !== 'none', pointer: c.pointerEvents, onTop: !!hit?.closest('.sc-reset'), v: String(parseFloat(f.value.replace(/,/g, ''))), focus: document.activeElement === f, at: [r.left + r.width / 2, r.top + r.height / 2], box: [b.left + b.width / 2, b.top + b.height / 2] });`);
const typeRst = (key, text) => { browser(S, 'fill', `#block-panel input[data-design="${key}"]`, text); browser(S, 'press', 'Enter'); };
const realPress = async (at) => { mouse(S, 'move', at[0], at[1]); await pause(60); mouse(S, 'down', at[0], at[1], { buttons: 1 }); await pause(40); mouse(S, 'up', at[0], at[1]); await pause(280); };
let rs = rstOf('rotate');
add('Reset at the default: not shown, no pointer', !rs.on && rs.pointer === RS['at default'].reset.pointer && !rs.onTop, JSON.stringify(rs));
typeRst('rotate', '30'); await pause(300); rs = rstOf('rotate');
add('Reset with the field focused: on top', rs.on && rs.pointer === RS['desktop 30, focused'].reset.pointer && rs.onTop === RS['desktop 30, focused'].reset.onTop && rs.focus, JSON.stringify(rs));
await realPress(rs.at); rs = rstOf('rotate');
add('Reset pressed: back to 0', rs.v === '0' && !rs.on && q(`return JSON.stringify(getComputedStyle(block()).transform === 'none');`), JSON.stringify(rs));
typeRst('sx', '150'); await pause(300);
typeRst('sy', '80'); await pause(300); rs = rstOf('sy');
await realPress(rs.at);
const scaleRead = RS['desktop scale Y reset'].rows.Scale;
add('Scale Y Reset: Y goes back, X stays', `${rstOf('sx').v}%` === scaleRead[0] && `${rstOf('sy').v}%` === scaleRead[1], `${rstOf('sx').v} ${rstOf('sy').v}`);
typeRst('rotate', '30'); await pause(300);
browser(S, 'press', 'Tab'); await pause(300);
q(`document.activeElement?.blur?.(); return 'true';`);
rs = rstOf('rotate');
mouse(S, 'move', rs.box[0], rs.box[1]); await pause(150);
const hov = rstOf('rotate');
add('Field blurred, hovered: nothing to press', !hov.on && hov.pointer === RS['blurred, hovered'].reset.pointer && hov.onTop === RS['blurred, hovered'].reset.onTop, JSON.stringify(hov));
mouse(S, 'move', hov.at[0], hov.at[1]); await pause(100);
const onIt = rstOf('rotate');
add('Blurred, hovered on the spot: nothing to press', !onIt.on && !onIt.onTop, JSON.stringify(onIt));
await realPress(onIt.at);
add('Blurred, a press there leaves 30', rstOf('rotate').v === '30', rstOf('rotate').v);

// A transform field's parts, against what the oracle's field measured (CAP-T6FIELDS.json).
const TF = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6FIELDS.json', import.meta.url)));
await openDesign();
const dIn = (k) => `panel.querySelector('input[data-design="${k}"]')`;
const part = (k) => q(`const i = ${dIn(k)}, b = i.closest('.sc-box'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), c = getComputedStyle(b), rs = b.querySelector('.sc-reset'), rr = rs.getBoundingClientRect(), rc = getComputedStyle(rs), ar = b.querySelector('.sc-arrows'), bar = b.querySelector('.sc-bar'), bi = bar.querySelector('i'); return JSON.stringify({ text: i.value, type: i.type, box: [r.width, r.height], radius: c.borderRadius, bg: c.backgroundColor, outline: c.outlineStyle + ' ' + c.outlineWidth + ' ' + c.outlineColor, pad: getComputedStyle(i).paddingLeft, arrows: ar ? [getComputedStyle(ar).opacity, ar.getBoundingClientRect().left - r.left, ar.getBoundingClientRect().top - r.top, getComputedStyle(ar).color] : null, letter: b.querySelector('.an-axis')?.textContent ?? null, letterColor: b.querySelector('.an-axis') ? getComputedStyle(b.querySelector('.an-axis')).color : null, reset: [rr.left - r.left, rr.top - r.top, rr.width, rr.height, rc.backgroundColor, rc.borderRadius, rc.color], glyph: [rs.querySelector('svg').getBoundingClientRect().left - rr.left, rs.querySelector('svg').getBoundingClientRect().width], bar: Math.round((bi.getBoundingClientRect().left - r.left) * 10) / 10, barOn: getComputedStyle(bar).opacity, barColor: getComputedStyle(bi).backgroundColor, focus: document.activeElement === i, caret: [i.selectionStart, i.selectionEnd], at: [r.left, r.top] });`);
q(`document.activeElement?.blur?.(); return 'true';`);
const texts = () => q(`return JSON.stringify(['opacity', 'rotate', 'sx', 'tx', 'kx'].map((k) => panel.querySelector('input[data-design="' + k + '"]').value));`);
const fresh2 = async () => { for (const k of ['rotate', 'sx', 'sy', 'tx', 'ty', 'kx', 'ky', 'opacity']) { q(`const i = ${dIn(k)}; i.value = ${k === 'sx' || k === 'sy' || k === 'opacity' ? 100 : 0}; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(120); return 'true';`); } q(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 5, 500); await pause(100); };
await fresh2();
const tv = TF.values;
const sameT = (what, a, b) => add(what, JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} against ${JSON.stringify(b)}`);
sameT('Fields: one text with its unit, as read', texts(), [tv.Opacity, tv.Rotate, tv.Scale, tv.Offset, tv.Skew]);
let pa = part('rotate'), pb = part('sx');
add('Field: text, not a number box', pa.type === 'text');
sameT('Field: box, single and pair', [pa.box, pb.box], [TF.field.single, TF.field.pair]);
sameT('Field: fill, radius, text inset', [pa.bg, pa.radius, pa.pad], [TF.field.background, `${TF.field.radius}px`, `${TF.field.input.left}px`]);
sameT('Field: Reset is a black chip, as read', pa.reset, [175, 14, 16, 16, TF.reset.background, `${TF.reset.radius}px`, 'rgb(255, 255, 255)']);
sameT('Field: its cross, 22 wide, 3 out', pa.glyph, [-3, 22]);
sameT('Single: <> hidden at rest, on the place read', pa.arrows, ['0', 149, 8, TF.arrows.color]);
add('Pair: a letter and no <>', pb.arrows === null && pb.letter === 'X' && pb.letterColor === TF.letter.color, JSON.stringify([pb.arrows, pb.letter, pb.letterColor]));
mouse(S, 'move', pa.at[0] + 20, pa.at[1] + 22); await pause(120);
add('Hover: <> on, no ring', part('rotate').arrows[0] === '1' && part('rotate').outline.startsWith('none'), JSON.stringify(part('rotate')));
await realPress([pa.at[0] + 20, pa.at[1] + 22]); mouse(S, 'move', 5, 500); await pause(120);
pa = part('rotate');
add('Focus, mouse away: <> stays, fill stays', pa.focus && pa.arrows[0] === '1' && pa.bg === TF.field.background, JSON.stringify(pa));
add('Focus: a 2px ring outside', pa.outline === 'solid 2px rgb(14, 14, 14)', pa.outline);
add('Focus at the default: no Reset to press', rstOf('rotate').on === false, JSON.stringify(rstOf('rotate')));
typeRst('rotate', '30'); await pause(250);
pa = part('rotate');
add('Typed: keeps focus, caret at the end', pa.text === '30°' && pa.focus && pa.caret.join() === '3,3', JSON.stringify([pa.text, pa.focus, pa.caret]));
for (const [k, L, want, typed] of [['sx', 'Scale0', '500%', '500'], ['sy', 'Scale1', '50%', '50'], ['tx', 'Offset0', '2,000px', '2000'], ['ty', 'Offset1', '-2,000px', '-2000'], ['kx', 'Skew0', '70°', '70'], ['ky', 'Skew1', '-70°', '-70']]) {
  typeRst(k, typed); await pause(220);
  const fp = part(k);
  add(`${L} ${typed}: shows and its bar, as read`, fp.text === want && fp.text === TF.bar.readsPast[L].shows && Math.abs(fp.bar - TF.bar.readsPast[L].barLeft) < 0.15, JSON.stringify([fp.text, fp.bar, TF.bar.readsPast[L]]));
}
typeRst('tx', '2,500'); await pause(220);
add('A value with a comma reads as the number', part('tx').text === '2,500px', part('tx').text);
await fresh2();
// A real drag: the ring and bar in it, the focus on the input after it.
for (const [k, L] of [['rotate', 'Rotate0'], ['sx', 'Scale0'], ['tx', 'Offset0'], ['kx', 'Skew0'], ['opacity', 'Opacity0']]) {
  const at = part(k), R = TF.drag.fields[L], x = at.at[0] + at.box[0] / 2, y = at.at[1] + 4;
  mouse(S, 'move', x, y); await pause(70); mouse(S, 'down', x, y, { buttons: 1 }); await pause(50); mouse(S, 'move', x + 10, y, { buttons: 1 }); await pause(90); mouse(S, 'move', x + 20, y, { buttons: 1 }); await pause(170);
  const dr = part(k);
  add(`${L} in a drag: value, bar, ring, as read`, dr.text === R.after20px && Math.abs(dr.bar - R.barLeft) < 0.15 && dr.barOn === '1' && dr.outline.startsWith('solid 2px') && dr.barColor === TF.bar.color, JSON.stringify([dr.text, dr.bar, dr.barOn, dr.outline, R]));
  mouse(S, 'up', x + 20, y); await pause(260);
  const af = part(k);
  add(`${L} let go: bar gone, focus on the input, caret at the end`, af.text === R.after20px && af.barOn === '0' && af.focus && af.caret.join() === `${R.after20px.length},${R.after20px.length}`, JSON.stringify([af.text, af.barOn, af.focus, af.caret]));
}
await fresh2();

// The panel's tabs, a Back row and Animation's foot stay put, so a row moved into view must not land under them:
// by Tab, and by a scroll to it (FORMFIELDS.json panelTabs: the oracle's scroller starts below them).
const STAYS = '.sp-tabs, .bp-sub, .bp-ishape-head, .an-foot';
const covered = `const stays = [...panel.querySelectorAll(${JSON.stringify(STAYS)})]; const coverOf = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const o = stays.find((t) => { if (t.contains(e)) return false; const q = t.getBoundingClientRect(); return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1 && r.left < q.right && r.right > q.left; }); return o ? (e.getAttribute('aria-label') || e.dataset.design || e.dataset.afield || e.textContent.trim().slice(0, 20) || e.tagName) + ' under ' + o.className : null; };`;
const FOCUSABLE = `[...panel.querySelectorAll('button, input:not([type=hidden]), select, textarea, [tabindex="0"]')].filter((e) => e.getBoundingClientRect().width > 0 && !e.disabled)`;
async function neverUnder(name, overflow = true) {
  const scrolls = q(`return JSON.stringify(panel.scrollHeight - panel.clientHeight);`);
  if (overflow) add(`${name}: the panel scrolls`, scrolls > 0, scrolls);
  const bad = q(`${covered} const out = []; for (const e of ${FOCUSABLE}) { if (e.closest(${JSON.stringify(STAYS)})) continue; panel.scrollTop = panel.scrollHeight; e.scrollIntoView({ block: 'nearest' }); await sleep(10); const a = coverOf(e); if (a) out.push(a); panel.scrollTop = 0; e.scrollIntoView({ block: 'nearest' }); await sleep(10); const b = coverOf(e); if (b) out.push(b); } panel.scrollTop = 0; return JSON.stringify(out);`);
  add(`${name}: a scroll to a row`, !bad.length, bad.slice(0, 3).join(' ; '));
  // Keyboard Tab through the rows, from the top.
  q(`panel.scrollTop = 0; const f = ${FOCUSABLE}[0]; f.focus(); await sleep(30); return 'true';`);
  const under = []; let steps = 0;
  for (; steps < 80; steps++) {
    browser(S, 'press', 'Tab'); await pause(35);
    const h = q(`${covered} const e = document.activeElement; if (!panel.contains(e)) return JSON.stringify({ out: true }); await sleep(0); return JSON.stringify({ c: coverOf(e) });`);
    if (h.out) break;
    if (h.c) under.push(h.c);
  }
  add(`${name}: Tab, ${steps} stops`, !under.length && steps > 2, under.slice(0, 3).join(' ; '));
  // And back up with Shift+Tab, from the bottom: that is where a row can meet the tabs.
  q(`const all = ${FOCUSABLE}; all.at(-1).focus(); await sleep(30); return 'true';`);
  const back = []; let up = 0;
  for (; up < 80; up++) {
    browser(S, 'press', 'Shift+Tab'); await pause(35);
    const h = q(`${covered} const e = document.activeElement; if (!panel.contains(e)) return JSON.stringify({ out: true }); return JSON.stringify({ c: coverOf(e) });`);
    if (h.out) break;
    if (h.c) back.push(h.c);
  }
  add(`${name}: Shift+Tab, ${up} stops`, !back.length && up > 2, back.slice(0, 3).join(' ; '));
  q(`document.activeElement?.blur?.(); panel.scrollTop = 0; return 'true';`);
}
const addOpen = (name) => q(`const s = fe.model.sections[1]; fe.addBlock(s.id, ${JSON.stringify(name)}); await sleep(300); const b = s.blocks.at(-1); fe.select(s.id, b.id); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(350); return JSON.stringify(b.id);`);
openDesign(); await pause(200);
await neverUnder('Text Design, tabs alone');
addOpen('Form');
q(`const b = fe.model.sections[1].blocks.at(-1); const f = b.fields[0]; for (let k = 0; k < 10; k++) b.fields.push(JSON.parse(JSON.stringify(f))); return 'true';`);
await click(`panel.querySelector('[data-btab="Content"]')`);
await click(`panel.querySelector('[data-ff="list"]')`);
await neverUnder('Form field list, a Back row, no tabs');
addOpen('Image');
q(`fe.model.sections[1].blocks.at(-1).mode = 'shape'; const s = fe.model.sections[1]; fe.select(s.id, s.blocks[0].id); await sleep(100); fe.select(s.id, s.blocks.at(-1).id); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(200); return 'true';`);
await click(`panel.querySelector('[data-image-nav="shape"]')`);
await neverUnder('Image Shape, a Back row, no tabs');
addOpen('Shape');
await click(`panel.querySelector('[data-btab="Animation"]')`);
await click(`panel.querySelector('[data-anim="add"]')`);
await click(`panel.querySelector('[data-anim-tile="hover-1"]')`);
await click(`panel.querySelector('[data-anim="gear"]')`);
await click(`[...panel.querySelectorAll('.an-tab')].find((e) => e.textContent === 'End')`);
await neverUnder('Animation End, a foot below', false);

// Blend Mode mixes with the section under the block (parity/findings/CAP-89MULTIPLY.json): on the
// oracle a white Shape on Multiply shows the section's colour. Read by pixel from a screenshot.
const pixelAt = (file, x, y) => {
  const png = readFileSync(file); let p = 8, w = 0, bpp = 4; const idat = [];
  while (p < png.length) { const len = png.readUInt32BE(p), type = png.toString('latin1', p + 4, p + 8), d = png.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); bpp = d[9] === 6 ? 4 : 3; } if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp; let prev = Buffer.alloc(stride), row;
  for (let r = 0; r <= y; r++) {
    const f = raw[r * (stride + 1)], src = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1)); row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); row[i] = (src[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255; }
    prev = row;
  }
  return [row[x * bpp], row[x * bpp + 1], row[x * bpp + 2]];
};
// under: a second Shape in the same place over the first, as a new one lands on the oracle, carries the blend (CAP-T15BLEND2.json).
const blendShot = async (blend, under = false) => {
  const at = q(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.blocks = []; fe.load(next); await sleep(250); fe.addBlock(s.id, 'Shape'); await sleep(300); const m = JSON.parse(JSON.stringify(fe.model)); if (${under}) { const t = JSON.parse(JSON.stringify(m.sections[1].blocks[0])); t.id = t.id + 'top'; m.sections[1].blocks.push(t); } const b = m.sections[1].blocks.at(-1); b.design = { ...(b.design || {}), blend: '${blend}' }; fe.load(m); await sleep(300); fe.select(null); await sleep(100); const d = fr.contentDocument; d.querySelectorAll('.page-section')[1].scrollIntoView(); await sleep(300); const r = d.querySelector('.fe-block[data-block-id="' + b.id + '"]').getBoundingClientRect(), o = fr.getBoundingClientRect(); return JSON.stringify([Math.round(o.left + r.left + r.width / 2), Math.round(o.top + r.top + r.height / 2), Math.round(o.left + r.right + 40)]);`);
  const file = `/tmp/block-design-blend-${process.pid}.png`; browser(S, 'screenshot', '--out', file);
  const got = { shape: pixelAt(file, at[0], at[1]), section: pixelAt(file, at[2], at[1]) }; rmSync(file, { force: true }); return got;
};
const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 2);
let px = await blendShot('normal');
add('Blend Normal: a white Shape stays white', same(px.shape, [255, 255, 255]) && !same(px.section, [255, 255, 255]), JSON.stringify(px));
px = await blendShot('multiply');
add('Blend Multiply: the Shape shows the section', same(px.shape, px.section) && !same(px.section, [255, 255, 255]), JSON.stringify(px));
// Every mode by pixel against the oracle's read, a white Shape over the probe section (CAP-T15BLEND.json), and one
// over another Shape (CAP-T15BLEND2.json). Ours draws its section in the same colour, so the pixels compare as read.
const BLENDS = { Screen: 'screen', Overlay: 'overlay', Darken: 'darken', Lighten: 'lighten', 'Color Dodge': 'color-dodge', 'Color Burn': 'color-burn', 'Hard Light': 'hard-light', 'Soft Light': 'soft-light', Difference: 'difference', Exclusion: 'exclusion', Hue: 'hue', Saturation: 'saturation', Color: 'color', Luminosity: 'luminosity' };
const blendRead = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T15BLEND.json', import.meta.url))).pixels;
for (const [name, css] of Object.entries(BLENDS)) {
  px = await blendShot(css);
  add(`Blend ${name}: the Shape's pixel as read`, same(px.shape, blendRead[name].shape) && same(px.section, blendRead[name].section), JSON.stringify({ ours: px, oracle: blendRead[name] }));
}
px = await blendShot('difference', true);
add('Blend Difference over another white Shape: black, it blends with the block under it', same(px.shape, [0, 0, 0]) && same(px.section, [181, 100, 247]), JSON.stringify(px));
// A Shape's Blur (CAP-T15BLUR.json): the amount alone, drawn as filter: blur on the contents, not on the block.
const shapeBlur = (px) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'), fr = document.getElementById('site-frame');
  if (${px === null}) { const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.blocks = []; fe.load(next); await sleep(250); fe.addBlock(s.id, 'Shape'); await sleep(300); const k = fe.model.sections[1].blocks.at(-1);
    fe.select(fe.model.sections[1].id, k.id); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); panel.querySelector('input[data-design="blur"]').click(); await sleep(260); }
  else { const e = panel.querySelector('input[type="text"][data-design="blurPx"]'); e.value = '${px}'; e.dispatchEvent(new Event('change', { bubbles: true })); await sleep(260); }
  const k = fe.model.sections[1].blocks.at(-1), f = fr.contentDocument.querySelector('.fe-block-' + k.id), W = fr.contentWindow, c = W.getComputedStyle(f), sq = W.getComputedStyle(f.querySelector('.sqs-block'));
  return JSON.stringify({ kinds: panel.querySelectorAll('[data-dset="blurKind"]').length, note: !!panel.querySelector('.bp-blur-note'), text: panel.querySelector('input[type="text"][data-design="blurPx"]')?.value, block: [c.filter, c.backdropFilter], contents: [sq.filter, sq.backdropFilter] }); })()`);
let sb = shapeBlur(null);
add('Shape Blur: the amount alone, 15px', sb.kinds === 0 && !sb.note && sb.text === '15px', JSON.stringify(sb));
add('Shape Blur 15: filter on its contents', sb.contents.join() === 'blur(15px),none' && sb.block.join() === 'none,none', JSON.stringify(sb));
sb = shapeBlur(40);
add('Shape Blur 40: filter on its contents', sb.contents.join() === 'blur(40px),none' && sb.block.join() === 'none,none', JSON.stringify(sb));
// Where the editor keeps them (CAP-T15WHERE-A.json, -B, -C): Blur and Background color in style attributes for the view
// shown, a Text's blur on the block, a Shape's on its contents; the transform-vars rule holds desktop's variables alone.
const WH = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T15WHERE-A.json', import.meta.url))).reads;
const WC = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T15WHERE-C.json', import.meta.url))).reads;
const drawn = (r, prop, part) => r.where.drawn.find((x) => x.prop === prop && (part === 'block' ? x.part === 'block' : x.part !== 'block' && !/outline|resizing|label-tag/.test(x.part)));
const where = (k, set) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const fr = document.getElementById('site-frame');
  if (${JSON.stringify(set)}) { const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.blocks = [{ id: 'wh1', type: ${JSON.stringify(k)}, ...(${JSON.stringify(k)} === 'text' ? { html: '<p>Where</p>' } : { shape: 'rectangle' }), layout: { desktop: { area: [1, 2, 6, 10] }, mobile: { area: [1, 1, 6, 8] } }, ...${JSON.stringify(set)} }]; fe.load(next); await sleep(300); }
  const f = fr.contentDocument.querySelector('.fe-block-wh1'), sq = f.querySelector('.sqs-block'), W = fr.contentWindow, c = W.getComputedStyle(f), cq = W.getComputedStyle(sq), rule = f.querySelector('style.transform-vars').textContent;
  return JSON.stringify({ block: f.getAttribute('style') || '', inner: sq.getAttribute('style') || '', filter: c.filter, opacity: c.opacity, innerFilter: cq.filter, bg: cq.backgroundColor, ruleClean: !/blur|background|@media/.test(rule), ruleOpacity: (rule.match(/--opacity: ([^;]+)/) || [])[1], bw: cq.borderTopWidth, br: cq.borderTopLeftRadius, blend: f.querySelector('style.fe-blend')?.textContent || '' }); })()`);
let wh = where('text', { design: { background: true, bgColor: 'rgb(255, 207, 90)', blur: true, blurKind: 'element', blurPx: 40 } });
add('Text Blur: in the block\'s style attribute, not the rule', wh.block.includes('filter: blur(40px)') && wh.filter === drawn(WH['text element 40'], 'filter', 'block').value && wh.ruleClean, JSON.stringify(wh));
add('Text Background color: in its box\'s style attribute', wh.inner.includes('background-color') && wh.bg === drawn(WH['text background FFCF5A'], 'background-color').value && wh.ruleClean, JSON.stringify(wh));
wh = where('shape', { design: { blur: true, blurPx: 15, opacity: 50 }, designMobile: { blurPx: 70, opacity: 30 } });
const wC = (n) => ({ blur: drawn(WC[n], 'filter').value, opacity: drawn(WC[n], 'opacity', 'block').value, rule: WC[n].rule.decls[0]['--opacity'] });
let wantW = wC('desktop after phone');
add('Shape on desktop: blur on the contents\' attribute, rule at desktop\'s values', wh.inner.includes('filter: blur(15px)') && wh.innerFilter === wantW.blur && wh.opacity === wantW.opacity && wh.ruleOpacity === wantW.rule && wh.ruleClean, JSON.stringify({ wh, wantW }));
evalJs(S, `(async () => { fe.setBp('mobile'); await new Promise((res) => setTimeout(res, 600)); return 'true'; })()`);
wh = where('shape', null); wantW = wC('phone blur 70 opacity 30');
add('Shape on the phone: the attributes hold the phone\'s values', wh.innerFilter === wantW.blur && wh.opacity === wantW.opacity && wh.ruleOpacity === wantW.rule && wh.ruleClean && /--opacity: 30%/.test(wh.block), JSON.stringify({ wh, wantW }));
evalJs(S, `(async () => { fe.setBp('desktop'); await new Promise((res) => setTimeout(res, 600)); return 'true'; })()`);
wh = where('shape', null);
add('Back on desktop: desktop\'s values again', wh.innerFilter === 'blur(15px)' && wh.opacity === '0.5' && wh.block.includes('--opacity: 50%'), JSON.stringify(wh));
wh = where('text', { design: { background: true, stroke: 'solid', corner: 12 } });
add('Text Stroke and Corner: in its box\'s style attribute', wh.inner.includes('border: 2px solid') && wh.inner.includes('border-radius: 12px') && wh.bw === drawn(WH['text corner 12'], 'border-top-width').value && wh.br === drawn(WH['text corner 12'], 'border-top-left-radius').value && !/border:|sqs-block \{ border-radius/.test(wh.blend) && !wh.block.includes('--opacity'), JSON.stringify(wh));
wh = where('text', { design: { background: true, stroke: 'solid', corner: 12, opacity: 50 } });
add('Text after Opacity: the block\'s attribute holds every variable', /^--block-transform: none; --opacity: 50%; --translate-x: 0px;.*--origin-y: 50%$/.test(wh.block) && wh.opacity === drawn(WH['text opacity 50'], 'opacity', 'block').value, JSON.stringify(wh));
writeFileSync(new URL('../parity/block-design-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nBlock design: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
