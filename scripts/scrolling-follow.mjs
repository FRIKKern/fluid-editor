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

export async function followRows({ qs, press, add, pause, browser, S }) {
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
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
