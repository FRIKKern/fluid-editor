// A button type's own rows (U12, parity/findings/CAP-BUTTONROWS.json). Each type starts from the pack
// or theme in use and keeps only what was changed, in styles.buttons[type]. A stretched button takes
// its Left and Right; its Top and Bottom show only when it fits its text.
export const TIERS = ['primary', 'secondary', 'tertiary'];
export const TIER_NAMES = { primary: 'Primary', secondary: 'Secondary', tertiary: 'Tertiary' };
export const SHAPES = [['Square', '0px'], ['Rounded Rectangle', '6.4px'], ['Pill', '300px'], ['Oval', '100%'], ['Underline', '0px'], ['Petal', '16px 0px 16px 0px']];
export const PADS = { S: [1, 1.3], M: [1.5, 2.2], L: [2, 3] };
export const CUSTOM_RADIUS = 6.4;
const SIDES = { '24px 35.2px': 'M', '16px 20.8px': 'S', '32px 48px': 'L' };

function packBase(pack) {
  const v = { shape: 'Pill', fill: true, outline: 0, pad: 'custom', t: 1.3, r: 3.5, b: 1.3, l: 3.5, radii: [CUSTOM_RADIUS, CUSTOM_RADIUS, CUSTOM_RADIUS, CUSTOM_RADIUS], multi: false };
  if (!pack) return v;
  const named = SHAPES.find(([n, r]) => r === pack.radius && n !== 'Underline');
  const noFill = !!pack.tile && !pack.tile.bg;
  if (named) v.shape = named[0];
  else if (pack.radius) { v.shape = 'Custom'; v.radii = v.radii.map(() => parseFloat(pack.radius)); }
  if (noFill && !pack.border) v.shape = 'Underline';
  v.fill = !noFill;
  v.outline = pack.border || 0;
  v.pad = SIDES[pack.pad] || 'custom';
  return v;
}
export const tierValues = (styles, pack, tier) => ({ ...packBase(pack), ...styles?.buttons?.[tier] });
const key = (v) => JSON.stringify(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)));
export const sameTier = (a, b) => key(a) === key(b);

export function tierRadius(v) {
  if (v.shape === 'Custom') return v.multi ? v.radii.map((r) => `${r}px`).join(' ') : `${v.radii[0]}px`;
  return (SHAPES.find(([n]) => n === v.shape) || SHAPES[2])[1];
}
// Top, right, bottom and left, in the unit the row shows: S, M and L are rem, its own numbers em.
export function tierPadding(v) {
  if (v.pad === 'custom') return [v.t, v.r, v.b, v.l].map((n) => `${n}em`);
  const [y, x] = PADS[v.pad];
  return [`${y}rem`, `${x}rem`, `${y}rem`, `${x}rem`];
}
const tierColors = (v) => {
  if (v.shape === 'Underline') return { bg: v.fill ? 'var(--button-ink)' : 'transparent', ink: 'var(--button-bg)', edge: 'var(--button-bg)' };
  return v.fill ? { bg: 'var(--button-bg)', ink: 'var(--button-ink)', edge: 'var(--button-ink)' } : { bg: 'transparent', ink: 'var(--button-bg)', edge: 'var(--button-bg)' };
};

// The rules for the types that were changed: after the pack's, and stronger.
export function tierCss(styles, pack) {
  let css = '';
  for (const tier of TIERS) {
    if (!styles?.buttons?.[tier]) continue;
    const v = tierValues(styles, pack, tier), c = tierColors(v), [t, r, b, l] = tierPadding(v), el = `.sqs-button-element--${tier}.sqs-block-button-element`;
    const border = v.shape === 'Underline' ? `border: none; border-bottom: ${v.outline}px solid ${c.edge};` : `border: ${v.outline}px solid ${c.edge};`;
    css += `.page-section ${el} { border-radius: ${tierRadius(v)}; ${border} background: ${c.bg}; color: ${c.ink}; padding: 0 ${r} 0 ${l}; }\n`;
    css += `.page-section .sqs-block-button-container:not(.sqs-stretched) > ${el} { padding: ${t} ${r} ${b} ${l}; }\n`;
  }
  return css;
}

// The panel's sample: 12px type, so 3/4 of the page's sizes, and any outline draws as 2px.
export function tierSample(v, bg = '#000', ink = '#fff') {
  const [, r, , l] = tierPadding(v).map((s) => parseFloat(s) * 12);
  const under = v.shape === 'Underline', filled = v.fill && !under, edge = filled ? ink : bg;
  const round = v.shape === 'Rounded Rectangle' ? '4.8px' : v.shape === 'Custom' ? (v.multi ? v.radii : [v.radii[0]]).map((n) => `${n * 0.75}px`).join(' ') : tierRadius(v);
  const line = v.outline ? `border:${under ? '0' : `2px solid ${edge}`};${under ? `border-bottom:2px solid ${edge};` : ''}` : 'border:0;';
  return `width:auto;height:${v.outline ? 46 : 42}px;padding:0 ${r}px 0 ${l}px;background:${filled ? bg : 'transparent'};color:${filled ? ink : bg};border-radius:${round};${line}`;
}
