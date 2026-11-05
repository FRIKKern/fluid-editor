// View Layouts (parity/findings/CAP-VIEWLAYOUTS.json): the Layouts panel lists a section's own blocks
// re-laid out, from the list its mix of blocks has. Mixes not read on the oracle have no list here.
import { LAYOUTS } from './section-layouts-data.js';

const words = (b) => String(b.html || '').replace(/<[^>]+>/g, '').trim();
const roleOf = (b) => {
  if (b.type === 'image') return 'i';
  if (b.type === 'button') return 'b';
  if (b.type === 'text') return /^\s*<h[1-4]/.test(b.html || '') ? 'h' : 'p';
  return null;
};

// An empty text block and a Shape have no part in a layout: a pick drops them.
const dropped = (b) => b.type === 'shape' || (b.type === 'text' && !words(b));

// The blocks by role in section order, and the mix's key: 'h1p1i1b1'. No key for an empty section or
// a block type outside the mixes.
export function sectionMix(s) {
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

// One pick: every block's areas, the rows, the heading's tag; dropped blocks go. One undo step is the caller's.
export function applyLayout(s, mix, n, base) {
  const L = mix.list[n];
  s.blocks = s.blocks.filter((b) => !dropped(b));
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [desk, phone] = L.places[r + k];
      b.layout.desktop.area = area(desk);
      b.layout.mobile.area = area(phone);
      if (r === 'h' && L.tag) b.html = b.html.replace(/<(\/?)h[1-4]/g, `<$1${L.tag}`);
    });
  }
  s.rows = { ...s.rows, desktop: L.rows, mobile: L.phoneRows };
  // A few layouts set the section's theme, divider or height; the rest leave what it had on opening.
  Object.assign(s, base, L.style?.theme && { theme: L.style.theme }, L.style?.height && { height: L.style.height }, L.style?.divider && { divider: true, dividerShape: L.style.divider });
}

// Tile drawing, in the section's own canvas: 1600 wide, 100 side margin, 24 columns, 41.09 a row.
const SCALE = 283 / 1600;
const xOf = (line) => (line <= 1 ? 0 : line >= 27 ? 1600 : 100 + (line - 2) * 58.75);
function tile(mix, n, on, look) {
  const L = mix.list[n], height = L.tile, { bg, ink } = look(L.style?.theme);
  const pad = Math.max(0, (height / SCALE - L.rows * 41.09) / 2);
  const parts = [];
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [r0, c0, r1, c1] = area(L.places[r + k][0]);
      const box = `left:${(xOf(c0) * SCALE).toFixed(1)}px;top:${((pad + (r0 - 1) * 41.09) * SCALE).toFixed(1)}px;width:${((xOf(c1) - xOf(c0) - 11) * SCALE).toFixed(1)}px;height:${(((r1 - r0) * 41.09 - 11) * SCALE).toFixed(1)}px`;
      if (r === 'i') parts.push(`<span class="lo-i" style="${box}"></span>`);
      if (r === 'b') parts.push(`<span class="lo-b" style="${box}"><i></i></span>`);
      if (r === 'h' || r === 'p') parts.push(`<span class="lo-t lo-${L.tag && r === 'h' ? L.tag : r}" style="${box};color:${ink}">${words(b).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`);
    });
  }
  return `<li><button type="button" class="lo-tile${on ? ' is-on' : ''}" data-layout="${n}" aria-label="Layout ${n + 1}" aria-pressed="${on}" style="height:${height}px;background:${bg}">${parts.join('')}</button></li>`;
}

export function layoutsPanelHtml(mix, picked, look) {
  return `<div class="lo-head">Layouts</div><ul class="lo-list">${mix.list.map((_, n) => tile(mix, n, picked === n, look)).join('')}</ul>`;
}

// Read at two section heights with the section at the top of the window: 248 at 667.6, 272 at 749.8.
export const layoutsPanelTop = (sectionHeight) => Math.round(248 + (sectionHeight - 667.6) * (24 / 82.2));

export const sectionLook = (s) => ({ theme: s.theme, height: s.height, divider: s.divider, dividerShape: s.dividerShape });
