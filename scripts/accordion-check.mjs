// T12: a new accordion in our editor against what the oracle's did (parity/findings/ACCORDION.json):
// the attributes, boxes at 1600, each S M L choice, placement, the rows it takes after add, delete
// and expand, the panels' views, one undo step. Keys are real input. Writes parity/accordion-check.json.
// Usage: FLUID_SURFACE=cdp:<port> npm run accordion-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, browser, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/ACCORDION.json', import.meta.url)));
const ID = 'probe-accordion';
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(36)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, d = 0.6) => Math.abs(a - b) <= d;

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

// The block as the Add Block menu makes it, put on a known section and area.
evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = s.blocks.filter((b) => b.id !== '${ID}'); s.blocks.push({ id: '${ID}', type: 'accordion', items: [1, 2, 3].map((n) => ({ title: 'Accordion Item ' + n, description: 'Description text goes here' })), layout: { desktop: { area: [1, 2, 9, 10], z: 50, justify: 'flex-start', align: 'flex-start' }, mobile: { area: [1, 2, 9, 10], z: 50, justify: 'flex-start', align: 'flex-start' } } }); fe.load(next); await sleep(400); fe.select(s.id, '${ID}'); await sleep(200); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(250); return 'true'; })()`);
const click = async (sel) => { evalJs(S, `(() => { document.querySelector('#block-panel ${sel}').click(); return 'true'; })()`); await pause(220); };
const tab = (t) => click(`[data-btab="${t}"]`);
const read = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument; const root = d.querySelector('.fe-block[data-block-id="${ID}"]'); const ul = root.querySelector('.accordion-items-container'); const o = ul.getBoundingClientRect(); const box = (e) => { const r = e.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map((n) => Math.round(n * 10) / 10); }; const li = ul.querySelector('.accordion-item'); const btn = li.querySelector('button'); const cs = getComputedStyle(btn); const m = fe.model.sections.flatMap((s) => s.blocks).find((b) => b.id === '${ID}'); return JSON.stringify({ attrs: Object.fromEntries([...ul.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name, a.value])), ul: box(ul), li: box(li), n: ul.querySelectorAll('.accordion-item').length, titles: [...ul.querySelectorAll('.accordion-item__title')].map((t) => t.textContent), icon: box(li.querySelector('.accordion-icon-container')), line: box(li.querySelector('.plus__horizontal-line')), vline: box(li.querySelector('.plus__vertical-line')), vturn: getComputedStyle(li.querySelector('.plus__vertical-line')).transform, title: box(li.querySelector('.accordion-item__title')), pad: cs.padding, dir: cs.flexDirection, open: [...ul.querySelectorAll('.accordion-item')].map((l) => l.getAttribute('data-is-open')), desc: getComputedStyle(li.querySelector('.accordion-item__description')).fontSize, area: m.layout.desktop.area, undoFree: null, tag: root.querySelector('.sqs-block').className }); })()`);
const rows = () => { const a = read().area; return a[2] - a[0]; };
const panelText = () => evalJs(S, `(() => JSON.stringify(document.getElementById('block-panel').innerText.split('\\n').map((t) => t.trim()).filter(Boolean)))()`);
const undoLen = () => evalJs(S, `(async () => { fe.undo(); await new Promise((res) => setTimeout(res, 300)); return JSON.stringify(true); })()`);

const first = read();
add('Opens on Content', evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel [role="tab"][aria-selected="true"]')?.textContent))()`) === F.openTab, 'tab');
add('Tabs are Content and Design', evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-panel [role="tab"]')].map((t) => t.textContent).join()))()`) === 'Content,Design', 'tabs');
add('Same attributes', JSON.stringify(first.attrs) === JSON.stringify(F.base.attrs), JSON.stringify(first.attrs));
add('Three items with the names', first.titles.join() === F.base.titles.join(), first.titles.join());
add('List is 459.3 by 301', near(first.ul[2], F.css.ul.box[2]) && near(first.ul[3], F.rowPadding.M.ul), first.ul.join());
add('Item is 101', near(first.li[3], F.css.li.box[3]), first.li.join());
add('Icon box', first.icon.every((v, i) => near(v, F.base.icon[i])), first.icon.join());
add('Horizontal line', first.line.every((v, i) => near(v, F.base.line[i])), first.line.join());
add('Vertical line', first.vline.every((v, i) => near(v, F.base.vline[i])), first.vline.join());
add('Description is 16px', first.desc === '16px', first.desc);
add('Takes 8 rows', rows() === F.area[2] - F.area[0] , rows());

await click('[data-acc="add"]');
let r = read();
add('Add Item adds New Item', r.titles[3] === F.addItem.title, r.titles.join());
add('Fourth item takes 11 rows', r.area.join() === F.addItem.area.join(), r.area.join());
await undoLen(); await pause(250);
r = read();
add('One undo takes it away', r.n === 3 && r.area.join() === F.area.join(), `${r.n} ${r.area.join()}`);
await click('[data-acc="add"]');
await click('[data-acc="del:3"]');
r = read();
add('Delete has no dialog, 8 rows again', r.n === 3 && r.area.join() === F.deleteItem.area.join(), `${r.n} ${r.area.join()}`);

await click('[data-acc="open:1"]');
const item = panelText();
add('Item view rows', ['Back', 'Accordion Item 2', 'Title', 'Description', 'Duplicate', 'Delete'].every((t) => item.some((x) => x.toLowerCase() === t.toLowerCase())), item.join('|'));
r = read();
add('Item view opens it on the canvas', r.open[1] === 'true' && r.open[0] === null, r.open.join());
// Real keys stay in the field: Backspace must not remove the block.
evalJs(S, `(() => { const t = document.querySelector('#block-panel input[data-content="accTitle"]'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); return 'true'; })()`);
browser(S, 'press', 'Backspace'); await pause(150);
browser(S, 'press', 'X'); await pause(100);
browser(S, 'press', 'Enter'); await pause(300);
r = read();
add('Backspace edits the title only', r.titles[1] === 'Accordion Item X', r.titles.join());
await click('[data-acc="back"]');
r = read();
add('Back closes it', r.open[1] === null, r.open.join());

await tab('Design');
const design = panelText();
const want = ['Title', 'Heading 4', 'Description', 'Paragraph 2', 'Expand first item', 'Allow multiple open items', 'Dividers', 'Icon', 'Plus', 'Icon Size', 'Icon Thickness', 'Icon Placement', 'Row Padding', 'Background', 'Stroke', 'Blend Mode', 'Blur'];
const lost = want.filter((t) => !design.some((x) => x.toLowerCase().replace(/ ›$/, '') === t.toLowerCase()));
add('Design rows', !lost.length, lost.join());
add('Design has no transforms', !design.includes('Transforms'), 'Transforms');

const sml = async (key, v) => { await click(`button[data-acc-set="${key}"][data-v="${v}"]`); return read(); };
for (const k of ['S', 'M', 'L']) {
  r = await sml('rowPadding', k);
  add(`Row Padding ${k}`, r.pad === F.rowPadding[k].pad && near(r.ul[3], F.rowPadding[k].ul), `${r.pad} ${r.ul[3]}`);
}
r = await sml('rowPadding', 'M');
add('Rows follow the padding back', rows() === 8, rows());
for (const k of ['S', 'M', 'L']) { r = await sml('iconSize', k); add(`Icon Size ${k}`, r.icon[2] === F.iconSize[k] && r.icon[3] === F.iconSize[k], r.icon.join()); }
await sml('iconSize', 'S');
for (const k of ['S', 'M', 'L']) { r = await sml('iconThickness', k); add(`Icon Thickness ${k}`, `${r.line[3]}px` === F.iconThickness[k], r.line.join()); }
await sml('iconThickness', 'S');
r = await sml('iconLeft', 'left');
add('Icon left', r.dir === F.placement.left.dir && near(r.icon[0], F.placement.left.icon[0]) && near(r.title[0], F.placement.left.title[0]), `${r.dir} ${r.icon.join()} ${r.title.join()}`);
r = await sml('iconLeft', 'right');
add('Icon right', r.dir === F.placement.right.dir && near(r.icon[0], F.placement.right.icon[0]), `${r.dir} ${r.icon.join()}`);

const flip = async (label) => { evalJs(S, `(() => { document.querySelector('#block-panel input[aria-label="${label}"]').click(); return 'true'; })()`); await pause(250); return read(); };
r = await flip('Expand first item');
add('Expand first writes and opens', r.attrs['data-is-expanded-first-item'] === 'true' && r.open[0] === 'true' && near(r.ul[3], F.expandFirst.ulHeight) && r.area.join() === F.expandFirst.area.join(), `${r.open.join()} ${r.ul[3]} ${r.area.join()}`);
add('Open icon lies flat', near(r.vline[2], 14) && near(r.vline[3], 1), r.vline.join());
add('Open bar keeps a transform at 0 (91)', r.vturn === 'matrix(1, 0, 0, 1, 0, 0)', r.vturn); // SAMPLE-ROWS.json round 3
r = await flip('Expand first item');
add('Rows shrink again', r.area.join() === F.area.join(), r.area.join());
r = await flip('Allow multiple open items');
add('Allow multiple writes', r.attrs['data-should-allow-multiple-open-items'] === 'true', r.attrs['data-should-allow-multiple-open-items']);
await flip('Allow multiple open items');

await click('[data-acc="dividers"]');
const div = panelText();
add('Dividers view rows', ['Back', 'Dividers', 'Show first', 'Show last', 'Thickness', 'Opacity'].every((t) => div.some((x) => x.toLowerCase() === t.toLowerCase())), div.join('|'));
for (const [label, attr] of [['Dividers', 'data-is-divider-enabled'], ['Show first', 'data-is-first-divider-visible'], ['Show last', 'data-is-last-divider-visible']]) {
  r = await flip(label);
  add(`${label} writes`, r.attrs[attr] === 'false', r.attrs[attr]);
  r = await flip(label);
}
await click('[data-acc="design"]');
add('Back to Design', evalJs(S, `(() => JSON.stringify(!!document.querySelector('#block-panel input[aria-label="Expand first item"]')))()`) === true, 'no Expand row');

// Through the real menu: hover the section, Add Block, the Accordion tile.
goto(S, `${BASE}/index.html`); await pause(1500);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);
const spot = evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, sec = d.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120), fe.model.sections[1].blocks.length]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(500);
const added = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const had = new Set(fe.model.sections[1].blocks.map((x) => x.id)); document.querySelector('[data-sc="add-block"]').click(); await sleep(250); document.querySelector('button[data-add="Accordion"]').click(); await sleep(400); const b = fe.model.sections[1].blocks.find((x) => !had.has(x.id)); return JSON.stringify({ n: fe.model.sections[1].blocks.length, type: b.type, items: b.items?.map((i) => i.title + '/' + i.description), rows: b.layout.desktop.area[2] - b.layout.desktop.area[0], cols: b.layout.desktop.area[3] - b.layout.desktop.area[1], phone: b.layout.mobile.area[2] - b.layout.mobile.area[0] }); })()`);
// On the phone it is 5 rows high (CAP-TURNTEST.json p6, a section made here; this page's section is inferred to do the same).
add('A new accordion is 5 rows on the phone', added.phone === 5, `phone rows ${added.phone}`);
add('Add Block makes the default', added.n === spot[2] + 1 && added.type === 'accordion' && added.rows === 8 && added.cols === 8 && added.items.join() === F.base.titles.map((t) => `${t}/Description text goes here`).join(), JSON.stringify(added));

// On the published page a title opens its item and closes the other one.
evalJs(S, `(() => { const m = JSON.parse(JSON.stringify(fe.model)); localStorage.setItem('fluid-editor:model:v2', JSON.stringify(m)); return 'true'; })()`);
goto(S, `${BASE}/page.html?saved`); await pause(1500);
const pub = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const lis = [...document.querySelectorAll('.accordion-item')], t = (i) => lis[i].querySelector('button'), shown = () => lis.map((l) => getComputedStyle(l.querySelector('.accordion-item__dropdown')).display === 'block'); t(0).click(); await sleep(50); const a = shown(); t(1).click(); await sleep(50); const b = shown(); t(1).click(); await sleep(50); return JSON.stringify({ a, b, c: shown(), n: lis.length }); })()`);
add('Published titles toggle', pub.n === 3 && pub.a.join() === 'true,false,false' && pub.b.join() === 'false,true,false' && pub.c.join() === 'false,false,false', JSON.stringify(pub));

// Panel edits and the rows, both views, with what is below (CAP-ACCPHONE*.json), and the toolbar (CAP-ACCBAR.json).
goto(S, `${BASE}/index.html`); await pause(1500);
const FIND = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url))).reads;
const P1 = FIND('CAP-ACCPHONE'), P2 = FIND('CAP-ACCPHONE2'), P3 = FIND('CAP-ACCPHONE3'), P5 = FIND('CAP-ACCPHONE5'), P6 = FIND('CAP-ACCPHONE6'), BAR = FIND('CAP-ACCBAR');
const Q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'), fr = document.getElementById('site-frame'), d = fr.contentDocument; const blocks = () => fe.model.sections[0].blocks; const acc = () => blocks().find((b) => b.type === 'accordion'); const accEl = () => d.querySelector('.fe-block[data-block-id="' + acc().id + '"]'); ${body} })()`);
const pair = (r) => JSON.stringify((r.stack || []).map((b) => [b.desktop, b.phone]));
const stack = () => JSON.stringify(Q(`return JSON.stringify([acc(), ...blocks().filter((b) => b !== acc())].map((b) => [b.layout.desktop.area.join('/'), b.layout.mobile.area.join('/')]));`));
const height = () => Q(`return JSON.stringify(accEl().getBoundingClientRect().height);`);
// A new Accordion, a Shape after it; with `below` the Shape is where the read's was, 10/2/16/8 on 15 rows.
const start = async (bp, below) => { Q(`fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 2 }, phoneFollows: true, blocks: [] }] }); await sleep(200); fe.addBlock('s', 'Accordion'); await sleep(150); fe.addBlock('s', 'Shape'); await sleep(250); ${below ? `const m = JSON.parse(JSON.stringify(fe.model)); m.sections[0].blocks[1].layout.desktop.area = [10, 2, 16, 8]; m.sections[0].rows.desktop = 15; fe.load(m); await sleep(250);` : ''} fe.setBp('${bp}'); await sleep(400); return 'true';`); };
const openPanel = () => Q(`fe.select('s', acc().id); await sleep(150); if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(300); panel.querySelector('[data-btab="Content"]')?.click(); await sleep(200); return 'true';`);
const pressAcc = async (act) => { Q(`panel.querySelector('[data-acc="${act}"]').click(); await sleep(450); return 'true';`); };
// Real input, as the toolbar hides with a panel open: Escape twice, then a press on the block.
const pick = async () => { browser(S, 'press', 'Escape'); await pause(120); browser(S, 'press', 'Escape'); await pause(120); const c = Q(`const f = accEl().getBoundingClientRect(), o = fr.getBoundingClientRect(); return JSON.stringify([o.left + f.left + f.width / 2, o.top + f.top + f.height / 2]);`); mouse(S, 'move', c[0], c[1]); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(300); };
const BAR_LABELS = ['Edit', 'Align Vertically', 'Pin', 'Move Up', 'Move Down', 'Duplicate', 'Remove'];
const theirs = (r, min) => { const l = r.controls.filter((c) => c.box[0] > min && BAR_LABELS.includes(c.label)).map((c) => [c.label, c.box[0]]); return JSON.stringify(l.map((x) => [x[0], Math.round((x[1] - l[0][1]) * 10) / 10])); };
const ours = () => JSON.stringify(Q(`const l = [...document.querySelectorAll('#block-toolbar > .tb-btn')].map((b) => [b.getAttribute('aria-label'), b.getBoundingClientRect().left]); return JSON.stringify(l.map((x) => [x[0], Math.round((x[1] - l[0][1]) * 10) / 10]));`));

await start('mobile');
add('Phone: new, 286 high', near(height(), P1['phone, new'].gridEls[0].box[3], 1), height());
await openPanel(); await pressAcc('add');
add('Phone Add Item moves what is below', stack() === pair(P2['phone, Add Item']), stack());
add('Phone Add Item: 409 high', near(height(), 409, 1), height());
await start('mobile'); await openPanel(); await pressAcc('del:2');
add('Phone Delete: 5 rows stay', stack() === pair(P5['phone, 2 items']), stack());
await pressAcc('open:0');
Q(`const t = panel.querySelector('[data-content="accTitle"]'); t.value = 'A rather long new title for this first accordion item, to run onto more lines than before and more'; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); await sleep(450); return 'true';`);
add('Phone, then a long title', stack() === pair(P5['phone, long title']), stack());
await start('desktop'); await openPanel(); await pressAcc('add');
add('Desktop Add Item: phone stays', stack().startsWith('[["1/2/12/10","1/2/6/10"]') && P3['desktop, Add Item'].stack[0].desktop === '1/2/12/10', stack());
add('Desktop Add Item: 441 high', near(height(), P3['desktop, Add Item'].gridEls[0].box[3], 1), height());
await start('desktop', true);
add('A Shape below: the start', stack() === pair(P6.start), stack());
await openPanel(); await pressAcc('add');
add('Desktop Add Item moves it', stack() === pair(P6['Add Item']), stack());
add('The section grows, 18 rows', Q(`return JSON.stringify(fe.model.sections[0].rows.desktop);`) === P6['Add Item'].section.rows, Q(`return JSON.stringify(fe.model.sections[0].rows.desktop);`));
await pressAcc('del:3');
add('Delete moves it back', stack() === pair(P6['Delete it']), stack());
add('The section is 15 rows again', Q(`return JSON.stringify(fe.model.sections[0].rows.desktop);`) === P6['Delete it'].section.rows, Q(`return JSON.stringify(fe.model.sections[0].rows.desktop);`));
Q(`fe.undo(); await sleep(300); return 'true';`);
add('One undo for edit and move', stack() === pair(P6['Add Item']), stack());
// Where the other block is: lower in other columns, overlapping, at the same row, above (CAP-ACCBELOW*.json). A step shows every
// block as it read, in the read's order.
const seed = (rows, shape, accRow) => Q(`fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 2 }, phoneFollows: true, blocks: [] }] }); await sleep(200); fe.addBlock('s', 'Accordion'); await sleep(150); fe.addBlock('s', 'Shape'); await sleep(250); const m = JSON.parse(JSON.stringify(fe.model)), s = m.sections[0], a = s.blocks[0], o = s.blocks[1]; o.layout.desktop.area = ${JSON.stringify(shape)}; if (${accRow} > 1) a.layout.desktop.area = [${accRow}, 2, ${accRow + 8}, 10]; s.rows.desktop = ${rows}; fe.load(m); await sleep(300); return 'true';`);
const areas = () => JSON.stringify(Q(`return JSON.stringify([...blocks()].map((b) => [b.type, b.layout.desktop.area.join('/')]).sort());`));
const wantAreas = (r, types) => JSON.stringify(r.stack.map((b, k) => [types[k], b.desktop]).sort());
for (const [file, accAt, shape, rows, accRow] of [['CAP-ACCBELOW', 0, [10, 12, 16, 18], 15, 1], ['CAP-ACCBELOW2', 0, [5, 6, 11, 12], 10, 1], ['CAP-ACCBELOW3', 0, [1, 12, 7, 18], 8, 1], ['CAP-ACCBELOW4', 1, [1, 6, 7, 12], 10, 3]]) {
  const R = FIND(file), types = accAt ? ['shape', 'accordion'] : ['accordion', 'shape'], secRows = () => Q(`return JSON.stringify(fe.model.sections[0].rows.desktop);`);
  seed(rows, shape, accRow);
  add(`${file}: the start`, areas() === wantAreas(R.start, types), areas());
  await openPanel(); await pressAcc('add');
  add(`${file}: Add Item`, areas() === wantAreas(R['Add Item'], types) && secRows() === R['Add Item'].section.rows, `${areas()} ${secRows()}`);
  await pressAcc('del:3');
  add(`${file}: Delete`, areas() === wantAreas(R['Delete it'], types) && secRows() === R['Delete it'].section.rows, `${areas()} ${secRows()}`);
}
// A long title on the phone, then Escape or Back (CAP-ACCPHONE7.json to CAP-ACCPHONE10.json).
const LONG = 'A rather long new title for this first accordion item, to run onto more lines than before and more';
const longTitle = () => Q(`const t = panel.querySelector('[data-content="accTitle"]'); t.value = '${LONG}'; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); await sleep(450); return 'true';`);
const esc = async () => { browser(S, 'press', 'Escape'); await pause(400); };
const P7 = FIND('CAP-ACCPHONE7'), P8 = FIND('CAP-ACCPHONE8'), P9 = FIND('CAP-ACCPHONE9'), P10 = FIND('CAP-ACCPHONE10');
await start('mobile'); await openPanel(); await pressAcc('open:0'); longTitle();
add('Long title, 3 items', stack() === pair(P7['long title']), stack());
await esc();
add('Then Escape gives rows back', stack() === pair(P7['then Escape']), stack());
add('Then 388 high, rows stretched', near(height(), 25.3 * 11 + 110, 2), height());
Q(`fe.setBp('desktop'); await sleep(400); fe.setBp('mobile'); await sleep(400); return 'true';`);
add('The views keep it', stack() === pair(P7['phone again']), stack());
await start('mobile'); await openPanel(); await pressAcc('del:2'); await pressAcc('open:0'); longTitle();
add('Long title, 2 items', stack() === pair(P8['long title']), stack());
await esc();
add('Then Escape, 2 items', stack() === pair(P8['then Escape']), stack());
await start('mobile'); await openPanel(); await pressAcc('open:0'); longTitle(); await pressAcc('back');
add('Back keeps the rows', stack() === pair(P9['then Back']), stack());
await esc();
add('Back, then Escape keeps them', stack() === pair(P9['then Escape']), stack());
await start('mobile'); await openPanel(); await pressAcc('add'); await pressAcc('open:0');
add('Add Item, an item opened', stack() === pair(P10['item view']), stack());
await esc();
add('Escape with no edit keeps them', stack() === pair(P10['then Escape']), stack());
// A longer description typed on the phone refits with the field still focused (CAP-T12ACCDESC.json, CAP-T12ACCDESC2.json); the
// typing is one undo step from its first key (inferred), on the block it was typed in, through Cmd+Z and a press on another block.
const D = FIND('CAP-T12ACCDESC'), DESC = 'A longer description for this first item, written to run onto several lines on the phone so that the open item takes more room than the default one does.';
const DEF = 'Description text goes here', descOf = () => Q(`return JSON.stringify(acc().items[0].description);`);
const typeDesc = () => Q(`const t = panel.querySelector('[data-content="accDescription"]'); t.focus(); for (const v of ['${DESC.slice(0, 60)}', '${DESC}']) { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); await sleep(250); } await sleep(200); return JSON.stringify(document.activeElement === t);`);
await start('mobile'); await openPanel(); await pressAcc('open:0');
add('Item 1 open on the phone', stack() === pair(D['item view']), stack());
const kept = typeDesc();
add('A typed description, still focused', stack() === pair(D['long description']) && kept === true, `${stack()} ${kept}`);
Q(`panel.querySelector('[data-content="accDescription"]').dispatchEvent(new Event('change', { bubbles: true })); await sleep(400); fe.undo(); await sleep(400); return 'true';`);
add('Its change is one undo step', stack() === pair(D['item view']) && descOf() === DEF, stack());
// An undo while the field still has the typing (fe.undo, as the page's Undo runs; Cmd+Z in the field stays the field's own):
// the typing goes as one step, the blur after it takes nothing, then one redo brings it back and one undo takes it again.
await start('mobile'); await openPanel(); await pressAcc('open:0'); typeDesc();
Q(`fe.undo(); await sleep(400); document.activeElement?.blur(); await sleep(400); return 'true';`);
const zA = [stack(), descOf()];
browser(S, 'press', 'Meta+Shift+z'); await pause(400); const zB = [stack(), descOf()];
browser(S, 'press', 'Meta+z'); await pause(400); const zC = [stack(), descOf()];
add('Typed, an undo, the blur: one redo and one undo stay right', JSON.stringify([zA, zB, zC]) === JSON.stringify([[pair(D['item view']), DEF], [pair(D['long description']), DESC], [pair(D['item view']), DEF]]), JSON.stringify([zA, zB, zC]));
// Typed back to its start, then the blur (no change fires): the focusout settles it, and one undo gives the item view back.
await start('mobile'); await openPanel(); await pressAcc('open:0'); typeDesc();
Q(`const t = panel.querySelector('[data-content="accDescription"]'); t.value = '${DEF}'; t.dispatchEvent(new Event('input', { bubbles: true })); await sleep(300); t.blur(); await sleep(300); fe.undo(); await sleep(400); return 'true';`);
add('Typed back to its start, the blur: one undo gives the item view back', stack() === pair(D['item view']) && descOf() === DEF, stack());
// A press on the Shape below while typing: the typing stays on the Accordion, one undo step, the Shape untouched.
await start('mobile'); await openPanel(); await pressAcc('open:0'); typeDesc();
const sp = Q(`const o = fr.getBoundingClientRect(), s = blocks().find((b) => b !== acc()), e = d.querySelector('.fe-block[data-block-id="' + s.id + '"]'); e.scrollIntoView({ block: 'center' }); await sleep(150); const r = e.getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width / 2, o.top + r.top + r.height / 2]);`);
mouse(S, 'move', sp[0], sp[1]); await pause(60); mouse(S, 'down', sp[0], sp[1], { buttons: 1 }); await pause(40); mouse(S, 'up', sp[0], sp[1]); await pause(500);
const pA = [descOf(), Q(`return JSON.stringify(blocks().find((b) => b !== acc()).items ?? null);`)];
Q(`fe.undo(); await sleep(400); return 'true';`); const pB = descOf();
add('Typed, then a press on the Shape: the Accordion keeps it, one undo step', pA[0] === DESC && pA[1] === null && pB === DEF, JSON.stringify([pA, pB]));
// The toolbar.
await start('desktop', true); await pick();
add('Desktop bar and spacing', ours() === theirs(BAR['desktop bar'], 90), ours());
await start('mobile'); await pick();
add('Phone bar and spacing', ours() === theirs(P1['phone, selected'], 600), ours());
// 3 items in 11 rows, as the read: the block made taller, content 301 in 441.
await start('desktop'); Q(`const m = JSON.parse(JSON.stringify(fe.model)); const s = m.sections[0], o = s.blocks.find((b) => b.type === 'accordion'); o.layout.desktop.area = [1, 2, 12, 10]; s.blocks = [o]; s.rows.desktop = 11; fe.load(m); await sleep(300); return 'true';`); await pick();
const before = Q(`return JSON.stringify(accEl().querySelector('.accordion-items-container').getBoundingClientRect().top);`);
Q(`document.querySelector('#block-toolbar [data-tb="align"]').click(); await sleep(200); document.querySelector('[data-tb="valign:flex-end"]').click(); await sleep(300); return 'true';`);
const after = Q(`return JSON.stringify(accEl().querySelector('.accordion-items-container').getBoundingClientRect().top);`);
add('Align Bottom on 11 rows: 140.1 down', near(after - before, 140.1, 1), after - before);

console.log(`Accordion: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/accordion-check.json', import.meta.url), `${JSON.stringify({ check: 'accordion block', pass, total, results }, null, 2)}\n`);
if (!total || pass !== total) process.exitCode = 1;
