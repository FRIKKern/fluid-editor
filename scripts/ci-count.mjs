// For .github/workflows/browser-checks.yml: after one check ran, compare the result file it wrote with the one main
// stores, write a row to the job summary, and say whether the job is red.
// Usage: node scripts/ci-count.mjs <name>-check <check's exit code> <file touched just before the check started>
// Red: the check failed and its result differs from main's stored one, or it wrote none. A check that fails with a result
// identical to the stored one fails on the Mac too (named misses kept in the stored file): that job stays green with a warning,
// so the job turns red when a merge changes what a check finds, not because main already stored misses.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, statSync } from 'node:fs';

const [name, codeArg, started] = process.argv.slice(2);
const code = Number(codeArg);
const file = `parity/${name}.json`;
const count = (j) => (j && Number.isFinite(j.pass) ? `${j.pass} of ${j.total}` : 'no count');
let ci = null, stored = null;
// Only a file this run wrote counts: the checkout already holds the stored one.
try { if (statSync(file).mtimeMs > statSync(started).mtimeMs) ci = JSON.parse(readFileSync(file, 'utf8')); } catch {}
try { stored = JSON.parse(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch {}
const same = ci && stored && JSON.stringify(ci) === JSON.stringify(stored);
const red = code !== 0 && !same;
const note = code === 0 ? 'passed' : same ? 'failed, with the same result as stored (red on the Mac too)' : ci ? 'failed, result differs from stored' : 'failed, wrote no result file';
const row = `| ${name} | exit ${code} | ${ci ? count(ci) : '-'} | ${count(stored)} | ${note} |`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| check | exit | CI | stored | |\n|---|---|---|---|---|\n${row}\n`);
console.log(row);
if (code !== 0 && same) console.log(`::warning::${name} exits ${code} with the result main stores: no change from main`);
process.exit(red ? 1 : 0);
