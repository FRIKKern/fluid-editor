// T5: a new button through the real menu, its Design tab, Fit, Fill and Alignment, pulls with the
// mouse, the phone's own container, against parity/findings/BUTTONDESIGN.json. Writes
// parity/button-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run button-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/BUTTONDESIGN.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(40)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, tol = 1) => a.length === b.length && a.every((v, n) => Math.abs(v - b[n]) <= tol);
const sleep = 'const sleep = (ms) => new Promise((res) => setTimeout(res, ms));';

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
const spot = evalJs(S, `(async () => { ${sleep} const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks = []; fe.load(next); await sleep(350); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await sleep(200); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const id = evalJs(S, `(async () => { ${sleep} const had = new Set(fe.model.sections[1].blocks.map((x) => x.id)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Button"]').click(); await sleep(350); return JSON.stringify(fe.model.sections[1].blocks.find((x) => !had.has(x.id)).id); })()`);
const J = JSON.stringify(id);
const openDesign = async () => evalJs(S, `(async () => { ${sleep} fe.select(${JSON.stringify(sid)}, ${J}); await sleep(150); const tb = document.querySelector('#block-toolbar [data-tb="edit"]'); const p = document.getElementById('block-panel'); if (p.hidden) tb.click(); await sleep(200); document.querySelector('[data-btab="Design"]').click(); await sleep(200); return 'true'; })()`);
const rows = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('#block-panel .bp-bs-title, #block-panel .bp-btn-row .sp-label, #block-panel .bp-thead span:first-child')].map((e) => e.textContent.trim())))()`);
const press = async (label) => { evalJs(S, `(() => { document.querySelector('#block-panel [aria-label="${label}"]').click(); return 'true'; })()`); await pause(250); };
const read = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument; const fe = d.querySelector('.fe-block-${id}'); const q = fe.getBoundingClientRect(); const all = [...fe.querySelectorAll('.sqs-block-button-container')]; const k = all.find((e) => e.offsetHeight) || all[0]; const a = k.querySelector('a'); const r = a.getBoundingClientRect(); const rd = (v) => Math.round(v * 10) / 10; return JSON.stringify({ count: all.length, area: fe && window.fe.model.sections[1].blocks.find((b) => b.id === ${J}).layout[document.getElementById('bp-mobile').classList.contains('is-on') ? 'mobile' : 'desktop'].area, block: [rd(q.width), rd(q.height)], a: [r.x - q.x, r.y - q.y, r.width, r.height].map(rd), pad: getComputedStyle(a).padding, cls: all.map((e) => [...e.classList].filter((c) => /--|stretched|system/.test(c)).join(' ')) }); })()`);
const classes = (x, want) => x.split(' ').filter((c) => /--|stretched/.test(c)).sort().join() === want.split(' ').sort().join();
const pull = async (dir, cols, rowsBy) => {
  const p = evalJs(S, `(async () => { ${sleep} fe.select(${JSON.stringify(sid)}, ${J}); await sleep(150); const f = document.getElementById('site-frame'), o = f.getBoundingClientRect(), r = f.contentDocument.querySelector('.fe-handle[data-dir="${dir}"]').getBoundingClientRect(), m = fe.measure(${JSON.stringify(sid)}); return JSON.stringify({ x: o.left + r.x + r.width / 2, y: o.top + r.y + r.height / 2, col: m.colStart[2] - m.colStart[1], row: m.pitch }); })()`);
  drag(S, [p.x, p.y], [p.x + cols * p.col, p.y + rowsBy * p.row]); await pause(350);
  return read();
};
const setArea = async (area) => { evalJs(S, `(async () => { ${sleep} const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks.find((x) => x.id === '${id}').layout.desktop.area = ${JSON.stringify(area)}; fe.load(next); await sleep(250); return 'true'; })()`); await pause(100); };

// Design tab.
await openDesign();
add('Design rows on Fill', rows().join() === [...F.designRows.fill].join(), rows());
let x = read();
add('Fill box', near(x.a, F.box.fill.a) && x.pad === F.box.fill.padding && classes(x.cls[0], F.box.fill.container), JSON.stringify(x));
evalJs(S, `(() => { window.__start = JSON.stringify(fe.model); return 'true'; })()`);
const restore = async () => { evalJs(S, `(async () => { fe.load(JSON.parse(window.__start)); return 'true'; })()`); await pause(300); };
await press('Fit');
add('Design rows on Fit', rows().join() === [...F.designRows.fit].join(), rows());
x = read();
add('Fit box', near(x.a, F.box.fit.a) && x.pad === F.box.fit.padding && classes(x.cls[0], F.box.fit.container), JSON.stringify(x));
await press('Align Left'); x = read();
add('Fit, Align Left', near(x.a, F.box.fitLeft.a) && classes(x.cls[0], F.box.fitLeft.container), JSON.stringify(x));
await press('Align Right'); x = read();
add('Fit, Align Right', near(x.a, F.box.fitRight.a) && classes(x.cls[0], F.box.fitRight.container), JSON.stringify(x));
evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(250); x = read();
add('Undo of Align Right is one step', classes(x.cls[0], F.box.fitLeft.container), JSON.stringify(x));
await press('Align Right'); await press('Fill'); x = read();
add('Fill keeps the alignment class', near(x.a, F.box.fillAfterRight.a) && classes(x.cls[0], F.box.fillAfterRight.container), JSON.stringify(x));
await restore();

// The style list.
await openDesign();
const list = evalJs(S, `(async () => { ${sleep} document.querySelector('[data-bpstyle-toggle]').click(); await sleep(150); const panel = document.getElementById('block-panel').getBoundingClientRect(); return JSON.stringify({ opts: [...document.querySelectorAll('.bp-bs-opt')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.replace(/^Aa/, '').trim(), r.x - panel.x, r.width, r.height]; }), edit: document.querySelector('.bp-bs-edit').textContent.trim() }); })()`);
add('Style list', list.opts.map((o) => o[0]).join() === F.styleList.options.map((o) => o[0]).join() && list.opts.every((o) => o[2] === 276 && o[3] === 55) && list.edit.toUpperCase() === F.styleList.edit.text, JSON.stringify(list));
evalJs(S, `(async () => { document.querySelector('[data-bpstyle="secondary"]').click(); return 'true'; })()`); await pause(250);
const after = evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument; const k = d.querySelector('.fe-block-${id} .sqs-block-button-container'); return JSON.stringify([k.dataset.buttonSize, k.dataset.buttonType]); })()`);
add('Secondary from the panel', after.join() === 'large,secondary', after);
evalJs(S, `(() => { fe.undo(); return 'true'; })()`); await pause(250);
await openDesign();
const ss = evalJs(S, `(async () => { ${sleep} document.querySelector('[data-bpstyle-toggle]').click(); await sleep(150); document.querySelector('[data-bpstyle-edit]').click(); await sleep(250); const p = document.getElementById('site-styles'); return JSON.stringify({ open: !p.hidden, text: p.innerText }); })()`);
add('Edit Button Styles opens Buttons', ss.open && /Buttons/.test(ss.text) && /Primary/i.test(ss.text), JSON.stringify(ss).slice(0, 120));
evalJs(S, `(() => { document.getElementById('site-styles-toggle').click(); return 'true'; })()`); await pause(200);

// Pulls on Fit, then on Fill.
await openDesign(); await press('Fit');
await setArea([1, 2, 7, 8]); x = await pull('s', 0, -4);
add('Fit: rows stop at 2', x.area.join() === F.fitPulls.steps[2][1].join() && near(x.a, F.fitPulls.steps[2][2]), JSON.stringify(x));
x = await pull('e', -1, 0); add('Fit e -1', x.area.join() === F.fitPulls.steps[3][1].join() && near(x.a, F.fitPulls.steps[3][2]), JSON.stringify(x));
x = await pull('e', -1, 0); add('Fit e -1 again', x.area.join() === F.fitPulls.steps[4][1].join() && near(x.a, F.fitPulls.steps[4][2]), JSON.stringify(x));
x = await pull('e', -1, 0); add('Fit e -1: wraps, one more row', x.area.join() === F.fitPulls.steps[5][1].join() && near(x.a, F.fitPulls.steps[5][2], 1.5), JSON.stringify(x));
x = await pull('e', -1, 0); add('Fit e -1: 3 columns is the least', x.area.join() === F.fitPulls.steps[6][1].join(), JSON.stringify(x));
x = await pull('s', 0, -2); add('Fit s -2 stays', x.area.join() === F.fitPulls.steps[7][1].join(), JSON.stringify(x));
await restore();
for (let n = 0; n < 5; n++) x = await pull('e', -1, 0);
add('Fill stops at 3 columns', x.area.join() === F.fillPulls.steps[4][0].join(), JSON.stringify(x));
x = await pull('s', 0, -1);
add('Fill then allows 1 row', x.area.join() === F.fillPulls.steps[5][0].join() && near(x.a, F.fillPulls.at1Row, 1), JSON.stringify(x));

// A long word does not break and sticks out on both sides.
evalJs(S, `(async () => { ${sleep} const next = JSON.parse(window.__start); const one = next.sections[1].blocks.find((x) => x.id === '${id}'); one.label = ${JSON.stringify(F.longWord.text)}; one.layout.desktop.area = [1, 2, 3, 5]; fe.load(next); await sleep(300); return 'true'; })()`); await pause(100);
x = read(); const wide = x.a[2];
add('Long word sticks out on both sides', wide > x.block[0] && Math.abs(x.a[0] + (wide - x.block[0]) / 2) < 1, JSON.stringify(x));

// The phone follows, then has its own.
await restore();
await openDesign(); await press('Fit');
evalJs(S, `(() => { fe.select(null); document.getElementById('bp-mobile').click(); return 'true'; })()`); await pause(700);
viewport(S, 1600, 1000);
await openDesign();
x = read();
add('Phone follows Fit: one container', x.count === 1 && near(x.a.slice(2), F.phone.desktopFit.a.slice(2)), JSON.stringify(x));
await press('Fill'); x = read();
add('Phone Fill adds system_mobile', x.count === 2 && x.cls[1].includes('system_mobile') && near(x.a, F.phone.mobileFill.a, 1), JSON.stringify(x));
await press('Fit'); await press('Align Left'); x = read();
add('Phone Fit, Align Left', x.cls[1].includes('--left') && near(x.a.slice(0, 1).concat(x.a.slice(2)), [0, ...F.phone.mobileFitLeft.a.slice(2)]), JSON.stringify(x));
evalJs(S, `(() => { fe.select(null); document.getElementById('bp-desktop').click(); return 'true'; })()`); await pause(700);
await openDesign(); await press('Align Right'); x = read();
add('Desktop change leaves the phone', x.cls[0].includes('--right') && x.cls[1].includes('--left') && near(x.a, F.box.fitRight.a), JSON.stringify(x));

console.log(`Button: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/button-check.json', import.meta.url), `${JSON.stringify({ check: 'button design tab as on the oracle', pass, total, results }, null, 2)}\n`);
if (!total || pass !== total) process.exitCode = 1;
