// H8: prints progress per milestone and per area, from parity/items.json and the board.
// Usage: npm run status [-- --offline]
import { items, milestones, tasks } from './lib/board.mjs';

const all = items();
const ms = milestones();
let board = [];
if (!process.argv.includes('--offline')) {
  try {
    board = await tasks();
  } catch (e) {
    console.log(`(board not reachable: ${e.message.split('\n')[0]})\n`);
  }
}
const state = Object.fromEntries(board.map((t) => [t.id, t.status]));
const KEYS = ['done', 'partial', 'open', 'unknown'];
const count = (list) => Object.fromEntries(KEYS.map((k) => [k, list.filter((i) => i.status === k).length]));
const pct = (c, n) => `${String(Math.round((100 * c) / (n || 1))).padStart(3)}%`;
const bar = (c, n, w = 20) => '█'.repeat(Math.round((w * c) / (n || 1))).padEnd(w, '·');

function table(title, rows) {
  const w = Math.max(...rows.map((r) => r.name.length));
  console.log(title);
  for (const r of rows) {
    const c = count(r.list);
    console.log(`  ${r.name.padEnd(w)}  ${bar(c.done, r.list.length)} ${pct(c.done, r.list.length)}  ${KEYS.map((k) => `${c[k]} ${k}`).join(', ')}${r.extra ? `  ${r.extra}` : ''}`);
  }
  console.log('');
}

table('Milestones', ms.map((m) => ({
  name: `${m.id} ${m.name}`,
  // M3 counts answered unknowns: an answered item shows as done here.
  list: m.id === 'M3' ? all.filter((i) => i.wasUnknown).map((i) => ({ ...i, status: i.status === 'unknown' ? 'unknown' : 'done' })) : all.filter((i) => i.milestone === m.id),
  extra: state[m.id] ? `[board: ${state[m.id]}]` : '',
})));
const areas = [...new Set(all.map((i) => i.area))];
table('Areas', areas.map((a) => ({ name: a, list: all.filter((i) => i.area === a) })));
const c = count(all);
console.log(`Total  ${bar(c.done, all.length, 40)} ${c.done} of ${all.length} done · ${c.partial} partial · ${c.open} open · ${c.unknown} unknown`);
