// O2 and O3: read the oracle demo page out of the editor's preview frame (not in
// edit mode) and write
//   fixtures/oracle/demo-page.json   the stamped snapshot: sections, blocks, styles
//   fixtures/css/<host>--<id>.css     each section's published CSS, for Gate A
//   app/src/demo-data.js              our demo model, generated from the snapshot
// Usage: node scripts/oracle-import.mjs [--surface surface:40]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { evalJs } from './lib/cmux.mjs';
import { parseSectionCss } from './lib/parse.mjs';

const args = process.argv.slice(2);
const surface = args.includes('--surface') ? args[args.indexOf('--surface') + 1] : process.env.ORACLE_SURFACE || 'surface:40';
const HOST = 'halibut-keyboard-jlhd.squarespace.com';
// --title "Home" --slug home imports another page of the trial site; the default is the demo page.
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const SLUG = opt('slug', 'demo');
const TITLE = opt('title', 'How Fluid Engine works');
let PAGE = '/how-fluid-engine-works';
const today = new Date().toISOString().slice(0, 10);

const READ = `(() => {
  const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  if (d.querySelector('.fluid-engine.is-editing')) return JSON.stringify({ error: 'the editor is in edit mode; exit edit mode first' });
  const root = W.getComputedStyle(d.documentElement);
  const vars = {};
  for (const k of ['--heading-1-size-value', '--heading-2-size-value', '--heading-3-size-value', '--heading-4-size-value', '--normal-text-size-value', '--large-text-size-value', '--small-text-size-value', '--maxPageWidth', '--heading-font-line-height', '--body-font-line-height', '--heading-font-letter-spacing', '--body-font-letter-spacing', '--heading-font-font-weight', '--body-font-font-weight', '--sqs-site-gutter', '--sqs-mobile-site-gutter', '--sqs-site-max-width']) vars[k] = root.getPropertyValue(k).trim();
  const pick = (el, props) => { if (!el) return null; const c = W.getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c[p]])); };
  const T = ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight', 'marginTop', 'marginBottom', 'color', 'textTransform'];
  const readSection = (s) => {
    const fe = s.querySelector('.fluid-engine');
    const feClass = [...fe.classList].find((c) => /^fe-[\\w-]+$/.test(c));
    const style = [...s.querySelectorAll('style')].map((x) => x.textContent).find((t) => t.includes('--grid-gutter') && t.includes('.' + feClass + ' {'));
    const blocks = [...fe.querySelectorAll(':scope > .fe-block')].map((b) => {
      const kind = b.querySelector('[data-sqsp-block]')?.dataset.sqspBlock || 'unknown';
      const out = { id: [...b.classList].find((c) => c.startsWith('fe-block-')).slice(9), kind };
      if (kind === 'text') out.html = b.querySelector('.sqs-html-content')?.innerHTML.trim() || '';
      if (kind === 'button') { const a = b.querySelector('a, button'); out.label = a?.textContent.trim(); if (a?.getAttribute('href')) out.href = a.getAttribute('href'); // no link stays absent: the oracle writes href="" (parity/findings/BUTTONEDIT.json) out.style = pick(a, ['backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'height', 'width']); out.align = W.getComputedStyle(b.querySelector('.sqs-block-content') || b).textAlign; const view = (sys) => { const k = b.querySelector('.sqs-button-block-container-system_' + sys); if (!k) return null; const o = {}; if (!k.classList.contains('sqs-stretched')) o.fit = true; const al = [...k.classList].find((c) => /--(left|right)$/.test(c)); if (al) o.align = al.split('--')[1]; return o; }; const dv = view('desktop'), mv = view('mobile'); if (dv) { if (dv.fit) out.fit = true; if (dv.align) out.halign = dv.align; } if (mv) out.btnMobile = mv; }
      if (kind === 'image') { const img = b.querySelector('img'); out.alt = img?.getAttribute('alt') || ''; const fig = b.querySelector('.sqs-image, .fluid-image-container, figure'); out.radius = fig ? W.getComputedStyle(b.querySelector('.fluid-image-container, .sqs-image-content, figure') || fig).borderRadius : null; }
      if (kind === 'form') {
        out.fields = [...b.querySelectorAll('form .form-item')].map((it) => {
          const label = (it.querySelector('label.title, legend')?.textContent || '').trim();
          if (it.querySelector('.first-name')) return { kind: 'name', label, parts: [...it.querySelectorAll('.field label')].map((l) => l.textContent.trim()) };
          if (it.querySelector('textarea')) return { kind: 'textarea', label };
          if (it.querySelector('input[type=checkbox]')) return { kind: 'checkbox', label, options: [...it.querySelectorAll('input[type=checkbox]')].map((i) => (i.closest('label') || i.parentElement).textContent.trim()) };
          if (it.querySelector('select')) return { kind: 'select', label, options: [...it.querySelectorAll('option')].map((o) => o.textContent.trim()) };
          return { kind: it.querySelector('input')?.type || 'text', label };
        });
        out.button = b.querySelector('form button')?.textContent.trim() || 'Send';
      }
      if (kind === 'scrolling') { out.text = b.querySelector('.Marquee-item')?.textContent.trim() || ''; out.size = Number((b.querySelector('style')?.textContent.match(/--marquee-font-size-value:\s*([\d.]+)/) || [])[1] || 5); }
      if (kind === 'social-links') { out.count = b.querySelectorAll('a').length; out.align = [...b.querySelector('.sqs-svg-icon--outer')?.classList || []].find((c) => c.startsWith('social-icon-alignment-'))?.slice(22) || 'left'; }
      if (kind === 'shape') { const p = b.querySelector('svg path, svg rect, svg circle, svg polygon'); out.fill = p ? W.getComputedStyle(p).fill : null; out.svg = (b.querySelector('svg')?.outerHTML || '').length; }
      return out;
    });
    const sc = W.getComputedStyle(s);
    const fr = fe.getBoundingClientRect();
    return {
      sectionId: s.dataset.sectionId, feId: feClass.slice(3), theme: s.dataset.sectionTheme, css: style || null,
      customHeight: (() => { try { return JSON.parse(s.dataset.currentStyles || '{}').customSectionHeight; } catch (e) { return null; } })(),
      divider: s.classList.contains('has-section-divider'),
      settings: Object.fromEntries([...s.classList].map((c) => c.match(/^(section-height|vertical-alignment|content-width|horizontal-alignment|background-width)--(.+)$/)).filter(Boolean).map((m) => [m[1], m[2]])),
      section: { paddingTop: sc.paddingTop, paddingBottom: sc.paddingBottom, minHeight: sc.minHeight, background: W.getComputedStyle(s.querySelector('.section-background') || s).backgroundColor, inlineStyle: s.getAttribute('style') },
      grid: { left: fr.left, width: fr.width },
      text: { h1: pick(s.querySelector('h1'), T), h2: pick(s.querySelector('h2'), T), p: pick(s.querySelector('.sqs-html-content p'), T) },
      blocks,
    };
  };
  const sections = [...d.querySelectorAll('main#page .page-section')].map(readSection);
  const footer = [...d.querySelectorAll('footer .page-section')].map(readSection);
  return JSON.stringify({ frameWidth: W.innerWidth, frameHeight: W.innerHeight, vars, sections, footer });
})()`;

// --path /about: load that page in the editor's site frame (read only, not edit mode).
const wantPath = opt('path', SLUG === 'demo' ? '/how-fluid-engine-works' : null);
if (wantPath) {
  const { waitFor } = await import('./lib/cmux.mjs');
  evalJs(surface, `(() => { const f = document.getElementById('sqs-site-frame'); if (f.contentDocument.location.pathname !== ${JSON.stringify(wantPath)}) f.src = ${JSON.stringify(wantPath)}; return 'true'; })()`);
  waitFor(surface, `(() => { const d = document.getElementById('sqs-site-frame').contentDocument; return d.location.pathname === ${JSON.stringify(wantPath)} && d.readyState !== 'loading' && !!d.querySelector('main#page .fluid-engine'); })()`, 40);
  await new Promise((r) => setTimeout(r, 1500));
}
PAGE = evalJs(surface, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentDocument.location.pathname))()`);
const snap = evalJs(surface, READ);
if (snap.error) throw new Error(snap.error);
if (!snap.sections.length) throw new Error('no sections found on the page');

mkdirSync(new URL('../fixtures/oracle/', import.meta.url), { recursive: true });
const index = JSON.parse(readFileSync(new URL('../fixtures/index.json', import.meta.url), 'utf8')).filter((f) => f.url !== `https://${HOST}${PAGE}`);
const model = { version: 1, title: TITLE, source: `https://${HOST}${PAGE}`, capturedAt: today, sections: [], footer: [] };
for (const [where, list] of [['sections', snap.sections], ['footer', snap.footer || []]]) for (const s of list) {
  if (!s.css) throw new Error(`section ${s.sectionId}: no published section CSS found`);
  const sha256 = createHash('sha256').update(s.css).digest('hex');
  const file = `css/${HOST}--${s.feId}.css`;
  writeFileSync(new URL(`../fixtures/${file}`, import.meta.url), s.css);
  index.push({ file, url: `https://${HOST}${PAGE}`, sectionId: s.feId, capturedAt: today, sha256 });
  const grid = parseSectionCss(s.css);
  const byId = Object.fromEntries(grid.blocks.map((b) => [b.id, b]));
  model[where].push({
    id: s.feId,
    theme: s.theme ? `theme-${s.theme}` : '',
    height: s.settings['section-height'] || 'medium',
    valign: s.settings['vertical-alignment'] || 'middle',
    contentWidth: s.settings['content-width'] || 'wide',
    halign: s.settings['horizontal-alignment'] || 'center',
    bgWidth: s.settings['background-width'] || 'full-bleed',
    ...(s.divider ? { divider: true } : {}),
    ...(s.settings['section-height'] === 'custom' && { customHeight: s.customHeight }),
    gap: grid.gap,
    ...(grid.rowGap != null && { rowGap: grid.rowGap }),
    rows: grid.rows,
    // Block order follows the oracle's DOM order (A2).
    blocks: s.blocks.map((b) => {
      const g = byId[b.id];
      if (!g) throw new Error(`block ${b.id}: in the DOM but not in the section CSS`);
      const content = b.kind === 'text' ? { type: 'text', html: b.html }
        : b.kind === 'button' ? { type: 'button', label: b.label, href: b.href, ...(b.fit ? { fit: true } : {}), ...(b.halign ? { halign: b.halign } : {}), ...(b.btnMobile ? { btnMobile: b.btnMobile } : {}) }
        : b.kind === 'shape' ? { type: 'shape', fill: b.fill || '#fff', radius: '0' }
        : b.kind === 'social-links' ? { type: 'social', count: b.count, align: b.align }
        : b.kind === 'image' ? { type: 'image', alt: b.alt, radius: b.radius }
        : b.kind === 'scrolling' ? { type: 'scrolling', text: b.text, size: b.size }
        : b.kind === 'form' ? { type: 'form', fields: b.fields, button: b.button }
        : { type: 'shape', fill: '#ccc', radius: '0', label: b.kind };
      return { id: b.id, ...content, layout: g.layout };
    }),
  });
}
writeFileSync(new URL('../fixtures/index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n');
writeFileSync(new URL(`../fixtures/oracle/${SLUG === 'demo' ? 'demo-page' : SLUG}.json`, import.meta.url), JSON.stringify({ capturedAt: today, source: model.source, ...snap }, null, 2) + '\n');
const header = `// Generated by scripts/oracle-import.mjs from ${model.source} on ${today}. Do not edit by hand.\n`;
if (SLUG === 'demo') writeFileSync(new URL('../app/src/demo-data.js', import.meta.url), `${header}export const DEMO = ${JSON.stringify(model, null, 2)};\n`);
else {
  mkdirSync(new URL('../app/src/pages/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`../app/src/pages/${SLUG}.js`, import.meta.url), `${header}export const PAGE = ${JSON.stringify(model, null, 2)};\n`);
}
console.log(`imported ${model.sections.length} sections, ${model.sections.reduce((n, s) => n + s.blocks.length, 0)} blocks; frame ${snap.frameWidth}px`);
console.log(JSON.stringify(snap.vars));
