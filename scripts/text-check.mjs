// E4: apply each text toolbar action in our editor to the first word of the paragraph the
// oracle probe used (demo section 2, block 2) and compare the HTML with
// parity/findings/TEXTOPS.json. Writes parity/text-check.json.
// Usage: npm run text-check (dev server on 5178, FLUID_SURFACE a visible tab).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/TEXTOPS.json', import.meta.url)));
// Our button for each oracle action. Monospace and the styles go through the Text Style select.
const OURS = { 'Heading 1': ['style', 'h1'], 'Heading 2': ['style', 'h2'], 'Heading 3': ['style', 'h3'], 'Heading 4': ['style', 'h4'], 'Paragraph 1': ['style', 'p.sqsrte-large'],
  'Paragraph 3': ['style', 'p.sqsrte-small'], Monospace: ['style', 'pre'], Bold: ['bold'], Italic: ['italic'], Strike: ['strike'], Quote: ['quote'], 'Bullet List': ['bullet'],
  'Numbered List': ['numbered'], Indent: ['indent'], 'Align center': ['align:center'], 'Align right': ['align:right'], 'Align justify': ['align:justify'] };
// Attribute noise that carries no formatting: the editor's pre-wrap and empty markers.
const norm = (h) => h.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space: ?pre-wrap;?"/g, '').replace(/\s+/g, ' ').trim();

ensureVisible(S);
viewport(S, 1600, 945);
const results = [];
for (const [name, [act, value]] of Object.entries(OURS)) {
  const o = F[name];
  if (!o?.html) { results.push({ name, ok: false, why: 'no oracle reading' }); continue; }
  goto(S, 'http://127.0.0.1:5178/index.html?replay'); await pause(1500);
  evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
  goto(S, 'http://127.0.0.1:5178/index.html'); await pause(2200);
  const html = evalJs(S, `(() => { const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
    fe.edit(s.id, b.id);
    const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const t = ce.querySelector('p').firstChild;
    const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    ${act === 'style' ? `const el = document.querySelector('#panel select[data-fmt="style"]'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true }));` : `document.querySelector('#panel button[data-fmt="${act}"]').click();`}
    return JSON.stringify(ce.innerHTML); })()`);
  const ok = norm(html) === norm(o.html.replace(/…$/, ''));
  results.push({ name, ok });
  console.log(name.padEnd(14), ok ? 'match' : `DIFF\n  oracle ${norm(o.html).slice(0, 220)}\n  ours   ${norm(html).slice(0, 220)}`);
}
const pass = results.filter((r) => r.ok).length;
console.log(`Text toolbar: ${pass} of ${results.length} actions match`);
writeFileSync(new URL('../parity/text-check.json', import.meta.url), JSON.stringify({ check: 'text toolbar HTML', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
