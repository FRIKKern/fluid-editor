// T9: Add Block > Form makes a real form block, against parity/findings/FORMADD.json.
// Writes parity/form-check.json. FLUID_SURFACE=cdp:<port> npm run form-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/FORMADD.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok: !!ok }); console.log(`${what.padEnd(46)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Form"]').click(); await sleep(500); return JSON.stringify(fe.model.sections[1].blocks.at(-1).id); })()`);
const B = `fe.model.sections[1].blocks.find((b) => b.id === ${JSON.stringify(id)})`;
const m = evalJs(S, `(() => JSON.stringify(${B}))()`);
add('The menu makes a form block', m.type === 'form', m.type);
add('It lands where the oracle\'s does', m.layout.desktop.area.join() === F.area.join(), m.layout.desktop.area);
add('Its button says Submit', m.button === F.default.button, m.button);

// Each field in order, by kind, against the new form the oracle made.
const ours = evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, W = d.defaultView, b = d.getElementById('block-${id}').closest('.fe-block'), q = b.getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; return JSON.stringify({ block: [q.width, q.height], form: rel(b.querySelector('form')), controls: [...b.querySelectorAll('input, textarea, select, button')].map((e) => { const s = W.getComputedStyle(e); return { t: e.tagName + (e.type ? ':' + e.type : ''), box: rel(e), radius: s.borderTopLeftRadius, pad: [s.paddingTop, s.paddingRight], border: s.borderTopWidth, weight: s.fontWeight }; }), words: [...b.querySelectorAll('legend, label, button')].map((e) => e.textContent.replace(/\\s+/g, ' ').trim()), req: [...b.querySelectorAll('.req')].map((e) => rel(e)) }); })()`);
const theirs = F.new.items.filter((x) => /^(INPUT|TEXTAREA|SELECT|BUTTON)/.test(x.t));
add('The block\'s box', near(ours.block, F.new.block), ours.block);
add('The form\'s box', near(ours.form, F.new.form), ours.form);
add('The same controls in the same order', ours.controls.map((c) => c.t).join() === theirs.map((c) => c.t).join(), ours.controls.map((c) => c.t).join());
theirs.forEach((t, i) => {
  const c = ours.controls[i], name = `${t.t} ${i + 1}`;
  if (!c) return add(name, false, 'missing');
  add(`${name}: box`, near(c.box, t.box), `${c.box}, oracle ${t.box}`);
  add(`${name}: corner, border, padding`, c.radius === t.st.borderRadius && c.border === t.st.borderTopWidth && c.pad.join() === [t.st.paddingTop, t.st.paddingRight].join(), `${c.radius} ${c.border} ${c.pad}, oracle ${t.st.borderRadius} ${t.st.borderTopWidth} ${t.st.paddingTop} ${t.st.paddingRight}`);
});
const required = F.new.items.filter((x) => /description required/.test(x.c));
add('Each (required) in its place', ours.req.length === required.length && required.every((r, i) => Math.abs(ours.req[i][0] - r.box[0]) <= 2.5), JSON.stringify(ours.req.map((r) => r[0])));
for (const w of ['Name', 'First Name', 'Last Name', 'Email', 'Sign up for news and updates', 'Subject', 'Message', 'Submit']) add(`The words: ${w}`, ours.words.some((x) => x.startsWith(w)), ours.words.join(' | '));

// The panel: Content first, Form Name and Button Text work, the rest is shown and faded.
evalJs(S, `(async () => { fe.select(fe.model.sections[1].id, ${JSON.stringify(id)}); await new Promise((res) => setTimeout(res, 200)); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await new Promise((res) => setTimeout(res, 300)); return 'true'; })()`);
const P = (js) => evalJs(S, `(() => { const P = document.getElementById('block-panel'); return JSON.stringify(${js}); })()`);
add('Edit opens on Content', P(`P.querySelector('[data-btab="Content"]').classList.contains('is-on') || P.querySelector('[data-btab="Content"]').getAttribute('aria-selected') === 'true'`) === true);
const name = P(`P.querySelector('[data-content="formName"]').value`);
add('Form Name: the page\'s title and Form', name === 'How Fluid Engine works Form', name);
add('Button Text: Submit', P(`P.querySelector('[data-content="button"]').value`) === 'Submit');
const rows = P(`[...P.querySelectorAll('.bp-form-nav > span, .bp-form-act, .bp-subhead, .bp-form-f > span')].map((e) => e.textContent.trim())`);
for (const w of ['Form Name', 'Button Text', 'Edit Form Fields', 'Submissions', 'Edit Post-Submit', 'Manage Submissions', 'Export Form Submissions', 'Email Notification', 'Additional Storage', 'Google reCAPTCHA']) add(`Panel row: ${w}`, rows.includes(w), rows.join(' | '));
add('Storage and the rest do nothing yet', P(`[...P.querySelectorAll('.bp-form-nav, .bp-form-act')].every((e) => e.disabled && e.hasAttribute('data-unbuilt'))`) === true);
evalJs(S, `(() => { const i = document.querySelector('#block-panel [data-content="button"]'); i.value = 'Send it'; i.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(250);
add('Button Text reaches the button', evalJs(S, `(() => JSON.stringify(document.getElementById('site-frame').contentDocument.querySelector('#block-${id} .form-submit').textContent))()`) === 'Send it');
evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(250);
add('One undo step back', evalJs(S, `(() => JSON.stringify(${B}.button))()`) === 'Submit');

// The Design tab: its rows, Button Alignment, Button Style and First Input Highlight against the reads.
const D = F.design;
const doc = `document.getElementById('site-frame').contentDocument`;
const press = (sel) => evalJs(S, `(async () => { document.querySelector(${JSON.stringify(`#block-panel ${sel}`)}).click(); await new Promise((res) => setTimeout(res, 250)); return 'true'; })()`);
const boxes = () => evalJs(S, `(() => { const d = ${doc}, b = d.getElementById('block-${id}'), q = b.closest('.fe-block').getBoundingClientRect(), rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height]; }; return JSON.stringify({ button: rel(b.querySelector('.form-submit')), form: rel(b.querySelector('form')), cls: b.querySelector('.form-submit').className }); })()`);
press('[data-btab="Design"]');
const order = P(`(() => { const all = [...P.querySelectorAll('.sp-body *')].filter((e) => e.childElementCount === 0).map((e) => e.textContent.trim()); return ${JSON.stringify(D.rows)}.map((w) => all.indexOf(w)); })()`);
add('The rows, in the oracle\'s order', order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), order);
const ys = P(`(() => { const t = P.getBoundingClientRect().top, y = (s) => P.querySelector(s).getBoundingClientRect().top - t; return { 'Form Style tile': y('.bp-form-style'), 'Button Style tile': y('.bp-bs-cur'), 'Alignment control': y('.bp-form-seg .sp-seg'), 'First Input Highlight row': y('.bp-fih-row') }; })()`);
for (const [k, v] of Object.entries(D.panelY)) add(`Panel: ${k} at ${v}`, Math.abs(ys[k] - v) <= 2.5, ys[k]);
add('Form Style\'s note', P(`P.querySelector('.bp-form-note').textContent`) === D.formStyle.note);
add('Form Style and Lightbox do nothing yet', P(`P.querySelector('.bp-form-style').hasAttribute('data-unbuilt') && !P.querySelector('.bp-form-style button, .bp-form-style input') && P.querySelector('input[aria-label="Lightbox"]').disabled`) === true);
add('Alignment: the four, left on', P(`[...P.querySelectorAll('[data-form-set="buttonAlign"]')].map((e) => e.getAttribute('aria-label') + (e.getAttribute('aria-checked') === 'true' ? '*' : '')).join()`) === 'left*,center,right,stretch');
for (const a of ['center', 'right', 'stretch', 'left']) {
  press(`[data-form-set="buttonAlign"][data-v="${a}"]`);
  const r = boxes();
  add(`Alignment ${a}: the button's box`, near(r.button.map((v, i) => i === 1 ? v - r.form[1] : v), D.buttonAlignment.button[a]), `${r.button}, oracle ${D.buttonAlignment.button[a]}`);
  add(`Alignment ${a}: the form's box stays`, near(r.form, D.buttonAlignment.formBox), r.form);
}
press('[data-form-set="buttonAlign"][data-v="center"]');
evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(250);
add('Alignment: one undo step back', evalJs(S, `(() => JSON.stringify(${B}.buttonAlign === undefined))()`) === true);
press('[data-bpstyle-toggle]');
add('Button Style: the three and Edit Button Styles', P(`[...P.querySelectorAll('.bp-bs-opt > span:not(.bp-bs-aa), .bp-bs-edit')].map((e) => e.textContent.trim()).join()`) === [...D.buttonStyle.choices, 'Edit Button Styles'].join(), P(`P.querySelector('.bp-bs-list').textContent`));
for (const [k, w] of [['secondary', 'Secondary Button'], ['tertiary', 'Tertiary Button'], ['primary', 'Primary Button']]) {
  if (!P(`!!P.querySelector('.bp-bs-list')`)) press('[data-bpstyle-toggle]');
  press(`[data-bpstyle="${k}"]`);
  const r = boxes();
  add(`${w}: the class, the same box`, r.cls.includes(`sqs-button-element--${k}`) && near(r.button.map((v, i) => i === 1 ? v - r.form[1] : v), D.buttonStyle.box), `${r.cls} ${r.button}`);
  add(`${w}: the row says so`, P(`P.querySelector('.bp-bs-cur > span:not(.bp-bs-aa)').textContent`) === w);
}
const fxRead = () => evalJs(S, `(() => { const d = ${doc}, b = d.getElementById('block-${id}'), W = d.defaultView, L = [...b.querySelectorAll('.form-input-effects')], first = b.querySelector('input'), r = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }; const k = L[0]?.firstElementChild; return JSON.stringify({ n: L.length, layerIsFirst: !!L[0] && L[0].parentElement.contains(first) && r(L[0]).every((v, i) => Math.abs(v - r(first)[i]) < .6), padding: k && W.getComputedStyle(k).paddingTop, clip: k && W.getComputedStyle(k).overflow, ring: k && W.getComputedStyle(k, '::before').borderTopWidth, anims: L[0] ? L[0].getAnimations({ subtree: true }).map((a) => [a.effect.pseudoElement, a.effect.getTiming().duration, a.effect.getTiming().delay, a.effect.getTiming().iterations]) : [], form: r(b.querySelector('form')).slice(2) }); })()`);
add('Highlight: None to start, no layer', P(`P.querySelector('.bp-fih-row em').textContent`) === 'None' && fxRead().n === 0);
press('[data-fih-toggle]');
add('Highlight: the four tiles', P(`[...P.querySelectorAll('.bp-fih-tile')].map((e) => e.getAttribute('aria-label')).join()`) === D.firstInputHighlight.choices.join());
add('Highlight: tile size and grid', P(`(() => { const t = [...P.querySelectorAll('.bp-fih-tile')].map((e) => e.getBoundingClientRect()); return t[0].width === 92 && t[0].height === 92 && t[1].left - t[0].right === 6 && t[3].left === t[0].left && t[3].top - t[0].bottom === 6; })()`) === true);
const FX = { wave: ['Wave', [['::before', 5000, 0]]], double: ['Double Wave', [['::before', 6000, 0], ['::after', 6000, -3000]]], glow: ['Glow', [['::before', 2500, 0]]] };
for (const [k, [w, want]] of Object.entries(FX)) {
  press(`[data-form-set="highlight"][data-v="${k}"]`);
  const r = fxRead();
  add(`${w}: on the first input only`, r.n === 1 && r.layerIsFirst === true, JSON.stringify(r));
  add(`${w}: timing as read, forever`, r.anims.length === want.length && want.every((x) => r.anims.some((a) => a[0] === x[0] && a[1] === x[1] && a[2] === x[2] && a[3] === null)), JSON.stringify(r.anims));
  add(`${w}: a 2px ring`, k === 'glow' ? r.ring === '2px' : r.padding === '2px' && r.clip === 'hidden', JSON.stringify(r));
  add(`${w}: the form's box stays, the row says so`, near(r.form, D.buttonAlignment.formBox.slice(2)) && P(`P.querySelector('.bp-fih-row em').textContent`) === w, JSON.stringify(r.form));
  add(`${w}: the panel stays where it was`, P(`P.scrollTop > 0`) === true);
}
evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(250);
add('Highlight: one undo step back', evalJs(S, `(() => JSON.stringify(${B}.highlight))()`) === 'double');
press('[data-form-set="highlight"][data-v="none"]');
add('Highlight None: the layer is gone', fxRead().n === 0 && evalJs(S, `(() => JSON.stringify(${B}.highlight === undefined))()`) === true);

// The panel's tabs stay while what is under them scrolls (FORMFIELDS.json). A press on a tab still lands.
const tabs = (top) => evalJs(S, `(() => { const P = document.getElementById('block-panel'); if (${top} !== null) P.scrollTop = ${top}; const t = P.querySelector('.sp-tab'), r = t.getBoundingClientRect(), o = P.getBoundingClientRect(); const on = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify({ scrolled: P.scrollTop, at: r.top - o.top, tab: !!on && !!on.closest('.sp-tab') }); })()`);
press('[data-btab="Content"]'); await pause(300);
const rest = tabs(0), down = tabs(200);
add('The tabs stay when the panel scrolls', down.scrolled > 0 && Math.abs(down.at - rest.at) < 1 && down.tab, JSON.stringify([rest, down]));
tabs(0);

writeFileSync(new URL('../parity/form-check.json', import.meta.url), `${JSON.stringify({ check: 'Add Block > Form', pass, total, results }, null, 1)}\n`);
console.log(`Form: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
