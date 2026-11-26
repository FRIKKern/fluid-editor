// scrolling-check's rows for the blocks below a Scrolling block as its Wave Intensity falls by one step (CAP-T12BELOW.json,
// R2; R1 read alike). One new section per plan, a Scrolling block and a second block added after it, made on the desktop as the
// oracle's and arranged by arrow keys there, or in the phone view for a phone plan. Each plan is the oracle's section as its
// 'open' read found it: both blocks' desktop and phone areas and the section's rows. Then the view it was read in, Edit,
// Design, the plan's steps (a press on Wave Intensity, or a real ArrowLeft on the range), a let go, and each Cmd+Z, a row
// after each; for a phone plan whose read has it, one more back in Desktop View after the last Cmd+Z. Each row checks both
// blocks' desktop and phone areas, the section's rows in that view, the Scrolling block's height and line, the other block's
// top and height, and on a step row the wave in that view.
// Desktop: the Text block under the foot (a, 3/2/5/10), a row below (b, 4/2/6/10), 180 then 150; from 150 to 120 (c); 180
// then ArrowLeft (d). Phone: the Text block under it (e), a row below (f), 180 then 150; 180, 150 and 120 (g), whose first
// Cmd+Z gives back 150 with the rows a growth takes (1/2/7/10), not the 1/2/6/10 the fall left. A block with the Scrolling block's own area is stretched with it, not moved, as its foot grows
// and left as it falls: two Scrolling blocks as added (l: 150 then 0; m: 90, 180, 120), the Scrolling block made the Text
// block's 1/2/3/10 (p); in the phone view the Text block moved onto the top row (F of CAP-T12TOPFALL.json and h: 90, 150,
// 60; i: 180, 150) and a second Scrolling block there (k). A block on the top row with another area moves as CAP-T12TOPFALL
// A: q (a second Scrolling block made 1/2/3/14), n (a Button block), r (phone, the Text block made 1/2/3/6); and one on the
// second row as its C: o (a second Scrolling block), j (phone). After 150 and 0, 90 stretches the second Scrolling block
// by the growth, and on the desktop the phone stack turns only on that step (v; x in the phone view, CAP-T12TWIN.json). The
// section follows the desktop on the phone, as one made in the editor does.
import { readFileSync } from 'node:fs';

const R2 = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}.json`, import.meta.url))).runs.R2.reads;
const OB = { ...R2('CAP-T12BELOW'), ...R2('CAP-T12TOPFALL'), ...R2('CAP-T12TWIN') };
const near1 = (x, y) => Math.abs(x - y) <= 0.15;
const DN2 = 'arr ArrowDown ArrowDown>', UP2 = 'arr ArrowUp ArrowUp>';
// Plan, view, the arrangement steps before 'open', the kind of the second block, the steps (a number is a press there), and
// the Cmd+Z count when it is not one per step.
export const PLANS = [
  ['a', 'desktop', DN2, 'Text', [180, 150]], ['b', 'desktop', 'arr ArrowDown ArrowDown ArrowDown>', 'Text', [180, 150]],
  ['c', 'desktop', DN2, 'Text', [150, 120]], ['d', 'desktop', DN2, 'Text', [180, 'ArrowLeft']],
  ['e', 'mobile', 'mobile>', 'Text', [180, 150]], ['f', 'mobile', 'mobile>arr ArrowDown>', 'Text', [180, 150]],
  ['g', 'mobile', 'mobile>', 'Text', [180, 150, 120]],
  // A block with the Scrolling block's own area, stretched: two Scrolling blocks as added (l, m), the Scrolling block made the
  // Text block's 1/2/3/10 (p); phone, the Text block on the top row (F of CAP-T12TOPFALL, h, i), a second Scrolling block
  // there (k). Moved: on the top row with another area (q 1/2/3/14, n a Button, r phone 1/2/3/6), on the second row (o, j).
  ['l', 'desktop', '', 'Scrolling', [150, 0]], ['m', 'desktop', '', 'Scrolling', [90, 180, 120]],
  ['p', 'desktop', 'place 0 1/2/3/10>', 'Text', [150, 0]], ['F', 'mobile', `mobile>${UP2}`, 'Text', [150, 0]],
  ['h', 'mobile', `mobile>${UP2}`, 'Text', [90, 150, 60]], ['i', 'mobile', `mobile>${UP2}`, 'Text', [180, 150]],
  ['k', 'mobile', `mobile>${UP2}`, 'Scrolling', [150, 0]], ['q', 'desktop', 'place 1 1/2/3/14>', 'Scrolling', [150, 0]],
  ['n', 'desktop', '', 'Button', [150, 0]], ['r', 'mobile', `mobile>${UP2}place 1 1/2/3/6>`, 'Text', [150, 0]],
  ['o', 'desktop', 'arr ArrowDown>', 'Scrolling', [150, 0]], ['j', 'mobile', 'mobile>arr ArrowUp>', 'Text', [150, 0]],
  // CAP-T12TWIN: after 150 and 0 the second block has the top row and columns but another end; 90 stretches it by 3 rows, and
  // on the desktop the phone stack turns only then (v); in the phone view (x).
  ['v', 'desktop', '', 'Scrolling', [150, 0, 90]], ['x', 'mobile', `mobile>${UP2}`, 'Scrolling', [150, 0, 90]],
];
const NAME = { ArrowLeft: 'ArrowLeft x1 1200' };

export async function belowRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  // The oracle's section as the plan's Edit found it: the Scrolling block first, then the other block.
  const build = (P, view, pre, kind) => {
    const o = OB[`R2 ${P} ${pre}open`].layout, d0 = OB[`R2 ${P} default`].layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const low = (k) => Math.max(...o.all.map((b) => area(b[k])[2])) - 1;
    const rows = { desktop: view === 'desktop' ? o.rows : d0.rows, mobile: view === 'mobile' ? o.rows : low('phone') };
    const spec = JSON.stringify({ rows, kind, blocks: [me, other].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    return qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const id0 = fe.model.sections[0].blocks[0].id; fe.addBlock(s.id, W.kind, true); await sleep(300); const ids = [id0, fe.model.sections[0].blocks.find((b) => b.id !== id0).id]; const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; ids.forEach((id, k) => { const b = t.blocks.find((x) => x.id === id); b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.setBp(${JSON.stringify(view)}); await sleep(800); fe.select(t.id, id0); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return JSON.stringify(ids);`);
  };
  // Ours, in the view shown: the selected Scrolling block and the other block, by the ids build gave them as added (a commit
  // may put the section's blocks in another order, and two Scrolling blocks look alike). The section follows the desktop on
  // the phone, as a section made in the editor (and the oracle's new one) does.
  let ids = null;
  const ours = (view) => qs(`const s = fe.model.sections[0], d = document.getElementById('site-frame').contentDocument, el = (b) => d.getElementById('block-' + b.id).closest('.fe-block'), r = (v) => Math.round(v * 10) / 10; const [a, t] = ${JSON.stringify(ids)}.map((id) => s.blocks.find((b) => b.id === id)), fb = el(a).getBoundingClientRect(), mq = d.getElementById('block-' + a.id).querySelector('.marquee').getBoundingClientRect(), q = el(t).getBoundingClientRect(); return JSON.stringify({ rows: s.rows[${JSON.stringify(view)}], wave: (${JSON.stringify(view)} === 'mobile' ? a.waveMobile ?? a.wave : a.wave) ?? 0, block: r(fb.height), line: r(mq.height), me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')], top: r(q.top - fb.top), height: r(q.height) });`);
  const same = (what, view, read) => {
    const o = read.layout, w = ours(view), me = o.all.find((b) => b.me), t = o.all.find((b) => !b.me), top = Math.round((t.top - me.top) * 10) / 10;
    const ok = w.rows === o.rows && w.me[0] === me.desktop && w.me[1] === me.phone && w.other[0] === t.desktop && w.other[1] === t.phone
      && near1(w.block, o.block) && near1(w.line, o.marquee[1]) && near1(w.top, top) && near1(w.height, t.height) && (!read.wave || String(w.wave) === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, wave: read.wave?.[0] ?? null, block: o.block, line: o.marquee[1], me: [me.desktop, me.phone], other: [t.desktop, t.phone], top, height: t.height })})`);
  };
  for (const [P, view, pre, kind, steps, zs = steps.length] of PLANS) {
    ids = build(P, view, pre, kind);
    await press('#block-panel [data-btab="Design"]');
    let k = `${pre}open`;
    same(`Below ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    for (const v of steps) {
      if (v === 'ArrowLeft') browser(S, 'press', 'ArrowLeft');
      else await press('#block-panel [data-scr-range="wave"]', v === 0 ? 0.005 : Math.min(0.995, v / 180));
      await pause(1300);
      k += `>${NAME[v] ?? v}`; same(`Below ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    }
    qs(`fe.select(null); await sleep(300); return 'true';`); k += '>go'; same(`Below ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    for (let z = 0; z < zs; z++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z'; same(`Below ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    }
    // A phone plan's last read, back in Desktop View after the last Cmd+Z (stored for e to k, r, F and x).
    if (OB[`R2 ${P} ${k}>desktop`]) { qs(`fe.setBp('desktop'); await sleep(800); return 'true';`); k += '>desktop'; same(`Below ${P}: ${k}`, 'desktop', OB[`R2 ${P} ${k}`]); }
  }
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
