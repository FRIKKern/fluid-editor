// Pulls each Fluid Engine section <style> out of the raw pages in fixtures/raw/
// into fixtures/css/, and writes fixtures/index.json with source and sha256.
// A section seen on several pages (a shared footer) is kept once.
// Raw pages hold other people's content and stay out of git; the CSS holds only
// ids and grid numbers. Usage: node scripts/extract-fixtures.mjs [capturedAt]
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../fixtures/', import.meta.url);
const fallbackDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const prev = existsSync(new URL('index.json', root)) ? JSON.parse(readFileSync(new URL('index.json', root), 'utf8')) : [];
const prevBySha = new Map(prev.map((p) => [p.sha256, p]));
mkdirSync(new URL('css/', root), { recursive: true });

const out = [];
const seen = new Set();
const rawUrls = new Set();
for (const f of readdirSync(new URL('raw/', root)).filter((x) => x.endsWith('.html')).sort()) {
  const metaUrl = new URL(`raw/${f.replace(/\.html$/, '.json')}`, root);
  const meta = existsSync(metaUrl) ? JSON.parse(readFileSync(metaUrl, 'utf8')) : { url: `https://${f.replace(/\.html$/, '')}/` };
  rawUrls.add(meta.url);
  const host = new URL(meta.url).host;
  const html = readFileSync(new URL(`raw/${f}`, root), 'utf8');
  for (const [, css] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (!css.includes('--grid-gutter')) continue;
    const sha256 = createHash('sha256').update(css).digest('hex');
    if (seen.has(sha256)) continue;
    seen.add(sha256);
    // A section already in the index keeps its entry, so a shared footer stays with the page it was first read on.
    if (prevBySha.has(sha256)) { out.push(prevBySha.get(sha256)); continue; }
    const id = css.match(/\.fe-([\w-]+) \{/)[1];
    let file = `css/${host}--${id}.css`;
    if (out.some((o) => o.file === file) || prev.some((o) => o.file === file)) file = `css/${host}--${id}--${sha256.slice(0, 8)}.css`;
    writeFileSync(new URL(file, root), css);
    out.push({ file, url: meta.url, sectionId: id, capturedAt: meta.capturedAt || fallbackDate, sha256 });
  }
}
// Pages with no raw file here (the oracle's, from oracle-import.mjs, one entry per page) keep theirs. Old entries keep their order.
for (const p of prev) if (!rawUrls.has(p.url) && !out.includes(p)) out.push(p);
const at = new Map(prev.map((p, k) => [p, k]));
out.sort((a, b) => (at.get(a) ?? Infinity) - (at.get(b) ?? Infinity));
writeFileSync(new URL('index.json', root), JSON.stringify(out, null, 2) + '\n');
console.log(`fixtures: ${out.length} sections from ${new Set(out.map((o) => new URL(o.url).host)).size} sites`);
