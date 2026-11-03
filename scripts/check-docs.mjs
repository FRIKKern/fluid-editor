// Doc rules from QUALITY.md: README stays at or under 80 lines, every relative
// link in a tracked Markdown file points at a file that exists, and the
// generated pictures and PARITY.md match parity/items.json.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const errors = [];

const readmeLines = fs.readFileSync(path.join(root, 'README.md'), 'utf8').trimEnd().split('\n').length;
if (readmeLines > 80) errors.push(`README.md: ${readmeLines} lines, cap is 80`);

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    if (!fs.existsSync(path.join(root, path.dirname(file), target.split('#')[0]))) errors.push(`${file}: broken link ${target}`);
  }
}

const before = ['docs/images/parity.svg', 'docs/PARITY.md'].map((f) => (fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : ''));
execFileSync('node', ['scripts/generate-parity.mjs'], { cwd: root, stdio: 'ignore' });
['docs/images/parity.svg', 'docs/PARITY.md'].forEach((f, i) => {
  if (fs.readFileSync(path.join(root, f), 'utf8') !== before[i]) errors.push(`${f}: was out of date with parity/items.json (now regenerated, commit it)`);
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`docs ok: ${files.length} files, README ${readmeLines} lines`);
