// Section chrome (U9, U10), measured on the oracle at a 1600 by 1000 window
// (parity/findings/SECTIONBAR.json). Positions are relative to the section's top left in the
// page, in px:
//   outline       3px solid #4894ff around the hovered section
//   left          Layers 38 by 36 at (26, 25.1), Add Block 129.6 by 36 at (83, 25.1); white,
//                 #313131, 3px radius, label 12px 500 uppercase; each in a white box 4px larger
//                 on every side with an 8px radius and shadows 0 4px 16px rgba(0,0,0,.12) and
//                 0 0 0 1px rgba(0,0,0,.02)
//   card          178 by 210 at (1383, 21.1) on a 1583px section, so 22px from its right edge;
//                 white, 6px radius, 1px #e7e7e7 border, 6px padding, shadows
//                 0 6px 24px rgba(0,0,0,.12) and 0 0 1px rgba(0,0,0,.08); inside, 164 by 44
//                 buttons Edit Section, View Layouts, a row of four 36px icons (Duplicate, Save
//                 Section, Move Up, Move Down) and Remove Section (#c32d38); 12px 500 0.5px
//                 uppercase, 1px #e7e7e7 borders, 3px radius; Move Up off on the first section,
//                 Move Down off on the last
//   add section   111.1 by 36, centered on the top and the bottom edge; #027aff, white text,
//                 1px #4894ff border, 6px radius
//   header        on the first section everything, the top Add Section too, sits below the
//                 site header
//   scrolled      when the section top is above the canvas, the card sticks 51.2px and the left
//                 buttons 48.2px below the canvas top (one sample)
//   panel         Edit Section opens a 320 by 476 panel 342px from the window's right edge,
//                 white, 8px radius, shadows 0 16px 64px rgba(0,0,0,.12) and 0 0 1px
//                 rgba(0,0,0,.08). Its top follows the section; the exact rule is not measured,
//                 ours aligns it with the card and keeps it in the window.

const svg = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  layers: '<path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  layouts: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M10 4v16M10 12h10"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  trash: '<path d="M4 6h16"/><path d="M9 6V4h6v2"/><path d="M6 6l1 14h10l1-14"/>',
};

export function sectionChromeHtml({ first, last }) {
  const wide = (act, icon, label, cls = '', text = label) => `<button type="button" class="sc-wide ${cls}" data-sc="${act}" aria-label="${label}">${svg(ICON[icon])}<span>${text}</span></button>`;
  const sq = (act, icon, label, off) => `<button type="button" class="sc-sq${off ? ' is-off' : ''}" data-sc="${act}" aria-label="${label}" title="${label}">${svg(ICON[icon])}</button>`;
  return `<div class="sc-outline" data-sc-part="outline"></div>
    <div class="sc-pill" data-sc-part="layers"><button type="button" class="sc-left sc-layers" data-sc="layers" aria-label="Open Layers Panel">${svg(ICON.layers)}</button></div>
    <div class="sc-pill" data-sc-part="add-block"><button type="button" class="sc-left sc-add-block" data-sc="add-block" aria-label="Add Block">${svg(ICON.plus)}<span>Add Block</span></button></div>
    <div class="sc-card" data-sc-part="card">
      ${wide('edit', 'pencil', 'Edit Section')}
      ${wide('layouts', 'layouts', 'View Layouts')}
      <div class="sc-row">${sq('duplicate', 'duplicate', 'Duplicate Section')}${sq('save', 'heart', 'Save Section')}${sq('up', 'up', 'Move Section Up', first)}${sq('down', 'down', 'Move Section Down', last)}</div>
      ${wide('remove', 'trash', 'Remove Section', 'sc-remove', 'Remove')}
    </div>
    <button type="button" class="sc-add-section" data-sc="add-section-above" data-sc-part="add-top" aria-label="Add Section">Add Section</button>
    <button type="button" class="sc-add-section" data-sc="add-section-below" data-sc-part="add-bottom" aria-label="Add Section">Add Section</button>`;
}

// Boxes in the stage's coordinates. `sec` is the section's rect inside the canvas, `frame`
// and `stage` are rects in the editor window, `headerBottom` the site header's bottom in the
// canvas on the first section (0 otherwise).
export function sectionChromeLayout(sec, frame, stage, headerBottom) {
  const ox = frame.left - stage.left, oy = frame.top - stage.top;
  const top = Math.max(sec.top, headerBottom);
  const cardTop = Math.min(Math.max(top + 21.1, 51.2), sec.bottom - 210);
  const leftTop = Math.min(Math.max(top + 25.1, 48.2), sec.bottom - 36);
  const midX = sec.left + sec.width / 2 - 111.1 / 2;
  return {
    outline: { left: ox + sec.left, top: oy + sec.top, width: sec.width, height: sec.height },
    // The two left buttons sit 4px inside their white boxes.
    layers: { left: ox + sec.left + 22, top: oy + leftTop - 4 },
    'add-block': { left: ox + sec.left + 79, top: oy + leftTop - 4 },
    card: { left: ox + sec.right - 22 - 178, top: oy + cardTop },
    'add-top': { left: ox + midX, top: oy + Math.max(sec.top, headerBottom) - 18 },
    'add-bottom': { left: ox + midX, top: oy + sec.bottom - 18 },
  };
}

export function sectionPanelTop(cardTop, windowHeight) {
  return Math.max(0, Math.min(cardTop, windowHeight - 476));
}
