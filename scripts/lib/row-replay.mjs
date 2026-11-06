// Z3: replays a finding's rowWalk and rowPath steps in our Layers panel with the real mouse and compares
// each px: where the row would land, the other rows' order, and how far the ghost has moved. The oracle's
// blue slot takes a moment to arrive, so its place is read from the rows that made way.
import { evalJs, goto, pause, mouse, browser, viewport } from './cmux.mjs';
import { BASE } from './base.mjs';

// A frame of the oracle's seen list: [rows top to bottom, * for the slot; the ghost's y from where it was
// pressed]. Before the drag starts: [rows, null].
function oracleFrame(frame, label, pressed) {
  if (!frame.slots.length) return [[...frame.texts].sort((a, b) => a[2] - b[2]).map((t) => t[0]), null];
  const others = frame.texts.filter((t) => t[0] !== label);
  const rows = pressed.texts.map((t) => t[2]).sort((a, b) => a - b).map((y) => others.find((t) => t[2] === y)?.[0] ?? '*');
  return [rows, frame.texts.find((t) => t[0] === label)[2] - pressed.texts.find((t) => t[0] === label)[2]];
}
const ROW = (label) => `[...document.querySelectorAll('#layers-panel li[data-layer]')].find((r) => r.textContent.trim() === ${JSON.stringify(label)})`;
const place = (S, label) => evalJs(S, `(() => { const q = ${ROW(label)}.getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2, q.top]); })()`);
const ours = (S, top) => evalJs(S, `(() => { const g = document.querySelector('.lp-ghost'); return JSON.stringify([[...document.querySelectorAll('#layers-panel li[data-layer]')].map((r) => (r.classList.contains('is-slot') ? '*' : r.textContent.trim())), g ? g.getBoundingClientRect().top - ${top} : null]); })()`);

async function walk(S, label, path, drop) {
  const [cx, cy, top] = place(S, label);
  mouse(S, 'move', cx, cy); mouse(S, 'down', cx, cy, { buttons: 1 }); await pause(40);
  const out = []; let x = 0, y = 0;
  const go = () => { mouse(S, 'move', cx + x, cy + y, { buttons: 1 }); out.push([`${x},${y}`, ours(S, top)]); };
  for (const p of path) {
    if (p[0] === 'esc') { browser(S, 'press', 'Escape'); await pause(100); out.push([`esc,${x},${y}`, ours(S, top)]); continue; }
    if (p[2] === 'jump') { [x, y] = p; go(); await pause(100); out.push([`${x},${y},settled`, ours(S, top)]); continue; }
    while (x !== p[0]) { x += Math.sign(p[0] - x); go(); }
    while (y !== p[1]) { y += Math.sign(p[1] - y); go(); }
  }
  if (drop) { mouse(S, 'up', cx + x, cy + y); await pause(100); } else { mouse(S, 'move', cx, cy, { buttons: 1 }); await pause(30); mouse(S, 'up', cx, cy); await pause(100); }
  return out;
}

// add(name, ok, detail). With no reads, as for predictions, ok is undefined and detail is what ours did.
export async function rowReplay(S, finding, add) {
  viewport(S, 1600, 945);
  goto(S, `${BASE}/index.html`); await pause(1200);
  evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks = []; next.sections[1].rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((r) => setTimeout(r, 300)); const s = fe.model.sections[1].id; for (const t of ['Line', 'Button', 'Shape']) fe.addBlock(s, t); const id = fe.model.sections[1].blocks[0].id; document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="' + id + '"]').scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 150)); fe.select(s, id); document.querySelector('button[data-sc="layers"]').click(); await new Promise((r) => setTimeout(r, 200)); return 1; })()`);
  // The oracle's zs are in its DOM order, the last added first.
  const zs = () => evalJs(S, `JSON.stringify(['shape', 'button', 'line'].map((t) => String(fe.model.sections[1].blocks.find((b) => b.type === t).layout.desktop.z)))`);
  for (const [op, ...a] of finding.steps) {
    if (op === 'rowWalk' || op === 'rowPath') {
      const [label] = a, name = op === 'rowWalk' ? a[4] : a[3], drop = (op === 'rowWalk' ? a[5] : a[4]) ?? true;
      const got = await walk(S, label, op === 'rowWalk' ? [[a[2], 0], [a[2], a[3]]] : a[2], drop);
      const r = finding.reads[name];
      if (!r) { add(name, undefined, got); continue; }
      const pressed = r.seen[0][1];
      let next = 1, want = oracleFrame(pressed, label, pressed), bad = '';
      for (const [key, have] of got) {
        // Each px holds what the oracle last changed to.
        if (r.seen[next]?.[0].join() === key) want = oracleFrame(r.seen[next++][1], label, pressed);
        if (JSON.stringify(want) !== JSON.stringify(have)) { bad = `at ${key}: oracle ${JSON.stringify(want)}, ours ${JSON.stringify(have)}`; break; }
      }
      add(name, !bad, bad);
    } else if (op === 'read' && finding.reads[a[0]]?.zs) {
      add(a[0], JSON.stringify(zs()) === JSON.stringify(finding.reads[a[0]].zs), `oracle ${finding.reads[a[0]].zs}, ours ${zs()}`);
    } else if (op === 'read' && !finding.reads[a[0]] && a[1]?.zs) add(a[0], undefined, zs());
  }
}
