// Coverage of an oracle label by parity/items.json, shared by scripts/inventory.mjs and
// scripts/generate-missing.mjs. An item lists the oracle labels it covers in `controls`
// (exact, case-insensitive): those are "tracked". A label whose whole phrase only appears in an
// item's text is "mentioned" (probably tracked, worth a look). Anything else is UNTRACKED: a gap
// nobody wrote down. A label named in an item's outOfScope list is "out of scope".
import { readFileSync } from 'node:fs';

const items = JSON.parse(readFileSync(new URL('../../parity/items.json', import.meta.url), 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function trackedBy(label) {
  const l = label.toLowerCase();
  const phrase = new RegExp(`(^|[^a-z0-9])${esc(l)}([^a-z0-9]|$)`);
  const listed = items.filter((it) => (it.controls || []).some((c) => c.toLowerCase() === l));
  const out = items.filter((it) => (it.outOfScope || []).some((o) => phrase.test(o.toLowerCase())));
  const said = l.length >= 4 ? items.filter((it) => phrase.test(`${it.title} ${it.evidence || ''}`.toLowerCase())) : [];
  return { listed: listed.map((i) => i.id), outOfScope: out.map((i) => i.id), mentioned: said.map((i) => i.id) };
}

// The status of a gap; "side panel only" is decided by the run and kept.
export function coverage(gap) {
  const t = trackedBy(gap.label);
  if (gap.status === 'side panel only') return { ...gap, items: t.listed.length ? t.listed : t.mentioned.slice(0, 6), outOfScope: t.outOfScope };
  const status = t.outOfScope.length ? 'out of scope' : t.listed.length ? 'tracked' : t.mentioned.length ? 'mentioned' : 'UNTRACKED';
  return { ...gap, status, items: t.listed.length ? t.listed : t.mentioned.slice(0, 6), outOfScope: t.outOfScope };
}
