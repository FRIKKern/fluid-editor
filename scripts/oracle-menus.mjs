// The block menu (right-click) and the Layers list, tile by tile, read only, on a probe page, unsaved.
// For each tile: a new block, a right-click on it, every row of the menu with its keys and whether it is greyed out, and the
// rows of the menus that open from it, read by moving the mouse over them. Nothing in a menu is pressed, and a menu is never
// closed by a press: its backdrop passes a press through (on 2026-11-07 one opened the site footer). One menu per load: each
// tile gets a fresh load of the editor, and the read ends with the next load. Layers is read the same way, once for each
// --per tiles, on a section holding a block of each.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-menus.mjs [--types Text,Image] [--page 'Gestures Probe'] [--per 6]
// Writes parity/findings/CAP-MENUS.json after each section, so a stop loses little.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { evalJs, pause, mouse, goto } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { enterEdit, addSection, addBlock, sectionCount, escape, hoverSection } from './oracle/ui.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('oracle-menus: set ORACLE_SURFACE=cdp:<port>'); process.exit(2); }
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const PAGE = opt('page') || 'Gestures Probe', PER = Number(opt('per') || 6);
const COVERAGE = JSON.parse(readFileSync(new URL('../parity/findings/CAP-COVERAGE.json', import.meta.url)));
const TYPES = opt('types') ? opt('types').split(',') : Object.keys(COVERAGE.types);
const FILE = new URL('../parity/findings/CAP-MENUS.json', import.meta.url);
const out = existsSync(FILE) ? JSON.parse(readFileSync(FILE)) : { item: 'L5', capturedAt: new Date().toISOString().slice(0, 10), question: 'The block menu and the Layers list on every tile: rows, keys, greyed rows and the menus inside.', types: {} };
const save = () => writeFileSync(FILE, `${JSON.stringify(out, null, 1).replace(/https?:\/\//g, '')}\n`);
const js = (b) => evalJs(S, b);
const FRAME = `document.getElementById('sqs-site-frame')`;

// The menu: the smallest box outside the frame that holds both Duplicate and Hide on mobile.
const MENU = `(() => { const leaf = (t) => [...document.querySelectorAll('body *')].filter((e) => !e.closest('#sqs-site-frame') && e.childElementCount === 0 && e.textContent.trim() === t && e.getBoundingClientRect().width > 1); const a = leaf('Duplicate')[0]; if (!a) return null; let p = a; while (p && !(p.textContent.includes('Hide on mobile') && p.getBoundingClientRect().height > 150)) p = p.parentElement; return p; })()`;
// Rows of a menu box: each leaf text, its keys, greyed or not (by colour against the first row), a > for a menu inside.
const rowsOf = (box) => `(() => { const m = ${box}; if (!m) return JSON.stringify(null); const rows = []; const seen = new Set();
  const mq = m.getBoundingClientRect();
  for (const e of m.querySelectorAll('*')) { const eq = e.getBoundingClientRect(); if (e.childElementCount !== 0 || !e.textContent.trim() || eq.width < 1 || eq.left < mq.left - 1 || eq.left > mq.right || eq.top < mq.top - 1 || eq.top > mq.bottom) continue;
    let r = e; while (r.parentElement && r.parentElement !== m && r.parentElement.getBoundingClientRect().height < 44) r = r.parentElement; if (seen.has(r)) continue; seen.add(r); if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const words = [...r.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.textContent.trim()).map((x) => x.textContent.trim()); const q = r.getBoundingClientRect(); const c = getComputedStyle(e);
    rows.push({ name: words[0], keys: words.slice(1).join(' ') || undefined, color: c.color, inside: !!r.querySelector('svg') && !words.slice(1).length && /properties|arrange|stack options/i.test(words[0]) ? true : undefined, y: Math.round(q.top), h: Math.round(q.height) }); }
  // Greyed: light text on the white menu. Rows that can be pressed read about 62 in each channel.
  for (const r of rows) { const v = (r.color.match(/\\d+/g) || []).slice(0, 3).map(Number); r.greyed = v.length && v.reduce((x, y) => x + y, 0) / 3 > 120 ? true : undefined; delete r.color; }
  const q = mq; return JSON.stringify({ box: [q.left, q.top, q.width, q.height].map(Math.round), rows }); })()`;

async function rightClick(id) {
  js(`(() => { const W = ${FRAME}.contentWindow, b = W.document.querySelector('.fe-block[data-block-id="${id}"]'); const q = b.getBoundingClientRect(); b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 2, view: W })); return 'true'; })()`);
  await pause(900);
}
const menuUp = () => js(`(() => JSON.stringify(!!${MENU}))()`) === true;
// A fresh load: the pages list, edit mode on the probe page, a new section. Whatever was open goes with the old load.
async function fresh() {
  goto(S, `${js('(() => JSON.stringify(location.origin))()')}/config/pages`); await pause(9000);
  await enterEdit(PAGE);
  const path = js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`);
  if (!/-probe$/.test(path)) throw new Error(`on ${path}, not a probe page`);
  out.path = path;
  await addSection(); return sectionCount() - 1;
}
// A menu inside: the mouse over its row, and the new box beside the menu.
async function readInside(rowName) {
  const q = js(`(() => { const m = ${MENU}; const e = [...m.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(rowName)}); if (!e) return JSON.stringify(null); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + 20, r.top + r.height / 2]); })()`);
  if (!q) return null;
  mouse(S, 'move', q[0], q[1]); await pause(700);
  const sub = js(`(() => { const m = ${MENU}, mq = m.getBoundingClientRect(); const c = [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return !x.closest('#sqs-site-frame') && !m.contains(x) && !x.contains(m) && r.width > 80 && r.width < 400 && r.height > 30 && Math.abs(r.left - mq.right) < 30 && x.innerText && x.innerText.trim(); }); const box = c.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; if (!box) return JSON.stringify(null); window.__sub = box; return JSON.stringify(true); })()`);
  return sub ? js(rowsOf('window.__sub')) : null;
}

const todo = TYPES.filter((t) => !out.types[t]);
for (const T of todo) {
  const rec = {};
  try {
    const i = await fresh();
    const id = await addBlock(i, T); await pause(1200); await escape(); await escape(); await pause(400);
    await rightClick(id);
    const m = js(rowsOf(MENU));
    if (!m) rec.error = 'no menu';
    else {
      rec.menu = m;
      for (const r of m.rows) if (r.inside && !r.greyed) r.rows = (await readInside(r.name))?.rows?.map((x) => ({ name: x.name, keys: x.keys, greyed: x.greyed }));
      rec.closedBy = 'not closed: the next load';
    }
  } catch (e) { rec.error = e.message.slice(0, 160); }
  out.types[T] = rec; save(); console.log(T, rec.menu ? rec.menu.rows.map((r) => r.name + (r.greyed ? '*' : '')).join(', ') : rec.error);
}
// Layers, by its named button, on a fresh load with a section holding a block of each tile in the batch.
out.layers = (out.layers || []).filter((l) => l.rows?.length);
const laid = new Set(out.layers.flatMap((l) => l.types));
// A tile that opens a dialog when added covers the section, so its Layers button can't be pressed on top, and the next Add
// Block can't be either. Those are named, not read.
const DIALOGS = [...Object.keys(JSON.parse(readFileSync(new URL('../parity/findings/CAP-DIALOGS.json', import.meta.url))).dialogs), 'Tock'];
out.layersNotRead = { tiles: TYPES.filter((t) => DIALOGS.includes(t)), why: 'the dialog a new block opens covers the section and its Open Layers Panel button; no press closes it (no backdrop presses)' };
out.errors = (out.errors || []).filter((e) => !e.startsWith('layers '));
const left = TYPES.filter((t) => !laid.has(t) && !DIALOGS.includes(t));
for (let k = 0; k < left.length; k += PER) {
  const batch = left.slice(k, k + PER);
  try {
    const i = await fresh();
    for (const T of batch) { await addBlock(i, T); await pause(1200); await escape(); await escape(); await pause(400); }
    await hoverSection(i); await pause(600);
    await pressOnTop(S, `[...document.querySelectorAll('button,[role=button]')].find((x) => x.getBoundingClientRect().width > 1 && (x.getAttribute('aria-label') || '').trim() === 'Open Layers Panel')`, 900);
    const layers = js(`(() => { const t = [...document.querySelectorAll('body *')].filter((e) => !e.closest('#sqs-site-frame') && e.childElementCount === 0 && /^layers$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 1)[0]; let p = t; while (p && p.getBoundingClientRect().height < 120) p = p.parentElement; if (!p) return JSON.stringify(null); window.__layers = p; const q = p.getBoundingClientRect();
      const rows = [...p.querySelectorAll('[role=button]')].filter((r) => r.getBoundingClientRect().height > 30 && r.getBoundingClientRect().height < 80).map((r) => ({ name: r.innerText.replace(/\\s+/g, ' ').trim().slice(0, 50), buttons: [...r.querySelectorAll('button,[role=button]')].map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter(Boolean), h: Math.round(r.getBoundingClientRect().height) }));
      return JSON.stringify({ box: [q.left, q.top, q.width, q.height].map(Math.round), title: t.textContent.trim(), rows }); })()`);
    // The buttons a row shows under the mouse, read on the first row.
    const r0 = js(`(() => { if (!window.__layers) return JSON.stringify(null); const r = [...window.__layers.querySelectorAll('[role=button]')].filter((x) => x.getBoundingClientRect().height > 30 && x.getBoundingClientRect().height < 80); const e = r[0]; if (!e) return JSON.stringify(null); window.__row = e; const q = e.getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); })()`);
    if (r0 && layers) { mouse(S, 'move', r0[0], r0[1]); await pause(600); layers.hoverButtons = js(`(() => JSON.stringify([...window.__row.querySelectorAll('button,[role=button],[aria-label]')].filter((b) => b.getBoundingClientRect().width > 1).map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter(Boolean)))()`); }
    out.layers.push({ types: batch, ...layers }); save(); console.log('layers', JSON.stringify(layers?.rows?.map((r) => r.name)));
  } catch (e) { (out.errors ||= []).push(`layers ${batch.join(',')}: ${e.message.slice(0, 100)}`); save(); }
}
out.pressed = 'For each tile on its own load: Add Section, Add Block and the tile, a right-click on the new block, and the mouse over each menu row that opens a menu. Nothing in a menu was pressed and no menu was closed by a press: the next load ended it. Layers on its own load per batch: Open Layers Panel by name. On a probe page, unsaved, left by a load of the pages list. The first 12 tiles were read before this rule, with the menu closed by its backdrop: see closedBy.';
save();
goto(S, `${js('(() => JSON.stringify(location.origin))()')}/config/pages`); await pause(9000);
const bar = js(`(() => JSON.stringify([...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()).filter((t) => t === 'Save' || t === 'Exit')))()`);
if (bar.length) { console.error(`oracle-menus: the pages list still shows ${bar.join(', ')}`); process.exit(1); }
console.log('wrote CAP-MENUS.json');
process.exit(0);
