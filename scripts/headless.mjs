// Start a headless Chrome for our editor's checks, so they never need a visible tab:
//   eval "$(node scripts/headless.mjs)"     prints: export FLUID_SURFACE=cdp:9333
// The oracle stays in a cmux tab: it needs the logged-in Squarespace session.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const port = Number(process.env.CDP_PORT || 9333);
const up = async () => { try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; } };
if (!(await up())) {
  const dir = `${tmpdir()}/fluid-editor-chrome-${port}`; // one profile per Chrome, so checkouts can run side by side
  mkdirSync(dir, { recursive: true });
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1880,1000', '--hide-scrollbars=false', '--force-device-scale-factor=1', 'about:blank'], { detached: true, stdio: 'ignore' }).unref();
  for (let k = 0; k < 50 && !(await up()); k++) await new Promise((r) => setTimeout(r, 200));
  if (!(await up())) throw new Error('headless Chrome did not start');
}
console.log(`export FLUID_SURFACE=cdp:${port}`);
