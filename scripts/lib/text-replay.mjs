// Replays a stored text finding's steps in our editor with real keys and real presses, at the
// the oracle's side of the undo clock: undo steps go by time. Each `read` and `undoWalk` is compared with the oracle's.
// add(what, ok, detail): ok is null when a run's timing was off and it could not run.
import { browser, cdp, evalJs, goto, mouse, pause } from './cmux.mjs';
import { BASE } from './base.mjs';
import { STUB_JS } from './clip-guard.mjs';

const TRAILING = / class="is-empty( is-editor-empty)?"| is-empty( is-editor-empty)?(?=")| data-placeholder="[^"]*"| class="ProseMirror-trailingBreak"| data-rte-preserve-empty="true"| ?style="white-space: ?pre-wrap;?"/g;
export const textNorm = (h) => (h == null ? h : h.replace(TRAILING, '').replace(/ data-text-attribute-id="[^"]*"/g, ' data-text-attribute-id="id"').replace(/<(p|h[1-4]|li) +>/g, '<$1>').replace(/(<(p|h[1-4])(?: [^>]*)?>|<code>)<br *\/?>(?=<\/(p|h[1-4]|code)>)/g, '$1').replace(/<(https?)>/g, '$1://'));

// What a step waited on the oracle (oracle-capture.mjs), what starting it took (CAP-E4GAP2.json), and how
// many changes it makes. Selecting is no change: it doesn't start the clock (CAP-E4GAP.json).
const WAITS = { click: 1200, clickIf: 1200, fill: 1200, press: 500, keys: 300, keysList: 300, keysGap: 300, keysFast: 1500 };
const COST = { click: 200, clickIf: 200, fill: 200, press: 100, keys: 100, keysList: 100, keysGap: 100, keysFast: 100 };
const MENUS = ['Text Color', 'Text Style', 'Text Alignment', 'Write', 'Custom'];
const changesIn = ([op, ...a]) => (op === 'keys' || op === 'keysFast' ? a[0].length : op === 'keysGap' ? a[1].filter((x) => !/^(Arrow|Home|End)/.test(x)).length : op === 'keysList' ? a[0].filter((x) => x !== 'Meta+a').length : op === 'press' ? (/^(Enter|Shift\+Enter|Backspace|Meta\+[bi])$/.test(a[0]) ? 1 : 0) : op === 'click' || op === 'clickIf' ? (MENUS.includes(a[0]) || a[0] === 'Undo' ? 0 : 1) : 0);
// A second splits an undo step (app/src/editor.js). gapsOf gives, per step that changes something, the gap
// it had from the last change on the oracle. The replay aims clearly at that side of a second.
const SPLIT = 1000, MARGIN = 100, INSIDE = 300, OUTSIDE = 1300;
function gapsOf(steps) {
  const out = new Map();
  let gap = null;
  steps.forEach((st, k) => {
    const n = changesIn(st);
    if (gap !== null) gap += COST[st[0]] ?? 0;
    if (n) { if (gap !== null) out.set(k, gap); gap = 0; }
    if (gap !== null) gap += st[0] === 'pause' ? st[1] : WAITS[st[0]] ?? 0;
  });
  return out;
}
// A segment that goes back over undo steps runs at the oracle's time.
const takesSteps = ([op, x]) => op === 'undoWalk' || (op === 'press' && /^Meta\+(Shift\+)?z$/.test(x)) || ((op === 'click' || op === 'pressNamed') && (x === 'Undo' || x === 'Redo'));
const aimFor = (gap) => (gap < SPLIT ? Math.min(gap, INSIDE) : Math.max(gap, OUTSIDE));
// A run whose real gap isn't clearly on the oracle's side says nothing, so it can't pass or fail.
function wrongGap(steps, stamps) {
  const want = [];
  const gaps = gapsOf(steps);
  steps.forEach((st, k) => { const n = changesIn(st); if (!n) return; if (gaps.has(k)) want.push(gaps.get(k)); for (let j = 1; j < n; j++) want.push(0); });
  if (stamps.length && want.length !== stamps.length - 1) return `${stamps.length} changes, the steps make ${want.length + 1}`;
  for (const [k, g] of want.entries()) {
    const real = stamps[k + 1] - stamps[k];
    if (g < SPLIT ? real >= SPLIT - MARGIN : real <= SPLIT + MARGIN) return `gap ${k + 1} was ${Math.round(real)} ms, on the oracle about ${g} ms`;
  }
  return null;
}
// Stamps each change in the page: letters and Enter, Cmd+B and Cmd+I, and a press on a toolbar action.
const STAMP = (ce) => `(() => { window.__stamps = []; const ce = ${ce}; const stamp = () => window.__stamps.push(Date.now());
  window.__stampOff?.abort(); const off = window.__stampOff = new AbortController(); const signal = off.signal;
  ce.addEventListener('input', stamp, { signal });
  ce.ownerDocument.addEventListener('keydown', (e) => { if ((e.metaKey && (e.code === 'KeyB' || e.code === 'KeyI')) || (e.shiftKey && e.key === 'Enter')) stamp(); }, { capture: true, signal });
  document.getElementById('text-bar').addEventListener('click', (e) => { const b = e.target.closest('button[data-fmt], input[data-fmt]'); if (b && !b.dataset.fmt.endsWith('-menu')) stamp(); }, { capture: true, signal });
  return 1; })()`;

// controls: the labels of the controls showing outside the page, in order, read by oracle-capture.mjs's rule (CONTROLS).
// Labels only: boxes are where our chrome sits, and roles are compared nowhere yet.
const CONTROL_LABELS = `(() => { const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2 || q.bottom < 0 || q.top > innerHeight) return false; const c = getComputedStyle(e); if (c.visibility === 'hidden' || Number(c.opacity) <= 0.05 || e.closest('#site-frame')) return false; const top = document.elementFromPoint(Math.min(q.left + q.width / 2, innerWidth - 1), Math.min(Math.max(q.top + q.height / 2, 0), innerHeight - 1)); return !!top && (top === e || e.contains(top) || top.contains(e)); };
  const clean = (t) => (t || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
  return JSON.stringify([...document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=switch], [role=slider], [role=checkbox], [role=option], [role=radio]')].filter(vis).map((e) => clean(e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || e.textContent))); })()`;

export async function replay(S, finding, add) {
  let id = null, newId = null, segment = null;
  // A read the finding doesn't hold is only fine when the capture said why: an error on that step, or set aside.
  // Anything else fails, never a silent skip (QUALITY.md, no skip-pass).
  const unread = (op, key) => {
    const why = (finding.errors || []).find((e) => e.startsWith(`${op} [${JSON.stringify(key)}`)) || (finding.setAside && key in finding.setAside && 'set aside');
    if (!why) add(key, false, `NOT READ: the finding has no read "${key}", and no error or setAside names it`);
  };
  const sid = () => evalJs(S, `JSON.stringify(fe.model.sections[1].id)`);
  const fresh = async () => {
    goto(S, `${BASE}/index.html`); await pause(1200);
    // cdp-run sends Meta+c, x and v only with the clipboard stub in place (clip-guard.mjs), never Chrome's own command.
    evalJs(S, STUB_JS);
    evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks = []; next.sections[1].rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((r) => setTimeout(r, 300)); return 1; })()`);
  };
  const ceOf = `document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="' + ${JSON.stringify('__ID__')} + '"] .sqs-html-content')`;
  const q = (what) => evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; return JSON.stringify(ce ? ce.${what} : null); })()`);
  const undoHere = async (name, r, k) => {
    const wrong = wrongGap(finding.steps.slice(segment, k), evalJs(S, `JSON.stringify(window.__stamps)`));
    if (wrong) { add(name, null, wrong); return; }
    const walk = [q('textContent')], html = [q('innerHTML')];
    for (let n = 0; n < 12 && evalJs(S, `JSON.stringify(!document.getElementById('undo').disabled)`); n++) { browser(S, 'click', '#undo'); await pause(300); walk.push(q('textContent')); html.push(q('innerHTML')); }
    r.undo.forEach((u, k) => {
      // Null on the oracle: the block's gone, or nothing was left to undo. Ours must have no more of its text either.
      if (u[1] === null) { add(`${name} ${u[0]}`, (walk[k] ?? null) === null, `oracle nothing, ours ${walk[k]}`); return; }
      const ok = (walk[k] ?? '').replace(/\s+/g, ' ').trim().slice(-60) === u[1] && (u[2] === undefined || textNorm(html[k]) === textNorm(u[2]));
      add(`${name} ${u[0]}`, ok, `oracle ${u[2] ? textNorm(u[2]) : u[1]}, ours ${u[2] ? textNorm(html[k]) : walk[k]}`);
    });
  };
  // The hint on an empty Text, read as oracle-capture.mjs reads it (beforeOf, hintOf). Where it sits is not compared.
  const hintHere = () => evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; const W = ce.ownerDocument.defaultView; return JSON.stringify([ce, ...ce.querySelectorAll('*')].map((e) => { const c = W.getComputedStyle(e, '::before'); return { tag: e.tagName.toLowerCase(), content: c.content, color: c.color, opacity: c.opacity, font: c.fontSize + ' ' + c.fontFamily.slice(0, 40), float: c.float, height: c.height, pointer: c.pointerEvents, weight: c.fontWeight, lineHeight: c.lineHeight, letterSpacing: c.letterSpacing, transform: c.textTransform }; }).filter((x) => /Write here/.test(x.content))); })()`);
  await fresh();
  const untilEnd = (k) => { const n = finding.steps.findIndex((x, j) => j > k && x[0] === 'undoWalk'); return n < 0 ? finding.steps.length : n; };
  const untilNextEnter = (k) => { const n = finding.steps.findIndex((x, j) => j > k && x[0] === 'enter'); return finding.steps.slice(k, n < 0 ? undefined : n); };
  let wait = pause, typed = '', paced = false, gaps = new Map(), lastChange = 0;
  for (const [k, [op, ...a]] of finding.steps.entries()) {
    // Where undo is walked, a change waits for its aimed gap from the last one, and nothing else waits.
    if (paced && segment !== null && gaps.has(k - segment)) { const left = lastChange + aimFor(gaps.get(k - segment)) - 100 - Date.now(); if (left > 0) await pause(left); }
    if (op === 'enter') { await fresh(); paced = untilNextEnter(k).some(takesSteps); segment = null; wait = (ms) => pause(Math.min(ms, paced ? 60 : 120)); }
    else if (op === 'add') { const s = sid(); id = evalJs(S, `(() => { const had = new Set(fe.model.sections[1].blocks.map((b) => b.id)); fe.addBlock(${JSON.stringify(s)}, 'Text', true); return JSON.stringify(fe.model.sections[1].blocks.find((b) => !had.has(b.id)).id); })()`); newId = id; await pause(100); }
    else if (op === 'click' && a[0] === 'Write') { const s = sid(); evalJs(S, `(() => { fe.edit(${JSON.stringify(s)}, ${JSON.stringify(id)}); const ce = ${ceOf.replace('__ID__', id)}; ce.focus(); return 1; })()`); if (paced) { segment = k + 1; gaps = gapsOf(finding.steps.slice(segment, untilEnd(k))); evalJs(S, STAMP(ceOf.replace('__ID__', id))); } await pause(150); }
    else if (op === 'clickIf' && !evalJs(S, `!!document.querySelector('#text-bar [aria-label="${a[0]}"], #text-bar [data-ctab="${a[0]}"]')`)) continue;
    else if (op === 'click' && a[0] === 'Undo') { browser(S, 'click', '#undo'); await wait(1200); }
    else if (op === 'click' || op === 'clickIf') { browser(S, 'click', `#text-bar [aria-label="${a[0]}"], #text-bar [data-ctab="${a[0]}"]`); await wait(1200); }
    else if (op === 'fill') { browser(S, 'fill', `#text-bar input[aria-label="${a[0]}"]`, a[1]); await wait(1200); }
    else if (op === 'press') { browser(S, 'press', a[0]); await wait(500); }
    else if (op === 'keys' || op === 'keysFast') { cdp(S, { op: 'presses', keys: [...a[0]].map((c) => (c === ' ' ? 'Space' : c)) }, 300000); typed = a[0]; await wait(300); }
    else if (op === 'keysList') { cdp(S, { op: 'presses', keys: a[0] }); await wait(300); }
    else if (op === 'keysGap') { cdp(S, { op: 'presses', keys: a[1], gapMs: a[0] }); await wait(300); }
    else if (op === 'pause') await wait(a[0]);
    // A paste over the selection as it is, as oracle-capture.mjs does it.
    else if (op === 'pasteHere') { evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; const W = ce.ownerDocument.defaultView; const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(a[2])}); dt.setData('text/plain', ${JSON.stringify(a[2].replace(/<[^>]+>/g, ' '))}); ce.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1; })()`); await wait(300); }
    // A paste at the middle of the first text, as oracle-capture.mjs does it.
    else if (op === 'pasteMid') { evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; const d = ce.ownerDocument, W = d.defaultView; ce.focus(); const t = d.createTreeWalker(ce, 4).nextNode(); const r = d.createRange(); r.setStart(t, Math.floor(t.length / 2)); r.collapse(true); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(a[2])}); dt.setData('text/plain', ${JSON.stringify(a[2].replace(/<[^>]+>/g, ' '))}); ce.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1; })()`); await wait(300); }
    else if (op === 'pick') { const s = sid(); id = typeof a[1] === 'number' ? evalJs(S, `JSON.stringify(fe.model.sections[1].blocks[${a[1]}].id)`) : newId; evalJs(S, `(() => { fe.select(${JSON.stringify(s)}, ${JSON.stringify(id)}); return 1; })()`); await pause(60); }
    // A real press on the block's middle.
    else if (op === 'select') { const [x, y] = evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; const b = ce.closest('.fe-block'); b.scrollIntoView({ block: 'center' }); const f = document.getElementById('site-frame').getBoundingClientRect(); const q = b.getBoundingClientRect(); return JSON.stringify([f.left + q.left + q.width / 2, f.top + q.top + q.height / 2]); })()`); mouse(S, 'move', x, y); mouse(S, 'down', x, y, { buttons: 1 }); mouse(S, 'up', x, y); await pause(150); }
    else if (op === 'view') { browser(S, 'click', a[0] === 'Mobile' ? '#bp-mobile' : '#bp-desktop'); await pause(300); }
    else if (op === 'pressNamed' && !['Toggle preview mode', 'Undo', 'Redo'].includes(a[0])) { browser(S, 'click', `#block-toolbar [aria-label="${a[0]}"], #layers-btn, [aria-label="${a[0]}"]`); await pause(300); }
    else if (op === 'pressNamed') { browser(S, 'click', a[0] === 'Undo' ? '#undo' : a[0] === 'Redo' ? '#redo' : '#preview'); await pause(300); }
    // A real drag by the block's middle, and a real press at a place in the window.
    else if (op === 'drag') { const [x, y] = evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; const b = ce.closest('.fe-block'); b.scrollIntoView({ block: 'center' }); const f = document.getElementById('site-frame').getBoundingClientRect(); const q = b.getBoundingClientRect(); return JSON.stringify([f.left + q.left + q.width / 2, f.top + q.top + (${a[2] === 's' ? 'q.height' : 'q.height / 2'})]); })()`); cdp(S, { op: 'drag', from: [x, y], to: [x + a[3], y + a[4]], steps: 12, holdMs: 200, mods: [] }); await pause(200); }
    else if (op === 'clickAt') { cdp(S, { op: 'drag', from: [a[0], a[1]], to: [a[0], a[1]], steps: 1, holdMs: 50, mods: [] }); await pause(200); }
    else if (op === 'beforeOf' || op === 'hintOf') {
      const read = finding.reads[a[0]]; if (read === undefined) { unread(op, a[0]); continue; }
      const want = (Array.isArray(read) ? read : []).filter((x) => /Write here/.test(x.content)).map(({ box, ...rest }) => rest), got = hintHere();
      const first = (v) => String(v).split(',')[0]; // Of the font stack, its first name: the rest is ours
      add(a[0], want.length === got.length && want.every((w, n) => Object.keys(w).every((key) => (key === 'font' ? first(w[key]) === first(got[n][key]) : w[key] === got[n][key]))), `oracle ${JSON.stringify(want)}, ours ${JSON.stringify(got)}`);
    }
    else if (op === 'read' && finding.reads[a[0]]?.linkTexts) {
      const got = new Set(evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; return JSON.stringify([...ce.querySelectorAll('a')].map((e) => e.textContent)); })()`));
      const want = new Set(finding.reads[a[0]].linkTexts);
      const names = typed.trim().split(/\s+/), wrong = names.filter((n) => got.has(n) !== want.has(n));
      add(`${a[0]}: ${names.length - wrong.length} of ${names.length} names`, !wrong.length, `${wrong.length} differ: ${wrong.slice(0, 12).join(' ')}`);
    }
    else if (op === 'read') {
      if (finding.reads[a[0]] === undefined) { unread(op, a[0]); continue; }
      // A read with only stamps is the timing tables' (WAITS, COST), not compared here. One with only the bar's state or controls is a row.
      const want = finding.reads[a[0]].html; if (want === undefined && !finding.reads[a[0]].areas && !finding.reads[a[0]].has && !finding.reads[a[0]].btnState && !finding.reads[a[0]].controls) continue;
      // A read of another block, by its place in the section.
      const other = a[1]?.html?.[1], who = typeof other === 'number' ? evalJs(S, `JSON.stringify(fe.model.sections[1].blocks[${other}].id)`) : id;
      const got = evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', who)}; return JSON.stringify(ce ? ce.innerHTML : null); })()`);
      // areas: each block's place on the desktop grid, as oracle-capture.mjs reads them.
      const areasWant = finding.reads[a[0]]?.areas?.map((x) => x[0]).sort(), areasGot = areasWant && evalJs(S, `(() => { const fe = document.getElementById('site-frame').contentDocument.querySelectorAll('main#page .fluid-engine')[1]; const W = fe.ownerDocument.defaultView; return JSON.stringify([...fe.querySelectorAll(':scope > .fe-block')].map((b) => { const c = W.getComputedStyle(b); return [c.gridRowStart, c.gridColumnStart, c.gridRowEnd, c.gridColumnEnd].join('/'); }).sort()); })()`);
      const areasSame = !areasWant || !a[0].includes('rows') || JSON.stringify(areasWant) === JSON.stringify(areasGot);
      const btnWant = finding.reads[a[0]]?.btnState, btnGot = btnWant && evalJs(S, `JSON.stringify({ Undo: document.getElementById('undo').disabled, Redo: document.getElementById('redo').disabled })`);
      const btnSame = !btnWant || ['Undo', 'Redo'].every((k) => btnWant[k]?.disabled === btnGot[k]);
      // has: is the text bar's Bold showing, is the toolbar's Write?
      const hasWant = finding.reads[a[0]]?.has, hasGot = hasWant && evalJs(S, `JSON.stringify({ Bold: !document.getElementById('text-bar').hidden, Write: !document.getElementById('block-toolbar').hidden && !!document.querySelector('#block-toolbar [aria-label="Write"]') })`);
      const hasSame = !hasWant || ['Bold', 'Write'].every((k) => hasWant[k] === undefined || hasWant[k] === hasGot[k]);
      const ctlWant = finding.reads[a[0]].controls?.map((c) => c.label), ctlGot = ctlWant && evalJs(S, CONTROL_LABELS);
      const ctlSame = !ctlWant || JSON.stringify(ctlWant) === JSON.stringify(ctlGot);
      add(a[0], (want === undefined || textNorm(got) === textNorm(want)) && hasSame && areasSame && btnSame && ctlSame, `${ctlSame ? '' : `controls: oracle ${ctlWant.join(' | ')}; ours ${ctlGot.join(' | ')}; `}oracle ${btnSame ? '' : JSON.stringify(btnWant)}${textNorm(want)}${hasWant ? ` ${JSON.stringify(hasWant)}` : ''}${areasSame ? '' : ` ${areasWant}`}, ours ${textNorm(got)}${hasWant ? ` ${JSON.stringify(hasGot)}` : ''}${areasSame ? '' : ` ${areasGot}`}`);
    }
    // A missing undo read still walks undo, so the steps after it start where the oracle's did.
    else if (op === 'undoWalk') { if (finding.reads[a[0]] === undefined) unread(op, a[0]); await undoHere(a[0], finding.reads[a[0]] || { undo: [] }, k); }
    if (paced && changesIn([op, ...a])) lastChange = Date.now();
  }
}
