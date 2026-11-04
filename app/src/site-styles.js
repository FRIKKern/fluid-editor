// The Site Styles panel (U12, parity/findings/SITESTYLES.json, SITESTYLES2.json, 1600 by 1000
// window): the editor moves into a box 16px from the window edges and 320px from the right, and a
// panel on the right shows Site Styles with Close, a 276 by 144 Themes card, then Fonts, Colors,
// Buttons and Forms cards (226 by 104, each with a 44px disclosure, 11px apart) and Miscellaneous.
// A card opens a 342px popover 22px left of the editor's right edge, level with the card and never
// lower than 38px above the window's bottom: a heading, the pack tiles and Customize. The cards draw
// the site's current styles. Disclosures, Customize and Miscellaneous are not built (data-unbuilt).
import { PALETTES, FONT_PACKS, BUTTON_PACKS, FORM_PACKS, THEMES, VARS, resolveSiteStyles, fontLink } from './site-style-packs.js';

const svg = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHEV = '<path d="M9 6l6 6-6 6"/>';
const CHECK = '<path d="M6 12l4 4 8-8"/>';
// The site's own values on the oracle, before any pack is picked.
const BASE_VARS = ['0,0%,100%', '0,0%,0%', '3.87,70.45%,82.75%', '42.55,100%,67.65%', '273.06,90.18%,68.04%'];
const hsl = (v) => `hsl(${v})`;
const swatches = (vars) => { const v = Object.fromEntries(VARS.map((k, i) => [k, vars[i]])); return [v.white, v.lightAccent, v.accent, v.darkAccent, v.black].map(hsl); };
const q = (s) => s.replace(/"/g, '&quot;');

export function siteStylesHtml(styles) {
  const { vars, font, button } = resolveSiteStyles(styles);
  const colors = vars ? swatches(vars) : ['white', 'lightAccent', 'accent', 'darkAccent', 'black'].map((k) => hsl(BASE_VARS[{ white: 0, black: 1, accent: 2, lightAccent: 3, darkAccent: 4 }[k]]));
  const strip = (cls) => `<span class="ss-strip ${cls}">${colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span>`;
  const headFont = font ? `font-family:'${font.h}',sans-serif;font-weight:${font.hw};text-transform:${font.tt}` : '';
  const paraFont = font ? `font-family:'${font.p}',sans-serif;font-weight:${font.pw}` : '';
  // The samples follow the page: a pick moves sections to lightAccent, ink to black and the button to safeDarkAccent.
  const v = vars ? Object.fromEntries(VARS.map((k, i) => [k, hsl(vars[i])])) : null;
  const bg = v ? v.lightAccent : colors[3];
  const ink = v ? v.black : '#000';
  const btnBg = v ? v.safeDarkAccent : '#000';
  const btnInk = v ? v.safeInverseDarkAccent : '#fff';
  const btnStyle = `background:${btnBg};color:${btnInk};${button ? `border-radius:${button.radius};border:${button.border}px solid ${btnBg};` : ''}${font ? `font-family:'${font.p}',sans-serif;font-weight:${font.pw};text-transform:${font.btt};` : ''}`;
  const pack = (name, sample) => `<div class="ss-row"><button type="button" class="ss-card" aria-label="Toggle ${name} style pack popover" aria-expanded="false" data-ss-pop="${name}"><span class="ss-name">${name}</span>${sample}</button><button type="button" class="ss-more" aria-label="Open ${name} style disclosure" data-unbuilt>${svg(CHEV)}</button></div>`;
  return `<button type="button" class="ss-close" data-ss="close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 22)}</button>
    <h2 class="ss-title">Site Styles</h2>
    <button type="button" class="ss-card ss-themes" aria-label="Toggle Themes style pack popover" aria-expanded="false" data-ss-pop="Themes"><span class="ss-name">Themes</span><span class="ss-theme" style="background:${bg}"><span class="ss-aa" style="${headFont};color:${ink}">Aa</span>${strip('ss-strip-theme')}<span class="ss-btn ss-btn-small" style="${btnStyle}">Button</span></span></button>
    <hr class="ss-sep">
    ${pack('Fonts', `<span class="ss-heading" style="${headFont};color:${ink}">Heading</span><span class="ss-para" style="${paraFont};color:${ink}">This is your paragraph.</span>`)}
    ${pack('Colors', strip('ss-strip-colors'))}
    ${pack('Buttons', `<span class="ss-btn ss-btn-wide" style="${btnStyle}">Button</span>`)}
    ${pack('Forms', `<span class="ss-form" style="background:${bg};color:${ink}"><span class="ss-input">Text</span><span class="ss-check">${svg(CHECK, 16)}</span></span>`)}
    <button type="button" class="ss-misc" data-unbuilt>Miscellaneous${svg(CHEV)}</button>`;
}

const customize = '<button type="button" class="ss-customize" data-unbuilt>Customize</button>';
const tile = (kind, id, label, on, body, extra = '') => `<button type="button" class="ss-tile" data-ss-pick="${kind}" data-v="${q(id)}" aria-label="${q(label)}" aria-pressed="${on}"${extra}>${body}</button>`;

function themesPop(cur) {
  const groups = [...new Set(THEMES.map((t) => t.group))];
  const one = (t) => `<button type="button" class="ss-tile ss-tile-theme" data-ss-pick="theme" data-v="${t.id}" aria-label="Site theme ${t.id}" aria-pressed="${cur.theme === t.id}"><span class="ss-tt" style="background:${t.tile.bg}"><span class="ss-tt-aa" style="font:${t.hw} ${t.tile.aa[0]}px/47px '${t.h}',sans-serif;color:${t.tile.aa[1]};text-transform:${t.tile.aa[2] || 'none'}">Aa</span><span class="ss-strip ss-tt-strip">${swatches(t.vars).map((c) => `<span style="background:${c}"></span>`).join('')}</span><span class="ss-tt-btn" style="background:${t.tile.btn.bg || 'transparent'};border:${t.tile.btn.border || '0'};border-radius:${t.tile.btn.radius};color:${t.tile.btn.ink};font-family:'${t.p}',sans-serif;text-transform:${t.btt}">Button</span></span></button>`;
  return `<div class="ss-pop-head">Themes</div>${groups.map((g) => `<div class="ss-pop-group">${g}</div>${THEMES.filter((t) => t.group === g).map(one).join('')}`).join('')}`;
}
function fontsPop(cur) {
  return `<div class="ss-pop-head">Recommended Font Packs</div><div class="ss-pop-grid">${FONT_PACKS.map((f) => tile('font', f.id, `${f.id} font pack`, cur.font === f.id, `<span class="ss-ft-h" style="font:${f.hw} ${f.tile[0]}px/26px '${f.h}',sans-serif;text-transform:${f.tt}">Heading</span><span class="ss-ft-p" style="font:${f.pw} ${f.tile[1]}px/12px '${f.p}',sans-serif">This is your paragraph.</span>`)).join('')}</div>${customize}`;
}
function colorsPop(cur) {
  return `<div class="ss-pop-head">Recommended Color Palettes</div><div class="ss-pop-grid">${PALETTES.map((p) => tile('palette', p.id, `Palette with accent ${p.id}`, cur.palette === p.id, `<span class="ss-strip ss-pal">${swatches(p.vars).map((c) => `<span style="background:${c}"></span>`).join('')}</span>`)).join('')}</div>${customize}`;
}
function buttonsPop(cur) {
  const one = (b) => `<span class="ss-bt${b.tile.bg ? ' is-filled' : ''}" style="width:${b.tile.w}px;height:${b.tile.h}px;background:${b.tile.bg || 'transparent'};border:${b.tile.border}px solid #000;border-radius:${b.tile.radius}${!b.tile.bg && !b.tile.border ? ';border-bottom:2px solid #000' : ''}">Button</span>`;
  return `<div class="ss-pop-head">Recommended Button Packs</div><div class="ss-pop-grid">${BUTTON_PACKS.map((b) => tile('button', b.id, `Button style pack ${b.id}`, cur.button === b.id, one(b))).join('')}</div>${customize}`;
}
function formsPop(accent) {
  const one = (f) => `<span class="ss-fm${f.field ? '' : ' is-line'}" style="width:${f.w}px;background:${f.field?.bg || 'transparent'};border:${f.field?.border || '0'};border-radius:${f.field?.radius || 0}">Text</span><span class="ss-fm-c" style="width:${f.chk.w}px;background:${f.chk.bg || 'transparent'};border:${f.chk.border || '0'};border-radius:${f.chk.radius};color:${f.chk.bg === 'rgba(255, 255, 255, 0)' || !f.chk.bg ? '#000' : '#fff'}">${f.option ? 'Option' : svg(CHECK, 16)}</span>`;
  return `<div class="ss-pop-head">Recommended Form Packs</div><div class="ss-pop-grid ss-pop-forms">${FORM_PACKS.map((f) => tile('form', f.id, `Form pack ${f.id}`, false, one(f), ` style="background:${accent}" data-unbuilt`)).join('')}</div>${customize}`;
}

export function stylePopoverHtml(kind, styles) {
  const cur = styles || {};
  const { vars } = resolveSiteStyles(styles);
  if (kind === 'Themes') return themesPop(cur);
  if (kind === 'Fonts') return fontsPop(cur);
  if (kind === 'Colors') return colorsPop(cur);
  if (kind === 'Buttons') return buttonsPop(cur);
  return formsPop(hsl(vars ? vars[4] : BASE_VARS[4]));
}

// The fonts every tile draws in, loaded once in the editor's own page when a popover first opens.
export function packFontLinks() {
  const seen = new Map();
  for (const f of [...FONT_PACKS, ...THEMES]) { seen.set(`${f.h}|${f.hw}`, [f.h, f.hw]); seen.set(`${f.p}|${f.pw}`, [f.p, f.pw]); }
  return [...seen.values()].map(([n, w]) => fontLink(n, w)).join('');
}

// Measured (window 1000 tall): the popover sat at its card's top, except that its bottom stopped at
// 962 (Buttons at 441, Forms at 540). Themes is 650 tall and scrolls.
export const POPOVER_HEIGHT = { Themes: 650, Fonts: 521, Colors: 521, Buttons: 521, Forms: 422 };
export function stylePopoverPosition(kind, cardTop, frameRight, windowHeight) {
  return { left: frameRight - 22 - 342, top: Math.max(16, Math.min(cardTop, windowHeight - 38 - POPOVER_HEIGHT[kind])), height: POPOVER_HEIGHT[kind] };
}
