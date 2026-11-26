// scrolling-check's rows for a Wave Intensity drag's undo steps (CAP-T12WAVEDRAG.json, R3; R2 read alike). A Scrolling block
// with a Text block under it, made on the desktop as the oracle's (N: the Scrolling block alone, on the desktop); in the
// phone view 90 pressed, then a real drag whose values come a set time apart, let go on the last one; then Escape and Cmd+Z
// step by step. Values 300 or 700 ms apart are one step (P, G), 1100 or 1500 ms apart one step each (H, S, C), also with the
// pointer moving between them (J); a drag out and back let go on its start takes a step too (B, C, D, N), though no change
// fires. D, on the desktop: the Text block under it follows the foot down and stays as it falls. C and B, in the phone
// view: each value takes the fall rule as it goes (h and i below); Cmd+Z back to C's step at 150 on the way back gives
// 1/2/7/10, as a Cmd+Z that raises the wave refits (CAP-T12BELOW g). Each row
// checks the blocks' areas in both views, the Scrolling block's line and the section's rows in the view shown, and Undo and
// Redo (a blank section added after the build leaves one step under the plan's, as the oracle's block adds do). The drag's
// moves go through one DevTools session, so the time between two values is the gap asked for, not a process start.
// X is C by touch, ended by a pointercancel (touchCancel; no change fires): not read on the oracle, it is held to C's reads,
// as a drag ended by a pointerup. Y is S the same way, let go away from its start, held to S's reads.
// s, t and u (CAP-T12DRAGAGAIN.json), on the desktop: out to 180, back to 90 and out again; the growth takes down only a
// block the new foot reaches, so u's Text block, left two rows under the foot by the way back, stays as it grows again.
// E and F (CAP-T12DRAGEND.json), in the phone view: Escape while B's drag is still held ends it as its let go does (one step,
// the fall's rows kept); a slow drag out to 180 and back to 120, let go there, then Cmd+Z one value a step.
// K, on the desktop: D's drag let go on its start (no change fires), then one ArrowRight with no press: the range kept the
// focus, so the key steps the value and the blocks stay. T is K by touch, ended by a pointercancel (not read; K's reads).
// h and i (CAP-T12HELD.json H and I), in the phone view: B's drag and F's slow one with a row while held after each move (read
// in the drag's own DevTools session), as the oracle's: each value takes the press rules' rows as it goes, the fall's too.
// E's row held before the Escape is the same rule.
// Q and R, in the phone view: P with a second pointer pressed and lifted (Q) or cancelled (R) mid-drag; only the holding
// pointer lets the drag go (not read; P's reads). V and A: that pointer down first; V lifts it mid-drag (P's reads), A after
// the go (B's reads).
// zd and zp (CAP-T12HELD.json U and V), on the desktop and in the phone view: 90 pressed, a drag 90>120>150 held, a real Cmd+Z while it is
// held: it takes back the drag so far, not the press (the value back at 90, Undo and Redo on); the let go takes no step.
import { readFileSync } from 'node:fs';

const OD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEDRAG.json', import.meta.url))).runs.R3.reads;
const OA = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12DRAGAGAIN.json', import.meta.url))).runs.R2.reads;
const OE = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12DRAGEND.json', import.meta.url))).runs.R2.reads;
const HELD = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12HELD.json', import.meta.url))).runs.R2, OH = HELD.reads;
const OBO = [90, 120, 150, 180, 150, 120, 90, 120, 150, 180];
const PLANS = {
  P: { phone: true, vals: [90, 120, 150, 180], gap: 300, name: 'out 300', z: 2 },
  G: { phone: true, vals: [90, 120, 150, 180], gap: 700, name: 'out 700', z: 2 },
  H: { phone: true, vals: [90, 120, 150, 180], gap: 1100, name: 'out 1100', z: 2 },
  S: { phone: true, vals: [90, 120, 150, 180], gap: 1500, name: 'out 1500', z: 4 },
  B: { phone: true, vals: [90, 120, 150, 180, 150, 120, 90], gap: 300, name: 'back 300', z: 2 },
  J: { phone: true, vals: [90, 120, 150, 180], gap: 1500, name: 'jiggle 1500', z: 4, jiggle: 300 },
  N: { phone: false, vals: [90, 120, 150, 180, 150, 120, 90], gap: 300, name: 'back 300', z: 1, alone: true },
  D: { phone: false, vals: [90, 120, 150, 180, 150, 120, 90], gap: 300, name: 'back 300', z: 2 },
  C: { phone: true, vals: [90, 120, 150, 180, 150, 120, 90], gap: 1500, name: 'back 1500', z: 7 },
  X: { phone: true, vals: [90, 120, 150, 180, 150, 120, 90], gap: 1500, name: 'back 1500', z: 7, od: 'C', cancel: true },
  Y: { phone: true, vals: [90, 120, 150, 180], gap: 1500, name: 'out 1500', z: 4, od: 'S', cancel: true },
  // CAP-T12DRAGAGAIN.json (R2; R1 read alike): on the desktop out to 180, back to 90 and out again to 180 (s) or 150 (t);
  // u as s with the Text block a row lower first (pre: the arrow keys that put it there, as the oracle's read names them).
  s: { phone: false, vals: OBO, gap: 300, name: 'out back out', z: 2, again: true },
  t: { phone: false, vals: OBO.slice(0, -1), gap: 300, name: 'out back part', z: 2, again: true },
  u: { phone: false, vals: OBO, gap: 300, name: 'out back out', z: 2, again: true, pre: 'arr ArrowDown ArrowDown ArrowDown>' },
  // CAP-T12DRAGEND.json (R2; R1 read alike), in the phone view: E as B with a real Escape while the pointer is still held, a
  // row after the Escape, then the let go; F 90 out to 180 and back to 120 at 1500 ms, let go on 120.
  E: { phone: true, vals: OBO.slice(0, 7), gap: 300, name: 'esc 90>180>90', z: 2, end: true, escape: true },
  F: { phone: true, vals: OBO.slice(0, 6), gap: 1500, name: '90>180>120', z: 6, end: true },
  // K, on the desktop: as D, then one real ArrowRight with no press first. The range kept the focus through the let go (no
  // change fires), so the key steps Wave Intensity to 120 and the blocks stay.
  K: { phone: false, vals: OBO.slice(0, 7), gap: 300, name: '90>180>90', z: 3, end: true, key: 'ArrowRight' },
  // T is K by touch, ended by a pointercancel: not read on the oracle, held to K's reads, as X to C's.
  T: { phone: false, vals: OBO.slice(0, 7), gap: 300, name: '90>180>90', z: 3, end: true, key: 'ArrowRight', od: 'K', cancel: true },
  // CAP-T12HELD.json (R2; R1 read alike), in the phone view: h is B and i is F, with a row held at each offset (ms) after
  // each move (each) and after the last (end). The oracle's rows were read in the drag's own DevTools session.
  h: { phone: true, vals: OBO.slice(0, 7), gap: 300, name: 'back 300 held', z: 2, od: 'H', held: { each: [80], end: [80, 400, 1200, 2500] } },
  i: { phone: true, vals: OBO.slice(0, 6), gap: 1500, name: '90>180>120 1500 held', z: 6, od: 'I', held: { each: [80, 1200], end: [80, 1200] } },
  // Q and R are P with a second pointer (pointerId 2, dispatched pointer events) pressed and lifted (Q) or cancelled (R)
  // between 150 and 180 while the mouse still holds the range: not read on the oracle, held to P's reads. Only the pointer
  // that pressed the range lets the drag go, so it stays one step.
  Q: { phone: true, vals: [90, 120, 150, 180], gap: 300, name: 'out 300', z: 2, od: 'P', second: 'pointerup' },
  R: { phone: true, vals: [90, 120, 150, 180], gap: 300, name: 'out 300', z: 2, od: 'P', second: 'pointercancel' },
  // V and A: the second pointer goes down first, before the mouse presses the range. V: it lifts between 150 and 180, P's
  // reads. A: it stays down through the let go and lifts after the go, B's reads (the let go still takes its step).
  V: { phone: true, vals: [90, 120, 150, 180], gap: 300, name: 'out 300', z: 2, od: 'P', first: 'mid' },
  A: { phone: true, vals: [90, 120, 150, 180, 150, 120, 90], gap: 300, name: 'back 300', z: 2, od: 'B', first: 'go' },
  // zd (U), zp (V): a real Cmd+Z gap ms after the last move, the pointer still held; rows held before it and 80 and 800 ms after it.
  zd: { phone: false, vals: [90, 120, 150], gap: 300, name: 'z 90>150', z: 1, od: 'U', undoHeld: true },
  zp: { phone: true, vals: [90, 120, 150], gap: 300, name: 'z 90>150', z: 1, od: 'V', undoHeld: true },
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

export async function dragRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // The oracle's read for plan P at step k: CAP-T12WAVEDRAG's, or CAP-T12DRAGAGAIN's after the plan's arrangement.
  const read = (P, k) => (PLANS[P].held || PLANS[P].undoHeld ? OH[`R2 ${PLANS[P].od} ${k.replace(/>z/g, '>Z')}`] : PLANS[P].end ? OE[`R2 ${PLANS[P].od || P} ${k.replace(/>z/g, '>Z')}`] : PLANS[P].again ? OA[`R2 ${P} ${PLANS[P].pre || ''}${k}`] : OD[`R3 ${PLANS[P].od || P} ${k}`]);
  const build = (P) => {
    const o = (PLANS[P].again ? read(P, 'open') : read(P, 'default')).layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: 4 }, blocks: [me, other].filter(Boolean).map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}, text = ${!PLANS[P].alone}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); if (text) { fe.addBlock(s.id, 'Text', true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.addSection(); await sleep(300); return 'true';`);
  };
  const OURS = `const s = fe.model.sections[0], a = s.blocks.find((b) => b.type === 'scrolling'), t = s.blocks.find((b) => b !== a), d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + a.id), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ view: fe.bp, rows: s.rows[fe.bp], me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: t ? [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')] : null, line: r(el.querySelector('.marquee').getBoundingClientRect().height), undo: [!document.getElementById('undo').disabled, !document.getElementById('redo').disabled], sel: [a, t].map((b) => (b ? d.querySelector('.fe-block[data-block-id="' + b.id + '"]')?.dataset.isSelected === 'true' : null)), wave: (() => { const p = document.getElementById('block-panel'), w = p.querySelector('[data-scr-range="wave"]'); return !p.hidden && w ? w.value : null; })() });`;
  const ours = () => qs(OURS);
  // picked: the row also holds the selection (each block's sel) and the panel (its Wave Intensity value, null when closed)
  // to the read, as E's escape held row: the oracle reads the block let go and the panel closed there.
  // w: ours read already (the held rows read it in the drag's own session).
  const same = (what, read, picked = false, w = ours()) => {
    const o = read.layout, me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me), two = (b) => (b ? [b.desktop, b.phone].join() : null);
    const areas = two({ desktop: w.me[0], phone: w.me[1] }) === two(me) && (w.other ? two({ desktop: w.other[0], phone: w.other[1] }) : null) === two(other) && w.rows === o.rows;
    const sel = [me.sel, other ? other.sel : null], wave = read.wave ? read.wave[0] : null;
    // A read taken in the drag's session also holds the range's value (zd, zp).
    const ok = areas && near1(w.line, o.marquee[1]) && w.undo[0] === o.undo[0] && w.undo[1] === o.undo[1] && (!picked || (w.sel[0] === sel[0] && w.sel[1] === sel[1] && w.wave === wave))
      && (read.value == null || w.wave === read.value);
    add(what, ok, `${JSON.stringify(picked || read.value != null ? w : { ...w, sel: undefined, wave: undefined })} (oracle ${JSON.stringify({ rows: o.rows, me: [me.desktop, me.phone], other: other ? [other.desktop, other.phone] : null, line: o.marquee[1], undo: o.undo, ...(picked ? { sel, wave } : {}), ...(read.value != null ? { wave: read.value } : {}) })})`);
  };
  const rangeX = (v) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${Math.min(0.995, Math.max(0.005, v / 180))}, r.top + r.height / 2]);`);
  for (const [P, p] of Object.entries(PLANS)) {
    build(P);
    if (p.phone) qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks.find((b) => b.type === 'scrolling').id]);`);
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
    let k = `${p.phone ? 'mobile>' : ''}open>90`;
    await press('#block-panel [data-scr-range="wave"]', 0.5); await pause(300);
    same(`Drag ${P}: ${k}`, read(P, k));
    // The drag: a press on the range at its first value, a move to each next value gap ms apart, let go gap ms after the last.
    const xs = p.vals.map((v) => rangeX(v)), y = xs[0][1], c = await session(S);
    // X: the same by touch, and a touchCancel (a pointercancel, no pointerup) in place of the let go.
    const touch = (type, i) => c.send('Input.dispatchTouchEvent', { type, touchPoints: i == null ? [] : [{ x: xs[i][0], y }] });
    // Q, R, V, A: a second pointer (pointerId 2) by dispatched pointer events. Q and R: its down and its end a third and two
    // thirds into the wait before the last value; V: down before the press, lifted halfway into that wait; A: lifted after the go.
    const other = (type) => c.send('Runtime.evaluate', { expression: `document.body.dispatchEvent(new PointerEvent('${type}', { pointerId: 2, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true, clientX: 10, clientY: 10 })), 'ok'` });
    try {
      // h, i: a row held at each offset after each move, read through the drag's own session as the oracle's was.
      const states = p.held || p.undoHeld ? Object.fromEntries(HELD.inputs[`R2 ${p.od} ${k}>drag ${p.name}`].states) : null;
      const oursIn = async () => JSON.parse((await c.send('Runtime.evaluate', { expression: `(async () => { ${OURS} })()`, awaitPromise: true, returnByValue: true })).result.result.value);
      if (p.undoHeld) {
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 1; i < xs.length; i++) { await sleep(p.gap); await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 }); }
        await sleep(p.gap);
        const row = async (n) => same(`Drag ${P}: ${k}>drag ${p.name} ${n}`, { layout: states[n].L, value: states[n].st.value }, false, await oursIn());
        await row('held');
        const Z = { key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 4 };
        await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...Z, commands: ['undo'] });
        await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...Z });
        await sleep(80); await row('cmd+z held +80');
        await sleep(720); await row('cmd+z held +800');
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xs.at(-1)[0], y, button: 'left', buttons: 0, clickCount: 1 });
        await sleep(80); await row('up +80');
      } else if (p.held) {
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        await sleep(p.gap);
        for (let i = 1; i < xs.length; i++) {
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 });
          let t = 0;
          for (const o of i === xs.length - 1 ? p.held.end : p.held.each) {
            await sleep(o - t); t = o;
            const n = `held ${i} ${p.vals[i]} +${o}`;
            same(`Drag ${P}: ${k}>drag ${p.name} ${n}`, { layout: states[n].L }, false, await oursIn());
          }
          if (i < xs.length - 1) await sleep(Math.max(0, p.gap - t));
        }
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xs.at(-1)[0], y, button: 'left', buttons: 0, clickCount: 1 });
      } else if (p.cancel) {
        await touch('touchStart', 0);
        for (let i = 1; i < xs.length; i++) { await sleep(p.gap); await touch('touchMove', i); }
        await sleep(p.gap);
        await touch('touchCancel');
      } else {
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        if (p.first) { await other('pointerdown'); await sleep(100); }
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        // J: between two values the pointer moves 3 px either way every jiggle ms, the value staying.
        const wait = async (x, i) => { if (p.second && i === xs.length - 1) { await sleep(p.gap / 3); await other('pointerdown'); await sleep(p.gap / 3); await other(p.second); return sleep(p.gap / 3); } if (p.first === 'mid' && i === xs.length - 1) { await sleep(p.gap / 2); await other('pointerup'); return sleep(p.gap / 2); } if (!p.jiggle) return sleep(p.gap); for (let t = p.jiggle, n = 0; t <= p.gap; t += p.jiggle, n++) { await sleep(p.jiggle); await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + (n % 2 ? -3 : 3), y, button: 'left', buttons: 1 }); } };
        for (let i = 1; i < xs.length; i++) { await wait(xs[i - 1][0], i); await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 }); }
        await wait(xs.at(-1)[0]);
        // E: a row held gap ms after the last move, then a real Escape, the pointer still held, and a row after it that also
        // holds the selection and the panel (the oracle's: nothing selected, the panel closed).
        if (p.escape) {
          same(`Drag ${P}: ${k}>drag ${p.name} held`, read(P, `${k}>drag ${p.name} held`));
          await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
          await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
          await sleep(800);
          same(`Drag ${P}: ${k}>drag ${p.name} escape held`, read(P, `${k}>drag ${p.name} escape held`), true);
        }
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xs.at(-1)[0], y, button: 'left', buttons: 0, clickCount: 1 });
      }
    } finally { c.close(); }
    await pause(600);
    k += `>drag ${p.name}`;
    same(`Drag ${P}: ${k}`, read(P, k));
    if (p.key) { browser(S, 'press', p.key); await pause(1200); k += `>${p.key} x1 1200`; same(`Drag ${P}: ${k}`, read(P, k)); }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    k += '>go';
    same(`Drag ${P}: ${k}`, read(P, k));
    if (p.first === 'go') qs(`document.body.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true, clientX: 10, clientY: 10 })); await sleep(300); return 'true';`);
    for (let i = 0; i < p.z; i++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z';
      same(`Drag ${P}: ${k}`, read(P, k));
    }
    qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
  }
}
