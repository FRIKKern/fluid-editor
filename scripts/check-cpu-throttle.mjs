// Cases for scripts/lib/cpu-throttle.mjs against a fake headless Chrome: a local server that answers /json/list and
// speaks just enough DevTools WebSocket. It times the loop at 10 ms before the throttle and `after` ms once it is set,
// then, once the throttle is set up, does one of: answer, close the session on the next request, drop it between
// requests, or never answer. A session that closes or goes quiet must fail the run, never hang it (task-f6100b7084bbfb7d).
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import * as lib from './lib/cpu-throttle.mjs';

// One fake Chrome. Requests 1-5 are the setup: two loop timings, the rate, two more timings.
function fakeChrome({ after = 40, then = 'answer' } = {}) {
  const sockets = new Set();
  const server = createServer((req, res) => {
    const { port } = server.address();
    res.end(JSON.stringify([{ type: 'page', url: 'http://x/', webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/1` }]));
  });
  server.on('upgrade', (req, socket) => {
    sockets.add(socket);
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const reply = (obj) => { const b = Buffer.from(JSON.stringify(obj)); socket.write(Buffer.concat([Buffer.from([0x81, b.length < 126 ? b.length : 126]), b.length < 126 ? Buffer.alloc(0) : Buffer.from([b.length >> 8, b.length & 255]), b])); };
    let buf = Buffer.alloc(0), n = 0, set = false;
    socket.on('error', () => {});
    socket.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        let len = buf[1] & 127, at = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
        if (buf.length < at + 4 + len) return;
        const mask = buf.subarray(at, at + 4), body = Buffer.from(buf.subarray(at + 4, at + 4 + len)).map((x, i) => x ^ mask[i % 4]);
        const op = buf[0] & 15;
        buf = buf.subarray(at + 4 + len);
        if (op === 8) { socket.destroy(); return; }
        const msg = JSON.parse(body.toString());
        n++;
        if (n > 5 && then === 'close') { socket.destroy(); return; }
        if (n > 5 && then === 'silent') continue;
        if (msg.method === 'Emulation.setCPUThrottlingRate') { set = msg.params.rate !== 1; reply({ id: msg.id, result: {} }); }
        else reply({ id: msg.id, result: { result: { value: set ? after : 10 } } });
        if (n === 5 && then === 'drop') setTimeout(() => socket.destroy(), 50);
      }
    });
  });
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res({ surface: `cdp:${server.address().port}`, stop: () => { for (const s of sockets) s.destroy(); server.close(); } })));
}

// Settles within ms, or reads as still waiting: a hang must show as a failure here, not hang this test.
const within = (p, ms) => Promise.race([p.then((v) => ({ v }), (e) => ({ e })), new Promise((r) => setTimeout(() => r({ hung: true }), ms))]);
// The library's own lines are muted; this test prints through `out`, so a call that never returns cannot mute the rest.
const out = console.log.bind(console);
const quiet = (fn) => async (...a) => { console.log = () => {}; try { return await fn(...a); } finally { console.log = out; } };
const throttle = quiet((surface, rate, opts) => lib.throttleCpu(surface, rate, opts));
const check = quiet((t) => t.check());

let pass = 0, total = 0;
const add = (what, ok, detail = '') => { total++; if (ok) pass++; out(`${what.padEnd(72)} ${ok ? 'ok' : `FAIL ${detail}`}`); };
const show = (r) => (r.hung ? 'still waiting' : r.e ? `threw: ${r.e.message}` : `gave ${JSON.stringify(r.v)}`);
const stops = [];
const chrome = async (o) => { const c = await fakeChrome(o); stops.push(c.stop); return c; };

try {
  const rate = (v) => { try { return lib.throttleRate(v); } catch (e) { return `refused: ${e.message}`; } };
  for (const [v, want] of [[undefined, 0], ['', 0], ['0', 0], ['4', 4], ['2.5', 2.5]]) add(`FLUID_CPU_THROTTLE=${JSON.stringify(v)} reads as ${want}`, rate(v) === want, rate(v));
  for (const v of ['abc', '4x', '1', '1.5', '-3', 'Infinity']) add(`FLUID_CPU_THROTTLE=${JSON.stringify(v)} refuses to run`, /^refused: .*not a rate/.test(rate(v)), rate(v));

  let c = await chrome();
  let t = await throttle(c.surface, 4, { onLost: () => {} });
  let r = await within(check(t), 2000);
  add('a held 4x throttle reads as still on at the end', r.v === true, show(r));
  let lost = 0;
  t = await throttle((await chrome()).surface, 4, { onLost: () => lost++ });
  await t.close();
  await new Promise((res) => setTimeout(res, 200));
  add('  and close() at the end is no loss', lost === 0, `onLost ran ${lost} times`);

  r = await within(throttle((await chrome({ after: 22 })).surface, 4, { onLost: () => {} }), 2000);
  add('a 4x throttle that reads only 2.2x refuses to run', /did not take/.test(r.e?.message), show(r));

  c = await chrome({ then: 'close' });
  t = await throttle(c.surface, 4, { onLost: () => {} });
  r = await within(check(t), 3000);
  add('the session closes while check() waits: check() fails at once', /closed mid-run/.test(r.e?.message), show(r));

  let lostAt = null;
  const t0 = Date.now();
  c = await chrome({ then: 'drop' });
  t = await throttle(c.surface, 4, { onLost: (e) => { lostAt = { ms: Date.now() - t0, msg: e.message }; } });
  await new Promise((res) => setTimeout(res, 1000));
  add('the session drops between requests: the run is told at once', /closed mid-run/.test(lostAt?.msg) && lostAt.ms < 1000, lostAt ? JSON.stringify(lostAt) : 'never told');
  r = await within(check(t), 3000);
  add('  and check() after it fails at once', /closed mid-run/.test(r.e?.message), show(r));

  c = await chrome({ then: 'silent' });
  t = await throttle(c.surface, 4, { timeoutMs: 300, onLost: () => {} });
  r = await within(check(t), 3000);
  add('the session never answers check(): it fails after the 0.3 s timeout', /no answer in 0.3 s/.test(r.e?.message), show(r));
} catch (e) {
  add('the cases ran', false, e.stack);
} finally {
  for (const stop of stops) stop();
}
out(`CPU throttle cases: ${pass} of ${total} pass`);
process.exit(pass === total ? 0 : 1);
