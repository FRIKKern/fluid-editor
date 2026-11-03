// P3, P5, S2: apply each measured Edit Section option to section 2 of our demo page and
// compare with the oracle readings in parity/findings (SETTINGS, VALIGN-TOP, FILL-SCREEN) at
// the same frame sizes: section height, wrapper padding, grid height, gaps and theme colors.
// Writes parity/section-check.json. Usage: npm run section-check (dev server on 5178).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
const FIND = (n) => JSON.parse(readFileSync(new URL('../parity/findings/' + n + '.json', import.meta.url)));

const design = FIND('SETTINGS').results;
const S = process.env.FLUID_SURFACE || 'surface:59'; ensureVisible(S);
// [name, class changes, style, oracle reads [{w,h,height,padTop,padBottom,gridHeight}]]
const px = (v) => parseFloat(v);
const one = (r, w, h) => ({ w, h, height: r.height, padTop: px(r.wrapPadding.split(' ')[0]), padBottom: px(r.wrapPadding.split(' ')[2] ?? r.wrapPadding.split(' ')[0]), gridHeight: r.gridHeight });
const cases = [
  ['S', { height: 'small' }, null, [one(design.S, 1600, 945)]],
  ['L', { height: 'large' }, null, [one(design.L, 1600, 945)]],
  ['Custom 1', { height: 'custom' }, '--custom-height: 1;', [one(design['Custom height'], 1600, 945)]],
  ['Bottom', { valign: 'bottom' }, null, [one(design['Vertical bottom'], 1600, 945)]],
  ['Top', { valign: 'top' }, null, FIND('VALIGN-TOP').reads.map((r) => ({ w: r.w, h: r.h, height: r.height, padTop: px(r.padTop), padBottom: px(r.padBottom), gridHeight: r.gridHeight }))],
  ['Zero gap', { gap: 0 }, null, [one(design['Zero gap'], 1600, 945)]],
  ['Fit content', { height: 'custom' }, '--custom-height: 0;', FIND('FILL-SCREEN').reads.map((r) => ({ w: r.w, h: r.h, height: r.height, padTop: px(r.padTop), padBottom: px(r.padBottom), gridHeight: r.gridHeight }))],
];
let bad = 0, n = 0;
for (const [name, ch, style, reads] of cases) for (const o of reads) {
  viewport(S, o.w, o.h); goto(S, 'http://127.0.0.1:5178/page.html'); await pause(2200);
  const r = evalJs(S, `(() => { const sec = document.querySelectorAll('.page-section')[2]; const ch = ${JSON.stringify(ch)};
    if (ch.height) sec.className = sec.className.replace(/section-height--\\w+/, 'section-height--' + ch.height);
    if (ch.valign) sec.className = sec.className.replace(/vertical-alignment--\\w+/, 'vertical-alignment--' + ch.valign);
    ${style ? `sec.setAttribute('style', ${JSON.stringify(style)});` : ''}
    if (ch.gap === 0) { const css = sec.querySelector('style[data-fe-css]'); css.textContent = css.textContent.replaceAll('11.0px', '0.0px'); } // section 2 has the 11px Medium gap
    const ws = getComputedStyle(sec.querySelector('.content-wrapper'));
    return JSON.stringify({ iw: innerWidth, ih: innerHeight, height: Math.round(sec.getBoundingClientRect().height * 10) / 10, padTop: parseFloat(ws.paddingTop), padBottom: parseFloat(ws.paddingBottom), gridHeight: Math.round(sec.querySelector('.fluid-engine').getBoundingClientRect().height * 10) / 10 }); })()`);
  const ok = ['height', 'padTop', 'padBottom', 'gridHeight'].every((k) => Math.abs(r[k] - o[k]) <= 1) && r.iw === o.w && r.ih === o.h;
  n++; if (!ok) bad++;
  console.log(name.padEnd(12), `${o.w}x${o.h}`.padEnd(10), ok ? 'match' : `DIFF oracle ${JSON.stringify(o)} ours ${JSON.stringify(r)}`);
}
// Colors tab: each theme's background, heading and paragraph color at 1600 by 945.
const themes = [];
viewport(S, 1600, 945); goto(S, 'http://127.0.0.1:5178/page.html'); await pause(2200);
for (const [label, o] of Object.entries(design).filter(([k, v]) => (k === 'base' || /^(Light|Bright|Dark)/.test(k)) && v.ink)) {
  const r = evalJs(S, `(() => { const sec = document.querySelectorAll('.page-section')[2]; sec.dataset.sectionTheme = ${JSON.stringify(o.theme)};
    return JSON.stringify({ bg: getComputedStyle(sec.querySelector('.section-background')).backgroundColor, ink: ['h1, h2, h3', 'p'].map((q) => getComputedStyle(sec.querySelector(q)).color) }); })()`);
  const ok = r.bg === o.bg && r.ink[0] === o.ink[0] && r.ink[1] === o.ink[1];
  n++; if (!ok) bad++;
  themes.push({ label, theme: o.theme, ok });
  console.log(label.padEnd(12), (o.theme || 'default').padEnd(15), ok ? 'match' : `DIFF oracle ${o.bg} ${o.ink} ours ${r.bg} ${r.ink}`);
}
console.log(`Section settings: ${n - bad} of ${n} readings match`);
writeFileSync(new URL('../parity/section-check.json', import.meta.url), JSON.stringify({ check: 'section settings', tolerance: 1, pass: n - bad, total: n, themes }, null, 2) + '\n');
process.exit(bad ? 1 : 0);
