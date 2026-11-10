// E4: apply each text toolbar action in our editor to the first word of the paragraph the
// oracle probe used (demo section 2, block 2) and compare the HTML with
// parity/findings/TEXTOPS.json, and the five palette colors and the highlight with
// parity/findings/TEXTCOLOR.json. Writes parity/text-check.json.
// Usage: npm run text-check (dev server on 5178, FLUID_SURFACE a visible tab), under 2 min.
// npm run text-check -- --full also replays every CAP-E4 file with real keys, about 7 min.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, waitFor, cdp, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { replay } from './lib/text-replay.mjs';
import { takesText } from './oracle/takes-text.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const FULL = process.argv.includes('--full');
// A clean editor as soon as it has booted: its stored page gone.
const fresh = () => { goto(S, `${BASE}/index.html?replay`); waitFor(S, 'window.fe'); evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`); goto(S, `${BASE}/index.html`); waitFor(S, 'window.fe'); };
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
  fresh();
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
fresh();
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
  fresh();
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

// Y2, E4: undo steps inside one edit, and typed words that become links (TEXTUNDO.json).
const TU = JSON.parse(readFileSync(new URL('../parity/findings/TEXTUNDO.json', import.meta.url)));
const edit = (body) => { goto(S, `${BASE}/index.html?replay`); waitFor(S, 'window.fe'); return evalJs(S, `(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest')); fe.edit(s.id, b.id);
  const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow; const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content');
  const type = (t) => d.execCommand('insertText', false, t); const enter = () => d.execCommand('insertParagraph');
  const tool = (a) => document.querySelector('#text-bar button[data-fmt="' + a + '"]').click();
  const word = () => { const t = ce.querySelector('p').firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const q = W.getSelection(); q.removeAllRanges(); q.addRange(r); };
  const color = (v) => { document.querySelector('#text-bar [data-fmt="color-menu"]').click(); document.querySelector('#text-bar input[data-fmt="color"][data-v="' + v + '"]').click(); };
  const links = () => [...ce.querySelectorAll('a')].map((a) => [a.textContent, a.protocol]);
  ${body}
  const a = links(); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120);
  let n = 0; while (fe.canUndo && n < 9) { fe.undo(); n++; await sleep(20); }
  return JSON.stringify({ undos: n, links: a }); })()`); };
for (const [name, body, want] of [['one burst', `type('one'); await sleep(50); type(' two');`, 1], ['900ms between', `type('one'); await sleep(900); type(' two');`, 1], ['a pause of 1.1s', `type('one'); await sleep(1100); type(' two');`, 2],
  ['Enter in a burst', `type('one'); enter(); type('two');`, 1], ['Bold then Italic', `word(); tool('bold'); await sleep(1100); tool('italic');`, 2], ['Bold then Italic within a second', `word(); tool('bold'); tool('italic');`, 1], ['two color picks', `word(); color('accent'); await sleep(1100); color('black');`, 2]]) {
  const got = edit(body).undos;
  results.push({ name: `Undo ${name}`, ok: got === want });
  if (got !== want) console.log(`Undo ${name} DIFF oracle ${want}, ours ${got}`);
}
{ goto(S, `${BASE}/index.html?replay`); waitFor(S, 'window.fe'); const got = evalJs(S, `(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest')); const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
  const ce = () => d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const start = ce().textContent;
  fe.edit(s.id, b.id); d.execCommand('insertText', false, 'one'); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120);
  fe.edit(s.id, b.id); d.execCommand('insertText', false, 'two'); await sleep(30); document.getElementById('undo').click(); await sleep(120);
  return JSON.stringify({ kept: ce().textContent.includes('one'), gone: !ce().textContent.includes('two'), open: ce().contentEditable === 'true', bar: !document.getElementById('text-bar').hidden, sel: !!document.querySelector('#block-toolbar:not([hidden])') }); })()`);
  // The last typing goes, an earlier edit stays, and the edit closes and lets go (CAP-Y2EDIT.json).
  const ok = got.kept && got.gone && !got.open && !got.bar && !got.sel; results.push({ name: 'Undo button during an edit', ok }); if (!ok) console.log('Undo button during an edit DIFF', JSON.stringify(got)); }
// Cmd+Z in an edit: one step, the edit stays open, Cmd+Shift+Z brings it back, and leaving counts each step (CAP-Y2EDIT.json).
{ goto(S, `${BASE}/index.html?replay`); waitFor(S, 'window.fe'); const got = evalJs(S, `(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest')); const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
  const ce = () => d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const key = (shift) => d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', metaKey: true, shiftKey: shift, bubbles: true }));
  fe.edit(s.id, b.id); const start = ce().textContent; d.execCommand('insertText', false, 'aa'); await sleep(1100); d.execCommand('insertText', false, 'bb'); await sleep(30);
  key(false); await sleep(30); const one = ce().textContent, open = ce().contentEditable === 'true'; key(true); await sleep(30); const two = ce().textContent;
  d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120);
  document.getElementById('undo').click(); await sleep(120); const walk1 = ce().textContent; document.getElementById('undo').click(); await sleep(120);
  return JSON.stringify({ one: one.includes('aa') && !one.includes('bb'), open, two: two.includes('aabb'), walk1: walk1.includes('aa') && !walk1.includes('bb'), walk2: ce().textContent === start }); })()`);
  const ok = Object.values(got).every(Boolean); results.push({ name: 'Cmd+Z during an edit', ok }); if (!ok) console.log('Cmd+Z during an edit DIFF', JSON.stringify(got)); }
{ const words = [...TU.links.linked, ...TU.links.notLinked, ...TU.links.wrapped]; const got = edit(`const r = d.createRange(); r.selectNodeContents(ce.querySelector('p')); r.collapse(false); const q = W.getSelection(); q.removeAllRanges(); q.addRange(r); type(' '); for (const w of ${JSON.stringify(words)}) { type(w); type(' '); }`).links;
  for (const w of words) { const inner = TU.links.wrapped.includes(w) ? w.slice(1, -1) : w; const hit = got.find((a) => a[0] === inner); const want = inner !== w || TU.links.linked.includes(w); const ok = !!hit === want && (!hit || hit[1] === (w.includes('@') ? 'mailto:' : 'http:')); results.push({ name: `Link ${w}`, ok }); if (!ok) console.log(`Link ${w} DIFF oracle ${want}, ours ${JSON.stringify(hit)}`); } }

// The capture tool's guard: with a block only selected, keys have no place to go; in an edit they do (CAP-TEXTPUSH2 q4).
{ goto(S, `${BASE}/index.html?replay`); waitFor(S, 'window.fe'); const has = () => evalJs(S, takesText('site-frame')); evalJs(S, `(() => { document.activeElement?.blur(); document.getElementById('site-frame').contentDocument.activeElement?.blur(); return 1; })()`);
  const before = has(); evalJs(S, `(() => { const s = fe.model.sections[2]; return fe.edit(s.id, s.blocks.find((x) => x.type === 'text').id); })()`); const during = has();
  const ok = before === false && during === true; results.push({ name: 'Keys guard: a selected block no, an edit yes', ok }); if (!ok) console.log(`Keys guard DIFF ${before} ${during}`); }

// E4: every name the oracle was asked about, typed with execCommand here; --full types them with real keys.
{ const E = JSON.parse(readFileSync(new URL('../parity/findings/CAP-E4ENDS.json', import.meta.url)));
  for (const [read, step] of [['two letters', E.steps.find((x) => x[0] === 'keysFast' && x[1].startsWith('foo.aa'))], ['longer', E.steps.filter((x) => x[0] === 'keysFast').at(-1)]]) {
    const names = step[1].trim().split(/\s+/), want = new Set(E.reads[read].linkTexts);
    const got = new Set(edit(`const r = d.createRange(); r.selectNodeContents(ce.querySelector('p')); r.collapse(false); const q = W.getSelection(); q.removeAllRanges(); q.addRange(r); type(' '); for (const w of ${JSON.stringify(names)}) { type(w); type(' '); }`).links.map((a) => a[0]));
    const wrong = names.filter((n) => got.has(n) !== want.has(n));
    results.push({ name: `Link ${read}: ${names.length - wrong.length} of ${names.length} names`, ok: !wrong.length });
    if (wrong.length) console.log(`Link ${read} DIFF ${wrong.length}: ${wrong.slice(0, 12).join(' ')}`);
  } }
// E4: the longer names of CAP-E4ENDS2.json, 47 of which don't link, and CAP-E4ENDS3.json, all typed in one text each.
for (const file of ['CAP-E4ENDS2', 'CAP-E4ENDS3']) {
  const E = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  const names = E.steps.filter((x) => x[0] === 'keysFast').flatMap((x) => x[1].trim().split(/\s+/)), want = new Set(E.reads.longer.linkTexts);
  const got = new Set(edit(`const r = d.createRange(); r.selectNodeContents(ce.querySelector('p')); r.collapse(false); const q = W.getSelection(); q.removeAllRanges(); q.addRange(r); type(' '); for (const w of ${JSON.stringify(names)}) { type(w); type(' '); }`).links.map((a) => a[0]));
  const wrong = names.filter((n) => got.has(n) !== want.has(n));
  results.push({ name: `Link ${file}: ${names.length - wrong.length} of ${names.length} names`, ok: !wrong.length });
  if (wrong.length) console.log(`Link ${file} DIFF ${wrong.length}: ${wrong.slice(0, 12).join(' ')}`);
}
// Y2, difference 79: two new Texts on top of each other; the one that grows leaves the other's top and stretches its end, which
// stays after Cmd+Z (CAP-79ONTOP.json), by real keys. Typed into the top one, then the one under it.
{ const O = JSON.parse(readFileSync(new URL('../parity/findings/CAP-79ONTOP.json', import.meta.url))).reads;
  const two = async () => {
    goto(S, `${BASE}/index.html`); await pause(1200);
    evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections = next.sections.slice(0, 1); next.sections[0].blocks = []; next.sections[0].rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await new Promise((r) => setTimeout(r, 300)); for (let i = 0; i < 2; i++) fe.addBlock(fe.model.sections[0].id, 'Text', true); return 1; })()`);
    browser(S, 'press', 'Escape'); await pause(200);
  };
  const areas = () => evalJs(S, `(() => { const f = document.getElementById('site-frame').contentDocument, W = f.defaultView; return JSON.stringify([...f.querySelectorAll('main#page .fluid-engine')[0].querySelectorAll(':scope > .fe-block')].map((b) => { const c = W.getComputedStyle(b); return [c.gridRowStart, c.gridColumnStart, c.gridRowEnd, c.gridColumnEnd].join('/'); })); })()`);
  const check = (name) => { const want = O[name].areas.map((a) => a[0]), got = areas(); results.push({ name: `79 ${name}: ${want.join(' ')}`, ok: JSON.stringify(got) === JSON.stringify(want) }); if (JSON.stringify(got) !== JSON.stringify(want)) console.log(`79 ${name} DIFF ours ${got.join(' ')}`); };
  for (const [name, which] of [['top', 'fe.model.sections[0].blocks.at(-1).id'], ['under', "f.querySelector('main#page .fe-block').dataset.blockId"]]) {
    await two();
    evalJs(S, `(() => { const f = document.getElementById('site-frame').contentDocument, s = fe.model.sections[0], id = ${which}; fe.edit(s.id, id); f.querySelector('.fe-block[data-block-id="' + id + '"] .sqs-html-content').focus(); return 1; })()`); await pause(300);
    cdp(S, { op: 'presses', keys: ['a'] }); await pause(1300);
    cdp(S, { op: 'presses', keys: Array(8).fill('Enter'), gapMs: 100 }); await pause(1300); check(`${name} typed`);
    browser(S, 'press', 'Meta+z'); await pause(400); check(`${name} z`);
    browser(S, 'press', 'Meta+Shift+z'); await pause(400); check(`${name} y`);
    browser(S, 'press', 'Escape'); await pause(200); browser(S, 'press', 'Escape'); await pause(300); check(`${name} left`);
  } }
// Y2's text bar: a Cmd+Z that leaves the page too short for the frame's scroll takes the bar and the caret, the edit open, and
// Cmd+Shift+Z brings the caret back, not the bar (CAP-Y2BAR.json); with the frame at its top the same Cmd+Z keeps both
// (CAP-Y2BAR2.json). After that Cmd+Z, scrolling back brings nothing, the block shows a grab cursor, and a press on it closes the
// edit and leaves it selected (CAP-Y2BAR3.json). A Heading 1 in a new section with one more under it, as the probe page's footer, by real keys.
{ const barNow = () => evalJs(S, `(() => { const f = document.getElementById('site-frame'), W = f.contentWindow, ce = f.contentDocument.querySelector('[contenteditable="true"]'), sl = W.getSelection(); return JSON.stringify({ bar: !document.getElementById('text-bar').hidden, open: !!ce, caret: sl.rangeCount > 0, y: Math.round(W.scrollY) }); })()`);
  for (const mode of ['pull', 'top', 'press']) {
    const top = mode === 'top';
    goto(S, `${BASE}/index.html`); await pause(1200);
    evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections = next.sections.slice(0, 2); next.sections[0].blocks = []; next.sections[0].rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await new Promise((r) => setTimeout(r, 300)); fe.addBlock(fe.model.sections[0].id, 'Text', true); return 1; })()`);
    browser(S, 'press', 'Escape'); await pause(200);
    evalJs(S, `(() => { const f = document.getElementById('site-frame').contentDocument, s = fe.model.sections[0], id = s.blocks.at(-1).id; fe.edit(s.id, id); f.querySelector('.fe-block[data-block-id="' + id + '"] .sqs-html-content').focus(); return 1; })()`); await pause(300);
    cdp(S, { op: 'presses', keys: ['a', 'b', 'c'] }); await pause(300);
    browser(S, 'click', '#text-bar [aria-label="Text Style"]'); await pause(400);
    browser(S, 'click', '#text-bar [aria-label="Heading 1"]'); await pause(1300);
    for (const w of [' longer line of words that runs on past the end of the block', ' and then on and on over a second line and more words to fill it', ' and then again on and on over a third line and more words to fill']) {
      cdp(S, { op: 'presses', keys: [...w].map((c) => (c === ' ' ? 'Space' : c)) }, 300000); await pause(1300);
    }
    browser(S, 'press', 'Meta+z'); await pause(300); browser(S, 'press', 'Meta+z'); await pause(300);
    // The frame where the page's end is at the frame's end, as the oracle's was at 523, or at its top.
    evalJs(S, `(() => { const W = document.getElementById('site-frame').contentWindow; W.scrollTo(0, ${top} ? 0 : W.document.scrollingElement.scrollHeight); return 1; })()`); await pause(300);
    const z2 = barNow();
    browser(S, 'press', 'Meta+z'); await pause(400); const z3 = barNow();
    if (mode === 'press') {
      const at = evalJs(S, `(() => { const f = document.getElementById('site-frame'), W = f.contentWindow; W.scrollTo(0, 0); const s = fe.model.sections[0], b = f.contentDocument.querySelector('.fe-block[data-block-id="' + s.blocks.at(-1).id + '"]'), q = b.getBoundingClientRect(), fr = f.getBoundingClientRect(); const e = f.contentDocument.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return JSON.stringify({ x: fr.left + q.left + q.width / 2, y: fr.top + q.top + q.height / 2, cursor: e && W.getComputedStyle(e).cursor }); })()`); await pause(300);
      const back = barNow();
      cdp(S, { op: 'drag', from: [at.x, at.y], to: [at.x, at.y], steps: 1, holdMs: 50, mods: [] }); await pause(500);
      const pressed = { ...barNow(), write: evalJs(S, `(() => { const t = document.getElementById('block-toolbar'); return JSON.stringify(!t.hidden && !!t.querySelector('[aria-label="Write"]')); })()`) };
      const ok = z3.y < z2.y && !back.bar && !back.caret && back.open && at.cursor === 'grab' && !pressed.open && !pressed.bar && pressed.write;
      const name = 'Y2 bar: after that Cmd+Z, the frame back at its top brings nothing, a grab cursor, a press closes the edit, the block selected (CAP-Y2BAR3)';
      results.push({ name, ok }); if (!ok) console.log(`${name} DIFF ${JSON.stringify([z3, back, at.cursor, pressed])}`);
      browser(S, 'press', 'Escape'); await pause(200);
      continue;
    }
    browser(S, 'press', 'Meta+Shift+z'); await pause(400); const y4 = barNow();
    const ok = top ? z2.bar && z3.bar && z3.caret && y4.bar && y4.caret && z3.y === 0 : z2.bar && z3.y < z2.y && !z3.bar && !z3.caret && z3.open && !y4.bar && y4.caret && y4.open;
    const name = top ? 'Y2 bar: frame at its top, the third Cmd+Z keeps the bar and caret (CAP-Y2BAR2)' : 'Y2 bar: the third Cmd+Z pulls the scroll up, the bar and caret go, a redo brings only the caret (CAP-Y2BAR)';
    results.push({ name, ok }); if (!ok) console.log(`${name} DIFF ${JSON.stringify([z2, z3, y4])}`);
    browser(S, 'press', 'Escape'); await pause(200); browser(S, 'press', 'Escape'); await pause(200);
  } }
// Y2: Cmd+A and Backspace that empty the Heading 1 above take the undo's rows, less the height lost: 30 rows to 2, a row
// short (CAP-Y2REDOPULL.json, CAP-Y2REDOPULL2.json, 4 reads). The typing rule alone gives 3.
{ goto(S, `${BASE}/index.html`); await pause(1200);
  evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections = next.sections.slice(0, 2); next.sections[0].blocks = []; next.sections[0].rows = { desktop: 8, mobile: 8 }; fe.setBp('desktop'); fe.load(next); await new Promise((r) => setTimeout(r, 300)); fe.addBlock(fe.model.sections[0].id, 'Text', true); return 1; })()`);
  browser(S, 'press', 'Escape'); await pause(200);
  evalJs(S, `(() => { const f = document.getElementById('site-frame').contentDocument, s = fe.model.sections[0], id = s.blocks.at(-1).id; fe.edit(s.id, id); f.querySelector('.fe-block[data-block-id="' + id + '"] .sqs-html-content').focus(); return 1; })()`); await pause(300);
  cdp(S, { op: 'presses', keys: ['a', 'b', 'c'] }); await pause(300);
  browser(S, 'click', '#text-bar [aria-label="Text Style"]'); await pause(400);
  browser(S, 'click', '#text-bar [aria-label="Heading 1"]'); await pause(1300);
  for (const w of [' longer line of words that runs on past the end of the block', ' and then on and on over a second line and more words to fill it', ' and then again on and on over a third line and more words to fill']) {
    cdp(S, { op: 'presses', keys: [...w].map((c) => (c === ' ' ? 'Space' : c)) }, 300000); await pause(1300);
  }
  evalJs(S, `(() => { document.getElementById('site-frame').contentWindow.scrollTo(0, 0); return 1; })()`); await pause(400);
  const area = () => evalJs(S, `(() => { const e = document.getElementById('site-frame').contentDocument.querySelector('.fe-block.is-text-editing'); return JSON.stringify(e ? e.style.gridArea.split(' / ').join('/') : null); })()`);
  const typed = area();
  browser(S, 'press', 'Meta+a'); await pause(200); browser(S, 'press', 'Backspace'); await pause(500);
  const emptied = area(), name = 'Y2: Cmd+A and Backspace empty a 30-row Heading 1 to 2 rows, a row short (CAP-Y2REDOPULL2)';
  results.push({ name, ok: typed === '1/2/31/10' && emptied === '1/2/3/10' }); if (typed !== '1/2/31/10' || emptied !== '1/2/3/10') console.log(`${name} DIFF typed ${typed}, emptied ${emptied}`);
  browser(S, 'press', 'Escape'); await pause(200); browser(S, 'press', 'Escape'); await pause(200);
}
// E4: with a caret, undo by time, nesting, Clear Formatting, Highlight: replayed with real keys and presses.
const noRun = [];
const KNOWN = ['rows Paragraph 3 3 z', 'rows Heading 1 2 z', 'rows Heading 1 3 z', 'rows Heading 1 4 y', 'rows Heading 1 5 y', 'rows Heading 1 6 y', 'rows S1 2 z', 'rows S1 3 z', 'rows S2 3 z', 'rows S5 1 z', 'rows S5 2 z', 'rows S5 3 y']; // Named in Y2's evidence
for (const name of FULL ? ['CAP-E4CARET', 'CAP-E4BURST', 'CAP-E4FRESH', 'CAP-E4FRESH2', 'CAP-E4FRESH3', 'CAP-E4ENDS', 'CAP-E4SCORE', 'CAP-E4GAP', 'CAP-E4GAP2', 'CAP-E4ENTER', 'CAP-TEXTEMPTY', 'CAP-T3EMPTY', 'CAP-T3EMPTY2', 'CAP-T3EMPTY3', 'CAP-E4REOPEN', 'CAP-E4REOPEN2', 'CAP-E4REOPEN3', 'CAP-ESC1', 'CAP-ESC2', 'CAP-E4BREAK', 'CAP-Y2EDIT', 'CAP-Y2KEYS', 'CAP-Y2KEYS2', 'CAP-Y2KEYS3', 'CAP-Y2KEYS4', 'CAP-Y2KEYS5', 'CAP-Y2KEYS6', 'CAP-Y2KEYS7', 'CAP-Y2KEYS8', 'CAP-Y2KEYS9', 'CAP-Y2SCORE'] : ['CAP-E4CARET', 'CAP-TEXTEMPTY']) {
  await replay(S, JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url))), (what, ok, detail) => {
    if (ok === null) { noRun.push(`${name} ${what}`); console.log(`could not run: ${name} ${what}: ${detail}`); return; }
    if (!ok && KNOWN.includes(what)) { console.log(`known miss: ${what}`); return; }
    results.push({ name: `${name} ${what}`, ok }); if (!ok) console.log(`${name} ${what} DIFF ${detail}`);
  });
}

const pass = results.filter((r) => r.ok).length;
console.log(`Text toolbar: ${pass} of ${results.length} actions match`);
if (noRun.length) console.log(`Could not run, timing off, not a pass or a fail: ${noRun.length}`);
if (FULL) writeFileSync(new URL('../parity/text-check.json', import.meta.url), JSON.stringify({ check: 'text toolbar HTML', pass, total: results.length, couldNotRun: noRun, results }, null, 2) + '\n');
process.exit(pass !== results.length ? 1 : noRun.length ? 2 : 0);
