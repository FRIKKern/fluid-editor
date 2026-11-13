// The cdp viewport op (scripts/lib/cdp-run.mjs) must leave the page at the inner size asked for, or fail. Against a stand-in
// for Chrome's DevTools port, so it needs no browser: a window with an 87 px frame whose inner size follows a new window
// size 400 ms late (a fixed 250 ms wait read the old size and left the window wrong, run 43323739189), and one held at
// 1600x1231 that no window size moves (the op used to exit 0 there).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

// The smallest WebSocket server cdp-run.mjs needs: text frames, client frames masked, replies under 64 KB.
function standIn({ lagMs, held }) {
  const s = { bounds: { left: 0, top: 0, width: 1880, height: 1000, windowState: 'normal' }, inner: held || [1880, 913] };
  const reply = (sock, obj) => {
    const body = Buffer.from(JSON.stringify(obj));
    const head = body.length < 126 ? Buffer.from([0x81, body.length]) : Buffer.from([0x81, 126, body.length >> 8, body.length & 255]);
    sock.write(Buffer.concat([head, body]));
  };
  const answer = ({ method, params }) => {
    if (method === 'Browser.getWindowForTarget') return { windowId: 1, bounds: { ...s.bounds } };
    if (method === 'Browser.getWindowBounds') return { bounds: { ...s.bounds } };
    if (method === 'Browser.setWindowBounds') {
      Object.assign(s.bounds, params.bounds);
      const { width, height } = s.bounds;
      if (!held) setTimeout(() => { s.inner = [width, height - 87]; }, lagMs);
      return {};
    }
    if (method === 'Runtime.evaluate') {
      const v = { 'JSON.stringify([innerWidth, innerHeight])': JSON.stringify(s.inner), innerWidth: s.inner[0] }[params.expression];
      return { result: { type: typeof v, value: v } };
    }
    return {};
  };
  const server = createServer((req, res) => {
    const { port } = server.address();
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify([{ id: 'P', type: 'page', url: 'about:blank', webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/P` }]));
  });
  server.on('upgrade', (req, sock) => {
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let buf = Buffer.alloc(0);
    sock.on('error', () => {});
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        let len = buf[1] & 127, at = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
        if (buf.length < at + 4 + len) return;
        const mask = buf.subarray(at, at + 4), data = Buffer.from(buf.subarray(at + 4, at + 4 + len)).map((b, k) => b ^ mask[k % 4]);
        const op = buf[0] & 15;
        buf = buf.subarray(at + 4 + len);
        if (op === 8) { sock.end(); return; }
        if (op === 1) { const msg = JSON.parse(data.toString()); reply(sock, { id: msg.id, result: answer(msg) }); }
      }
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, s, port: server.address().port })));
}

const op = (port) => new Promise((r) => execFile(process.execPath, [new URL('./lib/cdp-run.mjs', import.meta.url).pathname, JSON.stringify({ port, op: 'viewport', w: 1600, h: 945 })], { timeout: 30000 }, (e, out, err) => r({ code: e ? e.code ?? 1 : 0, err: String(err) })));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bad = [];

// Both at once: the one it cannot reach takes its full 4.5 s.
await Promise.all([
  (async () => {
    const { server, s, port } = await standIn({ lagMs: 400 });
    const r = await op(port);
    await wait(500); // a set still on its way shows up here
    if (r.code !== 0 || s.inner.join('x') !== '1600x945') bad.push(`a window whose inner size follows 400 ms late: want exit 0 at 1600x945, got exit ${r.code} at ${s.inner.join('x')} ${r.err.trim()}`);
    server.close();
  })(),
  (async () => {
    const { server, port } = await standIn({ held: [1600, 1231] });
    const r = await op(port);
    if (r.code === 0 || !/wanted 1600x945, got 1600x1231/.test(r.err)) bad.push(`a size it cannot reach: want it to fail with "wanted 1600x945, got 1600x1231", got exit ${r.code} ${r.err.trim()}`);
    server.close();
  })(),
]);

if (bad.length) { console.error(`check-viewport: ${bad.length} failed\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log('check-viewport: the viewport op reaches a late window size, and fails loudly on one it cannot reach');
process.exit(0);
