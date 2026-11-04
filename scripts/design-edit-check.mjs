// T15: set each value the DESIGN probe set on the oracle (parity/findings/DESIGN.json) in our
// editor's Edit > Design group, on the same block, and compare the computed styles the oracle
// changed: opacity, transform, backdrop filter, block background. Writes
// parity/design-edit-check.json. Usage: npm run design-edit-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, requireSameEngine } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/DESIGN.json', import.meta.url)));
requireSameEngine(S, 'design-edit-check', F);
const KEY = { Opacity: 'opacity', Rotate: 'rotate', '#9': 'sx', '#10': 'sy', '#11': 'tx', '#12': 'ty', '#13': 'kx', '#14': 'ky', Background: 'background', Blur: 'blur' };
ensureVisible(S);
viewport(S, 1600, 1000);
const [si, bi] = F.block;
let pass = 0, total = 0;
const results = [];
for (const [label, c] of Object.entries(F.changes)) {
  if (!c.diff) continue;
  goto(S, `${BASE}/index.html`); await pause(1200);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(2000);
  const k = KEY[label];
  const r = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const s = fe.model.sections[${si}]; const bid = [...d.querySelectorAll('section[data-section-id="' + s.id + '"] .fe-block')].map((e) => e.dataset.blockId)[${bi}];
    fe.select(s.id, bid); await sleep(150);
    document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(150);
    const input = document.querySelector('#block-panel input[data-design="${k}"]');
    if (input.type === 'checkbox') input.checked = true; else input.value = ${JSON.stringify(c.set)};
    input.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250);
    const el = d.querySelector('.fe-block[data-block-id="' + bid + '"]'); const cs = W.getComputedStyle(el);
    return JSON.stringify({ opacity: cs.opacity, transform: cs.transform, backdrop: cs.backdropFilter, bg: W.getComputedStyle(el.querySelector('.sqs-block')).backgroundColor }); })()`);
  const want = c.diff.find((x) => x.el === 'fe-block') || {};
  const wantBg = c.diff.find((x) => x.bg)?.bg;
  const checks = [];
  if (want.opacity) checks.push(['opacity', want.opacity, r.opacity]);
  if (want.transform) checks.push(['transform', want.transform, r.transform]);
  if (want.backdrop) checks.push(['backdrop', want.backdrop, r.backdrop]);
  if (wantBg) checks.push(['background', wantBg, r.bg]);
  for (const [what, a, b] of checks) {
    total++;
    const ok = a === b;
    if (ok) pass++;
    results.push({ label, what, oracle: a, ours: b, ok });
    console.log(`${label.padEnd(10)} ${what.padEnd(10)} ${ok ? 'match' : `DIFF oracle ${a} ours ${b}`}`);
  }
}
console.log(`Block design: ${pass} of ${total} styles match`);
writeFileSync(new URL('../parity/design-edit-check.json', import.meta.url), JSON.stringify({ check: 'block design in the editor', pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
