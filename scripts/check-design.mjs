// Block design round trip (T15): read each captured block design rule (fixtures/design.json)
// into our model, render it back with designCss, and require the same CSS after collapsing
// white space. An empty corpus fails. Writes parity/design-check.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { designCss } from '../app/src/render.js';

const F = JSON.parse(readFileSync(new URL('../fixtures/design.json', import.meta.url), 'utf8'));
if (!F.rules.length) throw new Error('fixtures/design.json is empty');
const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const num = (css, v) => Number(css.match(new RegExp(`--${v}: (-?[\\d.]+)`))?.[1]);
export function parseDesign(css) {
  return { opacity: num(css, 'opacity'), tx: num(css, 'translate-x'), ty: num(css, 'translate-y'), rotate: num(css, 'rotation'), sx: num(css, 'scale-x'), sy: num(css, 'scale-y'),
    kx: num(css, 'skew-x'), ky: num(css, 'skew-y'), ox: num(css, 'origin-x'), oy: num(css, 'origin-y'), ...(/backdrop-filter: blur\(15px\)/.test(css) && { blur: true }) };
}
let pass = 0;
const fails = [];
for (const r of F.rules) {
  const ours = designCss({ id: r.id, design: parseDesign(r.css) });
  if (collapse(ours) === collapse(r.css)) pass++;
  else fails.push({ page: r.page, id: r.id, want: collapse(r.css).slice(0, 200), got: collapse(ours).slice(0, 200) });
}
writeFileSync(new URL('../parity/design-check.json', import.meta.url), JSON.stringify({ check: 'block design round trip', pass, total: F.rules.length, fails: fails.slice(0, 10) }, null, 2) + '\n');
console.log(`Block design round trip: ${pass} of ${F.rules.length} rules match`);
for (const f of fails.slice(0, 3)) console.log(`  ${f.page} ${f.id}\n    want ${f.want}\n    got  ${f.got}`);
if (pass !== F.rules.length) process.exit(1);
