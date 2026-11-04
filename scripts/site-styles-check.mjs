// U12: press every style pack in our Site Styles popovers and compare what the page computes with
// what the same pack gave on the oracle (parity/findings/SITESTYLES2.json). Sections are compared by
// theme with the readings after one palette pick. Writes parity/site-styles-check.json.
// Usage: npm run site-styles-check (FLUID_SURFACE=cdp:<port> FLUID_PORT=<port>).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/SITESTYLES2.json', import.meta.url)));
let pass = 0, total = 0;
const fails = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; else { fails.push(what); console.log(`${what.padEnd(60)} DIFF ${detail}`); } };
const num = (s) => String(s).split(',').map((x) => Math.round(parseFloat(x) * 10) / 10).join();
const fam = (s) => String(s).split(',')[0].replace(/"/g, '').trim();

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(800);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

const READ = `(() => { const f = document.querySelector('iframe'); const d = f.contentDocument, W = f.contentWindow; const cs = W.getComputedStyle(d.documentElement);
  const vars = {}; for (const k of ['white', 'black', 'accent', 'lightAccent', 'darkAccent', 'safeLightAccent', 'safeDarkAccent', 'safeInverseAccent', 'safeInverseLightAccent', 'safeInverseDarkAccent']) vars[k] = cs.getPropertyValue('--' + k + '-hsl').trim();
  const pick = (q) => { const e = d.querySelector(q); if (!e) return null; const c = W.getComputedStyle(e); return { ff: c.fontFamily, fw: c.fontWeight, fs: c.fontSize, lh: c.lineHeight, ls: c.letterSpacing, tt: c.textTransform, radius: c.borderRadius, border: c.borderTopWidth, pad: c.padding, bg: c.backgroundColor, color: c.color }; };
  return JSON.stringify({ vars, h1: pick('h1'), p: pick('.sqs-html-content p'), title: pick('.header-title'), btn: pick('.sqs-block-button-element') }); })()`;
const fontValues = (x) => [fam(x.h1.ff), x.h1.fw, x.h1.fs, x.h1.lh, x.h1.ls, x.h1.tt, fam(x.p.ff), x.p.fw, x.p.fs, x.p.lh, fam(x.title.ff), x.title.fs, x.title.lh, x.title.ls, fam(x.btn.ff), x.btn.fw, x.btn.fs, x.btn.ls, x.btn.tt].join(' | ');
const buttonValues = (x) => [x.btn.radius, parseFloat(x.btn.border), x.btn.pad].join(' | ');
const varValues = (x) => Object.entries(x.vars).map(([k, v]) => `${k} ${num(v)}`).join(' / ');

const KINDS = { Colors: ['Colors', (l) => l, varValues], Fonts: ['Fonts', (l) => l, fontValues], Buttons: ['Buttons', (l) => l, buttonValues], Themes: ['Themes', (l) => l, (x) => `${varValues(x)} # ${fontValues(x)} # ${buttonValues(x)} # ${x.btn.bg} ${x.btn.color}`] };
for (const [kind, [card, , values]] of Object.entries(KINDS)) {
  goto(S, `${BASE}/index.html`); await pause(1500);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(1500);
  browser(S, 'click', '#site-styles-toggle'); await pause(300);
  browser(S, 'click', `[data-ss-pop="${card}"]`); await pause(300);
  for (const [label, want] of Object.entries(F.picked[kind])) {
    // A real click needs the tile in view: the Themes list scrolls.
    evalJs(S, `(() => { document.querySelector('#ss-popover [aria-label="${label}"]').scrollIntoView({ block: 'center' }); return 'true'; })()`);
    await pause(60);
    browser(S, 'click', `#ss-popover [aria-label="${label}"]`); await pause(250);
    const got = evalJs(S, READ);
    add(`${kind}: ${label}`, values(got) === values(want), `\n  ours   ${values(got)}\n  oracle ${values(want)}`);
  }
}

// The section themes after a palette pick, as the Colors disclosure read them.
goto(S, `${BASE}/index.html`); await pause(800);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1500);
browser(S, 'click', '#site-styles-toggle'); await pause(300);
browser(S, 'click', '[data-ss-pop="Colors"]'); await pause(300);
browser(S, 'click', '#ss-popover [aria-label="Palette with accent #209D50"]'); await pause(300);
const THEME = { 'Light 1': 'light', 'Light 2': 'light-bold', 'Bright 2': 'bright', 'Dark 2': 'dark-bold', 'Darkest 1': 'black', 'Lightest 1': 'white', 'Lightest 2': 'white-bold', 'Bright 1': 'bright-inverse', 'Dark 1': 'dark', 'Darkest 2': 'black-bold' };
for (const [name, bg, ink] of F.afterPalette.rows) {
  const theme = THEME[name.replace('Aa ', '')];
  const got = evalJs(S, `(() => { const f = document.querySelector('iframe'); const d = f.contentDocument, W = f.contentWindow; const s = d.createElement('section'); s.className = 'page-section'; s.dataset.sectionTheme = '${theme}'; s.style.cssText = 'position:absolute;left:-9999px'; s.innerHTML = '<div class="section-background"></div><h2>x</h2>'; d.querySelector('#page').append(s); const r = [W.getComputedStyle(s.firstChild).backgroundColor, W.getComputedStyle(s.lastChild).color]; s.remove(); return JSON.stringify(r); })()`);
  add(`theme ${name} after a palette pick`, got[0] === bg && got[1] === ink, `ours ${got}, oracle ${bg} ${ink}`);
}

// One undo step per pick, and undo takes the site back.
const undoOff = () => evalJs(S, `(() => JSON.stringify(document.querySelector('#undo').disabled))()`);
const before = undoOff();
browser(S, 'click', '#undo'); await pause(300);
add('one undo step for a pick', before === false && undoOff() === true);

// The popovers: 342 wide, 22px from the editor's right edge, the measured heights.
for (const [kind, rows] of Object.entries(F.popovers)) {
  browser(S, 'click', `[data-ss-pop="${kind}"]`); await pause(250);
  const box = evalJs(S, `(() => { const r = document.querySelector('#ss-popover').getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height]); })()`);
  const want = rows[0].box;
  add(`${kind} popover box`, box[0] === want[0] && box[2] === want[2] && box[3] === want[3], `ours ${box}, oracle ${want}`);
  browser(S, 'click', `[data-ss-pop="${kind}"]`); await pause(150);
}

// The disclosures: every label the oracle showed at the same height (within 3px) and lined up on its
// left, right or center (within 2px; the editor's own font differs, so widths do not match). Colors
// rows by name, as the rows on a page differ.
const openView = async (view) => {
  goto(S, `${BASE}/index.html`); await pause(800);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(1500);
  browser(S, 'click', '#site-styles-toggle'); await pause(300);
  browser(S, 'click', view === 'Misc' ? '.ss-misc' : `[aria-label="Open ${view} style disclosure"]`); await pause(300);
};
const LEAVES = `(() => { const out = []; const w = document.createTreeWalker(document.querySelector('#site-styles'), NodeFilter.SHOW_TEXT); const g = document.createRange(); while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (!t) continue; g.selectNodeContents(w.currentNode); const r = g.getBoundingClientRect(); if (r.width) out.push([t, r.left, r.top + r.height / 2, r.right]); } return JSON.stringify(out); })()`;
for (const [view, rows] of Object.entries(F.disclosures)) {
  await openView(view);
  const ours = evalJs(S, LEAVES);
  for (const r of rows) {
    if (!r.t || r.role || r.t === 'Aa' || !r.font) continue;
    if (view === 'Colors' && (/^(Light|Bright|Dark|Lightest|Darkest) \d$/.test(r.t) || r.t === 'Other color themes')) continue; // Rows differ by page.
    if (view === 'Buttons' && r.box[1] === 201 && r.t !== 'Button') continue; // The oracle stacks three samples in one place.
    const [l, t, w, h] = r.box;
    const hit = ours.find((o) => o[0] === r.t && Math.abs(o[2] - (t + h / 2)) <= 3
      && (Math.abs(o[1] - l) <= 2 || Math.abs(o[3] - (l + w)) <= 2 || Math.abs((o[1] + o[3]) / 2 - (l + w / 2)) <= 2));
    add(`${view} view: ${r.t} at ${l}, ${t}`, !!hit, `ours ${JSON.stringify(ours.filter((o) => o[0] === r.t).map((o) => o.slice(1, 4)))}`);
  }
}
await openView('Colors');
const themeRows = evalJs(S, `(() => JSON.stringify(Object.fromEntries([...document.querySelectorAll('.ss-tr')].map((r) => { const c = getComputedStyle(r); return [r.querySelector('.ss-tr-n').textContent, [c.backgroundColor, c.color]]; }))))()`);
const colorRows = F.disclosures.Colors;
colorRows.forEach((r, i) => {
  if (!/^(Light|Bright|Dark|Lightest|Darkest) \d$/.test(r.t || '')) return;
  const bg = colorRows.slice(0, i).reverse().find((x) => x.role === 'button' && x.bg)?.bg;
  add(`Colors row ${r.t} before a pick`, String(themeRows[r.t]) === String([bg, r.color]), `ours ${themeRows[r.t]}, oracle ${bg} ${r.color}`);
});

// Base Size: the oracle's readings, one press at a time.
await openView('Fonts');
const baseRead = `(() => { const f = document.querySelector('iframe'); const d = f.contentDocument, W = f.contentWindow; const c = (q) => W.getComputedStyle(d.querySelector(q)); const h = c('h1'), p = c('.sqs-html-content p'); return JSON.stringify({ value: document.querySelector('.ss-base-in').value, h1: { fs: h.fontSize, lh: h.lineHeight, ls: h.letterSpacing }, p: { fs: p.fontSize, lh: p.lineHeight } }); })()`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keep = (x) => ({ value: x.value, h1: x.h1, p: x.p });
add('Base Size at the start', same(evalJs(S, baseRead), keep(F.baseSize.start)), JSON.stringify(evalJs(S, baseRead)));
for (const st of F.baseSize.steps) {
  browser(S, 'click', `[aria-label="${st.press}"]`); await pause(250);
  const got = evalJs(S, baseRead);
  add(`Base Size ${st.press} to ${st.value}`, same(got, keep(st)), `ours ${JSON.stringify(got)}, oracle ${JSON.stringify(keep(st))}`);
}
browser(S, 'click', '#undo'); await pause(300);
add('one undo step for a Base Size press', evalJs(S, baseRead).value === '16');

// Reset asks first, Cancel changes nothing, Reset clears the pick.
browser(S, 'click', '[data-ss-reset="font"]'); await pause(200);
const dlg = evalJs(S, `(() => { const r = document.querySelector('.ss-confirm-box').getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height, document.querySelector('#ss-confirm-title').textContent, document.querySelector('#ss-confirm-body').textContent]); })()`);
add('Reset dialog box and words', same(dlg, [...F.resetDialog.box, F.resetDialog.font.title, F.resetDialog.font.body]), JSON.stringify(dlg));
browser(S, 'click', '.ss-confirm-row button:first-child'); await pause(200);
add('Cancel keeps the base size', evalJs(S, baseRead).value === '16' && evalJs(S, `(() => JSON.stringify(document.querySelector('#ss-confirm').hidden))()`) === true);
browser(S, 'click', '[aria-label="Increment"]'); await pause(250);
browser(S, 'click', '[data-ss-reset="font"]'); await pause(200);
browser(S, 'click', '#ss-confirm-reset'); await pause(300);
add('Reset clears the base size', same(evalJs(S, baseRead), keep(F.baseSize.start)));
browser(S, 'click', '[data-ss-back]'); await pause(200);
add('back returns to the cards', evalJs(S, `(() => JSON.stringify(!!document.querySelector('[data-ss-pop="Themes"]')))()`) === true);

console.log(`Site Styles: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/site-styles-check.json', import.meta.url), `${JSON.stringify({ pass, total, fails }, null, 2)}\n`);
if (pass !== total) process.exit(1);
