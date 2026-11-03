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
  const wide = (act, icon, label, cls = '', text = label) => `<button type="button" class="sc-wide ${cls}" data-sc="${act}" aria-label="${label}"${cls.includes('sc-unbuilt') ? ' data-unbuilt' : ''}>${svg(ICON[icon])}<span>${text}</span></button>`;
  const sq = (act, icon, label, off) => `<button type="button" class="sc-sq${off ? ' is-off' : ''}" data-sc="${act}" aria-label="${label}" title="${label}">${svg(ICON[icon])}</button>`;
  return `<div class="sc-outline" data-sc-part="outline"></div>
    <div class="sc-pill" data-sc-part="layers"><button type="button" class="sc-left sc-layers" data-sc="layers" aria-label="Open Layers Panel" data-unbuilt>${svg(ICON.layers)}</button></div>
    <div class="sc-pill" data-sc-part="add-block"><button type="button" class="sc-left sc-add-block" data-sc="add-block" aria-label="Add Block">${svg(ICON.plus)}<span>Add Block</span></button></div>
    <div class="sc-card" data-sc-part="card">
      ${wide('edit', 'pencil', 'Edit Section')}
      ${wide('layouts', 'layouts', 'View Layouts', 'sc-unbuilt')}
      <div class="sc-row">${sq('duplicate', 'duplicate', 'Duplicate Section')}${sq('save', 'heart', 'Save Section').replace('class="sc-sq', 'data-unbuilt class="sc-sq')}${sq('up', 'up', 'Move Section Up', first)}${sq('down', 'down', 'Move Section Down', last)}</div>
      ${wide('remove', 'trash', 'Remove Section', 'sc-remove', 'Remove')}
    </div>
    <button type="button" class="sc-add-section" data-sc="add-section-above" data-sc-part="add-top" aria-label="Add Section" data-unbuilt>Add Section</button>
    <button type="button" class="sc-add-section" data-sc="add-section-below" data-sc-part="add-bottom" aria-label="Add Section" data-unbuilt>Add Section</button>`;
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

// The Edit Section panel (U9), drawn like the oracle's (parity/findings/PANEL.json,
// SETTINGS.json, screenshots in the gap review): text tabs with an underline, small grey
// group headings, one row per setting with its control on the right and a line under it,
// switches for Fill Screen and Divider, icon toggles for Gap and Alignment. The control hooks
// (data-sact, data-act) are the ones the editor and the checks already use.
const pi = (d, w = 20) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PI = {
  gapZero: '<rect x="5" y="5" width="14" height="14"/><path d="M12 5v14M5 12h14"/>',
  gapMedium: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
  more: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
  top: '<path d="M6 5h12"/><path d="M12 19V9"/><path d="M8.5 12.5L12 9l3.5 3.5"/>',
  middle: '<path d="M6 12h12"/><path d="M12 4v5"/><path d="M9.5 6.5L12 9l2.5-2.5"/><path d="M12 20v-5"/><path d="M9.5 17.5L12 15l2.5 2.5"/>',
  bottom: '<path d="M6 19h12"/><path d="M12 5v10"/><path d="M8.5 11.5L12 15l3.5-3.5"/>',
  none: '<circle cx="12" cy="12" r="7"/><path d="M7 17L17 7"/>',
  solid: '<path d="M5 12h14"/>',
  dashed: '<path d="M4 12h3M10.5 12h3M17 12h3"/>',
};
export function sectionPanelHtml(s, o) {
  const tab = (t) => `<button type="button" role="tab" class="sp-tab${t === o.tab ? ' is-on' : ''}" aria-selected="${t === o.tab}" data-sact="tab" data-v="${t}">${t}</button>`;
  const seg = (act, v, label, on, html = label) => `<button type="button" class="sp-seg${on ? ' is-on' : ''}" data-sact="${act}" data-v="${v}" aria-label="${label}" aria-pressed="${on}" title="${label}">${html}</button>`;
  const row = (label, control, cls = '') => `<div class="sp-row ${cls}"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;
  const sw = (act, on, label) => `<label class="sp-switch"><input type="checkbox" data-act="${act}" aria-label="${label}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const head = (t) => `<div class="sp-head">${t}</div>`;
  let body = '';
  if (o.tab === 'Design') {
    const gk = o.gapKind;
    body = head('Grid')
      + row('Row Count', `<input class="sp-num" type="number" data-act="rows" aria-label="Row Count" min="${o.minRows}" max="10000" value="${s.rows[o.bp]}">`)
      + row('Gap', seg('gap', 'zero', 'Zero gap', gk === 'zero', pi(PI.gapZero)) + seg('gap', 'medium', 'Medium gap', gk === 'medium', pi(PI.gapMedium)) + seg('gap', 'custom', 'Custom gap', gk === 'custom', pi(PI.more)))
      + (gk === 'custom' ? row('Column gap', `<input type="range" data-act="gap" aria-label="Column gap slider" min="0" max="50" value="${s.gap}"><span class="sp-val">${s.gap}</span>`) + row('Row gap', `<input type="range" data-act="rowGap" aria-label="Row gap slider" min="0" max="50" value="${s.rowGap ?? s.gap}"><span class="sp-val">${s.rowGap ?? s.gap}</span>`) : '')
      + head('Section')
      + row('Fill Screen', sw('fill', o.fill, 'Fill Screen'))
      + (o.fill ? row('Height', seg('height', 'small', 'S', s.height === 'small') + seg('height', 'medium', 'M', s.height === 'medium') + seg('height', 'large', 'L', s.height === 'large') + seg('height', 'custom', 'Custom height', s.height === 'custom', pi(PI.more)))
        + (s.height === 'custom' ? row('Custom height', `<input class="sp-num" type="number" data-act="customHeight" aria-label="Custom height" min="1" max="100" value="${s.customHeight}">`) : '')
        + row('Alignment', seg('valign', 'top', 'Vertical top', s.valign === 'top', pi(PI.top)) + seg('valign', 'middle', 'Vertical center', (s.valign || 'middle') === 'middle', pi(PI.middle)) + seg('valign', 'bottom', 'Vertical bottom', s.valign === 'bottom', pi(PI.bottom))) : '')
      + '<p class="sp-help">Fill screen will expand the background height to fill a portion of the user’s screen.</p>'
      + head('Styling')
      + row('Divider', sw('divider', !!s.divider, 'Divider'))
      + (s.divider ? row('Stroke', seg('dividerStroke', 'none', 'No stroke', s.dividerStroke === 'none', pi(PI.none)) + seg('dividerStroke', 'solid', 'Solid stroke', (s.dividerStroke || 'solid') === 'solid', pi(PI.solid)) + seg('dividerStroke', 'dashed', 'Dashed stroke', s.dividerStroke === 'dashed', pi(PI.dashed)))
        + row('Thickness', seg('dividerThickness', 'S', 'S', s.dividerThickness === 'S') + seg('dividerThickness', 'M', 'M', (s.dividerThickness || 'M') === 'M') + seg('dividerThickness', 'L', 'L', s.dividerThickness === 'L')) : '')
      + head('Anchor Link')
      + `<div class="sp-anchor"><span>#</span><input type="text" data-act="anchor" aria-label="Anchor Link" placeholder="Add name" value="${(s.anchor || '').replace(/"/g, '&quot;')}"></div>`;
  } else if (o.tab === 'Background') {
    body = row('Background Width', seg('bgWidth', 'full-bleed', 'Full Bleed', (s.bgWidth || 'full-bleed') === 'full-bleed') + seg('bgWidth', 'inset', 'Inset', s.bgWidth === 'inset'), 'sp-row-wide')
      + '<p class="sp-help">Background image, video and art are not built yet.</p>';
  } else {
    const cur = (s.theme || '').replace(/^theme-/, '');
    body = `<div class="sp-themes">${o.themes.map(([label, v]) => { const c = o.themeColors[v] || {}; return `<button type="button" class="sp-theme${cur === v ? ' is-on' : ''}" data-sact="theme" data-v="${v}" aria-label="${label}" aria-pressed="${cur === v}" style="background:${c.bg || '#fff'};color:${c.ink || '#000'}"><span class="sp-aa">Aa</span><span class="sp-tname">${label}</span></button>`; }).join('')}</div>`;
  }
  return `<div class="sp-tabs" role="tablist">${['Design', 'Background', 'Colors'].map(tab).join('')}</div><div class="sp-body">${body}</div>`;
}
