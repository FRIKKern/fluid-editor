// scrolling-check's rows for a Wave Intensity drag let go on the value a pause left, and a press on another block during a
// drag (CAP-T12PAUSEBACK.json, R2; R1 read alike). A Scrolling block with a Text block added after it (T, N: alone; W: a
// second Scrolling block on the same rows), made on the desktop as the oracle's, with a blank section added after it so
// one step lies under the plan's, as the oracle's block adds do. Then Edit, Design, 90 pressed (not in N and W), a real drag
// through one DevTools session holding each value as long as the oracle's, Escape and Cmd+Z step by step. A step row checks
// the blocks' areas in both views, the Scrolling block's line, in the phone view the section's rows, and Undo and Redo.
// T: 90 > 120 (a pause) > 150 > 120, let go: the last stretch is a step though the model is as the pause left it; U on the
// desktop and V in the phone view the same with a Text block; N: 0 > 60 (a pause) > 120 > 0, let go on its start. W checks
// during the drag that moving onto the second block and pressing there selects nothing else and writes nothing into it:
// the range's value, the selected block and both lines; then the first block's area. Not rows: W's second block's area
// (on the oracle it stretches with the first: task-d91d6e0d2f550874) and W's Cmd+Z after the second press (ours loses that let go; no mouse can
// press twice while held).
import { readFileSync } from 'node:fs';

const OP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T12PAUSEBACK.json', import.meta.url))).runs.R2;
const BACK = [[90, 300], [120, 1300], [150, 300], [120, 300]];
const PLANS = {
  T: { press: true, pairs: BACK, name: 'pause back', z: 3, alone: true },
  U: { press: true, pairs: BACK, name: 'pause back', z: 3 },
  V: { press: true, pairs: BACK, name: 'pause back', z: 3, phone: true },
  N: { press: false, pairs: [[0, 300], [60, 1300], [120, 300], [0, 300]], name: 'pause start', z: 2, alone: true },
  W: { press: false, vals: [0, 60, 120], gap: 1200, name: 'switch', two: true },
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

export async function pauseRows({ qs, press, add, pause, browser, mouse, S }) {
  const area = (t) => t.split('/').map(Number);
  const near1 = (a, b) => Math.abs(a - b) <= 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const build = (P) => {
    const p = PLANS[P], o = OP.reads[`R2 ${P} default`].layout, me = o.all.find((b) => b.me), other = p.alone ? null : o.all.find((b) => !b.me);
    const spec = JSON.stringify({ rows: { desktop: o.rows, mobile: 4 }, blocks: [me, other].filter(Boolean).map((b) => ({ desktop: area(b.desktop), mobile: area(b.phone) })) });
    qs(`const W = ${spec}, add = ${p.alone ? 'null' : p.two ? "'Scrolling'" : "'Text'"}; const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [next.sections[0]]; const s = next.sections[0]; s.rows = { ...W.rows }; s.blocks = []; s.phoneFollows = true; delete s.phoneStop; delete s.phoneEdited; fe.setBp('desktop'); fe.load(next); await sleep(300); fe.addBlock(s.id, 'Scrolling', true); await sleep(300); if (add) { fe.addBlock(s.id, add, true); await sleep(300); } const m = JSON.parse(JSON.stringify(fe.model)), t = m.sections[0]; t.rows = { ...W.rows }; t.blocks.forEach((b, k) => { b.layout.desktop.area = W.blocks[k].desktop; b.layout.mobile.area = W.blocks[k].mobile; }); fe.load(m); await sleep(300); fe.addSection(); await sleep(300); return 'true';`);
  };
  const ours = () => qs(`const s = fe.model.sections[0], a = s.blocks[0], t = s.blocks[1], d = document.getElementById('site-frame').contentDocument, el = d.getElementById('block-' + a.id), r = (v) => Math.round(v * 10) / 10; return JSON.stringify({ view: fe.bp, rows: s.rows[fe.bp], me: [a.layout.desktop.area.join('/'), a.layout.mobile.area.join('/')], other: t ? [t.layout.desktop.area.join('/'), t.layout.mobile.area.join('/')] : null, line: r(el.querySelector('.marquee').getBoundingClientRect().height), undo: [!document.getElementById('undo').disabled, !document.getElementById('redo').disabled] });`);
  const same = (what, read, meOnly = false) => {
    const o = read.layout, w = ours(), me = o.all.find((b) => b.me), other = o.all.find((b) => !b.me), two = (b) => (b ? [b.desktop, b.phone].join() : null);
    const ok = two({ desktop: w.me[0], phone: w.me[1] }) === two(me) && (meOnly || (w.other ? two({ desktop: w.other[0], phone: w.other[1] }) : null) === two(other)) && (w.view !== 'mobile' || w.rows === o.rows)
      && near1(w.line, o.marquee[1]) && w.undo[0] === o.undo[0] && w.undo[1] === o.undo[1];
    add(what, ok, `${JSON.stringify(w)} (oracle ${JSON.stringify({ rows: o.rows, me: [me.desktop, me.phone], other: other ? [other.desktop, other.phone] : null, line: o.marquee[1], undo: o.undo })})`);
  };
  // During W's drag: the range's value, which blocks are selected (0 the first, 1 the second) and both lines.
  const HELD = `(() => { const s = fe.model.sections[0], d = document.getElementById('site-frame').contentDocument, r = document.querySelector('#block-panel [data-scr-range="wave"]'); return JSON.stringify({ value: r ? r.value : null, selected: [...d.querySelectorAll('[data-is-selected="true"]')].map((e) => s.blocks.findIndex((b) => e.querySelector('#block-' + b.id) || e.id === 'block-' + b.id)), lines: s.blocks.map((b) => Math.round(d.getElementById('block-' + b.id).querySelector('.marquee').getBoundingClientRect().height)) }); })()`;
  const sameHeld = (what, w, o, ids) => {
    const want = { value: o.value, selected: o.selected.map((x) => ids.indexOf(x)), lines: o.lines.filter(([x]) => ids.includes(x)).map(([, h]) => Math.round(h)) };
    add(what, w.value === want.value && JSON.stringify(w.selected) === JSON.stringify(want.selected) && w.lines.length === want.lines.length && w.lines.every((h, k) => near1(h, want.lines[k])), `${JSON.stringify(w)} (oracle ${JSON.stringify(want)})`);
  };
  const rangeX = (v) => qs(`const e = document.querySelector('#block-panel [data-scr-range="wave"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * ${Math.min(0.995, Math.max(0.005, v / 180))}, r.top + r.height / 2]);`);
  for (const [P, p] of Object.entries(PLANS)) {
    build(P);
    if (p.phone) qs(`fe.setBp('mobile'); await sleep(800); return 'true';`);
    const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks[0].id]);`);
    qs(`fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
    await press('#block-panel [data-btab="Design"]');
    let k = `${p.phone ? 'mobile>' : ''}open`;
    if (p.press) { await press('#block-panel [data-scr-range="wave"]', 0.5); await pause(300); k += '>90'; same(`Pause ${P}: ${k}`, OP.reads[`R2 ${P} ${k}`]); }
    k += `>drag ${p.name}`;
    const c = await session(S);
    try {
      if (p.pairs) {
        const xs = p.pairs.map(([v]) => rangeX(v)), y = xs[0][1];
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 0; i < p.pairs.length; i++) { if (i) await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 }); await sleep(p.pairs[i][1]); }
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xs.at(-1)[0], y, button: 'left', buttons: 0, clickCount: 1 });
      } else {
        // W: the oracle's two blocks, by their ids as added, pair its reads with ours.
        const pair = OP.blockIds[P], states = OP.inputs[`R2 ${P} ${k}`].states, oid = (n) => states.find(([t]) => t === n)[1];
        const xs = p.vals.map((v) => rangeX(v)), y = xs[0][1];
        const pt = qs(`const s = fe.model.sections[0], f = document.getElementById('site-frame'), q = f.contentDocument.getElementById('block-' + s.blocks[1].id).closest('.fe-block').getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + q.left + q.width / 2, o.top + q.top + q.height / 2]);`);
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[0][0], y, button: 'none', buttons: 0 }); await sleep(200);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xs[0][0], y, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 1; i < xs.length; i++) { await sleep(p.gap); await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xs[i][0], y, button: 'left', buttons: 1 }); }
        await sleep(p.gap / 2); sameHeld(`Pause ${P}: ${k}, held 120`, await c.ev(HELD), oid('held 120'), pair);
        await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt[0], y: pt[1], button: 'left', buttons: 1 }); await sleep(150);
        sameHeld(`Pause ${P}: ${k}, moved onto block 2, held`, await c.ev(HELD), oid('moved onto block 2, held'), pair);
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt[0], y: pt[1], button: 'left', buttons: 1, clickCount: 1 }); await sleep(300);
        sameHeld(`Pause ${P}: ${k}, a second press on block 2`, await c.ev(HELD), oid('second press on block 2'), pair);
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt[0], y: pt[1], button: 'left', buttons: 0, clickCount: 1 }); await sleep(1800);
        sameHeld(`Pause ${P}: ${k}, let go on block 2`, await c.ev(HELD), oid('let go on block 2'), pair);
      }
    } finally { c.close(); }
    await pause(600);
    same(`Pause ${P}: ${k}`, OP.reads[`R2 ${P} ${k}`], p.two);
    if (p.two) { qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`); continue; }
    qs(`fe.select(null); await sleep(300); return 'true';`);
    k += '>go'; same(`Pause ${P}: ${k}`, OP.reads[`R2 ${P} ${k}`]);
    for (let i = 0; i < p.z; i++) {
      qs(`document.activeElement?.blur?.(); return 'true';`); mouse(S, 'move', 10, 10); browser(S, 'press', 'Meta+z'); await pause(400);
      k += '>z'; same(`Pause ${P}: ${k}`, OP.reads[`R2 ${P} ${k}`]);
    }
    qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
  }
}
