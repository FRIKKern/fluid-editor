// Floating menus drawn like the oracle's (gap review screenshots, 2026-11-03):
//   Add Block  a 320 by 500 panel over the section's top left: a Search box, then "Essentials"
//              as two columns of tiles (icon and name). Search also finds the types outside
//              Essentials (Code, Embed). The Sell group is out of scope (docs/decisions/0005).
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
};
// The Layers row of a shape is a filled square, whatever the shape's color (parity/findings/LAYERS.json).
const LP_SHAPE = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="currentColor"/></svg>';
const ESSENTIALS = ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Scrolling', 'Line'];

export function addBlockMenuHtml(types, query = '') {
  const q = query.trim().toLowerCase();
  const tile = (n) => `<button type="button" class="am-tile" data-add="${n}" aria-label="${n}">${svg(TYPE_ICON[n] || TYPE_ICON.Shape)}<span>${n}</span></button>`;
  const names = types.map(([n]) => n);
  const body = q
    ? (() => { const hit = names.filter((n) => n.toLowerCase().includes(q)); return hit.length ? `<div class="am-grid">${hit.map(tile).join('')}</div>` : '<p class="am-none">No results</p>'; })()
    : `<div class="am-head">Essentials</div><div class="am-grid">${ESSENTIALS.filter((n) => names.includes(n)).map(tile).join('')}</div>`;
  return `<label class="am-search">${svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 18)}<input type="search" data-am="search" aria-label="Search" placeholder="Search" value="${query.replace(/"/g, '&quot;')}"></label><div class="am-body">${body}</div>`;
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

// Copy Properties and Paste Properties (labels read on the oracle, 2026-11-04: Transforms and
// Animations; Replace Animations). Replace Transforms is ours: the oracle's menu was read with
// nothing copied. Animations are not built (T15).
export function copyPropsMenuHtml() {
  const it = (act, label, extra = '') => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"${extra}><span>${label}</span></button>`;
  return [it('pcopy-transforms', 'Transforms'), it('pcopy-animations', 'Animations', ' data-unbuilt')].join('');
}
export function pastePropsMenuHtml({ canPaste }) {
  const it = (act, label, extra = '') => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"${extra}><span>${label}</span></button>`;
  return [it('ppaste-transforms', 'Replace Transforms', canPaste ? '' : ' disabled'), it('ppaste-animations', 'Replace Animations', ' data-unbuilt')].join('');
}

export function contextMenuHtml({ canPaste }) {
  const item = (act, label, keys = '', opts = {}) => `<button type="button" class="cm-item" role="menuitem" data-cm="${act}" aria-label="${label}"${opts.off ? ' disabled' : ''}${opts.unbuilt ? ' data-unbuilt' : ''}><span>${label}</span>${keys ? `<kbd>${keys}</kbd>` : ''}${opts.more ? '<span class="cm-more">›</span>' : ''}</button>`;
  return [
    item('copy', 'Copy', `${K.cmd} C`),
    item('paste', 'Paste', `${K.cmd} V`, { off: !canPaste }),
    item('duplicate', 'Duplicate', `${K.cmd} D`),
    item('delete', 'Delete', K.back),
    '<hr>',
    item('copy-props', 'Copy Properties', '', { more: true }),
    item('paste-props', 'Paste Properties', '', { more: true }),
    '<hr>',
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
