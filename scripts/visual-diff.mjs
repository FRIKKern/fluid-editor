// Pixel comparison of the inventory screenshots (scripts/inventory.mjs --shots): for each state,
// crop the canvas of the oracle and of ours (both 1583 by 945 at the same scroll), count the
// pixels that differ beyond a colour tolerance, and write an oracle | ours | difference image
// next to the screenshots for the review paper. The images stay out of the repo (O2); the
// counts go to parity/visual.json.
// Usage: node scripts/visual-diff.mjs --shots <dir>   (needs ImageMagick: magick, compare)
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
if (!shots) throw new Error('--shots <dir> is required');
const CROP = '1583x945+0+55'; // the canvas under the 55px top bar, without the scrollbar
const FUZZ = '12%';
const inv = JSON.parse(readFileSync(new URL('../parity/inventory.json', import.meta.url), 'utf8'));
const out = { capturedAt: inv.capturedAt, crop: CROP, fuzz: FUZZ, states: [] };
for (const s of inv.states) {
  const a = `${shots}/${s.name}-oracle.png`, b = `${shots}/${s.name}-ours.png`;
  if (!existsSync(a) || !existsSync(b)) continue;
  const ca = `${shots}/${s.name}-oracle-canvas.png`, cb = `${shots}/${s.name}-ours-canvas.png`, d = `${shots}/${s.name}-diff.png`, t = `${shots}/${s.name}-triptych.png`;
  execFileSync('magick', [a, '-crop', CROP, '+repage', ca]);
  execFileSync('magick', [b, '-crop', CROP, '+repage', cb]);
  // compare prints the count of differing pixels on stderr and exits 1 when they differ.
  const r = spawnSync('compare', ['-fuzz', FUZZ, '-metric', 'AE', '-highlight-color', '#ff0050', '-lowlight-color', '#ffffff10', ca, cb, d], { encoding: 'utf8' });
  const px = Math.round(parseFloat(String(r.stderr).trim().split(/\s/)[0]));
  execFileSync('magick', [ca, cb, d, '-resize', '50%', '+append', t]);
  const share = Math.round((px / (1583 * 945)) * 10000) / 100;
  out.states.push({ name: s.name, differingPixels: px, percent: share });
  console.log(`${s.name.padEnd(20)} ${String(share).padStart(6)}% of the canvas differs`);
}
writeFileSync(new URL('../parity/visual.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
