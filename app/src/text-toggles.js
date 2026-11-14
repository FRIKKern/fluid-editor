// Which of the text bar's toggles are on at the selection, for their aria-checked. The oracle's toggles are
// role=checkbox (every stored controls read, e.g. CAP-T3EMPTY.json 'alignment menu'), lit with aria-checked
// true (CAP-T10STATE.json, the Markdown bar). Its text bar's checked values were never read, so these
// follow what each toggle does here: a mark on every letter of the selection (at a caret, beside it),
// the first selected block in a quote, list or scaled text, and that block's alignment.
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

export function toggleStates(root, sel) {
  const [b] = selectedBlocks(root, sel);
  const inside = (q) => !!b && !!b.closest(q) && root.contains(b.closest(q));
  const align = (b && b.style.textAlign) || 'left';
  return {
    bold: markOn(root, sel, 'bold'), italic: markOn(root, sel, 'italic'), strike: markOn(root, sel, 'strike'),
    scaled: inside('.sqsrte-scaled-text-container'), quote: inside('blockquote'), bullet: inside('ul'), numbered: inside('ol'),
    ...Object.fromEntries(['left', 'center', 'right', 'justify'].map((a) => [`align:${a}`, !!b && align === a])),
  };
}

// Sets the bar's aria-checked to the selection in place, for when the bar is not redrawn (a menu open, Cmd+B and
// Cmd+I): nothing else on the bar changes.
export function syncToggles(bar, root, sel) {
  const on = toggleStates(root, sel);
  for (const b of bar.querySelectorAll('[role=checkbox][data-fmt]')) if (b.dataset.fmt in on) b.setAttribute('aria-checked', String(on[b.dataset.fmt]));
}
