// The Site Styles views oracle-readback.mjs walks, and how it reads one. Row names are matched whole, or with the
// row's value after them, so a preview that starts with the same word is not a row.
export const VIEWS = {
  Fonts: ['Headings', 'Paragraphs', 'Buttons', 'Miscellaneous', 'Assign Styles'],
  Buttons: ['Primary Button', 'Secondary Button', 'Tertiary Button'],
  Forms: ['Effects', 'Selection Options', 'Fonts', 'Colors', 'Form Spacing'],
  Miscellaneous: ['Spacing', 'Animations', 'Image Blocks'],
};
// Forms' site-wide values that only show one row further down.
export const DEEP = {
  'Forms > Fonts': ['Title', 'Description', 'Caption', 'Input', 'Placeholder', 'Select Dropdown', 'Option', 'Survey Title'],
  'Forms > Selection Options': ['Checkbox', 'Radio', 'Survey'],
  'Fonts > Assign Styles': ['Site Title'],
};
// The words on the back button in those views. Selection Options calls itself Field Options.
export const DEEP_BACK = { 'Forms > Fonts': 'Fonts', 'Forms > Selection Options': 'Field Options', 'Fonts > Assign Styles': 'Assign Styles' };
// Lists that are closed until pressed, read in that view and closed again. Combos: every list row. Shape: the row with the
// Fill, No fill and tiles popover. Family: the font list. A pick from any of them would write: none is pressed.
export const LISTS = {
  'Fonts > Headings': { combos: true, family: 'all' },
  'Fonts > Paragraphs': { combos: true, family: 'top' },
  'Fonts > Assign Styles > Site Title': { combos: true },
  'Buttons > Primary Button': { shape: 'Shape' },
  'Buttons > Secondary Button': { shape: 'Shape' },
  'Buttons > Tertiary Button': { shape: 'Shape' },
  Forms: { shape: 'Field Shape' },
};

// Every control in the panel: label, words, input value, state, swatch color, first border color (a tile that is on has a black one).
// Last, every word in the panel: some values, like a form font's Style, sit in plain text, not in a control.
export const READ_VIEW = `(() => { const out = []; for (const e of document.querySelectorAll('button,input,select,textarea,[role=radio],[role=switch],[role=tab],[role=slider]')) { const r = (e.closest('label') || e).getBoundingClientRect(); if (r.left < 1282 || r.width === 0 || r.top < 50) continue; const dot = [...e.querySelectorAll('*')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 10 && q.width < 30 && q.height === q.width; }).map((x) => getComputedStyle(x).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)')[0] || ''; const edge = [e, ...e.querySelectorAll('*')].map((x) => getComputedStyle(x)).find((c) => c.borderTopWidth !== '0px'); out.push([e.getAttribute('aria-label') || '', (e.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60), e.tagName === 'INPUT' ? e.type + ':' + (e.type === 'checkbox' ? e.checked : e.value) : '', (e.checked && e.type !== 'checkbox' ? 'checked' : '') + (e.getAttribute('aria-checked') || '') + (e.getAttribute('aria-pressed') || '') + (e.getAttribute('aria-selected') || ''), dot, edge ? edge.borderTopColor : '']); } const words = [...document.querySelectorAll('body *')].filter((x) => { if (x.childElementCount || !x.textContent.trim()) return false; const r = x.getBoundingClientRect(); return r.left >= 1282 && r.width > 0 && r.top >= 50; }).map((x) => x.textContent.trim()); out.push(['all words', words.join(' | ').slice(0, 1500), '', '', '', '']); return JSON.stringify(out); })()`;
