// A check that counts its own cases (`const CASES = <n>;`) and stores its result in parity/<check>.json must store that
// many rows. #823, #824 and #826 raised scrolling-check's CASES from 1213 to 1323 and left the stored file at 1213, and
// nothing failed. Each such check's stored total has to equal its CASES; a run of the check rewrites the file.
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const dir = new URL('./', import.meta.url), parity = new URL('../parity/', import.meta.url);
let seen = 0, bad = 0;
for (const f of readdirSync(dir).filter((n) => n.endsWith('-check.mjs')).sort()) {
  const m = readFileSync(new URL(f, dir), 'utf8').match(/^const CASES = (\d+);/m);
  if (!m) continue;
  const cases = Number(m[1]), name = f.replace(/\.mjs$/, ''), file = new URL(`${name}.json`, parity);
  seen++;
  if (!existsSync(file)) { bad++; console.log(`cases: ${f} counts ${cases} cases, but parity/${name}.json is missing`); continue; }
  const total = JSON.parse(readFileSync(file, 'utf8')).total;
  if (total !== cases) { bad++; console.log(`cases: ${f} counts ${cases} cases, parity/${name}.json stores ${total}: run the check again`); }
}
// The pattern must still find scrolling-check, or this check would pass on nothing.
if (!seen) { console.log('cases: no check with `const CASES = <n>;` found (scrolling-check has one)'); process.exit(1); }
console.log(bad ? `cases: ${bad} of ${seen} stored totals differ from their CASES` : `cases ok: ${seen} stored total${seen > 1 ? 's' : ''} equal ${seen > 1 ? 'their' : 'its'} CASES`);
process.exit(bad ? 1 : 0);
