// startChrome must never leave a Chrome running when it throws: that Chrome can hold the oracle login. A stand-in for Chrome, so this takes about a second.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startChrome, chromeUp } from './lib/chrome.mjs';

const dir = mkdtempSync(join(tmpdir(), 'start-chrome-')), port = 19377, pidFile = `/tmp/fluid-editor-chrome-${port}/chrome.pid`;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const fake = (name, body) => { const f = join(dir, name); writeFileSync(f, body, { mode: 0o755 }); return f; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bad = [];
const is = (what, ok) => { if (!ok) bad.push(what); };
const fails = async (waitMs) => { const t0 = Date.now(); try { await startChrome(port, { waitMs, stopMs: 300 }); return { threw: false, ms: Date.now() - t0 }; } catch { return { threw: true, ms: Date.now() - t0 }; } };

// Never comes up: stopped, with no pid left on file.
const marker = join(dir, 'pid');
process.env.CHROME = fake('never', `#!/bin/sh\necho $$ > ${marker}\nexec sleep 60\n`);
const never = await fails(400);
await wait(100);
const neverPid = Number(readFileSync(marker, 'utf8'));
is('a Chrome that never comes up makes it throw', never.threw);
is('and is stopped', !alive(neverPid));
is('and leaves no pid on file', !existsSync(pidFile));

// Ignores the stop signal: still stopped.
process.env.CHROME = fake('stubborn', `#!/bin/sh\necho $$ > ${marker}\ntrap '' TERM\nwhile :; do sleep 0.1; done\n`);
const stubborn = await fails(200);
await wait(100);
is('one that ignores the stop is still stopped', stubborn.threw && !alive(Number(readFileSync(marker, 'utf8'))));

// Exits at once: no need to wait out the time.
process.env.CHROME = fake('exits', '#!/bin/sh\nexit 1\n');
const exits = await fails(20000);
is('one that exits throws at once', exits.threw && exits.ms < 2000);
is('and leaves no pid on file', !existsSync(pidFile));

// Up after the old 10 s would be fine too: here, up after a short wait, its pid returned and on file.
process.env.CHROME = fake('slow', `#!${process.execPath}\nconst p = process.argv.find((a) => a.startsWith('--remote-debugging-port=')).split('=')[1];\nsetTimeout(() => require('node:http').createServer((q, s) => s.end('{}')).listen(+p, '127.0.0.1'), 500);\nsetTimeout(() => process.exit(0), 20000);\n`);
const pid = await startChrome(port, { waitMs: 5000 });
is('a slow start returns its pid', alive(pid) && await chromeUp(port));
is('and has it on file', readFileSync(pidFile, 'utf8') === String(pid));
process.kill(pid);

rmSync(dir, { recursive: true, force: true });
rmSync(`/tmp/fluid-editor-chrome-${port}`, { recursive: true, force: true });
if (bad.length) { console.error(`start-chrome: ${bad.join('; ')}`); process.exit(1); }
console.log('start-chrome ok: 8 cases');
