// Start a headless Chrome on a port, or find the one already there. One profile per port, so
// checkouts run side by side. TMPDIR must be /tmp/: Chrome hangs with the default one on this Mac.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

export const chromeUp = async (port) => { try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; } };

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns the Chrome's pid when this profile started it, so a lane can stop its own Chrome. A start took 35 s with memory
// short, 2026-11-06. If it isn't up in time this call stops what it started, since that Chrome can hold the oracle
// login, and then throws: an error here never leaves a Chrome running.
export async function startChrome(port, { waitMs = 60000, stopMs = 5000 } = {}) {
  const dir = `/tmp/fluid-editor-chrome-${port}`;
  const pidFile = `${dir}/chrome.pid`;
  if (await chromeUp(port)) { try { return Number(readFileSync(pidFile, 'utf8')); } catch { return null; } }
  mkdirSync(dir, { recursive: true });
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1880,1000', '--hide-scrollbars=false', '--force-device-scale-factor=1', 'about:blank'], { detached: true, stdio: 'ignore', env: { ...process.env, TMPDIR: '/tmp/' } });
  child.unref();
  let gone = false;
  child.on('exit', () => { gone = true; });
  child.on('error', () => { gone = true; });
  if (child.pid) writeFileSync(pidFile, String(child.pid));
  const end = Date.now() + waitMs;
  while (!gone && Date.now() < end && !(await chromeUp(port))) await pause(200);
  if (!gone && await chromeUp(port)) return child.pid;
  const exited = gone;
  if (!gone) {
    child.kill('SIGTERM');
    const stopBy = Date.now() + stopMs;
    while (!gone && Date.now() < stopBy) await pause(100);
    if (!gone) child.kill('SIGKILL');
  }
  rmSync(pidFile, { force: true });
  throw new Error(exited ? `headless Chrome on ${port} exited before it came up` : `headless Chrome on ${port} was not up after ${waitMs / 1000} s, so it was stopped`);
}
