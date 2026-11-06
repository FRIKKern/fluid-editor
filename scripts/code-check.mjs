// T10: type into our code and embed Edit panels and compare what the block holds with what the
// oracle's did (parity/findings/CODEEMBED.json): the HTML of each mode, Display Source Code, the
// panel's rows and size, growth, Embed data, the bad-link error, one undo step. Keys are real
// input, so a Backspace in the code must stay in the code. Writes parity/code-check.json.
// Usage: FLUID_SURFACE=cdp:<port> npm run code-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, browser, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/CODEEMBED.json', import.meta.url)));
const M = JSON.parse(readFileSync(new URL('../parity/findings/CODEMODAL.json', import.meta.url)));
const read = (name) => JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(34)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const norm = (s) => String(s).replace(/\s+/g, ' ').replace(/> </g, '><').trim();

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

// Add through the same code the Add Block menu uses: a new block in the last section.
const start = (type, extra) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const id = 'probe-${type}'; s.blocks = s.blocks.filter((b) => b.id !== id); s.blocks.push({ id, type: '${type}', ${extra} layout: { desktop: { area: ${type === 'code' ? '[1, 2, 7, 6]' : '[1, 2, 9, 10]'}, z: 50, justify: 'flex-start', align: 'flex-start' }, mobile: { area: ${type === 'code' ? '[1, 2, 7, 10]' : '[1, 2, 9, 10]'}, z: 50, justify: 'flex-start', align: 'flex-start' } } }); fe.load(next); await sleep(400); fe.select(s.id, id); await sleep(200); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(250); return JSON.stringify(id); })()`);
const htmlOf = (id, sel) => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument; const e = d.querySelector('.fe-block[data-block-id="${id}"] ${sel}'); return JSON.stringify(e ? e.innerHTML : null); })()`);
const typeInto = async (sel, text) => { evalJs(S, `(() => { const t = document.querySelector('#block-panel ${sel}'); t.focus(); t.select(); return 'true'; })()`); evalJs(S, `(() => { document.execCommand('insertText', false, ${JSON.stringify(text)}); return 'true'; })()`); await pause(200); };
const blur = () => evalJs(S, `(() => { const a = document.activeElement; a.blur(); return 'true'; })()`);
const setMode = async (v) => { evalJs(S, `(() => { const m = document.querySelector('#block-panel select[aria-label="Mode"]'); m.value = '${v}'; m.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(250); };
const want = (k) => F.code.writes[k].replace(/^<div class="sqs-code-container">|<\/div>$/g, '');

const code = start('code', `html: '<p>Hello, World!</p>',`);
const panel = evalJs(S, `(() => { const P = document.getElementById('block-panel'); const r = P.getBoundingClientRect(); return JSON.stringify({ w: r.width, tab: P.querySelector('[aria-selected="true"]')?.textContent, modes: [...P.querySelectorAll('select[aria-label="Mode"] option')].map((o) => o.textContent), source: !!P.querySelector('input[aria-label="Display Source Code"]'), value: P.querySelector('textarea[data-content="code"]')?.value }); })()`);
add('Opens on Content', panel.tab === F.code.openTab, panel.tab);
add('Panel is 575 wide', panel.w === F.code.panels.Content.box[2], panel.w);
add('Mode lists', panel.modes.join() === F.code.modes.join(), panel.modes.join());
add('Holds the code', panel.value === '<p>Hello, World!</p>', panel.value);

await typeInto('textarea[data-content="code"]', '<h2 class="x">Hi</h2>'); blur(); await pause(200);
add('Typed HTML shows as HTML', norm(htmlOf(code, '.sqs-code-container')) === '<h2 class="x">Hi</h2>', htmlOf(code, '.sqs-code-container'));

// A real Backspace stays in the code and leaves the block alone.
evalJs(S, `(() => { const t = document.querySelector('#block-panel textarea[data-content="code"]'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); return 'true'; })()`);
browser(S, 'press', 'Backspace'); await pause(200);
const back = evalJs(S, `(() => JSON.stringify({ value: document.querySelector('#block-panel textarea[data-content="code"]')?.value, block: !!document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${code}"]') }))()`);
add('Backspace edits the code only', back.block && back.value === '<h2 class="x">Hi</h2', JSON.stringify(back));
browser(S, 'press', '>'); await pause(100); blur(); await pause(200);

evalJs(S, `(() => { const c = document.querySelector('#block-panel input[aria-label="Display Source Code"]'); c.click(); return 'true'; })()`); await pause(250);
add('Display Source Code', norm(htmlOf(code, '.sqs-code-container')) === norm(want('Display Source Code on')).replace(/&lt;h2 class="x"&gt;/, '&lt;h2 class=&quot;x&quot;&gt;') || norm(htmlOf(code, '.sqs-code-container')) === norm(want('Display Source Code on')), htmlOf(code, '.sqs-code-container'));
evalJs(S, `(() => { const c = document.querySelector('#block-panel input[aria-label="Display Source Code"]'); c.click(); return 'true'; })()`); await pause(250);

await setMode('markdown');
await typeInto('textarea[data-content="code"]', '# Title\n\nSome *text*'); blur(); await pause(200);
add('Markdown renders', norm(htmlOf(code, '.sqs-code-container')) === norm(want('Markdown')), htmlOf(code, '.sqs-code-container'));
await setMode('css');
await typeInto('textarea[data-content="code"]', 'p { color: red }'); blur(); await pause(200);
add('CSS shows as source', norm(htmlOf(code, '.sqs-code-container')) === norm(want('CSS')), htmlOf(code, '.sqs-code-container'));
const on = evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel input[aria-label="Display Source Code"]').checked))()`);
add('CSS turns the source switch on', on === true, on);
await setMode('html');
await typeInto('textarea[data-content="code"]', '<b>x</b>'); blur(); await pause(200);
add('Source stays on back on HTML', norm(htmlOf(code, '.sqs-code-container')) === norm(want('HTML after Plain Text')), htmlOf(code, '.sqs-code-container'));

// Growth: long code adds rows; the steps below read the rest.
const rows = () => evalJs(S, `(() => { const b = fe.model.sections[1].blocks.find((x) => x.id === '${code}'); return JSON.stringify(b.layout.desktop.area); })()`);
evalJs(S, `(() => { const c = document.querySelector('#block-panel input[aria-label="Display Source Code"]'); c.click(); return 'true'; })()`); await pause(250);
await typeInto('textarea[data-content="code"]', '<p>a</p>'.repeat(30)); blur(); await pause(300);
add('Long code adds rows', rows()[2] > 7, rows());

// Undo: one step takes the last typing back.
const undone = evalJs(S, `(async () => { const a = JSON.stringify(fe.model); fe.undo(); await new Promise((r) => setTimeout(r, 300)); const b = fe.model.sections[1].blocks.find((x) => x.id === '${code}'); return JSON.stringify({ changed: a !== JSON.stringify(fe.model), html: b.html }); })()`);
add('Undo is one step', undone.changed && undone.html === '<b>x</b>', JSON.stringify(undone));

// Embed
const embed = start('embed', '');
const e0 = evalJs(S, `(() => { const P = document.getElementById('block-panel'); return JSON.stringify({ tab: P.querySelector('[aria-selected="true"]')?.textContent, text: P.textContent, w: P.getBoundingClientRect().width }); })()`);
add('Embed opens on Content, 320 wide', e0.tab === F.embed.openTab && e0.w === F.embed.panels.Content.box[2], JSON.stringify([e0.tab, e0.w]));
for (const l of ['Embed as', 'Link', 'Code Snippet', 'Custom thumbnail', 'Only available for embedded videos.', 'Description']) add(`Embed row ${l}`, e0.text.includes(l) && F.embed.panels.Content.text.includes(l), l);
add('Empty embed text', /Embed Block/.test(htmlOf(embed, '.sqs-embed-container')) && /Add an embed URL or code\./.test(htmlOf(embed, '.sqs-embed-container')), htmlOf(embed, '.sqs-embed-container'));
await typeInto('input[data-content="embedUrl"]', 'not-a-real-link'); blur(); await pause(300);
const bad = evalJs(S, `(() => JSON.stringify({ panel: document.getElementById('block-panel').textContent.includes(${JSON.stringify(F.embed.afterBadUrl.panelError)}), html: document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${embed}"] .sqs-embed-container').innerHTML }))()`);
add('Bad link shows the errors', bad.panel && bad.html.includes(F.embed.afterBadUrl.message) && bad.html.includes('data-state="invalid"'), JSON.stringify(bad));
evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="code"]').click(); return 'true'; })()`); await pause(200);
evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="data"]').click(); return 'true'; })()`); await pause(200);
await typeInto('textarea[data-content="embedHtml"]', '<p class="probe">Embedded</p>'); blur(); await pause(250);
add('Embed data writes the snippet', norm(htmlOf(embed, '.sqs-embed-container')) === norm(F.embed.embedData.writes).replace(/^<div class="sqs-embed-container">|<\/div>$/g, '').trim(), htmlOf(embed, '.sqs-embed-container'));
const backed = evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="back"]').click(); return JSON.stringify(document.getElementById('block-panel').textContent.includes('Embed as')); })()`);
add('Back returns to the tab', backed === true, backed);
const design = evalJs(S, `(() => { const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Design"]').click(); const t = P.textContent; return JSON.stringify({ transforms: t.includes('Transforms'), stroke: t.includes('Stroke'), background: t.includes('Background') }); })()`);
add('Design is the transforms alone', design.transforms && !design.stroke && !design.background, JSON.stringify(design));

// Learn More ends the embed's note and opens a new tab (CODEMODAL.json).
const embed2 = start('embed', '');
const learn = evalJs(S, `(() => { const a = [...document.querySelectorAll('#block-panel a')].find((x) => x.textContent === 'Learn More'); if (!a) return JSON.stringify(null); const c = getComputedStyle(a); return JSON.stringify({ target: a.target, last: a === a.parentElement.lastElementChild && a.parentElement.textContent.startsWith('Paste the URL'), font: [c.fontSize, c.fontWeight, c.textDecorationLine] }); })()`);
add('Learn More ends the note, new tab', learn?.target === '_blank' && learn.last && learn.font[0] === M.learnMore.font[0] && learn.font[1] === M.learnMore.font[1] && learn.font[2] === M.learnMore.font[3], JSON.stringify(learn));
add('Embed data has no Expand', evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="code"]').click(); document.querySelector('#block-panel [data-embed="data"]').click(); return JSON.stringify(!document.querySelector('#block-panel [data-code-expand]')); })()`));

// The rows of a block as its content changes, step by step as the oracle's did.
const LINES = (n) => Array.from({ length: n }, (_, k) => `<p>row ${k}</p>`).join('\n');
const STEP = { thirty: LINES(30), twelve: LINES(12), eight: LINES(8), three: LINES(3), tall: '<p style="height:300px">d</p>' };
const rowsOf = (id) => evalJs(S, `(() => { const a = fe.model.sections[1].blocks.find((x) => x.id === '${id}').layout.desktop.area; return JSON.stringify(a[2] - a[0]); })()`);
const setText = async (sel, text, through) => { evalJs(S, `(() => { const t = document.querySelector('#block-panel ${sel}'); t.focus(); t.select(); if (${!!through} || !${JSON.stringify(text)}) document.execCommand('delete'); if (${JSON.stringify(text)}) { t.select(); document.execCommand('insertText', false, ${JSON.stringify(text)}); } return 'true'; })()`); await pause(120); };
const walk = async (name, id, sel, list, through) => {
  for (const [key, want] of list) {
    await setText(sel, STEP[key] ?? key, through);
    const got = rowsOf(id);
    add(`${name} ${key || 'empty'}: ${want} rows`, got === want, got);
  }
  blur(); await pause(150);
};
const code2 = start('code', `html: '<p>Hello, World!</p>',`);
await walk('Code', code2, 'textarea[data-content="code"]', M.rows.code.steps);
for (const [name, seq] of [['Embed', M.rows.embed], ['Embed again', M.rows.embedAgain]]) {
  const id = start('embed', '');
  evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="code"]').click(); document.querySelector('#block-panel [data-embed="data"]').click(); return 'true'; })()`); await pause(200);
  await walk(name, id, 'textarea[data-content="embedHtml"]', seq.steps, true);
}

// More line counts, falls, a real pull and the phone, step by step as the oracle's walk went
// (CAP-T10ROWS.json, CAP-T10DOWN.json, CAP-T10PULL.json), each in a section of its own.
const CODE_FIELD = 'textarea[data-content="code"]';
const fresh = (type, extra) => { evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.setBp('desktop'); fe.load(next); await new Promise((res) => setTimeout(res, 200)); return 'true'; })()`); return start(type, extra); };
const areasOf = (id) => evalJs(S, `(() => { const l = fe.model.sections[1].blocks.find((x) => x.id === '${id}').layout; return JSON.stringify([l.desktop.area.join('/'), l.mobile.area.join('/')]); })()`);
const toEmbedData = `document.querySelector('#block-panel [data-embed="code"]').click(); document.querySelector('#block-panel [data-embed="data"]').click();`;
const openPanel = async (id, embed) => { evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const P = document.getElementById('block-panel'); if (P.hidden || !P.querySelector('textarea[data-content]')) { fe.select(fe.model.sections[1].id, '${id}'); await sleep(150); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(200); ${embed ? toEmbedData : ''} } return 'true'; })()`); await pause(150); };
// A pull is real mouse, by rows. The phone pull is not compared (CAP-T10PULL.json's notCompared): 6 rows
// from a block its 2 lines overrun land where the oracle's did, so the step after it can be compared.
const pullPx = async (id, dir, dx, dy) => {
  const p = evalJs(S, `(async () => { const sid = fe.model.sections[1].id; fe.select(sid, '${id}'); await new Promise((res) => setTimeout(res, 200)); const f = document.getElementById('site-frame'), o = f.getBoundingClientRect(), h = f.contentDocument.querySelector('.fe-handle[data-dir="${dir}"]'); h.scrollIntoView({ block: 'center' }); await new Promise((res) => setTimeout(res, 150)); const r = h.getBoundingClientRect(); return JSON.stringify({ x: o.left + r.x + r.width / 2, y: o.top + r.y + r.height / 2, row: fe.measure(sid).pitch }); })()`);
  drag(S, [p.x, p.y], [p.x + dx, p.y + dy]); await pause(300);
  return p;
};
const PITCH = (id) => evalJs(S, `(() => JSON.stringify(fe.measure(fe.model.sections[1].id).pitch))()`);
const pullRows = (id, rows) => pullPx(id, 's', 0, rows * PITCH(id));
const FINDING_PULLS = { 'pulled 4 rows taller': 4, 'pull 3 up with 12 lines': -3, 'phone pulled': 6 };
for (const name of ['CAP-T10ROWS', 'CAP-T10DOWN', 'CAP-T10PULL']) {
  const f = read(name), id = fresh('code', `html: '<p>Hello, World!</p>',`);
  await pause(200);
  for (let k = 0; k < f.steps.length; k++) {
    const [op, a, opt] = f.steps[k];
    if (op === 'setCode') { await openPanel(id); await setText(CODE_FIELD, a); }
    if (op === 'view') { evalJs(S, `(async () => { fe.setBp('${a === 'Mobile' ? 'mobile' : 'desktop'}'); await new Promise((res) => setTimeout(res, 300)); return 'true'; })()`); await pause(200); }
    if (op === 'drag') { const next = f.steps.slice(k).find((x) => x[0] === 'read')[1]; await pullRows(id, FINDING_PULLS[next]); }
    if (op === 'read' && opt?.areas === 0) {
      const want = f.reads[a].areas[0].join(), got = areasOf(id).join();
      add(`${name.slice(4)} ${a}: ${want}`, got === want, got);
    }
  }
  evalJs(S, `(() => { fe.setBp('desktop'); return 'true'; })()`); await pause(200);
}

// An embed's first snippet of each length, then the same again: no change (CAP-T10EMBED.json).
const EMBED = read('CAP-T10EMBED');
for (const n of [1, 2, 3, 4, 6, 8, 10, 14]) {
  const id = fresh('embed', ''), snippet = Array.from({ length: n }, (_, k) => `<p>row ${k + 1}</p>`).join('');
  evalJs(S, `(() => { document.querySelector('#block-panel [data-embed="code"]').click(); document.querySelector('#block-panel [data-embed="data"]').click(); return 'true'; })()`); await pause(200);
  await setText('textarea[data-content="embedHtml"]', snippet);
  add(`Embed, first ${n} lines: ${EMBED.reads[`first snippet ${n}`].block.desktop}`, areasOf(id)[0] === EMBED.reads[`first snippet ${n}`].block.desktop, areasOf(id)[0]);
  await setText('textarea[data-content="embedHtml"]', `${snippet} `);
  add(`Embed, ${n} lines again: same`, areasOf(id)[0] === EMBED.reads[`same again ${n}`].block.desktop, areasOf(id)[0]);
}

// Sequences the rule hadn't seen when their predictions were pushed (CAP-T10FRESH.json).
const FRESH = read('CAP-T10FRESH');
const inViewNow = async (change) => { evalJs(S, `(() => { document.querySelector('#block-panel [data-code-expand]').click(); ${change} document.querySelector('#code-modal .code-modal-close').click(); return 'true'; })()`); await pause(250); };
const modeIn = (v) => `{ const m = document.querySelector('#code-modal select'); m.value = '${v}'; m.dispatchEvent(new Event('change', { bubbles: true })); }`;
for (const [name, q] of Object.entries(FRESH.sequences)) {
  const embed = q.type === 'Embed', field = embed ? 'textarea[data-content="embedHtml"]' : CODE_FIELD;
  viewport(S, q.width || 1600, q.width ? 900 : 1000);
  const id = fresh(q.type.toLowerCase(), embed ? '' : `html: '<p>Hello, World!</p>',`);
  if (q.view) { evalJs(S, `(async () => { fe.setBp('mobile'); await new Promise((res) => setTimeout(res, 300)); return 'true'; })()`); await pause(100); }
  if (q.view || embed) { evalJs(S, `(() => { document.getElementById('block-panel').hidden = true; return 'true'; })()`); }
  await openPanel(id, embed);
  for (let k = 0; k < q.ops.length; k++) {
    const op = q.ops[k], want = q.reads[k];
    if (op[0] === 'code') { await openPanel(id, embed); await setText(field, op[2]); }
    if (op[0] === 'pull') await pullPx(id, op[2], op[3], op[4]);
    if (op[0] === 'view') { await openPanel(id, embed); await inViewNow(`${modeIn(op[2].toLowerCase())} ${op[3] ? `document.querySelector('#code-modal input[data-content="showSource"]').click();` : ''}`); }
    if (op[0] === 'switch') { await openPanel(id, embed); evalJs(S, `(() => { document.querySelector('#block-panel input[aria-label="Display Source Code"]').click(); return 'true'; })()`); await pause(200); }
    if (want) add(`Fresh ${name} ${op[1]}: ${want.areas.join()}`, areasOf(id).join() === want.areas.join(), areasOf(id).join());
  }
}
viewport(S, 1600, 1000);
evalJs(S, `(() => { fe.setBp('desktop'); return 'true'; })()`); await pause(200);

// Mode and the switch in the Code Editor view reach the block on closing, and give rows up (CAP-T10VIEW.json).
const VIEW = read('CAP-T10VIEW');
const viewId = fresh('code', `html: '<p>Hello, World!</p>',`);
await setText(CODE_FIELD, '<p>row 1</p><p>row 2</p><p>row 3</p>'); blur(); await pause(150);
const inView = async (change) => { evalJs(S, `(() => { document.querySelector('#block-panel [data-code-expand]').click(); ${change} document.querySelector('#code-modal .code-modal-close').click(); return 'true'; })()`); await pause(250); };
const pickMode = (v) => `{ const m = document.querySelector('#code-modal select'); m.value = '${v}'; m.dispatchEvent(new Event('change', { bubbles: true })); }`;
for (const [what, change, want] of [['CSS', pickMode('css'), 'closed on CSS'], ['Markdown', pickMode('markdown'), 'closed on Markdown'], ['HTML, switch off', `${pickMode('html')} document.querySelector('#code-modal input[data-content="showSource"]').click();`, 'closed, switch off']]) {
  await inView(change);
  const r = VIEW.reads[want], got = areasOf(viewId).join(), html = htmlOf(viewId, '.sqs-code-container');
  add(`View, closed on ${what}: ${r.areas[0][0]}`, got === r.areas[0].join() && norm(html) === norm(r.htmlOf), `${got} ${html}`);
}

// Markdown through the Code block's mode, on the real page, against the oracle's HTML for each
// sample (CAP-T10MD.json; the parser alone runs in npm run check, node scripts/check-markdown.mjs).
const MD = read('CAP-T10MD');
const mdId = fresh('code', `html: '<p>Hello, World!</p>',`);
await setMode('markdown');
const htmlNorm = (h) => String(h).replace(/\s+/g, ' ').replace(/> /g, '>').replace(/ </g, '<').trim();
for (let k = 0; k < MD.steps.length; k++) {
  if (MD.steps[k][0] !== 'setCode') continue;
  const name = MD.steps.slice(k + 1, k + 4).find((x) => x[0] === 'read')[1];
  await setText(CODE_FIELD, MD.steps[k][1]);
  const want = MD.reads[name].htmlOf, script = name === 'html' ? (h) => h.replace(/<div class="sqs-blockStatus">.*?Preview in safe mode<\/div><\/div><\/div>/s, '').replace('<div class="removed-script">Script Disabled</div>', '') : (h) => h;
  const got = script(htmlOf(mdId, '.sqs-code-container'));
  add(`Markdown ${name}`, htmlNorm(got) === htmlNorm(want), got);
}

// A script (CAP-T10MD2.json): a note in its place under a status box, rows as if the box weren't there.
const MD2 = read('CAP-T10MD2');
const scriptId = fresh('code', `html: '<p>Hello, World!</p>',`);
await setText(CODE_FIELD, MD2.steps.find((x) => x[0] === 'setCode')[1]);
const inScript = MD2.reads['code html with script'];
add('Script: note under a status box', norm(htmlOf(scriptId, '.sqs-code-container')) === norm(inScript.htmlOf), htmlOf(scriptId, '.sqs-code-container'));
add('Script: the box takes no rows', areasOf(scriptId).join() === inScript.areas[0].join(), areasOf(scriptId).join());
const boxes = evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, b = d.querySelector('.fe-block[data-block-id="${scriptId}"]').getBoundingClientRect(), q = (s) => { const r = d.querySelector('.fe-block[data-block-id="${scriptId}"] ' + s).getBoundingClientRect(); return [r.x - b.x, r.y - b.y, r.width, r.height]; }; return JSON.stringify(['.sqs-blockStatus', '.sqs-blockStatus-box', '.sqs-blockStatus-box-title', '.sqs-blockStatus-box-message', '.sqs-blockStatus-box-button', '.removed-script'].map(q)); })()`);
inScript.sel.forEach((e, i) => { const o = inScript.sel[0].box, w = [e.box[0] - o[0], e.box[1] - o[1], e.box[2], e.box[3]]; add(`Script: box of ${e.cls}`, w.every((v, j) => Math.abs(v - boxes[i][j]) <= 1.5), `${boxes[i]} want ${w}`); });
const handler = MD2.steps.filter((x) => x[0] === 'setCode')[1][1];
await setText(CODE_FIELD, handler);
add('A handler stays in HTML mode', norm(htmlOf(scriptId, '.sqs-code-container')) === norm(MD2.reads['code html with handler'].htmlOf), htmlOf(scriptId, '.sqs-code-container'));
blur(); await pause(150);
await setMode('css');
const locked = evalJs(S, `(() => { const c = document.querySelector('#block-panel input[aria-label="Display Source Code"]'); c.click(); return JSON.stringify({ on: c.checked, disabled: c.disabled, html: document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${scriptId}"] .sqs-code-container').innerHTML }); })()`);
add('CSS holds the switch on', locked.on && locked.disabled && norm(locked.html) === norm(MD2.reads['css switch pressed'].htmlOf), JSON.stringify(locked));
const embedScript = fresh('embed', '');
evalJs(S, `(() => { ${toEmbedData} return 'true'; })()`); await pause(200);
await setText('textarea[data-content="embedHtml"]', MD2.steps.filter((x) => x[0] === 'setCode')[2][1]);
add('Embed: a script, its rows', areasOf(embedScript)[0] === MD2.reads['embed with script'].block.desktop, areasOf(embedScript)[0]);
add('Embed: a note under a status box', htmlNorm(htmlOf(embedScript, '.sqs-embed-container')) === htmlNorm(MD2.reads['embed with script'].htmlOf), htmlOf(embedScript, '.sqs-embed-container'));

// Expand: a full-screen view with its own copy of the code. Real keys and clicks.
const code3 = start('code', `html: '<p>Hello, World!</p>',`);
const blockText = () => htmlOf(code3, '.sqs-code-container');
add('Expand sits where the oracle\'s does', (() => { const r = evalJs(S, `(() => { const P = document.querySelector('#block-panel .bp-code').getBoundingClientRect(), r = document.querySelector('#block-panel [data-code-expand]').getBoundingClientRect(); return JSON.stringify([P.right - r.right, P.bottom - r.bottom, r.width, r.height]); })()`); return r.join() === '4,4,36,36'; })());
const open = () => evalJs(S, `(() => { document.querySelector('#block-panel [data-code-expand]').click(); return JSON.stringify(!document.getElementById('code-modal').hidden); })()`);
add('Expand opens the view', open() === true);
const box = (sel) => `(() => { const r = document.querySelector('#code-modal ${sel}').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`;
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
const geo = evalJs(S, `(() => JSON.stringify({ box: ${box('.code-modal-box')}, close: ${box('.code-modal-close')}, mode: ${box('select')}, editor: ${box('.bp-code')}, scrim: ${box('.code-modal-scrim')}, c: (() => { const s = getComputedStyle(document.querySelector('.code-modal-scrim')); return [s.backgroundColor, s.opacity]; })() }))()`);
add('View 900 by 675, centred', near(geo.box, M.expand.modal.box), geo.box);
add('Close in its place', Math.abs(geo.close[0] - M.expand.modal.close.box[0]) <= 1 && Math.abs(geo.close[1] - M.expand.modal.close.box[1]) <= 1 && geo.close[3] === 44, geo.close);
add('Mode 406 wide, in its place', near(geo.mode, M.expand.modal.mode), geo.mode);
add('Editor 834 by 471, in its place', near(geo.editor, M.expand.modal.editor), geo.editor);
add('Scrim colour and opacity', geo.c[0] === M.expand.modal.scrim.color && geo.c[1] === M.expand.modal.scrim.opacity, geo.c);
const typeModal = (text) => evalJs(S, `(() => { const t = document.querySelector('#code-modal textarea'); t.focus(); t.select(); document.execCommand('insertText', false, ${JSON.stringify(text)}); return 'true'; })()`);
typeModal('<p>one</p>'); await pause(200);
add('The block waits while it is open', blockText() === '<p>Hello, World!</p>', blockText());
browser(S, 'press', 'Backspace'); await pause(150);
add('Backspace stays in the code', evalJs(S, `(() => JSON.stringify(document.querySelector('#code-modal textarea').value === '<p>one</p'))()`) && !!fe_block(code3));
function fe_block(id) { return evalJs(S, `(() => JSON.stringify(!!fe.model.sections[1].blocks.find((x) => x.id === '${id}')))()`); }
typeModal('<p>one</p>');
evalJs(S, `(() => { document.querySelector('#code-modal .code-modal-close').click(); return 'true'; })()`); await pause(250);
add('Close writes the block and the panel', blockText() === '<p>one</p>' && evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel textarea[data-content="code"]').value))()`) === '<p>one</p>', blockText());
const undoneModal = evalJs(S, `(async () => { fe.undo(); await new Promise((r) => setTimeout(r, 300)); return JSON.stringify(fe.model.sections[1].blocks.find((x) => x.id === '${code3}').html); })()`);
add('One undo takes it all back', undoneModal === '<p>Hello, World!</p>', undoneModal);
const reselected = evalJs(S, `(async () => { fe.select(fe.model.sections[1].id, '${code3}'); await new Promise((r) => setTimeout(r, 150)); if (document.getElementById('block-panel').hidden) document.querySelector('#block-toolbar [data-tb="edit"]').click(); await new Promise((r) => setTimeout(r, 200)); return JSON.stringify(!!document.querySelector('#block-panel [data-code-expand]')); })()`);
open(); await pause(100);
browser(S, 'press', 'Escape'); await pause(200);
const afterEsc = evalJs(S, `(() => JSON.stringify({ gone: document.getElementById('code-modal').hidden, panel: !document.getElementById('block-panel').hidden }))()`);
add('Escape closes it, the panel stays', reselected && afterEsc.gone && afterEsc.panel, JSON.stringify(afterEsc));
open(); await pause(100);
const r0 = evalJs(S, `(() => { document.querySelector('.code-modal-scrim').click(); return JSON.stringify({ gone: document.getElementById('code-modal').hidden, panel: !document.getElementById('block-panel').hidden }); })()`);
add('A scrim click closes it, the panel stays', r0.gone && r0.panel, JSON.stringify(r0));

// Add Block > Markdown (CAP-T10PRE.json, CAP-T10MD*.json): a type of its own, with real presses and keys.
const PRE = read('CAP-T10PRE'), MD3 = read('CAP-T10MD3'), MD5 = read('CAP-T10MD5'), MD6 = read('CAP-T10MD6'), MD7 = read('CAP-T10MD7');
const MD_FIELD = 'textarea[data-content="markdown"]';
const mdBlock = (id, what = 'innerHTML') => evalJs(S, `(() => { const e = document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${id}"] .sqs-block-markdown .sqs-block-content'); return JSON.stringify(e ? e.${what} : null); })()`);
const mdBox = (q) => evalJs(S, `(() => { const e = document.querySelector(${JSON.stringify(q)}); if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height]); })()`);
const pressAt = async (q) => { const b = mdBox(q); if (!b) throw new Error(`nothing at ${q}`); drag(S, [b[0] + b[2] / 2, b[1] + b[3] / 2], [b[0] + b[2] / 2, b[1] + b[3] / 2], { steps: 1, holdMs: 30 }); await pause(220); };
const key = async (k) => { browser(S, 'press', k); await pause(120); };
const mdVal = (root = '#block-panel') => evalJs(S, `(() => JSON.stringify(document.querySelector('${root} ${MD_FIELD}').value))()`);
const setMd = async (t) => { await setText(MD_FIELD, t); evalJs(S, `(() => { document.querySelector('#block-panel ${MD_FIELD}').focus(); return 'true'; })()`); await pause(80); };
const caret = (at) => evalJs(S, `(() => { const f = document.querySelector('#block-panel ${MD_FIELD}'); f.focus(); f.setSelectionRange(${at}, ${at}); return 'true'; })()`);
const selAll = () => evalJs(S, `(() => { const f = document.querySelector('#block-panel ${MD_FIELD}'); f.focus(); f.select(); return 'true'; })()`);
const mdBtn = (label) => `#block-panel .bp-md-bar [aria-label="${label}"]`;
const line = (name, f = MD5) => f.reads[name].panelEls.map((p) => p.label).filter((l) => l !== 'Toggle visibility' && l !== 'Add markdown…').join('\n');
const freshMd = async () => {
  evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 16, mobile: 16 }; fe.setBp('desktop'); fe.load(next); await new Promise((res) => setTimeout(res, 200)); return 'true'; })()`);
  const id = evalJs(S, `(async () => { const sid = fe.model.sections[1].id; fe.addBlock(sid, 'Markdown'); await new Promise((res) => setTimeout(res, 300)); return JSON.stringify(fe.model.sections[1].blocks.at(-1).id); })()`);
  await openPanel(id);
  return id;
};
const md = await freshMd();
const land = PRE.reads['markdown selected'].block;
add('Markdown lands in its place', areasOf(md).join() === [land.desktop, land.mobile].join(), areasOf(md).join());
add('Markdown holds its placeholder', norm(mdBlock(md)) === norm(MD.reads.start.htmlOf), mdBlock(md));
const mdLook = evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, b = d.querySelector('.fe-block[data-block-id="${md}"]'), st = b.querySelector('.sqs-blockStatus'), P = document.getElementById('block-panel'); return JSON.stringify({ cls: b.querySelector('.sqs-block').className, type: b.querySelector('.sqs-block').dataset.blockType, color: b.ownerDocument.defaultView.getComputedStyle(st).color, z: b.ownerDocument.defaultView.getComputedStyle(st).zIndex, h: st.getBoundingClientRect().height, tabs: [...P.querySelectorAll('[role=tab]')].map((e) => e.textContent), bar: [...document.querySelectorAll('#block-toolbar button')].map((e) => e.getAttribute('aria-label')), ph: P.querySelector('${MD_FIELD}').placeholder }); })()`);
add('Markdown class and type', mdLook.cls.includes('sqs-block-markdown') && mdLook.cls.includes('markdown-block') && mdLook.type === '1337', mdLook.cls);
add('Placeholder colour, z, height', mdLook.color === 'rgba(0, 0, 0, 0.3)' && mdLook.z === '1001' && Math.abs(mdLook.h - 22.4) < 0.6, JSON.stringify(mdLook));
add('Content tab alone', mdLook.tabs.join() === 'Content', mdLook.tabs.join());
add('Markdown toolbar', mdLook.bar.join() === PRE.reads['markdown selected'].controls.slice(9).map((c) => c.label).filter((l) => !l.startsWith('Move')).join(), mdLook.bar.join());
add('Editor placeholder', mdLook.ph === 'Add markdown…', mdLook.ph);
// The panel's parts, from its corner (the oracle's is at 343, 301).
const pBox = mdBox('#block-panel'), inP = (b) => [b[0] - pBox[0] + 343, b[1] - pBox[1] + 301, b[2], b[3]];
add('Panel 575 by 500', pBox[2] === 575 && pBox[3] === 500, pBox);
const readBar = PRE.reads['markdown panel'].controls;
for (const l of ['Heading', 'Bold', 'Italic', 'Link', 'Bulleted List', 'Numbered List', 'Quote']) {
  const w = readBar.find((c) => c.label === l).box, g = inP(mdBox(`#block-panel .bp-md-bar [aria-label="${l}"]`));
  add(`${l} in its place`, g.every((v, i) => Math.abs(v - w[i]) <= 1.5), `${g} want ${w}`);
}
const wantExp = readBar.find((c) => c.label === '' && c.box[2] === 36).box, gotExp = inP(mdBox('#block-panel .bp-code-expand'));
add('Expand in its place', gotExp.every((v, i) => Math.abs(v - wantExp[i]) <= 1.5), `${gotExp} want ${wantExp}`);
const gotEd = inP(mdBox('#block-panel .bp-code')), wantEd = PRE.reads['markdown panel'].panelEls[0].box;
add('Editor in its place', gotEd.every((v, i) => Math.abs(v - wantEd[i]) <= 1.5), `${gotEd} want ${wantEd}`);
const wantA = readBar.find((c) => c.role === 'a').box, gotA = inP(mdBox('#block-panel .bp-md-note a'));
add('Cheatsheet link in its place', Math.abs(gotA[0] - wantA[0]) <= 3 && Math.abs(gotA[1] - wantA[1]) <= 2, `${gotA} want ${wantA}`);
add('Cheatsheet is our own note', evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel .bp-md-note a').getAttribute('href')))()`) === 'help-markdown.html');

// All 19 samples through the block, with the rows each left on the oracle.
for (let k = 0; k < MD.steps.length; k++) {
  if (MD.steps[k][0] !== 'setCode') continue;
  const name = MD.steps.slice(k + 1, k + 4).find((x) => x[0] === 'read')[1];
  await setMd(MD.steps[k][1]);
  add(`Block ${name}`, htmlNorm(mdBlock(md)) === htmlNorm(MD.reads[name].htmlOf), mdBlock(md));
  if (MD.reads[name].areas) add(`Block ${name} rows`, areasOf(md)[0] === MD.reads[name].areas[0][0], `${areasOf(md)[0]} want ${MD.reads[name].areas[0][0]}`);
}

// Rows on emptying (CAP-T10MD6.json): its placeholder is 22 tall like any line, so the rule stays the same.
const mdRows = await freshMd();
const checkRows = (name) => add(`Rows: ${name}`, areasOf(mdRows)[0] === MD6.reads[name].areas[0][0], `${areasOf(mdRows)[0]} want ${MD6.reads[name].areas[0][0]}`);
const empty = async () => { selAll(); await key('Backspace'); await pause(150); };
const TEN = 'a\n\nb\n\nc\n\nd\n\ne\n\nf\n\ng\n\nh\n\ni\n\nj';
checkRows('fresh');
await setMd('a'); checkRows('one letter');
await empty(); checkRows('emptied from 6'); add('Emptied: the placeholder is back', norm(mdBlock(mdRows)) === norm(MD6.reads['emptied from 6'].htmlOf), mdBlock(mdRows));
await setMd('a'); checkRows('a after empty');
await empty(); checkRows('emptied from 2');
await setMd(TEN); checkRows('ten paragraphs');
await empty(); checkRows('emptied from ten');
await setMd('# a'); checkRows('h1');
await empty(); checkRows('emptied from h1');
await setMd(TEN); checkRows('ten again');
await setMd('a'); checkRows('ten to one');
await empty(); checkRows('emptied after the fall');

// The toolbar, by real presses (CAP-T10MD2.json, CAP-T10MD3.json, CAP-T10MD6.json).
const MD2R = MD2.reads, firstLabel = (r) => r.panelEls.map((p) => p.label).join('');
const m = await freshMd();
const pressOn = async (btn, text, name, want) => { await setMd(text); selAll(); await pressAt(mdBtn(btn)); add(name, mdVal() === want, JSON.stringify(mdVal())); };
for (const [btn, x] of [['Bold', 'bold empty typed'], ['Italic', 'italic empty typed'], ['Bulleted List', 'bullet empty typed'], ['Numbered List', 'number empty typed'], ['Quote', 'quote empty typed']]) {
  await empty(); await pressAt(mdBtn(btn)); await key('x');
  add(`${btn} on nothing, then a letter`, mdVal() === firstLabel(MD2R[x]), JSON.stringify(mdVal()));
}
await pressOn('Bold', 'word', 'Bold wraps a selection', firstLabel(MD2R['bold selected']));
await pressAt(mdBtn('Bold')); add('Bold again takes it off', mdVal() === firstLabel(MD2R['bold again']), JSON.stringify(mdVal()));
await pressOn('Italic', 'word', 'Italic wraps a selection', firstLabel(MD2R['italic selected']));
await pressOn('Bold', 'one\ntwo', 'Bold over two lines', line('bold over two lines', MD7));
await pressOn('Bulleted List', 'one\ntwo', 'Bullets on two lines', '* one\n* two');
await pressAt(mdBtn('Bulleted List')); add('Bullets again', mdVal() === 'one\ntwo', JSON.stringify(mdVal()));
await pressOn('Numbered List', 'one\ntwo', 'Numbers on two lines', '1. one\n1. two');
await pressOn('Quote', 'one\ntwo', 'Quote on two lines', '> one\n> two');
await pressOn('Quote', 'word', 'Quote', '> word'); await pressAt(mdBtn('Quote')); add('Quote twice', mdVal() === line('quote twice', MD6), JSON.stringify(mdVal()));
await pressOn('Numbered List', 'word', 'Number', '1. word'); await pressAt(mdBtn('Numbered List')); add('Number twice', mdVal() === line('number twice', MD6), JSON.stringify(mdVal()));
await pressOn('Bulleted List', 'word', 'Bullet', '* word'); await pressAt(mdBtn('Numbered List')); add('Bullet then number', mdVal() === line('bullet then number', MD6), JSON.stringify(mdVal()));
// Heading's list.
await setMd('word'); selAll(); await pressAt(mdBtn('Heading'));
const hList = evalJs(S, `(() => { const l = document.querySelector('#block-panel .bp-md-list'); const r = l.getBoundingClientRect(), P = document.getElementById('block-panel').getBoundingClientRect(); return JSON.stringify({ names: [...l.children].map((e) => e.textContent), box: [r.left - P.left + 343, r.top - P.top + 301, r.width, r.height], on: document.querySelector('#block-panel .bp-md-heading').classList.contains('is-on') }); })()`);
add('Heading lists five', hList.names.join() === 'Paragraph,Heading 1,Heading 2,Heading 3,Heading 4', hList.names.join());
add('The list in its place', Math.abs(hList.box[0] - 384) <= 1 && Math.abs(hList.box[1] - 408) <= 1 && Math.abs(hList.box[2] - 80) <= 1 && Math.abs(hList.box[3] - 220) <= 1 && hList.on, JSON.stringify(hList));
const pickH = async (n) => { await pressAt(`#block-panel .bp-md-list button:nth-child(${n + 1})`); };
await pickH(1);
add('Heading 1', mdVal() === firstLabel(MD3.reads['h1 picked']) && norm(mdBlock(m)) === MD3.reads['h1 picked'].htmlOf, `${mdVal()} ${mdBlock(m)}`);
const headWide = mdBox(mdBtn('Heading'));
add('The button follows its name', Math.abs(headWide[2] - MD3.reads['h1 picked'].controls.find((c) => c.label === 'Heading').box[2]) <= 3 && evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel .bp-md-heading span').textContent))()`) === 'Heading 1', headWide);
await pressAt(mdBtn('Heading')); await pickH(2); add('Heading 2 takes over', mdVal() === firstLabel(MD3.reads['h2 picked']), JSON.stringify(mdVal()));
await pressAt(mdBtn('Heading')); await pickH(0); add('Paragraph takes it off', mdVal() === firstLabel(MD3.reads['paragraph picked']), JSON.stringify(mdVal()));
await setMd('## one\nline two'); selAll(); await pressAt(mdBtn('Heading')); await pickH(3); add('Heading on two lines', mdVal() === line('heading on two lines', MD6), JSON.stringify(mdVal()));
await setMd('word'); selAll(); await pressAt(mdBtn('Heading')); await pressAt('#block-panel .bp-md-note'); add('A press away closes the list', evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel .bp-md-list').hidden))()`) === true);
// The toolbar follows the caret; Bold and Italic never show.
const onBtns = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-panel .bp-md-btn.is-on')].map((e) => e.getAttribute('aria-label'))))()`).join();
for (const [text, at, want] of [['* a', 3, 'Bulleted List'], ['1. a', 4, 'Numbered List'], ['> a', 3, 'Quote'], ['**bold**', 4, ''], ['*ital*', 3, '']]) { await setMd(text); caret(at); await pause(120); add(`On ${text}: ${want || 'nothing'} shows`, onBtns() === want, onBtns()); }
await setMd('## h'); caret(4); await pause(120);
add('On a heading its name shows', evalJs(S, `(() => JSON.stringify(document.querySelector('#block-panel .bp-md-heading span').textContent))()`) === 'Heading 2');
// No shortcuts (CAP-T10MD5.json).
for (const k of ['Meta+b', 'Meta+i', 'Meta+k']) { await setMd('word'); selAll(); await key(k); add(`${k} does nothing`, mdVal() === line(k) && evalJs(S, `(() => JSON.stringify(document.getElementById('link-popover').hidden))()`) === true, JSON.stringify(mdVal())); }
// Enter and Backspace on a list line (CAP-T10MD5.json, CAP-T10MD6.json).
const keysOn = async (text, keys, want, name) => { await setMd(text); caret(text.length); for (const k of keys) await key(k); add(name, mdVal() === want, JSON.stringify(mdVal())); };
await keysOn('* a', ['Enter', 'b'], line('Enter on bullet'), 'Enter on a bullet');
await keysOn('1. a', ['Enter', 'b'], line('Enter on number'), 'Enter on a number');
await keysOn('> a', ['Enter', 'b'], line('Enter on quote'), 'Enter on a quote');
await keysOn('* a', ['Enter', 'Enter', 'b'], line('Enter twice on a bullet', MD6), 'Enter twice on a bullet');
await keysOn('1. a', ['Enter', 'Enter', 'b'], line('Enter twice on a number', MD6), 'Enter twice on a number');
await keysOn('> a', ['Enter', 'Enter', 'b'], line('Enter twice on a quote', MD6), 'Enter twice on a quote');
await keysOn('* a', ['Enter', 'Backspace', 'b'], line('Backspace on a new bullet', MD6), 'Backspace on a new bullet');
const MD8 = read('CAP-T10MD8');
await keysOn('* a', ['Enter', 'Enter', 'Enter', 'b'], line('Enter three times on a bullet', MD8), 'Enter three times on a bullet');
await keysOn('1. a', ['Enter', 'Enter', 'Enter', 'b'], line('Enter three times on a number', MD8), 'Enter three times on a number');
await keysOn('> a', ['Enter', 'Enter', 'Enter', 'b'], line('Enter three times on a quote', MD8), 'Enter three times on a quote');
await keysOn('1. a', ['Enter', 'Backspace', 'b'], line('Backspace on a new number', MD8), 'Backspace on a new number');
await keysOn('> a', ['Enter', 'Backspace', 'b'], line('Backspace on a new quote', MD8), 'Backspace on a new quote');
await keysOn('plain', ['Enter', 'b'], line('Enter on plain', MD8), 'Enter on plain');
await setMd('* ab'); caret(3); await key('Enter'); await key('c'); add('Enter mid line', mdVal() === line('Enter mid line', MD8), JSON.stringify(mdVal()));
await setMd('* a'); caret(0); await key('Enter'); add('Enter at the start of a bullet', mdVal() === line('Enter at the start of a bullet', MD8), JSON.stringify(mdVal()));

// Link (CAP-T10MD3.json, CAP-T10MD4.json, CAP-T10MD5.json, CAP-T10MD7.json).
const linkOpen = () => evalJs(S, `(() => JSON.stringify(!document.getElementById('link-popover').hidden))()`);
const page = (href) => `#link-popover .lk-page[data-href="${href}"]`;
const noUrl = (s) => s.replace(/<https>/g, 'https://');
await setMd('word'); selAll(); await pressAt(mdBtn('Link'));
const inPanel = (b) => { const P = mdBox('#block-panel'); return [b[0] - P[0] + 343, b[1] - P[1] + 301, b[2], b[3]]; };
const lr = MD3.reads['link services'].controls, lk = (l) => lr.find((c) => c.label === l).box;
add('Link: URL pill in its place', inPanel(mdBox('#link-popover .lk-pill')).slice(0, 2).every((v, i) => Math.abs(v - lk('URL')[i]) <= 2), inPanel(mdBox('#link-popover .lk-pill')));
add('Link: field in its place', inPanel(mdBox('#link-popover .lk-row')).every((v, i) => Math.abs(v - lk('Enter link, search, or add files')[i]) <= 2), inPanel(mdBox('#link-popover .lk-row')));
add('Link: first page in its place', inPanel(mdBox(page('/services'))).every((v, i) => Math.abs(v - lk('Services/services')[i]) <= 5), `${inPanel(mdBox(page('/services')))} want ${lk('Services/services')}`);
add('Link: no new tab box here', evalJs(S, `(() => JSON.stringify(document.querySelector('#link-popover .lk-newtab').offsetHeight))()`) === 0);
add('Link: the button stays lit', mdBox('#block-panel .bp-md-btn.is-on') !== null);
await pressAt(page('/services'));
add('A page fills the field and stays', evalJs(S, `(() => JSON.stringify(document.querySelector('#link-popover .lk-input').value))()`) === '/services' && linkOpen() && mdVal() === 'word', JSON.stringify(mdVal()));
await key('Enter');
add('Enter writes it and closes', mdVal() === line('option then Enter') && !linkOpen() && htmlNorm(mdBlock(m)) === MD5.reads['option then Enter'].htmlOf, `${mdVal()} ${mdBlock(m)}`);
await setMd('word'); selAll(); await pressAt(mdBtn('Link')); await pressAt(page('/services')); await pressAt('#block-panel .sp-tab');
add('A press away writes it too', mdVal() === line('option then press away') && !linkOpen(), JSON.stringify(mdVal()));
const onCaret = async (text, at, how, want, name) => { await setMd(text); caret(at); await pressAt(mdBtn('Link')); if (typeof how === 'string') await pressAt(page(how)); else { for (const c of how) await key(c); } await key('Enter'); add(name, mdVal() === want, JSON.stringify(mdVal())); };
await onCaret('word', 4, '/about', line('caret at end, option, Enter'), 'A caret at the end: the address is the words');
await onCaret('word more', 0, '/about', line('caret at start, option, Enter'), 'A caret at the start');
await empty(); await pressAt(mdBtn('Link')); await pressAt(page('/about')); await key('Enter');
add('An empty block', mdVal() === line('empty, option, Enter', MD7), JSON.stringify(mdVal()));
await setMd('word'); selAll(); await pressAt(mdBtn('Link')); for (const c of 'example.test') await key(c); await key('Enter');
add('A typed domain gains https', mdVal() === noUrl(line('typed domain')), JSON.stringify(mdVal()));
// A caret in a link: the link, with Edit, Copy and Remove Link.
await setMd('[a](/x)'); caret(2); await pressAt(mdBtn('Link'));
const sum = evalJs(S, `(() => JSON.stringify({ href: document.querySelector('#link-popover .lk-md-href')?.textContent, acts: [...document.querySelectorAll('#link-popover [data-md-link]')].map((e) => e.textContent) }))()`);
add('A link shows with Edit, Copy, Remove Link', sum.href === '/x' && sum.acts.join() === 'Edit,Copy,Remove Link', JSON.stringify(sum));
await pressAt('#block-panel .sp-tab'); add('A press away leaves it', mdVal() === '[a](/x)' && !linkOpen(), JSON.stringify(mdVal()));
caret(2); await pressAt(mdBtn('Link')); await pressAt('#link-popover [data-md-link="remove"]');
add('Remove Link', mdVal() === line('remove link', MD7) && !linkOpen(), JSON.stringify(mdVal()));
await setMd('see [a](/x) now'); caret(5); await pressAt(mdBtn('Link')); await pressAt('#link-popover [data-md-link="remove"]');
add('Remove Link mid line', mdVal() === line('remove link mid line', MD7), JSON.stringify(mdVal()));
await setMd('[a](/x)'); caret(2); await pressAt(mdBtn('Link')); await pressAt('#link-popover [data-md-link="edit"]');
add('Edit shows the field with the link', evalJs(S, `(() => JSON.stringify(document.querySelector('#link-popover .lk-input')?.value))()`) === '/x', 'no field');
await key('Meta+a'); await key('/'); await key('y'); await key('Enter');
add('Edit writes the new address', mdVal() === line('edit link written', MD7), JSON.stringify(mdVal()));
await onCaret('word', 2, ['/', 'z'], line('caret mid word, typed', MD7), 'A caret mid word');
await setMd('word'); selAll(); await pressAt(mdBtn('Link')); await pressAt(page('/services')); await key('Escape'); await pause(200);
const esc = evalJs(S, `(() => JSON.stringify({ text: fe.model.sections[1].blocks.find((x) => x.id === '${m}').text, panel: document.getElementById('block-panel').hidden, bar: document.getElementById('block-toolbar').hidden, pop: document.getElementById('link-popover').hidden }))()`);
add('Escape drops it and lets the block go', esc.text === 'word' && esc.panel && esc.pop, JSON.stringify(esc));

// Undo: a press is one step, and typing before it another (CAP-T10MD7.json).
const mu = await freshMd();
const pressBar = (l) => pressAt(`[aria-label="${l}"]:not(#block-panel *)`);
await setMd('**one\ntwo**'); await pressAt('#block-panel .sp-tab');
await setMd('one'); await pressAt('#block-panel .sp-tab');
await pressBar('Undo'); await pause(250);
add('Undo after typing', mdVal() === line('undo after typing', MD7) && htmlNorm(mdBlock(mu)) === htmlNorm(MD7.reads['undo after typing'].htmlOf), `${mdVal()} ${mdBlock(mu)}`);
await pressBar('Redo'); await pause(250);
add('Redo after typing', mdVal() === line('redo after typing', MD7), JSON.stringify(mdVal()));
await setMd('two'); selAll(); await pressAt(mdBtn('Bold')); await pressBar('Undo'); await pause(250);
add('Undo after Bold', mdVal() === line('undo after bold', MD7), JSON.stringify(mdVal()));
await pressBar('Undo'); await pause(250);
add('Undo takes the typing next', mdVal() === line('undo twice', MD7), JSON.stringify(mdVal()));

// Double-click, and the Code Editor view (CAP-T10MD3.json).
evalJs(S, `(async () => { fe.select(null); await new Promise((r) => setTimeout(r, 200)); const d = document.getElementById('site-frame').contentDocument; d.querySelector('.fe-block[data-block-id="${mu}"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); return 'true'; })()`); await pause(350);
add('A double-click opens the panel', evalJs(S, `(() => JSON.stringify(!document.getElementById('block-panel').hidden && !!document.querySelector('#block-panel ${MD_FIELD}')))()`) === true);
await setMd('word');
await pressAt('#block-panel .bp-code-expand'); // straight from typing, so the press mustn't lose its button
const view = { close: mdBox('.code-modal-close'), bar: mdBox('#code-modal .bp-md-bar [aria-label="Heading"]'), ed: mdBox('#code-modal .bp-code'), text: mdVal('#code-modal') };
const vr = MD3.reads['md view'].panelEls.find((p) => p.box[0] > 410).box;
add('The view: the same text', view.text === 'word', view.text);
add('The view: Close in its place', Math.abs(view.close[0] - 383) <= 1 && Math.abs(view.close[1] - 179) <= 2, view.close);
add('The view: the toolbar in its place', Math.abs(view.bar[1] - 260.5) <= 1.5, view.bar);
add('The view: the editor in its place', Math.abs(view.ed[0] + 31.4 - vr[0]) <= 1.5 && Math.abs(view.ed[1] - vr[1]) <= 1.5 && Math.abs(view.ed[3] - vr[3]) <= 1, `${view.ed} want ${vr}`);
evalJs(S, `(() => { const f = document.querySelector('#code-modal ${MD_FIELD}'); f.focus(); f.select(); return 'true'; })()`);
await pressAt('#code-modal .bp-md-bar [aria-label="Bold"]');
add('The view: Bold writes there', mdVal('#code-modal') === '**word**', mdVal('#code-modal'));
add('The view: the block waits', norm(mdBlock(mu)) === '<p>word</p>', mdBlock(mu));
evalJs(S, `(() => { const f = document.querySelector('#code-modal ${MD_FIELD}'); f.focus(); f.setSelectionRange(0, 8); return 'true'; })()`);
await pressAt('#code-modal .bp-md-bar [aria-label="Link"]');
const viewPill = mdBox('#link-popover .lk-pill'), wantPill = MD8.reads['view link'].controls.find((c) => c.label === 'URL').box;
add('The view: Link in its place', Math.abs(viewPill[0] - wantPill[0]) <= 1.5 && Math.abs(viewPill[1] - wantPill[1]) <= 1.5, `${viewPill} want ${wantPill}`);
await pressAt(page('/about')); await key('Enter');
add('The view: Link writes there', mdVal('#code-modal') === '[**word**](/about)', mdVal('#code-modal'));
await pressAt('.code-modal-close'); await pause(200);
add('Close writes the block', mdVal() === '[**word**](/about)' && mdBlock(mu).includes('<strong>word</strong>'), mdBlock(mu));
await pressBar('Undo'); await pause(250);
add('One undo takes the view back', mdVal() === 'word', JSON.stringify(mdVal()));
await setMd('word'); selAll(); await pressAt(mdBtn('Link'));
add('An empty link field has no clear button', mdBox('#link-popover .lk-clear')?.[2] === 0, mdBox('#link-popover .lk-clear'));
await pressAt(page('/about'));
add('A filled one has', mdBox('#link-popover .lk-clear')?.[2] > 0, mdBox('#link-popover .lk-clear'));
await key('Escape'); await pause(150);

console.log(`Code and embed: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/code-check.json', import.meta.url), JSON.stringify({ check: 'code and embed panels', pass, total, results }, null, 2) + '\n');
if (!total || pass !== total) process.exitCode = 1;
