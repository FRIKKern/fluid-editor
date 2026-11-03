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
const surface = args.includes('--surface') ? args[args.indexOf('--surface') + 1] : 'surface:40';
const HOST = 'halibut-keyboard-jlhd.squarespace.com';
const PAGE = '/how-fluid-engine-works';
const today = new Date().toISOString().slice(0, 10);

const READ = `(() => {
  const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;
  if (d.querySelector('.fluid-engine.is-editing')) return JSON.stringify({ error: 'the editor is in edit mode; exit edit mode first' });
  const root = W.getComputedStyle(d.documentElement);
  const vars = {};
  for (const k of ['--heading-1-size-value', '--heading-2-size-value', '--heading-3-size-value', '--heading-4-size-value', '--normal-text-size-value', '--large-text-size-value', '--small-text-size-value', '--maxPageWidth', '--heading-font-line-height', '--body-font-line-height', '--heading-font-letter-spacing', '--body-font-letter-spacing', '--heading-font-font-weight', '--body-font-font-weight', '--sqs-site-gutter', '--sqs-mobile-site-gutter', '--sqs-site-max-width']) vars[k] = root.getPropertyValue(k).trim();
  const pick = (el, props) => { if (!el) return null; const c = W.getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c[p]])); };
  const T = ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight', 'marginTop', 'marginBottom', 'color', 'textTransform'];
  const sections = [...d.querySelectorAll('main#page .page-section')].map((s) => {
    const fe = s.querySelector('.fluid-engine');
    const feClass = [...fe.classList].find((c) => /^fe-[\\w-]+$/.test(c));
    const style = [...s.querySelectorAll('style')].map((x) => x.textContent).find((t) => t.includes('--grid-gutter') && t.includes('.' + feClass + ' {'));
    const blocks = [...fe.querySelectorAll(':scope > .fe-block')].map((b) => {
      const kind = b.querySelector('[data-sqsp-block]')?.dataset.sqspBlock || 'unknown';
      const out = { id: [...b.classList].find((c) => c.startsWith('fe-block-')).slice(9), kind };
      if (kind === 'text') out.html = b.querySelector('.sqs-html-content')?.innerHTML.trim() || '';
      if (kind === 'button') { const a = b.querySelector('a, button'); out.label = a?.textContent.trim(); out.href = a?.getAttribute('href') || '#'; out.style = pick(a, ['backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'height', 'width']); out.align = W.getComputedStyle(b.querySelector('.sqs-block-content') || b).textAlign; }
      if (kind === 'shape') { const p = b.querySelector('svg path, svg rect, svg circle, svg polygon'); out.fill = p ? W.getComputedStyle(p).fill : null; out.svg = (b.querySelector('svg')?.outerHTML || '').length; }
      return out;
    });
    const sc = W.getComputedStyle(s);
    const fr = fe.getBoundingClientRect();
    return {
      sectionId: s.dataset.sectionId, feId: feClass.slice(3), theme: s.dataset.sectionTheme, css: style || null,
      settings: Object.fromEntries([...s.classList].map((c) => c.match(/^(section-height|vertical-alignment|content-width|horizontal-alignment|background-width)--(.+)$/)).filter(Boolean).map((m) => [m[1], m[2]])),
      section: { paddingTop: sc.paddingTop, paddingBottom: sc.paddingBottom, minHeight: sc.minHeight, background: W.getComputedStyle(s.querySelector('.section-background') || s).backgroundColor, inlineStyle: s.getAttribute('style') },
      grid: { left: fr.left, width: fr.width },
      text: { h1: pick(s.querySelector('h1'), T), h2: pick(s.querySelector('h2'), T), p: pick(s.querySelector('.sqs-html-content p'), T) },
      blocks,
    };
  });
  return JSON.stringify({ frameWidth: W.innerWidth, frameHeight: W.innerHeight, vars, sections });
})()`;

const snap = evalJs(surface, READ);
if (snap.error) throw new Error(snap.error);
if (!snap.sections.length) throw new Error('no sections found on the page');

mkdirSync(new URL('../fixtures/oracle/', import.meta.url), { recursive: true });
const index = JSON.parse(readFileSync(new URL('../fixtures/index.json', import.meta.url), 'utf8')).filter((f) => !f.url.startsWith(`https://${HOST}${PAGE}`));
const model = { version: 1, title: 'How Fluid Engine works', source: `https://${HOST}${PAGE}`, capturedAt: today, sections: [] };
for (const s of snap.sections) {
  if (!s.css) throw new Error(`section ${s.sectionId}: no published section CSS found`);
  const sha256 = createHash('sha256').update(s.css).digest('hex');
  const file = `css/${HOST}--${s.feId}.css`;
  writeFileSync(new URL(`../fixtures/${file}`, import.meta.url), s.css);
  index.push({ file, url: `https://${HOST}${PAGE}`, sectionId: s.feId, capturedAt: today, sha256 });
  const grid = parseSectionCss(s.css);
  const byId = Object.fromEntries(grid.blocks.map((b) => [b.id, b]));
  model.sections.push({
    id: s.feId,
    theme: s.theme ? `theme-${s.theme}` : '',
    height: s.settings['section-height'] || 'medium',
    valign: s.settings['vertical-alignment'] || 'middle',
    contentWidth: s.settings['content-width'] || 'wide',
    halign: s.settings['horizontal-alignment'] || 'center',
    gap: grid.gap,
    ...(grid.rowGap != null && { rowGap: grid.rowGap }),
    rows: grid.rows,
    // Block order follows the oracle's DOM order (A2).
    blocks: s.blocks.map((b) => {
      const g = byId[b.id];
      if (!g) throw new Error(`block ${b.id}: in the DOM but not in the section CSS`);
      const content = b.kind === 'text' ? { type: 'text', html: b.html }
        : b.kind === 'button' ? { type: 'button', label: b.label, href: b.href }
        : b.kind === 'shape' ? { type: 'shape', fill: b.fill || '#fff', radius: '0' }
        : { type: 'shape', fill: '#ccc', radius: '0', label: b.kind };
      return { id: b.id, ...content, layout: g.layout };
    }),
  });
}
writeFileSync(new URL('../fixtures/index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n');
writeFileSync(new URL('../fixtures/oracle/demo-page.json', import.meta.url), JSON.stringify({ capturedAt: today, source: model.source, ...snap }, null, 2) + '\n');
writeFileSync(new URL('../app/src/demo-data.js', import.meta.url), `// Generated by scripts/oracle-import.mjs from ${model.source} on ${today}. Do not edit by hand.\nexport const DEMO = ${JSON.stringify(model, null, 2)};\n`);
console.log(`imported ${model.sections.length} sections, ${model.sections.reduce((n, s) => n + s.blocks.length, 0)} blocks; frame ${snap.frameWidth}px`);
console.log(JSON.stringify(snap.vars));
