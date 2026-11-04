// G4: walk a held drag and resize in our editor 1px at a time, as parity/findings/SNAP.json did on
// the oracle, and compare the px where the target changes and what it changes to, within 1px.
// Writes parity/snap-check.json. Usage: npm run snap-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/SNAP.json', import.meta.url)));
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html?replay`); await pause(2200);
const LEGS = [['xOut', 'x', 0, 'x+'], ['xBack', 'x', null, 'x-'], ['xHome', 'x', null, 'x0'], ['yOut', 'y', 0, 'y+'], ['yBack', 'y', null, 'y-'], ['yHome', 'y', null, 'y0']];
let pass = 0, total = 0;
const results = [];
for (const r of F.readings) {
  const mx = r.mx, my = r.my;
  const got = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const s = fe.model.sections[${r.section}];
    const bid = [...d.querySelectorAll('section[data-section-id="' + s.id + '"] .fe-block')].map((e) => e.dataset.blockId)[${r.block}];
    const b = d.querySelector('.fe-block[data-block-id="' + bid + '"]');
    W.scrollTo({ top: W.scrollY + b.getBoundingClientRect().top - 300, behavior: 'instant' }); await sleep(100);
    fe.select(s.id, bid); await sleep(100);
    const el = ${r.kind === 'move' ? 'b' : `d.querySelector('.fe-handle[data-dir="${r.kind}"]')`};
    const q = el.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: cx, clientY: cy, buttons: 1 }));
    const read = () => { const e = d.querySelector('.fe-transform-indicator'); return e ? W.getComputedStyle(e).gridArea : null; };
    const move = (x, y) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: y, buttons: 1 }));
    move(cx + 14, cy); await sleep(20); move(cx, cy); await sleep(20);
    const walk = async (axis, from, to) => { const seen = []; let last = read(); const step = from < to ? 1 : -1; for (let v = from; v !== to + step; v += step) { move(axis === 'x' ? cx + v : cx, axis === 'y' ? cy + v : cy); await sleep(4); const a = read(); if (a !== last) seen.push([v, a]); last = a; } return seen; };
    const out = {};
    out.xOut = await walk('x', 0, ${mx}); out.xBack = await walk('x', ${mx}, -${mx}); out.xHome = await walk('x', -${mx}, 0);
    out.yOut = await walk('y', 0, ${my}); out.yBack = await walk('y', ${my}, -${my}); out.yHome = await walk('y', -${my}, 0);
    d.dispatchEvent(new W.PointerEvent('pointercancel', { ...o, buttons: 0 }));
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100); while (fe.canUndo) fe.undo();
    return JSON.stringify(out); })()`);
  for (const [leg] of LEGS) {
    // The oracle's first step of a walk can note the target appearing; only moves between areas count.
    const want = r[leg].filter(([, a], k) => k > 0 || a !== r.start.join(' / ')), have = got[leg].filter(([, a], k) => k > 0 || a !== r.start.join(' / '));
    total++;
    const ok = want.length === have.length && want.every(([v, a], k) => Math.abs(v - have[k][0]) <= 1 && a === have[k][1]);
    if (ok) pass++; else console.log(`DIFF ${r.kind} section ${r.section} block ${r.block} ${leg}: oracle ${JSON.stringify(want)} ours ${JSON.stringify(have)}`);
    results.push({ kind: r.kind, section: r.section, block: r.block, leg, ok });
  }
}
console.log(`Snap points: ${pass} of ${total} walks match`);
writeFileSync(new URL('../parity/snap-check.json', import.meta.url), JSON.stringify({ check: 'where a held drag or resize takes the next line', tolerance: 1, pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
