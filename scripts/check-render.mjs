// Gate A: read each captured Fluid Engine section CSS into our model, render it
// back with app/src/render.js, and require the same CSS after collapsing
// whitespace. Writes parity/gate-a.json. An empty corpus fails (QUALITY.md).
// Usage: node scripts/check-render.mjs [--verbose]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sectionCss, renderSection } from '../app/src/render.js';
import { demoModel } from '../app/src/demo.js';
import { parseSectionCss } from './lib/parse.mjs';

const verbose = process.argv.includes('--verbose');
const root = new URL('../fixtures/', import.meta.url);
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

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
  const host = new URL(fx.url).host;
  const site = perSite.get(host) || { pass: 0, total: 0 };
  perSite.set(host, site);
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
if (verbose) for (const [host, s] of perSite) lines.push(`  ${host} ${s.pass} of ${s.total}`);
else lines.push(`  from ${perSite.size} sites; --verbose lists them`);
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

// T2 (parity/findings/WRAPPER.json): of the types measured, only a shape carries the alignment wrapper.
const base = demoModel().sections[0], layout = base.blocks[0].layout;
const wrapped = (block) => /class="[^"]*sqs-block-alignment-wrapper/.test(renderSection({ ...base, blocks: [{ id: 'b', layout, ...block }] }, { sections: [] }));
const wrapperOk = wrapped({ type: 'shape' }) && !wrapped({ type: 'button', label: 'x' }) && !wrapped({ type: 'text', html: '<p>x</p>' }) && !wrapped({ type: 'image', alt: '' }) && !wrapped({ type: 'video' });
console.log(`Alignment wrapper on the right types: ${wrapperOk ? 'yes' : 'NO'}`);
if (!wrapperOk) process.exitCode = 1;

if (total === 0) {
  console.error('Gate A: empty corpus fails');
  process.exitCode = 1;
} else if (pass !== total) process.exitCode = 1;
