// E5: paste each sample from parity/findings/PASTE.json over the whole paragraph block in
// our editor (demo section 2, block 2) and compare the HTML with the oracle's result.
// Usage: npm run paste-check (dev server on 5178), under 2 min, writes nothing.
// npm run paste-check -- --full also replays the other pastes with real presses, about 3 min, and writes parity/paste-check.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { replay } from './lib/text-replay.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const FULL = process.argv.includes('--full');
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
// A paste into the middle of a paragraph (CAP-PASTEMID.json): the caret after "A " of the first paragraph.
{ const M = JSON.parse(readFileSync(new URL('../parity/findings/CAP-PASTEMID.json', import.meta.url))); const pastes = M.steps.filter((x) => x[0] === 'pasteMid').map((x) => x[3]); const names = Object.keys(M.reads);
  for (const [k, name] of names.entries()) {
    goto(S, `${BASE}/index.html`); await pause(2000);
    const html = evalJs(S, `(() => { const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
      fe.edit(s.id, b.id);
      const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
      const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content');
      const t = ce.querySelector('p').firstChild; const r = d.createRange(); const at = t.textContent.indexOf('1400px'); r.setStart(t, at); r.collapse(true); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(pastes[k])}); dt.setData('text/plain', 'x');
      ce.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      const out = ce.innerHTML; fe.finishEdit(); return JSON.stringify(out); })()`);
    const want = M.reads[name].html; const plainOurs = (h) => norm(h).replace(/<\/?span[^>]*>/g, '').replace(/style="[^"]*"/g, '').replace(/ +>/g, '>').replace(/ data-[a-z-]+="[^"]*"/g, '');
    const ok = plainOurs(html) === plainOurs(want);
    results.push({ name: `mid ${name}`, ok });
    console.log(`mid ${name}`.padEnd(13), ok ? 'match' : `DIFF\n  oracle ${plainOurs(want)}\n  ours   ${plainOurs(html)}`);
  } }
// Into a paragraph, all block kinds, and where the caret ends (PASTESPLIT.json).
{ const R = JSON.parse(readFileSync(new URL('../parity/findings/PASTESPLIT.json', import.meta.url))).reads;
  goto(S, `${BASE}/index.html`); await pause(2000);
  for (const [name, r] of Object.entries(R)) {
    const got = evalJs(S, `(() => { const s = fe.model.sections[2]; const b = s.blocks.find((x) => x.type === 'text' && x.html.includes('On desktop the smallest'));
      fe.edit(s.id, b.id);
      const f = document.getElementById('site-frame'); const d = f.contentDocument, W = f.contentWindow;
      const ce = d.querySelector('.fe-block[data-block-id="' + b.id + '"] .sqs-html-content'); const keep = ce.innerHTML;
      ce.innerHTML = '<p>AAAA BBBB</p>'; const c = d.createRange(); c.setStart(ce.firstChild.firstChild, 5); c.collapse(true); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(c);
      const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(r.paste)}); dt.setData('text/plain', 'x');
      ce.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      const now = W.getSelection(); const pre = d.createRange(); pre.selectNodeContents(ce); pre.setEnd(now.anchorNode, now.anchorOffset);
      const out = { html: ce.innerHTML, before: pre.toString().slice(-12), collapsed: now.isCollapsed }; ce.innerHTML = keep; fe.finishEdit(); return JSON.stringify(out); })()`);
    const plain = (h) => norm(h).replace(/<\/?span[^>]*>/g, '').replace(/style="[^"]*"/g, '').replace(/ +>/g, '>').replace(/ data-[a-z-]+="[^"]*"/g, '');
    const ok = plain(got.html) === plain(r.html) && got.before === r.beforeCaret && got.collapsed;
    results.push({ name: `split ${name}`, ok });
    if (!ok) console.log(`DIFF split ${name}\n  oracle ${r.html} | ${r.beforeCaret}\n  ours   ${plain(got.html)} | ${got.before}`);
  }
}
// Into a heading, a list item, a quote and monospace and over a selection, typing after, with real keys and
// presses. CAP-E5WHERE's selections held Shift, so they stop at its first pasteHere; CAP-E5WHERE2 has them.
for (const name of FULL ? ['CAP-E5HEAD', 'CAP-E5HEAD2', 'CAP-E5WHERE', 'CAP-E5WHERE2'] : ['CAP-E5HEAD']) {
  const f = JSON.parse(readFileSync(new URL(`../parity/findings/${name}.json`, import.meta.url)));
  const cut = name === 'CAP-E5WHERE' ? f.steps.findIndex((x) => x[0] === 'pasteHere') : f.steps.length;
  await replay(S, { ...f, steps: f.steps.slice(0, cut) }, (what, ok, d) => {
    results.push({ name: `${name} ${what}`, ok: !!ok });
    if (!ok) console.log(`DIFF ${name} ${what}\n  ${d}`);
  });
}
const pass = results.filter((r) => r.ok).length;
console.log(`Paste: ${pass} of ${results.length} samples match`);
if (FULL) writeFileSync(new URL('../parity/paste-check.json', import.meta.url), JSON.stringify({ check: 'paste cleanup HTML', pass, total: results.length, results }, null, 2) + '\n');
process.exit(pass === results.length ? 0 : 1);
