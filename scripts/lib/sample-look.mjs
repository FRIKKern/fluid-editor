// The behaviour sample: one change to one panel row, on ours and on the oracle, and what it did to the block, read the same
// way on both. scripts/sample-ours.mjs picks the rows and writes the predictions; scripts/oracle-sample.mjs reads the oracle;
// sample-ours.mjs --score scores them. Only change() presses, and only through pressOnTop, the mouse and keys.
import { pause, browser, mouse } from './cmux.mjs';
import { pressOnTop } from '../oracle/press.mjs';

// Every control in a panel in page order, with the row it's under (the reader oracle-rows.mjs uses, with the root passed in).
// Kept on window.__ctl for a press by number.
export const controlsJs = (root) => `(() => { const root = ${root}; window.__ctl = []; if (!root) return JSON.stringify(null); const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none'; };
  const kindOf = (e) => { const r = e.getAttribute('role'), t = e.tagName, ty = e.type; if (/check-element/.test(String(e.className))) return 'switch'; if (r === 'radio' || ty === 'radio') return 'choice'; if (r === 'switch' || r === 'checkbox' || ty === 'checkbox') return 'switch'; if (r === 'slider' || ty === 'range') return 'slider'; if (t === 'SELECT' || r === 'combobox' || e.getAttribute('aria-haspopup')) return 'menu'; if (t === 'TEXTAREA' || e.isContentEditable) return 'area'; if (t === 'INPUT') return 'field'; if (t === 'BUTTON' || r === 'button' || t === 'A') return 'button'; return null; };
  const out = []; let row = '';
  const walk = (e) => { if (!vis(e) || e.getAttribute('role') === 'tablist') return;
    if (e.getAttribute('role') === 'radiogroup') { const group = clean(e.getAttribute('aria-label')); if (group) row = group; [...e.querySelectorAll('[role=radio], input[type=radio]')].forEach((r, n) => { const t = vis(r) ? r : r.closest('label') || r.parentElement; window.__ctl.push(t); out.push({ i: window.__ctl.length - 1, row, kind: 'choice', name: clean(r.getAttribute('aria-label')) || clean(t.getAttribute('aria-label')) || clean(t.innerText) || 'option ' + (n + 1), value: r.getAttribute('aria-checked') === 'true' || r.checked === true }); }); return; }
    const k = e.querySelector('[role=tablist]') ? null : kindOf(e);
    if (k) { const lines = (e.innerText || '').split('\\n').map(clean).filter(Boolean); const name = clean(e.getAttribute('aria-label')) || (k === 'button' || k === 'menu' || (k === 'switch' && e.tagName === 'DIV') ? lines[0] : '') || clean(e.getAttribute('placeholder')) || '';
      const v = k === 'switch' ? (e.tagName === 'DIV' && /check-element/.test(String(e.className)) ? /checked/.test(String(e.className)) : (e.getAttribute('aria-checked') ?? (e.checked ? 'true' : 'false')) === 'true') : k === 'choice' ? (e.getAttribute('aria-checked') === 'true' || e.checked === true) : k === 'slider' ? (e.value ?? e.getAttribute('aria-valuenow')) : k === 'field' || k === 'area' ? (e.value ?? clean(e.textContent)) : k === 'menu' ? (e.tagName === 'SELECT' ? e.options[e.selectedIndex]?.text : lines[lines.length - 1]) : undefined;
      window.__ctl.push(e); const c = { i: window.__ctl.length - 1, row, kind: k, name: name || row, value: v }; if (e.disabled || e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-unbuilt')) c.off = true; if (k === 'menu' && e.tagName === 'SELECT') c.options = [...e.options].map((o) => o.text); out.push(c); if (k !== 'choice') row = c.name; return; }
    const own = clean([...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ')); if (own) row = own.slice(0, 80);
    for (const c of e.children) walk(c); };
  for (const c of root.children) walk(c); return JSON.stringify(out); })()`;

// What the block looks like, from outside its markup: its box, the box its content fills, how many things show, its words,
// the first text's style, fills, corners, borders, opacity and transforms, the ::before and ::after of each element counted
// in. Editor-only parts (handles, overlays) are left out.
// frame: the page frame's id, sqs-site-frame on the oracle, site-frame on ours.
export const lookJs = (frame, id) => `(() => { const F = document.getElementById('${frame}'), d = F.contentDocument, W = F.contentWindow;
  const b = d.querySelector('.fe-block[data-block-id="${id}"]'); if (!b) return JSON.stringify(null);
  // Editor-only parts, by name. Not a word like "editing": with its panel open the oracle's own content wrapper takes
  // sqs-block-editing, and rounds 1 and 2 dropped the whole content that way.
  const EDITOR = /\b(sqs-editing-overlay|sqs-block-outline|sqs-block-resizing-outline|sqs-block-resizing-inner|sqs-block-label-tag|sqs-block-editor-button-container|fe-handle|fe-label)\b|fluid-engine-block-editing-indicator/;
  const cls = (e) => String(e.className && (e.className.baseVal ?? e.className));
  const editor = (e) => { for (let p = e; p && p !== b; p = p.parentElement) if (EDITOR.test(cls(p))) return true; return false; };
  const shown = (e) => { const q = e.getBoundingClientRect(); return q.width >= 1 && q.height >= 1 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }); };
  const els = [...b.querySelectorAll('*')].filter((e) => !e.closest('svg *') && !editor(e) && shown(e));
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\\s+/g, ' ').trim();
  const MEDIA = /^(IMG|VIDEO|IFRAME|CANVAS|svg|INPUT|TEXTAREA|SELECT)$/;
  const leaves = els.filter((e) => MEDIA.test(e.tagName) || own(e));
  const B = b.getBoundingClientRect(), r = (v) => Math.round(v);
  const U = leaves.reduce((u, e) => { const q = e.getBoundingClientRect(); return u ? [Math.min(u[0], q.left), Math.min(u[1], q.top), Math.max(u[2], q.right), Math.max(u[3], q.bottom)] : [q.left, q.top, q.right, q.bottom]; }, null) || [B.left, B.top, B.right, B.bottom];
  const t = leaves.find((e) => own(e)), c = t ? W.getComputedStyle(t) : null;
  // ::before and ::after count where they draw something: a fill, a border or a shadow can live there alone.
  const all = [b, ...els], pseudo = all.flatMap((e) => ['::before', '::after'].map((p) => W.getComputedStyle(e, p)).filter((x) => x.content && x.content !== 'none' && x.display !== 'none'));
  const cs = [...all.map((e) => W.getComputedStyle(e)), ...pseudo];
  const fills = [...new Set(cs.map((x) => x.backgroundColor).filter((x) => x && x !== 'rgba(0, 0, 0, 0)' && x !== 'transparent'))].sort().slice(0, 6);
  const transforms = [...new Set(cs.map((x) => x.transform).filter((x) => x && x !== 'none'))].sort().slice(0, 4);
  const shadows = cs.filter((x) => x.boxShadow && x.boxShadow !== 'none').length + cs.filter((x) => x.filter && /drop-shadow/.test(x.filter)).length;
  const filters = [...new Set(cs.flatMap((x) => [x.filter, x.backdropFilter]).filter((x) => x && x !== 'none' && !/drop-shadow/.test(x)))].sort().slice(0, 4);
  return JSON.stringify({ w: r(B.width), h: r(B.height), cl: r(U[0] - B.left), ct: r(U[1] - B.top), cr: r(B.right - U[2]), cb: r(B.bottom - U[3]),
    leaves: leaves.length, media: leaves.filter((e) => MEDIA.test(e.tagName)).length, words: leaves.map(own).filter(Boolean).join(' ').slice(0, 120),
    align: c?.textAlign, size: c ? parseFloat(c.fontSize) : null, weight: c?.fontWeight, italic: c?.fontStyle, case: c?.textTransform, deco: c?.textDecorationLine, color: c?.color, family: c ? c.fontFamily.split(',')[0].replace(/["']/g, '').trim() : null,
    radius: Math.max(0, ...cs.map((x) => parseFloat(x.borderTopLeftRadius) || 0)), border: Math.max(0, ...cs.map((x) => (x.borderTopStyle !== 'none' ? parseFloat(x.borderTopWidth) || 0 : 0))),
    opacity: Math.min(...cs.map((x) => Number(x.opacity))), fills, transforms, shadows, filters }); })()`;

export const NUMBER = ['w', 'h', 'cl', 'ct', 'cr', 'cb', 'leaves', 'media', 'size', 'radius', 'border', 'opacity', 'shadows'];
// Their new value must be the same on both sides. The rest count only as changed or not: colours, words, fonts and
// transforms are written differently by the two.
export const SAME_VALUE = ['align', 'weight', 'italic', 'case', 'deco'];

// What changed between two looks: { key: [before, after] }. A box moving under 1 px is not a change.
export function lookDiff(a, b) {
  if (!a || !b) return { gone: [!!a, !!b] };
  const out = {};
  for (const k of Object.keys({ ...a, ...b })) {
    const x = a[k], y = b[k];
    if (NUMBER.includes(k) ? Math.abs((Number(y) || 0) - (Number(x) || 0)) < (k === 'opacity' ? 0.01 : 1) : JSON.stringify(x) === JSON.stringify(y)) continue;
    out[k] = [x, y];
  }
  return out;
}

// One sample, scored. A match: the same keys changed on both sides, numbers moved the same way, and the SAME_VALUE keys
// ended at the same value. "Nothing changed" on both is a match too.
export function scoreOne(ours, oracle) {
  const a = Object.keys(ours).sort(), b = Object.keys(oracle).sort(), why = [];
  for (const k of a) if (!b.includes(k)) why.push(`ours changes ${k}, the oracle doesn't`);
  for (const k of b) if (!a.includes(k)) why.push(`the oracle changes ${k}, ours doesn't`);
  for (const k of a.filter((x) => b.includes(x))) {
    if (NUMBER.includes(k) && Math.sign(ours[k][1] - ours[k][0]) !== Math.sign(oracle[k][1] - oracle[k][0])) why.push(`${k} moves the other way`);
    if (SAME_VALUE.includes(k) && ours[k][1] !== oracle[k][1]) why.push(`${k} ends at ${ours[k][1]} on ours, ${oracle[k][1]} on the oracle`);
  }
  return { match: !why.length, why };
}

// The rows a sample may take. Pressed by the same gestures oracle-rows.mjs uses: a switch or a choice is pressed, a slider at
// 3/4 of its width, a number field is cleared and given 50 (arrow keys move nothing on ours), a text field gets "Ab", a plain select the first letter of another option.
export const KINDS = ['switch', 'choice', 'slider', 'field', 'menu'];
// As oracle-rows.mjs refuses by name, plus words that say the row reaches past the block, and business info (a Map's
// address goes out to a lookup).
export const REFUSE = /reset|save|delete|remove|upload|replace|create|connect|account|manage|export|store|payment|learn more|set up|site style|form style|edit button|color theme|privacy|terms|add an image|add a new animation|add item|attach|duplicate|^close$|storage|newsletter|mailchimp|email|\b(address|city|zip|business|phone|location|country)\b/i;
export const COMMON = /^(Background|Stroke|Stroke Color|Blend Mode|Blur|Transforms|More actions|Opacity|Rotate|Scale|Offset|Skew|Anchor|Position|Triggers|Animation list actions|Add a new animation|Fill|Thickness|Corner)\b/;
export const norm = (s) => (s || '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();

// The same gestures oracle-rows.mjs uses, but a number field is cleared and given 50.
export async function change(S, c, at, js) {
  if (c.kind === 'switch' || c.kind === 'choice') { await pressOnTop(S, at, 900); return; }
  if (c.kind === 'slider') {
    const q = js(`(() => { const e = ${at}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width * 0.75, r.top + r.height / 2]); })()`);
    mouse(S, 'move', q[0], q[1]); await pause(80); mouse(S, 'down', q[0], q[1], { buttons: 1 }); await pause(40); mouse(S, 'up', q[0], q[1]); await pause(900); return;
  }
  if (c.kind === 'menu') {
    const other = c.options.find((o) => o && o[0].toLowerCase() !== String(c.value || ' ')[0].toLowerCase() && !REFUSE.test(o));
    js(`(() => { ${at}.focus(); return 'true'; })()`); browser(S, 'press', other[0].toLowerCase()); await pause(1000); return other;
  }
  await pressOnTop(S, at, 400);
  if (typeof c.value === 'string' && /^-?[\d.]+/.test(c.value)) { browser(S, 'press', 'End'); for (let n = 0; n < 8; n++) browser(S, 'press', 'Backspace'); for (const k of '50') browser(S, 'press', k); } else for (const k of 'Ab') browser(S, 'press', k);
  await pause(500); browser(S, 'press', 'Tab'); await pause(800);
}
export const findAt = (list, c) => {
  const same = (x) => x.kind === c.kind && norm(x.name) === norm(c.name);
  const hit = list.find((x) => same(x) && norm(x.row) === norm(c.row)) || (list.filter(same).length === 1 ? list.find(same) : null);
  return hit ? `window.__ctl[${hit.i}]` : null;
};

// The control's value after the change, to show the gesture took.
export const findValue = (list, c) => { const at = findAt(list, c); if (!at) return null; const i = Number(at.match(/\d+/)[0]); const x = list.find((y) => y.i === i); return x ? x.value : null; };

// Round 2's two reads: at round 1's moment (the gesture's own wait, then 300 ms, about 1.1 s) and again 3 s after the gesture
// ended, for a page that redraws late.
export async function readTwice(look, before) {
  const t = Date.now();
  await pause(300); const d1 = lookDiff(before, look());
  await pause(Math.max(0, 3000 - (Date.now() - t))); return { d1, d3: lookDiff(before, look()) };
}
