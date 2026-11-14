// Cases for scripts/ci-count.mjs, which turns each browser-checks job red or green. Each case runs it in a throwaway git
// repo under the OS temp folder whose HEAD stores parity/x6-check.json at 647 of 647 (and coverage-check.json with no total),
// then writes the run's result after the "started" file, as a check in the job would.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./ci-count.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'check-ci-count-'));
// No GIT_* key (a hook names the real repo there) and no job summary file: GitHub Actions sets one for this test too.
const clean = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'GITHUB_STEP_SUMMARY'));
const git = (...args) => { const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, env: clean(), encoding: 'utf8' }); if (r.status) throw new Error(`git ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
const started = join(dir, 'started');
const put = (name, v) => writeFileSync(join(dir, 'parity', `${name}.json`), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n');
// The started file is dated 10 s back, so a result written now counts as this run's; `stale` dates it ahead instead.
const run = (name, code, result, { stale = false } = {}) => {
  git('checkout', '-q', '--', 'parity');
  if (result !== undefined) put(name, result);
  writeFileSync(started, '');
  const t = Date.now() / 1000 + (stale ? 10 : -10);
  utimesSync(started, t, t);
  const r = spawnSync('node', [script, name, String(code ?? ''), started], { cwd: dir, env: clean(), encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};

let pass = 0, total = 0;
const add = (what, ok, detail) => { total++; if (ok) pass++; console.log(`${what.padEnd(72)} ${ok ? 'ok' : `FAIL ${detail}`}`); };
const x6 = (p, t) => ({ check: 'x6', pass: p, total: t });
try {
  mkdirSync(join(dir, 'parity'));
  git('init', '-q', '-b', 'main');
  put('x6-check', x6(647, 647));
  put('coverage-check', { check: 'coverage', matched: 541 });
  git('add', '-A'); git('commit', '-qm', 'main stores x6 647 of 647');

  let r = run('x6-check', 0, x6(600, 600));
  add('exit 0 with 600 rows, main stores 647: red', r.code === 1, r.out);
  add('  and it names both totals', /600 total, main stores 647/.test(r.out) && /47 rows were dropped/.test(r.out), r.out);
  r = run('x6-check', 0, x6(646, 646));
  add('exit 0 with one row fewer: red', r.code === 1, r.out);
  r = run('x6-check', 0, { check: 'x6', pass: 647 });
  add('exit 0 with a result that has no total: red', r.code === 1, r.out);
  r = run('x6-check', 0, x6(0, 0));
  add('exit 0 with 0 rows: red', r.code === 1, r.out);
  r = run('x6-check', 0, x6(647, 647));
  add('exit 0 with the stored 647: green', r.code === 0, r.out);
  r = run('x6-check', 0, x6(650, 650));
  add('exit 0 with more rows (650): green', r.code === 0, r.out);
  r = run('x6-check', 0, undefined, { stale: true });
  add('exit 0, no result written this run (a plain text-check): green', r.code === 0, r.out);
  r = run('x6-check', 0, x6(600, 600), { stale: true });
  add('exit 0, a smaller file older than the run is not this run\'s: green', r.code === 0, r.out);
  r = run('coverage-check', 0, { check: 'coverage', matched: 500 });
  add('exit 0 where main stores no total (coverage-check): green', r.code === 0, r.out);
  r = run('new-check', 0, x6(5, 5));
  add('exit 0 for a check main stores nothing for: green', r.code === 0, r.out);
  r = run('x6-check', 1, x6(647, 647));
  add('exit 1 with the stored result: green with a warning', r.code === 0 && /::warning::/.test(r.out), r.out);
  r = run('x6-check', 1, x6(640, 647));
  add('exit 1 with a different result: red', r.code === 1, r.out);
  r = run('x6-check', 1, x6(600, 600));
  add('exit 1 with fewer rows: red, and says fewer', r.code === 1 && /fewer rows/.test(r.out), r.out);
  r = run('x6-check', 1, undefined, { stale: true });
  add('exit 1 with no result: red', r.code === 1, r.out);
  r = run('x6-check', null, x6(647, 647));
  add('no exit code: red', r.code === 1, r.out);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`ci-count cases: ${pass} of ${total}`);
process.exit(pass === total ? 0 : 1);
