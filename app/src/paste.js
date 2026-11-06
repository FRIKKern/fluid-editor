// Paste cleanup (E5), the rules the oracle's text editor applies (parity/findings/PASTE.json):
//   blocks   p, div -> <p>; h1-h4 stay; h5, h6 -> <p>; ul/ol -> data-rte-list="default" with
//            li > p; blockquote -> blockquote > p; pre -> pre > code (whitespace kept);
//            a table -> one <p> with the cell text run together
//   inline   b, strong -> <strong>; i, em -> <em>; u stays; s, strike, del -> line-through span;
//            a keeps target and href only; br stays; mark gets the editor's highlight style;
//            img is dropped; every other tag (span, font, code, sup, sub, o:p) keeps only its text
//   text     inline styles, classes and alignment are dropped; runs of white space collapse
//   plain    one <p> per line; empty lines are dropped

const STRIKE = 'text-decoration: line-through;';
const MARK = 'background: #7676764D; padding: 3px 0px; margin: -3px 0px; color: inherit;';
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'TABLE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER']);

function inline(doc, node, out) {
  if (node.nodeType === 3) { out.push(doc.createTextNode(node.textContent.replace(/\s+/g, ' '))); return; }
  if (node.nodeType !== 1) return;
  const tag = node.tagName.toUpperCase();
  const kids = () => { const a = []; for (const c of node.childNodes) inline(doc, c, a); return a; };
  const wrap = (el) => { el.append(...kids()); out.push(el); };
  if (tag === 'B' || tag === 'STRONG') return wrap(doc.createElement('strong'));
  if (tag === 'I' || tag === 'EM') return wrap(doc.createElement('em'));
  if (tag === 'U') return wrap(doc.createElement('u'));
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') { const s = doc.createElement('span'); s.setAttribute('style', STRIKE); return wrap(s); }
  if (tag === 'MARK') { const m = doc.createElement('mark'); m.setAttribute('style', MARK); return wrap(m); }
  if (tag === 'A') {
    const a = doc.createElement('a');
    if (node.getAttribute('target')) a.setAttribute('target', node.getAttribute('target'));
    if (node.getAttribute('href')) a.setAttribute('href', node.getAttribute('href'));
    return wrap(a);
  }
  if (tag === 'BR') { out.push(doc.createElement('br')); return; }
  if (tag === 'IMG' || tag === 'SCRIPT' || tag === 'STYLE') return;
  out.push(...kids());
}

// Trim a block's edges and drop the space left where two spaces met across tags.
function tidy(el) {
  el.normalize();
  const texts = [];
  const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) texts.push(c); else walk(c); } };
  walk(el);
  for (const t of texts) t.textContent = t.textContent.replace(/ {2,}/g, ' ');
  let prevSpace = true;
  for (const t of texts) {
    let v = t.textContent;
    if (prevSpace) v = v.replace(/^ /, '');
    t.textContent = v;
    if (v) prevSpace = v.endsWith(' ');
  }
  for (let k = texts.length - 1; k >= 0; k--) { const t = texts[k]; if (!t.textContent) continue; t.textContent = t.textContent.replace(/ $/, ''); break; }
  return el;
}

function block(doc, tag, nodes) {
  const el = doc.createElement(tag);
  el.append(...nodes);
  return tidy(el);
}

// Turn the children of `root` into a list of top-level blocks.
function blocks(doc, root) {
  const out = [];
  let loose = [];
  const flush = () => { if (loose.length) { const p = block(doc, 'p', loose); if (p.textContent.trim() || p.querySelector('br')) out.push(p); loose = []; } };
  for (const node of root.childNodes) {
    const tag = node.nodeType === 1 ? node.tagName.toUpperCase() : '';
    if (!BLOCK_TAGS.has(tag)) { inline(doc, node, loose); continue; }
    flush();
    if (/^H[1-4]$/.test(tag)) { const a = []; for (const c of node.childNodes) inline(doc, c, a); out.push(block(doc, tag.toLowerCase(), a)); continue; }
    if (tag === 'PRE') { const pre = doc.createElement('pre'); const code = doc.createElement('code'); code.textContent = node.textContent; pre.append(code); out.push(pre); continue; }
    if (tag === 'TABLE') { out.push(block(doc, 'p', [doc.createTextNode(node.textContent.replace(/\s+/g, ' ').trim())])); continue; }
    if (tag === 'UL' || tag === 'OL') {
      const list = doc.createElement(tag.toLowerCase());
      list.setAttribute('data-rte-list', 'default');
      for (const li of node.children) {
        const item = doc.createElement('li');
        const inner = blocks(doc, li);
        item.append(...(inner.length ? inner : [block(doc, 'p', [])]));
        list.append(item);
      }
      out.push(list);
      continue;
    }
    if (tag === 'BLOCKQUOTE') { const q = doc.createElement('blockquote'); q.append(...blocks(doc, node)); out.push(q); continue; }
    const inner = [...node.childNodes].some((c) => c.nodeType === 1 && BLOCK_TAGS.has(c.tagName.toUpperCase()));
    if (inner) { out.push(...blocks(doc, node)); continue; }
    const a = []; for (const c of node.childNodes) inline(doc, c, a);
    const p = block(doc, 'p', a);
    out.push(p);
  }
  flush();
  return out;
}

// The cleaned blocks for a paste: HTML when the clipboard has it, else plain text.
export function cleanPaste(doc, html, text) {
  if (html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return blocks(doc, parsed.body);
  }
  return String(text || '').split(/\r?\n/).filter((line) => line.trim()).map((line) => block(doc, 'p', [doc.createTextNode(line.replace(/\s+/g, ' '))]));
}

// Insert the cleaned blocks at the selection. Measured on the oracle for a paste over the whole
// content and into a paragraph or heading; other content goes after the block.
const insideParagraph = (range, root) => {
  const at = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const p = at.closest('p, h1, h2, h3, h4');
  return p && root.contains(p) ? p : null;
};
// A paste into a paragraph (PASTESPLIT.json) or a heading (CAP-E5HEAD.json): the first block loses its
// type and joins the text before the caret, for a list that is its first item. The last block keeps its
// type and takes the text after the caret. Blocks between stay whole. The caret ends right after the
// pasted text.
const textHome = (block) => {
  if (!block.matches('ul, ol')) return block;
  const li = block.lastElementChild;
  return li.querySelector(':scope > p') || li;
};
function splitInto(doc, para, range, nodes, sel) {
  const tail = doc.createRange();
  tail.selectNodeContents(para);
  tail.setStart(range.startContainer, range.startOffset);
  const rest = [...tail.extractContents().childNodes];
  const blocks = [...nodes];
  const first = blocks[0];
  let joins;
  if (first.matches('ul, ol')) {
    const li = first.firstElementChild;
    joins = [...(li.querySelector(':scope > p') || li).childNodes];
    li.remove();
    if (!first.childElementCount) blocks.shift();
  } else {
    joins = [...first.childNodes];
    blocks.shift();
  }
  para.append(...joins);
  para.after(...blocks);
  const home = blocks.length ? textHome(blocks.at(-1)) : para;
  const at = home.childNodes.length;
  home.append(...rest);
  sel.collapse(home, at);
}
export function insertPaste(doc, root, sel, nodes) {
  if (!sel.rangeCount || !nodes.length) return;
  const range = sel.getRangeAt(0);
  const all = doc.createRange();
  all.selectNodeContents(root);
  const whole = range.compareBoundaryPoints(Range.START_TO_START, all) <= 0 && range.compareBoundaryPoints(Range.END_TO_END, all) >= 0;
  range.deleteContents();
  if (whole || !root.textContent.trim()) {
    root.replaceChildren(...nodes);
  } else if (insideParagraph(range, root) && nodes.every((n) => n.matches('p, h1, h2, h3, h4, ul, ol'))) {
    splitInto(doc, insideParagraph(range, root), range, nodes, sel);
    return;
  } else if (nodes.length === 1 && nodes[0].tagName === 'P') {
    const kids = [...nodes[0].childNodes];
    const frag = doc.createDocumentFragment();
    frag.append(...kids);
    range.insertNode(frag);
    if (kids.length) {
      range.setStartAfter(kids.at(-1));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  } else {
    let at = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    while (at.parentElement && at.parentElement !== root) at = at.parentElement;
    at.after(...nodes);
  }
  sel.collapse(root, root.childNodes.length);
}
