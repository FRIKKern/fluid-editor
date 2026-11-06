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

writeFileSync(new URL('../parity/form-check.json', import.meta.url), `${JSON.stringify({ check: 'Add Block > Form', pass, total, results }, null, 1)}\n`);
console.log(`Form: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
