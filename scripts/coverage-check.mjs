// What's on the oracle and not ours, and what's ours and not on the oracle. Reads ours with the reader that read the oracle
// (scripts/lib/panel-rows.mjs), against parity/findings/CAP-COVERAGE.json, and looks up each oracle-only name in items.json and
// the findings. The list is stored in parity/coverage-check.json. Exit 0: the list is the stored one. Exit 1: it moved, with what moved.
//   FLUID_PORT=<port> FLUID_SURFACE=cdp:<port> node scripts/coverage-check.mjs [--store]
// --store writes the list. A name counts as the same after lower case, with digits and punctuation gone. Writes nothing to the page's store.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { evalJs, goto, mouse, pause, viewport } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { rowsJs, labelsJs } from './lib/panel-rows.mjs';

const S = process.env.FLUID_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('coverage-check: set FLUID_SURFACE=cdp:<port>'); process.exit(2); }
const STORE = process.argv.includes('--store');
const here = (p) => new URL(`../${p}`, import.meta.url);
const ORACLE = JSON.parse(readFileSync(here('parity/findings/CAP-COVERAGE.json')));
const LIST = here('parity/coverage-check.json');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
// Help sentences and values read as rows, on both sides. They're kept apart from names of controls.
const isProse = (r) => !r.k.length && r.n.length >= 40;
const SKIP = new Set(['', 'no name', 'show tooltip', 'learn more', 'an email', 'click and drag to reposition block editor form', 'x', 'y', 'px']);
// A heading and what follows it are one row when what follows is its value (a menu showing its pick) or its way in (Navigate to X).
const pair = (rows) => { const out = []; for (const r of rows || []) { const h = out[out.length - 1]; if (h && !h.k.length && h.n.length < 40 && r.k.includes('menu') && !r.aria) { h.k = r.k; h.v = r.n; if (r.off) h.off = true; continue; } if (/^Navigate to /.test(r.n)) { const n = r.n.replace(/^Navigate to /, ''), at = out.findLast((x) => x.n === n); if (at) { at.k = r.k; if (r.off) at.off = true; continue; } out.push({ ...r, n }); continue; } out.push({ ...r }); } return out; };
const names = (rows) => [...new Map(pair(rows).filter((r) => !SKIP.has(norm(r.n))).map((r) => [norm(r.n), r])).values()];

const js = (b) => evalJs(S, b);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1500);
const PANEL = `document.getElementById('block-panel')`;
const readOurs = (type, phone) => js(`(async () => { const w = (r) => new Promise((x) => setTimeout(x, r)); fe.setBp('desktop');
  fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'middle', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 24 }, blocks: [] }] }); await w(100);
  fe.addBlock('s', ${JSON.stringify(type)}); await w(120); const b = fe.model.sections[0].blocks[0]; if (!b) return JSON.stringify({ error: 'no tile' });
  ${phone ? `fe.setBp('mobile'); await w(200);` : ''}
  fe.select('s', b.id); await w(120);
  const vis = (e) => e && e.getBoundingClientRect().width > 1;
  const toolbar = [...document.querySelectorAll('#block-toolbar button, #block-toolbar [role=button], #block-toolbar a')].filter(vis).map((e) => (e.getAttribute('aria-label') || e.title || e.textContent || '').replace(/\\s+/g, ' ').trim());
  const edit = document.querySelector('#block-toolbar [data-tb="edit"]');
  if (!vis(edit)) return JSON.stringify({ toolbar, noEdit: true });
  const panel = ${PANEL}; if (panel.hidden) edit.click(); await w(250);
  if (panel.hidden) return JSON.stringify({ toolbar, noPanel: true });
  const tabs = [...panel.querySelectorAll('[role=tab]')].filter(vis);
  const out = { toolbar, tabs: {} };
  const read = () => JSON.parse(${rowsJs(PANEL)});
  if (!tabs.length) { out.noTabs = read(); return JSON.stringify(out); }
  for (const name of tabs.map((t) => t.textContent.replace(/\\s+/g, ' ').trim())) { [...panel.querySelectorAll('[role=tab]')].find((t) => t.textContent.replace(/\\s+/g, ' ').trim() === name).click(); await w(180); out.tabs[name] = read(); }
  return JSON.stringify(out); })()`);

const ours = { types: {}, phone: {} };
for (const T of Object.keys(ORACLE.types)) { ours.types[T] = readOurs(T, false); ours.phone[T] = readOurs(T, true); }
// The bars: the mouse goes over the section, as a person's would.
const blank = `fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'middle', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 24 }, blocks: [] }] });`;
const hover = async () => { const p = js(`(() => { const f = document.getElementById('site-frame'), r = f.contentDocument.querySelector('.page-section').getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 300, o.top + r.top + 120]); })()`); mouse(S, 'move', p[0], p[1]); await pause(400); };
const FRAME = `document.getElementById('site-frame')`;
js(`(async () => { ${blank} return 'true'; })()`); await pause(200);
await hover();
ours.bars = { hovered: js(labelsJs(FRAME)) };
ours.section = js(`(async () => { const w = (r) => new Promise((x) => setTimeout(x, r)); document.querySelector('#section-chrome [data-sc="edit"]').click(); await w(250);
  const p = document.getElementById('section-panel'); const out = {}; const label = (t) => t.textContent.replace(/\\s+/g, ' ').trim();
  for (const name of [...p.querySelectorAll('[role=tab]')].filter((e) => e.getBoundingClientRect().width > 1).map(label)) { [...p.querySelectorAll('[role=tab]')].find((t) => label(t) === name).click(); await w(180); out[name] = JSON.parse(${rowsJs(`document.getElementById('section-panel')`)}); }
  return JSON.stringify(out); })()`);
goto(S, `${BASE}/index.html`); await pause(1500); js(`(async () => { ${blank} return 'true'; })()`); await pause(200);
await hover();
const before = new Set(js(labelsJs(FRAME)));
js(`(() => { document.querySelector('[data-sc="add-section-below"]').click(); return 'true'; })()`); await pause(400);
ours.bars.addSectionMenu = js(labelsJs(FRAME)).filter((l) => !before.has(l));
goto(S, `${BASE}/index.html`); await pause(1500); js(`(async () => { ${blank} fe.setBp('mobile'); return 'true'; })()`); await pause(300);
await hover();
ours.bars.phoneHovered = js(labelsJs(FRAME));

// What's written down: one document per item and per finding, but the walk itself. A name is known only with its type in the same document.
const items = JSON.parse(readFileSync(here('parity/items.json'), 'utf8'));
const docs = [...(Array.isArray(items) ? items : items.items).map((i) => JSON.stringify(i)), ...readdirSync(here('parity/findings')).filter((f) => f !== 'CAP-COVERAGE.json' && f !== 'UNREAD.json').map((f) => `${f} ${readFileSync(here(`parity/findings/${f}`), 'utf8')}`)].map((t) => ` ${norm(t)} `);
const known = (where, n) => { const type = norm(where.replace(/ phone$/, '').replace(/ panel$/, '')); return docs.some((d) => d.includes(` ${n} `) && d.includes(` ${type} `)); };
// An oracle row called Scale and ours called Scale X are the same row, read at a different depth.
// A long name can run into the next words where a line break was.
const same = (a, b) => a === b || b.startsWith(`${a} `) || a.startsWith(`${b} `) || (a.length >= 15 && b.length >= 15 && (a.startsWith(b) || b.startsWith(a)));

const tabsOf = (o) => o.tabs && Object.keys(o.tabs).length ? o.tabs : o.noTabs ? { '(one view)': o.noTabs } : {};
const flat = (tabs) => Object.values(tabs).flatMap((r) => (Array.isArray(r) ? r : []));
const rowsOf = (where, oTabs, uTabs, list) => {
  const uAll = names(flat(uTabs)).map((r) => norm(r.n)), oAll = names(flat(oTabs)).map((r) => norm(r.n));
  for (const [tab, rows] of Object.entries(oTabs)) {
    if (!Array.isArray(rows)) { list.unread.push({ where: `${where} > ${tab}`, name: '(tab not read)' }); continue; }
    for (const r of names(rows)) {
      const n = norm(r.n);
      if (uAll.some((u) => same(n, u))) {
        const u = names(flat(uTabs)).find((x) => norm(x.n) === n);
        if (u && r.k.length && u.k.length && !r.k.some((k) => u.k.includes(k))) list.kinds.push({ where: `${where} > ${tab}`, name: r.n, oracle: r.k, ours: u.k });
        if (u?.off) list.oursOff.push({ where: `${where} > ${tab}`, name: r.n });
        continue;
      }
      if (isProse(r)) { list.proseOnlyOracle.push({ where: `${where} > ${tab}`, name: r.n }); continue; }
      (known(where, n) ? list.namedNotOurs : list.unread).push({ where: `${where} > ${tab}`, name: r.n, kinds: r.k });
    }
  }
  for (const [tab, rows] of Object.entries(uTabs)) {
    if (!Array.isArray(rows)) continue;
    for (const r of names(rows)) {
      if (oAll.some((o) => same(o, norm(r.n)))) continue;
      (isProse(r) ? list.proseOnlyOurs : list.oursOnly).push({ where: `${where} > ${tab}`, name: r.n, kinds: r.k });
    }
  }
};

const list = { unread: [], namedNotOurs: [], oursOnly: [], proseOnlyOracle: [], proseOnlyOurs: [], tabs: [], toolbar: [], bars: [], kinds: [], oursOff: [] };
let matched = 0;
for (const [T, o] of Object.entries(ORACLE.types)) {
  const u = ours.types[T], oTabs = tabsOf(o), uTabs = tabsOf(u);
  if (Object.keys(oTabs).join() !== Object.keys(uTabs).join()) list.tabs.push({ type: T, oracle: Object.keys(oTabs), ours: Object.keys(uTabs), dialog: o.dialog || undefined });
  rowsOf(T, oTabs, uTabs, list);
  if (o.phone) { const op = tabsOf(o.phone), up = tabsOf(ours.phone[T]); if (Object.keys(op).join() !== Object.keys(up).join()) list.tabs.push({ type: `${T} phone`, oracle: Object.keys(op), ours: Object.keys(up) }); rowsOf(`${T} phone`, op, up, list); }
  const ot = (o.toolbar || []).slice(0, 12).filter((x) => /^(Edit|Open link|Align|Pin|Duplicate|Remove|Fill|Stretch|Image|Replace|Crop|Design|Animation|Arrange|Layer)/.test(x));
  const ut = (u.toolbar || []);
  const nt = new Set(ut.map(norm));
  const missing = ot.filter((x) => !nt.has(norm(x)));
  if (missing.length) list.toolbar.push({ type: T, oracleOnly: missing, ours: ut });
  if (o.phone) { const pm = (o.phone.toolbar || []).filter((x) => /^(Edit|Open link|Align|Pin|Remove|Move|Bring|Send)/.test(x)), pu = new Set((ours.phone[T].toolbar || []).map(norm)), pmiss = pm.filter((x) => !pu.has(norm(x))); if (pmiss.length) list.toolbar.push({ type: `${T} phone`, oracleOnly: pmiss, ours: ours.phone[T].toolbar }); }
  matched += names(flat(oTabs)).filter((r) => names(flat(uTabs)).some((x) => same(norm(r.n), norm(x.n)))).length;
}
if (ORACLE.chrome?.sectionPanel?.tabs) rowsOf('Section panel', ORACLE.chrome.sectionPanel.tabs, ours.section, list);
// The bars by name, from Save on: what comes before it is the site's own sidebar, and what's in a blank page's header and footer isn't a bar.
const barsOf = (l) => { const i = (l || []).indexOf('Save'), j = (l || []).indexOf('Skip to Content'); return (i < 0 ? l || [] : l.slice(i, j < 0 ? undefined : j)).filter((x) => x); };
const barDiff = (where, o, u) => { const nu = u.map(norm), no = o.map(norm); list.bars.push(...o.filter((x) => !nu.includes(norm(x))).map((name) => ({ where, side: 'oracle only', name })), ...u.filter((x) => !no.includes(norm(x))).map((name) => ({ where, side: 'ours only', name }))); };
barDiff('Hovered section', barsOf(ORACLE.chrome?.hoveredSection), barsOf(ours.bars.hovered));
barDiff('Hovered section, phone', barsOf(ORACLE.chrome?.phoneHovered), barsOf(ours.bars.phoneHovered));
// The oracle's menu list leaves out names the sidebar has too, so those can't count as ours alone.
const side = new Set((ORACLE.chrome?.hoveredSection || []).map(norm));
barDiff('Add Section menu', ORACLE.chrome?.addSectionMenu || [], ours.bars.addSectionMenu.filter((x) => !side.has(norm(x))));

// Why a bar name differs and stays (U9, difference 78).
const BAR_WHY = { 'Edit Site Header': 'out of scope, 0005', 'AI Terms': 'out of scope, 0005', Small: "the oracle has this button with no name (CAP-ADDSECTIONVIEWS.json, CAP-U9BARNAMES.json); ours names it", Medium: "the oracle has this button with no name (CAP-ADDSECTIONVIEWS.json, CAP-U9BARNAMES.json); ours names it", Large: "the oracle has this button with no name (CAP-ADDSECTIONVIEWS.json, CAP-U9BARNAMES.json); ours names it", 'Drag to change the row count': "the oracle has a row-resize handle here with no name (CAP-U9BARNAMES.json); ours names it" };
for (const b of list.bars) if (BAR_WHY[b.name]) b.why = BAR_WHY[b.name];

if (process.env.COVERAGE_DUMP) writeFileSync(process.env.COVERAGE_DUMP, JSON.stringify(ours));
// The list by use: a row is a control, a heading (perhaps a control the reader can't name), a state, or something only an outside service or a site-wide list can answer.
const OUTSIDE = /^(SET UP|ADD EXISTING SCHEDULE|Get started with Acuity|CREATE NEW PRODUCT|Set Up Payment Processor|Funds|General Fund|Fund Dropdown Label|Connected Account|Choose an account|Add an Account|Join Tock|ALREADY A CUSTOMER|OpenTable Restaurant ID|Registry Name|Band Name|Enter a SoundCloud|Squarespace|Other Storage Options|Podcast|Additional Terms|Privacy Policy|Additional Storage|Google reCAPTCHA|MANAGE SUBMISSIONS|Export Form Submissions|Color Theme Editor)/;
const STATE = /^(There (are|is) no|No (collections|metadata|items)|Press \+ to get started|here$|Pages$|Index$)/;
const classOf = (r) => (OUTSIDE.test(r.n) ? 'outside' : STATE.test(r.n) ? 'state' : isProse(r) ? 'help' : r.k.length ? 'control' : 'heading');
const standin = new Set(list.oursOnly.filter((x) => norm(x.name) === 'shape style' && !/phone/.test(x.where)).map((x) => x.where.split(' > ')[0]));
// Rows every type's panel has (block design, T15). On a stand-in they're not this block's own.
const COMMON = /^(Background|Stroke|Stroke Color|Blend Mode|Blur|Transforms|Opacity|Rotate|Scale|Offset|Skew|Anchor|Position|Triggers|Add a new animation)\b/;
const tiles = {};
for (const [T, o] of Object.entries(ORACLE.types)) {
  const oT = tabsOf(o), uT = tabsOf(ours.types[T]), uN = names(flat(uT)).map((r) => norm(r.n));
  const t = tiles[T] = { standin: standin.has(T) || undefined, dialog: o.dialog || undefined, oracleTabs: Object.keys(oT), oursTabs: Object.keys(uT), control: [], heading: [], outside: [], state: [], help: 0, matched: 0, common: 0, oursOff: [] };
  for (const r of names(flat(oT))) {
    const c = classOf(r), has = uN.some((u) => same(norm(r.n), u));
    if (c === 'help') { if (!has) t.help++; continue; }
    // On a stand-in a name that matches is a Shape's row: it says nothing of this block's own.
    if (has && !t.standin) { t.matched++; if (names(flat(uT)).find((x) => norm(x.n) === norm(r.n))?.off) t.oursOff.push(r.n); continue; }
    if (t.standin && COMMON.test(r.n)) { t.common++; continue; }
    t[c].push(c === 'control' ? `${r.n} (${r.k.join(', ')})` : r.n);
  }
}
const byKind = {}; for (const t of Object.values(tiles)) for (const c of t.control) { const k = c.match(/\(([^,)]+)/)?.[1] || '?'; byKind[k] = (byKind[k] || 0) + 1; }
const summary = { note: 'Desktop. On a stand-in every oracle row counts: ours shows a Shape\'s rows there.', controls: Object.values(tiles).reduce((a, t) => a + t.control.length, 0), headings: Object.values(tiles).reduce((a, t) => a + t.heading.length, 0), outside: Object.values(tiles).reduce((a, t) => a + t.outside.length, 0), states: Object.values(tiles).reduce((a, t) => a + t.state.length, 0), byKind, tiles };

const counts = Object.fromEntries(Object.entries(list).map(([k, v]) => [k, v.length]));
const result = { check: 'coverage', oracleCaptured: ORACLE.capturedAt, matched, counts, summary, ...list };
if (STORE) { writeFileSync(LIST, `${JSON.stringify(result, null, 1)}\n`); console.log('stored', JSON.stringify(counts), 'matched', matched); process.exit(0); }
if (!existsSync(LIST)) { console.log('coverage-check: nothing stored', JSON.stringify(counts)); process.exit(2); }
const old = JSON.parse(readFileSync(LIST));
const key = (x) => JSON.stringify(x);
let moved = 0;
for (const k of Object.keys(list)) {
  const a = new Set(old[k].map(key)), b = new Set(list[k].map(key));
  for (const x of b) if (!a.has(x)) { moved++; console.log(`NEW ${k}: ${x}`); }
  for (const x of a) if (!b.has(x)) { moved++; console.log(`GONE ${k}: ${x}`); }
}
console.log(`coverage: ${moved} moved from the stored list. Now ${JSON.stringify(counts)}, matched ${matched}`);
process.exit(moved ? 1 : 0);
