// Every "<name>-check N of M" claim in parity/items.json must name a run that was stored: parity/<name>-check.json says
// N of M now, or did at some commit (git history). It proves a claim was true at some commit, not that it is true now:
// evidence keeps the count of its own day, and checks grow after it. A claim whose check stores no result file is listed,
// not failed. In a shallow clone (no history) a claim that differs from today's file is listed too.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { items } from './lib/board.mjs';

const root = new URL('..', import.meta.url).pathname;
const git = (args, input) => spawnSync('git', args, { cwd: root, input, encoding: 'utf8', maxBuffer: 1 << 28 });
// A claim: the check's name, a colon or comma and at most one word ("reads", "unchanged,"), then "N of M". "x-check's
// known list, 4 of 664" or "x-check checks each, with ours then 12 of 14" count something else.
const CLAIM = /\b([a-z0-9]+(?:-[a-z0-9]+)*-check)\b[:,]?(?: [a-z]+,?)? (\d+) of (\d+)/g;
const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const claims = [];
for (const it of items()) for (const s of strings(it)) for (const m of s.matchAll(CLAIM)) claims.push({ id: it.id, text: m[0], name: m[1], n: +m[2], m: +m[3] });

const now = {}, past = {};
const runOf = (text) => { try { const j = JSON.parse(text); return `${j.pass} of ${j.total}`; } catch { return null; } };
for (const name of new Set(claims.map((c) => c.name))) {
  const f = `${root}parity/${name}.json`;
  if (existsSync(f)) now[name] = runOf(readFileSync(f, 'utf8'));
}
// History, read only for the files a claim misses: one git log per file, then every stored version in one cat-file.
const shallow = git(['rev-parse', '--is-shallow-repository']).stdout.trim() !== 'false';
const missed = [...new Set(claims.filter((c) => now[c.name] && now[c.name] !== `${c.n} of ${c.m}`).map((c) => c.name))];
if (!shallow && missed.length) {
  const want = missed.flatMap((name) => git(['log', '--format=%H', '--', `parity/${name}.json`]).stdout.split('\n').filter(Boolean).map((h) => [name, `${h}:parity/${name}.json`]));
  // Each answer: "<sha> blob <bytes>\n<content>\n", or "<spec> missing\n".
  const out = spawnSync('git', ['cat-file', '--batch'], { cwd: root, input: `${want.map(([, spec]) => spec).join('\n')}\n`, maxBuffer: 1 << 28 }).stdout;
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
  const said = `${c.n} of ${c.m}`, where = `${c.id}: "${c.text}"`;
  if (!(c.name in now)) listed.push(`${where}: no parity/${c.name}.json, so the claim cannot be checked`);
  else if (now[c.name] === said || past[c.name]?.has(said)) continue;
  else if (shallow) listed.push(`${where}: parity/${c.name}.json says ${now[c.name]}, and a shallow clone has no history to look in`);
  else errors.push(`${where}: parity/${c.name}.json says ${now[c.name]}, and no stored version of it ever said ${said}`);
}
for (const l of listed) console.warn(`claim not checked: ${l}`);
if (errors.length) {
  console.error(`${errors.join('\n')}\nA claim must name a stored run (true at some commit, not necessarily now): store the run, or fix the count.`);
  process.exit(1);
}
console.log(`claims ok: ${claims.length - listed.length} of ${claims.length} named a stored run (now or at some commit), ${listed.length} not checked`);
