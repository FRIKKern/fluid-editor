// The phone order of new blocks: replays parity/findings/CAP-NEWORDER*.json through fe.addBlock and
// compares every read: which block, and its desktop and phone area, in order. A read taken after a hand move
// sets our layout from the oracle's, so only adds are judged. Usage: npm run neworder-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`);
await pause(1200);

// Two Lines of one size at one place flip on the oracle, and the blocks around them with them; no rule read.
const twoLines = (rows) => rows.filter((r) => r[0] === '1/2/2/6').length > 1;
const cases = [];
for (const file of ['CAP-NEWORDER', 'CAP-NEWORDER2', 'CAP-NEWORDER3']) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  const map = new Map();
  let seen = new Set(), moved = false, lastAdded = null;
  for (const step of F.steps) {
    if (step[0] === 'blank') {
      evalJs(S, `(() => { fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 14, mobile: 20 }, blocks: [] }] }); return 1; })()`);
      map.clear(); seen = new Set(); moved = false;
    } else if (step[0] === 'add') {
      lastAdded = evalJs(S, `(() => { fe.addBlock('s', ${JSON.stringify(step[2])}); return JSON.stringify(fe.model.sections[0].blocks.at(-1).id); })()`);
      await pause(3); // ids carry the clock
    } else if (step[0] === 'drag' || step[0] === 'view') {
      moved = moved || step[0] === 'drag';
    } else if (step[0] === 'read') {
      const name = step[1], r = F.reads[name];
      // The first capture has areas only; the others name each block, so same-size blocks compare too.
      if (r.stack) for (const b of r.stack) if (!seen.has(b.id)) { seen.add(b.id); map.set(b.id, lastAdded); }
      const rows = r.stack ? r.stack.map((b) => [b.desktop, b.phone, map.get(b.id)]) : r.areas;
      if (moved) {
        evalJs(S, `(() => { const s = fe.model.sections[0]; for (const [id, d, m] of ${JSON.stringify(r.stack.map((b) => [map.get(b.id), b.desktop, b.phone]))}) { const b = s.blocks.find((x) => x.id === id); b.layout.desktop.area = d.split('/').map(Number); b.layout.mobile.area = m.split('/').map(Number); } return 1; })()`);
        moved = false;
        continue;
      }
      const ours = evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.map((b) => [b.layout.desktop.area.join('/'), b.layout.mobile.area.join('/'), ...(${!!r.stack} ? [b.id] : [])]).sort((a, b) => parseInt(a[1]) - parseInt(b[1])))`);
      const same = JSON.stringify(ours) === JSON.stringify(rows);
      cases.push({ name: `${file} ${name}`, same, known: !same && twoLines(rows), diffs: same ? [] : [`oracle ${JSON.stringify(rows)}, ours ${JSON.stringify(ours)}`] });
    }
  }
}
const fails = cases.filter((c) => !c.same && !c.known), known = cases.filter((c) => c.known);
for (const c of [...fails, ...known]) console.log(c.known ? 'known' : 'DIFF', c.name, c.diffs[0]);
console.log(`New blocks on phones: ${cases.length - fails.length - known.length} of ${cases.length} match, ${known.length} named known miss`);
writeFileSync(new URL('../parity/neworder-check.json', import.meta.url), `${JSON.stringify({ check: 'phone order of new blocks', pass: cases.length - fails.length - known.length, total: cases.length, known: known.map((c) => c.name), fails: fails.map((c) => c.name) }, null, 2)}\n`);
process.exit(fails.length ? 1 : 0);
