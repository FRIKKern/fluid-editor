// scrolling-check's rows for Text Style, Direction, Pause on hover and Fade edges after a wave fall, with Cmd+Z after them,
// and for a Scrolling block among other blocks, with Cmd+Z after the wave steps (CAP-T12BLOCKS.json, R2; R1 read alike in
// all 119 reads). On the desktop: a Text block under it, a row below, on its rows from its top, and below it in other columns.
// In the phone view: a block under it, a row below, three under it, one sharing a column on its top row, one above it, one
// beside and one below it in other columns. Each plan is the oracle's section as
// arranged ('start'): its blocks' desktop and phone areas and its rows. Then the view it was read in, Edit, Design, the
// plan's steps, a let go, and each Cmd+Z, a row after each. Each row checks every block's areas, the section's rows in that
// view, the Scrolling block's height and its line, and each other block's top and height. A press row also checks that the
// press landed: the wave, Text Style, Direction, Pause on hover and Fade edges as the oracle's panel read.
import { readFileSync } from 'node:fs';

const OB = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12BLOCKS.json', import.meta.url))).runs.R2.reads;
const near1 = (x, y) => Math.abs(x - y) <= 0.15;
// Plan, view, steps: a number is a press on Wave Intensity there; 'z' is Cmd+Z after the let go.
export const PLANS = [
  ['H', 'desktop', [180, 90, 'style P', 'z']], ['J', 'desktop', [180, 90, 'Fade edges', 'z']],
  ['A', 'mobile', [180, 150, 'style P', 'z']], ['B', 'mobile', [180, 150, 'Animation direction right', 'z']], ['C', 'mobile', [180, 150, 'Pause on hover', 'z']],
  ['I', 'desktop', [180, 90, 'z', 'z']], ['K', 'desktop', [180, 90, 'z', 'z']], ['Q', 'desktop', [180, 90, 'z', 'z']], ['R', 'desktop', [180, 90, 'z', 'z']],
  ['U', 'mobile', [180, 90, 'z', 'z']], ['D', 'mobile', [180, 90, 'z', 'z']], ['E', 'mobile', [180, 90, 'z', 'z']], ['F', 'mobile', [180, 90, 'z', 'z']],
  ['G', 'mobile', [180, 90, 'z', 'z']], ['N', 'mobile', [180, 90, 'z', 'z']], ['O', 'mobile', [180, 90, 'z', 'z']], ['M', 'mobile', [180, 90, 'z', 'z']],
];
const PRESS = { 'style P': null, 'Animation direction right': '[aria-label="Animation direction right"]', 'Pause on hover': 'input[aria-label="Pause on hover"]', 'Fade edges': 'input[aria-label="Fade edges"]' };

export async function blockRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  // The oracle's section for a plan: the Scrolling block first, then the others in the read's order.
  const build = async (P, view) => {
    const o = OB[`R2 ${P} start`].layout, d0 = OB[`R2 ${P} default`].layout, me = o.all.find((b) => b.me), others = o.all.filter((b) => !b.me);
    const low = (k) => Math.max(...o.all.map((b) => area(b[k])[2])) - 1;
    const rows = { desktop: view === 'desktop' ? o.rows : d0.rows, mobile: view === 'mobile' ? o.rows : low('phone') };
    const spec = JSON.stringify({ rows, blocks: [me, ...others].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })), n: others.length });
    qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); for (let k = 0; k < W.n; k++) { fe.addBlock(s.id, 'Text', true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.setBp(${JSON.stringify(view)}); await sleep(800); fe.select(t.id, fe.model.sections[0].blocks.find((b) => b.type === 'scrolling').id); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
  };
  // Ours, in the view shown: each block's areas, top in the section and height; the section's rows; the Scrolling block's line.
  const ours = (view) => qs(`const s = fe.model.sections[0], d = document.getElementById('site-frame').contentDocument, el = (b) => d.getElementById('block-' + b.id).closest('.fe-block'), r = (v) => Math.round(v * 10) / 10; const a = s.blocks.find((b) => b.type === 'scrolling'), fb = el(a).getBoundingClientRect(), mq = d.getElementById('block-' + a.id).querySelector('.marquee').getBoundingClientRect(); return JSON.stringify({ rows: s.rows[${JSON.stringify(view)}], block: r(fb.height), marquee: [r(mq.top - fb.top), r(mq.height)], all: [a, ...s.blocks.filter((b) => b !== a)].map((b) => { const q = el(b).getBoundingClientRect(); return { desktop: b.layout.desktop.area.join('/'), phone: b.layout.mobile.area.join('/'), top: r(q.top - fb.top), height: r(q.height) }; }) });`);
  const sameB = (what, view, o) => {
    const w = ours(view), me = o.all.find((b) => b.me), [a, ...rest] = w.all, by = (x, y) => (x.phone + x.desktop < y.phone + y.desktop ? -1 : 1);
    // The other blocks are Text blocks alike, so they pair up by their areas; tops are from the Scrolling block's top.
    const others = o.all.filter((b) => !b.me).map((b) => ({ ...b, top: Math.round((b.top - me.top) * 10) / 10 })).sort(by), mine = [...rest].sort(by);
    const ok = w.rows === o.rows && a.desktop === me.desktop && a.phone === me.phone && near1(w.block, o.block) && near1(w.marquee[0], o.marquee[0]) && near1(w.marquee[1], o.marquee[1])
      && mine.length === others.length && mine.every((b, k) => b.desktop === others[k].desktop && b.phone === others[k].phone && near1(b.top, others[k].top) && near1(b.height, others[k].height));
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, block: o.block, marquee: o.marquee, all: o.all })})`);
  };
  // What the panel shows, as the oracle's controls read: wave, Text Style, Direction, Pause on hover, Fade edges.
  const controls = (o) => { const on = (k) => o.ctl.some((c) => c[0] === k && (c[1] === 'true' || c[1] === true)); return JSON.stringify([Number(o.ranges.find((r) => r[0] === 'Wave Intensity')[1]), o.paragraph ? 'paragraph' : 'heading', on('Animation direction right') ? 'right' : 'left', on('Pause on hover'), on('Fade edges')]); };
  for (const [P, view, steps] of PLANS) {
    await build(P, view);
    sameB(`Blocks ${P} (${view === 'mobile' ? 'phone' : 'desktop'}): start`, view, OB[`R2 ${P} start`].layout);
    const done = []; let left = false;
    for (const st of steps) {
      if (st === 'z' && !left) { qs(`fe.select(null); await sleep(300); return 'true';`); sameB(`Blocks ${P}: ${done.join('>')}, let go`, view, OB[`R2 ${P} ${done.join('>')} let go`].layout); left = true; }
      if (st === 'z') { qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400); }
      else if (st === 'style P') { await press('#block-panel [data-acc-menu="scrollStyle"]'); await press('#shape-pop [data-acc-opt="paragraph"]'); }
      else if (typeof st === 'string') await press(`#block-panel ${PRESS[st]}`);
      else await press('#block-panel [data-scr-range="wave"]', st === 0 ? 0.005 : Math.min(0.995, st / 180));
      await pause(300); done.push(st === 180 ? '180' : String(st));
      const k = done.join('>'), o = OB[`R2 ${P} ${k}`].layout;
      if (!left) {
        const got = qs(`const b = fe.model.sections[0].blocks.find((x) => x.type === 'scrolling'); return JSON.stringify(JSON.stringify([b.wave ?? 0, b.scrollStyle || 'heading', b.direction || 'left', !!b.pauseHover, !!b.fadeEdges]));`);
        if (got !== controls(o)) { add(`Blocks ${P}: ${k}`, false, `controls ${got} (oracle ${controls(o)})`); continue; }
      }
      sameB(`Blocks ${P}: ${k}`, view, o);
    }
  }
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
