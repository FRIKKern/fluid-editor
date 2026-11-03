// Checks every traces/*.json against the format in scripts/lib/trace.mjs, and
// that each trace's items exist in parity/items.json. No traces fails (no skip-pass).
import { readdirSync, readFileSync } from 'node:fs';
import { validate } from './lib/trace.mjs';
import { items } from './lib/board.mjs';

const dir = new URL('../traces/', import.meta.url);
const ids = new Set(items().map((i) => i.id));
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const errors = [];
for (const f of files) {
  const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  for (const e of validate(t, f)) errors.push(`traces/${f}: ${e}`);
  for (const i of t.items || []) if (!ids.has(i)) errors.push(`traces/${f}: item ${i} is not in parity/items.json`);
}
if (!files.length) errors.push('traces/: no traces, nothing to check');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`traces ok: ${files.length} traces`);
