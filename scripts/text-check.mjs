// E4: apply each text toolbar action in our editor to the first word of the paragraph the
// oracle probe used (demo section 2, block 2) and compare the HTML with
// parity/findings/TEXTOPS.json, and the five palette colors and the highlight with
// parity/findings/TEXTCOLOR.json. Writes parity/text-check.json.
// Usage: npm run text-check (dev server on 5178, FLUID_SURFACE a visible tab).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/TEXTOPS.json', import.meta.url)));
const C = JSON.parse(readFileSync(new URL('../parity/findings/TEXTCOLOR.json', import.meta.url)));
// Our button for each oracle action. Monospace and the styles go through the Text Style select.
const OURS = { 'Heading 1': ['style', 'h1'], 'Heading 2': ['style', 'h2'], 'Heading 3': ['style', 'h3'], 'Heading 4': ['style', 'h4'], 'Paragraph 1': ['style', 'p.sqsrte-large'],
  'Paragraph 3': ['style', 'p.sqsrte-small'], Monospace: ['style', 'pre'], Bold: ['bold'], Italic: ['italic'], Strike: ['strike'], Quote: ['quote'], 'Bullet List': ['bullet'],
  'Numbered List': ['numbered'], Indent: ['indent'], 'Scaled Text': ['scaled'], 'Align center': ['align:center'], 'Align right': ['align:right'], 'Align justify': ['align:justify'] };
// Text Color swatches (TEXTCOLOR.json) and Text Highlight.
const COLOR_KEYS = { Lightest: 'white', Light: 'lightAccent', Bright: 'accent', Dark: 'darkAccent', Darkest: 'black' };
const CASES = [...Object.entries(OURS).map(([name, [act, value]]) => [name, act, value, F[name]?.html]),
  ...Object.entries(COLOR_KEYS).map(([name, key]) => [`Color ${name}`, 'color', key, C.colors?.[name]?.html]),
  ['Highlight', 'highlight', null, C.highlight?.html]];
// Attribute noise that carries no formatting: the editor's pre-wrap and empty markers, and the
// highlight's random id.
const norm = (h) => h.replace(/ data-text-attribute-id="[^"]*"/g, ' data-text-attribute-id="id"').replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space: ?pre-wrap;?"/g, '').replace(/\s+/g, ' ').trim();

ensureVisible(S);
viewport(S, 1600, 945);
const results = [];
for (const [name, act, value, oracleHtml] of CASES) {
  const o = { html: oracleHtml };
  if (!o.html) { results.push({ name, ok: false, why: 'no oracle reading' }); continue; }
  goto(S, `${BASE}/index.html?replay`); await pause(1500);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, `${BASE}/index.html`); await pause(2200);
  const html = evalJs(S, `(() => { const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
    fe.edit(s.id, b.id);
    const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const t = ce.querySelector('p').firstChild;
    const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    ${act === 'style'
      ? `document.querySelector('#text-bar [data-fmt="style-menu"]').click(); document.querySelector('#text-bar [data-fmt="style"][data-v=${JSON.stringify(value)}]').click();`
      : act === 'color'
        ? `document.querySelector('#text-bar [data-fmt="color-menu"]').click(); document.querySelector('#text-bar input[data-fmt="color"][data-v=${JSON.stringify(value)}]').click();`
      : act.startsWith('align:')
        ? `document.querySelector('#text-bar [data-fmt="align-menu"]').click(); document.querySelector('#text-bar [data-fmt="${act}"]').click();`
        : `document.querySelector('#text-bar button[data-fmt="${act}"]').click();`}
    return JSON.stringify(ce.innerHTML); })()`);
  const ok = norm(html) === norm(o.html.replace(/…$/, ''));
  results.push({ name, ok });
  console.log(name.padEnd(14), ok ? 'match' : `DIFF\n  oracle ${norm(o.html).slice(0, 220)}\n  ours   ${norm(html).slice(0, 220)}`);
}
// The Custom tab and the look of quotes, lists and monospace (TEXTCOLOR.json, custom and look).
const openWord = `const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
  fe.edit(s.id, b.id);
  const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
  const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const t = ce.querySelector('p').firstChild;
  const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const bar = document.getElementById('text-bar'); const sleep = (ms) => new Promise((k) => setTimeout(k, ms));`;
const fresh = async () => { goto(S, `${BASE}/index.html?replay`); await pause(1500); evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`); goto(S, `${BASE}/index.html`); await pause(2200); };
await fresh();
const custom = evalJs(S, `(async () => { ${openWord}
  const out = {}; const style = () => ce.querySelector('span')?.getAttribute('style') || null; const q = (x) => bar.querySelector(x);
  q('[data-fmt="color-menu"]').click(); [...bar.querySelectorAll('[role=tab]')].find((e) => e.textContent === 'Custom').click();
  const box = q('.tx-colors').getBoundingClientRect(); const btn = q('[data-fmt="color-menu"]').getBoundingClientRect();
  out.size = [box.width, box.height]; out.below = box.top - btn.bottom; out.centre = Math.round(box.left + box.width / 2 - (btn.left + btn.width / 2)); out.start = q('input[aria-label="Hex"]').value;
  const at = (el, x, y) => { const R = el.getBoundingClientRect(); const o = { bubbles: true, clientX: R.left + x, clientY: R.top + y, pointerId: 1 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); document.dispatchEvent(new PointerEvent('pointerup', o)); };
  const type = (label, v) => { const e = q('input[aria-label="' + label + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); return e.value; };
  at(q('.tx-cmap'), 127, 120); out.map = style(); out.mapHex = q('input[aria-label="Hex"]').value; out.open = !!q('.tx-colors');
  at(q('.tx-chue'), 59.4, 11); out.hue = style(); // the oracle's click landed near 60: hue 84.47, on a rounding edge
  type('Hex', '#00ff00'); out.hex = style();
  type('Hex', '#f0a'); out.short = style();
  type('Hex', '#zzz'); out.bad = style();
  type('Hex', '00ff00'); out.noHash = style();
  out.alphaShows = type('Alpha', '25'); out.alpha = style();
  q('[data-fmt="color-menu"]').click(); q('[data-fmt="color-menu"]').click();
  out.reopen = [...bar.querySelectorAll('[role=tab][aria-selected="true"]')].map((e) => e.textContent).join(); out.reopenHex = q('input[aria-label="Hex"]').value;
  out.className = ce.querySelector('span')?.className;
  return JSON.stringify(out); })()`);
const wantCustom = { size: [254, 405], below: 6, centre: 0, start: '#000000', map: 'color: #804040;', mapHex: '#804040', open: true, hue: 'color: #668040;', hex: 'color: #00FF00;', short: 'color: #FF00AA;', bad: 'color: #FF00AA;', noHash: 'color: #FF00AA;', alphaShows: '25%', alpha: 'color: #FF00AA;', reopen: 'Custom', reopenHex: '#FF00AA', className: 'sqsrte-text-color--custom' };
for (const [k, v] of Object.entries(wantCustom)) {
  const ok = JSON.stringify(custom[k]) === JSON.stringify(v);
  results.push({ name: `Custom ${k}`, ok });
  if (!ok) console.log(`Custom ${k}`.padEnd(14), `DIFF oracle ${JSON.stringify(v)}, ours ${JSON.stringify(custom[k])}`);
}
const ACT = { quote: ['quote', { blockquote: 'blockquote', p: 'blockquote p' }], bullet: ['bullet', { ul: 'ul', li: 'ul li', p: 'ul li p', before: 'ul li p' }], numbered: ['numbered', { ol: 'ol', li: 'ol li', p: 'ol li p', before: 'ol li p' }], mono: ['style', { pre: 'pre', code: 'pre code' }] };
for (const [name, [act, parts]] of Object.entries(ACT)) {
  await fresh();
  const props = C.look[name];
  const got = evalJs(S, `(async () => { ${openWord}
    ${act === 'style' ? `bar.querySelector('[data-fmt="style-menu"]').click(); bar.querySelector('[data-fmt="style"][data-v="pre"]').click();` : `bar.querySelector('button[data-fmt="${act}"]').click();`}
    await sleep(100);
    const out = {}; const parts = ${JSON.stringify(parts)}, props = ${JSON.stringify(props)};
    for (const [k, sel] of Object.entries(parts)) { const c = W.getComputedStyle(ce.querySelector(sel), k === 'before' ? '::before' : undefined); out[k] = Object.fromEntries(Object.keys(props[k]).map((p) => [p, c[p]])); }
    return JSON.stringify(out); })()`);
  for (const [k, want] of Object.entries(props)) for (const [p, v] of Object.entries(want)) {
    const ok = got[k]?.[p] === v;
    results.push({ name: `Look ${name} ${k} ${p}`, ok });
    if (!ok) console.log(`Look ${name} ${k} ${p}`, `DIFF oracle ${v}, ours ${got[k]?.[p]}`);
  }
}

const pass = results.filter((r) => r.ok).length;
console.log(`Text toolbar: ${pass} of ${results.length} actions match`);
writeFileSync(new URL('../parity/text-check.json', import.meta.url), JSON.stringify({ check: 'text toolbar HTML', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
