// The oracle in a headless Chrome that never shows on screen:
//   eval "$(CDP_PORT=9371 node scripts/oracle-headless.mjs)"
// prints: export ORACLE_SURFACE=cdp:9371, and ORACLE_CHROME_PID when this profile's Chrome was
// started here (stop that pid when your lane ends). Starts or reuses the Chrome on CDP_PORT and
// opens the editor's page list at 1600 by 1000.
// CDP_PORT is required, with no default: every lane copies the recorder's profile, so nothing may start on it by accident.
// The login comes from the owner's cmux tab: only *.squarespace.com cookies, read once and set
// over the DevTools protocol. Values are never printed or written to a file by this script
// (Chrome keeps them in its profile under /tmp). --from surface:N names the tab, otherwise the
// first cmux tab on the trial site. No tab? The profile's earlier login is used.
import { execFileSync } from 'node:child_process';
import { startChrome } from './lib/chrome.mjs';
import { evalJs, goto, viewport, pause } from './lib/cmux.mjs';

const ORACLE = 'https://halibut-keyboard-jlhd.squarespace.com/config/pages';
const args = process.argv.slice(2);
const port = Number(process.env.CDP_PORT);
const say = (m) => console.error(`oracle-headless: ${m}`);
if (!port) { say('set CDP_PORT to your lane\'s oracle port: eval "$(CDP_PORT=<port> node scripts/oracle-headless.mjs)"'); process.exit(2); }

function findTab() {
  if (args.includes('--from')) return args[args.indexOf('--from') + 1];
  try {
    return execFileSync('cmux', ['tree'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').map((l) => l.match(/surface (surface:\d+) \[browser\].*halibut-keyboard-jlhd\.squarespace\.com/)).find(Boolean)?.[1] || null;
  } catch { return null; }
}

function readCookies(tab) {
  const raw = JSON.parse(execFileSync('cmux', ['browser', '--surface', tab, 'cookies', 'get', '--json'], { encoding: 'utf8', maxBuffer: 1e7, stdio: ['ignore', 'pipe', 'ignore'] }));
  return (Array.isArray(raw) ? raw : raw.cookies).filter((c) => /(^|\.)squarespace\.com$/.test(String(c.domain))).map((c) => {
    const out = { name: c.name, value: c.value, domain: c.domain, path: c.path || '/', secure: !!c.secure, httpOnly: !!(c.httpOnly ?? c.http_only) };
    const e = c.expires ?? c.expiresDate;
    if (typeof e === 'number' && e > 0) out.expires = e;
    return out;
  });
}

async function setCookies(cookies) {
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const reply = await new Promise((res) => { ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id === 1) res(x); }; ws.send(JSON.stringify({ id: 1, method: 'Network.setCookies', params: { cookies } })); });
  ws.close();
  if (reply.error) throw new Error(`setCookies failed: ${reply.error.message}`);
}

const pid = await startChrome(port);
const S = `cdp:${port}`;
const tab = findTab();
if (tab) {
  const cookies = readCookies(tab);
  await setCookies(cookies);
  say(`copied ${cookies.length} squarespace.com cookies from ${tab}`);
} else say('no cmux tab on the trial site: using the login already in this profile');

viewport(S, 1600, 1000);
const at = evalJs(S, '(() => JSON.stringify(location.host))()');
if (!String(at).includes('halibut-keyboard-jlhd')) {
  goto(S, ORACLE);
  await pause(4000);
}
const state = evalJs(S, `(() => JSON.stringify({ host: location.host, login: !!document.querySelector('input[type=password]') }))()`);
if (state.login || !state.host.includes('halibut-keyboard-jlhd')) { say(`not logged in (at ${state.host})`); process.exit(1); }
console.log(`export ORACLE_SURFACE=${S}`);
if (pid) console.log(`export ORACLE_CHROME_PID=${pid}`);
