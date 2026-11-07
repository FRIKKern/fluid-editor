// G4: walk a held drag and resize in our editor 1px at a time, as parity/findings/SNAP.json did on
// the oracle, and compare the px where the target changes and what it changes to, within 1px.
// Writes parity/snap-check.json. Usage: npm run snap-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/SNAP.json', import.meta.url)));
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html?replay`); await pause(2200);
const LEGS = [['xOut', 'x', 0, 'x+'], ['xBack', 'x', null, 'x-'], ['xHome', 'x', null, 'x0'], ['yOut', 'y', 0, 'y+'], ['yBack', 'y', null, 'y-'], ['yHome', 'y', null, 'y0']];
let pass = 0, total = 0;
const results = [];
for (const r of F.readings) {
  const mx = r.mx, my = r.my;
  const got = evalJs(S, `(async () => { const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const s = fe.model.sections[${r.section}];
    const bid = [...d.querySelectorAll('section[data-section-id="' + s.id + '"] .fe-block')].map((e) => e.dataset.blockId)[${r.block}];
    const b = d.querySelector('.fe-block[data-block-id="' + bid + '"]');
    W.scrollTo({ top: W.scrollY + b.getBoundingClientRect().top - 300, behavior: 'instant' }); await sleep(100);
    fe.select(s.id, bid); await sleep(100);
    const el = ${r.kind === 'move' ? 'b' : `d.querySelector('.fe-handle[data-dir="${r.kind}"]')`};
    const q = el.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: cx, clientY: cy, buttons: 1 }));
    const read = () => { const e = d.querySelector('.fe-transform-indicator'); return e ? W.getComputedStyle(e).gridArea : null; };
    const move = (x, y) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: y, buttons: 1 }));
    move(cx + 14, cy); await sleep(20); move(cx, cy); await sleep(20);
    const walk = async (axis, from, to) => { const seen = []; let last = read(); const step = from < to ? 1 : -1; for (let v = from; v !== to + step; v += step) { move(axis === 'x' ? cx + v : cx, axis === 'y' ? cy + v : cy); await sleep(4); const a = read(); if (a !== last) seen.push([v, a]); last = a; } return seen; };
    const out = {};
    out.xOut = await walk('x', 0, ${mx}); out.xBack = await walk('x', ${mx}, -${mx}); out.xHome = await walk('x', -${mx}, 0);
    out.yOut = await walk('y', 0, ${my}); out.yBack = await walk('y', ${my}, -${my}); out.yHome = await walk('y', -${my}, 0);
    d.dispatchEvent(new W.PointerEvent('pointercancel', { ...o, buttons: 0 }));
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100); while (fe.canUndo) fe.undo();
    return JSON.stringify(out); })()`);
  for (const [leg] of LEGS) {
    // The oracle's first step of a walk can note the target appearing; only moves between areas count.
    const want = r[leg].filter(([, a], k) => k > 0 || a !== r.start.join(' / ')), have = got[leg].filter(([, a], k) => k > 0 || a !== r.start.join(' / '));
    total++;
    const ok = want.length === have.length && want.every(([v, a], k) => Math.abs(v - have[k][0]) <= 1 && a === have[k][1]);
    if (ok) pass++; else console.log(`DIFF ${r.kind} section ${r.section} block ${r.block} ${leg}: oracle ${JSON.stringify(want)} ours ${JSON.stringify(have)}`);
    results.push({ kind: r.kind, section: r.section, block: r.block, leg, ok });
  }
}
// From a margin, on desktop and a phone, on a block made here: CAP-G4MARGIN.json, CAP-G4PHONE.json, CAP-G4MARGIN2.json to CAP-G4MARGIN6.json.
const WALKS = [
  ['CAP-G4MARGIN', 'se, left margin', 'desktop', [1, 1, 7, 7], 110],
  ['CAP-G4MARGIN', 'move, left margin', 'desktop', [1, 1, 7, 7], 110],
  ['CAP-G4MARGIN2', 'se, left margin, to 200', 'desktop', [1, 1, 7, 7], 200],
  ['CAP-G4MARGIN2', 'phone, move, left margin', 'mobile', [1, 1, 7, 9], 110],
  ['CAP-G4MARGIN2', 'phone, se, left margin', 'mobile', [1, 1, 7, 9], 110],
  ['CAP-G4MARGIN3', 'move', 'mobile', [1, 1, 7, 7], 220],
  ['CAP-G4MARGIN4', 'move', 'mobile', [1, 1, 7, 5], 300],
  ['CAP-G4MARGIN5', 'move', 'desktop', [1, 1, 7, 22], 300],
  ['CAP-G4MARGIN5', 'se', 'desktop', [1, 1, 7, 22], 300],
  ['CAP-G4MARGIN6', 'se', 'desktop', [1, 1, 7, 22], 400],
  ['CAP-G4PHONE', 'move', 'mobile', [1, 2, 7, 10], 110],
  ['CAP-G4PHONE', 'se', 'mobile', [1, 2, 7, 10], 110],
];
for (const [file, name, view, area, mx] of WALKS) {
  const R = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url))).reads[name].walk;
  const part = R.part === 'middle' ? null : R.part, phone = view === 'mobile';
  const got = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const f = document.getElementById('site-frame');
    fe.setBp('desktop');
    fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 12, mobile: 12 }, phoneFollows: false, blocks: [{ id: 'a', type: 'shape', layout: { desktop: { area: ${JSON.stringify(phone ? [1, 2, 7, 8] : area)} }, mobile: { area: ${JSON.stringify(phone ? area : [1, 2, 7, 10])} } }, content: {} }] }] });
    await sleep(250); fe.setBp('${view}'); await sleep(500);
    const d = f.contentDocument, W = f.contentWindow, b = d.querySelector('.fe-block[data-block-id="a"]');
    fe.select('s', 'a'); await sleep(150);
    const el = ${part ? `d.querySelector('.fe-handle[data-dir="${part}"]')` : 'b'};
    const q = el.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + q.height / 2, o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: cx, clientY: cy, buttons: 1 }));
    const read = () => { const e = d.querySelector('.fe-transform-indicator'); return e ? W.getComputedStyle(e).gridArea : null; };
    const move = (x) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: cy, buttons: 1 }));
    move(cx + 14); await sleep(20); move(cx); await sleep(20);
    const walk = async (from, to) => { const seen = []; let last = read(); const step = from < to ? 1 : -1; for (let v = from; v !== to + step; v += step) { move(cx + v); await sleep(2); const a = read(); if (a !== last) { seen.push([v, a]); last = a; } } return seen; };
    const out = { xOut: await walk(0, ${mx}), xBack: await walk(${mx}, ${R.xHome.length ? -mx : 0}) };
    d.dispatchEvent(new W.PointerEvent('pointercancel', { ...o, buttons: 0 }));
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100); fe.setBp('desktop'); return JSON.stringify(out); })()`);
  for (const leg of ['xOut', 'xBack']) {
    // The walk can go further back on the oracle: compare what ours walked. The first step only notes the target appearing.
    const start = area.join(' / '), low = Math.min(...got[leg].map((x) => x[0]), 0);
    const want = R[leg].filter(([v, a], k) => !(k === 0 && a === start && leg === 'xOut') && v <= mx && v >= (leg === 'xBack' && !R.xHome.length ? 0 : -mx)), have = got[leg];
    total++;
    const ok = low <= 0 && want.length === have.length && want.every(([v, a], k) => Math.abs(v - have[k][0]) <= 1 && a === have[k][1]);
    if (ok) pass++; else console.log(`DIFF ${file} ${name} ${leg}: oracle ${JSON.stringify(want)} ours ${JSON.stringify(have)}`);
    results.push({ kind: `${file} ${name}`, leg, ok });
  }
}
// Where the press is on a handle doesn't matter: the step counts from it (CAP-G4GRAB.json). A group's handles use one block's rule (CAP-G4GROUPRESIZE.json).
// A group on a phone from the left margin goes into the right margin (CAP-G4GROUPMARGIN.json), and from column 2 (CAP-G4GROUPPHONE.json). The same rule at 1280 and 1920 (CAP-G4WIDTHS.json).
const area = (a, b, c, d) => ({ area: [a, b, c, d] });
const FIXTURES = {
  one: { view: 'desktop', blocks: [['a', area(1, 2, 7, 8), area(1, 2, 7, 10)]] },
  group: { view: 'desktop', members: ['a', 'b'], blocks: [['a', area(1, 2, 7, 8), area(1, 2, 7, 10)], ['b', area(6, 14, 12, 20), area(7, 2, 13, 10)]] },
  margin: { view: 'mobile', members: ['a', 'b'], blocks: [['a', area(1, 2, 7, 8), area(1, 1, 7, 4)], ['b', area(1, 2, 7, 8), area(7, 1, 13, 4)]] },
  column2: { view: 'mobile', members: ['a', 'b'], blocks: [['a', area(1, 2, 7, 8), area(1, 2, 7, 5)], ['b', area(1, 14, 7, 20), area(7, 2, 13, 5)]] },
};
const GRABS = [
  ['CAP-G4GRAB', 'se middle', 'one', [0, 0], 40, 30], ['CAP-G4GRAB', 'se 6 in', 'one', [-6, -6], 40, 30], ['CAP-G4GRAB', 'se 6 out', 'one', [6, 6], 40, 30], ['CAP-G4GRAB', 'e 6 in', 'one', [-6, 0], 40, 0], ['CAP-G4GRAB', 'e 6 out', 'one', [6, 0], 40, 0],
  ['CAP-G4GROUPRESIZE', 'se', 'group', [0, 0], 120, 90], ['CAP-G4GROUPRESIZE', 'e', 'group', [0, 0], 120, 0], ['CAP-G4GROUPRESIZE', 's', 'group', [0, 0], 0, 90],
  ['CAP-G4GROUPMARGIN', 'from the margin', 'margin', [0, 0], 340, 0], ['CAP-G4GROUPPHONE', 'phone group move', 'column2', [0, 0], 340, 70],
  ['CAP-G4WIDTHS', '1280 se', 'one', [0, 0], 80, 70, 1280], ['CAP-G4WIDTHS', '1280 move', 'one', [0, 0], 80, 70, 1280], ['CAP-G4WIDTHS', '1920 se', 'one', [0, 0], 80, 70, 1920], ['CAP-G4WIDTHS', '1920 move', 'one', [0, 0], 80, 70, 1920],
];
for (const [file, name, fx, [gx, gy], mx, my, width = 1600] of GRABS) {
  viewport(S, width, 1000); await pause(300);
  const R = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url))).reads[name].walk;
  const X = FIXTURES[fx], part = R.part === 'middle' ? null : R.part, group = !!X.members;
  const got = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const f = document.getElementById('site-frame');
    fe.setBp('desktop');
    fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 30, mobile: 30 }, phoneFollows: false, blocks: ${JSON.stringify(X.blocks.map(([id, desktop, mobile]) => ({ id, type: 'shape', layout: { desktop, mobile }, content: {} })))} }] });
    await sleep(250); fe.setBp('${X.view}'); await sleep(500);
    const d = f.contentDocument, W = f.contentWindow, o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 }, block = (id) => d.querySelector('.fe-block[data-block-id="' + id + '"]');
    fe.select('s', 'a'); await sleep(100);
    if (${group}) { const r = block('b').getBoundingClientRect(), c = { ...o, shiftKey: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; block('b').dispatchEvent(new W.PointerEvent('pointerdown', { ...c, buttons: 1 })); d.dispatchEvent(new W.PointerEvent('pointerup', { ...c, buttons: 0 })); await sleep(100); }
    const el = ${part ? `d.querySelector('${group ? '.fe-indicator.is-group ' : ''}.fe-handle[data-dir="${part}"]')` : `block('a')`};
    const q = el.getBoundingClientRect(), cx = q.left + q.width / 2 + ${gx}, cy = q.top + q.height / 2 + ${gy};
    el.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: cx, clientY: cy, buttons: 1 }));
    const read = () => { const e = d.querySelector('.fe-transform-indicator'); return e ? W.getComputedStyle(e).gridArea.replace(/ /g, '') : null; };
    const move = (x, y) => d.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: x, clientY: y, buttons: 1 }));
    move(cx + 14, cy); await sleep(20); move(cx, cy); await sleep(20);
    const walk = async (axis, from, to) => { const seen = []; let last = read(); const step = from < to ? 1 : -1; for (let v = from; v !== to + step; v += step) { move(axis === 'x' ? cx + v : cx, axis === 'y' ? cy + v : cy); await sleep(2); const a = read(); if (a !== last) { seen.push([v, a]); last = a; } } return seen; };
    const out = {};
    if (${mx}) { out.xOut = await walk('x', 0, ${mx}); out.xBack = await walk('x', ${mx}, ${R.xHome?.length ? -mx : 0}); out.xHome = ${R.xHome?.length ? `await walk('x', ${-mx}, 0)` : '[]'}; }
    if (${my}) { out.yOut = await walk('y', 0, ${my}); out.yBack = await walk('y', ${my}, ${-my}); out.yHome = await walk('y', ${-my}, 0); }
    d.dispatchEvent(new W.PointerEvent('pointercancel', { ...o, buttons: 0 }));
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(100); fe.select(null); fe.setBp('desktop'); return JSON.stringify(out); })()`);
  for (const leg of Object.keys(got)) {
    // The first step of a walk only notes the target appearing.
    const clean = (a) => a.replace(/ /g, '');
    const want = (R[leg] || []).map(([v, a]) => [v, clean(a)]).filter(([v], k) => !(k === 0 && v === 1) && Math.abs(v) <= (leg[0] === 'x' ? mx : my)), have = got[leg];
    total++;
    const ok = want.length === have.length && want.every(([v, a], k) => Math.abs(v - have[k][0]) <= 1 && a === have[k][1]);
    if (ok) pass++; else console.log(`DIFF ${file} ${name} ${leg}: oracle ${JSON.stringify(want)} ours ${JSON.stringify(have)}`);
    results.push({ kind: `${file} ${name}`, leg, ok });
  }
}
viewport(S, 1600, 1000);
console.log(`Snap points: ${pass} of ${total} walks match`);
writeFileSync(new URL('../parity/snap-check.json', import.meta.url), JSON.stringify({ check: 'where a held drag or resize takes the next line', tolerance: 1, pass, total, results }, null, 2) + '\n');
process.exit(pass === total ? 0 : 1);
