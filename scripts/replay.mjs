// H7 and Gate C: replay every trace in our editor through cmux and compare the
// end state with the oracle's. Writes parity/gate-c.json.
// Usage: node scripts/replay.mjs [--surface surface:42] [--url http://127.0.0.1:5178/index.html?replay] [trace ids…]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { evalJs, waitFor, goto, viewport, resetViewport, pause } from './lib/cmux.mjs';
import { diffStates } from './lib/trace.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const surface = arg('surface', 'surface:42');
const url = arg('url', 'http://127.0.0.1:5178/index.html?replay');
const only = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const dir = new URL('../traces/', import.meta.url);
const traces = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter((t) => !only.length || only.includes(t.id));

// Our model for one trace: the oracle's blocks and areas, with text content kept and
// every other block drawn as a plain shape. Fonts and type sizes are ours (item P6).
function modelFor(t) {
  const blocks = Object.entries(t.before.blocks).map(([id, s]) => {
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

const SELECT = (id) => `(() => {
  const f = document.getElementById('site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  const b = d.querySelector('.fe-block[data-block-id="${id}"]');
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true };
  b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 }));
  d.documentElement.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 }));
  return JSON.stringify(true);
})()`;

const KEY = (key) => `(() => {
  const f = document.getElementById('site-frame');
  f.contentDocument.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: '${key}', bubbles: true, cancelable: true }));
  return JSON.stringify(true);
})()`;

const results = [];
for (const t of traces) {
  viewport(surface, t.oracle.frameWidth, 1000);
  goto(surface, url);
  waitFor(surface, `(() => !!(window.fe && document.getElementById('site-frame').clientWidth === ${t.oracle.frameWidth}))()`, 20);
  evalJs(surface, `JSON.stringify(fe.load(${JSON.stringify(modelFor(t))}))`);
  if (t.layout !== 'desktop') evalJs(surface, `(() => { fe.setBp('${t.layout}'); return 'true'; })()`);
  await pause(300);
  evalJs(surface, SELECT(t.gesture.target));
  for (const k of t.gesture.keys || []) {
    evalJs(surface, KEY(k));
    await pause(200);
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
