// Folding in the Code and Markdown editors (CAP-T10FOLD to CAP-T10FOLD8). Two parts: what can fold in a text, by Mode, and
// a field's folds. A textarea can't hide lines, so while a field has folds it holds only what shows, with one wide clear
// character where each fold's placeholder sits. Caret stops on either side of that character are the fold's two ends.
// fullOf gives the real text, and everything that reads or writes a field goes through it.

// ---- What can fold. A line's fold, as [from, to] offsets; an outer one wins a line it shares with an inner one.
const FENCE = /^ {0,3}(`{3,}|~{3,})/, ATX = /^ {0,3}(#{1,6})(?:[ \t]|$)/, RULE = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const QUOTE = /^ {0,3}> ?/, ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])( +|$)/, SETEXT = /^ {0,3}(=+|-+)[ \t]*$/, BLANK = /^\s*$/;
const DELIM = /^ *\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/, LINKDEF = /^ {0,3}\[[^\]]+\]:[ \t]*\S/;
const RAW = /^ {0,3}<(script|pre|style|textarea)(\s|>|$)/i;
const NAMED = /^ {0,3}<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(\s|\/?>|$)/i;
const ALONE = /^ {0,3}<\/?[a-z][^<>]*>[ \t]*$/i;
const OTHER = [[/^ {0,3}<!--/, '-->'], [/^ {0,3}<\?/, '?>'], [/^ {0,3}<![A-Z]/, '>'], [/^ {0,3}<!\[CDATA\[/, ']]>']];

const breaksPara = (t) => ATX.test(t) || FENCE.test(t) || QUOTE.test(t) || RULE.test(t) || RAW.test(t) || NAMED.test(t) || OTHER.some(([o]) => o.test(t))
  || (() => { const m = ITEM.exec(t); return !!m && !!m[3] && (/[-*+]/.test(m[2]) || /^1[.)]$/.test(m[2])); })();
const indentOf = (t) => /^ */.exec(t)[0].length;

// Rows are { n: line number, t: the line with whatever holds it taken off }. mark(a, b) says line a can fold through line b.
function scanMd(rows, mark) {
  const nodes = [];
  let i = 0;
  const lazyFrom = (j, stop) => { while (j < rows.length && !BLANK.test(rows[j].t) && !stop(rows[j].t)) j++; return j; };
  while (i < rows.length) {
    const t = rows[i].t;
    if (BLANK.test(t)) { i++; continue; }
    let end = i, level = 0, m;
    if ((m = FENCE.exec(t))) {
      const close = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}[ \\t]*$`);
      end = rows.length - 1;
      for (let j = i + 1; j < rows.length; j++) if (close.test(rows[j].t)) { end = j; break; }
    } else if ((m = ATX.exec(t))) level = m[1].length;
    else if (RULE.test(t)) end = i;
    else if (QUOTE.test(t)) {
      const inner = [];
      let j = i;
      for (; j < rows.length; j++) {
        const q = QUOTE.exec(rows[j].t);
        if (q) { inner.push({ n: rows[j].n, t: rows[j].t.slice(q[0].length) }); continue; }
        if (BLANK.test(rows[j].t) || BLANK.test(inner.at(-1).t) || breaksPara(rows[j].t)) break;
        inner.push({ n: rows[j].n, t: rows[j].t });
      }
      end = j - 1;
      scanMd(inner, mark);
    } else if ((m = ITEM.exec(t))) {
      const pad = m[1].length + m[2].length + (m[3] && m[3].length <= 4 ? m[3].length : 1);
      const inner = [{ n: rows[i].n, t: t.slice(pad) }];
      let j = i + 1;
      end = i;
      for (; j < rows.length; j++) {
        const u = rows[j].t;
        if (BLANK.test(u)) {
          let k = j;
          while (k < rows.length && BLANK.test(rows[k].t)) k++;
          if (k === rows.length || indentOf(rows[k].t) < pad) break;
          inner.push({ n: rows[j].n, t: '' });
          continue;
        }
        if (indentOf(u) >= pad) { inner.push({ n: rows[j].n, t: u.slice(pad) }); end = j; continue; }
        if (BLANK.test(rows[j - 1].t) || ITEM.test(u) || breaksPara(u)) break;
        inner.push({ n: rows[j].n, t: u });
        end = j;
      }
      scanMd(inner, mark);
    } else if (/^( {4}|\t)/.test(t)) {
      for (let j = i + 1; j < rows.length; j++) { if (BLANK.test(rows[j].t)) continue; if (!/^( {4}|\t)/.test(rows[j].t)) break; end = j; }
    } else if ((m = RAW.exec(t))) {
      const close = new RegExp(`</${m[1]}>`, 'i');
      end = rows.length - 1;
      for (let j = i; j < rows.length; j++) if (close.test(rows[j].t)) { end = j; break; }
    } else if (OTHER.some(([o]) => o.test(t))) {
      const shut = OTHER.find(([o]) => o.test(t))[1];
      end = rows.length - 1;
      for (let j = i; j < rows.length; j++) if (rows[j].t.includes(shut)) { end = j; break; }
    } else if (NAMED.test(t) || ALONE.test(t)) {
      end = lazyFrom(i + 1, () => false) - 1;
    } else if (LINKDEF.test(t)) end = i;
    else if (t.includes('|') && rows[i + 1]?.t.includes('|') && DELIM.test(rows[i + 1].t)) {
      end = lazyFrom(i + 2, breaksPara) - 1;
    } else {
      // A paragraph, unless a line of = or - closes it: then it's a heading.
      let j = i + 1;
      for (; j < rows.length; j++) {
        const u = rows[j].t;
        if (BLANK.test(u)) break;
        const s = SETEXT.exec(u);
        if (s) { level = s[1][0] === '=' ? 1 : 2; j++; break; }
        if (breaksPara(u)) break;
      }
      end = j - 1;
    }
    nodes.push({ first: i, last: end, level });
    i = end + 1;
  }
  nodes.forEach((node, at) => {
    let last = node.last;
    if (node.level) for (let k = at + 1; k < nodes.length && !(nodes[k].level && nodes[k].level <= node.level); k++) last = nodes[k].last;
    if (last > node.first) mark(rows[node.first].n, rows[last].n);
  });
}

// Braces and brackets, skipping strings and comments. Only JavaScript reads [ and folds a comment of several lines, and
// only CSS folds a brace with no partner, to the end (CAP-T10FOLD7.json, CAP-T10FOLD8.json).
function scanBrackets(s, from, to, js, add) {
  const stack = [];
  let i = from, last = '';
  while (i < to) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') {
      const e = s.indexOf('*/', i + 2), stop = e < 0 || e + 2 > to ? to : e + 2;
      if (js && e >= 0 && stop <= to) add(i + 2, e);
      i = stop;
      continue;
    }
    if (js && c === '/' && s[i + 1] === '/') { const e = s.indexOf('\n', i); i = e < 0 ? to : e; continue; }
    if (c === '"' || c === "'" || (js && c === '`')) {
      let j = i + 1;
      while (j < to && s[j] !== c && (c === '`' || s[j] !== '\n')) j += s[j] === '\\' ? 2 : 1;
      i = j + 1;
      last = c;
      continue;
    }
    if (js && c === '/' && /[=(,:[!&|?{};]|^$/.test(last)) {
      let j = i + 1, inSet = false;
      while (j < to && s[j] !== '\n' && (inSet || s[j] !== '/')) { if (s[j] === '[') inSet = true; if (s[j] === ']') inSet = false; j += s[j] === '\\' ? 2 : 1; }
      if (s[j] === '/') { i = j + 1; last = '/'; continue; }
    }
    if (c === '{' || (js && c === '[')) stack.push({ c, at: i });
    else if ((c === '}' || (js && c === ']')) && stack.at(-1)?.c === (c === '}' ? '{' : '[')) add(stack.pop().at + 1, i);
    if (!/\s/.test(c)) last = c;
    i++;
  }
  if (!js) for (const o of stack) add(o.at + 1, to);
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const IMPLIED = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'], option: ['option'], p: ['p'] };
// An element folds from the end of its opening tag to the start of whatever closes it, its own closing tag, the close of
// what holds it, or the end. Script and style fold as their own language inside (CAP-T10FOLD7.json).
function scanHtml(s, add) {
  const stack = [], tag = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(>?)/g;
  for (let m = tag.exec(s); m; m = tag.exec(s)) {
    if (!m[2]) continue;
    const name = m[2].toLowerCase();
    if (m[1]) {
      const at = stack.map((e) => e.name).lastIndexOf(name);
      if (at >= 0) for (const open of stack.splice(at).reverse()) add(open.end, m.index);
      continue;
    }
    if (!m[4]) continue;
    const end = m.index + m[0].length;
    while (IMPLIED[name]?.includes(stack.at(-1)?.name)) add(stack.pop().end, m.index);
    if (VOID.has(name) || m[3].endsWith('/')) continue;
    if (name === 'script' || name === 'style') {
      const close = new RegExp(`</${name}`, 'i').exec(s.slice(end)), stop = close ? end + close.index : s.length;
      scanBrackets(s, end, stop, name === 'script', add);
      add(end, stop);
      tag.lastIndex = stop;
      continue;
    }
    stack.push({ name, end });
  }
  for (const open of stack) add(open.end, s.length);
}

const lineStarts = (s) => { const out = [0]; for (let i = s.indexOf('\n'); i >= 0; i = s.indexOf('\n', i + 1)) out.push(i + 1); return out; };
const lineAt = (starts, x) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= x) lo = m; else hi = m - 1; } return lo; };

let memo = { text: null, lang: null, ranges: null };
// Map from a line's index to its fold, [from, to].
export function foldRanges(text, lang) {
  if (memo.text === text && memo.lang === lang) return memo.ranges;
  const ranges = new Map(), starts = lineStarts(text), endOf = (n) => (n + 1 < starts.length ? starts[n + 1] - 1 : text.length);
  if (lang === 'markdown') {
    scanMd(text.split('\n').map((t, n) => ({ n, t })), (a, b) => { const was = ranges.get(a); if (!was || was[1] < endOf(b)) ranges.set(a, [endOf(a), endOf(b)]); });
  } else if (lang === 'css' || lang === 'javascript' || lang === 'html') {
    const add = (from, to) => {
      const n = lineAt(starts, from);
      if (to <= endOf(n)) return;
      const was = ranges.get(n);
      if (!was || from < was[0]) ranges.set(n, [from, to]);
    };
    if (lang === 'html') scanHtml(text, add); else scanBrackets(text, 0, text.length, lang === 'javascript', add);
  }
  memo = { text, lang, ranges };
  return ranges;
}

// ---- A field's folds.
export const FOLD_MARK = '　';
const states = new WeakMap();
export const foldsOf = (f) => states.get(f);
export const fullOf = (f) => states.get(f)?.full ?? f.value;
const topsOf = (folds) => {
  const out = [];
  for (const q of [...folds].sort((a, b) => a.from - b.from || b.to - a.to)) if (!out.length || q.from >= out.at(-1).to) out.push(q);
  return out;
};
function reveal(st) {
  st.tops = topsOf(st.folds);
  let vis = '', at = 0;
  for (const q of st.tops) { vis += st.full.slice(at, q.from) + FOLD_MARK; at = q.to; }
  st.vis = vis + st.full.slice(at);
}
// An offset in the real text as one in the field, and back. A place under a fold is the mark's near side.
function toVis(st, x, past = false) {
  let gone = 0;
  for (const q of st.tops) {
    if (x <= q.from) break;
    if (x < q.to) return q.from - gone + (past ? 1 : 0);
    gone += q.to - q.from - 1;
  }
  return x - gone;
}
function toReal(st, v) {
  let gone = 0;
  for (const q of st.tops) {
    if (v <= q.from - gone) break;
    gone += q.to - q.from - 1;
  }
  return v + gone;
}
export const realOf = (f, v) => { const st = states.get(f); return st ? toReal(st, v) : v; };
function show(f, st, s, e = s, dir) {
  reveal(st);
  f.value = st.vis;
  const top = f.scrollTop;
  f.setSelectionRange(toVis(st, s, true), toVis(st, e, true), dir);
  f.scrollTop = top;
}
const realSel = (f) => [realOf(f, f.selectionStart), realOf(f, f.selectionEnd), f.selectionDirection];
function shift(st, a, b, text) {
  const delta = text.length - (b - a), full = st.full.slice(0, a) + text + st.full.slice(b);
  st.folds = st.folds.filter((q) => !(a < b && a < q.to && b > q.from)).map((q) => ({ from: q.from >= b ? q.from + delta : q.from, to: q.to > a && q.to >= b ? q.to + delta : q.to }))
    .filter((q) => full.slice(q.from, q.to).includes('\n'));
  st.full = full;
}
// One edit of the real text, which keys can take back. Letters typed in a run are one step.
function edit(st, a, b, text) {
  const removed = st.full.slice(a, b), was = st.undo.at(-1), now = Date.now();
  shift(st, a, b, text);
  st.redo = [];
  if (was && !removed && !was.removed && text.length === 1 && text !== '\n' && a === was.at + was.text.length && now - was.time < 800) { was.text += text; was.time = now; return; }
  st.undo.push({ at: a, removed, text, time: now });
}
export function toggleFold(f, from, to) {
  const [s, e, dir] = realSel(f), st = states.get(f) ?? { full: f.value, folds: [], undo: [], redo: [] };
  states.set(f, st);
  st.folds.push({ from, to });
  show(f, st, s, e, dir);
}
// Opens the fold beginning on a line of the real text, the outermost there.
export function openFold(f, from, caretTo = false) {
  const st = states.get(f), [s, e, dir] = realSel(f), was = st.folds.find((q) => q.from === from && st.tops.includes(q));
  st.folds = st.folds.filter((q) => q !== was);
  if (caretTo) show(f, st, was.to); else show(f, st, s, e, dir);
}
export function dropFolds(f) { states.delete(f); }
// Another field shows the same text now: the panel drawn anew, or the view's Mode changed.
export function adoptFolds(f, st) { if (st) { states.set(f, st); reveal(st); f.value = st.vis; } }
// A row for each line showing, for paintCode: its first real line and its coloured HTML, with each fold's placeholder.
export function foldRows(f, colour) {
  const st = states.get(f);
  if (!st?.tops.length) return colour.map((html, line) => ({ html, line }));
  const starts = lineStarts(st.full), rows = [];
  let line = 0, col = 0, html = '', first = 0;
  const until = (stop) => { while (line < stop) { rows.push({ html: html + cutHtml(colour[line], col), line: first }); line++; col = 0; html = ''; first = line; } };
  for (const q of st.tops) {
    const n = lineAt(starts, q.from), m = lineAt(starts, q.to);
    until(n);
    html += `${cutHtml(colour[n], col, q.from - starts[n])}<span class="bp-code-ph" title="folded code" data-fold-open="${q.from}">…</span>`;
    line = m;
    col = q.to - starts[m];
  }
  until(colour.length);
  return rows;
}
// Part of a coloured line, keeping its spans.
function cutHtml(html, from, to = Infinity) {
  if (!from && to === Infinity) return html;
  let out = '', at = 0, open = null, shown = false;
  for (const part of html.match(/<[^>]+>|&[^;]+;|[^<&]/g) || []) {
    if (part[0] === '<') {
      if (part[1] !== '/') { open = part; shown = false; } else { if (shown) out += part; open = null; shown = false; }
      continue;
    }
    if (at >= from && at < to) { if (open && !shown) { out += open; shown = true; } out += part; }
    at++;
    if (at === to && shown) { out += '</span>'; shown = false; }
  }
  return out;
}
export const foldedLine = (f, line) => { const st = states.get(f); if (!st) return null; const starts = lineStarts(st.full); return st.tops.find((q) => lineAt(starts, q.from) === line) ?? null; };
export const lineOf = (text, x) => lineAt(lineStarts(text), x);

// ---- Keys. Each returns true when it took the event. The caller fires input so the block hears.
const markLeft = (st, v) => st.tops.find((q) => toVis(st, q.from) === v);
const markRight = (st, v) => st.tops.find((q) => toVis(st, q.from) + 1 === v);
// A key that opens a fold: Right from its near side, Left from its far side (CAP-T10FOLD5.json, CAP-T10FOLD7.json).
export function foldArrow(f, right, extend) {
  const st = states.get(f);
  if (!st) return false;
  const head = f.selectionDirection === 'backward' ? f.selectionStart : f.selectionEnd, anchor = head === f.selectionStart ? f.selectionEnd : f.selectionStart;
  if (!extend && anchor !== head) return false;
  const q = right ? markLeft(st, head) : markRight(st, head);
  if (!q) return false;
  const near = toReal(st, anchor);
  st.folds = st.folds.filter((x) => x !== q);
  const to = right ? q.from + 1 : q.to - 1;
  reveal(st);
  f.value = st.vis;
  const a = toVis(st, extend ? near : to), b = toVis(st, to);
  f.setSelectionRange(Math.min(a, b), Math.max(a, b), a > b ? 'backward' : 'forward');
  return true;
}
// A press of Delete or Backspace beside a mark takes the hidden letter next to it, and opens the fold.
export function foldDelete(f, forward) {
  const st = states.get(f);
  if (!st || f.selectionStart !== f.selectionEnd) return false;
  const q = forward ? markLeft(st, f.selectionStart) : markRight(st, f.selectionStart);
  if (!q) return false;
  const [a, b] = forward ? [q.from, q.from + 1] : [q.to - 1, q.to];
  edit(st, a, b, '');
  show(f, st, a);
  return true;
}
export function noteSelection(f) { const st = states.get(f); if (st) st.before = [f.selectionStart, f.selectionEnd]; }
// The field changed by itself: carry that change over to the real text.
export function syncFolds(f) {
  const st = states.get(f);
  if (!st || f.value === st.vis) return;
  const old = st.vis, now = f.value, [s, e] = st.before ?? [0, 0];
  st.before = null;
  let a, b;
  if (s < e) { a = s; b = e; } else {
    const limit = Math.min(old.length, now.length, f.selectionEnd);
    a = 0;
    while (a < limit && old[a] === now[a]) a++;
    b = old.length;
    let c = now.length;
    while (b > a && c > a && old[b - 1] === now[c - 1]) { b--; c--; }
  }
  const text = now.slice(a, now.length - (old.length - b)), from = toReal(st, a);
  edit(st, from, toReal(st, b), text);
  reveal(st);
  // A fold the edit touched has opened, so the field shows more now.
  if (st.vis !== now) { f.value = st.vis; const at = toVis(st, from + text.length); f.setSelectionRange(at, at); }
}
export function foldUndo(f, redo) {
  const st = states.get(f);
  if (!st) return false;
  const step = (redo ? st.redo : st.undo).pop();
  if (!step) return true;
  if (step.whole) { st.full = step.whole.text; st.folds = step.whole.folds; } else shift(st, step.at, step.at + step.text.length, step.removed);
  (redo ? st.undo : st.redo).push({ at: step.at, removed: step.text, text: step.removed, time: 0, whole: step.after, after: step.whole });
  show(f, st, step.at + step.removed.length);
  return true;
}
// A toolbar press, worked out on the real text. Folds stay on their lines when the lines stay (CAP-T10FOLD5.json).
export function foldReplace(f, r) {
  const st = states.get(f), was = st.full, now = r.value;
  let a = 0;
  while (a < was.length && a < now.length && was[a] === now[a]) a++;
  let b = was.length, c = now.length;
  while (b > a && c > a && was[b - 1] === now[c - 1]) { b--; c--; }
  const before = lineStarts(was), after = lineStarts(now);
  if (before.length === after.length) {
    const end = (starts, s, n) => (n + 1 < starts.length ? starts[n + 1] - 1 : s.length);
    const move = (x) => { const n = lineAt(before, x); return end(after, now, n) - (end(before, was, n) - x); };
    const held = st.folds;
    st.folds = st.folds.map((q) => ({ from: move(q.from), to: move(q.to) }));
    // Taken back whole, so the fold it went over stays shut (CAP-T10FOLD5.json, CAP-T10FIX3.json).
    st.undo.push({ at: a, removed: was.slice(a, b), text: now.slice(a, c), time: 0, whole: { text: was, folds: held }, after: { text: now, folds: st.folds } });
    st.redo = [];
    st.full = now;
  } else edit(st, a, b, now.slice(a, c));
  show(f, st, r.start, r.end);
}
export function foldCopy(f) {
  const st = states.get(f);
  return st && f.selectionStart !== f.selectionEnd ? st.full.slice(toReal(st, f.selectionStart), toReal(st, f.selectionEnd)) : null; // null: the field's own copy will do
}
export function foldCut(f) {
  const st = states.get(f), a = toReal(st, f.selectionStart), b = toReal(st, f.selectionEnd);
  edit(st, a, b, '');
  show(f, st, a);
}
