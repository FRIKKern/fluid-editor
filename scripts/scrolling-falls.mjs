// scrolling-check's rows for a big Wave Intensity fall on the desktop with a Text block on the Scrolling block's top row
// (CAP-T12TOPFALL.json, R2; R1 read alike in all 108 reads). The Text block as a new one lands (1/2/3/10, on the Scrolling
// block's rows from its top), one row lower (C, 2/2/4/10), or both blocks moved two rows down (X, Y, Z). Two presses, a let
// go and two Cmd+Z. A fall of two steps or more moves the Text block up by as much as the foot, unless that would put it on
// the Scrolling block's top row or above: then it lands on the foot, just under the block (A, B, E, G, H, I, J, C, X, Z).
// Q and Y move it the plain way, still on the Scrolling block's rows. A fall of one step leaves it (P, 180 then 150: it starts
// above the old foot; scrolling-below.mjs has blocks at or under the foot, which follow). Each row checks both blocks'
// desktop and phone areas, the section's desktop rows, the Scrolling block's height and line, the Text block's top and
// height, and on a press row the wave value. Not rows: F (the phone view, where the Text block on the top row is stretched,
// not moved, task-f965eec8e625ed9a).
import { readFileSync } from 'node:fs';

const OT = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12TOPFALL.json', import.meta.url))).runs.R2.reads;
const near1 = (x, y) => Math.abs(x - y) <= 0.15;
const ARR = 'arr ArrowDown ArrowDown>arr ArrowDown ArrowDown>';
// Plan, the steps that arranged it before Edit, the two presses (179 is the press at the range's end, 180).
export const PLANS = [
  ['A', '', [150, 0]], ['B', '', [180, 0]], ['E', '', [150, 30]], ['G', '', [120, 0]], ['H', '', [90, 0]],
  ['I', '', [180, 60]], ['J', '', [180, 30]], ['Q', '', [180, 90]], ['P', '', [180, 150]], ['C', 'arr ArrowDown>', [150, 0]],
  ['X', ARR, [150, 0]], ['Y', ARR, [180, 90]], ['Z', ARR, [180, 60]],
];

export async function fallRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  // The oracle's section as the plan's Edit found it: the Scrolling block first, then the Text block.
  const build = (P, pre) => {
    const o = OT[`R2 ${P} ${pre}open`].layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const low = Math.max(...o.all.map((b) => area(b.phone)[2])) - 1;
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: low }, blocks: [me, other].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); fe.addBlock(s.id, 'Text', true); await sleep(300); const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.select(t.id, fe.model.sections[0].blocks.find((b) => b.type === 'scrolling').id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
  };
  const ours = () => qs(`const s = fe.model.sections[0], d = document.getElementById('site-frame').contentDocument, el = (b) => d.getElementById('block-' + b.id).closest('.fe-block'), r = (v) => Math.round(v * 10) / 10; const a = s.blocks.find((b) => b.type === 'scrolling'), t = s.blocks.find((b) => b !== a), fb = el(a).getBoundingClientRect(), mq = d.getElementById('block-' + a.id).querySelector('.marquee').getBoundingClientRect(), q = el(t).getBoundingClientRect(); return JSON.stringify({ rows: s.rows.desktop, wave: a.wave ?? 0, block: r(fb.height), line: r(mq.height), me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], text: [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')], top: r(q.top - fb.top), height: r(q.height) });`);
  const same = (what, read) => {
    const o = read.layout, w = ours(), me = o.all.find((b) => b.me), t = o.all.find((b) => !b.me), top = Math.round((t.top - me.top) * 10) / 10;
    const ok = w.rows === o.rows && w.me[0] === me.desktop && w.me[1] === me.phone && w.text[0] === t.desktop && w.text[1] === t.phone
      && near1(w.block, o.block) && near1(w.line, o.marquee[1]) && near1(w.top, top) && near1(w.height, t.height) && (!read.wave || String(w.wave) === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, wave: read.wave?.[0] ?? null, block: o.block, line: o.marquee[1], me: [me.desktop, me.phone], text: [t.desktop, t.phone], top, height: t.height })})`);
  };
  for (const [P, pre, vals] of PLANS) {
    build(P, pre);
    await press('#block-panel [data-btab="Design"]');
    let k = `${pre}open`;
    same(`Top fall ${P}: ${k}`, OT[`R2 ${P} ${k}`]);
    for (const v of vals) {
      await press('#block-panel [data-scr-range="wave"]', v === 0 ? 0.005 : Math.min(0.995, v / 180)); await pause(300);
      k += `>${v}`; same(`Top fall ${P}: ${k}`, OT[`R2 ${P} ${k}`]);
    }
    qs(`fe.select(null); await sleep(300); return 'true';`); k += '>go'; same(`Top fall ${P}: ${k}`, OT[`R2 ${P} ${k}`]);
    for (let z = 0; z < 2; z++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z'; same(`Top fall ${P}: ${k}`, OT[`R2 ${P} ${k}`]);
    }
  }
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
