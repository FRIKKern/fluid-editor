// What a code editor shows under its text (parity/findings/CAP-T10LOOK.json, CAP-T10TOKENS.json, CAP-T10MODES.json,
// CAP-T10FOLD.json): our own small readers of Markdown, HTML, CSS and JavaScript. Each marks ranges of the text with
// classes; codeLines turns them into one line of HTML each.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Classes by character, so that a mark inside a mark just adds to it.
const canvas = (text) => { const c = new Array(text.length); return { text, c, add(from, to, cls) { for (let i = from; i < to; i++) c[i] = c[i] ? `${c[i]} ${cls}` : cls; } }; };
function toLines(p) {
  const out = [];
  let html = '', run = '', cls;
  const flush = () => { if (run) html += cls ? `<span class="${cls}">${esc(run)}</span>` : esc(run); run = ''; };
  for (let i = 0; i <= p.text.length; i++) {
    if (i === p.text.length || p.text[i] === '\n') { flush(); out.push(html); html = ''; cls = undefined; continue; }
    if (p.c[i] !== cls) { flush(); cls = p.c[i]; }
    run += p.text[i];
  }
  return out;
}

// HTML: tag names, attribute values, entities, comments; the brackets and attribute names stay plain.
const TAG = /<(\/?)([a-z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?)>/gi;
const TAG_HERE = new RegExp(`^${TAG.source}`, 'i');
function markTag(p, m, at) {
  const nameAt = at + 1 + m[1].length;
  p.add(nameAt, nameAt + m[2].length, 'c-tag');
  const attrsAt = nameAt + m[2].length;
  for (const a of m[3].matchAll(/=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g)) {
    const v = attrsAt + a.index + a[0].length - a[1].length;
    p.add(v, v + a[1].length, 'c-str');
  }
}
function markHtml(p, from, to) {
  const s = p.text.slice(from, to);
  const re = /<!--[\s\S]*?(?:-->|$)|<!doctype[^>]*>|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi;
  const taken = [];
  for (const m of s.matchAll(TAG)) {
    taken.push([m.index, m.index + m[0].length]);
    markTag(p, m, from + m.index);
    const name = m[2].toLowerCase();
    if (!m[1] && (name === 'style' || name === 'script')) {
      const end = s.toLowerCase().indexOf(`</${name}`, m.index + m[0].length), stop = end < 0 ? s.length : end;
      (name === 'style' ? markCss : markJs)(p, from + m.index + m[0].length, from + stop);
      taken.push([m.index + m[0].length, stop]);
    }
  }
  const inside = (i) => taken.some(([a, b]) => i >= a && i < b);
  for (const m of s.matchAll(re)) {
    if (inside(m.index)) continue;
    p.add(from + m.index, from + m.index + m[0].length, m[0][0] === '&' ? 'c-str' : m[0][1] === '!' && m[0][2] === '-' ? 'c-com' : 'c-meta');
  }
}

// CSS: inside a block a run up to ; or } is a declaration, a run up to { is a selector.
function markCss(p, from, to) {
  const s = p.text;
  let i = from;
  const blank = /\s/;
  const comment = () => { const e = s.indexOf('*/', i + 2), stop = e < 0 || e + 2 > to ? to : e + 2; p.add(i, stop, 'c-com'); i = stop; };
  const string = (q) => { let e = i + 1; while (e < to && s[e] !== q) e += s[e] === '\\' ? 2 : 1; e = Math.min(to, e + 1); p.add(i, e, 'c-str'); i = e; };
  const value = (stop) => {
    while (i < stop) {
      const c = s[i];
      if (s.startsWith('/*', i)) comment();
      else if (c === '"' || c === "'") string(c);
      else if (c === '#') { const m = /^#[\w-]*/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-num'); i += m[0].length; }
      else if (c === '!') { const m = /^![\w-]*/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-kw'); i += m[0].length; }
      else if (/\d/.test(c) || (c === '.' && /\d/.test(s[i + 1] || ''))) { const m = /^[\d.]+(%|[a-z]*)/i.exec(s.slice(i, stop)); p.add(i, i + m[0].length - m[1].length, 'c-num'); p.add(i + m[0].length - m[1].length, i + m[0].length, 'c-kw'); i += m[0].length; }
      else if (/[a-z_-]/i.test(c)) { const m = /^[\w-]+/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-atom'); i += m[0].length; }
      else i++;
    }
  };
  const selector = (stop) => {
    while (i < stop) {
      const c = s[i];
      if (s.startsWith('/*', i)) comment();
      else if (c === '#') { const m = /^#[\w-]*/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-url'); i += m[0].length; }
      else if (c === '.' || c === ':') { i += s[i + 1] === ':' ? 2 : 1; const m = /^[\w-]*/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-cls'); i += m[0].length; }
      else if (/[a-z_-]/i.test(c)) { const m = /^[\w-]+/.exec(s.slice(i, stop)); p.add(i, i + m[0].length, 'c-tag'); i += m[0].length; }
      else if (c === '"' || c === "'") string(c);
      else i++;
    }
  };
  const nextStop = () => { let q; for (let k = i; k < to; k++) { const c = s[k]; if (s.startsWith('/*', k)) { const e = s.indexOf('*/', k + 2); k = e < 0 ? to : e + 1; continue; } if (q) { if (c === q) q = null; continue; } if (c === '"' || c === "'") { q = c; continue; } if (c === ';' || c === '{' || c === '}') return k; } return to; };
  while (i < to) {
    if (blank.test(s[i]) || s[i] === '{' || s[i] === '}' || s[i] === ';') { i++; continue; }
    if (s.startsWith('/*', i)) { comment(); continue; }
    const stop = nextStop();
    if (s[i] === '@') {
      const m = /^@[\w-]*/.exec(s.slice(i, stop));
      p.add(i, i + m[0].length, 'c-kw');
      i += m[0].length;
      // In an at-rule a name before a colon is a property, all else a value.
      while (i < stop) {
        const c = /^\s*([\w-]+)\s*:/.exec(s.slice(i, stop));
        if (c) { i += c[0].length; continue; }
        if (s[i] === '(' || s[i] === ')') { i++; continue; }
        const e = s.slice(i, stop).search(/[()]/), part = e < 0 ? stop : i + e;
        value(part);
      }
    } else if (s[stop] === '{') selector(stop);
    else {
      const colon = s.slice(i, stop).indexOf(':');
      i = colon < 0 ? stop : i + colon + 1;
      value(stop);
    }
    i = Math.max(i, stop);
  }
}

// JavaScript: names a declaration brings in are blue, a class's name and a method's have their own colours.
const JS_KW = new Set('as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new null of return set static super switch this throw try typeof var void while with yield'.split(' '));
function markJs(p, from, to) {
  const s = p.text;
  let i = from, prev = '', declaring = null, depth = 0, paramsAt = -1;
  const classBodies = [];
  let classNext = false;
  const valueEnd = () => /[\w$)\]]$/.test(prev) && !['return', 'typeof', 'of', 'in', 'case', 'delete', 'void'].includes(prev);
  const template = () => {
    let start = i;
    i++;
    while (i < to && s[i] !== '`') {
      if (s[i] === '\\') { i += 2; continue; }
      if (s[i] === '$' && s[i + 1] === '{') {
        p.add(start, i, 'c-str2');
        i += 2;
        let d = 1, e = i;
        while (e < to && d) { if (s[e] === '{') d++; else if (s[e] === '}') d--; e++; }
        markJs(p, i, e - 1);
        i = e;
        start = i;
        continue;
      }
      i++;
    }
    i = Math.min(to, i + 1);
    p.add(start, i, 'c-str2');
    prev = 'x';
  };
  while (i < to) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (s.startsWith('//', i)) { let e = s.indexOf('\n', i); if (e < 0 || e > to) e = to; p.add(i, e, 'c-com'); i = e; continue; }
    if (s.startsWith('/*', i)) { const e0 = s.indexOf('*/', i + 2), e = e0 < 0 || e0 + 2 > to ? to : e0 + 2; p.add(i, e, 'c-com'); i = e; continue; }
    if (c === '"' || c === "'") { let e = i + 1; while (e < to && s[e] !== c && s[e] !== '\n') e += s[e] === '\\' ? 2 : 1; e = Math.min(to, e + 1); p.add(i, e, 'c-str'); i = e; prev = 'x'; continue; }
    if (c === '`') { template(); continue; }
    if (c === '/' && !valueEnd()) {
      const m = /^\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[a-z]*/.exec(s.slice(i, to));
      if (m) { p.add(i, i + m[0].length, 'c-str2'); i += m[0].length; prev = 'x'; continue; }
    }
    if (/\d/.test(c)) { const m = /^(?:0x[\da-f]+|[\d.]+(?:e[+-]?\d+)?)n?/i.exec(s.slice(i, to)); p.add(i, i + m[0].length, 'c-num'); i += m[0].length; prev = '0'; continue; }
    if (/[\w$]/.test(c)) {
      const w = /^[\w$]+/.exec(s.slice(i, to))[0], end = i + w.length, after = s.slice(end, to).match(/^\s*(.)/)?.[1];
      if (prev !== '.' && (w === 'true' || w === 'false')) p.add(i, end, 'c-atom');
      else if (prev !== '.' && JS_KW.has(w)) {
        p.add(i, end, 'c-kw');
        if (w === 'const' || w === 'let' || w === 'var') declaring = depth;
        if (w === 'function') declaring = 'function';
        if (w === 'class') classNext = true;
      } else if (classNext) { p.add(i, end, 'c-cls'); classNext = false; }
      else if (declaring === 'function') { p.add(i, end, 'c-def'); declaring = null; paramsAt = depth; }
      else if (paramsAt >= 0 && paramsAt === depth - 1 && prev !== '.' && prev !== '=') p.add(i, end, 'c-def');
      else if (declaring === depth && (prev === 'const' || prev === 'let' || prev === 'var' || prev === ',')) p.add(i, end, 'c-def');
      else if (classBodies.at(-1) === depth && prev !== '.' && after === '(') p.add(i, end, 'c-pdef');
      else if (prev !== '.' && after === '=' && s.slice(end, to).trimStart().startsWith('=>')) p.add(i, end, 'c-def');
      prev = w;
      i = end;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') {
      depth++;
      if (c === '{' && prev !== ')' && s.slice(from, i).match(/\bclass\b[^{}]*$/)) classBodies.push(depth);
      if (c === '(' && declaring === 'function') { declaring = null; paramsAt = depth - 1; }
    }
    if (c === '}' || c === ')' || c === ']') {
      if (classBodies.at(-1) === depth) classBodies.pop();
      depth--;
      if (c === ')' && paramsAt === depth) paramsAt = -1;
    }
    if (c === ';' && declaring === depth) declaring = null;
    prev = c;
    i++;
  }
}

// Markdown, block by block, then the inline marks of each block's text.
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const HR = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const MARKS = /^ {0,3}(?:>[ ]?|(?:[*+-]|\d{1,9}[.)])(?: +|$))/;
function markInline(p, from, to, skipTags = false) {
  const s = p.text, runs = [];
  let i = from;
  while (i < to) {
    const c = s[i];
    if (c === '\\' && i + 1 < to && /[!-/:-@[-`{-~]/.test(s[i + 1])) { p.add(i, i + 2, 'c-str2'); i += 2; continue; }
    if (c === '`') {
      const n = /^`+/.exec(s.slice(i, to))[0].length;
      let e = -1;
      for (const m of s.slice(i + n, to).matchAll(/`+/g)) if (m[0].length === n) { e = i + n + m.index; break; }
      if (e >= 0) { p.add(i, i + n, 'c-meta'); p.add(e, e + n, 'c-meta'); i = e + n; continue; }
      i += n;
      continue;
    }
    if (c === '<' && !skipTags) {
      const rest = s.slice(i, to);
      const auto = /^<([a-z][a-z\d+.-]{1,31}:[^\s<>]*|[^\s<>@]+@[^\s<>]+)>/i.exec(rest);
      if (auto) { p.add(i, i + 1, 'c-meta'); p.add(i + 1, i + 1 + auto[1].length, 'c-url'); p.add(i + 1 + auto[1].length, i + 2 + auto[1].length, 'c-meta'); i += auto[0].length; continue; }
      const com = /^<!--[\s\S]*?-->/.exec(rest);
      if (com) { p.add(i, i + com[0].length, 'c-com'); i += com[0].length; continue; }
      const tag = TAG_HERE.exec(rest);
      if (tag && tag.index === 0) { markTag(p, tag, i); i += tag[0].length; continue; }
    }
    if (c === '&') {
      const m = /^&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/i.exec(s.slice(i, to));
      if (m) { p.add(i, i + m[0].length, 'c-str'); i += m[0].length; continue; }
    }
    if (c === '[' || (c === '!' && s[i + 1] === '[')) {
      const open = c === '!' ? 2 : 1;
      let d = 0, e = -1;
      for (let k = i + open - 1; k < to; k++) {
        if (s[k] === '\\') { k++; continue; }
        if (s[k] === '[') d++;
        else if (s[k] === ']' && --d === 0) { e = k; break; }
      }
      if (e > 0 && /\S/.test(s.slice(i + open, e))) {
        const rest = s.slice(e + 1, to);
        const dest = /^\((\s*)([^\s()]*)(?:(\s+)("[^"]*"|'[^']*'))?\s*\)/.exec(rest), label = /^\[[^\]\n]*\]/.exec(rest);
        const stop = dest ? e + 1 + dest[0].length : label ? e + 1 + label[0].length : e + 1;
        p.add(i, stop, 'c-link');
        p.add(i, i + open, 'c-meta');
        p.add(e, e + 1, 'c-meta');
        markInline(p, i + open, e);
        if (dest) {
          p.add(e + 1, e + 2, 'c-meta');
          const u = e + 2 + dest[1].length;
          p.add(u, u + dest[2].length, 'c-url');
          if (dest[4]) { const t = u + dest[2].length + dest[3].length; p.add(t, t + dest[4].length, 'c-str'); }
          p.add(stop - 1, stop, 'c-meta');
        } else if (label) p.add(e + 1, stop, 'c-url');
        i = stop;
        continue;
      }
    }
    if (c === '*' || c === '_') {
      let e = i;
      while (e < to && s[e] === c) e++;
      const before = i > from ? s[i - 1] : ' ', after = e < to ? s[e] : ' ';
      const space = (x) => /\s/.test(x), punct = (x) => /[!-/:-@[-`{-~]/.test(x);
      const left = !space(after) && (!punct(after) || space(before) || punct(before));
      const right = !space(before) && (!punct(before) || space(after) || punct(after));
      runs.push({ c, at: i, n: e - i, open: c === '*' ? left : left && (!right || punct(before)), close: c === '*' ? right : right && (!left || punct(after)), both: left && right });
      i = e;
      continue;
    }
    i++;
  }
  // Pair the runs of stars and underscores, the nearest opener first.
  for (let k = 0; k < runs.length; k++) {
    const closer = runs[k];
    if (!closer.close) continue;
    for (let o = k - 1; o >= 0 && closer.n; o--) {
      const opener = runs[o];
      if (opener.c !== closer.c || !opener.open || !opener.n) continue;
      if ((opener.both || closer.both) && (opener.n + closer.n) % 3 === 0 && (opener.n % 3 || closer.n % 3)) continue;
      const use = opener.n >= 2 && closer.n >= 2 ? 2 : 1, cls = use === 2 ? 'c-b' : 'c-i';
      const a = opener.at + opener.n - use, b = closer.at;
      p.add(a, b + use, cls);
      p.add(a, a + use, 'c-meta');
      p.add(b, b + use, 'c-meta');
      opener.n -= use;
      closer.at += use;
      closer.n -= use;
      for (let d = o + 1; d < k; d++) runs[d].n = 0;
      if (opener.n) o++;
    }
  }
}
function markMarkdown(p) {
  const lines = p.text.split('\n');
  let at = 0, fence = null, para = null, item = 0; // item: where the text of the list item above starts
  const endPara = () => { if (para) { markInline(p, para.from, para.to); para = null; } };
  for (const line of lines) {
    const from = at;
    at += line.length + 1;
    const f = FENCE.exec(line);
    if (fence) {
      if (f && f[2][0] === fence[0] && f[2].length >= fence.length && !f[3].trim()) { p.add(from, from + line.length, 'c-meta'); fence = null; }
      continue;
    }
    if (f && !(f[2][0] === '`' && f[3].includes('`'))) {
      endPara();
      fence = f[2];
      p.add(from + f[1].length, from + f[1].length + f[2].length, 'c-meta');
      const info = f[3].trim();
      if (info) { const i = from + f[1].length + f[2].length + f[3].indexOf(info); p.add(i, i + info.length, 'c-url'); }
      continue;
    }
    if (!line.trim()) { endPara(); continue; }
    const base = item && line.search(/\S/) >= item ? item : 0;
    if (!para && /^ {4}/.test(line.slice(base))) continue; // indented code
    // Setext: the paragraph above is a heading.
    if (para && /^ {0,3}(?:=+|-+)[ \t]*$/.test(line)) {
      p.add(para.from, para.to, 'c-h');
      p.add(from, from + line.length, 'c-h c-meta');
      endPara();
      continue;
    }
    if (HR.test(line)) { endPara(); p.add(from, from + line.length, 'c-url'); continue; }
    // A line's own marks: quotes and list marks, then a heading or text.
    let i = base, marked = false, listed = false;
    for (let m = MARKS.exec(line.slice(i)); m; m = MARKS.exec(line.slice(i))) {
      const mark = m[0].trimEnd(), lead = m[0].length - m[0].trimStart().length;
      p.add(from + i + lead, from + i + mark.length, 'c-meta');
      if (mark.trimStart()[0] !== '>') listed = true;
      i += m[0].length;
      marked = true;
      while (line[i] === ' ') i++;
    }
    if (marked) endPara();
    if (listed) item = i;
    else if (!base) item = 0;
    const h = /^(#{1,6})(?: +|$)/.exec(line.slice(i)) || (!marked && /^ {0,3}(#{1,6})(?: +|$)/.exec(line));
    if (h) {
      endPara();
      const mark = i + h[0].indexOf('#');
      p.add(from + mark, from + line.length, 'c-h');
      p.add(from + mark, from + mark + h[1].length, 'c-meta');
      markInline(p, from + mark + h[1].length, from + line.length);
      continue;
    }
    if (marked) { markInline(p, from + i, from + line.length); continue; }
    if (para) para.to = from + line.length;
    else para = { from: from + i, to: from + line.length };
  }
  if (!fence) endPara();
}

// The bracket by the caret and its partner; in HTML the tag's own brackets or its name and its partner's.
const PAIRS = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
function bracketAt(s, at) {
  const c = s[at], other = PAIRS[c];
  if (!other) return null;
  const step = c === '(' || c === '[' || c === '{' ? 1 : -1;
  let d = 0;
  for (let i = at; i >= 0 && i < s.length; i += step) {
    if (s[i] === c) d++;
    else if (s[i] === other && --d === 0) return [[at, at + 1, 'c-match'], [i, i + 1, 'c-match']];
  }
  return [[at, at + 1, 'c-nomatch']];
}
function tagMarks(s, head, lang) {
  const tags = [...s.matchAll(TAG)];
  const n = tags.findIndex((m) => head >= m.index && head <= m.index + m[0].length);
  if (n < 0) return null;
  const m = tags[n], open = 1 + m[1].length, end = m.index + m[0].length, close = 1 + m[4].length;
  if (head <= m.index + open || head >= end) return [[m.index, m.index + open, 'c-match'], [end - close, end, 'c-match']];
  const nameAt = m.index + open;
  if (head > nameAt + m[2].length) return null;
  const name = [nameAt, nameAt + m[2].length];
  if (lang !== 'html') return [[...name, 'c-nomatch']];
  let d = 0;
  for (let k = n; k >= 0 && k < tags.length; k += m[1] ? -1 : 1) {
    const t = tags[k];
    if (t[2].toLowerCase() !== m[2].toLowerCase() || t[4]) continue;
    if (!!t[1] === !!m[1]) d++;
    else if (--d === 0) { const a = t.index + 1 + t[1].length; return [[...name, 'c-match'], [a, a + t[2].length, 'c-match']]; }
  }
  return [[...name, 'c-nomatch']];
}
export function matchMarks(s, head, lang) {
  if (head == null || head < 0) return [];
  if (lang === 'html' || lang === 'markdown') { const t = tagMarks(s, head, lang); if (t) return t; }
  return (head > 0 && bracketAt(s, head - 1)) || bracketAt(s, head) || [];
}

const READERS = { markdown: markMarkdown, html: (p) => markHtml(p, 0, p.text.length), css: (p) => markCss(p, 0, p.text.length), javascript: (p) => markJs(p, 0, p.text.length) };
// Each line as HTML. head is the caret, for the matching marks, or null with a selection.
export function codeLines(text, lang, head = null) {
  const p = canvas(text);
  READERS[lang]?.(p);
  for (const [a, b, cls] of matchMarks(text, head, lang)) p.add(a, b, cls);
  return toLines(p);
}

// An editor's markup, for editor.js to paint. attrs names its field; top goes before the gutter.
export const lookBox = (attrs, value, lang, { placeholder = '', top = '', label = 'Code', cls = '' } = {}) => `<div class="bp-code${cls} is-look${lang === 'html' || lang === 'markdown' ? ' is-wrap' : ''}" data-lang="${lang}">${top}<div class="bp-code-lines" aria-hidden="true"></div><div class="bp-code-edit"><div class="bp-code-band"></div><div class="bp-code-sel"></div><textarea spellcheck="false" aria-label="${label}" ${attrs} placeholder="${placeholder}">${esc(value || '').replace(/"/g, '&quot;')}</textarea><div class="bp-code-hl" aria-hidden="true"></div></div></div>`;

// The number column grows with the digits; the fold column beside it stays.
export const gutterWidth = (lines) => Math.max(20, 9 + String(lines).length * 8.43) + 10.4 + 1;
