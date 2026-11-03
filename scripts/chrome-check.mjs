// U3, U4: compare our floating block toolbar and selection rings with the oracle's
// (parity/findings/TOOLBARGEO.json): for each measured block, scroll it to the same place in
// the canvas, select it, and compare the toolbar box, every button and separator box
// (relative to the block, within 1px), the button labels in order, and the ring colors.
// Our icons are drawn by us (O2), so the check compares boxes and colors, not pixels.
// Writes parity/chrome-check.json. Usage: npm run chrome-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/TOOLBARGEO.json', import.meta.url)));
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, 'http://127.0.0.1:5178/index.html?replay'); await pause(2500);
const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1);
let pass = 0, total = 0;
const results = [];
for (const [name, [si, bi]] of Object.entries(F.cases)) {
  const o = F[name];
  if (!o?.bar) continue;
  const r = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const s = fe.model.sections[${si}]; const id = s.blocks.map((b) => b.id)[${bi}];
    const sorted = [...d.querySelectorAll('section[data-section-id="' + s.id + '"] .fe-block')].map((e) => e.dataset.blockId);
    const bid = sorted[${bi}] || id;
    const el = d.querySelector('.fe-block[data-block-id="' + bid + '"]');
    W.scrollTo(0, W.scrollY + el.getBoundingClientRect().top - ${o.block[1]}); await new Promise((res) => setTimeout(res, 250));
    fe.select(s.id, bid); await new Promise((res) => setTimeout(res, 200));
    const fr = f.getBoundingClientRect(), bq = el.getBoundingClientRect();
    const rel = (q) => [q.left - fr.left - bq.left, q.top - fr.top - bq.top, q.width, q.height].map((v) => Math.round(v * 10) / 10);
    const tb = document.getElementById('block-toolbar');
    const ind = d.querySelector('.fe-indicator');
    return JSON.stringify({ block: [Math.round(bq.left), Math.round(bq.top)], frameTop: Math.round(fr.top), bar: rel(tb.getBoundingClientRect()), hidden: tb.hidden,
      buttons: [...tb.querySelectorAll('button')].map((x) => ({ label: x.getAttribute('aria-label'), box: rel(x.getBoundingClientRect()), color: getComputedStyle(x).color })),
      seps: [...tb.querySelectorAll('.tb-sep')].map((x) => rel(x.getBoundingClientRect())), rings: ind && W.getComputedStyle(ind).boxShadow }); })()`);
  const checks = [];
  const add = (what, ok, detail) => { total++; if (ok) pass++; checks.push({ what, ok }); if (!ok) console.log(`  ${name}: ${what} ${detail || ''}`); };
  add('frame top', r.frameTop === o.frameTop, `oracle ${o.frameTop} ours ${r.frameTop}`);
  add('block place', near(r.block, o.block.slice(0, 2)), `oracle ${o.block} ours ${r.block}`);
  add('toolbar box', near(r.bar, o.bar.box), `oracle ${o.bar.box} ours ${r.bar}`);
  add('labels', JSON.stringify(r.buttons.map((b) => b.label)) === JSON.stringify(o.buttons.map((b) => b.label)), `oracle ${o.buttons.map((b) => b.label)} ours ${r.buttons.map((b) => b.label)}`);
  for (const [k, ob] of o.buttons.entries()) { const ours = r.buttons[k]; add(`${ob.label} box`, !!ours && near(ours.box, ob.box), `oracle ${ob.box} ours ${ours?.box}`); }
  add('separators', r.seps.length === o.seps.length && r.seps.every((b, k) => near(b, o.seps[k].box)), `oracle ${o.seps.map((x) => x.box[0])} ours ${r.seps.map((x) => x[0])}`);
  add('rings', /rgb\(2, 122, 255\) 0px 0px 0px 1px/.test(r.rings) && /rgb\(108, 164, 244\) 0px 0px 0px 2px/.test(r.rings), r.rings);
  results.push({ name, checks });
  console.log(`${name}: ${checks.filter((c) => c.ok).length} of ${checks.length}`);
}
console.log(`Editor chrome: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/chrome-check.json', import.meta.url), JSON.stringify({ check: 'block toolbar and selection rings', tolerance: 1, pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
