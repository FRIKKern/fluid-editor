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
const frames = new Map(); // the iframe each cdp surface is in, like `cmux browser frame`
export function cdp(surface, cmd, timeout = 120000) {
  const port = Number(String(surface).slice(4));
  return execFileSync(process.execPath, [new URL('./cdp-run.mjs', import.meta.url).pathname, JSON.stringify({ port, frame: frames.get(surface), ...cmd })], { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// `cmux browser <op> ...` on either kind of surface: click, dblclick, hover, press, fill, frame,
// screenshot --out, dialog accept. Oracle scripts go through this, never through cmux directly.
export function browser(surface, op, ...args) {
  if (!isCdp(surface)) return run(['--surface', surface, op, ...args]);
  switch (op) {
    case 'frame': if (args[0] === 'main') frames.delete(surface); else frames.set(surface, args[0]); return '';
    case 'click': case 'dblclick': case 'hover': return cdp(surface, { op, sel: args[0] });
    case 'press': return cdp(surface, { op, key: args[0] });
    case 'fill': return cdp(surface, { op, sel: args[0], text: args[1] });
    case 'screenshot': return cdp(surface, { op, file: args[args.indexOf('--out') + 1] });
    case 'dialog': return cdp(surface, { op, accept: args[0] !== 'dismiss' });
    default: throw new Error(`${op} is not supported on ${surface}`);
  }
}

// Real pointer input at x, y, in the current frame's coordinates. Headless Chrome only.
// mouse: type is move, down or up; pass buttons: 1 on a move while the button is held.
export function mouse(surface, type, x, y, { buttons = 0, mods = [] } = {}) {
  if (!isCdp(surface)) throw new Error('mouse needs a cdp surface');
  return cdp(surface, { op: 'mouse', type, x, y, buttons, mods });
}
export function wheel(surface, x, y, dy) {
  if (!isCdp(surface)) throw new Error('wheel needs a cdp surface');
  return cdp(surface, { op: 'wheel', x, y, dy });
}
export function drag(surface, from, to, { steps = 12, holdMs = 150, mods = [] } = {}) {
  if (!isCdp(surface)) throw new Error('drag needs a cdp surface');
  return cdp(surface, { op: 'drag', from, to, steps, holdMs, mods });
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

// Geometry is compared within one browser engine: a scrollbar is 15 or 17px in WebKit and 0 in
// headless Chrome, and text wraps at different widths (docs/decisions/0006). `oracle` is the live
// oracle surface, or a finding: one recorded on a cdp surface says engine: "chrome", an older one
// says nothing and is WebKit.
const engineOf = (s) => (isCdp(s) ? 'chrome' : 'webkit');
export const engine = engineOf;
export function requireSameEngine(surface, check, oracle) {
  const want = typeof oracle === 'string' ? engineOf(oracle) : oracle?.engine || 'webkit';
  if (engineOf(surface) === want) return;
  console.error(`${check} compares geometry with an oracle reading from ${want}; ${surface} is ${engineOf(surface)}. Run it on a ${want === 'chrome' ? 'cdp:<port>' : 'cmux'} surface, or record the oracle again.`);
  process.exit(2);
}
