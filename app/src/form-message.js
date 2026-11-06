// A form's Message box (T9, FORMFIELDS.json, postSubmit.messageBox): rich text on a short text bar,
// with the Text block's marks, styles and link menu. Bold and Italic at a caret act on all the text.
// Underline at a caret waits for the next letters, as Strike does in a Text block.
import * as fmt from './text-format.js';
import { messageBarHtml } from './text-bar.js';
import { cleanPaste, insertPaste } from './paste.js';

const KEEP = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'PRE', 'CODE', 'STRONG', 'EM', 'U', 'A', 'BR', 'MARK']);
const STYLE_KEYS = { Digit6: 'h1', Digit5: 'h2', Digit4: 'h3', Digit3: 'h4', Digit2: 'p.sqsrte-large', Digit1: 'p', Digit0: 'p.sqsrte-small', KeyM: 'pre' };
const MARK_KEYS = { KeyB: 'bold', KeyI: 'italic', KeyU: 'underline' };
const MARK_TAGS = { bold: 'STRONG', italic: 'EM', underline: 'U' };

// What the box holds, as the model keeps it: only the tags the bar can make, and '' when it has no text.
export function cleanMessage(box) {
  if (!box.textContent.trim()) return '';
  const copy = box.cloneNode(true);
  const walk = (n) => {
    for (const c of [...n.children]) {
      walk(c);
      if (!KEEP.has(c.tagName)) { c.replaceWith(...c.childNodes); continue; }
      for (const a of [...c.attributes]) if (!(c.tagName === 'A' && (a.name === 'href' || a.name === 'target')) && !(c.tagName === 'MARK' && a.name === 'style') && !(c.tagName === 'P' && a.name === 'class' && /^sqsrte-(large|small)$/.test(a.value))) c.removeAttribute(a.name);
    }
  };
  walk(copy);
  return copy.innerHTML;
}

// A paste takes the Text block's cleanup, but this box has no lists, quotes or strike: a list item or a quote
// comes in as paragraphs and a strike as its letters. An empty paragraph stays and can hold a caret (messageBox.paste).
function pasted(doc, html, text) {
  const out = [];
  const flat = (n) => { if (n.matches('ul, ol, li, blockquote')) [...n.children].forEach(flat); else out.push(n); };
  cleanPaste(doc, html, text).forEach(flat);
  for (const n of out) {
    for (const s of n.querySelectorAll('span')) s.replaceWith(...s.childNodes);
    if (!n.firstChild) n.append(doc.createElement('br'));
  }
  return out;
}

// Letters in the selection all carry the mark; at a caret, the letters beside it.
function markOn(box, sel, name) {
  if (!sel.rangeCount) return false;
  if (sel.isCollapsed) return fmt.caretInMark(box, sel, name);
  const range = sel.getRangeAt(0);
  const walker = box.ownerDocument.createTreeWalker(box, 4);
  let any = false;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.length || !range.intersectsNode(t)) continue;
    any = true;
    if (!t.parentElement.closest(MARK_TAGS[name])) return false;
  }
  return any;
}

// A selection as letters from the box's start, to find it again after a style moves the text.
const textsOf = (box) => { const w = box.ownerDocument.createTreeWalker(box, 4), out = []; while (w.nextNode()) out.push(w.currentNode); return out; };
function lettersOf(box, sel) {
  const r = sel.getRangeAt(0), before = (node, off) => { const q = r.cloneRange(); q.selectNodeContents(box); q.setEnd(node, off); return q.toString().length; };
  return [before(r.startContainer, r.startOffset), before(r.endContainer, r.endOffset)];
}
function putLetters(box, sel, [from, to]) {
  const find = (n) => { let left = n; const l = textsOf(box); for (const t of l) { if (left <= t.length) return [t, left]; left -= t.length; } return l.length ? [l.at(-1), l.at(-1).length] : [box, 0]; };
  const r = box.ownerDocument.createRange();
  r.setStart(...find(from));
  r.setEnd(...find(to));
  sel.removeAllRanges();
  sel.addRange(r);
}

export function messageBox({ panel, bar, stage, linkPop, openLink }) {
  const doc = panel.ownerDocument;
  const win = doc.defaultView;
  let box = null, menu = null, under = null;
  const current = () => (box?.isConnected ? box : null);
  const fire = (type) => box.dispatchEvent(new Event(type, { bubbles: true }));
  const place = () => {
    if (bar.hidden || !current()) return;
    const r = box.getBoundingClientRect(), st = stage.getBoundingClientRect();
    bar.style.left = `${r.left - st.left}px`;
    bar.style.top = `${r.top - st.top - 54}px`;
  };
  const draw = () => {
    if (!current()) { hide(); return; }
    const sel = win.getSelection(), inside = sel.rangeCount && box.contains(sel.anchorNode);
    const on = inside ? { bold: markOn(box, sel, 'bold'), italic: markOn(box, sel, 'italic'), underline: markOn(box, sel, 'underline') } : {};
    if (under) on.underline = under.on;
    on.link = !linkPop.hidden || (inside && !sel.isCollapsed && !!fmt.linkAt(box, sel.getRangeAt(0)));
    bar.innerHTML = messageBarHtml(inside ? fmt.currentStyle(box, sel) : 'p', menu, on, !box.textContent.trim());
    bar.hidden = false;
    box.classList.toggle('is-empty', !box.textContent.trim());
    place();
  };
  function hide() { bar.hidden = true; menu = null; under = null; box = null; }
  // A press is one undo step. What was typed before it is its own.
  const change = (act) => {
    fire('change');
    act();
    fire('input');
    fire('change');
    draw();
  };
  const press = (act, value) => {
    const sel = win.getSelection();
    if (!sel.rangeCount || !box.contains(sel.anchorNode)) return;
    if (act === 'style') change(() => { const at = lettersOf(box, sel); fmt.setStyle(doc, box, sel, value); putLetters(box, sel, at); });
    else if (act === 'underline' && sel.isCollapsed) { under = under ? null : { on: !fmt.caretInMark(box, sel, 'underline'), at: String(fmt.caretPlace(box, sel)) }; draw(); }
    else if (act === 'bold' || act === 'italic' || act === 'underline') { under = null; change(() => fmt.toggleMark(box, sel, act)); }
    else if (act === 'clear') change(() => fmt.clearFormatting(box, sel));
    else if (act === 'link') {
      const range = sel.getRangeAt(0).cloneRange(), texts = textsOf(box).filter((t) => t.length && range.intersectsNode(t)), ed = box;
      // Held by its letters, so the link goes inside the paragraph.
      if (!range.collapsed && texts.length) {
        if (range.startContainer.nodeType !== 3) range.setStart(texts[0], 0);
        if (range.endContainer.nodeType !== 3) range.setEnd(texts.at(-1), texts.at(-1).length);
      }
      const a = fmt.linkAt(box, range);
      const back = () => { if (!ed.isConnected) return; box = ed; ed.focus(); sel.removeAllRanges(); sel.addRange(range); };
      openLink(bar.querySelector('[data-fmt="link"]'), {
        href: a ? a.getAttribute('href') : '',
        newTab: !!a && a.getAttribute('target') === '_blank',
        atClose: true,
        apply: (href) => { back(); change(() => fmt.setLink(doc, ed, sel, range, href)); },
        setNewTab: (on) => { if (fmt.setLinkTarget(ed, range, on)) { back(); change(() => {}); } },
        // A press away closes the menu and the box takes the focus back after that press.
        after: () => setTimeout(() => { back(); draw(); }),
      });
      draw();
    }
  };
  bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (!b || !current()) return;
    const act = b.dataset.fmt;
    if (act === 'style-menu') { menu = menu ? null : 'style'; draw(); return; }
    if (act === 'style') { menu = null; press('style', b.dataset.v); return; }
    menu = null;
    press(act);
  });
  panel.addEventListener('focusin', (e) => {
    if (!e.target.matches?.('.bp-ffp-msg')) return;
    box = e.target;
    doc.execCommand('defaultParagraphSeparator', false, 'p');
    draw();
  });
  panel.addEventListener('focusout', (e) => {
    if (!e.target.matches?.('.bp-ffp-msg')) return;
    fire('change');
    if (bar.contains(e.relatedTarget) || linkPop.contains(e.relatedTarget) || !linkPop.hidden) return;
    hide();
  });
  panel.addEventListener('keydown', (e) => {
    if (!current() || e.target !== box || !(e.metaKey || e.ctrlKey)) return;
    if (e.altKey && STYLE_KEYS[e.code]) { e.preventDefault(); press('style', STYLE_KEYS[e.code]); }
    else if (!e.altKey && !e.shiftKey && MARK_KEYS[e.code]) { e.preventDefault(); press(MARK_KEYS[e.code]); }
  });
  panel.addEventListener('paste', (e) => {
    if (!current() || !box.contains(e.target)) return;
    e.preventDefault();
    const sel = win.getSelection(), text = e.clipboardData.getData('text/plain');
    const nodes = pasted(doc, e.clipboardData.getData('text/html'), text);
    if (nodes.length && sel.rangeCount && box.contains(sel.anchorNode)) change(() => insertPaste(doc, box, sel, nodes, text));
  });
  panel.addEventListener('input', (e) => {
    if (e.target !== box) return;
    // Text always sits in a text block.
    if ([...box.childNodes].some((n) => n.nodeType === 3 || n.tagName === 'BR') || !box.firstChild) {
      const p = doc.createElement('p');
      p.append(...box.childNodes);
      if (!p.firstChild) p.append(doc.createElement('br'));
      box.append(p);
      win.getSelection().selectAllChildren(p);
      win.getSelection().collapseToEnd();
    }
    box.classList.toggle('is-empty', !box.textContent.trim());
    if (under) {
      if (e.inputType === 'insertParagraph') under.at = String(fmt.caretPlace(box, win.getSelection()));
      else if (e.inputType) {
        if (e.inputType === 'insertText' && e.data) fmt.markTyped(box, win.getSelection(), e.data.length, 'underline', under.on);
        under = null;
      }
    }
  }, true);
  doc.addEventListener('selectionchange', () => {
    if (!current() || bar.hidden || menu) return;
    const sel = win.getSelection();
    if (under && String(fmt.caretPlace(box, sel)) !== under.at) under = null;
    if (doc.activeElement === box) draw();
  });
  panel.addEventListener('scroll', place);
  return { place, sync: () => { if (!bar.hidden && !current()) hide(); else place(); } };
}
