// The block menu by tile, against parity/findings/CAP-MENUS.json: each of the 37 tiles alone in a section has
// Copy Properties and Paste Properties or not, as read, and a grey Arrange; with a second block Arrange opens, and
// on the top block Move forward and Move to front are grey, and Arrange's row stays lit while its submenu is open
// (CAP-U11LIT.json). Writes parity/menu-check.json.
// FLUID_SURFACE=cdp:<port> npm run menu-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/CAP-MENUS.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(64)} ${ok ? 'match' : `DIFF ${detail}`}`); };

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);

// One section 1 holding the named tiles, added in order (the last on top), then the block menu on block n:
// its rows with grey ones marked, and Arrange's rows after a hover if it opens.
const menuOn = (tiles, n) => evalJs(S, `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1]; s.blocks = []; s.rows = { desktop: 30, mobile: 30 }; fe.load(next); await sleep(200);
  for (const t of ${JSON.stringify(tiles)}) { fe.addBlock(s.id, t); await sleep(60); }
  for (const id of ['context-menu', 'arrange-menu']) document.getElementById(id).hidden = true;
  const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, b = fe.model.sections[1].blocks[${n}];
  const e = d.querySelector('.fe-block[data-block-id="' + b.id + '"]'); e.scrollIntoView(); await sleep(60); const q = e.getBoundingClientRect();
  e.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 5, clientY: q.top + 5, button: 2 })); await sleep(60);
  const rows = (m) => [...m.querySelectorAll('button[data-cm]')].map((x) => x.getAttribute('aria-label') + (x.disabled ? ' (grey)' : ''));
  const cm = document.getElementById('context-menu'), menu = rows(cm), h = Math.round(cm.getBoundingClientRect().height * 10) / 10, arr = cm.querySelector('[data-cm="arrange"]');
  arr.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await sleep(60);
  const am = document.getElementById('arrange-menu'), arrange = !am.hidden && am.getAttribute('aria-label') === 'Arrange' ? rows(am) : null;
  const bg = () => getComputedStyle(arr).backgroundColor, lit = bg();
  cm.querySelector('[data-cm="duplicate"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await sleep(60);
  const after = bg();
  cm.hidden = true; am.hidden = true;
  return JSON.stringify({ menu, arrange, h, lit, after });
})()`);

// 83 and 84: every tile alone in its section.
const tiles = Object.keys(F.types);
const none = new Set(F.answer.noProperties);
const alone = { props: 0, arrange: 0, h: 0, misses: [] };
for (const t of tiles) {
  const r = menuOn([t], 0);
  const has = r.menu.includes('Copy Properties') && r.menu.includes('Paste Properties'), want = !none.has(t);
  if (has === want) alone.props++; else alone.misses.push(`${t} properties ${has}`);
  if (Math.abs(r.h - F.types[t].menu.box[3]) <= 1) alone.h++; else alone.misses.push(`${t} height ${r.h}, oracle ${F.types[t].menu.box[3]}`);
  if (r.menu.includes('Arrange (grey)') && !r.arrange) alone.arrange++; else alone.misses.push(`${t} arrange ${JSON.stringify(r.menu.find((m) => m.startsWith('Arrange')))}`);
}
add(`83: Copy and Paste Properties on ${tiles.length - none.size} tiles, none on ${none.size}`, alone.props === tiles.length, `${alone.props} of ${tiles.length}; ${alone.misses.filter((m) => m.includes('properties')).join('; ')}`);
add(`83: each tile's menu as tall as read (314 or 399)`, alone.h === tiles.length, `${alone.h} of ${tiles.length}; ${alone.misses.filter((m) => m.includes('height')).slice(0, 4).join('; ')}`);
add(`84: Arrange grey on each of ${tiles.length} tiles alone in its section`, alone.arrange === tiles.length, `${alone.arrange} of ${tiles.length}; ${alone.misses.filter((m) => m.includes('arrange')).slice(0, 4).join('; ')}`);

// 84 and 85: with a second block Arrange opens; on the newest (top) block the forward rows are grey (the read),
// on the bottom block the backward rows are (inferred).
const top = menuOn(['Text', 'Image'], 1), bottom = menuOn(['Text', 'Image'], 0);
add('84: Arrange opens on a block that shares its section', top.menu.includes('Arrange') && !!top.arrange, JSON.stringify(top.menu));
const read = F.types.Image.menu.rows.find((r) => r.name === 'Arrange').rows.map((r) => r.name + (r.greyed ? ' (grey)' : ''));
add('85: on the newest block Move forward and Move to front grey', JSON.stringify(top.arrange) === JSON.stringify(read), `${JSON.stringify(top.arrange)}, oracle ${JSON.stringify(read)}`);
add('U11: Arrange stays lit while its submenu is open, then not on Duplicate', top.lit === 'rgb(242, 242, 242)' && top.after === 'rgba(0, 0, 0, 0)', `${top.lit}, then ${top.after} (CAP-U11LIT.json)`);
add('85 inferred: on the bottom block Move backward and Move to back grey', JSON.stringify(bottom.arrange) === JSON.stringify(['Move forward', 'Move to front', 'Move backward (grey)', 'Move to back (grey)']), JSON.stringify(bottom.arrange));

writeFileSync(new URL('../parity/menu-check.json', import.meta.url), `${JSON.stringify({ pass, total, results }, null, 1)}\n`);
console.log(`\n${pass} of ${total}`);
process.exit(pass === total ? 0 : 1);
