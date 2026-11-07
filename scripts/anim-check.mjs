// T15: the Animation tab through real clicks on a new Text block, against
// parity/findings/ANIMFLOW.json. Writes parity/anim-check.json. FLUID_SURFACE=cdp:<port> npm run anim-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/ANIMFLOW.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(58)} ${ok ? 'match' : `DIFF ${detail ?? ''}`}`); };
const parseBox = (s) => String(s).split('@')[1].split(',').map(Number);
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const nearBox = (a, b, tol = 1) => a?.length === b.length && a.every((v, i) => near(v, b[i], tol));
const oracleText = (view, name) => { const t = view.text.find((x) => x.startsWith(`${name} @`)); return t ? parseBox(t) : null; };

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(900);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
const lib = `const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'); const pop = document.getElementById('shape-pop'); const fr = document.getElementById('site-frame'), d = fr.contentDocument, W = fr.contentWindow; const P0 = panel.getBoundingClientRect(); const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; const byText = (t, root = panel) => [...root.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === t && e.getBoundingClientRect().width > 0)[0];`;
const q = (body) => evalJs(S, `(async () => { ${lib} ${body} })()`);
let id;
async function fresh(name = 'Text') {
  goto(S, `${BASE}/index.html`); await pause(1600);
  const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
  mouse(S, 'move', spot[0], spot[1]); await pause(350);
  const added = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="${name}"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(250); return JSON.stringify({ sid: s.id, id: b.id }); })()`);
  id = added.id;
  q(`panel.querySelector('[data-btab="Animation"]').click(); await sleep(200); return 'true';`);
}
// A real click at an element's centre.
const clickSel = async (sel, wait = 220) => {
  const c = q(`const e = ${sel}; if (!e) throw new Error('no element: ' + ${JSON.stringify(sel)}); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(wait);
};
const act = (a, more = '') => `panel.querySelector('[data-anim="${a}"]${more}')`;
const box = (sel) => q(`const e = ${sel}; return JSON.stringify(e ? rel(e) : null);`);
const rows = () => q(`return JSON.stringify([...panel.querySelectorAll('.an-open')].map((e) => e.textContent.trim()));`);
const model = () => q(`return JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === ${JSON.stringify(id)}).animations || []);`);
const clickRadio = (v, wait) => clickSel(`panel.querySelector('[data-anim-tile="${v}"]')`, wait);
const pickTrigger = async (name) => { await clickSel(act('menu')); await clickSel(`[...panel.querySelectorAll('.an-mopt')].find((e) => e.textContent.trim() === ${JSON.stringify(name)})`); };
const fieldsNow = () => q(`return JSON.stringify([...panel.querySelectorAll('.an-rows input[type=text], .an-rows .an-sel')].map((e) => e.tagName === 'INPUT' ? e.value : e.textContent.trim()));`);
const clickTab = (t) => clickSel(`[...panel.querySelectorAll('.an-tab')].find((e) => e.textContent === ${JSON.stringify(t)})`);
const same2 = (what, got, want) => { const a = JSON.stringify(got.map?.((x) => String(x).replace(/\s/g, '')) ?? got), b = JSON.stringify(want.map((x) => String(x).replace(/\s/g, ''))); add(what, a === b, `${a} wanted ${b}`); };
const TABS_OF = { hover: ['End', 'Timing'], press: ['End', 'Timing'], loop: ['End', 'Timing'], scroll: ['Start', 'End', 'Timing'], appear: ['Start', 'Timing'], follow: ['Range', 'Timing'] };

// Empty
await fresh();
add('Empty: tabs, Triggers and the prompt', q(`return JSON.stringify(!!byText('Press + to get started') && !!byText('Use a preset or customize') && !!byText('Triggers'));`));
add('Empty: list actions box', nearBox(box(`panel.querySelector('[aria-label="Animation list actions"]')`), [213, 70, 36, 36], 1), box(`panel.querySelector('[aria-label="Animation list actions"]')`));
add('Empty: add box', nearBox(box(`panel.querySelector('[aria-label="Add a new animation"]')`), [260, 70, 36, 36], 1), box(`panel.querySelector('[aria-label="Add a new animation"]')`));
add('Empty: prompt box', nearBox(box(`panel.querySelector('.an-empty')`), [87, 188, 147, 44], 1), box(`panel.querySelector('.an-empty')`));
// Add, then back: nothing is added
await clickSel(act('add'));
add('Picker: Trigger title, no Design tabs', q(`return JSON.stringify(!!byText('Trigger') && !panel.querySelector('[data-btab]'));`));
add('Picker: back button box', nearBox(box(`panel.querySelector('.an-back')`), [11, 5, 16, 46]), box(`panel.querySelector('.an-back')`));
add('Picker: trigger select box', nearBox(box(`panel.querySelector('.an-combo')`), [22, 55, 276, 44]), box(`panel.querySelector('.an-combo')`));
const tb = q(`return JSON.stringify([...panel.querySelectorAll('.an-tile')].map((e) => rel(e)));`);
add('Picker: six tiles, 135 by 106, on their rows', tb.length === 6 && [0, 1, 2, 3, 4, 5].every((i) => nearBox(tb[i], [i % 2 ? 163 : 22, 108 + 112 * Math.floor(i / 2), 135, 106])), JSON.stringify(tb));
add('Picker: tile names', q(`return JSON.stringify([...panel.querySelectorAll('.an-tname')].map((e) => e.textContent).join());`) === F.presets.hover.map((p) => p.name).join(), '');
add('Picker: Start blank box', nearBox(box(`panel.querySelector('.an-foot')`), [0, 447, 320, 55], 2), box(`panel.querySelector('.an-foot')`));
await clickSel(`panel.querySelector('.an-back')`);
add('Add then back adds nothing', (await rows()).length === 0 && q(`return JSON.stringify(!!byText('Press + to get started'));`));
// Trigger menu
await clickSel(act('add'));
await clickSel(act('menu'));
const menu = q(`return JSON.stringify([...panel.querySelectorAll('.an-mopt')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.width), Math.round(r.height), Math.round(r.left - P0.left), Math.round(r.top - P0.top)]; }));`);
const oM = F.triggerMenu.map((x) => [x.split(' @')[0], ...parseBox(x)]);
add('Trigger menu: six on their boxes', menu.length === 6 && menu.every((m, i) => m[0] === oM[i][0] && m[1] === 89 && m[2] === 92 && near(m[3], oM[i][1] - 578, 1) && near(m[4], oM[i][2] - 301, 1)), JSON.stringify(menu));
await clickSel(`[...panel.querySelectorAll('.an-mopt')][0]`);
// Each preset's values, by trigger: pick, Edit, read each tab
for (const [trigger, label] of [['hover', 'On Hover'], ['press', 'On Press'], ['loop', 'Loop'], ['scroll', 'On Scroll'], ['appear', 'On Appear'], ['follow', 'Follow']]) {
  await pickTrigger(label);
  const names = q(`return JSON.stringify([...panel.querySelectorAll('.an-tname')].map((e) => e.textContent).join());`);
  add(`${label}: preset names`, names === F.presets[trigger].map((p) => p.name).join(), names);
  let bad = [], tabsSeen = null;
  for (const p of F.presets[trigger]) {
    await clickRadio(p.id, 80);
    await clickSel(act('gear'), 60);
    const tabs = q(`return JSON.stringify([...panel.querySelectorAll('.an-tab')].map((e) => e.textContent));`);
    tabsSeen = tabs;
    const seen = {};
    for (const t of tabs) { await clickTab(t); seen[t] = fieldsNow(); }
    const poseOf = { Start: p.start, End: p.end, Range: p.end };
    for (const t of tabs) if (t !== 'Timing' && seen[t].join() !== poseOf[t].join()) bad.push(`${p.name} ${t}: ${seen[t]}`);
    const wants = ['type', 'when', 'action', 'startPasses', 'endPasses', 'ease', 'custom', 'bounce', 'duration', 'delay', 'iterations', 'screen', 'motion', 'on', 'smoothing', 'radius'].map((k) => p[k]).filter((v) => v != null).map(String);
    const got = seen.Timing;
    for (const w of wants) if (!got.includes(w)) bad.push(`${p.name} Timing ${w} not in ${got}`);
    await clickSel(`panel.querySelector('.an-back')`, 60);
  }
  add(`${label}: all six preset values, tab by tab`, !bad.length, bad.slice(0, 3).join(' ; '));
  add(`${label}: its tabs`, tabsSeen.join() === TABS_OF[trigger].join(), tabsSeen);
  // The row's second line
  await clickSel(`panel.querySelector('.an-back')`, 80);
  const r = await rows();
  add(`${label}: list row`, r.length === 1 && r[0].startsWith(label), r);
  await clickSel(act('remove'), 150);
  await clickSel(act('add'), 120);
}
await clickSel(`panel.querySelector('.an-back')`);

// A tile: a row, one undo, the Edit button on the tile, the tile chosen.
await fresh();
await clickSel(act('add'));
await clickRadio('hover-1', 120);
add('A tile adds one row', (await model()).length === 1 && model()[0].preset === 'hover-1');
add('A tile: Edit button at its box', nearBox(box(`panel.querySelector('.an-gear')`), [115, 114, 36, 36]), box(`panel.querySelector('.an-gear')`));
add('A tile: the block says it has animations', q(`const b = d.querySelector('.fe-block[data-block-id="${id}"] .sqs-block'); return JSON.stringify(b.hasAttribute('data-has-block-animations'));`));
await clickSel(act('gear'));
add('Editor: title', q(`return JSON.stringify(!!byText('On Hover') && !panel.querySelector('[data-btab]'));`));
add('Editor: stage and square', nearBox(box(`panel.querySelector('.an-stage')`), [22, 55, 276, 70]) && nearBox(box(`panel.querySelector('.an-stage .an-sq')`), [142, 72, 36, 36]), box(`panel.querySelector('.an-stage')`));
add('Editor: tabs', nearBox(box(`panel.querySelectorAll('.an-tab')[0]`), [22, 136, 138, 36]) && nearBox(box(`panel.querySelectorAll('.an-tab')[1]`), [160, 136, 138, 36]), box(`panel.querySelectorAll('.an-tab')[0]`));
await clickTab('End');
const oEnd = F.views.hoverEnd;
add('End: rows on their boxes', ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew'].every((n) => { const o = oracleText(oEnd, n), v = box(`byText(${JSON.stringify(n)})`); return near(v[0], o[0]) && near(v[1] + v[3] / 2, o[1] + o[3] / 2, 1.5); }), '');
const fb = q(`return JSON.stringify([...panel.querySelectorAll('.an-box')].map((e) => rel(e)));`);
add('End: field boxes', nearBox(fb[0], [116, 183, 182, 44]) && nearBox(fb[1], [116, 234, 182, 44]) && nearBox(fb[2], [116, 285, 88, 44]) && nearBox(fb[3], [210, 285, 88, 44]) && nearBox(fb[7], [210, 387, 88, 44]), JSON.stringify(fb));
add('End: Preview on the foot', nearBox(box(`panel.querySelector('.an-foot')`), [0, 447, 320, 55], 2), box(`panel.querySelector('.an-foot')`));
add('End: no note on Hover', q(`return JSON.stringify(!panel.querySelector('.an-note'));`));
// The End tab holds the block in its pose; Timing lets go.
const poseNow = () => q(`const b = d.querySelector('.fe-block[data-block-id="${id}"]'), c = W.getComputedStyle(b); return JSON.stringify([c.transform, c.opacity, b.getBoundingClientRect().width]);`);
const hE = F.hoverPoses.hoverEnd;
add('End tab: the block in the End pose', poseNow()[0] === hE[0], poseNow());
add('The panel stays when the block moves', q(`const r = panel.getBoundingClientRect(); return JSON.stringify(r.left > 0);`));
await clickTab('Timing');
add('Timing tab: the pose let go', poseNow()[0] === F.hoverPoses.hoverTiming[0], poseNow());
add('Timing: Spring rows, Bounce, Duration, Delay', fieldsNow().join() === 'Spring,0.3,0.5s,0s', fieldsNow());
// Ease options, on the button
await clickSel(`panel.querySelector('.an-sel')`);
const opt = q(`const b = panel.querySelector('.an-sel').getBoundingClientRect(); return JSON.stringify([...pop.querySelectorAll('[data-an-opt]')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent, r.width, r.height, r.left - b.left, r.top - b.top]; }));`);
add('Ease menu: the ten in order, 144 by 44', opt.map((o) => o[0]).join() === F.options.ease.map((x) => x.split(' @')[0]).join() && opt.every((o) => o[1] === 144 && o[2] === 44), JSON.stringify(opt.slice(0, 2)));
add('Ease menu: at the button', near(opt[0][3], -9, 1) && near(opt[0][4], 0, 1), JSON.stringify(opt[0]));
const pick = async (name) => { await clickSel(`panel.querySelector('.an-sel')`); await clickSel(`[...pop.querySelectorAll('[data-an-opt]')].find((e) => e.textContent === ${JSON.stringify(name)})`); };
await clickSel(`[...pop.querySelectorAll('[data-an-opt]')].find((e) => e.textContent === 'Linear')`);
add('Linear: no Bounce', fieldsNow().join() === 'Linear,0.5s,0s', fieldsNow());
add('An edit moves the row to Custom', model()[0].preset === 'custom', model()[0].preset);
await pick('Custom');
add('Custom: its curve field', fieldsNow().join() === 'Custom,0, 0, 1, 1,0.5s,0s', fieldsNow());
add('Custom: the field box', nearBox(box(`panel.querySelector('.an-cbox')`), [22, 234, 276, 44]), box(`panel.querySelector('.an-cbox')`));
await pick('In Out');
add('In Out: Duration and Delay', fieldsNow().join() === 'In Out,0.5s,0s', fieldsNow());
// Back goes to the picker with a Custom tile; a row off its preset opens on its values.
await clickSel(`panel.querySelector('.an-back')`);
add('Back: a Custom tile, chosen', q(`const t = panel.querySelector('[data-anim-tile="custom"]'); return JSON.stringify(!!t && t.querySelector('input').checked);`));
const cb = box(`panel.querySelector('[data-anim-tile="custom"]')`);
add('Custom tile: above the six, full width', near(cb[0], 22) && near(cb[2], 276) && near(cb[1], 105, 2) && near(cb[3], 96, 2), cb);
const h1 = box(`panel.querySelector('[data-anim-tile="hover-1"]')`);
add('Then the six tiles below it', near(h1[1], 207, 2), h1);
await clickSel(`panel.querySelector('.an-back')`);
await clickSel(`panel.querySelector('.an-open')`);
add('An edited row opens on its values', q(`return JSON.stringify(!!panel.querySelector('.an-editor'));`));
await clickSel(`panel.querySelector('.an-back')`); await clickSel(`panel.querySelector('.an-back')`);
// List row boxes
const rb = q(`const b = panel.querySelector('.an-item'); return JSON.stringify(['.an-open', '.an-rm', '.an-ra', '.an-pv'].map((s) => rel(b.querySelector(s))));`);
add('List row: Open, Remove, Actions, Preview boxes', nearBox(rb[0], [72, 119, 87, 38]) && nearBox(rb[1], [165, 120, 36, 36]) && nearBox(rb[2], [211, 120, 36, 36]) && nearBox(rb[3], [258, 120, 36, 36]), JSON.stringify(rb));
add('List row: name and time', q(`return JSON.stringify(panel.querySelector('.an-open').textContent.trim());`) === 'On Hover0.5s', '');
// Second row, row pitch
await clickSel(act('add')); await clickRadio('hover-1', 80); await clickSel(`panel.querySelector('.an-back')`);
const rb2 = q(`return JSON.stringify(rel(panel.querySelectorAll('.an-item')[1].querySelector('.an-open')));`);
add('Second row 56 lower', near(rb2[1], 175), rb2);
// One undo per pick: the second row goes, and comes back on redo-free reload of the first.
q(`fe.undo(); await sleep(250); return 'true';`);
add('One undo takes a preset row away', (await rows()).length === 1, rows());
// Row and list actions
await clickSel(`panel.querySelector('.an-item .an-ra')`);
const ra = q(`return JSON.stringify([...pop.querySelectorAll('button')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent, e.disabled, Math.round(r.left), Math.round(r.top) - Math.round(panel.getBoundingClientRect().top), r.width, r.height]; }));`);
add('Row actions: Copy and Paste animation, Paste grey', ra[0][0] === 'Copy animation' && ra[1][0] === 'Paste animation' && ra[1][1] === true && ra[0][4] === 144 && ra[0][5] === 44, JSON.stringify(ra));
await clickSel(`pop.querySelector('[data-an-clip="copy"]')`);
await clickSel(`panel.querySelector('[data-anim="listacts"]')`);
const la = q(`return JSON.stringify([...pop.querySelectorAll('button')].map((e) => [e.textContent, e.disabled]));`);
add('List actions: Copy and Paste animations', la.map((x) => x[0]).join() === F.list.listActions.map((x) => x.split(' @')[0]).join() && la[1][1] === false, JSON.stringify(la));
await clickSel(`pop.querySelector('[data-an-clip="paste"]')`);
add('Paste adds the copied row', (await rows()).length === 2, rows());
q(`fe.undo(); await sleep(250); return 'true';`);
// Remove asks nothing and is one undo.
await clickSel(`panel.querySelector('.an-item .an-rm')`);
add('Remove: no question, the row goes', (await rows()).length === 0);
q(`fe.undo(); await sleep(250); return 'true';`);
add('Undo brings the row back', (await rows()).length === 1, rows());

// Typing, scrub and Reset on a field.
await fresh();
await clickSel(act('add')); await clickRadio('hover-1', 80); await clickSel(act('gear')); await clickTab('End');
const typeInto = async (i, text) => { const c = q(`const e = panel.querySelectorAll('.an-box input')[${i}]; e.focus(); e.value = ${JSON.stringify(text)}; e.dispatchEvent(new Event('change', { bubbles: true })); await sleep(220); return 'true';`); };
await typeInto(0, '50%');
add('Typed Opacity 50%', fieldsNow()[0] === '50%', fieldsNow());
add('The block shows it', poseNow()[1] === '0.5', poseNow());
q(`fe.undo(); await sleep(220); return 'true';`);
add('One undo for a typed value', fieldsNow()[0] === '100%', fieldsNow());
await typeInto(1, '12');
add('A bare number takes the unit', fieldsNow()[1] === '12°', fieldsNow());
add('Reset is on the fields off their default', q(`return JSON.stringify([...panel.querySelectorAll('.an-box .sc-reset')].map((e) => e.classList.contains('is-on')));`).join() === 'false,true,true,true,false,false,false,false', '');
const rz = q(`const e = panel.querySelectorAll('.an-box .sc-reset'); return JSON.stringify([rel(e[1]), rel(e[2]), rel(e[3])]);`);
add('Reset boxes: 291, 197, 291', near(rz[0][0], 291, 2) && near(rz[1][0], 197, 2) && near(rz[2][0], 291, 2) && rz[0][2] === 16, JSON.stringify(rz));
// Typed without Enter: no Reset yet. Enter takes it, keeps the focus, and Reset can be pressed (CAP-L6RESET.json).
const resetState = (sel) => q(`const f = ${sel}, b = f.closest('.sc-box').querySelector('.sc-reset'), c = getComputedStyle(b), r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify({ value: f.value, focused: document.activeElement === f, opacity: c.opacity, pointer: c.pointerEvents, onTop: t === b || b.contains(t) });`);
// The edges of a narrow field are scrub zones, so the press goes just inside the left one.
const realType = async (sel, text) => { const c = q(`const r = (${sel}).closest('.sc-box').getBoundingClientRect(); return JSON.stringify([r.left + 16, r.top + r.height / 2]);`); mouse(S, 'move', c[0], c[1]); await pause(60); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(40); mouse(S, 'up', c[0], c[1]); await pause(150); browser(S, 'press', 'End'); for (const k of text) browser(S, 'press', k); await pause(150); };
const af = (i) => `panel.querySelectorAll('.an-box input')[${i}]`;
await realType(af(6), '5');
let rs = resetState(af(6));
add('Animation: typed without Enter, no Reset', rs.focused && rs.opacity === '0' && rs.pointer === 'none' && !rs.onTop, JSON.stringify(rs));
browser(S, 'press', 'Enter'); await pause(300);
rs = resetState(af(6));
add('Animation: 0° then 5 is 5°, as read', rs.value === '5°', JSON.stringify(rs));
add('Animation: Enter keeps the focus, Reset can be pressed', rs.focused && rs.opacity === '1' && rs.pointer === 'auto' && rs.onTop, JSON.stringify(rs));
q(`fe.undo(); await sleep(220); return 'true';`);
q(`document.activeElement.blur(); await sleep(100); return 'true';`);
const hover = (sel) => { const c = q(`const r = ${sel}.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`); mouse(S, 'move', c[0], c[1]); return c; };
await clickSel(`panel.querySelectorAll('.an-box input')[1]`); await pause(120);
await clickSel(`panel.querySelectorAll('.an-box .sc-reset')[1]`);
add('Reset goes back to the default', fieldsNow()[1] === '0°', fieldsNow());
const drag = async (sel, dx) => { const c = q(`const r = ${sel}.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`); mouse(S, 'move', c[0], c[1]); await pause(80); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(50); for (let i = 1; i <= 4; i++) { mouse(S, 'move', c[0] + (i * dx) / 4, c[1], { buttons: 1 }); await pause(30); } mouse(S, 'up', c[0] + dx, c[1]); await pause(220); };
await clickSel(`panel.querySelectorAll('.an-box')[1].querySelector('.sc-r')`);
add('A click on the edge changes nothing', fieldsNow()[1] === '0°', fieldsNow());
await drag(`panel.querySelectorAll('.an-box')[1].querySelector('.sc-r')`, 20);
add('20px on Rotate is 8°, as read', fieldsNow()[1] === F.scrub.design20px.Rotate[1], fieldsNow());
await drag(`panel.querySelectorAll('.an-box')[2].querySelector('.sc-r')`, 20);
add('20px on Scale goes on from its value', fieldsNow()[2] === '118%', fieldsNow());
q(`fe.undo(); await sleep(220); return 'true';`);
add('One undo for a drag', fieldsNow()[2] === '110%', fieldsNow());
await clickTab('Timing');
await drag(`panel.querySelectorAll('.an-box')[1].querySelector('.sc-r')`, 40);
add('40px on Duration is 2.1s, as read', fieldsNow().includes(F.scrub.duration40px[1]), fieldsNow());
// The scrub and Reset on the Design tab's transforms.
await fresh();
q(`panel.querySelector('[data-btab="Design"]').click(); await sleep(220); return 'true';`);
const dv = (k) => q(`return JSON.stringify(String(parseFloat(panel.querySelector('input[data-design="${k}"]').value.replace(/,/g, ''))));`);
const dbox = (k) => `panel.querySelector('input[data-design="${k}"]').closest('.bp-box')`;
for (const [k, name, want] of [['rotate', 'Rotate', '8'], ['sx', 'ScaleX', '108'], ['tx', 'OffsetX', '8']]) {
  await drag(`${dbox(k)}.querySelector('.sc-r')`, 20);
  add(`Design ${name}: 20px, as read`, dv(k) === want && parseFloat(F.scrub.design20px[name][1]) === Number(want), dv(k));
}
await drag(`${dbox('opacity')}.querySelector('.sc-r')`, 20);
add('Design Opacity stays at its top', dv('opacity') === '100', dv('opacity'));
add('Design: a rule follows the drag', q(`const b = d.querySelector('.fe-block[data-block-id="${id}"]'); return JSON.stringify(W.getComputedStyle(b).transform !== 'none');`));
await clickSel(`${dbox('rotate')}.querySelector('input')`); await pause(120);
await clickSel(`${dbox('rotate')}.querySelector('.sc-reset')`);
add('Design Reset: back to 0', dv('rotate') === '0', dv('rotate'));
q(`fe.undo(); await sleep(220); return 'true';`);
add('Design Reset: one undo', dv('rotate') === '8', dv('rotate'));
const dIn = `${dbox('ty')}.querySelector('input')`;
await realType(dIn, '5');
rs = resetState(dIn);
add('Design: typed without Enter, no Reset', rs.opacity === '0' && rs.pointer === 'none' && !rs.onTop, JSON.stringify(rs));
browser(S, 'press', 'Enter'); await pause(300);
rs = resetState(dIn);
add('Design: Enter keeps the focus, Reset can be pressed', rs.focused && rs.opacity === '1' && rs.pointer === 'auto' && rs.onTop, JSON.stringify(rs));

// The other triggers' Timing rows.
await fresh();
q(`panel.querySelector('[data-btab="Animation"]').click(); await sleep(200); return 'true';`);
await clickSel(act('add')); await pickTrigger('On Scroll'); await clickRadio('scroll-1', 80); await clickSel(act('gear')); await clickTab('Timing');
const labels = () => q(`return JSON.stringify([...panel.querySelectorAll('.an-rows .an-l')].map((e) => e.textContent));`);
add('On Scroll Passes: its rows', labels().join() === 'When,Action,Start,Passes,End,Passes,Ease,Iterations', labels());
add('On Scroll: a grey Scroll to preview', q(`const b = panel.querySelector('.an-footbtn'); return JSON.stringify(b.disabled && b.textContent === 'Scroll to preview');`));
add('On Scroll: edges chosen Top and Bottom', q(`return JSON.stringify([...panel.querySelectorAll('.an-edge.is-on')].map((e) => e.getAttribute('aria-label')));`).join() === 'Top,Bottom', '');
add('Edge buttons: boxes as read', (() => { const o = F.views.scrollPasses.c.filter((x) => /\|(Top|Middle|Bottom)\|/.test(x)).map((x) => x.split('|').pop().split(',').map(Number)); const v = q(`return JSON.stringify([...panel.querySelectorAll('.an-edge')].map((e) => rel(e)));`); return o.length === 6 && v.length === 6 && v.every((b, i) => nearBox(b, o[i], 2)); })());
const pickAt = async (n, name) => { await clickSel(`panel.querySelectorAll('.an-sel')[${n}]`); await clickSel(`[...pop.querySelectorAll('[data-an-opt]')].find((e) => e.textContent === ${JSON.stringify(name)})`); };
await clickSel(`panel.querySelectorAll('.an-sel')[1]`);
add('Action: the five', q(`return JSON.stringify([...pop.querySelectorAll('[data-an-opt]')].map((e) => e.textContent));`).join() === F.options.action.map((x) => x.split(' @')[0]).join(), '');
await clickSel(`[...pop.querySelectorAll('[data-an-opt]')].find((e) => e.textContent === 'Enters')`);
add('On Scroll Enters: its rows', labels().join() === 'When,Action,Start,End,Ease,Iterations', labels());
await pickAt(1, 'Custom');
add('On Scroll Custom: its rows', labels().join() === 'When,Action,Top Inset,Bottom Inset,Start,Passes,End,Passes,Ease,Iterations', labels());
await clickSel(`panel.querySelectorAll('.an-sel')[2]`);
add('Crossing: the six', q(`return JSON.stringify([...pop.querySelectorAll('[data-an-opt]')].map((e) => e.textContent));`).join() === F.options.crossing.map((x) => x.split(' @')[0]).join(), '');
await clickSel(`[...pop.querySelectorAll('[data-an-opt]')].find((e) => e.textContent === 'Cover')`);
add('Crossing: a pick shows', fieldsNow().includes('Cover'), fieldsNow());
await clickTab('Start');
add('On Scroll Start: the note', q(`return JSON.stringify(panel.querySelector('.an-note')?.textContent);`) === 'Values are relative to design settings', '');
add('On Scroll Start: the block in the Start pose', poseNow()[0] === F.poses.scroll1.Start[0][0], poseNow());
await clickSel(`panel.querySelector('.an-back')`);
await pickTrigger('On Appear'); await clickRadio('appear-3', 80); await clickSel(act('gear')); await clickTab('Timing');
add('On Appear: its rows', labels().join() === 'Ease,Bounce,Duration,Delay,When,Edge,Passes Screen', labels());
await clickTab('Start');
add('On Appear Start: the block in the Start pose', poseNow()[0] === F.poses.appear3.Start[0][0] && poseNow()[1] === F.poses.appear3.Start[0][1], poseNow());
await clickSel(`panel.querySelector('.an-back')`);
await pickTrigger('Follow'); await clickRadio('follow-1', 80); await clickSel(act('gear')); await clickTab('Timing');
add('Follow: its rows', labels().join() === 'Motion,On,Smoothing,Radius,Bounce,Snap Back', labels());
add('Follow: Snap Back on', q(`return JSON.stringify(panel.querySelector('[data-afield="snap"]').checked);`));
await clickTab('Range');
add('Follow Range: its fields and note', fieldsNow().join() === F.poses.follow1.Range[1].join() && !!q(`return JSON.stringify(!!panel.querySelector('.an-note'));`), fieldsNow());
add('Follow Range: the block moved by its offset', q(`const b = d.querySelector('.fe-block[data-block-id="${id}"]'); return JSON.stringify(W.getComputedStyle(b).translate);`) === F.poses.follow1.Range[0][2], '');
await clickSel(`panel.querySelector('.an-back')`);
await pickTrigger('Loop'); await clickRadio('loop-2', 80); await clickSel(act('gear')); await clickTab('Timing');
add('Loop: its rows', labels().join() === 'Type,Ease,Duration,Delay', labels());
await clickSel(`panel.querySelector('.an-sel')`);
add('Type: Ping Pong and Continuous', q(`return JSON.stringify([...pop.querySelectorAll('[data-an-opt]')].map((e) => e.textContent));`).join() === F.options.type.map((x) => x.split(' @')[0]).join(), '');
await clickSel(`[...pop.querySelectorAll('[data-an-opt]')][1]`);
await clickTab('End');
add('Loop End: the block in its pose', poseNow()[0] === F.poses.loop2.End[0][0], poseNow());
await clickSel(`panel.querySelector('.an-back')`);
// Start blank: each trigger's values.
for (const [t, label] of [['hover', 'On Hover'], ['press', 'On Press'], ['loop', 'Loop'], ['scroll', 'On Scroll'], ['appear', 'On Appear'], ['follow', 'Follow']]) {
  q(`fe.select(fe.model.sections[1].id, ${JSON.stringify(id)}); await sleep(60); return 'true';`);
  await clickSel(`panel.querySelector('.an-back') || panel.querySelector('[data-anim="add"]')`, 120);
  if (q(`return JSON.stringify(!!panel.querySelector('.an-list'));`)) await clickSel(act('add'));
  await pickTrigger(label);
  await clickSel(act('blank'));
  await clickTab('Timing');
  const got = fieldsNow(), want = Object.values(F.blank[t]).filter((v) => typeof v === 'string');
  add(`${label}: Start blank's values`, want.every((w) => got.includes(w)), `${got} / ${want}`);
  await clickSel(`panel.querySelector('.an-back')`);
  add(`${label}: blank shows a Custom tile`, q(`return JSON.stringify(!!panel.querySelector('[data-anim-tile="custom"]'));`));
  await clickSel(`panel.querySelector('.an-back')`);
  await clickSel(`panel.querySelector('.an-item:last-child .an-rm')`);
}

// Preview: frames against the oracle's, for each ease.
const sample = (play, ms, sel = `d.querySelector('.fe-block[data-block-id="${id}"]')`) => q(`const el = ${sel}, win = el.ownerDocument.defaultView, out = []; const t0 = win.performance.now(); ${play} await new Promise((res) => { const tick = () => { const t = win.performance.now() - t0; const s = win.getComputedStyle(el); out.push([Math.round(t), s.transform, s.opacity, el.getAttribute('data-m-id') ? 1 : 0]); if (t < ${ms}) win.requestAnimationFrame(tick); else res(); }; win.requestAnimationFrame(tick); }); return JSON.stringify(out);`);
const scale = (s) => { const m = /matrix\(([\d.e-]+)/.exec(s); return m ? Number(m[1]) : 1; };
await fresh();
await clickSel(act('add')); await clickRadio('hover-1', 1600);
const setEase = (e) => q(`const next = JSON.parse(JSON.stringify(fe.model)); const r = next.sections[1].blocks.find((b) => b.id === ${JSON.stringify(id)}).animations[0]; r.ease = ${JSON.stringify(e)}; r.bounce = '0.3'; r.duration = '0.5s'; fe.load(next); await sleep(300); fe.select(next.sections[1].id, ${JSON.stringify(id)}); await sleep(120); return 'true';`);
await clickSel(`panel.querySelector('.an-back')`);
for (const name of ['Spring .3', 'Ease', 'In Out', 'In Back', 'Out Back', 'In Out Back', 'In', 'Out', 'Linear']) {
  setEase(name.replace(' .3', ''));
  q(`if (!panel.querySelector('.an-item')) { document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(200); panel.querySelector('[data-btab="Animation"]')?.click(); await sleep(150); } return 'true';`);
  const fr = sample(`panel.querySelector('.an-pv').click();`, 560);
  const ours = fr.filter((x) => x[1] !== 'none').map((x) => [x[0], (scale(x[1]) - 1) / 0.1]);
  const at = (t) => { const a = ours.filter((x) => x[0] <= t).pop(), b = ours.find((x) => x[0] >= t); if (!a || !b) return null; return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0])); };
  // Each side's start is known to a frame or so: take the best lag within 30 ms.
  const worstAt = (lag) => Math.max(...F.curves[name].map(([t, v]) => { const o = at(t + lag); return o == null ? 0 : Math.abs(o - v); }));
  const worst = Math.min(...[-30, -20, -10, 0, 10, 20, 30].map(worstAt));
  add(`Preview, ${name}: the curve within .08`, worst <= 0.08, worst.toFixed(3));
}
setEase('Spring');
q(`if (!panel.querySelector('.an-item')) { document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(200); panel.querySelector('[data-btab="Animation"]')?.click(); await sleep(150); } return 'true';`);
const fw = sample(`panel.querySelector('.an-pv').click();`, 1800);
const m0 = fw.find((x) => x[3] === 1)?.[0] ?? 0, backAt = fw.find((x) => x[0] > m0 + 620 && Math.abs(scale(x[1]) - 1.1) > 0.002)?.[0], endAt = fw.find((x) => x[0] > m0 + 620 && x[3] === 0)?.[0];
add('Preview: turns back 1 s in (.5s run, .5s hold)', backAt != null && near(backAt - m0, F.preview.backStartsMs - F.preview.startMs, 70), backAt - m0);
add('Preview: the block is itself again after', fw.at(-1)[1] === 'none' && endAt != null, fw.at(-1));
add('Preview: leaves no inline style', q(`return JSON.stringify(!d.querySelector('.fe-block[data-block-id="${id}"]').getAttribute('style'));`));
// The page in preview mode: Look on Hover, Grow on Press.
await fresh();
await clickSel(act('add')); await clickRadio('hover-3', 80); await clickSel(`panel.querySelector('.an-back')`); await clickSel(act('add')); await pickTrigger('On Press'); await clickRadio('press-1', 900);
q(`document.getElementById('preview').click(); await sleep(450); return 'true';`);
const rc0 = q(`const b = d.querySelector('.fe-block[data-block-id="${id}"]'), r = b.getBoundingClientRect(), f = fr.getBoundingClientRect(); return JSON.stringify([f.left + r.left + r.width / 2, f.top + r.top + r.height / 2]);`);
const blockState = () => q(`const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${id}"]')); return JSON.stringify(c.transform);`);
mouse(S, 'move', rc0[0], rc0[1]); await pause(600);
const Hv = /matrix\(([\d.e-]+), ([\d.e-]+), ([\d.e-]+), ([\d.e-]+)/.exec(blockState());
add('Preview mode: Hover goes to its End', Hv && near(Math.hypot(+Hv[1], +Hv[2]), Math.hypot(0.837, 0.0744), 0.03), blockState());
mouse(S, 'down', rc0[0], rc0[1], { buttons: 1 }); await pause(600);
add('Preview mode: a press goes to Press End', near(scale(blockState()), 1.1, 0.01), blockState());
mouse(S, 'up', rc0[0], rc0[1]); await pause(600);
add('Preview mode: up comes back to Hover End', near(scale(blockState()), 0.836, 0.03), blockState());
mouse(S, 'move', 1500, 900); await pause(600);
add('Preview mode: leaving goes back', blockState() === 'none', blockState());
q(`document.getElementById('preview').click(); await sleep(350); return 'true';`);

// Loop, On Appear and On Scroll on the page (CAP-T15TRIGGERS.json). First the rules against every
// read, with the oracle's box and frame, then the same rows in preview mode on ours.
{
  const T = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T15TRIGGERS.json', import.meta.url)));
  const { appearAt, scrollSpan, scrollProgress, newAnimation, PRESETS } = await import('../app/src/animations.js');
  const boxOf = (when) => (when === 'Section' ? { top: T.section.top, h: T.section.h, self: false } : { top: T.block.top, h: T.block.h, self: true });
  for (const r of T.appear.reads) {
    const y = appearAt(boxOf(r.when), r, r.view);
    const ok = r.after == null ? y > r.lastRead : y <= r.after && (r.before < 0 || y > r.before - 1);
    add(`On Appear rule: ${r.preset || ''} ${r.edge} ${r.screen} ${r.when} ${r.start[0]} ${r.start[2]} ${r.start[5]}`, ok, `plays at ${y}, read ${r.before} to ${r.after}`);
  }
  for (const [id, e] of Object.entries(T.appear.presetEdges)) add(`Edge of ${id}`, newAnimation('appear', id).edge === e, newAnimation('appear', id).edge);
  for (const [id, e] of Object.entries(T.scroll.presetEdges)) { const a = newAnimation('scroll', id); add(`Edges of ${id}`, a.startEdge === e.start && a.endEdge === e.end, `${a.startEdge} ${a.endEdge}`); }
  const worst = (r) => { let w = 0, at = null; for (const [y, v] of r.at) { const p = scrollProgress(r.row, y, scrollSpan(boxOf(r.row.when), { topInset: '0%', bottomInset: '0%', ...r.row }, r.view)); if (Math.abs(p - v) > w) { w = Math.abs(p - v); at = [y, v, +p.toFixed(4)]; } } return [w, at]; };
  for (const r of T.scroll.reads) { const [w, at] = worst(r); add(`On Scroll rule: ${r.row.action} ${r.row.startCross || r.row.startEdge || ''} ${r.row.startPasses} ${r.row.endCross || r.row.endEdge || ''} ${r.row.endPasses} ${r.row.when} x${r.row.iterations}`, w <= 0.006, JSON.stringify(at)); }
  for (const r of T.scroll.presets) { const [w, at] = worst(r); add(`On Scroll rule: ${r.preset} with its ease`, w <= 0.02, JSON.stringify(at)); }

  const state = () => q(`const c = W.getComputedStyle(d.querySelector('.fe-block[data-block-id="${id}"]')); return JSON.stringify([c.transform, c.opacity, c.translate]);`);
  const angle = (t) => { const m = /matrix\(([\d.e-]+), ([\d.e-]+)/.exec(t); return m ? (Math.atan2(+m[2], +m[1]) * 180) / Math.PI : 0; };
  const previewBtn = (w) => q(`document.getElementById('preview').click(); await sleep(${w}); return 'true';`);
  const inlineNow = () => q(`return JSON.stringify(d.querySelector('.fe-block[data-block-id="${id}"]').getAttribute('style'));`);
  const scrollTo = (y, w = 120) => q(`W.scrollTo(0, ${y}); await sleep(${w}); return JSON.stringify(W.scrollY);`);
  const boxLive = () => q(`const e = d.querySelector('.fe-block[data-block-id="${id}"]'); let t = 0; for (let x = e; x; x = x.offsetParent) t += x.offsetTop; const r = e.getBoundingClientRect(); return JSON.stringify({ top: t, h: e.offsetHeight, self: true, rectTop: r.top + W.scrollY, view: W.innerHeight, max: d.documentElement.scrollHeight - W.innerHeight });`);
  // Spin: 36 degrees a second, from the moment preview goes on.
  await fresh();
  await clickSel(act('add')); await pickTrigger('Loop'); await clickRadio('loop-1', 500);
  await previewBtn(1000);
  const a0 = angle(state()[0]); await pause(1000); const a1 = angle(state()[0]);
  add('Loop: Spin turns 36 degrees a second', near(a1 - a0, T.loop.spin.degPerSecond, 12) && a0 > 15, `${a0} then ${a1}`);
  await previewBtn(300);
  add('Loop: out of preview it stops and leaves no style', state()[0] === 'none' && !inlineNow(), inlineNow());
  // Float: 2 s to its End, 2 s back.
  await fresh();
  await clickSel(act('add')); await pickTrigger('Loop'); await clickRadio('loop-2', 500);
  const h0 = boxLive().h;
  await previewBtn(0);
  await pause(1950); const fl1 = state(); await pause(2000); const fl2 = state();
  const ty = (t) => parseFloat(String(t).split(' ')[1]) || 0;
  add('Loop: Float reaches its End at 2 s', near(ty(fl1[2]), 20, 2) && near(scale(fl1[0]), T.loop.float.scale, 0.015), JSON.stringify(fl1));
  add('Loop: Float is back at 4 s', near(ty(fl2[2]), 0, 2) && near(scale(fl2[0]), 1, 0.015), JSON.stringify(fl2));
  await previewBtn(300);
  // Pop below the line holds, plays once as its middle meets the frame's bottom.
  await fresh();
  await clickSel(act('add')); await pickTrigger('On Appear'); await clickRadio('appear-1', 500);
  viewport(S, 1600, 300); await pause(500);
  await scrollTo(0, 300);
  const lb = boxLive();
  await previewBtn(500);
  const line = lb.top + lb.h / 2 - lb.view;
  add('On Appear: the page is long enough here', line > 40 && line < lb.max, JSON.stringify(lb));
  add('On Appear: holds Start before its line', near(scale(state()[0]), 0, 0.001), state()[0]);
  await scrollTo(Math.max(0, Math.floor(line - 30)), 500);
  add('On Appear: still Start just above the line', near(scale(state()[0]), 0, 0.001), state()[0]);
  await scrollTo(Math.ceil(line + 10), 1200);
  add('On Appear: plays past the line, to rest', state()[0] === 'none' && !inlineNow(), state()[0]);
  await scrollTo(0, 500);
  add('On Appear: does not play again', state()[0] === 'none', state()[0]);
  await previewBtn(300);
  viewport(S, 1600, 1000); await pause(400);
  // Drop on scroll: Top at the frame's bottom to Top at the frame's top.
  await fresh();
  await clickSel(act('add')); await pickTrigger('On Scroll'); await clickRadio('scroll-5', 500);
  viewport(S, 1600, 300); await pause(500);
  const lc = boxLive();
  await previewBtn(400);
  const row = newAnimation('scroll', 'scroll-5'), span = scrollSpan(lc, row, lc.view);
  for (const f of [0.25, 0.5, 0.8]) { const y = Math.round(span[0] + (span[1] - span[0]) * f); const got = await scrollTo(y); const want = scrollProgress(row, got, span); add(`On Scroll: Drop's opacity at ${f} of its span`, near(+state()[1], want, 0.01) && got === y, `${state()[1]} want ${want} at ${got}`); }
  await scrollTo(Math.ceil(span[1]) + 5);
  add('On Scroll: past its span it holds End', near(+state()[1], 1, 0.001) && near(scale(state()[0]), 1, 0.001), JSON.stringify(state()));
  await scrollTo(0, 200);
  await previewBtn(300);
  add('On Scroll: out of preview it leaves no style', state()[0] === 'none' && !inlineNow(), inlineNow());
  viewport(S, 1600, 1000); await pause(400);
}

// A phone: no list actions, no row actions, a wider row.
await fresh();
await clickSel(act('add')); await clickRadio('hover-1', 500); await clickSel(`panel.querySelector('.an-back')`);
q(`document.querySelector('[data-bp="mobile"], #view-mobile, [aria-label="Mobile View"]').click(); await sleep(500); return 'true';`);
const ph = q(`return JSON.stringify({ list: !!panel.querySelector('[data-anim="listacts"]'), ra: !!panel.querySelector('.an-ra'), open: panel.querySelector('.an-open') ? rel(panel.querySelector('.an-open')) : null, rm: panel.querySelector('.an-rm') ? rel(panel.querySelector('.an-rm')) : null });`);
add('Phone: no list or row actions', !ph.list && !ph.ra, JSON.stringify(ph));
add('Phone: row button and Remove boxes', ph.open && nearBox(ph.open, [72, 119, 133, 38]) && nearBox(ph.rm, [211, 120, 36, 36]), JSON.stringify(ph));
q(`document.querySelector('[data-bp="desktop"], #view-desktop, [aria-label="Desktop View"]').click(); await sleep(300); return 'true';`);

// An Animation set on a phone (CAP-L6ANIMPHONE.json), on a Shape.
{
  const AP = JSON.parse(readFileSync(new URL('../parity/findings/CAP-L6ANIMPHONE.json', import.meta.url)));
  const toView = async (v) => { q(`document.querySelector('[aria-label="${v} View"]').click(); await sleep(500); return 'true';`); };
  const toAnim = () => q(`panel.querySelector('[data-btab="Animation"]')?.click(); await sleep(150); return 'true';`);
  const toDesign = () => q(`panel.querySelector('[data-btab="Design"]')?.click(); await sleep(150); return 'true';`);
  const dots = () => q(`return JSON.stringify([...panel.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && getComputedStyle(e).textDecorationStyle === 'dotted').map((e) => e.textContent.trim()));`);
  const phoneBtn = () => q(`const e = panel.querySelector('[data-phone-btn]'); return JSON.stringify(e ? e.disabled : null);`);
  const setField = (k, v) => q(`const e = panel.querySelector('[data-afield="${k}"]'); e.focus(); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('change', { bubbles: true })); await sleep(180); return 'true';`);
  const fieldV = (k) => q(`return JSON.stringify(panel.querySelector('[data-afield="${k}"]')?.value ?? null);`);
  const openRow = (n = 0) => clickSel(`panel.querySelectorAll('.an-open')[${n}]`, 260);
  const values = async (n = 0) => { await openRow(n); if (q(`return JSON.stringify(!!panel.querySelector('[data-anim="gear"]'));`)) await clickSel(act('gear'), 260); };
  const toList = async () => { for (let k = 0; k < 3 && q(`return JSON.stringify(!!panel.querySelector('.an-back'));`); k++) await clickSel(`panel.querySelector('.an-back')`, 200); };
  const phoneAct = async (a) => { await toDesign(); await clickSel(`panel.querySelector('[data-phone-btn]')`, 200); await clickSel(`document.querySelector('[data-phone-act="${a}"]')`, 300); await toAnim(); };
  const undo = () => q(`fe.undo(); await sleep(200); return 'true';`);

  await fresh('Shape');
  await toView('Mobile');
  q(`if (!panel.querySelector('[data-btab]')) throw new Error('no panel on the phone'); return 'true';`);
  await toAnim();
  const add0 = q(`const e = panel.querySelector('[aria-label="Add a new animation"]'); const s = e.querySelector('svg'); return JSON.stringify({ disabled: e.disabled, svg: getComputedStyle(s).color, cursor: getComputedStyle(e).cursor });`);
  add('Phone, empty: + is off and grey, as read', add0.disabled === AP.add.disabled && add0.svg === AP.add.svg && add0.cursor === AP.add.cursor, JSON.stringify(add0));
  add('Phone, empty: no prompt under Triggers', q(`return JSON.stringify(!byText('Press + to get started') && !panel.querySelector('.an-empty'));`));
  add('Phone: no phone button on the Animation tab', phoneBtn() === null, String(phoneBtn()));
  await toDesign();
  add('Phone: on Design the button is there, off', phoneBtn() === true, String(phoneBtn()));
  await clickSel(`panel.querySelector('[data-btab="Animation"]')`);
  q(`panel.querySelector('[aria-label="Add a new animation"]').click(); await sleep(150); return 'true';`);
  add('Phone: pressing + does nothing', q(`return JSON.stringify(!!byText('Triggers') && !panel.querySelector('.an-back'));`));

  // A row made on desktop: shared, and a value set on the phone is the phone's.
  await toView('Desktop'); await toAnim();
  await clickSel(act('add')); await clickRadio('hover-1', 400); await toList();
  await toView('Mobile'); await toAnim();
  same2('Phone sees the row desktop made', rows(), ['On Hover0.5s']);
  await values();
  add('Row with nothing set: no dotted label', dots().length === 0, JSON.stringify(dots()));
  await setField('end:0', '37');
  same2('Opacity on the phone: only Opacity dotted', dots(), AP.reads.aOpacity.dots);
  await toList();
  const ownMark = () => q(`return JSON.stringify([...panel.querySelectorAll('.an-item')].map((r) => r.querySelector('.an-ico').classList.contains('is-own')));`);
  same2('Its row gets the dotted line under its icon', ownMark(), [true]);
  const mk = q(`const e = panel.querySelector('.an-ico.is-own'), r = e.getBoundingClientRect(), c = getComputedStyle(e, '::after'), p = panel.getBoundingClientRect(); return JSON.stringify({ box: [r.left - p.left + parseFloat(c.left), r.bottom - p.top - parseFloat(c.borderBottomWidth), parseFloat(c.width), parseFloat(c.borderBottomWidth)], style: [c.borderBottomStyle, c.borderBottomColor, c.height] });`);
  add('The dotted line: box as read', nearBox(mk.box, AP.rowMark.box), JSON.stringify(mk));
  same2('The dotted line: a dotted border, as measured', mk.style, AP.rowMark.measured);
  await openRow();
  add('A row changed on the phone opens on its values', q(`return JSON.stringify(!!panel.querySelector('.an-tabs') && !panel.querySelector('[data-anim="gear"]'));`));
  await toList(); await toDesign();
  add('The phone button lights', phoneBtn() === false, String(phoneBtn()));
  add('No dotted label on Design for it', dots().length === 0, JSON.stringify(dots()));
  undo();
  add('One undo takes it back', q(`return JSON.stringify(!fe.model.sections[1].blocks.find((b) => b.id === ${JSON.stringify(id)}).animations[0].phone);`));
  await toAnim(); await values(); await setField('end:0', '37'); await toList();
  await toView('Desktop'); await toAnim();
  await openRow();
  add('Desktop keeps its row on its preset', q(`return JSON.stringify(!!panel.querySelector('[data-anim="gear"]'));`));
  await clickSel(act('gear'), 260);
  add('Desktop keeps its Opacity', fieldV('end:0') === '100%', fieldV('end:0'));
  await setField('end:1', '30');
  await toList();
  await toView('Mobile'); await toAnim(); await values();
  add('A value the phone did not set follows desktop', fieldV('end:1') === '30°' && fieldV('end:0') === '37%', `${fieldV('end:1')} ${fieldV('end:0')}`);
  // Timing: Delay.
  await clickTab('Timing');
  add('Timing: no dot from an End value', dots().length === 0, JSON.stringify(dots()));
  await setField('delay', '0.9');
  same2('Delay on the phone: Delay dotted', dots(), AP.reads.jDuration.dots);
  await clickTab('End'); await toList();
  add('The phone row shows its delay', rows()[0].replace(/\s/g, '') === AP.reads.jList.rows[0].replace(/\s/g, ''), rows()[0]);
  await toView('Desktop'); await toAnim();
  add('Desktop row does not', rows()[0].replace(/\s/g, '') === 'OnHover0.5s', rows()[0]);
  same2('Desktop row has no dotted line', ownMark(), [false]);
  // Reset all, and Push.
  await toView('Mobile'); await toAnim(); await phoneAct('reset');
  await values();
  add('Reset all: the phone follows again, dots gone', fieldV('end:0') === '100%' && fieldV('end:1') === '30°' && dots().length === 0, `${fieldV('end:0')} ${dots()}`);
  await setField('end:0', '44'); await toList(); await phoneAct('push');
  await values();
  add('Push: phone keeps the value, no dot', fieldV('end:0') === '44%' && dots().length === 0, `${fieldV('end:0')} ${dots()}`);
  await toList(); await toDesign();
  add('Push: the button goes off', phoneBtn() === true, String(phoneBtn()));
  await toAnim(); await toView('Desktop'); await toAnim(); await values();
  add('Push: desktop has the value', fieldV('end:0') === '44%', fieldV('end:0'));
  await toList();

  // A pick on the phone is the phone's alone.
  await fresh('Shape');
  await clickSel(act('add')); await clickRadio('hover-1', 400); await toList();
  await toView('Mobile'); await toAnim();
  await openRow(); await clickRadio('hover-2', 400);
  await clickSel(act('gear'), 260);
  same2('A pick: all of End dotted', dots(), AP.reads.pEditor.dots);
  await toList();
  same2('A pick: the phone row is Lift', rows(), AP.reads.pPickedList.rows);
  await toView('Desktop'); await toAnim();
  same2('A pick: desktop stays on Grow', rows(), AP.reads.dAfter.rows);
  // Preview plays the phone's values on a phone.
  await toView('Mobile'); await toAnim();
  await values(); await setField('end:1', '45'); await setField('end:0', '40'); await toList();
  const peak = async () => { const before = q(`const e = d.querySelector('.fe-block[data-block-id="${id}"]'); window.__pk = []; const go = () => { const c = fr.contentWindow.getComputedStyle(e); window.__pk.push([c.transform, c.opacity]); if (window.__pk.length < 90) requestAnimationFrame(go); }; go(); return 'true';`); await clickSel(`panel.querySelector('[data-anim="play"]')`, 900); return q(`return JSON.stringify(window.__pk.map((x) => [x[0] === 'none' ? 1 : Number(x[0].split(',')[1]), Number(x[1])]).reduce((m, x) => [Math.max(m[0], Math.abs(x[0]) === 1 ? 0 : Math.abs(x[0])), Math.min(m[1], x[1])], [0, 1]));`); };
  const ph = await peak();
  add('Preview on a phone turns and fades by its values', ph[0] > 0.5 && near(ph[1], 0.4, 0.06), JSON.stringify(ph));
  await pause(1300);
  await toView('Desktop'); await toAnim();
  const dk = await peak();
  add('Preview on desktop stays on desktop values', dk[0] === 0 && dk[1] === 1, JSON.stringify(dk));
  await pause(1300);

  // Three rows: a trigger changed on the phone goes last, and Remove is for both.
  await fresh('Shape');
  await clickSel(act('add')); await clickRadio('hover-1', 400); await toList();
  await clickSel(act('add')); await clickRadio('hover-2', 400); await toList();
  await clickSel(act('add')); await clickRadio('hover-3', 400); await toList();
  await toView('Mobile'); await toAnim();
  same2('Three rows on the phone', rows(), AP.reads.oPhone.rows);
  await openRow(1); await clickRadio('hover-4', 400); await toList();
  same2('Same trigger: the row keeps its place', rows(), AP.reads.oPicked.rows);
  await openRow(0); await pickTrigger('Loop'); await clickRadio('loop-1', 400); await toList();
  same2('A changed trigger goes last', rows(), AP.reads.oLoop.rows);
  same2('Rows with phone values are marked, as read', q(`return JSON.stringify([...panel.querySelectorAll('.an-item')].map((r) => r.querySelector('.an-ico').classList.contains('is-own')));`), AP.rowMark.oLoop);
  await toView('Desktop'); await toAnim();
  same2('Desktop rows stay', rows(), AP.reads.oLoopDesk.rows);
  await toView('Mobile'); await toAnim();
  await clickSel(`[...panel.querySelectorAll('[aria-label="Remove animation"]')].pop()`, 300);
  same2('Remove the last row', rows(), AP.reads.oRmLast.rows);
  await toView('Desktop'); await toAnim();
  same2('It goes from desktop too', rows(), AP.reads.oRmLastDesk.rows);
  await toView('Mobile'); await toAnim(); await phoneAct('reset');
  same2('Reset all: rows as desktop', rows(), AP.reads.oReset.rows);
  await values(); await setField('end:0', '37');
  // The field is the Design tab's field (CAP-T6FIELDS.json).
  const TF = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T6FIELDS.json', import.meta.url)));
  const fp = (k) => q(`const i = panel.querySelector('[data-afield="${k}"]'), b = i.closest('.sc-box'), r = b.getBoundingClientRect(), bar = b.querySelector('.sc-bar'), rs = b.querySelector('.sc-reset'), c = getComputedStyle(rs); return JSON.stringify({ v: i.value, w: r.width, at: [r.left, r.top], arrows: !!b.querySelector('.sc-arrows'), letter: b.querySelector('.an-axis')?.textContent ?? null, bar: bar ? Math.round((bar.querySelector('i').getBoundingClientRect().left - r.left) * 10) / 10 : null, barOn: bar ? getComputedStyle(bar).opacity : null, ring: getComputedStyle(b).outlineStyle + ' ' + getComputedStyle(b).outlineWidth, chip: [c.backgroundColor, c.borderRadius, rs.getBoundingClientRect().width], focus: document.activeElement === i, caret: [i.selectionStart, i.selectionEnd] });`);
  const f0 = fp('end:0'), fX = fp('end:2X');
  add('Animation field: <>, no letter, and the bar at 37%', f0.arrows && f0.letter === null && Math.abs(f0.bar + 114.7) < 0.15, JSON.stringify(f0));
  add('Animation pair: a letter, no <>', !fX.arrows && fX.letter === 'X', JSON.stringify(fX));
  add('Animation field: the black chip, as read', f0.chip.join() === 'rgb(14, 14, 14),4px,16', JSON.stringify(f0.chip));
  const fieldDrag = async (k) => { const a = fp(k), x = a.at[0] + a.w / 2, y = a.at[1] + 4; mouse(S, 'move', x, y); await pause(70); mouse(S, 'down', x, y, { buttons: 1 }); await pause(50); mouse(S, 'move', x + 10, y, { buttons: 1 }); await pause(90); mouse(S, 'move', x + 20, y, { buttons: 1 }); await pause(170); const during = fp(k); mouse(S, 'up', x + 20, y); await pause(300); return [a, during, fp(k)]; };
  const [r0, rD, rA] = await fieldDrag('end:1');
  add('Rotate in a drag: 8 up, the bar and ring on', parseFloat(rD.v) === parseFloat(r0.v) + 8 && rD.barOn === '1' && rD.ring === 'solid 2px', JSON.stringify(rD));
  add('Let go: the bar off, focus on the input, caret at the end', rA.barOn === '0' && rA.focus && rA.caret.join() === `${rA.v.length},${rA.v.length}`, JSON.stringify(rA));
  await clickSel(`panel.querySelector('[data-anim="tab"][data-v="Timing"]')`, 260);
  const [t0, tD, tA] = await fieldDrag('duration');
  add('Timing field: <> and no bar, width as read', t0.arrows && t0.bar === null && t0.w === TF.timing.box[0], JSON.stringify(t0));
  add('Timing drag: 0.8s up, ring on, focus after', Math.abs(parseFloat(tD.v) - parseFloat(t0.v) - 0.8) < 0.001 && tD.ring === 'solid 2px' && tA.focus, JSON.stringify([tD, tA]));
  q(`document.activeElement?.blur?.(); return 'true';`);
  await toList();
  await clickSel(`panel.querySelector('[aria-label="Remove animation"]')`, 300);
  same2('A row with own values removed', rows(), AP.reads.oOwnRm.rows);
  await toDesign();
  add('The button stays on after that (read three times)', phoneBtn() === false, String(phoneBtn()));
  await toView('Desktop');
}

// Nothing leaks to a block made after.
await fresh();
add('A new block starts empty', q(`return JSON.stringify(!!byText('Press + to get started'));`));

// The same session, no reload: a pick stays on its block (ANIMFLOW.carry).
await fresh();
await clickSel(act('add'));
await clickRadio('hover-1', 120);
const picked = id;
add('After a pick: the first block has its row', (await model()).length === 1);
for (const name of ['Text', 'Image']) {
  const off = q(`const r = d.querySelectorAll('.page-section')[1].getBoundingClientRect(), o = fr.getBoundingClientRect(); return JSON.stringify([o.left + r.left + r.width - 60, 500]);`);
  mouse(S, 'move', off[0], off[1]); await pause(60); mouse(S, 'down', off[0], off[1], { buttons: 1 }); await pause(40); mouse(S, 'up', off[0], off[1]); await pause(350);
  id = q(`document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="${name}"]').click(); await sleep(450); const b = fe.model.sections[1].blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(250); panel.querySelector('[data-btab="Animation"]').click(); await sleep(200); return JSON.stringify(b.id);`);
  add(`After a pick: a new ${name} has no row`, id !== picked && (await model()).length === 0 && q(`return JSON.stringify(!!byText('Press + to get started'));`), JSON.stringify(model()));
}
id = picked;
add('After a pick: the first block keeps its row', (await model()).length === 1);


// U11, T15: Copy Properties and Paste Properties on the block menu (parity/findings/CAP-COPYANIM.json).
{
  const C = JSON.parse(readFileSync(new URL('../parity/findings/CAP-COPYANIM.json', import.meta.url)));
  const bs = C.boxes;
  await fresh('Text');
  await clickSel(act('add')); await clickRadio('hover-1', 200);
  const one = (await model())[0];
  const proto = q(`const b = JSON.parse(JSON.stringify(fe.model.sections[1].blocks.find((x) => x.id === ${JSON.stringify(id)}))); delete b.animations; return JSON.stringify(b);`);
  const row = (k) => ({ ...one, preset: `p${k}` });
  const blk = (bid, top, extra = {}) => ({ ...proto, id: bid, layout: { desktop: { ...proto.layout.desktop, area: [top, 2, top + 4, 10] }, mobile: { ...proto.layout.mobile, area: [top, 2, top + 4, 10] } }, ...extra });
  const base = { a: blk('a', 1, { animations: [row(1), row(2)], design: { opacity: 50, rotate: 10 } }), b: blk('b', 6), c: blk('c', 11, { animations: [row(3)], design: { opacity: 80, rotate: 30 } }), e: blk('e', 16), z: blk('z', 21, { animations: [row(9)] }) };
  const load = () => q(`const next = JSON.parse(JSON.stringify(fe.model)); next.sections = [{ ...next.sections[0], id: 's1', blocks: ${JSON.stringify(Object.values(base))}, rows: { desktop: 40, mobile: 40 } }, { ...next.sections[0], id: 's2', blocks: [${JSON.stringify(blk('o', 1))}], rows: { desktop: 8, mobile: 8 } }]; fe.load(next); await sleep(300); d.querySelector('.fe-block[data-block-id="a"]').scrollIntoView({ block: 'center' }); await sleep(120); return 'true';`);
  const anims = (bid) => q(`const b = fe.model.sections.flatMap((s) => s.blocks).find((x) => x.id === '${bid}'); return JSON.stringify((b.animations || []).map((r) => r.preset));`);
  const menu = async (bid) => { q(`document.getElementById('arrange-menu').hidden = true; const e = d.querySelector('.fe-block[data-block-id="${bid}"]'); e.scrollIntoView({ block: 'center' }); await sleep(60); const r = e.getBoundingClientRect(); e.firstElementChild.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 30, clientY: r.top + 10, button: 2, view: W })); await sleep(120); return 'true';`); };
  const hover = async (label) => { const c = q(`const e = document.querySelector('#context-menu [aria-label="${label}"]'); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`); mouse(S, 'move', c[0], c[1]); await pause(160); };
  const subRows = () => q(`const m = document.getElementById('arrange-menu'); return JSON.stringify(m.hidden ? null : [...m.querySelectorAll('button')].map((b) => [b.getAttribute('aria-label'), !b.disabled]));`);
  const press = (label) => clickSel(`document.querySelector('#arrange-menu [aria-label="${label}"]')`, 200);
  const copyAnim = async (bid) => { await menu(bid); await hover('Copy Properties'); await press('Animations'); };
  const paste = async (bid, label) => { await menu(bid); await hover('Paste Properties'); await press(label); };
  const undoNow = () => q(`fe.undo(); await sleep(150); return 'true';`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  load(); await pause(200);
  await menu('b');
  const mm = q(`const m = document.getElementById('context-menu'), r = m.getBoundingClientRect(), f = m.querySelector('button').getBoundingClientRect(), c = getComputedStyle(m); return JSON.stringify({ w: r.width, h: r.height, top: f.top - r.top, radius: c.borderRadius, shadow: c.boxShadow, font: getComputedStyle(m.querySelector('button')).fontSize });`);
  add('The block menu: box', near(mm.w, bs.menu[2], 0.5) && near(mm.h, bs.menu[3]) && near(mm.top, bs.menuFirstRowTop), JSON.stringify(mm));
  add('The block menu: corner and type', mm.radius === bs.menuRadius && mm.font === bs.fontSize, JSON.stringify(mm));
  add('The block menu: shadow', mm.shadow.includes('0px 2px 8px 0px') && mm.shadow.includes('0px 0px 1px 0px'), mm.shadow);
  await hover('Arrange');
  const ar = q(`const m = document.getElementById('arrange-menu').getBoundingClientRect(), p = document.querySelector('#context-menu [aria-label="Arrange"]').getBoundingClientRect(); return JSON.stringify({ w: m.width, h: m.height, top: m.top - p.top, gap: m.left - p.right });`);
  add('Arrange: a hover opens it, box', near(ar.w, bs.arrangeSub[2], 0.5) && near(ar.h, bs.arrangeSub[3]) && near(ar.top, 0) && near(ar.gap, bs.arrangeSub[0] - bs.arrangeParentRow[0] - bs.arrangeParentRow[2], 1), JSON.stringify(ar));
  await hover('Copy Properties');
  add('Copy Properties: a hover opens it, Animations grey with no rows', same(subRows(), [['Transforms', true], ['Animations', false]]), JSON.stringify(subRows()));
  const sub = (label) => q(`const m = document.getElementById('arrange-menu').getBoundingClientRect(), p = document.querySelector('#context-menu [aria-label="${label}"]').getBoundingClientRect(), it = document.querySelector('#arrange-menu button'), t = it.querySelector('span').getBoundingClientRect(), c = getComputedStyle(it), g = getComputedStyle(document.querySelector('#arrange-menu button:disabled')); return JSON.stringify({ gap: m.left - p.right, top: m.top - p.top, w: m.width, h: m.height, row: it.getBoundingClientRect().height, text: t.left - m.left, font: c.fontSize, on: c.color, grey: g.color, radius: getComputedStyle(document.getElementById('arrange-menu')).borderRadius });`);
  const cs = sub('Copy Properties');
  add('Copy Properties rows: box', near(cs.gap, bs.copySub[0] - bs.copyParentRow[0] - bs.copyParentRow[2], 1) && near(cs.top, 0) && near(cs.w, bs.copySub[2]) && near(cs.h, bs.copySub[3]) && near(cs.row, bs.copySubRow[3]) && near(cs.text, bs.rowTextLeft), JSON.stringify(cs));
  add('Copy Properties rows: type', cs.font === bs.fontSize && cs.on === bs.on && cs.grey === bs.grey && cs.radius === bs.subRadius, JSON.stringify(cs));
  await clickSel(`document.querySelector('#arrange-menu [aria-label="Animations"]')`, 150);
  add('A press on a grey row leaves the menu open', q(`return JSON.stringify(!document.getElementById('arrange-menu').hidden && !document.getElementById('context-menu').hidden);`));
  await hover('Paste Properties');
  add('Paste Properties: three rows, all grey with nothing copied', same(subRows(), [['Transforms', false], ['Animations', false], ['Replace Animations', false]]), JSON.stringify(subRows()));
  const ps = sub('Paste Properties');
  add('Paste Properties rows: box', near(ps.top, 0) && near(ps.w, bs.pasteSub[2]) && near(ps.h, bs.pasteSub[3]), JSON.stringify(ps));
  await hover('Duplicate');
  add('A hover on another row closes them', q(`return JSON.stringify(document.getElementById('arrange-menu').hidden);`));

  await menu('a'); await hover('Copy Properties');
  add('Copy: Animations on for a block with rows', same(subRows(), [['Transforms', true], ['Animations', true]]), JSON.stringify(subRows()));
  await press('Animations');
  add('Copy: an on row closes the menu', q(`return JSON.stringify(document.getElementById('arrange-menu').hidden && document.getElementById('context-menu').hidden);`));
  await menu('b'); await hover('Paste Properties');
  add('After copying animations: Transforms grey, the other two on', same(subRows(), [['Transforms', false], ['Animations', true], ['Replace Animations', true]]), JSON.stringify(subRows()));
  await press('Animations');
  add('Animations on a block with none: the rows in order', same(anims('b'), ['p1', 'p2']), JSON.stringify(anims('b')));
  add('The block carries data-has-block-animations', q(`return JSON.stringify(d.querySelector('.fe-block[data-block-id="b"] .sqs-block').hasAttribute('data-has-block-animations'));`));
  await paste('b', 'Animations');
  add('Animations twice: four rows', same(anims('b'), ['p1', 'p2', 'p1', 'p2']), JSON.stringify(anims('b')));
  undoNow(); add('One undo for one paste', same(anims('b'), ['p1', 'p2']), JSON.stringify(anims('b')));
  undoNow(); add('Undo back to none, the mark goes', same(anims('b'), []) && q(`return JSON.stringify(!d.querySelector('.fe-block[data-block-id="b"] .sqs-block').hasAttribute('data-has-block-animations'));`), JSON.stringify(anims('b')));
  await paste('c', 'Replace Animations');
  add('Replace Animations: the copied rows only', same(anims('c'), ['p1', 'p2']), JSON.stringify(anims('c')));
  undoNow(); add('Replace Animations: one undo restores', same(anims('c'), ['p3']), JSON.stringify(anims('c')));
  await paste('c', 'Animations');
  add('Animations keeps its own rows first', same(anims('c'), ['p3', 'p1', 'p2']), JSON.stringify(anims('c')));
  await copyAnim('z');
  q(`const b = fe.model.sections[0].blocks.find((x) => x.id === 'z'); b.animations.push({ ...b.animations[0], preset: 'later' }); return 'true';`);
  await paste('e', 'Replace Animations');
  add('The clip is what the block had at the copy', same(anims('e'), ['p9']), JSON.stringify(anims('e')));
  q(`const b = fe.model.sections[0].blocks.find((x) => x.id === 'z'); b.animations.pop(); return 'true';`);

  // Grey copy keeps the clip; the clip reaches another section.
  load(); await pause(200);
  await copyAnim('a');
  await menu('b'); await hover('Copy Properties'); await clickSel(`document.querySelector('#arrange-menu [aria-label="Animations"]')`, 120);
  await paste('o', 'Replace Animations');
  add('A grey copy keeps the clip; it reaches another section', same(anims('o'), ['p1', 'p2']), JSON.stringify(anims('o')));

  // One clip with the panel.
  load(); await pause(200);
  await copyAnim('a');
  const animTab = async (bid) => { q(`fe.select('s1', '${bid}'); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(220); panel.querySelector('[data-btab="Animation"]').click(); await sleep(180); return 'true';`); };
  await animTab('b');
  await clickSel(act('listacts'), 180);
  add('The panel can paste what the menu copied', q(`const p = pop.querySelector('[data-an-clip="paste"]'); return JSON.stringify(!!p && !p.disabled);`));
  q(`pop.querySelector('[data-an-clip="paste"]').click(); await sleep(200); return 'true';`);
  add('The panel paste adds the rows', same(anims('b'), ['p1', 'p2']), JSON.stringify(anims('b')));
  await animTab('c');
  await clickSel(act('listacts'), 180);
  q(`pop.querySelector('[data-an-clip="copy"]').click(); await sleep(200); return 'true';`);
  q(`fe.select('s1', 'e'); await sleep(150); return 'true';`);
  await paste('e', 'Replace Animations');
  add('The menu pastes what the panel copied', same(anims('e'), ['p3']), JSON.stringify(anims('e')));

  // One clip for both kinds, and Transforms.
  load(); await pause(200);
  await copyAnim('a');
  await menu('a'); await hover('Copy Properties'); await press('Transforms');
  await menu('b'); await hover('Paste Properties');
  add('Copying transforms greys the animation rows', same(subRows(), [['Transforms', true], ['Animations', false], ['Replace Animations', false]]), JSON.stringify(subRows()));
  await press('Transforms');
  const des = (bid) => q(`const b = fe.model.sections.flatMap((s) => s.blocks).find((x) => x.id === '${bid}'); return JSON.stringify([b.design?.opacity ?? null, b.design?.rotate ?? null]);`);
  add('Transforms paste the values', same(des('b'), [50, 10]), JSON.stringify(des('b')));
  await menu('e'); await hover('Copy Properties'); await press('Transforms');
  await paste('c', 'Transforms');
  add('Transforms from a block with defaults reset the target', same(des('c'), [null, null]), JSON.stringify(des('c')));
  undoNow(); add('Transforms: one undo restores', same(des('c'), [80, 30]), JSON.stringify(des('c')));
  await copyAnim('a');
  await menu('b'); await hover('Paste Properties');
  add('Copying animations greys Transforms', same(subRows(), [['Transforms', false], ['Animations', true], ['Replace Animations', true]]), JSON.stringify(subRows()));

  // A paste goes to the block the menu opened on, not to the rest of a group.
  load(); await pause(200);
  await copyAnim('a');
  q(`fe.select('s1', 'b'); await sleep(100); return 'true';`);
  const ec = q(`const f = fr.getBoundingClientRect(), r = d.querySelector('.fe-block[data-block-id="e"]').getBoundingClientRect(); return JSON.stringify([f.left + r.left + r.width / 2, f.top + r.top + r.height / 2]);`);
  mouse(S, 'move', ec[0], ec[1], { mods: ['Shift'] }); await pause(60); mouse(S, 'down', ec[0], ec[1], { buttons: 1, mods: ['Shift'] }); await pause(40); mouse(S, 'up', ec[0], ec[1], { mods: ['Shift'] }); await pause(200);
  const grouped = q(`return JSON.stringify(!!d.querySelector('.fe-indicator.is-group'));`);
  await menu('b');
  const dropped = q(`return JSON.stringify(!d.querySelector('.fe-indicator.is-group'));`);
  await hover('Paste Properties'); await press('Replace Animations');
  add('A right press on a group leaves that block; the paste goes to it', grouped && dropped && same(anims('b'), ['p1', 'p2']) && same(anims('e'), []), JSON.stringify([grouped, dropped, anims('b'), anims('e')]));
}

writeFileSync(new URL('../parity/anim-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nAnimation: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
