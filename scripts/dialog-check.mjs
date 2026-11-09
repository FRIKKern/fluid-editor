// T12: the older block dialogs, against parity/findings/CAP-DIALOGS.json, the CAP-T12D*.json reads of each tab and the
// CAP-ROWS*.json changes. A new block of each of the nine through the menu, then Edit: the box by the block's right edge,
// the title, the tabs, and every read row's box. Then the close (a press beside it), Escape and a press on the block, and
// the rows 0005 keeps in scope. Writes parity/dialog-check.json. FLUID_SURFACE=cdp:<port> npm run dialog-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, browser, drag } from './lib/cmux.mjs';
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
const fresh = async (name, { edit = true } = {}) => {
  goto(S, `${BASE}/index.html`); await pause(1600);
  const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 8, mobile: 8 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
  mouse(S, 'move', spot[0], spot[1]); await pause(350);
  return evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="${name}"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); ${edit ? `document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300);` : ''} return JSON.stringify({ sid: s.id, id: b.id }); })()`);
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
  add('Instagram Aspect Ratio 3:2: the content', Math.abs(s.content - contentOf(ch)) <= 1, s.content);
  add('Instagram, new, 1:1 to 3:2: 12 rows to 8, one over the fit', s.area === areaOf(ch), s.area);
  add('Instagram: no Show Title row', q(`return JSON.stringify(!dl.querySelector('[data-dl="galTitle"]'));`) === true);
}
// Instagram's rows over Aspect Ratio picks (CAP-T12INSTAASPECT-A.json to -F.json), as the DROP rule gives them: a pick that shrinks the
// content drops the rows it lost, rounded up, and one more, never under the fit; one that grows it fits. A pull does not change the rule (F;
// CAP-T12INSTAFLOOR-1.json P3, -2.json Q3).
for (const run of ['A', 'B', 'C', 'D', 'E', 'F']) {
  const fd = read(`CAP-T12INSTAASPECT-${run}.json`), picks = fd.steps.filter((t) => t[0] === 'selectKey');
  const { id } = await fresh('Instagram', { edit: run !== 'F' });
  if (run === 'F') {
    const h = q(`const o = f.getBoundingClientRect(), r = d.querySelector('.fe-handle[data-dir="s"]').getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width / 2, o.top + r.top + r.height / 2]);`);
    drag(S, h, [h[0], h[1] - 30]); await pause(400);
    q(`document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); return 'true';`);
  }
  q(`dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
  const ours = [], want = [];
  picks.forEach((t, n) => {
    // Each pick is the next option starting with the typed key, as the select's own typing picks it on the oracle.
    const to = q(`const c = dl.querySelector('select[data-dl="galAspect"]'), o = [...c.options], i = o.findIndex((x) => x.value === c.value); for (let k = 1; k <= o.length; k++) { const x = o[(i + k) % o.length]; if (x.text.startsWith(${JSON.stringify(t[2])})) return JSON.stringify(x.value); } return 'null';`);
    pick('select[data-dl="galAspect"]', to);
    ours.push(state(id).area); want.push(fd.reads[`k${n + 1}`].block.desktop);
  });
  add(`Instagram run ${run}${run === 'F' ? ', pulled first' : ''}: ${picks.length} picks, rows as read`, JSON.stringify(ours) === JSON.stringify(want), `${ours} want ${want}`);
}
// CAP-T12READS-J.json: 2.40 as a new block's first pick, 12 rows to 6; Cmd+Down to 13 rows, then 3:2, 9 rows.
{
  const R = read('CAP-T12READS-J.json').reads;
  let { id } = await fresh('Instagram');
  q(`dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
  pick('select[data-dl="galAspect"]', '2.40 Anamorphic Widescreen');
  add('Instagram, new, 2.40 first: 12 rows to 6', state(id).area === R.first240.after.replace(/ /g, ''), state(id).area);
  ({ id } = await fresh('Instagram', { edit: false }));
  browser(S, 'press', 'Meta+ArrowDown'); await pause(400);
  const keyed = state(id).area;
  q(`document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
  pick('select[data-dl="galAspect"]', '3:2 Standard');
  add('Instagram, Cmd+Down then 3:2: 13 rows to 9', keyed === R.keys.keyed.replace(/ /g, '') && state(id).area === R.keys.after.replace(/ /g, ''), `${keyed} ${state(id).area}`);
}
// The DROP rule's two rounds (CAP-T12INSTAFLOOR-1.json, -2.json): rows changed by keys or a pull, then one pick, each on a new block.
for (const [file, plan] of [['CAP-T12INSTAFLOOR-1.json', { P1: ['ArrowDown', 2], P2: ['ArrowUp', 1], P3: ['pull', 82], P4: ['ArrowDown', 3], P5: ['ArrowDown', 2] }],
  ['CAP-T12INSTAFLOOR-2.json', { Q1: ['ArrowDown', 4], Q2: ['ArrowDown', 1], Q3: ['pull', 123], Q4: ['ArrowDown', 5], Q5: ['ArrowDown', 6] }]]) {
  const runs = read(file).runs;
  for (const [run, [how, n]] of Object.entries(plan)) {
    const r = runs[run];
    const { id } = await fresh('Instagram', { edit: false });
    if (how === 'pull') {
      const h = q(`const o = f.getBoundingClientRect(), r = d.querySelector('.fe-handle[data-dir="s"]').getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width / 2, o.top + r.top + r.height / 2]);`);
      drag(S, h, [h[0], h[1] + n]); await pause(400);
      q(`fe.select(fe.model.sections[1].id, '${id}'); await sleep(200); return 'true';`); // selected again after the pull, as the oracle run did
    } else for (let k = 0; k < n; k++) { browser(S, 'press', `Meta+${how}`); await pause(250); }
    const at = state(id).area;
    q(`document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); dl.querySelector('[data-dl-tab="Design"]')?.click(); await sleep(150); return 'true';`);
    pick('select[data-dl="galAspect"]', r.pick);
    const got = state(id).area, want = r.after.replace(/ /g, '');
    add(`Instagram ${run}: ${at} then ${r.pick.split(' ')[0]}, rows as read`, at === r.at.replace(/ /g, '') && got === want, `${at} ${got} want ${r.at} ${want}`);
  }
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

{
  // With a dialog open, a press on another block closes it and lets the open block go; the pressed one is not taken
  // (CAP-T12DIALOGOTHER2.json, CAP-T12DIALOGOTHER3.json: Tag Cloud open, a press on a Calendar clear of the dialog).
  const { id } = await fresh('Tag Cloud', { edit: false });
  q(`const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[1], c = JSON.parse(JSON.stringify(s.blocks.find((o) => o.id === '${id}'))); c.id = 'dlg-other'; c.layout.desktop.area = [1, 18, 9, 25]; s.blocks.push(c); fe.load(next); await sleep(400); return 'true';`);
  const at = (bid) => q(`const o = f.getBoundingClientRect(), k = d.querySelector('.fe-block[data-block-id="${bid}"]').getBoundingClientRect(); return JSON.stringify([o.left + k.left + k.width / 2, o.top + k.top + 30]);`);
  let p = at(id); mouse(S, 'move', p[0], p[1]); mouse(S, 'down', p[0], p[1], { buttons: 1 }); mouse(S, 'up', p[0], p[1]); await pause(300);
  q(`document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(400); return 'true';`);
  const was = state(id);
  p = at('dlg-other'); mouse(S, 'move', p[0], p[1]); mouse(S, 'down', p[0], p[1], { buttons: 1 }); mouse(S, 'up', p[0], p[1]); await pause(300);
  const now = state(id);
  add('A dialog open, a press on another block: it closes, no block selected', was.open && was.sel === id && !now.open && now.sel === null, JSON.stringify([was.open, was.sel, now.open, now.sel]));
}
{
  // Chart's rows (CAP-ROWSCHART.json changes, CAP-T12CHARTLOOK.json boxes), in the read order: Title, Caption, Show Legend,
  // Primary, then Flip, which hid the one-series legend and kept the rows. Then a cell, the CSV's Update and undo (ours: not read).
  const { id } = await fresh('Chart');
  const C = read('CAP-ROWSCHART.json').tabs, L = read('CAP-T12CHARTLOOK.json').reads, PAL = read('CAP-T12PALETTES.json');
  // Edit gives Chart Type the focus and a 2px rgb(62, 62, 62) ring inside its box (CAP-T12PALETTES.json focusAfterEdit, focusRing).
  const ring = q(`const a = document.activeElement, r = a?.closest('.dl-row'), c = r && getComputedStyle(r), b = r?.getBoundingClientRect(), o = dl.getBoundingClientRect(); return JSON.stringify({ on: a?.dataset.dl ?? null, ring: c ? [c.outlineStyle, c.outlineWidth, c.outlineColor, c.outlineOffset] : null, box: b ? [b.left - o.left, b.top - o.top, b.width, b.height].map((v) => Math.round(v)) : null });`);
  add('Chart: Edit gives Chart Type the focus, a 2px ring inside its box', ring.on === 'chartType' && JSON.stringify(ring.ring) === JSON.stringify(['solid', '2px', 'rgb(62, 62, 62)', '-2px']) && near(ring.box, [PAL.focusAfterEdit.box[0] - D.dialogs.Chart.box[0], PAL.focusAfterEdit.box[1] - D.dialogs.Chart.box[1], 506, 44], 1), JSON.stringify(ring));
  const ch = (tab, n) => C[tab].rows[n].change;
  const contentIn = (c) => Number(c.find((x) => x.startsWith('DIV.targeted') || x.startsWith('DIV.chart-type')).split(',').at(-1));
  const parts = () => q(`const c = d.querySelector('.fe-block[data-block-id="${id}"] .sqs-block-content'), H = (e) => e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null; return JSON.stringify({ h2: H(c.querySelector('h2')), legend: H(c.querySelector('.chart-block-legend')), ul: c.querySelector('ul')?.className ?? null, items: [...c.querySelectorAll('li')].map((l) => [l.textContent, getComputedStyle(l.querySelector('span')).backgroundColor, Math.round((l.querySelector('span').getBoundingClientRect().top - l.getBoundingClientRect().top) * 10) / 10]), cap: H(c.querySelector('.chart-block-caption figcaption')), bars: [...c.querySelectorAll('.fe-chart-bar')].map((r) => r.getAttribute('fill')), capBorder: c.querySelector('.chart-block-caption figcaption') && getComputedStyle(c.querySelector('.chart-block-caption figcaption')).borderTopColor });`);
  const field = (k, v) => q(`dl.querySelector('[data-dl-tab="Design"]').click(); await sleep(150); const c = dl.querySelector('input[data-dl="${k}"]'); if (!c) return 'null'; c.value = ${JSON.stringify(v)}; c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300); return 'true';`);
  field('chartTitle', 'Ab');
  let s = state(id), p = parts();
  add('Chart Title Ab: an h2 67.9 high, content, rows kept at 8', s.area === '1/2/9/10' && Math.abs(s.content - contentIn(ch('Design', 0))) <= 1 && Math.abs(p.h2 - 67.9) <= 0.5, `${s.area} ${s.content} ${p.h2}`);
  field('chartCaption', 'Ab');
  s = state(id); p = parts();
  add('Chart Caption Ab: 15 below, 39.4 high with a rule, rows 10', s.area === areaOf(ch('Design', 1)) && Math.abs(s.content - contentIn(ch('Design', 1))) <= 1 && Math.abs(p.cap - 39.4) <= 0.3 && p.capBorder === 'rgba(0, 0, 0, 0.1)', `${s.area} ${s.content} ${p.cap} ${p.capBorder}`);
  pick('button[data-dl="chartLegend"]');
  s = state(id); p = parts();
  const sw = L.legend.inside.find((e) => e.tag === 'span'), li = L.legend.inside.find((e) => e.tag === 'li');
  add('Chart Show Legend: 43.8 high under the picture, rows 11', s.area === areaOf(ch('Design', 2)) && Math.abs(s.content - contentIn(ch('Design', 2))) <= 1 && Math.abs(p.legend - 43.8) <= 0.3, `${s.area} ${s.content} ${p.legend}`);
  add('Chart legend: Population, a swatch 3 down in Grayscale 1', p.ul === 'bar-legend' && p.items.length === 1 && p.items[0][0] === 'Population' && p.items[0][1] === sw.css.backgroundColor && Math.abs(p.items[0][2] - (sw.box[1] - li.box[1])) <= 0.3, JSON.stringify(p.items));
  q(`dl.querySelector('[data-dl-tab="Design"]').click(); await sleep(150); return 'true';`);
  const off = q(`return JSON.stringify([...dl.querySelectorAll('select[data-dl="chartPalette"] option')].filter((o) => o.disabled).length);`);
  pick('select[data-dl="chartPalette"]', 'Primary');
  p = parts();
  add('Chart Color Palette Primary: swatch and bars, none of the 14 off', p.items[0]?.[1] === 'rgb(240, 82, 59)' && p.bars.every((f) => f === 'rgb(240, 82, 59)') && off === 0, `${JSON.stringify(p.items)} ${p.bars} ${off}`);
  q(`dl.querySelector('[data-dl-tab="Data"]').click(); await sleep(150); return 'true';`);
  pick('select[data-dl="chartType"]', 'Line Chart');
  p = parts();
  add('Chart Type Line Chart: line-legend, a line drawn', p.ul === 'line-legend' && q(`return JSON.stringify(!!d.querySelector('.fe-block[data-block-id="${id}"] path.fe-chart-line'));`) === true, p.ul);
  // A Line Chart's plot (CAP-T12LINECHART.json line1 and line3 shots, by pixel, block at 99.5, 298.5): the axis 48.5 in and the
  // baseline 215.5 down the block (the picture 15 down it, under any title), an upright line 176 and 352 along, from 3 above the top value to 4 below the baseline; the points
  // on them, the first on the axis; the labels 19 under the baseline; the curve through every point.
  const lg = q(`const g = d.querySelector('.fe-block[data-block-id="${id}"] svg'); if (!g.querySelector('.fe-chart-axis + .fe-chart-axis')) return JSON.stringify({ none: true }); const blk = g.closest('.fe-block').getBoundingClientRect(), R = (e) => e.getBoundingClientRect(), base = R(g.querySelector('.fe-chart-axis')), ax = R(g.querySelector('.fe-chart-axis + .fe-chart-axis'));
    const up = [...g.querySelectorAll('.fe-chart-grid')].map(R).filter((r) => r.width < 1).map((r) => [Math.round(r.left - ax.left), Math.round(r.top - ax.top), Math.round(r.bottom - base.top)]);
    const pts = [...g.querySelectorAll('circle')].map((c) => [Math.round(+c.getAttribute('cx') - 48.5), Math.round(+c.getAttribute('cy'))]), pd = g.querySelector('path.fe-chart-line')?.getAttribute('d') ?? '';
    const lab = [...g.querySelectorAll('.fe-chart-text')].filter((t) => !/^[0-9]+$/.test(t.textContent)).map((t) => Math.round((+t.getAttribute('y') - 200.5) * 10) / 10);
    return JSON.stringify({ at: [Math.round((ax.left - blk.left) * 2) / 2, Math.round((base.top - R(g).top + 15) * 2) / 2], up, pts: pts.map((p) => p[0]), through: [...g.querySelectorAll('circle')].every((c) => pd.includes(c.getAttribute('cx') + ' ' + c.getAttribute('cy'))), lab });`);
  add('Chart Line: its plot, upright lines at the points and labels where the oracle draws them', !lg.none && near(lg.at, [48.5, 215.5], 1) && JSON.stringify(lg.up) === JSON.stringify([[176, 0, 0], [352, 0, 0]]) && JSON.stringify(lg.pts) === JSON.stringify([0, 176, 352]) && lg.through && lg.lab.every((v) => v === 19), JSON.stringify(lg));
  pick('select[data-dl="chartType"]', 'Bar Chart');
  pick('button[data-dl="chartFlip"]');
  s = state(id); p = parts();
  add('Chart Flip: the legend goes, content 372.7, rows kept at 11', p.legend === null && Math.abs(s.content - 372.7) <= 1 && s.area === areaOf(ch('Design', 2)), `${p.legend} ${s.content} ${s.area}`);
  // Flipped, each row takes the next colour: the read swatches of all 14 palettes, in row order (CAP-T12PALETTES.json, and
  // Primary in CAP-ROWSCHART.json). Fourteen picks, one undo step each.
  {
    const want = [...PAL.palettes.map((x) => [x.name === 'default' ? 'Grayscale' : x.name, x.items.slice(0, 3).map((i) => i[1])]).filter(([n], k, a) => a.findIndex(([m]) => m === n) === k), ['Primary', ['rgb(240, 82, 59)', 'rgb(247, 180, 19)', 'rgb(36, 128, 196)']]];
    q(`dl.querySelector('[data-dl-tab="Design"]').click(); await sleep(150); return 'true';`);
    let ok = 0; const miss = [];
    for (const [name, cols] of want) { pick('select[data-dl="chartPalette"]', name); const bars = parts().bars; if (JSON.stringify(bars) === JSON.stringify(cols)) ok++; else miss.push(`${name} ${bars}`); }
    add(`Chart Color Palette: the ${want.length} palettes' colours on the flipped bars`, ok === want.length && want.length === 14, `${ok} of ${want.length}; ${miss.slice(0, 3).join('; ')}`);
    q(`dl.querySelector('[data-dl-tab="Data"]').click(); await sleep(150); return 'true';`);
  }
  pick('button[data-dl="chartFlip"]');
  const cell = q(`const c = dl.querySelector('[data-dl-cell="2,1"]'); if (!c) return 'null'; c.value = '50'; c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300); const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); const r = [...d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-bar')].map((e) => Math.round(e.getBoundingClientRect().height)); return JSON.stringify([b.chartData?.[2]?.[1], r[1] < r[0], dl.querySelectorAll('.dl-grid input:not([disabled])').length]);`);
  add('Chart Data: Las Vegas 50 in its cell redraws, 7 cells take typing', JSON.stringify(cell) === '["50",true,7]', JSON.stringify(cell));
  // The + under the rows and after the series (CAP-T12CHARTCELLS2.json, CAP-T12CHARTCELLS3.json): a row of 0s with the focus on its
  // label, a series of 0s at 165 + 110 with the focus on its name and the + one slot on; the chart draws two bars a label.
  // The + row has no stripe (CAP-T12CHARTCELLS3.json headplus shot), and a focused cell is white with no ring (its focused read).
  const plusLook = q(`const p = dl.querySelector('[data-dl-add="row"]'), c = dl.querySelector('[data-dl-cell="1,0"]'); c?.focus(); const cs = c && getComputedStyle(c); return JSON.stringify([[...dl.querySelectorAll('.dl-cell')].filter((e) => p && e.style.top === p.style.top).map((e) => getComputedStyle(e).backgroundColor), cs?.outlineStyle, cs?.backgroundColor]);`);
  add('Chart cells: the + row unstriped, a focused cell white with no ring', JSON.stringify(plusLook) === JSON.stringify([Array(plusLook[0].length || 1).fill('rgba(0, 0, 0, 0)'), 'none', 'rgb(255, 255, 255)']), JSON.stringify(plusLook));
  const plusRow = q(`dl.querySelector('[data-dl-add="row"]')?.click(); await sleep(300); const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); const a = document.activeElement; return JSON.stringify([b.chartData?.at(-1), a.dataset.dlCell, Math.round(a.getBoundingClientRect().left - dl.getBoundingClientRect().left)]);`);
  add('Chart + under the rows: a row of 0s, its label cell focused at 55', JSON.stringify(plusRow) === JSON.stringify([['', '0'], '4,0', 55]), JSON.stringify(plusRow));
  // The row + scrolls the panel 42 to its end; before it the panel had no scroll (CAP-T12CHARTCELLS2.json, rows 555 to 513).
  const scrolled = q(`return JSON.stringify([dl.scrollTop, dl.scrollHeight - dl.clientHeight, Math.round(dl.querySelector('[data-dl-cell="0,1"]').getBoundingClientRect().top)]);`);
  add('Chart + under the rows: the panel scrolls 42 to its end, the grid from 555 to 513', JSON.stringify(scrolled) === JSON.stringify([42, 42, 513]), JSON.stringify(scrolled));
  // The title and tabs stay put over the scrolled rows (CAP-T12CHARTCELLS2.json rowplus shot), and each + is 35.6 by 44 (CAP-T12DCHART.json).
  const head = q(`const D = dl.getBoundingClientRect(); return JSON.stringify([Math.round(dl.querySelector('.dl-title').getBoundingClientRect().top - D.top), Math.round(dl.querySelector('.dl-tabs').getBoundingClientRect().top - D.top), document.elementFromPoint(D.left + 20, D.top + 60)?.closest('.dl-tabs') ? 'tabs' : 'other', [...dl.querySelectorAll('.dl-plus')].map((p) => [Math.round(p.getBoundingClientRect().width * 10) / 10, p.getBoundingClientRect().height])]);`);
  add('Chart scrolled: the title at 11 and the tabs at 33 stay on top; each + 35.6 by 44', JSON.stringify(head) === JSON.stringify([11, 33, 'tabs', [[35.6, 44], [35.6, 44]]]), JSON.stringify(head));
  // Ab then Tab: the label kept and the focus on its value (CAP-T12CHARTCELLS2.json); the change redraws the grid, so the focus is kept by place.
  for (const k of ['A', 'b', 'Tab']) { browser(S, 'press', k); await pause(150); }
  const tabRow = q(`const a = document.activeElement; return JSON.stringify([fe.model.sections[1].blocks.find((o) => o.id === '${id}').chartData?.at(-1), a.dataset.dlCell ?? a.tagName]);`);
  add('Chart cell Ab then Tab: the row reads Ab, 0 and its value cell has the focus', JSON.stringify(tabRow) === JSON.stringify([['Ab', '0'], '4,1']), JSON.stringify(tabRow));
  undo(); undo();
  const plusSeries = q(`dl.querySelector('[data-dl-add="series"]')?.click(); await sleep(300); const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); const a = document.activeElement, L = dl.getBoundingClientRect().left, p = dl.querySelector('[data-dl-add="series"]'); return JSON.stringify([b.chartData?.map((r) => r.at(-1)), a.dataset.dlCell, Math.round(a.getBoundingClientRect().left - L), Math.round(p?.getBoundingClientRect().left - L), d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-bar').length]);`);
  add('Chart + after the series: 0s, its name cell focused at 275, the + at 385, two bars a label', JSON.stringify(plusSeries) === JSON.stringify([['', '0', '0', '0'], '0,2', 275, 385, 6]), JSON.stringify(plusSeries));
  // A 0 bar is a 1px line on the baseline, as wide as a bar, in its series' colour: the second swatch, rgb(191, 191, 191) in Grayscale (CAP-T12CHARTCELLS3.json headplus shot).
  const zero = q(`const z = [...d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-zero')], bars = [...d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-bar')], rule = d.querySelector('.fe-block[data-block-id="${id}"] .fe-chart-rule').getBoundingClientRect(); return JSON.stringify(z.map((p) => { const r = p.getBoundingClientRect(), b = bars[1].getBoundingClientRect(); return [getComputedStyle(p).stroke === getComputedStyle(bars[1]).fill, Math.abs(r.width - b.width) < 0.5, Math.abs(r.top - rule.top) < 0.6]; }));`);
  add('Chart 0 bars: three 1px lines on the baseline, bar wide, in the second series colour', JSON.stringify(zero) === JSON.stringify(Array(3).fill([true, true, true])), JSON.stringify(zero));
  // The lines, from the axis's top left in px (CAP-T12CHARTCELLS3.json headplus shot, by pixel): band edges at 124 and 247, the grid
  // and the axis from 3 above the top value, the axis and the edge ticks 4 below the baseline, value ticks 5 long; grid .05, axis .1.
  const lines = q(`const g = d.querySelector('.fe-block[data-block-id="${id}"] svg'); if (!g.querySelector('.fe-chart-axis + .fe-chart-axis')) return 'null'; const V = f.contentWindow, R = (e) => e.getBoundingClientRect(), ax = R(g.querySelector('.fe-chart-axis + .fe-chart-axis')), base = R(g.querySelector('.fe-chart-axis'));
    const v = [...g.querySelectorAll('.fe-chart-grid')].map(R).filter((r) => r.width < 1).map((r) => [Math.round(r.left - ax.left), Math.round(r.top - ax.top), Math.round(r.bottom - base.top)]);
    const ticks = [...g.querySelectorAll('.fe-chart-axis')].map(R).filter((r) => r.height < 1 && r.width < 10).map((r) => Math.round(r.width));
    const hz = [...g.querySelectorAll('.fe-chart-grid')].map(R).filter((r) => r.height < 1).length; return JSON.stringify({ hz, v: v.slice(0, 2), axis: [Math.round(base.top - ax.top), Math.round(ax.bottom - base.top)], ticks, op: [V.getComputedStyle(g.querySelector('.fe-chart-grid')).strokeOpacity, V.getComputedStyle(g.querySelector('.fe-chart-axis')).strokeOpacity] });`);
  add('Chart lines: band edges, the axis and its ticks where the oracle draws them', !!lines && JSON.stringify(lines.v) === JSON.stringify([[124, 0, 0], [247, 0, 0]]) && near(lines.axis, [170, 4], 1) && lines.ticks.length === lines.hz && lines.hz >= 2 && lines.ticks.every((w) => near([w], [5], 0.5)) && JSON.stringify(lines.op) === JSON.stringify(['0.05', '0.1']), JSON.stringify(lines));
  // Two series' bars stand apart, and each + is a 12px cross a little above its box's middle (CAP-T12CHARTCELLS3.json headplus shot, by pixel:
  // bars 54 wide 2.6 apart in a 123.5 band; the cross 12 by 12, its middle 17.2 across and 21.1 down the 35.6 by 44 box).
  const pair = q(`const r = [...d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-bar')].slice(0, 2).map((e) => [+e.getAttribute('x'), +e.getAttribute('width')]); return JSON.stringify([Math.round(r[0][1] * 10) / 10, Math.round(r[1][1] * 10) / 10, Math.round((r[1][0] - r[0][0] - r[0][1]) * 10) / 10]);`);
  add('Chart bars: two series 54 wide and 2.5 apart', near(pair, [54, 54, 2.6], 0.5), JSON.stringify(pair));
  const cross = q(`return JSON.stringify([...dl.querySelectorAll('.dl-plus')].map((p) => { const b = p.getBoundingClientRect(), g = p.querySelector('svg')?.getBoundingClientRect(); return g ? [g.width, g.height, Math.round((g.left + g.width / 2 - b.left) * 10) / 10, Math.round((g.top + g.height / 2 - b.top) * 10) / 10] : null; }));`);
  add('Chart +: each a 12px cross, its middle at 17.2, 21.1 in its box', cross.length >= 2 && cross.every((c) => c && c[0] === 12 && c[1] === 12 && near(c.slice(2), [17.2, 21.1], 0.5)), JSON.stringify(cross));
  // Tab from the new name skips the + and goes to New York's label, its text selected (CAP-T12CHARTCELLS3.json P8).
  browser(S, 'press', 'Tab'); await pause(200);
  const tabName = q(`const a = document.activeElement; return JSON.stringify([a.dataset.dlCell ?? a.tagName, a.selectionStart, a.selectionEnd]);`);
  add('Chart new series name then Tab: New York\'s label, its text selected', JSON.stringify(tabName) === JSON.stringify(['1,0', 0, 8]), JSON.stringify(tabName));
  // Shift+Tab goes back a cell: from Las Vegas's label to the row above's last value, past the + (CAP-T12CHARTKEYS.json).
  q(`dl.querySelector('[data-dl-cell="2,0"]').focus(); await sleep(100); return 'true';`);
  browser(S, 'press', 'Shift+Tab'); await pause(200);
  const back1 = q(`return JSON.stringify(document.activeElement.dataset.dlCell ?? document.activeElement.tagName);`);
  add('Chart Shift+Tab from Las Vegas\'s label: New York\'s last value', back1 === '1,2', JSON.stringify(back1));
  // Flipped with two series, the legend stays and names the rows in their colours (CAP-T12CHARTLEGEND2.json flip2 shot,
  // CAP-T12CHARTSERIES.json flip3); one undo step.
  pick('button[data-dl="chartFlip"]');
  p = parts();
  add('Chart flipped, two series: the legend names the rows in row colours', JSON.stringify(p.items.slice(0, 3).map((i) => i.slice(0, 2))) === JSON.stringify([['New York', 'rgb(240, 82, 59)'], ['Las Vegas', 'rgb(247, 180, 19)'], ['San Francisco', 'rgb(36, 128, 196)']]), JSON.stringify(p.items));
  const swap = q(`const g = d.querySelector('.fe-block[data-block-id="${id}"] svg'), ticks = [...g.querySelectorAll('.fe-chart-text')].filter((t) => !/^[0-9]+$/.test(t.textContent)), bars = [...g.querySelectorAll('.fe-chart-bar')]; return JSON.stringify([ticks.map((t) => t.textContent), bars.map((b) => b.getAttribute('fill'))]);`);
  add('Chart flipped, two series: a band per series under its name, a bar per row in row colours', JSON.stringify(swap) === JSON.stringify([['Population', ''], Array(2).fill(['rgb(240, 82, 59)', 'rgb(247, 180, 19)', 'rgb(36, 128, 196)']).flat()]), JSON.stringify(swap));
  undo();
  // The series + stays past three series: the grid scrolls and the + sits at 505 (CAP-T12PLUSFIND.json: 1057 with the dialog at 552).
  const more = q(`const out = []; for (let k = 0; k < 3; k++) { dl.querySelector('[data-dl-add="series"]')?.click(); await sleep(300); const p = dl.querySelector('[data-dl-add="series"]'); out.push(p ? Math.round(p.getBoundingClientRect().left - dl.getBoundingClientRect().left) : null); } return JSON.stringify(out);`);
  add('Chart + past three series: still there, at 495 then 505 with the grid scrolled', JSON.stringify(more) === JSON.stringify([495, 505, 505]), JSON.stringify(more));
  undo(); undo(); undo();
  undo();
  // Update (CAP-T12CHARTCELLS.json, CAP-T12CHARTCELLS2.json, CAP-T12CHARTCONFIRM.json): off while the box holds the data, on once it
  // differs; it asks Are You Sure? in a 350 by 138 box centred on it, Confirm focused. Cancel keeps the data and the box's text;
  // Confirm makes the text the data and Update goes off again.
  const csv = q(`dl.querySelector('[data-dl-tab="Import / Export"]').click(); await sleep(150); const t = dl.querySelector('textarea[data-dl-area]'), u = () => dl.querySelector('[data-dl-action="csv"]'); const was = u().disabled; t.value += '\\nEf,40'; t.dispatchEvent(new Event('input', { bubbles: true })); const on = !u().disabled; u().click(); await sleep(150); const box = dl.querySelector('.dl-confirm'), D = dl.getBoundingClientRect(), r = box?.getBoundingClientRect(), ur = u().getBoundingClientRect(); const geo = r ? [Math.round(r.left - D.left), Math.round(r.top - ur.top), r.width, r.height, document.activeElement.textContent, getComputedStyle(document.activeElement).outlineStyle, box.querySelector('.dl-confirm-title').textContent] : null; box?.querySelector('[data-dl-confirm="cancel"]').click(); await sleep(200); const b = () => fe.model.sections[1].blocks.find((o) => o.id === '${id}'); const kept = [b().chartData?.length ?? 4, dl.querySelector('textarea[data-dl-area]').value.endsWith('Ef,40'), !!dl.querySelector('.dl-confirm')]; u().click(); await sleep(150); dl.querySelector('.dl-confirm [data-dl-confirm="ok"]')?.click(); await sleep(300); return JSON.stringify([was, on, geo, kept, b().chartData?.length, b().chartData?.at(-1), u().disabled, d.querySelectorAll('.fe-block[data-block-id="${id}"] .fe-chart-bar').length]);`);
  add('Chart Update: off, on after an edit, Are You Sure? 111 in and 47 above it, Confirm focused, no ring', JSON.stringify(csv.slice(0, 3)) === JSON.stringify([true, true, [111, -47, 350, 138, 'Confirm', 'none', 'Are You Sure?']]), JSON.stringify(csv.slice(0, 3)));
  add('Chart Update: Cancel keeps the data and the box; Confirm takes the box, Update off again', JSON.stringify(csv.slice(3)) === JSON.stringify([[4, true, false], 5, ['Ef', '40'], true, 4]), JSON.stringify(csv.slice(3)));
  // Escape keeps the box and shows Confirm's ring; the dialog under the box takes no press, and a press there closes the box like
  // Cancel, the tab and the text kept, Update focused (CAP-T12CHARTASK.json escape and dataat).
  q(`const t = dl.querySelector('textarea[data-dl-area]'); t.value += '\\nGh,50'; t.dispatchEvent(new Event('input', { bubbles: true })); dl.querySelector('[data-dl-action="csv"]').click(); await sleep(150); return 'true';`);
  browser(S, 'press', 'Escape'); await pause(200);
  const ask = q(`const box = dl.querySelector('.dl-confirm'), a = document.activeElement, c = getComputedStyle(a), tab = dl.querySelector('[data-dl-tab="Data"]').getBoundingClientRect(), on = document.elementFromPoint(tab.left + tab.width / 2, tab.top + tab.height / 2); const esc = [!!box, a.dataset.dlConfirm ?? null, c.outlineStyle, c.outlineWidth, c.outlineColor, on === tab || tab.contains?.(on) ? 'tab' : on?.className];
    on.click(); await sleep(200); const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'), t = dl.querySelector('textarea[data-dl-area]');
    return JSON.stringify([esc, !!dl.querySelector('.dl-confirm'), !!dl.querySelector('.dl-veil'), dl.querySelector('.dl-tab.is-on, [data-dl-tab][aria-selected="true"]')?.textContent ?? null, t?.value.endsWith('Gh,50'), b.chartData?.length, document.activeElement.dataset.dlAction ?? null]);`);
  add('Chart Are You Sure?: Escape keeps it, Confirm ringed; the dialog under it is covered', JSON.stringify(ask[0]) === JSON.stringify([true, 'ok', 'solid', '2px', 'rgb(62, 62, 62)', 'dl-veil']), JSON.stringify(ask[0]));
  add('Chart Are You Sure?: a press outside closes it, tab, text and data kept, Update focused', JSON.stringify(ask.slice(1)) === JSON.stringify([false, false, 'Import / Export', true, 5, 'csv']), JSON.stringify(ask.slice(1)));
  for (let n = 0; n < 24; n++) undo();
  s = state(id);
  const back = q(`const b = fe.model.sections[1].blocks.find((o) => o.id === '${id}'); return JSON.stringify(b ? Object.keys(b).filter((k) => k.startsWith('chart')) : ['no block']);`);
  add('Chart: 24 undos, back to the plain chart and 8 rows', back.length === 0 && s.area === '1/2/9/10' && Math.abs(s.content - 250.4) <= 1, `${back} ${s.area} ${s.content}`);
}
writeFileSync(new URL('../parity/dialog-check.json', import.meta.url), `${JSON.stringify({ pass, total, results }, null, 1)}\n`);
console.log(`\n${pass} of ${total}`);
process.exit(pass === total ? 0 : 1);
