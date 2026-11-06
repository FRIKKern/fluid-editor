// What a code editor shows under its text (parity/findings/CAP-T10LOOK.json, CAP-T10MD2.json): each line as HTML,
// with the marks of Markdown or the tags of HTML in their colours.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (cls, text) => (text ? `<span class="${cls}">${esc(text)}</span>` : '');

// Tags: the brackets stay plain, as a punctuation span of its own. Attributes aren't read, so they stay plain text.
const tags = (s) => s.replace(/(<\/?)([a-z][\w-]*)([^<>]*)(>)/gi, (m, open, name, rest, close) => `\u0001${open}\u0002${name}\u0003${rest}${close}\u0004`);
function htmlBits(s) {
  return tags(s).split(/(\u0001[^\u0004]*\u0004)/).map((part) => {
    if (part[0] !== '\u0001') return esc(part);
    const [, open, name, rest] = /\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003([^\u0004]*)\u0004/.exec(part);
    const attrs = rest.slice(0, -1);
    return `${t('c-p', open)}${t('c-tag', name)}${esc(attrs)}${t('c-p', '>')}`;
  }).join('');
}
export const htmlLine = (line) => htmlBits(line);

const INLINE = /(!?\[)([^\]\n]*)(\])(\()([^)\n]*)(\))|(\*\*)([^*\n]+)(\*\*)|(\*)([^*\n]+)(\*)|(`)([^`\n]*)(`)|(\[)([^\]\n]*)(\])(?=:)|<\/?[a-z][^<>\n]*>/gi;
function inline(s) {
  let out = '', at = 0;
  for (const m of s.matchAll(INLINE)) {
    out += esc(s.slice(at, m.index));
    at = m.index + m[0].length;
    if (m[1]) out += t('c-link c-meta', m[1]) + t('c-link', m[2]) + t('c-link c-meta', m[3]) + t('c-link c-meta', m[4]) + t('c-link c-url', m[5]) + t('c-link c-meta', m[6]);
    else if (m[7]) out += t('c-b c-meta', m[7]) + t('c-b', m[8]) + t('c-b c-meta', m[9]);
    else if (m[10]) out += t('c-i c-meta', m[10]) + t('c-i', m[11]) + t('c-i c-meta', m[12]);
    else if (m[13]) out += t('c-meta', m[13]) + esc(m[14]) + t('c-meta', m[15]);
    else if (m[16]) out += t('c-link c-meta', m[16]) + t('c-link', m[17]) + t('c-link c-meta', m[18]);
    else out += htmlBits(m[0]);
  }
  return out + esc(s.slice(at));
}
// Line by line, carrying whether a fence is open.
export function markdownLines(text) {
  let fence = false;
  return text.split('\n').map((line) => {
    const f = /^(```+|~~~+)(.*)$/.exec(line);
    if (f) { fence = !fence; return t('c-meta', f[1]) + t('c-url', f[2]); }
    if (fence) return esc(line);
    const h = /^(#{1,6})( .*)?$/.exec(line);
    if (h) return t('c-h c-meta', h[1]) + t('c-h', h[2] || '');
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) return t('c-url', line);
    const m = /^(\s*)([*+-]|\d+\.|>)( .*|)$/.exec(line);
    if (m) return esc(m[1]) + t('c-meta', m[2]) + inline(m[3]);
    return inline(line);
  });
}
export const codeLines = (text, lang) => (lang === 'markdown' ? markdownLines(text) : lang === 'html' ? text.split('\n').map(htmlLine) : text.split('\n').map(esc));

// The number column grows with the digits; the fold column beside it stays.
export const gutterWidth = (lines) => Math.max(20, 9 + String(lines).length * 8.43) + 10.4 + 1;
