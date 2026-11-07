// A row-by-row read of one tile's panel, unsaved, on a probe page: each row's name, kind and default, and what a change does
// to the block. It changes only the tile's own rows: a switch both ways, each choice, a menu's other options, a slider at
// three quarters, a text field by a few typed letters. It goes one level into a Navigate row, to read it, and comes back.
// It presses only what has a name, and reloads if a panel has no named way out. It never presses what REFUSE names or what UNREAD marks `no` on this tile. A tab whose note says it reaches further is read, nothing pressed.
// A field that can reach outside (URL, ID, name lookup, a service's name) isn't typed in, and the tile's presses stop there.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-rows.mjs --type Quote [--page 'Gestures Probe'] [--only Design] [--name CAP-ROWSQUOTE]
// Writes parity/findings/CAP-ROWS<TILE>.json after each tab, so a stop loses little.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { evalJs, pause, mouse, browser, goto } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { enterEdit, exitWithoutSaving, addSection, addBlock, sectionCount, escape, select } from './oracle/ui.mjs';
import { tabsJs } from './lib/panel-rows.mjs';
import { BACK_NAME, hasName, noRows, onNoList, reachesOut, WIDE_NOTE } from './lib/press-names.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('oracle-rows: set ORACLE_SURFACE=cdp:<port>'); process.exit(2); }
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const TYPE = opt('type'), PAGE = opt('page') || 'Gestures Probe', ONLY = opt('only');
if (!TYPE) { console.error('oracle-rows: --type'); process.exit(2); }
const NAME = opt('name') || `CAP-ROWS${TYPE.toUpperCase().replace(/[^A-Z]/g, '')}`;
const FILE = new URL(`../parity/findings/${NAME}.json`, import.meta.url);
const out = existsSync(FILE) ? JSON.parse(readFileSync(FILE)) : { item: 'T12', capturedAt: new Date().toISOString().slice(0, 10), question: `${TYPE}: each row's name, kind and default, and what a change does on the block.`, tile: TYPE, tabs: {}, errors: [] };
const save = () => writeFileSync(FILE, `${JSON.stringify(out, null, 1).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '(an email)').replace(/https?:\/\//g, '')}\n`);

// Never pressed, by name: what writes outside the block, reaches an account or a store, or takes a file.
const REFUSE = /reset|save|delete|remove|upload|replace|create|connect|account|manage|export|store|payment|learn more|set up|site style|form style|edit button|color theme|privacy|terms|add an image|add a new animation|add item|attach|duplicate|^close$|storage|podcast|^x$/i;
const READ_ONLY = process.argv.includes('--read-only');
// Rows every panel has: their defaults are read, block design has their rules (T15).
const COMMON = /^(Background|Stroke|Stroke Color|Blend Mode|Blur|Transforms|More actions|Opacity|Rotate|Scale|Offset|Skew|Anchor|Position|Triggers|Animation list actions|Add a new animation|Fill|Thickness|Corner)\b/;
// UNREAD's `no` rows for this tile: never pressed or typed in.
const NO = noRows(JSON.parse(readFileSync(new URL('../parity/findings/UNREAD.json', import.meta.url), 'utf8')), TYPE);
let stoppedAt = null;

const js = (b) => evalJs(S, b);
const FRAME = `document.getElementById('sqs-site-frame')`;
const PANEL = `(() => { const t = [...document.querySelectorAll('[role=tab]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && !x.closest('#sqs-site-frame') && q.left > 100; }).pop(); if (!t) return null; let p = t; while (p.parentElement && p.parentElement.getBoundingClientRect().width <= 700 && p.parentElement.getBoundingClientRect().height <= 960 && !p.parentElement.querySelector('#sqs-site-frame')) p = p.parentElement; return p; })()`;
// Every control in the panel in page order, with the row it's under. Kept on window for a press by number.
// A way in hides the tabs, so the panel found while they showed is kept.
const ROOT = `(() => { const p = ${PANEL}; if (p) window.__panel = p; return window.__panel && window.__panel.isConnected ? window.__panel : null; })()`;
const CONTROLS = `(() => { const root = ${ROOT}; window.__ctl = []; if (!root) return JSON.stringify(null); const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none'; };
  const kindOf = (e) => { const r = e.getAttribute('role'), t = e.tagName, ty = e.type; if (r === 'radio' || ty === 'radio') return 'choice'; if (r === 'switch' || r === 'checkbox' || ty === 'checkbox') return 'switch'; if (r === 'slider' || ty === 'range') return 'slider'; if (t === 'SELECT' || r === 'combobox' || e.getAttribute('aria-haspopup')) return 'menu'; if (t === 'TEXTAREA' || e.isContentEditable) return 'area'; if (t === 'INPUT') return 'field'; if (t === 'BUTTON' || r === 'button' || t === 'A') return 'button'; return null; };
  const out = []; let row = '';
  const walk = (e) => { if (!vis(e) || e.getAttribute('role') === 'tablist') return;
    if (e.getAttribute('role') === 'radiogroup') { const group = clean(e.getAttribute('aria-label')); if (group) row = group; [...e.querySelectorAll('[role=radio], input[type=radio]')].forEach((r, n) => { const t = vis(r) ? r : r.closest('label') || r.parentElement; window.__ctl.push(t); out.push({ i: window.__ctl.length - 1, row, kind: 'choice', name: clean(r.getAttribute('aria-label')) || clean(t.getAttribute('aria-label')) || clean(t.innerText) || 'option ' + (n + 1), value: r.getAttribute('aria-checked') === 'true' || r.checked === true }); }); return; }
    const k = e.querySelector('[role=tablist]') ? null : kindOf(e);
    if (k) { const lines = (e.innerText || '').split('\\n').map(clean).filter(Boolean); const name = clean(e.getAttribute('aria-label')) || (k === 'button' || k === 'menu' ? lines[0] : '') || clean(e.getAttribute('placeholder')) || '';
      const v = k === 'switch' ? (e.getAttribute('aria-checked') ?? (e.checked ? 'true' : 'false')) === 'true' : k === 'choice' ? (e.getAttribute('aria-checked') === 'true' || e.checked === true) : k === 'slider' ? (e.value ?? e.getAttribute('aria-valuenow')) : k === 'field' || k === 'area' ? (e.value ?? clean(e.textContent)) : k === 'menu' ? (e.tagName === 'SELECT' ? e.options[e.selectedIndex]?.text : lines[lines.length - 1]) : undefined;
      const nav = k === 'button' && /^navigate to /i.test(name);
      window.__ctl.push(e); const c = { i: window.__ctl.length - 1, row, kind: nav ? 'nav' : k, name: name || row, value: v }; if (k === 'slider') { c.min = e.min ?? e.getAttribute('aria-valuemin'); c.max = e.max ?? e.getAttribute('aria-valuemax'); c.step = e.step || undefined; } if (e.disabled || e.getAttribute('aria-disabled') === 'true') c.off = true; if (k === 'menu' && e.tagName === 'SELECT') c.options = [...e.options].map((o) => o.text); out.push(c); if (k !== 'choice') row = c.name; return; }
    const own = clean([...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ')); if (own) row = own.slice(0, 80);
    for (const c of e.children) walk(c); };
  for (const c of root.children) walk(c); return JSON.stringify(out); })()`;
const at = (i) => `window.__ctl[${i}]`;

// What the block is now: each element's class, inline style, words and box, and a few styles, in the frame.
const BLOCK = (id) => `(() => { const f = ${FRAME}, d = f.contentDocument, W = f.contentWindow, b = d.querySelector('.fe-block[data-block-id="${id}"]'); if (!b) return JSON.stringify(null); const o = {}; const P = ['color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'justifyContent', 'alignItems', 'backgroundColor', 'opacity', 'display', 'padding', 'gridTemplateColumns'];
  const all = [b, ...b.querySelectorAll('*')].filter((e) => !/sqs-editing-overlay|resizing|fe-handle|indicator/.test(String(e.className))).slice(0, 160);
  all.forEach((e, i) => { const c = W.getComputedStyle(e), q = e.getBoundingClientRect(), text = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), own = text.length > 60 ? text.slice(0, 28) + ' .. ' + text.slice(-28) : text; const s = {}; for (const p of P) s[p] = c[p]; const cl = String(e.className.baseVal ?? e.className).split(' ').filter((x) => x && !/^[A-Za-z0-9_-]{16,}$/.test(x)).join(' '); o[i + ':' + e.tagName] = { cl, st: (e.getAttribute('style') || '').slice(0, 200), w: own, b: [q.left, q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10).join(), ...s }; });
  return JSON.stringify({ n: all.length, area: W.getComputedStyle(b).gridArea, sec: b.closest('.fluid-engine') ? W.getComputedStyle(b.closest('.fluid-engine')).gridTemplateRows.split(' ').length : 0, els: o }); })()`;
// What changed, short: only the first dozen changes count, the rest are their echoes.
const diff = (a, b) => { if (!a || !b) return ['block gone']; const out = []; if (a.area !== b.area) out.push(`area ${a.area} > ${b.area}`); if (a.sec !== b.sec) out.push(`section rows ${a.sec} > ${b.sec}`); if (a.n !== b.n) out.push(`elements ${a.n} > ${b.n}`);
  for (const k of Object.keys(b.els)) { const x = a.els[k], y = b.els[k]; if (!x) { out.push(`new ${k.split(':')[1]} ${y.cl.slice(0, 40)} ${y.w}`.trim()); continue; } for (const p of Object.keys(y)) if (x[p] !== y[p]) out.push(`${k.split(':')[1]}${y.cl ? `.${y.cl.split(' ')[0]}` : ''} ${p}: ${String(x[p]).slice(0, 44)} > ${String(y[p]).slice(0, 44)}`); }
  return out.slice(0, 14); };

const read = () => js(CONTROLS);
let blockId = null, tabNow = null;
const blockNow = () => js(BLOCK(blockId));
const panelUp = () => js(tabsJs(PANEL)).length > 0;
const pressAt = (i, wait = 700) => pressOnTop(S, at(i), wait);
const tabEl = (t) => `[...(${PANEL}).querySelectorAll('[role=tab]')].find((x) => (x.getAttribute('aria-label') || x.textContent).replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t)})`;
async function openPanel() {
  if (panelUp()) return;
  const sel = js(`(() => { const b = ${FRAME}.contentDocument.querySelector('.fe-block[data-block-id="${blockId}"]'); return JSON.stringify(!!b && b.dataset.isSelected === 'true'); })()`);
  if (!sel) { await select(sectionCount() - 1, blockId); await pause(400); }
  const edit = `[...document.querySelectorAll('button,[role=button]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && !x.closest('#sqs-site-frame') && (x.getAttribute('aria-label') === 'Edit' || x.textContent.trim() === 'Edit'); }).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]`;
  await pressOnTop(S, edit, 1500);
  for (let w = 0; w < 6 && !panelUp(); w++) await pause(500);
}
async function toTab(t) { await openPanel(); if (js(`(() => JSON.stringify((${tabEl(t)})?.getAttribute('aria-selected') === 'true'))()`)) return; await pressOnTop(S, tabEl(t), 900); }
// Back in the panel, on the tab, after whatever a press did. Escape only if something sits on top of it.
async function settle(t) { const open = js(`(() => JSON.stringify([...document.querySelectorAll('[role=listbox],[role=menu],[role=dialog]')].some((x) => x.getBoundingClientRect().width > 1 && !x.contains(${PANEL}))))()`); if (open) { await escape(); await pause(300); } await toTab(t); }
// A row's heading can change after an earlier press, so a name that's unique on its own will do.
const find = (c) => { const l = read() || []; return l.find((x) => x.kind === c.kind && x.name === c.name && x.row === c.row) || (l.filter((x) => x.kind === c.kind && x.name === c.name).length === 1 ? l.find((x) => x.kind === c.kind && x.name === c.name) : undefined); };

// The panel's own Back, by its name. No named way back means a reload, not another press.
async function goBack(rec, t) {
  const back = js(`(() => { const r = ${ROOT}; if (!r) return JSON.stringify(null); const b = [...r.querySelectorAll('button,[role=button]')].filter((x) => x.getBoundingClientRect().width > 1).find((x) => new RegExp(${JSON.stringify(BACK_NAME.source)}, 'i').test((x.getAttribute('aria-label') || x.textContent).trim())); if (b) window.__back = b; return JSON.stringify(b ? (b.getAttribute('aria-label') || b.textContent).trim() : null); })()`);
  rec.back = back;
  if (back) await pressOnTop(S, `window.__back`, 800); else await startOver(t, rec);
}

// Stuck, or nothing named to press: a reload throws the unsaved block away. A new block on the same page, on the same tab.
async function startOver(t, rec) {
  if (rec) rec.reloaded = true;
  goto(S, js(`JSON.stringify(location.origin)`) + '/config/pages'); await pause(9000);
  await enterEdit(PAGE);
  if (!/-probe$/.test(js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`))) throw new Error('not on a probe page after a reload');
  await addSection();
  blockId = await addBlock(sectionCount() - 1, TYPE); await pause(1200); await escape(); await pause(300);
  await openPanel(); if (t) await toTab(t);
}

// The names of everything pressable that is really on top, outside the page frame.
const onTop = () => js(`(() => JSON.stringify([...new Set([...document.querySelectorAll('button,[role=button],[role=radio],[role=option],label,a,input')].filter((x) => { const q = x.getBoundingClientRect(); if (q.width < 2 || q.height < 2 || q.top < 56 || q.top >= innerHeight) return false; if (x.closest('#sqs-site-frame')) return false; const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!t && (t === x || x.contains(t) || t.contains(x)); }).map((x) => (x.getAttribute('aria-label') || x.textContent || x.title || x.getAttribute('placeholder') || x.tagName).replace(/\\s+/g, ' ').trim().slice(0, 60)))]))()`);

const tried = new Set();
async function changeRow(c, t, rec) {
  const before = blockNow();
  if (c.kind === 'switch') {
    await pressAt(c.i); rec.change = diff(before, blockNow()); await settle(t);
    const back = find(c); if (back && back.value !== c.value) { await pressAt(back.i); await settle(t); }
  } else if (c.kind === 'choice') {
    await pressAt(c.i); rec.change = diff(before, blockNow()); await settle(t);
    const home = (read() || []).find((x) => x.kind === 'choice' && x.row === c.row && x.name === rec.home);
    if (home) { await pressAt(home.i); await settle(t); }
  } else if (c.kind === 'slider') {
    const q = js(`(() => { const r = ${at(c.i)}.getBoundingClientRect(); return JSON.stringify([r.left + r.width * 0.75, r.top + r.height / 2]); })()`);
    mouse(S, 'move', q[0], q[1]); await pause(80); mouse(S, 'down', q[0], q[1], { buttons: 1 }); await pause(40); mouse(S, 'up', q[0], q[1]); await pause(700);
    rec.to = find(c)?.value; rec.change = diff(before, blockNow());
  } else if (c.kind === 'menu') {
    const seen = onTop(), rows0 = read() || [];
    await pressAt(c.i, 800);
    const opts = js(`(() => JSON.stringify([...document.querySelectorAll('[role=option],[role=menuitem],[role=menuitemradio]')].filter((x) => x.getBoundingClientRect().width > 1).map((x) => x.textContent.replace(/\\s+/g, ' ').trim())))()`);
    rec.options = opts;
    // No list of options: a view inside the panel, or a popover. Read what came, and close it the way it came.
    if (!opts.length) {
      rec.inside = (read() || []).map((x) => ({ row: x.row, kind: x.kind, name: x.name, value: x.value }));
      const now = onTop(); rec.opened = now.filter((x) => !seen.includes(x));
      const same = JSON.stringify(rows0.map((x) => x.name)) === JSON.stringify(rec.inside.map((x) => x.name));
      if (same && rec.opened.length) {
        // Scrolled out of sight still counts: every button beside the first one that came.
        rec.openedList = js(`(() => { const n = ${JSON.stringify(rec.opened[0])}; const e = [...document.querySelectorAll('button,[role=button],[role=radio],[role=option],label')].find((x) => !x.closest('#sqs-site-frame') && (x.getAttribute('aria-label') || x.textContent || '').replace(/\\s+/g, ' ').trim().startsWith(n)); let p = e && e.parentElement; const kids = (q) => [...q.querySelectorAll('button,[role=button],[role=radio],[role=option],label')]; while (p && kids(p).length < 2) p = p.parentElement; return JSON.stringify(p ? kids(p).map((x) => (x.getAttribute('aria-label') || x.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60)) : []); })()`);
        await escape(); await pause(500); rec.closedBy = 'Escape';
        if (onTop().some((x) => rec.opened.includes(x))) { rec.closedBy = 'a reload'; await startOver(t, rec); return; }
      }
      else if (!same) await goBack(rec, t);
      await settle(t); return;
    }
    const pick = opts.find((o) => o && o !== String(c.value) && !REFUSE.test(o));
    if (pick) { await pressOnTop(S, `[...document.querySelectorAll('[role=option],[role=menuitem],[role=menuitemradio]')].find((x) => x.getBoundingClientRect().width > 1 && x.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(pick)})`, 800); rec.picked = pick; rec.change = diff(before, blockNow()); }
    await settle(t);
  } else if (c.kind === 'field' || c.kind === 'area') {
    await pressAt(c.i, 400); const n = js(`(() => JSON.stringify(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) || !!document.activeElement?.isContentEditable))()`);
    if (!n) { rec.notTyped = 'no focus'; return; }
    const num = typeof c.value === 'string' && /^-?[\d.]+/.test(c.value);
    if (num) { browser(S, 'press', 'ArrowUp'); await pause(500); } else { for (const k of 'Ab') browser(S, 'press', k); await pause(500); }
    browser(S, 'press', 'Tab'); await pause(600);
    rec.to = find(c)?.value; rec.change = diff(before, blockNow());
  } else if (c.kind === 'nav') {
    await pressAt(c.i, 900); rec.inside = (read() || []).map((x) => ({ row: x.row, kind: x.kind, name: x.name, value: x.value }));
    await goBack(rec, t);
    await settle(t);
  }
}

async function readTab(t) {
  await toTab(t); await pause(500);
  const panelText = js(`(() => JSON.stringify((${PANEL}).innerText))()`);
  const rows = [], list = read() || [];
  const wide = WIDE_NOTE.test(panelText);
  out.tabs[t] = { rows, wideNote: wide ? panelText.split('\n').find((l) => WIDE_NOTE.test(l)) : undefined };
  for (const c0 of list) {
    const key = `${t}|${c0.kind}|${c0.row}|${c0.name}`;
    if (c0.kind === 'button' && c0.name === c0.row) continue;
    const rec = { row: c0.row, kind: c0.kind, name: c0.name, value: c0.value }; if (c0.min !== undefined) Object.assign(rec, { min: c0.min, max: c0.max, step: c0.step }); if (c0.off) rec.off = true; if (c0.options) rec.options = c0.options;
    rows.push(rec); save();
    if (tried.has(key)) continue; tried.add(key);
    if (READ_ONLY) { rec.notPressed = 'a read-only run'; continue; }
    const label = `${c0.row} ${c0.name}`;
    if (stoppedAt) { rec.notPressed = `the walk stopped at ${stoppedAt}`; continue; }
    if (wide) { rec.notPressed = 'the tab says it reaches further'; continue; }
    if (onNoList(c0, NO)) { rec.notPressed = 'UNREAD says no'; continue; }
    if (reachesOut(c0)) { rec.notPressed = 'it can reach outside'; stoppedAt = c0.name; continue; }
    if (!hasName(c0)) { rec.notPressed = 'no name'; continue; }
    if (c0.off || REFUSE.test(c0.name) || (REFUSE.test(c0.row) && !/^reset to default/i.test(c0.row)) || (c0.kind === 'button')) { rec.notPressed = c0.off ? 'greyed out' : c0.kind === 'button' ? 'a plain button' : 'refused by name'; continue; }
    if (COMMON.test(c0.row) || COMMON.test(c0.name)) { rec.notPressed = 'a row every panel has'; continue; }
    if (c0.kind === 'choice') { if (c0.value) { rec.notPressed = 'the default'; continue; } rec.home = list.find((x) => x.kind === 'choice' && x.row === c0.row && x.value)?.name; }
    try { await toTab(t); await pause(250); const c = find(c0); if (!c) { rec.gone = true; continue; } await changeRow(c, t, rec); await settle(t); await pause(200); console.log(`  ${t} | ${c0.kind} | ${label.slice(0, 50)} | ${(rec.change || []).length} changes`); } catch (e) { rec.error = e.message.slice(0, 160); console.log(`  ${t} | ${label.slice(0, 50)} ERROR ${rec.error}`); try { await settle(t); } catch { rec.reloaded = true; await startOver(t, rec); } }
  }
  save();
}

await enterEdit(PAGE);
const path = js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`);
if (!/-probe$/.test(path)) { console.error(`oracle-rows: on ${path}, not a probe page`); process.exit(2); }
await addSection();
const i = sectionCount() - 1;
blockId = await addBlock(i, TYPE); await pause(1200); await escape(); await pause(300);
out.path = path;
await openPanel();
const tabs = js(tabsJs(PANEL)); out.tabList = tabs;
for (const t of tabs) { if (ONLY && t !== ONLY) continue; if (t === 'Animation' || t === 'Storage') { await toTab(t); await pause(400); out.tabs[t] = { rows: (read() || []).map((x) => ({ row: x.row, kind: x.kind, name: x.name, value: x.value })), notPressed: t === 'Storage' ? 'form storage is read only' : 'every panel has it' }; save(); continue; } try { await readTab(t); console.log(t, out.tabs[t].rows.length); } catch (e) { (out.errors ||= []).push(`${t}: ${e.message.slice(0, 120)}`); console.log(`${t} stopped: ${e.message.slice(0, 120)}`); await startOver(null); } }
const all = Object.values(out.tabs).flatMap((t) => t.rows || []);
out.answer = `${TYPE}: tabs ${(out.tabList || []).join(', ')}. ${all.filter((r) => r.kind !== 'button').length} rows read, ${all.filter((r) => r.change?.length).length} changed the block when changed. Each row below has its default and what the change did.`;
out.pressed = `Add Block, ${TYPE}, Edit, its tabs, and the rows with a change below, each named and on top, on a probe page, unsaved.`;
save();
await escape(); await escape();
await exitWithoutSaving(); await pause(1500);
console.log(`wrote ${NAME}.json`);
process.exit(0);
