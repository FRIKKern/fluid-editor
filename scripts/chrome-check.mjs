// U3, U4: compare our floating block toolbar and selection rings with the oracle's
// (parity/findings/TOOLBARGEO.json): for each measured block, scroll it to the same place in
// the canvas, select it, and compare the toolbar box, every button and separator box
// (relative to the block, within 1px), the button labels in order, and the ring colors.
// Our icons are drawn by us (O2), so the check compares boxes and colors, not pixels.
// Writes parity/chrome-check.json. Usage: npm run chrome-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, requireSameEngine, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/TOOLBARGEO.json', import.meta.url)));
requireSameEngine(S, 'chrome-check', F);
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html?replay`); await pause(2500);
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
    const ind = d.querySelector('.fe-indicator:not(.is-hover)');
    return JSON.stringify({ block: [Math.round(bq.left), Math.round(bq.top)], frameTop: Math.round(fr.top), bar: rel(tb.getBoundingClientRect()), hidden: tb.hidden,
      buttons: [...tb.querySelectorAll('button')].map((x) => ({ label: x.getAttribute('aria-label'), box: rel(x.getBoundingClientRect()), color: getComputedStyle(x).color })),
      seps: [...tb.querySelectorAll('.tb-sep')].map((x) => rel(x.getBoundingClientRect())), rings: ind && [W.getComputedStyle(ind, '::before'), W.getComputedStyle(ind, '::after')].map((c) => [c.borderTopColor, c.top, c.borderTopWidth].join(' ')).join(', ') }); })()`);
  const checks = [];
  const add = (what, ok, detail) => { total++; if (ok) pass++; checks.push({ what, ok }); if (!ok) console.log(`  ${name}: ${what} ${detail || ''}`); };
  add('frame top', r.frameTop === o.frameTop, `oracle ${o.frameTop} ours ${r.frameTop}`);
  add('block place', near(r.block, o.block.slice(0, 2)), `oracle ${o.block} ours ${r.block}`);
  add('toolbar box', near(r.bar, o.bar.box), `oracle ${o.bar.box} ours ${r.bar}`);
  add('labels', JSON.stringify(r.buttons.map((b) => b.label)) === JSON.stringify(o.buttons.map((b) => b.label)), `oracle ${o.buttons.map((b) => b.label)} ours ${r.buttons.map((b) => b.label)}`);
  for (const [k, ob] of o.buttons.entries()) { const ours = r.buttons[k]; add(`${ob.label} box`, !!ours && near(ours.box, ob.box), `oracle ${ob.box} ours ${ours?.box}`); }
  add('separators', r.seps.length === o.seps.length && r.seps.every((b, k) => near(b, o.seps[k].box)), `oracle ${o.seps.map((x) => x.box[0])} ours ${r.seps.map((x) => x[0])}`);
  add('rings', r.rings === 'rgb(2, 122, 255) -1px 1px, rgb(108, 164, 244) -2px 1px', r.rings);
  results.push({ name, checks });
  console.log(`${name}: ${checks.filter((c) => c.ok).length} of ${checks.length}`);
}
// Section chrome (U9, parity/findings/SECTIONBAR.json): hover sections 0 and 7 with the same
// section top in the canvas as on the oracle, and compare every control box relative to the
// section. Section 2 was hovered while scrolled under the previous section's toolbar, so it
// is left out.
const SB = JSON.parse(readFileSync(new URL('../parity/findings/SECTIONBAR.json', import.meta.url)));
const LABEL = { 'Open Layers Panel': 'layers', 'Add Block': 'add-block', 'Open Section Settings': 'edit', 'View Layouts': 'layouts', 'Duplicate Section': 'duplicate', 'Move Section Up': 'up', 'Move Section Down': 'down', 'Remove Section': 'remove' };
for (const i of ['0', '7']) {
  const h = SB.sections[i].hovered;
  const r = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow; const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    // No block selected: a selected block trims its section's chrome to the outline and Layers.
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(100);
    const sec = d.querySelectorAll('section.page-section')[${i}];
    W.scrollTo(0, W.scrollY + sec.getBoundingClientRect().top - ${h.section[1]}); await sleep(250);
    const q0 = sec.getBoundingClientRect(); sec.dispatchEvent(new W.PointerEvent('pointermove', { bubbles: true, clientX: q0.left + 500, clientY: q0.bottom - 40 })); await sleep(200);
    const fr = f.getBoundingClientRect(), q = sec.getBoundingClientRect();
    const rel = (e) => { const b = e.getBoundingClientRect(); return [b.left - fr.left - q.left, b.top - fr.top - q.top, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
    const c = document.getElementById('section-chrome');
    return JSON.stringify({ secTop: Math.round(q.top), boxes: Object.fromEntries([...c.querySelectorAll('[data-sc]')].map((e) => [e.dataset.sc, rel(e)])), card: rel(c.querySelector('[data-sc-part="card"]')) }); })()`);
  const add = (what, ok, detail) => { total++; if (ok) pass++; if (!ok) console.log(`  section ${i}: ${what} ${detail || ''}`); return ok; };
  let n = 0, k0 = total;
  add('section place', Math.abs(r.secTop - h.section[1]) <= 1, `oracle ${h.section[1]} ours ${r.secTop}`);
  add('card box', near(r.card, h.card.box), `oracle ${h.card.box} ours ${r.card}`);
  const seen = new Set();
  // Newest first: the section's own toolbar is listed after the one above it, if that one shows too.
  for (const b of [...h.buttons].reverse()) {
    // Add Section: the one in the top half of the section is the top edge button.
    const key = LABEL[b.label] || (b.label === 'Add Section' ? (b.box[1] < h.section[3] / 2 ? 'add-section-above' : 'add-section-below') : null);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    add(`${b.label} box`, !!r.boxes[key] && near(r.boxes[key], b.box), `oracle ${b.box} ours ${r.boxes[key]}`);
  }
  console.log(`section ${i}: ${total - k0} checks`);
}
// Move Forward and Backward on the toolbar, with real presses: one step past the next block it overlaps, or
// the next of all with a pin (CAP-U4ZPRESS.json, CAP-U4ZSTACK.json, CAP-U4ZPIN.json).
const SEC = 1;
const press = async (tb) => { const c = evalJs(S, `(() => { const q = document.querySelector('#block-toolbar [data-tb="${tb}"]').getBoundingClientRect(); return JSON.stringify([q.left + 18, q.top + 18]); })()`); mouse(S, 'move', c[0], c[1]); await pause(40); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(200); };
for (const [file, pin, phone] of [['CAP-U4ZPRESS', false], ['CAP-U4ZSTACK', false], ['CAP-U4ZPIN', true], ['CAP-U4ZPHONE', false, true]]) {
  const zAt = phone ? 1 : 0, view = phone ? 'mobile' : 'desktop';
  const Z = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  const first = Object.values(Z.reads).find((r) => r.stack?.length && r.btnState), ids = first.stack.map((_, k) => `z${k}`);
  const top = ids[first.stack.findIndex((b) => Number(b.z[zAt]) === Math.max(...first.stack.map((x) => Number(x.z[zAt]))))];
  const grid = (t) => t.split('/').map(Number);
  const blocks = first.stack.map((b, k) => ({ id: ids[k], type: 'shape', layout: { desktop: { area: grid(b.desktop), z: Number(b.z[0]), justify: 'flex-start', align: 'flex-start', ...(pin && ids[k] === top ? { sticky: { anchor: 'top', offset: 0 } } : {}) }, mobile: { area: grid(b.phone), z: Number(b.z[1]), justify: 'flex-start', align: 'flex-start' } } }));
  evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)), s = next.sections[${SEC}]; s.blocks = ${JSON.stringify(blocks)}; s.rows = { desktop: 30, mobile: 30 }; fe.setBp('desktop'); fe.load(next); await new Promise((r) => setTimeout(r, 250)); fe.setBp('${view}'); await new Promise((r) => setTimeout(r, 400)); fe.select(s.id, '${top}'); await new Promise((r) => setTimeout(r, 250)); return 1; })()`);
  const bad = []; let presses = 0;
  for (const [at, step] of Z.steps.entries()) {
    if (step[0] !== 'pressNamed' || !/^Move (Forward|Backward)$/.test(step[1])) continue;
    await press(step[1] === 'Move Forward' ? 'z+' : 'z-');
    const name = Z.steps.slice(at).find((x) => x[0] === 'read')?.[1], R = Z.reads[name];
    if (!R?.btnState) continue;
    presses++;
    const ours = evalJs(S, `(() => JSON.stringify({ z: Object.fromEntries(fe.model.sections[${SEC}].blocks.map((b) => [b.id, b.layout.${view}.z])), desk: fe.model.sections[${SEC}].blocks.map((b) => b.layout.desktop.z).join(), off: ['z+', 'z-'].map((t) => document.querySelector('#block-toolbar [data-tb="' + t + '"]')?.classList.contains('is-off')) }))()`);
    const want = R.stack.map((b) => Number(b.z[zAt])), got = ids.map((id) => ours.z[id]);
    if (want.join() !== got.join() || (phone && ours.desk !== R.stack.map((b) => Number(b.z[0])).join()) || ours.off[0] !== R.btnState['Move Forward'].disabled || ours.off[1] !== R.btnState['Move Backward'].disabled) bad.push(`${name}: oracle z ${want} off ${R.btnState['Move Forward'].disabled},${R.btnState['Move Backward'].disabled}; ours z ${got} off ${ours.off}`);
  }
  total++; if (!bad.length && presses >= 4) pass++; else console.log(`DIFF ${file}, ${presses} presses: ${bad.join(' ; ')}`);
  results.push({ name: `${file}: Forward and Backward, ${presses} presses`, same: !bad.length && presses >= 4 });
}
// Offset, Rotate and Scale move the block, not its panel, open or opened again (CAP-PANELSTILL.json, CAP-PANELSTILL2.json).
{ const P = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PANELSTILL.json', import.meta.url))).reads, P2 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PANELSTILL2.json', import.meta.url))).reads;
  const r = evalJs(S, `(async () => { const sleep = (x) => new Promise((res) => setTimeout(res, x)); const f = document.getElementById('site-frame'), d = () => f.contentDocument;
    fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 20, mobile: 20 }, blocks: [{ id: 'a', type: 'shape', label: 'a', fill: '#ccc', layout: { desktop: { area: [1, 2, 7, 8], z: 1, justify: 'center', align: 'center' }, mobile: { area: [1, 2, 7, 10], z: 1, justify: 'center', align: 'center' } } }] }] }); await sleep(200);
    fe.select('s', 'a'); await sleep(120); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200);
    const panel = () => { const q = document.getElementById('block-panel').getBoundingClientRect(); return [q.left, q.top]; }, blockAt = () => { const q = d().querySelector('.fe-block[data-block-id="a"]').getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map(Math.round); };
    const set = async (key, v) => { const i = document.querySelector('#block-panel input[data-design="' + key + '"]'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); };
    const out = { start: panel(), steps: {}, moved: {} };
    for (const [name, key, v] of [['Offset X 200', 'tx', '200'], ['Offset Y 100', 'ty', '100'], ['Rotate 30', 'rotate', '30'], ['Scale X 150', 'sx', '150']]) { await set(key, v); out.steps[name] = panel(); out.moved[name] = blockAt(); }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(200); fe.select('s', 'a'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); out.steps.again = panel();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fe.select(null); return JSON.stringify(out); })()`);
  for (const name of ['Offset X 200', 'Offset Y 100', 'Rotate 30', 'Scale X 150']) { total++; const box = P[name].block.box.map(Math.round), still = near(r.steps[name], r.start), same = r.moved[name].every((v, k) => Math.abs(v - box[k]) <= 2 || k === 1); if (still && same) pass++; else console.log(`DIFF panel under ${name}: at ${r.start}, then ${r.steps[name]}; block ${r.moved[name]}, oracle ${box}`); results.push({ name: `panel stays under ${name}`, same: still && same }); }
  total++; const again = near(r.steps.again, r.start) && P2['opened again'].panelBox.box[0] === P.start.panelBox.box[0]; if (again) pass++; else console.log(`DIFF panel opened again: ${r.steps.again}, at first ${r.start}`); results.push({ name: 'panel opened again beside the box', same: again });
}
console.log(`Editor chrome: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/chrome-check.json', import.meta.url), JSON.stringify({ check: 'block toolbar and selection rings', tolerance: 1, pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
