// Every "<name>-check N of M" claim in parity/items.json must name a run that was stored: parity/<name>-check.json says
// N of M now, or did at a commit main already holds (reachable from the merge base of HEAD and origin/main; a branch's
// own commits don't count, since a squash merge drops them). It proves a claim was true at some commit, not that it is true
// now: evidence keeps the count of its own day, and checks grow after it. Listed, not failed: a claim whose check stores
// no result file or one with no pass and total, and, with no history to look in (a shallow clone, no origin/main), a
// claim that differs from today's file. With CI set, no history fails instead: there the listing went unread, and a
// depth-1 checkout passed every false claim. Test: scripts/check-claims-test.mjs. CLAIMS_ROOT=<dir> checks another repo.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = process.env.CLAIMS_ROOT ? `${process.env.CLAIMS_ROOT.replace(/\/$/, '')}/` : new URL('..', import.meta.url).pathname;
// No GIT_* from a hook: they would name the hook's repo, not root.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (args, opts = {}) => spawnSync('git', args, { cwd: root, env, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
// A claim: the check's name (".mjs" allowed), then one of JOINS, then "N of M". Each join is a form items.json uses for a
// whole run. Not claims, as they count something else: "x-check's known list, 4 of 664", "x-check misses 2 of 147",
// "x-check on CAP-A and CAP-B, 25 of 25", "x-check holds all 18 (6 of 18", "x-check checks each, with ours then 12 of 14".
const JOINS = [' ', ': ', ', ', ' reads ', ' unchanged, ', ' matches the oracle HTML (', ' compares all six with the oracle HTML ('];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLAIM = new RegExp(`\\b([a-z0-9]+(?:-[a-z0-9]+)*-check)(?:\\.mjs)?(?:${JOINS.map(esc).join('|')})(\\d+) of (\\d+)`, 'g');
const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const claims = [];
for (const it of JSON.parse(readFileSync(`${root}parity/items.json`, 'utf8'))) {
  for (const s of strings(it)) for (const m of s.matchAll(CLAIM)) claims.push({ id: it.id, text: m[0], name: m[1], said: `${m[2]} of ${m[3]}` });
}

// A stored run as "P of T"; BAD where the file doesn't parse, NOCOUNT where it has no numeric pass and total.
const BAD = Symbol('bad'), NOCOUNT = Symbol('nocount');
const runOf = (text) => { let j; try { j = JSON.parse(text); } catch { return BAD; } return Number.isInteger(j?.pass) && Number.isInteger(j?.total) ? `${j.pass} of ${j.total}` : NOCOUNT; };
const now = {}, past = {};
for (const name of new Set(claims.map((c) => c.name))) {
  const f = `${root}parity/${name}.json`;
  if (existsSync(f)) now[name] = runOf(readFileSync(f, 'utf8'));
}
// History, read only for the files a claim misses: one git log per file from the merge base, then every stored version
// in one cat-file. No base (shallow clone, no origin/main, not a repo): no history.
const shallow = git(['rev-parse', '--is-shallow-repository']).stdout.trim() !== 'false';
const base = shallow ? '' : git(['merge-base', 'HEAD', 'origin/main']).stdout.trim();
const noHistory = shallow ? 'a shallow clone has no history to look in' : !base ? 'no merge base with origin/main to look in' : '';
const missed = [...new Set(claims.filter((c) => typeof now[c.name] === 'string' && now[c.name] !== c.said).map((c) => c.name))];
if (base && missed.length) {
  const want = missed.flatMap((name) => git(['log', '--format=%H', base, '--', `parity/${name}.json`]).stdout.split('\n').filter(Boolean).map((h) => [name, `${h}:parity/${name}.json`]));
  // Each answer: "<sha> blob <bytes>\n<content>\n", or "<spec> missing\n".
  const out = git(['cat-file', '--batch'], { input: Buffer.from(`${want.map(([, spec]) => spec).join('\n')}\n`), encoding: 'buffer' }).stdout;
  let at = 0;
  for (const [name] of want) {
    const nl = out.indexOf(10, at), head = out.subarray(at, nl).toString().split(' ');
    at = nl + 1;
    if (head[1] !== 'blob') continue;
    const size = Number(head[2]);
    (past[name] ||= new Set()).add(runOf(out.subarray(at, at + size).toString()));
    at += size + 1;
  }
}

const errors = [], listed = [];
for (const c of claims) {
  const where = `${c.id}: "${c.text}"`, file = `parity/${c.name}.json`, run = now[c.name];
  if (run === undefined) listed.push(`${where}: no ${file}, so the claim cannot be checked`);
  else if (run === BAD) errors.push(`${where}: ${file} doesn't parse`);
  else if (run === NOCOUNT) listed.push(`${where}: ${file} has no pass and total, so the claim cannot be checked`);
  else if (run === c.said || past[c.name]?.has(c.said)) continue;
  else if (noHistory && process.env.CI) errors.push(`${where}: ${file} says ${run}, and ${noHistory} (CI needs the full history: fetch-depth 0)`);
  else if (noHistory) listed.push(`${where}: ${file} says ${run}, and ${noHistory}`);
  else errors.push(`${where}: ${file} says ${run}, and no version of it on main (from ${base.slice(0, 8)}) ever said ${c.said}`);
}
for (const l of listed) console.warn(`claim not checked: ${l}`);
if (errors.length) {
  console.error(`${errors.join('\n')}\nA claim must name a stored run (true at some commit main holds, not necessarily now): store the run, or fix the count.`);
  process.exit(1);
}
console.log(`claims ok: ${claims.length - listed.length} of ${claims.length} named a stored run (now or at a commit main holds), ${listed.length} not checked`);
