// H7 and Gate C: replay every trace in our editor through cmux and compare the
// end state with the oracle's. Writes parity/gate-c.json.
// Usage: node scripts/replay.mjs [--surface surface:42] [--url http://127.0.0.1:5178/index.html?replay] [trace ids…]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { evalJs, waitFor, goto, viewport, resetViewport, pause } from './lib/cmux.mjs';
import { ensureVisible } from './lib/cmux.mjs';
import { diffStates } from './lib/trace.mjs';
import { DEMO } from '../app/src/demo-data.js';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const surface = arg('surface', process.env.FLUID_SURFACE || 'surface:59');
const url = arg('url', 'http://127.0.0.1:5178/index.html?replay');
const only = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const dir = new URL('../traces/', import.meta.url);
const traces = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter((t) => !only.length || only.includes(t.id));

// Our model for one trace: the oracle's blocks and areas, with text content kept and
// every other block drawn as a plain shape. Fonts and type sizes are ours (item P6).
const published = {};
for (const sec of DEMO.sections) for (const b of sec.blocks) published[b.id] = b;

function modelFor(t) {
  const blocks = Object.entries(t.before.blocks).map(([id, s]) => {
    // Prefer the published content of the same block (clean HTML, real labels).
    const p = published[id];
    if (p) {
      const L = { area: s.area, z: s.z, justify: p.layout.desktop.justify || 'flex-start', align: p.layout.desktop.align || 'flex-start' };
      const { layout, ...content } = p;
      return { ...content, layout: { desktop: L, mobile: L } };
    }
    const c = t.content[id] || { type: 'shape' };
    const L = { area: s.area, z: s.z, justify: 'flex-start', align: 'flex-start' };
    const base = c.type === 'text' ? { type: 'text', html: c.html } : { type: 'shape', fill: '#d9d4ca', radius: '0', label: c.type };
    return { id, ...base, layout: { desktop: L, mobile: L } };
  });
  const rows = { desktop: t.before.rows, mobile: t.before.rows };
  return { version: 1, title: t.id, sections: [{ id: t.section.id, theme: '', gap: t.section.gap, rowGap: t.section.rowGap, rows, blocks }] };
}

const READ = (sid) => `(() => {
  const s = fe.model.sections.find((x) => x.id === '${sid}');
  const blocks = {};
  for (const b of s.blocks) blocks[b.id] = { area: b.layout[fe.bp].area, z: b.layout[fe.bp].z };
  return JSON.stringify({ rows: s.rows[fe.bp], blocks });
})()`;

// A trace with a recorded view puts the target at the same height in the canvas window as on
// the oracle; older traces center it.
const SELECT = (id, shift = false, view = null) => `(() => {
  const f = document.getElementById('site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  const b = d.querySelector('.fe-block[data-block-id="${id}"]');
  ${view === 'keep' ? '' : view ? `W.scrollTo(0, W.scrollY + b.getBoundingClientRect().top - ${view.blockTop});` : `b.scrollIntoView({ block: 'center' });`}
  const r = b.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true, shiftKey: ${shift} };
  b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 }));
  d.documentElement.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 }));
  return JSON.stringify(true);
})()`;

// A drag of the block, or of one of our resize handles, by whole or fractional grid units.
const POINTER = (sid, g) => `(async () => {
  const f = document.getElementById('site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  const m = fe.measure('${sid}');
  const colPitch = m.colStart[2] - m.colStart[1];
  const dx = ${g.by?.cols || 0} * colPitch, dy = ${g.by?.rows || 0} * m.pitch;
  const b = d.querySelector('.fe-block[data-block-id="${g.target}"]');
  const el = ${g.kind === 'resize' ? `d.querySelector('.fe-handle[data-dir="${g.handle}"]')` : 'b'};
  if (!el) return JSON.stringify('no element');
  const q = el.getBoundingClientRect();
  const fx = ${g.kind === 'resize' ? 0.5 : (g.grab?.[0] ?? 0.5)}, fy = ${g.kind === 'resize' ? 0.5 : (g.grab?.[1] ?? 0.5)};
  const x = q.left + q.width * fx, y = q.top + q.height * fy;
  const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, shiftKey: ${!!g.shift}, altKey: ${!!g.alt} };
  el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: x, clientY: y, buttons: 1 }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // The recorder's timing (scripts/oracle/ui.mjs hold): 12 moves 25ms apart, then the pointer
  // stays put for at least 500ms before release, long enough for auto-scroll to finish (G7).
  for (let k = 1; k <= 12; k++) { d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x + dx * k / 12, clientY: y + dy * k / 12, buttons: 1 })); await sleep(25); }
  await sleep(700);
  d.dispatchEvent(new W.PointerEvent('pointerup', { ...o, clientX: x + dx, clientY: y + dy, buttons: 0 }));
  return JSON.stringify(true);
})()`;

const KEY = (key) => `(() => {
  const f = document.getElementById('site-frame');
  f.contentDocument.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: '${key}', bubbles: true, cancelable: true }));
  return JSON.stringify(true);
})()`;

if (ensureVisible(surface)) console.log(`${surface} was hidden; moved it to its own pane`);
const results = [];
for (const t of traces) {
  ensureVisible(surface);
  viewport(surface, t.oracle.frameWidth, 1000);
  goto(surface, url);
  waitFor(surface, `(() => !!window.fe)()`, 20);
  // Viewport emulation in a small pane can land a pixel off; nudge until exact.
  for (let k = 0, w = t.oracle.frameWidth; k < 4; k++) {
    const got = evalJs(surface, `(() => JSON.stringify(document.getElementById('site-frame').clientWidth))()`);
    if (got === t.oracle.frameWidth) break;
    w += t.oracle.frameWidth - got;
    viewport(surface, w, 1000);
    await pause(400);
  }
  waitFor(surface, `(() => document.getElementById('site-frame').clientWidth === ${t.oracle.frameWidth})()`, 10);
  evalJs(surface, `JSON.stringify(fe.load(${JSON.stringify(modelFor(t))}))`);
  // A trace with a recorded view needs room to scroll the target to its recorded height.
  if (t.view) evalJs(surface, `(() => { document.getElementById('site-frame').contentDocument.body.style.padding = '1000px 0'; return 'true'; })()`);
  if (t.layout !== 'desktop') evalJs(surface, `(() => { fe.setBp('${t.layout}'); return 'true'; })()`);
  // Text height decides row stretch, so wait until the canvas has its fonts.
  const fonts = evalJs(surface, `(async () => { const d = document.getElementById('site-frame').contentDocument; await d.fonts.ready; await d.fonts.load('400 16px Poppins'); await d.fonts.load('500 16px Poppins'); await new Promise((r) => setTimeout(r, 300)); return JSON.stringify(d.fonts.check('400 16px Poppins')); })()`);
  if (fonts !== true) throw new Error('Poppins did not load in the editor canvas');
  const g = t.gesture;
  evalJs(surface, SELECT(g.target, false, t.view));
  if (only.length) console.log('  start', evalJs(surface, `(() => { const f = document.getElementById('site-frame'); const b = f.contentDocument.querySelector('.fe-block[data-block-id="${g.target}"]'); return JSON.stringify({ top: Math.round(b.getBoundingClientRect().top * 10) / 10, h: f.contentWindow.innerHeight, scrollY: f.contentWindow.scrollY }); })()`));
  // Shift-added blocks are selected where they are, so the target keeps its recorded place.
  for (const id of g.also || []) evalJs(surface, SELECT(id, true, t.view ? 'keep' : null));
  if (g.kind === 'key') {
    for (const k of g.keys || []) {
      evalJs(surface, KEY(k));
      await pause(200);
    }
  } else if (g.kind === 'drag' || g.kind === 'resize') {
    evalJs(surface, POINTER(t.section.id, g));
    await pause(400);
  } else if (g.kind === 'button') {
    // Our panel names: Bring forward (z+) and Send backward (z-).
    const map = { 'Move Forward': '[data-act="z+"]', 'Move Backward': '[data-act="z-"]', 'Move Up': '[data-act="up"]', 'Move Down': '[data-act="down"]',
      'Align Group>Align Left': '[data-act="align"][data-v="left"]', 'Align Group>Align Right': '[data-act="align"][data-v="right"]',
      'Align Group>Align Horizontal Center': '[data-act="align"][data-v="hcenter"]', 'Align Group>Align Top': '[data-act="align"][data-v="top"]',
      'Align Group>Align Vertical Center': '[data-act="align"][data-v="vcenter"]', 'Align Group>Align Bottom': '[data-act="align"][data-v="bottom"]' };
    const sel = map[g.button];
    if (!sel) throw new Error(`no button in our editor for "${g.button}"`);
    evalJs(surface, `(() => { document.querySelector('#panel button${sel}').click(); return 'true'; })()`);
    await pause(300);
  }
  const after = evalJs(surface, READ(t.section.id));
  const diffs = diffStates(t.after, after);
  let undoDiffs = null;
  if (t.undo?.afterUndo) {
    evalJs(surface, `(() => { fe.undo(); return 'true'; })()`);
    await pause(200);
    undoDiffs = diffStates(t.undo.afterUndo, evalJs(surface, READ(t.section.id)));
  }
  results.push({ trace: t.id, pass: diffs.length === 0, diffs, undoPass: undoDiffs ? undoDiffs.length === 0 : null, undoDiffs: undoDiffs || [] });
  console.log(`${diffs.length ? 'FAIL' : 'pass'} ${t.id}${diffs.length ? '\n  ' + diffs.join('\n  ') : ''}`);
  if (undoDiffs) console.log(`  undo: ${undoDiffs.length ? 'FAIL\n    ' + undoDiffs.join('\n    ') : 'pass'}`);
}
resetViewport(surface);

const pass = results.filter((r) => r.pass).length;
console.log(`Gate C, trace replay: ${pass} of ${results.length} traces match`);
writeFileSync(new URL('../parity/gate-c.json', import.meta.url), JSON.stringify({ gate: 'C', pass, total: results.length, results }, null, 2) + '\n');
if (!results.length) {
  console.error('Gate C: no traces, nothing to replay');
  process.exitCode = 1;
}
