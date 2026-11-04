// E5: paste each sample from parity/findings/PASTE.json over the whole paragraph block in
// our editor (demo section 2, block 2) and compare the HTML with the oracle's result.
// Writes parity/paste-check.json. Usage: npm run paste-check (dev server on 5178).
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/PASTE.json', import.meta.url))).samples;
const norm = (h) => h.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space: ?pre-wrap;?"/g, '');

ensureVisible(S);
viewport(S, 1600, 945);
goto(S, `${BASE}/index.html`); await pause(1500);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
const results = [];
for (const [name, o] of Object.entries(F)) {
  if (!o.result) continue;
  goto(S, `${BASE}/index.html`); await pause(2000);
  const plain = name === 'plain text';
  const html = evalJs(S, `(() => { const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
    fe.edit(s.id, b.id);
    const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
    const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content');
    const r = d.createRange(); r.selectNodeContents(ce); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const dt = new W.DataTransfer();
    ${plain ? '' : `dt.setData('text/html', ${JSON.stringify(o.pasted)});`}
    dt.setData('text/plain', ${JSON.stringify(plain ? o.pasted : o.pasted.replace(/<[^>]+>/g, ' '))});
    ce.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const out = ce.innerHTML; fe.finishEdit(); return JSON.stringify(out); })()`);
  const ok = norm(html) === norm(o.result);
  results.push({ name, ok });
  console.log(name.padEnd(13), ok ? 'match' : `DIFF\n  oracle ${o.result}\n  ours   ${html}`);
}
const pass = results.filter((r) => r.ok).length;
console.log(`Paste: ${pass} of ${results.length} samples match`);
writeFileSync(new URL('../parity/paste-check.json', import.meta.url), JSON.stringify({ check: 'paste cleanup HTML', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
