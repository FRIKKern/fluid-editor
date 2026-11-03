// Rules for parity/items.json from QUALITY.md: unique ids, known statuses and
// milestones, and every done item names its evidence.
import { readdirSync } from 'node:fs';
import { items, milestones } from './lib/board.mjs';

const all = items();
const ms = new Set(milestones().map((m) => m.id));
const errors = [];
const seen = new Set();
for (const it of all) {
  if (seen.has(it.id)) errors.push(`${it.id}: duplicate id`);
  seen.add(it.id);
  if (!['done', 'partial', 'open', 'unknown'].includes(it.status)) errors.push(`${it.id}: unknown status ${it.status}`);
  if (!ms.has(it.milestone)) errors.push(`${it.id}: milestone ${it.milestone} is not in docs/ROADMAP.md`);
  if (it.status === 'done' && !it.evidence) errors.push(`${it.id}: done without evidence`);
  // docs/decisions/0005: each out-of-scope part names the decision that removed it.
  for (const o of it.outOfScope || []) {
    const n = String(o).match(/^(\d{4}):/)?.[1];
    if (!n || !readdirSync(new URL('../docs/decisions/', import.meta.url)).some((f) => f.startsWith(n))) errors.push(`${it.id}: out-of-scope part without a decision: ${o}`);
  }
  if (!it.title || !it.area) errors.push(`${it.id}: needs a title and an area`);
}
if (!all.length) errors.push('parity/items.json is empty');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`items ok: ${all.length} items, ${ms.size} milestones`);
