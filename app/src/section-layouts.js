// View Layouts (parity/findings/CAP-VIEWLAYOUTS.json): the Layouts panel lists a section's own blocks
// re-laid out, from the list its mix of blocks has. Mixes not read on the oracle have no list here.
import { LAYOUTS } from './section-layouts-data.js';
import { TYPE_LAYOUTS, TYPE_TILES, MIX_LAYOUTS } from './section-layouts-types.js';
import { dividerEdge } from './render.js';
import { setStyleProp } from './text-format.js';

const words = (b) => String(b.html || '').replace(/<[^>]+>/g, '').trim();
const roleOf = (b) => {
  if (b.type === 'image') return 'i';
  if (b.type === 'button') return 'b';
  if (b.type === 'text') return /^\s*<h[1-4]/.test(b.html || '') ? 'h' : 'p';
  return null;
};

// An empty text block and a Shape have no part in a layout: a pick drops them. A stand-in is a Shape with its type's label.
const dropped = (b) => (b.type === 'shape' && !b.label) || (b.type === 'text' && !words(b));
// The oracle's name for a block outside the text, image and button mixes: ours, or a stand-in's label.
const NAMES = { video: 'Video', accordion: 'Accordion', scrolling: 'Scrolling', code: 'Code', embed: 'Embed', markdown: 'Markdown', map: 'Map' };
const kindOf = (b) => (b.type === 'shape' ? b.label : NAMES[b.type]) || null;
// The list a 5 or 10 tile type shares, by place: desktop row start and columns, phone row start and columns,
// rows past the block's last row, style (CAP-U10PICK-CODE.json, QUOTE, ACCORDION; VIDEO, MAP).
const SHARED = {
  5: [[5, 7, 21, 2, 2, 10, 4], [8, 15, 25, 2, 2, 10, 0, { divider: 'soft' }], [3, 3, 13, 2, 2, 10, 4, { theme: 'dark', divider: 'rounded' }], [4, 9, 19, 1, 2, 10, 3], [3, 10, 18, 1, 2, 10, 2, { theme: 'dark' }]],
  10: [[3, 11, 17, 3, 1, 11, 0], [1, 10, 18, 3, 1, 11, 0], [1, 7, 21, 3, 1, 11, 0], [1, 5, 23, 3, 1, 11, 0], [1, 3, 25, 3, 1, 11, 0], [1, 1, 14, 1, 1, 11, 0], [1, 14, 27, 1, 1, 11, 0], [1, 1, 27, 1, 1, 11, 0], [3, 11, 17, 3, 1, 11, 0, { theme: 'dark', divider: 'soft' }], [1, 3, 25, 3, 1, 11, 0, { theme: 'dark', divider: 'soft' }]],
};
// The types whose step from tile to tile matches Code's (5 tiles) or Video's and Map's (10): CAP-U10FAMILYPREDICT.json.
const FAMILY = new Set(['Markdown', 'Audio', 'Embed', 'Tag Cloud', 'Zola']);
function typeList(kind, b) {
  if (TYPE_LAYOUTS[kind]) return TYPE_LAYOUTS[kind];
  const tiles = TYPE_TILES[kind];
  if (!tiles) return null;
  const rows = b.layout.desktop.area[2] - b.layout.desktop.area[0], phone = b.layout.mobile.area[2] - b.layout.mobile.area[0];
  // Only the families the reads put with Code or Video share a list; the rest show their tiles, not built.
  if (!FAMILY.has(kind)) return tiles.map((tile) => ({ tile, unbuilt: true }));
  return SHARED[tiles.length].map(([r, c0, c1, pr, pc0, pc1, pad, style], n) => ({
    rows: r + rows - 1 + pad, phoneRows: pr + phone - 1, tile: tiles[n], inferred: true,
    places: { t0: [`${r}/${c0}/${r + rows}/${c1}`, `${pr}/${pc0}/${pr + phone}/${pc1}`] }, ...(style && { style }),
  }));
}

// The blocks by role in section order, and the mix's key: 'h1p1i1b1'. No key for an empty section or
// a block type outside the mixes.
export function sectionMix(s) {
  const kept = s.blocks.filter((b) => !dropped(b));
  // One block of a type outside the mixes, alone: its own list (CAP-U10TYPES1.json to 3). Mixed with others: off, not read.
  if (kept.length === 1 && kindOf(kept[0])) {
    const list = typeList(kindOf(kept[0]), kept[0]);
    return list ? { key: kindOf(kept[0]), by: { t: kept }, list } : null;
  }
  // One of those types with other blocks: the mixes read (CAP-U10MIX-*.json), by the blocks' names; the rest off.
  if (kept.some(kindOf)) {
    const ROLE = { i: 'Image', b: 'Button', h: 'Heading', p: 'Text' };
    const key = kept.map((b) => kindOf(b) || ROLE[roleOf(b)]).sort().join('+'), list = MIX_LAYOUTS[key];
    if (!list) return null;
    const by = {};
    for (const b of kept) (by[kindOf(b) ? 't' : roleOf(b)] ||= []).push(b);
    return { key, by, list };
  }
  const by = { h: [], p: [], i: [], b: [] };
  for (const b of s.blocks) {
    if (dropped(b)) continue;
    const r = roleOf(b);
    if (!r) return null;
    by[r].push(b);
  }
  const key = ['h', 'p', 'i', 'b'].map((r) => (by[r].length ? r + by[r].length : '')).join('');
  return LAYOUTS[key] ? { key, by, list: LAYOUTS[key] } : null;
}

const area = (v) => v.split('/').map(Number);

// A layout that sets a theme turns the theme the section had on opening into this one, for all 11 starts
// (parity/findings/CAP-VIEWLAYOUTS.json, priorState).
const THEME_TURN = { '': 'dark', white: 'dark', 'white-bold': 'black-bold', light: 'black', 'light-bold': 'bright', 'bright-inverse': 'bright', bright: 'bright-inverse', dark: 'bright', 'dark-bold': 'white-bold', black: 'white', 'black-bold': 'bright' };
export const layoutTheme = (theme) => THEME_TURN[theme || ''];

// A pick also sets each text block's alignment, both ways: centred when its desktop columns sit evenly around the
// middle (start line + end line = 28), left otherwise (CAP-U10ALIGN-A.json, 6 of 6 seen; CAP-U10ALIGNPREDICT.json,
// 41 of 41 predicted in CAP-U10ALIGN-B, C and D). Its own paragraphs and headings; lists, quotes and code not read.
const centred = (desk) => { const [, c0, , c1] = area(desk); return c0 + c1 === 28; };
function alignText(b, centre) {
  if (typeof document === 'undefined' || !b.html) return;
  const t = document.createElement('template');
  t.innerHTML = b.html;
  for (const el of t.content.children) if (/^(P|H[1-4])$/.test(el.tagName)) setStyleProp(el, 'text-align', centre ? 'center' : '');
  b.html = t.innerHTML;
}

// One pick: every block's areas, the rows, the heading's tag; dropped blocks go. One undo step is the caller's.
export function applyLayout(s, mix, n, base) {
  const L = mix.list[n];
  if (L.unbuilt) return;
  s.blocks = s.blocks.filter((b) => !dropped(b));
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [desk, phone] = L.places[r + k];
      b.layout.desktop.area = area(desk);
      b.layout.mobile.area = area(phone);
      if (r === 'h' && L.tag) b.html = b.html.replace(/<(\/?)h[1-4]/g, `<$1${L.tag}`);
      if (r === 'h' || r === 'p') alignText(b, centred(desk));
    });
  }
  s.rows = { ...s.rows, desktop: L.rows, mobile: L.phoneRows };
  // A few layouts set the section's theme, divider or height; the rest leave what it had on opening.
  // A divider a layout sets has no stroke (CAP-U10UNDO.json, the section's context reads style none).
  // Its flips go off too, and a layout with no divider of its own puts the start's back (CAP-U10FLIP.json: Flip X; Flip Y inferred).
  Object.assign(s, base, L.style?.theme && { theme: layoutTheme(base.theme) }, L.style?.height && { height: L.style.height }, L.style?.divider && { divider: true, dividerShape: L.style.divider, dividerStroke: 'none', dividerFlip: undefined, dividerFlipY: undefined });
}

// Which layout the section now shows, for the tile's mark after Undo and Redo: the last one picked if it still fits.
export function layoutShown(s, mix, last) {
  const fits = (n) => !mix.list[n].unbuilt && s.rows?.desktop === mix.list[n].rows && Object.keys(mix.by).every((r) => mix.by[r].every((b, k) => b.layout.desktop.area.join('/') === mix.list[n].places[r + k][0]));
  if (last != null && fits(last)) return last;
  const n = mix.list.findIndex((_, k) => fits(k));
  return n < 0 ? null : n;
}

// Tile drawing, in the section's own canvas: 1600 wide, 100 side margin, 24 columns, 41.09 a row.
const SCALE = 283 / 1600;
const xOf = (line) => (line <= 1 ? 0 : line >= 27 ? 1600 : 100 + (line - 2) * 58.75);
function tile(mix, n, on, look) {
  const L = mix.list[n], height = L.tile, { bg, ink } = look(L.style?.theme);
  if (L.unbuilt) return `<li><button type="button" class="lo-tile lo-unbuilt" disabled aria-label="Layout ${n + 1}, not built" style="height:${height}px;background:${bg}"></button></li>`;
  const pad = Math.max(0, (height / SCALE - L.rows * 41.09) / 2);
  const parts = [];
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [r0, c0, r1, c1] = area(L.places[r + k][0]);
      const box = `left:${(xOf(c0) * SCALE).toFixed(1)}px;top:${((pad + (r0 - 1) * 41.09) * SCALE).toFixed(1)}px;width:${((xOf(c1) - xOf(c0) - 11) * SCALE).toFixed(1)}px;height:${(((r1 - r0) * 41.09 - 11) * SCALE).toFixed(1)}px`;
      if (r === 'i' || r === 't') parts.push(`<span class="lo-i" style="${box}"></span>`);
      if (r === 'b') parts.push(`<span class="lo-b" style="${box}"><i></i></span>`);
      if (r === 'h' || r === 'p') parts.push(`<span class="lo-t lo-${L.tag && r === 'h' ? L.tag : r}" style="${box};color:${ink}${centred(L.places[r + k][0]) ? ';text-align:center' : ''}">${words(b).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`);
    });
  }
  // A layout with a divider of its own: the tile's bottom is that divider's edge, its line too (CAP-U10TILES.json, the
  // rounded tile's screenshot). A 6vw band at 1600 is 17px here. A start's divider kept by a layout isn't drawn: not read.
  const edge = L.style?.divider && dividerEdge({ dividerShape: L.style.divider });
  if (edge) {
    const band = 96 * SCALE, y = (r) => +(height - band * (1 - r)).toFixed(2), pts = edge.map(([v, r]) => `L${+(v * 283).toFixed(2)},${y(r)}`).reverse().join('');
    parts.unshift(`<svg class="lo-edge" viewBox="0 0 283 ${height}" width="283" height="${height}" aria-hidden="true"><path d="M0,6A6,6 0 0 1 6,0H277A6,6 0 0 1 283,6${pts}Z" fill="${bg}"/></svg>`);
  }
  return `<li><button type="button" class="lo-tile${on ? ' is-on' : ''}${edge ? ' lo-div' : ''}" data-layout="${n}" aria-label="Layout ${n + 1}" aria-pressed="${on}" style="height:${height}px;background:${edge ? 'transparent' : bg}">${parts.join('')}</button></li>`;
}

export function layoutsPanelHtml(mix, picked, look) {
  return `<div class="lo-head">Layouts</div><ul class="lo-list">${mix.list.map((_, n) => tile(mix, n, picked === n, look)).join('')}</ul>`;
}

// The panel after a pick: up to where it would open on the section as it now is, never down, and never above the
// section's top + 140: 195 from 562 and 603.1 tall, 248 after a pick made it 667.6 (CAP-VIEWLAYOUTS.json afterPick,
// CAP-U10READ4.json, CAP-U10READ6.json; 33 of 34 seen reads within 1.5 px, a reopen at 681.4 with a divider 3 px off).
export const layoutsPickTop = ({ top, secTop, fresh }) => Math.max(secTop + 140, Math.min(top, fresh));

export const sectionLook = (s) => ({ theme: s.theme, height: s.height, divider: s.divider, dividerShape: s.dividerShape, dividerStroke: s.dividerStroke, dividerFlip: s.dividerFlip, dividerFlipY: s.dividerFlipY });
