// One gap review, start to finish: the inventory on the oracle and ours (with screenshots),
// the pixel comparison, docs/MISSING.md, and the Barkpark paper with the screenshot pairs.
// Screenshots go to a folder outside the repo (O2). Needs ORACLE_SURFACE and FLUID_SURFACE
// (npm run surfaces), the oracle visible and in edit mode, the dev server on 5178, and bp.
// Usage: node scripts/review.mjs [--no-publish] [--only state,state]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const shots = `${tmpdir()}/fluid-editor-review-${new Date().toISOString().slice(0, 10)}`;
mkdirSync(shots, { recursive: true });
const node = (script, extra = []) => execFileSync(process.execPath, [new URL(script, import.meta.url).pathname, ...extra], { stdio: 'inherit' });
const only = args.includes('--only') ? ['--only', args[args.indexOf('--only') + 1]] : [];
node('./inventory.mjs', ['--shots', shots, ...only]);
node('./visual-diff.mjs', ['--shots', shots]);
node('./generate-missing.mjs');
if (!args.includes('--no-publish')) node('./publish-review.mjs', ['--shots', shots]);
console.log(`screenshots: ${shots}`);
