// scrolling-check's rows for arrow keys on Wave Intensity (CAP-T12WAVEKEYS.json, R2; R1 read alike). A Scrolling block with a
// Text block added after it (R: alone), made on the desktop as the oracle's; Edit, Design, a press on Wave Intensity, a press
// on the range's thumb, then real arrow keys a set time apart through one DevTools session, Escape and Cmd+Z. A key row
// checks the range's value, that it has the focus, and Undo and Redo; a step row the Scrolling block's areas in both views
// and its line, and with the panel open the block's wave. K: Right 3 times 1.2 s apart, then Left; L: Right 3 times about
// 0.2 s apart (one step); M: in the phone view, Right twice; R: 180, Right at the end (no step), Down twice. The Text
// block's own area is left out: after K's Left, a one-step fall, ours moves it and the oracle does not (task-78bc0672904da5dc).
import { readFileSync } from 'node:fs';

const OK = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12WAVEKEYS.json', import.meta.url))).runs.R2;
const CODE = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
// Plan: the view, the press, then [key, times, gap ms, no thumb press first] for each run of keys, and the Cmd+Z count.
const PLANS = {
  K: { phone: false, press: 90, keys: [['ArrowRight', 3, 1200], ['ArrowLeft', 1, 1200, true]], z: 2 },
  L: { phone: false, press: 90, keys: [['ArrowRight', 3, 100]], z: 2 },
  M: { phone: true, press: 90, keys: [['ArrowRight', 2, 1200]], z: 2 },
  R: { phone: false, press: 180, keys: [['ArrowRight', 1, 1200], ['ArrowDown', 2, 1200, true]], z: 3, alone: true },
};

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
    const o = OK.reads[`R2 ${P} default`].layout, all = PLANS[P].alone ? o.all.filter((b) => b.me) : o.all, me = all.find((b) => b.me), other = all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: 4 }, blocks: [me, other].filter(Boolean).map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}, text = ${!PLANS[P].alone}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); if (text) { fe.addBlock(s.id, 'Text', true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); return 'true';`);
  };
  // The panel's range, the focus and Undo and Redo, as one expression for the DevTools session.
  const STATE = `(() => { const r = document.querySelector('#block-panel [data-scr-range="wave"]'), u = document.getElementById('undo'), z = document.getElementById('redo'); return JSON.stringify({ value: r ? r.value : null, focus: !!r && document.activeElement === r, undo: [!!u && !u.disabled, !!z && !z.disabled] }); })()`;
  const ours = () => qs(`const s = fe.model.sections[0], a = s.blocks.find((b) => b.type === 'scrolling'), el = document.getElementById('site-frame').contentDocument.getElementById('block-' + a.id), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], line: r(el.querySelector('.marquee').getBoundingClientRect().height), wave: (fe.bp === 'mobile' ? a.waveMobile ?? a.wave : a.wave) ?? 0 });`);
  const same = (what, read) => {
    const o = read.layout, w = ours(), me = o.all.find((b) => b.me);
    const ok = w.me[0] === me.desktop && w.me[1] === me.phone && near1(w.line, o.marquee[1]) && (!read.wave || String(w.wave) === read.wave[0]);
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ me: [me.desktop, me.phone], line: o.marquee[1], wave: read.wave?.[0] ?? null })})`);
  };
  const sameKey = (what, w, o) => add(what, w.value === o.value && w.focus === o.focus.isRange && w.undo[0] === o.undo[0] && w.undo[1] === o.undo[1], `${JSON.stringify(w)} (oracle ${JSON.stringify({ value: o.value, focus: o.focus.isRange, undo: o.undo })})`);
  // Where press() put the Wave press: pressed again there, the range keeps its value, as a press on the oracle's thumb.
  const rangeAt = (fx) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${fx}, r.top + r.height / 2]);`);
  for (const [P, p] of Object.entries(PLANS)) {
    build(P);
    if (p.phone) qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks.find((b) => b.type === 'scrolling').id]);`);
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
    let k = `${p.phone ? 'mobile>' : ''}open>${p.press}`;
    const fx = p.press === 180 ? 0.995 : p.press / 180;
    await press('#block-panel [data-scr-range="wave"]', fx); await pause(300);
    same(`Keys ${P}: ${k}`, OK.reads[`R2 ${P} ${k}`]);
    for (const [key, n, gap, noThumb] of p.keys) {
      k += `>${key} x${n} ${gap}`;
      const want = OK.keys[`R2 ${P} ${k}`].states, c = await session(S);
      try {
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
      same(`Keys ${P}: ${k}`, OK.reads[`R2 ${P} ${k}`]);
    }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    k += '>go'; same(`Keys ${P}: ${k}`, OK.reads[`R2 ${P} ${k}`]);
    for (let i = 0; i < p.z; i++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z'; same(`Keys ${P}: ${k}`, OK.reads[`R2 ${P} ${k}`]);
    }
    qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
  }
}
