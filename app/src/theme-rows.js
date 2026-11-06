// Edit Color Theme's rows (U12, parity/findings/CAP-THEMEROWS.json): 313 rows, each with a palette role
// and an opacity for each of the ten section themes. A row the user changes is kept in
// styles.themeRows[theme][index] as { role, a } or { rgb, a }. Rows whose block or part we draw reach the
// page; the others hold their color for the blocks we don't have yet.
import { ROW_GROUPS, ROLES, ALPHAS, ROLES_PICKED, ALPHAS_PICKED } from './theme-rows-data.js';

export { ROW_GROUPS };
export const ROW_NAMES = ROW_GROUPS.flatMap(([, rows]) => rows);
export const THEME_KEYS = { 'Lightest 1': 'white', 'Lightest 2': 'white-bold', 'Light 1': 'light', 'Light 2': 'light-bold', 'Bright 1': 'bright-inverse', 'Bright 2': 'bright', 'Dark 1': 'dark', 'Dark 2': 'dark-bold', 'Darkest 1': 'black', 'Darkest 2': 'black-bold' };
const ROLE_VAR = { w: 'white', k: 'black', a: 'accent', l: 'lightAccent', d: 'darkAccent', L: 'safeLightAccent', D: 'safeDarkAccent', A: 'safeInverseAccent', I: 'safeInverseLightAccent' };
export const CIRCLE_ROLES = ['w', 'l', 'a', 'd', 'k'];

// A row's value: what the user set, else the table. Light 1 and the others change after a popover pick.
export function rowValue(styles, picked, theme, i) {
  const own = styles?.themeRows?.[theme]?.[i];
  if (own) return own;
  const roles = picked ? ROLES_PICKED : ROLES, alphas = picked ? ALPHAS_PICKED : ALPHAS;
  return { role: ROLE_VAR[roles[theme]?.[i]] || 'black', a: alphas[theme]?.[i] ?? 1 };
}
// As a color for the page: a role stays tied to the palette.
export const rowCss = (v) => (v.rgb ? `rgba(${v.rgb.join(', ')}, ${v.a ?? 1})` : `hsla(var(--${v.role}-hsl), ${v.a ?? 1})`);
export const roleOfCircle = (c) => ROLE_VAR[c];

// The rows we can draw. Each is the first row of that name: the later ones belong to named blocks.
const at = (name) => ROW_NAMES.indexOf(name);
const VARS = { [at('Section Background')]: '--section-bg', [at('Primary Button Background')]: '--button-bg', [at('Primary Button Text')]: '--button-ink' };
const PARTS = { [at('Heading 1')]: 'h1', [at('Heading 2')]: 'h2', [at('Heading 3')]: 'h3', [at('Heading 4')]: 'h4', [at('Paragraph 1')]: '.sqsrte-large', [at('Paragraph 2')]: 'p:not(.sqsrte-large):not(.sqsrte-small)', [at('Paragraph 3')]: '.sqsrte-small', [at('Text Links')]: 'p a' };
const STROKE = at('Section Divider Stroke'), INSET = at('Inset Border'), TITLE = at('Site Title'), NAV = at('Navigation Links');
export const sections = (key) => (key === 'light' ? ['.page-section:not([data-section-theme])', '.page-section[data-section-theme=""]', '.page-section[data-section-theme="light"]'] : [`.page-section[data-section-theme="${key}"]`]);

export function themeRowsCss(styles) {
  let css = '';
  for (const [theme, rows] of Object.entries(styles?.themeRows || {})) {
    const sel = sections(THEME_KEYS[theme]);
    const on = (part) => sel.map((s) => `${s} ${part}`).join(', ');
    let vars = '';
    for (const [k, v] of Object.entries(rows)) {
      const c = rowCss(v), i = Number(k);
      if (VARS[i]) vars += ` ${VARS[i]}: ${c};`;
      else if (PARTS[i]) css += `${on(PARTS[i])} { color: ${c}; }\n`;
      else if (i === STROKE) css += `${on('.section-divider-stroke path')} { stroke: ${c}; }\n`;
      else if (i === INSET) css += `${sel.map((s) => `${s}.background-width--inset`).join(', ')} { background: ${c}; }\n`;
      // The site header on the demo site uses Light 1 (measured there only).
      else if (i === TITLE && theme === 'Light 1') css += `.header-title { color: ${c}; }\n`;
      else if (i === NAV && theme === 'Light 1') css += `.header-nav-item, .header-action { color: ${c}; }\n`;
    }
    if (vars) css += `${sel.join(', ')} {${vars} }\n`;
  }
  return css;
}
