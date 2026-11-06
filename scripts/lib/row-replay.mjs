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
const ours = (S, top) => evalJs(S, `(() => { const g = document.querySelector('.lp-ghost'); return JSON.stringify([document.getElementById('layers-panel').hidden ? [] : [...document.querySelectorAll('#layers-panel li[data-layer]')].map((r) => (r.classList.contains('is-slot') ? '*' : r.textContent.trim())), g ? g.getBoundingClientRect().top - ${top} : null]); })()`);

// Frames: for each row, the slot and a ghost, how it got from its first top to its last: 'still', 'jump' in one
// frame, or 'slide' with how long it took.
const FRAME_NAMES = ['Line', 'Button', 'Shape'];
const SAMPLE = `(() => { const N = ${JSON.stringify(FRAME_NAMES)}; const out = window.__fxFrames = []; const t0 = performance.now(); const tick = () => { const slot = [...document.querySelectorAll('*')].find((e) => getComputedStyle(e).backgroundColor === 'rgb(72, 148, 255)' && e.getBoundingClientRect().width > 100); out.push([Math.round(performance.now() - t0), slot ? Math.round(slot.getBoundingClientRect().top * 10) / 10 : null, [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && N.includes(e.textContent.trim()) && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map((e) => [e.textContent.trim(), Math.round(e.getBoundingClientRect().top * 10) / 10])]); if (performance.now() - t0 < 600) requestAnimationFrame(tick); }; requestAnimationFrame(tick); return 1; })()`;
function howItMoved(frames, held) {
  const series = { slot: frames.map((f) => [f[0], f[1]]) };
  for (const n of FRAME_NAMES) if (n !== held) series[n] = frames.map((f) => [f[0], f[2].find((t) => t[0] === n)?.[1] ?? null]);
  // The ghost is the last text with the held row's name, once the slot has gone it can be on top of the row.
  series.ghost = frames.map((f) => [f[0], f[2].filter((t) => t[0] === held).at(-1)?.[1] ?? null]);
  const out = {};
  for (const [name, list] of Object.entries(series)) {
    const seen = list.filter(([, y]) => y !== null);
    const steps = seen.filter(([, y], k) => k && y !== seen[k - 1][1]);
    // The ghost's own 1px step to the last place isn't a move of its own.
    const big = steps.length === 1 ? (Math.abs(steps[0][1] - seen[seen.findIndex((x) => x === steps[0]) - 1][1]) <= 1 ? [] : steps) : steps;
    out[name] = !big.length ? 'still' : big.length === 1 ? 'jump' : `slide ${big.at(-1)[0] - big[0][0]}`;
  }
  return out;
}
const closeTo = (a, b) => { const [p, q] = [a, b].map((x) => x.split(' ')); return p[0] === q[0] && (p[0] !== 'slide' || Math.abs(p[1] - q[1]) <= 60); };

async function frames(S, label, dy, pre, drop) {
  const [cx, cy] = place(S, label);
  mouse(S, 'move', cx, cy); mouse(S, 'down', cx, cy, { buttons: 1 }); await pause(40);
  let y = 0;
  const to = (v) => { while (y !== v) { y += Math.sign(v - y); mouse(S, 'move', cx, cy + y, { buttons: 1 }); } };
  for (const v of pre) to(v);
  to(dy - (drop ? 0 : Math.sign(dy - y)));
  await pause(400);
  evalJs(S, SAMPLE);
  if (drop) mouse(S, 'up', cx, cy + y); else to(dy);
  await pause(800);
  const got = evalJs(S, `JSON.stringify(window.__fxFrames)`);
  if (!drop) { to(0); await pause(100); mouse(S, 'up', cx, cy); await pause(100); }
  return got;
}

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

const pressEscape = (S) => browser(S, 'press', 'Escape');
const openLayers = (S) => evalJs(S, `(() => { const s = fe.model.sections[1]; fe.select(s.id, s.blocks[0].id); document.querySelector('button[data-sc="layers"]').click(); return 1; })()`);
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
      const r = finding.reads[name];
      // A step the finding has in its errors never ran.
      if (!r && Object.keys(finding.reads).length) continue;
      const got = await walk(S, label, op === 'rowWalk' ? [[a[2], 0], [a[2], a[3]]] : a[2], drop);
      if (!r) { add(name, undefined, got); continue; }
      const pressed = r.seen[0][1];
      let next = 1, want = oracleFrame(pressed, label, pressed), bad = '';
      for (const [key, have] of got) {
        // Each px holds what the oracle last changed to.
        if (r.seen[next]?.[0].join() === key) want = oracleFrame(r.seen[next++][1], label, pressed);
        // Rows on their way make more than one gap in the oracle's frame: only the ghost says anything there.
        const moving = want[0].filter((x) => x === '*').length > 1;
        if (want[1] !== have[1] || (!moving && JSON.stringify(want[0]) !== JSON.stringify(have[0]))) { bad = `at ${key}: oracle ${JSON.stringify(want)}, ours ${JSON.stringify(have)}`; break; }
      }
      const shown = evalJs(S, `JSON.stringify(document.getElementById('layers-panel').hidden ? [] : [...document.querySelectorAll('#layers-panel li[data-layer]')].map((e) => e.textContent.trim()))`);
      const after = [...r.after.texts].sort((p, q) => p[2] - q[2]).map((t) => t[0]);
      if (!bad && JSON.stringify(shown) !== JSON.stringify(after)) bad = `after: oracle ${after}, ours ${shown}`;
      add(name, !bad, bad);
    } else if (op === 'rowFrames') {
      const [label, , dy, name, pre = [], drop = false] = a, r = finding.reads[name];
      if (!r && Object.keys(finding.reads).length) continue;
      const have = howItMoved(await frames(S, label, dy, pre, drop), label);
      if (!r) { add(name, undefined, JSON.stringify(have)); continue; }
      const want = howItMoved(r.frames, label);
      const bad = Object.keys(want).filter((k) => !closeTo(want[k], have[k]));
      add(name, !bad.length, `oracle ${JSON.stringify(want)}, ours ${JSON.stringify(have)}`);
    } else if (op === 'press' && a[0] === 'Escape') { pressEscape(S);
    } else if (op === 'click' && a[0] === 'Open Layers Panel') { openLayers(S); await pause(200);
    } else if (op === 'read' && finding.reads[a[0]]?.zs) {
      add(a[0], JSON.stringify(zs()) === JSON.stringify(finding.reads[a[0]].zs), `oracle ${finding.reads[a[0]].zs}, ours ${zs()}`);
    } else if (op === 'read' && !finding.reads[a[0]] && a[1]?.zs) add(a[0], undefined, zs());
  }
}
