// The dev server for app/: static files with Cache-Control: no-store, so a cmux WebKit tab
// never runs modules older than the checkout (python's http.server let WebKit cache them,
// and an inventory run on 2026-11-04 measured old code until the cache was refreshed).
// Usage: node scripts/serve.mjs [port]   (default 5178, bound to 127.0.0.1)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../app/', import.meta.url));
const port = Number(process.argv[2] || 5178);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Cache-Control': 'no-store' }).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`serving app/ on http://127.0.0.1:${port} (no-store)`));
