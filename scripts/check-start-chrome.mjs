// startChrome must never leave a Chrome running when it throws: that Chrome can hold the oracle login. A stand-in for Chrome, so this takes about two seconds.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startChrome, chromeUp } from './lib/chrome.mjs';

// A free port for each run: `npm run check` runs in every lane, and two runs on one port see each other's stand-in as up.
const port = await new Promise((r) => { const q = createServer().listen(0, '127.0.0.1', () => { const { port: n } = q.address(); q.close(() => r(n)); }); });
const dir = mkdtempSync(join(tmpdir(), 'start-chrome-')), pidFile = `/tmp/fluid-editor-chrome-${port}/chrome.pid`;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const fake = (name, body) => { const f = join(dir, name); writeFileSync(f, body, { mode: 0o755 }); return f; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const gone = async (pid) => { const by = Date.now() + 10000; while (alive(pid) && Date.now() < by) await wait(20); return !alive(pid); };
const bad = [];
const is = (what, ok) => { if (!ok) bad.push(what); };
// The stand-in's pid comes from the pid file while the start waits: under load a stand-in can be stopped before its own first line runs.
const fails = async (waitMs) => {
  const t0 = Date.now();
  let pid = 0;
  const watch = setInterval(() => { try { pid = Number(readFileSync(pidFile, 'utf8')) || pid; } catch { /* not there yet, or gone */ } }, 5);
  let threw = false;
  try { await startChrome(port, { waitMs, stopMs: 300 }); } catch { threw = true; }
  clearInterval(watch);
  return { threw, ms: Date.now() - t0, pid };
};

// Never comes up: stopped, with no pid left on file.
process.env.CHROME = fake('never', '#!/bin/sh\nexec sleep 60\n');
const never = await fails(400);
is('a Chrome that never comes up makes it throw', never.threw);
is('and is stopped', never.pid > 0 && await gone(never.pid));
is('and leaves no pid on file', !existsSync(pidFile));

// Ignores the stop signal: still stopped.
process.env.CHROME = fake('stubborn', "#!/bin/sh\ntrap '' TERM\nwhile :; do sleep 0.1; done\n");
const stubborn = await fails(200);
is('one that ignores the stop is still stopped', stubborn.threw && stubborn.pid > 0 && await gone(stubborn.pid));

// Exits at once: no need to wait out the time.
process.env.CHROME = fake('exits', '#!/bin/sh\nexit 1\n');
const exits = await fails(20000);
is('one that exits throws without waiting out its time', exits.threw && exits.ms < 10000);
is('and leaves no pid on file', !existsSync(pidFile));

// Up after the old 10 s would be fine too: here, up after a short wait, its pid returned and on file.
process.env.CHROME = fake('slow', `#!${process.execPath}\nconst p = process.argv.find((a) => a.startsWith('--remote-debugging-port=')).split('=')[1];\nsetTimeout(() => require('node:http').createServer((q, s) => s.end('{}')).listen(+p, '127.0.0.1'), 500);\nsetTimeout(() => process.exit(0), 20000);\n`);
const pid = await startChrome(port, { waitMs: 60000 });
is('a slow start returns its pid', alive(pid) && await chromeUp(port));
is('and has it on file', readFileSync(pidFile, 'utf8') === String(pid));
process.kill(pid);

rmSync(dir, { recursive: true, force: true });
rmSync(`/tmp/fluid-editor-chrome-${port}`, { recursive: true, force: true });
if (bad.length) { console.error(`start-chrome: ${bad.join('; ')}`); process.exit(1); }
console.log('start-chrome ok: 8 cases');
