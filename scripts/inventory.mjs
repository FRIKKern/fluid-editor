// Discovery: what does the oracle editor show that ours does not? Drive the oracle and our
// editor through the same states, list every visible control and label of the editor chrome
// (never page content), and diff the two lists per state. Each missing label is looked up in
// parity/items.json: an item that names it means "tracked", otherwise it is UNTRACKED. A label
// ours only has in its side panel is "side panel only". Screenshots of both go to --shots
// (outside the repo, O2). Writes parity/inventory.json; `npm run missing` renders
// docs/MISSING.md from it.
// Usage: node scripts/inventory.mjs [--shots dir] [--only state,state]
// The oracle must be open in edit mode on the demo page; nothing is saved (O1).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { evalJs, goto, viewport, pause, waitFor, screenshot, requireWebKit } from './lib/cmux.mjs';
import { BUTTON } from './oracle/snippets.mjs';
import { select, click, escape, deselect, hoverSection, blockIds } from './oracle/ui.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const O = process.env.ORACLE_SURFACE || 'surface:40';
const U = process.env.FLUID_SURFACE || 'surface:59';
const shots = arg('shots', null);
const only = (arg('only', '') || '').split(',').filter(Boolean);
requireWebKit(U, 'the inventory');
if (shots) mkdirSync(shots, { recursive: true });
const ours = 'http://127.0.0.1:5178/index.html';

// ---------- collecting ----------
// Every visible control (button, input, tab, menu item, ...) and every short leaf text outside
// controls, in the editor window and in the canvas frame, skipping page content.
const COLLECT = `(() => {
  const f = document.querySelector('#sqs-site-frame, #site-frame');
  const docs = [[document, window, 'top']]; if (f && f.contentDocument) docs.push([f.contentDocument, f.contentWindow, 'frame']);
  const CONTROL = 'button, a[href], input, select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=checkbox], [role=radio], [role=switch], [role=option], [role=slider], [role=combobox]';
  const SKIP = '[data-dev], [data-unbuilt], .sqs-block-content, .sqs-html-content, header#header, header.site-header, .header-inner, footer, #footer-sections, [data-section-id] .content-wrapper p, script, style, #site-frame, #sqs-site-frame';
  const out = new Map();
  for (const [d, W, where] of docs) {
    // Visible means on screen, not hidden by any ancestor's opacity or visibility, and the
    // topmost element at its centre (so a sidebar behind the canvas does not count).
    const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false; if (q.bottom < 0 || q.top > W.innerHeight || q.right < 0 || q.left > W.innerWidth) return false;
      if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
      const c = W.getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none' || Number(c.opacity) <= 0.05) return false;
      const x = Math.min(Math.max(q.left + q.width / 2, 0), W.innerWidth - 1), y = Math.min(Math.max(q.top + q.height / 2, 0), W.innerHeight - 1);
      const top = d.elementFromPoint(x, y); if (!top) return false;
      if (top === e || e.contains(top) || top.contains(e)) return true;
      // An element over the canvas frame is checked in the frame's own document.
      return where === 'frame' && false; };
    const clean = (t) => (t || '').replace(/\\s+/g, ' ').trim();
    const panelOf = (e) => (e.closest('#panel') ? 'panel' : where);
    for (const e of d.querySelectorAll(CONTROL)) {
      if (e.closest(SKIP) || !vis(e)) continue;
      const label = clean(e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || e.textContent).slice(0, 48);
      const kind = e.getAttribute('role') || (e.tagName === 'INPUT' ? 'input:' + e.type : e.tagName.toLowerCase());
      if (label) out.set('c|' + label.toLowerCase(), { kind: 'control', role: kind, label, where: panelOf(e) });
    }
    for (const e of d.querySelectorAll('body *')) {
      if (e.childElementCount || e.closest(SKIP) || e.closest(CONTROL) || !vis(e)) continue;
      const t = clean(e.textContent);
      if (t.length < 2 || t.length > 48 || /^[\\d.,:%°px +-]+$/.test(t)) continue;
      if (!out.has('c|' + t.toLowerCase())) out.set('t|' + t.toLowerCase(), { kind: 'text', label: t, where: panelOf(e) });
    }
  }
  return JSON.stringify([...out.values()]);
})()`;

const shot = (surface, name) => { if (shots) screenshot(surface, `${shots}/${name}.png`); };

// ---------- the oracle ----------
const oframe = `const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;`;
const oSave = () => evalJs(O, `(() => JSON.stringify([...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save')?.disabled))()`);
const oCmuxClick = async (find, wait = 1500) => { try { await click(find, { wait }); return true; } catch { return false; } };
const oByLabel = (label, maxW = 2000) => `() => [...document.querySelectorAll('button, [role=button], [role=tab]')].find((x) => [x.getAttribute('aria-label'), x.textContent.trim()].includes(${JSON.stringify(label)}) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < ${maxW})`;
const oSectionButton = (i, re) => `() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => ${re}.test((x.getAttribute('aria-label') || '') + ' ' + x.textContent) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 70 && y <= fr.top + sec.bottom; }); }`;
// The editor must be in edit mode on the demo page. If it is on another page, or out of
// edit mode (a panel or the preview took over), go back the way a person would: Exit (only
// when nothing is unsaved), the page in the sidebar, then Edit.
const PAGE_TITLE = 'How Fluid Engine works';
const oInfo = () => evalJs(O, `(() => { const d = document.getElementById('sqs-site-frame')?.contentDocument; return JSON.stringify({ save: [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save')?.disabled,
  title: [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.getBoundingClientRect().top < 50 && e.getBoundingClientRect().left > 500 && e.getBoundingClientRect().left < 1000).map((e) => e.textContent.trim()).join(' / '),
  editing: d ? d.querySelectorAll('.fluid-engine.is-editing').length : 0 }); })()`);
async function oEnsureDemo() {
  let s = oInfo();
  if (s.editing && s.title.includes(PAGE_TITLE)) return;
  if (s.save === false) throw new Error('The oracle has unsaved changes; stopping (O1)');
  if (s.editing) await oCmuxClick(oByLabel('Exit'), 3500);
  s = oInfo();
  // Exit can land on the dashboard: the page list with our page lives at /config/pages.
  const linkVisible = () => evalJs(O, `(() => JSON.stringify(!![...document.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(PAGE_TITLE)} && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left < 400)))()`);
  if (!s.title.includes(PAGE_TITLE) && linkVisible() !== true) {
    goto(O, 'https://halibut-keyboard-jlhd.squarespace.com/config/pages');
    for (let k = 0; k < 20 && linkVisible() !== true; k++) await pause(1000);
  }
  if (!s.title.includes(PAGE_TITLE)) {
    await oCmuxClick(`() => [...document.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(PAGE_TITLE)} && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left < 400)[0]`, 5000);
  }
  if (!oInfo().editing) await oCmuxClick(oByLabel('Edit', 120), 6000);
  s = oInfo();
  if (!(s.editing && s.title.includes(PAGE_TITLE))) throw new Error(`could not open ${PAGE_TITLE} in edit mode (${JSON.stringify(s)})`);
}
async function oReset() {
  // Close menus with a real key press, then make sure the editor is editing the demo page.
  for (let k = 0; k < 2; k++) { try { execFileSync('cmux', ['browser', '--surface', O, 'press', 'Escape']); } catch {} await pause(300); }
  // The full-screen preview and the Site Styles panel have their own close buttons.
  for (const label of ['Close full screen preview', 'Toggle preview mode']) {
    if (evalJs(O, `(() => JSON.stringify(!![...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)} && x.getAttribute('aria-pressed') !== 'false' && x.getBoundingClientRect().width > 0 && ${label === 'Close full screen preview'})))()`) === true) await oCmuxClick(oByLabel(label), 1500);
  }
  await oEnsureDemo();
  for (let k = 0; k < 3; k++) await escape();
  for (const i of [0, 2]) await deselect(i);
  if (evalJs(O, `(() => JSON.stringify(!![...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Desktop View' && x.getAttribute('aria-pressed') === 'false')))()`) === true) await oCmuxClick(oByLabel('Desktop View'), 2500);
  if (oSave() === false) {
    let n = 0; while (n < 8 && oSave() === false && evalJs(O, BUTTON('Undo')) === true) { n++; await pause(900); }
    if (oSave() === false) throw new Error('The oracle has unsaved changes; stopping (O1)');
  }
}
const oShift = (i, id) => evalJs(O, `(() => { ${oframe} const b = d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]'); const q = b.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, composed: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', view: W, shiftKey: true };
  for (const t of ['pointerdown', 'mousedown']) b.dispatchEvent(new (t.startsWith('pointer') ? W.PointerEvent : W.MouseEvent)(t, { ...o, buttons: 1 }));
  for (const t of ['pointerup', 'mouseup', 'click']) b.dispatchEvent(new (t.startsWith('pointer') ? W.PointerEvent : W.MouseEvent)(t, { ...o, buttons: 0 })); return 'true'; })()`);

// Squarespace's editor ignores hovers and clicks while its tab is hidden: wait for it to be
// on screen (up to 20 minutes) before each oracle state.
async function oVisible() {
  for (let k = 0; k < 80; k++) {
    if (evalJs(O, '(() => JSON.stringify(document.visibilityState))()') === 'visible') return;
    if (k === 0) console.log('  the oracle tab is hidden; waiting for it to be on screen');
    await pause(15000);
  }
  throw new Error('the oracle tab stayed hidden for 20 minutes');
}
// What each state should show on the oracle once reached; a state that does not show it is
// "not reached" and adds no gaps.
const seen = (label) => `(() => { const L = ${JSON.stringify(label)}; const f = document.querySelector('#sqs-site-frame'); const docs = [document]; if (f && f.contentDocument) docs.push(f.contentDocument);
  return JSON.stringify(docs.some((d) => [...d.querySelectorAll('body *')].some((e) => e.getBoundingClientRect().width > 0 && ((e.getAttribute('aria-label') || '') === L || (e.getAttribute('placeholder') || '') === L || (e.childElementCount === 0 && e.textContent.trim() === L))))); })()`;
const EXPECT = {
  'section-hover': 'View Layouts', 'section-design': 'Row Count', 'section-background': 'Background Width', 'section-colors': 'Lightest 1',
  'add-block-menu': 'Essentials', layers: 'Layers', 'text-selected': 'Write', 'text-writing': 'Text Style', 'text-edit-design': 'Opacity',
  'text-edit-animation': 'Animation', 'shape-selected': 'Pin', 'shape-edit': 'Opacity', 'button-selected': 'Pin', 'button-edit': 'Opacity',
  'group-selected': 'Align Group', 'block-context-menu': 'Hide on desktop', 'phone-text-selected': 'Move Up', 'text-style-menu': 'Heading 1',
  'text-align-menu': 'Text Alignment',
};

// ---------- ours ----------
const run = (js) => evalJs(U, `(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
  const secEl = (k) => d.querySelectorAll('section.page-section')[k]; const sid = (k) => secEl(k).dataset.sectionId; const bid = (k, n) => secEl(k).querySelectorAll('.fe-block')[n].dataset.blockId;
  const hover = async (k) => { const s = secEl(k); W.scrollTo(0, W.scrollY + s.getBoundingClientRect().top - 120); await sleep(150); const q = s.getBoundingClientRect(); s.dispatchEvent(new W.PointerEvent('pointermove', { bubbles: true, clientX: q.left + q.width / 2, clientY: Math.min(q.bottom - 20, q.top + 260) })); await sleep(150); };
  const pick = async (k, n) => { const s = secEl(k); W.scrollTo(0, W.scrollY + s.getBoundingClientRect().top - 120); await sleep(150); fe.select(sid(k), bid(k, n)); await sleep(150); };
  const press = async (sel) => { const e = document.querySelector(sel); if (!e) return false; e.click(); await sleep(200); return true; };
  ${js}; return 'true'; })()`);
async function uReset() {
  viewport(U, 1880, 1000);
  goto(U, ours); await pause(1200);
  evalJs(U, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(U, ours); await pause(2200);
  waitFor(U, '(() => !!window.fe)()', 20);
}

// ---------- states ----------
// [name, what it is, oracle driver, our driver]
const S2 = 2; // the demo section with a heading, a paragraph and a shape
const STATES = [
  ['idle', 'Edit mode, nothing selected', async () => {}, ''],
  ['section-hover', 'Pointer over a section', async () => { await hoverSection(S2); }, `await hover(${S2})`],
  ['section-design', 'Edit Section, Design tab', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/edit section|open section settings/i'), 1800); }, `await hover(${S2}); await press('#section-chrome [data-sc="edit"]')`],
  ['section-background', 'Edit Section, Background tab', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/edit section|open section settings/i'), 1800); await oCmuxClick(oByLabel('Background'), 1200); }, `await hover(${S2}); await press('#section-chrome [data-sc="edit"]'); await press('#section-panel [data-sact="tab"][data-v="Background"]')`],
  ['section-colors', 'Edit Section, Colors tab', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/edit section|open section settings/i'), 1800); await oCmuxClick(oByLabel('Colors'), 1200); }, `await hover(${S2}); await press('#section-chrome [data-sc="edit"]'); await press('#section-panel [data-sact="tab"][data-v="Colors"]')`],
  ['add-block-menu', 'Add Block menu of a section', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/^\\s*add block\\s*$/i'), 1500); }, `await hover(${S2}); await press('#section-chrome [data-sc="add-block"]')`],
  ['layers', 'Layers panel of a section', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/open layers panel/i'), 1500); }, `await hover(${S2}); await press('#section-chrome [data-sc="layers"]')`],
  ['text-selected', 'A text block selected', async () => { await select(S2, blockIds(S2)[1]); }, `await pick(${S2}, 1)`],
  ['text-writing', 'Writing in a text block, a word selected', async () => {
    const id = blockIds(S2)[1]; await select(S2, id); await oCmuxClick(oByLabel('Write', 80), 1500);
    evalJs(O, `(() => { ${oframe} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror'); if (!pm) return 'false'; pm.focus(); const t = pm.querySelector('p').firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); return 'true'; })()`);
    await pause(900); }, `await pick(${S2}, 1); await press('#block-toolbar [data-tb="write"]'); { const ce = d.querySelector('[contenteditable=true]'); const t = ce.querySelector('p').firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); }`],
  ['text-edit-design', 'Text block Edit panel, Design tab', async () => { await select(S2, blockIds(S2)[1]); await oCmuxClick(oByLabel('Edit', 80), 1800); await oCmuxClick(oByLabel('Design'), 1200); }, `await pick(${S2}, 1); await press('#block-toolbar [data-tb="edit"]')`],
  ['text-edit-animation', 'Text block Edit panel, Animation tab', async () => { await select(S2, blockIds(S2)[1]); await oCmuxClick(oByLabel('Edit', 80), 1800); await oCmuxClick(oByLabel('Animation'), 1200); }, `await pick(${S2}, 1); await press('#block-toolbar [data-tb="edit"]')`],
  ['shape-selected', 'A shape block selected', async () => { await select(S2, blockIds(S2)[2]); }, `await pick(${S2}, 2)`],
  ['shape-edit', 'Shape block Edit panel', async () => { await select(S2, blockIds(S2)[2]); await oCmuxClick(oByLabel('Edit', 80), 1800); }, `await pick(${S2}, 2); await press('#block-toolbar [data-tb="edit"]')`],
  ['button-selected', 'A button block selected', async () => { await select(0, blockIds(0)[2]); }, `await pick(0, 2)`],
  ['button-edit', 'Button block Edit panel', async () => { await select(0, blockIds(0)[2]); await oCmuxClick(oByLabel('Edit', 80), 1800); }, `await pick(0, 2); await press('#block-toolbar [data-tb="edit"]')`],
  ['group-selected', 'Two blocks selected with Shift', async () => { await select(S2, blockIds(S2)[0]); oShift(S2, blockIds(S2)[1]); await pause(900); }, `await pick(${S2}, 0); { const b = d.querySelector('.fe-block[data-block-id="' + bid(${S2}, 1) + '"]'); const q = b.getBoundingClientRect(); const o = { bubbles: true, cancelable: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 0, pointerId: 1, isPrimary: true, shiftKey: true }; b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 })); d.documentElement.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 })); await sleep(200); }`],
  ['block-context-menu', 'Right-click on a selected block', async () => { const id = blockIds(S2)[2]; await select(S2, id); evalJs(O, `(() => { ${oframe} const b = d.querySelector('.fe-block[data-block-id="${id}"]'); const q = b.getBoundingClientRect(); b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 40, clientY: q.top + 40, button: 2, view: W })); return 'true'; })()`); await pause(900); },
    `await pick(${S2}, 2); { const b = d.querySelector('.fe-block[data-block-id="' + bid(${S2}, 2) + '"]'); const q = b.getBoundingClientRect(); b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 40, clientY: q.top + 40, button: 2 })); await sleep(200); }`],
  ['phone-idle', 'Phone layout, nothing selected', async () => { await oCmuxClick(oByLabel('Mobile View'), 2500); }, `fe.setBp('mobile'); await sleep(300)`],
  ['phone-text-selected', 'Phone layout, a text block selected', async () => { await oCmuxClick(oByLabel('Mobile View'), 2500); await select(S2, blockIds(S2)[1]); }, `fe.setBp('mobile'); await sleep(300); await pick(${S2}, 1)`],
  ['preview', 'Preview mode (top bar)', async () => { await oCmuxClick(oByLabel('Toggle preview mode'), 2000); }, `await press('#preview')`],
  ['add-section-menu', 'Add Section on a section edge', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/^\s*add section\s*$/i'), 1800); }, `await hover(${S2}); await press('#section-chrome [data-sc="add-section-below"]')`],
  ['view-layouts', 'View Layouts of a section', async () => { await hoverSection(S2); await oCmuxClick(oSectionButton(S2, '/view layouts/i'), 1800); }, `await hover(${S2}); await press('#section-chrome [data-sc="layouts"]')`],
  ['button-link', 'Link popover of a button block', async () => { await select(0, blockIds(0)[2]); await oCmuxClick(oByLabel('Open link editor popover', 80), 1500); }, `await pick(0, 2)`],
  ['phone-section-hover', 'Phone layout, pointer over a section', async () => { await oCmuxClick(oByLabel('Mobile View'), 2500); await hoverSection(S2); }, `fe.setBp('mobile'); await sleep(300); await hover(${S2})`],
  ['text-style-menu', 'Writing, the Text Style menu open', async () => { const id = blockIds(S2)[1]; await select(S2, id); await oCmuxClick(oByLabel('Write', 80), 1500); await oCmuxClick(oByLabel('Text Style'), 1200); },
    `await pick(${S2}, 1); await press('#block-toolbar [data-tb="write"]'); await press('#text-bar [data-fmt="style-menu"]')`],
  ['text-align-menu', 'Writing, the Text Alignment menu open', async () => { const id = blockIds(S2)[1]; await select(S2, id); await oCmuxClick(oByLabel('Write', 80), 1500); await oCmuxClick(oByLabel('Text Alignment'), 1200); },
    `await pick(${S2}, 1); await press('#block-toolbar [data-tb="write"]'); await press('#text-bar [data-fmt="align-menu"]')`],
  ['text-link', 'Writing, the Link popover open', async () => { const id = blockIds(S2)[1]; await select(S2, id); await oCmuxClick(oByLabel('Write', 80), 1500); await oCmuxClick(oByLabel('Link'), 1200); },
    `await pick(${S2}, 1); await press('#block-toolbar [data-tb="write"]'); await press('#text-bar [data-fmt="link"]')`],
  ['text-color', 'Writing, the Text Color popover open', async () => { const id = blockIds(S2)[1]; await select(S2, id); await oCmuxClick(oByLabel('Write', 80), 1500); await oCmuxClick(oByLabel('Text Color'), 1200); },
    `await pick(${S2}, 1); await press('#block-toolbar [data-tb="write"]'); await press('#text-bar [data-fmt="color"]')`],
  ['site-styles', 'Site Styles panel (top bar)', async () => { await oCmuxClick(oByLabel('Toggle Site Styles editing'), 2000); }, `await press('[aria-label="Toggle Site Styles editing"]')`],
];

// ---------- coverage ----------
const items = JSON.parse(readFileSync(new URL('../parity/items.json', import.meta.url), 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Coverage. An item lists the oracle labels it covers in `controls` (exact, case-insensitive):
// those are "tracked". A label whose whole phrase only appears in an item's text is
// "mentioned" (probably tracked, worth a look). Anything else is UNTRACKED: a gap nobody wrote
// down. A label named in an item's outOfScope list is "out of scope".
function trackedBy(label) {
  const l = label.toLowerCase();
  const phrase = new RegExp(`(^|[^a-z0-9])${esc(l)}([^a-z0-9]|$)`);
  const listed = items.filter((it) => (it.controls || []).some((c) => c.toLowerCase() === l));
  const out = items.filter((it) => (it.outOfScope || []).some((o) => phrase.test(o.toLowerCase())));
  const said = l.length >= 4 ? items.filter((it) => phrase.test(`${it.title} ${it.evidence || ''}`.toLowerCase())) : [];
  return { listed: listed.map((i) => i.id), outOfScope: out.map((i) => i.id), mentioned: said.map((i) => i.id) };
}

// ---------- run ----------
const report = { capturedAt: new Date().toISOString().slice(0, 10), oracle: 'halibut-keyboard-jlhd.squarespace.com, demo page, 1600 by 1000 window', ours: 'app/index.html, canvas 1600 wide', states: [] };
const file = new URL('../parity/inventory.json', import.meta.url);
// The file is written after every state, so a failure later never loses what was measured.
// A partial run (--only) keeps the other states of the previous file.
const prev = (() => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return { states: [] }; } })();
function save() {
  const keep = only.length ? prev.states.filter((x) => !report.states.some((y) => y.name === x.name)) : [];
  const states = [...keep, ...report.states].sort((a, b) => STATES.findIndex((x) => x[0] === a.name) - STATES.findIndex((x) => x[0] === b.name));
  writeFileSync(file, JSON.stringify({ ...report, states }, null, 2) + '\n');
}
viewport(O, 1600, 1000);
await oVisible();
await oEnsureDemo();
viewport(O, 1600, 1000);
for (const [name, what, oDrive, uDrive] of STATES) {
  if (only.length && !only.includes(name)) continue;
  let oList = [], uList = [], error = null, oScroll = null;
  try {
    await oVisible();
    await oReset();
    await oVisible();
    await oDrive();
    await pause(700);
    if (EXPECT[name] && evalJs(O, seen(EXPECT[name])) !== true) throw new Error(`not reached: "${EXPECT[name]}" is not on screen`);
    oList = evalJs(O, COLLECT);
    oScroll = evalJs(O, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentWindow.scrollY))()`);
    shot(O, `${name}-oracle`);
  } catch (e) { error = `oracle: ${String(e.message).slice(0, 120)}`; }
  try {
    await uReset();
    if (uDrive) run(uDrive);
    // Same scroll as the oracle canvas, so the screenshots line up for scripts/visual-diff.mjs.
    if (oScroll != null) run(`W.scrollTo(0, ${oScroll}); await sleep(250)`);
    await pause(400);
    uList = evalJs(U, COLLECT);
    shot(U, `${name}-ours`);
  } catch (e) { error = (error ? error + '; ' : '') + `ours: ${String(e.message).slice(0, 120)}`; }
  const key = (x) => x.label.toLowerCase();
  const uCanvas = new Set(uList.filter((x) => x.where !== 'panel').map(key));
  const uPanel = new Set(uList.filter((x) => x.where === 'panel').map(key));
  const missing = oList.filter((x) => !uCanvas.has(key(x))).map((x) => {
    const t = trackedBy(x.label);
    const status = uPanel.has(key(x)) ? 'side panel only' : t.outOfScope.length ? 'out of scope' : t.listed.length ? 'tracked' : t.mentioned.length ? 'mentioned' : 'UNTRACKED';
    return { ...x, status, items: t.listed.length ? t.listed : t.mentioned.slice(0, 6), outOfScope: t.outOfScope };
  });
  const present = oList.length - missing.length;
  report.states.push({ name, what, oracle: oList.length, present, missing, error });
  save();
  console.log(`${name.padEnd(20)} oracle ${String(oList.length).padStart(3)} · ours has ${String(present).padStart(3)} · untracked ${missing.filter((m) => m.status === 'UNTRACKED').length}${error ? ` · ${error}` : ''}`);
}
await oReset().catch((e) => console.log('reset:', e.message));
save();
const all = report.states.flatMap((s) => s.missing);
console.log(`Inventory: ${report.states.length} states, ${all.length} oracle labels missing from our canvas, ${all.filter((m) => m.status === 'UNTRACKED').length} of them untracked`);
// Last: the oracle must have no unsaved work. A missing Save button means the editor is not
// in edit mode (nothing can be unsaved then); Save enabled means unsaved work (O1).
if (oSave() === false) throw new Error('The oracle has unsaved changes (O1)');
