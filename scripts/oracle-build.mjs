// O1: build the demo sections from scripts/oracle/demo-spec.mjs on the oracle page
// that is open in edit mode. Saves after each section. Resumable: sections that
// already exist are skipped, so run it again after a failure.
// Usage: node scripts/oracle-build.mjs [--from 0] [--to 7]
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { SECTIONS } from './oracle/demo-spec.mjs';
import { sectionCount, addSection, addBlock, pasteHtml, escape, deselect, place, save, blockIds, removeBlock } from './oracle/ui.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? Number(args[args.indexOf(`--${n}`) + 1]) : d);
const from = opt('from', 0);
const to = opt('to', SECTIONS.length - 1);
const LOG = new URL('../parity/oracle-build.json', import.meta.url);
const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : { sections: [] };

for (let i = from; i <= to; i++) {
  const spec = SECTIONS[i];
  if (sectionCount() > i && log.sections[i]?.done) {
    console.log(`section ${i} "${spec.name}": already built`);
    continue;
  }
  if (sectionCount() <= i) await addSection();
  // Resume: clear blocks left by an unfinished run of this section.
  for (const id of blockIds(i)) await removeBlock(i, id);
  const placed = [];
  for (const [k, b] of spec.blocks.entries()) {
    const id = await addBlock(i, b.type);
    if (b.html) {
      const html = await pasteHtml(id, b.html);
      if (typeof html !== 'string' || !html.includes(b.html.replace(/<[^>]+>/g, '').slice(0, 20))) throw new Error(`section ${i} block ${k}: paste failed: ${String(html).slice(0, 120)}`);
      await escape();
    }
    await deselect(i);
    const got = await place(i, id, b.area);
    placed.push({ id, type: b.type, want: b.area, got });
    console.log(`section ${i} block ${k} ${b.type}: want ${b.area.join('/')} got ${got.join('/')}`);
  }
  await deselect(i);
  await save();
  log.sections[i] = { name: spec.name, done: true, blocks: placed, savedAt: new Date().toISOString() };
  writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
  console.log(`section ${i} "${spec.name}": saved`);
}
