// View Layouts (parity/findings/CAP-VIEWLAYOUTS.json): the Layouts panel lists a section's own blocks
// re-laid out, from the list its mix of blocks has. Mixes not read on the oracle have no list here.
import { LAYOUTS } from './section-layouts-data.js';
import { TYPE_LAYOUTS, TYPE_TILES, MIX_LAYOUTS } from './section-layouts-types.js';
import { dividerEdge } from './render.js';
import { setStyleProp } from './text-format.js';

// A space where a paragraph, heading or list item ends, so a list's items don't run together on its tile.
const words = (b) => String(b.html || '').replace(/<\/(p|h[1-6]|li)>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const listFirst = (b) => /^\s*<(ul|ol|blockquote)[\s>]/.test(b.html || '');
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
    // Two typed blocks (Code and Map) take their places by name, as the list keys them (CAP-U10FADED-C.json).
    by.t?.sort((x, y) => kindOf(x).localeCompare(kindOf(y)));
    return { key, by, list };
  }
  const by = { h: [], p: [], i: [], b: [] };
  for (const b of s.blocks) {
    if (dropped(b)) continue;
    const r = roleOf(b);
    if (!r) return null;
    by[r].push(b);
  }
  // A Text that starts with a list or a quote, alone, is laid out as a heading alone (CAP-U10TEXTMIX-B.json, the same
  // start lines and columns as -D pick for pick). With other blocks: not read, it stays a paragraph.
  if (by.p.length === 1 && s.blocks.filter((b) => !dropped(b)).length === 1 && listFirst(by.p[0])) [by.h, by.p] = [by.p, []];
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
// 41 of 41 predicted in CAP-U10ALIGN-B, C and D). Its paragraphs and headings, those inside list items and quotes too
// (CAP-U10TEXTMIXPREDICT.json, 160 of 160 lines); the lists, items and quotes themselves keep theirs, and code has none.
const centred = (desk) => { const [, c0, , c1] = area(desk); return c0 + c1 === 28; };
function alignText(b, centre) {
  if (typeof document === 'undefined' || !b.html) return;
  const t = document.createElement('template');
  t.innerHTML = b.html;
  for (const el of t.content.querySelectorAll('p, h1, h2, h3, h4')) setStyleProp(el, 'text-align', centre ? 'center' : '');
  b.html = t.innerHTML;
}

// Rule P (CAP-U10ROWSPREDICT.json, 24 of 24 predicted in CAP-U10ROWS-A.json): a layout with a step gives its
// block one of two spans, and the layout the section shows before the pick decides which. The entry holds the
// span it was read at; lowAfter lists the layouts after which it is 'by' rows shorter, block and section alike.
// A section that shows no layout counts as none. Read for the paragraph list and Instagram's pick 2.
// The walks over every pair (CAP-U10STEP-A.json to C, rule S predicted 145 of 164 in CAP-U10STEPPREDICT.json) read
// the rest as facts: Instagram's pick 3 steps as 2; the heading list's (h1p1) layout 1 has its heading a row shorter
// after 4; its layout 0 has three spans, so 'grow' gives the rows added to the read one by the layout before, and the
// blocks in 'push' move down with it. Every other pick there, and every pick of p1i1, is the same whatever came before.
export function variant(L, prev) {
  if (!L.step) return L;
  const { read, lowAfter = [], by = 0, block, grow, push = [] } = L.step;
  const d = grow ? grow[prev] || 0 : (lowAfter.includes(prev) ? -by : 0) + (read === 'low' ? by : 0);
  if (!d) return L;
  const [r0, c0, r1, c1] = area(L.places[block][0]), places = { ...L.places, [block]: [`${r0}/${c0}/${r1 + d}/${c1}`, L.places[block][1]] };
  for (const k of push) { const [q0, k0, q1, k1] = area(L.places[k][0]); places[k] = [`${q0 + d}/${k0}/${q1 + d}/${k1}`, L.places[k][1]]; }
  return { ...L, rows: L.rows + d, places };
}
// The layouts before that give a step's other spans.
const others = (st) => (st.grow ? Object.keys(st.grow).map(Number) : [st.read === 'high' ? st.lowAfter[0] : -1]);

// One pick: every block's areas, the rows, the heading's tag; dropped blocks go. One undo step is the caller's.
export function applyLayout(s, mix, n, base) {
  if (mix.list[n].unbuilt) return;
  const L = variant(mix.list[n], layoutShown(s, mix, null));
  s.blocks = s.blocks.filter((b) => !dropped(b));
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [desk, phone] = L.places[r + k];
      b.layout.desktop.area = area(desk);
      b.layout.mobile.area = area(phone);
      // Code becomes a paragraph at every pick (CAP-U10TEXTMIX-C.json: code alone takes the paragraph list as a P, and in
      // a mixed Text its code reads as a P too). Read with one line of code; inline code marks inside are not read.
      if (r === 'h' || r === 'p') b.html = b.html.replace(/<pre[^>]*>(?:<code[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/g, '<p>$1</p>');
      // The tag: a heading's, or every paragraph's in a list or a quote (CAP-U10TEXTMIX-B.json: their P become H1).
      if (r === 'h' && L.tag) b.html = b.html.replace(listFirst(b) ? /<(\/?)(?:p|h[1-4])(?=[\s>])/g : /<(\/?)h[1-4]/g, `<$1${L.tag}`);
      if (r === 'h' || r === 'p') alignText(b, centred(desk));
    });
  }
  s.rows = { ...s.rows, desktop: L.rows, mobile: L.phoneRows };
  // A few layouts set the section's theme, divider or height; the rest leave what it had on opening.
  // A divider a layout sets has no stroke (CAP-U10UNDO.json, the section's context reads style none).
  // Its flips go off too, and a layout with no divider of its own puts the start's back (CAP-U10FLIP.json: Flip X; Flip Y inferred).
  Object.assign(s, base, L.style?.theme && { theme: layoutTheme(base.theme) }, L.style?.height && { height: L.style.height }, L.style?.divider && { divider: true, dividerShape: L.style.divider, dividerStroke: 'none', dividerFlip: undefined, dividerFlipY: undefined });
}

// Undo onto a layout puts its step again, from the layout it leaves (CAP-U10WALK2.json: from 1 back to 0 gives 9;
// CAP-U10UNDO.json: from 3 back to 0 gives 10), with the Layouts panel open or closed (CAP-U10UNDOCLOSED-A.json and
// -B.json: from 0 back to 1 gives 13). Redo brings back the state Undo left, so it has none.
export function restep(s, mix, prev) {
  const n = layoutShown(s, mix, null);
  // An Undo that stays on the same layout (a text edit in it, say) keeps the state as it was: not read.
  if (n === prev) return;
  if (n == null) return startStep(s, mix, prev);
  if (!mix.list[n].step) return;
  const L = variant(mix.list[n], prev), { block, push = [] } = L.step;
  if (!mix.by[block[0]]?.[+block.slice(1)]) return;
  for (const k of [block, ...push]) { const b = mix.by[k[0]]?.[+k.slice(1)]; if (b) b.layout.desktop.area = area(L.places[k][0]); }
  s.rows = { ...s.rows, desktop: L.rows };
}

// Undo from paragraph layout 1 onto a section that shows no layout: the text ends a row higher and the section has a
// row less (8 rows to 7, the text 1/2/3/10 to 1/2/2/10: CAP-U10UNDOPAST.json a undo 3, CAP-U10UNDOCLOSED-A.json and
// -B.json U07). From 0 and 2 it stays (CAP-U10UNDO.json b meta z, CAP-U10UNDOPAST.json a undo 1). Read on that one
// start only; from 3, 4 and 5 not read.
const START_STEP = { p1: { lowAfter: [1], by: 1, block: 'p0' } };
function startStep(s, mix, prev) {
  const st = START_STEP[mix.key], b = st && mix.by[st.block[0]]?.[+st.block.slice(1)];
  if (!b || !st.lowAfter.includes(prev)) return;
  const [r0, c0, r1, c1] = b.layout.desktop.area;
  if (r1 - st.by <= r0) return;
  b.layout.desktop.area = [r0, c0, r1 - st.by, c1];
  s.rows = { ...s.rows, desktop: s.rows.desktop - st.by };
}

// A heading alone at layouts 2 to 5 (CAP-U10TEXTMIX-D.json; a list and a quote in -B take the same places): the block's
// end line follows its words, the fewest rows whose height (rows x pitch - gap) holds its content and 33.5px more.
// 30 was fitted on the -B and -D reads (25.1 to 36.3 fit them: seen, not scored). Round 1 near row boundaries
// (CAP-U10PADPREDICT.json) put it at 32.0 or more; refit to 33.5, it held all 8 fresh reads it predicted in
// CAP-U10PADREFIT1.json, measured on the oracle's own content height (32.0 to 33.6 fits every read). Frozen there.
// Not built: a heading Text whose first pick is layout 2 ends short there (6 rows for 3 headings, 1 for 5 lines).
// The section's rows are that end line plus 'past' (rule K's form).
// contentH(b) is the block's content height as rendered at the new place; m holds the grid's pitch and gap.
const FIT_PAD = 33.5;
export function fitLayout(s, mix, n, contentH, m) {
  const f = mix.list[n]?.fit, b = f && mix.by[f.block[0]]?.[+f.block.slice(1)];
  if (!b) return;
  const [r0, c0, , c1] = b.layout.desktop.area, rows = Math.max(1, Math.ceil((contentH(b) + FIT_PAD + m.rg) / m.pitch));
  b.layout.desktop.area = [r0, c0, r0 + rows, c1];
  s.rows = { ...s.rows, desktop: r0 + rows + f.past };
}

// Which layout the section now shows, for the tile's mark after Undo and Redo: the last one picked if it still fits.
export function layoutShown(s, mix, last) {
  // A fitted block matches by its start line and columns, and the rows by its end line.
  const at = (L, r, k, a) => { const w = L.places[r + k][0]; if (L.fit?.block !== r + k) return a.join('/') === w; const [r0, c0, , c1] = area(w); return a[0] === r0 && a[1] === c0 && a[3] === c1 && s.rows?.desktop === a[2] + L.fit.past; };
  const fitsAt = (L) => (!!L.fit || s.rows?.desktop === L.rows) && Object.keys(mix.by).every((r) => mix.by[r].every((b, k) => at(L, r, k, b.layout.desktop.area)));
  // Any of a step's spans.
  const fits = (n) => !mix.list[n].unbuilt && (fitsAt(mix.list[n]) || (!!mix.list[n].step && others(mix.list[n].step).some((p) => fitsAt(variant(mix.list[n], p)))));
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
