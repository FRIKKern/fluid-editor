// T10: folding in the Code and Markdown editors, against what the oracle's did (parity/findings/CAP-T10FOLD*.json): which
// lines take a chevron in each Mode, what a fold shows, the numbers it skips, and what keys and presses do beside it.
// Keys and presses are real input.
// Usage: FLUID_SURFACE=cdp:<port> npm run fold-check. About a minute.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, browser, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { foldRanges } from '../app/src/code-fold.js';

if (!process.env.FLUID_SURFACE) throw new Error('set FLUID_SURFACE');
const S = process.env.FLUID_SURFACE;
const read = (name) => JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
const F = read('CAP-T10FOLD'), F3 = read('CAP-T10FOLD3'), F5 = read('CAP-T10FOLD5'), F6 = read('CAP-T10FOLD6'), F7 = read('CAP-T10FOLD7'), F8 = read('CAP-T10FOLD8');
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(44)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const norm = (s) => String(s).replace(/\s+/g, ' ').replace(/> </g, '><').trim();

// ---- Which lines take a chevron: every shape read, by the rule alone.
const LANG = { html: 'html', css: 'css', js: 'javascript' };
const FOLD_LINE = (r) => (r.panelCss || []).filter((e) => e.label === 'Fold line');
const numsOf = (r) => { const all = (r.panelCss || []).filter((e) => (e.cls || '').includes('gutterElement') && /^\d+$/.test(e.text) && e.box[3] > 0); return all.slice(all.map((e) => e.text).lastIndexOf('1')); };
for (const [file, names] of [[F6, Object.keys(F6.reads).filter((k) => !/folded|html|css|js|plain/.test(k))], [F7, ['html chevrons', 'css chevrons', 'js chevrons']], [F8, ['js chevrons']]]) {
  for (const k of names) {
    const r = file.reads[k], lang = LANG[k.split(' ')[0]] || 'markdown', col = numsOf(r);
    const want = FOLD_LINE(r).map((c) => col.find((e) => Math.abs(e.box[1] + 3 - c.box[1]) < 3)?.text).filter(Boolean).map(Number);
    const got = [...foldRanges(r.codeText, lang).keys()].map((n) => n + 1).sort((a, b) => a - b);
    add(`Chevrons: ${k}`, got.join() === want.join(), `want ${want} got ${got}`);
  }
}

// ---- In the editor.
ensureVisible(S);
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1200);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(2000);

const FIELD = '#block-panel .bp-code.is-look textarea';
const fresh = async (type) => {
  const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 16, mobile: 16 }; fe.setBp('desktop'); fe.load(next); await sleep(200); fe.addBlock(s.id, '${type}'); await sleep(300); const b = fe.model.sections[1].blocks.at(-1); fe.select(fe.model.sections[1].id, b.id); await sleep(150); const P = document.getElementById('block-panel'); if (P.hidden || !P.querySelector('textarea[data-content]')) { document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(200); } return JSON.stringify(b.id); })()`);
  await pause(150);
  return id;
};
const setCode = async (text, field = FIELD) => { evalJs(S, `(() => { const t = document.querySelector(${JSON.stringify(field)}); t.focus(); t.select(); ${text ? `document.execCommand('insertText', false, ${JSON.stringify(text)})` : `document.execCommand('delete')`}; return 'true'; })()`); await pause(120); };
const boxOf = (q, n = 0) => evalJs(S, `(() => { const e = document.querySelectorAll(${JSON.stringify(q)})[${n}]; if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height]); })()`);
const press = async (q, n = 0) => { const b = boxOf(q, n); if (!b) throw new Error(`nothing at ${q} ${n}`); drag(S, [b[0] + b[2] / 2, b[1] + b[3] / 2], [b[0] + b[2] / 2, b[1] + b[3] / 2], { steps: 1, holdMs: 30 }); await pause(220); };
const key = async (k) => { browser(S, 'press', k); await pause(90); };
const CHEV = '#block-panel .bp-code-chev[title="Fold line"]', ROW = '#block-panel .bp-code-l', PH = '#block-panel .bp-code-ph';
const shown = (root = '#block-panel') => evalJs(S, `(() => { const B = document.querySelector('${root} .bp-code.is-look'); return JSON.stringify({ text: [...B.querySelectorAll('.bp-code-l')].map((l) => l.textContent).join('\\n'), nums: [...B.querySelectorAll('.bp-code-n')].map((n) => n.firstChild.textContent), chev: [...B.querySelectorAll('.bp-code-chev')].map((c) => c.title + ' ' + c.parentElement.firstChild.textContent), on: [...B.querySelectorAll('.bp-code-n.is-on')].map((n) => n.firstChild.textContent), band: !B.querySelector('.bp-code-band').hidden, sels: [...B.querySelectorAll('.bp-code-sel div')].map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }), ph: [...B.querySelectorAll('.bp-code-ph')].map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }), first: (() => { const q = B.querySelector('.bp-code-n').getBoundingClientRect(); return [q.left, q.top]; })() }); })()`);
const blockHtml = (id) => evalJs(S, `(() => { const e = document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="${id}"] .sqs-block-markdown .sqs-block-content'); return JSON.stringify(e ? e.innerHTML : null); })()`);
const near = (a, b, d = 0.6) => Math.abs(a - b) <= d;
// One oracle read against ours now: the text with its placeholder, the numbers, the line marked as the caret's, the block.
function compare(name, r, id) {
  const P = r.panelCss || [], now = shown();
  const want = (P.filter((e) => (e.cls || '').includes('gutterElement') && /^\d+$/.test(e.text) && e.box[3] > 0)).map((e) => e.text);
  add(`${name}: text`, now.text === r.codeText, `want ${JSON.stringify(r.codeText)} got ${JSON.stringify(now.text)}`);
  add(`${name}: numbers`, now.nums.join() === want.join(), `want ${want} got ${now.nums}`);
  const on = P.filter((e) => (e.cls || '').includes('activeLineGutter')).map((e) => e.text);
  if (P.some((e) => (e.cls || '').includes('activeLine'))) add(`${name}: caret's line`, now.on.join() === on.join() && now.band === !!on.length, `want ${on} got ${now.on} band ${now.band}`);
  else if (on.length) add(`${name}: caret's line`, now.on.join() === on.join(), `want ${on} got ${now.on}`);
  if (r.htmlOf !== undefined && id) add(`${name}: block`, norm(blockHtml(id)) === norm(r.htmlOf), `want ${r.htmlOf} got ${blockHtml(id)}`);
}
const T = '# a\nb\nc\n# d';
const start = async (text = T) => { await setCode(''); await setCode(text); await press(CHEV); };
const home3 = async () => { await press(ROW); await key('Home'); for (let i = 0; i < 3; i++) await key('ArrowRight'); };

const md = await fresh('Markdown');
await start(); await key('Z'); await pause(150); compare('Chevron, then a key', F5.reads['chevron then a key'], md);
await start(); await press(ROW); compare('Click right of it', F5.reads['click right of the fold'], md); await key('Z'); await pause(150); compare('Click right, key', F5.reads['click right, key'], md);
await start(); await home3(); compare('Caret before it', F5.reads['caret before the fold'], md); await key('Z'); await pause(150); compare('Key before it', F5.reads['key before the fold'], md);
await start(); await home3(); await key('ArrowRight'); await key('Z'); await pause(150); compare('One right, key', F5.reads['one right, key'], md);
await start(); await home3(); await key('Enter'); await pause(150); compare('Enter before it', F5.reads['enter before the fold'], md);
await start(); await home3(); await key('Delete'); await pause(150); compare('Delete before it', F5.reads['delete before the fold'], md);
await start(); await home3(); await key('ArrowRight'); await key('Backspace'); await pause(150); compare('In, then Backspace', F5.reads['backspace after the fold'], md);
await start(); await press(ROW, 1); await key('Home'); await key('Backspace'); await pause(150); compare('Backspace on the next line', F5.reads['backspace on the next line'], md);
await start(); await press(ROW, 1); await key('Home'); await key('ArrowUp'); await key('Z'); await pause(150); compare('Up from below, key', F5.reads['up from below, key'], md);
await start(); await press(ROW); await key('Backspace'); await pause(150); compare('Backspace right of it', F7.reads['backspace right of a fold'], md);
await start(); await press(ROW); await key('ArrowLeft'); await key('Z'); await pause(150); compare('Left from right of it, key', F7.reads['left from right of a fold, key'], md);
await start(); await press(ROW); await key('Home'); await key('End'); await key('Z'); await pause(150); compare('Home, End, key', F7.reads['home, end, key'], md);
await start(); await home3(); await key('Shift+ArrowRight'); await pause(150); compare('Shift right at it', F7.reads['shift right at a fold'], md);
await start(); await press(ROW, 1); await key('Home'); await key('Shift+ArrowUp'); await pause(150); compare('Shift up over it', F7.reads['shift up over a fold'], md);
// Selections go round the placeholder.
const pieces = (r) => (r.panelCss || []).filter((e) => (e.cls || '').includes('selectionBackground')).map((e) => e.box);
{
  const q = pieces(F5.reads['selection over a fold']);
  await start(); await press(ROW); await key('Home'); await key('Shift+ArrowDown'); await pause(150);
  const now = shown(), got = now.sels.filter((s) => s[2] > 0.01);
  compare('Selection over it', F5.reads['selection over a fold'], md);
  add('Selection: leaves the placeholder', got.length === q.length && near(got[0][2], q[0][2]) && near(got[1][0] - got[0][0], q[1][0] - q[0][0]) && near(got[1][1], got[0][1]) && near(got[0][3], q[0][3]) && near(got[0][1] - now.ph[0][1], q[0][1] - 425), `want ${JSON.stringify(q)} got ${JSON.stringify(got)}`);
  await key('Backspace'); await pause(150); compare('Selection deleted', F5.reads['selection over a fold deleted'], md);
}
{
  const q = pieces(F5.reads['all, folded, with focus']);
  await start(); await press(ROW); await key('Meta+a'); await pause(150);
  const got = shown().sels.filter((s) => s[2] > 0.01);
  got.sort((x, y) => x[1] - y[1] || x[0] - y[0]);
  add('All: three pieces', got.length === q.length && got.every((p, i) => near(p[0] - got[0][0], q[i][0] - q[0][0]) && near(p[1] - got[0][1], q[i][1] - q[0][1]) && near(p[3], q[i][3])) && near(got[2][2], q[2][2]), `want ${JSON.stringify(q)} got ${JSON.stringify(got)}`);
}
{
  await start(); await press(ROW); await key('Home'); await key('Shift+ArrowDown'); await pause(150);
  await press('#block-panel .bp-md-bar [aria-label="Quote"]'); await pause(200);
  compare('Quote over it', F5.reads['quote over a fold'], md);
}
await start(); await press(ROW, 1); await key('Q'); await pause(150); compare('Key below it', F5.reads['key below a fold'], md); await key('Meta+z'); await pause(200); compare('Meta+z below it', F5.reads['key undo below a fold'], md);
// A toolbar press over a fold, then Meta+z: the text back, the fold still shut (CAP-T10FOLD5.json, CAP-T10FIX3.json).
await start(); await press(ROW); await key('Meta+a'); await pause(100);
evalJs(S, `(() => { document.querySelector('#block-panel .bp-md-bar [aria-label="Bold"]').click(); return 'true'; })()`); await pause(200);
const overFold = evalJs(S, `(() => { const f = document.querySelector('${FIELD}'); return JSON.stringify(f.value); })()`);
await key('Meta+z'); await pause(250);
const backFold = evalJs(S, `(() => { const f = document.querySelector('${FIELD}'); return JSON.stringify({ v: f.value, text: fe.model.sections[1].blocks.at(-1).text, marked: document.querySelectorAll('#block-panel .bp-code .c-fold, #block-panel .bp-code [data-fold-open]').length }); })()`);
add('Toolbar over a fold, Meta+z: the fold stays', backFold.v !== T && backFold.v.split('\n').length < T.split('\n').length && !backFold.v.includes('**') && overFold.includes('**'), JSON.stringify([overFold, backFold]));
// A deleted fold comes back as open text with Meta+z, nothing lost.
await start(); await press(ROW); await key('Meta+a'); await key('Backspace'); await pause(150); await key('Meta+z'); await pause(200);
add('Meta+z brings back hidden lines', evalJs(S, `(() => JSON.stringify(fe.model.sections[1].blocks.at(-1).text))()`) === T, evalJs(S, `(() => JSON.stringify(fe.model.sections[1].blocks.at(-1).text))()`));
// Over the caret, and the placeholder's press.
await setCode(''); await setCode(T); await press(ROW, 1); compare('Caret on a line to hide', F7.reads['caret on b'], md); await press(CHEV); compare('Folded over the caret', F7.reads['folded over the caret'], md); await press(PH); compare('Placeholder opens it', F7.reads['open again, caret'], md);
await setCode(''); await setCode(T); await press(ROW, 1); await press(CHEV); await press(ROW, 1); await key('Q'); await pause(150); compare('Then a key below', F7.reads['after that, key below'], md);
// Nesting (CAP-T10FOLD3.json).
{
  const N = '# a\n## b\nc\n## d\ne\n# f';
  await setCode(''); await setCode(N); await press(CHEV, 1);
  let now = shown(); add('Inner fold', now.text === '# a\n## b…\n## d\ne\n# f' && now.nums.join() === '1,2,4,5,6', JSON.stringify(now));
  await press(CHEV, 0); now = shown(); add('Outer over it', now.text === '# a…\n# f' && now.nums.join() === '1,6', JSON.stringify(now));
  await press(PH); now = shown(); add('Outer opened, inner stays', now.text === '# a\n## b…\n## d\ne\n# f', JSON.stringify(now));
}
// The look: a chevron and a placeholder (CAP-T10FOLD3.json, CAP-T10FOLD.json).
{
  await start();
  const r = F.reads['folded first'].panelCss, ph = r.find((e) => e.label === 'folded code') ?? F3.reads['para2 folded'].panelCss.find((e) => e.label === 'folded code');
  const want = F3.reads['para2 folded'].panelCss.find((e) => e.label === 'folded code');
  const look = evalJs(S, `(() => { const e = document.querySelector('${PH}'), c = getComputedStyle(e), q = e.getBoundingClientRect(), n = document.querySelector('#block-panel .bp-code-n').getBoundingClientRect(), v = document.querySelector('#block-panel .bp-code-chev'), w = getComputedStyle(v), x = v.getBoundingClientRect(); return JSON.stringify({ w: q.width, h: q.height, dx: q.left - n.left, dy: q.top - n.top, bg: c.backgroundColor, color: c.color, title: e.title, cur: c.cursor, cw: x.width, ch: x.height, cdy: x.top - n.top, ccolor: w.color, ccur: w.cursor, cside: x.left - n.left, ctext: v.textContent, ctitle: v.title }); })()`);
  add('Placeholder: size', near(look.w, ph.box[2]) && near(look.h, ph.box[3]), JSON.stringify(look));
  add('Placeholder: colours, name', look.bg === want.bg && look.color === want.color && look.title === want.label && look.cur === 'pointer', JSON.stringify(look));
  add('Placeholder: beside `# a`', near(look.dx, 428.7 - 365) && near(look.dy, 425 - 423), JSON.stringify(look));
  add('Chevron: size, colour', near(look.cw, 10.4) && near(look.ch, 16) && look.ccolor === 'rgb(102, 102, 102)' && look.ccur === 'pointer' && near(look.cdy, 3), JSON.stringify(look));
  add('Chevron: names', look.ctext === '›' && look.ctitle === 'Unfold line', JSON.stringify(look));
}
// The clear mark in the field holds the placeholder's place, so what follows a fold lines up with its caret.
{
  await setCode(''); await setCode('a {\n}'); evalJs(S, `(() => { const m = document.querySelector('#block-panel'); return 'true'; })()`);
  const w = evalJs(S, `(() => { const f = document.querySelector('${FIELD}'), c = getComputedStyle(f), e = document.createElement('span'); e.style.cssText = 'position:absolute;white-space:pre;font:' + c.font; e.textContent = '\u3000'; document.body.append(e); const w = e.getBoundingClientRect().width; e.remove(); return String(w); })()`);
  add('The mark is as wide as the placeholder', Math.abs(Number(w) - 14.4) < 1, `${w}`);
}
// The view has folds of its own, and new text in it opens the panel's (CAP-T10FOLD3.json, CAP-T10FOLD5.json).
{
  await start();
  await press('#block-panel [data-code-expand]'); await pause(250);
  const view = shown('#code-modal'); add('The view starts open', view.text === T && view.chev.length === 2, JSON.stringify(view));
  await press('#code-modal .code-modal-box [data-code-modal="close"]'); await pause(250);
  add('Back in the panel, still folded', shown().text === '# a…\n# d', JSON.stringify(shown()));
  await press('#block-panel [data-code-expand]'); await pause(250);
  await setCode(`${T}\nq`, '#code-modal textarea'); await press('#code-modal .bp-code-chev[title="Fold line"]'); await pause(120);
  add('Folded in the view', shown('#code-modal').text === F5.reads['view folded'].codeText, JSON.stringify(shown('#code-modal')));
  await press('#code-modal .code-modal-box [data-code-modal="close"]'); await pause(250);
  compare('New text from the view opens it', F5.reads['after view, new text'], md);
}
// Closing the panel drops folds; the block never changes for one.
{
  await start();
  const before = norm(blockHtml(md));
  add('A fold leaves the block alone', before === '<h1>a</h1><p>b c</p><h1>d</h1>', before);
  await key('Escape'); await pause(300);
  evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const P = document.getElementById('block-panel'); if (!P.hidden) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(200); } fe.select(null); await sleep(150); const s = fe.model.sections[1], b = s.blocks.at(-1); fe.select(s.id, b.id); await sleep(150); document.querySelector('#block-toolbar button[data-tb="edit"]').click(); await sleep(200); return 'true'; })()`); await pause(300);
  add('Reopened panel: no fold', shown().text === T, JSON.stringify(shown()));
}
// Each Mode. A Code block's Mode is set in its panel; a press on the placeholder reopens between folds.
const code = await fresh('Code');
const setMode = async (v) => { evalJs(S, `(() => { const m = document.querySelector('#block-panel select[aria-label="Mode"]'); m.value = '${v}'; m.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(250); };
const foldAt = async (n, r, name) => { await press(CHEV, n); await pause(100); const got = shown().text; add(name, got === r.codeText, `want ${JSON.stringify(r.codeText)} got ${JSON.stringify(got)}`); };
void code;
await setCode(F7.reads['html chevrons'].codeText);
for (const [n, name] of [[0, 'html 0'], [1, 'html 1'], [2, 'html 2']]) { await foldAt(n, F7.reads[name], `HTML: ${name}`); await press(PH); }
await foldAt(3, F7.reads['html 3'], 'HTML: in a script');
await press(CHEV, 4); await pause(100); add('HTML: in a style too', shown().text === F7.reads['html 4'].codeText, shown().text);
await press(PH); await press(PH);
await setCode('<div>\nj'); await foldAt(0, F8.reads['html unclosed'], 'HTML: an unclosed tag');
await press(PH);
await setCode('<div>\n  <p>\n    x\n  </p>\n</div>'); await foldAt(0, { codeText: '<div>…</div>' }, 'HTML: an element'); await press(PH); await foldAt(1, { codeText: '<div>\n  <p>…</p>\n</div>' }, 'HTML: an inner element'); await press(PH);
await setCode('');
await setMode('css'); await setCode(F7.reads['css chevrons'].codeText);
await foldAt(0, F7.reads['css 0'], 'CSS: a block and what follows'); await foldAt(1, F7.reads['css 1'], 'CSS: an inner block');
await press(PH); await press(PH);
await setCode('');
await setMode('javascript'); await setCode(F8.reads['js chevrons'].codeText);
await foldAt(0, F8.reads['js function'], 'JavaScript: a function'); await press(PH);
await foldAt(2, F8.reads['js comment'], 'JavaScript: a comment'); await press(PH);
await setCode(''); await setCode('if (x) {\n  y(\n    z\n  );\n} else {\n  w;\n}');
await foldAt(0, { codeText: 'if (x) {…} else {\n  w;\n}' }, 'JavaScript: if, else');
const nowChev = shown().chev;
add('JavaScript: the else has no chevron then', nowChev.join() === 'Unfold line 1', nowChev.join());
await press(PH);
await setCode(''); await setCode('a {\n}\nb'); await press(CHEV);
await setMode('plain'); add('A fold outlasts changing Mode', shown().text === F7.reads['mode change with a fold'].codeText, shown().text);

console.log(`Folding: ${pass} of ${total} checks match`);
writeFileSync(new URL('../parity/fold-check.json', import.meta.url), `${JSON.stringify({ check: 'folding', pass, total, results }, null, 2)}\n`);
if (!total || pass !== total) process.exitCode = 1;
