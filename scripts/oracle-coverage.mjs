// A coverage walk: every Add Block tile on a probe page, unsaved. For each, what its toolbar offers,
// and every row of every tab of its panel, by name and kind. Then the editor's own bars. It presses Add Block, the tile,
// Edit, tabs and the names in CHROME, each on top, and refuses anything named reset, save, delete or remove. It types nothing.
// It writes parity/findings/CAP-COVERAGE.json after each type, so a stop loses little. scripts/coverage-check.mjs compares.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-coverage.mjs [--types Text,Image] [--phone] [--chrome] [--batch 8]
// --phone reads the same panels in the phone view, into each type's phone. --chrome reads only the bars.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { evalJs, pause, goto } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { enterEdit, exitWithoutSaving, addSection, addBlock, sectionCount, escape, select, openSectionPanel, hoverSection } from './oracle/ui.mjs';
import { rowsJs, tabsJs, labelsJs } from './lib/panel-rows.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('oracle-coverage: set ORACLE_SURFACE=cdp:<port>'); process.exit(2); }
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const PAGE = opt('page') || 'Blocks Probe', PHONE = args.includes('--phone'), BATCH = Number(opt('batch')) || 6;
const FILE = new URL('../parity/findings/CAP-COVERAGE.json', import.meta.url);
const TILES = ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Scrolling', 'Line', 'Product', 'Pricing Plan', 'Donation', 'Scheduling', 'Summary', 'Newsletter', 'Quote', 'Audio', 'Calendar', 'Map', 'Menu', 'Chart', 'Code', 'Markdown', 'Embed', 'Social Links', 'Search Field', 'Page Link', 'Tag Cloud', 'RSS', 'Archive', 'Instagram', 'Tock', 'SoundCloud', 'Flickr', 'OpenTable', 'Zola', 'Bandsintown'];
const out = existsSync(FILE) ? JSON.parse(readFileSync(FILE)) : { item: 'CAP-COVERAGE', question: 'Coverage walk: what each tile, panel tab and bar offers, by name and kind.', types: {}, chrome: {}, errors: [] };
out.capturedAt = new Date().toISOString().slice(0, 10);
// Labels only: an address the panel shows as its value isn't one, nor is a placeholder with a scheme.
const save = () => writeFileSync(FILE, `${JSON.stringify(out, null, 1).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '(an email)').replace(/https?:\/\//g, '')}\n`);

const PAGES = 'https://halibut-keyboard-jlhd.squarespace.com/config/pages';
const js = (b) => evalJs(S, b);
const FRAME = `document.getElementById('sqs-site-frame')`;
const labels = () => js(labelsJs(FRAME));
const onPage = () => js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`);
const named = (l) => `[...document.querySelectorAll('button,[role=button],[role=tab],a')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && q.height > 1 && !x.closest('#sqs-site-frame') && (x.getAttribute('aria-label') === ${JSON.stringify(l)} || x.textContent.trim() === ${JSON.stringify(l)}); }).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]`;
const press = (l, wait = 1200) => pressOnTop(S, named(l), wait);
// The panel: the highest box around its tabs that is still panel-sized, in the page and never the frame.
const PANEL = `(() => { const t = [...document.querySelectorAll('[role=tab]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && !x.closest('#sqs-site-frame') && q.left > 100; }).pop(); if (!t) return [...document.querySelectorAll('[class*=Transition-panel]')].filter((x) => x.getBoundingClientRect().width > 1).pop() || null; let p = t; while (p.parentElement && p.parentElement.getBoundingClientRect().width <= 700 && p.parentElement.getBoundingClientRect().height <= 960 && !p.parentElement.querySelector('#sqs-site-frame')) p = p.parentElement; return p; })()`;

async function readPanel() {
  const tabs = js(tabsJs(PANEL));
  const r = { tabs: {} };
  if (!tabs.length) { r.noTabs = js(rowsJs(PANEL)); return r; }
  for (const t of tabs) {
    const on = js(`(() => { const e = ${named(t)}; return JSON.stringify(!!e && e.getAttribute('aria-selected') === 'true'); })()`);
    if (!on) {
      try { await press(t, 500); } catch (e) { r.tabs[t] = { error: e.message.slice(0, 120) }; continue; }
      const isOn = () => js(`(() => { const e = ${named(t)}; return JSON.stringify(!!e && e.getAttribute('aria-selected') === 'true'); })()`);
      for (let w = 0; w < 6 && !isOn(); w++) await pause(500);
      if (!isOn()) (r.notMarked ||= []).push(t);
      await pause(500);
    }
    r.tabs[t] = js(rowsJs(PANEL));
  }
  return r;
}

// An older editor for some types: a dialog of its own, with tabs by their words. Escape doesn't close it, so the page is
// loaded again afterwards, which throws the unsaved work away.
const DIALOG = `[...document.querySelectorAll('.standard-dialog-wrapper')].find((e) => e.getBoundingClientRect().width > 1)`;
const dialogTab = (t) => `[...document.querySelectorAll('.standard-dialog-wrapper .tabbed-header-container *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 1)`;
async function readDialog() {
  const words = js(`(() => { const d = ${DIALOG}; return JSON.stringify([...d.querySelectorAll('.tabbed-header-container *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.getBoundingClientRect().width > 1).map((e) => e.textContent.trim())); })()`);
  const r = { dialog: js(`(() => JSON.stringify((${DIALOG}).querySelector('.title-text')?.textContent.trim() || ''))()`), tabs: {} };
  const body = `(${DIALOG}).querySelector('.body-block')`;
  if (!words.length) { r.noTabs = js(rowsJs(body)); return r; }
  for (const [n, t] of words.entries()) {
    if (n) { try { await pressOnTop(S, dialogTab(t), 1200); } catch (e) { r.tabs[t] = { error: e.message.slice(0, 120) }; continue; } }
    r.tabs[t] = js(rowsJs(`[...(${DIALOG}).querySelectorAll('.tab-wrapper')].find((e) => e.getBoundingClientRect().height > 1) || ${body}`));
  }
  return r;
}
const hasDialog = () => js(`(() => JSON.stringify(!!${DIALOG}))()`) === true;

async function readType(type) {
  const r = {};
  await addSection();
  const i = sectionCount() - 1;
  await hoverSection(i); await pause(500);
  const base = new Set(labels());
  const id = await addBlock(i, type);
  await pause(1200);
  await escape();
  const selected = () => js(`(() => { const b = ${FRAME}.contentDocument.querySelector('.fe-block[data-block-id="${id}"]'); return JSON.stringify(!!b && b.dataset.isSelected === 'true'); })()`);
  if (!selected()) await select(i, id);
  await pause(500);
  if (!selected()) { r.error = 'could not select'; await escape(); return r; }
  if (PHONE) { await press('Mobile View', 2500); if (!selected()) await select(i, id); await pause(500); }
  r.toolbar = labels().filter((l) => !base.has(l));
  const hasEdit = r.toolbar.includes('Edit');
  if (hasEdit) {
    await press('Edit', 1500);
    for (let w = 0; w < 6 && !hasDialog() && !js(tabsJs(PANEL)).length; w++) await pause(500);
    if (hasDialog()) { Object.assign(r, await readDialog()); return r; }
    Object.assign(r, await readPanel());
    await escape();
    if (js(tabsJs(PANEL)).length) await escape();
  } else r.noEdit = true;
  if (PHONE) await press('Desktop View', 2000);
  await escape(); await escape();
  return r;
}

const only = opt('types') ? opt('types').split(',') : TILES;
if (!args.includes('--chrome')) {
  const todo = only.filter((t) => TILES.includes(t));
  for (let n = 0; n < todo.length; n += BATCH) {
    await enterEdit(PAGE);
    for (const type of todo.slice(n, n + BATCH)) {
      try {
        const r = await readType(type);
        if (onPage() !== `/${PAGE.toLowerCase().replace(/ /g, '-')}`) throw new Error('left the probe page');
        if (PHONE) (out.types[type] ||= {}).phone = r; else out.types[type] = { ...out.types[type], ...r };
        console.log(type, 'tabs', Object.keys(r.tabs || {}).join(',') || '-', 'rows', Object.values(r.tabs || {}).map((x) => x.length ?? 'x').join(','), r.error || '');
      } catch (e) { out.errors.push(`${type}${PHONE ? ' phone' : ''}: ${e.message.slice(0, 200)}`); console.log(type, 'ERROR', e.message.slice(0, 160)); await escape().catch(() => {}); await escape().catch(() => {}); }
      save();
      if (hasDialog()) { goto(S, PAGES); await pause(9000); await enterEdit(PAGE); }
    }
    await escape(); await escape();
    await exitWithoutSaving();
    await pause(1500);
  }
}

if (args.includes('--chrome')) {
  await enterEdit(PAGE);
  await addSection(); await addSection();
  const c = out.chrome = {};
  // Each bar on its own: one that can't be read leaves the others.
  const part = async (name, fn) => { try { c[name] = await fn(); } catch (e) { out.errors.push(`chrome ${name}: ${e.message.slice(0, 200)}`); console.log(name, 'ERROR', e.message.slice(0, 160)); } await escape(); await escape(); save(); };
  await part('hoveredSection', async () => { await hoverSection(0); await pause(800); return labels(); });
  await part('sectionPanel', async () => { await openSectionPanel(0); await pause(800); return readPanel(); });
  await part('addSectionMenu', async () => {
    await hoverSection(1); await pause(800);
    const before = new Set(labels());
    const add = `[...document.querySelectorAll('button')].filter((x) => /^add section$/i.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]`;
    await pressOnTop(S, add, 2500);
    return labels().filter((l) => !before.has(l));
  });
  await part('phoneHovered', async () => { await hoverSection(0); await pause(800); await press('Mobile View', 2500); await hoverSection(0); await pause(800); const l = labels(); await press('Desktop View', 2000); return l; });
  await exitWithoutSaving(); await pause(1500);
}
save();
console.log('wrote CAP-COVERAGE.json, errors', out.errors.length);
process.exit(0);
