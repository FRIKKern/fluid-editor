// Start a headless Chrome on a port, or find the one already there. One profile per port, so
// checkouts run side by side. TMPDIR must be /tmp/: Chrome hangs with the default one on this Mac.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const chromeUp = async (port) => { try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; } };

// Returns the Chrome's pid when this profile started it, so a lane can stop its own Chrome.
export async function startChrome(port) {
  const dir = `/tmp/fluid-editor-chrome-${port}`;
  const pidFile = `${dir}/chrome.pid`;
  if (await chromeUp(port)) { try { return Number(readFileSync(pidFile, 'utf8')); } catch { return null; } }
  mkdirSync(dir, { recursive: true });
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1880,1000', '--hide-scrollbars=false', '--force-device-scale-factor=1', 'about:blank'], { detached: true, stdio: 'ignore', env: { ...process.env, TMPDIR: '/tmp/' } });
  child.unref();
  for (let k = 0; k < 50 && !(await chromeUp(port)); k++) await new Promise((r) => setTimeout(r, 200));
  if (!(await chromeUp(port))) throw new Error('headless Chrome did not start');
  writeFileSync(pidFile, String(child.pid));
  return child.pid;
}
