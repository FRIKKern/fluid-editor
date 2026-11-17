// Opt-in CPU throttle for a check on a headless Chrome: FLUID_CPU_THROTTLE=4 runs the page 4x slower, as on a busy CI
// runner (task-74e91e0dbb54df01). Off when unset, so CI and plain runs are unchanged.
// Chrome drops a throttle when the DevTools session that set it closes, and every call in scripts/lib/cdp-run.mjs is
// its own short session. So this holds one session open for the whole run and sets the rate there. It proves the
// rate took: a fixed loop in the page is timed before and after, and again by check() at the end of the run.
const LOOP = `(() => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return performance.now() - t + x * 0; })()`;

export async function throttleCpu(surface, rate) {
  if (!String(surface).startsWith('cdp:')) throw new Error(`FLUID_CPU_THROTTLE needs a headless Chrome (cdp:<port>), not ${surface}`);
  const base = `http://127.0.0.1:${Number(String(surface).slice(4))}`;
  const list = await (await fetch(`${base}/json/list`)).json();
  // The same page scripts/lib/cdp-run.mjs drives.
  const page = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  if (!page) throw new Error(`no page on ${surface} to throttle`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const loopMs = async () => (await send('Runtime.evaluate', { expression: LOOP, returnByValue: true })).result.result.value;
  const before = Math.min(await loopMs(), await loopMs());
  const set = await send('Emulation.setCPUThrottlingRate', { rate });
  if (set.error) throw new Error(`Emulation.setCPUThrottlingRate: ${set.error.message}`);
  const ratio = async () => Math.min(await loopMs(), await loopMs()) / before;
  const at = await ratio();
  // A 4x rate reads about 4 here; below half the rate the throttle did not take, and the run would prove nothing.
  const took = (r) => r >= rate / 2;
  console.log(`CPU throttle ${rate}x on ${surface}: a fixed loop runs ${at.toFixed(1)}x slower (${before.toFixed(0)} ms unthrottled)`);
  if (!took(at)) throw new Error(`CPU throttle ${rate}x did not take: the loop ran only ${at.toFixed(1)}x slower`);
  return {
    // Read again at the end of the run, so a throttle lost midway (a new page, a new renderer) shows.
    async check() { const r = await ratio(); console.log(`CPU throttle ${rate}x still on at the end: the loop runs ${r.toFixed(1)}x slower`); return took(r); },
    async close() { await send('Emulation.setCPUThrottlingRate', { rate: 1 }); ws.close(); },
  };
}
