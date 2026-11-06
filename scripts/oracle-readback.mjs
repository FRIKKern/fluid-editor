// Has Edit Color Theme changed on the trial site? Every row of all ten themes and the palette, against the full
// list in parity/findings/CAP-THEMEROWS.json, and the Fonts, Buttons, Forms and Miscellaneous views against CAP-STYLEROWS.json. Read
// only: it presses only the names it allows, needs Save off at every read, and leaves by Exit. Never Reset, a pick or a
// slider. Run it after a probe:
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-readback.mjs
// --store replaces CAP-STYLEROWS.json's views with what it reads. Only for a site known to be as it should be.
// Exit 0: the same. Exit 1: differences, listed. Exit 2: it could not read, so it says nothing about the site.
import { writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause } from './lib/cmux.mjs';
import { pressOnTop, leaveChecked } from './oracle/press.mjs';
import { THEMES, NAMES, compareRows, comparePalette, compareView, STYLES, STYLE_FILE } from './oracle/readback.mjs';
import { VIEWS, READ_VIEW } from './oracle/style-views.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S) { console.error('oracle-readback: set ORACLE_SURFACE'); process.exit(2); }
const PAGES = 'https://halibut-keyboard-jlhd.squarespace.com/config/pages', PAGE = 'Blocks Probe', PAGE_PATH = '/blocks-probe';
const VARS = ['white', 'black', 'accent', 'lightAccent', 'darkAccent', 'safeLightAccent', 'safeDarkAccent', 'safeInverseAccent', 'safeInverseLightAccent', 'safeInverseDarkAccent'];
// All it may press. The panel's back button has no label: its words are the view it goes back to.
const PRESS = new Set([PAGE, 'Toggle Site Styles editing', 'Open Colors style disclosure', 'Colors', 'Site Styles', ...THEMES.map((t) => `AA ${t}`),
  ...Object.keys(VIEWS), ...Object.keys(VIEWS).map((v) => `Open ${v} style disclosure`), ...Object.entries(VIEWS).flatMap(([v, rs]) => rs.map((r) => `${v} > ${r}`))]);
const js = (body) => evalJs(S, `(() => { ${body} })()`);
const frame = `const f = document.getElementById('sqs-site-frame'), d = f && f.contentDocument, W = f && f.contentWindow;`;
const FIND = {
  [PAGE]: `[...document.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(PAGE)} && x.getBoundingClientRect().width > 0)`,
  named: (l) => `[...document.querySelectorAll('button,[aria-label]')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(l)} && x.getBoundingClientRect().width > 0)`,
  back: `document.elementFromPoint(1340, 44)?.closest('button')`,
  row: (t) => `[...document.querySelectorAll('button')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= 1282 && r.width > 200; }).find((x) => { const w = x.innerText.replace(/\\s+/g, ' ').trim().toUpperCase(), n = ${JSON.stringify(t.toUpperCase())}; return w === n || w.startsWith(n + ' '); })`,
  theme: (n) => `[...document.querySelectorAll('button')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= 1282 && r.height >= 40 && r.height <= 50 && r.width > 250; }).find((x) => x.innerText.replace(/\\s+/g, ' ').trim().toUpperCase() === ${JSON.stringify(n)})`,
};
// A real press on a named element that is on top, or it stops.
async function press(name, find, wait = 1000) {
  if (!PRESS.has(name)) throw new Error(`refused ${name}`);
  await pressOnTop(S, find, wait).catch((e) => { throw new Error(`${name}: ${e.message}`); });
}
// No upper limit near a row's height: names on two lines make a row 66 tall, not 44.
const rows = () => js(`const pan = [...document.querySelectorAll('button')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= 1285 && r.width > 270 && r.height >= 40 && r.height <= 200; }); return JSON.stringify(pan.map((x) => { const dot = [...x.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 10 && q.width < 30 && q.height === q.width; }).map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)'); return [x.getAttribute('aria-label') || x.innerText.trim().slice(0, 30), dot[0] || '']; }));`);
// Before Site Styles the top bar has Edit, with no Exit or Save. Opening Site Styles swaps it for Exit and a Save that is
// off, so that Save is what says nothing has changed. Read on the probe page, 2026-11-06.
const topBar = () => js(`const b = [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0), has = (t) => b.find((x) => x.textContent.trim() === t), s = has('Save'); return JSON.stringify({ edit: !!has('Edit'), exit: !!has('Exit'), save: !s ? 'none' : s.disabled || s.getAttribute('aria-disabled') === 'true' ? 'off' : 'on' });`);
const closed = () => { const t = topBar(); return t.edit && !t.exit && t.save === 'none'; };
const saveOff = () => topBar().save === 'off';
const goBack = async (want) => {
  const words = js(`const b = ${FIND.back}; return JSON.stringify(b ? b.textContent.trim() : null);`);
  if (words !== want) throw new Error(`back button reads ${JSON.stringify(words)}, wanted ${want}`);
  await press(want, FIND.back, 1000);
};
const pathNow = () => js(`${frame} return JSON.stringify(d ? d.location.pathname : null);`);

const diffs = [];
try {
  viewport(S, 1600, 1000); goto(S, PAGES); await pause(9000);
  await press(PAGE, FIND[PAGE], 5000);
  for (let i = 0; i < 15 && pathNow() !== PAGE_PATH; i++) await pause(1000);
  if (pathNow() !== PAGE_PATH) throw new Error(`the frame is on ${pathNow()}, not ${PAGE_PATH}`);
  if (!closed()) throw new Error(`the page is being edited: ${JSON.stringify(topBar())}`);
  await press('Toggle Site Styles editing', FIND.named('Toggle Site Styles editing'), 2000);
  if (!saveOff()) throw new Error(`Save is not off in Site Styles: ${JSON.stringify(topBar())}`);
  await press('Open Colors style disclosure', FIND.named('Open Colors style disclosure'), 1300);
  diffs.push(...comparePalette(js(`${frame} const a = W.getComputedStyle(d.documentElement), b = W.getComputedStyle(d.body), o = {}; for (const n of ${JSON.stringify(VARS)}) o[n] = (a.getPropertyValue('--' + n + '-hsl') || b.getPropertyValue('--' + n + '-hsl')).trim(); return JSON.stringify(o);`)));
  for (const t of THEMES) {
    await press(`AA ${t}`, FIND.theme(`AA ${t}`), 1100);
    const one = rows(); await pause(500); const two = rows();
    if (JSON.stringify(one) !== JSON.stringify(two)) diffs.push(`${t}: the list moved between two reads`);
    if (!/^Aa/.test(two[0]?.[0] || '')) throw new Error(`${t}: no head row, read ${JSON.stringify(two[0])}`);
    if (!saveOff()) diffs.push(`${t}: Save is not off: ${JSON.stringify(topBar())}`);
    const found = compareRows(t, two.slice(1));
    diffs.push(...found);
    console.log(`${t.padEnd(11)} ${two.length - 1} rows, ${found.length} differ`);
    await goBack('Colors');
  }
  await goBack('Site Styles');
  // Fonts, Buttons, Forms, Miscellaneous: each view and the views one row under it.
  const read = {};
  const take = async (view) => {
    const one = evalJs(S, READ_VIEW); await pause(400); const two = evalJs(S, READ_VIEW);
    if (JSON.stringify(one) !== JSON.stringify(two)) diffs.push(`${view}: moved between two reads`);
    if (!saveOff()) diffs.push(`${view}: Save is not off: ${JSON.stringify(topBar())}`);
    read[view] = two;
    if (!process.argv.includes('--store')) { const found = compareView(view, two); diffs.push(...found); console.log(`${view.padEnd(28)} ${two.length} controls, ${found.length} differ`); }
  };
  for (const [view, rs] of Object.entries(VIEWS)) {
    if (view === 'Miscellaneous') await press(view, FIND.row(view), 1300);
    else await press(`Open ${view} style disclosure`, FIND.named(`Open ${view} style disclosure`), 1300);
    await take(view);
    for (const r of rs) { await press(`${view} > ${r}`, FIND.row(r), 1200); await take(`${view} > ${r}`); await goBack(view); }
    await goBack('Site Styles');
  }
  if (process.argv.includes('--store')) writeFileSync(STYLE_FILE, `${JSON.stringify({ ...STYLES, views: read }, null, 1)}\n`);
  if (await leaveChecked(S)) diffs.push('Exit asked about unsaved changes');
  await pause(1500);
  if (!closed()) diffs.push(`the page is still being edited after Exit: ${JSON.stringify(topBar())}`);
} catch (e) {
  console.error(`oracle-readback: could not read: ${e.message}`);
  if (topBar().exit) await leaveChecked(S).catch(() => {});
  goto(S, PAGES);
  process.exit(2);
}
goto(S, PAGES);
if (diffs.length) { console.log(`DIFFERENT: ${diffs.length}`); for (const x of diffs.slice(0, 40)) console.log(`  ${x}`); process.exit(1); }
console.log(`The same: palette, ${NAMES.length} rows on each of ${THEMES.length} themes, ${Object.keys(STYLES.views).length} views of Fonts, Buttons, Forms and Miscellaneous, on ${PAGE_PATH}, Save off at every read, no question on Exit.`);
