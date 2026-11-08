// oracle-capture refuses a recipe that reads into one label twice, before anything opens (CAP-X2RESIZED.json lost a read that way).
import { spawnSync } from 'node:child_process';
const run = (steps) => spawnSync(process.execPath, [new URL('./oracle-capture.mjs', import.meta.url).pathname, '--name', 'LABELS', '--steps', JSON.stringify(steps)], { env: { ...process.env, ORACLE_SURFACE: 'cdp:1' }, encoding: 'utf8', timeout: 20000 });
const cases = [
  ['read twice', [['toPage', 'Gestures Probe'], ['read', 'a', {}], ['read', 'a', {}]]],
  ['ring after a read', [['toPage', 'Gestures Probe'], ['read', 'a -30', {}], ['ring', 'a -30']]],
];
let pass = 0;
for (const [name, steps] of cases) { const r = run(steps); const ok = r.status === 2 && /refused, nothing ran: the label/.test(r.stderr); if (ok) pass++; else console.log(`DIFF ${name}: exit ${r.status}, ${r.stderr.trim().split('\n')[0]}`); }
console.log(`capture labels ok: ${pass} of ${cases.length}`);
if (pass !== cases.length) process.exit(1);
