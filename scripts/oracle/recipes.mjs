// What scripts/oracle-capture.mjs can ask the oracle: each recipe is one question from an unfinished
// item in parity/items.json that only the live site can answer. Demo page: section 2 block 2 is a
// shape, section 2 block 1 a text block, section 0 block 2 a button. Nothing here is ever saved.
const selectEdit = (i, k) => [['select', i, k], ['click', 'Edit']];
const allBlock = (i, k) => ({ block: [i, k], inside: [i, k], controls: true });

export const RECIPES = {
  'CAP-TOUCH': { question: 'X11: what do touch and pen do on a block: tap, drag, a long press, a handle?', steps: [
    ['enter'], ['listen'],
    ['touch', 2, 2, 'middle', 0, 0], ['read', 'after tap', { block: [2, 2], section: 2, controls: true }],
    ['touch', 2, 2, 'middle', 125, 0], ['read', 'after touch drag 125 right', { block: [2, 2], section: 2 }],
    ['touch', 2, 2, 'middle', 125, 0, { holdMs: 800 }], ['read', 'after long press then drag', { block: [2, 2], section: 2, controls: true }],
    ['exit'], ['enter'], ['listen'],
    ['select', 2, 2], ['touch', 2, 2, 'se', 125, 75], ['read', 'after touch on a handle', { block: [2, 2], section: 2 }],
    ['exit'], ['enter'], ['listen'],
    ['drag', 2, 2, 'middle', 125, 0, { pointerType: 'pen' }], ['read', 'after pen drag 125 right', { block: [2, 2], section: 2 }],
  ] },
  'CAP-UNDOTYPE': { question: 'Y2: how many undo steps does typing take, in one burst, in two bursts, and across leaving the edit?', steps: [
    ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two three four'], ['read', 'one burst typed', { html: [2, 1] }], ['press', 'Escape'], ['undoWalk', 'one burst', 2, 1],
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', 3000], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', 'two bursts 3s apart', 2, 1],
    ...[300, 800, 1500].flatMap((ms) => [['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', ms], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', `two bursts ${ms}ms apart`, 2, 1]]),
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one'], ['press', 'Escape'], ['pause', 800], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'two edits', 2, 1],
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Italic'], ['press', 'Escape'], ['undoWalk', 'two toolbar actions in one edit', 2, 1],
  ] },
  'CAP-TARGET': { question: 'X2: what does the drop target look like while a block is held?', steps: [
    ['enter'], ['hold', 2, 2, 'middle', 125, 75], ['read', 'held', { block: [2, 2], layers: 2 }], ['shot', 'held'], ['release', 'home'], ['read', 'dropped home', { block: [2, 2] }],
  ] },
  'CAP-ALT': { question: 'X7: does Alt change a resize?', steps: [
    ['enter'], ['hold', 2, 2, 'se', 125, 75, ['Alt']], ['read', 'alt held', { block: [2, 2], layers: 2 }], ['release'], ['read', 'alt dropped', { block: [2, 2] }],
    ['exit'], ['enter'], ['hold', 2, 2, 'se', 125, 75], ['read', 'plain held', { block: [2, 2] }], ['release'], ['read', 'plain dropped', { block: [2, 2] }],
    ['exit'], ['enter'], ['add', 2, 'Image'], ['select', 2, 'new'], ['hold', 2, 'new', 'se', 125, 75, ['Alt']], ['read', 'image alt held', { block: [2, 'new'] }], ['release'], ['read', 'image alt dropped', { block: [2, 'new'] }],
  ] },
  'CAP-HANDLES': { question: 'X6, T2, T11: handles, markup boxes and default area of the block types not read yet', steps: [
    ['enter'],
    ...['Image', 'Form', 'Line', 'Scrolling', 'Map', 'Social Links', 'Quote'].flatMap((t) => [['add', 2, t], ['read', t, allBlock(2, 'new')], ['press', 'Escape']]),
  ] },
  'CAP-PERLAYOUT': { question: 'L6, S1: are block Design values and the section Row Count stored per layout?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Edit'], ['click', 'Design'], ['read', 'design panel', { controls: true }], ['fill', 'Opacity', '50'], ['read', 'desktop after opacity 50', { inside: [2, 1], block: [2, 1] }], ['press', 'Escape'],
    ['view', 'Mobile'], ['read', 'phone after desktop opacity 50', { inside: [2, 1], block: [2, 1] }], ['view', 'Desktop'],
    ['exit'], ['enter'], ['panel', 2], ['click', 'Design'], ['read', 'row count desktop', { controls: true, section: 2 }], ['press', 'Escape'],
    ['view', 'Mobile'], ['panel', 2], ['click', 'Design'], ['read', 'row count phone', { controls: true, section: 2 }], ['fill', 'Row Count', '40'], ['read', 'phone after row count 40', { controls: true, section: 2 }], ['press', 'Escape'],
    ['view', 'Desktop'], ['read', 'desktop after phone row count 40', { section: 2 }],
  ] },
  'CAP-PHONE': { question: 'U4, U5, S4, U10: toolbar separators, Pin, new block placement and section controls in the phone view', steps: [
    ['enter'], ['select', 2, 2], ['click', 'Pin'], ['read', 'pin desktop', { controls: true, thin: true, block: [2, 2] }], ['press', 'Escape'],
    ['exit'], ['enter'], ['read', 'before add', { areas: 2 }], ['add', 2, 'Line'], ['read', 'new line desktop', { block: [2, 'new'], areas: 2 }], ['view', 'Mobile'], ['read', 'new line phone', { block: [2, 'new'], section: 2, areas: 2 }],
    ['exit'], ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'phone hovered section', { controls: true, thin: true, section: 2 }], ['select', 2, 2], ['read', 'phone selected shape', { controls: true, thin: true, block: [2, 2] }],
    ['clickIf', 'Pin'], ['read', 'pin phone', { controls: true, block: [2, 2] }],
  ] },
  'CAP-BUTTON': { question: 'T5: what does a button look like set to Layout Fit instead of Fill?', steps: [
    ['enter'], ...selectEdit(0, 2), ['click', 'Design'], ['read', 'fill', { block: [0, 2], inside: [0, 2] }], ['click', 'Fit'], ['read', 'fit', { block: [0, 2], inside: [0, 2] }], ['shot', 'fit'],
  ] },

  'CAP-LINK': { question: 'E7: what HTML do a typed link, a page link and Open link in new tab write in a text block?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Write'], ['press', 'Meta+a'], ['click', 'Link'], ['read', 'link editor', { controls: true, thin: true }], ['fill', 'Enter link, search, or add files', '/about'], ['press', 'Enter'], ['read', 'typed path, Enter', { html: [2, 1], controls: true }],
    ['click', 'Link'], ['read', 'editor reopened on the link', { html: [2, 1], controls: true }], ['read', 'box before', { checks: true }], ['press', 'Tab'], ['press', 'Tab'], ['press', 'Space'], ['read', 'box ticked by keyboard, editor open', { html: [2, 1], checks: true }], ['press', 'Escape'], ['read', 'editor closed by Escape', { html: [2, 1], checks: true }], ['shot', 'closed'], ['click', 'Link'], ['read', 'editor reopened', { html: [2, 1], checks: true }], ['shot', 'reopened'],
    ['exit'], ['enter'], ['pick', 2, 1], ['click', 'Write'], ['press', 'Meta+a'], ['click', 'Link'], ['clickIf', 'Services'], ['read', 'page link', { html: [2, 1] }],
  ] },
  'CAP-LINEHANDLE': { question: 'X6: which handles does a Line block have, and what does dragging each do?', steps: [
    ['enter'], ['add', 2, 'Line'], ['read', 'just added', allBlock(2, 'new')], ['shot', 'added'],
    ['drag', 2, 'new', 'middle', 0, 400], ['read', 'moved clear of the text', allBlock(2, 'new')], ['shot', 'moved'],
    ['drag', 2, 'new', 'e', 120, 0], ['read', 'east 120 right', { block: [2, 'new'] }],
    ['drag', 2, 'new', 's', 0, 80], ['read', 'south 80 down', { block: [2, 'new'] }],
    ['drag', 2, 'new', 'se', 120, 80], ['read', 'corner', { block: [2, 'new'] }], ['shot', 'after'],
  ] },


  'CAP-PASTEMID': { question: 'E5: what does a paste into the middle of a paragraph do?', steps: [
    ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<b>PASTED</b>'], ['read', 'inline', { html: [2, 1] }],
    ['exit'], ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<p>ONE</p><p>TWO</p>'], ['read', 'two paragraphs', { html: [2, 1] }],
    ['exit'], ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<h2>HEAD</h2><p>TAIL</p>'], ['read', 'heading and paragraph', { html: [2, 1] }],
  ] },
  'CAP-HEADER': { question: 'P8: where do the header title and actions sit above 1520px?', steps: [
    ['enter'], ...[1520, 1700, 1920, 2400].flatMap((w) => [['frame', w, 900], ['read', String(w), { sel: 'header#header .header-announcement-bar-wrapper, header#header .header-title, header#header .header-nav, header#header .header-actions, header#header .header-inner' }]]), ['unframe'],
  ] },
};
