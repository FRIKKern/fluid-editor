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
  'CAP-S4PHONE': { question: 'S4: the section bottom handle in the phone view, a drag on it, and a click on it', steps: [
    ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'phone hovered', { sectionHandle: 2, section: 2 }], ['shot', 'hovered'],
    ['sectionDrag', 2, 90], ['read', 'phone 90 down', { section: 2 }], ['hover', 2], ['sectionDrag', 2, -150], ['read', 'phone 150 up', { section: 2 }],
    ['view', 'Desktop'], ['read', 'desktop after', { section: 2 }],
    ['exit'], ['enter'], ['hover', 2], ['read', 'desktop before click', { sectionHandle: 2, section: 2 }], ['sectionDrag', 2, 0], ['read', 'desktop after click', { sectionHandle: 2, section: 2, controls: true }],
  ] },
  'CAP-NORMALIZE': { question: 'R2, R3: which actions turn stretched rows back into uniform rows, and do start rows move?', steps: [
    ...[1, 2, 3].flatMap((n) => [['enter'], ['frame', 800, 900], ['read', `select ${n} before`, { section: 3, areas: 3 }], ['select', 3, 1], ['read', `select ${n} after`, { section: 3, areas: 3 }], ['exit']]),
    ['enter'], ['frame', 800, 900], ['drag', 3, 1, 'middle', 60, 0], ['read', 'dragged 60 right', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['select', 3, 1], ['hold', 3, 1, 'se', 2, 2], ['read', 'resize after', { section: 3, areas: 3 }], ['release', 'home'], ['read', 'resize dropped home', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['editText', 3, 1], ['read', 'edit start after', { section: 3, areas: 3 }], ['press', 'Escape'], ['read', 'edit left', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['select', 3, 1], ['press', 'ArrowRight'], ['read', 'arrow key after', { section: 3, areas: 3 }], ['unframe'],
  ] },
  'CAP-SHAPEWIDE': { question: 'T6: where does the square sit when a shape block is wider, with Stretch off?', steps: [
    ['enter'], ...selectEdit(2, 2), ['clickIf', 'Design'], ['read', 'panel', { controls: true, checks: true, inside: [2, 2], block: [2, 2] }], ['shot', 'panel'], ['clickIf', 'Stretch'], ['read', 'stretch off', { inside: [2, 2], block: [2, 2], checks: true }], ['shot', 'off'],
  ] },
  'CAP-IMAGEMODS': { question: 'X7: an image resize with no modifier and with Shift', steps: [
    ['enter'], ['add', 2, 'Image'], ['hold', 2, 'new', 'se', 125, 75], ['read', 'plain held', { block: [2, 'new'] }], ['release'], ['read', 'plain dropped', { block: [2, 'new'] }],
    ['exit'], ['enter'], ['add', 2, 'Image'], ['hold', 2, 'new', 'se', 125, 75, ['Shift']], ['read', 'shift held', { block: [2, 'new'] }], ['release'], ['read', 'shift dropped', { block: [2, 'new'] }],
  ] },
  'CAP-UNDOSHORT': { question: 'Y2: does a pause under 300 ms split typing into two undo steps?', steps: [
    ...[100, 200].flatMap((ms) => [['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', ms], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', `two bursts ${ms}ms apart`, 2, 1]]).flatMap((x, n, all) => (x[0] === 'enter' && n ? [['exit'], x] : [x])),
  ] },
  'CAP-SECTIONVIEWS': { question: 'S1: what does Edit Section offer on each layout?', steps: [
    ['enter'], ['panel', 2], ['read', 'desktop first tab', { controls: true, checks: true }], ['clickIf', 'Design'], ['read', 'desktop design', { controls: true, checks: true }], ['shot', 'desktop'], ['press', 'Escape'],
    ['view', 'Mobile'], ['panel', 2], ['read', 'phone first tab', { controls: true, checks: true }], ['clickIf', 'Design'], ['read', 'phone design', { controls: true, checks: true }], ['shot', 'phone'],
  ] },
  'CAP-CORNER': { question: 'T15: what does a block Corner do once Background is on?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Edit'], ['click', 'Design'], ['click', 'Background'], ['read', 'background on', { block: [2, 1], inside: [2, 1], controls: true }], ['fillValue', '0px', '20'], ['read', 'corner 20', { block: [2, 1], inside: [2, 1], controls: true }], ['shot', 'corner'],
  ] },
  'CAP-HIDDENEYE': { question: 'L5: what does the eye in the Layers panel do on a hidden block?', steps: [
    ['enter'], ['rightClick', 2, 2], ['read', 'menu', { controls: true }], ['click', 'Hide on desktop'], ['read', 'hidden', { block: [2, 2], section: 2 }], ['hover', 3], ['hover', 2], ['read', 'section hovered', { controls: true }], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'layers', { controls: true, block: [2, 2], section: 2 }], ['shot', 'layers'], ['click', 'Display Block'], ['read', 'eye clicked', { controls: true, block: [2, 2], section: 2 }], ['shot', 'eye'],
  ] },
  'CAP-HELDNORMAL': { question: 'R2: do stretched rows normalize while a block is held, before the drop?', steps: [
    ['enter'], ['frame', 800, 900], ['read', 'before', { section: 3, areas: 3 }], ['holdRaw', 3, 1, 'middle', 60, 0], ['read', 'held 60 right', { section: 3, areas: 3, block: [3, 1] }], ['shot', 'held'], ['release', 'home'], ['read', 'dropped home', { section: 3, areas: 3 }], ['unframe'],
  ] },
  'CAP-BLANKSECTION': { question: 'U10: rows and gap of a blank section on desktop and phones', steps: [
    ['enter'], ['read', 'before', { sel: 'main#page .page-section' }], ['hover', 2], ['click', 'Add Section'], ['read', 'picker', { controls: true }], ['click', 'Add Blank'], ['read', 'added', { sel: 'main#page .page-section', section: 3 }], ['shot', 'desktop'], ['view', 'Mobile'], ['read', 'phone', { sel: 'main#page .page-section', section: 3 }], ['shot', 'phone'],
  ] },
  'CAP-BACKGROUND': { question: 'P5: controls and sizes of the section Background tab, and where Color Theme Editor goes. Never uploads.', steps: [
    ['enter'], ['panel', 2], ['click', 'Background'], ['read', 'background', { controls: true, thin: true }], ['shot', 'image'], ['clickIf', 'Video'], ['read', 'video', { controls: true }], ['shot', 'video'], ['clickIf', 'Art'], ['read', 'art', { controls: true }], ['shot', 'art'],
    ['click', 'Colors'], ['read', 'colors', { controls: true }], ['clickIf', 'Color Theme Editor'], ['read', 'theme editor', { controls: true }], ['shot', 'theme'],
  ] },
  'CAP-GROUPFORWARD': { question: 'X8: Move Forward on a group with a block between its members', steps: [
    ['enter'], ['read', 'before', { zs: 2 }], ['select', 2, 0], ['shiftClick', 2, 2], ['read', 'group', { zs: 2, controls: true }], ['shot', 'group'], ['click', 'Move Forward'], ['read', 'forward once', { zs: 2 }], ['clickIf', 'Move Forward'], ['read', 'forward twice', { zs: 2 }], ['clickIf', 'Move Backward'], ['read', 'backward once', { zs: 2 }],
  ] },
  'CAP-PHONELINES': { question: 'U9: the thin lines of the toolbars in the phone view. Reads only.', steps: [
    ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'section hovered', { thin: true, controls: true, section: 2 }], ['shot', 'hovered'], ['select', 2, 2], ['read', 'shape selected', { thin: true, controls: true }], ['shot', 'selected'],
  ] },
  'CAP-LINEMIDDLE': { page: 'Gestures Probe', question: 'X6: what is under the pointer on a selected one-row Line, and which presses move it or grow it?', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['read', 'selected', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.1], [0.5, 0.9], [0.45, 0.5], [0.55, 0.5]]] }], ['shot', 'selected'],
    ['drag', 0, 'new', [0.25, 0.5], 0, 120], ['read', 'quarter across, 120 down', { block: [0, 'new'] }],
    ['press', 'Meta+z'], ['read', 'undone', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5]]] }],
    ['drag', 0, 'new', 'middle', 0, 120], ['read', 'middle, 120 down', { block: [0, 'new'] }],
    ['exit'], ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'not selected', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5]]] }], ['drag', 0, 'new', 'middle', 0, 120], ['read', 'unselected middle, 120 down', { block: [0, 'new'] }],
  ] },
  'CAP-ORDER': { page: 'Gestures Probe', question: 'A2: how does DOM order follow a move on desktop and on phones?', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['add', 0, 'Line'], ['add', 0, 'Button'], ['read', 'three added', { areas: 0 }],
    ['drag', 0, 2, 'middle', 700, 300], ['read', 'third block far right and lower', { areas: 0 }], ['drag', 0, 0, 'middle', 0, 400], ['read', 'first block moved below', { areas: 0 }],
    ['view', 'Mobile'], ['read', 'phone view', { areas: 0 }], ['drag', 0, 0, 'middle', 0, 200], ['read', 'first in DOM moved down on phone', { areas: 0 }],
    ['view', 'Desktop'], ['read', 'back on desktop', { areas: 0 }],
  ] },
  'CAP-HIDETYPES': { page: 'Gestures Probe', question: 'L5: Hide on desktop and on mobile on other block types', steps: [
    ['enter'], ['blank'], ...['Image', 'Button', 'Line', 'Form'].flatMap((t) => [['add', 0, t], ['press', 'Escape'], ['rightClick', 0, 'new'], ['click', 'Hide on desktop'], ['read', `${t} hidden on desktop`, { block: [0, 'new'], section: 0 }], ['press', 'Meta+z'], ['rightClick', 0, 'new'], ['click', 'Hide on mobile'], ['read', `${t} hidden on mobile`, { block: [0, 'new'], section: 0 }], ['view', 'Mobile'], ['read', `${t} phone view`, { block: [0, 'new'], section: 0 }], ['view', 'Desktop'], ['press', 'Meta+z']]),
  ] },
  'CAP-S1OTHER': { page: 'Gestures Probe', question: 'S1: is any other section setting per layout? Change each on the phone and read desktop', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'start', { sections: true }], ['view', 'Mobile'], ['panel', 0], ['read', 'phone panel', { controls: true, sections: true }], ['shot', 'panel'],
    ['clickIf', 'L'], ['read', 'phone section L', { sections: true }], ['clickIf', 'Top'], ['read', 'phone top', { sections: true }], ['press', 'Escape'], ['view', 'Desktop'], ['read', 'desktop after', { sections: true }],
  ] },
  'CAP-STACK': { page: 'Gestures Probe', question: 'S3: Stack Blocks and what Stack Options offers', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['add', 0, 'Button'], ['press', 'Escape'], ['drag', 0, 1, 'middle', 0, 200], ['press', 'Escape'], ['select', 0, 0], ['shiftClick', 0, 1], ['read', 'group', { controls: true, areas: 0 }], ['click', 'Stack Blocks'], ['read', 'stacked', { controls: true, areas: 0 }], ['shot', 'stacked'], ['click', 'Stack Options'], ['read', 'options', { controls: true, checks: true }], ['shot', 'options'], ['read', 'vertical', { block: [0, 0], inside: [0, 0] }], ['click', 'Stack Horizontally'], ['read', 'horizontal', { block: [0, 0], inside: [0, 0], controls: true }], ['shot', 'horizontal'], ['click', 'Stack Vertically'], ['read', 'vertical again', { inside: [0, 0] }], ['click', 'Unstack'], ['read', 'unstacked', { areas: 0, controls: true }], ['shot', 'unstacked'],
  ] },
  'CAP-BLEND': { page: 'Gestures Probe', question: 'T15: Blend Mode and Corner on other block types', steps: [
    ['enter'], ['blank'], ...['Image', 'Button', 'Shape', 'Line', 'Form', 'Quote', 'Map', 'Social Links', 'Scrolling', 'Accordion', 'Video', 'Code'].flatMap((t) => [['add', 0, t], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', `${t} design`, { controls: true, checks: true, has: ['Blend Mode', 'Uniform corner radii', 'Background', 'Stroke', 'Blur'] }], ['shot', `${t}-design`], ['clickIf', 'Blend Mode'], ['read', `${t} blend menu`, { controls: true }], ['clickIf', 'Multiply'], ['read', `${t} multiply`, { block: [0, 'new'], inside: [0, 'new'] }], ['press', 'Escape'], ['press', 'Escape']]),
  ] },
  'CAP-ACCORDION': { page: 'Gestures Probe', question: 'T12: the accordion controls still dim in ours', steps: [
    ['enter'], ['blank'], ['add', 0, 'Accordion'], ['click', 'Edit'], ['read', 'content', { controls: true, checks: true }], ['shot', 'content'], ['clickIf', 'Design'], ['read', 'design', { controls: true, checks: true }], ['shot', 'design'], ['clickIf', 'Navigate to Title'], ['read', 'title view', { controls: true }], ['shot', 'title'], ['clickIf', 'Heading 4'], ['read', 'style menu', { controls: true }], ['shot', 'style'], ['clickIf', 'Heading 4'], ['clickIf', 'Back'], ['clickIf', 'Navigate to Description'], ['read', 'description view', { controls: true }], ['clickIf', 'Back'], ['clickIf', 'Navigate to Dividers'], ['read', 'dividers view', { controls: true }], ['shot', 'dividers'], ['clickIf', 'Back'], ['clickIf', 'Plus'], ['read', 'icon menu', { controls: true }], ['shot', 'icon'],
  ] },
  'CAP-ACCORDION2': { page: 'Gestures Probe', question: 'T12: the reorder grip and the more button of Icon Size', steps: [
    ['enter'], ['blank'], ['add', 0, 'Accordion'], ['click', 'Edit'], ['read', 'before', { controls: true, html: [0, 'new'] }], ['dragAt', 595, 391, 595, 520], ['read', 'first dragged below third', { controls: true, html: [0, 'new'] }], ['shot', 'grip'],
    ['clickIf', 'Design'], ['clickAt', 845, 784], ['read', 'more', { controls: true }], ['shot', 'more'],
  ] },
  'CAP-SYNTHCLIP': { page: 'Gestures Probe', question: 'U11, Y4: does the editor take copy and paste events carrying our own DataTransfer? No key presses, nothing reaches the machine clipboard', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['blank'], ['add', 1, 'Line'], ['press', 'Escape'], ['stubClipboard'], ['read', 'before', { areas: 0, clip: true }],
    ['select', 0, 0], ['synthClip', 'copy'], ['read', 'copy in the frame', { clip: true, areas: 0 }], ['synthClip', 'copy', 'top'], ['read', 'copy in the top window', { clip: true, areas: 0 }],
    ['synthClip', 'paste'], ['read', 'paste in the frame', { clip: true, areas: 0 }], ['synthClip', 'paste', 'top'], ['read', 'paste in the top window', { clip: true, areas: 0 }],
    ['press', 'Escape'], ['select', 1, 0], ['synthClip', 'paste'], ['read', 'paste in another section', { clip: true, areas: 1 }], ['synthClip', 'paste', 'top'], ['read', 'paste in another section, top', { clip: true, areas: 1 }],
  ] },
  'CAP-P3FIELD': { page: 'Gestures Probe', question: 'P3: the custom height field above 1000, with a negative number and words, and the slider while held', steps: [
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['read', 'custom', { section: 0, sections: true, range: true }],
    ...['abc', '-1', '7', '12.5'].flatMap((v) => [['typeAt', 1542, 526, v], ['read', `real keys "${v}"`, { section: 0, sections: true, range: true }]]),
    ...['12.5', '12abc', 'abc', '-1', '-5', '', '0', '200'].flatMap((v) => [['fillRange', v], ['read', `typed "${v}"`, { section: 0, sections: true, range: true }]]),
    ['fillRange', '50'], ['read', 'back at 50', { section: 0, sections: true, range: true }],
    ['holdAt', 1397, 526], ['read', 'slider held', { section: 0, sections: true, range: true }], ['moveAt', 1440, 526], ['read', 'slider moved right, held', { section: 0, sections: true, range: true }], ['moveAt', 1340, 526], ['read', 'slider moved left, held', { section: 0, sections: true, range: true }], ['releaseAt'], ['read', 'slider let go', { section: 0, sections: true, range: true }],
    ...['300', '400', '600', '800', '1000', '1001', '5000', '100000'].flatMap((v) => [['fillRange', v], ['read', `typed "${v}"`, { section: 0, sections: true, range: true }], ['press', 'Escape'], ['panel', 0]]),
    ['read', 'panel after 100000', { section: 0, sections: true, range: true }], ['shot', 'after'],
  ] },
  'CAP-L6PHONE': { page: 'Gestures Probe', question: 'L6: Scale, Offset and Skew set on a phone, read on desktop', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop start', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'], controls: true }], ['shot', 'start'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }],
    ['fillRow', 'Scale', 0, '150'], ['fillRow', 'Scale', 1, '80'], ['fillRow', 'Offset', 0, '20'], ['fillRow', 'Offset', 1, '30'], ['fillRow', 'Skew', 0, '10'], ['fillRow', 'Skew', 1, '5'], ['read', 'phone set', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }], ['shot', 'phoneset'], ['press', 'Escape'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone set', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }],
  ] },
  'CAP-T6RANGE': { page: 'Gestures Probe', question: 'T6: where the three-dot stroke range ends, and what the Reset under Stroke Color is called. A Reset whose label names a theme is read, never pressed.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 4], ['read', 'dots open', { range: true, parts: ['Thickness'], style: [0, 'new'] }], ['shot', 'dots'],
    ...['100', '500', '1000', '0', '-5', '3.5', '20'].flatMap((v) => [['fillRange', v], ['read', `typed ${v}`, { range: true, style: [0, 'new'] }]]),
    ['pressNamed', 'Stroke Color'], ['read', 'stroke color open', { boxes: ['Custom color', 'Color #B564F7'], has: ['Reset to theme', 'Reset'], style: [0, 'new'] }], ['shot', 'popup'],
    ['pressNamed', 'Color #B564F7'], ['read', 'stroke color picked', { controls: true, boxes: ['Custom color'], has: ['Reset to theme', 'Reset'], style: [0, 'new'] }], ['shot', 'picked'],
  ] },
  'CAP-L6RESET': { page: 'Gestures Probe', question: 'L6: Reset to default value, by field, on a block made in this session: focused, not focused, desktop and phone', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'],
    ['read', 'at default', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Rotate', 0, '30'], ['read', 'desktop 30, focused', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'focused'], ['pressReset', 'Rotate', 0], ['read', 'desktop reset, focused', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Scale', 0, '150'], ['fillRow', 'Scale', 1, '80'], ['read', 'scale Y focused', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['pressReset', 'Scale', 1], ['read', 'desktop scale Y reset', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 1, '80'], ['fillRow', 'Offset', 0, '10'], ['clickIf', 'Design'], ['read', 'blurred, mouse elsewhere', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['hoverRow', 'Rotate', 0], ['read', 'blurred, hovered', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'hovered'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
    ['fillRow', 'Rotate', 0, '45'], ['read', 'phone rotate 45', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['pressReset', 'Rotate', 0], ['read', 'phone rotate reset', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'phone-rotate'],
    ['fillRow', 'Scale', 1, '50'], ['pressReset', 'Scale', 1], ['read', 'phone scale Y reset', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Offset', 0, '20'], ['pressReset', 'Offset', 0], ['read', 'phone offset reset', { reset: ['Offset', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Skew', 0, '5'], ['pressReset', 'Skew', 0], ['read', 'phone skew reset, no desktop value', { reset: ['Skew', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone resets', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone after desktop look', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
  ] },
  'CAP-L6PHONE2': { page: 'Gestures Probe', question: 'L6: Anchor, Stroke thickness and Corner set on a phone, and desktop values of Scale, Offset, Skew, Anchor, Thickness and Corner flowing to the phone', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { style: [0, 'new'] }],
    ['fillValue', '0px', '12'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 1], ['scrollTo', 'Anchor'], ['pressNamed', 'Position'], ['pressNamed', 'Top Left'], ['pressNamed', 'Position'], ['clickIf', 'Design'], ['read', 'phone set', { style: [0, 'new'], leaves: ['Anchor', 'Rotate', 'Scale', 'Stroke', 'Thickness'] }], ['moveAfter', 'Animation'], ['read', 'phone icon hovered', { controls: true, thin: true }], ['shot', 'phone-icon'], ['scrollTo', 'Shape style'], ['read', 'phone corner', { controls: true, leaves: ['Stretch', 'Color', 'Stroke'] }], ['shot', 'phone-set'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone set', { style: [0, 'new'], controls: true }], ['shot', 'desktop-after'],
    ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillValue', '0px', '8'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 3], ['fillRow', 'Scale', 0, '120'], ['fillRow', 'Offset', 0, '5'], ['fillRow', 'Skew', 0, '3'], ['scrollTo', 'Anchor'], ['pressNamed', 'Position'], ['pressNamed', 'Bottom Right'], ['read', 'desktop second', { controls: true, ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'desktop-second'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone second flows', { controls: true, ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'phone-second'],
  ] },
  'CAP-T6STRETCH': { page: 'Gestures Probe', question: 'T6: Stretch off, the box of each of the 29 shapes in a 341.7 by 235.6 block', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressPart', 'Stretch', 1], ['read', 'stretch off', { parts: ['Stretch'], shape: [0, 'new'] }],
    ...["Rectangle","Circle","Triangle","Diamond","Rabbet","Eight Sided Shield","TV","Octagon","Rounded Pentagon","Gear","Four Point Star","Open Book","Pointed Star","Stepped Cross","Rounded Star","Flower","Four Petal Flower","Four Leaf Clover","Horizontal Stacked Circles","Wide Vertical Stacked Pills","Horizontal Right Leaning Oval","Parallelogram","Arched Window","Pointed Window","Award","Narrow Pow","Egg","Hourglass","Keystone"].flatMap((n) => [['pressAfter', 'Shape style'], ['pressNamed', n], ['read', n, { shape: [0, 'new'] }]]), ['shot', 'last'],
  ] },
  'CAP-T6PLACE': { page: 'Gestures Probe', question: 'T6: where the shape picker and the color popup sit, at a few block places', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'left picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'left popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'middle picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'middle popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'middle'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'right picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'right popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'right'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', -1000, 500], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'low picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'low popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'low'],
  ] },
  'CAP-T6LAYOUT': { page: 'Gestures Probe', question: 'T6: a stroke and a color per layout on a Shape, set on the phone, read on desktop, and desktop values flowing down', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { style: [0, 'new'], leaves: ['Color', 'Stroke Color'] }],
    ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['pressNamed', 'Stroke Color'], ['read', 'phone set', { style: [0, 'new'], leaves: ['Color', 'Stroke', 'Stroke Color'] }], ['shot', 'phone-set'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone', { style: [0, 'new'] }],
    ['pressNamed', 'Color'], ['pressNamed', 'Color #F2B8B4'], ['pressNamed', 'Color'], ['pressNamed', 'Dashed Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #000000'], ['pressNamed', 'Stroke Color'], ['read', 'desktop set', { style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone keeps its own', { style: [0, 'new'] }],
    ['view', 'Desktop'], ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['pressNamed', 'Stroke Color'], ['read', 'second, desktop', { style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'second, phone flows', { style: [0, 'new'], leaves: ['Color', 'Stroke', 'Stroke Color'] }],
  ] },
  'CAP-T6THEME': { page: 'Gestures Probe', question: "T6: a section theme's own shape color, read on a new Shape, with and without a picked color", steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['press', 'Escape'], ['deselect', 0],
    ['read', 'theme at start', { style: [0, 0], section: 0 }], ['read', 'second at start', { style: [0, 1] }], ['hover', 0], ['panel', 0], ['click', 'Colors'], ['read', 'colors tab', { controls: true }], ['shot', 'colors'],
    ...['Lightest 1', 'Lightest 2', 'Light 1', 'Light 2', 'Bright 1', 'Bright 2', 'Dark 1', 'Dark 2', 'Darkest 1', 'Darkest 2'].flatMap((n) => [['scrollTo', n], ['pressNamed', n], ['read', `${n}: plain`, { style: [0, 0] }], ['read', `${n}: picked`, { style: [0, 1] }]]), ['shot', 'themed'],
  ] },
  'CAP-SECTIONMODEL': { page: 'Gestures Probe', question: 'U10: what Duplicate, Move, Remove and the Add Section picker do to the page', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['blank'], ['read', 'two sections', { sections: true }],
    ['hover', 0], ['click', 'Duplicate Section'], ['read', 'first duplicated', { sections: true }], ['hover', 0], ['click', 'Move Section Down'], ['read', 'first moved down', { sections: true }], ['hover', 1], ['click', 'Remove Section'], ['read', 'remove asks', { sections: true, controls: true }], ['shot', 'asks'], ['click', 'Remove'], ['read', 'second removed', { sections: true }],
    ['hover', 0], ['click', 'Add Section'], ['read', 'picker', { controls: true }], ['shot', 'picker'], ['clickIf', 'Team'], ['read', 'Team', { controls: true }], ['shot', 'team'],
  ] },
  'CAP-BASESIZE': { page: 'Gestures Probe', question: 'U12: Base Size limits. Reset is not pressed.', steps: [
    ['enter'], ['click', 'Toggle Site Styles editing'], ['read', 'panel', { controls: true }], ['click', 'Open Fonts style disclosure'], ['read', 'fonts', { controls: true }], ['shot', 'fonts'], ['fillValue', '16', '1'], ['read', 'typed 1', { controls: true, sel: 'h1' }], ['shot', 'one'], ['press', 'Tab'], ['read', 'after tab', { controls: true }], ['fillValue', '12', '999'], ['read', 'typed 999', { controls: true, sel: 'h1' }], ['shot', 'big'],
  ] },
  'CAP-GROUP3': { page: 'Gestures Probe', question: 'X8: a second group, of three blocks, for the scale rule', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'added', { areas: 0 }], ['drag', 0, 0, 'middle', 700, 200], ['press', 'Escape'], ['drag', 0, 1, 'middle', 200, 0], ['press', 'Escape'], ['read', 'spread', { areas: 0 }], ['select', 0, 0], ['shiftClick', 0, 1], ['shiftClick', 0, 2], ['read', 'group', { areas: 0 }], ['groupDrag', 0, 240, 120], ['read', 'corner out', { areas: 0 }], ['shot', 'out'], ['groupDrag', 0, -360, -160], ['read', 'corner in', { areas: 0 }],
  ] },
  'CAP-TEXTWIDTH': { page: 'Gestures Probe', question: 'X8, R2: rows of a long text block as it widens and narrows, and select with stretched rows', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'Start of a long text here'], ['pasteMid', 0, 'new', "<p>Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines.</p>"], ['press', 'Escape'], ['press', 'Escape'], ['read', 'pasted', { areas: 0, section: 0 }], ['shot', 'pasted'],
    // One column at a time out to 24 and back, so a row taken off shows where it happens.
    ...Array.from({ length: 16 }, (_, n) => [['press', 'Escape'], ['pick', 0, 0], ['drag', 0, 0, 'e', 58.78, 0], ['read', `wider ${n + 1}`, { areas: 0, section: 0, textH: [0, 0] }]]).flat(), ...Array.from({ length: 20 }, (_, n) => [['press', 'Escape'], ['pick', 0, 0], ['drag', 0, 0, 'e', -58.78, 0], ['read', `narrower ${n + 1}`, { areas: 0, section: 0, textH: [0, 0] }]]).flat(),
    ['press', 'Escape'], ['frame', 800, 900], ['read', 'frame 800', { areas: 0, section: 0 }], ['shot', 'stretched'], ...[1, 2, 3].flatMap((n) => [['select', 0, 0], ['read', `select ${n}`, { areas: 0, section: 0 }], ['press', 'Escape'], ['press', 'Escape']]), ['pick', 0, 0], ['drag', 0, 0, 'e', 60, 0], ['read', 'widened at 800', { areas: 0, section: 0 }], ['unframe'],
  ] },

  // The stored finding also pressed real Cmd+C and Cmd+V, before the ruling against them. Those steps are gone from this recipe: never press them.
  'CAP-COPYPASTE': { page: 'Gestures Probe', question: 'U11, Y4: Copy and Paste of a block, inside a section, between sections and between pages, with the clipboard calls kept in memory', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['blank'], ['add', 1, 'Line'], ['press', 'Escape'], ['stubClipboard'], ['read', 'before', { areas: 0, clip: true }],
    ['rightClick', 0, 0], ['click', 'Copy'], ['read', 'after copy', { clip: true, areas: 0 }], ['rightClick', 0, 0], ['click', 'Paste'], ['read', 'pasted on the source', { clip: true, areas: 0 }], ['shot', 'pasted'], ['rightClick', 0, 0], ['click', 'Paste'], ['read', 'pasted again', { areas: 0 }], ['press', 'Meta+z'], ['read', 'one undo', { areas: 0 }],
    ['rightClick', 1, 0], ['click', 'Paste'], ['read', 'pasted in another section', { areas: 1 }],
    ['rightClick', 0, 0], ['click', 'Copy'], ['toPage', 'Blocks Probe'], ['blank'], ['read', 'another page', { sections: true }], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'line on another page', { areas: 0 }], ['rightClick', 0, 0], ['shot', 'menu'], ['clickIf', 'Paste'], ['read', 'pasted on another page', { areas: 0 }], ['exit'], ['read', 'left', { sections: true }],
  ] },

};
