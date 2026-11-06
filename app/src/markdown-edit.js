// The Markdown block's toolbar and keys as edits of its text (parity/findings/CAP-T10MD2.json, CAP-T10MD3.json,
// CAP-T10MD5.json, CAP-T10MD6.json, CAP-T10MD7.json). Each takes the text and selection and returns { value, start, end }.
const lineStart = (v, at) => (at ? v.lastIndexOf('\n', at - 1) + 1 : 0);
const lineEnd = (v, at) => { const n = v.indexOf('\n', at); return n < 0 ? v.length : n; };
const stars = (v, at, step) => { let n = 0; for (let i = step < 0 ? at - 1 : at; v[i] === '*'; i += step) n++; return n; };

// Bold and Italic take the marks off when the selection sits right inside them, and otherwise wrap it, marks
// and all (CAP-T10EDITS.json): an odd run of stars around it is Italic, two or more is Bold.
const fits = (n, l, r) => (n === 2 ? l >= 2 && r >= 2 : l % 2 === 1 && r % 2 === 1);
// The marks of a line (> * # and the like) stay out of a selection, and so does a last line it only just reaches
// (CAP-T10WRAP.json, CAP-T10EDITS3.json). Over several lines only the ends are moved.
const LINE_LEAD = /^(?:\s*(?:[*+-] +|\d+[.)] +|> ?|#{1,6} +))+/;
function pastMarks(v, s, e) {
  if (e > s && v[e - 1] === '\n') e--;
  const past = (at) => { const from = lineStart(v, at), m = LINE_LEAD.exec(v.slice(from, lineEnd(v, at))); return m && at < from + m[0].length ? from + m[0].length : at; };
  const a = past(s), b = past(e);
  return [a, Math.max(a, b)];
}
export function mdWrap(v, s0, e0, mark) {
  const n = mark.length, [s, e] = pastMarks(v, s0, e0);
  if (fits(n, stars(v, s, -1), stars(v, e, 1))) return { value: v.slice(0, s - n) + v.slice(s, e) + v.slice(e + n), start: s - n, end: e - n };
  return { value: `${v.slice(0, s)}${mark}${v.slice(s, e)}${mark}${v.slice(e)}`, start: s + n, end: e + n };
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

// Bold and Italic dim, and take no press, on a selection over several lines when one it touches is a heading,
// list or quote line (CAP-T10STATE.json, CAP-T10EDITS2.json).
const BLOCK_MARK = /^(?:#{1,6} |\s*[*+-] |\s*\d+\. |\s*> ?)/;
function holdsBlockMark(v, s, e) {
  if (e > s && v[e - 1] === '\n') e--;
  if (lineStart(v, s) === lineStart(v, e)) return false;
  for (let from = lineStart(v, s); from < e || from === s; from = lineEnd(v, from) + 1) {
    if (s < lineEnd(v, from) && BLOCK_MARK.test(v.slice(from, lineEnd(v, from)))) return true;
    if (lineEnd(v, from) >= v.length) break;
  }
  return false;
}
// What the toolbar shows. The list kinds go by the line of the selection's moving end, Bold and Italic by the
// stars around the selection, Link by any link it touches (CAP-T10EDITS.json, CAP-T10STATE.json).
export function mdState(v, s0, e0, head = e0) {
  const line = v.slice(lineStart(v, head), lineEnd(v, head));
  const [s, e] = pastMarks(v, s0, e0), h = /^(#{1,4}) +/.exec(line), l = stars(v, s, -1), r = stars(v, e, 1);
  return { heading: h ? `Heading ${h[1].length}` : 'Paragraph', bullet: LINE_MARKS.bullet[0].test(line), number: LINE_MARKS.number[0].test(line), quote: /^> /.test(line), bold: fits(2, l, r), italic: fits(1, l, r), dim: holdsBlockMark(v, s0, e0), link: !!mdLinkIn(v, s0, e0) };
}

// A quote's new lines take the mark its first line has: > or > and a space (CAP-T10EDITS.json, CAP-T10EDITS2.json).
function quoteMark(v, from) {
  while (from && v[lineStart(v, from - 1)] === '>') from = lineStart(v, from - 1);
  return v[from + 1] === ' ' ? '> ' : '>';
}
// Enter carries a list or quote on, the number going up. On an empty item it leaves a blank line, or a bare >,
// and the same mark below it. On the next, the marks go (CAP-T10MD8.json).
export function mdEnter(v, s, e) {
  if (s !== e) return null;
  const from = lineStart(v, s), head = v.slice(from, s);
  const m = /^(?:([*+-]) |(\d+)\. |(>) ?)/.exec(head);
  if (!m) return null;
  // An empty item, or a number other than 1, can't start a list straight under a paragraph: it is the paragraph's text.
  const above = from ? v.slice(lineStart(v, from - 1), from - 1) : '';
  const inText = /\S/.test(above) && !/^(?:#{1,6} |\s*[*+-] |\s*\d+\. |>|-{3,}$|\*{3,}$|_{3,}$|```|~~~)/.test(above);
  const rest = head.slice(m[0].length) + v.slice(s, lineEnd(v, s));
  if (!m[3] && inText && (!rest || (m[2] && m[2] !== '1'))) return null;
  const done = (value, at) => ({ value, start: at, end: at });
  if (!rest) {
    const to = lineEnd(v, s), before = from ? v.slice(lineStart(v, from - 1), from - 1) : null;
    // An empty item with no list line above just goes (CAP-T10EDITS3.json).
    if ((!m[3] && !/^\s*(?:[*+-] |\d+\. )/.test(above)) || (m[3] && before === '>')) {
      const keep = m[3] && from ? lineStart(v, from - 1) : from;
      const blank = keep === from ? '' : '\n';
      return done(`${v.slice(0, keep)}${blank}${v.slice(to)}`, keep + blank.length);
    }
    const mark = m[3] ? quoteMark(v, from) : m[0], left = m[3] ? '>' : '';
    return done(`${v.slice(0, from)}${left}\n${mark}${v.slice(to)}`, from + left.length + 1 + mark.length);
  }
  const mark = m[1] ? m[0] : m[2] ? `${Number(m[2]) + 1}. ` : quoteMark(v, from);
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
// The first link a selection or caret touches, its edges too. A fence holds no links, and an image isn't one.
export function mdLinkIn(v, s, e) {
  let fence = false, from = 0;
  for (const line of v.split('\n')) {
    if (/^(```+|~~~+)/.test(line)) fence = !fence;
    else if (!fence && from <= e && from + line.length >= s) {
      const text = line.replace(/`[^`]*`/g, (c) => ' '.repeat(c.length)); // inline code holds no links
      for (const m of text.matchAll(/(?<!!)\[([^\]\n]*)\](?:\(([^)\n]*)\)|\[[^\]\n]*\])/g)) {
        const start = from + m.index, end = start + m[0].length;
        if (s <= end && e >= start) return { start, end, text: m[1], href: m[2] ?? '' };
      }
    }
    from += line.length + 1;
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
