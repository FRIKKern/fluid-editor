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

// oracle-setup-check, offline only: what it lists for a new trial. No --live, so nothing reaches the network.
const SETUP = `${root}/scripts/oracle-setup-check.mjs`;
const setup = (env, ...a) => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !['FLUID_ORACLE_SITE', 'CDP_PORT', 'ORACLE_SURFACE'].includes(k)));
  try { return { code: 0, out: execFileSync(process.execPath, [SETUP, ...a], { env: { ...clean, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};
const port = 1; // a port whose profile folder no lane has
const setupCases = [
  ['no site set: listed, exit 1', setup({}), (r) => r.code === 1 && /^missing +site +FLUID_ORACLE_SITE is not set/m.test(r.out) && /^skip +live /m.test(r.out) && !/^\S+ +login /m.test(r.out)],
  ['bases stored before the trial: footer and styles to store, theme rows left to --live', setup({ FLUID_ORACLE_SITE: 'new-trial', CDP_PORT: String(port) }, '--since', '2999-01-01'),
    (r) => r.code === 1 && r.out.includes(`ok       site     ${sq('new-trial')}`) && /^missing +base +CAP-FOOTER .*--store-footer$/m.test(r.out) && /^missing +base +CAP-STYLEROWS .*--store$/m.test(r.out) && /^skip +base +CAP-THEMEROWS /m.test(r.out) && /^missing +profile +\/tmp\/fluid-editor-chrome-1 does not exist/m.test(r.out)],
  ['bases stored after the trial started: ok', setup({ FLUID_ORACLE_SITE: 'new-trial' }, '--since', '2000-01-01'), (r) => ['CAP-FOOTER', 'CAP-THEMEROWS', 'CAP-STYLEROWS'].every((n) => new RegExp(`^ok +base +${n} stored`, 'm').test(r.out))],
  ['a bad --since: exit 2', setup({}, '--since', 'nov'), (r) => r.code === 2],
  ['--live with no site set stops before the site', setup({ ORACLE_SURFACE: `cdp:${port}` }, '--live'), (r) => r.code === 1 && /^missing +live +needs a valid FLUID_ORACLE_SITE/m.test(r.out) && !/^\S+ +login /m.test(r.out)],
];
// --since reads capturedAt, so each store in oracle-readback (live only, not run here) must set it.
const readback = readFileSync(`${root}/scripts/oracle-readback.mjs`, 'utf8').split('\n');
for (const file of ['STYLE_FILE', 'FOOTER_FILE']) if (!readback.some((l) => l.includes(`writeFileSync(${file},`) && /capturedAt: new Date\(\)/.test(l))) errors.push(`scripts/oracle-readback.mjs: the store to ${file} does not set capturedAt to today`);
if (!existsSync(SETUP)) errors.push('scripts/oracle-setup-check.mjs: missing');
else for (const [name, r, ok] of setupCases) if (!ok(r)) errors.push(`oracle-setup-check, ${name}: exit ${r.code}\n${r.out}`);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`oracle site ok: ${files.length} scripts name no site, ${MODULE} reads FLUID_ORACLE_SITE, oracle-setup-check ${setupCases.length} of ${setupCases.length}`);
