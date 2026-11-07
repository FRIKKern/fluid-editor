// The Forms view's four sub panels (U12, parity/findings/CAP-FORMSUBS.json): Effects, Selection Options,
// Fonts and Colors. Faded and not built (data-unbuilt): a color's Custom and opacity.
import { FORM_HOVERS, FORM_SUBMITS, FORM_KINDS, OPTION_SHAPES, FORM_FONT_ROWS, FORM_FONT_SIZES, FORM_FONT_STYLES, formOption, formValues, formFont, formFontRem, formFontStyle } from './form-rows.js';
import { FORM_COLOR_GROUPS, FORM_ROLES, formColor } from './form-colors.js';
import { hexOf } from './color-math.js';

export function formEffectsHtml(styles) {
  const v = formValues(styles);
  const tile = (key, n, now, body) => `<button type="button" class="ss-fx${n === now ? ' is-on' : ''}" aria-label="${n}" aria-pressed="${n === now}" data-ss-set="forms.${key}" data-v="${n}">${body}<span class="ss-fx-n">${n}</span></button>`;
  const hover = (n) => tile('hover', n, v.hover, '<span class="ss-fx-l">Label</span><i class="ss-fx-in"></i>');
  const MARK = { Label: 'Submitting', Spinner: '<i class="ss-fx-spin"></i>', Ellipsis: '<i class="ss-fx-dots"></i>', Bar: '<i class="ss-fx-bar"></i>', Circle: '<i class="ss-fx-dot"></i>' };
  const submit = (n) => tile('submit', n, v.submit, `<span class="ss-fx-box">${MARK[n]}</span>`);
  return `<div class="ss-fx-h">Hover &amp; Focus</div><div class="ss-fx-grid ss-fx-hover">${FORM_HOVERS.map(hover).join('')}</div>
    <div class="ss-fx-h ss-fx-h2">Submit Button Validation</div><div class="ss-fx-grid ss-fx-submit">${FORM_SUBMITS.map(submit).join('')}</div>`;
}

export const formOptionsHtml = ({ svg, CHEV }) => Object.entries(FORM_KINDS).map(([k, n]) => `<button type="button" class="ss-dis ss-fo-kind" data-ss-view="FormOption" data-ss-fkind="${k}" aria-label="${n}"><span class="ss-dis-l">${n}</span>${svg(CHEV)}</button>`).join('');

export function formOptionHtml(styles, opts, { svg, slide, CHEV_DOWN }) {
  const kind = opts.formKind, o = formOption(styles, kind), set = (k) => `forms.${kind}.${k}`, ico = '<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>';
  const seg = (key, now, names) => `<div class="ss-seg ss-fo-seg" role="radiogroup">${names.map((n) => `<button type="button" role="radio" aria-checked="${n === now}" class="${n === now ? 'is-on' : ''}" data-ss-set="${set(key)}" data-v="${n}">${n}</button>`).join('')}</div>`;
  const shapeOpen = opts.select === 'form-oshape', colorOpen = opts.select === 'form-ocolor';
  const tiles = OPTION_SHAPES.map((n) => `<button type="button" class="ss-shape is-line${o.shape === n ? ' is-on' : ''}" aria-label="${n}" aria-pressed="${o.shape === n}" data-ss-oshape="${n}"><i class="ss-sh-${n.split(' ')[0].toLowerCase()}"></i></button>`).join('');
  const corners = o.shape !== 'Custom' ? '' : `<div class="ss-corners"><div class="ss-seg ss-seg-c" role="radiogroup"><button type="button" role="radio" aria-label="Use single border radius" aria-checked="${!o.multi}" class="${o.multi ? '' : 'is-on'}" data-ss-oradii="single">${svg('<rect x="5" y="5" width="14" height="14" rx="3"/>', 18)}</button><button type="button" role="radio" aria-label="Use multiple border radii" aria-checked="${o.multi}" class="${o.multi ? 'is-on' : ''}" data-ss-oradii="multi">${svg(ico, 18)}</button></div>${(o.multi ? ['Top left', 'Top right', 'Bottom right', 'Bottom left'] : ['Single']).map((c, i) => `<input type="number" class="ss-radius${o.multi ? ' is-four' : ''}" aria-label="${c} border radius value" data-ss-oradius="${i}" min="0" value="${o.radii[i]}">`).join('')}</div>`;
  const shapePop = !shapeOpen ? '' : `<div class="ss-shape-pop ss-form-pop"><div class="ss-shapes">${tiles}</div><button type="button" class="ss-custom${o.shape === 'Custom' ? ' is-on' : ''}" data-ss-oshape="Custom">${svg(ico, 18)}<span>Custom Corners</span></button>${corners}</div>`;
  const shape = `<div class="ss-sel-row ss-form-shape"><span>Field Shape</span><button type="button" class="ss-sel" data-ss-select="form-oshape" aria-label="Field Shape" aria-expanded="${shapeOpen}"><span>${o.shape}</span>${svg(CHEV_DOWN)}</button>${shapePop}</div>`;
  const fill = `<div class="ss-fline"><span>Field Fill</span><button type="button" role="switch" class="ss-toggle${o.fill ? ' is-on' : ''}" aria-label="Field Fill" aria-checked="${o.fill}" data-ss-ofill><i></i></button></div>`;
  const thick = `<div class="ss-fline ss-fline-thick"><span>Border Thickness</span><input type="text" class="ss-thick-in" aria-label="Border Thickness" data-ss-othickin value="${o.thick}px"><button type="button" class="ss-fstep" aria-label="decrement" data-ss-othick="-1">${svg('<path d="M5 12h14"/>', 18)}</button><button type="button" class="ss-fstep" aria-label="increment" data-ss-othick="1">${svg('<path d="M12 5v14M5 12h14"/>', 18)}</button></div>`;
  const pads = (key, now, label) => `<div class="ss-fline ss-form-pads"><span>${label}</span><span class="ss-pad-set" role="radiogroup">${[['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['custom', 'Custom']].map(([n, l]) => `<button type="button" role="radio" aria-label="${l}" aria-checked="${now === n}" class="ss-pad${now === n ? ' is-on' : ''}" data-ss-set="${set(key)}" data-v="${n}">${n === 'custom' ? '<b>...</b>' : n}</button>`).join('')}</span></div>`;
  const custom = `<div class="ss-fo-inline"><input type="range" data-ss-set="${set('custom')}" data-unit="px" aria-label="Field Size" min="10" max="40" step="1" value="${o.custom}" style="--p:${(100 * (o.custom - 10)) / 30}%"><input type="text" data-ss-set="${set('custom')}" aria-label="Field Size value" value="${o.custom}px"></div>`;
  const size = `${pads('size', o.size, 'Field Size')}${o.size === 'custom' ? custom : ''}`;
  const colorList = !colorOpen ? '' : `<div class="ss-options ss-fo-options" role="listbox">${['Normal', 'Inverted'].map((n) => `<button type="button" role="option" class="ss-option${n === o.color ? ' is-on' : ''}" aria-selected="${n === o.color}" data-ss-set="${set('color')}" data-v="${n}">${n}</button>`).join('')}</div>`;
  const color = `<div class="ss-sel-row"><span>Selection Color</span><button type="button" class="ss-sel" data-ss-select="form-ocolor" aria-label="Selection Color" aria-expanded="${colorOpen}"><span>${o.color}</span>${svg(CHEV_DOWN)}</button>${colorList}</div>`;
  if (kind === 'survey') return `<div class="ss-fo">${shape}${fill}${thick}${size}${color}</div>`;
  const button = o.type === 'Button';
  const sides = button && o.pad === 'custom' ? [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([k, l]) => slide(set(k), l, o[k], 1, 40, 1, 'px')).join('') : '';
  const rows = button ? `${pads('pad', o.pad, 'Padding')}${sides}` : `${size}${slide(set('gap'), 'Space Between Icon and Text', o.gap, 1, 40, 1, 'px')}${color}`;
  return `<div class="ss-fo"><div class="ss-fo-l">Field Style</div>${seg('type', o.type, ['Icon', 'Button'])}${shape}${fill}${thick}${rows}
    <div class="ss-fo-l ss-fo-l2">Layout</div>${seg('layout', o.layout, ['Stack', 'Fit'])}${slide(set('rows'), 'Space Between Rows', o.rows, 1, 40, 1, 'px')}${o.layout === 'Fit' ? slide(set('cols'), 'Space Between Columns', o.cols, 1, 40, 1, 'px') : ''}</div>`;
}

export function formFontsHtml(styles, { svg, CHEV }) {
  return `<p class="ss-ff-lead">Each element in your form uses a global style. You can re-assign styles to each element below. These changes will apply across all form blocks on your site.</p>
    ${FORM_FONT_ROWS.map((n) => `<button type="button" class="ss-dis" data-ss-view="FormFont" data-ss-ffont="${n}" aria-label="${n}"><span class="ss-dis-l">${n}</span><span class="ss-dis-v">${formFont(styles, n).split(' ')[0]}</span>${svg(CHEV)}</button>`).join('')}`;
}

export function formFontHtml(styles, opts, { svg, slide, select, CHEV_DOWN, CHECK }) {
  const row = opts.formFont, now = formFont(styles, row), open = opts.select === 'form-fsize';
  const list = !open ? '' : `<div class="ss-ff-list" role="listbox">${FORM_FONT_SIZES.map(([g, names]) => `<div class="ss-ff-g">${g}</div>${names.map((n) => `<button type="button" role="option" class="ss-ff-o" aria-selected="${n === now}" data-ss-set="forms.fonts.${row}" data-v="${n}"><span>${n}</span>${n === now ? svg(CHECK) : ''}</button>`).join('')}`).join('')}</div>`;
  const rem = now === 'Custom' ? slide(`forms.fontRem.${row}`, 'Size', formFontRem(styles, row), 0.1, 10, 0.1, 'rem') : '';
  return `<div class="ss-ff-g1">Style</div>${select(`forms.fontStyle.${row}`, 'Style', formFontStyle(styles, row), FORM_FONT_STYLES)}
    <div class="ss-ff-g1">Size</div><div class="ss-sel-row"><span>Size</span><button type="button" class="ss-sel" data-ss-select="form-fsize" aria-label="Size" aria-expanded="${open}"><span>${now}</span>${svg(CHEV_DOWN)}</button></div>${rem}${list}`;
}

export function formColorsHtml(styles, opts, vars, names, { svg, CHEV_DOWN }) {
  const theme = opts.formTheme, rows = opts.themeRows, now = rows.find((t) => t.name === theme) || { bg: '#fff', ink: '#000' }, listOpen = opts.select === 'form-theme';
  const value = Object.fromEntries(names.map((k, i) => [k, vars[i]]));
  const tr = (t) => `<button type="button" class="ss-tr${t.name === theme ? ' is-now' : ''}" data-ss-ftheme="${t.name}" style="background:${t.bg};color:${t.ink}"><span class="ss-tr-aa">Aa</span><span class="ss-tr-n">${t.name}</span></button>`;
  const list = listOpen ? `<div class="ss-tr-list ss-fc-list">${rows.filter((t) => t.used).map(tr).join('')}${rows.filter((t) => !t.used).map(tr).join('')}</div>` : '';
  const row = (name) => {
    const open = opts.select === `form-color-${name}`, role = formColor(styles, theme, name);
    const pop = !open ? '' : `<div class="ss-fc-pop">${FORM_ROLES.map((r) => { const hex = hexOf(value[r]); return `<button type="button" class="ss-fc-dot${r === role ? ' is-on' : ''}" aria-label="Color ${hex}" aria-pressed="${r === role}" data-ss-fcolor="${r}" data-theme="${theme}" data-row="${name}" style="background:hsl(${value[r]})"></button>`; }).join('')}<span class="ss-fc-custom" data-unbuilt aria-label="Custom color"></span><span class="ss-fc-alpha" data-unbuilt></span></div>`;
    return `<div class="ss-fc-row"><button type="button" class="ss-dis ss-theme-row" data-ss-select="form-color-${name}" aria-label="${name}" aria-expanded="${open}"><span class="ss-dis-l">${name}</span><i class="ss-dot" style="background:hsl(${value[role]})"></i></button>${pop}</div>`;
  };
  return `<button type="button" class="ss-tr ss-tr-now ss-fc-theme" data-ss-select="form-theme" aria-expanded="${listOpen}" style="background:${now.bg};color:${now.ink}"><span class="ss-tr-aa">Aa</span><span class="ss-tr-n">${theme}</span>${svg(CHEV_DOWN)}</button>${list}
    ${FORM_COLOR_GROUPS.map(([g, names2]) => `<h3 class="ss-group ss-theme-h">${g}</h3>${names2.map(row).join('')}`).join('')}`;
}
