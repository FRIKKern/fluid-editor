// Drives a cmux browser surface: run JS in the page, wait for a condition, reload.
import { execFileSync } from 'node:child_process';

const run = (args, timeout = 60000) => execFileSync('cmux', ['browser', ...args], { encoding: 'utf8', timeout }).trim();

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
