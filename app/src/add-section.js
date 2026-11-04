// The Add a Section panel (U10, parity/findings/ADDSECTION.json), from Add Section on a
// section edge: a 1240 by 920 dialog over the dimmed editor with the heading Add a Section
// (28px, 33px in), a 253px list of 34px rows (Add Blank, Saved, then the template groups
// Introduce, Sell and Showcase with their categories, the current one dark and underlined),
// view buttons and Close at the top right. Add Blank works. The oracle's section templates are
// Squarespace content (O2), so the template area holds empty tiles marked as not built.
export const ADD_SECTION_GROUPS = [
  ['Introduce', ['Intro', 'About', 'Contact', 'Team', 'FAQs']],
  ['Sell', ['Products', 'Services', 'Group Events', 'Content & Memberships', 'Scheduling', 'Donations']],
  ['Showcase', ['Images', 'Portfolio', 'Testimonials', 'Videos', 'Calendar', 'Menus', 'Audio', 'Charts']],
];

const svg = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PLUS = '<path d="M12 5v14M5 12h14"/>';
const HEART = '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>';
const X = '<path d="M6 6l12 12M18 6L6 18"/>';

export function addSectionPanelHtml(current = 'Intro') {
  const item = (label, extra = '') => `<a href="#" class="as-item${label === current ? ' is-on' : ''}" data-as-cat="${label}" data-unbuilt aria-current="${label === current}">${label}</a>${extra}`;
  const groups = ADD_SECTION_GROUPS.map(([g, cats]) => `<div class="as-group">${g}</div>${cats.map((c) => item(c)).join('')}`).join('');
  const tiles = Array.from({ length: 4 }, (_, n) => `<div class="as-tile as-tile-${n % 2 ? 'tall' : 'wide'}" data-unbuilt></div>`).join('');
  return `<div class="as-dialog" role="dialog" aria-label="Add a Section">
    <h2 class="as-title">Add a Section</h2>
    <button type="button" class="as-close" data-as="close" aria-label="Close">${svg(X, 20)}</button>
    <div class="as-views" data-unbuilt title="Not built yet"><span class="as-view">${svg('<path d="M5 5h3v3H5zM10.5 5h3v3h-3zM16 5h3v3h-3zM5 10.5h3v3H5zM10.5 10.5h3v3h-3zM16 10.5h3v3h-3zM5 16h3v3H5zM10.5 16h3v3h-3zM16 16h3v3h-3z"/>')}</span><span class="as-view is-on">${svg('<path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/>')}</span><span class="as-view">${svg('<path d="M6 6h12v12H6z"/>')}</span></div>
    <nav class="as-nav">
      <a href="#" class="as-item as-blank" data-as="blank">${svg(PLUS)}Add Blank</a>
      <a href="#" class="as-item as-saved" data-unbuilt>${svg(HEART)}Saved</a>
      ${groups}
      <a href="#" class="as-classic" data-unbuilt role="button">Made with Classic Editor</a>
    </nav>
    <div class="as-templates" data-unbuilt title="Section templates are not built"><p class="as-note">Section templates are not built yet. Add Blank adds an empty section.</p><div class="as-grid">${tiles}</div></div>
  </div>`;
}

// A blank section as the oracle's Add Blank made it (ADDSECTION.json): no theme, medium height,
// 8 rows, no blocks. The phone row count and the gap were not measured: 8 rows and the gap
// most demo sections use.
export function blankSection(id) {
  return { id, theme: '', height: 'medium', valign: 'middle', contentWidth: 'wide', halign: 'center', gap: 11, rows: { mobile: 8, desktop: 8 }, blocks: [] };
}
