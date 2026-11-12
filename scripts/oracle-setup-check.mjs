// What a new oracle trial still needs, as a list. The steps are in QUALITY.md, "A new trial".
//   FLUID_ORACLE_SITE=<name>.squarespace.com CDP_PORT=<port> node scripts/oracle-setup-check.mjs [--since YYYY-MM-DD] [--live]
// Offline (the default) it reads only the environment and files in this repo: the site setting, whether the port's
// Chrome profile folder exists (read, never touched), and the three stored bases. --since is the day the trial started:
// a base stored before it is from the old site.
// --live also reads the site over ORACLE_SURFACE=cdp:<port>: the login, the probe pages in the page list, and the bases
// through oracle-readback, which is read only. --live presses nothing itself.
// Exit 0: nothing missing among what was checked. Exit 1: something missing, listed. Exit 2: bad arguments.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const LIVE = args.includes('--live'), SINCE = opt('since');
if (SINCE !== null && !/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) { console.error('oracle-setup-check: --since takes YYYY-MM-DD, the day the trial started'); process.exit(2); }
const root = fileURLToPath(new URL('..', import.meta.url));
const lines = [];
const say = (state, what, note) => lines.push([state, what, note]);

// 1. The site setting. A bad value stops here: every oracle script would stop on it too.
let site;
try { site = await import('./lib/oracle-site.mjs'); } catch (e) { say('missing', 'site', e.message); }
if (site) {
  if (!process.env.FLUID_ORACLE_SITE) say('missing', 'site', `FLUID_ORACLE_SITE is not set, so scripts use ${site.DEFAULT_SITE}, the old trial`);
  else say('ok', 'site', site.HOST);
}

// 2. The Chrome profile that holds the login, one per port (scripts/lib/chrome.mjs). Only its folder is looked at.
const port = Number(process.env.CDP_PORT);
if (!port) say('missing', 'profile', 'CDP_PORT is not set: the port of the Chrome that holds the trial login');
else if (!existsSync(`/tmp/fluid-editor-chrome-${port}`)) say('missing', 'profile', `/tmp/fluid-editor-chrome-${port} does not exist: log in there first`);
else say('ok', 'profile', `/tmp/fluid-editor-chrome-${port} exists; the login itself is checked by --live`);

// 3. The stored bases oracle-readback compares with: there, whole, and stored after the trial started.
// CAP-THEMEROWS has no store flag: an old one is fine if --live's oracle-readback matches it.
const FOOTER_PATHS = site ? (await import('./oracle/footer.mjs')).FOOTER_PATHS : [];
const BASES = {
  'CAP-FOOTER': { store: 'oracle-readback --store-footer', whole: (b) => FOOTER_PATHS.length > 0 && FOOTER_PATHS.every((p) => b.reads?.[p]?.blocks) },
  'CAP-THEMEROWS': { store: null, whole: (b) => Array.isArray(b.rowGroups) && b.rows?.A && b.palette },
  'CAP-STYLEROWS': { store: 'oracle-readback --store', whole: (b) => ['views', 'lists', 'families', 'formColors'].every((k) => b[k]) },
};
function readBase(name) {
  const file = `${root}/parity/findings/${name}.json`;
  if (!existsSync(file)) return { state: 'missing', note: `parity/findings/${name}.json does not exist` };
  let b;
  try { b = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { state: 'missing', note: `${name}.json does not parse: ${e.message}` }; }
  if (name === 'CAP-FOOTER' && !site) return { state: 'skip', note: 'CAP-FOOTER: its pages come from the site setting, fix that first' };
  if (!BASES[name].whole(b)) return { state: 'missing', note: `${name}.json lacks parts oracle-readback reads` };
  const old = SINCE && !(b.capturedAt >= SINCE), when = `${name} stored ${b.capturedAt || 'on no date'}`;
  if (old && !BASES[name].store) return { state: 'skip', note: `${when}, before ${SINCE}; no flag stores it, so --live's oracle-readback decides` };
  if (old) return { state: 'missing', note: `${when}, before ${SINCE}: from the old site. Store: ${BASES[name].store}` };
  return { state: 'ok', note: `${when}${SINCE ? '' : ' (no --since, so not compared with the trial start)'}` };
}
for (const name of Object.keys(BASES)) { const r = readBase(name); say(r.state, 'base', r.note); }

// --live: plain functions over the oracle surface. Each returns [state, note] and presses nothing.
async function liveLogin(S, s) {
  const { evalJs, goto, pause } = await import('./lib/cmux.mjs');
  goto(S, s.EDITOR); await pause(6000);
  const at = evalJs(S, `(() => JSON.stringify({ host: location.host, login: !!document.querySelector('input[type=password]') }))()`);
  return at.host === s.HOST && !at.login ? ['ok', `logged in on ${s.HOST}`] : ['missing', `not logged in: at ${at.host}${at.login ? ', a password field shows' : ''}`];
}
// The page list must show each page by its exact title. The demo page is only needed by oracle-record and oracle-probe.
async function livePages(S, s) {
  const { evalJs, goto, pause } = await import('./lib/cmux.mjs');
  goto(S, s.EDITOR); await pause(9000);
  const shown = new Set(evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim())))()`));
  return [s.BLOCKS_PROBE, s.GESTURES_PROBE, s.DEMO].map((p) => [shown.has(p.title) ? 'ok' : p === s.DEMO ? 'optional' : 'missing', `page "${p.title}" (${p.path})${shown.has(p.title) ? '' : ' is not in the page list'}`]);
}
// oracle-readback is read only: it leaves by Exit with Save off. Its exit code says whether the site matches the bases.
function liveBases(S) {
  const r = spawnSync(process.execPath, [`${root}/scripts/oracle-readback.mjs`], { env: { ...process.env, ORACLE_SURFACE: S }, encoding: 'utf8', timeout: 30 * 60000 });
  const tail = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-3).join(' | ');
  return [r.status === 0 ? 'ok' : 'missing', `oracle-readback ${r.status === null ? 'timed out' : `exit ${r.status}`}${r.status === 1 ? ' (differs from the bases)' : r.status === 2 ? ' (some sets not read)' : ''}: ${tail}`];
}

const S = process.env.ORACLE_SURFACE;
if (!LIVE) say('skip', 'live', 'login, probe pages and bases on the site: run again with --live');
else if (!site || !process.env.FLUID_ORACLE_SITE || !/^cdp:\d+$/.test(S || '')) say('missing', 'live', 'needs a valid FLUID_ORACLE_SITE and ORACLE_SURFACE=cdp:<port> (eval "$(CDP_PORT=<port> node scripts/oracle-headless.mjs)")');
else {
  const login = await liveLogin(S, site);
  say(login[0], 'login', login[1]);
  if (login[0] === 'ok') {
    for (const [state, note] of await livePages(S, site)) say(state, 'page', note);
    const bases = liveBases(S);
    say(bases[0], 'bases', bases[1]);
  }
}

for (const [state, what, note] of lines) console.log(`${state.padEnd(8)} ${what.padEnd(8)} ${note}`);
const missing = lines.filter(([state]) => state === 'missing').length;
console.log(missing ? `${missing} missing. Steps: QUALITY.md, "A new trial".` : 'nothing missing among what was checked');
process.exit(missing ? 1 : 0);
