// Block design round trip (T15): read each captured block design rule (fixtures/design.json)
// into our model as the importer does (designOf: only values off their default), render it back
// with designCss, and require the same CSS after collapsing white space. An empty corpus fails. Writes parity/design-check.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { designCss } from '../app/src/render.js';
import { designOf } from './lib/design-read.mjs';

const F = JSON.parse(readFileSync(new URL('../fixtures/design.json', import.meta.url), 'utf8'));
if (!F.rules.length) throw new Error('fixtures/design.json is empty');
const collapse = (s) => s.replace(/\s+/g, ' ').trim();
let pass = 0, own = 0;
const fails = [];
for (const r of F.rules) {
  const design = designOf(r.css);
  if (design) own++;
  const ours = designCss({ id: r.id, ...(design && { design }) });
  if (collapse(ours) === collapse(r.css)) pass++;
  else fails.push({ page: r.page, id: r.id, want: collapse(r.css).slice(0, 200), got: collapse(ours).slice(0, 200) });
}
writeFileSync(new URL('../parity/design-check.json', import.meta.url), JSON.stringify({ check: 'block design round trip', pass, total: F.rules.length, withValues: own, fails: fails.slice(0, 10) }, null, 2) + '\n');
console.log(`Block design round trip: ${pass} of ${F.rules.length} rules match, ${own} with values off their default`);
for (const f of fails.slice(0, 3)) console.log(`  ${f.page} ${f.id}\n    want ${f.want}\n    got  ${f.got}`);
if (pass !== F.rules.length) process.exit(1);
