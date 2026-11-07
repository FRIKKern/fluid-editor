// H3: what the fixture corpus covers. Reads fixtures/css (in git) and, when present,
// fixtures/raw (local only) for block types. Writes parity/corpus.json.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { parseSectionCss } from './lib/parse.mjs';

const root = new URL('../fixtures/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
const gaps = {};
const rowGaps = {};
let blocks = 0, bleed = 0, overlapSections = 0, sticky = 0, zMax = 0;
const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
for (const fx of index) {
  const s = parseSectionCss(readFileSync(new URL(fx.file, root), 'utf8'));
  gaps[s.gap] = (gaps[s.gap] || 0) + 1;
  const rg = s.rowGap ?? s.gap;
  rowGaps[rg] = (rowGaps[rg] || 0) + 1;
  let ov = false;
  s.blocks.forEach((b, i) => {
    blocks++;
    const d = b.layout.desktop;
    if (d.area[1] === 1 || d.area[3] === 27) bleed++;
    if (d.sticky) sticky++;
    zMax = Math.max(zMax, d.z);
    if (s.blocks.slice(i + 1).some((o) => overlaps(d.area, o.layout.desktop.area))) ov = true;
  });
  if (ov) overlapSections++;
}

const types = {};
const raw = new URL('raw/', root);
if (existsSync(raw)) {
  const seen = new Set();
  for (const f of readdirSync(raw).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(new URL(f, raw), 'utf8');
    // Each block up to the next one. A Map has no data-sqsp-block, only its component's name.
    const parts = html.split(/(?=<div class="fe-block fe-block-)/).slice(1);
    for (const p of parts) {
      const id = p.match(/^<div class="fe-block fe-block-([\w-]+)"/)?.[1];
      const type = p.match(/data-sqsp-block="([\w-]+)"/)?.[1]
        || p.match(/data-definition-name="website\.components\.(\w+)"/)?.[1].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      if (!id || !type || seen.has(id)) continue;
      seen.add(id);
      types[type] = (types[type] || 0) + 1;
    }
  }
}

const report = {
  sections: index.length,
  sites: new Set(index.map((f) => new URL(f.url).host)).size,
  blocks,
  columnGaps: gaps,
  rowGaps,
  bleedBlocks: bleed,
  sectionsWithOverlap: overlapSections,
  stickyBlocks: sticky,
  highestZ: zMax,
  blockTypes: Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1])),
};
const out = new URL('../parity/corpus.json', import.meta.url);
const prevTypes = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).blockTypes : {};
if (!Object.keys(types).length) report.blockTypes = prevTypes; // CI has no raw pages: keep the last local count
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
