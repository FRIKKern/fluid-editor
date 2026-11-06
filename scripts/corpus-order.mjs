// A2: an offline pass over the 39 corpus sections whose block rules don't follow the phone rows.
// These are other people's saved pages with unknown history, and the fixtures hold CSS only, so this
// counts what simple tests explain. It fits nothing. Writes parity/findings/A2-CORPUS.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseSectionCss } from './lib/parse.mjs';
import { followDesktopEdit } from '../app/src/phone-order.js';

const root = new URL('../fixtures/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const area = (a) => (a[3] - a[1]) * (a[2] - a[0]);
const same = (x, y) => x.every((b, k) => b === y[k]);
const rank = (L) => (p, q) => p.layout[L].area[0] - q.layout[L].area[0] || p.layout[L].area[1] - q.layout[L].area[1];
const sharesRow = (a, b) => a.layout.mobile.area[0] < b.layout.mobile.area[2] && b.layout.mobile.area[0] < a.layout.mobile.area[2];
const pairs = (bs) => bs.flatMap((a, k) => bs.slice(k + 1).map((b) => [a, b]));
const TESTS = {
  'overlap on desktop': (bs) => pairs(bs).some(([a, b]) => hit(a.layout.desktop.area, b.layout.desktop.area)),
  'overlap on the phone': (bs) => pairs(bs).some(([a, b]) => hit(a.layout.mobile.area, b.layout.mobile.area)),
  'a block 80% inside a bigger one on desktop': (bs) => pairs(bs).some(([a, b]) => {
    const [s, l] = area(a.layout.desktop.area) < area(b.layout.desktop.area) ? [a, b] : [b, a];
    const A = s.layout.desktop.area, B = l.layout.desktop.area;
    const w = Math.min(A[3], B[3]) - Math.max(A[1], B[1]), h = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
    return area(A) < area(B) && w > 0 && h > 0 && w * h >= 0.8 * area(A);
  }),
  'one-row block first on the phone': (bs) => { const f = [...bs].sort(rank('mobile'))[0].layout.mobile.area; return f[0] === 1 && f[2] === 2; },
  'two blocks with one z on the phone': (bs) => new Set(bs.map((b) => b.layout.mobile.z)).size < bs.length,
  'phone gaps (rows with no block)': (bs) => { let end = 1; for (const b of [...bs].sort(rank('mobile'))) { if (b.layout.mobile.area[0] > end) return true; end = Math.max(end, b.layout.mobile.area[2]); } return false; },
  'a phone height unlike the desktop height': (bs) => bs.some((b) => { const d = b.layout.desktop.area, m = b.layout.mobile.area; return m[2] - m[0] !== d[2] - d[0]; }),
  'blocks that share a phone row': (bs) => pairs(bs).some(([a, b]) => sharesRow(a, b)),
  'rules follow desktop top, then left': (bs) => same(bs, [...bs].sort(rank('desktop'))),
  'rules follow the A2 rule, run on the phone stack': (bs) => {
    const s = { rows: { mobile: 0 }, blocks: JSON.parse(JSON.stringify(bs)).map((b, k) => ({ ...b, k })) };
    followDesktopEdit(s);
    return [...s.blocks].sort(rank('mobile')).every((b, k) => b.k === k);
  },
  // Which pairs break the phone rows? Only those that share a phone row, or some others too.
  'every pair out of phone order shares a phone row': (bs) => pairs(bs).every(([a, b]) => rank('mobile')(a, b) <= 0 || sharesRow(a, b)),
  'rules follow the phone rows, with blocks that share rows left first': (bs) => {
    const left = (x) => x.layout.mobile.area[1];
    return pairs(bs).every(([a, b]) => (sharesRow(a, b) ? left(a) <= left(b) : rank('mobile')(a, b) <= 0));
  },
};
let withTwo = 0;
const out = [], count = Object.fromEntries(Object.keys(TESTS).map((k) => [k, 0]));
let both = { sections: 0, counts: Object.fromEntries(Object.keys(TESTS).map((k) => [k, 0])) };
for (const fx of index) {
  const s = parseSectionCss(readFileSync(new URL(fx.file, root), 'utf8'));
  const bs = s.blocks.filter((b) => b.layout.mobile && b.layout.desktop);
  if (bs.length < 2) continue;
  withTwo++;
  const yes = Object.entries(TESTS).filter(([, t]) => t(bs)).map(([k]) => k);
  if (same(bs, [...bs].sort(rank('mobile')))) { both.sections++; for (const k of yes) both.counts[k]++; continue; }
  for (const k of yes) count[k]++;
  out.push({ section: fx.sectionId, blocks: bs.length, tests: yes });
}
const none = out.filter((o) => !o.tests.length).length;
writeFileSync(new URL('../parity/findings/A2-CORPUS.json', import.meta.url), `${JSON.stringify({ item: 'A2', question: 'What do simple tests say about the corpus sections whose block rules do not follow the phone rows? Other people\'s saved pages, unknown history. The fixtures hold CSS only: rule order stands in for DOM order. Not a fresh test, and nothing is fitted to it.', sections: withTwo, follow: both.sections, exceptions: out.length, countsInExceptions: count, countsInTheOthers: both.counts, noTestApplies: none, cases: out }, null, 1)}\n`);
console.log(`${withTwo} sections, ${both.sections} follow, ${out.length} do not, ${none} no test applies`);
for (const k of Object.keys(TESTS)) console.log(String(count[k]).padStart(4), 'of', out.length, 'exceptions;', String(both.counts[k]).padStart(4), 'of', both.sections, 'others:', k);
