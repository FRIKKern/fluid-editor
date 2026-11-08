// What a block's Design values give the importer (T15). The oracle writes them as one rule per block in
// <style class="transform-vars"> (parity/findings/DESIGN.json; 111 saved rules in fixtures/design.json).
import { DESIGN_DEFAULTS } from '../../app/src/render.js';

const num = (css, v) => Number(css.match(new RegExp(`--${v}: (-?[\\d.]+)`))?.[1]);
export function parseDesign(css) {
  return { opacity: num(css, 'opacity'), tx: num(css, 'translate-x'), ty: num(css, 'translate-y'), rotate: num(css, 'rotation'), sx: num(css, 'scale-x'), sy: num(css, 'scale-y'),
    kx: num(css, 'skew-x'), ky: num(css, 'skew-y'), ox: num(css, 'origin-x'), oy: num(css, 'origin-y'), ...(/backdrop-filter: blur\(15px\)/.test(css) && { blur: true }) };
}
// A block keeps only the values off their default, as ours does; none gives null. The rule's phone part
// (@media) is left out: the importer says so when it meets one.
export function designOf(css) {
  if (!css) return null;
  const d = parseDesign(css.split('@media')[0]);
  const own = Object.fromEntries(Object.entries(d).filter(([k, v]) => (k === 'blur' ? v : Number.isFinite(v) && v !== DESIGN_DEFAULTS[k])));
  return Object.keys(own).length ? own : null;
}
