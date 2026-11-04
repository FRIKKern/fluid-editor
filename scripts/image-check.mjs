// T4: press Fit, Fill and Shape in our image block's Edit > Design tab and compare where the
// picture sits with the rule measured on the oracle (parity/findings/IMAGEMODES.json), within
// 1px, and that the block keeps its size. Our block has its own size, so the rule is applied to each side's block: it is first
// checked on the oracle's numbers, then on ours. Also checks the pressed button and undo.
// Writes parity/image-check.json. Usage: npm run image-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEMODES.json', import.meta.url)));
const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1);
// Where a picture of aspect a sits in a block W by H: as large as fits, centred. [left, top, width, height].
const contain = (W, H, a) => { const w = Math.min(W, H * a); const h = w / a; return [(W - w) / 2, (H - h) / 2, w, h]; };
const RULE = {
  Fit: (W, H, a = F.aspect) => contain(W, H, a),
  Fill: (W, H) => [0, 0, W, H],
  Shape: (W, H) => contain(W, H, 1),
};

let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(28)} ${ok ? 'match' : `DIFF ${detail}`}`); };

for (const [mode, rule] of Object.entries(RULE)) {
  const o = F[mode];
  add(`${mode} rule on the oracle`, near(o.container, rule(o.block[2], o.block[3])), `oracle ${o.container}, rule ${rule(o.block[2], o.block[3])}`);
}

// The shape and Fit images found on the oracle's pages, wide and tall blocks alike. A sample the
// finding marks unexplained is not counted.
for (const x of F.samples.filter((y) => !y.unexplained)) add(`sample ${x.block.join('x')}`, near(x.box, contain(x.block[0], x.block[1], x.aspect)), `oracle ${x.box}, rule ${contain(x.block[0], x.block[1], x.aspect)}`);

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, 'http://127.0.0.1:5178/index.html'); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, 'http://127.0.0.1:5178/index.html'); await pause(2000);

// Turn the first plain block of section 1 into an image; the panel needs one to act on.
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const b = s.blocks.find((x) => x.type === 'text'); const keep = { id: b.id, layout: b.layout }; for (const k of Object.keys(b)) delete b[k]; Object.assign(b, keep, { type: 'image', alt: '', aspect: ${F.aspect} }); fe.load(next); await sleep(400); fe.select(s.id, b.id); await sleep(200); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(250); return JSON.stringify(b.id); })()`);
const press = (mode) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const d = document.getElementById('site-frame').contentDocument; const btn = document.querySelector('#block-panel button[aria-label="${mode}"]'); if (!btn) return JSON.stringify(null); btn.click(); await sleep(300);
  const fb = d.querySelector('.fe-block[data-block-id="${id}"]'); const q = fb.getBoundingClientRect(); const c = fb.querySelector('.fluid-image-container').getBoundingClientRect();
  return JSON.stringify({ block: [q.width, q.height], box: [c.left - q.left, c.top - q.top, c.width, c.height], on: [...document.querySelectorAll('#block-panel [data-image-mode]')].filter((x) => x.getAttribute('aria-checked') === 'true').map((x) => x.getAttribute('aria-label')), clip: d.defaultView.getComputedStyle(fb.querySelector('.fluid-image-container')).clipPath }); })()`);

const start = press('Fill');
for (const mode of ['Fit', 'Shape', 'Fill']) {
  const r = press(mode);
  if (!r) { add(`${mode} button`, false, 'no button in the panel'); continue; }
  const want = RULE[mode](r.block[0], r.block[1]);
  add(`${mode} box`, near(r.box, want), `ours ${r.box.map((v) => v.toFixed(1))}, rule ${want.map((v) => v.toFixed(1))}`);
  add(`${mode} keeps the block size`, near(r.block, start.block), `block ${r.block}, was ${start.block}`);
  add(`${mode} pressed`, r.on.length === 1 && r.on[0] === mode, `pressed ${r.on}`);
  add(`${mode} clip`, (mode === 'Shape') === (r.clip !== 'none'), `clip ${r.clip}`);
}

// Fill is the default, so pressing Fit once and undoing must bring Fill back in one step.
press('Fit');
const undone = evalJs(S, `(async () => { const before = JSON.stringify(fe.model); document.getElementById('undo')?.click(); await new Promise((res) => setTimeout(res, 300)); const b = fe.model.sections[1].blocks.find((x) => x.id === ${JSON.stringify(id)}); return JSON.stringify({ changed: before !== JSON.stringify(fe.model), mode: b.mode || 'fill' }); })()`);
add('Undo is one step', undone.changed && undone.mode === 'fill', JSON.stringify(undone));

console.log(`Image modes: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/image-check.json', import.meta.url), JSON.stringify({ check: 'image Fit, Fill and Shape', tolerance: 1, pass, total, results }, null, 2) + '\n');
if (!total || pass !== total) process.exitCode = 1;
