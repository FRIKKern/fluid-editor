// The block menu (right-click) and the Layers list, tile by tile, read only, on a probe page, unsaved.
// For each tile: a new block, a right-click on it, every row of the menu with its keys and whether it is greyed out, and the
// rows of the menus that open from it, read by moving the mouse over them. Nothing in a menu is pressed. The menu is left by
// a press on its backdrop. Then the section's Layers list, opened by its named button, row by row.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-menus.mjs [--types Text,Image] [--page 'Gestures Probe'] [--per 6]
// Writes parity/findings/CAP-MENUS.json after each section, so a stop loses little.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { evalJs, pause, mouse } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { enterEdit, exitWithoutSaving, addSection, addBlock, sectionCount, escape, hoverSection } from './oracle/ui.mjs';

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
// The backdrop: whatever is on top far from the menu, if it is not the page frame and not a control.
async function closeMenu(rec) {
  const p = js(`(() => { const m = ${MENU}; if (!m) return JSON.stringify(null); const q = m.getBoundingClientRect(); const x = q.left > 800 ? 200 : 1300, y = 700; const t = document.elementFromPoint(x, y); return JSON.stringify(t && t.id !== 'sqs-site-frame' && !t.closest('button,a,[role=button],input') ? [x, y, t.tagName + '.' + String(t.className).split(' ').slice(-1)[0]] : null); })()`);
  if (p) { mouse(S, 'move', p[0], p[1]); await pause(80); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(30); mouse(S, 'up', p[0], p[1]); await pause(600); rec.closedBy = `its backdrop (${p[2]})`; }
  if (menuUp()) { await escape(); await pause(400); rec.closedBy = (rec.closedBy ? rec.closedBy + ', then ' : '') + 'Escape'; }
  if (menuUp()) rec.closedBy = 'still open';
}
// A menu inside: the mouse over its row, and the new box beside the menu.
async function readInside(rowName) {
  const q = js(`(() => { const m = ${MENU}; const e = [...m.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(rowName)}); if (!e) return JSON.stringify(null); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + 20, r.top + r.height / 2]); })()`);
  if (!q) return null;
  mouse(S, 'move', q[0], q[1]); await pause(700);
  const sub = js(`(() => { const m = ${MENU}, mq = m.getBoundingClientRect(); const c = [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return !x.closest('#sqs-site-frame') && !m.contains(x) && !x.contains(m) && r.width > 80 && r.width < 400 && r.height > 30 && Math.abs(r.left - mq.right) < 30 && x.innerText && x.innerText.trim(); }); const box = c.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; if (!box) return JSON.stringify(null); window.__sub = box; return JSON.stringify(true); })()`);
  return sub ? js(rowsOf('window.__sub')) : null;
}

const done = new Set(Object.keys(out.types));
const todo = TYPES.filter((t) => !done.has(t));
await enterEdit(PAGE);
const path = js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`);
if (!/-probe$/.test(path)) { console.error(`oracle-menus: on ${path}, not a probe page`); process.exit(2); }
out.path = path;
for (let k = 0; k < todo.length; k += PER) {
  const batch = todo.slice(k, k + PER);
  await addSection(); const i = sectionCount() - 1;
  const ids = {};
  for (const T of batch) {
    const rec = { };
    try {
      const id = await addBlock(i, T); ids[T] = id; await pause(1200); await escape(); await escape(); await pause(400);
      await rightClick(id);
      const m = js(rowsOf(MENU));
      if (!m) { rec.error = 'no menu'; out.types[T] = rec; save(); continue; }
      rec.menu = m;
      for (const r of m.rows) if (r.inside && !r.greyed) r.rows = (await readInside(r.name))?.rows?.map((x) => ({ name: x.name, keys: x.keys, greyed: x.greyed }));
      await closeMenu(rec);
    } catch (e) { rec.error = e.message.slice(0, 160); try { await escape(); } catch {} }
    out.types[T] = rec; save(); console.log(T, rec.menu ? rec.menu.rows.map((r) => r.name + (r.greyed ? '*' : '')).join(', ') : rec.error, '|', rec.closedBy);
  }
  // The section's Layers list, by its named button.
  try {
    await hoverSection(i); await pause(600);
    await pressOnTop(S, `[...document.querySelectorAll('button,[role=button]')].find((x) => x.getBoundingClientRect().width > 1 && (x.getAttribute('aria-label') || '').trim() === 'Open Layers Panel')`, 900);
    const layers = js(`(() => { const t = [...document.querySelectorAll('body *')].filter((e) => !e.closest('#sqs-site-frame') && e.childElementCount === 0 && /^layers$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 1)[0]; let p = t; while (p && p.getBoundingClientRect().height < 120) p = p.parentElement; if (!p) return JSON.stringify(null); window.__layers = p; const q = p.getBoundingClientRect();
      const rows = [...p.querySelectorAll('[role=button]')].filter((r) => r.getBoundingClientRect().height > 30 && r.getBoundingClientRect().height < 80).map((r) => ({ name: r.innerText.replace(/\\s+/g, ' ').trim().slice(0, 50), buttons: [...r.querySelectorAll('button,[role=button]')].map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter(Boolean), h: Math.round(r.getBoundingClientRect().height) }));
      return JSON.stringify({ box: [q.left, q.top, q.width, q.height].map(Math.round), title: t.textContent.trim(), rows }); })()`);
    // The buttons a row shows under the mouse, read on the first row.
    const r0 = js(`(() => { if (!window.__layers) return JSON.stringify(null); const r = [...window.__layers.querySelectorAll('[role=button]')].filter((x) => x.getBoundingClientRect().height > 30 && x.getBoundingClientRect().height < 80); const e = r[0]; if (!e) return JSON.stringify(null); window.__row = e; const q = e.getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); })()`);
    if (r0 && layers) { mouse(S, 'move', r0[0], r0[1]); await pause(600); layers.hoverButtons = js(`(() => JSON.stringify([...window.__row.querySelectorAll('button,[role=button],[aria-label]')].filter((b) => b.getBoundingClientRect().width > 1).map((b) => b.getAttribute('aria-label') || b.textContent.trim()).filter(Boolean)))()`); }
    out.layers = out.layers || []; out.layers.push({ types: batch, ...layers }); save(); console.log('layers', JSON.stringify(layers?.rows?.map((r) => r.name)));
    await escape(); await pause(400);
  } catch (e) { (out.errors ||= []).push(`layers ${batch.join(',')}: ${e.message.slice(0, 100)}`); save(); }
}
out.pressed = 'Add Section, Add Block and each tile, a right-click on each new block, the mouse over each menu row that opens a menu, a press on the menu backdrop away from the menu, and Open Layers Panel. Nothing in a menu was pressed. On a probe page, unsaved, left by Exit Without Saving.';
save();
await escape(); await escape();
await exitWithoutSaving(); await pause(1200);
console.log('wrote CAP-MENUS.json');
process.exit(0);
