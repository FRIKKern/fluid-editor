// A Markdown reader of our own (parity/findings/CAP-T10MD.json): what the oracle's page holds for each
// kind of syntax. Raw HTML in it is untrusted, so no tag goes through as typed: each is read and written
// again from a short list of tags and attributes. Script and style go with what's in them.
const KEPT_TAGS = new Set('a abbr address article aside b bdi bdo big blockquote br caption center cite code col colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img ins kbd li main mark nav ol p pre q s samp section small span strike strong sub summary sup table tbody td tfoot th thead time tr tt u ul var wbr'.split(' '));
const KEPT_ATTR = /^(?:class|id|title|alt|href|src|width|height|align|colspan|rowspan|start|reversed|lang|dir|name|target|rel|style|role|tabindex|open|datetime|aria-[\w-]+|data-[\w-]+)$/;
const VOID = new Set(['br', 'col', 'hr', 'img', 'wbr']);
const DROPPED_WITH_CONTENT = /^(?:script|style)$/i;
const BLOCK_TAG = /^(?:address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|pre|script|section|source|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul)$/i;

const ENTITY = /^&(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});/i;
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function text(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '&' && ENTITY.test(s.slice(i, i + 40))) out += '&';
    else out += c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c;
  }
  return out;
}
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')' };
const decode = (s) => String(s).replace(/&(#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});?/gi, (m, e) => {
  if (e[0] !== '#') return NAMED[e.toLowerCase()] ?? m;
  const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
});
// A link goes where it says only on a plain web scheme or a relative path. A browser skips controls and
// spaces in a scheme, and entities come undone first, so both go before the look.
export function safeUrl(u) {
  const bare = decode(u).replace(/[\x00-\x20\x7f-\xa0\xad\u{200b}-\u{200f}\u{2028}\u{2029}\u{feff}]/gu, '');
  const scheme = bare.match(/^([^/?#:]*):/);
  return !scheme || /^(?:https?|mailto|tel)$/i.test(scheme[1]);
}

const ATTRS = /([^\s=/"'<>`]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
const TAG = /^<(\/?)([a-z][a-z\d-]*)((?:\s+[^\s=/"'<>`]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/i;
function tag(m) {
  const name = m[2].toLowerCase();
  if (!KEPT_TAGS.has(name)) return '';
  if (m[1]) return VOID.has(name) ? '' : `</${name}>`;
  let out = `<${name}`;
  for (const [, key, raw] of m[3].matchAll(ATTRS)) {
    const k = key.toLowerCase();
    if (!KEPT_ATTR.test(k) || k === 'data-preserve-html-node') continue;
    const v = raw === undefined ? '' : decode(raw.replace(/^["']|["']$/g, ''));
    if ((k === 'href' || k === 'src') && !safeUrl(v)) continue;
    out += raw === undefined ? ` ${k}=""` : ` ${k}="${attr(v)}"`;
  }
  return `${out} data-preserve-html-node="true">`;
}
// Past a script or style's closing tag, or the end when it has none.
function pastDropped(s, name) {
  const end = new RegExp(`</${name}\\s*>`, 'i').exec(s);
  return end ? end.index + end[0].length : s.length;
}
// Raw HTML as a whole, for a block of it. Comments are dropped too (ours: not read on the oracle).
function rawHtml(s, ctx) {
  let out = '';
  for (let i = 0; i < s.length;) {
    const rest = s.slice(i);
    if (rest.startsWith('<!--')) { const e = rest.indexOf('-->'); i += e < 0 ? rest.length : e + 3; continue; }
    if (/^<[!?]/.test(rest)) { const e = rest.indexOf('>'); i += e < 0 ? rest.length : e + 1; continue; }
    const m = rest.match(TAG);
    if (m) {
      if (!m[1] && DROPPED_WITH_CONTENT.test(m[2])) { if (/script/i.test(m[2])) ctx.onScript?.(); i += m[0].length + pastDropped(rest.slice(m[0].length), m[2]); out += ctx.scriptNote && /script/i.test(m[2]) ? ctx.scriptNote : ''; continue; }
      out += tag(m); i += m[0].length; continue;
    }
    const lt = rest.indexOf('<', 1), run = lt < 0 ? rest : rest.slice(0, lt);
    out += text(run); i += run.length;
  }
  return out;
}

const PUNCT = /[!-/:-@[-`{-~]/;
function inline(s, ctx) {
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i], rest = s.slice(i);
    if (c === '\\' && s[i + 1] === '\n') { out += '<br>'; i += 2; continue; }
    if (c === '\\' && PUNCT.test(s[i + 1] || '')) { out += text(s[i + 1] === '&' ? '&amp;' : s[i + 1]); i += 2; continue; }
    if (c === '`') {
      const run = rest.match(/^`+/)[0], end = rest.slice(run.length).search(new RegExp(`(?<!\`)${run}(?!\`)`));
      if (end >= 0) { const body = rest.slice(run.length, run.length + end).replace(/\n/g, ' '); out += `<code>${code(/^ .* $/.test(body) && body.trim() ? body.slice(1, -1) : body)}</code>`; i += run.length * 2 + end; continue; }
      out += run; i += run.length; continue;
    }
    if (c === '<') {
      const t = rest.match(TAG);
      if (t) {
        if (!t[1] && DROPPED_WITH_CONTENT.test(t[2])) { if (/script/i.test(t[2])) ctx.onScript?.(); i += t[0].length + pastDropped(rest.slice(t[0].length), t[2]); out += ctx.scriptNote && /script/i.test(t[2]) ? ctx.scriptNote : ''; continue; }
        out += tag(t); i += t[0].length; continue;
      }
      // Anything else that looks like a tag: the oracle's reader marks it as one and then shows it as text.
      const like = rest.match(/^<([a-z][^\s<>]*)>/i);
      if (like) { out += `&lt;${inline(like[1], ctx)} data-preserve-html-node="true"&gt;`; i += like[0].length; continue; }
      const comment = rest.match(/^<!--[\s\S]*?-->/);
      if (comment) { i += comment[0].length; continue; }
      out += '&lt;'; i++; continue;
    }
    if (c === '!' && s[i + 1] === '[') {
      const l = link(s, i + 1, ctx);
      if (l) { if (safeUrl(l.href)) out += `<img src="${attr(decode(l.href))}" alt="${attr(decode(l.text))}"${l.title == null ? '' : ` title="${attr(decode(l.title))}"`}>`; else out += text(l.text); i = l.end; continue; }
    }
    if (c === '[') {
      const l = link(s, i, ctx);
      if (l) { const inner = inline(l.text, ctx); out += safeUrl(l.href) ? `<a href="${attr(decode(l.href))}"${l.title == null ? '' : ` title="${attr(decode(l.title))}"`}>${inner}</a>` : inner; i = l.end; continue; }
    }
    if (c === '*' || c === '_' || c === '~') {
      const e = emphasis(s, i, ctx);
      if (e) { out += e.html; i = e.end; continue; }
      const run = rest.match(/^(\*+|_+|~+)/)[0]; out += run; i += run.length; continue;
    }
    if (c === '\n') { out = out.replace(/ {2,}$/, '<br>').replace(/ $/, '') ; out += out.endsWith('<br>') ? '' : '\n'; i++; while (s[i] === ' ') i++; continue; }
    const before = s[i - 1] || ' ';
    if (!/[\w.+-]/.test(before)) {
      const url = rest.match(/^(?:https?:\/\/|www\.)[^\s<]+/i), mail = rest.match(/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
      if (url) { const u = url[0].replace(/[.,:;!?"'*_~]+$/, '').replace(/\)+$/, (p) => (url[0].split('(').length > 1 ? p : '')); out += `<a href="${attr(/^www/i.test(u) ? `http://${u}` : u)}">${text(u)}</a>`; i += u.length; continue; }
      if (mail) { out += `<a href="mailto:${attr(mail[0])}">${text(mail[0])}</a>`; i += mail[0].length; continue; }
    }
    const next = rest.slice(1).search(/[\\`<![*_~\n]|[\w.+-]*@|https?:|www\./);
    const run = next < 0 ? rest : rest.slice(0, next + 1);
    out += text(run); i += run.length;
  }
  return out;
}
// A closing run for the opening run at i: skips escapes and code, and longer or shorter runs of the mark.
function closer(s, from, mark, n) {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '`') { const run = s.slice(i).match(/^`+/)[0], end = s.indexOf(run, i + run.length); if (end > 0) { i = end + run.length - 1; continue; } i += run.length - 1; continue; }
    if (s[i] !== mark) continue;
    const run = s.slice(i).match(mark === '*' ? /^\*+/ : mark === '_' ? /^_+/ : /^~+/)[0];
    const ok = !/\s/.test(s[i - 1]) && (mark !== '_' || !/\w/.test(s[i + run.length] || ' '));
    if (ok && run.length >= n && (run.length === n || !closerExact(s, i + run.length, mark, n))) return i + run.length - n;
    i += run.length - 1;
  }
  return -1;
}
// Is there a run of just n further on? Then this longer run isn't the closer: *a **b** c*.
const closerExact = (s, from, mark, n) => { for (let i = from; i < s.length; i++) { if (s[i] === '\n' && s[i + 1] === '\n') return false; if (s[i] === mark) { const run = s.slice(i).match(mark === '*' ? /^\*+/ : mark === '_' ? /^_+/ : /^~+/)[0]; if (run.length === n) return true; i += run.length - 1; } } return false; };
function emphasis(s, i, ctx) {
  const mark = s[i], run = s.slice(i).match(mark === '*' ? /^\*+/ : mark === '_' ? /^_+/ : /^~+/)[0], after = s[i + run.length];
  if (!after || /\s/.test(after)) return null;
  if (mark === '_' && /\w/.test(s[i - 1] || ' ')) return null;
  if (mark === '~') {
    if (run.length > 2) return null;
    const end = closer(s, i + run.length, '~', run.length);
    return end < 0 ? null : { html: `<del>${inline(s.slice(i + run.length, end), ctx)}</del>`, end: end + run.length };
  }
  for (const n of [Math.min(run.length, 3), 2, 1]) {
    if (n > run.length) continue;
    const end = closer(s, i + n, mark, n);
    if (end < 0) continue;
    const inner = s.slice(i + n, end), head = run.slice(n);
    const body = inline(inner, ctx);
    const html = n === 3 ? `<em><strong>${body}</strong></em>` : n === 2 ? `<strong>${body}</strong>` : `<em>${body}</em>`;
    return { html: head + html, end: end + n };
  }
  return null;
}
// [text](dest "title"), [text][ref], [text][] or [text], from the [ at i.
function link(s, i, ctx) {
  let depth = 0, j = i;
  for (; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === '[') depth++;
    if (s[j] === ']' && --depth === 0) break;
  }
  if (j >= s.length) return null;
  const label = s.slice(i + 1, j), rest = s.slice(j + 1);
  const m = rest.match(/^\(\s*(<[^<>\n]*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*)(?:\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?\s*\)/);
  if (m) return { text: label, href: m[1].replace(/^<|>$/g, '').replace(/\\(.)/g, '$1'), title: m[2] ? m[2].slice(1, -1).replace(/\\(.)/g, '$1') : null, end: j + 1 + m[0].length };
  const r = rest.match(/^\[([^\]]*)\]/), key = (r && r[1] ? r[1] : label).toLowerCase().replace(/\s+/g, ' ').trim(), def = ctx.refs.get(key);
  return def ? { text: label, href: def.href, title: def.title, end: j + 1 + (r ? r[0].length : 0) } : null;
}

const HR = /^ {0,3}([-*_])(?: *\1){2,} *$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})[ ]*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ ]+(.*?))??(?:[ ]+#+)?[ ]*$/;
const QUOTE = /^ {0,3}>/;
const ITEM = /^( {0,3})([-+*]|\d{1,9}[.)])( +|$)/;
const SETEXT = /^ {0,3}(=+|-+) *$/;
const DELIM = /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/;
const REF = /^ {0,3}\[([^\]]+)\]:[ ]*(<[^<>]*>|\S+)(?:[ ]+("[^"]*"|'[^']*'|\([^)]*\)))?[ ]*$/;
const HTML_START = /^ {0,3}<(?:!--|\/?([a-z][a-z\d-]*)(?=[\s/>]|$))/i;
const htmlBlock = (line) => {
  const m = line.match(HTML_START);
  if (!m) return false;
  if (!m[1] || BLOCK_TAG.test(m[1])) return true;
  return TAG.test(line.trim()) && line.trim().match(TAG)[0].length === line.trim().length; // a tag alone on its line
};
const splitRow = (line) => {
  const parts = [];
  let cur = '';
  const s = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; } else if (s[i] === '|') { parts.push(cur.trim()); cur = ''; } else cur += s[i];
  }
  parts.push(cur.trim());
  return parts;
};
const isTable = (lines, i) => lines[i].includes('|') && i + 1 < lines.length && DELIM.test(lines[i + 1]) && lines[i + 1].includes('-') && splitRow(lines[i]).length === splitRow(lines[i + 1]).length;
const startsBlock = (line) => HEADING.test(line) || FENCE.test(line) || HR.test(line) || QUOTE.test(line) || htmlBlock(line);

// Every block ends in a new line, as the oracle's Code block keeps them. Tight is a list item's: no <p>.
function blocks(lines, ctx, tight = false) {
  const out = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^ {4}/.test(line)) {
      const body = [];
      while (i < lines.length && (/^ {4}/.test(lines[i]) || !lines[i].trim())) body.push(lines[i++].slice(4));
      while (body.length && !body.at(-1).trim()) body.pop();
      out.push(`<pre><code>${code(body.join('\n'))}\n</code></pre>\n`);
      continue;
    }
    const fence = line.match(FENCE);
    if (fence) {
      const close = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},} *$`), body = [];
      for (i++; i < lines.length && !close.test(lines[i]); i++) body.push(lines[i]);
      i++;
      out.push(`<pre><code${fence[2] ? ` class="language-${attr(fence[2])}"` : ''}>${body.length ? `${code(body.join('\n'))}\n` : ''}</code></pre>\n`);
      continue;
    }
    const h = HR.test(line) ? null : line.match(HEADING);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2] || '', ctx)}</h${h[1].length}>\n`); i++; continue; }
    if (HR.test(line)) { out.push('<hr>\n'); i++; continue; }
    if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && lines[i].trim() && (QUOTE.test(lines[i]) || !startsBlock(lines[i]))) body.push(lines[i++].replace(/^ {0,3}> ?/, ''));
      out.push(`<blockquote>\n${blocks(body, ctx).join('')}</blockquote>\n`);
      continue;
    }
    const item = line.match(ITEM);
    if (item) { const l = list(lines, i, ctx); out.push(l.html); i = l.next; continue; }
    if (htmlBlock(line)) {
      const script = line.match(/^ {0,3}<(script|style|pre|textarea)\b/i), comment = /^ {0,3}<!--/.test(line), body = [];
      if (script || comment) {
        const end = script ? new RegExp(`</${script[1]}\\s*>`, 'i') : /-->/;
        for (; i < lines.length; i++) { body.push(lines[i]); if (end.test(lines[i])) { i++; break; } }
      } else while (i < lines.length && lines[i].trim()) body.push(lines[i++]);
      const html = rawHtml(body.join('\n'), ctx);
      if (html) out.push(`${html}\n`);
      continue;
    }
    if (isTable(lines, i)) {
      const heads = splitRow(lines[i]), aligns = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /^-+:$/.test(c) ? 'right' : /^:-+$/.test(c) ? 'left' : null));
      const cell = (t, v, k) => `<${t}${aligns[k] ? ` align="${aligns[k]}"` : ''}>${inline(v, ctx)}</${t}>\n`;
      let body = '';
      for (i += 2; i < lines.length && lines[i].trim() && !startsBlock(lines[i]); i++) {
        const row = splitRow(lines[i]);
        body += `<tr>\n${heads.map((_, k) => cell('td', row[k] ?? '', k)).join('')}</tr>\n`;
      }
      out.push(`<table>\n<thead>\n<tr>\n${heads.map((v, k) => cell('th', v, k)).join('')}</tr>\n</thead>\n${body ? `<tbody>${body}</tbody>` : ''}</table>\n`);
      continue;
    }
    const para = [line];
    for (i++; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim() || startsBlock(l) && !SETEXT.test(l) || isTable(lines, i)) break;
      if (SETEXT.test(l)) break;
      const it = l.match(ITEM);
      if (it && it[3] && (!/\d/.test(it[2]) || parseInt(it[2], 10) === 1)) break;
      para.push(l);
    }
    const setext = i < lines.length ? lines[i].match(SETEXT) : null;
    const body = para.map((p, k) => (k ? p.replace(/^ +/, '') : p.replace(/^ {0,3}/, ''))).join('\n').replace(/\s+$/, '');
    if (setext) { const n = setext[1][0] === '=' ? 1 : 2; out.push(`<h${n}>${inline(body, ctx)}</h${n}>\n`); i++; continue; }
    out.push(tight ? `${inline(body, ctx)}` : `<p>${inline(body, ctx)}</p>\n`);
  }
  return out;
}
function list(lines, start, ctx) {
  const first = lines[start].match(ITEM), ordered = /\d/.test(first[2]), mark = ordered ? first[2].at(-1) : first[2];
  const same = (m) => m && (ordered ? /\d/.test(m[2]) && m[2].at(-1) === mark : m[2] === mark);
  const items = [];
  let i = start, loose = false;
  while (i < lines.length) {
    const m = lines[i].match(ITEM);
    if (!same(m) || HR.test(lines[i])) break;
    const pad = m[3].length > 4 || !m[3].length ? 1 : m[3].length, indent = m[1].length + m[2].length + pad, body = [lines[i].slice(indent)];
    for (i++; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim()) {
        let n = i + 1;
        while (n < lines.length && !lines[n].trim()) n++;
        if (n < lines.length && lines[n].match(/^ */)[0].length >= indent) { body.push(''); continue; }
        break;
      }
      if (l.match(/^ */)[0].length >= indent) { body.push(l.slice(indent)); continue; }
      if (ITEM.test(l) || startsBlock(l)) break;
      if (!body.at(-1).trim()) break;
      body.push(l.trim());
    }
    const next = i;
    let k = next;
    while (k < lines.length && !lines[k].trim()) k++;
    if (k > next && k < lines.length && same(lines[k].match(ITEM))) { loose = true; i = k; }
    items.push(body);
    if (body.some((l, n) => !l.trim() && n < body.length - 1)) loose = true;
  }
  let html = '';
  for (const body of items) {
    const t = body.slice();
    const task = t[0].match(/^\[([ xX])\] +(.*)$/);
    const box = task ? `<input${/x/i.test(task[1]) ? ' checked=""' : ''} disabled="" type="checkbox"> ` : '';
    if (task) t[0] = task[2];
    const inner = loose ? blocks(t, ctx) : blocks(t, ctx, true);
    if (box && inner.length) inner[0] = loose ? inner[0].replace(/^<p>/, `<p>${box}`) : box + inner[0];
    else if (box) inner.push(box);
    html += `<li>${inner.join('')}</li>\n`;
  }
  const n = ordered ? parseInt(first[2], 10) : 1;
  const tagName = ordered ? 'ol' : 'ul';
  return { html: `<${tagName}${ordered && n !== 1 ? ` start="${n}"` : ''}>\n${html}</${tagName}>\n`, next: i };
}

// The blocks, each ending in a new line. Options: scriptNote is written where a script was, onScript is told of one.
export function markdownParts(source, opts = {}) {
  const refs = new Map(), lines = [];
  let fence = null;
  for (const raw of String(source).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    const f = raw.match(FENCE);
    if (fence) { if (f && f[1][0] === fence && !f[2]) fence = null; lines.push(raw); continue; }
    if (f) { fence = f[1][0]; lines.push(raw); continue; }
    const r = raw.match(REF);
    if (r && !/^ {4}/.test(raw)) { const key = r[1].toLowerCase().replace(/\s+/g, ' ').trim(); if (!refs.has(key)) refs.set(key, { href: r[2].replace(/^<|>$/g, ''), title: r[3] ? r[3].slice(1, -1) : null }); continue; }
    lines.push(raw);
  }
  return blocks(lines, { refs, ...opts });
}
// The Markdown block's page: no new lines between blocks. A script is dropped.
export const markdownHtml = (source) => markdownParts(source).map((p) => p.replace(/\n$/, '')).join('');
