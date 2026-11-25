// scrolling-check's rows for the phone following the desktop after a Wave Intensity fall in the phone view (CAP-T12FOLLOW.json,
// R2; R1 read alike in all 16 reads). Plan V: a Text block under a Scrolling block, in the phone view 180>90 moves it down
// with the foot; then on the desktop the Scrolling block moved down three rows turns the phone order, as with no fall (W).
// The section is one made in the editor, as the oracle's (phoneFollows set, add-section.js). Each row checks every block's
// phone area, its desktop start and the Text block's desktop area, and in the phone view the section's rows. The Scrolling
// block's desktop rows are not checked: on the oracle the desktop line stays flat after a fall in the phone view (answer 2).
import { readFileSync } from 'node:fs';

const OF = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12FOLLOW.json', import.meta.url))).runs.R2.reads;
// Plan, steps in the phone view (a number is a press on Wave Intensity there), then the steps after the let go.
export const PLANS = [['V', [180, 90]], ['W', []]];
const AFTER = ['desktop', ['scrolling', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'S Down Down Down'], ['text', 'ArrowRight', 'ArrowRight', 'T Right Right'], 'mobile'];

export async function followRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const build = (P) => {
    const o = OF[`R2 ${P} start`].layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: OF[`R2 ${P} default`].layout.rows, mobile: o.rows }, blocks: [me, other].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); fe.addBlock(s.id, 'Text', true); await sleep(300); const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); return 'true';`);
  };
  const ours = () => qs(`const s = fe.model.sections[0], a = s.blocks.find((b) => b.type === 'scrolling'), t = s.blocks.find((b) => b !== a); return JSON.stringify({ follows: s.phoneFollows, rows: s.rows.mobile, me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')] });`);
  const same = (what, o, phoneView) => {
    const w = ours(), me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me), start = (t) => t.split('/').slice(0, 2).join('/');
    const ok = w.me[1] === me.phone && w.other[1] === other.phone && start(w.me[0]) === start(me.desktop) && w.other[0] === other.desktop && (!phoneView || w.rows === o.rows);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, me: [me.desktop, me.phone], other: [other.desktop, other.phone] })})`);
  };
  const idOf = (type) => qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks.find((b) => (b.type === 'scrolling') === ${JSON.stringify(type === 'scrolling')}).id]);`);
  for (const [P, steps] of PLANS) {
    build(P);
    qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    same(`Follow ${P} (phone): start`, OF[`R2 ${P} start`].layout, true);
    const [sid, bid] = idOf('scrolling');
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
    const done = [];
    for (const st of steps) {
      await press('#block-panel [data-scr-range="wave"]', Math.min(0.995, st / 180)); await pause(300);
      done.push(String(st));
      const k = done.join('>'), o = OF[`R2 ${P} ${k}`], got = qs(`return JSON.stringify(fe.model.sections[0].blocks.find((x) => x.type === 'scrolling').wave ?? 0);`);
      // The press must have landed: the block's wave as the oracle's panel read it.
      if (String(got) !== o.wave[0]) { add(`Follow ${P}: ${k}`, false, `wave ${got} (oracle ${o.wave[0]})`); continue; }
      same(`Follow ${P}: ${k}`, o.layout, true);
    }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    same(`Follow ${P}: ${done.join('>')}, let go`, OF[`R2 ${P} ${done.join('>')} let go`].layout, true);
    for (const st of AFTER) {
      if (typeof st === 'string') { qs(`fe.setBp(${JSON.stringify(st)}); await sleep(800); return 'true';`); done.push(st); }
      else {
        const [s2, b2] = idOf(st[0]);
        qs(`fe.select(${JSON.stringify(s2)}, ${JSON.stringify(b2)}); await sleep(300); return 'true';`);
        for (const key of st.slice(1, -1)) { browser(S, 'press', key); await pause(400); }
        qs(`fe.select(null); await sleep(300); return 'true';`);
        done.push(st.at(-1));
      }
      const k = done.join('>');
      same(`Follow ${P}: ${k}`, OF[`R2 ${P} ${k}`].layout, done.at(-1) === 'mobile');
    }
  }
  // A guard, not read on the oracle: after a Wave drag in the phone view that moved the block below and was let go on its
  // start value (no change, no commit), a hand move of that block still stops the phone following, as any phone hand move
  // does (CAP-DESKMOVE*.json): the next desktop move leaves the phone areas as they were.
  build('V');
  qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
  { const [sid, bid] = idOf('scrolling');
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`); }
  await press('#block-panel [data-btab="Design"]');
  await press('#block-panel [data-scr-range="wave"]', 0.5); await pause(300);
  const at = (fx) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'), r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${fx}, r.top + r.height / 2]);`);
  const p = at(0.5), q = at(0.995), path = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0].map((i) => p[0] + ((q[0] - p[0]) * i) / 6);
  const below0 = ours().other[1];
  mouse(S, 'move', p[0], p[1]); await pause(60); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(100);
  for (const x of path) { mouse(S, 'move', x, p[1], { buttons: 1 }); await pause(120); }
  const moved = ours().other[1] !== below0;
  mouse(S, 'up', p[0], p[1]); await pause(400);
  qs(`fe.select(null); await sleep(300); return 'true';`);
  { const [sid, bid] = idOf('text'); qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(300); return 'true';`); }
  browser(S, 'press', 'ArrowDown'); await pause(400);
  qs(`fe.select(null); await sleep(300); fe.setBp('desktop'); await sleep(800); return 'true';`);
  const before = ours();
  { const [sid, bid] = idOf('scrolling'); qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(300); return 'true';`); }
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown']) { browser(S, 'press', key); await pause(400); }
  qs(`fe.select(null); await sleep(300); return 'true';`);
  const after = ours();
  add('Follow guard: a drag let go on its start, a phone hand move, then a desktop move: the phone stays', moved && after.me[0] !== before.me[0] && after.me[1] === before.me[1] && after.other[1] === before.other[1] && after.follows === false, JSON.stringify({ movedInDrag: moved, before, after }));
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
