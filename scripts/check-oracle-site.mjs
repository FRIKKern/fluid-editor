// The oracle's trial site lives in scripts/lib/oracle-site.mjs and nowhere else in scripts/: a new trial sets
// FLUID_ORACLE_SITE once and every script follows. Fails if another script names a *.squarespace.com site (in code,
// a regex or a comment) or the module's own site name, and checks that the module reads the variable.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'scripts/lib/oracle-site.mjs';
// A site's host, also as written in a regex (\.). Hosts in this file are built, so it holds none.
const SITE = /\b[a-z0-9][a-z0-9-]*\\?\.squarespace\\?\.com/gi;
const sq = (name) => `${name}.squarespace` + '.com';
const errors = [];

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'scripts'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter((f) => f && f !== MODULE && existsSync(`${root}/${f}`));
// The module's own site names, so a bare name (location.host.includes('<name>')) is caught too.
const names = existsSync(`${root}/${MODULE}`) ? [...new Set([...readFileSync(`${root}/${MODULE}`, 'utf8').matchAll(SITE)].map((m) => m[0].split(/\\?\./)[0].toLowerCase()))] : [];
for (const f of files) {
  readFileSync(`${root}/${f}`, 'utf8').split('\n').forEach((line, i) => {
    const hit = line.match(SITE)?.[0] || names.find((n) => line.toLowerCase().includes(n));
    if (hit) errors.push(`${f}:${i + 1}: names the trial site (${hit}); use ${MODULE}`);
  });
}

// The module: the default, a set variable in each accepted form, and a refusal.
if (!existsSync(`${root}/${MODULE}`)) errors.push(`${MODULE}: missing`);
else {
  const run = (value) => {
    try { return execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(`${root}/${MODULE}`)}); console.log(JSON.stringify([m.HOST, m.EDITOR, m.HOST_RE.test(m.EDITOR)]));`], { env: { ...process.env, FLUID_ORACLE_SITE: value ?? '' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch { return 'refused'; }
  };
  const { DEFAULT_SITE } = await import(`${root}/${MODULE}`);
  const want = (h) => JSON.stringify([h, `https://${h}/config/pages`, true]);
  const cases = [[null, want(DEFAULT_SITE)], ['new-trial', want(sq('new-trial'))], [sq('new-trial'), want(sq('new-trial'))], [`https://${sq('New-Trial')}/config/pages`, want(sq('new-trial'))], ['example.com', 'refused'], ['a b', 'refused']];
  for (const [value, expect] of cases) { const got = run(value); if (got !== expect) errors.push(`${MODULE}: FLUID_ORACLE_SITE=${JSON.stringify(value)} gave ${got}, want ${expect}`); }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`oracle site ok: ${files.length} scripts name no site, ${MODULE} reads FLUID_ORACLE_SITE`);
