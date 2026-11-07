// The floating block toolbar (U3, U4), measured on the oracle at a 1600px window
// (parity/findings/TOOLBARGEO.json, TOOLBARS.json):
//   box        white, 42px tall, 6px radius, 4px padding, in a white 1px halo with the soft shadow;
//              its left edge 4px right of the block, its top 60px above the block, never closer
//              than 23px to the canvas top
//   buttons    36px squares 4px apart, 3px radius; icons 22px (Pin 20px) in #0e0e0e, Remove
//              #db3642, unavailable #b7b7b7; separators 1 by 20px #e7e7e7
//   per type   text: Write, Edit | Align Vertically, Pin, [Move Forward, Move Backward] | Duplicate, Remove
//              button: Edit | Primary, Link, Pin, Duplicate, Remove
//              others: Edit | Pin, [Move Forward, Move Backward] | Duplicate, Remove
//              Move Forward and Backward show when the block overlaps another block, or when a
//              block in its section is pinned in that layout.
//   phones     Duplicate gives way to Move Up and Move Down, off at the top and the bottom of the
//              stack; the button style and link go. Move Forward and Backward follow the same rule.
//              Separators as on desktop, measured on the shape and on text.
//   tips       under each usable button, 11px below it (TOOLBARS.json tips), with its keys in chips
// The icons are ours (O2: no Squarespace assets).

const ICON = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  align: '<path d="M5 4h14"/><path d="M12 8v12"/><path d="M8 12l4-4 4 4"/>',
  alignCenter: '<path d="M5 12h14"/><path d="M12 3v6"/><path d="M9 6.5l3 3 3-3"/><path d="M12 21v-6"/><path d="M9 17.5l3-3 3 3"/>',
  alignBottom: '<path d="M5 20h14"/><path d="M12 4v12"/><path d="M8 12l4 4 4-4"/>',
  pin: '<path d="M14 3l7 7-3 1-4 4 1 5-2 1-4-4-5 5-1-1 5-5-4-4 1-2 5 1 4-4z"/>',
  forward: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11" stroke-dasharray="2 2"/>',
  backward: '<rect x="4" y="4" width="12" height="12" rx="1" stroke-dasharray="2 2"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  remove: '<path d="M4 6h16"/><path d="M9 6V4h6v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 10v6M14 10v6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  chevron: '<path d="M8 10l4 4 4-4"/>',
  stackOptions: '<rect x="4" y="4" width="7" height="10" fill="currentColor"/><rect x="13" y="4" width="7" height="6" fill="currentColor"/><rect x="4" y="16" width="7" height="4" fill="currentColor"/><rect x="13" y="12" width="7" height="8" fill="currentColor"/>',
  stackV: '<rect x="4" y="4" width="8" height="6"/><rect x="4" y="14" width="8" height="6"/><path d="M18 5v14"/><path d="M15 16l3 3 3-3"/>',
  stackH: '<rect x="4" y="5" width="6" height="6"/><rect x="14" y="5" width="6" height="6"/><path d="M5 17h14"/><path d="M16 14l3 3-3 3"/>',
  unstack: '<rect x="4" y="4" width="6" height="6" stroke-dasharray="2 2"/><rect x="14" y="14" width="6" height="6" stroke-dasharray="2 2"/>',
  alignL: '<path d="M4 5v14"/><path d="M8 12h12"/><path d="M12 8l-4 4 4 4"/>',
  alignC: '<path d="M12 5v14"/><path d="M3 12h6"/><path d="M6 9l3 3-3 3"/><path d="M21 12h-6"/><path d="M18 9l-3 3 3 3"/>',
  alignR: '<path d="M20 5v14"/><path d="M4 12h12"/><path d="M12 8l4 4-4 4"/>',
};
const svg = (name, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] ?? name}</svg>`;

const B = {
  write: { label: 'Write', html: '<span class="tb-write">Aa</span>' },
  edit: { label: 'Edit', html: svg('edit') },
  align: { label: 'Align Vertically', html: svg('align'), cls: 'tb-flush' },
  halign: { label: 'Align Horizontally', html: svg('alignC') },
  stackopts: { label: 'Stack Options', html: svg('stackOptions') },
  pin: { label: 'Pin', html: svg('pin', 20) },
  'z+': { label: 'Move Forward', html: svg('forward'), keys: 'SHIFT ↑' },
  'z-': { label: 'Move Backward', html: svg('backward'), keys: 'SHIFT ↓' },
  duplicate: { label: 'Duplicate', html: svg('duplicate'), keys: '⌘ D' },
  remove: { label: 'Remove', html: svg('remove'), cls: 'tb-remove', keys: 'DELETE' },
  primary: { label: 'Primary', html: `<span class="tb-text">Primary</span>${svg('chevron')}`, cls: 'tb-wide', tip: 'Button Type' },
  link: { label: 'Open link editor popover', html: svg('link'), cls: 'tb-flush', tip: 'Edit Link' },
  up: { label: 'Move Up', html: svg('up'), keys: 'OPTION ↑' },
  down: { label: 'Move Down', html: svg('down'), keys: 'OPTION ↓' },
};

// The groups of buttons for a block, with '|' for a separator.
// fit: a Button that does not fill its block (parity/findings/S3.json fitButton) gains Align
// Horizontally and Align Vertically. Alone in its section on a phone, a block has no Move Up or Down (S3.json aloneBar).
// Every tile has Align Vertically but these: a Button, a Shape and a Map have none (CAP-COVERAGE.json, CAP-75MAP.json), and a stack has its own bar.
const NO_ALIGN = new Set(['button', 'shape', 'map', 'stack']);
export function toolbarItems(type, bp, z, fit = false, inStack = false) {
  // A child picked from Layers (S3.json children): no Pin, no Move.
  if (inStack) {
    if (bp === 'mobile') return type === 'text' ? ['write', 'edit', '|', 'remove'] : type === 'button' ? ['edit', '|', 'remove'] : ['edit', '|', 'align', '|', 'remove'];
    if (type === 'text') return ['write', 'edit', '|', 'duplicate', 'remove'];
    if (type === 'button') return ['edit', '|', 'primary', 'link', 'halign', 'duplicate', 'remove'];
    return ['edit', '|', 'align', '|', 'duplicate', 'remove'];
  }
  const zs = z.overlaps ? ['z+', 'z-'] : [];
  if (bp === 'mobile') {
    const moves = z.first && z.last ? [] : ['up', 'down'];
    if (type === 'text') return ['write', 'edit', '|', 'align', 'pin', ...zs, ...moves, '|', 'remove'];
    if (type === 'line') return ['edit', 'align', 'pin', ...zs, ...moves, '|', 'remove']; // CAP-U4LINE.json: no line after Edit
    if (NO_ALIGN.has(type)) return ['edit', '|', 'pin', ...zs, ...moves, '|', 'remove'];
    return ['edit', '|', 'align', 'pin', ...zs, ...moves, '|', 'remove']; // CAP-ACCPHONE.json, CAP-COVERAGE.json
  }
  if (type === 'stack') return ['edit', '|', 'link', 'stackopts', 'pin', ...zs, 'duplicate', 'remove'];
  if (type === 'button' && fit) return ['edit', '|', 'primary', 'link', 'halign', 'align', 'pin', '|', 'duplicate', 'remove'];
  if (type === 'text') return ['write', 'edit', '|', 'align', 'pin', ...zs, '|', 'duplicate', 'remove'];
  if (type === 'line') return ['edit', 'align', 'pin', ...zs, '|', 'duplicate', 'remove']; // CAP-U4LINE.json: no line after Edit
  if (type === 'button') return ['edit', '|', 'primary', 'link', 'pin', 'duplicate', 'remove'];
  if (type === 'image') return ['edit', '|', 'link', 'halign', 'align', 'pin', ...zs, '|', 'duplicate', 'remove']; // CAP-75IMAGE.json
  if (NO_ALIGN.has(type)) return ['edit', '|', 'pin', ...zs, '|', 'duplicate', 'remove'];
  return ['edit', '|', 'align', 'pin', ...zs, '|', 'duplicate', 'remove']; // CAP-COVERAGE.json, CAP-75QUOTE.json, CAP-75CODE.json, CAP-75FORM.json, CAP-75VIDEO.json
}

// Align Vertically's menu (parity/findings/TOOLBARS.json alignMenu): Top, Center, Bottom. The
// toolbar button shows the current one and is grey while the menu is open.
const VALIGN = [['flex-start', 'Align Top', 'align'], ['center', 'Align Center', 'alignCenter'], ['flex-end', 'Align Bottom', 'alignBottom']];
// Stack Options and Align Horizontally have the same menu (S3.json stackOptions, fitButton).
const BAR_MENUS = {
  align: ['valign', VALIGN],
  stackopts: ['sopt', [['column', 'Stack Vertically', 'stackV'], ['row', 'Stack Horizontally', 'stackH'], ['unstack', 'Unstack', 'unstack']]],
  halign: ['halign', [['left', 'Align Left', 'alignL'], ['center', 'Align Center', 'alignC'], ['right', 'Align Right', 'alignR']]],
};
export function alignMenuHtml(current, menu = 'align') {
  const [prefix, items] = BAR_MENUS[menu];
  return `<div class="tb-vmenu" data-for="${menu}">${items.map(([v, label, icon]) => `<button type="button" class="tb-btn${v === current ? ' tb-open' : ''}" data-tb="${prefix}:${v}" aria-label="${label}" data-tip="${label}">${svg(icon)}</button>`).join('')}</div>`;
}

export function toolbarHtml(items, z, align = {}) {
  return items.map((k) => {
    if (k === '|') return '<span class="tb-sep" aria-hidden="true"></span>';
    const b = B[k];
    const off = (k === 'z+' && !z.above) || (k === 'z-' && !z.below) || (k === 'up' && z.first) || (k === 'down' && z.last);
    const open = align.open && k === (align.menu || 'align');
    // A new Image's Align Center is named and drawn as what it holds (CAP-75IMAGE3.json).
    const hNow = k === 'halign' && align.hNamed ? BAR_MENUS.halign[1].find(([v]) => v === align.hAlign) : null;
    const html = k === 'align' ? svg(VALIGN.find(([v]) => v === align.current)?.[2] || 'align') : hNow ? svg(hNow[2]) : b.html;
    const name = hNow ? hNow[1] : b.label;
    return `<button type="button" class="tb-btn ${b.cls || ''}${off ? ' is-off' : ''}${open ? ' tb-open' : ''}" data-tb="${k}" aria-label="${name}" data-tip="${hNow ? name : b.tip || b.label}"${b.keys ? ` data-tip-keys="${b.keys}"` : ''}>${html}</button>`;
  }).join('') + (align.open ? alignMenuHtml(align.menu === 'stackopts' ? align.stackDir : align.menu === 'halign' ? align.hAlign : align.current, align.menu) : '');
}

// Where the toolbar goes, in the stage's coordinates.
export function toolbarPosition(frameRect, stageRect, blockRect, phone = false) {
  // On a phone the bar stands beside the phone, level with the block (CAP-PHONE.json, CAP-ACCPHONE.json).
  if (phone) return { left: frameRect.right - stageRect.left + 23, top: frameRect.top - stageRect.top + Math.max(blockRect.top + 4, 23) };
  return {
    left: frameRect.left - stageRect.left + blockRect.left + 4,
    top: frameRect.top - stageRect.top + Math.max(blockRect.top - 60, 23),
  };
}

// The group toolbar (X8, parity/findings/GROUPRESIZE.json): Stack Blocks | Align Group (a menu of
// six) | Move Forward, Move Backward, only over a block outside the group | Duplicate, Remove, above
// the group's bounding box. A phone has no Duplicate (CAP-GROUPBAR.json).
const GICON = {
  stack: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  align: '<path d="M5 4v16"/><rect x="8" y="6" width="11" height="4"/><rect x="8" y="14" width="7" height="4"/>',
};
export const GROUP_ALIGNS = [['left', 'Align Left'], ['hcenter', 'Align Horizontal Center'], ['right', 'Align Right'], ['top', 'Align Top'], ['vcenter', 'Align Vertical Center'], ['bottom', 'Align Bottom']];
export function groupToolbarHtml(alignOpen, z = { shows: true, above: true, below: true }, phone = false) {
  const b = (act, label, icon, extra = '') => `<button type="button" class="tb-btn" data-tb="${act}" aria-label="${label}" title="${label}"${extra}>${icon}</button>`;
  const g = (k) => svg(GICON[k]).replace('stroke-width="1.6"', 'stroke-width="1.6"');
  return [
    b('stack', 'Stack Blocks', g('stack')),
    '<span class="tb-sep" aria-hidden="true"></span>',
    b('align-menu', 'Align Group', g('align'), ` aria-expanded="${!!alignOpen}"`),
    ...(z.shows ? [
      '<span class="tb-sep" aria-hidden="true"></span>',
      b('z+', 'Move Forward', svg('forward')).replace('class="tb-btn"', `class="tb-btn${z.above ? '' : ' is-off'}"`),
      b('z-', 'Move Backward', svg('backward')).replace('class="tb-btn"', `class="tb-btn${z.below ? '' : ' is-off'}"`),
    ] : []),
    '<span class="tb-sep" aria-hidden="true"></span>',
    ...(phone ? [] : [b('gduplicate', 'Duplicate', svg(ICON.duplicate))]),
    b('gremove', 'Remove', svg(ICON.remove)).replace('class="tb-btn"', 'class="tb-btn tb-remove"'),
  ].join('') + (alignOpen ? `<div class="tb-pop" role="menu">${GROUP_ALIGNS.map(([k, l]) => `<button type="button" role="menuitem" data-tb="align:${k}" aria-label="${l}">${l}</button>`).join('')}</div>` : '');
}
