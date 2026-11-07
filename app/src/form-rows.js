// The Forms view's rows (U12, parity/findings/CAP-FORMROWS.json, CAP-FORMSUBS.json). A pack sets them all; a row
// changes one, kept in styles.forms. With nothing picked the form block's own CSS draws these same defaults (FORMADD.json).
import { formColorCss } from './form-colors.js';

export const FORM_SHAPES = [['Square', '0px'], ['Rounded Rectangle', '6.4px'], ['Pill', '24.784px']];
export const FORM_PADS = { S: [5, 10], M: [8, 15], L: [10, 20] };
export const FORM_CUSTOM_RADIUS = 5;
export const FORM_DEFAULTS = { shape: 'Pill', radii: [5, 5, 5, 5], multi: false, fill: false, border: true, thick: 1, pad: 'L', t: 10, r: 20, b: 10, l: 20, label: 8, desc: 4, cap: 4, fields: 20, cols: 10, hover: 'Accent', submit: 'Ellipsis' };
const TIGHT = { label: 4, cap: 2 };
// What each pack was read to set. Its fill and edge are Field Background and Field Border, faded by Opacity.
const PACK = { ...TIGHT, hover: 'Opacity', submit: 'Bar' };
const PACKS = {
  'form-pack-01': { ...PACK, shape: 'Square', border: false, thick: 0, pad: 'custom', t: 5, r: 0, b: 5, l: 0, check: { type: 'Button', color: 'Inverted', shape: 'Square', layout: 'Fit' } },
  'form-pack-02': { ...PACK, shape: 'Square', fill: true, border: false, pad: 'S', check: { color: 'Inverted' } },
  'form-pack-03': { ...PACK, shape: 'Custom', radii: [10, 10, 10, 10], fill: true, border: false, pad: 'S', check: { color: 'Inverted' } },
  'form-pack-04': { ...PACK, shape: 'Square', pad: 'S', check: { shape: 'Square' } },
  'form-pack-05': { ...PACK, shape: 'Square', fill: true, border: false, thick: 0, pad: 'S', check: { color: 'Inverted', shape: 'Square' } },
  'form-pack-06': { ...PACK, shape: 'Pill', fill: true, border: false, pad: 'L', check: { type: 'Button', color: 'Inverted', layout: 'Fit', fill: true } },
};
export const formValues = (styles) => ({ ...FORM_DEFAULTS, ...(styles?.form ? PACKS[styles.form] : null), ...styles?.forms });

export function formRadius(v) {
  if (v.shape === 'Custom') return v.multi ? v.radii.map((r) => `${r}px`).join(' ') : `${v.radii[0]}px`;
  return (FORM_SHAPES.find(([n]) => n === v.shape) || FORM_SHAPES[2])[1];
}
export const formPadding = (v) => (v.pad === 'custom' ? [v.t, v.r, v.b, v.l] : [FORM_PADS[v.pad][0], FORM_PADS[v.pad][1], FORM_PADS[v.pad][0], FORM_PADS[v.pad][1]]);

// Effects: the tiles and how much each one fades the field at rest.
export const FORM_HOVERS = ['Outline', 'Accent', 'Opacity', 'Scale'];
export const FORM_SUBMITS = ['Label', 'Spinner', 'Ellipsis', 'Bar', 'Circle'];
const FADE = { Outline: [1, 1], Accent: [1, 1], Opacity: [0.8, 0.55], Scale: [0.8, 0.55] };
const CURVE = 'cubic-bezier(.33, 1, .68, 1)';
function hoverCss(v, field) {
  const on = field.split(', ').map((s) => `${s}:hover`).join(', '), edge = `hsla(var(--ff-edge), ${FADE[v.hover][1]})`;
  if (v.hover === 'Scale') return `${field} { transition: transform .15s ${CURVE}; }\n${on} { box-shadow: none; transform: scale(1.025); }\n`;
  if (v.hover === 'Outline') return `${field} { transition: background-color .15s ${CURVE}; }\n${on} { box-shadow: none;${v.fill ? '' : ' background: hsla(var(--ff-bg), .4);'} }\n`;
  // Off while focused: focus has its own ring (site.css).
  return `${field} { transition: box-shadow .075s ${CURVE}; }\n${on.split(', ').map((x) => `${x}:not(:focus)`).join(', ')} { box-shadow: ${v.border ? `inset 0 0 0 1px ${edge}` : 'none'}; }\n`;
}

// Selection Options: one set of rows for each kind of choice.
export const FORM_KINDS = { check: 'Checkbox', radio: 'Radio', survey: 'Survey' };
const VAR_KIND = { check: 'checkbox', radio: 'radio', survey: 'survey' };
const OPTION = { type: 'Icon', shape: 'Pill', radii: [5, 5, 5, 5], multi: false, fill: false, thick: 1, size: 'M', custom: 20, gap: 11, color: 'Normal', layout: 'Stack', rows: 8, cols: 20, pad: 'L', t: 15, r: 30, b: 15, l: 30 };
export const OPTION_SHAPES = ['Square', 'Rounded Rectangle', 'Pill'];
export const OPTION_RADIUS = 5;
const OPTION_SIZE = { S: 15, M: 20, L: 25 };
const OPTION_PAD = { S: [1, 10], M: [5, 15], L: [15, 30] };
// A pack was read on Checkbox only. That it reaches Radio too is a guess, kept from when the two shared a class (CAP-U12OPTIONS.json). Survey never took it.
export const formOption = (styles, kind) => ({ ...OPTION, ...(kind !== 'survey' && styles?.form ? PACKS[styles.form].check : null), ...styles?.forms?.[kind] });
const optionRadius = (o) => (o.shape === 'Custom' ? (o.multi ? o.radii.map((r) => `${r}px`).join(' ') : `${o.radii[0]}px`) : { Square: '0', 'Rounded Rectangle': '25%', Pill: '300px' }[o.shape]);
function optionCss(styles) {
  let vars = '';
  for (const kind of Object.keys(FORM_KINDS)) {
    const o = formOption(styles, kind), n = `--form-field-${VAR_KIND[kind]}`, size = o.size === 'custom' ? o.custom : OPTION_SIZE[o.size];
    const [pt, pr, pb, pl] = o.pad === 'custom' ? [o.t, o.r, o.b, o.l] : [OPTION_PAD[o.pad][0], OPTION_PAD[o.pad][1], OPTION_PAD[o.pad][0], OPTION_PAD[o.pad][1]];
    vars += ` ${n}-style: ${o.type.toLowerCase()}; ${n}-color: ${o.color.toLowerCase()}; ${n}-layout: ${o.layout.toLowerCase()}; ${n}-border-thickness: ${o.thick}px; ${n}-size: ${size}px; ${n}-space-between-icon-and-text: ${o.gap}px; ${n}-row-gap: ${o.rows}px; ${n}-column-gap: ${o.cols}px; ${n}-padding-top: ${pt}px; ${n}-padding-right: ${pr}px; ${n}-padding-bottom: ${pb}px; ${n}-padding-left: ${pl}px;`;
  }
  return `body {${vars} }
${markCss(formOption(styles, 'check'), '.fe-form .form-checkbox input, .fe-form .form-signup input', '.fe-form .form-checkbox label, .fe-form .form-signup label')}${markCss(formOption(styles, 'radio'), '.fe-form .form-radio input', '.fe-form .form-radio label', true)}${markCss(formOption(styles, 'survey'), '.fe-form .likert-options input', null, true)}${buttonCss(formOption(styles, 'check'), '.fe-form .form-checkbox:not(.form-radio)')}${buttonCss(formOption(styles, 'radio'), '.fe-form .form-radio')}${layoutCss(formOption(styles, 'check'), '.fe-form .form-checkbox:not(.form-radio)')}${layoutCss(formOption(styles, 'radio'), '.fe-form .form-radio')}`;
}
// What a kind's rows draw on a page (CAP-U12OPTIONS.json). A mark's edge is the
// thickness, set one in by a border one wider. A dot is half of what's left inside that border. Inverted fills a picked mark with the ink.
const sizeOf = (o) => (o.size === 'custom' ? o.custom : OPTION_SIZE[o.size]);
function markCss(o, input, label, dot = false) {
  const size = sizeOf(o), rule = input.split(', ');
  const on = (x) => rule.map((r) => `${r}${x}`).join(', ');
  const d = (size - 2 * (o.thick + 1)) / 2;
  let css = `${input} { width: ${size}px; height: ${size}px; border-width: ${o.thick + 1}px; outline-width: ${o.thick}px; outline-offset: -${o.thick}px; border-radius: ${optionRadius(o)}; background: hsla(var(--ff-bg), ${o.fill ? 1 : 0}); }\n`;
  if (label) css += `${label} { gap: ${o.gap}px; }\n`;
  if (dot) {
    css += `${on('::before')} { width: ${d + 4}px; height: ${d + 4}px; background: radial-gradient(circle at center, currentColor ${d / 2 - 0.4}px, transparent ${d / 2 + 0.4}px); }\n`;
    // The row grows with a mark over 20 and shrinks by half as much under it (CAP-U12OPTIONS.json, sizes S and L).
    if (label && size !== 20) css += `.fe-form .form-radio .option { min-height: ${25.7 + (size > 20 ? size - 20 : (size - 20) / 2)}px; }\n`;
  }
  if (o.color === 'Inverted') css += `${on(':checked')} { background: currentColor; }\n${on(':checked::before')} { color: hsl(var(--ff-bg)); }\n`;
  return css;
}
// Field Style Button: the input is out of sight, the words are the box. Picked, it fills with the edge color and the words take the fill's.
// That color is read black on white on Light 1 only; that it's Field Border and Field Background is inferred.
// Selection Color's row is gone on a Button, so whether Inverted still draws there was not read (CAP-U12OPTIONS.json).
function buttonCss(o, group) {
  if (o.type !== 'Button') return '';
  const [pt, pr, pb, pl] = o.pad === 'custom' ? [o.t, o.r, o.b, o.l] : [OPTION_PAD[o.pad][0], OPTION_PAD[o.pad][1], OPTION_PAD[o.pad][0], OPTION_PAD[o.pad][1]];
  const radius = o.shape === 'Pill' ? `calc(${pt}px + .924em)` : optionRadius(o);
  return `${group} label { position: relative; gap: 0; padding-right: 4px; }
${group} input { position: absolute; opacity: 0; pointer-events: none; }
${group} label > span { box-sizing: content-box; padding: ${pt}px ${pr}px ${pb}px ${pl}px; border: ${o.thick}px solid currentColor; border-radius: ${radius}; background: hsla(var(--ff-bg), ${o.fill ? 1 : 0}); }
${group} input:checked + span { background: hsl(var(--ff-edge)); border-color: hsl(var(--ff-edge)); color: hsl(var(--ff-bg)); }
${group} input:focus + span { outline: 2px solid var(--form-ring); outline-offset: -2px; }
${group} .option { min-height: 0; }
`;
}
// Layout Fit: as wide as the words, on one row while they fit, the row's top where the first option's was (CAP-U12OPTIONS.json).
// Space Between Columns read at its default 20 only. Space Between Rows has no wrapped read: rows + 10 is taken from the stack's 18 at the default 8.
function layoutCss(o, group) {
  if (o.layout !== 'Fit') return '';
  return `${group} { display: flex; flex-wrap: wrap; column-gap: ${o.cols}px; row-gap: ${o.rows + 10}px; padding-top: 6px; }
${group} .description { flex: 0 0 100%; margin-bottom: 4px; }
${group} .option, ${group} legend + .option, ${group} .description + .option { flex: none; margin-top: 0; }
`;
}

// Fonts: which global style each part of the form takes.
export const FORM_FONT_ROWS = ['Title', 'Description', 'Caption', 'Input', 'Placeholder', 'Select Dropdown', 'Option', 'Survey Title'];
export const FORM_FONT_SIZES = [['Paragraph', ['Paragraph 1', 'Paragraph 2', 'Paragraph 3']], ['Heading', ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4']], ['Miscellaneous', ['Miscellaneous']], ['Custom', ['Custom']]];
const FONT_SMALL = new Set(['Description', 'Caption', 'Option']);
export const formFont = (styles, row) => styles?.forms?.fonts?.[row] || (FONT_SMALL.has(row) ? 'Paragraph 3' : 'Paragraph 2');
export const formFontRem = (styles, row) => styles?.forms?.fontRem?.[row] ?? 1;
const FONT_VALUE = { 'Paragraph 1': 'large-text', 'Paragraph 2': 'normal-text', 'Paragraph 3': 'small-text', 'Heading 1': 'heading-1', 'Heading 2': 'heading-2', 'Heading 3': 'heading-3', 'Heading 4': 'heading-4', Miscellaneous: 'normal-text' };
const fontSize = (name, rem) => {
  if (name === 'Custom') return `${rem}rem`;
  const n = name === 'Miscellaneous' ? 'var(--meta-size-value, var(--normal-text-size-value))' : `var(--${FONT_VALUE[name]}-size-value)`;
  return `min(calc((${n} - 1) * 1.2vw + 1rem), max(calc((${n} - 1) * 0.012 * var(--maxPageWidth) + 1rem), calc(${n} * 1rem)))`;
};
const FONT_PART = { Title: 'legend, label.title', Description: '.description', Caption: '.caption-row', Input: 'input[type=text], input[type=email], textarea', Placeholder: 'input::placeholder, textarea::placeholder', 'Select Dropdown': 'select', Option: '.form-checkbox .option, .form-signup' };
// A form font's Style row: a list that stores (the list is read, CAP-STYLEROWS.json). What a pick draws is a guess, not read since Site Styles is read only: Heading and
// Miscellaneous take that style's own rows, Paragraph is what a form has already, and Custom draws nothing.
export const FORM_FONT_STYLES = ['Paragraph', 'Heading', 'Miscellaneous', 'Custom'];
export const formFontStyle = (styles, row) => styles?.forms?.fontStyle?.[row] || formFont(styles, row).split(' ')[0];
function fontStyleCss(styles, headFamily) {
  let css = '';
  for (const [row, name] of Object.entries(styles?.forms?.fontStyle || {})) {
    const part = FONT_PART[row], t = name === 'Heading' ? styles?.type?.h : name === 'Miscellaneous' ? styles?.type?.misc : null;
    if (!part || (name !== 'Heading' && !t)) continue;
    const rule = [name === 'Heading' && headFamily ? `font-family: ${headFamily}, sans-serif;` : '', t?.weight ? `font-weight: ${t.weight};` : '', t?.style ? `font-style: ${t.style.toLowerCase()};` : '', t?.ls != null ? `letter-spacing: ${t.ls}${name === 'Heading' ? 'rem' : 'em'};` : '', t?.tt ? `text-transform: ${t.tt.toLowerCase()};` : ''].join(' ').trim();
    if (rule) css += `${part.split(', ').map((p) => `.fe-form ${p}`).join(', ')} { ${rule} }\n`;
  }
  return css;
}
function fontCss(styles, v) {
  let css = '';
  for (const [row, name] of Object.entries(styles?.forms?.fonts || {})) {
    const part = FONT_PART[row];
    if (!part) continue;
    const size = fontSize(name, formFontRem(styles, row));
    css += `${part.split(', ').map((p) => `.fe-form ${p}`).join(', ')} { font-size: ${size}; line-height: 1.4; }\n`;
    // A pill follows the text: 10 plus two thirds of a line, read at Paragraph 1 and 2.
    if (row === 'Input' && v.shape === 'Pill') css += '.fe-form input[type=text], .fe-form input[type=email], .fe-form textarea { border-radius: calc(10px + .924em); }\n';
  }
  return css;
}

export function formCss(styles, headFamily) {
  if (!styles?.form && !styles?.forms) return '';
  const v = formValues(styles), [t, r, b, l] = formPadding(v), field = '.fe-form input[type=text], .fe-form input[type=email], .fe-form textarea, .fe-form select';
  const [fill, edge] = FADE[v.hover];
  return `${formColorCss(styles)}${field} { border-radius: ${formRadius(v)}; padding: ${t}px ${r}px ${b}px ${l}px; border: ${v.thick}px solid ${v.border ? `hsla(var(--ff-edge), ${edge})` : 'transparent'}; background: hsla(var(--ff-bg), ${v.fill ? fill : 0}); }
.fe-form input[type=text], .fe-form input[type=email] { height: auto; }
.fe-form legend, .fe-form label.title { padding-bottom: ${v.label}px; }
.fe-form .description { padding-bottom: ${v.desc}px; }
.fe-form label.caption, .fe-form .caption-row { padding-bottom: ${v.cap}px; }
.fe-form .form-item { margin-bottom: ${v.fields}px; }
.fe-form .name-parts { gap: ${v.cols}px; }
body { --form-submit-button-style: ${v.submit.toLowerCase()}; --form-field-hover-focus: ${v.hover.toLowerCase()}; }
${hoverCss(v, field)}${optionCss(styles)}${fontCss(styles, v)}${fontStyleCss(styles, headFamily)}`;
}
