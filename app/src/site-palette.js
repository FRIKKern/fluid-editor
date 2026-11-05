// Edit Palette and the color popover of Edit Color Theme's rows (U12, parity/findings/CAP-THEMEROWS.json).
import { hslToRgb, rgbToHex, rgbToHsv, hexOf, rgbToHslParts } from './color-math.js';
import { PRESETS } from './theme-rows-data.js';
import { CIRCLE_ROLES, roleOfCircle } from './theme-rows.js';

const svg = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHEV_DOWN = '<path d="M6 9l6 6 6-6"/>';
export const SWATCHES = [['Light', 'white'], ['Light accent', 'lightAccent'], ['Accent', 'accent'], ['Dark accent', 'darkAccent'], ['Dark', 'black']];
// Lighter and darker colors a From Color row makes: the accent's hue turned, fixed saturation and lightness.
export const FROM_COLOR = [['Monochrome', 0], ['Complementary', 180], ['Analogous I', 45], ['Analogous II', -45]];
const turned = (accent, d) => { const h = (parseFloat(accent) + d + 360) % 360; return { lightAccent: `${h},40%,94%`, darkAccent: `${h},40%,15%` }; };
export const fromColor = (accent, i) => turned(accent, FROM_COLOR[i][1]);
export const FORMATS = { Hex: ['Hex'], RGB: ['Red', 'Green', 'Blue'], HSL: ['Hue', 'Saturation', 'Lightness'] };

const strip = (colors) => `<span class="ss-strip">${colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span>`;
function mapHtml(rgb, hue) {
  const [, s, v] = rgbToHsv(rgb);
  return `<div class="ss-map" data-cmap style="background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hue},100%,50%))"><span class="ss-handle" role="slider" aria-label="Color Map" style="left:${s * 100}%;top:${(1 - v) * 100}%;background:${rgbToHex(rgb)}"></span></div>`;
}
// A track's handle stops 11px short of each end.
const onTrack = (f) => `left:calc(11px + ${f} * (100% - 22px))`;
const hueHtml = (hue) => `<div class="ss-hue" data-chue><span class="ss-handle" role="slider" aria-label="Hue slider" style="${onTrack(hue / 360)};background:hsl(${hue},100%,50%)"></span></div>`;
function values(rgb, format) {
  if (format === 'RGB') return rgb;
  if (format === 'HSL') return rgbToHslParts(rgb).map(Math.round);
  return [rgbToHex(rgb)];
}
function formatRow(rgb, format, open, extra = '') {
  const inputs = FORMATS[format].map((n, i) => `<label class="ss-hex-in"><input type="text" data-cformat="${format}" aria-label="${n}" value="${values(rgb, format)[i]}"></label>`).join('');
  return `<div class="ss-hex is-${format}"><button type="button" class="ss-format" role="combobox" aria-label="Color format" aria-expanded="${!!open}" data-cformat-open><span>${format}</span>${svg(CHEV_DOWN)}</button>${inputs}${extra}${open ? `<div class="ss-format-list" role="listbox">${Object.keys(FORMATS).map((f) => `<button type="button" role="option" aria-selected="${f === format}" data-cformat-pick="${f}">${f}</button>`).join('')}</div>` : ''}</div>`;
}

export function paletteHtml(v, pal, five) {
  const now = v[pal.swatch], rgb = hslToRgb(now), hue = parseFloat(now);
  const tabs = ['Presets', 'From Image', 'From Color'].map((t) => `<button type="button" class="ss-tab${pal.tab === t ? ' is-on' : ''}" data-pal-tab="${t}" aria-label="${t}">${t}</button>`).join('');
  let body = '';
  if (pal.tab === 'Presets') body = PRESETS.map((p, i) => `<button type="button" class="ss-pal-row" data-pal-preset="${i}" aria-label="Palette with accent ${p[2]}">${strip(p)}</button>`).join('');
  else if (pal.tab === 'From Color') body = FROM_COLOR.map(([name], i) => { const t = fromColor(v.accent, i); return `<div class="ss-from-l">${name}</div><button type="button" class="ss-pal-row" data-pal-from="${i}" aria-label="${name}">${strip([v.white, t.lightAccent, v.accent, t.darkAccent, v.black].map((c) => `hsl(${c})`))}</button>`; }).join('');
  else body = '<div class="ss-drop" data-unbuilt><svg class="ss-drop-i" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="16" cy="16" r="15"/><path d="M16 24V9M10 15l6-6 6 6"/></svg><span class="ss-drop-t">Drop an image here, or click to browse.</span></div>';
  return `<div class="ss-swatches">${SWATCHES.map(([n, k]) => `<button type="button" class="ss-swatch${pal.swatch === k ? ' is-on' : ''}" role="checkbox" aria-checked="${pal.swatch === k}" data-pal-swatch="${k}" aria-label="${n} ${hexOf(v[k])}" style="background:${five[k]}"></button>`).join('')}</div>
    ${mapHtml(rgb, hue)}${hueHtml(hue)}${formatRow(rgb, pal.format, pal.list)}<div class="ss-tabs">${tabs}</div>${body}`;
}

// The small popover: the five palette circles, Custom color and the opacity track. Custom color adds the map, hue,
// a sixth circle and the number boxes.
export function dotPopHtml(value, dot, v) {
  const rgb = value.rgb || hslToRgb(v[value.role]), a = value.a ?? 1, hue = rgbToHslParts(rgb)[0];
  const circle = (c) => { const role = roleOfCircle(c), hex = hexOf(v[role]), on = !value.rgb && value.role === role; return `<label class="ss-circle${on ? ' is-on' : ''}"><input type="checkbox" data-dot-role="${role}" aria-label="Color ${hex}"${on ? ' checked' : ''}><span style="background:${hex}"></span></label>`; };
  const circles = CIRCLE_ROLES.map(circle).join('');
  const opacity = `<div class="ss-alpha" data-calpha style="--c:${rgb.join(',')}"><span class="ss-handle" role="slider" aria-label="Opacity slider" aria-valuenow="${a}" style="${onTrack(a)};background:rgba(${rgb.join(',')},${a})"></span></div>`;
  if (!dot.custom) return `<div class="ss-circles">${circles}<button type="button" class="ss-plus" data-dot-custom aria-label="Custom color">${svg('<path d="M12 5v14M5 12h14"/>')}</button></div>${opacity}`;
  const sixth = `<label class="ss-circle${value.rgb ? ' is-on' : ''}"><input type="checkbox" aria-label="Color rgb(${rgb.join(', ')})"${value.rgb ? ' checked' : ''} data-dot-custom><span style="background:${rgbToHex(rgb)}"></span></label>`;
  const alphaBox = `<label class="ss-hex-in ss-hex-a"><input type="text" data-calpha-in aria-label="Alpha" value="${Math.round(a * 100)}%"></label>`;
  return `${mapHtml(rgb, hue)}<div class="ss-circles ss-circles-6">${circles}${sixth}</div>${hueHtml(hue)}${opacity}${formatRow(rgb, dot.format, dot.list, alphaBox)}`;
}
// Measured: both popovers center on their row.
export const DOT_POP_HEIGHT = { small: 117, custom: 430 };
export function dotPopTop(rowCenter, custom, windowHeight) {
  const h = custom ? DOT_POP_HEIGHT.custom : DOT_POP_HEIGHT.small;
  return Math.max(8, Math.min(rowCenter - h / 2, windowHeight - h - 8));
}
