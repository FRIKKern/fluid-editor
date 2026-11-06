// Z3: holds a Layers row with the real mouse and compares each px and each frame with the oracle:
// where a drag starts, when rows pass, how they jump or slide, the ghost, a drop, Escape and z after.
// Usage: npm run row-check (dev server on 5178, FLUID_SURFACE a cdp surface), under 2 min, writes nothing.
// npm run row-check -- --full replays every read, about 9 min, and writes parity/row-check.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { rowReplay } from './lib/row-replay.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const FULL = process.argv.includes('--full');
const results = [];
// The default leaves out five holds that show nothing the other three don't, to stay well under 2 min.
const SKIP = ['frames, Line up 80, down to 23', 'frames, Shape down 80, back to 70', 'frames, Shape down 80, back to 70, down to 71', 'frames, Shape down 30, back to 23', 'frames, Button down 30, back to 0, down to 24'];
for (const name of FULL ? ['CAP-Z3WALK', 'CAP-Z3PATH', 'CAP-Z3PATH2', 'CAP-Z3SCORE'] : ['CAP-Z3SCORE']) {
  const f = JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
  await rowReplay(S, FULL ? f : { ...f, steps: f.steps.filter((x) => !(x[0] === 'rowFrames' && SKIP.includes(x[4]))) }, (what, ok, d) => {
    results.push({ name: `${name} ${what}`, ok: !!ok });
    if (!ok) console.log(`DIFF ${name} ${what}\n  ${d}`);
  });
}
const pass = results.filter((r) => r.ok).length;
console.log(`Row drags: ${pass} of ${results.length} reads match`);
if (FULL) writeFileSync(new URL('../parity/row-check.json', import.meta.url), JSON.stringify({ check: 'Layers row drags', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
