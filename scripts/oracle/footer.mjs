// The site footer is site-wide: a stray press once opened it for editing (2026-11-07). oracle-readback reads it on
// fresh loads of the pages in FOOTER_PATHS and compares with this base, so a change shows as a diff, not by eye.
import { readFileSync } from 'node:fs';
import { GESTURES_PROBE } from '../lib/oracle-site.mjs';

export const FOOTER_FILE = new URL('../../parity/findings/CAP-FOOTER.json', import.meta.url);
export const FOOTER_PATHS = ['/', GESTURES_PROBE.path];
export const FOOTER = (() => { try { return JSON.parse(readFileSync(FOOTER_FILE, 'utf8')); } catch { return { reads: {} }; } })();

// Read in the page or its edit frame. Emails come out as "(an email)" and no link targets are kept (O2).
export const FOOTER_READ = `(() => {
  const f = document.getElementById('sqs-site-frame'), d = f ? f.contentDocument : document, W = f ? f.contentWindow : window;
  const ft = d && d.querySelector('footer');
  if (!ft || !ft.querySelector('.fe-block')) return JSON.stringify(null);
  const clean = (s) => s.replace(/\\s+/g, ' ').trim().replace(/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g, '(an email)');
  const kind = (b) => ((b.querySelector('.sqs-block') || {}).className || '').split(/\\s+/).filter((c) => /^sqs-block-/.test(c) && c !== 'sqs-block-content').map((c) => c.slice(10)).join(' ');
  const social = [...ft.querySelectorAll('.fe-block')].filter((b) => /social/.test(kind(b)));
  return JSON.stringify({
    sections: ft.querySelectorAll('section, .page-section').length,
    blocks: [...ft.querySelectorAll('.fe-block')].map((b) => [kind(b), W.getComputedStyle(b).gridArea, clean(b.innerText || '')]),
    links: [...ft.querySelectorAll('a')].map((a) => clean(a.getAttribute('aria-label') || a.textContent || '')).filter(Boolean),
    social: social.flatMap((b) => [...b.querySelectorAll('a')].map((a) => a.getAttribute('aria-label') || '')),
    text: clean(ft.innerText || ''),
  });
})()`;

// Every field of every page, against the base. A missing read is a diff, never a pass.
export function compareFooter(path, read) {
  const want = FOOTER.reads[path];
  if (!want) return [`footer ${path}: no base stored`];
  if (!read) return [`footer ${path}: nothing read`];
  const out = [];
  for (const k of ['sections', 'text']) if (read[k] !== want[k]) out.push(`footer ${path} ${k}: ${JSON.stringify(read[k])}, base ${JSON.stringify(want[k])}`);
  for (const k of ['links', 'social']) if (JSON.stringify(read[k]) !== JSON.stringify(want[k])) out.push(`footer ${path} ${k}: ${JSON.stringify(read[k])}, base ${JSON.stringify(want[k])}`);
  const n = Math.max(read.blocks?.length || 0, want.blocks.length);
  for (let i = 0; i < n; i++) {
    const a = read.blocks?.[i], b = want.blocks[i];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`footer ${path} block ${i}: ${JSON.stringify(a)}, base ${JSON.stringify(b)}`);
  }
  return out;
}
