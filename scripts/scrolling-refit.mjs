// scrolling-check's rows for a Cmd+Z that takes a Scrolling block's Wave Intensity back up (CAP-T12REFIT3.json, R2; R1 read
// alike). One section per plan, a Scrolling block and a Text block, made as the oracle's section was at the plan's 'open'
// read (both blocks' desktop and phone areas and the section's rows), in the view it was read in; then Edit, Design and
// the plan's steps, a row after each: a number is a press on Wave Intensity, 'go' lets the block go, 'z' is a real Cmd+Z,
// 'mobile' and 'desktop' change the view, 'down' moves the Text block a row down on the desktop by a real ArrowDown. Each
// row checks both blocks' desktop and phone areas, the section's rows in the view shown, the Scrolling block's height and
// line, the Text block's top and height, and on a step row the wave in that view.
// G1: CAP-T12BELOW g's first Cmd+Z refits the phone block to 1/2/7/10; a desktop move of the Text block after it leaves the
// phone blocks where they are. G2: a desktop fall (180 then 150) taken back by a Cmd+Z in the phone view, the phone with no
// wave of its own: the phone block gets 180's growth rows (1/2/8/10). Both matched before these rows were added: guards.
// Not here: the finding's G3 (a phone block made 1/2/12/10 by hand keeps its rows at 150 and loses 2 at the fall to 90, which
// ours does not; task-c272a67694f09f1e waits on that rule).
import { readFileSync } from 'node:fs';

const OB = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12REFIT3.json', import.meta.url))).runs.R2.reads;
const near1 = (x, y) => Math.abs(x - y) <= 0.15;
// Plan, the view at 'open', the read names before 'open', the steps.
const PLANS = [
  ['G1', 'mobile', 'mobile>', [180, 150, 120, 'go', 'z', 'desktop', 'down', 'mobile', 'desktop']],
  ['G2', 'desktop', '', [180, 150, 'go', 'mobile', 'z', 'z', 'desktop']],
];
const NAME = { down: 'arr ArrowDown' };

export async function refitRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const build = (P, view, pre) => {
    const o = OB[`R2 ${P} ${pre}open`].layout, d0 = OB[`R2 ${P} default`].layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const low = (k) => Math.max(...o.all.map((b) => area(b[k])[2])) - 1;
    const rows = { desktop: view === 'desktop' ? o.rows : d0.rows, mobile: view === 'mobile' ? o.rows : low('phone') };
    const spec = JSON.stringify({ rows, blocks: [me, other].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    return qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); const id0 = fe.model.sections[0].blocks[0].id; fe.addBlock(s.id, 'Text', true); await sleep(300); const ids = [id0, fe.model.sections[0].blocks.find((b) => b.id !== id0).id]; const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; ids.forEach((id, k) => { const b = t.blocks.find((x) => x.id === id); b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.setBp(${JSON.stringify(view)}); await sleep(800); fe.select(t.id, id0); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return JSON.stringify(ids);`);
  };
  let ids = null;
  const ours = (view) => qs(`const s = fe.model.sections[0], d = document.getElementById('site-frame').contentDocument, el = (b) => d.getElementById('block-' + b.id).closest('.fe-block'), r = (v) => Math.round(v * 10) / 10; const [a, t] = ${JSON.stringify(ids)}.map((id) => s.blocks.find((b) => b.id === id)), fb = el(a).getBoundingClientRect(), mq = d.getElementById('block-' + a.id).querySelector('.marquee').getBoundingClientRect(), q = el(t).getBoundingClientRect(); return JSON.stringify({ view: fe.bp, rows: s.rows[${JSON.stringify(view)}], wave: (${JSON.stringify(view)} === 'mobile' ? a.waveMobile ?? a.wave : a.wave) ?? 0, block: r(fb.height), line: r(mq.height), me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')], top: r(q.top - fb.top), height: r(q.height) });`);
  const same = (what, view, read) => {
    const o = read.layout, w = ours(view), me = o.all.find((b) => b.me), t = o.all.find((b) => !b.me), top = Math.round((t.top - me.top) * 10) / 10;
    const ok = w.view === view && w.rows === o.rows && w.me[0] === me.desktop && w.me[1] === me.phone && w.other[0] === t.desktop && w.other[1] === t.phone
      && near1(w.block, o.block) && near1(w.line, o.marquee[1]) && near1(w.top, top) && near1(w.height, t.height) && (!read.wave || String(w.wave) === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, wave: read.wave?.[0] ?? null, block: o.block, line: o.marquee[1], me: [me.desktop, me.phone], other: [t.desktop, t.phone], top, height: t.height })})`);
  };
  for (const [P, view0, pre, steps] of PLANS) {
    ids = build(P, view0, pre);
    await press('#block-panel [data-btab="Design"]');
    let view = view0, k = `${pre}open`;
    same(`Refit ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    for (const v of steps) {
      if (typeof v === 'number') { await press('#block-panel [data-scr-range="wave"]', v === 0 ? 0.005 : Math.min(0.995, v / 180)); await pause(1300); }
      else if (v === 'go') qs(`fe.select(null); await sleep(300); return 'true';`);
      else if (v === 'z') { qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400); }
      else if (v === 'mobile' || v === 'desktop') { qs(`fe.setBp(${JSON.stringify(v)}); await sleep(800); return 'true';`); view = v; }
      else if (v === 'down') { qs(`fe.select(fe.model.sections[0].id, ${JSON.stringify(ids[1])}); await sleep(300); document.activeElement?.blur?.(); return 'true';`); browser(S, 'press', 'ArrowDown'); await pause(500); qs(`fe.select(null); await sleep(300); return 'true';`); }
      k += `>${NAME[v] ?? v}`;
      same(`Refit ${P}: ${k}`, view, OB[`R2 ${P} ${k}`]);
    }
  }
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
