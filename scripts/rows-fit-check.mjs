// T10: a block rising and falling among others, replayed from the oracle's reads (CAP-T10ROWS2.json to CAP-T10ROWS6.json):
// every block's area and the section's rows after each change. PRED-T7ROWS2.json has what was predicted before reading.
// Usage: FLUID_SURFACE=cdp:<port> npm run rows-fit-check. About a minute.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

if (!process.env.FLUID_SURFACE) throw new Error('set FLUID_SURFACE');
const S = process.env.FLUID_SURFACE;
const read = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/CAP-T10ROWS${n}.json`, import.meta.url))).reads;
const P = (n) => Array.from({ length: n }, (_, k) => `<p>row ${k + 1}</p>`).join('\n');
const M = (n) => Array.from({ length: n }, (_, k) => `row ${k + 1}`).join('\n\n');
const FIELD = { Code: 'textarea[data-content="code"]', Markdown: 'textarea[data-content="markdown"]', Embed: 'textarea[data-content="embedHtml"]' };
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(52)} ${ok ? 'match' : `DIFF ${detail}`}`); };
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

// file, the name in it, each block's type in the read's order, the one edited, the phone, text it already holds.
const CASES = [
  [2, 'Code desktop a', ['Code'], 0], [2, 'Code desktop b', ['Code'], 0], [2, 'Code phone', ['Code'], 0, true], [2, 'Embed desktop', ['Embed'], 0], [2, 'Embed phone', ['Embed'], 0, true], [2, 'Markdown desktop', ['Markdown'], 0],
  [2, 'Code, a section pulled taller', ['Code'], 0], [2, 'Second Code', ['Code', 'Code'], 1],
  [3, 'Pulled', ['Code'], 0], [3, 'Same place', ['Code', 'Code'], 1], [3, 'Embed over Code', ['Embed', 'Code'], 0], [3, 'Code over Embed', ['Embed', 'Code'], 1], [3, 'Side by side', ['Code', 'Code'], 1], [3, 'Second below', ['Code', 'Code'], 1], [3, 'Lower', ['Code'], 0],
  [4, 'Upper, one under', ['Code', 'Code'], 0], [4, 'Upper, one overlapping lower', ['Code', 'Code'], 0], [4, 'Lower, one overlapping higher', ['Code', 'Code'], 1], [4, 'Grown first', ['Code', 'Code'], 0], [4, 'Inside a taller', ['Code', 'Code'], 1, false, 14], [4, 'Over a Text', ['Text', 'Code'], 1],
  [5, 'Below, other columns', ['Code', 'Code'], 0], [5, 'Below, some columns', ['Code', 'Code'], 0], [5, 'Across the line', ['Code', 'Code'], 0], [5, 'Phone, first', ['Code', 'Code'], 0, true],
  [6, 'Markdown over a Text', ['Markdown', 'Text'], 0], [6, 'Embed over a Code', ['Embed', 'Code'], 0], [6, 'Across, a fall first', ['Code', 'Code'], 0], [6, 'Inside, wholly', ['Code', 'Code'], 0, false, 20],
];
const num = (a) => a.split('/').map(Number);
for (const [file, name, types, k, phone, pre] of CASES) {
  const reads = read(file), r0 = reads[`${name} start`], bp = phone ? 'mobile' : 'desktop', type = types[k];
  const blocks = r0.areas.map((a) => [num(a[0]), num(a[1])]);
  const emb = type === 'Embed' ? `document.querySelector('#block-panel [data-embed="code"]').click(); document.querySelector('#block-panel [data-embed="data"]').click();` : '';
  evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); let next = JSON.parse(JSON.stringify(fe.model)); const s0 = next.sections[1]; s0.blocks = []; s0.rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await sleep(150); const sid = fe.model.sections[1].id; for (const t of ${JSON.stringify(types)}) { fe.addBlock(sid, t); await sleep(120); } next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1], at = ${JSON.stringify(blocks)}; s.blocks.forEach((b, i) => { b.layout.desktop.area = at[i][0]; b.layout.mobile.area = at[i][1]; }); s.rows['${bp}'] = ${r0.section.rows}; ${pre ? `s.blocks[${k}].html = ${JSON.stringify(P(pre))};` : ''} fe.load(next); await sleep(150); fe.setBp('${bp}'); await sleep(200); const b = fe.model.sections[1].blocks[${k}]; fe.select(sid, b.id); await sleep(120); const P = document.getElementById('block-panel'); if (P.hidden || !P.querySelector('textarea[data-content]')) { document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(150); } ${emb} await sleep(60); return 'true'; })()`);
  await pause(80);
  const lines = Object.keys(reads).filter((n) => n.startsWith(`${name} `) && /^\d+$/.test(n.slice(name.length + 1)));
  // In the order they were read.
  for (const key of lines) {
    const n = Number(key.slice(name.length + 1)), text = type === 'Markdown' ? M(n) : P(n), want = reads[key];
    evalJs(S, `(() => { const t = document.querySelector('#block-panel ${FIELD[type]}'); t.focus(); t.select(); document.execCommand('insertText', false, ${JSON.stringify(text)}); return 'true'; })()`);
    await pause(150);
    const got = evalJs(S, `(() => { const s = fe.model.sections[1]; return JSON.stringify({ areas: s.blocks.map((b) => [b.layout.desktop.area.join('/'), b.layout.mobile.area.join('/')]), rows: s.rows['${bp}'] }); })()`);
    add(`${key}: ${want.section.rows} rows`, JSON.stringify(got.areas) === JSON.stringify(want.areas) && got.rows === want.section.rows, `want ${JSON.stringify(want.areas)} ${want.section.rows}, got ${JSON.stringify(got.areas)} ${got.rows}`);
  }
  evalJs(S, `(() => { fe.setBp('desktop'); return 'true'; })()`); await pause(60);
}
console.log(`Rows among blocks: ${pass} of ${total} match`);
writeFileSync(new URL('../parity/rows-fit-check.json', import.meta.url), `${JSON.stringify({ check: 'rows among blocks', pass, total, results }, null, 2)}\n`);
if (!total || pass !== total) process.exitCode = 1;
