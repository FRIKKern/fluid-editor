// The Forms view's rows (U12, parity/findings/CAP-FORMROWS.json). A pack sets them all; a row changes one,
// kept in styles.forms. Until something is picked the form block keeps what it was measured with (T9).
export const FORM_SHAPES = [['Square', '0px'], ['Rounded Rectangle', '6.4px'], ['Pill', '24.784px']];
export const FORM_PADS = { S: [5, 10], M: [8, 15], L: [10, 20] };
export const FORM_CUSTOM_RADIUS = 5;
export const FORM_DEFAULTS = { shape: 'Pill', radii: [5, 5, 5, 5], multi: false, fill: false, border: true, thick: 1, pad: 'L', t: 10, r: 20, b: 10, l: 20, label: 8, desc: 4, cap: 4, fields: 20, cols: 10 };
const TIGHT = { label: 4, cap: 2 };
// What each pack was read to set. Fill and edge colors come from the pack's own tile.
const PACKS = {
  'form-pack-01': { ...TIGHT, shape: 'Square', border: false, thick: 0, pad: 'custom', t: 5, r: 0, b: 5, l: 0 },
  'form-pack-02': { ...TIGHT, shape: 'Square', fill: 'rgba(255, 255, 255, 0.8)', border: false, pad: 'S' },
  'form-pack-03': { ...TIGHT, shape: 'Custom', radii: [10, 10, 10, 10], fill: 'rgba(255, 255, 255, 0.8)', border: false, pad: 'S' },
  'form-pack-04': { ...TIGHT, shape: 'Square', edge: 'rgba(0, 0, 0, 0.55)', pad: 'S' },
  'form-pack-05': { ...TIGHT, shape: 'Square', fill: 'rgba(255, 255, 255, 0.8)', border: false, thick: 0, pad: 'S' },
  'form-pack-06': { ...TIGHT, shape: 'Pill', fill: 'rgba(255, 255, 255, 0.8)', border: false, pad: 'L' },
};
export const formValues = (styles) => ({ ...FORM_DEFAULTS, ...(styles?.form ? PACKS[styles.form] : null), ...styles?.forms });

export function formRadius(v) {
  if (v.shape === 'Custom') return v.multi ? v.radii.map((r) => `${r}px`).join(' ') : `${v.radii[0]}px`;
  return (FORM_SHAPES.find(([n]) => n === v.shape) || FORM_SHAPES[2])[1];
}
export const formPadding = (v) => (v.pad === 'custom' ? [v.t, v.r, v.b, v.l] : [FORM_PADS[v.pad][0], FORM_PADS[v.pad][1], FORM_PADS[v.pad][0], FORM_PADS[v.pad][1]]);
export const formFill = (v) => (v.fill === true ? 'hsla(var(--white-hsl), 1)' : v.fill || 'transparent');

export function formCss(styles) {
  if (!styles?.form && !styles?.forms) return '';
  const v = formValues(styles), [t, r, b, l] = formPadding(v), field = '.fe-form input[type=text], .fe-form input[type=email], .fe-form textarea, .fe-form select';
  return `${field} { border-radius: ${formRadius(v)}; padding: ${t}px ${r}px ${b}px ${l}px; border: ${v.thick}px solid ${v.border ? v.edge || 'currentColor' : 'transparent'}; background: ${formFill(v)}; }
.fe-form input[type=text], .fe-form input[type=email] { height: auto; }
.fe-form legend, .fe-form label.title { padding-bottom: ${v.label}px; }
.fe-form .description { padding-bottom: ${v.desc}px; }
.fe-form label.caption, .fe-form .caption-row { padding-bottom: ${v.cap}px; }
.fe-form .form-item { margin-bottom: ${v.fields}px; }
.fe-form .name-parts { gap: ${v.cols}px; }
`;
}
