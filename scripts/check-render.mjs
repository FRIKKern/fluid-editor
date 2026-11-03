// Gate A: read each captured Fluid Engine section CSS into our model, render it
// back with app/src/render.js, and require the same CSS after collapsing
// whitespace. Writes parity/gate-a.json. An empty corpus fails (QUALITY.md).
// Usage: node scripts/check-render.mjs [--verbose]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sectionCss } from '../app/src/render.js';

const verbose = process.argv.includes('--verbose');
const root = new URL('../fixtures/', import.meta.url);
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

export function parseSectionCss(css) {
  const head = css.match(/\.fe-([\w-]+) \{\s*--grid-gutter: calc\(var\(--sqs-mobile-site-gutter, 6vw\) - ([\d.]+)px\)/);
  if (!head) return null;
  const mobileRows = css.match(/grid-template-rows: repeat\((\d+),minmax\(24px, auto\)\)/);
  const desktopRows = css.match(/grid-template-rows: repeat\((\d+),minmax\(calc\(var\(--container-width\)/);
  const section = {
    id: head[1],
    gap: parseFloat(head[2]),
    rows: { mobile: mobileRows ? +mobileRows[1] : null, desktop: desktopRows ? +desktopRows[1] : null },
    blocks: [],
  };
  const byId = new Map();
  for (const m of css.matchAll(/\.fe-block-([\w-]+) \{\s*grid-area: ([\d/-]+);\s*z-index: (-?\d+);/g)) {
    const id = m[1];
    if (!byId.has(id)) {
      byId.set(id, { id, layout: {} });
      section.blocks.push(byId.get(id));
    }
    const b = byId.get(id);
    b.layout[b.layout.mobile ? 'desktop' : 'mobile'] = { area: m[2].split('/').map(Number), z: +m[3] };
  }
  for (const b of section.blocks) {
    const j = [...css.matchAll(new RegExp(`\\.fe-block-${b.id} \\.sqs-block \\{\\s*justify-content: ([\\w-]+);`, 'g'))];
    const a = [...css.matchAll(new RegExp(`\\.fe-block-${b.id} \\.sqs-block-alignment-wrapper \\{\\s*align-items: ([\\w-]+);`, 'g'))];
    ['mobile', 'desktop'].forEach((bp, i) => {
      if (!b.layout[bp]) return;
      b.layout[bp].justify = j[i]?.[1];
      b.layout[bp].align = a[i]?.[1];
    });
  }
  return section;
}

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return { want: a.slice(Math.max(0, i - 60), i + 80), got: b.slice(Math.max(0, i - 60), i + 80) };
}

const index = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
const failures = [];
const perSite = new Map();
let pass = 0;
for (const fx of index) {
  const css = readFileSync(new URL(fx.file, root), 'utf8');
  const site = perSite.get(fx.url) || { pass: 0, total: 0 };
  perSite.set(fx.url, site);
  site.total++;
  if (createHash('sha256').update(css).digest('hex') !== fx.sha256) {
    failures.push({ file: fx.file, reason: 'sha256 does not match fixtures/index.json' });
    continue;
  }
  const model = parseSectionCss(css);
  if (!model) {
    failures.push({ file: fx.file, reason: 'parse failed' });
    continue;
  }
  const want = collapse(css);
  const got = collapse(sectionCss(model));
  if (want === got) {
    pass++;
    site.pass++;
  } else failures.push({ file: fx.file, reason: 'css differs', ...firstDiff(want, got) });
}

const total = index.length;
const lines = [`Gate A, CSS round trip: ${pass} of ${total} sections match`];
for (const [url, s] of perSite) lines.push(`  ${url} ${s.pass} of ${s.total}`);
for (const x of failures.slice(0, verbose ? failures.length : 5)) {
  lines.push(`- ${x.file}: ${x.reason}`);
  if (x.want) lines.push(`  want: ...${x.want}...`, `  got:  ...${x.got}...`);
}
console.log(lines.join('\n'));

const report = { gate: 'A', pass, total, sites: perSite.size, oldestCapture: index.map((f) => f.capturedAt).sort()[0] || null, failures: failures.map(({ file, reason }) => ({ file, reason })) };
const out = new URL('../parity/gate-a.json', import.meta.url);
const prev = (() => { try { return readFileSync(out, 'utf8'); } catch { return ''; } })();
const next = JSON.stringify(report, null, 2) + '\n';
if (prev !== next) writeFileSync(out, next);

if (total === 0) {
  console.error('Gate A: empty corpus fails');
  process.exitCode = 1;
} else if (pass !== total) process.exitCode = 1;
