// Fonts > Assign Styles (U12, parity/findings/CAP-U12ASSIGN.json): 35 groups, 122 rows, each opening a Style and a Size. All read, with no pick, as Site Styles is read only.
// Inferred: the 8 Form Block rows share a store with Forms > Fonts (they read the same values). A row set to Style Custom shows what Header Button shows, the only one read at Custom.
// A guess: Site Title's Size reaches the page, with Form Block's rows. Every other row stores its value only: ours has no such block, or no rule read for it.
import { ASSIGN_GROUPS } from './assign-names.js';
import { formFont, formFontRem, formFontStyle, fontSizeVar } from './form-rows.js';
import { styleSizeHtml } from './form-panels.js';

const ROWS = ASSIGN_GROUPS.flatMap(([group, rows]) => rows.map(([name, style, size, rem]) => ({ group, name, style, size, rem })));
const isForm = (i) => ROWS[i].group === 'Form Block';
const HEADER_BUTTON = { style: 'Normal', weight: 500, lh: 1.2, ls: 0.02, tt: 'None' };

export const assignName = (i) => ROWS[i].name;
export function assignValue(styles, i) {
  const r = ROWS[i], own = styles?.fontAssign?.[i] || {};
  if (isForm(i)) return { style: formFontStyle(styles, r.name), size: formFont(styles, r.name), rem: formFontRem(styles, r.name) };
  return { style: own.style ?? r.style, size: own.size ?? r.size, rem: own.rem ?? r.rem ?? 1 };
}
const keysOf = (i) => (isForm(i)
  ? { style: `forms.fontStyle.${ROWS[i].name}`, size: `forms.fonts.${ROWS[i].name}`, rem: `forms.fontRem.${ROWS[i].name}` }
  : { style: `fontAssign.${i}.style`, size: `fontAssign.${i}.size`, rem: `fontAssign.${i}.rem` });

export function assignStylesHtml(styles, { svg, CHEV }) {
  let i = 0;
  const groups = ASSIGN_GROUPS.map(([head, rows]) => `<h3 class="ss-as-h">${head}</h3>${rows.map(([name]) => { const n = i++; return `<button type="button" class="ss-as-row" data-ss-view="AssignRow" data-ss-assign="${n}" aria-label="${name}"><span class="ss-as-n">${name}</span><span class="ss-as-v">${assignValue(styles, n).style}</span>${svg(CHEV)}</button>`; }).join('')}`).join('');
  return `<p class="ss-as-lead">Each element on your page uses a global style. You can re-assign styles to each element below. These changes will apply across your site.</p>${groups}`;
}

export function assignRowHtml(styles, opts, parts, fontRow) {
  const i = opts.assignRow, v = assignValue(styles, i), keys = keysOf(i), open = opts.select === 'form-fsize';
  const { svg, slide, select, CHEV_DOWN } = parts;
  if (v.style !== 'Custom') return styleSizeHtml({ ...v, keys }, open, parts);
  // Style Custom: the row has its own font, kept with the type rows.
  const k = `assign${i}`, t = (n) => styles?.type?.[k]?.[n] ?? HEADER_BUTTON[n];
  const own = `<div class="ss-as-font">Font</div>${fontRow(styles, k, svg(CHEV_DOWN), opts)}${select(`type.${k}.style`, 'Style', t('style'), ['Normal', 'Italic'])}${select(`type.${k}.weight`, 'Weight', String(t('weight')), ['100', '200', '300', '400', '500', '600', '700', '800', '900'])}${slide(`type.${k}.lh`, 'Line Height', t('lh'), 0.5, 10, 0.1, 'em')}${slide(`type.${k}.ls`, 'Letter Spacing', t('ls'), -0.1, 2, 0.01, 'em')}${select(`type.${k}.tt`, 'Text Transform', t('tt'), ['None', 'Uppercase', 'Lowercase', 'Capitalize'])}`;
  const html = styleSizeHtml({ ...v, keys }, open, parts), at = html.indexOf('<div class="ss-ff-g1">Size</div>');
  return `${html.slice(0, at)}${own}${html.slice(at)}`;
}

// The guess named above. A Size is a value in the title's own size formula.
export function assignCss(styles) {
  if (!styles?.fontAssign?.[0]) return '';
  const { size, rem } = assignValue(styles, 0);
  return `.header-title { --site-title-font-size-value: ${size === 'Custom' ? rem : fontSizeVar(size)}; }\n`;
}
