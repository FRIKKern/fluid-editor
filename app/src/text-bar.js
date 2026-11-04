// The floating text toolbar (E4), laid out like the oracle's while writing (parity/findings/
// TEXTBAR.json and its screenshots): a white 44px bar above the block with Squarespace AI, the
// Text Style dropdown, Bold, Italic, Text Color, Scaled Text, Text Highlight, Link | Text
// Alignment (a menu of four) | Quote, Bullet List, Numbered List | Strike | Outdent, Indent |
// Clear Formatting, on a 40px pitch. Our icons are our own (O2). AI is out of scope
// (docs/decisions/0005); Color, Scaled Text and Highlight are shown but not built. Link opens
// the link editor (E7).
import { STYLES } from './text-format.js';

const svg = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
  color: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  scaled: '<path d="M4 19l4-10 4 10M5.5 15.5h5"/><path d="M15 4h5v5M20 4l-5 5"/>',
  highlight: '<path d="M5 15l4-10 4 10M6.5 11.5h5"/><path d="M4 19h16" stroke-width="2.4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'align:left': '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  'align:center': '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  'align:right': '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  'align:justify': '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  quote: '<path d="M6 17c-1-3 0-7 4-9M14 17c-1-3 0-7 4-9"/>',
  bullet: '<circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17" r="1" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/>',
  numbered: '<path d="M9 7h11M9 12h11M9 17h11M4 6l1-1v4M4 15h2l-2 3h2"/>',
  strike: '<path d="M4 12h16M16 7a4 4 0 0 0-4-2c-2.5 0-4 1.3-4 3M8 17a4 4 0 0 0 4 2c2.5 0 4-1.3 4-3"/>',
  outdent: '<path d="M4 6h16M11 10h9M11 14h9M4 18h16M8 9l-3 3 3 3"/>',
  indent: '<path d="M4 6h16M11 10h9M11 14h9M4 18h16M5 9l3 3-3 3"/>',
  clear: '<path d="M6 6h11M11 6l-3 13M15 15l5 5M20 15l-5 5"/>',
  ai: '<circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="16" cy="11" r="2" fill="currentColor"/><circle cx="9" cy="16" r="1.5" fill="currentColor"/>',
  chevron: '<path d="M8 10l4 4 4-4"/>',
};
const btn = (act, label, opts = {}) => `<button type="button" class="tx-btn${opts.on ? ' is-on' : ''}" data-fmt="${act}" aria-label="${label}" title="${label}"${opts.unbuilt ? ' data-unbuilt disabled' : ''}>${svg(I[opts.icon || act])}</button>`;
const sep = '<span class="tx-sep" aria-hidden="true"></span>';

export function textBarHtml(style, open) {
  const styleLabel = (STYLES.find(([, v]) => v === style) || STYLES[5])[0];
  const items = [
    `<button type="button" class="tx-btn" aria-label="Squarespace AI" title="Squarespace AI (out of scope)" data-unbuilt disabled>${svg(I.ai)}</button>`,
    sep,
    `<button type="button" class="tx-style" data-fmt="style-menu" aria-label="Text Style" aria-expanded="${open === 'style'}">${styleLabel}${svg(I.chevron)}</button>`,
    sep,
    btn('bold', 'Bold'), btn('italic', 'Italic'), btn('color', 'Text Color', { unbuilt: true }), btn('scaled', 'Scaled Text', { unbuilt: true }), btn('highlight', 'Text Highlight', { unbuilt: true }), btn('link', 'Link'),
    sep,
    `<button type="button" class="tx-btn" data-fmt="align-menu" aria-label="Text Alignment" aria-expanded="${open === 'align'}">${svg(I['align:left'])}</button>`,
    sep,
    btn('quote', 'Quote'), btn('bullet', 'Bullet List'), btn('numbered', 'Numbered List'),
    sep,
    btn('strike', 'Strike'),
    sep,
    btn('outdent', 'Outdent'), btn('indent', 'Indent'),
    sep,
    btn('clear', 'Clear Formatting'),
  ].join('');
  // The oracle lists each style's shortcut: Cmd+Opt+6 to 3 for headings, 2 to 0 for paragraphs, M.
  const KEYS = { h1: '6', h2: '5', h3: '4', h4: '3', 'p.sqsrte-large': '2', p: '1', 'p.sqsrte-small': '0', pre: 'M' };
  const styleMenu = open === 'style' ? `<div class="tx-pop tx-styles" role="menu">${STYLES.map(([l, v]) => `<button type="button" role="menuitemradio" aria-checked="${v === style}" data-fmt="style" data-v="${v}" aria-label="${l}"><span class="tx-check">${v === style ? '✓' : ''}</span><span class="tx-sname">${l}</span><span class="tx-keys"><kbd>⌘</kbd><kbd>⌥</kbd><kbd>${KEYS[v]}</kbd></span></button>`).join('')}</div>` : '';
  const alignMenu = open === 'align' ? `<div class="tx-pop tx-aligns" role="menu">${['left', 'center', 'right', 'justify'].map((a) => btn(`align:${a}`, `Text align: ${a}`)).join('')}</div>` : '';
  return `<div class="tx-row">${items}</div>${styleMenu}${alignMenu}`;
}

// 58px above the block's top edge, its left edge on the block's (oracle screenshot), kept
// inside the canvas.
export function textBarPosition(block, frame, stage) {
  const ox = frame.left - stage.left, oy = frame.top - stage.top;
  return { left: Math.max(4, ox + block.left + 1), top: Math.max(oy + 4, oy + block.top - 58) };
}
