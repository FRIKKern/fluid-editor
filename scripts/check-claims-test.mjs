// Cases for scripts/check-claims.mjs, each in a throwaway git repo under the OS temp folder: main stores near-check 72 of 72,
// then a branch stores 73, then 75. A squash merge drops the branch's 73, so a claim of 73 must fail on the branch.
// Inside a git hook GIT_DIR and GIT_INDEX_FILE name the real repo: every spawn here gets an env with no GIT_* key, and a
// decoy repo set in those variables must come through unchanged.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./check-claims.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'check-claims-')), decoy = mkdtempSync(join(tmpdir(), 'check-claims-decoy-'));
const clean = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const gitIn = (cwd, ...args) => { const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env: clean(), encoding: 'utf8' }); if (r.status) throw new Error(`git ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
const git = (...args) => gitIn(dir, ...args);
// The decoy: one commit, then named in GIT_DIR, GIT_WORK_TREE and GIT_INDEX_FILE as a hook would name the real repo.
gitIn(decoy, 'init', '-q', '-b', 'main'); writeFileSync(join(decoy, 'f'), 'decoy'); gitIn(decoy, 'add', '-A'); gitIn(decoy, 'commit', '-qm', 'decoy');
const decoyState = () => `${gitIn(decoy, 'show-ref', '--head')}${gitIn(decoy, 'status', '--porcelain')}${readFileSync(join(decoy, '.git', 'index')).toString('base64')}`;
const before = decoyState();
Object.assign(process.env, { GIT_DIR: join(decoy, '.git'), GIT_WORK_TREE: decoy, GIT_INDEX_FILE: join(decoy, '.git', 'index') });
const put = (f, v) => { mkdirSync(join(dir, 'parity'), { recursive: true }); writeFileSync(join(dir, 'parity', f), typeof v === 'string' ? v : JSON.stringify(v)); };
const store = (n, msg) => { put('near-check.json', { pass: n, total: n }); git('add', '-A'); git('commit', '-qm', msg); };
const claim = (...evidence) => put('items.json', evidence.map((e, i) => ({ id: `X${i}`, evidence: e })));
const run = () => { const r = spawnSync('node', [script], { env: { ...clean(), CLAIMS_ROOT: dir }, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };

let pass = 0, total = 0;
const add = (what, ok, detail) => { total++; if (ok) pass++; console.log(`${what.padEnd(64)} ${ok ? 'ok' : `FAIL ${detail}`}`); };
try {
  git('init', '-q', '-b', 'main');
  claim('npm run near-check, 72 of 72');
  store(72, 'main stores 72');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  git('checkout', '-qb', 'branch');
  store(73, 'branch stores 73');
  store(75, 'branch stores 75');
  let r = run();
  add('a claim main stored (72) passes on the branch', r.code === 0, r.out);
  claim('near-check, 75 of 75');
  r = run(); add("today's file (75) passes", r.code === 0, r.out);
  claim('near-check, 73 of 73');
  r = run(); add("the branch's own 73, which a squash drops, fails", r.code === 1 && /ever said 73 of 73/.test(r.out), r.out);
  claim('near-check 74 of 74');
  r = run(); add('a count never stored (74) fails', r.code === 1 && /ever said 74 of 74/.test(r.out), r.out);
  claim("near-check misses 2 of 147; near-check's known list, 4 of 664");
  r = run(); add('"misses 2 of 147" and "\'s known list, 4 of 664" are no claims', r.code === 0 && /0 of 0 named/.test(r.out), r.out);
  claim('near-check.mjs: 74 of 74', 'resize-check reads 1 of 2', 'textpush-check unchanged, 1 of 2');
  r = run(); add('".mjs: ", " reads " and " unchanged, " forms are claims', r.code === 1 && /"near-check\.mjs: 74 of 74": .* ever said/.test(r.out) && /resize-check reads/.test(r.out) && /textpush-check unchanged/.test(r.out), r.out);
  claim('near-check matches the oracle HTML (99 of 99)', 'near-check compares all six with the oracle HTML (98 of 98');
  r = run(); add('" matches the oracle HTML (" and " compares all six with the oracle HTML (" are claims', r.code === 1 && /HTML \(99 of 99": .* ever said 99 of 99/.test(r.out) && /HTML \(98 of 98": .* ever said 98 of 98/.test(r.out), r.out);
  claim('near-check matches the oracle HTML (72 of 72)');
  r = run(); add('" matches the oracle HTML (72 of 72" that main stored passes', r.code === 0 && /1 of 1 named/.test(r.out), r.out);
  claim('neworder-check on CAP-X and CAP-Y, 25 of 25', 'near-check holds all 18 (6 of 18', 'near-check checks each, with ours then 12 of 14');
  r = run(); add('subset counts ("on CAP-…, ", "holds all 18 (", "with ours then ") are no claims', r.code === 0 && /0 of 0 named/.test(r.out), r.out);
  put('cover-check.json', { matched: 5 }); claim('cover-check 5 of 5');
  r = run(); add('a result file with no pass and total is listed, not failed', r.code === 0 && /has no pass and total/.test(r.out), r.out);
  put('cover-check.json', '{ "pass": 5,'); claim('cover-check 5 of 5');
  r = run(); add("a result file that doesn't parse fails", r.code === 1 && /doesn't parse/.test(r.out), r.out);
  claim('gone-check 5 of 5');
  r = run(); add('a claim with no result file is listed, not failed', r.code === 0 && /no parity\/gone-check\.json/.test(r.out), r.out);
  put('cover-check.json', { pass: 5, total: 5 }); git('update-ref', '-d', 'refs/remotes/origin/main'); claim('near-check, 72 of 72');
  r = run(); add('no origin/main: a past count is listed, not failed', r.code === 0 && /no merge base/.test(r.out), r.out);
  add('a repo named in GIT_DIR, GIT_WORK_TREE and GIT_INDEX_FILE is left as it was', decoyState() === before, 'the decoy changed');
} finally {
  for (const d of [dir, decoy]) rmSync(d, { recursive: true, force: true });
}
console.log(`check-claims cases: ${pass} of ${total}`);
process.exit(pass === total && total === 14 ? 0 : 1);
