// X4: hold the same drags as parity/findings/NEAR.json in our editor and compare which blocks
// carry data-is-near-dragged-block. Writes parity/near-check.json. Usage: npm run near-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/NEAR.json', import.meta.url)));
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html?replay`); await pause(2200);
let pass = 0, total = 0;
const results = [];
for (const run of F.runs) {
  const [dc, dr] = run.by;
  const flags = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const s = fe.model.sections[${F.section}]; fe.select(s.id, ${JSON.stringify(F.dragged)});
    const b = d.querySelector('.fe-block[data-block-id="${F.dragged}"]');
    const m = fe.measure(s.id); const col = m.colStart[2] - m.colStart[1];
    { const q0 = b.getBoundingClientRect(); W.scrollTo(0, W.scrollY + q0.top - 150); await sleep(200); }
    const q = b.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 }));
    for (let k = 1; k <= 12; k++) { d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + ${dc} * col * k / 12, clientY: y + ${dr} * m.pitch * k / 12, buttons: 1 })); await sleep(25); }
    await sleep(200);
    const out = Object.fromEntries([...d.querySelectorAll('.fe-block')].filter((e) => s.blocks.some((x) => x.id === e.dataset.blockId)).map((e) => [e.dataset.blockId, e.dataset.isNearDraggedBlock === 'true']));
    d.dispatchEvent(new W.PointerEvent('pointercancel', { ...o, buttons: 0 }));
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100); while (fe.canUndo) fe.undo();
    return JSON.stringify(out); })()`);
  for (const other of run.others) {
    total++;
    const ok = flags[other.id] === other.near;
    if (ok) pass++;
    results.push({ by: run.by, id: other.id, oracle: other.near, ours: flags[other.id], ok });
    if (!ok) console.log(`DIFF by ${dc},${dr} ${other.id.slice(-5)} gap c${other.colGap} r${other.rowGap}: oracle ${other.near}, ours ${flags[other.id]}`);
  }
  total++;
  const selfOk = flags[F.dragged] === false;
  if (selfOk) pass++; else console.log(`DIFF by ${dc},${dr}: the dragged block is flagged near`);
}
console.log(`Near flags: ${pass} of ${total} match`);
writeFileSync(new URL('../parity/near-check.json', import.meta.url), JSON.stringify({ check: 'data-is-near-dragged-block', pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
