// One call against a headless Chrome over the DevTools protocol, for scripts/lib/cmux.mjs when
// the surface is "cdp:<port>". Runs as its own process so callers stay synchronous.
// argv[2] is JSON: { port, op, frame?, ... }
//   eval js | wait js timeoutSec | goto url | reload | viewport w h | screenshot file
//   click sel | dblclick sel | hover sel | press key | fill sel text | dialog accept
//   mouse type x y buttons mods | moves points gapMs | drag from to steps holdMs mods pointerType | touch from to steps holdMs stamped
// `frame` is a selector for a same-origin iframe: js and selectors run inside it, and x, y are
// in its coordinates. Input events always go to the top page, so they are shifted by the frame's box.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { isClipKey, CLIP_EVENTS, STUBBED_JS, ARM_JS, fireJs, refusal } from './clip-guard.mjs';

const cmd = JSON.parse(process.argv[2]);
const base = `http://127.0.0.1:${cmd.port}`;
const list = await (await fetch(`${base}/json/list`)).json();
// A stray chrome:// tab must never become the page we drive.
let page = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
if (!page) page = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map();
const contexts = [];
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.executionContextCreated') contexts.push(msg.params.context);
  // Leaving a dirty page raises "Leave site?". Going ahead discards the edits: it never saves.
  if (msg.method === 'Page.javascriptDialogOpening' && msg.params.type === 'beforeunload') send('Page.handleJavaScriptDialog', { accept: true });
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The JS context of the selected frame, found once per process.
async function frameContext() {
  if (!cmd.frame) return undefined;
  if (frameContext.id) return frameContext.id;
  await send('Runtime.enable');
  const { result: { root } } = await send('DOM.getDocument', { depth: 0 });
  const { result: { nodeId } } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: cmd.frame });
  if (!nodeId) throw new Error(`no frame ${cmd.frame}`);
  const { result: { node } } = await send('DOM.describeNode', { nodeId });
  const ctx = contexts.find((c) => c.auxData?.frameId === node.frameId && c.auxData?.isDefault);
  if (!ctx) throw new Error(`no JS context in ${cmd.frame}`);
  return (frameContext.id = ctx.id);
}
async function evaluateIn(contextId, js) {
  const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true, ...(contextId && { contextId }) });
  if (r.result?.exceptionDetails) throw new Error(`js_error: ${r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text}`);
  return r.result?.result?.value;
}
const evaluate = async (js) => evaluateIn(await frameContext(), js);
async function settle(timeoutSec = 30) {
  const end = Date.now() + timeoutSec * 1000;
  while (Date.now() < end) { try { if (await evaluateIn(undefined, 'document.readyState') === 'complete') return; } catch {} await sleep(100); }
  throw new Error('page did not finish loading');
}

// ---------- real input ----------
const MODS = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };
const modBits = (mods = []) => mods.reduce((n, m) => n | (MODS[m] || 0), 0);
// Where the frame's content starts on the top page, and its scale if the frame is transformed.
async function frameOrigin() {
  if (!cmd.frame) return { x: 0, y: 0, k: 1 };
  return evaluateIn(undefined, `(() => { const f = document.querySelector(${JSON.stringify(cmd.frame)}); const q = f.getBoundingClientRect(); const k = f.offsetWidth ? q.width / f.offsetWidth : 1; return { x: q.left + f.clientLeft * k, y: q.top + f.clientTop * k, k }; })()`);
}
async function toPage(x, y) {
  const o = await frameOrigin();
  return { x: o.x + x * o.k, y: o.y + y * o.k };
}
const mouseEvent = (type, p, { button = 'none', buttons = 0, clickCount = 0, mods } = {}) => send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button, buttons, clickCount, ...(cmd.pointerType && { pointerType: cmd.pointerType }), modifiers: modBits(mods) });
// The middle of an element, scrolled into view first if the middle is off screen. On the oracle the toolbar
// buttons named below are refused: no script may press them by accident (QUALITY.md, O1).
async function centerOf(sel, { guard = false } = {}) {
  const c = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
    let q = el.getBoundingClientRect(); const mx = q.left + q.width / 2, my = q.top + q.height / 2; const clipped = () => { for (let p = el.parentElement; p; p = p.parentElement) { if (getComputedStyle(p).overflowY === 'visible') continue; const r = p.getBoundingClientRect(); if (my < r.top || my > r.bottom) return true; } return false; }; if (mx < 0 || my < 0 || mx > innerWidth || my > innerHeight || clipped()) { el.scrollIntoView({ block: 'center', inline: 'center' }); q = el.getBoundingClientRect(); }
    return { x: q.left + q.width / 2, y: q.top + q.height / 2, label: (el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase(), host: location.hostname }; })()`);
  if (!c) throw new Error(`no element ${sel}`);
  if (guard && /(^|\.)squarespace\.com$/.test(c.host) && /^(save|publish)$/.test(c.label) && !process.env.ORACLE_ALLOW_SAVE) throw new Error(`refused to click "${c.label}" on the oracle`);
  return toPage(c.x, c.y);
}
async function clickAt(p, times = 1) {
  await mouseEvent('mouseMoved', p);
  await sleep(40);
  for (let n = 1; n <= times; n++) {
    await mouseEvent('mousePressed', p, { button: 'left', buttons: 1, clickCount: n });
    await mouseEvent('mouseReleased', p, { button: 'left', clickCount: n });
    if (n < times) await sleep(40);
  }
}
const KEYS = { Shift: 16, '.': 190, Escape: 27, Enter: 13, Tab: 9, Backspace: 8, Delete: 46, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, PageUp: 33, PageDown: 34, ' ': 32 };
const TEXT = { Enter: '\r', ' ': ' ' };
// A real key press. "Shift+Tab", "Meta+a". Chrome on a Mac runs editing commands only when asked. Never its copy, cut
// or paste: those reach the owner's clipboard. Meta+c, x and v send the key, then a stand-in event (clip-guard.mjs).
const COMMANDS = { 'Meta+a': 'selectAll', 'Meta+z': 'undo', 'Meta+Shift+z': 'redo' };
async function press(combo) {
  if (isClipKey(combo) && (await evaluateIn(undefined, STUBBED_JS)) !== true) throw new Error(refusal(combo));
  const parts = combo === '+' ? ['+'] : combo.split('+');
  const key = parts.pop() || '+';
  const named = key === 'Space' ? ' ' : key;
  const char = named.length === 1;
  const code = named === ' ' ? 'Space' : named === '.' ? 'Period' : char ? (/[a-z]/i.test(named) ? `Key${named.toUpperCase()}` : /\d/.test(named) ? `Digit${named}` : '') : named;
  // Only letters and digits are their own key codes: & and ' as char codes are the arrow keys.
  const keyCode = KEYS[named] ?? (char && /[a-z0-9]/i.test(named) ? named.toUpperCase().charCodeAt(0) : 0);
  const modifiers = modBits(parts);
  const plain = !(modifiers & (MODS.Control | MODS.Meta | MODS.Alt));
  const text = plain ? (TEXT[named] ?? (char ? named : undefined)) : undefined;
  // No nativeVirtualKeyCode: with one, an unhandled Escape reaches Chrome's Mac menu and opens
  // chrome://settings/help in a new tab, which hides our page.
  const common = { key: named, code, windowsVirtualKeyCode: keyCode, modifiers };
  const command = COMMANDS[combo];
  const clip = CLIP_EVENTS[combo];
  if (clip) await evaluateIn(undefined, ARM_JS);
  await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...common, ...(text && { text, unmodifiedText: text }), ...(command && { commands: [command] }) });
  if (clip) await evaluateIn(undefined, fireJs(clip));
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
}
// Focus the field, select what is in it, type over it.
async function fill(sel, text) {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.scrollIntoView({ block: 'nearest' }); el.focus(); if (el.select) el.select(); else { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } return true; })()`);
  if (!ok) throw new Error(`no element ${sel}`);
  if (text) await send('Input.insertText', { text }); else await press('Delete');
}

let out = '';
try {
  // A tab behind another is hidden: it stops answering input, and the editor stops booting.
  if (['click', 'dblclick', 'hover', 'press', 'fill', 'mouse', 'moves', 'drag', 'viewport', 'goto'].includes(cmd.op)) await send('Page.bringToFront');
  if (cmd.op === 'eval') { const v = await evaluate(cmd.js); out = typeof v === 'string' ? v : JSON.stringify(v ?? null); }
  if (cmd.op === 'wait') {
    const end = Date.now() + (cmd.timeoutSec || 45) * 1000; let ok = false;
    while (!ok && Date.now() < end) { try { ok = !!(await evaluate(cmd.js)); } catch {} if (!ok) await sleep(200); }
    if (!ok) throw new Error('timeout: Condition not met before timeout');
  }
  // Never serve a cached script: the dev server may have restarted from another checkout.
  if (cmd.op === 'goto') { await send('Page.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Page.navigate', { url: cmd.url }); await sleep(150); await settle(); }
  if (cmd.op === 'reload') { await send('Page.enable'); await send('Page.reload', { ignoreCache: true }); await sleep(150); await settle(); }
  if (cmd.op === 'narrow') {
    // Runs on its own in the background: an emulation override lasts only as long as its connection.
    await send('Emulation.setDeviceMetricsOverride', { width: cmd.w, height: cmd.h, deviceScaleFactor: 1, mobile: false });
    ws.onclose = () => process.exit(0);
    await new Promise(() => {});
  }
  if (cmd.op === 'viewport') {
    const narrowPid = `/tmp/fluid-editor-chrome-${cmd.port}/narrow.pid`;
    // Wait until it is gone: its override ends when its connection closes. The file outlives that process, and its PID
    // may since belong to anything: signal it only while it is still a narrow op for this port, then drop the file.
    try {
      const old = Number(readFileSync(narrowPid, 'utf8'));
      unlinkSync(narrowPid);
      const ours = JSON.stringify({ port: cmd.port, op: 'narrow' }).slice(0, -1) + ',';
      if (old > 0 && execFileSync('ps', ['-ww', '-o', 'command=', '-p', String(old)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).includes(ours)) {
        process.kill(old);
        for (let k = 0; k < 40; k++) { process.kill(old, 0); await sleep(50); }
      }
    } catch {}
    // Chrome's window is at least 500px wide, so narrower sizes are emulated by a background process.
    if (cmd.w < 500) {
      mkdirSync(`/tmp/fluid-editor-chrome-${cmd.port}`, { recursive: true });
      const child = spawn(process.execPath, [process.argv[1], JSON.stringify({ port: cmd.port, op: 'narrow', w: cmd.w, h: cmd.h })], { detached: true, stdio: 'ignore' });
      child.unref();
      writeFileSync(narrowPid, String(child.pid));
      const end = Date.now() + 5000;
      while (Date.now() < end && (await evaluateIn(undefined, 'innerWidth')) !== cmd.w) await sleep(50);
      if ((await evaluateIn(undefined, 'innerWidth')) !== cmd.w) throw new Error(`could not emulate ${cmd.w}px`);
      ws.close(); process.exit(0);
    }
    // Window bounds persist after this connection closes. The window includes Chrome's own frame, and the page's inner
    // size follows a new window size some time later: a fixed 250 ms wait read a stale size on a CI runner and left the
    // window 1600x1231 for 1600x945 (run 43323739189). So: window = size wanted + frame (window minus inner, read now),
    // then poll the inner size until it is the one wanted. A set lands at the size wanted, or wrong (the frame changed):
    // moved, then still for 300 ms. Then read the frame again and set again. Never a second set while one may still be on
    // its way: its frame read would be stale, and the two land in turn at the wrong size. So a window that has not moved
    // in 4 s is not set again (held: an emulation, a clamp). Not there: throw, with the size wanted and the size got.
    const { result: { windowId } } = await send('Browser.getWindowForTarget', { targetId: page.id });
    const inner = async () => JSON.parse(await evaluateIn(undefined, 'JSON.stringify([innerWidth, innerHeight])'));
    const at = ([iw, ih]) => iw === cmd.w && ih === cmd.h;
    let got = await inner(), err = '';
    for (let k = 0; k < 3 && !at(got); k++) {
      const { result: { bounds } } = await send('Browser.getWindowBounds', { windowId });
      const r = await send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal', width: cmd.w + bounds.width - got[0], height: cmd.h + bounds.height - got[1] } });
      if (r.error) err = `, ${r.error.message}`;
      const end = Date.now() + 4000;
      let moved = 0;
      while (!at(got) && Date.now() < end && !(moved && Date.now() - moved >= 300)) {
        await sleep(50);
        const now = await inner();
        if (now[0] !== got[0] || now[1] !== got[1]) moved = Date.now();
        got = now;
      }
      if (!moved) break;
    }
    if (!at(got)) throw new Error(`viewport: wanted ${cmd.w}x${cmd.h}, got ${got.join('x')}${err}`);
  }
  if (cmd.op === 'screenshot') { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(cmd.file, Buffer.from(r.result.data, 'base64')); }
  if (cmd.op === 'click') await clickAt(await centerOf(cmd.sel, { guard: true }));
  if (cmd.op === 'dblclick') await clickAt(await centerOf(cmd.sel, { guard: true }), 2);
  if (cmd.op === 'hover') await mouseEvent('mouseMoved', await centerOf(cmd.sel));
  if (cmd.op === 'press') await press(cmd.key);
  if (cmd.op === 'presses') for (const [n, key] of cmd.keys.entries()) { if (n && cmd.gapMs) await new Promise((r) => setTimeout(r, cmd.gapMs)); await press(key); }
  if (cmd.op === 'fill') await fill(cmd.sel, cmd.text);
  if (cmd.op === 'dialog') { await send('Page.enable'); const r = await send('Page.handleJavaScriptDialog', { accept: cmd.accept !== false }); if (r.error) throw new Error(r.error.message); }
  if (cmd.op === 'mouse') {
    const p = await toPage(cmd.x, cmd.y);
    const pressed = cmd.type === 'down' || cmd.type === 'up';
    await mouseEvent({ move: 'mouseMoved', down: 'mousePressed', up: 'mouseReleased' }[cmd.type], p, { button: pressed ? 'left' : cmd.buttons ? 'left' : 'none', buttons: cmd.type === 'down' || (cmd.type === 'move' && cmd.buttons) ? 1 : 0, clickCount: pressed ? 1 : 0, mods: cmd.mods });
  }
  // Plain moves through each point in one process, gapMs apart: the time between them is the gap, not a node start
  // each (marks-check's way back has to beat the chrome's 200 ms timer). Prints the ms from the first move to the last.
  if (cmd.op === 'moves') {
    const ps = [];
    for (const [x, y] of cmd.points) ps.push(await toPage(x, y));
    const at = [];
    for (const [n, p] of ps.entries()) { if (n && cmd.gapMs) await sleep(cmd.gapMs); await mouseEvent('mouseMoved', p); at.push(performance.now()); }
    out = JSON.stringify(Math.round(at.at(-1) - at[0]));
  }
  if (cmd.op === 'wheel') {
    const p = await toPage(cmd.x, cmd.y);
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: cmd.dy });
  }
  if (cmd.op === 'touch') {
    // No Emulation.setTouchEmulationEnabled: turning it on throws the oracle out of edit mode.
    const a = await toPage(...cmd.from), b = await toPage(...cmd.to);
    const at = (p) => [{ x: p.x, y: p.y, id: 1 }];
    // stamped: each event carries the time it is meant to have (Input.dispatchTouchEvent's timestamp), so the page's
    // e.timeStamp gap from the press to the first move is holdMs, not holdMs plus however long Chrome took to take the
    // press on a busy machine. The editor's hold goes by e.timeStamp (TOUCH_HOLD, app/src/editor.js). The moves are
    // stamped half a ms late: event clocks are coarse (to 0.1 ms), and a 100 ms hold must never read as 99.9.
    const t0 = Date.now() / 1000, when = (ms) => (cmd.stamped ? { timestamp: t0 + ms / 1000 } : {});
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(a), ...when(0) });
    if (cmd.holdMs) await sleep(cmd.holdMs);
    const steps = cmd.steps ?? 12, hold = cmd.holdMs ?? 0;
    for (let k = 1; k <= steps; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at({ x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps }), ...when(hold + 0.5 + 25 * (k - 1)) }); await sleep(25); }
    if (steps) await sleep(200);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], ...when(hold + 25 * steps + (steps ? 200 : 0)) });
    await sleep(300);
  }
  if (cmd.op === 'drag') {
    const a = await toPage(...cmd.from), b = await toPage(...cmd.to);
    const steps = cmd.steps || 12;
    await mouseEvent('mouseMoved', a, { mods: cmd.mods });
    await mouseEvent('mousePressed', a, { button: 'left', buttons: 1, clickCount: 1, mods: cmd.mods });
    for (let k = 1; k <= steps; k++) { await mouseEvent('mouseMoved', { x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps }, { button: 'left', buttons: 1, mods: cmd.mods }); await sleep(25); }
    await sleep(cmd.holdMs ?? 150);
    await mouseEvent('mouseReleased', b, { button: 'left', clickCount: 1, mods: cmd.mods });
  }
} catch (e) { console.error(String(e.message || e)); ws.close(); process.exit(1); }
ws.close();
process.stdout.write(out);
