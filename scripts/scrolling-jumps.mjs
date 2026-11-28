// scrolling-check's rows for which blocks follow a Scrolling block's foot on the desktop when its Wave Intensity falls by
// two steps or more, by a press or by a drag that jumps there in one move (CAP-T12DRAGJUMP.json, R2; R1 read alike), and as
// it grows past rows made by hand (CAP-T12GROWSHORT.json, R2; R1 read alike). One new section per plan, as the oracle's
// section was at the plan's last 'open' read: the Scrolling block and a Text block or two, their desktop and phone areas,
// the section's rows and the Scrolling block's Wave Intensity. Then Edit, Design, the plan's steps (a number is a press on
// Wave Intensity; a drag moves the pointer one value at a time, 300 ms apart, with a row 80 ms after each move, read in the
// drag's own DevTools session as the oracle's were), a let go, and each Cmd+Z the oracle's section had to take back, a row
// after each. Each row checks every block's desktop and phone areas, the section's rows, the line and Undo and Redo.
// J plans, the first Text block as added (1/2/3/10, under the foot at 3/2/5/10 after 90) and the second at 8/2/10/10: a block
// that starts above the old foot stays while it starts on or above the new foot, and goes up by the fall once the new foot
// is above its top, by a press or a drag alike. JA a drag 90 out to 180 and back to 90 in one move (the first Text block
// from 5/2/7/10 to 2/2/4/10); JB back to 120 in one move (it stays) and out to 180 again; JD 90 out to 150 and back to 90 in
// one move (it stays at 4/2/6/10); JE presses 90, 180, 120 (it stays); JF 90, 180, 90 (it goes up). JH and JI: after 180
// the first Text block placed at 3/2/5/10 (JH, a press on 90: it stays) or 6/2/8/10 (JI, a press on 120: it goes up to
// 4/2/6/10); JJ is JI by a drag 180 to 120 in one move. G plans, the Scrolling block made 1/2/5/26 by hand and a Text block
// that ends above its foot (Ga as added, 1/2/3/10; Gb and Gc at 2/2/4/10): it stays as 180 (a press; Gc a drag from 0)
// takes the Scrolling block to 1/2/7/26. No Cmd+Z rows for G: the oracle's first gives 1/2/2/26 (task-b4fedc8255866002).
// JC (a drag 180 to 0 in one move) and JG (presses 90, 180, 0): the first Text block lands on the foot and the second goes up
// by the first's move, not by the foot's. K1 and K2 (CAP-T12FALLZERO.json, R2; R1 read alike), as JG with the second Text
// block in other columns (K1, placed at 8/14/10/20) or a third one under it (K2, 11/2/13/10): every block goes up by the
// first's move.
// M plans (CAP-T12RANGEKEYS.json, R2; R1 read alike), JG's layout: a key on the range moves it at once and the blocks as a
// press there: M1 Home from 180 (to 0, as JG), M2 End from 90 (to 180), M3 PageDown from 180 (150, one step: the first Text
// block stays on the new foot), M4 PageUp from 90 (120: no area moves). The key's rows also check the range's value, its
// focus and Undo and Redo 60 ms and 1.2 s after it, read in the key's own DevTools session. N plans (CAP-T12SIZEFALL.json,
// R2; R1 read alike): Text Size Medium to Small with a Text block placed at 2/2/12/10, between the top and the new foot: it
// stays as the foot comes up (N4 at Wave 0 to 1/2/2/26, N5 at 30 and N6 at 60 to 1/2/3/26). Each N plan starts from the
// section as added: real presses on Wave Intensity (N5 30, N6 60) and on Medium, a row after each, go, then the Text block
// placed in the model. L plans (CAP-T12HANDFALL.json, R2; R1 read alike): a one-step fall, 180 to 150, on the Scrolling block
// made 1/2/12/26 by hand (its line needs 1/2/7/26) takes one row, to 1/2/11/26, and a Text block placed at 8/2/13/10 (L1),
// 8/2/12/10 (L2) or 6/2/12/10 (L3) stays.
// A and B plans (CAP-T12HANDSTEPS.json, R2; R1 read alike): L's block made 1/2/12/26 by hand at 180, then 180 down to 0 one
// step at a time: a drag one value at a time (A1, B1), six ArrowLeft keys 1.2 s apart (A2, B2; a row 60 ms and 1.2 s after
// each, read in the keys' own DevTools session), six presses (A3) or one press (A4). Each step takes one row, to 1/2/6/26,
// where one press 180 to 0 leaves 1/2/7/26. A has the Text block in other columns (1/14/3/20); B has it at 8/2/13/10: it
// stays until the foot is above its top, then goes up with it, to 6/2/11/10.
// D plans (CAP-T12DRAGKEPT.json, R2; R1 read alike): a drag that falls two steps or more in one move keeps a 2-row block's
// rows as presses do (CAP-T12SHORT H): D1 150, 60, a drag 60 to 0 (1/2/3/26 stays, the Text block at 3/2/5/10); D2 the same
// with a second Scrolling block (the phone stack turns, the second first, already while held); D3 150, a drag 150 to 60 to
// 0. No Cmd+Z rows: a drag's gives back other areas. D2 and D3 have no 'open' row (noOpen): in the oracle's session the
// Cmd+Z of the plan before them left Redo on there.
// Y plans (CAP-T12PHONESHARE.json, R2; R1 read alike), in the phone view, built there: two Text blocks under the Scrolling
// block, the first one row up (Y1, Y3, Y4: 2/2/4/10) or on the top row made 1/2/3/6 with the second at 5/6/7/10 (Y2). When
// the fall takes the first onto the foot, the second goes up by its move, not by the foot's: Y1 and Y2 150 then 0, Y3 90,
// 180, 0, Y4 90 and a drag 90 out to 180 and 180 to 0 in one move. Each row checks the phone rows and areas.
import { readFileSync } from 'node:fs';

const runs = (f) => JSON.parse(readFileSync(new URL(`../parity/findings/${f}.json`, import.meta.url))).runs.R2;
const STEPS = runs('CAP-T12HANDSTEPS');
const JUMP = runs('CAP-T12DRAGJUMP'), GROW = runs('CAP-T12GROWSHORT'), ZERO = runs('CAP-T12FALLZERO'), KEYS = runs('CAP-T12RANGEKEYS'), SIZE = runs('CAP-T12SIZEFALL'), HAND = runs('CAP-T12HANDFALL'), KEPT = runs('CAP-T12DRAGKEPT'), SHARE = runs('CAP-T12PHONESHARE');
const OUT = [90, 120, 150, 180];
const R0 = [0, 30, 60, 90, 120, 150, 180];
// pre: the oracle's steps before the last 'open'; wave: the Wave Intensity the build sets (there, or with first at the first
// 'open'); steps: a press value or [drag name, values].
const J = 'place 2 8/2/10/10>';
const L = (t) => `open>180>go>place 0 1/2/12/26>place 1 ${t}>`;
const KC = { PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37 };
const PLANS = {
  JA: { pre: J, wave: 0, steps: [90, ['jump 180>90', [...OUT, 90]]], z: 2 },
  JB: { pre: J, wave: 0, steps: [90, ['jump 180>120 out', [...OUT, 120, 180]]], z: 2 },
  JD: { pre: J, wave: 0, steps: [90, ['jump 150>90', [90, 120, 150, 90]]], z: 2 },
  JC: { pre: J, wave: 0, steps: [90, ['jump 180>0', [...OUT, 0]]], z: 2 },
  JE: { pre: J, wave: 0, steps: [90, 180, 120], z: 3 },
  JG: { pre: J, wave: 0, steps: [90, 180, 0], z: 3 },
  JF: { pre: J, wave: 0, steps: [90, 180, 90], z: 3 },
  JH: { pre: `${J}open>180>go>place 1 3/2/5/10>`, wave: 180, steps: [90], z: 1 },
  JI: { pre: `${J}open>180>go>place 1 6/2/8/10>`, wave: 180, steps: [120], z: 1 },
  JJ: { pre: `${J}open>180>go>place 1 6/2/8/10>`, wave: 180, steps: [['jump 180>120', [180, 120]]], z: 1 },
  Ga: { pre: 'place 0 1/2/5/26>', wave: 0, steps: [180], z: 0, grow: true },
  Gb: { pre: 'place 0 1/2/5/26>place 1 2/2/4/10>', wave: 0, steps: [180], z: 0, grow: true },
  Gc: { pre: 'place 0 1/2/5/26>place 1 2/2/4/10>', wave: 0, steps: [['out 0>180', R0]], z: 0, grow: true },
  K1: { pre: 'place 2 8/14/10/20>', wave: 0, steps: [90, 180, 0], z: 3, src: ZERO },
  K2: { pre: 'place 2 8/2/10/10>place 3 11/2/13/10>', wave: 0, steps: [90, 180, 0], z: 3, src: ZERO },
  M1: { pre: J, wave: 0, steps: [180, ['key', 'Home']], z: 2, src: KEYS },
  M2: { pre: J, wave: 0, steps: [90, ['key', 'End']], z: 2, src: KEYS },
  M3: { pre: J, wave: 0, steps: [180, ['key', 'PageDown']], z: 2, src: KEYS },
  M4: { pre: J, wave: 0, steps: [90, ['key', 'PageUp']], z: 2, src: KEYS },
  // first: the presses from the section as added (its first 'open' read) before the place; place: [block, desktop area].
  N4: { pre: 'open>Medium text size>go>place 1 2/2/12/10>', first: ['Medium text size'], place: [1, '2/2/12/10'], wave: 0, steps: ['Small text size'], z: 1, src: SIZE },
  N5: { pre: 'open>30>Medium text size>go>place 1 2/2/12/10>', first: [30, 'Medium text size'], place: [1, '2/2/12/10'], wave: 0, steps: ['Small text size'], z: 1, src: SIZE },
  N6: { pre: 'open>60>Medium text size>go>place 1 2/2/12/10>', first: [60, 'Medium text size'], place: [1, '2/2/12/10'], wave: 0, steps: ['Small text size'], z: 1, src: SIZE },
  L1: { pre: L('8/2/13/10'), wave: 180, steps: [150], z: 1, src: HAND },
  L2: { pre: L('8/2/12/10'), wave: 180, steps: [150], z: 1, src: HAND },
  L3: { pre: L('6/2/12/10'), wave: 180, steps: [150], z: 1, src: HAND },
  A1: { pre: L('1/14/3/20'), wave: 180, steps: [['slow 180>0', [180, 150, 120, 90, 60, 30, 0]]], z: 1, src: STEPS },
  A2: { pre: L('1/14/3/20'), wave: 180, steps: [['keys', 'ArrowLeft', 6]], z: 6, src: STEPS },
  A3: { pre: L('1/14/3/20'), wave: 180, steps: [150, 120, 90, 60, 30, 0], z: 6, src: STEPS },
  A4: { pre: L('1/14/3/20'), wave: 180, steps: [0], z: 1, src: STEPS },
  B1: { pre: L('8/2/13/10'), wave: 180, steps: [['slow 180>0', [180, 150, 120, 90, 60, 30, 0]]], z: 1, src: STEPS },
  B2: { pre: L('8/2/13/10'), wave: 180, steps: [['keys', 'ArrowLeft', 6]], z: 6, src: STEPS },
  D1: { pre: '', wave: 0, steps: [150, 60, ['jump 60>0', [60, 0]]], z: 0, src: KEPT },
  D2: { pre: '', wave: 0, steps: [150, 60, ['jump 60>0', [60, 0]]], z: 0, src: KEPT, second: 'Scrolling', noOpen: true },
  D3: { pre: '', wave: 0, steps: [150, ['jump 150>60>0', [150, 60, 0]]], z: 0, src: KEPT, noOpen: true },
  // Y plans, in the phone view (CAP-T12PHONESHARE.json, R2; R1 read alike): the blocks under one that lands on the foot go up
  // by its move, as on the desktop.
  Y1: { pre: 'mobile>arr ArrowUp>', wave: 0, steps: [150, 0], z: 2, src: SHARE, phone: true },
  Y2: { pre: 'mobile>arr ArrowUp ArrowUp>place 1 1/2/3/6>place 2 5/2/7/6>place 2 5/6/7/10>', wave: 0, steps: [150, 0], z: 2, src: SHARE, phone: true },
  Y3: { pre: 'mobile>arr ArrowUp>', wave: 0, steps: [90, 180, 0], z: 3, src: SHARE, phone: true },
  Y4: { pre: 'mobile>arr ArrowUp>', wave: 0, steps: [90, ['jump 180>0', [...OUT, 0]]], z: 2, src: SHARE, phone: true },
};

async function session(S) {
  const port = Number(S.split(':')[1]);
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { pending.get(x.id)(x); pending.delete(x.id); } };
  const send = (method, params) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  return { send, close: () => ws.close() };
}

export async function jumpRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const src = (p) => p.src || (p.grow ? GROW : JUMP);
  const read = (P, k) => src(PLANS[P]).reads[`R2 ${P} ${k}`];
  // The section as the oracle's last 'open' read found it (with first, its first: the section as added); a blank section
  // after it leaves one undo step under the plan's. With first, a second blank section undone after it turns Redo on, as the
  // oracle's first 'open' read has it.
  const build = (P) => {
    const p = PLANS[P], o = read(P, p.first ? 'open' : `${p.pre}open`).layout, me = o.all.find((b) => b.me), others = o.all.filter((b) => !b.me);
    // A phone plan's 'open' read has the phone rows; the desktop's are the section's as built.
    const rows = p.phone ? { desktop: read(P, 'default').layout.rows, mobile: o.rows } : { desktop: o.rows, mobile: 4 };
    const spec = JSON.stringify({ rows, wave: p.wave, redo: !!p.first, second: p.second || 'Text', blocks: [me, ...others].map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    return qs(`const W = ${spec}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); for (let k = 1; k < W.blocks.length; k++) { fe.addBlock(s.id, k === 1 ? W.second : 'Text', true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); if (W.wave) t.blocks[0].wave = W.wave; fe.load(m); await sleep(300); fe.addSection(); await sleep(300); if (W.redo) { fe.addSection(); await sleep(300); fe.undo(); await sleep(300); } return JSON.stringify(t.blocks.map((b) => b.id));`);
  };
  let ids = [];
  const OURS = () => `const s = fe.model.sections[0], bs = ${JSON.stringify(ids)}.map((id) => s.blocks.find((b) => b.id === id)), d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + bs[0].id), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ rows: s.rows[fe.bp], areas: bs.map((b) => b.layout.desktop.area.join('/') + '|' + b.layout.mobile.area.join('/')), line: r(el.querySelector('.marquee').getBoundingClientRect().height), undo: [!document.getElementById('undo').disabled, !document.getElementById('redo').disabled], wave: (() => { const p = document.getElementById('block-panel'), w = p.querySelector('[data-scr-range="wave"]'); return !p.hidden && w ? w.value : null; })() });`;
  const ours = () => qs(OURS());
  // Every block's areas in the order added, the section's rows, the line, Undo and Redo; on a step row the panel's value too.
  const same = (what, read, w = ours()) => {
    const o = read.layout, me = o.all.find((b) => b.me), want = [me, ...o.all.filter((b) => !b.me)].map((b) => `${b.desktop}|${b.phone}`);
    const wave = read.wave ? read.wave[0] : null;
    const ok = JSON.stringify(w.areas) === JSON.stringify(want) && w.rows === o.rows && near1(w.line, o.marquee[1]) && w.undo[0] === o.undo[0] && w.undo[1] === o.undo[1] && (wave == null || w.wave === wave);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, areas: want, line: o.marquee[1], undo: o.undo, wave })})`);
  };
  const rangeX = (v) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${Math.min(0.995, Math.max(0.005, v / 180))}, r.top + r.height / 2]);`);
  // A press on Wave Intensity at a value, or on a Text Size button by its name, and a row after it.
  const step = async (P, k, v) => {
    if (typeof v === 'number') await press('#block-panel [data-scr-range="wave"]', v === 0 ? 0.005 : Math.min(0.995, v / 180));
    else await press(`#block-panel [aria-label="${v}"]`);
    await pause(1300);
    same(`Jump ${P}: ${k}>${v}`, read(P, `${k}>${v}`));
    return `${k}>${v}`;
  };
  for (const [P, p] of Object.entries(PLANS)) {
    ids = build(P);
    if (p.phone) qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    const sid = qs(`return JSON.stringify(fe.model.sections[0].id);`);
    const open = async () => {
      qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(ids[0])}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
      await press('#block-panel [data-btab="Design"]');
    };
    await open();
    if (p.first) {
      // From the section as added: the presses, a row after each, go, then the place (the block's desktop area, the section's
      // rows grown to hold it, a blank section after it as the build's), and Edit and Design again.
      let f = 'open';
      same(`Jump ${P}: ${f}`, read(P, f));
      for (const v of p.first) f = await step(P, f, v);
      qs(`fe.select(null); await sleep(300); return 'true';`);
      f += '>go'; same(`Jump ${P}: ${f}`, read(P, f));
      const [n, at] = p.place;
      qs(`const m = JSON.parse(JSON.stringify(fe.model)); m.sections = [m.sections[0]]; const t = m.sections[0], b = t.blocks.find((x) => x.id === ${JSON.stringify(ids[n])}), a = ${JSON.stringify(area(at))}; b.layout.desktop.area = a; t.rows = { ...t.rows, desktop: Math.max(t.rows.desktop, a[2] - 1) }; fe.load(m); await sleep(300); fe.addSection(); await sleep(300); return 'true';`);
      f += `>place ${n} ${at}`; same(`Jump ${P}: ${f}`, read(P, f));
      await open();
    }
    let k = `${p.pre}open`;
    if (!p.noOpen) same(`Jump ${P}: ${k}`, read(P, k));
    for (const v of p.steps) {
      if (typeof v !== 'object') { k = await step(P, k, v); continue; }
      // A key on the range: a press on its thumb at the value it shows, the key, the range's value, its focus and Undo and Redo
      // 1.2 s after the press, 60 ms after the key (the oracle's 'soon': the value has moved already) and 1.2 s after it, read
      // in one DevTools session as the oracle's were.
      if (v[0] === 'key') {
        const key = v[1], c = await session(S), [x, y] = rangeX(Number(ours().wave));
        const want = Object.fromEntries(src(p).keys[`R2 ${P} ${k}>${key} x1 1200`].states);
        const STATE = `(() => { const r = document.querySelector('#block-panel [data-scr-range="wave"]'); return JSON.stringify({ value: r.value, focus: document.activeElement === r, undo: [!document.getElementById('undo').disabled, !document.getElementById('redo').disabled] }); })()`;
        const st = async () => JSON.parse((await c.send('Runtime.evaluate', { expression: STATE, returnByValue: true })).result.result.value);
        const sameKey = (what, w, o) => add(what, w.value === o.value && w.focus === o.focus.isRange && w.undo.join() === o.undo.join(), `${JSON.stringify(w)} (oracle ${JSON.stringify({ value: o.value, focus: o.focus.isRange, undo: o.undo })})`);
        try {
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); await sleep(200);
          await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await sleep(80);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); await sleep(1200);
          sameKey(`Jump ${P}: ${k}, the thumb pressed`, await st(), want.pressed);
          await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: KC[key], nativeVirtualKeyCode: KC[key] });
          await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: KC[key], nativeVirtualKeyCode: KC[key] });
          await sleep(60);
          sameKey(`Jump ${P}: ${k}, ${key} soon`, await st(), want[`${key} 1 soon`]);
          await sleep(1140);
          sameKey(`Jump ${P}: ${k}, ${key}`, await st(), want[`${key} 1`]);
        } finally { c.close(); }
        k += `>${key} x1 1200`; same(`Jump ${P}: ${k}`, read(P, k));
        continue;
      }
      // Keys on the range (A2, B2): a press on its thumb at the value it shows, then n keys 1.2 s apart, a row 60 ms and 1.2 s
      // after each (areas, rows, line, Undo and Redo, the range's value), read in one DevTools session as the oracle's were.
      if (v[0] === 'keys') {
        const [, key, n] = v, c = await session(S), [x, y] = rangeX(Number(ours().wave));
        const want = Object.fromEntries(src(p).keys[`R2 ${P} ${k}>${key} x${n} 1200`].states);
        const oursIn = async () => JSON.parse((await c.send('Runtime.evaluate', { expression: `(async () => { ${OURS()} })()`, awaitPromise: true, returnByValue: true })).result.result.value);
        const as = (q) => ({ layout: q.L, wave: [q.st.value] });
        try {
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); await sleep(200);
          await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await sleep(80);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); await sleep(1200);
          same(`Jump ${P}: ${k}, the thumb pressed`, as(want.pressed), await oursIn());
          for (let i = 1; i <= n; i++) {
            await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: KC[key], nativeVirtualKeyCode: KC[key] });
            await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: KC[key], nativeVirtualKeyCode: KC[key] });
            await sleep(60);
            same(`Jump ${P}: ${k}, ${key} ${i} soon`, as(want[`${key} ${i} soon`]), await oursIn());
            await sleep(1140);
            same(`Jump ${P}: ${k}, ${key} ${i}`, as(want[`${key} ${i}`]), await oursIn());
          }
        } finally { c.close(); }
        k += `>${key} x${n} 1200`; same(`Jump ${P}: ${k}`, read(P, k));
        continue;
      }
      // A drag: pressed on its first value, a move to each next 300 ms apart, a row 80 ms after each, let go right after the last row.
      const [name, vals] = v, xs = vals.map((x) => rangeX(x)), y = xs[0][1], c = await session(S);
      const states = Object.fromEntries(src(p).inputs[`R2 ${P} ${k}>drag ${name}`].states);
      const oursIn = async () => JSON.parse((await c.send('Runtime.evaluate', { expression: `(async () => { ${OURS()} })()`, awaitPromise: true, returnByValue: true })).result.result.value);
      try {
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        await sleep(300);
        for (let i = 1; i < xs.length; i++) {
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 });
          await sleep(80);
          const n = `held ${i} ${vals[i]} +80`;
          same(`Jump ${P}: ${k}>drag ${name} ${n}`, { layout: states[n].L }, await oursIn());
          if (i < xs.length - 1) await sleep(220);
        }
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xs.at(-1)[0], y, button: 'left', buttons: 0, clickCount: 1 });
      } finally { c.close(); }
      await pause(600);
      k += `>drag ${name}`; same(`Jump ${P}: ${k}`, read(P, k));
    }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    k += '>go'; same(`Jump ${P}: ${k}`, read(P, k));
    for (let i = 0; i < p.z; i++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>Z'; same(`Jump ${P}: ${k}`, read(P, k));
    }
  }
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
