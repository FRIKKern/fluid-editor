// Rules for parity/items.json from QUALITY.md: unique ids, known statuses and
// milestones, and every done item names its evidence.
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
  if (!it.title || !it.area) errors.push(`${it.id}: needs a title and an area`);
}
if (!all.length) errors.push('parity/items.json is empty');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`items ok: ${all.length} items, ${ms.size} milestones`);
