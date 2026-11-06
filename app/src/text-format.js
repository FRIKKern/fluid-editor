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

// A change that rebuilds blocks keeps the caret or selection on the same letters (CAP-E4SCORE.json).
function keepSelection(root, sel, change) {
  if (!sel.rangeCount) { change(); return; }
  const r = sel.getRangeAt(0);
  const blocks = () => [...root.querySelectorAll(TEXT_BLOCK)].filter((e) => !e.parentElement.closest('pre') && !e.querySelector(TEXT_BLOCK));
  const all = blocks();
  const touched = all.filter((b) => r.intersectsNode(b));
  const where = (node, off, end) => {
    const k = all.findIndex((b) => b.contains(node));
    if (k < 0) return touched.length ? (end ? [all.indexOf(touched.at(-1)), touched.at(-1).textContent.length] : [all.indexOf(touched[0]), 0]) : null;
    const q = root.ownerDocument.createRange();
    q.setStart(all[k], 0);
    q.setEnd(node, off);
    return [k, q.toString().length];
  };
  const from = where(r.startContainer, r.startOffset, false), to = where(r.endContainer, r.endOffset, true);
  change();
  if (!from || !to) return;
  const now = blocks();
  const spot = ([k, letters]) => {
    let left = letters;
    const walk = root.ownerDocument.createTreeWalker(now[k], 4);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) { if (left <= t.length) return [t, left]; left -= t.length; }
    return [now[k], 0];
  };
  sel.setBaseAndExtent(...spot(from), ...spot(to));
}

// Enter at the end of a heading gives a heading (CAP-E4SCORE.json). The browser makes a div there.
export function enterInHeading(doc, root, sel) {
  const at = sel.focusNode?.nodeType === 1 ? sel.focusNode : sel.focusNode?.parentElement;
  const div = at?.closest('div');
  const was = div && div !== root && root.contains(div) ? div.previousElementSibling : null;
  if (!was || !/^H[1-4]$/.test(was.tagName)) return;
  const next = was.cloneNode(false);
  next.append(...div.childNodes);
  div.replaceWith(next);
  sel.collapse(next, 0);
}

export function setStyle(doc, root, sel, style) {
  keepSelection(root, sel, () => { for (const el of selectedBlocks(root, sel)) retag(doc, el, style); });
}

// Marks.
const MARKS = {
  bold: { tag: 'strong', test: (e) => e.tagName === 'STRONG' },
  italic: { tag: 'em', test: (e) => e.tagName === 'EM' },
  strike: { tag: 'span', style: 'text-decoration: line-through;', test: (e) => e.tagName === 'SPAN' && /line-through/.test(e.getAttribute('style') || '') },
};

// With a caret and no selection (CAP-E4CARET.json), Bold and Italic act on all the text in the block,
// and take it off when all of it has the mark. An empty block stays as it is. Each text block is
// laid out again from its letters, so marks nest in one order and the caret keeps its place.
const textBlocks = (root) => [...root.querySelectorAll(TEXT_BLOCK)].filter((e) => e.tagName !== 'PRE' && !e.closest('pre') && !e.querySelector(TEXT_BLOCK));
const leavesOf = (block) => {
  const out = [];
  const walk = (n, marks) => { for (const c of n.childNodes) { if ((c.nodeType === 3 && c.length) || c.tagName === 'BR') out.push({ node: c, marks }); else if (c.nodeType === 1) walk(c, [...marks, c]); } };
  walk(block, []);
  return out;
};
// The nesting, outermost first (CAP-E4FRESH.json).
const OUTER_FIRST = [(e) => e.tagName === 'A', (e) => e.tagName === 'SPAN' && isColor(e), (e) => e.classList.contains('sqsrte-text-highlight'), (e) => e.tagName === 'STRONG', (e) => e.tagName === 'EM', (e) => MARKS.strike.test(e)];
const rank = (e) => { const k = OUTER_FIRST.findIndex((test) => test(e)); return k < 0 ? OUTER_FIRST.length : k; };
const sameMark = (a, b) => a.cloneNode(false).isEqualNode(b.cloneNode(false));
function layOut(block, marksFor) {
  const leaves = leavesOf(block).map((l) => ({ node: l.node, marks: marksFor(l).sort((a, b) => rank(a) - rank(b)) }));
  block.replaceChildren();
  let open = [];
  for (const { node, marks } of leaves) {
    let keep = 0;
    while (keep < open.length && keep < marks.length && sameMark(open[keep], marks[keep])) keep++;
    open = open.slice(0, keep);
    let at = open.at(-1) || block;
    for (const m of marks.slice(keep)) { const el = m.cloneNode(false); at.append(el); open.push(el); at = el; }
    if (node.nodeType === 3 && at.lastChild?.nodeType === 3) at.lastChild.appendData(node.data);
    else at.append(node);
  }
}
// A caret as [its text block's place, letters before it in that block]. Null when it is in no text block.
export function caretPlace(root, sel) {
  if (!sel.rangeCount || !sel.isCollapsed) return null;
  const blocks = textBlocks(root);
  const k = blocks.findIndex((b) => b.contains(sel.anchorNode));
  if (k < 0) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.setStart(blocks[k], 0);
  return [k, r.toString().length];
}
function putCaret(root, sel, [k, letters]) {
  const block = textBlocks(root)[k];
  let left = letters;
  for (const { node } of leavesOf(block)) {
    if (node.nodeType !== 3) continue;
    if (left <= node.length) { sel.collapse(node, left); return; }
    left -= node.length;
  }
  sel.collapse(block, 0);
}
// The text on the caret's left and on its right. At a mark's edge Bold and Italic count either side
// (CAP-E4FRESH2.json); Strike counts the left, or the right at the start of a line.
const beside = (root, place) => {
  if (!place) return [];
  const texts = leavesOf(textBlocks(root)[place[0]]).filter((l) => l.node.nodeType === 3);
  let at = 0;
  const out = [];
  for (const l of texts) {
    if (place[1] > at && place[1] <= at + l.node.length) out.push(l);
    if (place[1] >= at && place[1] < at + l.node.length) out.push(l);
    at += l.node.length;
  }
  return out;
};
const newMark = (root, m) => { const wrap = root.ownerDocument.createElement(m.tag); if (m.style) wrap.setAttribute('style', m.style); return wrap; };
const hasText = (blocks) => blocks.flatMap(leavesOf).some((l) => l.node.nodeType === 3);
export function toggleMarkOnAll(root, sel, name) {
  const m = MARKS[name];
  const blocks = textBlocks(root);
  if (!hasText(blocks)) return false;
  const place = caretPlace(root, sel);
  const off = beside(root, place).some((l) => l.marks.some(m.test));
  const wrap = newMark(root, m);
  for (const b of blocks) layOut(b, (l) => (off || l.node.nodeType !== 3 ? l.marks.filter((e) => !m.test(e)) : l.marks.some(m.test) ? [...l.marks] : [...l.marks, wrap]));
  if (place) putCaret(root, sel, place);
  return true;
}
// A selection: the letters in it, split out of their text, in each text block it touches.
function selectedLetters(root, sel) {
  const range = sel.getRangeAt(0);
  const letters = (b, node, off) => { const r = root.ownerDocument.createRange(); r.setStart(b, 0); r.setEnd(node, off); return r.toString().length; };
  const parts = [];
  textBlocks(root).forEach((b, k) => {
    if (!range.intersectsNode(b)) return;
    const from = b.contains(range.startContainer) ? letters(b, range.startContainer, range.startOffset) : 0;
    const to = b.contains(range.endContainer) ? letters(b, range.endContainer, range.endOffset) : b.textContent.length;
    if (from < to) parts.push({ block: b, k, from, to });
  });
  for (const p of parts) {
    p.nodes = new Set();
    let at = 0;
    for (const { node } of leavesOf(p.block)) {
      if (node.nodeType !== 3) continue;
      let t = node, start = at;
      at += node.length;
      if (p.from > start && p.from < at) { t = t.splitText(p.from - start); start = p.from; }
      if (p.to > start && p.to < at) t.splitText(p.to - start);
      if (start >= p.from && start < p.to) p.nodes.add(t);
    }
  }
  return parts;
}
function putSelection(root, sel, parts) {
  const first = parts[0], last = parts.at(-1);
  const spot = (block, letters, end) => { let left = letters; for (const { node } of leavesOf(block)) { if (node.nodeType !== 3) continue; if (end ? left <= node.length : left < node.length) return [node, left]; left -= node.length; } return [block, 0]; };
  sel.setBaseAndExtent(...spot(first.block, first.from, false), ...spot(last.block, last.to, true));
}
// Each selected letter's marks through `change`, the selection kept.
function changeSelected(root, sel, parts, change) {
  for (const p of parts) layOut(p.block, (l) => (p.nodes.has(l.node) ? change(l.marks) : [...l.marks]));
  putSelection(root, sel, parts);
}
// A selection takes the mark, or loses it when all its letters have it.
export function toggleMark(root, sel, name) {
  const m = MARKS[name];
  if (!sel.rangeCount) return false;
  if (sel.isCollapsed) return toggleMarkOnAll(root, sel, name);
  const parts = selectedLetters(root, sel);
  if (!parts.length) return false;
  const off = parts.every((p) => leavesOf(p.block).filter((l) => p.nodes.has(l.node)).every((l) => l.marks.some(m.test)));
  const wrap = newMark(root, m);
  changeSelected(root, sel, parts, (marks) => (off ? marks.filter((e) => !m.test(e)) : marks.some(m.test) ? [...marks] : [...marks, wrap]));
  return true;
}
// Strike with a caret changes no text: the letters typed next are struck, or not struck when the
// caret is in struck text (CAP-E4CARET.json).
export const caretInMark = (root, sel, name) => !!beside(root, caretPlace(root, sel))[0]?.marks.some(MARKS[name].test);
// A color with a caret goes on all the text in the block, over any other color. Nothing in an empty block.
// A selection takes it on its letters. Over paragraphs, each gets its own.
function setColor(root, sel, cls, style) {
  if (!sel.rangeCount) return false;
  const wrap = root.ownerDocument.createElement('span');
  wrap.className = cls;
  if (style) wrap.setAttribute('style', style);
  const other = (marks) => marks.filter((e) => !(e.tagName === 'SPAN' && isColor(e)));
  if (!sel.isCollapsed) {
    const parts = selectedLetters(root, sel);
    if (!parts.length) return false;
    changeSelected(root, sel, parts, (marks) => [...other(marks), wrap]);
    return true;
  }
  const blocks = textBlocks(root);
  if (!hasText(blocks)) return false;
  const place = caretPlace(root, sel);
  for (const b of blocks) layOut(b, (l) => (l.node.nodeType === 3 ? [...other(l.marks), wrap] : [...l.marks]));
  if (place) putCaret(root, sel, place);
  return true;
}
export function markTyped(root, sel, count, name, on) {
  const place = caretPlace(root, sel);
  const t = sel.anchorNode;
  if (!place || t?.nodeType !== 3 || sel.anchorOffset < count) return;
  const typed = t.splitText(sel.anchorOffset - count);
  typed.splitText(count);
  const m = MARKS[name];
  const wrap = root.ownerDocument.createElement(m.tag);
  if (m.style) wrap.setAttribute('style', m.style);
  layOut(textBlocks(root)[place[0]], (l) => (l.node !== typed ? [...l.marks] : on ? [...l.marks, wrap] : l.marks.filter((e) => !m.test(e))));
  putCaret(root, sel, place);
}

// Scaled Text (E4, parity/findings/TEXTOPS.json): the paragraph at the selection goes into
// <div class="sqsrte-scaled-text-container loaded"><span class="sqsrte-scaled-text"
// style="font-size: Npx;">, N sized so the text fits the block width on one line (8.5px for the
// probed paragraph). Applying it again inside the container takes the paragraph back out.
export function toggleScaled(doc, root, sel) {
  const [el] = selectedBlocks(root, sel);
  if (!el) return false;
  const box = el.closest('.sqsrte-scaled-text-container');
  if (box) { box.replaceWith(...box.querySelector('.sqsrte-scaled-text').childNodes); return true; }
  const W = doc.defaultView;
  const width = root.getBoundingClientRect().width;
  const probe = doc.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-99999px;top:0';
  probe.style.font = W.getComputedStyle(el).font;
  probe.textContent = el.textContent;
  doc.body.append(probe);
  const natural = probe.getBoundingClientRect().width;
  const size = parseFloat(W.getComputedStyle(el).fontSize);
  probe.remove();
  const fit = natural ? Math.floor((size * width / natural) * 10) / 10 : size;
  const div = doc.createElement('div');
  div.className = 'sqsrte-scaled-text-container loaded';
  const span = doc.createElement('span');
  span.className = 'sqsrte-scaled-text';
  span.setAttribute('style', `font-size: ${fit}px;`);
  el.replaceWith(div);
  span.append(el);
  div.append(span);
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
export const setTextColor = (root, sel, name) => setColor(root, sel, `sqsrte-text-color--${name}`);
// Custom tab: <span class="sqsrte-text-color--custom" style="color: #668040;">.
export const setCustomColor = (root, sel, hex) => setColor(root, sel, 'sqsrte-text-color--custom', `color: ${hex};`);
// A highlight at a paragraph's end is followed by a <br> (CAP-E4FRESH3.json).
export function addHighlight(doc, root, sel) {
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const el = doc.createElement('span');
  el.className = 'sqsrte-text-highlight';
  el.setAttribute('data-text-attribute-id', (doc.defaultView.crypto || crypto).randomUUID());
  wrapRange(doc, sel, el);
  if (!el.nextSibling?.length && !el.nextSibling?.nextSibling) { el.nextSibling?.remove(); el.after(doc.createElement('br')); }
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
  // A selection across paragraphs gets one link per paragraph (parity/findings/CAP-LINK.json).
  const blocks = [...root.querySelectorAll(TEXT_BLOCK)].filter((e) => range.intersectsNode(e) && !e.querySelector(TEXT_BLOCK));
  const parts = blocks.length > 1 ? blocks.map((e) => {
    const r = doc.createRange();
    r.selectNodeContents(e);
    if (e.contains(range.startContainer)) r.setStart(range.startContainer, range.startOffset);
    if (e.contains(range.endContainer)) r.setEnd(range.endContainer, range.endOffset);
    return r;
  }) : [range];
  const wraps = parts.filter((r) => !r.collapsed).map((r) => {
    const wrap = doc.createElement('a');
    wrap.setAttribute('href', href);
    wrap.append(r.extractContents());
    r.insertNode(wrap);
    return wrap;
  });
  range.setStart(wraps[0], 0);
  range.setEnd(wraps[wraps.length - 1], wraps[wraps.length - 1].childNodes.length);
  sel.removeAllRanges();
  sel.addRange(range.cloneRange());
  return true;
}

// Open link in new tab (parity/findings/CAP-LINK.json, LINKBOX.json): <a target="_blank" href="...">,
// target first and no rel. Returns whether any link changed.
export function setLinkTarget(root, range, on) {
  let changed = false;
  for (const a of root.querySelectorAll('a')) {
    if (!range.intersectsNode(a) || (a.getAttribute('target') === '_blank') === on) continue;
    const href = a.getAttribute('href');
    a.removeAttribute('href');
    if (on) a.setAttribute('target', '_blank'); else a.removeAttribute('target');
    a.setAttribute('href', href);
    changed = true;
  }
  return changed;
}

// Quote and lists wrap each selected block; applying the same again unwraps it.
// Paragraphs side by side go into one list (CAP-E4LOOK.json) or one quote (CAP-E4SCORE.json). A list is
// changed once, and pressing its own kind takes it off.
export function toggleWrap(doc, root, sel, kind) {
  keepSelection(root, sel, () => {
    const done = new Set(), freed = new Set();
    for (const el of selectedBlocks(root, sel)) {
      if (freed.has(el)) continue;
      const last = el.previousElementSibling;
      if (kind === 'quote') {
        const q = el.closest('blockquote');
        if (q && root.contains(q)) { for (const c of q.children) freed.add(c); q.replaceWith(...q.childNodes); continue; }
        if (last && done.has(last)) { last.append(el); continue; }
        const nq = doc.createElement('blockquote');
        el.replaceWith(nq);
        nq.append(el);
        done.add(nq);
      } else {
        const tag = kind === 'bullet' ? 'UL' : 'OL';
        const li = el.parentElement.tagName === 'LI' ? el.parentElement : null;
        const list = li?.parentElement;
        if (list && done.has(list)) continue;
        if (li && list && list.tagName === tag) {
          for (const x of list.querySelectorAll(TEXT_BLOCK)) freed.add(x);
          list.replaceWith(...[...list.children].flatMap((x) => [...x.childNodes]));
          continue;
        }
        if (li && list) { const other = doc.createElement(tag); other.setAttribute('data-rte-list', 'default'); while (list.firstChild) other.append(list.firstChild); list.replaceWith(other); done.add(other); continue; }
        const nli = doc.createElement('li');
        if (last && done.has(last)) { el.remove(); nli.append(el); last.append(nli); continue; }
        const nl = doc.createElement(tag);
        nl.setAttribute('data-rte-list', 'default');
        el.replaceWith(nl);
        nli.append(el);
        nl.append(nli);
        done.add(nl);
      }
    }
  });
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

// Clear Formatting: nothing with a caret (CAP-E4FRESH2.json); a selection's letters lose all marks,
// links too, and the block keeps its style (CAP-E4FRESH3.json).
export function clearFormatting(root, sel) {
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const parts = selectedLetters(root, sel);
  if (!parts.length) return false;
  for (const p of parts) if (p.block.lastChild?.tagName === 'BR' && p.block.querySelector('.sqsrte-text-highlight')) p.block.lastChild.remove();
  changeSelected(root, sel, parts, () => []);
  return true;
}
