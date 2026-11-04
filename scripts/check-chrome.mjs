// U9: which section buttons each view draws. With a block selected only Layers stays, as on the
// oracle; a part that stays behind has no place and lands in the corner of the editor.
import { sectionChromeHtml } from '../app/src/section-chrome.js';

const acts = (opts) => [...sectionChromeHtml({ first: false, last: false, ...opts }).matchAll(/data-sc="([\w-]+)"/g)].map((m) => m[1]).join(' ');
const card = 'edit layouts duplicate save up down remove';
const want = [
  ['block selected', { blockSelected: true }, 'layers'],
  ['hover', {}, `layers add-block ${card} add-section-above add-section-below`],
  ['phone', { phone: true }, `layers ${card.replace('layouts ', '')} add-section-above add-section-below`],
];
const errors = want.filter(([, opts, w]) => acts(opts) !== w).map(([name, opts, w]) => `${name}: want ${w}, got ${acts(opts)}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`section chrome ok: ${want.length} views`);
