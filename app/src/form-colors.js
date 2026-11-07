// The Forms view's Colors rows (U12, parity/findings/CAP-FORMSUBS.json): each of the ten section themes
// has a palette color for each row. A row the user picks is kept in styles.forms.colors[theme][row].
import { THEME_KEYS, sections } from './theme-rows.js';

export const FORM_COLOR_GROUPS = [
  ['Form Fields', ['Field Background', 'Field Border', 'Field Accent', 'Field Accessory', 'Button Background', 'Field Background on Background', 'Field Border on Background', 'Field Accent on Background', 'Field Accessory on Background', 'Button Background on Background']],
  ['Form Background', ['Background', 'Stroke Color']],
  ['Form Text', ['Title', 'Description', 'Caption', 'Input', 'Option', 'Survey Title', 'Button Text', 'Title on Background', 'Description on Background', 'Caption on Background', 'Input on Background', 'Option on Background', 'Survey Title on Background', 'Button Text on Background']],
];
export const FORM_COLOR_ROWS = FORM_COLOR_GROUPS.flatMap(([, rows]) => rows);
// The dots of a row's list, in order.
export const FORM_ROLES = ['white', 'lightAccent', 'accent', 'darkAccent', 'black'];
const ROLE = { w: 'white', l: 'lightAccent', a: 'accent', d: 'darkAccent', b: 'black' };
// One letter per row, in FORM_COLOR_ROWS order.
const LIGHTEST = 'lbabbwbabblbbbbbbbwbbbbbbw', LIGHT = 'wbabblbabbwbbbbbbbwbbbbbbw', BRIGHT = 'wbdbbdalaabdbbbbbbaaaaaaab', DARKEST = 'dwawalbabbwawwwwwwbbbbbbbw';
const TABLE = { 'Lightest 1': LIGHTEST, 'Lightest 2': LIGHTEST, 'Light 1': LIGHT, 'Light 2': LIGHT, 'Bright 1': 'dalaawbdbbadaaaaaabbbbbbba', 'Bright 2': BRIGHT, 'Dark 1': BRIGHT, 'Dark 2': 'bwawalbabbwawwwwwwbbbbbbbw', 'Darkest 1': DARKEST, 'Darkest 2': DARKEST };

export const formColor = (styles, theme, row) => styles?.forms?.colors?.[theme]?.[row] || ROLE[TABLE[theme][FORM_COLOR_ROWS.indexOf(row)]];

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
    const own = styles?.forms?.colors?.[theme] || {};
    const vars = Object.entries(own).map(([row, role]) => `--tweak-form-block-${slug(row)}-color: hsla(var(--${role}-hsl), 1);`).join(' ');
    css += `${on('')} { --ff-bg: var(--${formColor(styles, theme, 'Field Background')}-hsl); --ff-edge: var(--${formColor(styles, theme, 'Field Border')}-hsl); ${vars}${own['Field Accent'] ? ` --form-ring: hsla(var(--${own['Field Accent']}-hsl), 1);` : ''} }\n`;
    for (const [row, role] of Object.entries(own)) if (PARTS[row]) css += `${on(PARTS[row][0])} { ${PARTS[row][1]}: hsla(var(--${role}-hsl), 1); }\n`;
  }
  return css;
}
