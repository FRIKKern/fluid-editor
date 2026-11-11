// U9: which section buttons each view draws. With a block selected only Layers stays, as on the
// oracle; a part that stays behind has no place and lands in the corner of the editor.
import { readFileSync } from 'node:fs';
import { sectionChromeHtml } from '../app/src/section-chrome.js';
import { addBlockMenuHtml, layersPanelHtml } from '../app/src/menus.js';

const acts = (opts) => [...sectionChromeHtml({ first: false, last: false, ...opts }).matchAll(/data-sc="([\w-]+)"/g)].map((m) => m[1]).join(' ');
const card = 'edit layouts duplicate save up down remove';
const want = [
  ['block selected', { blockSelected: true }, 'layers'],
  ['hover', {}, `layers add-block ${card} add-section-above add-section-below`],
  ['phone', { phone: true }, `layers ${card.replace('layouts ', '')} add-section-above add-section-below`],
];
const errors = want.filter(([, opts, w]) => acts(opts) !== w).map(([name, opts, w]) => `${name}: want ${w}, got ${acts(opts)}`);
// A Layers row's icon is its type's Add Block tile icon, at 22 px (the tile's is 16): every type read with both in view
// (CAP-U9ICONS.json, two runs). Our icons are our own (O2); this holds that the two places draw the same one.
const U9 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-U9ICONS.json', import.meta.url))).reads;
const sigs = (reads, x, w) => Object.fromEntries(reads.svgSigs.filter((e) => e.box[0] === x && e.box[2] === w && e.words).map((e) => [e.words, e.sig]));
// Both runs: a type counts where the two runs and the row and the tile all agree.
const both = (f) => { const a = f('1'), b = f('2'); return Object.fromEntries(Object.entries(a).filter(([t, v]) => b[t] === v)); };
const tile = both((r) => ({ ...sigs(U9[`T${r} tiles`], 49, 16), ...sigs(U9[`T${r} tiles`], 201, 16) })), row = both((r) => ({ ...sigs(U9[`A${r} layers`], 50, 22), ...sigs(U9[`B${r} layers`], 50, 22) }));
const shared = Object.keys(row).filter((t) => tile[t] === row[t]);
const inner = (html) => (html.match(/<svg[^>]*>(.*?)<\/svg>/) || [])[1];
const menu = addBlockMenuHtml(shared.map((t) => [t]));
for (const t of shared) {
  const ours = inner(layersPanelHtml([{ id: 'x', type: t, label: t }]).split('lp-icon')[1]), theirs = inner(menu.split(`data-add="${t}"`)[1]);
  if (!ours || ours !== theirs) errors.push(`Layers row ${t}: its icon is not its Add Block tile's`);
}
if (shared.length < 12) errors.push(`CAP-U9ICONS: ${shared.length} types with the row's icon its tile's, 12 read`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`section chrome ok: ${want.length} views, ${shared.length} Layers icons as their tiles`);
