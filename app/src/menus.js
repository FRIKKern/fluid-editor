// Floating menus drawn like the oracle's (gap review screenshots, 2026-11-03):
//   Add Block  a 320 by 500 panel over the section's top left: a Search box, then six groups of
//              tiles in two columns, scrolling together (parity/findings/U5.json).
//   Layers     a 240 by 500 panel under the Layers button: "Layers", then one row per block
//              front to back (type icon and name, text blocks by their first words), sortable.
//   Context    right-click on a block: Copy, Paste, Duplicate, Delete | Copy Properties, Paste
//              Properties | Stack, Arrange | Hide on desktop, Hide on mobile, with shortcuts.
// Our icons are our own (O2). Items marked data-unbuilt are shown but not built yet.
const svg = (d, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const TYPE_ICON = {
  Stack: '<rect x="4" y="5" width="6" height="6"/><rect x="14" y="5" width="6" height="6"/><path d="M5 17h14"/><path d="M16 14l3 3-3 3"/>',
  Text: '<path d="M6 6h12M12 6v13"/>',
  Image: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',
  Button: '<rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 12h8"/>',
  Video: '<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M10.5 9.5v5l4-2.5z"/>',
  Form: '<path d="M8 7h11M8 12h11M8 17h11"/><circle cx="5" cy="7" r=".8" fill="currentColor"/><circle cx="5" cy="12" r=".8" fill="currentColor"/><circle cx="5" cy="17" r=".8" fill="currentColor"/>',
  Accordion: '<rect x="4" y="5" width="16" height="4" rx="1"/><path d="M6 13h12M6 17h12"/>',
  Shape: '<path d="M5 19l5-9 5 9z"/><circle cx="16" cy="8" r="3"/>',
  Scrolling: '<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M7 12h3M14 12h3"/>',
  Line: '<path d="M4 12h16"/>',
  Code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  Embed: '<path d="M8 6H5v12h3M16 6h3v12h-3"/><path d="M11 9l2 6"/>',
  Product: '<path d="M5 9h14l-1 10H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
  'Pricing Plan': '<path d="M4 12l8-8h8v8l-8 8z"/><circle cx="16" cy="8" r="1"/>',
  Donation: '<path d="M12 19s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 1.5c0 5-7 9.5-7 9.5z"/>',
  Scheduling: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  Summary: '<rect x="4" y="5" width="7" height="14"/><rect x="13" y="5" width="7" height="14"/>',
  Newsletter: '<rect x="4" y="6" width="16" height="12"/><path d="M4 7l8 6 8-6"/>',
  Quote: '<path d="M6 17l2-5H6V7h5v5l-2 5zM14 17l2-5h-2V7h5v5l-2 5z"/>',
  Audio: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
  Calendar: '<rect x="4" y="6" width="16" height="14"/><path d="M4 10h16M8 4v4M16 4v4"/>',
  Map: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  Menu: '<path d="M8 4v7M5 4v4a3 3 0 0 0 6 0V4M8 11v9M17 4c-2 1-3 4-3 7h3v9"/>',
  Chart: '<path d="M5 20V10M12 20V5M19 20v-7"/>',
  Markdown: '<rect x="3" y="6" width="18" height="12"/><path d="M6 15V9l3 3 3-3v6M17 9v6M15 13l2 2 2-2"/>',
  'Social Links': '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4M8 13l8 4"/>',
  'Search Field': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  'Page Link': '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  'Tag Cloud': '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 10-1 4 4 0 0 1 0 9z"/>',
  RSS: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1"/>',
  Archive: '<rect x="4" y="5" width="16" height="4"/><path d="M6 9v10h12V9M10 13h4"/>',
  Instagram: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/>',
  Tock: '<path d="M6 6h12M12 6v13M8 19h8"/>',
  SoundCloud: '<path d="M4 16v-3M7 17v-6M10 17V9M13 17V7a5 5 0 0 1 5 5 2.5 2.5 0 0 1 0 5z"/>',
  Flickr: '<circle cx="8" cy="12" r="3.5"/><circle cx="16" cy="12" r="3.5"/>',
  OpenTable: '<circle cx="9" cy="12" r="5"/><circle cx="19" cy="12" r="1.5"/>',
  Zola: '<path d="M6 6h12L6 18h12"/>',
  Bandsintown: '<path d="M5 19V5M5 19h14M10 19v-7M15 19V9"/>',
};
// The Layers row of a shape is a filled square, whatever the shape's color (parity/findings/LAYERS.json).
const LP_SHAPE = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="currentColor"/></svg>';
const GROUPS = [
  ['Essentials', ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Scrolling', 'Line']],
  ['Sell', ['Product', 'Pricing Plan', 'Donation', 'Scheduling']],
  ['Display', ['Summary', 'Newsletter', 'Quote', 'Audio', 'Calendar', 'Map', 'Menu', 'Chart']],
  ['Code', ['Code', 'Markdown', 'Embed']],
  ['Links', ['Social Links', 'Search Field', 'Page Link', 'Tag Cloud', 'RSS', 'Archive']],
  ['Integrations', ['Instagram', 'Tock', 'SoundCloud', 'Flickr', 'OpenTable', 'Zola', 'Bandsintown']],
];
// Search also matches words the menu does not show. "co" was the one query read (U5.json search);
// these words are ours and give the same tiles.
const ALSO = { Form: 'contact', 'Pricing Plan': 'cost', Donation: 'contribute', 'Page Link': 'content', Bandsintown: 'concert' };

export function addBlockMenuHtml(types, query = '') {
  const q = query.trim().toLowerCase();
  const tile = (n) => `<button type="button" class="am-tile" data-add="${n}" aria-label="${n}">${svg(TYPE_ICON[n] || TYPE_ICON.Shape)}<span>${n}</span></button>`;
  const names = GROUPS.flatMap(([, list]) => list).filter((n) => types.some(([t]) => t === n));
  const hit = names.filter((n) => `${n} ${ALSO[n] || ''}`.toLowerCase().includes(q));
  const grid = (list) => `<div class="am-grid">${list.map(tile).join('')}</div>`;
  const body = !q ? GROUPS.map(([head, list]) => `<div class="am-head">${head}</div>${grid(list.filter((n) => names.includes(n)))}`).join('')
    : hit.length ? grid(hit) : '<p class="am-none">No Results</p>';
  const clear = q ? `<button type="button" class="am-clear" data-am="clear" aria-label="Clear search">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</button>` : '';
  return `<label class="am-search">${svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 18)}<input type="search" data-am="search" aria-label="Search" placeholder="Search" value="${query.replace(/"/g, '&quot;')}">${clear}</label><div class="am-body${q ? ' is-search' : ''}">${body}</div>`;
}

// A row's eye shows on hover and while picked; a hidden row keeps it, crossed (SECTIONBAR.json, layersList).
const EYE = '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15.5 15.5 0 0 1-3 3.4M6.5 7.5A15.4 15.4 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4-1"/>';
export function layersPanelHtml(rows) {
  const eye = (r) => (r.hidden
    ? `<button type="button" class="lp-eye" data-unhide="${r.id}" aria-label="Display Block" title="Hidden on this layout">${svg(EYE_OFF)}</button>`
    : `<button type="button" class="lp-eye" data-hide="${r.id}" aria-label="Hide Block">${svg(EYE)}</button>`);
  return `<div class="lp-title">Layers</div><ol class="lp-list">${rows.map((r) => `<li class="lp-row${r.kidOf ? ' lp-kid' : ''}${r.on ? ' is-on' : ''}${r.hidden ? ' is-hidden' : ''}" role="button" tabindex="0" data-layer="${r.id}"${r.kidOf ? ` data-kid-of="${r.kidOf}"` : ''} aria-label="${r.label.replace(/"/g, '&quot;')}"><span class="lp-icon">${r.type === 'Shape' ? LP_SHAPE : svg(TYPE_ICON[r.type] || TYPE_ICON.Shape, 22)}</span><span class="lp-name">${r.label.replace(/</g, '&lt;')}</span>${eye(r)}</li>`).join('')}</ol>`;
}

const K = { cmd: '⌘', shift: '⇧', back: '⌫' };
// The Arrange submenu (parity/findings/ARRANGE.json).
export function arrangeMenuHtml() {
  const it = (act, label, keys = '') => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"><span>${label}</span>${keys ? `<kbd>${keys}</kbd>` : ''}</button>`;
  return [it('z-forward', 'Move forward', '↑'), it('z-front', 'Move to front'), it('z-backward', 'Move backward', '↓'), it('z-back', 'Move to back')].join('');
}

// Copy Properties and Paste Properties, read on the oracle (parity/findings/CAP-COPYANIM.json).
// Copy's Animations is grey on a block with no animations. Paste's rows are grey until their kind
// is on the one clip: Animations adds after the block's rows, Replace Animations takes their place.
const propRow = (act, label, on = true) => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"${on ? '' : ' disabled'}><span>${label}</span></button>`;
export function copyPropsMenuHtml({ hasAnimations }) {
  return [propRow('pcopy-transforms', 'Transforms'), propRow('pcopy-animations', 'Animations', hasAnimations)].join('');
}
export function pastePropsMenuHtml({ canTransforms, canAnimations }) {
  return [propRow('ppaste-transforms', 'Transforms', canTransforms), propRow('ppaste-animations', 'Animations', canAnimations), propRow('preplace-animations', 'Replace Animations', canAnimations)].join('');
}

// On a phone the oracle's menu has no Copy Properties or Paste Properties (parity/findings/LINKBOX.json).
export function contextMenuHtml({ canPaste, phone = false }) {
  const item = (act, label, keys = '', opts = {}) => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"${opts.off ? ' disabled' : ''}${opts.unbuilt ? ' data-unbuilt' : ''}><span>${label}</span>${keys ? `<kbd>${keys}</kbd>` : ''}${opts.more ? '<span class="cm-more">›</span>' : ''}</button>`;
  return [
    item('copy', 'Copy', `${K.cmd} C`),
    item('paste', 'Paste', `${K.cmd} V`, { off: !canPaste }),
    item('duplicate', 'Duplicate', `${K.cmd} D`),
    item('delete', 'Delete', K.back),
    '<hr>',
    ...(phone ? [] : [item('copy-props', 'Copy Properties', '', { more: true }), item('paste-props', 'Paste Properties', '', { more: true }), '<hr>']),
    item('stack', 'Stack', `${K.shift} S`),
    item('arrange', 'Arrange', '', { more: true }),
    '<hr>',
    item('hide-desktop', 'Hide on desktop', `${K.cmd} ${K.shift} H`),
    item('hide-mobile', 'Hide on mobile', ''),
  ].join('');
}

// The button style menu (parity/findings/BUTTONSTYLE.json): three 171 by 55 options with an Aa
// sample, the current one checked.
export function buttonStyleMenuHtml(cur) {
  return ['Primary', 'Secondary', 'Tertiary'].map((n) => `<button type="button" role="option" class="bs-opt" aria-selected="${cur === n.toLowerCase()}" data-bstyle="${n.toLowerCase()}" aria-label="Aa${n}"><span class="bs-aa">Aa</span><span>${n}</span></button>`).join('');
}
