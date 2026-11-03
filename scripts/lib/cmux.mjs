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

export function evalJs(surface, js) {
  const out = run(['--surface', surface, 'eval', '--script', js]);
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

export function waitFor(surface, js, timeoutSec = 45) {
  run(['--surface', surface, 'wait', '--function', js, '--timeout', String(timeoutSec)], (timeoutSec + 10) * 1000);
}

export function reload(surface) {
  run(['--surface', surface, 'reload']);
}

export function goto(surface, url) {
  run(['--surface', surface, 'goto', url]);
}

export function viewport(surface, w, h) {
  run(['--surface', surface, 'viewport', String(w), String(h)]);
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function resetViewport(surface) {
  run(['--surface', surface, 'viewport', 'reset']);
}

// A hidden tab does not load iframes or boot the Squarespace editor. If another
// session opened a tab on top of ours, give ours its own pane; theirs stay put.
export function ensureVisible(surface) {
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
