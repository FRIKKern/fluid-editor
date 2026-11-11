// T12: a new Scrolling block's Design rows replayed from the oracle's rows walk (CAP-ROWSSCROLLING2.json; CAP-ROWSSCROLLING.json
// read alike): Wave Intensity to 150, Text Style to Paragraph, Medium and Large each and back to Small, Item Spacing 0.6em.
// After each: the block's area, the section's rows and the first two words' boxes (left and width); then each Cmd+Z goes back
// one step to the new block. Presses are real mouse input. Usage: FLUID_SURFACE=cdp:<port> npm run scrolling-check.
import { readFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

if (!process.env.FLUID_SURFACE) throw new Error('set FLUID_SURFACE');
const S = process.env.FLUID_SURFACE;
const R = JSON.parse(readFileSync(new URL('../parity/findings/CAP-ROWSSCROLLING2.json', import.meta.url))).tabs.Design.rows;
let pass = 0, total = 0;
const add = (what, ok, detail) => { total++; if (ok) pass++; console.log(`${what.padEnd(40)} ${ok ? 'match' : `DIFF ${detail}`}`); };
// The read's "area a > b", "section rows a > b" and word boxes for a row, by its press name.
const changeOf = (name) => {
  const ch = R.find((r) => r.name === name && r.change).change, two = (p) => ch.find((c) => c.startsWith(p))?.split(' > ');
  const words = ch.filter((c) => /^(H1|P)\.Marquee-item b:/.test(c)).map((c) => c.replace(/^.*b: /, '').split(' > ').map((s) => s.split(',').map(Number)));
  return { area: two('area ')?.map((s) => s.replace('area ', '').replace(/ /g, '')), rows: two('section rows ')?.map((s) => Number(s.replace('section rows ', ''))), words };
};

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);
const qs = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); ${body} })()`);
// The oracle's probe: one section of 8 rows, the new block at its top.
const sid = qs(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { desktop: 8, mobile: 8 }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const b = fe.model.sections[0].blocks[0]; fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(400); return JSON.stringify(s.id);`);
const at = (sel, fx = 0.5) => qs(`const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getBoundingClientRect().width > 0); if (!e) return 'null'; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${fx}, r.top + r.height / 2]);`);
const press = async (sel, fx) => { const p = at(sel, fx); if (!p) return false; mouse(S, 'move', p[0], p[1]); await pause(60); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(40); mouse(S, 'up', p[0], p[1]); await pause(400); return true; };
const state = () => qs(`const s = fe.model.sections[0], b = s.blocks[0]; if (!b) return JSON.stringify({ area: null, rows: s.rows.desktop }); const d = document.getElementById('site-frame').contentDocument; return JSON.stringify({ area: b.layout.desktop.area.join('/'), rows: s.rows.desktop, words: [...d.querySelectorAll('#block-' + b.id + ' .marquee-item')].map((x) => { const q = x.getBoundingClientRect(); return [q.left, q.width]; }) });`);
const near = (a, b, d = 1) => Math.abs(a - b) <= d;
const seen = [state()];
const expect = (what, name, k = 1) => {
  const c = changeOf(name), now = state();
  seen.push(now);
  if (c.area) add(`${what}: area`, now.area === c.area[k], `${now.area} (oracle ${c.area[k]})`);
  if (c.rows) add(`${what}: section rows`, now.rows === c.rows[k], `${now.rows} (oracle ${c.rows[k]})`);
  if (c.words.length) { const w = c.words[0][k]; add(`${what}: first word`, !!now.words?.[0] && near(now.words[0][0], w[0]) && near(now.words[0][1], w[2]), `${JSON.stringify(now.words?.[0])} (oracle ${w[0]},${w[2]})`); }
  return now;
};

if (!(await press('#block-panel [data-btab="Design"]'))) add('Design tab', false, 'not found');
// Wave Intensity: the walk pressed its range at 150 of 180.
await press('#block-panel [data-scr-range="wave"]', 150 / 180);
expect('Wave Intensity 150', 'Wave Intensity');
await press('#block-panel [data-acc-menu="scrollStyle"]');
await press('#shape-pop [data-acc-opt="paragraph"]');
const para = state(); seen.push(para);
add('Paragraph: words', !!para.words && near(para.words[0][1], 104.5) && near(para.words[1][0], 216.8), JSON.stringify(para.words));
await press('#block-panel [aria-label="Medium text size"]'); expect('Medium', 'Medium text size');
await press('#block-panel [aria-label="Small text size"]'); expect('Small from Medium', 'Medium text size', 0);
await press('#block-panel [aria-label="Large text size"]'); expect('Large', 'Large text size');
await press('#block-panel [aria-label="Small text size"]'); expect('Small from Large', 'Large text size', 0);
qs(`const f = document.querySelector('#block-panel input[data-scr-field="spacing"]'); f.value = '0.6em'; f.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
const sp = changeOf('Item Spacing').words[0], now = state(); seen.push(now);
add('Item Spacing 0.6em: second word', !!now.words?.[1] && near(now.words[1][0] - para.words[1][0], sp[1][0] - sp[0][0], 0.3), `moved ${now.words?.[1]?.[0] - para.words[1][0]} (oracle ${sp[1][0] - sp[0][0]})`);
// Each change was one step: Cmd+Z walks back through every state seen.
for (let k = seen.length - 2; k >= 0; k--) {
  qs(`fe.undo(); await sleep(250); return 'true';`);
  const u = state(), want = seen[k];
  add(`undo to step ${k}`, u.area === want.area && u.rows === want.rows, `${u.area} ${u.rows} (want ${want.area} ${want.rows})`);
}
console.log(`\n${pass}/${total} match`);
process.exit(pass === total ? 0 : 1);
