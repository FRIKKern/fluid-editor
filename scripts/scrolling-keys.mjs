// scrolling-check's rows for arrow keys on Wave Intensity (CAP-T12WAVEKEYS.json, R2; R1 read alike). A Scrolling block with a
// Text block added after it, made on the desktop as the oracle's; Edit, Design, a press on Wave Intensity, a press
// on the range's thumb, then real arrow keys a set time apart through one DevTools session, Escape and Cmd+Z. A key row
// checks the range's value, that it has the focus, and Undo and Redo; a step row the Scrolling block's areas in both views
// and its line, the Text block's areas in both views, and with the panel open the block's wave. K: Right 3 times 1.2 s
// apart, then Left (a one-step fall that leaves the Text block, on the Scrolling block's rows, where it is); L: Right 3
// times about 0.2 s apart (one step); M: in the phone view, Right twice; R: 180, Right at the end (no step), Down twice.
// Jk, Lk and Mk (CAP-T12KEYJOIN.json J, L and M, R6; R5 read alike) and Nk (N, R8; R7 alike): a run of keys a set time
// apart, each with its own key and modifiers. Jk: from 0, Right then Left 300 ms apart (no row for the thumb press: the
// oracle's Undo and Redo there are the plan before's); Lk: 90, then the same (one step that ends on 90: the first Cmd+Z
// shows no change and turns Redo on); Mk: 90, Right, then Cmd+Z, Cmd+Shift+Z and Right 300 ms apart, the range keeping the
// focus; Nk: 90, then Right, Cmd+Z, Cmd+Shift+Z and Right 200 ms apart. In Mk and Nk the last key is a step of its own:
// Cmd+Z gives 120, then 90.
import { readFileSync } from 'node:fs';

const OK = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEKEYS.json', import.meta.url))).runs.R2;
const JOIN = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12KEYJOIN.json', import.meta.url))).runs;
const FRAME = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12FRAMEKEYS.json', import.meta.url))).runs.R2;
const CODE = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, z: 90 };
// Plan: the view, the press (none: from the value as added), then [key, times, gap ms, no thumb press first] for each run
// of keys, a seq of [key, modifiers (4 Meta, 8 Shift), gap ms] after them, and the Cmd+Z count. od: the finding's plan.
const PLANS = {
  K: { phone: false, press: 90, keys: [['ArrowRight', 3, 1200], ['ArrowLeft', 1, 1200, true]], z: 2 },
  L: { phone: false, press: 90, keys: [['ArrowRight', 3, 100]], z: 2 },
  M: { phone: true, press: 90, keys: [['ArrowRight', 2, 1200]], z: 2 },
  R: { phone: false, press: 180, keys: [['ArrowRight', 1, 1200], ['ArrowDown', 2, 1200, true]], z: 3 },
  Jk: { od: 'J', phone: false, press: null, keys: [], seq: { name: 'R L', noPressedRow: true, keys: [['ArrowRight', 0, 300], ['ArrowLeft', 0, 300]] }, z: 0 },
  Lk: { od: 'L', phone: false, press: 90, keys: [], seq: { name: 'R L', keys: [['ArrowRight', 0, 300], ['ArrowLeft', 0, 300]] }, z: 2 },
  Mk: { od: 'M', phone: false, press: 90, keys: [['ArrowRight', 1, 1200]], seq: { name: 'z Z R', noThumb: true, keys: [['z', 4, 300], ['z', 12, 300], ['ArrowRight', 0, 300]] }, z: 3 },
  // F1, F2 (CAP-T12FRAMEKEYS.json, R2; R1 read alike): 90, then the focus put in the page's frame (no thumb press, the panel
  // open) and one real ArrowRight (F1) or ArrowDown (F2): nothing moves, the value stays, the focus stays in the frame.
  F1: { frame: true, phone: false, press: 90, keys: [['ArrowRight', 1, 1200, true]], z: 1 },
  F2: { frame: true, phone: false, press: 90, keys: [['ArrowDown', 1, 1200, true]], z: 1 },
  Nk: { od: 'N', run: 'R8', phone: false, press: 90, keys: [], seq: { name: 'R z Z R', keys: [['ArrowRight', 0, 200], ['z', 4, 200], ['z', 12, 200], ['ArrowRight', 0, 200]] }, z: 3 },
};
// The finding and run a plan reads from: CAP-T12WAVEKEYS R2, or CAP-T12KEYJOIN (R6 unless the plan names its run) with od.
const src = (P) => { const p = PLANS[P], r = p.run || 'R6'; return p.od ? [JOIN[r], `${r} ${p.od}`] : [p.frame ? FRAME : OK, `R2 ${P}`]; };
const readOf = (P, k) => { const [f, t] = src(P); return f.reads[`${t} ${k}`]; };
const keysOf = (P, k) => { const [f, t] = src(P); return f.keys[`${t} ${k}`].states; };

async function session(S) {
  const port = Number(S.split(':')[1]);
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { pending.get(x.id)(x); pending.delete(x.id); } };
  const send = (method, params) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (js) => JSON.parse((await send('Runtime.evaluate', { expression: js, returnByValue: true })).result.result.value);
  return { send, ev, close: () => ws.close() };
}

export async function keyRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const build = (P) => {
    const o = readOf(P, 'default').layout, all = PLANS[P].alone ? o.all.filter((b) => b.me) : o.all, me = all.find((b) => b.me), other = all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: 4 }, blocks: [me, other].filter(Boolean).map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}, text = ${!PLANS[P].alone}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); if (text) { fe.addBlock(s.id, 'Text', true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); return 'true';`);
  };
  // The panel's range, the focus and Undo and Redo, as one expression for the DevTools session. inFrame: the tag of the
  // element focused inside the page's frame; with the frame focused, the oracle's is its BODY (CAP-T12FRAMEKEYS frameFocus).
  const STATE = `(() => { const r = document.querySelector('#block-panel [data-scr-range="wave"]'), u = document.getElementById('undo'), z = document.getElementById('redo'); return JSON.stringify({ value: r ? r.value : null, focus: !!r && document.activeElement === r, frame: document.activeElement === document.getElementById('site-frame'), inFrame: document.getElementById('site-frame').contentDocument.activeElement?.tagName ?? null, undo: [!!u && !u.disabled, !!z && !z.disabled] }); })()`;
  const ours = () => qs(`const s = fe.model.sections[0], a = s.blocks.find((b) => b.type === 'scrolling'), el = document.getElementById('site-frame').contentDocument.getElementById('block-' + a.id), r = (v) => Math.round(v * 10) / 10; const t = s.blocks.find((b) => b !== a); return JSON.stringify({ me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], text: t ? [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')] : null, line: r(el.querySelector('.marquee').getBoundingClientRect().height), wave: (fe.bp === 'mobile' ? a.waveMobile ?? a.wave : a.wave) ?? 0 });`);
  const same = (what, read) => {
    const o = read.layout, w = ours(), me = o.all.find((b) => b.me), t = o.all.find((b) => !b.me), text = t ? [t.desktop, t.phone] : null;
    const ok = w.me[0] === me.desktop && w.me[1] === me.phone && JSON.stringify(w.text) === JSON.stringify(text) && near1(w.line, o.marquee[1]) && (!read.wave || String(w.wave) === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ me: [me.desktop, me.phone], text, line: o.marquee[1], wave: read.wave?.[0] ?? null })})`);
  };
  const sameKey = (what, w, o) => add(what, w.value === o.value && w.focus === o.focus.isRange && (o.focus.tag !== 'IFRAME' || (w.frame && w.inFrame === o.focus.frameFocus.split('.')[0])) && w.undo[0] === o.undo[0] && w.undo[1] === o.undo[1], `${JSON.stringify(w)} (oracle ${JSON.stringify({ value: o.value, focus: o.focus.isRange, frame: o.focus.tag === 'IFRAME', inFrame: o.focus.tag === 'IFRAME' ? o.focus.frameFocus.split('.')[0] : undefined, undo: o.undo })})`);
  // Where press() put the Wave press: pressed again there, the range keeps its value, as a press on the oracle's thumb.
  const rangeAt = (fx) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${fx}, r.top + r.height / 2]);`);
  for (const [P, p] of Object.entries(PLANS)) {
    build(P);
    if (p.phone) qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks.find((b) => b.type === 'scrolling').id]);`);
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
    let k = `${p.phone ? 'mobile>' : ''}open${p.press == null ? '' : `>${p.press}`}`;
    const fx = p.press === 180 ? 0.995 : (p.press ?? 0) / 180;
    if (p.press != null) { await press('#block-panel [data-scr-range="wave"]', fx); await pause(300); }
    same(`Keys ${P}: ${k}`, readOf(P, k));
    for (const [key, n, gap, noThumb] of p.keys) {
      k += `>${key} x${n} ${gap}`;
      const want = keysOf(P, k), c = await session(S);
      try {
        // The frame's window focused by script, as the oracle's (its body then has the focus), and a row for it.
        if (p.frame) { await c.ev(`(() => { document.getElementById('site-frame').contentWindow.focus(); return 'true'; })()`); await sleep(400); sameKey(`Keys ${P}: ${k}, the focus in the frame`, await c.ev(STATE), want.find(([t]) => t === 'pressed')[1]); }
        if (!noThumb) {
                    const [x, y] = rangeAt(fx);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); await sleep(200);
          await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await sleep(80);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); await sleep(1200);
          sameKey(`Keys ${P}: ${k}, the thumb pressed`, await c.ev(STATE), want.find(([t]) => t === 'pressed')[1]);
        }
        for (let i = 1; i <= n; i++) {
          await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: CODE[key], nativeVirtualKeyCode: CODE[key] });
          await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: CODE[key], nativeVirtualKeyCode: CODE[key] });
          await sleep(gap);
          sameKey(`Keys ${P}: ${k}, key ${i}`, await c.ev(STATE), want.find(([t]) => t === `${key} ${i}`)[1]);
        }
        await sleep(1200);
      } finally { c.close(); }
      same(`Keys ${P}: ${k}`, readOf(P, k));
    }
    if (p.seq) {
      // One session for the run, as the oracle's: a state at each key's gap and 1.2 s after the last.
      k += `>keys ${p.seq.name}`;
      const want = keysOf(P, k), c = await session(S), of = (t) => want.find(([n]) => n === t)[1];
      try {
        if (!p.seq.noThumb) {
          const [x, y] = rangeAt(fx);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); await sleep(200);
          await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await sleep(80);
          await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); await sleep(1200);
          if (!p.seq.noPressedRow) sameKey(`Keys ${P}: ${k}, the thumb pressed`, await c.ev(STATE), of('pressed'));
        }
        for (const [i, [key, mods, gap]] of p.seq.keys.entries()) {
          const code = key === 'z' ? 'KeyZ' : key, name = `${mods & 4 ? 'Meta+' : ''}${mods & 8 ? 'Shift+' : ''}${key} ${i + 1}`;
          await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, modifiers: mods, windowsVirtualKeyCode: CODE[key], nativeVirtualKeyCode: CODE[key] });
          await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: mods, windowsVirtualKeyCode: CODE[key], nativeVirtualKeyCode: CODE[key] });
          await sleep(gap);
          sameKey(`Keys ${P}: ${k}, ${name}`, await c.ev(STATE), of(name));
        }
        await sleep(1200);
        sameKey(`Keys ${P}: ${k}, 1.2 s after`, await c.ev(STATE), of('after'));
      } finally { c.close(); }
      same(`Keys ${P}: ${k}`, readOf(P, k));
    }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    k += '>go'; same(`Keys ${P}: ${k}`, readOf(P, k));
    for (let i = 0; i < p.z; i++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z'; same(`Keys ${P}: ${k}`, readOf(P, k.replace(/>z/g, PLANS[P].od || PLANS[P].frame ? '>Z' : '>z')));
    }
    qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
  }
  // Not read, ours as before: the range keeps the focus after a press, and Cmd+Z there still undoes the press (review-2).
  build('R');
  const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks[0].id]);`);
  qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
  await press('#block-panel [data-btab="Design"]');
  await press('#block-panel [data-scr-range="wave"]', 0.5); await pause(300);
  mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
  const w = qs(`const s = fe.model.sections[0], a = s.blocks[0], r = document.querySelector('#block-panel [data-scr-range="wave"]'); return JSON.stringify({ focus: !!r && document.activeElement === r, wave: a.wave ?? 0, value: r ? r.value : null, me: a.layout.desktop.area.join('/') });`);
  const me = OK.reads['R2 R default'].layout.all.find((b) => b.me).desktop;
  add('Keys: open>90>Cmd+Z in the range (not read)', w.wave === 0 && w.value === '0' && w.me === me, `${JSON.stringify(w)} (want wave 0, ${me})`);
  qs(`fe.select(null); await sleep(300); return 'true';`);
}
