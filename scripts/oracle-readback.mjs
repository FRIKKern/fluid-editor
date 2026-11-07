// Has Edit Color Theme changed on the trial site? Every row of all ten themes and the palette, against the full
// list in parity/findings/CAP-THEMEROWS.json, and the Fonts, Buttons, Forms and Miscellaneous views, the Themes popover and
// the closed lists against CAP-STYLEROWS.json. Read only: it presses only the names it allows, needs Save off at every read,
// and leaves by Exit. Never Reset, a pick or a slider. Run it after a probe:
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-readback.mjs
// --store replaces CAP-STYLEROWS.json's views, lists, families and formColors with what it reads. Only for a site known to be as it should be.
// It reads the site footer first, against CAP-FOOTER.json (scripts/oracle/footer.mjs). --footer-only stops after that;
// --store-footer replaces that base.
// Exit 0: the same. Exit 1: differences, listed. Exit 2: it could not read, so it says nothing about the site.
import { writeFileSync } from 'node:fs';
import { browser, evalJs, goto, mouse, viewport, pause } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { exitWithoutSaving } from './oracle/ui.mjs';
import { THEMES, NAMES, compareRows, comparePalette, compareView, settledRead, compareLists, compareFamilies, compareFormColors, STYLES, STYLE_FILE } from './oracle/readback.mjs';
import { VIEWS, DEEP, DEEP_BACK, LISTS, READ_VIEW } from './oracle/style-views.mjs';
import { FOOTER_FILE, FOOTER_PATHS, FOOTER_READ, compareFooter } from './oracle/footer.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S) { console.error('oracle-readback: set ORACLE_SURFACE'); process.exit(2); }
const PAGES = 'https://halibut-keyboard-jlhd.squarespace.com/config/pages', PAGE = 'Blocks Probe', PAGE_PATH = '/blocks-probe';
const VARS = ['white', 'black', 'accent', 'lightAccent', 'darkAccent', 'safeLightAccent', 'safeDarkAccent', 'safeInverseAccent', 'safeInverseLightAccent', 'safeInverseDarkAccent'];
// All it may press. The panel's back button has no label: its words are the view it goes back to.
const PRESS = new Set([PAGE, 'Toggle Site Styles editing', 'Open Colors style disclosure', 'Colors', 'Site Styles', ...THEMES.map((t) => `AA ${t}`),
  ...Object.keys(VIEWS), ...Object.keys(VIEWS).map((v) => `Open ${v} style disclosure`), ...Object.entries(VIEWS).flatMap(([v, rs]) => rs.map((r) => `${v} > ${r}`)), ...Object.entries(DEEP).flatMap(([v, rs]) => [DEEP_BACK[v], ...rs.map((r) => `${v} > ${r}`)]), 'Toggle Themes style pack popover', 'list row', 'font row', 'shape row', 'Filter by language or script']);
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
// A press on a row low down, or a list opened there, can leave the panel scrolled, with the back button out of view.
const panelToTop = () => js(`for (const x of document.querySelectorAll('body *')) { if (x.scrollTop > 0 && x.getBoundingClientRect().left >= 1250) x.scrollTop = 0; } return 'true';`);
const goBack = async (want) => {
  panelToTop(); await pause(150);
  const words = js(`const b = ${FIND.back}; return JSON.stringify(b ? b.textContent.trim() : null);`);
  if (words !== want) throw new Error(`back button reads ${JSON.stringify(words)}, wanted ${want}`);
  await press(want, FIND.back, 1000);
};
const pathNow = () => js(`${frame} return JSON.stringify(d ? d.location.pathname : null);`);

// The pointer leaves after each press, so an open list isn't hovered. A list closes by Escape, and only with one open: with
// nothing open Escape closes Site Styles.
const away = async () => { mouse(S, 'move', 800, 28); await pause(450); };
const OPEN_LIST = `[...document.querySelectorAll('[role=listbox]')].some((x) => x.getBoundingClientRect().width > 0)`;
const FAMILY_ROWS = `[...document.querySelectorAll('label')].filter((x) => x.querySelector('img') && x.getBoundingClientRect().width > 0)`;
const onTop = (x) => `(() => { const r = ${x}.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && ${x}.contains(t); })()`;
const FLOATING = `[...document.querySelectorAll('button,[role=radio],input')].filter((x) => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left >= 1230 && ${onTop('x')}).map((x) => { const r = x.getBoundingClientRect(); return [x.getAttribute('aria-label') || '', (x.innerText || '').replace(/\\s+/g, ' ').trim(), x.getAttribute('aria-pressed') || x.getAttribute('aria-checked') || '', Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })`;
const closeOpen = async (what) => {
  for (let n = 0; n < 3 && (js(`return JSON.stringify(${OPEN_LIST} || ${FAMILY_ROWS}.length > 0);`)); n++) { browser(S, 'press', 'Escape'); await pause(600); }
  if (js(`return JSON.stringify(${OPEN_LIST} || ${FAMILY_ROWS}.length > 0);`)) throw new Error(`${what}: still open after Escape`);
};
const COMBOS = `[...document.querySelectorAll('[role=combobox]')].filter((x) => x.getBoundingClientRect().width > 0)`;
// One font list, as read. 'all' scrolls it by script to the end and returns every name; the list only holds the rows near where it is.
async function readFamily(how, record) {
  const words = evalJs(S, READ_VIEW).at(-1)[1].split(' | '), now = words[words.indexOf('Font') + 1];
  const family = `[...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= 1282 && r.width > 150 && getComputedStyle(x).cursor === 'pointer' && (x.innerText || '').trim() === ${JSON.stringify(now)}; }).pop()`;
  await press('font row', family, 1300); await away(); await pause(500);
  if (!saveOff()) diffs.push(`font list: Save is not off: ${JSON.stringify(topBar())}`);
  const names = () => js(`return JSON.stringify(${FAMILY_ROWS}.map((x) => x.querySelector('img').alt));`);
  const heads = js(`return JSON.stringify([...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return x.childElementCount === 0 && r.left >= 1260 && r.width > 200 && r.top > 300 && x.textContent.trim() && getComputedStyle(x).textTransform === 'uppercase'; }).map((x) => x.textContent.trim()));`);
  record.family = { first: names(), heads };
  if (how === 'all') {
    const seen = new Set(record.family.first);
    const box = `(() => { let p = ${FAMILY_ROWS}[0]; while (p && !(p.scrollHeight > p.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; return p; })()`;
    let steps = 0;
    for (; steps < 400; steps++) {
      const m = js(`const p = ${box}; if (!p) return JSON.stringify(null); const b = p.scrollTop; p.scrollTop = b + p.clientHeight; return JSON.stringify([b, p.scrollTop]);`);
      await pause(300);
      for (const n of names()) seen.add(n);
      if (!m || m[0] === m[1]) break;
    }
    if (steps >= 400) throw new Error('the font list did not end after 400 scrolls');
    record.families = [...seen];
    js(`const p = ${box}; if (p) p.scrollTop = 0; return JSON.stringify(true);`); await pause(500);
  }
  await press('Filter by language or script', FIND.named('Filter by language or script'), 800); await away();
  record.family.filter = js(`return JSON.stringify([...document.querySelectorAll('[role=listbox] [role=option]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => [x.innerText.trim(), x.getAttribute('aria-selected') || '']));`);
  await closeOpen('font list');
}
// Every closed list a view holds.
async function readLists(view) {
  const spec = LISTS[view], out = {};
  if (spec.combos) {
    const count = js(`return JSON.stringify(${COMBOS}.length);`);
    if (!count) throw new Error(`${view}: no list rows`);
    out.combos = [];
    for (let i = 0; i < count; i++) {
      const name = js(`return JSON.stringify(${COMBOS}[${i}].innerText.replace(/\\s+/g, ' ').trim());`);
      await press('list row', `${COMBOS}[${i}]`, 700); await away();
      const options = js(`return JSON.stringify([...document.querySelectorAll('[role=listbox] [role=option]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => [x.innerText.trim(), x.getAttribute('aria-selected') || '']));`);
      if (!options.length) throw new Error(`${view} ${name}: no list opened`);
      out.combos.push([name, options]);
      await closeOpen(`${view} ${name}`);
    }
  }
  if (spec.family) await readFamily(spec.family, out);
  // A view's font rows after the first one read: each opens its own list, read and closed the same way.
  if (spec.moreFamilies) {
    const name = JSON.stringify(spec.moreFamilies);
    const isRow = `(x) => { const r = x.getBoundingClientRect(); return r.left >= 1282 && r.width > 150 && getComputedStyle(x).cursor === 'pointer' && (x.innerText || '').trim() === ${name}; }`;
    const rows = `[...document.querySelectorAll('body *')].filter(${isRow}).filter((x) => ![...x.children].some(${isRow}))`;
    const count = js(`return JSON.stringify(${COMBOS}.length);`);
    if (!count) throw new Error(`${view}: no list rows`);
    out.combos = [];
    for (let i = 0; i < count; i++) {
      const name = js(`return JSON.stringify(${COMBOS}[${i}].innerText.replace(/\\s+/g, ' ').trim());`);
      await press('list row', `${COMBOS}[${i}]`, 700); await away();
      const options = js(`return JSON.stringify([...document.querySelectorAll('[role=listbox] [role=option]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => [x.innerText.trim(), x.getAttribute('aria-selected') || '']));`);
      if (!options.length) throw new Error(`${view} ${name}: no list opened`);
      out.combos.push([name, options]);
      await closeOpen(`${view} ${name}`);
    }
  }
  if (spec.family) await readFamily(spec.family, out);
  // A view's font rows after the first one read: each opens its own list, read and closed the same way.
  if (spec.moreFamilies) {
    const rows = `[...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= 1282 && r.width > 150 && getComputedStyle(x).cursor === 'pointer' && (x.innerText || '').trim() === ${JSON.stringify(spec.moreFamilies)} && !x.parentElement.closest('[style*="cursor"]') && ![...x.children].some((c) => (c.innerText || '').trim() === ${JSON.stringify(spec.moreFamilies)} && getComputedStyle(c).cursor === 'pointer'); })`;
    const count = js(`return JSON.stringify(${rows}.length);`);
    out.moreFamilies = [];
    for (let n = 0; n < count; n++) {
      await press('font row', `${rows}[${n}]`, 1300); await away(); await pause(500);
      if (!saveOff()) diffs.push(`font list: Save is not off: ${JSON.stringify(topBar())}`);
      out.moreFamilies.push(js(`return JSON.stringify(${FAMILY_ROWS}.map((x) => x.querySelector('img').alt));`));
      await closeOpen('font list');
    }
  }
  if (spec.shape) {
    await press('shape row', FIND.row(spec.shape), 800); await away();
    out.shape = js(`return JSON.stringify(${FLOATING});`);
    if (!out.shape.length) throw new Error(`${view}: no popover`);
    browser(S, 'press', 'Escape'); await pause(700);
  }
  if (!saveOff()) diffs.push(`${view} lists: Save is not off: ${JSON.stringify(topBar())}`);
  return out;
}

const diffs = [], read = {}, listsRead = {}, formColors = {};
let families = [];
// The footer first: read only, on a load of each page, no press. --footer-only stops after it, --store-footer stores it.
const FOOTER_ONLY = process.argv.includes('--footer-only'), STORE_FOOTER = process.argv.includes('--store-footer'), footers = {};
async function readFooter(path) {
  goto(S, PAGES.replace('/config/pages', path));
  for (let i = 0; i < 30; i++) { await pause(1000); if (evalJs(S, FOOTER_READ)) { await pause(2000); return evalJs(S, FOOTER_READ); } }
  return null;
}
try {
  viewport(S, 1600, 1000);
  for (const p of FOOTER_PATHS) {
    footers[p] = await readFooter(p);
    if (STORE_FOOTER) continue;
    const found = compareFooter(p, footers[p]); diffs.push(...found);
    console.log(`footer ${p.padEnd(16)} ${footers[p]?.blocks.length ?? 0} blocks, ${found.length} differ`);
  }
  if (STORE_FOOTER) {
    const empty = FOOTER_PATHS.filter((p) => !footers[p]);
    if (empty.length) throw new Error(`nothing read on ${empty.join(', ')}: not stored`);
    writeFileSync(FOOTER_FILE, `${JSON.stringify({ item: 'U12', capturedAt: new Date().toISOString().slice(0, 10), how: 'oracle-readback --store-footer: a load of each page, read only. Emails read as (an email); links by aria-label or words, no targets.', reads: footers }, null, 1)}\n`);
    console.log(`footer base stored for ${FOOTER_PATHS.join(', ')}`);
  }
} catch (e) {
  console.error(`oracle-readback: could not read the footer: ${e.message}`);
  goto(S, PAGES);
  process.exit(2);
}
if (FOOTER_ONLY) {
  goto(S, PAGES);
  if (diffs.length) { console.log(`DIFFERENT: ${diffs.length}`); for (const x of diffs.slice(0, 40)) console.log(`  ${x}`); process.exit(1); }
  if (!STORE_FOOTER) console.log(`The same: the footer on ${FOOTER_PATHS.join(', ')}.`);
  process.exit(0);
}
try {
  viewport(S, 1600, 1000); goto(S, PAGES); await pause(9000);
  await press(PAGE, FIND[PAGE], 5000);
  for (let i = 0; i < 15 && pathNow() !== PAGE_PATH; i++) await pause(1000);
  if (pathNow() !== PAGE_PATH) throw new Error(`the frame is on ${pathNow()}, not ${PAGE_PATH}`);
  if (!closed()) throw new Error(`the page is being edited: ${JSON.stringify(topBar())}`);
  await press('Toggle Site Styles editing', FIND.named('Toggle Site Styles editing'), 2000);
  if (!saveOff()) throw new Error(`Save is not off in Site Styles: ${JSON.stringify(topBar())}`);
  const TOGGLE = 'Toggle Themes style pack popover';
  await press(TOGGLE, FIND.named(TOGGLE), 800); await away();
  const themes = js(`return JSON.stringify({ heads: [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return x.childElementCount === 0 && r.left >= 900 && r.left < 1262 && r.width >= 300 && x.textContent.trim(); }).map((x) => x.textContent.trim()), tiles: [...document.querySelectorAll('[aria-label^="Site theme"]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => [x.getAttribute('aria-label'), x.innerText.replace(/\\s+/g, ' ').trim()]) });`);
  if (!themes.tiles.length) throw new Error('the Themes popover did not open');
  listsRead.Themes = themes;
  if (!saveOff()) diffs.push(`Themes popover: Save is not off: ${JSON.stringify(topBar())}`);
  await press(TOGGLE, FIND.named(TOGGLE), 800); await away();
  await press('Open Colors style disclosure', FIND.named('Open Colors style disclosure'), 1300);
  diffs.push(...comparePalette(js(`${frame} const a = W.getComputedStyle(d.documentElement), b = W.getComputedStyle(d.body), o = {}; for (const n of ${JSON.stringify(VARS)}) o[n] = (a.getPropertyValue('--' + n + '-hsl') || b.getPropertyValue('--' + n + '-hsl')).trim(); return JSON.stringify(o);`)));
  for (const t of THEMES) {
    await press(`AA ${t}`, FIND.theme(`AA ${t}`), 1100);
    const { rows: two, settled } = await settledRead(rows, () => pause(500));
    if (!settled) diffs.push(`${t}: the list kept moving over 6 reads`);
    if (!/^Aa/.test(two[0]?.[0] || '')) throw new Error(`${t}: no head row, read ${JSON.stringify(two[0])}`);
    if (!saveOff()) diffs.push(`${t}: Save is not off: ${JSON.stringify(topBar())}`);
    const found = compareRows(t, two.slice(1));
    diffs.push(...found);
    console.log(`${t.padEnd(11)} ${two.length - 1} rows, ${found.length} differ`);
    await goBack('Colors');
  }
  await goBack('Site Styles');
  // Fonts, Buttons, Forms, Miscellaneous: each view and the views one row under it.
  const take = async (view) => {
    const { rows: two, settled } = await settledRead(() => evalJs(S, READ_VIEW), () => pause(400));
    if (!settled) diffs.push(`${view}: kept moving over 6 reads`);
    if (!saveOff()) diffs.push(`${view}: Save is not off: ${JSON.stringify(topBar())}`);
    read[view] = two;
    if (!process.argv.includes('--store')) { const found = compareView(view, two); diffs.push(...found); console.log(`${view.padEnd(28)} ${two.length} controls, ${found.length} differ`); }    if (LISTS[view]) listsRead[view] = await readLists(view);
  };
  for (const [view, rs] of Object.entries(VIEWS)) {
    if (view === 'Miscellaneous') await press(view, FIND.row(view), 1300);
    else await press(`Open ${view} style disclosure`, FIND.named(`Open ${view} style disclosure`), 1300);
    await take(view);
    for (const r of rs) {
      const at = `${view} > ${r}`;
      await press(at, FIND.row(r), 1200); await take(at);
      for (const d of DEEP[at] || []) { await press(`${at} > ${d}`, FIND.row(d), 1200); await take(`${at} > ${d}`); await goBack(DEEP_BACK[at]); }
      await goBack(view);
    }
    await goBack('Site Styles');
  }
  // Forms > Colors holds the theme Colors last opened: Colors, a theme, back out, Forms > Colors, for each theme.
  for (const t of THEMES) {
    await press('Open Colors style disclosure', FIND.named('Open Colors style disclosure'), 1300);
    await press(`AA ${t}`, FIND.theme(`AA ${t}`), 1100);
    await goBack('Colors'); await goBack('Site Styles');
    await press('Open Forms style disclosure', FIND.named('Open Forms style disclosure'), 1300);
    await press('Forms > Colors', FIND.row('Colors'), 1200);
    const { rows: two, settled } = await settledRead(() => evalJs(S, READ_VIEW), () => pause(400));
    if (!settled) diffs.push(`Forms > Colors on ${t}: kept moving over 6 reads`);
    if (!saveOff()) diffs.push(`Forms > Colors on ${t}: Save is not off: ${JSON.stringify(topBar())}`);
    formColors[t] = two;
    if (!process.argv.includes('--store')) { const found = compareFormColors(t, two); diffs.push(...found); console.log(`Forms > Colors, ${t.padEnd(11)} ${two.length} rows, ${found.length} differ`); }
    await goBack('Forms'); await goBack('Site Styles');
  }
  families = listsRead['Fonts > Headings'].families;
  delete listsRead['Fonts > Headings'].families;
  if (process.argv.includes('--store')) writeFileSync(STYLE_FILE, `${JSON.stringify({ ...STYLES, views: read, lists: listsRead, families, formColors }, null, 1)}\n`);
  else {
    for (const [k, v] of Object.entries(listsRead)) { const found = compareLists(k, v); diffs.push(...found); console.log(`${k.padEnd(28)} lists, ${found.length} differ`); }
    const found = compareFamilies(families); diffs.push(...found); console.log(`${families.length} font names, ${found.length} differ`);
  }
  if (await exitWithoutSaving()) diffs.push('Exit asked about unsaved changes');
  await pause(1500);
  if (!closed()) diffs.push(`the page is still being edited after Exit: ${JSON.stringify(topBar())}`);
} catch (e) {
  console.error(`oracle-readback: could not read: ${e.message}`);
  if (topBar().exit) await exitWithoutSaving().catch((x) => console.error(x.message));
  goto(S, PAGES);
  process.exit(2);
}
goto(S, PAGES);
if (diffs.length) { console.log(`DIFFERENT: ${diffs.length}`); for (const x of diffs.slice(0, 40)) console.log(`  ${x}`); process.exit(1); }
console.log(`The same: the footer on ${FOOTER_PATHS.length} pages, palette, ${NAMES.length} rows on each of ${THEMES.length} themes, ${Object.keys(read).length} views of Fonts, Buttons, Forms and Miscellaneous, ${Object.keys(listsRead).length} sets of closed lists, ${families.length} font names and Forms > Colors on ${Object.keys(formColors).length} themes, on ${PAGE_PATH}, Save off at every read, no question on Exit.`);
