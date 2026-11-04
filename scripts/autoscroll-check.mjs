// G7: repeat each hold from parity/findings/AUTOSCROLL.json in our editor (same block, same
// distance from the window edge, 1.2s) and compare the total scroll. Tolerance: one 10px
// step, the spread the oracle itself shows between neighbouring distances.
// Writes parity/autoscroll-check.json. Usage: npm run autoscroll-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/AUTOSCROLL.json', import.meta.url)));
const [fw, fh] = F.frame;
ensureVisible(S);
viewport(S, fw, fh + 55);
goto(S, `${BASE}/index.html?replay`); await pause(2200);
const results = [];
for (const [name, want] of Object.entries(F.totals)) {
  const [edge, dist] = [name.split(' ')[0], Number(name.split(' ')[1])];
  const r = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const s = fe.model.sections[2]; const id = s.blocks[2].id; fe.select(s.id, id);
    const b = d.querySelector('.fe-block[data-block-id="' + id + '"]');
    { const q0 = b.getBoundingClientRect(); W.scrollTo(0, W.scrollY + q0.top + q0.height / 2 - W.innerHeight / 2); await sleep(300); }
    const q = b.getBoundingClientRect(); const x = q.left + q.width / 2, y0 = q.top + q.height / 2;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    const at = (t, cx, cy, buttons) => (t === 'down' ? b : d).dispatchEvent(new W.PointerEvent('pointer' + t, { ...o, clientX: cx, clientY: cy, buttons }));
    const s0 = W.scrollY;
    at('down', x, y0, 1);
    for (let k = 1; k <= 4; k++) { at('move', x, y0 + k * 5, 1); await sleep(25); }
    const y = ${edge === 'bottom' ? `W.innerHeight - ${dist}` : dist};
    for (let k = 1; k <= 8; k++) { at('move', x, y0 + 20 + (y - y0 - 20) * k / 8, 1); await sleep(20); }
    const t0 = performance.now();
    while (performance.now() - t0 < 1200) { await sleep(50); at('move', x, y, 1); }
    const got = W.scrollY - s0;
    at('move', x, W.innerHeight / 2, 1); await sleep(150); at('up', x, W.innerHeight / 2, 0);
    while (fe.canUndo) fe.undo();
    return JSON.stringify({ got: Math.round(got), h: W.innerHeight }); })()`);
  await pause(300);
  const ok = Math.abs(r.got - want) <= 10;
  results.push({ name, want, got: r.got, ok });
  console.log(name.padEnd(11), `oracle ${want}`.padEnd(11), `ours ${r.got}`.padEnd(9), ok ? 'match' : 'DIFF', r.h !== fh ? `(frame height ${r.h}, oracle ${fh})` : '');
}
const pass = results.filter((r) => r.ok).length;
console.log(`Auto-scroll: ${pass} of ${results.length} holds within 10px`);
writeFileSync(new URL('../parity/autoscroll-check.json', import.meta.url), JSON.stringify({ check: 'auto-scroll totals', tolerance: 10, pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
