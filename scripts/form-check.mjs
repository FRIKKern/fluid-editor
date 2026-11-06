// T9: Add Block > Form makes a real form block, against parity/findings/FORMADD.json.
// Writes parity/form-check.json. FLUID_SURFACE=cdp:<port> npm run form-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag } from './lib/cmux.mjs';
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
add('Storage and the rest do nothing yet', P(`[...P.querySelectorAll('.bp-form-nav:not([data-ff]), .bp-form-act')].every((e) => e.disabled && e.hasAttribute('data-unbuilt'))`) === true);
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
add('Form Style does nothing yet', P(`P.querySelector('.bp-form-style').hasAttribute('data-unbuilt') && !P.querySelector('.bp-form-style button, .bp-form-style input')`) === true);
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

// Lightbox (FORMFIELDS.json, lightbox): the reads came from a new form like this one.
const LB = JSON.parse(readFileSync(new URL('../parity/findings/FORMFIELDS.json', import.meta.url))).lightbox;
const snap = evalJs(S, `(() => JSON.stringify(JSON.stringify(${B})))()`);
const lbRead = () => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, W = d.defaultView, bl = d.getElementById('block-${id}').closest('.fe-block'), q = bl.getBoundingClientRect(), h = bl.querySelector('.lightbox-handle'), m = ${B}, r = h && h.getBoundingClientRect(), f = bl.querySelector('.fe-form'); return JSON.stringify({ area: m.layout.desktop.area, block: [q.width, q.height], form: f ? f.getClientRects().length : 0, handle: h && [r.left - q.left, r.top - q.top, r.width, r.height], text: h && h.textContent, cls: h && h.className, bg: h && W.getComputedStyle(h).backgroundColor, ink: h && W.getComputedStyle(h).color }); })()`);
const lbType = (v) => evalJs(S, `(async () => { const i = document.querySelector('#block-panel [data-form-lbtext]'); i.focus(); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); await new Promise((res) => setTimeout(res, 120)); return 'true'; })()`);
const lbUndo = async () => { evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(200); };
press('[data-form-lightbox]'); await pause(200);
let lb = lbRead();
add('Lightbox on: the form gives way to the button', lb.form === 0 && lb.text === 'Open Form', JSON.stringify(lb));
add('Lightbox on: the button as read', near(lb.handle, LB.reads.on.handle, 0.6), JSON.stringify(lb.handle));
add('Lightbox on: its colors as read', lb.bg === LB.reads.on.bg && lb.ink === LB.reads.on.color, `${lb.bg} ${lb.ink}`);
add('Lightbox on: 16 rows lose 13', lb.area.join() === LB.reads.on.area.join() && near(lb.block, LB.reads.on.block, 0.6), JSON.stringify([lb.area, lb.block]));
const lbRows = P(`[...P.querySelectorAll('.sp-label, .bp-thead > span')].map((e) => e.textContent.trim())`);
add('Lightbox on: the rows it adds and takes away', ['Button Text', 'Background Color', 'Transforms'].every((t) => lbRows.includes(t)) && !['Background', 'Stroke', 'Blend Mode', 'Blur'].some((t) => lbRows.includes(t)), lbRows.join());
add('Lightbox on: Button Text is empty, Open Form shows', P(`(() => { const i = P.querySelector('[data-form-lbtext]'); return i.value === '' && i.placeholder === 'Open Form'; })()`) === true);
for (const [v, x] of Object.entries(LB.reads.align)) { press(`[data-form-set="buttonAlign"][data-v="${v}"]`); await pause(120); const r = lbRead(); add(`Lightbox ${v}: the button at ${x}, its own width`, near(r.handle.slice(0, 1).concat(r.handle[2]), [x, LB.reads.on.handle[2]], 0.6) && r.area.join() === LB.reads.on.area.join(), JSON.stringify(r.handle)); }
lbType('Write to us'); lb = lbRead();
add('Lightbox: its word, the same height keeps the rows', lb.text === 'Write to us' && near(lb.handle.slice(2), LB.reads.typed.handle, 0.6) && lb.area.join() === LB.reads.on.area.join(), JSON.stringify([lb.handle, lb.area]));
lbType(LB.reads.long.text); lb = lbRead();
add('Lightbox: a long word wraps and the rows grow', near(lb.handle.slice(2), LB.reads.long.handle, 0.6) && lb.area.join() === LB.reads.long.area.join(), JSON.stringify([lb.handle, lb.area]));
lbType('Write to us'); lb = lbRead();
add('Lightbox: back to a short word, the least rows', lb.area.join() === LB.reads.short.area.join(), JSON.stringify(lb.area));
const lbPanel = () => evalJs(S, `(async () => { fe.select(fe.model.sections[1].id, ${JSON.stringify(id)}); await new Promise((res) => setTimeout(res, 150)); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await new Promise((res) => setTimeout(res, 200)); document.querySelector('#block-panel [data-btab="Design"]').click(); await new Promise((res) => setTimeout(res, 150)); return 'true'; })()`);
const lbEdge = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), r = f.contentDocument.getElementById('block-${id}').closest('.fe-block').getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([Math.round(o.left + r.left + r.width / 2), Math.round(o.top + r.bottom)]); })()`);
let edge = lbEdge(); drag(S, edge, [edge[0], edge[1] - 70]); await pause(250);
add('Lightbox: a drag up stops at the rows that hold the button', lbRead().area.join() === LB.reads.drag.up70.area.join(), JSON.stringify(lbRead().area));
edge = lbEdge(); drag(S, edge, [edge[0], edge[1] + 140]); await pause(250);
add('Lightbox: a drag down gives it more rows', lbRead().area.join() === LB.reads.drag.down140.area.join(), JSON.stringify(lbRead().area));
while (lbRead().area.join() !== LB.reads.short.area.join()) await lbUndo();
lbPanel();
press('[data-shape-act="lightboxBg"]'); await pause(150);
add('Background Color: white chosen, no Reset yet', evalJs(S, `(() => { const c = document.querySelector('[data-color-pick="#FFFFFF"]'); return JSON.stringify(!!c && c.checked && !document.querySelector('[data-color-reset]')); })()`) === true);
evalJs(S, `(() => { document.querySelector('[data-color-pick="#FFCF5A"]').click(); return 'true'; })()`); await pause(150);
add('Background Color: the row shows it, the button does not', P(`getComputedStyle(P.querySelector('[data-shape-act="lightboxBg"] i')).backgroundColor`) === LB.reads.picked.swatch && lbRead().bg === LB.reads.on.bg && evalJs(S, `(() => JSON.stringify(!!document.querySelector('[data-color-reset]')))()`) === true);
evalJs(S, `(() => { document.querySelector('[data-shape-act="lightboxBg"]').click(); return 'true'; })()`); await pause(120);
for (const k of ['secondary', 'tertiary']) { press('[data-bpstyle-toggle]'); press(`[data-bpstyle="${k}"]`); await pause(120); lb = lbRead(); add(`Lightbox: ${k} changes the class, not the box`, lb.cls.includes(`sqs-button-element--${k}`) && near(lb.handle.slice(2), LB.reads.typed.handle, 0.6), lb.cls); await lbUndo(); }
const lbArea = lbRead().area.join();
press('[data-btab="Content"]'); press('[data-ff="list"]'); press('[data-ff="delete:3"]'); await pause(150);
add('Lightbox: a field deleted while on leaves the rows', lbRead().area.join() === lbArea && evalJs(S, `(() => JSON.stringify(${B}.fields.length))()`) === 3, lbRead().area.join());
await lbUndo(); press('[data-ff="back"]'); press('[data-btab="Design"]');
// While editing a press does nothing; in preview it opens ours, which ends with its close button.
evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.querySelector('#block-${id} .lightbox-handle').click(); return 'true'; })()`); await pause(100);
const lbOpen = () => evalJs(S, `(() => JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('body > .form-lightbox.is-open').length))()`);
add('Lightbox: a press while editing opens nothing', lbOpen() === 0, String(lbOpen()));
evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.getElementById('preview').click(); await sleep(250); document.getElementById('site-frame').contentDocument.querySelector('#block-${id} .lightbox-handle').click(); await sleep(150); return 'true'; })()`);
const lbBox = evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, x = d.querySelector('body > .form-lightbox.is-open .form-lightbox-box'); return JSON.stringify(x && [d.defaultView.getComputedStyle(x).backgroundColor, x.querySelectorAll('.fe-form input').length]); })()`);
add('Lightbox in preview: ours opens with the color and the form', !!lbBox && lbBox[0] === LB.reads.picked.swatch && lbBox[1] > 0, JSON.stringify(lbBox));
evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.getElementById('site-frame').contentDocument.querySelector('body > .form-lightbox .form-lightbox-close').click(); await sleep(100); const n = document.getElementById('site-frame').contentDocument.querySelectorAll('body > .form-lightbox').length; document.getElementById('preview').click(); await sleep(300); return JSON.stringify(n); })()`);
add('Lightbox in preview: the close button ends it', lbOpen() === 0);
lbPanel();
press('[data-form-lightbox]'); await pause(200); lb = lbRead();
add('Lightbox off: the form is back, its rows stay', lb.form === 1 && lb.area.join() === LB.reads.short.area.join() && near(lb.block.slice(1), [LB.reads.off.formH], 0.6), JSON.stringify([lb.area, lb.block]));
press('[data-form-set="buttonAlign"][data-v="center"]'); await pause(150); lb = lbRead();
add('Lightbox off: the next change gives the form its rows', lb.area.join() === LB.reads.refit.area.join(), JSON.stringify(lb.area));
press('[data-form-set="buttonAlign"][data-v="left"]'); await pause(120);
const lbAreaOff = lbRead().area;
press('[data-form-lightbox]'); await pause(200); lb = lbRead();
add('Lightbox on again: 14 rows lose 13', lb.area.join() === LB.reads.on2.area.join() && near(lb.block, LB.reads.on2.block, 0.6), JSON.stringify([lb.area, lb.block]));
await lbUndo();
add('Lightbox: one undo step back', evalJs(S, `(() => JSON.stringify(${B}.lightbox === undefined))()`) === true && lbRead().area.join() === lbAreaOff.join());
for (let i = 0; i < 20 && evalJs(S, `(() => JSON.stringify(JSON.stringify(${B})))()`) !== snap; i++) await lbUndo();
add('Lightbox: undo reaches the form as it was', evalJs(S, `(() => JSON.stringify(JSON.stringify(${B})))()`) === snap);

// The panel's tabs stay while what is under them scrolls (FORMFIELDS.json). A press on a tab still lands.
const tabs = (top) => evalJs(S, `(() => { const P = document.getElementById('block-panel'); if (${top} !== null) P.scrollTop = ${top}; const t = P.querySelector('.sp-tab'), r = t.getBoundingClientRect(), o = P.getBoundingClientRect(); const on = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify({ scrolled: P.scrollTop, at: r.top - o.top, tab: !!on && !!on.closest('.sp-tab') }); })()`);
press('[data-btab="Content"]'); await pause(300);
const rest = tabs(0), down = tabs(200);
add('The tabs stay when the panel scrolls', down.scrolled > 0 && Math.abs(down.at - rest.at) < 1 && down.tab, JSON.stringify([rest, down]));
tabs(0);

// Edit Form Fields (FORMFIELDS.json).
const FF = JSON.parse(readFileSync(new URL('../parity/findings/FORMFIELDS.json', import.meta.url)));
const inPage = (js) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const P = document.getElementById('block-panel'), o = P.getBoundingClientRect(); const box = (e) => { const r = e.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map((v) => Math.round(v)); }; const ff = async (a) => { P.querySelector('[data-ff="' + a + '"]').click(); await sleep(60); }; const b = () => ${B}; const type = async (key, v) => { const i = P.querySelector('[data-ff-field="' + key + '"]'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); await sleep(60); }; const set = async (k, n = 0) => { P.querySelectorAll('[data-ff-set="' + k + '"]')[n].click(); await sleep(60); }; const doc = document.getElementById('site-frame').contentDocument, form = () => doc.querySelector('#block-${id} .fe-form'); ${js} })()`);
press('[data-btab="Content"]');
const list = inPage(`await ff('list'); return JSON.stringify({ tabs: !!P.querySelector('.sp-tab'), head: box(P.querySelector('.bp-ishape-head')), back: box(P.querySelector('[data-ff="back"]')), rows: [...P.querySelectorAll('.bp-ff-row')].map(box), names: [...P.querySelectorAll('.bp-ff-name')].map((e) => e.textContent), del: [...P.querySelectorAll('.bp-ff-del')].map(box), add: box(P.querySelector('[data-ff="add"]')) });`);
add('List: Back and the title in place of the tabs', !list.tabs && list.head[3] === 55 && near(list.back, [11, 5, 54, 46]), JSON.stringify(list.back));
add('List: a row per field, in order', list.names.join() === 'Name,Email,Subject,Message', list.names.join());
[61, 120, 179, 238].forEach((y, i) => add(`List: row ${i + 1} at ${y}, 59 high`, near(list.rows[i].slice(1, 2).concat(list.rows[i][3]), [y, 59], 1), list.rows[i]));
add('List: Delete at 241, 36 square', near(list.del[0], [241, 72, 36, 36], 1), list.del[0]);
add('List: Add Field under the rows', near(list.add, [22, 297, 276, 44], 1), list.add);
const tiles = inPage(`await ff('add'); return JSON.stringify([...P.querySelectorAll('.bp-ff-tile')].map((e) => [e.textContent, ...box(e)]));`);
add('Add Field: the tiles in order', tiles.map((t) => t[0]).join() === FF.addField.tiles.join(), tiles.map((t) => t[0]).join());
add('Add Field: 125 by 44, two columns', tiles.every((t, i) => near(t.slice(1), [i % 2 ? 168 : 27, 55 + 44 * Math.floor(i / 2), 125, 44], 1)), JSON.stringify(tiles.slice(0, 3)));

// Each kind in its editor, against what the oracle's panel showed.
const LONG = /^(Contacts|SMS Subscribers|SMS subscription|Select a plan|View plans|Learn More|To fill|If no value|Variable)/;
const editorRows = (type, which) => {
  const theirs = FF.types[type].editor.text.map((t) => t.match(/^(.*) @(-?\d+),(-?\d+),(\d+),(\d+)$/)).map((m) => [m[1], Number(m[3]), Number(m[5])]);
  const off = 20 - theirs[0][1];
  const ours = inPage(`await ff('edit:${which}'); const leaf = [...P.querySelectorAll('.bp-ff *, .bp-ishape-head *')].filter((e) => !e.children.length && e.textContent.trim() && e.tagName !== 'TEXTAREA'); const out = leaf.map((e) => [e.textContent.trim().toLowerCase(), ...box(e)]); await ff('back'); return JSON.stringify(out);`);
  const seen = [];
  for (const [t, y, h] of theirs.slice(1)) {
    if (LONG.test(t) || /^(.{70})$/.test(t)) continue;
    const same = ours.filter((o) => o[0] === t.toLowerCase() && !seen.includes(o));
    const m = same[0];
    if (m) seen.push(m);
    const at = y + off + h / 2;
    add(`${type}: ${t} at ${Math.round(at)}`, m && Math.abs(m[2] + m[4] / 2 - at) <= 4, m ? m[2] + m[4] / 2 : 'missing');
  }
};
const start = inPage(`await ff('back'); return JSON.stringify(b().fields.length);`);
add('Back from Add Field goes to the list, nothing added', start === 4, start);
for (const [row, type] of [[0, 'default:Name'], [1, 'default:Email'], [2, 'default:Subject'], [3, 'default:Message']]) editorRows(type, row);
const ADDS = ['Phone', 'Dropdown', 'Checkbox', 'Radio', 'Survey', 'Address', 'Line', 'Website', 'Date', 'Number', 'Time', 'Currency', 'X', 'File Upload'];
const made = inPage(`const out = []; for (const t of ${JSON.stringify([...ADDS, 'Hidden'])}) { await ff('add'); await ff('tile:' + t); out.push(P.querySelector('[data-ff="add"]') ? b().fields.at(-1).label : 'not back on the list'); } return JSON.stringify(out);`);
add('A tile adds its field at the end and goes back to the list', made.at(-1) === 'Hidden' && made.includes('X Username') && !made.some((x) => /required|not back/.test(x)), made.join());
[...ADDS, 'Hidden'].forEach((t, i) => { editorRows(t, 4 + i); });

// Scrolled, Back stays on top and still takes a press.
const stay = inPage(`P.scrollTop = 300; await sleep(60); const r = P.querySelector('[data-ff="back"]').getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const out = { scrolled: P.scrollTop, y: box(P.querySelector('[data-ff="back"]'))[1], on: !!hit.closest('[data-ff="back"]') }; P.scrollTop = 0; return JSON.stringify(out);`);
add('The list scrolls, Back stays on top', stay.scrolled > 0 && Math.abs(stay.y - 5) <= 1 && stay.on, JSON.stringify(stay));
const openHit = inPage(`await ff('edit:5'); P.scrollTop = 200; await sleep(60); const r = P.querySelector('[data-ff="back"]').getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const out = { scrolled: P.scrollTop, y: box(P.querySelector('[data-ff="back"]'))[1], on: !!hit.closest('[data-ff="back"]') }; P.scrollTop = 0; await ff('back'); return JSON.stringify(out);`);
add('An editor scrolls, Back stays on top', openHit.scrolled > 0 && Math.abs(openHit.y - 5) <= 1 && openHit.on, JSON.stringify(openHit));

// What each kind draws, item by item.
const drawn = () => inPage(`const F = form().getBoundingClientRect(); const round = (v) => Math.round(v * 10) / 10; return JSON.stringify({ h: round(F.height), items: [...form().querySelectorAll(':scope > .form-item')].map((i) => { const q = i.getBoundingClientRect(); return { top: round(q.top - F.top), h: round(q.height), c: [...i.querySelectorAll('input:not([type=checkbox],[type=radio],[type=file]), select, textarea')].map((e) => { const w = e.closest('.form-affix') || e, r = w.getBoundingClientRect(); return [e.tagName, round(r.left - F.left), round(r.top - q.top), round(r.width), round(r.height)]; }) }; }) });`);
const compare = (name, ours, theirs, h) => {
  add(`${name}: the form's height ${h}`, Math.abs(ours.h - h) <= 1.5, ours.h);
  add(`${name}: as many items`, ours.items.length === theirs.length, ours.items.length);
  theirs.forEach((t, i) => {
    const o = ours.items[i];
    if (!o) return;
    add(`${name} ${t.k}: top ${t.top}`, Math.abs(o.top - t.top) <= 1.5, o.top);
    if (t.k !== 'name') add(`${name} ${t.k}: height ${t.h}`, Math.abs(o.h - t.h) <= 1.5, o.h);
    add(`${name} ${t.k}: its controls`, o.c.length === t.c.length && t.c.every((c, n) => o.c[n][0] === c[0] && near(o.c[n].slice(1), c.slice(1))), JSON.stringify(o.c));
  });
};
inPage(`await ff('edit:2'); await type('description', 'A short word'); await type('placeholder', 'Type here'); await ff('back'); return 'true';`);
compare('As added', drawn(), FF.drawn.plain, FF.formHeights.plain);
const fits = (r) => { const h = drawn().h, m = evalJs(S, `(() => { const g = document.getElementById('site-frame').contentDocument.querySelector('#block-${id}').closest('.fluid-engine'), c = g.ownerDocument.defaultView.getComputedStyle(g); return JSON.stringify({ row: parseFloat(c.gridTemplateRows), gap: parseFloat(c.rowGap) }); })()`), a = evalJs(S, `(() => JSON.stringify(${B}.layout.desktop.area))()`); return { h, rows: a[2] - a[0], need: Math.ceil((h + m.gap) / (m.row + m.gap)), r }; };
const fit0 = fits();
add('The block\'s rows hold the form', fit0.rows === fit0.need, JSON.stringify(fit0));

// A description and Required on every kind that has them, Country Code, a Dropdown's own placeholder.
inPage(`const start = 4; const adds = ${JSON.stringify(ADDS)}; for (let i = 0; i < adds.length; i++) { await ff('edit:' + (start + i)); await type('description', 'A short word'); if (adds[i] !== 'Line') await set('required'); if (adds[i] === 'Phone') await set('countryCode'); if (adds[i] === 'Dropdown') { await type('placeholder', 'Pick one'); await ff('opt-add'); P.querySelector('[data-ff-opt="2"]').value = ''; P.querySelector('[data-ff-opt="2"]').dispatchEvent(new Event('input', { bubbles: true })); P.querySelector('[data-ff-opt="2"]').dispatchEvent(new Event('change', { bubbles: true })); await sleep(60); } await ff('back'); } await ff('delete:' + (start + adds.length)); for (const t of ['Text', 'Text Area', 'Email']) { await ff('add'); await ff('tile:' + t); const n = b().fields.length - 1; await ff('edit:' + n); await type('description', 'A short word'); await set('required'); await ff('back'); } await ff('edit:2'); await type('description', ''); await type('placeholder', ''); await ff('back'); return 'true';`);
compare('With a description', drawn(), FF.drawn.withDescription, FF.formHeights.withDescription);
const seld = inPage(`const sel = [...form().querySelectorAll('select')]; return JSON.stringify(sel.map((s) => [s.options[s.selectedIndex].text, s.options.length]));`);
add('Dropdown: its own placeholder, a third option kept empty', seld[1][0] === 'Pick one' && seld[1][1] === 4, JSON.stringify(seld[1]));
add('Country: the site\'s country chosen from a long list', seld[0][0] === 'Norway' && seld[2][0] === 'Norway' && seld[0][1] > 240 && seld[0][1] < 260, JSON.stringify(seld[0]));
add('Phone: the country code\'s prefix', inPage(`return JSON.stringify(form().querySelector('.form-phone .form-input-prefix').textContent);`) === '+47');

// Writes, one undo step each, on a fresh default form.
const fresh = inPage(`b().fields.splice(4); await ff('back'); await ff('list'); return JSON.stringify(b().fields.length);`);
add('Back to the four fields', fresh === 4, fresh);
const undo = () => evalJs(S, `(async () => { document.getElementById('undo').click(); await new Promise((res) => setTimeout(res, 120)); return 'true'; })()`);
const w = inPage(`const out = {}; const F = () => form().getBoundingClientRect().height; const before = JSON.stringify(b().fields);
await ff('delete:3'); out.del = [b().fields.length, !!document.querySelector('[role=dialog]:not([hidden]) #ss-confirm-reset')]; document.getElementById('undo').click(); await sleep(120); out.delUndo = JSON.stringify(b().fields) === before;
await ff('edit:2'); await ff('dup:2'); out.dup = [b().fields.length, b().fields[3].label, !!P.querySelector('[data-ff="add"]')]; await ff('edit:3'); await ff('del:3'); out.del2 = b().fields.length;
await ff('edit:2'); await set('required'); out.notReq = [b().fields[2].label, form().querySelectorAll('.form-item')[2].querySelector('.req') === null]; await set('required'); await ff('back');
await ff('edit:0'); await set('require:0'); out.firstOpt = form().querySelector('.name-parts .field .req') === null || form().querySelectorAll('.name-parts .field')[0].querySelector('.req') === null; await set('show:0'); const fields = form().querySelectorAll('.name-parts .field'); out.hide = [fields.length, Math.round(fields[0].getBoundingClientRect().width), P.querySelector('[data-ff-set="show:1"]').disabled, P.querySelector('[data-ff-set="show:1"]').checked, !!P.querySelector('[data-ff-set="require:0"]'), !!P.querySelector('[data-ff-set="require:1"]')]; out.word = P.querySelector('.bp-ff-note').textContent; await set('show:0'); await set('require:0'); await ff('back');
await ff('edit:1'); const on = F(); await set('signup'); out.signup = [Math.round((on - F()) * 10) / 10, form().querySelector('.form-signup') === null]; await set('signup'); out.signupBack = form().querySelector('.form-signup').textContent; await ff('back');
await ff('edit:2'); const lb = P.querySelector('[data-ff-field="label"]'); lb.focus(); lb.value = 'Topic'; lb.dispatchEvent(new Event('input', { bubbles: true })); out.live = [form().querySelectorAll('.form-item')[2].querySelector('label.title').textContent, P.querySelector('.bp-ff-title').textContent]; lb.dispatchEvent(new Event('change', { bubbles: true })); lb.blur(); await sleep(60); out.labelReq = b().fields[2].label; await ff('back'); document.getElementById('undo').click(); await sleep(120); out.labelUndo = b().fields[2].label;
await ff('edit:0'); await ff('back'); return JSON.stringify(out);`);
add('Delete on a row: at once, no dialog', w.del[0] === 3 && !w.del[1], JSON.stringify(w.del));
add('Delete: one undo step brings it back', w.delUndo === true);
add('Duplicate: after the original, same label, back on the list', w.dup[0] === 5 && w.dup[1] === 'Subject(required)' && w.dup[2], JSON.stringify(w.dup));
add('Delete in the editor goes back to the list', w.del2 === 4, w.del2);
add('Not required: the word goes', w.notReq[0] === 'Subject' && w.notReq[1], JSON.stringify(w.notReq));
add('Name: First not required', w.firstOpt === true);
add('Name: one part hidden is 259 wide, the other Show on and off limits', w.hide[0] === 1 && Math.abs(w.hide[1] - 259) <= 1 && w.hide[2] && w.hide[3] && !w.hide[4] && w.hide[5], JSON.stringify(w.hide));
add('Name: the note under it', w.word === 'At least one name field must be showing.', w.word);
add('Email Signup off: 31.8 less', Math.abs(w.signup[0] - 31.8) <= 1 && w.signup[1], JSON.stringify(w.signup));
add('Email Signup back on: its words', w.signupBack === 'Sign up for news and updates', w.signupBack);
add('Label: shows while typing, with the panel title', w.live[0].startsWith('Topic') && w.live[1] === 'Topic', JSON.stringify(w.live));
add('Label: keeps its required mark', w.labelReq === 'Topic(required)', w.labelReq);
add('Label: one undo step', w.labelUndo === 'Subject(required)', w.labelUndo);

// A real pointer: a press on a row opens it, a drag on a grip moves the field.
const gripAt = inPage(`const g = P.querySelectorAll('.bp-ff-grip'), r = (e) => { const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }; return JSON.stringify({ g: r(g[3]), row: r(P.querySelectorAll('.bp-ff-name')[1]) });`);
drag(S, gripAt.g, [gripAt.g[0], gripAt.g[1] - 118]); await pause(300);
const moved = inPage(`return JSON.stringify([b().fields.map((f) => f.label), [...form().querySelectorAll(':scope > .form-item')].length, !!P.querySelector('[data-ff="add"]')]);`);
add('Grip: Message moves up two, the page follows', moved[0].join() === 'Name,Message(required),Email(required),Subject(required)', moved[0].join());
add('Grip: the list stays', moved[2] === true);
await undo();
mouse(S, 'move', gripAt.row[0], gripAt.row[1]); mouse(S, 'down', gripAt.row[0], gripAt.row[1]); mouse(S, 'up', gripAt.row[0], gripAt.row[1]); await pause(300);
add('A press on a row opens its editor', inPage(`return JSON.stringify(P.querySelector('.bp-ff-title').textContent);`) === 'Email');
const more = inPage(`await ff('back'); const out = {}; const addEdit = async (t) => { await ff('add'); await ff('tile:' + t); await ff('edit:' + (b().fields.length - 1)); }; await addEdit('Currency'); await type('symbol', 'kr'); out.kr = form().querySelector('.form-affix:last-of-type .form-input-prefix').textContent; out.krWide = Math.round(form().querySelector('.form-input-prefix').getBoundingClientRect().width * 10) / 10; await ff('back');
await addEdit('Line'); const L = () => [...form().querySelectorAll('.form-line')].at(-1); out.lineOn = Math.round(L().getBoundingClientRect().height * 10) / 10; await set('underline'); out.lineOff = Math.round(L().getBoundingClientRect().height * 10) / 10; await ff('back');
await addEdit('File Upload'); out.dec0 = P.querySelector('[aria-label="decrement"]').disabled; P.querySelector('[aria-label="increment"]').click(); await sleep(60); out.max = [P.querySelector('[aria-label="Max Number of Files"]').value, P.querySelector('[aria-label="decrement"]').disabled, b().fields.at(-1).maxFiles]; await set('fileTypes'); out.types = P.querySelectorAll('[data-ff-set^="fileType:"]').length; out.word = [...form().querySelectorAll('.file-upload-in > span')].at(-1).textContent; await ff('back');
await addEdit('Hidden'); out.hiddenDraws = form().querySelectorAll(':scope > .form-item').length === b().fields.length - 1; out.variable = P.querySelector('.bp-ff-var').textContent; await type('value', 'abc'); out.value = b().fields.at(-1).value; await ff('back');
await addEdit('Dropdown'); await ff('opt-add'); out.opts = b().fields.at(-1).options.join(); out.menus = [...P.querySelectorAll('.bp-ffo-menu')].every((e) => !e.disabled && !e.hasAttribute('data-unbuilt')); await ff('back'); await ff('back'); out.home = !!P.querySelector('[data-ff="list"]'); out.tabs = !!P.querySelector('.sp-tab'); return JSON.stringify(out);`);
add('Currency Symbol: kr, 44 wide', more.kr === 'kr' && Math.abs(more.krWide - 44.2) <= 1.5, JSON.stringify([more.kr, more.krWide]));
add('Line: 35.7 with the underline, 34.7 without', Math.abs(more.lineOn - 35.7) <= 0.5 && Math.abs(more.lineOff - 34.7) <= 0.5, JSON.stringify([more.lineOn, more.lineOff]));
add('Files: decrement off at 1, then on at 2', more.dec0 && more.max.join() === '2,false,2', JSON.stringify(more.max));
add('File types: five checks, the page still says Add a File', more.types === 5 && more.word === 'Add a File', JSON.stringify([more.types, more.word]));
add('Hidden: draws nothing, its variable and value', more.hiddenDraws && more.variable === 'SQF_HIDDEN' && more.value === 'abc', JSON.stringify(more));
add('Add option: Option 3', more.opts === 'Option 1,Option 2,Option 3', more.opts);
add('An option\'s menu is built', more.menus === true);
add('Back twice: Content, with its tabs', more.home && more.tabs, JSON.stringify([more.home, more.tabs]));
// Edit Post-Submit (FORMFIELDS.json, postSubmit).
const PS = FF.postSubmit;
const ps = inPage(`await ff('post'); const leaf = () => [...P.querySelectorAll('.bp-ff *, .bp-ishape-head *')].filter((e) => !e.children.length && e.textContent.trim()).map((e) => [e.textContent.trim().toLowerCase(), ...box(e)]); const seg = [...P.querySelectorAll('.bp-ffp-seg')].map(box), picks = [...P.querySelectorAll('.bp-ffp-pick')].map(box); const W = form().parentNode; return JSON.stringify({ leaf: leaf(), seg, picks, post: !!W.classList.contains('is-post-view'), shown: doc.defaultView.getComputedStyle(W.querySelector('.form-post')).display, hidden: doc.defaultView.getComputedStyle(form()).visibility, word: doc.defaultView.getComputedStyle(form().querySelector('.form-submit')).visibility, areaH: form().getBoundingClientRect().height, tabs: !!P.querySelector('.sp-tab') });`);
add('Post-Submit: seg as read', near(ps.seg[0], [24, 99, 136, 32], 3) && near(ps.seg[1], [160, 99, 136, 32], 3), JSON.stringify(ps.seg));
add('Post-Submit: three and three', ps.picks.length === 6 && [178, 220, 262].every((x, i) => Math.abs(ps.picks[i][0] - x) <= 1 && Math.abs(ps.picks[i][1] - 301) <= 3 && Math.abs(ps.picks[i + 3][0] - x) <= 1 && Math.abs(ps.picks[i + 3][1] - 346) <= 3), JSON.stringify(ps.picks));
for (const t of PS.view.text.slice(1)) {
  const m = t.match(/^(.*) @(-?\d+),(-?\d+),(\d+),(\d+)$/);
  if (!/^(After Submission|Message|Alignment|Position|HTML|This message|HTML to be)/.test(m[1])) continue;
  const at = Number(m[3]) + Number(m[5]) / 2, name = m[1].toLowerCase(), hit = ps.leaf.filter((o) => o[0] === name || (name.length > 30 && o[0].startsWith(name.slice(0, 30))));
  add(`Post-Submit: ${m[1].slice(0, 26)} at ${Math.round(at)}`, hit.some((o) => Math.abs(o[2] + o[4] / 2 - at) <= 5), JSON.stringify(hit.map((o) => o[2] + o[4] / 2)));
}
add('Post-Submit: the block shows the message, the form keeps its place', ps.post && ps.shown === 'flex' && ps.hidden === 'hidden' && ps.word === 'visible' && !ps.tabs, JSON.stringify(ps));
const pos = inPage(`const T = () => { const F = form().getBoundingClientRect(), t = doc.querySelector('#block-${id} .form-submission-text'), r = t.getBoundingClientRect(); return [Math.round((r.top - F.top) * 10) / 10, Math.round(r.height * 10) / 10, doc.defaultView.getComputedStyle(t).textAlign]; }; const out = {}; const H = form().getBoundingClientRect().height, A0 = b().layout.desktop.area.join(); out.top = T(); await ff('post-position:middle'); out.middle = T(); await ff('post-position:bottom'); out.bottom = T(); await ff('post-position:top'); await ff('post-align:right'); out.areaSame = b().layout.desktop.area.join() === A0; out.right = T(); document.getElementById('undo').click(); await sleep(120); out.undo = T(); out.stillView = !!P.querySelector('.bp-ffp') && form().parentNode.classList.contains('is-post-view'); out.H = H; const m = P.querySelector('[data-ff-post="message"]'); m.focus(); m.value = 'Thanks a lot'; m.dispatchEvent(new Event('input', { bubbles: true })); out.live = doc.querySelector('#block-${id} .form-submission-text p').textContent; m.dispatchEvent(new Event('change', { bubbles: true })); m.blur(); const h = P.querySelector('[data-ff-post="html"]'); h.focus(); h.value = '<b>Bold</b>'; h.dispatchEvent(new Event('input', { bubbles: true })); h.dispatchEvent(new Event('change', { bubbles: true })); h.blur(); await sleep(60); const F = form().getBoundingClientRect(), hb = doc.querySelector('#block-${id} .form-submission-html'), q = hb.getBoundingClientRect(); out.html = [Math.round((q.top - F.top) * 10) / 10, Math.round(q.height * 10) / 10, !!hb.querySelector('b')]; await ff('post-mode:redirect'); out.redirect = [!!P.querySelector('.bp-attach'), !!P.querySelector('[data-ff-post]'), doc.querySelector('#block-${id} .form-submission-text p').textContent, box(P.querySelector('.bp-attach'))]; P.querySelector('.bp-attach').click(); await sleep(150); const lp = document.querySelector('.lk-input'); out.menu = !!lp && !document.querySelector('.lk-input').closest('[hidden]'); out.list = [...document.querySelectorAll('.lk-set')].length; document.querySelector('.lk-page').click(); await sleep(120); out.href = b().post.href; return JSON.stringify(out);`);
const H0 = pos.H;
add('Position Top: the message 20 down, one line 54.4', near(pos.top.slice(0, 2), [20, 54.4], 1), JSON.stringify(pos.top));
add('Position Middle: in the middle of the form', Math.abs(pos.middle[0] - (H0 - 54.4 + 20) / 2) <= 1.5, JSON.stringify([pos.middle, H0]));
add('Position Bottom: at its foot', Math.abs(pos.bottom[0] - (H0 - 54.4)) <= 1.5, JSON.stringify([pos.bottom, H0]));
add('The rows stay while the view changes', pos.areaSame === true, JSON.stringify(pos.areaSame));
add('Alignment Right, one undo step back, the view stays', pos.right[2] === 'right' && pos.undo[2] !== 'right' && pos.stillView, JSON.stringify([pos.right, pos.undo]));
add('Message: shows while typing', pos.live === 'Thanks a lot', pos.live);
add('HTML: drawn as HTML under the message', near(pos.html.slice(0, 2), [74.4, 22.4], 1) && pos.html[2], JSON.stringify(pos.html));
add('Redirect: Attach link in place, the message stays on the block', pos.redirect[0] && !pos.redirect[1] && pos.redirect[2] === 'Thanks a lot' && near(pos.redirect[3], [22, 177, 276, 44], 2), JSON.stringify(pos.redirect));
add('Attach link: the link menu with its lists, a page sets it', pos.menu && pos.list === 2 && !!pos.href, JSON.stringify([pos.menu, pos.list, pos.href]));
const back = inPage(`document.querySelector('.lk-input') && document.body.click(); await sleep(60); await ff('post-mode:message'); P.scrollTop = 200; await sleep(60); const r = P.querySelector('[data-ff="back"]').getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const stay = [P.scrollTop > 0, !!hit.closest('[data-ff="back"]')]; P.scrollTop = 0; await ff('back'); const W = form().parentNode; const out = { stay, home: !!P.querySelector('.sp-tab'), view: W.classList.contains('is-post-view'), form: doc.defaultView.getComputedStyle(form()).visibility, kept: b().post.message }; return JSON.stringify(out);`);
add('Post-Submit scrolled: Back stays on top', back.stay[0] && back.stay[1], JSON.stringify(back.stay));
add('Back: the form returns, the words are kept', back.home && !back.view && back.form === 'visible' && back.kept === 'Thanks a lot', JSON.stringify(back));
const sent = inPage(`form().requestSubmit(); await sleep(60); const W = form().parentNode, out = [W.classList.contains('is-submitted'), doc.defaultView.getComputedStyle(W.querySelector('.form-post')).display, doc.defaultView.getComputedStyle(form()).visibility, doc.defaultView.getComputedStyle(form().querySelector('.form-submit')).visibility]; W.classList.remove('is-submitted'); return JSON.stringify(out);`);
add('A submit in the Preview frame draws the message, the form goes', sent.join() === 'true,flex,hidden,hidden', sent.join());
// Follow-up questions: an option's menu, each tile's editor, the routes back, what draws in Preview.
const FU = FF.followUp;
const leavePreview = () => evalJs(S, `(async () => { const d = document.getElementById('site-frame').contentDocument; if (d.body.classList.contains('is-preview')) { document.getElementById('preview').click(); await new Promise((res) => setTimeout(res, 300)); } return 'true'; })()`);
const fuHome = () => { leavePreview(); evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.body.click(); fe.select(fe.model.sections[1].id, ${JSON.stringify(id)}); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); for (let i = 0; i < 5 && !document.querySelector('#block-panel .bp-ff-list'); i++) { const q = (w) => document.querySelector('#block-panel ' + w), t = q('[data-btab="Content"]'); if (t) t.click(); const go = q('[data-ff="list"]') || q('[data-ff="back"]'); go.click(); await sleep(120); } return 'true'; })()`); };
const fuTitle = `(P.querySelector('.bp-ff-title') || {}).textContent`;
const fuLeaves = `[...P.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().width > 0 && !e.children.length && e.textContent.trim()).map((e) => [e.textContent.trim(), ...box(e)])`;
const fuHelp = `const menu = async (k) => { P.querySelectorAll('[data-ff-menu]')[k].click(); await sleep(120); }; const pop = async (w) => { document.querySelector('[data-ff-pop="' + w + '"]').click(); await sleep(120); };`;
fuHome();
const fuN = inPage(`await ff('add'); await ff('tile:Radio'); await sleep(100); return JSON.stringify(b().fields.length - 1);`);
const fuMenu = inPage(`${fuHelp} await ff('edit:${fuN}'); const B = P.querySelector('[data-ff-menu]').getBoundingClientRect(); await menu(0); const p = document.getElementById('shape-pop').getBoundingClientRect(), rows = [...document.querySelectorAll('#shape-pop [data-ff-pop]')].map((e) => e.textContent.trim()); return JSON.stringify({ rows, gapRight: B.left - p.right, gapTop: p.top - B.top, w: p.width, h: p.height, row: document.querySelector('#shape-pop [data-ff-pop]').getBoundingClientRect().height });`);
add('An option\'s menu: its two rows', fuMenu.rows.join() === FU.menu.rows.join(), fuMenu.rows.join());
add('The menu box: 4 left of the button, 40 under its top', Math.abs(fuMenu.gapRight - 4) <= 1 && Math.abs(fuMenu.gapTop - 40) <= 1, JSON.stringify(fuMenu));
add('The menu box: 220 wide, 45 per row', Math.abs(fuMenu.w - 220) <= 1.5 && Math.abs(fuMenu.row - 45) <= 1, JSON.stringify(fuMenu));
const fuTiles = inPage(`${fuHelp} await pop('follow'); return JSON.stringify({ title: ${fuTitle}, leaves: ${fuLeaves} });`);
add('Add follow-up question opens Add Follow-Up', fuTiles.title === 'Add Follow-Up', fuTiles.title);
for (const t of FU.view.text.slice(2)) {
  const [, w, y] = t.match(/^(.*) @\d+,(\d+),/);
  const l = fuTiles.leaves.find((x) => x[0] === w);
  add(`Add Follow-Up tile: ${w}`, l && Math.abs(l[2] + l[4] / 2 - (Number(y) + Number(t.split(',').pop()) / 2)) <= 3, l ? l.join() : 'missing');
}
const fuBackFirst = inPage(`await ff('back'); await sleep(60); return JSON.stringify(${fuTitle});`);
add('Back from Add Follow-Up: the field', fuBackFirst === 'Radio', fuBackFirst);
const tileKey = (t) => t === 'X Username' ? 'X' : t;
for (const t of Object.keys(FU.editors)) {
  const ours = inPage(`${fuHelp} await menu(1); await pop('follow'); await ff('fu-tile:${tileKey(t)}'); await sleep(60); const out = { title: ${fuTitle}, leaves: ${fuLeaves}, count: b().fields[${fuN}].follow[1].length }; await ff('fu-del:${fuN}:1:0'); await sleep(60); out.back = ${fuTitle}; out.left = (b().fields[${fuN}].follow || [])[1]; return JSON.stringify(out);`);
  const theirs = FU.editors[t].map((x) => x.match(/^(.*) @(-?\d+),(-?\d+),(\d+),(\d+)$/)).map((x) => [x[1], Number(x[3]), Number(x[5])]);
  const off = 20 - theirs[0][1], seen = [];
  add(`Follow-up ${t}: its title, added once, Delete Field returns`, ours.title === t && ours.count === 1 && ours.back === 'Radio' && !(ours.left || []).length, `${ours.title} ${ours.count} ${ours.back}`);
  for (const [w, y, h] of theirs.slice(2)) {
    const same = ours.leaves.filter((l) => l[0].toLowerCase().startsWith(w.toLowerCase().slice(0, 60)) && !seen.includes(l));
    const m = same[0];
    if (m) seen.push(m);
    add(`Follow-up ${t}: ${w.slice(0, 28)}`, m && Math.abs(m[2] + m[4] / 2 - (y + off + h / 2)) <= 3, m ? `${m[2] + m[4] / 2}, oracle ${y + off + h / 2}` : 'missing');
  }
}
// One undo step, a follow-up on option 1, and the row it turns into.
const fuUndo = inPage(`${fuHelp} await menu(0); await pop('follow'); await ff('fu-tile:Text'); await sleep(60); const had = b().fields[${fuN}].follow[0].length; document.getElementById('undo').click(); await sleep(250); return JSON.stringify([had, (b().fields[${fuN}].follow || [])[0]?.length || 0]);`);
add('Adding a follow-up is one undo step', fuUndo.join() === '1,0', fuUndo.join());
fuHome();
const fuRow = inPage(`${fuHelp} await ff('edit:${fuN}'); await menu(0); await pop('follow'); await ff('fu-tile:Text'); await sleep(60); await ff('back'); await sleep(60); const r = P.querySelector('[data-ff="opt:${fuN}:0"]'), add = P.querySelector('[data-ff="opt-add"]'); return JSON.stringify({ title: ${fuTitle}, row: box(r), text: r.textContent.trim(), add: box(add), menus: P.querySelectorAll('[data-ff-menu]').length });`);
add('Back from the menu route: the field', fuRow.title === 'Radio', fuRow.title);
add('An option with a follow-up is a row to open', near(fuRow.row, [38, 315, 266, 61], 2) && /Option 1\s*1 follow-up/.test(fuRow.text) && fuRow.menus === 1, JSON.stringify(fuRow));
add('Add option moves up 4 for it', near(fuRow.add, [22, 441, 276, 36], 2), fuRow.add.join());
const fuDetails = inPage(`await ff('opt:${fuN}:0'); await sleep(60); return JSON.stringify({ leaves: ${fuLeaves}, c: [...P.querySelectorAll('button:not(.bp-back), input')].map((e) => [e.tagName, e.textContent.trim() || e.value, ...box(e)]) });`);
for (const t of FU.option.views.text.slice(1)) {
  const [, w, y, h] = t.match(/^(.*) @\d+,(\d+),\d+,(\d+)$/);
  const l = fuDetails.leaves.find((x) => x[0] === w);
  add(`Option Details: ${w}`, l && Math.abs(l[2] + l[4] / 2 - (Number(y) + Number(h) / 2)) <= 3, l ? l.join() : 'missing');
}
for (const t of FU.option.views.c.slice(1)) {
  const p = t.split('|'), w = p[0] === 'INPUT' ? p[4] : p[7], at = p[8].split(',').map(Number);
  const c = fuDetails.c.find((x) => x[0] === p[0] && x[1].startsWith(w));
  add(`Option Details box: ${w}`, c && Math.abs(c[3] - at[1]) <= 2 && Math.abs(c[5] - at[3]) <= 2 && Math.abs(c[2] - at[0]) <= 2, c ? c.join() : 'missing');
}
const fuRoute = inPage(`const out = {}; await ff('fu:${fuN}:0:0'); await sleep(60); out.open = ${fuTitle}; await ff('back'); await sleep(60); out.back = ${fuTitle}; return JSON.stringify(out);`);
add('From Option Details Back goes to Option Details', fuRoute.open === 'Text' && fuRoute.back === 'Option Details', JSON.stringify(fuRoute));
// Every kind drawn in Preview, against the read, measured from the first one.
const FU_ORDER = ['Dropdown', 'Name', 'Email', 'Phone', 'Text Area', 'Checkbox', 'Radio', 'Survey', 'Address', 'Line', 'Website', 'Date', 'Number', 'Time', 'Currency', 'Hidden', 'X', 'File Upload'];
const fuAll = inPage(`for (const t of ${JSON.stringify(FU_ORDER)}) { P.querySelector('[data-ff^="fu-add"]').click(); await sleep(60); await ff('fu-tile:' + t); await sleep(50); await ff('back'); await sleep(50); } return JSON.stringify(b().fields[${fuN}].follow[0].length);`);
add('All kinds added as follow-ups, each back to Option Details', fuAll === FU_ORDER.length + 1, fuAll);
const fePreview = () => evalJs(S, `(async () => { document.getElementById('preview').click(); await new Promise((res) => setTimeout(res, 350)); return 'true'; })()`);
fePreview();
const fuDraw = (js) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const d = document.getElementById('site-frame').contentDocument, W = d.getElementById('block-${id}'); const seen = () => [...W.querySelectorAll('.followup-question-container')].filter((x) => !x.hidden); const rect = (e) => { const F = W.querySelector('.fe-form').getBoundingClientRect(), r = e.getBoundingClientRect(); return [r.left - F.left, r.top - F.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; const wrap = () => W.querySelectorAll('.form-followed'); ${js} })()`);
add('In Preview nothing draws before a pick', fuDraw(`return JSON.stringify(seen().length);`) === 0);
const fuPicked = fuDraw(`const r = [...wrap()].at(-1).querySelectorAll('input[type=radio]')[0]; r.click(); await sleep(150); return JSON.stringify(seen().map((x) => rect(x)));`);
const fuDot = fuDraw(`const a = [...wrap()].at(-1).firstElementChild.querySelectorAll('input'), m = (e) => d.defaultView.getComputedStyle(e, '::before').backgroundImage !== 'none'; return JSON.stringify([m(a[0]), m(a[1])]);`);
add('A picked radio draws its dot, the other none', fuDot.join() === 'true,false', fuDot.join());
const fuAllC = FU.drawn.all.c.filter((c) => c.cls);
add('The pick draws them all', fuPicked.filter((x) => x[3] > 0).length === fuAllC.length, fuPicked.length);
const ourDrawn = fuPicked.filter((x) => x[3] > 0);
fuAllC.forEach((c, i) => { const o = ourDrawn[i], gotY = o ? o[1] - ourDrawn[0][1] : 0, wantY = c.box[1] - fuAllC[0].box[1]; add(`Drawn ${c.cls.replace('form-item.', '')}: place and size`, o && Math.abs(gotY - wantY) <= 3 && Math.abs(o[0] - c.box[0]) <= 1 && Math.abs(o[2] - c.box[2]) <= 1 && (c.cls.includes('name') || Math.abs(o[3] - c.box[3]) <= 3), `${o}, oracle ${c.box} (y ${wantY})`); });
const fuOff = fuDraw(`[...wrap()].at(-1).querySelectorAll(':scope > .form-item input[type=radio], :scope > * input[type=radio]')[1].click(); await sleep(150); return JSON.stringify(seen().length);`);
add('Another radio takes them away', fuOff === 0, fuOff);
leavePreview();
const fuSizeAfter = fits();
add('The rows hold the form with them all in the panel', fuSizeAfter.rows >= fuSizeAfter.need - 1, JSON.stringify(fuSizeAfter));
// Checkbox: option order however they were picked. Dropdown: by option, past its placeholder. Survey: draws none.
fuHome();
const fuMore = inPage(`${fuHelp} const add1 = async (k, t) => { await menu(k); await pop('follow'); await ff('fu-tile:' + t); await sleep(50); await ff('back'); await sleep(50); }; const out = {}; await ff('edit:${fuN}'); await ff('del:${fuN}'); await sleep(60); out.gone = b().fields.length; await ff('add'); await ff('tile:Checkbox'); await sleep(60); await ff('edit:' + (b().fields.length - 1)); await add1(1, 'Email'); await add1(0, 'Text'); await ff('back'); await sleep(60); await ff('add'); await ff('tile:Dropdown'); await sleep(60); await ff('edit:' + (b().fields.length - 1)); await add1(1, 'Number'); await add1(0, 'Text'); await ff('back'); await sleep(60); await ff('add'); await ff('tile:Survey'); await sleep(60); await ff('edit:' + (b().fields.length - 1)); await menu(0); out.survey = [...document.querySelectorAll('#shape-pop [data-ff-pop]')].map((e) => e.textContent.trim()); await pop('follow'); await ff('fu-tile:Text'); await sleep(60); out.title = ${fuTitle}; await ff('back'); await sleep(60); await add1(0, 'Email'); return JSON.stringify(out);`);
add('A survey\'s option offers follow-ups too', fuMore.survey.join() === FU.survey.menu.join() && fuMore.title === 'Text', JSON.stringify(fuMore));
fePreview();
const fuPick = fuDraw(`const [c, s, v] = wrap(), list = (w) => [...w.querySelectorAll('.followup-question-container')].filter((x) => !x.hidden).map((x) => x.textContent.trim().slice(0, 6)); const box = c.querySelectorAll('input[type=checkbox]'); const out = {}; box[1].click(); await sleep(100); out.second = list(c); box[0].click(); await sleep(100); out.both = list(c); const g = [...c.querySelectorAll('.followup-question-container')].filter((x) => !x.hidden).map((x) => x.getBoundingClientRect()); out.pitch = g[1].top - g[0].top; const base = c.firstElementChild.getBoundingClientRect(); out.gap = g[0].top - base.bottom; box[1].click(); await sleep(100); out.off = list(c); const sel = s.querySelector('select'); sel.selectedIndex = 2; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(100); out.dd = list(s); const dg = s.querySelector('.followup-question-container:not([hidden])').getBoundingClientRect(); out.ddGap = dg.top - s.firstElementChild.getBoundingClientRect().bottom; sel.selectedIndex = 0; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(100); out.ddNone = list(s); const h = () => W.querySelector('.fe-form').getBoundingClientRect().height, rate = v.firstElementChild.querySelectorAll('input[type=radio]'); out.rating = rate.length; const h0 = h(); rate[5].click(); await sleep(100); out.rateSecond = list(v); const h1 = h(); rate[0].click(); await sleep(100); out.rateBoth = list(v); const h2 = h(); rate[1].click(); await sleep(100); out.rateKept = list(v); out.grow = [h1 - h0, h2 - h1]; const mark = (e, p) => { const c = d.defaultView.getComputedStyle(e, p); return [c.backgroundImage !== 'none', c.clipPath !== 'none', c.backgroundColor !== 'rgba(0, 0, 0, 0)']; }; out.marks = {}; out.marks.tick = mark(box[0], '::before'); out.marks.noTick = mark(box[1], '::before'); out.marks.rating = d.defaultView.getComputedStyle(rate[1]).backgroundImage !== 'none'; out.marks.noRating = d.defaultView.getComputedStyle(rate[0]).backgroundImage !== 'none'; const rg = [...W.querySelectorAll('.form-signup input')][0]; rg.click(); await sleep(60); out.marks.signup = mark(rg, '::before'); rg.click(); return JSON.stringify(out);`);
add('Checkbox: the second alone draws its own', fuPick.second.join() === 'Email', fuPick.second.join());
add('Checkbox: then the first draws above it', fuPick.both.join() === 'Text,Email', fuPick.both.join());
add('Follow-ups sit 94.8 apart here, 20 under the field', Math.abs(fuPick.pitch - 94.8) <= 1 && Math.abs(fuPick.gap - 20) <= 1, `${fuPick.pitch} ${fuPick.gap}`);
add('Checkbox: off takes its own away', fuPick.off.join() === 'Text', fuPick.off.join());
add('Dropdown: the option\'s own, past the placeholder, 20 under', fuPick.dd.join() === 'Number' && Math.abs(fuPick.ddGap - 20) <= 1, `${fuPick.dd} ${fuPick.ddGap}`);
add('Dropdown: back on the placeholder draws none', fuPick.ddNone.length === 0, fuPick.ddNone.join());
add('Survey: a rating draws its option\'s, the second alone', fuPick.rating === 10 && fuPick.rateSecond.join() === 'Email', JSON.stringify(fuPick));
add('Survey: then the first draws above it', fuPick.rateBoth.join() === 'Text,Email', fuPick.rateBoth.join());
add('Survey: each adds 94.8, as read', fuPick.grow.every((g) => Math.abs(g - 94.8) <= 1), fuPick.grow.join());
add('Survey: another rating on the row keeps them', fuPick.rateKept.join() === 'Text,Email', fuPick.rateKept.join());
add('A picked checkbox draws a tick, the other none', fuPick.marks.tick.join() === 'false,true,true' && fuPick.marks.noTick.join() === 'false,false,false', JSON.stringify(fuPick.marks));
add('The sign-up checkbox draws its tick', fuPick.marks.signup.join() === 'false,true,true', JSON.stringify(fuPick.marks));
add('A picked rating draws its dot, the other none', fuPick.marks.rating === true && fuPick.marks.noRating === false, JSON.stringify(fuPick.marks));
leavePreview();
// Delete Option: from the menu and from Option Details, and the last one too. A follow-up's own options have only that row.
fuHome();
const fuDel = inPage(`${fuHelp} const out = {}; const n = b().fields.length - 3; await ff('edit:' + n); await ff('opt:' + n + ':0'); await sleep(60); await ff('opt-del:' + n + ':0'); await sleep(80); const c = b().fields[n]; out.details = [c.options.join(), ${fuTitle}]; out.follow = (c.follow || []).map((x) => (x || []).length).join(); await ff('opt:' + n + ':0'); await sleep(60); await ff('fu:' + n + ':0:0'); await sleep(60); await ff('fu-del:' + n + ':0:0'); await sleep(60); out.plain = [P.querySelectorAll('[data-ff-menu]').length, ${fuTitle}]; await ff('opt-add'); await sleep(60); await menu(0); await pop('delete'); await sleep(80); await menu(0); await pop('delete'); await sleep(80); out.none = b().fields[n].options.length; await ff('opt-add'); await sleep(60); out.again = b().fields[n].options.join(); await menu(0); await pop('follow'); await ff('fu-tile:Radio'); await sleep(60); await menu(0); const p = document.getElementById('shape-pop').getBoundingClientRect(); out.ownRows = [...document.querySelectorAll('#shape-pop [data-ff-pop]')].map((e) => e.textContent.trim()); out.ownW = p.width; return JSON.stringify(out);`);
add('Delete Option from Option Details: at once, with its follow-ups', fuDel.details[0] === 'Option 2' && fuDel.follow === '1', JSON.stringify(fuDel));
add('With its last follow-up gone: a plain row with its menu', fuDel.plain[0] === 1, JSON.stringify(fuDel.plain));
add('Every option can go, Add option then adds Option 1', fuDel.none === 0 && fuDel.again === 'Option 1', `${fuDel.none} ${fuDel.again}`);
add('A follow-up\'s own option has Delete Option alone, 144 wide', fuDel.ownRows.join() === FU.menu.inFollowUp.join() && Math.abs(fuDel.ownW - 144) <= 3, `${fuDel.ownRows} ${fuDel.ownW}`);
// An option dragged keeps its follow-ups.
fuHome();
const fuGrip = inPage(`await ff('edit:' + (b().fields.length - 2)); await sleep(60); const r = [...P.querySelectorAll('.bp-ffo-grip')].map((g) => g.getBoundingClientRect()); return JSON.stringify([r[0].left + r[0].width / 2, r[0].top + r[0].height / 2, r[1].top + r[1].height / 2 + 34]);`);
drag(S, [fuGrip[0], fuGrip[1]], [fuGrip[0], fuGrip[2]]); await pause(300);
const fuMoved = inPage(`const f = b().fields.at(-2); return JSON.stringify({ o: f.options.join(), f: f.follow.map((l) => l.map((x) => x.label).join()).join('|'), t: ${fuTitle} });`);
add('An option dragged keeps its follow-ups', fuMoved.o === 'Option 2,Option 1' && fuMoved.f === 'Number|Text' && fuMoved.t === 'Dropdown', JSON.stringify(fuMoved));
const final = fits();
add('The rows still hold the form', final.rows === final.need, JSON.stringify(final));

writeFileSync(new URL('../parity/form-check.json', import.meta.url), `${JSON.stringify({ check: 'Add Block > Form', pass, total, results }, null, 1)}\n`);
console.log(`Form: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
