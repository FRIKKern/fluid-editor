// Copy every block design rule (<style class="transform-vars">) from the captured pages in
// fixtures/raw into fixtures/design.json, for the block design round trip (check-design).
// Usage: node scripts/extract-design.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const raw = new URL('../fixtures/raw/', import.meta.url);
const rules = [];
for (const f of readdirSync(raw).filter((n) => n.endsWith('.html')).sort()) {
  const html = readFileSync(new URL(f, raw), 'utf8');
  for (const m of html.matchAll(/<style class="transform-vars">([\s\S]*?)<\/style>/g)) {
    const id = m[1].match(/\.fe-block-([0-9a-z_]+)/)?.[1];
    if (id) rules.push({ page: f.replace(/\.html$/, ''), id, css: m[1] });
  }
}
writeFileSync(new URL('../fixtures/design.json', import.meta.url), JSON.stringify({ capturedFrom: 'fixtures/raw (pages listed in fixtures/index.json)', count: rules.length, rules }, null, 2) + '\n');
console.log(`wrote fixtures/design.json: ${rules.length} block design rules`);
