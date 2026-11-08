// Model to HTML and CSS. The CSS text follows the per-section <style> that
// Squarespace publishes for Fluid Engine sections, captured 2026-11-03.
// Runs in the browser and in Node.
import { siteStylesHead } from './site-style-packs.js';
import { shapeById } from './shapes.js';
import { markdownHtml, markdownParts } from './markdown.js';
import { formFieldHtml, formLightboxHtml, formPostHtml, formSubmitJs, formView, phoneAlign, phoneStyle } from './form-fields.js';
import { imageShapeById } from './image-shapes.js';
import { effectData, IMAGE_EFFECT_SCRIPT } from './image-effects.js';
import { ASPECTS, galleryOf, chartOf, CHART_PALETTES } from './dialogs.js';

export const BPS = ['mobile', 'desktop'];
export const COLS = { mobile: 8, desktop: 24 };
// Column lines: 1 is the left edge of the left gutter track,
// COLS + 3 is the right edge of the right gutter track.
export const LAST_LINE = { mobile: COLS.mobile + 3, desktop: COLS.desktop + 3 };
export const BREAKPOINT = 768;
export const ROW_SCALE = 0.0215;
export const MOBILE_ROW_MIN = 24;

const f1 = (n) => Number(n).toFixed(1);
const areaText = (a) => a.join('/');

// A form with Lightbox on in one view only draws both, and each view hides the one it doesn't show.
const formBody = (b, form) => {
  const d = formView(b).lightbox, m = formView(b, 'mobile').lightbox;
  if (d === m) return d ? formLightboxHtml(b, form) : form;
  return `<div class="form-views form-views--${d ? 'desktop' : 'phone'}-lightbox">${formLightboxHtml(b, form)}${form}</div>`;
};
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Sticky blocks, desktop only in all 278 captured sections, but Pin works in Mobile View too
// (parity/findings/PIN.json phones): that pin goes in the base rule. Three forms seen. The offset
// keeps the unit it was typed with.
export function stickyCss(st) {
  if (!st) return '';
  const o = `${st.offset}${st.unit || 'px'}`;
  if (st.anchor === 'top') return `position: sticky; top: calc(${o} + var(--header-fixed-top-offset, 0px));`;
  if (st.anchor === 'center') return `position: sticky; top: calc(50% + ${o} + (var(--header-fixed-top-offset, 0px) / 2) - (var(--block-height, 0px) / 2));`;
  if (st.anchor === 'bottom') return `position: sticky; bottom: ${o};`;
  throw new Error(`unknown sticky anchor ${st.anchor}`);
}

// A phone pin sits in the base rule, so the desktop rule has to undo what would leak.
function stickyReset(m, d) {
  if (!m) return '';
  if (!d) return 'position: relative; top: auto; bottom: auto;';
  if (m.anchor === 'bottom' && d.anchor !== 'bottom') return 'bottom: auto;';
  if (m.anchor !== 'bottom' && d.anchor === 'bottom') return 'top: auto;';
  return '';
}

// Column gap sets the gutter and cell width; row gap can differ.
export function sectionGridCss(s) {
  const id = s.id;
  const g = f1(s.gap);
  const rg = f1(s.rowGap ?? s.gap);
  return `
.fe-${id} {
  --grid-gutter: calc(var(--sqs-mobile-site-gutter, 6vw) - ${g}px);
  --cell-max-width: calc( ( var(--sqs-site-max-width, 1500px) - (${g}px * (8 - 1)) ) / 8 );

  display: grid;
  position: relative;
  grid-area: 1/1/-1/-1;
  grid-template-rows: repeat(${s.rows.mobile},minmax(24px, auto));
  grid-template-columns:
    minmax(var(--grid-gutter), 1fr)
    repeat(8, minmax(0, var(--cell-max-width)))
    minmax(var(--grid-gutter), 1fr);
  row-gap: ${rg}px;
  column-gap: ${g}px;
  overflow-x: hidden;
  overflow-x: clip;
}

@media (min-width: 768px) {
  .background-width--inset .fe-${id} {
    --inset-padding: calc(var(--sqs-site-gutter) * 2);
  }

  .fe-${id} {
    --grid-gutter: calc(var(--sqs-site-gutter, 4vw) - ${g}px);
    --cell-max-width: calc( ( var(--sqs-site-max-width, 1500px) - (${g}px * (24 - 1)) ) / 24 );
    --inset-padding: 0vw;

    --row-height-scaling-factor: 0.0215;
    --container-width: min(var(--sqs-site-max-width, 1500px), calc(100vw - var(--sqs-site-gutter, 4vw) * 2 - var(--inset-padding) ));

    grid-template-rows: repeat(${s.rows.desktop},minmax(calc(var(--container-width) * var(--row-height-scaling-factor)), auto));
    grid-template-columns:
      minmax(var(--grid-gutter), 1fr)
      repeat(24, minmax(0, var(--cell-max-width)))
      minmax(var(--grid-gutter), 1fr);
  }
}
`;
}

// Hide on desktop or mobile (L5, parity/findings/UNBUILT.json): the oracle takes the block out of
// that layout and the editor shows it at opacity 0; ours adds display: none for that layout.
function hiddenCss(b) {
  const id = b.id;
  return (b.layout.mobile.hidden ? `\n  @media (max-width: 767px) { .fe-block-${id} { display: none; } }` : '')
    + (b.layout.desktop.hidden ? `\n  @media (min-width: 768px) { .fe-block-${id} { display: none; } }` : '');
}

export function blockCss(b) {
  return blockLayoutCss(b) + hiddenCss(b);
}
function blockLayoutCss(b) {
  const id = b.id;
  const m = b.layout.mobile;
  const d = b.layout.desktop;
  return `
  .fe-block-${id} {
    grid-area: ${areaText(m.area)};
    z-index: ${m.z};${m.sticky ? `\n    ${stickyCss(m.sticky)}` : ''}

    @media (max-width: 767px) {
    }
  }

  .fe-block-${id} .sqs-block {
    justify-content: ${m.justify};
  }

  .fe-block-${id} .sqs-block-alignment-wrapper {
    align-items: ${m.align};
  }

  @media (min-width: 768px) {
    .fe-block-${id} {
      grid-area: ${areaText(d.area)};
      z-index: ${d.z};
      ${stickyCss(d.sticky)}${m.sticky ? `\n      ${stickyReset(m.sticky, d.sticky)}` : ''}
    }

    .fe-block-${id} .sqs-block {
      justify-content: ${d.justify};
    }

    .fe-block-${id} .sqs-block-alignment-wrapper {
      align-items: ${d.align};
    }
  }
`;
}

export function sectionCss(s) {
  return sectionGridCss(s) + '\n' + s.blocks.map(blockCss).join('');
}

// A script in a code or embed block doesn't run while editing: a note stands in its place, under a
// status box. Handlers stay, as they do on the oracle (CAP-T10MD2.json). Both show in the editor only.
const SCRIPT_NOTE = '<div class="removed-script">Script Disabled</div>';
const SCRIPT_STATUS = `<div class="sqs-blockStatus"><div class="sqs-blockStatus-box"><div class="sqs-blockStatus-box-title">Embedded Scripts</div><div class="sqs-blockStatus-box-message">This block contains embedded scripts. Embedded scripts are disabled while you're logged in and editing your site.</div><div class="sqs-blockStatus-box-button" role="button">Preview in safe mode</div></div></div>`;
function withoutScripts(html) {
  let found = false;
  const out = String(html).replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, () => { found = true; return SCRIPT_NOTE; });
  return found ? SCRIPT_STATUS + out : out;
}
// What a code block shows (parity/findings/CODEEMBED.json): HTML as it is, Markdown read
// (app/src/markdown.js), and with Display Source Code the text in <pre class="source-code">, which
// CSS, JavaScript and Plain Text always use.
function codeOutput(b) {
  const mode = b.codeMode || 'html';
  if (b.showSource || (mode !== 'html' && mode !== 'markdown')) return `<pre class="source-code">${escapeHtml(b.html)}</pre>`;
  if (mode !== 'markdown') return withoutScripts(b.html);
  let found = false;
  const parts = markdownParts(b.html, { scriptNote: SCRIPT_NOTE, onScript: () => { found = true; } });
  return (found ? SCRIPT_STATUS : '') + parts.join('');
}

// Accordion block (T12, parity/findings/ACCORDION.json): the oracle's list. Icon size S 14, M 24,
// L 30; line S 1, M 3, L 6; row padding S 15, M 30, L 50. One item is open while its panel view is.
export const ACCORDION_ICON = { S: 14, M: 24, L: 30 };
export const ACCORDION_LINE = { S: 1, M: 3, L: 6 };
export const ACCORDION_PAD = { S: 15, M: 30, L: 50 };
export const ACCORDION_DESCRIPTION = 'Description text goes here';
// Title and Description styles, widths and dividers (parity/findings/ACCORDIONSTYLES.json). A custom
// value is a number, or four numbers for padding.
export const ACCORDION_STYLES = { h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p1: 'Paragraph 1', p2: 'Paragraph 2', p3: 'Paragraph 3' };
const ACCORDION_TAG = { h1: ['h1', ''], h2: ['h2', ''], h3: ['h3', ''], h4: ['h4', ''], p1: ['p', ' sqsrte-large'], p2: ['p', ''], p3: ['p', ' sqsrte-small'] };
export const ACCORDION_WIDTH = { S: 40, M: 70, L: 100 };
const px4 = (v) => v.map((n) => `${n}px`).join(' ');
function accordionHtml(b) {
  const flag = (v) => (v ? 'true' : 'false');
  const on = b.dividers !== false;
  const [tag, titleCls] = ACCORDION_TAG[b.titleStyle || 'h4'];
  const descCls = ACCORDION_TAG[b.descStyle || 'p2'][1];
  const icon = b.icon === 'arrow' ? '<div class="arrow-container"><div class="arrow"></div></div>' : '<div class="plus"><div class="plus__horizontal-line"></div><div class="plus__vertical-line"></div></div>';
  const items = (b.items || []).map((it, n) => {
    const id = `${b.id}-${n + 1}`;
    const top = n === 0 ? '<div data-sqsp-accordion-block-divider="" class="accordion-divider accordion-divider--top" aria-hidden="true"></div>' : '';
    const open = n === 0 && b.expandFirst;
    return `<li class="accordion-item"${open ? ' data-is-open="true"' : ''}>${top}<${tag} class="accordion-item__title-wrapper${titleCls}" data-sqsp-accordion-block-item-title=""><button id="button-${id}" class="accordion-item__click-target" aria-expanded="${flag(open)}" aria-controls="dropdown-${id}"><span class="accordion-item__title">${escapeHtml(it.title)}</span><div class="accordion-icon-container" aria-hidden="true">${icon}</div></button></${tag}><div class="accordion-item__dropdown" id="dropdown-${id}" role="region" aria-labelledby="button-${id}"><div class="accordion-item__description${descCls}" data-sqsp-accordion-block-item-description="">${escapeHtml(it.description ?? '')}</div></div><div data-sqsp-accordion-block-divider="" class="accordion-divider" aria-hidden="true"></div></li>`;
  }).join('');
  const row = Array.isArray(b.rowPadding) ? b.rowPadding : [ACCORDION_PAD[b.rowPadding || 'M'], 0, ACCORDION_PAD[b.rowPadding || 'M'], 0];
  const dPad = Array.isArray(b.descPad) ? b.descPad : [0, 0, ACCORDION_PAD[b.descPad || 'M'], 0];
  const width = b.descWidth === 'S' ? '300px' : typeof b.descWidth === 'number' ? `max(300px, ${b.descWidth}%)` : `${ACCORDION_WIDTH[b.descWidth || 'M']}%`;
  const style = `--accordion-icon:${ACCORDION_ICON[b.iconSize] ?? (b.iconSize || 14)}px;--accordion-line:${ACCORDION_LINE[b.iconThickness || 'S']}px;--accordion-pad:${px4(row)};--accordion-desc-pad:${px4(dPad)};--accordion-desc-width:${width};--accordion-divider:${ACCORDION_LINE[b.dividerSize] ?? (b.dividerSize ?? 1)}px;--accordion-divider-opacity:${b.dividerOpacity ?? 1}`;
  return `<ul class="accordion-items-container" style="${style}" data-should-allow-multiple-open-items="${flag(b.multiple)}" data-is-divider-enabled="${flag(on)}" data-is-first-divider-visible="${flag(b.showFirst !== false)}" data-is-last-divider-visible="${flag(b.showLast !== false)}" data-is-expanded-first-item="${flag(b.expandFirst)}" data-accordion-title-alignment="${b.titleAlign || 'left'}" data-accordion-description-alignment="${b.descAlign || 'left'}" data-accordion-description-placement="${b.descPlace || 'left'}" data-accordion-icon-placement="${b.iconLeft ? 'left' : 'right'}">${items}</ul>`;
}

// Social links (T11.json): one list for the whole site, each block chooses how it looks. Glyphs
// are our own drawings, 24 across, placed in a box of 64 so they are 30 across it (0.47).
// The labels are the oracle's for rows nobody touched; Display Social Icon rewrites one to the named form (T11.json).
export const DEFAULT_SOCIAL = [{ url: 'http://instagram.com/squarespace', aria: 'instagram-unauth' }, { url: 'http://facebook.com/squarespace', aria: 'facebook-unauth' }, { url: 'http://twitter.com/squarespace', aria: 'twitter-unauth' }];
export const SOCIAL_SIZES = { XS: ['extra-small', 16, 10, 24, 6], S: ['small', 20, 12, 28, 8], M: ['medium', 24, 14, 32, 8], L: ['large', 28, 16, 36, 10], XL: ['extra-large', 32, 18, 48, 12] };
export const SOCIAL_STYLES = { Knockout: 'knockout', Outline: 'border', Solid: 'solid' };
const GLYPHS = {
  instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',
  facebook: 'M14 8V6.2c0-.8.4-1.2 1.2-1.2H17V2h-2.8C11.5 2 10 3.6 10 6v2H7.5v3H10v11h4V11h2.7l.5-3H14z',
  twitter: 'M22 5.6c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1A4 4 0 0 0 12 8.7c0 .3 0 .6.1.9A11.4 11.4 0 0 1 3.8 5.4a4 4 0 0 0 1.2 5.4c-.6 0-1.3-.2-1.8-.5v.1c0 1.9 1.4 3.5 3.2 3.9-.6.2-1.2.2-1.8.1.5 1.6 2 2.7 3.8 2.8A8 8 0 0 1 2 19.3 11.3 11.3 0 0 0 8.2 21c7.4 0 11.5-6.2 11.5-11.5v-.5c.8-.6 1.5-1.3 2-2z',
  youtube: 'M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z',
  facebookRound: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1.6 6.6V7.4c0-.5.3-.8.8-.8H16V4.4h-2.2C11.9 4.4 10.8 5.6 10.8 7.4v1.2H9v2.4h1.8V20h2.8v-9H16l.4-2.4h-2.8z',
  url: 'M8 7h3v2H8a3 3 0 0 0 0 6h3v2H8A5 5 0 0 1 8 7zm5 0h3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 0 0 0-6h-3V7zM8 11h8v2H8z',
};
const NAMED = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter', youtube: 'YouTube' };
// What the list shows for a link: a site we know gets its icon and only the path as its name.
export function socialKind(url) {
  let u = null;
  try { u = new URL(url); } catch { return null; }
  const net = /^https?:$/.test(u.protocol) ? Object.keys(NAMED).find((n) => u.hostname.replace(/^www\./, '') === `${n}.com`) : null;
  return net ? { net, aria: NAMED[net], name: u.pathname } : { net: 'url', aria: 'URL', name: url };
}
export const socialGlyph = (net, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${GLYPHS[net]}"/></svg>`;
// On a phone a block follows the desktop until a row is pressed there, then keeps that row's value
// (T11.json, phone). The classes stay the desktop's, so the phone's values go in variables and attributes.
export const socialLook = (b, phone) => (phone && b.socialMobile ? { ...b, ...b.socialMobile } : b);
export function socialHtml(b, model) {
  const style = b.iconBorder ? b.iconStyle || 'knockout' : 'regular';
  const [word, none, gap, boxed, boxedGap] = SOCIAL_SIZES[b.iconSize || 'S'];
  const m = socialLook(b, true), mStyle = m.iconBorder ? m.iconStyle || 'knockout' : 'regular';
  const [, mNone, mGap, mBoxed, mBoxedGap] = SOCIAL_SIZES[m.iconSize || 'S'];
  const phoneVars = b.socialMobile ? `;--si-size-m:${m.iconBorder ? mBoxed : mNone}px;--si-gap-m:${m.iconBorder ? mBoxedGap : mGap}px;--si-thick-m:${m.iconThick ?? 2}px` : '';
  const phoneAttrs = b.socialMobile ? ` data-m-style="${mStyle}" data-m-shape="${m.iconBorder || 'none'}" data-m-align="${m.align || 'left'}"` : '';
  const vars = `--si-size:${b.iconBorder ? boxed : none}px;--si-gap:${b.iconBorder ? boxedGap : gap}px${style === 'border' ? `;--si-thick:${b.iconThick ?? 2}px` : ''}${phoneVars}`;
  const links = (model?.socialLinks || DEFAULT_SOCIAL).filter((l) => !l.hidden).map((l, i) => {
    const k = socialKind(l.url) || { net: 'url', aria: 'URL' };
    const glyph = `<path fill-rule="evenodd" transform="translate(17 17) scale(1.25)" d="${GLYPHS[k.net]}"/>`;
    const art = (st, tag = '') => (st === 'knockout'
      ? `<mask id="si-${b.id}-${i}${tag}"><rect width="64" height="64" fill="#fff"/><g fill="#000">${glyph}</g></mask><rect class="sqs-use--mask" width="64" height="64" mask="url(#si-${b.id}-${i}${tag})"/>`
      : `<g class="sqs-use--icon">${glyph}</g>`);
    // Knockout draws differently, so a phone that differs from the desktop on it carries its own picture.
    const twoArts = (style === 'knockout') !== (mStyle === 'knockout');
    const svgs = twoArts ? `<svg class="sqs-svg-icon--social si-desk" viewBox="0 0 64 64">${art(style)}</svg><svg class="sqs-svg-icon--social si-phone" viewBox="0 0 64 64">${art(mStyle, '-m')}</svg>` : `<svg class="sqs-svg-icon--social" viewBox="0 0 64 64">${art(style)}</svg>`;
    return `<a class="sqs-svg-icon--wrapper ${k.net}-unauth" href="${escapeHtml(l.url)}" target="_blank" aria-label="${escapeHtml(l.aria || k.aria)}"><div>${svgs}</div></a>`;
  }).join('');
  return `<div class="sqs-block socialaccountlinks-v2-block sqs-block-socialaccountlinks-v2" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-svg-icon--outer social-icon-alignment-${b.align || 'left'} social-icons-color-black social-icons-size-${word}${b.iconBorder ? ` social-icons-shape-${b.iconBorder}` : ''} social-icons-style-${style}"${phoneAttrs} style="${vars}"><nav class="sqs-svg-icon--list">${links}</nav></div></div></div>`;
}

// Map (T11.json): the block's values are the oracle's; the map itself is our own drawing, as the
// tiles and the address lookup are a hosted service. The Zoom field reads a ladder over map zooms 0 to 22.
export const MAP_STYLES = [['Original', 1], ['Grayscale', 2], ['Satellite', 3], ['Dark', 5], ['Light', 4], ['Blue', 6]];
export const MAP_ZOOMS = [0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 6, 7];
// Our own palettes: land, water, park, hill, road, ink.
export const MAP_PALETTES = { 1: ['#f2efe6', '#a6d3ea', '#c8e3b4', '#d7cdb2', '#fff', '#444'], 2: ['#f8f8f8', '#6e6e6e', '#e4e4e4', '#cfcfcf', '#d0d0d0', '#333'], 3: ['#4d5a3c', '#16302f', '#33482d', '#6a6647', '#a59a7c', '#fff'], 4: ['#fbfbfb', '#ececec', '#f3f3f3', '#e6e6e6', '#f0f0f0', '#8a8a8a'], 5: ['#2a2a2a', '#121212', '#333', '#3d3d3d', '#3f3f3f', '#bbb'], 6: ['#f7f9fb', '#c6dff0', '#e8f0f5', '#dbe6ed', '#fff', '#54687a'] };
export const mapVars = (style) => ['land', 'water', 'park', 'hill', 'road', 'ink'].map((k, i) => `--m-${k}:${MAP_PALETTES[style][i]}`).join(';');
// Chart (CAP-ROWSCHART.json, CAP-T12CHARTLOOK.json): a title above (the page's h2), the picture 15 below it, the legend
// under the picture and the caption 15 under that. The picture is our own drawing of the data, in the palette's colours
// (the oracle draws on a canvas, so its marks aren't read; a flipped chart's colour per bar is inferred). With Flip on, the
// legend went away though Show Legend was on (one read).
function chartHtml(b) {
  // A series added from the + (CAP-T12CHARTCELLS3.json) is drawn beside the first: bars side by side in each label's band, a
  // line each, a legend item each, in the palette's order (the oracle's canvas marks aren't read; inferred from its picture).
  const c = chartOf(b), pal = CHART_PALETTES[c.palette], names = c.data[0].slice(1), ns = Math.max(1, names.length);
  const all = c.data.slice(1).map((r) => Array.from({ length: ns }, (_, k) => Number(r[k + 1]) || 0)), rows = c.data.slice(1).map((r, n) => [r[0], all[n][0]]);
  const max = Math.max(1, ...all.flat()), step = 10 ** Math.floor(Math.log10(max)), top = (Math.floor(max / step) + 1) * step;
  const L = 80, R = 450.5, T = 16, B = 184, y = (v) => B - ((B - T) * v) / top, band = (R - L) / Math.max(1, rows.length);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, n) => n * step);
  const axis = c.type === 'Pie Chart' ? '' : ticks.map((t) => `<path d="M${L} ${y(t)}H${R}" class="fe-chart-rule"/><text x="${L - 10}" y="${y(t) + 5}" text-anchor="end" class="fe-chart-text">${t}</text>`).join('') + rows.map(([l], n) => `<text x="${L + band * (n + 0.5)}" y="${B + 24}" text-anchor="middle" class="fe-chart-text">${escapeHtml(l)}</text>`).join('');
  const colour = (n, k = 0) => pal[(c.flip ? n : k) % pal.length];
  let marks = '';
  if (c.type === 'Bar Chart') marks = all.map((vs, n) => vs.map((v, k) => `<rect x="${L + band * n + band * 0.055 + (band * 0.89 * k) / ns}" y="${y(v)}" width="${(band * 0.89) / ns}" height="${B - y(v)}" fill="${colour(n, k)}" class="fe-chart-bar"/>`).join('')).join('');
  else if (c.type === 'Line Chart') marks = Array.from({ length: ns }, (_, k) => { const pts = all.map((vs, n) => `${L + band * (n + 0.5)},${y(vs[k])}`); return `<polyline points="${pts.join(' ')}" fill="none" stroke="${pal[k % pal.length]}" stroke-width="2"/>${pts.map((p, n) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="${colour(n, k)}"/>`).join('')}`; }).join('');
  else {
    const sum = rows.reduce((a, [, v]) => a + v, 0) || 1;
    let a = -Math.PI / 2;
    marks = rows.map(([, v], n) => { const a1 = a + (2 * Math.PI * v) / sum, big = a1 - a > Math.PI ? 1 : 0, p = (t) => `${229.5 + 100 * Math.cos(t)} ${114.5 + 100 * Math.sin(t)}`, d = `M229.5 114.5L${p(a)}A100 100 0 ${big} 1 ${p(a1)}Z`; a = a1; return `<path d="${d}" fill="${pal[n % pal.length]}"/>`; }).join('');
  }
  const legend = c.legend && !c.flip ? `<div class="chart-block-legend"><figcaption class="legend-content"><ul class="${c.type === 'Line Chart' ? 'line' : 'bar'}-legend">${Array.from({ length: ns }, (_, k) => `<li><span style="background-color:${pal[k % pal.length]}"></span>${escapeHtml(c.data[0][k + 1] || '')}</li>`).join('')}</ul></figcaption></div>` : '';
  return `${c.title ? `<h2 class="fe-chart-title">${escapeHtml(c.title)}</h2>` : ''}<div class="fe-chart"><svg viewBox="0 0 459 229" aria-hidden="true">${axis}${marks}</svg></div>${legend}${c.caption ? `<div class="chart-block-caption"><figcaption>${escapeHtml(c.caption)}</figcaption></div>` : ''}`;
}
export const QUOTE_TEXT = { quote: 'Whatever it is, the way you tell your story online can make all the difference.', source: 'Quote Source' };
export const quoteOf = (b) => ({ quote: b.quote ?? QUOTE_TEXT.quote, source: b.source ?? QUOTE_TEXT.source });
// Newsletter (CAP-T12NEWSLETTER.json): the panel's words as typed. An empty Title takes the heading away, an empty
// Button Text shows Sign Up, and each line of Description or Disclaimer is a paragraph. Show Name Field adds First Name
// and Last Name. The fields take nothing on the canvas, and nothing is sent.
export const NEWSLETTER_TEXT = { nlFormName: 'Newsletter Form', nlTitle: 'Subscribe', nlDesc: 'Sign up with your email address to receive news and updates.', nlDisc: 'We respect your privacy.', nlButton: 'Sign Up' };
export const newsletterOf = (b) => ({ ...Object.fromEntries(Object.entries(NEWSLETTER_TEXT).map(([k, v]) => [k, b[k] ?? v])), nlName: !!b.nlName, nlLayout: b.nlLayout || 'float', nlAlign: b.nlAlign || 'center' });
function newsletterHtml(b) {
  const n = newsletterOf(b), paras = (t) => (t ? t.split('\n').map((l) => `<p>${escapeHtml(l)}</p>`).join('') : '');
  const input = (type, label) => `<label class="newsletter-form-field-label title">${label}</label><input class="newsletter-form-field-element field-element" type="${type}" placeholder="${label}" aria-label="${label}" tabindex="-1" readonly>`;
  const name = n.nlName ? `<fieldset class="form-item fields name required"><div class="field first-name">${input('text', 'First Name')}</div> <div class="field last-name">${input('text', 'Last Name')}</div></fieldset> ` : '';
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  return `<div class="newsletter-form-wrapper newsletter-form-wrapper--layout${cap(n.nlLayout)} newsletter-form-wrapper--align${cap(n.nlAlign)}"><form class="newsletter-form" novalidate onsubmit="return false">`
    + `<header class="newsletter-form-header">${n.nlTitle ? `<h2 class="newsletter-form-header-title">${escapeHtml(n.nlTitle)}</h2>` : ''}<div class="newsletter-form-header-description">${paras(n.nlDesc)}</div></header>`
    + `<div class="newsletter-form-body"><div class="newsletter-form-fields-wrapper form-fields">${name}<div class="newsletter-form-field-wrapper form-item field email required">${input('email', 'Email Address')}</div></div> `
    + `<div class="newsletter-form-button-wrapper submit-wrapper"><button class="newsletter-form-button" type="button" tabindex="-1"><span class="newsletter-form-button-label">${escapeHtml(n.nlButton || NEWSLETTER_TEXT.nlButton)}</span></button></div></div>`
    + `<div class="newsletter-form-footnote">${paras(n.nlDisc)}</div></form></div>`;
}
// The menu types whose content sets the height and follows the width (STANDINS.json). The words and
// the 12 plain tiles are local; no picture or service is behind them.
const STANDIN = {
  // Quote and Source as typed (CAP-T12QUOTE.json): a new line in Quote is a <br>; in Source it stays a plain newline, which
  // shows as a space (CAP-T12QUOTEROWS.json). An empty Source takes the figcaption away.
  quote: (b) => {
    const q = quoteOf(b), lines = (t) => escapeHtml(t).replace(/\n/g, '<br>');
    return `<figure class="sqs-quote-block-contents"><blockquote><span>“</span>${lines(q.quote)}<span>”</span></blockquote>${q.source ? `<figcaption class="source">— ${escapeHtml(q.source)}</figcaption>` : ''}</figure>`;
  },
  newsletter: (b) => newsletterHtml(b),
  chart: (b) => chartHtml(b),
  soundcloud: () => '<div class="fe-status"><div class="fe-status-title">SoundCloud Block</div><div class="fe-status-message">Enter a SoundCloud track, playlist, or profile URL.</div></div>',
  // Aspect Ratio, Crop Images, Show Title and Open Links in New Window (CAP-ROWSINSTAGRAM.json, CAP-ROWSFLICKR.json): a
  // cropped tile takes the ratio; an uncropped one shows its picture whole, 16:9 as the oracle's sample pictures read
  // (56.1 high in 99.8). A title is 14px, centred, 22.4 high and 7 below its picture. Our tiles link nowhere.
  gallery: (b) => {
    const g = galleryOf(b), ratio = g.crop ? ASPECTS.find(([n]) => n === g.aspect)?.[1] ?? 1 : 9 / 16;
    const tile = (n) => `<a class="fe-tile ${g.crop ? 'content-fill' : 'content-fit'}"${g.newWindow ? ' target="_blank"' : ''}><span style="aspect-ratio:${1 / ratio}"></span>${g.title ? `<span class="fe-tile-title">Image ${n + 1}</span>` : ''}</a>`;
    return `<div class="fe-tiles">${Array.from({ length: 12 }, (_, n) => tile(n)).join('')}</div>`;
  },
};
const STANDIN_BLOCK = { quote: 'sqs-block-quote quote-block', newsletter: 'sqs-block-newsletter newsletter-block',chart: 'sqs-block-chart chart-block', soundcloud: 'sqs-block-soundcloud soundcloud-block', flickr: 'sqs-block-flickr flickr-block', instagram: 'sqs-block-instagram instagram-block' };
export const standinHtml = (b) => `<div class="sqs-block ${STANDIN_BLOCK[b.standin]}" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content">${(STANDIN[b.standin] || STANDIN.gallery)(b)}</div></div>`;

export const mapOf = (b) => ({ style: b.mapStyle ?? 2, labels: b.mapLabels !== false, terrain: !!b.mapTerrain, controls: !!b.mapControls, zoom: b.mapZoom ?? 12 });
export const mapArt = (labels = true, terrain = false) => `<rect class="m-land" x="-400" y="-400" width="1200" height="1200"/>${terrain ? '<g class="m-hill"><ellipse cx="90" cy="110" rx="90" ry="60"/><ellipse cx="320" cy="310" rx="110" ry="70"/><ellipse cx="310" cy="70" rx="70" ry="45"/></g>' : ''}<path class="m-park" d="M250 150l60-14 22 58-58 20zM60 300l58-10 14 50-60 14z"/><path class="m-water" d="M-400 330C40 300 90 240 150 170S210 30 250-400H330C300 40 260 130 210 200S120 340-400 480z"/><g class="m-road"><path d="M-400 90L800 40M-400 250L800 210M-400 370L800 330M60-400L110 800M300-400L340 800"/><path class="m-thin" d="M-400 150L800 110M-400 310L800 270M-400 30L800-10M10-400L50 800M180-400L220 800M250-400L290 800M370-400L410 800"/></g>${labels ? '<g class="m-label"><text x="262" y="122">Harbor</text><text x="42" y="214">Old Town</text><text x="238" y="286">Riverside</text><text x="120" y="368">South Park</text></g>' : ''}`;
function mapHtml(b) {
  const m = mapOf(b);
  // A typed zoom past the ladder stays in the field; what the oracle's map does with it is not read, ours stops at the ladder's ends.
  const scale = 2 ** ((Math.max(0, Math.min(MAP_ZOOMS.length - 1, m.zoom)) - 12) / 2);
  const ctx = escapeHtml(JSON.stringify({ style: m.style, labels: m.labels, terrain: m.terrain, controls: m.controls, location: { mapZoom: m.zoom } }));
  return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-map map-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="page-map" style="${mapVars(m.style)}" data-context="${ctx}"><svg class="fe-map" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g transform="translate(200 200) scale(${scale}) translate(-200 -200)">${mapArt(m.labels, m.terrain)}</g></svg><svg class="fe-map-pin" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path d="M12 0a12 12 0 0 1 12 12c0 8-12 20-12 20S0 20 0 12A12 12 0 0 1 12 0z"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>${m.controls ? '<div class="fe-map-controls"><span aria-label="Zoom in">+</span><span aria-label="Zoom out">−</span></div>' : ''}</div></div></div>`;
}

const VIDEO_PLACEHOLDER = '<div class="sqs-block-video-placeholder sqs-block-video-placeholder--empty"><div class="sqs-block-video-placeholder__ui"><div class="sqs-block-video-placeholder__icon"><svg viewBox="0 0 26 21" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2" aria-hidden="true"><rect x="1" y="1" width="24" height="19"/><path d="M10.5 7v7l6-3.5z" fill="currentColor" stroke="none"/></svg></div></div></div>';
// A video with a file (parity/findings/VIDEOPLAYER.json). Autoplay, Loop and Mute start on, as the
// oracle's only reachable video has them; a video added by upload there is out of scope (0005).
// .intrinsic takes Corner, Background, Padding and Stroke, on an empty block too (CAP-T7CORNER.json, CAP-T7DESIGN2.json).
const videoBoxClass = (b) => `intrinsic${b.design?.corner || b.design?.corners ? ' sqs-border-radius-enabled' : ''}${b.design?.stroke ? ' sqs-stroke-enabled' : ''}`;
function videoPlayerHtml(b) {
  const v = b.video;
  const aspect = v.aspect || 'auto';
  const ratio = aspect === 'auto' ? v.natural || 16 / 9 : aspect;
  const on = (k) => v[k] !== false;
  const controls = v.controls || 'minimal';
  const settings = { aspectRatio: aspect, muted: on('muted'), autoPlay: on('autoPlay'), loop: on('loop'), controls, ...(v.lazy ? { loading: v.lazy } : {}) };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  // Settings (CAP-T7SETTINGS.json): one row, Speed, which swaps for the list. The player's look is ours.
  const speeds = ['0.5x', '0.75x', 'Normal', '1.25x', '1.5x', '1.75x', '2x'].map((s) => `<button type="button" role="menuitemradio" class="vp-row" aria-checked="${s === 'Normal'}" data-vp-rate="${s === 'Normal' ? 1 : parseFloat(s)}">${s}</button>`).join('');
  const menu = `<div class="vp-menu" hidden><div class="vp-home"><button type="button" class="vp-row" data-vp-menu="speed"><span>Speed</span><span class="vp-now">Normal</span></button></div><div class="vp-speeds" hidden><button type="button" class="vp-row vp-back" data-vp-menu="home" aria-label="Go back to previous menu">Speed</button>${speeds}</div></div>`;
  const full = controls !== 'full' ? '' : `<button type="button" class="vp-btn" data-vp="mute" aria-label="Mute">${svg('M4 9v6h4l5 4V5L8 9z')}</button><input class="vp-volume" data-vp="volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"><button type="button" class="vp-btn" data-vp="settings" aria-label="Settings" aria-expanded="false">${svg('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z')}</button><button type="button" class="vp-btn" data-vp="fullscreen" aria-label="Enter fullscreen">${svg('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5')}</button>`;
  const ui = controls === 'none' ? '' : `<button type="button" class="vp-play" data-vp="play" aria-label="Play">${svg('M8 5v14l11-7z')}</button><div class="vp-bar"><input class="vp-seek" data-vp="seek" type="range" min="0" max="100" step="0.01" value="0" aria-label="Seek">${full}</div>${controls === 'full' ? menu : ''}`;
  return `<div class="${videoBoxClass(b)}" style="max-width:100%"><div class="embed-block-wrapper"><div class="sqs-native-video" data-config-settings="${escapeHtml(JSON.stringify(settings))}" data-config-loading="${v.lazy === 'eager' ? 'eager' : 'lazy'}"><div class="native-video-player video-player" style="aspect-ratio:${ratio};"><video src="${escapeHtml(v.src)}"${v.thumb && v.thumbSrc ? ` poster="${escapeHtml(v.thumbSrc)}"` : ''} playsinline${on('muted') ? ' muted' : ''}${on('loop') ? ' loop' : ''}${on('autoPlay') ? ' autoplay' : ''}></video>${ui}</div></div></div></div>`;
}

function blockInner(b, model) {
  switch (b.type) {
    case 'text':
      return `<div class="sqs-block html-block sqs-block-html${b.design?.background ? ' sqs-background-enabled' : ''}" data-block-type="2" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-html-content">${b.html}</div></div></div>`;
    case 'button':
      // Button style (parity/findings/BUTTONSTYLE.json): Primary is medium, Secondary large,
      // Tertiary small; the oracle writes both on the container and the link.
      {
        const type = b.buttonStyle || 'primary';
        const size = BUTTON_SIZE[type];
        // Fit, Fill and Alignment per view (parity/findings/BUTTONDESIGN.json): a phone follows the
        // desktop until it is changed; then it has a container of its own. A button stacked once
        // stops filling its block (parity/findings/S3.json fitButton).
        const box = (sys, o = {}) => `<div class="sqs-block-button-container sqs-button-block-container-system_${sys} sqs-block-button-container--${o.align || 'center'}${o.fit ? '' : ' sqs-stretched'}" data-button-size="${size}" data-button-type="${type}"><a class="sqs-block-button-element--${size} sqs-button-element--${type} sqs-block-button-element" href="${escapeHtml(b.href || '')}"${b.newTab && b.href ? ' target="_blank"' : ''}>${escapeHtml(b.label)}</a></div>`;
        return `<div class="sqs-block button-block sqs-block-button" data-block-type="53" id="block-${b.id}"><div class="sqs-block-content">${box('desktop', { fit: b.fit, align: b.halign })}${b.btnMobile ? box('mobile', b.btnMobile) : ''}</div></div>`;
      }
    case 'shape': {
      if (b.standin) return standinHtml(b);
      const kind = shapeById(b.shape), rect = !kind.d, stretched = b.stretch !== false;
      const label = b.label ? `<span class="sqs-shape-label">${escapeHtml(b.label)}</span>` : '';
      // Stroke (SHAPESTYLES.json): black, 2, 6 or 15px unless set, dashes of 5 with a gap of the width
      // plus 15, the same px however the block stretches.
      const drawnIn = (bp) => {
        const dg = designFor(b, bp), fill = shapeFill(b, bp) || 'var(--shape-theme-fill)', corner = cornerFor(b, bp), radius = corner.css || '0';
        const style = `--shape-fill:${fill};--shape-radius:${radius};--shape-ink:${b.ink || 'inherit'}${stretched ? '' : `;--shape-ratio:${kind.w / kind.h}`}`;
        const w = !dg.stroke ? 0 : dg.strokeSize === 'custom' ? dg.strokePx ?? 6 : STROKE_PX[dg.strokeSize || 'M'];
        const ink = w ? ` stroke="${dg.strokeColor || 'var(--shape-theme-stroke)'}" stroke-width="${w}" vector-effect="non-scaling-stroke"${rect ? ' stroke-linecap="square"' : ''}${dg.stroke === 'dashed' ? ` stroke-dasharray="5 ${w + 15}"` : ''}` : '';
        const svg = (attrs, inner) => `<svg class="sqs-shape${rect ? ' sqs-shape-rectangle' : ''}${stretched ? '' : ' is-square'}" preserveAspectRatio="none"${attrs} style="${style};background:none;overflow:visible">${inner}</svg>`;
        // A rectangle's stroke sits outside its box. With a corner it is a path, starting at the top's
        // middle, drawn at the box's size once that is known (CAP-T6CORNERS.json, watchShapeRects).
        const radii = corner.corners || [corner.first, corner.first, corner.first, corner.first];
        return !rect ? svg(` viewBox="0 0 ${kind.w} ${kind.h}"`, `<path d="${kind.d}" fill="${fill}"${ink}/>`)
          : w && radii.some((r) => r > 0) ? svg('', `<path data-rect="${radii.map((r) => r || 0).join(' ')}" data-w="${w}" fill="${fill}"${ink}/>`)
          : w ? svg('', `<rect style="width:calc(100% + ${w}px);height:calc(100% + ${w}px);x:calc(${w}px / -2);y:calc(${w}px / -2)" fill="${fill}"${ink}/>`)
          // A plain rectangle is an svg holding a rect, as on the oracle (CAP-BLEND.json, difference 92). With a corner or a
          // label it stays a div, its corners in CSS: the oracle's corner without a stroke was not read.
          : !label && radii.every((r) => !r) ? svg('', `<rect width="100%" height="100%" fill="${fill}"/>`)
          : `<div class="sqs-shape${stretched ? '' : ' is-square'}" style="${style}">${label}</div>`;
      };
      // A phone that draws differently has a container of its own, as a button does.
      const box = (sys, inner) => `<div class="sqs-shape-block-container sqs-block-alignment-wrapper sqs-shape-block-container-system_${sys}${stretched ? '' : ' is-contained'}" data-shape-name="${kind.id}">${inner}</div>`;
      const desk = drawnIn('desktop'), phone = b.designMobile ? drawnIn('mobile') : desk;
      return `<div class="sqs-block shape-block sqs-block-shape${stretched ? ' sqs-stretched' : ''}" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"${b.phoneHeight ? ` style="--phone-h:${Number(b.phoneHeight)}px"` : ''}><div class="sqs-shape-block-outer-container">${box('desktop', desk)}${phone !== desk ? box('mobile', phone) : ''}</div></div></div>`;
    }
    case 'stack': {
      // A Stack (S3): one grid block whose children flow in a flex box, measured on the oracle
      // (parity/findings/S3.json). stackCss holds its values, once per layout.
      const kids = (b.children || []).map((c) => `<div class="stack-child-container"${kidAttrs(c)}>${blockInner({ ...c, id: `${b.id}-${c.id}`, fit: c.type === 'button' || c.fit }, model)}${kidDesign(b, c)}</div>`).join('');
      return `<div class="sqs-block stack-block sqs-block-stack" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-stack-container stack-d-${stackAxes(b, 'desktop').direction} stack-m-${stackAxes(b, 'mobile').direction}" data-component-id="${b.id}">${kids}</div></div></div><style class="stack-vars">${stackCss(b)}</style>`;
    }
    case 'image': {
      // Image blocks (T4): Fill, the default here, covers the block. Fit and Shape are measured
      // in parity/findings/IMAGEMODES.json. Without a picture of the user's own (b.src, Content >
      // Replace) it is a neutral placeholder (QUALITY.md O2), and Fit uses b.aspect, or 3:2.
      const r = b.corners ? `border-radius:${b.corners.map((v) => `${v}px`).join(' ')};` : b.radius ? `border-radius:${b.radius};` : '';
      const mode = (b.mode === 'fit' || b.mode === 'shape' ? ` image-mode-${b.mode}` : '') + (b.mode === 'shape' && b.stretch ? ' image-stretch' : '') + (b.lightbox ? ' image-lightbox' : '');
      // A Shape from an imported page keeps the box it was saved with (IMAGEIMPORT.json); a new one stays square.
      const aspect = b.mode === 'fit' ? `--image-aspect:${Number(b.aspect) || 1.5};` : b.mode === 'shape' && b.shapeRatio ? `--image-aspect:${Number(b.shapeRatio)};` : '';
      const alt = escapeHtml(b.alt || '');
      // Focal point and Overlay (parity/findings/IMAGEDESIGN.json): off, the overlay keeps its color and blend at opacity 0.
      const focal = b.focal ? ` style="object-position:${b.focal[0] * 100}% ${b.focal[1] * 100}%"` : '';
      const overlay = b.overlay || b.overlayColor || b.overlayBlend ? `<div class="fluidImageOverlay" style="opacity:${b.overlay ? 1 : 0};background-color:${escapeHtml(b.overlayColor || 'rgba(0, 0, 0, 0.5)')};mix-blend-mode:${b.overlayBlend || 'normal'}"></div>` : '';
      // The chosen shape clips the picture's box and stretches with it (IMAGESHAPES.json). Circle is the CSS default.
      const shape = b.mode === 'shape' && b.imageShape ? imageShapeById(b.imageShape) : null;
      const clip = shape ? `clip-path:url(#fe-image-clip-${b.id});` : '';
      const clipDef = shape ? `<svg class="fe-image-clip" width="0" height="0" aria-hidden="true"><clipPath id="fe-image-clip-${b.id}" clipPathUnits="objectBoundingBox"><path d="${shape.d}"/></clipPath></svg>` : '';
      // Image Effect (IMAGEEFFECT.json): over the picture and under the overlay. The picture hides once it draws.
      const effect = b.effect && b.src ? `<div class="imageEffectContainer" data-effect="${escapeHtml(effectData(b.effect))}"><canvas></canvas></div>` : '';
      const inner = b.src ? `<div class="fluid-image-container has-picture" style="${r}${aspect}${clip}"><img src="${escapeHtml(b.src)}" alt="${alt}"${focal}>${effect}${overlay}</div>${clipDef}`
        : `<div class="fluid-image-container" style="${r}${aspect}${clip}" role="img" aria-label="${alt}">${overlay}</div>${clipDef}`;
      // A new block has no picture yet (MEDIAEMPTY.json): the editor shows a white box with a +.
      if (b.empty) return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-image image-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="fluid-image-component-empty-state-node"><input class="fluid-image-input" type="file" accept="image/*" tabindex="-1" aria-hidden="true"><span class="fluid-image-add" aria-hidden="true"><svg viewBox="0 0 22 22" width="22" height="22"><path d="M11 3v16M3 11h16" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></div></div></div>`;
      const pic = b.href && !b.lightbox ? `<a class="sqs-block-image-link" href="${escapeHtml(b.href)}"${b.newTab ? ' target="_blank"' : ''}>${inner}</a>` : inner;
      // The measured chain (parity/findings/BLOCKTYPES.json): an image holds the alignment wrapper.
      return `<div class="sqs-block image-block sqs-block-image sqs-stretched${mode}" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="fluid-image-component-root image-block-outer-wrapper design-layout-fluid image-position-center"><div class="fluid-image-animation-wrapper sqs-image sqs-block-alignment-wrapper">${pic}</div></div></div></div>`;
    }
    case 'accordion':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-accordion accordion-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content">${accordionHtml(b)}</div></div>`;
    case 'form': {
      // Form block (T9), sized to the oracle Contact form (parity/findings/T9.json).
      const e = escapeHtml;
      // First Input Highlight (FORMADD.json): a layer over the form's first control only.
      let fx = b.highlight;
      const ctl = (html) => { if (!fx) return html; const k = fx; fx = null; return `<span class="form-fx-box">${html}<span class="form-input-effects"><span class="form-fx form-fx--${k}"></span></span></span>`; };
      const form = `<div class="form-wrapper">${formPostHtml(b)}<form class="fe-form" onsubmit="${formSubmitJs(b).replace(/"/g, '&quot;')}">${(b.fields || []).map((f) => formFieldHtml(f, ctl)).join('')}<div class="form-button-wrapper form-button-wrapper--align-${formView(b).buttonAlign}${phoneAlign('form-button-wrapper', b)}"><button class="form-submit sqs-button-element--${formView(b).buttonStyle}${phoneStyle(b)}" type="submit">${e(b.button || 'Send')}</button></div></form></div>`;
      return `<div class="sqs-block form-block sqs-block-form" id="block-${b.id}"><div class="sqs-block-content">${formBody(b, form)}</div></div>`;
    }
    case 'scrolling': {
      // Scrolling text (T12): the oracle draws the line along a wave path; its height is
      // the line height (1.4em, heading formula with size value 5) plus 120px.
      return `<div class="sqs-block scrolling-block sqs-block-scrolling${b.wave === 0 ? ' scrolling-block--flat' : ''}" id="block-${b.id}"><div class="sqs-block-content"><div class="marquee" style="--marquee-font-size-value:${b.size || 5}${b.wave === 0 ? ';--marquee-wave:0px' : ''}"><span class="marquee-text">${escapeHtml(b.text || '')}</span></div></div></div>`;
    }
    case 'line': {
      // Line block (T11.json): a 17px content box in the middle of the block, a 1px rule in the middle of that.
      return `<div class="sqs-block horizontalrule-block sqs-block-horizontalrule" id="block-${b.id}"><div class="sqs-block-content"><div><hr></div></div></div>`;
    }
    case 'social': return socialHtml(b, model);
    case 'map': return mapHtml(b);
    // Code, Embed and Video (T7, T10; parity/findings/CODEEMBED.json, T7.json): the published
    // class strings and block type 1337 of the corpus pages. An empty embed and an empty video
    // show a placeholder in the editor only. Our demo's code blocks show source text in <pre>.
    case 'embed': {
      const status = `<div class="sqs-blockStatus"${b.embedInvalid ? ' data-state="invalid"' : ''}><div class="sqs-blockStatus-box"><div class="sqs-blockStatus-box-title">Embed Block</div><div class="sqs-blockStatus-box-message">${b.embedInvalid ? 'Enter a valid embed URL or code.' : 'Add an embed URL or code.'}</div></div></div>`;
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-embed embed-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-embed-container">${b.html ? withoutScripts(b.html) : status}</div></div></div>`;
    }
    case 'video':
      {
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-video video-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content">${b.html ? `<div>${b.html}</div>` : b.video?.src ? `<div>${videoPlayerHtml(b)}</div>` : `<div class="${videoBoxClass(b)}">${VIDEO_PLACEHOLDER}</div>`}</div></div>`;
    }
    // A Markdown block (parity/findings/CAP-T10PRE.json, CAP-T10MD.json): its placeholder shows in the editor and in Preview (CAP-T10MD9.json); hidden on the published page, inferred.
    case 'markdown':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-markdown markdown-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content">${markdownHtml(b.text || '') || '<div class="sqs-blockStatus sqs-html-content">\n      <p>Double-click to edit...</p>\n    </div>'}</div></div>`;
    case 'code': {
      if (b.html != null) return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-code code-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-code-container">${codeOutput(b)}</div></div></div>`;
      const src = b.codeOf ? sectionGridCss(model.sections.find((s) => s.id === b.codeOf)).trim() : b.code;
      return `<div class="sqs-block code-block sqs-block-code" data-block-type="23" id="block-${b.id}"><div class="sqs-block-content"><pre><code>${escapeHtml(src)}</code></pre></div></div>`;
    }
    default:
      return `<div class="sqs-block" id="block-${b.id}"><div class="sqs-block-content"></div></div>`;
  }
}

// Block design (Edit > Design, parity/findings/DESIGN.json): the oracle writes one rule per
// block in <style class="transform-vars">, in this exact form (corpus pages, 134 blocks).
// --block-transform stays none until a transform is set. Blur adds backdrop-filter:
// blur(15px) and Background a white block background on this site.
export const DESIGN_DEFAULTS = { opacity: 100, tx: 0, ty: 0, rotate: 0, sx: 100, sy: 100, kx: 0, ky: 0, ox: 50, oy: 50 };
const TRANSFORM = 'translateX(var(--translate-x)) translateY(var(--translate-y)) rotate(var(--rotation)) scale(var(--scale-x), var(--scale-y)) skewX(var(--skew-x)) skewY(var(--skew-y))';
// Each layout has its own Design values (PERLAYOUT.json): desktop's flow to the phone, value by
// value, unless the phone set that value itself. Phone values never reach desktop.
export const designBag = (bp) => (bp === 'mobile' ? 'designMobile' : 'design');
// Reset to theme on a phone (CAP-T6FOLLOW.json): the phone follows desktop again, and the row still counts as set.
export const FOLLOW_DESKTOP = 'follow-desktop';
export const designFor = (b, bp) => {
  const d = { ...DESIGN_DEFAULTS, ...b.design, ...(bp === 'mobile' ? b.designMobile : null) };
  if (bp === 'mobile') for (const k in b.designMobile) if (b.designMobile[k] === FOLLOW_DESKTOP) { if (b.design && k in b.design) d[k] = b.design[k]; else delete d[k]; }
  return d;
};
// The Corner of a shape or an image, once per layout: the phone's own, or else desktop's (CAP-L6CORNER.json).
const pxList = (a) => a.map((v) => `${v}px`).join(' ');
export function cornerFor(b, bp) {
  const m = bp === 'mobile' ? b.designMobile : null;
  if (m?.corners) return { corners: m.corners, css: pxList(m.corners), first: m.corners[0] };
  if (m && 'corner' in m) return { corners: null, css: m.corner ? `${m.corner}px` : '', first: m.corner };
  if (b.corners) return { corners: b.corners, css: pxList(b.corners), first: b.corners[0] };
  return { corners: null, css: b.radius || '', first: parseFloat(b.radius) || 0 };
}
export const phoneOwn = (b, k) => { const v = b.designMobile?.[k]; return !!v && v !== FOLLOW_DESKTOP; };
// A shape's Color: desktop's is the block's own, a phone's is a Design value like Stroke (CAP-T6LAYOUT.json).
export const shapeFill = (b, bp) => (bp === 'mobile' && phoneOwn(b, 'color') ? b.designMobile.color : b.color || b.fill);
function designRule(b, d, phone) {
  const moved = d.tx || d.ty || d.rotate || d.sx !== 100 || d.sy !== 100 || d.kx || d.ky;
  const off = phone && b.design?.blur;
  const clear = phone && b.design?.background;
  const imageCorner = phone && b.type === 'image' && (b.designMobile.corners || 'corner' in b.designMobile) ? `\n    .fe-block-${b.id} .fluid-image-container { border-radius: ${cornerFor(b, 'mobile').css || '0'} !important; }` : '';
  return `${imageCorner}
    .fe-block-${b.id} {
      --opacity: ${d.opacity}%;
      --translate-x: ${d.tx}px;
      --translate-y: ${d.ty}px;
      --rotation: ${d.rotate}deg;
      --scale-x: ${d.sx}%;
      --scale-y: ${d.sy}%;
      --skew-x: ${d.kx}deg;
      --skew-y: ${d.ky}deg;
      --origin-x: ${d.ox}%;
      --origin-y: ${d.oy}%;
      --block-transform: ${moved ? TRANSFORM : 'none'};

      opacity: var(--opacity, 1);
      transform: var(--block-transform);
      transform-origin: var(--origin-x) var(--origin-y);${d.blur ? `\n      ${d.blurKind === 'element' ? 'filter' : 'backdrop-filter'}: blur(${d.blurPx ?? 15}px);${phone && off ? ` ${d.blurKind === 'element' ? 'backdrop-filter' : 'filter'}: none;` : ''}` : off ? '\n      backdrop-filter: none; filter: none;' : ''}
    }${d.background ? `\n    .fe-block-${b.id}${b.type === 'stack' ? ' >' : ''} .sqs-block { background-color: ${d.bgClear ? 'transparent' : d.bgColor || 'rgb(255, 255, 255)'}; }` : clear ? `\n    .fe-block-${b.id}${b.type === 'stack' ? ' >' : ''} .sqs-block { background-color: transparent; }` : ''}
  `;
}
export function designCss(b) {
  const base = designRule(b, designFor(b, 'desktop'), false);
  return b.designMobile ? `${base}\n    @media (max-width: 767px) {${designRule(b, designFor(b, 'mobile'), true)}}\n  ` : base;
}

// Blend Mode (T15, parity/findings/BLEND.json): on a text block the oracle keeps
// mix-blend-mode: var(--tweak-text-block-blend ) and sets the variable, normal by default.
// Other block types are not measured; they get mix-blend-mode directly.
export const BLEND_MODES = ['Normal', 'Multiply', 'Screen', 'Overlay', 'Darken', 'Lighten', 'Color Dodge', 'Color Burn', 'Hard Light', 'Soft Light', 'Difference', 'Exclusion', 'Hue', 'Saturation', 'Color', 'Luminosity'];
export const BUTTON_SIZE = { primary: 'medium', secondary: 'large', tertiary: 'small' };

// A child's W and H inside its stack (parity/findings/S3.json children): Fill, Hug or a size with
// a unit. A Shape fills both ways by default, others fill across and hug their height.
// Phones keep their own: a phone's W starts at Fill, its H starts at the desktop H, and nothing set on a phone reaches desktop.
export const kidSize = (c, bp = 'desktop') => {
  const h = c.size?.h || (c.type === 'shape' ? 'Fill' : 'Hug');
  return bp === 'mobile' ? { w: c.sizeM?.w || 'Fill', h: c.sizeM?.h || h } : { w: c.size?.w || 'Fill', h };
};
export const kidSizeKey = (bp) => (bp === 'mobile' ? 'sizeM' : 'size');
function kidAttrs(c) {
  const mode = (v) => (v === 'Fill' || v === 'Hug' ? v.toLowerCase() : 'fixed');
  const attrs = [['desktop', ''], ['mobile', 'm']].map(([bp, m]) => { const { w, h } = kidSize(c, bp); return { data: ` data-${m}w="${mode(w)}" data-${m}h="${mode(h)}"`, vars: `${mode(w) === 'fixed' ? `--kid-${m}w:${w};` : ''}${mode(h) === 'fixed' ? `--kid-${m}h:${h};` : ''}` }; });
  // Align Vertically on a Shape with Stretch off moves it inside its box, in each layout (CAP-S3ALIGN.json, CAP-S3ALIGN2.json).
  const aligns = c.type === 'shape' ? [['desktop', ''], ['mobile', 'm']].map(([bp, m]) => (c.layout?.[bp]?.align ? `--kid-${m}align:${c.layout[bp].align};` : '')).join('') : '';
  const vars = attrs[0].vars + attrs[1].vars + aligns;
  const hide = `${c.layout?.desktop?.hidden ? ' data-hide-d' : ''}${c.layout?.mobile?.hidden ? ' data-hide-m' : ''}`;
  return ` data-kid="${c.id}"${attrs[0].data}${attrs[1].data}${vars ? ` style="${vars}"` : ''}${hide}`;
}
// A stack's direction and position in one layout (parity/findings/S3.json): phones start as a
// column at the top left and keep their own values. Position is stored as left-right and
// top-bottom, so the same tab stays on when the direction changes.
export function stackAxes(b, bp) {
  const s = bp === 'mobile' ? (b.phone || {}) : b;
  return { direction: s.direction || 'column', x: s.posX || 'flex-start', y: s.posY || 'flex-start' };
}
// The oracle's rule for a stack (S3.json): in a row left-right is justify-content and top-bottom
// align-items, in a column the reverse. Fill spreads the children and drops the gap.
export function stackCss(b) {
  const fill = b.gap === 'fill';
  const vars = (bp, spread) => {
    const { direction, x, y } = stackAxes(b, bp), row = direction === 'row';
    return `--stack-flex-direction: ${direction}; --stack-justify-content: ${spread ? 'space-between' : row ? x : y}; --stack-align-items: ${row ? y : x};`;
  };
  const sel = `.sqs-stack-container[data-component-id="${b.id}"]`;
  const p = b.padding;
  const padding = !p ? '' : b.padFour ? `${p.t} ${p.r} ${p.b} ${p.l}` : `${p.t} ${p.l}`;
  const cornerOf = (g) => (g.corners ? g.corners.map((v) => `${v}px`).join(' ') : g.corner ? `${g.corner}px` : '');
  const corner = cornerOf(designFor(b, 'desktop'));
  const own = `${padding ? `padding: ${padding};` : ''}${corner ? `border-radius: ${corner};` : ''}`;
  // A corner set on the phone stays the phone's, like every Design value (PERLAYOUT.json).
  const phoneCorner = cornerOf(designFor(b, 'mobile'));
  const phone = phoneCorner !== corner ? ` #block-${b.id} { border-radius: ${phoneCorner || '0'}; }` : '';
  return `${own ? `#block-${b.id} { ${own} } ` : ''}${sel} { ${vars('desktop', fill)} --stack-gap: ${fill ? 'normal' : `${b.gap ?? 20}px`}; } @media screen and (max-width: 767px) { ${sel} { ${vars('mobile', false)} }${phone} }`;
}

export const STROKE_PX = { S: 2, M: 6, L: 15 };
export const STROKE_PAD = { S: '3%', M: '6%', L: '12%' };
function blendRule(b, g, phone) {
  const base = b.design || {};
  // Drop Shadow on a shape (SHAPEDESIGN.json): drop-shadow(2px 2px 3px) on the block contents,
  // in the text color as no color is given.
  // Stroke on a text block (parity/findings/STROKE.json): a solid or dashed black border on
  // .sqs-block, 2, 6 or 15px, and padding inside it of 3, 6 or 12% (6% unless set). Corner is
  // ours: the block's corner radius (not measured).
  const on = `.fe-block-${b.id}${b.type === 'stack' ? ' >' : ''} .sqs-block`, boxed = b.type !== 'shape' && b.type !== 'stack' && (g.stroke || g.background);
  const w = g.strokeSize === 'custom' ? g.strokePx ?? 2 : STROKE_PX[g.strokeSize || 'S'];
  const radius = g.corners ? g.corners.map((v) => `${v}px`).join(' ') : `${g.corner || 0}px`;
  const pad = g.pad === 'custom' ? `${g.padY ?? 6}% ${g.padX ?? 6}%` : STROKE_PAD[g.pad || 'M'];
  const inner = b.type === 'social' ? '.sqs-block-content' : b.type === 'form' ? '.form-wrapper' : '.sqs-html-content'; // what the padding goes on
  // Stroke, Corner and Padding (STROKE.json, BLOCKDESIGN.json). A background has the same corner and padding.
  // A video's: on .intrinsic, the Corner on the two above it as well (CAP-T7DESIGN2.json, CAP-T7DESIGN3.json).
  const vAt = `.fe-block-${b.id}`, vBoxed = g.background || g.stroke, vY = g.padY ?? 6, vX = g.padX ?? 6;
  const vPad = !vBoxed ? '0' : g.padFour ? `${g.padT ?? vY}% ${g.padR ?? vX}% ${g.padB ?? vY}% ${g.padL ?? vX}%` : `${vY}% ${vX}%`;
  const video = g.corner || g.corners || vBoxed || phone ? `${vAt} .sqs-block, ${vAt} .sqs-block-content { border-radius: ${radius}; } ${vAt} .intrinsic { border-radius: ${radius}; padding: ${vPad}; background-color: ${g.background && !g.bgClear ? g.bgColor || 'rgb(255, 255, 255)' : 'transparent'}; border: ${g.stroke ? `${g.strokePx ?? 6}px ${g.stroke} ${g.strokeColor || 'rgb(255, 255, 255)'}` : '0'}; }` : '';
  const stroke = b.type === 'video' ? video : b.type === 'shape' ? '' : (g.stroke ? `${on} { border: ${w}px ${g.stroke} ${g.strokeColor || 'rgb(0, 0, 0)'}; border-radius: ${b.type === 'stack' ? `${g.corner || 0}px` : radius}; }` : phone && base.stroke ? `${on} { border: 0; }` : '')
    + (boxed ? `${g.stroke ? '' : ` ${on} { border-radius: ${radius}; }`} .fe-block-${b.id} { border-radius: ${radius}; } .fe-block-${b.id} ${inner} { padding: ${pad}; }`
      : phone && b.type !== 'shape' && b.type !== 'stack' && (base.stroke || base.background) ? ` .fe-block-${b.id} ${inner} { padding: 0; } ${on} { border-radius: 0; } .fe-block-${b.id} { border-radius: 0; }` : '');
  const drop = g.shadow ? `.fe-block-${b.id} .sqs-block { filter: drop-shadow(2px 2px 3px); }` : phone && base.shadow ? `.fe-block-${b.id} .sqs-block { filter: none; }` : '';
  const shadow = drop + (stroke ? ` ${stroke}` : '');
  const m = g.blend && g.blend !== 'normal' ? g.blend : phone && base.blend && base.blend !== 'normal' ? 'normal' : null;
  if (!m) return shadow;
  if (b.type === 'text') return `${shadow} .fe-block-${b.id} { mix-blend-mode: var(--tweak-text-block-blend ); } .fe-block-${b.id} { --tweak-text-block-blend : ${m}; }`.trim();
  return `${shadow} .fe-block-${b.id} { mix-blend-mode: ${m}; }`.trim();
}
export function blendCss(b) {
  const base = blendRule(b, b.design || {}, false);
  const phone = b.designMobile ? blendRule(b, { ...b.design, ...b.designMobile }, true) : '';
  return phone ? `${base} @media (max-width: 767px) { ${phone} }`.trim() : base;
}

// A child's design goes on the block inside its container, so the marks stay square when it turns (S3.json fromLayers.transforms).
function kidDesign(b, c) {
  const css = `${c.design || c.designMobile ? designCss(c) : ''}${blendCss(c)}`;
  if (!css) return '';
  const on = `#block-${b.id}-${c.id}`;
  return `<style class="transform-vars">${css.replaceAll(`.fe-block-${c.id} .sqs-block`, on).replaceAll(`.fe-block-${c.id}`, on)}</style>`;
}

export function renderBlock(b, model) {
  const blend = blendCss(b);
  const design = (b.design || b.designMobile ? `<style class="transform-vars">${designCss(b)}</style>` : '') + (blend ? `<style class="fe-blend">${blend}</style>` : '');
  // A block with animations says so on its .sqs-block (ANIMFLOW.json).
  const inner = b.animations?.length ? blockInner(b, model).replace('<div class="sqs-block ', '<div data-has-block-animations="" class="sqs-block ') : blockInner(b, model);
  return `<div class="fe-block fe-block-${b.id}" data-block-id="${b.id}">${inner}${design}</div>`;
}

// Section divider (P5), measured on the oracle (parity/findings/DIVIDER.json, CAP-DIVSHAPES.json):
// the default shape is a wave across the full width in a 6vw band at the section bottom. These
// are the band-relative heights of its edge at 41 even steps, sampled at 1600px and the same at
// 375 and 1280px. The background is clipped along the edge and a 6px stroke follows it.
export const DIVIDER_EDGE = [0.5, 0.438, 0.375, 0.313, 0.253, 0.196, 0.143, 0.097, 0.061, 0.037, 0.03, 0.04, 0.064, 0.1, 0.147, 0.2, 0.257, 0.318, 0.379, 0.443,
  0.505, 0.569, 0.631, 0.693, 0.753, 0.81, 0.864, 0.91, 0.947, 0.972, 0.98, 0.973, 0.95, 0.914, 0.868, 0.815, 0.757, 0.698, 0.636, 0.573, 0.51];
// The other shapes (parity/findings/CAP-DIVSHAPES.json): the edge of one period as [phase, height],
// read along the oracle's stroke at a 96px band. Each repeats at its width.
export const DIVIDER_SHAPES = { ...{ rounded: [[0.0001,0.022],[0.049,0.194],[0.1052,0.37],[0.1634,0.53],[0.2199,0.666],[0.2744,0.777],[0.3287,0.867],[0.3822,0.935],[0.4312,0.978],[0.4634,0.994],[0.4956,1],[0.5278,0.996],[0.56,0.981],[0.5948,0.955],[0.6288,0.92],[0.6633,0.875],[0.6989,0.819],[0.7768,0.666],[0.8514,0.483],[0.9274,0.261],[0.9991,0.014]], soft: [[0,0.014],[0,0.364],[0.0049,0.645],[0.0147,0.836],[0.0295,0.95],[0.0393,0.982],[0.0503,0.998],[0.9497,0.998],[0.9607,0.982],[0.9705,0.95],[0.9853,0.836],[0.9951,0.645],[1,0.364],[1,0.014]], slanted: [[0,0.998],[0.999,0.014]], scalloped: [[0.001,0.999],[0.0838,0.999],[0.1623,0.991],[0.2301,0.974],[0.2957,0.948],[0.3785,0.899],[0.4595,0.832],[0.5396,0.75],[0.6246,0.646],[0.716,0.516],[0.8048,0.374],[0.8998,0.208],[1,0.017]], jagged: [[0,0.016],[0.7484,1],[0.9994,0.014]], pointed: [[0,0.997],[0.4986,0.014],[0.9991,1]] }, wavy: DIVIDER_EDGE.map((r, k) => [k / (DIVIDER_EDGE.length - 1), r]) };
export const DIVIDER_SHAPE_NAMES = [['none', 'No Shape'], ['rounded', 'Rounded Shape'], ['soft', 'Soft Corners Shape'], ['slanted', 'Slanted Shape'], ['scalloped', 'Scalloped Shape'], ['wavy', 'Wavy Shape'], ['jagged', 'Jagged Shape'], ['pointed', 'Pointed Shape']];
// Width S 5vw, M 20vw, L 100vw (custom 1 to 150); Height S 2vw, M 6vw, L 12vw (custom 1 to 150).
export const DIVIDER_WIDTHS = { S: 5, M: 20, L: 100 };
export const DIVIDER_HEIGHTS = { S: 2, M: 6, L: 12 };
// Stroke (parity/findings/DIVOPTS.json): none, solid or dashed (5px dash, 21px gap, square
// caps, measured at 6px); thickness S 2px, M 6px (default), L 15px, or custom 1 to 50.
export const DIVIDER_THICKNESS = { S: 2, M: 6, L: 15 };
export const dividerBand = (s) => ((s.dividerShape || 'wavy') === 'none' ? 0 : s.dividerHeight ?? 6);
// Which Flip buttons a shape shows, and how it mirrors: Scalloped is drawn mirrored until Flip Y Axis is pressed.
export const DIVIDER_FLIPS = { rounded: ['X'], soft: ['X'], slanted: ['Y'], scalloped: ['Y', 'X'], wavy: ['X'], jagged: ['Y', 'X'], pointed: ['X'] };
const dividerMirrored = (s) => !!s.dividerFlipY !== (s.dividerShape === 'scalloped');
// Soft Corners is one piece across the section: no Width or Alignment, and its corners grow with the Height.
const fixedWidth = (s) => s.dividerShape === 'soft';
// Alignment moves the edge A/2 px left at any window size; a mirrored shape moves right.
export const dividerShift = (s) => (fixedWidth(s) ? 0 : ((dividerMirrored(s) ? 1 : -1) * (s.dividerAlign || 0)) / 2);
// The edge across the section, left to right, as [share of the width, height in the band]. Phase
// .5 sits at the middle and a period is dividerWidth vw wide. Flip X mirrors the height over the
// shape's own middle, Flip Y the whole edge over the section's middle. It reaches past the sides
// by what the narrowest window would show of the alignment.
export function dividerEdge(s) {
  const pts = DIVIDER_SHAPES[s.dividerShape || 'wavy'];
  if (!pts) return null;
  const ys = pts.map((q) => q[1]), mirror = s.dividerFlip ? Math.min(...ys) + Math.max(...ys) : null;
  const height = (r) => (mirror == null ? r : +(mirror - r).toFixed(3));
  if (fixedWidth(s)) {
    const k = dividerBand(s) / 6;
    return pts.map(([x, r]) => [x < 0.5 ? Math.min(0.5, x * k) : Math.max(0.5, 1 - (1 - x) * k), height(r)]);
  }
  const p = (s.dividerWidth ?? 100) / 100, m = s.dividerAlign ? Math.abs(s.dividerAlign) / 640 : 0;
  const out = [];
  for (let k = Math.floor((-m - 0.5) / p); k <= Math.ceil((1 + m - 0.5) / p); k++) {
    if (0.5 + (k + 0.5) * p <= -m || 0.5 + (k - 0.5) * p >= 1 + m) continue;
    for (const [ph, r] of pts) out.push([0.5 + (k + ph - 0.5) * p, height(r)]);
  }
  return dividerMirrored(s) ? out.map(([x, r]) => [1 - x, r]).reverse() : out;
}
const dividerClip = (s) => {
  const edge = dividerEdge(s);
  if (!edge) return '';
  const h = dividerBand(s), shift = dividerShift(s);
  const x = (v) => (shift ? `calc(${+(v * 100).toFixed(3)}% + ${shift}px)` : `${+(v * 100).toFixed(3)}%`);
  return `polygon(0 0, 100% 0, ${edge.map(([v, r]) => `${x(v)} calc(100% - ${+(h * (1 - r)).toFixed(3)}vw)`).reverse().join(', ')})`;
};
const dividerSvg = (s) => {
  const style = s.dividerStroke || 'solid';
  if (style === 'none') return '';
  const t = s.dividerThickness, w = typeof t === 'number' ? t : DIVIDER_THICKNESS[t || 'M'];
  const edge = dividerEdge(s), shift = dividerShift(s);
  const d = edge ? `M${edge.map(([v, r]) => `${+v.toFixed(4)} ${r}`).join(' L')}` : 'M0 1 L1 1';
  return `<svg class="section-divider-stroke" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"${shift ? ` style="transform: translateX(${shift}px);"` : ''}><path d="${d}" style="stroke-width: ${w}px;${style === 'dashed' ? ' stroke-dasharray: 5px 21px;' : ''}${s.dividerColor ? ` stroke: ${s.dividerColor};` : ''}" /></svg>`;
};
// Art tiles (P5, parity/findings/CAP-DIVSHAPES.json, art): the oracle draws these with WebGL.
// Ours are stand-ins in CSS from the same color rows, not its pictures.
export const ART = [
  ['surface', 'Surface', ['First color', 'Second color', 'Third color', 'Fourth color'], (c) => `linear-gradient(170deg, ${c[0]}, ${c[2]} 40%, ${c[1]} 70%, ${c[3]})`],
  ['conic', 'Conic', ['First color', 'Second color', 'Fog color'], (c) => `radial-gradient(circle at 42% 66%, ${c[1]} 0 12%, transparent 30%), ${c[2]}`],
  ['bokeh', 'Bokeh', ['First color', 'Second color', 'Background color', 'Light color'], (c) => `radial-gradient(circle at 30% 30%, ${c[3]} 0 2%, transparent 3%), radial-gradient(circle at 70% 60%, ${c[0]} 0 3%, transparent 4%), radial-gradient(circle at 55% 20%, ${c[1]} 0 2%, transparent 3%), ${c[2]}`],
  ['images', 'Images', ['Image tint', 'Background color'], (c) => `radial-gradient(circle at 25% 35%, ${c[0]} 0 8%, transparent 8%), radial-gradient(circle at 70% 65%, ${c[0]} 0 6%, transparent 6%), ${c[1]}`],
  ['contours', 'Contours', ['Start color', 'End color'], (c) => `repeating-radial-gradient(circle at 0 100%, ${c[1]} 0 8%, ${c[0]} 8% 16%)`],
  ['gradient', 'Gradient', ['Start color', 'End color'], (c) => `linear-gradient(135deg, ${c[0]}, ${c[1]})`],
  ['gradient2', 'Gradient', ['Start color', 'End color'], (c) => `radial-gradient(circle, ${c[1]}, ${c[0]})`],
  ['shapes', 'Shapes', ['Shape color', 'Background color'], (c) => `repeating-linear-gradient(45deg, ${c[0]} 0 6px, transparent 6px 60px), ${c[1]}`],
  ['isometric', 'Isometric', ['Start color', 'End color'], (c) => `repeating-linear-gradient(60deg, ${c[0]} 0 40px, ${c[1]} 40px 80px)`],
];
const ART_PALETTE = ['#F2B8B4', '#FFCF5A', '#FFFFFF', '#B564F7'];
export const artDefaults = (name) => (ART.find((a) => a[0] === name)?.[2] || []).map((_, k) => ART_PALETTE[k]);
export const artCss = (name, colors) => ART.find((a) => a[0] === name)?.[3](colors) ?? '';
// Video filter: the strength is 0 to 100; what it does to a video needs an upload on the oracle (0005), so this mapping is ours.
const FILTERS = { Blur: (v) => `blur(${v / 5}px)`, Brightness: (v) => `brightness(${100 + v}%)`, Contrast: (v) => `contrast(${100 + v}%)`, Invert: (v) => `invert(${v}%)`, Opacity: (v) => `opacity(${100 - v}%)`, Saturate: (v) => `saturate(${100 + v}%)`, Sepia: (v) => `sepia(${v}%)` };
const bgMedia = (s) => {
  if (s.bgKind === 'Art' && s.bgArt) return `<div class="section-background-art" data-art="${s.bgArt.name}" style="background: ${escapeHtml(artCss(s.bgArt.name, s.bgArt.colors))};"></div>`;
  if (s.bgKind === 'Video' && s.bgVideo) {
    const filter = s.bgFilter && FILTERS[s.bgFilter] ? FILTERS[s.bgFilter](s.bgFilterStrength || 0) : '';
    return `<video class="section-background-image section-background-video" muted loop autoplay playsinline src="${escapeHtml(s.bgVideo)}"${filter ? ` style="filter: ${filter};"` : ''}${s.bgSpeed && s.bgSpeed !== 1 ? ` onloadedmetadata="this.playbackRate=${+s.bgSpeed}"` : ''}></video>${s.bgFallback ? `<img class="section-background-image section-background-fallback" alt="" src="${escapeHtml(s.bgFallback)}">` : ''}`;
  }
  return s.bgKind !== 'Video' && s.bgKind !== 'Art' && s.bgImage ? `<img class="section-background-image" alt="" src="${escapeHtml(s.bgImage)}">` : '';
};

export function renderSection(s, model) {
  // Section settings (P3, P4, P5): height S/M/L, vertical alignment, content width, background width.
  const cls = [
    'page-section',
    `section-height--${s.height || 'medium'}`,
    `vertical-alignment--${s.valign || 'middle'}`,
    `content-width--${s.contentWidth || 'wide'}`,
    `horizontal-alignment--${s.halign || 'center'}`,
    `background-width--${s.bgWidth || 'full-bleed'}`,
    s.divider ? 'has-section-divider' : '',
  ].filter(Boolean).join(' ');
  const themeName = (s.theme || '').replace(/^theme-/, '');
  const vars = [s.height === 'custom' ? `--custom-height: ${s.customHeight ?? 0};` : '', s.divider && dividerBand(s) !== 6 ? `--divider-h: ${dividerBand(s)}vw;` : ''].filter(Boolean).join(' ');
  const style = vars ? ` style="${vars}"` : '';
  return `<section class="${cls}"${s.anchor ? ` id="${escapeHtml(s.anchor)}"` : ''} data-section-id="${s.id}" data-section-theme="${themeName}"${style}><div class="section-background"${s.divider && dividerClip(s) ? ` style="clip-path: ${dividerClip(s)};"` : ''}>${bgMedia(s)}</div>${s.divider ? dividerSvg(s) : ''}<div class="content-wrapper"><div class="content"><style data-fe-css>${sectionCss(s)}</style><div class="fluid-engine fe-${s.id}">${s.blocks.map((b) => renderBlock(b, model)).join('')}</div></div></div></section>`;
}

// Site header (P7), measured on the oracle (parity/findings/P7.json): it lies over the
// first section; desktop is the title's line height plus 3vw above and below, phones a
// 40px row (the menu button) plus 6vw. A small script switches to the phone header when
// title, menu and actions no longer fit, and pads the first section by the header's
// height, as the oracle's own script does. Spacing: 4vw sides, 1.3vw between menu
// items, 2vw before the actions.
// The header takes the first section's theme (parity/findings/CAP-HEADERTHEME.json).
export const headerTheme = (model) => (model.sections?.[0]?.theme || '').replace(/^theme-/, '');
export function renderHeader(h, theme = '') {
  if (!h) return '';
  const nav = (h.nav || []).map((n) => `<a class="header-nav-item" href="${escapeHtml(n.href || '#')}">${escapeHtml(n.label)}</a>`).join('');
  const actions = (h.actions || []).map((n) => `<a class="header-action" href="${escapeHtml(n.href || '#')}">${escapeHtml(n.label)}</a>`).join('');
  return `<header class="site-header" id="header" data-section-theme="${escapeHtml(theme)}" data-collapse-below="${h.collapseBelow || 817}"><div class="header-inner"><a class="header-title" href="/">${escapeHtml(h.title)}</a><nav class="header-nav">${nav}</nav><div class="header-actions">${actions}</div><button class="header-burger" type="button" aria-label="Open Menu"><span></span><span></span></button></div></header>`;
}

export const HEADER_SCRIPT = `(() => {
  const header = document.getElementById('header');
  if (!header) return;
  const fit = () => {
    header.classList.remove('is-collapsed');
    const inner = header.querySelector('.header-inner');
    // The oracle switched at 817px for this title and menu (measured); its rule for
    // other content is not known, so the width is stored on the header.
    if (window.innerWidth < Number(header.dataset.collapseBelow || 817)) header.classList.add('is-collapsed');
    const first = document.querySelector('main#page .page-section');
    if (first) first.style.paddingTop = header.getBoundingClientRect().height + 'px';
  };
  fit();
  addEventListener('resize', fit);
  document.fonts && document.fonts.ready.then(fit);
})();`;

// On a published page a title opens and closes its item, one at a time unless the block allows
// more. This behaviour is inferred from the block's labels, not measured on a published page.
// The player's own buttons, on a published page and in preview. In edit mode a click there selects, and
// `live` says no. The published page gets this function's own text.
export function bindVideoPlayer(document, live = () => true) {
  const vpOf = (e) => e.target.closest('.native-video-player');
  const vpClose = () => { for (const m of document.querySelectorAll('.vp-menu')) { m.hidden = true; m.querySelector('.vp-home').hidden = false; m.querySelector('.vp-speeds').hidden = true; m.closest('.native-video-player').querySelector('[data-vp="settings"]').setAttribute('aria-expanded', 'false'); } };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') vpClose(); });
  for (const t of ['play', 'pause', 'ended']) document.addEventListener(t, (e) => { e.target.closest?.('.native-video-player')?.classList.toggle('is-playing', t === 'play'); }, true);
  document.addEventListener('click', (e) => {
    const p = live() && vpOf(e); if (!p) return;
    const v = p.querySelector('video'), act = e.target.closest('[data-vp]')?.dataset.vp, menu = p.querySelector('.vp-menu');
    const swap = e.target.closest('[data-vp-menu]'), rate = e.target.closest('[data-vp-rate]');
    if (swap || rate) {
      if (rate) { v.playbackRate = Number(rate.dataset.vpRate); menu.querySelectorAll('[data-vp-rate]').forEach((r) => r.setAttribute('aria-checked', String(r === rate))); menu.querySelector('.vp-now').textContent = rate.textContent; }
      const list = swap?.dataset.vpMenu === 'speed';
      menu.querySelector('.vp-home').hidden = list; menu.querySelector('.vp-speeds').hidden = !list;
      return;
    }
    if (act === 'settings') { const open = menu.hidden; vpClose(); if (open) { menu.hidden = false; e.target.closest('[data-vp]').setAttribute('aria-expanded', 'true'); } return; }
    if (e.target.closest('.vp-menu')) return;
    if (menu && !menu.hidden) { vpClose(); return; }
    if (act === 'mute') v.muted = !v.muted;
    else if (act === 'fullscreen') p.requestFullscreen?.();
    else if (act === 'seek' || act === 'volume') return;
    else if (v.paused) v.play(); else v.pause();
  });
  document.addEventListener('input', (e) => {
    const p = live() && vpOf(e); if (!p) return;
    const v = p.querySelector('video'), act = e.target.dataset.vp;
    if (act === 'seek' && Number.isFinite(v.duration)) v.currentTime = e.target.value / 100 * v.duration;
    if (act === 'volume') v.volume = Number(e.target.value);
  });
  document.addEventListener('timeupdate', (e) => {
    const p = e.target.closest?.('.native-video-player'), s = p?.querySelector('.vp-seek');
    if (s && Number.isFinite(e.target.duration)) s.value = e.target.currentTime / e.target.duration * 100;
  }, true);
}
export const VIDEO_SCRIPT = `(${bindVideoPlayer})(document);`;

// The path of a rectangle with corners, as read (CAP-T6CORNERS.json). W and H are the box in whole px, w the
// stroke, radii top left, top right, bottom right, bottom left. Radii that don't fit shrink together as
// CSS's do, by the box with its stroke, and then each loses half the stroke.
export const rectPath = (W, H, radii, w) => {
  const half = w / 2, L = -half, T = -half, R = W + half, B = H + half, n = (v) => +v.toFixed(3);
  const [a, b, c, d] = radii, f = Math.min(1, (W + w) / (a + b || 1), (W + w) / (c + d || 1), (H + w) / (a + d || 1), (H + w) / (b + c || 1));
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, r * f - half));
  const arc = (r, x, y) => (r ? ` A${n(r)},${n(r)} 0 0 1 ${n(x)},${n(y)}` : '');
  return `M${n(W / 2)},${n(T)} H${n(R - tr)}${arc(tr, R, T + tr)} V${n(B - br)}${arc(br, R - br, B)} H${n(L + bl)}${arc(bl, L, B - bl)} V${n(T + tl)}${arc(tl, L + tl, T)} Z`;
};
// Draws those paths now and whenever their box changes, on any page. Its own code goes in a script, so it takes rectPath.
export function watchShapeRects(doc, path) {
  const win = doc.defaultView, seen = new WeakSet();
  const draw = (svg) => {
    const p = svg.querySelector('path[data-rect]');
    if (p && svg.clientWidth) p.setAttribute('d', path(svg.clientWidth, svg.clientHeight, p.dataset.rect.split(' ').map(Number), Number(p.dataset.w)));
  };
  const ro = new win.ResizeObserver((all) => all.forEach((e) => draw(e.target)));
  const scan = () => {
    for (const p of doc.querySelectorAll('path[data-rect]')) {
      const svg = p.closest('svg');
      draw(svg);
      if (!seen.has(svg)) { seen.add(svg); ro.observe(svg); }
    }
  };
  new win.MutationObserver(scan).observe(doc.documentElement, { childList: true, subtree: true });
  scan();
}
export const SHAPE_SCRIPT = `(${watchShapeRects})(document, ${rectPath});`;

export const ACCORDION_SCRIPT = `document.addEventListener('click', (e) => {
  const b = e.target.closest('.accordion-item__click-target');
  if (!b) return;
  const li = b.closest('.accordion-item'), open = !li.hasAttribute('data-is-open'), ul = li.parentElement;
  if (open && ul.dataset.shouldAllowMultipleOpenItems !== 'true') for (const o of ul.querySelectorAll('[data-is-open]')) { o.removeAttribute('data-is-open'); o.querySelector('.accordion-item__click-target').setAttribute('aria-expanded', 'false'); }
  if (open) li.setAttribute('data-is-open', 'true'); else li.removeAttribute('data-is-open');
  b.setAttribute('aria-expanded', String(open));
});`;

export function renderPage(model) {
  return model.sections.map((s) => renderSection(s, model)).join('\n');
}

// The site footer: Fluid Engine sections of their own (P7).
export function renderFooter(model) {
  if (!model.footer?.length) return '';
  return `<footer class="sections" id="footer-sections">${model.footer.map((s) => renderSection(s, model)).join('')}</footer>`;
}

export function exportHtml(model, siteCss) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(model.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;1,400&display=swap">
<style>${siteCss}</style>
${siteStylesHead(model.siteStyles)}
</head>
<body>
${renderHeader(model.header, headerTheme(model))}
<main id="page">
${renderPage(model)}
</main>
${renderFooter(model)}
<script>${HEADER_SCRIPT}
${ACCORDION_SCRIPT}
${VIDEO_SCRIPT}
${SHAPE_SCRIPT}
(() => { ${IMAGE_EFFECT_SCRIPT} })();</script>
</body>
</html>
`;
}
