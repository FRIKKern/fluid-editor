// P5: compare section colors (background, paragraph, heading, button) between the oracle
// page in the editor frame and our page. Writes parity/colors-<slug>.json.
// Usage: node scripts/color-diff.mjs --path /contact --ours http://127.0.0.1:5178/page.html?page=contact [--slug contact]
import { writeFileSync } from 'node:fs';
import { evalJs, waitFor, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const oracle = arg('oracle-frame', process.env.ORACLE_SURFACE || 'surface:40');
const surface = arg('surface', process.env.FLUID_SURFACE || 'surface:59');
const path = arg('path', '/how-fluid-engine-works');
const ours = arg('ours', `${BASE}/page.html`);
const slug = arg('slug', 'demo');

const READ = (doc) => `(() => { const d = ${doc}; const W = d.defaultView;
  const css = (e, p) => (e ? W.getComputedStyle(e)[p] : null);
  return JSON.stringify([...d.querySelectorAll('main#page .page-section, footer .page-section')].map((s) => {
    const bgEl = s.querySelector('.section-background') || s;
    return { theme: s.dataset.sectionTheme || '', background: css(bgEl, 'backgroundColor'), paragraph: css(s.querySelector('.sqs-html-content p'), 'color'),
      heading: css(s.querySelector('.sqs-html-content h1, .sqs-html-content h2, .sqs-html-content h3'), 'color'),
      buttonBg: css(s.querySelector('.sqs-block-button-element, form button'), 'backgroundColor'), buttonInk: css(s.querySelector('.sqs-block-button-element, form button'), 'color') };
  })); })()`;

// Never read the wrong page: the frame must show the path, and still show it after a pause.
const shows = () => evalJs(oracle, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentDocument.location.pathname))()`);
for (let tries = 0; ; tries++) {
  evalJs(oracle, `(() => { const f = document.getElementById('sqs-site-frame'); if (f.contentDocument.location.pathname !== ${JSON.stringify(path)}) f.src = ${JSON.stringify(path)}; return 'true'; })()`);
  try { waitFor(oracle, `(() => { const d = document.getElementById('sqs-site-frame').contentDocument; return d.location.pathname === ${JSON.stringify(path)} && d.readyState !== 'loading' && !!d.querySelector('main#page .fluid-engine'); })()`, 40); } catch {}
  await pause(2000);
  if (shows() === path) break;
  if (tries === 2) throw new Error(`oracle frame shows ${shows()}, wanted ${path}`);
}
const a = evalJs(oracle, READ("document.getElementById('sqs-site-frame').contentDocument"));
ensureVisible(surface);
viewport(surface, 1280, 1000);
goto(surface, ours);
await pause(2500);
const b = evalJs(surface, READ('document'));
const diffs = [];
a.forEach((s, i) => {
  for (const k of ['background', 'paragraph', 'heading', 'buttonBg', 'buttonInk']) {
    if (s[k] && b[i]?.[k] && s[k] !== b[i][k]) diffs.push({ section: i, theme: s.theme, key: k, oracle: s[k], ours: b[i][k] });
  }
});
const checked = a.reduce((n, s, i) => n + ['background', 'paragraph', 'heading', 'buttonBg', 'buttonInk'].filter((k) => s[k] && b[i]?.[k]).length, 0);
console.log(`${slug}: ${checked - diffs.length} of ${checked} colors match`);
for (const d of diffs.slice(0, 6)) console.log(`  section ${d.section} (${d.theme || 'default'}) ${d.key}: oracle ${d.oracle}, ours ${d.ours}`);
writeFileSync(new URL(`../parity/colors-${slug}.json`, import.meta.url), JSON.stringify({ path, checked, pass: checked - diffs.length, diffs }, null, 2) + '\n');
