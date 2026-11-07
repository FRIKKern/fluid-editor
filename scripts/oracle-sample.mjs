// The behaviour sample on the oracle: each pick in parity/findings/SAMPLE-ROWS.json (ours, pushed first), made once on its own
// fresh load of a probe page, unsaved, and what it did to the block, read as ours was (scripts/lib/sample-look.mjs).
// Presses only named controls on top: Add Block, the tile, Edit, the tab, the row. Before the press the row must pass every
// refusal: greyed, REFUSE, UNREAD's no rows, a field that reaches out, a tab whose note reaches further. No menu is closed by
// a press: the next load ends whatever is open, and the run ends on a load of the pages list.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-sample.mjs [--page 'Gestures Probe'] [--round2]
// --round2 / --round3: the picks whose roundN.ours is pushed, each read at about 1.1 s and at 3 s, into roundN.oracle.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, pause, goto } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { enterEdit, addSection, addBlock, sectionCount, escape, select } from './oracle/ui.mjs';
import { tabsJs } from './lib/panel-rows.mjs';
import { hasName, noRows, onNoList, reachesOut, WIDE_NOTE } from './lib/press-names.mjs';
import { controlsJs, lookJs, lookDiff, change, findAt, findValue, readTwice, REFUSE } from './lib/sample-look.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('oracle-sample: set ORACLE_SURFACE=cdp:<port>'); process.exit(2); }
const args = process.argv.slice(2), i0 = args.indexOf('--page'), PAGE = i0 < 0 ? 'Gestures Probe' : args[i0 + 1];
const FILE = new URL('../parity/findings/SAMPLE-ROWS.json', import.meta.url);
const f = JSON.parse(readFileSync(FILE)), TWO = process.argv.includes('--round2') ? 'round2' : process.argv.includes('--round3') ? 'round3' : null;
const UNREAD = JSON.parse(readFileSync(new URL('../parity/findings/UNREAD.json', import.meta.url)));
const js = (b) => evalJs(S, b);
const save = () => writeFileSync(FILE, `${JSON.stringify(f, null, 1).replace(/https?:\/\//g, '')}\n`);
const FRAME = `document.getElementById('sqs-site-frame')`;
// The panel: the box around the last tab outside the page frame (as oracle-rows.mjs finds it).
const PANEL = `(() => { const t = [...document.querySelectorAll('[role=tab]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && !x.closest('#sqs-site-frame') && q.left > 100; }).pop(); if (!t) return null; let p = t; while (p.parentElement && p.parentElement.getBoundingClientRect().width <= 700 && p.parentElement.getBoundingClientRect().height <= 960 && !p.parentElement.querySelector('#sqs-site-frame')) p = p.parentElement; return p; })()`;
const ROOT = `(() => { const p = ${PANEL}; if (p) window.__panel = p; return window.__panel && window.__panel.isConnected ? window.__panel : null; })()`;
const panelUp = () => js(tabsJs(PANEL)).length > 0;
const tabEl = (t) => `[...(${PANEL}).querySelectorAll('[role=tab]')].find((x) => (x.getAttribute('aria-label') || x.textContent || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t)} && x.getBoundingClientRect().width > 1)`;
const origin = () => js(`(() => JSON.stringify(location.origin))()`);

async function fresh(T) {
  goto(S, `${origin()}/config/pages`); await pause(9000);
  await enterEdit(PAGE);
  const path = js(`(() => JSON.stringify(${FRAME}.contentWindow.location.pathname))()`);
  if (!/-probe$/.test(path)) throw new Error(`on ${path}, not a probe page`);
  f.oraclePath = path;
  await addSection(); const i = sectionCount() - 1;
  const id = await addBlock(i, T); await pause(1200); await escape(); await pause(300);
  const sel = js(`(() => { const b = ${FRAME}.contentDocument.querySelector('.fe-block[data-block-id="${id}"]'); return JSON.stringify(!!b && b.dataset.isSelected === 'true'); })()`);
  if (!sel) { await select(i, id); await pause(400); }
  const edit = `[...document.querySelectorAll('button,[role=button]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 1 && !x.closest('#sqs-site-frame') && (x.getAttribute('aria-label') === 'Edit' || x.textContent.trim() === 'Edit'); }).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]`;
  await pressOnTop(S, edit, 1500);
  for (let w = 0; w < 6 && !panelUp(); w++) await pause(500);
  if (!panelUp()) throw new Error('no panel');
  return id;
}

for (const p of f.picks) {
  if (TWO ? !p[TWO]?.ours || p[TWO].oracle : !p.ours?.diff || p.oracle) continue;
  const rec = {};
  try {
    const id = await fresh(p.tile);
    if (!js(`(() => JSON.stringify((${tabEl(p.tab)})?.getAttribute('aria-selected') === 'true'))()`)) await pressOnTop(S, tabEl(p.tab), 900);
    await pause(400);
    const text = js(`(() => JSON.stringify((${ROOT})?.innerText || ''))()`);
    const list = js(controlsJs(ROOT)) || [];
    const at = findAt(list, p), c = at && list[Number(at.match(/\d+/)[0])];
    if (WIDE_NOTE.test(text)) rec.notPressed = 'the tab says it reaches further';
    else if (!c) rec.notPressed = 'no control of that kind and name on the oracle';
    else if (c.off) rec.notPressed = 'greyed out';
    else if (!hasName(c)) rec.notPressed = 'no name';
    else if (REFUSE.test(c.name) || REFUSE.test(c.row)) rec.notPressed = 'refused by name';
    else if (reachesOut(c)) rec.notPressed = 'it can reach outside';
    else if (onNoList(c, noRows(UNREAD, p.tile))) rec.notPressed = 'UNREAD says no';
    else if (c.kind === 'menu' && !c.options) rec.notPressed = 'not a plain select on the oracle';
    else if (c.kind === 'menu' && !c.options.includes(p.to)) rec.notPressed = `no option ${p.to}`;
    else {
      rec.value0 = c.value;
      const look = () => js(lookJs('sqs-site-frame', id)), before = look();
      await change(S, c.kind === 'menu' ? { ...c, options: [p.to] } : c, at, js);
      if (TWO) Object.assign(rec, await readTwice(look, before));
      else { await pause(300); rec.diff = lookDiff(before, look()); }
      rec.value = findValue(js(controlsJs(ROOT)) || [], p);
    }
  } catch (e) { rec.error = e.message.slice(0, 140); }
  if (TWO) p[TWO].oracle = rec; else p.oracle = rec;
  save();
  const d = TWO ? rec.d3 : rec.diff;
  console.log(p.tile, '|', p.row, '|', p.name, '|', d ? Object.keys(d).join(',') || 'nothing' : rec.notPressed || rec.error);
}
f.oraclePressed = 'For each pick on its own load of a probe page: Add Section, Add Block and the tile, Edit, the tab, and the row, each named and on top. Unsaved. Ended by a load of the pages list; no menu closed by a press.';
save();
goto(S, `${origin()}/config/pages`); await pause(9000);
const bar = js(`(() => JSON.stringify([...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()).filter((t) => t === 'Save' || t === 'Exit')))()`);
if (bar.length) { console.error(`oracle-sample: the pages list still shows ${bar.join(', ')}`); process.exit(1); }
console.log('wrote SAMPLE-ROWS.json');
process.exit(0);
