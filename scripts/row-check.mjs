// Z3: holds a Layers row with the real mouse and compares each px and each frame with the oracle:
// where a drag starts, when rows pass, how they jump or slide, the ghost, a drop, Escape and z after.
// Usage: npm run row-check (dev server on 5178, FLUID_SURFACE a cdp surface), under 2 min, writes nothing.
// npm run row-check -- --full replays every read, about 9 min, and writes parity/row-check.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { rowReplay, startGaps } from './lib/row-replay.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const FULL = process.argv.includes('--full');
const results = [];
// The default leaves out five holds that show nothing the other three don't, to stay well under 2 min.
const SKIP = ['frames, Line up 80, down to 23', 'frames, Shape down 80, back to 70', 'frames, Shape down 80, back to 70, down to 71', 'frames, Shape down 30, back to 23', 'frames, Button down 30, back to 0, down to 24'];
// The -EV reads are CAP-Z3PATH's, CAP-Z3PATH2's and CAP-Z3SCORE's steps read again on the new trial with each frames read
// timed from its own move or let go, so their starts get the narrow window (row-replay.mjs startsIn).
for (const name of FULL ? ['CAP-Z3WALK', 'CAP-Z3PATH-EV', 'CAP-Z3PATH2-EV', 'CAP-Z3SCORE-EV'] : ['CAP-Z3SCORE-EV']) {
  const f = JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
  await rowReplay(S, FULL ? f : { ...f, steps: f.steps.filter((x) => !(x[0] === 'rowFrames' && SKIP.includes(x[4]))) }, (what, ok, d) => {
    results.push({ name: `${name} ${what}`, ok: !!ok });
    if (!ok) console.log(`DIFF ${name} ${what}\n  ${d}`);
  });
}
const pass = results.filter((r) => r.ok).length;
// The spread of ours' starts against the oracle's, so a run on a slower machine shows how much of the window it used.
if (startGaps.length) { const g = [...startGaps].sort((a, b) => a[0] - b[0]); const ms = (v) => `${v > 0 ? '+' : ''}${v}`; console.log(`Starts: ours ${ms(g[0][0])} to ${ms(g.at(-1)[0])} ms from the oracle's over ${g.length} (earliest ${g[0][1]}; latest ${g.at(-1)[1]})`); }
console.log(`Row drags: ${pass} of ${results.length} reads match`);
if (FULL) writeFileSync(new URL('../parity/row-check.json', import.meta.url), JSON.stringify({ check: 'Layers row drags', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
