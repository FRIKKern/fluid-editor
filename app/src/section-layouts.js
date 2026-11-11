// View Layouts (parity/findings/CAP-VIEWLAYOUTS.json): the Layouts panel lists a section's own blocks
// re-laid out, from the list its mix of blocks has. Mixes not read on the oracle have no list here.
import { LAYOUTS } from './section-layouts-data.js';
import { TYPE_LAYOUTS, TYPE_TILES, MIX_LAYOUTS } from './section-layouts-types.js';
import { dividerEdge } from './render.js';
import { setStyleProp } from './text-format.js';

// A Text that a layout made a Scrolling block keeps its words (textHtml) and is still that Text to the mixes.
const asText = (b) => (b.textHtml != null ? { ...b, type: 'text', html: b.textHtml } : b);
// A space where a paragraph, heading or list item ends, so a list's items don't run together on its tile.
const words = (x) => String(asText(x).html || '').replace(/<\/(p|h[1-6]|li)>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const listFirst = (x) => /^\s*<(ul|ol|blockquote)[\s>]/.test(asText(x).html || '');
const roleOf = (x) => {
  const b = asText(x);
  if (b.type === 'image') return 'i';
  if (b.type === 'button') return 'b';
  if (b.type === 'text') return /^\s*<h[1-4]/.test(b.html || '') ? 'h' : 'p';
  return null;
};

// An empty text block and a Shape have no part in a layout: a pick drops them. A stand-in is a Shape with its type's label.
const dropped = (b) => (b.type === 'shape' && !b.label) || (b.type === 'text' && !words(b));
// The oracle's name for a block outside the text, image and button mixes: ours, or a stand-in's label.
const NAMES = { video: 'Video', accordion: 'Accordion', scrolling: 'Scrolling', code: 'Code', embed: 'Embed', markdown: 'Markdown', map: 'Map' };
const kindOf = (b) => (b.textHtml != null ? null : (b.type === 'shape' ? b.label : NAMES[b.type]) || null);
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
  // Phone rows (CAP-U10TYPEPHONE.json, runs A and B alike, read for Quote, Code and Video): the block's phone end line
  // less 1, but layout 0 of the 5-tile list keeps one row below it, and the 10-tile list's places 3 rows down keep two
  // above and one below (end line + 1). Inferred for these families from the types read.
  const below = (n, pr) => (tiles.length === 5 && n === 0 ? 1 : tiles.length === 10 && pr === 3 ? 2 : 0);
  return SHARED[tiles.length].map(([r, c0, c1, pr, pc0, pc1, pad, style], n) => ({
    rows: r + rows - 1 + pad, phoneRows: pr + phone - 1 + below(n, pr), tile: tiles[n], inferred: true,
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
  // start lines and columns as -D pick for pick). With one paragraph and nothing else it takes the heading's place
  // and tag, the heading list's 6 tiles (CAP-U10LF-LPA.json, LPB, QPA, QPB, read twice alike). With a heading it is
  // the paragraph (CAP-U10LF-LHA.json, QHA). With other blocks: not read, it stays a paragraph.
  if (by.p.length === 1 && kept.length === 1 && listFirst(by.p[0])) [by.h, by.p] = [by.p, []];
  if (by.p.length === 2 && kept.length === 2 && listFirst(by.p[0]) !== listFirst(by.p[1])) by.h = by.p.splice(by.p.findIndex(listFirst), 1);
  const key = ['h', 'p', 'i', 'b'].map((r) => (by[r].length ? r + by[r].length : '')).join('');
  // The heading list with a list- or quote-first Text: every Text's end line grows with its height (rule E, growLayout).
  const grows = key === 'h1p1' && [...by.h, ...by.p].some(listFirst);
  return LAYOUTS[key] ? { key, by, list: LAYOUTS[key], ...(grows && { grows }) } : null;
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
const marqueeWords = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
// A Scrolling block's text size at a 1600 wide page (site.css's .marquee, its page width 1400).
const marqueePx = (v) => Math.min((v - 1) * 19.2 + 16, Math.max((v - 1) * 16.8 + 16, v * 16));
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
  // A step grows one block (and moves those it pushes), or with move shifts it whole; a list steps each block on its own
  // (h1p2b1's 2 and 3: the heading grows, the button moves, CAP-U10BTN).
  let places = L.places;
  for (const { read, lowAfter = [], by = 0, block, grow, push = [], move } of [].concat(L.step)) {
    const d = grow ? grow[prev] || 0 : (lowAfter.includes(prev) ? -by : 0) + (read === 'low' ? by : 0);
    if (!d) continue;
    const [r0, c0, r1, c1] = area(places[block][0]);
    places = { ...places, [block]: [`${move ? r0 + d : r0}/${c0}/${r1 + d}/${c1}`, places[block][1]] };
    for (const k of push) { const [q0, k0, q1, k1] = area(places[k][0]); places[k] = [`${q0 + d}/${k0}/${q1 + d}/${k1}`, places[k][1]]; }
  }
  if (places === L.places) return L;
  // The rows follow the lowest end line: a stepped block above another one changes no rows (CAP-U10WALK-W1A.json, h1p1b1's 1).
  const low = (p) => Math.max(...Object.values(p).map((v) => area(v[0])[2]));
  return { ...L, rows: L.rows + low(places) - low(L.places), places };
}
// The layouts before that give a step's other spans.
const others = (step) => [...new Set([].concat(step).flatMap((st) => (st.grow ? Object.keys(st.grow).map(Number) : [st.read === 'high' ? st.lowAfter[0] : -1])))];

// The first pick, onto a section that shows no layout, fitted on seen reads, unscored: a Text of one block (a single P or
// PRE) with more than one line at the start takes the paragraph list's layout 0 at its low span, as after layout 1, and
// one line its high span. Low: CAP-U10WORDS.json's W2 (2 lines, 1/2/3/10) and W4 (5 lines, 1/2/4/10), three lines of
// code (CAP-U10CD1.json, CAP-U10ENDS-ECDA.json with -ECDB alike, which a pick makes one line). High: W1 and one line
// with inline code (CAP-U10CD2.json). A Text of several blocks keeps the high span (CAP-U10TEXTMIX-C.json's M and
// CAP-U10ENDS-EMXA.json with -EMXB read taller still, rule E's named misses). Other first picks: not read.
// lines(b) is the block's line count as drawn before the pick.
const oneBlock = (b) => {
  if (typeof document === 'undefined') return false;
  const t = document.createElement('template');
  t.innerHTML = b.html || '';
  const k = [...t.content.children];
  return k.length === 1 && (k[0].tagName === 'P' || k[0].tagName === 'PRE');
};
const firstPrev = (mix, n, lines) => (mix.key === 'p1' && n === 0 && lines && oneBlock(mix.by.p[0]) && lines(mix.by.p[0]) > 1 ? 1 : null);

// U10 read facts, not a rule (rule W is frozen, its misses named): the paragraph list's spans for words of about 2 and 4
// lines at ten columns (CAP-U10WORDS.json's W2 and W4, 16 picks each). Each layout's entry holds them under 'words', by
// those lines: its place, rows and step. Layout 1 has no step there (7 rows with two lines, 8 with four); the others are
// the read high span over a low one row long after layout 1. Each was read high after one layout and low after 1;
// after the others ours takes it as high, as with one line (not read), and an Undo onto them is not read. Phone rows,
// read for one, two and four lines (CAP-U10PHONEROWS.json, predicted 15 of 18, runs A and B alike): the phone end line
// less 1, and at layout 0 the end line itself. Any other count, a Text of several blocks, and a Text of code (a pick
// makes its lines one) keep the one-line entries. words(b) is the Text's line count at ten columns.
const wordsKey = (mix, words) => {
  const b = mix.key === 'p1' && words && mix.by.p[0];
  const n = b && oneBlock(b) && !/^\s*<pre[\s>]/.test(b.html || '') ? words(b) : null;
  return n ? String(n) : null;
};
const byWords = (L, k) => (k && L.words?.[k] ? { ...L, ...L.words[k] } : L);
// Every form a layout can take: its one-line entry and the read word spans.
const forms = (L) => [L, ...Object.keys(L.words || {}).map((k) => byWords(L, k))];

// One pick: every block's areas, the rows, the heading's tag; dropped blocks go. One undo step is the caller's.
export function applyLayout(s, mix, n, base, lines, words) {
  if (mix.list[n].unbuilt) return;
  const L = variant(byWords(mix.list[n], wordsKey(mix, words)), layoutShown(s, mix, null) ?? firstPrev(mix, n, lines));
  s.blocks = s.blocks.filter((b) => !dropped(b));
  for (const r of Object.keys(mix.by)) {
    mix.by[r].forEach((b, k) => {
      const [desk, phone] = L.places[r + k];
      b.layout.desktop.area = area(desk);
      b.layout.mobile.area = area(phone);
      // The Scrolling turn (CAP-U10SC1.json to SC5, CAP-U10TEXTMIX-A2.json and -D): at a few full-width layouts the
      // heading's Text becomes a Scrolling block, its items its words run together (a list's items too, no space) and an
      // asterisk, at that layout's text size and wave; the next pick makes it the Text again.
      if (b.textHtml != null) { Object.assign(b, { type: 'text', html: b.textHtml }); for (const x of ['textHtml', 'text', 'size', 'wave']) delete b[x]; }
      if (L.scroll?.block === r + k) {
        Object.assign(b, { type: 'scrolling', textHtml: b.html, text: `${marqueeWords(b.html)} *`, size: L.scroll.size, wave: L.scroll.wave });
        delete b.html;
        return;
      }
      // Code becomes a paragraph at every pick (CAP-U10TEXTMIX-C.json: code alone takes the paragraph list as a P, and in
      // a mixed Text its code reads as a P too), its lines joined by a space (CAP-U10CD1.json). Inline code marks never
      // reach a pick there: the oracle's paste drops them (CAP-U10CD2.json).
      if (r === 'h' || r === 'p') b.html = b.html.replace(/<pre[^>]*>(?:<code[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/g, (_, t) => `<p>${t.replace(/\s*\n\s*/g, ' ').trim()}</p>`);
      // The tag: a heading's, or every paragraph's in a list or a quote (CAP-U10TEXTMIX-B.json: their P become H1).
      if (r === 'h' && L.tag) b.html = b.html.replace(listFirst(b) ? /<(\/?)(?:p|h[1-4])(?=[\s>])/g : /<(\/?)h[1-4]/g, `<$1${L.tag}`);
      // A list or a quote as the heading list's paragraph: its P become H4 at every pick (CAP-U10LF-LHA.json, LHB, QHA,
      // QHB, read twice alike, and CAP-U10SC3.json). Read with one heading only.
      if (r === 'p' && mix.key === 'h1p1' && listFirst(b)) b.html = b.html.replace(/<(\/?)p(?=[\s>])/g, '<$1h4');
      if (r === 'h' || r === 'p') alignText(b, centred(desk));
      // A pick gives a Quote 3% padding where a new one has 6% (CAP-U10QUOTEH.json, picks 0 to 4, runs A and B alike: 24.4 at
      // 811.9 wide, 17.3 at 576.8, 13.8 at 459.3; new, 20.5 at 341.7). Its content then fits the layout's span and the section
      // doesn't grow. Whether the pick or the width sets it is not read: every read away from a pick is 341.7 wide.
      if (b.standin === 'quote') b.quotePad = 3;
      cardText(b, L.design?.[r + k]);
    });
  }
  s.rows = { ...s.rows, desktop: L.rows, mobile: L.phoneRows };
  // A few layouts set the section's theme, divider or height; the rest leave what it had on opening.
  // A divider a layout sets has no stroke (CAP-U10UNDO.json, the section's context reads style none).
  // Its flips go off too, and a layout with no divider of its own puts the start's back (CAP-U10FLIP.json: Flip X; Flip Y inferred).
  Object.assign(s, base, L.style?.theme && { theme: layoutTheme(base.theme) }, L.style?.height && { height: L.style.height }, L.style?.divider && { divider: true, dividerShape: L.style.divider, dividerStroke: 'none', dividerFlip: undefined, dividerFlipY: undefined });
}

// The paragraph list's layout 1 makes the Text a card (CAP-U10PAD1.json, runs A and B alike): Background on, Corner 22,
// Padding L (12% of its width: one line 245.5 tall at 929.5 wide, on the phone 112.8), its words in the middle of the box
// on desktop and phone (justify center; the phone's from its screenshot), in the theme's colors for a Text with a
// Background. The same 12% gives every stored layout 1 height: one, two and four lines of words (CAP-U10WORDS.json), code
// (CAP-U10CD1.json, CAP-U10ENDS-ECDA.json) and mixed Texts (CAP-U10TEXTMIX-C.json, CAP-U10ENDS-EMXA.json). The next
// layout takes the card off (layout 0 after 1: 22.4); ours puts the block's own alignment, Background, Padding and Corner
// back (not read).
const CARD_KEYS = ['background', 'pad', 'corner'];
function cardText(b, card) {
  if (b.layoutCard && !card) {
    for (const k of CARD_KEYS) delete b.design?.[k];
    b.design = { ...b.design, ...b.layoutCard.design };
    if (!Object.keys(b.design).length) delete b.design;
    for (const bp of ['desktop', 'mobile']) Object.assign(b.layout[bp], b.layoutCard[bp]);
    delete b.layoutCard;
  }
  if (!card) return;
  const was = b.layoutCard || { ...Object.fromEntries(['desktop', 'mobile'].map((bp) => [bp, { justify: b.layout[bp].justify || 'flex-start', align: b.layout[bp].align || 'flex-start' }])), design: Object.fromEntries(CARD_KEYS.filter((k) => b.design && k in b.design).map((k) => [k, b.design[k]])) };
  Object.assign(b, { design: { ...b.design, ...card }, layoutCard: was });
  for (const bp of ['desktop', 'mobile']) Object.assign(b.layout[bp], { justify: 'center', align: 'center' });
}

// Undo onto a layout puts its step again, from the layout it leaves (CAP-U10WALK2.json: from 1 back to 0 gives 9;
// CAP-U10UNDO.json: from 3 back to 0 gives 10), with the Layouts panel open or closed (CAP-U10UNDOCLOSED-A.json and
// -B.json: from 0 back to 1 gives 13). Redo brings back the state Undo left, so it has none.
export function restep(s, mix, prev, words) {
  const n = layoutShown(s, mix, null);
  // A mix whose Texts grow (rule E): Undo onto it is not read, the state Undo gives is kept.
  if (mix.grows) return;
  // An Undo that stays on the same layout (a text edit in it, say) keeps the state as it was: not read.
  if (n === prev) return;
  if (n == null) return startStep(s, mix, prev);
  const F = shownForm(s, mix, n, wordsKey(mix, words));
  if (!F.step) return;
  const L = variant(F, prev), moved = [].concat(L.step).flatMap(({ block, push = [] }) => [block, ...push]);
  if (!mix.by[moved[0][0]]?.[+moved[0].slice(1)]) return;
  for (const k of moved) { const b = mix.by[k[0]]?.[+k.slice(1)]; if (b) b.layout.desktop.area = area(L.places[k][0]); }
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
  const span = (x) => Math.max(1, Math.ceil((contentH(x) + FIT_PAD + m.rg) / m.pitch));
  if (mix.grows) return growLayout(s, mix, n, span);
  const f = mix.list[n]?.fit, b = f && mix.by[f.block[0]]?.[+f.block.slice(1)];
  if (!b) return;
  const [r0, c0, , c1] = b.layout.desktop.area, rows = span(b);
  b.layout.desktop.area = [r0, c0, r0 + rows, c1];
  s.rows = { ...s.rows, desktop: r0 + rows + f.past };
}

// Rule E (CAP-U10ENDSPREDICT.json, predicted before the reads; round 1 on fresh reads, each read twice alike: 104 of
// 114 lines on the oracle's heights, 100 of 114 on ours'; frozen there, no refit): every Text ends at its start line
// plus the fit span above, and a layout's step (rule P) comes off or onto it. A heading Text at layout 0 keeps its set
// span. A block below another, with columns in common, moves down by that block's change, keeping its gap; the section
// rows follow the lowest end line. Misses, named: a quote as heading at layouts 2 and 5 ends short in 2 of 3 quotes
// (CAP-U10ENDS-EPQA.json 4 rows where 8, CAP-U10LF-QPA.json 3 and 2 where 5), not the one-word quote (EPS); no rule found.
function growLayout(s, mix, n, span) {
  const L = mix.list[n], blocks = Object.keys(mix.by).flatMap((r) => mix.by[r].map((b, k) => [r + k, b]));
  const was = new Map(blocks.map(([, b]) => [b, [...b.layout.desktop.area]])), moved = new Map();
  const lowWas = Math.max(...[...was.values()].map((a) => a[2]));
  blocks.sort((x, y) => was.get(x[1])[0] - was.get(y[1])[0]);
  for (const [slot, b] of blocks) {
    const [r0, c0, r1, c1] = was.get(b), [q0, , q1] = area(L.places[slot][0]);
    let shift = 0;
    for (const [, o] of blocks) { const a = was.get(o); if (o !== b && a[2] <= r0 && a[1] < c1 && c0 < a[3]) shift += moved.get(o) || 0; }
    const keep = b.type !== 'text' || (n === 0 && slot === 'h0' && !listFirst(b));
    const len = keep ? r1 - r0 : span(b) + (r1 - r0) - (q1 - q0);
    b.layout.desktop.area = [r0 + shift, c0, r0 + shift + len, c1];
    moved.set(b, r0 + shift + len - r1);
  }
  s.rows = { ...s.rows, desktop: s.rows.desktop + Math.max(...blocks.map(([, b]) => b.layout.desktop.area[2])) - lowWas };
}

// Whether the section stands as layout form L shows it.
// A fitted block matches by its start line and columns, and the rows by its end line.
// A mix whose Texts grow matches by columns alone (each layout's are its own).
function fitsAt(s, mix, L) {
  const at = (r, k, a) => { const w = L.places[r + k][0]; if (mix.grows) { const [, c0, , c1] = area(w); return a[1] === c0 && a[3] === c1; } if (L.fit?.block !== r + k) return a.join('/') === w; const [r0, c0, , c1] = area(w); return a[0] === r0 && a[1] === c0 && a[3] === c1 && s.rows?.desktop === a[2] + L.fit.past; };
  return (!!L.fit || !!mix.grows || s.rows?.desktop === L.rows) && Object.keys(mix.by).every((r) => mix.by[r].every((b, k) => at(r, k, b.layout.desktop.area)));
}
// Any of a step's spans.
const formFits = (s, mix, F) => fitsAt(s, mix, F) || (!!F.step && others(F.step).some((p) => fitsAt(s, mix, variant(F, p))));
// The form of layout n the section shows: the Text's own (its words at ten columns, k) if it fits, else the first that
// fits, the one-line entry first. Undo onto a two- or four-line Text steps by its own form (inferred, not read).
const shownForm = (s, mix, n, k) => {
  const own = byWords(mix.list[n], k);
  return (own !== mix.list[n] && formFits(s, mix, own) && own) || forms(mix.list[n]).find((F) => formFits(s, mix, F)) || mix.list[n];
};

// Which layout the section now shows, for the tile's mark after Undo and Redo: the last one picked if it still fits.
export function layoutShown(s, mix, last) {
  const fits = (n) => !mix.list[n].unbuilt && forms(mix.list[n]).some((F) => formFits(s, mix, F));
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
      if (L.scroll?.block === r + k) {
        const t = `${marqueeWords(asText(b).html)} * `.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        parts.push(`<span class="lo-t lo-scroll" style="${box};color:${ink};font-size:${(marqueePx(L.scroll.size) * SCALE).toFixed(1)}px;line-height:${(((r1 - r0) * 41.09 - 11) * SCALE).toFixed(1)}px;white-space:nowrap;overflow:hidden">${t.repeat(3)}</span>`);
        return;
      }
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
