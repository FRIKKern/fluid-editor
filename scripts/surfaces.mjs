// Find (or open) the two browser tabs the scripts need and print their refs:
//   ORACLE_SURFACE  the trial site editor (halibut-keyboard-jlhd.squarespace.com/config)
//   FLUID_SURFACE   our editor on the dev server (127.0.0.1:5178)
// cmux surface refs change between sessions, so run this first:  eval "$(node scripts/surfaces.mjs)"
// The oracle tab gets a 1600 by 1000 viewport: a narrow pane shows the editor sidebar and
// hides toolbar items.
import { execFileSync } from 'node:child_process';
import { evalJs, viewport, pause } from './lib/cmux.mjs';

const ORACLE = 'https://halibut-keyboard-jlhd.squarespace.com/config/pages';
const OURS = 'http://127.0.0.1:5178/index.html';
const tree = () => execFileSync('cmux', ['tree'], { encoding: 'utf8' });
const find = (re) => tree().split('\n').map((l) => l.match(/surface (surface:\d+) \[browser\].*?(https?:\S+)\s*$/)).filter(Boolean).find((m) => re.test(m[2]))?.[1];

async function ensure(re, url) {
  let ref = find(re);
  if (!ref) {
    execFileSync('cmux', ['open', url, '--no-focus']);
    for (let t = 0; t < 10 && !ref; t++) { await pause(1000); ref = find(re); }
  }
  if (!ref) throw new Error(`could not open ${url}`);
  return ref;
}

const oracle = await ensure(/halibut-keyboard-jlhd\.squarespace\.com/, ORACLE);
const ours = await ensure(/127\.0\.0\.1:5178/, OURS);
viewport(oracle, 1600, 1000);
const vis = (s) => evalJs(s, '(() => JSON.stringify(document.visibilityState))()');
if (vis(oracle) !== 'visible') console.error(`warning: ${oracle} (oracle) is hidden; the Squarespace editor only boots in a visible tab`);
console.log(`export ORACLE_SURFACE=${oracle}`);
console.log(`export FLUID_SURFACE=${ours}`);
