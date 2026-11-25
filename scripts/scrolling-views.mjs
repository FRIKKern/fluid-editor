// scrolling-check's rows for Wave Intensity as each view's own (CAP-T12WAVEVIEWS.json, R2; R1 read alike in all 42 reads).
// A Scrolling block with a Text block under it, made on the desktop as the oracle's. X: 180>90 in the phone view, then the
// desktop line stays flat and its panel shows 0; 60 set there leaves the phone's 90. Y: 90 on the desktop, and the phone,
// with no value of its own, draws it with its rows unchanged. Each row checks both blocks' desktop and phone areas, the
// section's rows in the phone view, the Scrolling block's height and its line's height in the view shown, and with the panel
// open the Wave value it shows. Z and Q: the phone-only button right of the Animation tab is on and the Wave Intensity label
// dotted once the phone set its own value; neither after a desktop change only, and on the desktop there is no button.
import { readFileSync } from 'node:fs';

const OV = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEVIEWS.json', import.meta.url))).runs.R2.reads;
const PLANS = {
  X: ['mobile', 'open', 180, 90, 'go', 'desktop', 'open', 60, 'go', 'mobile', 'open', 'go', 'desktop'],
  Y: ['open', 90, 'go', 'mobile', 'open', 'go', 'desktop'],
  Z: ['mobile', 'open', 'marks', 90, 'marks', 'go', 'desktop', 'open', 'marks', 'go'],
  Q: ['open', 90, 'go', 'mobile', 'open', 'marks', 'go', 'desktop'],
};

export async function viewRows({ qs, press, add, pause }) {
  const area = (t) => t.split('/').map(Number);
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  const build = (P) => {
    const o = OV[`R2 ${P} default`].layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: OV['R2 X mobile'].layout.rows }, blocks: [me, other].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); fe.addBlock(s.id, 'Text', true); await sleep(300); const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); return 'true';`);
  };
  const ours = () => qs(`const s = fe.model.sections[0], a = s.blocks.find((b) => b.type === 'scrolling'), t = s.blocks.find((b) => b !== a), d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + a.id), r = (v) => Math.round(v * 10) / 10, range = document.querySelector('#block-panel [data-scr-range="wave"]'); return JSON.stringify({ view: fe.bp, rows: s.rows[fe.bp], me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')], block: r(el.closest('.fe-block').getBoundingClientRect().height), line: r(el.querySelector('.marquee').getBoundingClientRect().height), wave: range && range.getBoundingClientRect().width > 0 ? range.value : null });`);
  const same = (what, read) => {
    const o = read.layout, w = ours(), me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me), phoneView = w.view === 'mobile';
    const ok = w.me[0] === me.desktop && w.me[1] === me.phone && w.other[0] === other.desktop && w.other[1] === other.phone && (!phoneView || w.rows === o.rows) && near1(w.block, o.block) && near1(w.line, o.marquee[1]) && (!read.wave || w.wave === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, me: [me.desktop, me.phone], other: [other.desktop, other.phone], block: o.block, line: o.marquee[1], wave: read.wave?.[0] ?? null })})`);
  };
  // The phone button and the dotted label, as the oracle's marks read: no button on the desktop (the next button there is
  // Text Style's menu), and the tabs.
  const marks = (what, m) => {
    const w = qs(`const b = document.querySelector('#block-panel [data-phone-btn]'), l = [...document.querySelectorAll('#block-panel .sp-label')].find((e) => e.textContent.trim() === 'Wave Intensity'), c = l && getComputedStyle(l); return JSON.stringify({ button: b ? (b.disabled ? 'off' : 'on') : 'none', dotted: !!c && c.textDecorationLine === 'underline' && c.textDecorationStyle === 'dotted', tabs: [...document.querySelectorAll('#block-panel [data-btab]')].map((e) => e.textContent.trim()) });`);
    const want = { button: m.afterBtn?.label === '' ? (m.afterBtn.disabled ? 'off' : 'on') : 'none', dotted: m.leaves['Wave Intensity'] === 'underline dotted', tabs: m.tabs };
    add(what, JSON.stringify(w) === JSON.stringify(want), `${JSON.stringify(w)} (oracle ${JSON.stringify(want)})`);
  };
  for (const [P, steps] of Object.entries(PLANS)) {
    build(P);
    const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks.find((b) => b.type === 'scrolling').id]);`);
    const done = [];
    for (const st of steps) {
      if (st === 'mobile' || st === 'desktop') qs(`fe.setBp(${JSON.stringify(st)}); await sleep(800); return 'true';`);
      else if (st === 'open') {
        qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
        await press('#block-panel [data-btab="Design"]');
      } else if (st === 'go') qs(`fe.select(null); await sleep(300); return 'true';`);
      else if (st === 'marks') { marks(`Views ${P}: ${done.join('>')}, the phone button and label`, OV[`R2 ${P} ${done.join('>')} marks`].marks); continue; }
      else { await press('#block-panel [data-scr-range="wave"]', Math.min(0.995, st / 180)); await pause(300); }
      done.push(String(st));
      same(`Views ${P}: ${done.join('>')}`, OV[`R2 ${P} ${done.join('>')}`]);
    }
    qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
  }
}
