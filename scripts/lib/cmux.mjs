// Drives a cmux browser surface: run JS in the page, wait for a condition, reload.
import { execFileSync } from 'node:child_process';

// cmux sometimes answers "surface was already recovered. Retry the command"; retry those.
function run(args, timeout = 60000) {
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync('cmux', ['browser', ...args], { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (e) {
      if (attempt < 4 && /recovered|Retry the command/i.test(String(e.stderr || e.message))) {
        execFileSync('sleep', ['1']);
        continue;
      }
      throw e;
    }
  }
}

// A surface named "cdp:<port>" is a headless Chrome (scripts/headless.mjs), driven over the
// DevTools protocol by scripts/lib/cdp-run.mjs; everything else is a cmux browser tab.
const isCdp = (s) => String(s).startsWith('cdp:');
function cdp(surface, cmd, timeout = 120000) {
  const port = Number(String(surface).slice(4));
  return execFileSync(process.execPath, [new URL('./cdp-run.mjs', import.meta.url).pathname, JSON.stringify({ port, ...cmd })], { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function screenshot(surface, file) {
  if (isCdp(surface)) return cdp(surface, { op: 'screenshot', file });
  return run(['--surface', surface, 'screenshot', '--out', file]);
}

export function evalJs(surface, js) {
  const out = isCdp(surface) ? cdp(surface, { op: 'eval', js }) : run(['--surface', surface, 'eval', '--script', js]);
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

export function waitFor(surface, js, timeoutSec = 45) {
  if (isCdp(surface)) return cdp(surface, { op: 'wait', js, timeoutSec }, (timeoutSec + 10) * 1000);
  run(['--surface', surface, 'wait', '--function', js, '--timeout', String(timeoutSec)], (timeoutSec + 10) * 1000);
}

export function reload(surface) {
  if (isCdp(surface)) return cdp(surface, { op: 'reload' });
  run(['--surface', surface, 'reload']);
}

export function goto(surface, url) {
  if (isCdp(surface)) return cdp(surface, { op: 'goto', url });
  run(['--surface', surface, 'goto', url]);
}

export function viewport(surface, w, h) {
  if (isCdp(surface)) return cdp(surface, { op: 'viewport', w, h });
  run(['--surface', surface, 'viewport', String(w), String(h)]);
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function resetViewport(surface) {
  if (isCdp(surface)) return '';
  run(['--surface', surface, 'viewport', 'reset']);
}

// A hidden tab does not load iframes or boot the Squarespace editor. If another
// session opened a tab on top of ours, give ours its own pane; theirs stay put.
export function ensureVisible(surface) {
  if (isCdp(surface)) return false;
  const state = run(['--surface', surface, 'eval', 'document.visibilityState']);
  if (state.includes('visible')) return false;
  try {
    execFileSync('cmux', ['split-off', '--surface', surface, 'right', '--focus', 'false'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    // The surface already has a pane of its own that is not on screen. Pages without
    // iframes still lay out; the editor and the oracle do not, so callers that need them check.
    console.warn(`warning: ${surface} is hidden and cannot be split off (${String(e.stderr || e.message).trim().split('\n')[0]})`);
    return false;
  }
  execFileSync('sleep', ['1']);
  return true;
}

// Geometry is compared with the oracle as WebKit draws it in a cmux tab. Headless Chrome has no
// layout scrollbar and a 500px minimum width, so its boxes differ for reasons unrelated to us:
// geometry checks refuse it.
export function requireWebKit(surface, check) {
  if (isCdp(surface)) {
    console.error(`${check} compares geometry with the oracle as WebKit draws it; run it on a cmux surface, not ${surface}.`);
    process.exit(2);
  }
}
