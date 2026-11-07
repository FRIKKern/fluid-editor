// Things a person shouldn't have to remember before a push: no conflict markers in app, scripts or parity, every finding
// parses, no finding holds an SVG path string (O2: measurements and labels only), and UNREAD's counts match its rows.
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const DIRS = ['app', 'scripts', 'parity'];
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp4|webm)$/i;

// Each of these still holds path strings. A file comes off as soon as it is clean, and this list ends empty.
const PATHS_LEFT = new Set(['CAP-L6CORNER.json', 'CAP-T6CORNERS.json', 'SHAPEDESIGN.json']);

const MARKER = /^(<{7}|>{7})/m;
const PATH_DATA = /<path\b|\bd=["']|(?:^|[^A-Za-z])[Mm]\s*-?[\d.]+[ ,]+-?[\d.]+\s*[LlCcQqAaZzHhVvSsTtMm-]/;

// The strings in a parsed finding, keys left out: a key named d is often a letter, as in CAP-FORMSUBS and CAP-U5CRAWL.
function* strings(v) {
  if (typeof v === 'string') yield v;
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x);
}
const hasPath = (json) => [...strings(json)].some((s) => PATH_DATA.test(s));

function staleCounts(unread) {
  const rows = unread.entries, by = (key, value) => rows.filter((e) => e[key] === value).length;
  const want = { total: rows.length, yes: by('safeRead', 'yes'), no: by('safeRead', 'no'), read: by('state', 'read'), notPressed: by('state', 'notPressed'), open: by('state', 'open') };
  const seen = unread.counts || {};
  return [...new Set([...Object.keys(want), ...Object.keys(seen)])].filter((k) => seen[k] !== want[k]).map((k) => `${k}: says ${seen[k]}, rows give ${want[k]}`);
}

const fails = [];

// Proof that each guard can fail, on planted text. The marker is built here, so this file holds none.
const planted = `a\n${'<'.repeat(7)} HEAD\nb\n`;
const proof = (name, ok) => { if (!ok) fails.push(`the guard itself: ${name}`); };
proof('a marker at a line start', MARKER.test(planted));
proof('a marker inside a line is fine', !MARKER.test(`x ${'<'.repeat(7)} y`));
proof('path data', hasPath({ a: ['M171,0 H334 A8,8 0 0 1 342,8'] }));
proof('path markup', hasPath({ a: '<path fill="red"/>' }));
proof('a letter d is no path', !hasPath({ d: 'darkAccent' }));
proof('words with numbers are no path', !hasPath({ a: 'left 5, bottom 0, 34 by 0', b: 'zoom. 5 gives 0.3', c: 'M 12 x 3' }));
proof('stale counts', staleCounts({ counts: { total: 2 }, entries: [{}] }).length > 0);

function* files(url) {
  for (const name of readdirSync(url)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const u = new URL(name, url);
    if (statSync(u).isDirectory()) yield* files(new URL(`${name}/`, url));
    else if (!BINARY.test(name)) yield u;
  }
}
for (const dir of DIRS) for (const u of files(new URL(`${dir}/`, ROOT))) {
  if (MARKER.test(readFileSync(u, 'utf8'))) fails.push(`conflict marker: ${u.pathname.slice(ROOT.pathname.length)}`);
}

const FINDINGS = new URL('parity/findings/', ROOT);
let count = 0;
for (const name of readdirSync(FINDINGS).filter((n) => n.endsWith('.json'))) {
  count++;
  let json;
  try { json = JSON.parse(readFileSync(new URL(name, FINDINGS), 'utf8')); } catch (e) { fails.push(`does not parse: parity/findings/${name}: ${e.message}`); continue; }
  const found = hasPath(json);
  if (found && !PATHS_LEFT.has(name)) fails.push(`SVG path string (O2): parity/findings/${name}: keep numbers and labels`);
  if (!found && PATHS_LEFT.has(name)) fails.push(`no path left in ${name}: take it off PATHS_LEFT in scripts/check-findings.mjs`);
  if (name === 'UNREAD.json') for (const c of staleCounts(json)) fails.push(`UNREAD.json counts, ${c}`);
}

for (const f of fails) console.log(f);
console.log(fails.length ? `check-findings: ${fails.length} failed` : `findings ok: ${count} files, no markers, ${PATHS_LEFT.size} left with path strings`);
process.exit(fails.length ? 1 : 0);
