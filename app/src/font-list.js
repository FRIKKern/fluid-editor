// The font list under a Font row (U12, parity/findings/CAP-U12FONTLIST.json). Boxes, heads, names and order are read; nothing in it was picked, since
// Site Styles is read only. Inferred: a press stores the name and the list stays open, as Shape's does; Search filters by the words; In Use holds what the
// rows use. The oracle draws each name as a picture of its own font; ours draws it as text in that font, loaded when its row comes into view.
import { FONT_GROUPS, OTHER_FONTS } from './font-names.js';
import { fontFamilyCss, fontName, isFontStack, pickedFonts, resolveSiteStyles } from './site-style-packs.js';

const GLOBE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3.6 6 3.6 9s-.6 6-3.6 9c-3-3-3.6-6-3.6-9S9 6 12 3z"/></svg>';
const UPLOAD = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h14M12 21V8M6.5 13.5L12 8l5.5 5.5"/></svg>';
const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4.5 4.5L19 7"/></svg>';

// The list stops short of the window's bottom by 38 (read at window 1000 only).
const LIST_HEIGHT = 550;
export const fontListTop = (rowBottom, windowHeight) => Math.min(rowBottom, windowHeight - LIST_HEIGHT - 38);

export function fontInRow(styles, key) {
  const pack = resolveSiteStyles(styles).font;
  return styles?.type?.[key]?.family || (key === 'h' ? pack?.h : pack?.p) || 'Poppins';
}
const inUse = (styles) => [...new Set([...pickedFonts(styles), ...['h', 'p'].map((k) => fontInRow(styles, k))])];

const row = (f, now) => `<button type="button" class="ss-fl-row${f === now ? ' is-on' : ''}" data-ss-font="${f.replace(/"/g, '&quot;')}" aria-label="${fontName(f)}" aria-pressed="${f === now}"${isFontStack(f) ? ` style="font-family:${fontFamilyCss(f).replace(/"/g, '&quot;')}"` : ''}><span>${fontName(f)}</span>${f === now ? CHECK : ''}</button>`;
const group = (head, names, now) => (names.length ? `<h3 class="ss-fl-h">${head}</h3>${names.map((f) => row(f, now)).join('')}` : '');

export function fontRowsHtml(styles, key, query = '') {
  const now = fontInRow(styles, key), q = query.trim().toLowerCase(), hit = (f) => !q || fontName(f).toLowerCase().includes(q);
  const use = q ? '' : `${group('In Use', inUse(styles), now)}<p class="ss-fl-note">Fewer fonts, faster site. <span data-unbuilt>Learn More</span></p>`;
  return use + FONT_GROUPS.map(([h, names]) => group(h, names.filter(hit), now)).join('') + group('Other', OTHER_FONTS.filter(hit), now);
}

export function fontListHtml(styles, key, query = '') {
  return `<div class="ss-fl-top"><label class="ss-fl-search"><input type="text" aria-label="Search all fonts" placeholder="Search all fonts" value="${query.replace(/"/g, '&quot;')}"><button type="button" class="ss-fl-i" aria-label="Filter by language or script" data-unbuilt>${GLOBE}</button></label><button type="button" class="ss-fl-i ss-fl-up" aria-label="Upload and manage custom fonts" data-unbuilt>${UPLOAD}</button></div>
  <div class="ss-fl-scroll">${fontRowsHtml(styles, key, query)}</div>`;
}
// A name's own font, for its row only: just the letters it needs, when its row comes into view.
const asked = new Set();
export function watchFontRows(host) {
  const seen = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      seen.unobserve(target);
      const f = target.dataset.ssFont;
      if (isFontStack(f)) continue;
      target.style.fontFamily = fontFamilyCss(f);
      if (asked.has(f)) continue;
      asked.add(f);
      const n = fontName(f);
      document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=${n.replace(/ /g, '+')}&text=${encodeURIComponent(n)}&display=swap">`);
    }
  }, { root: host });
  host.querySelectorAll('.ss-fl-row').forEach((e) => seen.observe(e));
  return seen;
}
