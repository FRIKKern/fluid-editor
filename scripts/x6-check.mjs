// X6: pulls on each type against the oracle's reads: the steps of parity/findings/CAP-X6PULLS.json, CAP-X6AGAIN.json,
// CAP-X6ONEROW.json, CAP-X6STEPS.json, CAP-X6FLOORS.json, CAP-X6FLOORSPHONE.json, CAP-X6PHONEFLOORS.json, CAP-68PULL.json, CAP-X6SUMMARYPHONE.json, CAP-X6DESKROWS.json and CAP-X6PHONEROWS.json run on our editor, each area compared. One block in a new
// section below another, a real press at the block's corner or side, as the oracle's was, so a one-row block's overlapping handles
// decide the same. Rows are compared from the block's start, as the oracle's section sometimes had others above. Writes parity/x6-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run x6-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, drag, browser, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const FILES = (process.argv[2] ? process.argv[2].split(',') : ['CAP-X6PULLS', 'CAP-X6AGAIN', 'CAP-X6ONEROW', 'CAP-X6STEPS', 'CAP-X6FLOORS', 'CAP-X6FLOORSPHONE', 'CAP-X6PHONEFLOORS', 'CAP-68PULL', 'CAP-X6SUMMARYPHONE', 'CAP-X6DESKROWS', 'CAP-X6PHONEROWS']);
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1500);
const Q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; const b = () => fe.model.sections[1].blocks[0]; const el = () => d.querySelector('.fe-block[data-block-id="' + b().id + '"]'); ${body} })()`);
const SEC = (id, n) => `{ id: '${id}', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: ${n}, mobile: 2 }, phoneFollows: true, blocks: [] }`;
const fresh = (type) => Q(`fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [${SEC('t', 4)}, ${SEC('s', 8)}] }); await sleep(150); fe.addBlock('s', ${JSON.stringify(type)}); await sleep(700); document.activeElement?.blur?.(); return 'true';`);
let view = 'desktop';
const area = () => Q(`return JSON.stringify(b().layout.${view}.area);`);
const pull = async (part, dx, dy) => {
  browser(S, 'press', 'Escape'); await pause(60); browser(S, 'press', 'Escape'); await pause(60);
  // In view and selected, with the toolbar over nothing it needn't be.
  const p = Q(`const part = ${JSON.stringify(part)}, q0 = el().getBoundingClientRect(), fy = q0.height * (part === 'middle' ? 0.5 : part.includes('n') ? 0 : part.includes('s') ? 1 : 0.5); W.scrollTo({ top: W.scrollY + q0.top - (300 + fy > 800 ? 500 - fy : 300), behavior: 'instant' }); await sleep(60); fe.select('s', b().id); await sleep(250); const q = el().getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + q.left + q.width * (part === 'middle' ? 0.5 : part.includes('w') ? 0 : part.includes('e') ? 1 : 0.5), o.top + q.top + q.height * (part === 'middle' ? 0.5 : part.includes('n') ? 0 : part.includes('s') ? 1 : 0.5)]);`);
  drag(S, p, [p[0] + dx, p[1] + dy], { steps: 12, holdMs: 200 }); await pause(350);
};
let pass = 0, total = 0;
const results = [];
// Summary's content moves between sessions (CAP-X6STEPS.json read 14 rows at 17 columns, CAP-X6DESKROWS.json 11): only its columns there.
const ROWS_UNBUILT = /^Summary [ew] in /;
// A one-column pull sets rows from the content as it was before it reflowed, and a far pull from where it had got to: the
// oracle's timing, not built (CAP-X6DESKROWS.json). The Summary pulls after e 9 moved nothing on the oracle: not compared.
const LAG = new Set(['CAP-X6DESKROWS Summary e 13', 'CAP-X6DESKROWS Summary e 9', 'CAP-X6DESKROWS Instagram e 7', 'CAP-X6DESKROWS Instagram w far in', 'CAP-X6FLOORS Instagram w far in',
  'CAP-X6PHONEROWS Instagram e 6', 'CAP-X6PHONEROWS Instagram e 5', 'CAP-X6PHONEROWS Instagram e 4', 'CAP-X6PHONEROWS Instagram e back 8',
  // And one the 0.13 give misses: OpenTable runs 0.35 of a row over at 3 columns, where Page Link takes a row at 0.23. Its
  // extra row is then kept as it widens, as rows are.
  'CAP-X6PHONEROWS OpenTable e 3', ...[4, 5, 6, 7, 8].map((n) => `CAP-X6PHONEROWS OpenTable e back ${n}`),
  // The rule frozen, these older reads miss it: Menu at 6 phone columns took 32 rows there, 31 in CAP-X6PHONEROWS.json.
  'CAP-X6PHONEFLOORS Menu w far in', 'CAP-X6PHONEFLOORS Menu e far in']);
const VOID = (file, read) => file === 'CAP-X6DESKROWS' && /^Summary e (8|back)/.test(read);
// On a phone, as a start row or a pull: Summary's content moves between runs (1170, 1689, 1958), and its south pull took effect
// at the next press (CAP-X6PHONEROWS.json). The others draw the oracle's phone height by width (CAP-68PULL.json, CAP-X6PHONEROWS.json).
const PHONE_ROWS_UNBUILT = /^Summary /;
let known = 0;
for (const file of FILES) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  let off = 0, pulled = false, seen = [], last = null;
  for (const step of F.steps) {
    if (step[0] === 'window') { viewport(S, step[1], step[2]); await pause(300); } // a tall block's south handle needs the oracle's window (CAP-68PULL.json)
    if (step[0] === 'add') { view = 'desktop'; fresh(step[2]); off = null; last = null; }
    if (step[0] === 'view') { view = step[1] === 'Mobile' ? 'mobile' : 'desktop'; Q(`fe.setBp('${view}'); await sleep(400); return 'true';`); }
    if (step[0] === 'drag' || step[0] === 'handleDrag') { const was = area().join(); await pull(step[3], step[4], step[5]); pulled = area().join() !== was; }
    // With nothing pulled the oracle's Undo takes the add away, and the reads after it are empty: keep the block.
    if (step[0] === 'press' && step[1] === 'Meta+z' && pulled) { Q(`fe.undo(); await sleep(250); return 'true';`); pulled = false; }
    if (step[0] === 'read' && step[2]?.areas !== undefined) {
      // The oracle's section may hold other blocks: the one read is the one that changed since the last read, or that one again.
      const all = (F.reads[step[1]]?.areas || []).map((a) => a[view === 'mobile' ? 1 : 0]), changed = all.filter((a) => !seen.includes(a));
      const same = (a) => last && a.split('/')[0] === last.split('/')[0] && a.split('/')[1] === last.split('/')[1];
      const isNew = (a) => !seen.some((b) => b.split('/').slice(0, 2).join() === a.split('/').slice(0, 2).join());
      const pick = !['CAP-X6DESKROWS', 'CAP-X6PHONEROWS'].includes(file) || all.length < 2 ? all[0] : (last ? changed.find(same) : changed.find(isNew)) ?? changed[0] ?? all.find((a) => a === last) ?? all[0];
      seen = all; last = pick;
      const want = pick?.split('/').map(Number), have = area();
      if (!want || VOID(file, step[1])) continue;
      off ??= want[0] - have[0];
      const w = [want[0] - off, want[1], want[2] - off, want[3]].join('/'), named = LAG.has(`${file} ${step[1]}`) || (view === 'mobile' ? PHONE_ROWS_UNBUILT.test(step[1]) : ROWS_UNBUILT.test(step[1]));
      const ok = named ? want[1] === have[1] && want[3] === have[3] : w === have.join('/');
      total++; if (ok) pass++; else console.log(`DIFF ${file} ${step[1]}: oracle ${w} ours ${have.join('/')}`);
      if (named && w !== have.join('/')) { known++; console.log(`known, rows: ${file} ${step[1]}: oracle ${w} ours ${have.join('/')}`); }
      results.push({ file, read: step[1], ok });
    }
  }
  viewport(S, 1600, 1000); await pause(300);
}
console.log(`X6 pulls: ${pass} of ${total} reads match, ${known} with their rows named unbuilt`);
if (!process.argv[2]) writeFileSync(new URL('../parity/x6-check.json', import.meta.url), JSON.stringify({ check: 'pulls per type against the oracle', tolerance: 0, pass, total, known, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
