// U5: Add Block's search against every query read on the oracle (CAP-U5WORDS.json, CAP-U5PHRASES.json, CAP-U5RULE.json):
// the tiles it shows, in menu order, or No Results.
import { readFileSync } from 'node:fs';
import { addBlockMenuHtml } from '../app/src/menus.js';
import { SEARCH_WORDS } from '../app/src/search-words.js';

const types = Object.keys(SEARCH_WORDS).map((n) => [n]);
const shown = (q) => { const h = addBlockMenuHtml(types, q); return h.includes('am-none') ? ['No Results'] : [...h.matchAll(/data-add="([^"]+)"/g)].map((m) => m[1]); };
const errors = [];
let total = 0;
for (const f of ['CAP-U5WORDS', 'CAP-U5PHRASES', 'CAP-U5RULE']) {
  const reads = JSON.parse(readFileSync(new URL(`../parity/findings/${f}.json`, import.meta.url))).reads.words;
  for (const [q, want] of Object.entries(reads)) {
    total++;
    const got = shown(q);
    if (got.join() !== want.join()) errors.push(`${f} "${q}": oracle ${want.join(', ')}; ours ${got.join(', ')}`);
  }
}
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); console.error(`search: ${errors.length} of ${total} queries differ`); process.exit(1); }
console.log(`search ok: ${total} queries`);
