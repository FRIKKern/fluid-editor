// The behaviour sample, ours first: on each built tile, three rows that match the oracle's by name, picked by the rule below,
// each changed once on a fresh load, and what the change did to the block (scripts/lib/sample-look.mjs). These are the
// predictions: they are pushed before scripts/oracle-sample.mjs reads the same changes on the oracle.
//   FLUID_PORT=<port> FLUID_SURFACE=cdp:<port> node scripts/sample-ours.mjs     writes parity/findings/SAMPLE-ROWS.json
//   ... sample-ours.mjs --round2   the same picks again, each read at about 1.1 s and at 3 s, into round2.ours
//   node scripts/sample-ours.mjs --score                                       scores the file, once the oracle is read
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, pause, viewport } from './lib/cmux.mjs';
import { pressOnTop } from './oracle/press.mjs';
import { noRows, onNoList, reachesOut, hasName } from './lib/press-names.mjs';
import { controlsJs, lookJs, lookDiff, scoreOne, change, findAt, findValue, readTwice, KINDS, REFUSE, COMMON, norm } from './lib/sample-look.mjs';

const FILE = new URL('../parity/findings/SAMPLE-ROWS.json', import.meta.url);
if (process.argv.includes('--score')) {
  const f = JSON.parse(readFileSync(FILE));
  const tally = (label, get) => {
    const read = f.picks.filter((p) => get(p)?.oracle && get(p)?.ours);
    const scored = read.map((p) => ({ p, s: scoreOne(get(p).ours, get(p).oracle) }));
    const by = {};
    for (const { p, s } of scored) { by[p.tile] ||= [0, 0]; by[p.tile][1]++; if (s.match) by[p.tile][0]++; }
    console.log(`${label}: ${scored.filter((x) => x.s.match).length} of ${read.length} match (${scored.filter((x) => x.s.match && !Object.keys(get(x.p).ours).length).length} of them nothing on both); ${f.picks.length - read.length} not read`);
    console.log(`  ${Object.entries(by).map(([t, [m, n]]) => `${t} ${m}/${n}`).join(', ')}`);
    for (const { p, s } of scored.filter((x) => !x.s.match)) console.log(`  miss: ${p.tile} | ${p.row} | ${p.name}: ${s.why.join('; ')}`);
  };
  tally('round 1', (p) => ({ ours: p.ours?.diff, oracle: p.oracle?.diff }));
  if (f.picks.some((p) => p.round2)) {
    tally('round 2 at 1.1 s', (p) => ({ ours: p.round2?.ours?.d1, oracle: p.round2?.oracle?.d1 }));
    tally('round 2 at 3 s', (p) => ({ ours: p.round2?.ours?.d3, oracle: p.round2?.oracle?.d3 }));
    for (const p of f.picks.filter((x) => x.round2 && !x.round2.oracle?.d3)) console.log(`  round 2 not read: ${p.tile} | ${p.row} | ${p.name}: ${p.round2.oracle?.notPressed || p.round2.oracle?.error || p.round2.ours?.error || 'no read'}`);
  }
  process.exit(0);
}

const S = process.env.FLUID_SURFACE, PORT = process.env.FLUID_PORT;
if (!S?.startsWith('cdp:') || !PORT) { console.error('sample-ours: set FLUID_PORT and FLUID_SURFACE=cdp:<port>'); process.exit(2); }
const BASE = `http://127.0.0.1:${PORT}`;
// Built tiles: a panel of their own with rows matched to the oracle's (parity/coverage-check.json). Scrolling is a stand-in.
const BUILT = ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Line', 'Map', 'Code', 'Markdown', 'Embed', 'Social Links'];
// A tab whose oracle panel says it reaches past the block: Form's Design ("Form style affects all forms", CAP-ROWS walks).
const WIDE = { Form: ['Design'] };
const ORACLE = JSON.parse(readFileSync(new URL('../parity/findings/CAP-COVERAGE.json', import.meta.url))).types;
const UNREAD = JSON.parse(readFileSync(new URL('../parity/findings/UNREAD.json', import.meta.url)));
const js = (b) => evalJs(S, b);
const PANEL = `document.getElementById('block-panel')`;

async function fresh(type) {
  goto(S, `${BASE}/index.html`); await pause(1200);
  return js(`(async () => { const w = (r) => new Promise((x) => setTimeout(x, r)); fe.setBp('desktop');
    fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'middle', gap: 11, rowGap: 11, rows: { desktop: 24, mobile: 24 }, blocks: [] }] }); await w(100);
    fe.addBlock('s', ${JSON.stringify(type)}); await w(150); const b = fe.model.sections[0].blocks[0]; if (!b) return JSON.stringify(null);
    fe.select('s', b.id); await w(150); const edit = document.querySelector('#block-toolbar [data-tb="edit"]'); if (${PANEL}.hidden && edit) edit.click(); await w(300);
    return JSON.stringify(${PANEL}.hidden ? null : b.id); })()`);
}
const tabEl = (t) => `[...${PANEL}.querySelectorAll('[role=tab]')].find((x) => x.textContent.trim() === ${JSON.stringify(t)} && x.getBoundingClientRect().width > 1)`;
const tabsNow = () => js(`(() => JSON.stringify([...${PANEL}.querySelectorAll('[role=tab]')].filter((x) => x.getBoundingClientRect().width > 1).map((x) => x.textContent.trim())))()`);
async function toTab(t) { if (js(`(() => JSON.stringify((${tabEl(t)})?.getAttribute('aria-selected') === 'true'))()`)) return; await pressOnTop(S, tabEl(t), 500); }
const controls = () => js(controlsJs(PANEL)) || [];

// The rule, written before any oracle read: on Content then Design, rows whose name is one of the oracle's rows on that tab,
// of a kind in KINDS, not greyed, not refused by name, not reaching out, not on UNREAD's no list, not on a WIDE tab. Rows
// special to the tile come first, then rows every panel has (COMMON). One control per row: a choice's first option not
// picked, a select's first other option. The first three rows, in panel order.
function candidates(T, tab, list) {
  const theirs = new Set((ORACLE[T]?.tabs?.[tab] || []).map((r) => norm(r.n)));
  const NO = noRows(UNREAD, T), seen = new Set(), out = [];
  for (const c of list) {
    const row = c.kind === 'choice' ? c.row : c.name, key = norm(row);
    if (seen.has(key) || !KINDS.includes(c.kind) || c.off) continue;
    if (!theirs.has(norm(c.name)) && !theirs.has(norm(c.row))) continue;
    if (REFUSE.test(c.name) || REFUSE.test(c.row) || reachesOut(c) || onNoList(c, NO) || !hasName(c)) continue;
    if (c.kind === 'choice' && c.value) continue;
    if (c.kind === 'menu' && !(c.options || []).some((o) => o && o[0].toLowerCase() !== String(c.value || ' ')[0].toLowerCase() && !REFUSE.test(o))) continue;
    if (c.kind === 'menu' && !c.options) continue;
    seen.add(key);
    out.push({ tab, kind: c.kind, row: c.row, name: c.name, value: c.value, options: c.options, common: COMMON.test(row) || COMMON.test(c.name) });
  }
  return out;
}

viewport(S, 1600, 1000);
// One pick on a fresh load: the change, and what it did.
async function run(c, two) {
  const id = await fresh(c.tile); await toTab(c.tab); await pause(300);
  const at = findAt(controls(), c); if (!at) throw new Error('not found on a fresh load');
  const look = () => js(lookJs('site-frame', id)), before = look();
  const to = await change(S, c, at, js);
  if (two) return { ...(await readTwice(look, before)), value: findValue(controls(), c) };
  await pause(300);
  return { diff: lookDiff(before, look()), value: findValue(controls(), c), to };
}
if (process.argv.includes('--round2')) {
  const f = JSON.parse(readFileSync(FILE));
  for (const p of f.picks) {
    p.round2 = {};
    try { p.round2.ours = await run(p, true); } catch (e) { p.round2.ours = { error: e.message.slice(0, 120) }; }
    console.log(p.tile, '|', p.row, '|', p.name, '|', p.round2.ours.d3 ? Object.keys(p.round2.ours.d3).join(',') || 'nothing' : p.round2.ours.error);
  }
  f.round2 = { rule: 'The same picks. Each read at about 1.1 s (round 1\'s moment) and at 3 s after the gesture (readTwice), with ::before and ::after counted in the look. A measurement fix, not a refit.' };
  writeFileSync(FILE, `${JSON.stringify(f, null, 1)}\n`);
  console.log('wrote round2.ours');
  process.exit(0);
}
const picks = [];
for (const T of BUILT) {
  if (!(await fresh(T))) { picks.push({ tile: T, error: 'no panel on ours' }); continue; }
  const tabs = tabsNow().filter((t) => t !== 'Animation' && !(WIDE[T] || []).includes(t));
  let all = [];
  for (const t of tabs) { await toTab(t); await pause(300); all.push(...candidates(T, t, controls())); }
  const chosen = [...all.filter((c) => !c.common), ...all.filter((c) => c.common)].slice(0, 3);
  console.log(T, chosen.map((c) => `${c.tab}|${c.kind}|${c.row}|${c.name}`).join(' ; ') || 'none');
  for (const c of chosen) {
    const p = { tile: T, ...c };
    try { const r = await run(p, false); if (r.to) p.to = r.to; p.ours = { diff: r.diff, value: r.value }; } catch (e) { p.ours = { error: e.message.slice(0, 120) }; }
    picks.push(p);
  }
}
const f = {
  item: 'U12', capturedAt: new Date().toISOString().slice(0, 10),
  question: 'Rows that match the oracle by name: does a change to one do to the block what the same change does on the oracle? Three rows per built tile, ours read first as the prediction.',
  rule: 'Picked by candidates() in scripts/sample-ours.mjs before any oracle read. Read by lookJs in scripts/lib/sample-look.mjs. A match: the same look keys change on both, numbers move the same way, and align, weight, italic, case and deco end at the same value (scoreOne).',
  picks,
};
writeFileSync(FILE, `${JSON.stringify(f, null, 1)}\n`);
console.log(`wrote SAMPLE-ROWS.json: ${picks.length} picks`);
process.exit(0);
