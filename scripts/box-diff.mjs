// H4 and Gate B: measure every .fe-block box, relative to its section, at each
// width, on two pages, and require them within 1px. Runs in a cmux browser tab.
//
// Two pages:     node scripts/box-diff.mjs --oracle <url> --ours <url>
// One page, our CSS swapped in for each captured section (no other change):
//                node scripts/box-diff.mjs --oracle <url> --swap
// Options: --surface surface:45 --widths 375,767,768,1280,1920 --tolerance 1
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { evalJs, waitFor, goto, viewport, resetViewport, pause } from './lib/cmux.mjs';
import { ensureVisible } from './lib/cmux.mjs';
import { parseSectionCss } from './lib/parse.mjs';
import { sectionCss } from '../app/src/render.js';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const surface = arg('surface', process.env.FLUID_SURFACE || 'surface:59');
const oracle = arg('oracle');
const ours = arg('ours');
const swap = args.includes('--swap');
// --oracle-frame <surface>: measure the oracle inside the Squarespace editor's full-screen
// preview on that surface, with the site frame resized to each width (a logged-in visit
// to the site URL redirects to the editor). The editor page must be open, not in edit mode.
const oracleFrame = arg('oracle-frame');
// --fault breaks our CSS on purpose (desktop rows 0.0215 to 0.03) to prove the gate can fail.
const fault = args.includes('--fault');
const widths = arg('widths', '375,767,768,1280,1920').split(',').map(Number);
const tol = Number(arg('tolerance', '1'));
if ((!oracle && !oracleFrame) || (!ours && !swap)) throw new Error('need --oracle <url> or --oracle-frame <surface>, and either --ours <url> or --swap');

const MEASURE = `(async () => {
  const withoutSections = ${args.includes('--no-sections')};
  await document.fonts.ready;
  const out = {};
  for (const fe of document.querySelectorAll('main#page .fluid-engine')) {
    const sid = [...fe.classList].find((c) => /^fe-[\\w-]+$/.test(c) && c !== 'fe-block');
    const r = fe.getBoundingClientRect();
    // The section itself: grid offset inside it and its height (P2, P3).
    const sec = fe.closest('.page-section');
    if (sec && !withoutSections) { const q = sec.getBoundingClientRect(); out[sid + ' section'] = [r.left - q.left, r.top - q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10); }
    for (const b of fe.querySelectorAll(':scope > .fe-block')) {
      const id = [...b.classList].find((c) => c.startsWith('fe-block-'));
      const q = b.getBoundingClientRect();
      out[sid + ' ' + id] = [q.left - r.left, q.top - r.top, q.width, q.height].map((v) => Math.round(v * 10) / 10);
    }
  }
  return JSON.stringify(out);
})()`;

// Our CSS for every section on the page that Gate A has a fixture for.
function swapCss() {
  const index = JSON.parse(readFileSync(new URL('../fixtures/index.json', import.meta.url), 'utf8'));
  const host = new URL(oracle).host;
  const map = {};
  for (const fx of index.filter((f) => new URL(f.url).host === host)) {
    const css = sectionCss(parseSectionCss(readFileSync(new URL(`../fixtures/${fx.file}`, import.meta.url), 'utf8')));
    map[fx.sectionId] = fault ? css.replace('--row-height-scaling-factor: 0.0215', '--row-height-scaling-factor: 0.03') : css;
  }
  return map;
}

const SWAP = (map) => `(() => {
  const map = ${JSON.stringify(map)};
  let n = 0;
  for (const st of document.querySelectorAll('style')) {
    const m = st.textContent.match(/\\.fe-([\\w-]+) \\{\\s*--grid-gutter/);
    if (m && map[m[1]]) { st.textContent = map[m[1]]; n++; }
  }
  return JSON.stringify(n);
})()`;

async function measure(url, width, map) {
  viewport(surface, width, 1000);
  goto(surface, url);
  waitFor(surface, `document.readyState === 'complete' && !!document.querySelector('.fluid-engine')`, 40);
  await pause(600);
  let swapped = null;
  if (map) swapped = evalJs(surface, SWAP(map));
  await pause(400);
  return { boxes: evalJs(surface, MEASURE), swapped };
}

async function measureFrame(width) {
  const s = oracleFrame;
  viewport(s, 1920, 1100);
  const inPreview = evalJs(s, `(() => JSON.stringify(!![...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Close full screen preview' && x.getBoundingClientRect().width > 0)))()`);
  if (!inPreview) {
    evalJs(s, `(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || x.textContent).trim() === 'Preview'); document.querySelectorAll('#fx-target').forEach((e) => e.removeAttribute('id')); b.id = 'fx-target'; return 'true'; })()`);
    execFileSync('cmux', ['browser', '--surface', s, 'click', '#fx-target']);
    await pause(2500);
  }
  evalJs(s, `(() => { const f = document.getElementById('sqs-site-frame'); f.style.setProperty('width', '${width}px', 'important'); f.style.setProperty('max-width', 'none', 'important'); f.style.setProperty('min-width', '0', 'important'); f.style.setProperty('height', '1000px', 'important'); f.style.setProperty('flex', 'none', 'important'); return 'true'; })()`);
  await pause(1200);
  const got = evalJs(s, `(() => { const f = document.getElementById('sqs-site-frame'); return JSON.stringify([f.contentWindow.innerWidth, f.contentWindow.innerHeight]); })()`);
  if (got[0] !== width) throw new Error(`oracle frame is ${got[0]}px wide, wanted ${width}`);
  const js = MEASURE.replace('(async () => {', "(async () => { const document = window.document.getElementById('sqs-site-frame').contentDocument;");
  return { boxes: evalJs(s, js), swapped: null };
}

if (ensureVisible(surface)) console.log(`${surface} was hidden; moved it to its own pane`);
const map = swap ? swapCss() : null;
const report = { gate: 'B', oracle: oracle || `editor preview on ${oracleFrame}`, ours: ours || 'swap: same page with our CSS', tolerance: tol, widths: [], pass: 0, total: 0 };
for (const w of widths) {
  const a = oracleFrame ? await measureFrame(w) : await measure(oracle, w);
  const b = await measure(ours || oracle, w, map);
  const fails = [];
  let n = 0;
  for (const [key, ba] of Object.entries(a.boxes)) {
    n++;
    const bb = b.boxes[key];
    if (!bb) fails.push({ block: key, reason: 'missing on ours' });
    else if (ba.some((v, i) => Math.abs(v - bb[i]) > tol)) fails.push({ block: key, oracle: ba, ours: bb });
  }
  report.widths.push({ width: w, blocks: n, pass: n - fails.length, swappedSections: b.swapped, fails });
  report.pass += n - fails.length;
  report.total += n;
  console.log(`${w}px: ${n - fails.length} of ${n} blocks within ${tol}px${b.swapped != null ? ` (${b.swapped} sections swapped)` : ''}`);
  for (const f of fails.slice(0, 3)) console.log(`  ${f.block}: ${f.reason || `oracle ${f.oracle} ours ${f.ours}`}`);
}
resetViewport(surface);
if (oracleFrame) viewport(oracleFrame, 1600, 1000);
console.log(`Gate B, block boxes: ${report.pass} of ${report.total} block boxes match`);
// --report <name> writes parity/<name>.json instead of gate-b.json (extra widths, experiments).
const reportName = arg('report', 'gate-b');
if (!fault) writeFileSync(new URL(`../parity/${reportName}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
if (!report.total) {
  console.error('Gate B: no blocks measured');
  process.exitCode = 1;
} else if (report.pass !== report.total) process.exitCode = 1;
