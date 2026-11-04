// H4 and Gate B: measure every .fe-block box, relative to its section, at each
// width, on two pages, and require them within 1px. Both sides run in one engine: two cmux tabs or two cdp: surfaces.
//
// Two pages:     node scripts/box-diff.mjs --oracle <url> --ours <url>
// One page, our CSS swapped in for each captured section (no other change):
//                node scripts/box-diff.mjs --oracle <url> --swap
// Options: --surface surface:45 --widths 375,767,768,1280,1920 --tolerance 1
import { readFileSync, writeFileSync } from 'node:fs';
import { browser, evalJs, waitFor, goto, viewport, resetViewport, pause, requireSameEngine, engine } from './lib/cmux.mjs';
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
if (oracleFrame) requireSameEngine(surface, 'Gate B (box-diff)', oracleFrame);
// --fault breaks our CSS on purpose (desktop rows 0.0215 to 0.03) to prove the gate can fail.
const fault = args.includes('--fault');
const widths = arg('widths', '375,767,768,1280,1920').split(',').map(Number);
const tol = Number(arg('tolerance', '1'));
if ((!oracle && !oracleFrame) || (!ours && !swap)) throw new Error('need --oracle <url> or --oracle-frame <surface>, and either --ours <url> or --swap');

const MEASURE = `(async () => {
  const withoutSections = ${args.includes('--no-sections')};
  await document.fonts.ready;
  const out = {};
  for (const fe of document.querySelectorAll('main#page .fluid-engine, footer .fluid-engine')) {
    const sid = [...fe.classList].find((c) => /^fe-[\\w-]+$/.test(c) && c !== 'fe-block');
    const r = fe.getBoundingClientRect();
    // The section itself: grid offset inside it and its height (P2, P3).
    const sec = fe.closest('.page-section');
    if (sec && !withoutSections) { const q = sec.getBoundingClientRect(); out[sid + ' section'] = [r.left - q.left, r.top - q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10); }
    for (const b of fe.querySelectorAll(':scope > .fe-block')) {
      const id = [...b.classList].find((c) => c.startsWith('fe-block-'));
      const q = b.getBoundingClientRect();
      out[sid + ' ' + id] = [q.left - r.left, q.top - r.top, q.width, q.height].map((v) => Math.round(v * 10) / 10);
      // The button inside its block: it can overflow the block, which the block's box does not show.
      const bt = b.querySelector('.sqs-block-button-element');
      if (bt) { const t = bt.getBoundingClientRect(); out[sid + ' ' + id + ' button'] = [t.left - r.left, t.top - r.top, t.width, t.height].map((v) => Math.round(v * 10) / 10); }
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
    browser(s, 'click', '#fx-target');
    await pause(2500);
  }
  // --oracle-path /about: load that page in the site frame once, after Preview: entering Preview puts the frame back on the page it had.
  const want = arg('oracle-path');
  if (want && !measureFrame.picked) {
    // The editor can put the frame back on its own page a moment later, so the page has to stay.
    const J = JSON.stringify(want);
    const onPage = () => evalJs(s, `(() => { const d = document.getElementById('sqs-site-frame').contentDocument; return JSON.stringify(d.location.pathname === ${J} && d.readyState !== 'loading' && !!d.querySelector('main#page .fluid-engine')); })()`) === true;
    let stayed = false;
    for (let t = 0; t < 5 && !stayed; t++) {
      if (!onPage()) evalJs(s, `(() => { document.getElementById('sqs-site-frame').src = ${J}; return 'true'; })()`);
      for (let n = 0; n < 40 && !onPage(); n++) await pause(500);
      await pause(4000);
      stayed = onPage();
    }
    if (!stayed) throw new Error(`oracle frame would not stay on ${want}`);
    await pause(1500);
    measureFrame.picked = true;
    // Pictures load lazily, and until they have, a picture can hold its row taller than it stays
    // (About at 375px: 245 on the first read, 234 after). Show the whole page and wait for them.
    evalJs(s, `(async () => { const f = document.getElementById('sqs-site-frame'); const W = f.contentWindow, d = f.contentDocument; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let y = 0; y < d.documentElement.scrollHeight; y += 400) { W.scrollTo({ top: y, behavior: 'instant' }); await sleep(150); }
      for (let n = 0; n < 60 && [...d.images].some((i) => !i.complete); n++) await sleep(250);
      W.scrollTo({ top: 0, behavior: 'instant' }); return JSON.stringify([...d.images].filter((i) => !i.complete).length); })()`);
    await pause(1000);
  }
  evalJs(s, `(() => { const f = document.getElementById('sqs-site-frame'); f.style.setProperty('width', '${width}px', 'important'); f.style.setProperty('max-width', 'none', 'important'); f.style.setProperty('min-width', '0', 'important'); f.style.setProperty('height', '1000px', 'important'); f.style.setProperty('flex', 'none', 'important'); return 'true'; })()`);
  await pause(1200);
  const got = evalJs(s, `(() => { const f = document.getElementById('sqs-site-frame'); return JSON.stringify([f.contentWindow.innerWidth, f.contentWindow.innerHeight]); })()`);
  if (got[0] !== width) throw new Error(`oracle frame is ${got[0]}px wide, wanted ${width}`);
  // Never measure the wrong page: the frame must still show --oracle-path.
  if (want) {
    const at = evalJs(s, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentDocument.location.pathname))()`);
    if (at !== want) throw new Error(`oracle frame shows ${at}, wanted ${want}`);
  }
  const js = MEASURE.replace('(async () => {', "(async () => { const document = window.document.getElementById('sqs-site-frame').contentDocument;");
  return { boxes: evalJs(s, js), swapped: null };
}

if (ensureVisible(surface)) console.log(`${surface} was hidden; moved it to its own pane`);
const map = swap ? swapCss() : null;
const report = { gate: 'B', engine: engine(surface), oracle: oracle || `editor preview on ${oracleFrame.startsWith('cdp:') ? 'headless Chrome' : oracleFrame}`, ours: ours || 'swap: same page with our CSS', tolerance: tol, widths: [], pass: 0, total: 0 };
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
// Put the oracle frame back: a resized frame stays resized, and the next probe or inventory
// run would measure a 1920px canvas in a 1600px window (it did on 2026-11-04).
if (oracleFrame) evalJs(oracleFrame, `(() => { const f = document.getElementById('sqs-site-frame'); for (const p of ['width', 'max-width', 'min-width', 'height', 'flex']) f.style.removeProperty(p); return 'true'; })()`);
const reportName = arg('report', 'gate-b');
if (!fault) writeFileSync(new URL(`../parity/${reportName}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
if (!report.total) {
  console.error('Gate B: no blocks measured');
  process.exitCode = 1;
} else if (report.pass !== report.total) process.exitCode = 1;
