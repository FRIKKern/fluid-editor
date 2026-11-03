// Pulls each Fluid Engine section <style> out of the raw pages in fixtures/raw/
// into fixtures/css/, and writes fixtures/index.json with source and sha256.
// Raw pages hold other people's content and stay out of git; the CSS holds only
// ids and grid numbers. Usage: node scripts/extract-fixtures.mjs [capturedAt]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../fixtures/', import.meta.url);
const capturedAt = process.argv[2] || new Date().toISOString().slice(0, 10);
const prev = (() => { try { return JSON.parse(readFileSync(new URL('index.json', root), 'utf8')); } catch { return []; } })();
const prevBySha = new Map(prev.map((p) => [p.sha256, p]));
mkdirSync(new URL('css/', root), { recursive: true });

const out = [];
for (const f of readdirSync(new URL('raw/', root)).filter((x) => x.endsWith('.html')).sort()) {
  const host = f.replace(/\.html$/, '');
  const html = readFileSync(new URL(`raw/${f}`, root), 'utf8');
  for (const [, css] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (!css.includes('--grid-gutter')) continue;
    const id = css.match(/\.fe-([\w-]+) \{/)[1];
    const sha256 = createHash('sha256').update(css).digest('hex');
    const file = `css/${host}--${id}.css`;
    writeFileSync(new URL(file, root), css);
    out.push({ file, url: `https://${host}/`, sectionId: id, capturedAt: prevBySha.get(sha256)?.capturedAt || capturedAt, sha256 });
  }
}
writeFileSync(new URL('index.json', root), JSON.stringify(out, null, 2) + '\n');
console.log(`fixtures: ${out.length} sections from ${new Set(out.map((o) => o.url)).size} sites`);
