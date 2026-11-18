// Which of the text bar's toggles are on at the selection, for their aria-checked. The oracle's toggles are
// role=checkbox (every stored controls read, e.g. CAP-T3EMPTY.json 'alignment menu'), lit with aria-checked
// true (CAP-T10STATE.json, the Markdown bar). Its Bold, Italic and Strike were read at a caret (CAP-T3CHECKED.json,
// CAP-T3CHECKED2.json): a mark is checked on every letter of the selection, at a caret by the letter on its left, though a
// press there acts on the whole block; Strike pressed at a caret is checked at once, before a letter takes it
// (strikeNext, editor.js applyFormat). The rest follow what each toggle does here: the first selected block in a quote,
// list or scaled text, and that block's alignment.
import { MARKS, caretInMark, selectedBlocks } from './text-format.js';

function markOn(root, sel, name) {
  if (!sel.rangeCount) return false;
  if (sel.isCollapsed) return caretInMark(root, sel, name);
  const range = sel.getRangeAt(0), walker = root.ownerDocument.createTreeWalker(root, 4);
  let any = false;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.length || !range.intersectsNode(t)) continue;
    any = true;
    let e = t.parentElement;
    while (e && e !== root && !MARKS[name].test(e)) e = e.parentElement;
    if (!e || e === root) return false;
  }
  return any;
}

export function toggleStates(root, sel, strikeNext = null) {
  const [b] = selectedBlocks(root, sel);
  const inside = (q) => !!b && !!b.closest(q) && root.contains(b.closest(q));
  const align = (b && b.style.textAlign) || 'left';
  return {
    bold: markOn(root, sel, 'bold'), italic: markOn(root, sel, 'italic'), strike: strikeNext ? strikeNext.on : markOn(root, sel, 'strike'),
    scaled: inside('.sqsrte-scaled-text-container'), quote: inside('blockquote'), bullet: inside('ul'), numbered: inside('ol'),
    ...Object.fromEntries(['left', 'center', 'right', 'justify'].map((a) => [`align:${a}`, !!b && align === a])),
  };
}

// Sets the bar's toggles to `on` in place, for when the bar is not redrawn (a menu open, Cmd+B and Cmd+I): their
// aria-checked, and with `lit` their is-on too (the Message box's bar shows a toggle pressed). Nothing else changes.
export function setToggles(bar, on, lit = false) {
  for (const b of bar.querySelectorAll('[role=checkbox][data-fmt]')) {
    b.setAttribute('aria-checked', String(!!on[b.dataset.fmt]));
    if (lit) b.classList.toggle('is-on', !!on[b.dataset.fmt]);
  }
}
export const syncToggles = (bar, root, sel, strikeNext = null) => setToggles(bar, toggleStates(root, sel, strikeNext));
