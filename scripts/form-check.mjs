// T9: Add Block > Form makes a real form block, against parity/findings/FORMADD.json.
// Writes parity/form-check.json. FLUID_SURFACE=cdp:<port> npm run form-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag, browser } from './lib/cmux.mjs';
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
const dial = inPage(`const F = form().querySelector('.form-phone'), s = F.querySelector('.field-country select'), p = F.querySelector('.form-input-prefix'), out = { n: s.options.length, first: [s.options[0].value, s.options[0].text], addr: form().querySelector('.form-address select').value, picks: {}, widths: {} }; for (const [c, t] of Object.entries(${JSON.stringify(FF.country.dial.examples)})) { s.value = c; s.dispatchEvent(new Event('change', { bubbles: true })); out.picks[c] = p.textContent; out.widths[p.textContent] = p.getBoundingClientRect().width; } s.value = 'NO'; s.dispatchEvent(new Event('change', { bubbles: true })); out.back = p.textContent; return JSON.stringify(out);`);
add('Country: 245 options with the read values, Norway as NO', dial.n === 245 && dial.first.join() === 'AF,Afghanistan' && dial.addr === 'NO', JSON.stringify(dial));
const orders = inPage(`const at = (s) => [...form().querySelector(s).options].map((o) => o.value).slice(160, 163).join(); return JSON.stringify([at('.form-phone select'), at('.form-address select')]);`);
add('Country: the Phone list and the Address list as read, one place apart', orders.join('|') === 'KP,MK,MP|MP,KP,MK', orders.join('|'));
add('Phone: a Country pick sets the prefix, for the read ones', JSON.stringify(dial.picks) === JSON.stringify(FF.country.dial.examples) && dial.back === '+47', JSON.stringify(dial.picks));
add('Phone: the prefix is as wide as its code', ['+1', '+47'].every((k) => Math.abs(dial.widths[k] - FF.country.dial.prefixWidth[k]) <= 1.5), JSON.stringify(dial.widths));

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
const pos = inPage(`const T = () => { const F = form().getBoundingClientRect(), t = doc.querySelector('#block-${id} .form-submission-text'), r = t.getBoundingClientRect(); return [Math.round((r.top - F.top) * 10) / 10, Math.round(r.height * 10) / 10, doc.defaultView.getComputedStyle(t).textAlign]; }; const out = {}; const H = form().getBoundingClientRect().height, A0 = b().layout.desktop.area.join(); out.top = T(); await ff('post-position:middle'); out.middle = T(); await ff('post-position:bottom'); out.bottom = T(); await ff('post-position:top'); await ff('post-align:right'); out.areaSame = b().layout.desktop.area.join() === A0; out.right = T(); document.getElementById('undo').click(); await sleep(120); out.undo = T(); out.stillView = !!P.querySelector('.bp-ffp') && form().parentNode.classList.contains('is-post-view'); out.H = H; const m = P.querySelector('[data-ff-post="message"]'); m.focus(); m.innerHTML = '<p>Thanks a lot</p>'; m.dispatchEvent(new Event('input', { bubbles: true })); out.live = doc.querySelector('#block-${id} .form-submission-text p').textContent; m.dispatchEvent(new Event('change', { bubbles: true })); m.blur(); const h = P.querySelector('[data-ff-post="html"]'); h.focus(); h.value = '<b>Bold</b>'; h.dispatchEvent(new Event('input', { bubbles: true })); h.dispatchEvent(new Event('change', { bubbles: true })); h.blur(); await sleep(60); const F = form().getBoundingClientRect(), hb = doc.querySelector('#block-${id} .form-submission-html'), q = hb.getBoundingClientRect(); out.html = [Math.round((q.top - F.top) * 10) / 10, Math.round(q.height * 10) / 10, !!hb.querySelector('b')]; await ff('post-mode:redirect'); out.redirect = [!!P.querySelector('.bp-attach'), !!P.querySelector('[data-ff-post]'), doc.querySelector('#block-${id} .form-submission-text p').textContent, box(P.querySelector('.bp-attach'))]; P.querySelector('.bp-attach').click(); await sleep(150); const lp = document.querySelector('.lk-input'); out.menu = !!lp && !document.querySelector('.lk-input').closest('[hidden]'); out.list = [...document.querySelectorAll('.lk-set')].length; document.querySelector('.lk-page').click(); await sleep(120); out.href = b().post.href; return JSON.stringify(out);`);
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
add('Back: the form returns, the words are kept', back.home && !back.view && back.form === 'visible' && back.kept === '<p>Thanks a lot</p>', JSON.stringify(back));
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
const fuRow = inPage(`${fuHelp} await ff('edit:${fuN}'); await menu(0); await pop('follow'); await ff('fu-tile:Text'); await sleep(60); await ff('back'); await sleep(60); const r = P.querySelector('[data-ff="opt:${fuN}:0"]'), add = P.querySelector('[data-ff="opt-add"]'); return JSON.stringify({ title: ${fuTitle}, row: box(r), text: r.textContent.trim(), add: box(add), menus: P.querySelectorAll('[data-ff-menu]').length, font: ['.bp-ffo-name span', '.bp-ffo-name small'].map((q) => { const c = getComputedStyle(r.querySelector(q)); return [c.fontSize, c.fontWeight, c.lineHeight, c.letterSpacing, c.color].join(); }) });`);
add('Back from the menu route: the field', fuRow.title === 'Radio', fuRow.title);
add('An option with a follow-up is a row to open', near(fuRow.row, [38, 315, 266, 61], 2) && /Option 1\s*1 follow-up/.test(fuRow.text) && fuRow.menus === 1, JSON.stringify(fuRow));
add('The row\'s two lines: their fonts, as read', fuRow.font.join('|') === '14px,400,22px,-0.14px,rgb(14, 14, 14)|12px,400,16px,normal,rgb(102, 102, 102)', fuRow.font.join('|'));
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
const fuDot = fuDraw(`const a = [...wrap()].at(-1).firstElementChild.querySelectorAll('input'), m = (e) => d.defaultView.getComputedStyle(e, '::before').transform === 'matrix(1, 0, 0, 1, 0, 0)'; await sleep(250); return JSON.stringify([m(a[0]), m(a[1])]);`);
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
const fuPick = fuDraw(`const [c, s, v] = wrap(), list = (w) => [...w.querySelectorAll('.followup-question-container')].filter((x) => !x.hidden).map((x) => x.textContent.trim().slice(0, 6)); const box = c.querySelectorAll('input[type=checkbox]'); const out = {}; box[1].click(); await sleep(100); out.second = list(c); box[0].click(); await sleep(100); out.both = list(c); const g = [...c.querySelectorAll('.followup-question-container')].filter((x) => !x.hidden).map((x) => x.getBoundingClientRect()); out.pitch = g[1].top - g[0].top; const base = c.firstElementChild.getBoundingClientRect(); out.gap = g[0].top - base.bottom; box[1].click(); await sleep(100); out.off = list(c); const sel = s.querySelector('select'); sel.selectedIndex = 2; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(100); out.dd = list(s); const dg = s.querySelector('.followup-question-container:not([hidden])').getBoundingClientRect(); out.ddGap = dg.top - s.firstElementChild.getBoundingClientRect().bottom; sel.selectedIndex = 0; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(100); out.ddNone = list(s); const h = () => W.querySelector('.fe-form').getBoundingClientRect().height, rate = v.firstElementChild.querySelectorAll('input[type=radio]'); out.rating = rate.length; const h0 = h(); rate[5].click(); await sleep(100); out.rateSecond = list(v); const h1 = h(); rate[0].click(); await sleep(100); out.rateBoth = list(v); const h2 = h(); rate[1].click(); await sleep(100); out.rateKept = list(v); out.grow = [h1 - h0, h2 - h1]; await sleep(350); const after = (e) => d.defaultView.getComputedStyle(e, '::before'); out.marks = { tick: after(box[0]).clipPath, noTick: after(box[1]).clipPath, tickBox: [after(box[0]).width, after(box[0]).height, after(box[0]).backgroundColor === d.defaultView.getComputedStyle(box[0]).color], tickT: after(box[0]).transition, tickDrawn: /svg/.test(after(box[0]).webkitMaskImage || after(box[0]).maskImage), rating: after(rate[1]).transform, noRating: after(rate[0]).transform, dotT: after(rate[1]).transition }; const rg = W.querySelector('.form-signup input'); rg.click(); await sleep(350); out.marks.signup = after(rg).clipPath; rg.click(); return JSON.stringify(out);`);
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
const CURVE = 'cubic-bezier(0.33, 1, 0.68, 1)';
add('A picked checkbox shows its tick, the other none', fuPick.marks.tick === 'inset(0px)' && /100%/.test(fuPick.marks.noTick), JSON.stringify(fuPick.marks));
add('The tick: a 12px box, the text color, our own drawing', fuPick.marks.tickBox.join() === '12px,12px,true' && fuPick.marks.tickDrawn, JSON.stringify(fuPick.marks.tickBox));
add('The tick wipes in: 0.2s after 0.1s', fuPick.marks.tickT.includes(`clip-path 0.2s ${CURVE} 0.1s`), fuPick.marks.tickT);
add('The sign-up checkbox shows its tick', fuPick.marks.signup === 'inset(0px)', fuPick.marks.signup);
add('A picked rating shows its dot, the other none', fuPick.marks.rating === 'matrix(1, 0, 0, 1, 0, 0)' && fuPick.marks.noRating === 'matrix(0, 0, 0, 0, 0, 0)', JSON.stringify(fuPick.marks));
add('The dot scales in: 0.1s after 0.1s', fuPick.marks.dotT.includes(`transform 0.1s ${CURVE} 0.1s`), fuPick.marks.dotT);
// The circle: 1 at rest, 2 on a hover by a real pointer, 2 in the accent with focus.
const ring = (el) => evalJs(S, `(() => { const d = document.getElementById('site-frame').contentDocument, e = ${el}, c = d.defaultView.getComputedStyle(e); return JSON.stringify({ w: c.outlineWidth, o: c.outlineOffset, c: c.outlineColor, ink: c.color, a: d.activeElement === e }); })()`);
const RING = `document.getElementById('site-frame').contentDocument.querySelector('#block-${id} .form-followed input[type=checkbox]')`;
const ringAt = evalJs(S, `(async () => { const e = ${RING}; document.activeElement?.blur?.(); e.ownerDocument.activeElement?.blur?.(); e.scrollIntoView({ block: 'center' }); await new Promise((res) => setTimeout(res, 300)); const r = e.getBoundingClientRect(), o = document.getElementById('site-frame').getBoundingClientRect(); return JSON.stringify([o.left + r.left + 10, o.top + r.top + 10]); })()`);
mouse(S, 'move', 1590, 500); await pause(300);
const ringRest = ring(RING);
mouse(S, 'move', ringAt[0], ringAt[1]); await pause(300);
const hover = ring(RING);
mouse(S, 'move', 1590, 500); await pause(300);
evalJs(S, `(async () => { ${RING}.focus(); await new Promise((res) => setTimeout(res, 350)); return 'true'; })()`);
const focused = ring(RING);
evalJs(S, `(async () => { ${RING}.blur(); await new Promise((res) => setTimeout(res, 350)); return 'true'; })()`);
const blurred = ring(RING);
add('The circle at rest: 1px, the text color', ringRest.w === '1px' && ringRest.c === ringRest.ink, JSON.stringify(ringRest));
add('A hover: 2px inward, the text color', hover.w === '2px' && hover.o === '-2px' && hover.c === hover.ink, JSON.stringify(hover));
add('Focus: 2px in the accent, as read', focused.a && focused.w === '2px' && focused.c === 'rgb(242, 184, 180)', JSON.stringify(focused));
add('Focus gone: back to 1px', blurred.w === '1px', JSON.stringify(blurred));
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

// The phone (FORMFIELDS.json, phone): a new form, every kind, and what is per view.
const PH = FF.phone, sleepJs = 'const sleep = (ms) => new Promise((res) => setTimeout(res, ms));';
const spot2 = evalJs(S, `(async () => { ${sleepJs} document.getElementById('bp-desktop').click(); await sleep(300); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await sleep(350); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await sleep(200); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot2[0], spot2[1]); await pause(350);
const id2 = evalJs(S, `(async () => { ${sleepJs} document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Form"]').click(); await sleep(500); const b = fe.model.sections[1].blocks.at(-1); fe.select(fe.model.sections[1].id, b.id); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); return JSON.stringify(b.id); })()`);
const ph = (js) => evalJs(S, `(async () => { ${sleepJs} const P = document.getElementById('block-panel'), d = document.getElementById('site-frame').contentDocument, W = d.defaultView, b = () => fe.model.sections[1].blocks.find((x) => x.id === ${JSON.stringify(id2)}), elOf = () => d.getElementById('block-${id2}').closest('.fe-block'); const view = async (v) => { document.getElementById('bp-' + v).click(); await sleep(450); }; const tab = async (t) => { P.querySelector('[data-btab="' + t + '"]').click(); await sleep(120); }; const ff = async (a) => { P.querySelector('[data-ff="' + a + '"]').click(); await sleep(60); }; const on = (e) => !!e && e.getBoundingClientRect().width > 0; const look = () => { const el = elOf(), q = el.getBoundingClientRect(), R = (e) => { const r = e.getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }, h = [...el.querySelectorAll('.lightbox-handle')].find(on), m = el.querySelector('.fe-form:not(.form-lightbox .fe-form)'), sb = m && m.querySelector('.form-submit'); const k = P.querySelector('[data-form-lightbox]'), sa = P.querySelector('[data-form-set="buttonAlign"].is-on'); return { a: W.getComputedStyle(el).gridArea, block: R(el).slice(2), handle: h ? R(h) : null, word: h ? h.innerText.trim() : null, form: on(m), sub: on(sb) ? R(sb) : null, k: k ? k.checked : null, al: sa ? sa.getAttribute('aria-label') : null }; }; const flip = async () => { P.querySelector('[data-form-lightbox]').click(); await sleep(200); }; const al = async (v) => { P.querySelector('[data-form-set="buttonAlign"][data-v="' + v + '"]').click(); await sleep(150); }; const word = async (v) => { const i = P.querySelector('[data-form-lbtext]'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); await sleep(120); }; ${js} })()`);
const phDrawn = () => ph(`const F = elOf().querySelector('.fe-form:not(.form-lightbox .fe-form)'), o = F.getBoundingClientRect(), R = (e) => { const r = e.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }; return JSON.stringify({ h: Math.round(o.height * 10) / 10, w: Math.round(o.width * 10) / 10, items: [...F.querySelectorAll(':scope > .form-item, :scope > .form-button-wrapper')].filter((e) => e.getBoundingClientRect().height > 0).map((i) => ({ box: R(i), parts: [...i.querySelectorAll('input, select, textarea, button')].filter((c) => c.type !== 'hidden' && c.type !== 'file').slice(0, 6).map((c) => R(c.closest('.form-affix') || c)) })) });`);
const phCompare = (name, theirs, ours) => {
  add(`${name}: as many items`, theirs.items.length === ours.items.length, `${ours.items.length}, oracle ${theirs.items.length}`);
  add(`${name}: the form's height and width`, Math.abs(theirs.h - ours.h) <= 2 && Math.abs(theirs.w - ours.w) <= 1, `${ours.h} ${ours.w}, oracle ${theirs.h} ${theirs.w}`);
  theirs.items.forEach((t, i) => {
    const o = ours.items[i], w = t.txt.slice(0, 16) || t.cls.slice(0, 16);
    if (!o) return add(`${name} ${w}`, false, 'missing');
    // The Name and Phone boxes hold their gap on the oracle, and ours' gap is a margin: read the top and the width.
    add(`${name} ${w}: place`, Math.abs(o.box[1] - t.box[1]) <= 2 && Math.abs(o.box[2] - t.box[2]) <= 1, `${o.box}, oracle ${t.box}`);
    const parts = t.parts.filter((x) => !/ file /.test(x)).map((x) => x.split(' ').slice(-4).map(Number));
    parts.forEach((q, n) => { const c = o.parts[n]; add(`${name} ${w}: control ${n + 1}`, c && Math.abs(c[0] - q[0]) <= 1.5 && Math.abs(c[1] - q[1]) <= 2 && Math.abs(c[2] - q[2]) <= 1.5, c ? `${c}, oracle ${q}` : 'missing'); });
  });
};
const phOpen = ph(`await view('mobile'); return JSON.stringify(look());`);
add('Phone: a new form is 16 rows, 376.7 wide', phOpen.a === PH.new.canvas.area && Math.abs(phOpen.block[0] - PH.new.canvas.block[2]) <= 1 && Math.abs(phOpen.block[1] - PH.new.canvas.block[3]) <= 2, JSON.stringify(phOpen));
phCompare('Phone new', PH.new.tree, phDrawn());
// Lightbox per view, from a form with no fields added.
const lbA = ph(`const out = {}; await tab('Design'); await al('right'); out.pRight = look(); await view('desktop'); out.dAfter = look(); await al('center'); out.dCenter = look(); await view('mobile'); out.pAfter = look(); await flip(); out.pOn = look(); await al('center'); out.pCenter = look(); await al('left'); out.pLeft = look(); await word('Go'); out.pWord = look(); await view('desktop'); out.dLook = look(); await flip(); out.dOn = look(); await view('mobile'); out.pDOn = look(); await view('desktop'); await flip(); out.dOff = look(); await view('mobile'); out.pDOff = look(); return JSON.stringify(out);`);
const near1 = (a, v) => !!a && Math.abs(a[0] - v) <= 1.5;
add('Phone: Right moves the phone\'s Submit', near1(lbA.pRight.sub, 205) && lbA.pRight.al === 'right', JSON.stringify(lbA.pRight));
add('Phone: desktop\'s Submit stays left', near1(lbA.dAfter.sub, 0) && lbA.dAfter.al === 'left', JSON.stringify(lbA.dAfter));
add('Phone: desktop Center leaves the phone\'s Right', near1(lbA.dCenter.sub, 173.2) && near1(lbA.pAfter.sub, 205) && lbA.pAfter.al === 'right', JSON.stringify(lbA.pAfter));
add('Phone: Lightbox on takes the phone to 1 row', lbA.pOn.a === '1 / 2 / 2 / 10' && !lbA.pOn.form && near1(lbA.pOn.handle, 172.8) && lbA.pOn.k === true, JSON.stringify(lbA.pOn));
add('Phone: the button moves by the phone\'s alignment', near1(lbA.pCenter.handle, 86.4) && near1(lbA.pLeft.handle, 0), JSON.stringify([lbA.pCenter, lbA.pLeft]));
add('Phone: its Button Text', lbA.pWord.word === 'Go' && Math.abs(lbA.pWord.handle[2] - 135.2) <= 3, JSON.stringify(lbA.pWord));
add('Desktop: Lightbox still off, its rows and alignment kept', lbA.dLook.form && lbA.dLook.k === false && lbA.dLook.a === '1 / 2 / 17 / 11' && near1(lbA.dLook.sub, 173.2), JSON.stringify(lbA.dLook));
add('Desktop: Lightbox on, its own word and alignment', lbA.dOn.word === 'Open Form' && lbA.dOn.a === '1 / 2 / 4 / 11' && near1(lbA.dOn.handle, 157.1), JSON.stringify(lbA.dOn));
add('Desktop\'s changes leave the phone\'s', lbA.pDOn.word === 'Go' && near1(lbA.pDOn.handle, 0) && lbA.pDOn.a === '1 / 2 / 2 / 10' && lbA.pDOff.word === 'Go', JSON.stringify([lbA.pDOn, lbA.pDOff]));
add('Desktop off: the form returns, the rows stay', lbA.dOff.form && lbA.dOff.a === '1 / 2 / 4 / 11' && Math.abs(lbA.dOff.block[1] - 561) <= 2, JSON.stringify(lbA.dOff));
// A phone that has changed nothing follows desktop, key by key.
evalJs(S, `(async () => { ${sleepJs} document.getElementById('bp-desktop').click(); await sleep(300); const next = JSON.parse(JSON.stringify(fe.model)), o = next.sections[1].blocks.at(-1); delete o.formMobile; delete o.lightbox; delete o.lightboxText; delete o.buttonAlign; delete o.formH; o.layout.desktop.area = [1, 2, 17, 11]; o.layout.mobile.area = [1, 2, 17, 10]; fe.load(next); await sleep(350); fe.select(next.sections[1].id, o.id); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); return 'true'; })()`);
const lbB = ph(`const out = {}; await tab('Design'); await view('mobile'); await al('right'); await view('desktop'); await flip(); await word('Hey'); out.d = look(); await view('mobile'); out.p = look(); return JSON.stringify(out);`);
add('The phone follows desktop\'s Lightbox and word, keeps its own Right', lbB.p.k === true && lbB.p.word === 'Hey' && near1(lbB.p.handle, 233.2) && lbB.p.al === 'right', JSON.stringify(lbB.p));
add('Lightbox on from desktop leaves the phone\'s rows, the button on top', lbB.p.a === '1 / 2 / 17 / 10' && Math.abs(lbB.p.handle[1]) <= 1 && Math.abs(lbB.p.block[1] - 549) <= 2, JSON.stringify(lbB.p));
const lbDesk = ph(`await view('desktop'); return JSON.stringify(look());`);
add('Desktop shows its own alignment there', near1(lbDesk.handle, 0) && lbDesk.al === 'left', JSON.stringify(lbDesk));
// Every kind on the phone, from a new block; the rows are per view.
evalJs(S, `(async () => { ${sleepJs} document.getElementById('bp-desktop').click(); await sleep(300); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const b = s.blocks.at(-1); delete b.formMobile; delete b.lightbox; delete b.lightboxText; delete b.buttonAlign; b.layout.desktop.area = [1, 2, 17, 11]; b.layout.mobile.area = [1, 2, 17, 10]; fe.load(next); await sleep(350); fe.select(next.sections[1].id, b.id); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); return 'true'; })()`);
const addAll = ph(`await view('mobile'); await tab('Content'); await sleep(100); P.querySelector('[data-ff="list"]').click(); await sleep(120); for (const t of ${JSON.stringify(PH.allKinds.order)}) { await ff('add'); await ff('tile:' + t); await sleep(120); } return JSON.stringify(look());`);
const phAll = phDrawn();
phCompare('Phone all', PH.allKinds.tree, phAll);
add('Phone: its rows grew with the fields', addAll.a.startsWith('1 / 2 / 8') && addAll.a.endsWith('/ 10'), addAll.a);
const phDesk = ph(`await view('desktop'); return JSON.stringify(look());`);
add('Desktop\'s rows stay at 16 and stretch', phDesk.a === '1 / 2 / 17 / 11' && Math.abs(phDesk.block[1] - PH.allKinds.desktopAfter.block[3]) <= 3, JSON.stringify(phDesk));
const phFu = ph(`await view('mobile'); if (P.querySelector('[data-btab="Content"]')) await tab('Content'); await sleep(100); if (P.querySelector('[data-ff="list"]')) await ff('list'); await ff('add'); await ff('tile:Radio'); await sleep(120); await ff('edit:' + (b().fields.length - 1)); P.querySelector('[data-ff-menu]').click(); await sleep(120); document.querySelector('[data-ff-pop="follow"]').click(); await sleep(120); await ff('fu-tile:Name'); await sleep(100); await ff('back'); document.getElementById('preview').click(); await sleep(450); const w = elOf().querySelector('.form-followed'), F = elOf().querySelector('.fe-form'), o = F.getBoundingClientRect(), R = (e) => { const r = e.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map((v) => Math.round(v * 10) / 10); }, h0 = o.height; w.firstElementChild.querySelector('input').click(); await sleep(150); const c = w.querySelector('.followup-question-container:not([hidden])'), base = w.firstElementChild.getBoundingClientRect(); const out = { box: R(c), gap: c.getBoundingClientRect().top - base.bottom, inputs: [...c.querySelectorAll('input')].map((x) => R(x)[2]), grow: F.getBoundingClientRect().height - h0 }; document.getElementById('preview').click(); await sleep(300); return JSON.stringify(out);`);
add('Phone Preview: a follow-up 32 in, the column less 32 wide, 20 under', phFu.box[0] === 32 && Math.abs(phFu.box[2] - PH.followUp.box[2]) <= 1 && Math.abs(phFu.gap - 20) <= 1, JSON.stringify(phFu));
add('Phone Preview: its Name fields, as read', phFu.inputs.every((w) => Math.abs(w - 167.3) <= 1) && phFu.inputs.length === 2, phFu.inputs.join());
add('Phone Preview: the form grows as read', Math.abs(phFu.grow - (PH.followUp.after - PH.followUp.before)) <= 2, phFu.grow);
// The Message box: rich text on its short bar.
const MB = FF.postSubmit.messageBox;
evalJs(S, `(async () => { ${sleepJs} document.getElementById('bp-desktop').click(); await sleep(300); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const b = s.blocks.at(-1); b.fields = b.fields.slice(0, 4); b.post = {}; delete b.formMobile; delete b.lightbox; delete b.lightboxText; delete b.buttonAlign; delete b.buttonStyle; delete b.lightboxBg; delete b.formH; b.layout.desktop.area = [1, 2, 17, 11]; b.layout.mobile.area = [1, 2, 17, 10]; fe.load(next); await sleep(350); fe.select(next.sections[1].id, b.id); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); return 'true'; })()`);
const id3 = evalJs(S, `(() => fe.model.sections[1].blocks.at(-1).id)()`);
const mb = (js) => evalJs(S, `(async () => { ${sleepJs} const P = document.getElementById('block-panel'), d = document.getElementById('site-frame').contentDocument, W = d.defaultView, B = () => fe.model.sections[1].blocks.at(-1), M = () => P.querySelector('[data-ff-post="message"]'), Bar = document.getElementById('msg-bar'), key = (l) => Bar.querySelector('[aria-label="' + l + '"]'); const down = (e) => { e.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); e.click(); }; const hit = async (l) => { down(key(l)); await sleep(60); }; const pick = async (l) => { await hit('Text Style'); await hit(l); }; const all = () => { M().focus(); getSelection().selectAllChildren(M()); document.dispatchEvent(new Event('selectionchange')); }; const end = () => { M().focus(); const w = document.createTreeWalker(M(), 4); let t = null; while (w.nextNode()) t = w.currentNode; getSelection().collapse(t, t.length); document.dispatchEvent(new Event('selectionchange')); }; const text = () => d.querySelector('#block-${id3} .form-submission-text'); ${js} })()`);
const mb0 = mb(`const q = (s) => P.querySelector(s); if (q('[data-btab="Content"]')) q('[data-btab="Content"]').click(); await sleep(120); q('[data-ff="post"]').click(); await sleep(200); const out = { before: Bar.hidden }; M().focus(); await sleep(80); const b = Bar.querySelector('.tx-row').getBoundingClientRect(), m = M().getBoundingClientRect(), c = getComputedStyle(M()); out.bar = [b.width, b.height, b.left - m.left, b.top - m.top]; out.box = [m.width, m.height]; out.look = [c.backgroundColor, c.outlineWidth, c.outlineColor, c.color]; out.barLook = [getComputedStyle(Bar.querySelector('.tx-row')).backgroundColor, getComputedStyle(Bar.querySelector('.tx-row')).borderRadius]; out.kids = Object.fromEntries([...Bar.querySelectorAll('[aria-label]')].map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label'), [r.left - b.left, r.top - b.top, r.width, r.height].map((v) => Math.round(v))]; })); out.html = M().innerHTML; return JSON.stringify(out);`);
add('Message: the bar shows only with the box in focus', mb0.before === true, mb0.before);
add('Message: the bar is 384 by 44, 54 above the box', near(mb0.bar, [...MB.bar.box, ...MB.bar.fromBox], 0.5), mb0.bar.join());
add('Message: the box is 276 by 110, with a 2 ink outline in focus', near(mb0.box, MB.box.size, 0.5) && mb0.look.join() === 'rgb(249, 249, 249),2px,rgb(14, 14, 14),rgb(62, 62, 62)', JSON.stringify([mb0.box, mb0.look]));
add('Message: the bar is white, radius 6', mb0.barLook.join() === 'rgb(255, 255, 255),6px', mb0.barLook.join());
for (const [k, want] of Object.entries(MB.bar.controls)) add(`Message bar: ${k}`, near(mb0.kids[k] || [], want, 1), JSON.stringify(mb0.kids[k]));
add('Message: starts as a paragraph with Thank you!', /^<p>Thank you!<\/p>$/.test(mb0.html), mb0.html);
const mb1 = mb(`const out = {}; all(); await hit('Bold'); out.bold = M().innerHTML; out.sel = getSelection().toString(); out.on = key('Bold').classList.contains('is-on') && getComputedStyle(key('Bold')).backgroundColor; document.getElementById('undo').focus(); document.getElementById('undo').click(); await sleep(120); out.undo = B().post.message; M().focus(); await sleep(60); all(); await hit('Bold'); await hit('Bold'); out.off = M().innerHTML; await hit('Italic'); await hit('Underline'); out.iu = M().innerHTML; out.canvas = text().innerHTML; await hit('Bold'); out.nest = M().innerHTML; await hit('Clear Formatting'); out.clear = M().innerHTML; out.clearSel = getSelection().toString(); end(); await hit('Bold'); out.caretBold = M().innerHTML; await hit('Bold'); out.caretOff = M().innerHTML; await hit('Italic'); out.caretItalic = M().innerHTML; await hit('Italic'); return JSON.stringify(out);`);
add('Bold on a selection: strong inside the p, the selection stays', mb1.bold === '<p><strong>Thank you!</strong></p>' && mb1.sel === 'Thank you!', mb1.bold);
add('Bold shows pressed, 231 grey', mb1.on === MB.bar.on, mb1.on);
add('Bold is one undo step', !/strong/.test(mb1.undo || '') , mb1.undo);
add('A second press takes it off', mb1.off === '<p>Thank you!</p>', mb1.off);
add('Italic and Underline: em around u, on the block too', mb1.iu === '<p><em><u>Thank you!</u></em></p>' && mb1.canvas === mb1.iu, JSON.stringify([mb1.iu, mb1.canvas]));
add('All three nest strong, em, u', mb1.nest === '<p><strong><em><u>Thank you!</u></em></strong></p>', mb1.nest);
add('Clear Formatting: plain, the selection stays', mb1.clear === '<p>Thank you!</p>' && mb1.clearSel === 'Thank you!', mb1.clear);
add('Bold at a caret marks all the text, and takes it off', mb1.caretBold === '<p><strong>Thank you!</strong></p>' && mb1.caretOff === '<p>Thank you!</p>', JSON.stringify([mb1.caretBold, mb1.caretOff]));
add('Italic at a caret marks all the text', mb1.caretItalic === '<p><em>Thank you!</em></p>', mb1.caretItalic);
const mb2 = mb(`const out = {}; all(); await hit('Underline'); end(); await sleep(60); out.onCaret = key('Underline').classList.contains('is-on'); await hit('Underline'); out.noText = M().innerHTML; document.execCommand('insertText', false, 'z'); await sleep(60); out.typed = M().innerHTML; all(); await hit('Clear Formatting'); await hit('Text Style'); out.rows = [...Bar.querySelectorAll('.tx-styles [role=menuitemradio]')].map((e) => [e.getAttribute('aria-label'), e.getAttribute('aria-checked')]); out.open = key('Text Style').getAttribute('aria-expanded'); await hit('Text Style'); out.styles = {}; for (const t of ${JSON.stringify(MB.styles.order)}) { all(); await pick(t); await sleep(60); const e = M().firstElementChild, c = getComputedStyle(e), q = text().firstElementChild, k = W.getComputedStyle(q); out.styles[t] = { tag: e.tagName + (e.className ? '.' + e.className : ''), inner: e.firstElementChild?.tagName, sel: getSelection().toString().length, label: key('Text Style').textContent.trim(), box: [c.fontSize, c.fontWeight, c.marginTop], canvas: [k.fontSize, k.marginTop, Math.round(text().getBoundingClientRect().height)], closed: !Bar.querySelector('.tx-styles'), width: key('Text Style').getBoundingClientRect().width }; } all(); await pick('Paragraph 2'); return JSON.stringify(out);`);
add('Underline at a caret: shows pressed, changes no text', mb2.onCaret === true && /<u>/.test(mb2.noText), JSON.stringify([mb2.onCaret, mb2.noText]));
add('Underline at a caret: the next letter is not underlined', /<\/u>z<\/p>$/.test(mb2.typed), mb2.typed);
add('Text Style: the 8 rows in order, Paragraph 2 ticked', mb2.rows.map((r) => r[0]).join() === MB.styles.order.join() && mb2.rows.find((r) => r[1] === 'true')?.[0] === 'Paragraph 2', JSON.stringify(mb2.rows));
for (const [t, want] of Object.entries(MB.styles.html)) { const o = mb2.styles[t], tag = want === 'pre > code' ? o.tag === 'PRE' && o.inner === 'CODE' : o.tag.toLowerCase() === want; add(`Style ${t}: ${want}, the label follows, the selection stays`, tag && o.label === t && o.sel > 0 && o.closed, JSON.stringify(o)); }
for (const [t, want] of Object.entries(MB.bar.styleWidths)) add(`Text Style is ${want} wide on ${t}`, Math.abs(mb2.styles[t].width - want) <= 0.5, mb2.styles[t].width);
for (const [t, want] of Object.entries(MB.styles.inBox)) add(`Style ${t}: in the box as read`, mb2.styles[t].box.join() === want.join(), JSON.stringify(mb2.styles[t].box));
for (const [t, want] of Object.entries(MB.styles.onCanvas)) add(`Style ${t}: on the block as read`, mb2.styles[t].canvas[0] === want[0] && mb2.styles[t].canvas[1] === want[1] && Math.abs(mb2.styles[t].canvas[2] - want[2]) <= 2, JSON.stringify(mb2.styles[t].canvas));
const mb3 = mb(`const out = {}; M().focus(); M().innerHTML = '<p>Thank you!</p>'; M().dispatchEvent(new Event('input', { bubbles: true })); M().dispatchEvent(new Event('change', { bubbles: true })); all(); await hit('Link'); await sleep(120); const L = document.getElementById('link-popover'), r = L.getBoundingClientRect(), k = key('Link').getBoundingClientRect(); out.pop = [r.width, r.left + r.width / 2 - (k.left + k.width / 2), r.top - k.bottom]; out.list = !L.querySelector('.lk-pages').hidden; out.on = key('Link').classList.contains('is-on'); const i = L.querySelector('.lk-input'); i.value = '/about'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sleep(120); out.enter = M().innerHTML; out.stays = !L.hidden; out.listGone = L.querySelector('.lk-pages').hidden; return JSON.stringify(out);`);
add('Link: the menu 328 wide, centred under the button, 6 below', near(mb3.pop, [328, 0, 6], 1), mb3.pop.join());
add('Link: the list is open and the button shows pressed', mb3.list && mb3.on, JSON.stringify([mb3.list, mb3.on]));
add('Link: Enter writes nothing yet, the menu stays, the list goes', mb3.enter === '<p>Thank you!</p>' && mb3.stays && mb3.listGone, JSON.stringify(mb3));
// A real press away, so the focus moves as it does for a person.
const titleAt = evalJs(S, `(() => { const r = document.querySelector('#block-panel [data-ff="back"]').getBoundingClientRect(); return [r.right + 60, r.top + r.height / 2]; })()`);
mouse(S, 'move', titleAt[0], titleAt[1]); await pause(60); mouse(S, 'down', titleAt[0], titleAt[1], { buttons: 1 }); await pause(40); mouse(S, 'up', titleAt[0], titleAt[1]); await pause(250);
const mb4 = mb(`const out = {}; out.html = M().innerHTML; out.focus = document.activeElement === M(); out.sel = getSelection().toString(); out.bar = !Bar.hidden; out.on = key('Link').classList.contains('is-on'); out.canvas = text().innerHTML; out.gone = document.getElementById('link-popover').hidden; end(); await sleep(60); out.caretOff = key('Link').classList.contains('is-on'); return JSON.stringify(out);`);
add('Link: a press away closes it and writes the a', mb4.html === '<p><a href="/about">Thank you!</a></p>' && mb4.gone && mb4.canvas === mb4.html, JSON.stringify(mb4));
add('Link: the box takes back focus and selection, the bar stays', mb4.focus && mb4.sel === 'Thank you!' && mb4.bar && mb4.on, JSON.stringify(mb4));
add('Link: not pressed at a caret in the link', mb4.caretOff === false, mb4.caretOff);
// A paste in the box, each read from the oracle in turn (postSubmit.messageBox.paste).
const mbPaste = mb(`const LINK = 'x.html', clip = ([h, t]) => { const dt = new DataTransfer(); if (h) dt.setData('text/html', h.replaceAll('{link}', LINK)); dt.setData('text/plain', t); const at = getSelection().anchorNode; (at.nodeType === 3 ? at.parentElement : at).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }; const out = { reads: [], caret: [] }; for (const r of ${JSON.stringify(MB.paste.reads)}) { all(); clip(r); await sleep(60); out.reads.push([M().innerHTML, B().post.message, text().innerHTML].map((h) => h.replaceAll(LINK, '{link}'))); } all(); clip(['', 'Start']); await sleep(60); for (const r of ${JSON.stringify(MB.paste.atCaret.reads)}) { end(); clip(r); await sleep(60); out.caret.push(M().innerHTML); } const ab = B().post.message; all(); clip(['', 'Thank you!']); await sleep(60); out.before = ab; document.getElementById('undo').focus(); document.getElementById('undo').click(); await sleep(150); out.undo = B().post.message; out.undoBox = M().innerHTML; M().focus(); await sleep(60); all(); clip(['', 'Thank you!']); await sleep(60); return JSON.stringify(out);`);
MB.paste.reads.forEach((r, i) => { const got = mbPaste.reads[i]; add(`Message paste: ${(r[0] || r[1]).slice(0, 30)}`, got[0] === r[2] && got[1] === r[2] && got[2] === r[2], JSON.stringify(got)); });
add('Message paste at the caret: joins, splits, keeps the tail as read', mbPaste.caret.join('|') === MB.paste.atCaret.reads.map((r) => r[2]).join('|'), JSON.stringify(mbPaste.caret));
add('Message paste: one undo step', mbPaste.undo === mbPaste.before && mbPaste.undoBox === mbPaste.before, JSON.stringify([mbPaste.undo, mbPaste.undoBox]));
// Real keys in the box: letters write, Backspace stays in the box and the block lives.
const mb5 = mb(`const out = {}; all(); document.execCommand('delete'); await sleep(60); out.empty = M().innerHTML; out.cls = M().classList.contains('is-empty'); out.ph = getComputedStyle(M().firstElementChild, '::before').content; out.model = B().post.message; out.canvas = text().innerHTML; out.faded = key('Link').classList.contains('is-faded'); out.barAfter = !Bar.hidden; return JSON.stringify(out);`);
add('Emptied: Thank you! as a placeholder, Link fades, the block draws nothing', mb5.cls && /Thank you!/.test(mb5.ph) && mb5.faded && mb5.model === '' && mb5.canvas === '', JSON.stringify(mb5));
browser(S, 'press', 'a'); await pause(120); browser(S, 'press', 'Enter'); await pause(120); browser(S, 'press', 'b'); await pause(120); browser(S, 'press', 'Backspace'); await pause(120); browser(S, 'press', 'c'); await pause(120);
const mb6 = mb(`return JSON.stringify({ html: M().innerHTML, there: !!d.getElementById('block-${id3}'), canvas: text().innerHTML, cls: M().classList.contains('is-empty') });`);
add('Real keys write in the box, each line a p', /^<p>a<\/p><p>c<\/p>$/.test(mb6.html), mb6.html);
add('Backspace in the box leaves the block', mb6.there === true, JSON.stringify(mb6.there));
browser(S, 'press', 'Meta+a'); await pause(100); browser(S, 'press', 'Meta+b'); await pause(150);
const mb7 = mb(`const out = { bold: M().innerHTML }; M().blur(); await sleep(120); out.barGone = Bar.hidden; out.outline = getComputedStyle(M()).outlineStyle; return JSON.stringify(out);`);
add('Cmd+B marks the selection', /^<p><strong>a<\/strong><\/p><p><strong>c<\/strong><\/p>$/.test(mb7.bold), mb7.bold);
add('Leaving the box: the bar and the outline go', mb7.barGone && mb7.outline === 'none', JSON.stringify(mb7));
mb(`M().focus(); await sleep(60); return JSON.stringify(1);`); browser(S, 'press', 'Escape'); await pause(200);
const mb9 = evalJs(S, `(() => JSON.stringify({ panel: document.getElementById('block-panel').hidden || !document.getElementById('block-panel').querySelector('[data-ff-post]'), bar: document.getElementById('msg-bar').hidden }))()`);
add('Escape in the box closes the panel and the bar', mb9.panel && mb9.bar, JSON.stringify(mb9));
const mb8 = evalJs(S, `(async () => { ${sleepJs} const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.at(-1); b.post = { message: 'Line one\\nLine <two>' }; fe.load(next); await sleep(300); const t = document.getElementById('site-frame').contentDocument.querySelector('#block-${id3} .form-submission-text'); return JSON.stringify(t.innerHTML); })()`);
add('A plain message from before draws as paragraphs, escaped', mb8 === '<p>Line one</p><p>Line &lt;two&gt;</p>', JSON.stringify(mb8));

// Button Style and Background Color per view; the form's own Button Text is one value.
const pv = (js, area = 17) => { evalJs(S, `(async () => { ${sleepJs} document.getElementById('bp-desktop').click(); await sleep(300); const next = JSON.parse(JSON.stringify(fe.model)); const b = next.sections[1].blocks.at(-1); delete b.formMobile; delete b.lightbox; delete b.lightboxText; delete b.buttonAlign; delete b.buttonStyle; delete b.lightboxBg; delete b.formH; delete b.design; delete b.designMobile; b.post = {}; b.button = 'Submit'; b.fields = JSON.parse(${JSON.stringify(JSON.stringify(FRESH))}); b.layout.desktop.area = [1, 2, ${area}, 11]; b.layout.mobile.area = [1, 2, 17, 10]; next.sections[1].rows = { desktop: 40, mobile: 40 }; fe.load(next); await sleep(350); fe.select(next.sections[1].id, b.id); await sleep(150); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(200); return 'true'; })()`); return evalJs(S, `(async () => { ${sleepJs} const P = document.getElementById('block-panel'), d = document.getElementById('site-frame').contentDocument, B = () => fe.model.sections[1].blocks.at(-1), el = () => d.getElementById('block-' + B().id).closest('.fe-block'); let V = 'desktop'; const view = async (v) => { V = v; document.getElementById('bp-' + v).click(); await sleep(450); }; const tab = async (t) => { P.querySelector('[data-btab="' + t + '"]').click(); await sleep(120); }; const style = async (v) => { P.querySelector('[data-bpstyle-toggle]').click(); await sleep(80); P.querySelector('[data-bpstyle="' + v + '"]').click(); await sleep(150); }; const row = () => P.querySelector('.bp-bs-cur span:not(.bp-bs-aa)').textContent; const cls = () => (el().querySelector('.form-submit') || el().querySelector('.lightbox-handle')).className.match(/sqs-button-element--[a-z-]+/g).join(' '); const flip = async () => { P.querySelector('[data-form-lightbox]').click(); await sleep(170); }; const al = async (v) => { P.querySelector('[data-form-set="buttonAlign"][data-v="' + v + '"]').click(); await sleep(150); }; const rows = () => { const a = B().layout[V].area; return a[2] - a[0]; }; ${js} })()`); };
const FRESH = evalJs(S, `(() => { const b = fe.model.sections[1].blocks.at(-1); return JSON.stringify(b.fields); })()`);
const st = pv(`const out = {}; await tab('Design'); out.d0 = [cls(), row()]; await view('mobile'); out.p0 = [cls(), row()]; await style('secondary'); out.pSec = [cls(), row()]; await view('desktop'); out.dAfter = [cls(), row()]; await style('tertiary'); out.dTer = [cls(), row()]; await view('mobile'); out.pAfter = [cls(), row()]; return JSON.stringify(out);`);
add('Phone Button Style leaves desktop', st.pSec[1] === 'Secondary Button' && st.dAfter[1] === 'Primary Button' && st.dAfter[0] === 'sqs-button-element--primary sqs-button-element--phone-secondary', JSON.stringify(st));
add('Desktop Button Style leaves a phone that chose', st.dTer[1] === 'Tertiary Button' && st.pAfter[1] === 'Secondary Button' && st.pAfter[0].startsWith('sqs-button-element--tertiary sqs-button-element--phone-secondary'), JSON.stringify(st));
const st2 = pv(`const out = {}; await tab('Design'); await style('secondary'); await view('mobile'); out.follow = row(); await style('tertiary'); await style('secondary'); out.again = row(); await view('desktop'); await style('primary'); out.d = row(); await view('mobile'); out.keeps = row(); return JSON.stringify(out);`);
add('A phone that has not chosen follows desktop', st2.follow === 'Secondary Button', st2.follow);
add('A phone that chose keeps it', st2.again === 'Secondary Button' && st2.d === 'Primary Button' && st2.keeps === 'Secondary Button', JSON.stringify(st2));
const swatchOf = `getComputedStyle(P.querySelector('[data-shape-act="lightboxBg"] i')).backgroundColor`;
const pick = `const pickBg = async (hex) => { P.querySelector('[data-shape-act="lightboxBg"]').click(); await sleep(150); document.querySelector('[data-color-pick="' + hex + '"]').click(); await sleep(150); P.querySelector('[data-shape-act="lightboxBg"]').click(); await sleep(150); };`;
const bg = pv(`${pick} const out = {}; await tab('Design'); await flip(); out.d0 = ${swatchOf}; await view('mobile'); out.p0 = ${swatchOf}; P.querySelector('[data-shape-act="lightboxBg"]').click(); await sleep(150); const all = [...document.querySelectorAll('[data-color-pick]')].map((e) => e.dataset.colorPick); P.querySelector('[data-shape-act="lightboxBg"]').click(); await sleep(150); await pickBg(all[1]); out.pPick = ${swatchOf}; await view('desktop'); out.dAfter = ${swatchOf}; await pickBg(all[3]); out.dPick = ${swatchOf}; await view('mobile'); out.pAfter = ${swatchOf}; const box = el().querySelector('.form-lightbox-box'); out.vars = box.getAttribute('style'); out.cls = box.classList.contains('form-lightbox-box--phone'); return JSON.stringify(out);`);
add('Phone Background Color leaves desktop white', bg.pPick !== bg.p0 && bg.dAfter === bg.d0, JSON.stringify(bg));
add('Desktop Background Color leaves the phone\'s', bg.dPick !== bg.d0 && bg.pAfter === bg.pPick, JSON.stringify(bg));
add('What the button opens takes each view\'s color', bg.cls && /--lb-bg-phone/.test(bg.vars), bg.vars);
const txt = pv(`const out = {}; const I = () => P.querySelector('input[aria-label="Button Text"]'); const type = async (v) => { const i = I(); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); await sleep(120); }; const word = () => el().querySelector('.form-submit').textContent.trim(); await view('mobile'); await type('PhoneGo'); out.p = word(); await view('desktop'); out.d = [word(), I().value]; await type('DeskHey'); await view('mobile'); out.back = [word(), I().value]; return JSON.stringify(out);`);
add('The form\'s own Button Text is one value', txt.p === 'PhoneGo' && txt.d.join() === 'PhoneGo,PhoneGo' && txt.back.join() === 'DeskHey,DeskHey', JSON.stringify(txt));

// Lightbox off, then the first press: only that grows the rows, and it never shrinks them.
const OT = FF.lightbox.offThenPress;
for (const [k, n] of [['from26', 27], ['from25', 26], ['from27', 28], ['from30', 31]]) {
  const r = pv(`await tab('Design'); await flip(); const on = rows(); await flip(); const off = rows(); await al('center'); const press = rows(); await al('left'); return JSON.stringify({ on, off, press, again: rows() });`, n);
  add(`Lightbox off, ${k.slice(4)} rows: ${OT.desktop[k].on}, ${OT.desktop[k].off}, then ${OT.desktop[k].press}`, r.on === OT.desktop[k].on && r.off === OT.desktop[k].off && r.press === OT.desktop[k].press && r.again === r.press, JSON.stringify(r));
}
const ofs = pv(`await tab('Design'); await flip(); const on = rows(); await flip(); const off = rows(); await style('secondary'); return JSON.stringify({ on, off, press: rows() });`);
add('Button Style counts as that press', ofs.on === OT.desktop.styleFirst.on && ofs.off === OT.desktop.styleFirst.off && ofs.press === OT.desktop.styleFirst.buttonStylePress, JSON.stringify(ofs));
const ofp = pv(`await tab('Design'); await view('mobile'); const out = { rows: rows() }; await al('center'); out.press = rows(); await flip(); out.on = rows(); await flip(); out.off = rows(); await al('right'); out.fit = rows(); await view('desktop'); out.desk = rows(); await al('center'); out.deskPress = rows(); return JSON.stringify(out);`);
add('A new form on the phone: a press leaves its 16 rows', ofp.rows === OT.phone.newForm.rows && ofp.press === OT.phone.newForm.press, JSON.stringify(ofp));
add('On, off, a press from the phone: 1, 1, 17', ofp.on === OT.phone.cycle.on && ofp.off === OT.phone.cycle.off && ofp.fit === OT.phone.cycle.press, JSON.stringify(ofp));
add('Desktop stays out of it', ofp.desk === OT.phone.desktopAfterPhoneCycle.rows && ofp.deskPress === OT.phone.desktopAfterPhoneCycle.press, JSON.stringify(ofp));
const ofd = pv(`await tab('Design'); await flip(); await view('mobile'); const out = { on: rows() }; await flip(); out.off = rows(); await al('center'); out.press = rows(); return JSON.stringify(out);`);
add('Off from the phone with Lightbox on from desktop: 16, then 17', ofd.on === 16 && ofd.off === 16 && ofd.press === OT.phone.afterDesktopOn.press, JSON.stringify(ofd));
const off2 = pv(`await tab('Content'); await sleep(80); P.querySelector('[data-ff="list"]').click(); await sleep(120); for (let i = 0; i < 2; i++) { P.querySelector('[data-ff="add"]').click(); await sleep(70); P.querySelector('[data-ff="tile:Text"]').click(); await sleep(150); } P.querySelector('[data-ff="back"]').click(); await sleep(150); await tab('Design'); await view('mobile'); const out = { rows: rows() }; await al('center'); out.press = rows(); return JSON.stringify(out);`);
add('Fields added on desktop: a press leaves the phone\'s rows', off2.rows === OT.phone.fieldsAddedOnDesktop.rows && off2.press === OT.phone.fieldsAddedOnDesktop.press, JSON.stringify(off2));
// The focus ring on all ten themes, as read.
const RT = FF.followUp.marks.ringByTheme;
for (const [name, attr] of Object.entries(RT.attr)) {
  const c = evalJs(S, `(async () => { ${sleepJs} const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].theme = ${JSON.stringify(attr)}; fe.load(next); await sleep(300); const d = document.getElementById('site-frame').contentDocument, W = d.defaultView, i = d.querySelector('#block-' + next.sections[1].blocks.at(-1).id + ' .form-signup input'); document.getElementById('site-frame').focus(); i.focus(); await sleep(350); const cs = W.getComputedStyle(i); const out = [d.querySelector('[data-section-id="' + next.sections[1].id + '"]').getAttribute('data-section-theme'), cs.outlineColor, cs.outlineWidth, W.getComputedStyle(i).outlineStyle]; i.blur(); return JSON.stringify(out); })()`);
  add(`The focus ring on ${name}: ${RT[name]}`, c[0] === attr && c[1] === RT[name] && c[2] === '2px', JSON.stringify(c));
}
// The rows settle one step late, against the runs read (FORMFIELDS.json, blockFits.rule).
const STEPS = `const T = ${JSON.stringify(FF.blockFits.rule.desktop.text)}; const H = () => { const f = el().querySelector('.form-wrapper'); return Math.round(f.getBoundingClientRect().height * 10) / 10; }; const desc = async (t) => { const a = P.querySelector('[data-ff-field="description"]'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); await sleep(90); }; const go = async (k) => { const [w, x] = k.split(' '); if (w === 'open') { [...P.querySelectorAll('.bp-ff-row')].find((r) => r.querySelector('.bp-ff-name').textContent === x).click(); await sleep(110); } else if (w === 'back') { P.querySelector('[data-ff="back"]').click(); await sleep(110); } else if (w === 'add') { P.querySelector('[data-ff="add"]').click(); await sleep(70); P.querySelector('[data-ff="tile:' + x + '"]').click(); await sleep(130); } else if (w === 'long' || w === 'short') await desc(T[w]); else if (w === 'empty') await desc(''); else if (w === 'req') { P.querySelector('[data-ff-set="required"]').click(); await sleep(110); } else if (w === 'show') { P.querySelector('[data-ff-set="show:1"]').click(); await sleep(110); } else if (w === 'opt') { P.querySelector('[data-ff="opt-add"]').click(); await sleep(110); } };`;
const stepRun = (list, phone) => pv(`${STEPS} await tab('Content'); await sleep(80); ${phone ? "await view('mobile');" : ''} P.querySelector('[data-ff="list"]').click(); await sleep(120); const out = [[rows(), H()]]; for (const k of ${JSON.stringify(list.map((x) => x[0]))}) { await go(k); out.push([rows(), H()]); } return JSON.stringify(out);`);
for (const [name, run] of [['Desktop', FF.blockFits.rule.desktop], ['Phone', FF.blockFits.rule.phone], ['Desktop fresh', FF.blockFits.rule.freshDesktop], ['Phone fresh', FF.blockFits.rule.freshPhone]]) {
  const got = stepRun(run.steps, name.startsWith('Phone'));
  add(`${name}: a new form starts at ${run.start[0]} rows`, got[0][0] === run.start[0], JSON.stringify(got[0]));
  run.steps.forEach((x, i) => { if (x.length > 1) add(`${name} step ${i + 1}, ${x[0]}: ${x[1]} rows, form ${x[2]}`, got[i + 1][0] === x[1] && Math.abs(got[i + 1][1] - x[2]) <= 2, JSON.stringify(got[i + 1])); });
}
// A message taller than the form, then Back and the next steps (postSubmit.tall, blockFits.rule.afterTallMessage).
const TALL = FF.postSubmit.tall;
const tall = pv(`${STEPS} await tab('Content'); await sleep(80); P.querySelector('[data-ff="post"]').click(); await sleep(150); const M = P.querySelector('[data-ff-post="message"]'); const out = { at: {} }; const text = () => el().querySelector('.form-submission-text').getBoundingClientRect().height; let html = '<p>L0</p>'; for (let k = 1; k < 36; k++) { html += '<p>x</p>'; M.innerHTML = html; for (const e of [1, 2]) M.dispatchEvent(new Event('input', { bubbles: true })); await sleep(25); if (k === 5 || k === 12 || k === 20 || k === 35) out.at[k + 1] = [Math.round(text() * 10) / 10, H(), rows()]; } const Q = P.querySelector('[data-ff-post="message"]'); out.box = [Q.offsetHeight, Q.scrollHeight > 110]; P.querySelector('[data-ff="back"]').click(); await sleep(150); out.back = [H(), rows()]; P.querySelector('[data-ff="list"]').click(); await sleep(120); await go('add Text'); out.a1 = [rows(), H()]; await go('add Radio'); out.a2 = [rows(), H()]; return JSON.stringify(out);`);
add('A tall message: the panel\'s box stays 110 and scrolls', tall.box[0] === 110 && tall.box[1], JSON.stringify(tall.box));
for (const r of TALL.reads) { const g = tall.at[r.ps]; add(`A message of ${r.ps} lines: text ${r.text}, form ${r.form}, ${r.rows} rows`, !!g && Math.abs(g[0] - r.text) <= 2 && Math.abs(g[1] - r.form) <= 2 && g[2] === r.rows, JSON.stringify(g)); }
add('Back: the form returns and the rows stay', Math.abs(tall.back[0] - TALL.back.form) <= 2 && tall.back[1] === TALL.back.rows, JSON.stringify(tall.back));
const AT = FF.blockFits.rule.afterTallMessage.reads;
add('The next steps: 14 rows, then 17', tall.a1[0] === AT[4][1] && tall.a2[0] === AT[5][1], JSON.stringify([tall.a1, tall.a2]));
// Hidden's Variable, as read.
const hv = pv(`${STEPS} await tab('Content'); await sleep(80); P.querySelector('[data-ff="list"]').click(); await sleep(120); await go('add Hidden'); await go('open Hidden'); const out = {}; for (const t of ${JSON.stringify(Object.keys(FF.hiddenVariable.reads))}) { const i = P.querySelector('[data-ff-field="label"]'); i.value = t; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(90); out[t] = P.querySelector('.bp-ff-var').textContent; } return JSON.stringify(out);`);
for (const [t, v] of Object.entries(FF.hiddenVariable.reads)) add(`Hidden's Variable for "${t}": ${v}`, hv[t] === v, hv[t]);
// A label typed empty, as read.
const EL = FF.emptyLabel;
const el0 = pv(`${STEPS} await tab('Content'); await sleep(80); P.querySelector('[data-ff="list"]').click(); await sleep(120); await go('add Text'); await go('add Radio'); const clear = async (n) => { await go('open ' + n); const i = P.querySelector('[data-ff-field="label"]'); const ph = i.placeholder; i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(90); const t = P.querySelector('.bp-ff-title').textContent; await go('back'); return [t, ph]; }; const out = {}; const box = (e) => e.getBoundingClientRect().height; out.h0 = H(); out.text = await clear('Text'); out.h1 = H(); out.label = box(el().querySelectorAll('.form-item')[4].querySelector('label.title')); out.radio = await clear('Radio'); out.name = await clear('Name'); out.h2 = H(); out.legend = box(el().querySelector('.form-item legend')); out.list = [...P.querySelectorAll('.bp-ff-name')].map((e) => e.textContent); out.email = await clear('Email'); const e1 = el().querySelectorAll('.form-item')[1], t1 = e1.querySelector('label.title'), m1 = t1.querySelector('.req'); out.req = [m1.textContent.trim(), m1.getBoundingClientRect().left - t1.getBoundingClientRect().left, t1.getBoundingClientRect().height]; out.item2 = P.querySelectorAll('.bp-ff-name')[1].textContent; return JSON.stringify(out);`);
add('A required field typed empty keeps its mark at the left', el0.req[0] === '(required)' && Math.abs(el0.req[1]) <= 0.6 && Math.abs(el0.req[2] - EL.required.label[1]) <= 0.6 && el0.item2 === EL.required.list, JSON.stringify([el0.req, el0.item2]));
add('An empty label: the rows in the list are Items', el0.list.join() === EL.list.join(), el0.list.join());
add('An empty label: the panel keeps the kind\'s name', el0.text.join() === 'Text,Text' && el0.radio.join() === 'Radio,Radio' && el0.name.join() === 'Name,Name', JSON.stringify([el0.text, el0.radio, el0.name]));
add('An empty label: a Text keeps its line', Math.abs(el0.label - EL.text.label[1]) <= 0.6 && Math.abs(el0.h1 - EL.form.afterText) <= 2, JSON.stringify([el0.label, el0.h1]));
add('An empty label: a legend goes to 8', Math.abs(el0.legend - EL.radio.legend[1]) <= 0.6 && Math.abs(el0.h2 - EL.form.afterRadioAndName) <= 2, JSON.stringify([el0.legend, el0.h2]));
// An option's grip moves the option; the Country list; the HTML box's look; the tip.
const misc = pv(`${STEPS} await tab('Content'); await sleep(80); P.querySelector('[data-ff="list"]').click(); await sleep(120); await go('add Address'); const out = {}; const sel = el().querySelector('.form-address select') || el().querySelector('select'); out.country = [sel.options.length, sel.selectedOptions[0].textContent, sel.options[0].textContent, sel.options[1].textContent, [...sel.options].map((o) => o.textContent)]; await go('add Radio'); await go('open Radio'); const m = P.querySelector('[data-ff-menu]'); out.tip = m.dataset.tip; m.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); const tip = document.getElementById('bar-tip'); out.shown = [tip.hidden, tip.textContent]; { const q = tip.getBoundingClientRect(), b = m.getBoundingClientRect(); out.tipBox = [q.height, q.top - b.bottom, q.left + q.width / 2 - (b.left + b.width / 2)]; } m.dispatchEvent(new PointerEvent('pointerout', { bubbles: true })); out.gone = tip.hidden; await go('back'); P.querySelector('[data-ff="back"]').click(); await sleep(150); P.querySelector('[data-ff="post"]').click(); await sleep(150); const c = P.querySelector('[data-ff-post="html"]'); c.value = '<p class="a">Hi</p>'; c.dispatchEvent(new Event('input', { bubbles: true })); await sleep(120); const box = c.closest('.bp-code'); out.code = [box.classList.contains('is-look'), box.dataset.lang, box.offsetHeight, box.querySelectorAll('.bp-code-hl span').length > 2, box.querySelector('.bp-code-n')?.textContent, c.getAttribute('aria-label'), c.placeholder]; c.dispatchEvent(new Event('change', { bubbles: true })); out.drawn = el().querySelector('.form-post p.a')?.textContent; return JSON.stringify(out);`);
const C = FF.country;
add('Country: 245 names, Norway chosen, as read', misc.country[0] === 245 && misc.country[1] === 'Norway' && misc.country[2] === 'Afghanistan' && misc.country[3] === 'Åland Islands', JSON.stringify(misc.country.slice(0, 4)));
add('Country: the 8 the oracle hasn\'t are out', C.onlyInBrowser.every((n) => !misc.country[4].includes(n)));
add('Country: the 2 it has are in', C.onlyOnOracle.every((n) => misc.country[4].includes(n)));
add('An option\'s menu button: its tip', misc.tip === 'Open menu' && misc.shown[0] === false && misc.shown[1] === 'Open menu' && misc.gone === true, JSON.stringify([misc.tip, misc.shown, misc.gone]));
add('The tip: 44 high, 11 under, centred', misc.tipBox[0] === 44 && Math.abs(misc.tipBox[1] - 11) <= 0.6 && Math.abs(misc.tipBox[2]) <= 1, JSON.stringify(misc.tipBox));
add('The HTML box: colours and a number per line', misc.code[0] && misc.code[1] === 'html' && misc.code[2] === 146 && misc.code[3] && misc.code[4] === '1' && misc.code[5] === 'HTML' && misc.code[6] === 'Add', JSON.stringify(misc.code));
add('The HTML box: drawn on the block', misc.drawn === 'Hi', misc.drawn);
// A Background or Stroke on a form, and Lightbox with one set (blockFits.boxed, lightbox.designSet).
const BX = FF.blockFits.boxed;
const DES = `const B0 = () => { const q = el().getBoundingClientRect(), f = el().querySelector('.fe-form'); return { rows: rows(), block: Math.round(q.height), inner: f ? Math.round(f.getBoundingClientRect().width) : null, border: W().getComputedStyle(el().querySelector('.sqs-block')).borderTopWidth }; }; const W = () => el().ownerDocument.defaultView; const bg = async () => { P.querySelector('[data-design="background"]').click(); await sleep(170); }; const pad = async (v) => { P.querySelector('[data-dset="pad"][data-v="' + v + '"]').click(); await sleep(170); }; const stroke = async (v) => { P.querySelector('[data-dset="stroke"][data-v="' + v + '"]').click(); await sleep(170); }; const tog = () => P.querySelector('[data-design="background"]')?.checked;`;
const bx = pv(`${DES} await tab('Design'); const out = {}; await bg(); out.bg = B0(); await pad('L'); out.padL = B0(); await pad('S'); out.padS = B0(); await pad('M'); out.padM = B0(); await bg(); out.off = B0(); P.querySelector('[data-design="blur"]').click(); await sleep(170); out.blur = B0(); return JSON.stringify(out);`);
add('Background on: 3 rows, the block holds the padded form', bx.bg.rows === BX.new.background.rows && Math.abs(bx.bg.block - BX.new.background.block) <= 2 && Math.abs(bx.bg.inner - BX.new.background.inner) <= 1, JSON.stringify(bx.bg));
add('Padding L and S: the block\'s height', Math.abs(bx.padL.block - BX.new.padL.block) <= 2 && Math.abs(bx.padS.block - BX.new.padS.block) <= 2, JSON.stringify([bx.padL, bx.padS]));
add('Background off: 16 rows', bx.off.rows === BX.new.off.rows && Math.abs(bx.off.block - BX.new.off.block) <= 2, JSON.stringify(bx.off));
add('The next step: 14', bx.blur.rows === BX.new.blurOn.rows && Math.abs(bx.blur.block - BX.new.blurOn.block) <= 2, JSON.stringify(bx.blur));
const bs = pv(`${DES} await tab('Design'); const out = {}; await stroke('solid'); out.solid = B0(); await pad('L'); out.padL = B0(); await stroke(''); out.none = B0(); return JSON.stringify(out);`);
add('Solid Stroke: 3 rows, the block holds it', bs.solid.rows === BX.stroke.solid.rows && Math.abs(bs.solid.block - BX.stroke.solid.block) <= 2 && Math.abs(bs.solid.inner - BX.stroke.solid.inner) <= 1, JSON.stringify(bs.solid));
const lb0 = pv(`${DES} await tab('Design'); const out = {}; await bg(); await flip(); out.on = B0(); await flip(); out.off = B0(); out.tog = tog(); return JSON.stringify(out);`);
add('Lightbox takes a Background off for good', lb0.tog === false && Math.abs(lb0.off.block - 561) <= 2 && lb0.off.inner === 518, JSON.stringify(lb0));
const lb1 = pv(`${DES} await tab('Design'); const out = {}; await stroke('solid'); await flip(); out.on = B0(); await flip(); out.off = B0(); out.keep = !!P.querySelector('[data-dset="stroke"][data-v="solid"].is-on'); return JSON.stringify(out);`);
add('Lightbox keeps a Stroke, on the button\'s block with no padding', lb1.on.border === '2px' && Math.abs(lb1.on.block - 71) <= 2 && lb1.keep && Math.abs(lb1.off.block - 627) <= 2 && lb1.off.inner === 452, JSON.stringify(lb1));
const lb2 = pv(`${DES} await tab('Design'); const out = {}; P.querySelector('[data-design="blur"]').click(); await sleep(170); await flip(); await flip(); out.blur = P.querySelector('[data-design="blur"]').checked; return JSON.stringify(out);`);
add('Lightbox keeps Blur', lb2.blur === true, JSON.stringify(lb2));
writeFileSync(new URL('../parity/form-check.json', import.meta.url), `${JSON.stringify({ check: 'Add Block > Form', pass, total, results }, null, 1)}\n`);
console.log(`Form: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
