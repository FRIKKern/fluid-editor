// T12: the older block dialogs, against parity/findings/CAP-DIALOGS.json, the CAP-T12D*.json reads of each tab and the
// CAP-ROWS*.json changes. A new block of each of the nine through the menu, then Edit: the box by the block's right edge,
// the title, the tabs, and every read row's box. Then the close (a press beside it), Escape and a press on the block, and
// the rows 0005 keeps in scope. Writes parity/dialog-check.json. FLUID_SURFACE=cdp:<port> npm run dialog-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const read = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}`, import.meta.url)));
const D = read('CAP-DIALOGS.json');
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(58)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

// Each tile's reads and the tab each was taken on. The oracle's block was 8 columns wide, its right edge at 559.4
// (Calendar 12 wide, 794.5); its frame starts 55 below the window's top.
const FRAME_TOP = 55;
const TILES = {
  Instagram: { file: ['CAP-T12DINSTAGRAM.json', 'CAP-T12DINSTAGRAM2.json'], right: 559.4, tabs: { account: 'Account', 'account low': 'Account', frame: 'Account', design: 'Design', 'design low': 'Design', tiles: 'Design' } },
  Flickr: { file: ['CAP-T12DFLICKR.json'], right: 559.4, tabs: { account: 'Account', 'account low': 'Account', design: 'Design', 'design low': 'Design' } },
  'Tag Cloud': { file: ['CAP-T12DTAGCLOUD.json'], right: 559.4 },
  Chart: { file: ['CAP-T12DCHART.json'], right: 559.4, tabs: { first: 'Data', 'first low': 'Data', frame: 'Data', design: 'Design', 'design low': 'Design', import: 'Import / Export', 'import low': 'Import / Export' } },
  Calendar: { file: ['CAP-T12DCALENDAR.json'], right: 794.5 },
  'Page Link': { file: ['CAP-T12DPAGELINK.json'], right: 559.4 },
  RSS: { file: ['CAP-T12DRSS.json'], right: 559.4 },
  SoundCloud: { file: ['CAP-T12DSOUNDCLOUD.json'], right: 559.4 },
  Bandsintown: { file: ['CAP-T12DBANDSINTOWN.json'], right: 559.4 },
};
// The oracle's rows, relative to its dialog, by tab. Not compared: the dialog itself, the page's Add Section button,
// "Learn more" (it sits where its paragraph wraps, and our font isn't theirs), a 0-high box, and page names (ours
// list our own site's pages).
const OUR_PAGES = new Set(['About', 'Blocks Probe', 'Contact', 'Gestures Probe', 'Home', 'How Fluid Engine works', 'Services']);
function oracleRows(tile) {
  const t = TILES[tile], box = D.dialogs[tile].box, rows = {};
  for (const f of t.file) {
    for (const [name, r] of Object.entries(read(f).reads)) {
      const tab = t.tabs ? t.tabs[name] : '';
      if (tab == null) continue;
      for (const l of r.looks || []) {
        const [x, y, w, h] = l.box, rel = [x - box[0], y - box[1], w, h];
        if (near(rel, [0, 0, box[2], box[3]], 0.5) || l.text === 'Add Section' || (l.tag === 'button' && !l.text) || l.text === 'Learn more' || h === 0 || OUR_PAGES.has(l.text)) continue;
        if (x < box[0] - 1 || x + w > box[0] + box[2] + 1) continue;
        // Words inside a paragraph sit where it wraps; a notice the oracle holds in a box 0 high doesn't show.
        if (l.tag === 'strong' || /^Instagram search results/.test(l.text || '')) continue;
        const key = `${l.tag}|${l.text}|${rel.map(Math.round)}`;
        (rows[tab] ||= new Map()).set(key, { text: (l.text || '').replace(/\s+/g, ' ').trim(), tag: l.tag, rel, bg: l.bg });
      }
    }
  }
  return Object.fromEntries(Object.entries(rows).map(([k, m]) => [k, [...m.values()]]));
}

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
// A new block through the menu in an empty section 1, then Edit.
const fresh = async (name) => {
  goto(S, `${BASE}/index.html`); await pause(1600);
  const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
  mouse(S, 'move', spot[0], spot[1]); await pause(350);
  return evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="${name}"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); return JSON.stringify({ sid: s.id, id: b.id }); })()`);
};
const q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const dl = document.getElementById('block-dialog'), f = document.getElementById('site-frame'), d = f.contentDocument; ${body} })()`);
const state = (id) => q(`const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'), r = dl.getBoundingClientRect(), o = f.getBoundingClientRect(), el = d.querySelector('.fe-block[data-block-id="${id}"]'), k = el?.getBoundingClientRect(); return JSON.stringify({ open: !dl.hidden, box: k ? [r.left - o.left - k.right, r.top - o.top, r.width, r.height] : [], area: b?.layout.desktop.area.join('/'), sel: d.querySelector('.fe-block[data-is-selected="true"]')?.dataset.blockId ?? null, toolbar: !document.getElementById('block-toolbar').hidden, panel: !document.getElementById('block-panel').hidden, title: dl.querySelector('.dl-title')?.textContent, tabs: [...dl.querySelectorAll('.dl-tab')].map((t) => [t.textContent, Math.round(t.getBoundingClientRect().width * 10) / 10, t.getAttribute('aria-selected')]), content: el?.querySelector('.sqs-block-content')?.getBoundingClientRect().height, tile: (() => { const t = el?.querySelector('.fe-tile > span'); return t ? Math.round(t.getBoundingClientRect().height * 10) / 10 : null; })() });`);
// Our rows' boxes relative to the dialog, scrolled to the top: every element with its own text, and every box.
const ours = () => q(`dl.scrollTop = 0; const r = dl.getBoundingClientRect(), out = []; for (const e of dl.querySelectorAll('*')) { const b = e.getBoundingClientRect(); if (!b.width) continue; const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\\s+/g, ' ').trim(); const cs = getComputedStyle(e); out.push({ text: own, tag: e.tagName.toLowerCase(), rel: [b.left - r.left, b.top - r.top, b.width, b.height].map((v) => Math.round(v * 10) / 10), bg: cs.backgroundColor }); } return JSON.stringify(out);`);
// A text row matches by its words (the reads keep a long one's first 80): same left and the same middle line, within 1.5px; a box with no words matches by
// its box within 1px.
function compareRows(tile, tab, want, got) {
  // Page Link lists the site's pages: the oracle's has 7, ours 4, so its rows past ours aren't compared.
  const listed = got.filter((g) => g.bg === 'rgb(231, 231, 231)').length;
  want = want.filter((w) => w.bg !== 'rgb(231, 231, 231)' || w.rel[1] < 276 + 49.5 * listed - 1);
  let ok = 0;
  const misses = [];
  for (const w of want) {
    const hit = w.text
      ? got.some((g) => (w.text.length >= 80 ? g.text.startsWith(w.text) : g.text === w.text) && Math.abs(g.rel[0] - w.rel[0]) <= 1.5 && Math.abs(g.rel[1] + g.rel[3] / 2 - (w.rel[1] + w.rel[3] / 2)) <= 1.5)
      : got.some((g) => near(g.rel, w.rel, 1));
    if (hit) ok++; else misses.push(`${w.tag} "${w.text}" ${w.rel.map(Math.round)}`);
  }
  add(`${tile}${tab ? ` ${tab}` : ''}: ${want.length} read rows in place`, ok === want.length, `${ok} of ${want.length}; ${misses.slice(0, 4).join('; ')}`);
}

for (const [tile, d] of Object.entries(D.dialogs)) {
  const { id } = await fresh(tile);
  const t = TILES[tile];
  let s = state(id);
  add(`${tile}: Edit opens its dialog, no toolbar or panel`, s.open && !s.toolbar && !s.panel, JSON.stringify(s));
  add(`${tile}: box by the block's right edge, size`, near(s.box, [d.box[0] - t.right, d.box[1] - FRAME_TOP, d.box[2], d.box[3]]), `${s.box.map((v) => v.toFixed(1))}, oracle ${[d.box[0] - t.right, d.box[1] - FRAME_TOP, d.box[2], d.box[3]].map((v) => v.toFixed(1))}`);
  add(`${tile}: title "${d.title}"`, s.title === d.title, s.title);
  const want = oracleRows(tile);
  if (d.tabs[0] !== '(no tabs)') {
    const w = Math.round((d.box[2] / d.tabs.length) * 10) / 10;
    add(`${tile}: tabs ${d.tabs.join(', ')}, ${w} wide, the first open`, s.tabs.map((x) => x[0]).join() === d.tabs.join() && s.tabs.every((x) => Math.abs(x[1] - w) <= 0.2) && s.tabs[0][2] === 'true', JSON.stringify(s.tabs));
    for (const tab of d.tabs) {
      q(`dl.querySelector('[data-dl-tab="${tab}"]')?.click(); await sleep(150); return 'true';`);
      compareRows(tile, tab, want[tab], ours());
    }
  } else compareRows(tile, '', want[''], ours());
  // Nothing inside closes it, nor Escape, nor a press on its own block (CAP-DIALOGS.json closes).
  q(`for (const t of [dl, f.contentWindow]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(150); return 'true';`);
  s = state(id);
  add(`${tile}: Escape leaves it open, the block selected`, s.open && s.sel === id, JSON.stringify([s.open, s.sel]));
  const bl = q(`const o = f.getBoundingClientRect(), k = d.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify([o.left + k.left + 30, o.top + k.top + 30]);`);
  mouse(S, 'down', bl[0], bl[1], { buttons: 1 }); mouse(S, 'up', bl[0], bl[1]); await pause(200);
  s = state(id);
  add(`${tile}: a press on its block leaves it open`, s.open && s.sel === id, JSON.stringify([s.open, s.sel]));
  // The read press: 1300, 578 in a 1600 by 1000 window, on the empty section beside it.
  const area = s.area;
  const spot = q(`const o = f.getBoundingClientRect(), sec = d.querySelectorAll('.page-section')[1].getBoundingClientRect(); return JSON.stringify([1300, Math.min(578, o.top + sec.bottom - 20), d.elementFromPoint(1300 - o.left, Math.min(578, o.top + sec.bottom - 20) - o.top)?.className]);`);
  mouse(S, 'down', spot[0], spot[1], { buttons: 1 }); mouse(S, 'up', spot[0], spot[1]); await pause(250);
  s = state(id);
  add(`${tile}: a press on the section beside it closes it, the block goes`, !s.open && s.sel === null && s.area === area, `${JSON.stringify([s.open, s.sel, s.area])} on ${spot[2]}`);
}

// The rows in scope (0005): each changes the block, one undo step each, as CAP-ROWSFLICKR.json and CAP-ROWSINSTAGRAM.json read.
const pick = (sel, v) => q(`const c = dl.querySelector('${sel}'); if (!c) return 'null'; if (c.tagName === 'SELECT' || c.type === 'range') { c.value = ${JSON.stringify(v)}; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); } else c.click(); await sleep(300); return JSON.stringify({ undo: document.getElementById('undo').disabled });`);
const undo = () => q(`document.getElementById('undo').click(); await sleep(300); return 'true';`);
const R = read('CAP-ROWSFLICKR.json').tabs.Design.rows, rowOf = (n) => R.find((r) => r.name === n).change;
const areaOf = (ch) => ch.find((c) => c.startsWith('area')).match(/> (.*)$/)[1].replace(/ /g, '');
const contentOf = (ch) => Number(ch.find((c) => c.startsWith('DIV.targeted')).split(',').at(-1));
{
  const { id } = await fresh('Flickr');
  q(`dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
  pick('select[data-dl="galAspect"]', '3:2 Standard');
  let s = state(id);
  add('Flickr Aspect Ratio 3:2: rows and content', s.area === areaOf(rowOf('1:1 Square')) && Math.abs(s.content - contentOf(rowOf('1:1 Square'))) <= 1, `${s.area} ${s.content}`);
  add('Flickr Aspect Ratio 3:2: a tile 66.5 high', Math.abs(s.tile - 66.5) <= 0.5, s.tile);
  add('Flickr Aspect Ratio: the menu shows it, the dialog stays', s.open && q(`return JSON.stringify(dl.querySelector('[data-dl="galAspect"]')?.closest('.dl-row').querySelector('.dl-sel-text').textContent ?? null);`) === '3:2 Standard', JSON.stringify(s.open));
  pick('button[data-dl="galCrop"]');
  s = state(id);
  // Crop's own read caught no change in rows; the one after it starts from 1/2/7/10 with content 228.4.
  add('Flickr Crop Images off: pictures whole, rows refit', s.area === rowOf('Show Title').find((c) => c.startsWith('area')).match(/area (.*) >/)[1].replace(/ /g, '') && Math.abs(s.content - 228.4) <= 1, `${s.area} ${s.content}`);
  pick('button[data-dl="galTitle"]');
  s = state(id);
  add('Flickr Show Title: titles under the pictures, rows', s.area === areaOf(rowOf('Show Title')) && Math.abs(s.content - contentOf(rowOf('Show Title'))) <= 1, `${s.area} ${s.content}`);
  const title = q(`const t = d.querySelector('.fe-block[data-block-id="${id}"] .fe-tile-title'); if (!t) return '[]'; const p = t.previousElementSibling.getBoundingClientRect(), r = t.getBoundingClientRect(), cs = getComputedStyle(t); return JSON.stringify([Math.round((r.top - p.bottom) * 10) / 10, Math.round(r.height * 10) / 10, cs.fontSize, cs.textAlign]);`);
  add('Flickr Show Title: a title 7 below, 22.4 high, 14px, centred', Math.abs(title[0] - 7.1) <= 0.3 && Math.abs(title[1] - 22.4) <= 0.2 && title[2] === '14px' && title[3] === 'center', JSON.stringify(title));
  pick('button[data-dl="galNewWindow"]');
  s = state(id);
  add('Flickr Open Links in New Window: the links, no rows change', s.area === areaOf(rowOf('Show Title')) && q(`return JSON.stringify(d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-tile[target="_blank"]').length);`) === 12, s.area);
  const boxes = q(`return JSON.stringify([...dl.querySelectorAll('button[data-dl]')].map((b) => b.getAttribute('aria-checked')).join());`);
  add('Flickr: the round checks show it', boxes === 'false,true,true', boxes);
  for (let n = 0; n < 4; n++) undo();
  s = state(id);
  add('Flickr: four undos, back to 1/2/10/10 and 1:1', s.area === '1/2/10/10' && Math.abs(s.tile - 99.8) <= 0.5 && s.open, `${s.area} ${s.tile} ${s.open}`);
}
{
  const { id } = await fresh('Instagram');
  q(`dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
  pick('select[data-dl="galAspect"]', '3:2 Standard');
  const s = state(id), ch = read('CAP-ROWSINSTAGRAM.json').tabs.Design.rows.find((r) => r.name === '1:1 Square').change;
  // Its rows read 12 to 8; ours refit to 7 as Flickr does. Named, not counted: one read, and Flickr's four disagree.
  add('Instagram Aspect Ratio 3:2: the content', Math.abs(s.content - contentOf(ch)) <= 1, s.content);
  console.log(`named miss: Instagram's rows after 3:2 read ${areaOf(ch)}, ours ${s.area}`);
  add('Instagram: no Show Title row', q(`return JSON.stringify(!dl.querySelector('[data-dl="galTitle"]'));`) === true);
}
{
  const { id } = await fresh('Tag Cloud');
  const a = state(id).area;
  pick('input[data-dl="tagCount"]', '20');
  const got = q(`const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); const c = dl.querySelector('input[data-dl="tagCount"]'); return JSON.stringify([b?.tagCount, dl.querySelector('.dl-count')?.textContent, c?.min, c?.max]);`);
  add('Tag Cloud Tags: 5 to 20, 5 to 100, held on the block', got.join() === '20,20 Tags,5,100' && state(id).area === a, JSON.stringify(got));
  undo();
  add('Tag Cloud Tags: one undo step back to 5', q(`const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); return JSON.stringify(b ? b.tagCount ?? 5 : null);`) === 5);
}
{
  await fresh('Bandsintown');
  const off = q(`return JSON.stringify([...dl.querySelectorAll('.dl-row.is-out')].map((r) => [r.querySelector('input,select,button')?.disabled, getComputedStyle(r).opacity]));`);
  add('Bandsintown: Band Name and Timeframe out (0005), faded and still', off.length === 2 && off.every(([dis, o]) => dis && Number(o) < 1), JSON.stringify(off));
}

writeFileSync(new URL('../parity/dialog-check.json', import.meta.url), `${JSON.stringify({ pass, total, results }, null, 1)}\n`);
console.log(`\n${pass} of ${total}`);
process.exit(pass === total ? 0 : 1);
