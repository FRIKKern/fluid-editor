// The Forms view's Colors rows (U12, parity/findings/CAP-FORMSUBS.json): each of the ten section themes
// has a palette color for each row. A row the user picks is kept in styles.forms.colors[theme][row], as
// { role, a } or { rgb, a } from the row's popover; older pages hold just the role. Custom and opacity here are
// the Edit Color Theme rows' popover. Behaviour here is inferred from the Shape's, because the press writes on the
// oracle (CAP-U12CUSTOM.json, CAP-T6CUSTOM.json). What opacity draws on a page is not read either.
import { THEME_KEYS, sections } from './theme-rows.js';
import { rgbToHsl } from './color-math.js';

export const FORM_COLOR_GROUPS = [
  ['Form Fields', ['Field Background', 'Field Border', 'Field Accent', 'Field Accessory', 'Button Background', 'Field Background on Background', 'Field Border on Background', 'Field Accent on Background', 'Field Accessory on Background', 'Button Background on Background']],
  ['Form Background', ['Background', 'Stroke Color']],
  ['Form Text', ['Title', 'Description', 'Caption', 'Input', 'Option', 'Survey Title', 'Button Text', 'Title on Background', 'Description on Background', 'Caption on Background', 'Input on Background', 'Option on Background', 'Survey Title on Background', 'Button Text on Background']],
];
export const FORM_COLOR_ROWS = FORM_COLOR_GROUPS.flatMap(([, rows]) => rows);
const ROLE = { w: 'white', l: 'lightAccent', a: 'accent', d: 'darkAccent', b: 'black' };
// One letter per row, in FORM_COLOR_ROWS order.
const LIGHTEST = 'lbabbwbabblbbbbbbbwbbbbbbw', LIGHT = 'wbabblbabbwbbbbbbbwbbbbbbw', BRIGHT = 'wbdbbdalaabdbbbbbbaaaaaaab', DARKEST = 'dwawalbabbwawwwwwwbbbbbbbw';
const TABLE = { 'Lightest 1': LIGHTEST, 'Lightest 2': LIGHTEST, 'Light 1': LIGHT, 'Light 2': LIGHT, 'Bright 1': 'dalaawbdbbadaaaaaabbbbbbba', 'Bright 2': BRIGHT, 'Dark 1': BRIGHT, 'Dark 2': 'bwawalbabbwawwwwwwbbbbbbbw', 'Darkest 1': DARKEST, 'Darkest 2': DARKEST };

export function formColor(styles, theme, row) {
  const v = styles?.forms?.colors?.[theme]?.[row];
  return v && typeof v === 'object' ? v : { role: v || ROLE[TABLE[theme][FORM_COLOR_ROWS.indexOf(row)]], a: 1 };
}
// The three numbers a field's hsla() takes, and the whole color. A palette role stays a variable, so a palette change follows it.
const triple = (v) => (v.rgb ? rgbToHsl(v.rgb) : `var(--${v.role}-hsl)`);
const paint = (v) => (v.rgb ? `rgba(${v.rgb.join(', ')}, ${v.a ?? 1})` : `hsla(${triple(v)}, ${v.a ?? 1})`);

const slug = (row) => row.toLowerCase().replace(/ /g, '-').replace(/-color$/, '');
// Rows that reach a block we draw. Field Accent is the focus ring on every field (CAP-U12ACCENT2.json). The others hold their color in a
// variable, as on the oracle's page: Field Accessory drew nothing in any state read (at rest, picked, focused on six kinds of field).
const PARTS = {
  Title: ['legend, label.title', 'color'],
  Description: ['.description', 'color'],
  Input: ['input[type=text], input[type=email], textarea, select', 'color'],
  Option: ['.form-checkbox .option label, .form-signup label', 'color'],
  'Button Background': ['.form-submit', 'background-color'],
  'Button Text': ['.form-submit', 'color'],
  'Stroke Color': ['', 'border-color'],
};

export function formColorCss(styles) {
  let css = '.fe-form { --ff-bg: var(--white-hsl); --ff-edge: var(--black-hsl); }\n';
  for (const theme of Object.keys(TABLE)) {
    const sel = sections(THEME_KEYS[theme]), on = (part) => sel.flatMap((s) => (part || '').split(', ').map((p) => `${s} .fe-form ${p}`.trim())).join(', ');
    const own = Object.keys(styles?.forms?.colors?.[theme] || {}).map((row) => [row, formColor(styles, theme, row)]);
    const bg = formColor(styles, theme, 'Field Background'), edge = formColor(styles, theme, 'Field Border'), ring = own.find(([row]) => row === 'Field Accent');
    const vars = own.map(([row, v]) => `--tweak-form-block-${slug(row)}-color: ${paint(v)};`).join(' ');
    css += `${on('')} { --ff-bg: ${triple(bg)}; --ff-bg-a: ${bg.a ?? 1}; --ff-edge: ${triple(edge)}; --ff-edge-a: ${edge.a ?? 1}; ${vars}${ring ? ` --form-ring: ${paint(ring[1])};` : ''} }\n`;
    for (const [row, v] of own) if (PARTS[row]) css += `${on(PARTS[row][0])} { ${PARTS[row][1]}: ${paint(v)}; }\n`;
  }
  return css;
}
