// The Markdown block's toolbar and keys as edits of its text (parity/findings/CAP-T10MD2.json, CAP-T10MD3.json,
// CAP-T10MD5.json, CAP-T10MD6.json, CAP-T10MD7.json). Each takes the text and selection and returns { value, start, end }.
const lineStart = (v, at) => (at ? v.lastIndexOf('\n', at - 1) + 1 : 0);
const lineEnd = (v, at) => { const n = v.indexOf('\n', at); return n < 0 ? v.length : n; };
const stars = (v, at, step) => { let n = 0; for (let i = step < 0 ? at - 1 : at; v[i] === '*'; i += step) n++; return n; };

// Bold and Italic wrap the selection, or leave the caret between the marks, and take them off again.
// That Italic leaves a Bold's marks alone is inferred.
export function mdWrap(v, s, e, mark) {
  const n = mark.length;
  const fits = (l, r) => (n === 2 ? l >= 2 && r >= 2 : l % 2 === 1 && r % 2 === 1);
  if (fits(stars(v, s, -1), stars(v, e, 1))) return { value: v.slice(0, s - n) + v.slice(s, e) + v.slice(e + n), start: s - n, end: e - n };
  const inner = v.slice(s, e);
  if (inner.length >= 2 * n && fits(stars(inner, 0, 1), stars(inner, inner.length, -1))) {
    return { value: v.slice(0, s) + inner.slice(n, -n) + v.slice(e), start: s, end: e - 2 * n };
  }
  return { value: `${v.slice(0, s)}${mark}${inner}${mark}${v.slice(e)}`, start: s + n, end: e + n };
}

// Rewrites each line the selection touches, and carries the selection along.
function eachLine(v, s, e, change) {
  const from = lineStart(v, s), to = lineEnd(v, e);
  let at = from, added = 0, start = s, end = e;
  const lines = v.slice(from, to).split('\n').map((line, i) => {
    const next = change(line), shift = next.length - line.length;
    if (i === 0) start = Math.max(from, s + shift);
    if (e >= at && e <= at + line.length) end = e + added + shift;
    added += shift;
    at += line.length + 1;
    return next;
  });
  return { value: v.slice(0, from) + lines.join('\n') + v.slice(to), start, end: Math.max(start, end) };
}

const LINE_MARKS = { bullet: [/^[*+-] /, '* '], number: [/^\d+\. /, '1. '], quote: [/^> ?/, '> '] };
// A bulleted or numbered list and a quote start each line, and every line starting so takes it off.
export function mdLines(v, s, e, kind) {
  const [re, mark] = LINE_MARKS[kind];
  const lines = v.slice(lineStart(v, s), lineEnd(v, e)).split('\n');
  const off = lines.every((l) => re.test(l));
  return eachLine(v, s, e, (l) => (off ? l.replace(re, '') : re.test(l) ? l : mark + l));
}
export const mdHeading = (v, s, e, level) => eachLine(v, s, e, (l) => `${level ? `${'#'.repeat(level)} ` : ''}${l.replace(/^#{1,6} +/, '')}`);

// What the toolbar shows for the line under the caret. Bold and Italic show nothing.
export function mdState(v, at) {
  const line = v.slice(lineStart(v, at), lineEnd(v, at));
  const h = /^(#{1,4}) +/.exec(line);
  return { heading: h ? `Heading ${h[1].length}` : 'Paragraph', bullet: LINE_MARKS.bullet[0].test(line), number: LINE_MARKS.number[0].test(line), quote: /^> /.test(line) };
}

// Enter carries a list or quote on, the number going up. On an empty item it leaves a blank line, or a bare >,
// and the same mark below it. On the next, the marks go (CAP-T10MD8.json).
export function mdEnter(v, s, e) {
  if (s !== e) return null;
  const from = lineStart(v, s), head = v.slice(from, s);
  const m = /^(?:([*+-]) |(\d+)\. |(>) ?)/.exec(head);
  if (!m) return null;
  const rest = head.slice(m[0].length) + v.slice(s, lineEnd(v, s));
  const done = (value, at) => ({ value, start: at, end: at });
  if (!rest) {
    const to = lineEnd(v, s), before = from ? v.slice(lineStart(v, from - 1), from - 1) : null;
    if (from === 0 || before === (m[3] ? '>' : '')) {
      const keep = m[3] && from ? lineStart(v, from - 1) : from;
      const blank = keep === from ? '' : '\n';
      return done(`${v.slice(0, keep)}${blank}${v.slice(to)}`, keep + blank.length);
    }
    const mark = m[3] ? '> ' : m[0], left = m[3] ? '>' : '';
    return done(`${v.slice(0, from)}${left}\n${mark}${v.slice(to)}`, from + left.length + 1 + mark.length);
  }
  const mark = m[1] ? m[0] : m[2] ? `${Number(m[2]) + 1}. ` : '> ';
  return done(`${v.slice(0, s)}\n${mark}${v.slice(s)}`, s + 1 + mark.length);
}
// Backspace right after an empty item's mark takes the whole mark.
export function mdBackspace(v, s, e) {
  if (s !== e) return null;
  const from = lineStart(v, s), m = /^(?:[*+-] |\d+\. |> )$/.exec(v.slice(from, s));
  if (!m || s !== lineEnd(v, s)) return null;
  return { value: v.slice(0, from) + v.slice(s), start: from, end: from };
}

// A link the caret is inside, or null.
export function mdLinkAt(v, at) {
  const from = lineStart(v, at), line = v.slice(from, lineEnd(v, at));
  for (const m of line.matchAll(/\[([^\]\n]*)\]\(([^)\n]*)\)/g)) {
    const start = from + m.index, end = start + m[0].length;
    if (at > start && at < end) return { start, end, text: m[1], href: m[2] };
  }
  return null;
}
// A selection becomes the link's words. With only a caret, the address is its own words.
export function mdSetLink(v, s, e, href) {
  const link = `[${s === e ? href : v.slice(s, e)}](${href})`, at = s + link.length;
  return { value: v.slice(0, s) + link + v.slice(e), start: at, end: at };
}
export function mdChangeLink(v, link, href) {
  const next = `[${link.text}](${href})`, at = link.start + next.length;
  return { value: v.slice(0, link.start) + next + v.slice(link.end), start: at, end: at };
}
export function mdRemoveLink(v, link) {
  const at = link.start + link.text.length;
  return { value: v.slice(0, link.start) + link.text + v.slice(link.end), start: at, end: at };
}
