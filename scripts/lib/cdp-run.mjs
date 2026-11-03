// One call against a headless Chrome over the DevTools protocol, for scripts/lib/cmux.mjs when
// the surface is "cdp:<port>". Runs as its own process so callers stay synchronous.
// argv[2] is JSON: { port, op: eval|wait|goto|reload|viewport|screenshot, js, url, w, h, file, timeoutSec }
import { writeFileSync } from 'node:fs';

const cmd = JSON.parse(process.argv[2]);
const base = `http://127.0.0.1:${cmd.port}`;
const list = await (await fetch(`${base}/json/list`)).json();
let page = list.find((t) => t.type === 'page');
if (!page) page = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(js) {
  const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(`js_error: ${r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text}`);
  return r.result?.result?.value;
}
async function settle(timeoutSec = 30) {
  const end = Date.now() + timeoutSec * 1000;
  while (Date.now() < end) { try { if (await evaluate('document.readyState') === 'complete') return; } catch {} await sleep(100); }
  throw new Error('page did not finish loading');
}
let out = '';
try {
  if (cmd.op === 'eval') { const v = await evaluate(cmd.js); out = typeof v === 'string' ? v : JSON.stringify(v ?? null); }
  if (cmd.op === 'wait') {
    const end = Date.now() + (cmd.timeoutSec || 45) * 1000; let ok = false;
    while (!ok && Date.now() < end) { try { ok = !!(await evaluate(cmd.js)); } catch {} if (!ok) await sleep(200); }
    if (!ok) throw new Error('timeout: Condition not met before timeout');
  }
  // Never serve a cached script: the dev server may have restarted from another checkout.
  if (cmd.op === 'goto') { await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Page.navigate', { url: cmd.url }); await sleep(150); await settle(); }
  if (cmd.op === 'reload') { await send('Page.reload', { ignoreCache: true }); await sleep(150); await settle(); }
  if (cmd.op === 'viewport') {
    // Window bounds persist after this connection closes; an emulation override would not.
    const { result } = await send('Browser.getWindowForTarget', { targetId: page.id });
    // The window includes Chrome's own frame: set it, read the inner size, correct, repeat.
    let w = cmd.w, h = cmd.h;
    for (let k = 0; k < 4; k++) {
      await send('Browser.setWindowBounds', { windowId: result.windowId, bounds: { windowState: 'normal', width: w, height: h } });
      await sleep(250);
      const [iw, ih] = JSON.parse(await evaluate('JSON.stringify([innerWidth, innerHeight])'));
      if (iw === cmd.w && ih === cmd.h) break;
      w += cmd.w - iw; h += cmd.h - ih;
    }
  }
  if (cmd.op === 'screenshot') { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(cmd.file, Buffer.from(r.result.data, 'base64')); }
} catch (e) { console.error(String(e.message || e)); ws.close(); process.exit(1); }
ws.close();
process.stdout.write(out);
