// Text formatting (E4) inside a contenteditable text block. Each action makes the HTML the
// oracle's text toolbar makes (parity/findings/TEXTOPS.json):
//   styles     Heading 1-4 <h1>-<h4>, Paragraph 1 <p class="sqsrte-large">, Paragraph 2 <p>,
//              Paragraph 3 <p class="sqsrte-small">, Monospace <pre><code>
//   marks      Bold <strong>, Italic <em>, Strike <span style="text-decoration: line-through;">
//   blocks     Quote <blockquote><p>, lists <ul|ol data-rte-list="default"><li><p>,
//              Indent data-indent="n" with margin-left n * 40px, alignment style="text-align: x"

export const STYLES = [
  ['Heading 1', 'h1'], ['Heading 2', 'h2'], ['Heading 3', 'h3'], ['Heading 4', 'h4'],
  ['Paragraph 1', 'p.sqsrte-large'], ['Paragraph 2', 'p'], ['Paragraph 3', 'p.sqsrte-small'], ['Monospace', 'pre'],
];
const TEXT_BLOCK = 'h1, h2, h3, h4, p, pre';

// The text blocks (h1-h4, p, pre) the selection touches, in document order.
function selectedBlocks(root, sel) {
  if (!sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  const all = [...root.querySelectorAll(TEXT_BLOCK)].filter((e) => !e.parentElement.closest('pre'));
  const hit = all.filter((e) => range.intersectsNode(e));
  if (hit.length) return hit;
  const at = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement).closest(TEXT_BLOCK);
  return at && root.contains(at) ? [at] : [];
}

const styleOf = (el) => (el.tagName === 'PRE' ? 'pre' : el.tagName === 'P' ? (el.classList.contains('sqsrte-large') ? 'p.sqsrte-large' : el.classList.contains('sqsrte-small') ? 'p.sqsrte-small' : 'p') : el.tagName.toLowerCase());

export function currentStyle(root, sel) {
  const b = selectedBlocks(root, sel)[0];
  return b ? styleOf(b) : 'p';
}

function retag(doc, el, style) {
  const [tag, cls] = style.split('.');
  const next = doc.createElement(tag);
  for (const a of el.attributes) if (a.name !== 'class') next.setAttribute(a.name, a.value);
  if (cls) next.className = cls;
  const inner = el.tagName === 'PRE' ? (el.querySelector('code') || el) : el;
  if (tag === 'pre') {
    const code = doc.createElement('code');
    code.textContent = inner.textContent;
    next.append(code);
  } else {
    while (inner.firstChild) next.append(inner.firstChild);
  }
  el.replaceWith(next);
  return next;
}

export function setStyle(doc, root, sel, style) {
  for (const el of selectedBlocks(root, sel)) retag(doc, el, style);
}

// Marks. A mark toggles off when the whole selection already sits inside it.
const MARKS = {
  bold: { tag: 'strong', test: (e) => e.tagName === 'STRONG' },
  italic: { tag: 'em', test: (e) => e.tagName === 'EM' },
  strike: { tag: 'span', style: 'text-decoration: line-through;', test: (e) => e.tagName === 'SPAN' && /line-through/.test(e.getAttribute('style') || '') },
};

export function toggleMark(doc, root, sel, name) {
  const m = MARKS[name];
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  let inside = start;
  while (inside && inside !== root && !m.test(inside)) inside = inside.parentElement;
  if (inside && inside !== root && inside.contains(range.endContainer)) {
    const parent = inside.parentNode;
    while (inside.firstChild) parent.insertBefore(inside.firstChild, inside);
    inside.remove();
    parent.normalize();
    return true;
  }
  const wrap = doc.createElement(m.tag);
  if (m.style) wrap.setAttribute('style', m.style);
  wrap.append(range.extractContents());
  range.insertNode(wrap);
  sel.removeAllRanges();
  const r = doc.createRange();
  r.selectNodeContents(wrap);
  sel.addRange(r);
  return true;
}

// Text Color and Text Highlight (E4, parity/findings/TEXTCOLOR.json). A palette color wraps
// the selection in <span class="sqsrte-text-color--NAME">; inside such a span the class
// changes. Highlight wraps it in <span class="sqsrte-text-highlight" data-text-attribute-id>
// with a new id each time.
export const TEXT_COLORS = [['Lightest', 'white', 'rgb(255, 255, 255)'], ['Light', 'lightAccent', 'rgb(255, 207, 90)'], ['Bright', 'accent', 'rgb(242, 184, 180)'], ['Dark', 'darkAccent', 'rgb(181, 100, 247)'], ['Darkest', 'black', 'rgb(0, 0, 0)']];
const spanWith = (root, range, test) => {
  let n = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  while (n && n !== root && !(n.tagName === 'SPAN' && test(n))) n = n.parentElement;
  return n && n !== root && n.contains(range.endContainer) ? n : null;
};
const isColor = (e) => [...e.classList].some((c) => c.startsWith('sqsrte-text-color--'));
export function currentTextColor(root, sel) {
  if (!sel.rangeCount) return null;
  const sp = spanWith(root, sel.getRangeAt(0), isColor);
  return sp ? [...sp.classList].find((c) => c.startsWith('sqsrte-text-color--')).slice(19) : null;
}
function wrapRange(doc, sel, el) {
  const range = sel.getRangeAt(0);
  el.append(range.extractContents());
  range.insertNode(el);
  sel.removeAllRanges();
  const r = doc.createRange();
  r.selectNodeContents(el);
  sel.addRange(r);
}
export function setTextColor(doc, root, sel, name) {
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const sp = spanWith(root, sel.getRangeAt(0), isColor);
  if (sp) { sp.className = `sqsrte-text-color--${name}`; return true; }
  const el = doc.createElement('span');
  el.className = `sqsrte-text-color--${name}`;
  wrapRange(doc, sel, el);
  return true;
}
export function addHighlight(doc, root, sel) {
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const el = doc.createElement('span');
  el.className = 'sqsrte-text-highlight';
  el.setAttribute('data-text-attribute-id', (doc.defaultView.crypto || crypto).randomUUID());
  wrapRange(doc, sel, el);
  return true;
}

// Link (E7, parity/findings/TEXTLINK.json): the oracle wraps the selected text in
// <a href="..."> with no other attribute. Inside an existing link the href changes; an empty
// href removes the link. Returns false when there is nothing to link.
export function linkAt(root, range) {
  let n = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  while (n && n !== root && n.tagName !== 'A') n = n.parentElement;
  return n && n !== root ? n : null;
}
export function setLink(doc, root, sel, range, href) {
  const a = linkAt(root, range);
  if (a) {
    if (href) a.setAttribute('href', href);
    else { const parent = a.parentNode; while (a.firstChild) parent.insertBefore(a.firstChild, a); a.remove(); parent.normalize(); }
    return true;
  }
  if (!href || range.collapsed) return false;
  const wrap = doc.createElement('a');
  wrap.setAttribute('href', href);
  wrap.append(range.extractContents());
  range.insertNode(wrap);
  sel.removeAllRanges();
  const r = doc.createRange();
  r.selectNodeContents(wrap);
  sel.addRange(r);
  return true;
}

// Quote and lists wrap each selected block; applying the same again unwraps it.
export function toggleWrap(doc, root, sel, kind) {
  for (const el of selectedBlocks(root, sel)) {
    if (kind === 'quote') {
      const q = el.closest('blockquote');
      if (q && root.contains(q)) { q.replaceWith(...q.childNodes); continue; }
      const nq = doc.createElement('blockquote');
      el.replaceWith(nq);
      nq.append(el);
    } else {
      const tag = kind === 'bullet' ? 'UL' : 'OL';
      const li = el.parentElement.tagName === 'LI' ? el.parentElement : null;
      const list = li?.parentElement;
      if (li && list && list.tagName === tag) {
        list.replaceWith(...[...list.children].flatMap((x) => [...x.childNodes]));
        continue;
      }
      if (li && list) { const other = doc.createElement(tag); other.setAttribute('data-rte-list', 'default'); while (list.firstChild) other.append(list.firstChild); list.replaceWith(other); continue; }
      const nl = doc.createElement(tag);
      nl.setAttribute('data-rte-list', 'default');
      const nli = doc.createElement('li');
      el.replaceWith(nl);
      nli.append(el);
      nl.append(nli);
    }
  }
}

// The oracle writes the formatting properties first and white-space last, with no trailing
// semicolon, after any data-indent attribute: style="margin-left: 40px; white-space: pre-wrap".
function setStyleProp(el, prop, value) {
  const props = { 'margin-left': el.style.marginLeft, 'text-align': el.style.textAlign, [prop]: value };
  const parts = Object.entries(props).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  el.removeAttribute('style');
  if (parts.length) el.setAttribute('style', [...parts, 'white-space: pre-wrap'].join('; '));
}

export function indent(root, sel, by) {
  for (const el of selectedBlocks(root, sel)) {
    const n = Math.max(0, Number(el.getAttribute('data-indent') || 0) + by);
    if (n) el.setAttribute('data-indent', String(n)); else el.removeAttribute('data-indent');
    setStyleProp(el, 'margin-left', n ? `${n * 40}px` : '');
  }
}

export function align(root, sel, how) {
  for (const el of selectedBlocks(root, sel)) setStyleProp(el, 'text-align', how === 'left' ? '' : how);
}

// Clear Formatting: ours removes the marks in the selected blocks (the oracle's result is not measured).
export function clearFormatting(root, sel) {
  for (const el of selectedBlocks(root, sel)) {
    for (const m of [...el.querySelectorAll('strong, em, span[style*="line-through"]')]) m.replaceWith(...m.childNodes);
    el.normalize();
  }
}
