// The Site Styles views oracle-readback.mjs walks, and how it reads one. Row names are matched whole, or with the
// row's value after them, so a preview that starts with the same word is not a row.
export const VIEWS = {
  Fonts: ['Headings', 'Paragraphs', 'Buttons', 'Miscellaneous'],
  Buttons: ['Primary Button', 'Secondary Button', 'Tertiary Button'],
  Forms: ['Effects', 'Selection Options', 'Fonts', 'Colors', 'Form Spacing'],
  Miscellaneous: ['Spacing', 'Animations', 'Image Blocks'],
};

// Every control in the panel: label, words, input value, state, swatch color.
export const READ_VIEW = `(() => { const out = []; for (const e of document.querySelectorAll('button,input,select,textarea,[role=radio],[role=switch],[role=tab],[role=slider]')) { const r = (e.closest('label') || e).getBoundingClientRect(); if (r.left < 1282 || r.width === 0 || r.top < 50) continue; const dot = [...e.querySelectorAll('*')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 10 && q.width < 30 && q.height === q.width; }).map((x) => getComputedStyle(x).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)')[0] || ''; out.push([e.getAttribute('aria-label') || '', (e.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60), e.tagName === 'INPUT' ? e.type + ':' + (e.type === 'checkbox' ? e.checked : e.value) : '', (e.checked && e.type !== 'checkbox' ? 'checked' : '') + (e.getAttribute('aria-checked') || '') + (e.getAttribute('aria-pressed') || '') + (e.getAttribute('aria-selected') || ''), dot]); } return JSON.stringify(out); })()`;
