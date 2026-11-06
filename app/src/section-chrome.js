import { artRowsHtml, artImagesTop, artImagesRows } from './section-art-rows.js';
import { ART, DIVIDER_FLIPS, DIVIDER_SHAPES, DIVIDER_SHAPE_NAMES, DIVIDER_WIDTHS, DIVIDER_HEIGHTS, artCss, artDefaults } from './render.js';

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
//   scrolled      when the section top is above the canvas, the card sticks 21.3px and the left
//                 boxes 21.3px below the canvas top; neither stops at the section's bottom
//   panel         Edit Section opens a 320 by 476 panel 342px from the window's right edge,
//                 white, 8px radius, shadows 0 16px 64px rgba(0,0,0,.12) and 0 0 1px
//                 rgba(0,0,0,.08). sectionPanelTop holds where its top goes.

const svg = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
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

// mode 'phone': no Add Block and no View Layouts (the oracle's phone view). blockSelected: only
// the outline and Layers stay, as on the oracle while a block of the section is selected.
export function sectionChromeHtml({ first, last, phone = false, blockSelected = false, layouts = false }) {
  const wide = (act, icon, label, cls = '', text = label) => `<button type="button" class="sc-wide ${cls}" data-sc="${act}" aria-label="${label}"${cls.includes('sc-unbuilt') ? ' data-unbuilt aria-disabled="true"' : ''}>${svg(ICON[icon])}<span>${text}</span></button>`;
  const sq = (act, icon, label, off) => `<button type="button" class="sc-sq${off ? ' is-off' : ''}" data-sc="${act}" aria-label="${label}" title="${label}">${svg(ICON[icon])}</button>`;
  // Parts are dropped line by line below, so each part stays on one line.
  return `<div class="sc-outline" data-sc-part="outline"></div>
    <div class="sc-pill" data-sc-part="layers"><button type="button" class="sc-left sc-layers" data-sc="layers" aria-label="Open Layers Panel">${svg(ICON.layers)}</button></div>
    ${blockSelected ? '' : '<div class="sc-rows" data-sc-part="rows" role="button" aria-label="Drag to change the row count" title="Drag to add or remove rows"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/></svg></div>'}
    <div class="sc-pill" data-sc-part="add-block"><button type="button" class="sc-left sc-add-block" data-sc="add-block" aria-label="Add Block">${svg(ICON.plus)}<span>Add Block</span></button></div>
    <div class="sc-card" data-sc-part="card">${wide('edit', 'pencil', 'Edit Section')}${phone ? '' : wide('layouts', 'layouts', 'View Layouts', layouts ? '' : 'sc-unbuilt')}<div class="sc-row">${sq('duplicate', 'duplicate', 'Duplicate Section')}${sq('save', 'heart', 'Save Section')}${sq('up', 'up', 'Move Section Up', first)}${sq('down', 'down', 'Move Section Down', last)}</div>${wide('remove', 'trash', 'Remove Section', 'sc-remove', 'Remove')}</div>
    <button type="button" class="sc-add-section" data-sc="add-section-above" data-sc-part="add-top" aria-label="Add Section">Add Section</button>
    <button type="button" class="sc-add-section" data-sc="add-section-below" data-sc-part="add-bottom" aria-label="Add Section">Add Section</button>`
    .split('\n').filter((line) => !(blockSelected && /data-sc-part="(card|add-block|add-top|add-bottom)"/.test(line)) && !(phone && /data-sc-part="add-block"/.test(line))).join('\n')
    .replace('class="sc-card"', `class="sc-card${phone ? ' is-phone' : ''}"`);
}

// Boxes in the stage's coordinates. `sec` is the section's rect inside the canvas, `frame`
// and `stage` are rects in the editor window, `headerBottom` the site header's bottom in the
// canvas on the first section (0 otherwise).
export function sectionChromeLayout(sec, frame, stage, headerBottom, phone = false, grid = null, drift = [0, 0]) {
  const ox = frame.left - stage.left, oy = frame.top - stage.top;
  if (phone) {
    // Phone view (oracle screenshot): the canvas is 428 wide in the middle; Layers sits 68px left
    // of it and the card 22px right of it, both at the same height as on desktop.
    const top = Math.max(sec.top, headerBottom);
    const cardTop = Math.max(top, 0) + 21.3;
    const midX = sec.left + sec.width / 2 - 111.1 / 2;
    return {
      outline: { left: ox + sec.left, top: oy + sec.top, width: sec.width, height: sec.height },
      layers: { left: ox - 68, top: oy + Math.max(top, 0) + 21.3 },
      card: { left: ox + frame.width + 22, top: oy + cardTop },
      'add-top': { left: ox + midX, top: oy + Math.max(sec.top, headerBottom) - 18 },
      'add-bottom': { left: ox + midX, top: oy + sec.bottom - 18 },
      // The row handle on phones (CAP-S4PHONE.json): 340 from the left of the 428 canvas.
      ...(grid ? { rows: { left: ox + grid.right - 88, top: oy + grid.bottom - 16 } } : {}),
    };
  }
  const top = Math.max(sec.top, headerBottom);
  // 21.3 below the section's top or the canvas's top, whichever is lower, and past the section's
  // bottom if it comes to that (parity/findings/SECTIONBAR.json, sticky). The oracle lands on whole
  // pixels, so its Edit Section reads 27.5 to 29.2 below the top depending on the section.
  const cardTop = Math.max(top, 0) + 21.3;
  const leftTop = Math.max(top, 0) + 25.3;
  const midX = sec.left + sec.width / 2 - 111.1 / 2;
  return {
    outline: { left: ox + sec.left, top: oy + sec.top, width: sec.width, height: sec.height },
    // The two left buttons sit 4px inside their white boxes.
    layers: { left: ox + sec.left + 22, top: oy + leftTop - 4 },
    'add-block': { left: ox + sec.left + 79, top: oy + leftTop - 4 },
    card: { left: ox + sec.right - 22 - 178, top: oy + cardTop },
    'add-top': { left: ox + midX, top: oy + Math.max(sec.top + drift[0], headerBottom) - 18 },
    'add-bottom': { left: ox + midX, top: oy + sec.bottom + drift[1] - 18 },
    // The row handle (S4, parity/findings/S4.json): 44 by 33, its left 272px in from the grid's
    // right edge (1311 in a 1583px grid), centred on the grid's bottom edge.
    ...(grid ? { rows: { left: ox + grid.right - 272, top: oy + grid.bottom - 16 } } : {}),
  };
}

// Where Edit Section's panel sits, in window coordinates (parity/findings/SECTIONBAR.json, panelTop).
// edit is the top of the Edit Section button, H the window height. On opening: 49px under the button
// while the panel ends 170px above the window's bottom; then H - 520 until the section's top catches
// up; then held at H - 476, with the panel hanging out of the window once the button is low enough.
// prev is the panel's place while it stays open: it comes along when the button moves down.
export function sectionPanelTop({ edit, H, secTop, secBottom, prev = null }) {
  let p;
  if (prev != null) p = Math.max(prev, Math.min(edit - 3, H - 476));
  else if (edit + 49 + 476 <= H - 170) p = edit + 49;
  else if (edit < H - 240) p = Math.min(H - 476, Math.max(H - 520, secTop + 1));
  else p = H - 267 + 1.087 * (edit - (H - 240));
  // It stays inside its section, but never above the section's top or the window's.
  const inside = secBottom + 1 - 476;
  return p > inside ? Math.max(secTop, 0, inside) : p;
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
  plus: '<path d="M12 5v14M5 12h14"/>',
  shuffle: '<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 5l2 2-2 2M18 15l2 2-2 2"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>',
  flip: '<path d="M12 3v6l6-3zM12 21v-6l6 3zM4 12h2M9 12h2M14 12h2M19 12h2"/>',
  flipY: '<path d="M3 12h6l-3 6zM21 12h-6l3 6zM12 4v2M12 9v2M12 14v2M12 19v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};
// A small picture of a shape: the section over it in dark, drawn from our measured edge.
const shapeThumb = (id) => {
  const pts = DIVIDER_SHAPES[id];
  const line = pts ? pts.map(([x, y]) => `${+(x * 60).toFixed(1)},${+(20 + y * 12).toFixed(1)}`).join(' ') : '0,32 60,32';
  return `<svg viewBox="0 0 60 50" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 60,0 ${line.split(' ').reverse().join(' ')}" fill="#2e2e2e"/></svg>`;
};
const VIDEO_FILTERS = ['None', 'Blur', 'Brightness', 'Contrast', 'Invert', 'Opacity', 'Saturate', 'Sepia'];
export function sectionPanelHtml(s, o) {
  const tab = (t) => `<button type="button" role="tab" class="sp-tab${t === o.tab ? ' is-on' : ''}" aria-selected="${t === o.tab}" data-sact="tab" data-v="${t}">${t}</button>`;
  const seg = (act, v, label, on, html = label) => `<button type="button" class="sp-seg${on ? ' is-on' : ''}" data-sact="${act}" data-v="${v}" aria-label="${label}" aria-pressed="${on}" title="${label}">${html}</button>`;
  const row = (label, control, cls = '') => `<div class="sp-row ${cls}"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;
  const sw = (act, on, label) => `<label class="sp-switch"><input type="checkbox" data-act="${act}" aria-label="${label}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const head = (t) => `<div class="sp-head">${t}</div>`;
  // A row with S, M, L and a more button; more shows a slider with the value and its unit.
  const sizeRow = (label, act, presets, now, value, max, unit) => {
    const more = o.more?.[act];
    return row(label, ['S', 'M', 'L'].map((k) => seg(act, k, k, !more && now === presets[k])).join('') + seg(act, 'more', `Custom ${label.toLowerCase()}`, !!more, pi(PI.more)))
      + (more ? `<div class="sp-row sp-slide"><input type="range" data-act="${act}" data-unit="${unit}" aria-label="${label} slider" min="1" max="${max}" step="1" value="${value}"><input type="text" data-act="${act}" aria-label="${label}" value="${value}${unit}"></div>` : '');
  };
  let body = '';
  if (o.view === 'shape') {
    const cur = s.dividerShape || 'wavy', w = s.dividerWidth ?? 100, h = s.dividerHeight ?? 6, A = s.dividerAlign || 0;
    const flips = DIVIDER_FLIPS[cur] || [];
    const flip = (k) => { const act = k === 'Y' ? 'dividerFlipY' : 'dividerFlip', on = !!s[act]; return `<button type="button" class="sp-seg sp-flip${on ? ' is-on' : ''}" data-sact="${act}" aria-label="Flip ${k} Axis" aria-pressed="${on}">${pi(k === 'Y' ? PI.flipY : PI.flip)}</button>`; };
    const free = cur !== 'none' && cur !== 'soft';
    return `<div class="sp-sub"><button type="button" class="sp-subback" data-sact="view" data-v="">${pi(PI.back)}<span>Back</span></button><span class="sp-subtitle">Shape</span></div><div class="sp-shapes">${DIVIDER_SHAPE_NAMES.map(([id, name]) => `<button type="button" class="sp-shape-tile${id === cur ? ' is-on' : ''}" data-sact="dividerShape" data-v="${id}" aria-label="${name}" title="${name}" aria-pressed="${id === cur}">${shapeThumb(id)}</button>`).join('')}</div><div class="sp-body">`
      + (cur !== 'none' ? `<button type="button" class="sp-shuffle" data-sact="shuffle">Shuffle Settings</button>` : '')
      + (free ? sizeRow('Width', 'dividerWidth', DIVIDER_WIDTHS, w, w, 150, 'vw') : '')
      + (cur !== 'none' ? sizeRow('Height', 'dividerHeight', DIVIDER_HEIGHTS, h, h, 150, 'vw') : '')
      + (flips.length ? row('Flip', flips.map(flip).join('')) : '')
      + (free ? `<div class="sp-row sp-align-row"><span class="sp-label">Alignment</span><input type="text" data-act="dividerAlign" aria-label="Alignment" value="${A}px"></div><input class="sp-align-slide" type="range" data-act="dividerAlign" data-unit="px" aria-label="Alignment" min="-1000" max="1000" step="1" value="${A}">` : '')
      + '</div>';
  }
  if (o.view === 'art' && s.bgArt) {
    const art = ART.find((a) => a[0] === s.bgArt.name);
    const colors = art[2].map((label, k) => `<button type="button" class="sp-row sp-color-row sp-art-color" data-sp-color="art:${k}" aria-label="${label}"><span class="sp-label">${label}</span><i class="sp-dot" style="background:${s.bgArt.colors[k]}"></i></button>`).join('');
    const invert = art[2][0] === 'Start color' ? `<button type="button" class="sp-invert" data-sact="artInvert">Invert colors</button>` : '';
    const set = s.bgArt.set, more = o.more || {}, images = s.bgArt.name === 'images';
    const pattern = images ? `<button type="button" class="sp-row sp-color-row sp-art-color" data-sp-color="art:2" aria-label="Pattern color"><span class="sp-label">Pattern color</span><i class="sp-dot" style="background:${s.bgArt.colors[2] || '#000000'}"></i></button>` : '';
    const rows = images ? artImagesRows(set, more, pattern) : artRowsHtml(s.bgArt.name, set, more);
    return `<div class="sp-sub"><button type="button" class="sp-subback" data-sact="view" data-v="">${pi(PI.back)}<span>Back</span></button></div><div class="sp-body sp-art-body">${images ? artImagesTop(set, more) : ''}${colors}${invert}${rows}<button type="button" class="sp-shuffle" data-sact="artShuffle">Shuffle Settings</button></div>`;
  }
  if (o.tab === 'Design') {
    const gk = o.gapKind;
    body = head('Grid')
      + row('Row Count', `<input class="sp-num" type="number" data-act="rows" aria-label="Row Count" min="${o.minRows}" max="10000" value="${s.rows[o.bp]}">`)
      + row('Gap', seg('gap', 'zero', 'Zero gap', gk === 'zero', pi(PI.gapZero)) + seg('gap', 'medium', 'Medium gap', gk === 'medium', pi(PI.gapMedium)) + seg('gap', 'custom', 'Custom gap', gk === 'custom', pi(PI.more)))
      + (gk === 'custom' ? row('Column gap', `<input type="range" data-act="gap" aria-label="Column gap slider" min="0" max="50" value="${s.gap}"><span class="sp-val">${s.gap}</span>`) + row('Row gap', `<input type="range" data-act="rowGap" aria-label="Row gap slider" min="0" max="50" value="${s.rowGap ?? s.gap}"><span class="sp-val">${s.rowGap ?? s.gap}</span>`) : '')
      + head('Section')
      + row('Fill Screen', sw('fill', o.fill, 'Fill Screen'))
      + (o.fill ? row('Height', seg('height', 'small', 'S', s.height === 'small') + seg('height', 'medium', 'M', s.height === 'medium') + seg('height', 'large', 'L', s.height === 'large') + seg('height', 'custom', 'Custom height', s.height === 'custom', pi(PI.more)))
        + (s.height === 'custom' ? `<div class="sp-row sp-custom-height"><input type="range" data-act="customHeight" aria-label="Custom height slider" min="1" max="100" step="1" value="${Math.min(100, s.customHeight)}"><input type="text" inputmode="numeric" data-act="customHeight" aria-label="Custom height" value="${s.customHeight}"></div>` : '')
        + row('Alignment', seg('valign', 'top', 'Vertical top', s.valign === 'top', pi(PI.top)) + seg('valign', 'middle', 'Vertical center', (s.valign || 'middle') === 'middle', pi(PI.middle)) + seg('valign', 'bottom', 'Vertical bottom', s.valign === 'bottom', pi(PI.bottom))) : '')
      + '<p class="sp-help">Fill screen will expand the background height to fill a portion of the user’s screen.</p>'
      + head('Styling')
      + row('Divider', sw('divider', !!s.divider, 'Divider'))
      + (s.divider ? `<div class="sp-shape-label">Shape</div><div class="sp-shape-box"><button type="button" class="sp-seg" data-sact="shapeShuffle" aria-label="Shuffle Settings" title="Shuffle Settings">${pi(PI.shuffle)}</button><span class="sp-shape-now">${shapeThumb(s.dividerShape || 'wavy')}</span><button type="button" class="sp-seg" data-sact="view" data-v="shape" aria-label="Edit Settings" title="Edit Settings">${pi(PI.sliders)}</button></div>`
        + row('Stroke', seg('dividerStroke', 'none', 'No stroke', s.dividerStroke === 'none', pi(PI.none)) + seg('dividerStroke', 'solid', 'Solid stroke', (s.dividerStroke || 'solid') === 'solid', pi(PI.solid)) + seg('dividerStroke', 'dashed', 'Dashed stroke', s.dividerStroke === 'dashed', pi(PI.dashed)))
        + `<button type="button" class="sp-row sp-color-row" data-sp-color="divider" aria-label="Color"><span class="sp-label">Color</span><i class="sp-dot" style="background:${s.dividerColor || '#000'}"></i></button>`
        + sizeRow('Thickness', 'dividerThickness', { S: 'S', M: 'M', L: 'L' }, typeof s.dividerThickness === 'number' ? s.dividerThickness : s.dividerThickness || 'M', typeof s.dividerThickness === 'number' ? s.dividerThickness : { S: 2, M: 6, L: 15 }[s.dividerThickness || 'M'], 50, 'px') : '')
      + head('Anchor Link')
      + `<div class="sp-anchor"><span>#</span><input type="text" data-act="anchor" aria-label="Anchor Link" placeholder="Add name" value="${(s.anchor || '').replace(/"/g, '&quot;')}"></div>`;
  } else if (o.tab === 'Background') {
    // Image, Video and Art (parity/findings/CAP-BACKGROUND.json, CAP-DIVSHAPES.json). Add an Image and
    // Add a Video read a file from this computer; the oracle's upload is not probed (0005).
    const kindNow = s.bgKind || 'Image';
    const kind = (n) => `<button type="button" role="radio" class="sp-seg sp-kind${n === kindNow ? ' is-on' : ''}" aria-checked="${n === kindNow}" aria-label="${n}" data-sact="bgKind" data-v="${n}">${n}</button>`;
    const widthRow = head('Background Width') + `<div class="sp-kinds sp-widths">${seg('bgWidth', 'full-bleed', 'Full Bleed', (s.bgWidth || 'full-bleed') === 'full-bleed')}${seg('bgWidth', 'inset', 'Inset', s.bgWidth === 'inset')}</div>`;
    const card = (act, label, sub) => `<button type="button" class="sp-bgadd" data-sbg="${act}" aria-label="${label}">${pi(PI.plus)}<strong>${label}</strong><span>${sub}</span></button>`;
    let pane = '';
    if (kindNow === 'Image') {
      const image = s.bgImage
        ? `<div class="bp-pic"><img class="bp-pic-img" alt="" src="${s.bgImage.replace(/"/g, '&quot;')}"><div class="bp-pic-actions"><button type="button" data-sbg="add">Replace</button><button type="button" class="bp-link-remove" data-sbg="remove">Remove</button></div></div>`
        : card('add', 'Add an Image', '20 MB max');
      pane = `${image}<input type="file" accept="image/*" hidden data-sbg-file>${widthRow}`;
    } else if (kindNow === 'Video') {
      const video = s.bgVideo
        ? `<div class="bp-pic"><video class="bp-pic-img" muted src="${s.bgVideo.replace(/"/g, '&quot;')}"></video><div class="bp-pic-actions"><button type="button" data-sbg="addVideo">Replace</button><button type="button" class="bp-link-remove" data-sbg="removeVideo">Remove</button></div></div>`
        : card('addVideo', 'Add a Video', '1 minute max');
      const f = s.bgFilter || 'None', sp = s.bgSpeed ?? 1;
      const list = o.filterOpen ? `<div class="sp-options" role="listbox" style="top:${-45 * VIDEO_FILTERS.indexOf(f)}px">${VIDEO_FILTERS.map((n) => `<button type="button" role="option" class="sp-option${n === f ? ' is-on' : ''}" aria-selected="${n === f}" data-sact="bgFilter" data-v="${n}">${n}</button>`).join('')}</div>` : '';
      pane = `${video}<input type="file" accept="video/*" hidden data-sbg-video>`
        + `<div class="sp-storage"><span class="sp-storage-label">Video Storage</span><span class="sp-storage-left">30 min left</span><button type="button" class="sp-seg" data-sact="storageTip" aria-label="Open storage dialog">${pi(PI.help)}</button><i></i></div>`
        + (o.tipOpen ? '<div class="sp-tip" role="dialog">Your plan includes 30 minutes of free uploaded video storage.</div>' : '')
        + widthRow + head('Filter') + `<div class="sp-select-wrap"><button type="button" class="sp-select" data-sact="filterOpen" aria-label="Filter" aria-expanded="${!!o.filterOpen}"><span>${f}</span>${pi(PI.chevron)}</button>${list}</div>`
        + (f !== 'None' ? `<div class="sp-row sp-slide"><input type="range" data-act="bgFilterStrength" data-unit="" aria-label="Filter strength" min="0" max="100" step="1" value="${s.bgFilterStrength || 0}"><input type="text" data-act="bgFilterStrength" aria-label="Filter strength value" value="${s.bgFilterStrength || 0}"></div>` : '')
        + row('Playback Speed', `<span class="sp-speed">${sp} x</span><button type="button" class="sp-seg" data-sact="bgSpeed" data-v="-0.5" aria-label="Decrement"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14" stroke="currentColor" fill="none"/></svg></button><button type="button" class="sp-seg" data-sact="bgSpeed" data-v="0.5" aria-label="Increment">${pi(PI.plus)}</button>`)
        + head('Mobile Fallback Image') + '<p class="sp-help sp-fallback-help">Add an image to replace your video in mobile browsers. If left blank a background color will display. You can change this color in the Style panel.</p>'
        + (s.bgFallback ? `<div class="bp-pic"><img class="bp-pic-img" alt="" src="${s.bgFallback.replace(/"/g, '&quot;')}"><div class="bp-pic-actions"><button type="button" data-sbg="addFallback">Replace</button><button type="button" class="bp-link-remove" data-sbg="removeFallback">Remove</button></div></div>` : card('addFallback', 'Add an Image', '20 MB max'))
        + '<input type="file" accept="image/*" hidden data-sbg-fallback>';
    } else {
      const cur = s.bgArt?.name || 'none';
      const tile = (id, name, css) => `<div class="sp-art-tile${id === cur ? ' is-on' : ''}"><button type="button" class="sp-art-pick" data-sact="art" data-v="${id}" aria-label="${name}" aria-pressed="${id === cur}" style="background:${css}">${id === 'none' ? '<span>None</span>' : ''}</button>${id === cur && id !== 'none' ? `<div class="sp-art-tools"><button type="button" class="sp-seg" data-sact="artShuffle" aria-label="Shuffle Settings">${pi(PI.shuffle)}</button><button type="button" class="sp-seg" data-sact="view" data-v="art" aria-label="Edit Settings">${pi(PI.sliders)}</button></div>` : ''}</div>`;
      pane = `<div class="sp-art-grid">${tile('none', 'None', '#f6f6f6')}${ART.map(([id, name]) => tile(id, name, artCss(id, s.bgArt?.name === id ? s.bgArt.colors : artDefaults(id)))).join('')}</div>`
        + '<p class="sp-help sp-art-note">Background art will only appear in browsers that support WebGL.</p>' + widthRow;
    }
    body = `<div class="sp-kinds" role="radiogroup" aria-label="Background type">${['Image', 'Video', 'Art'].map(kind).join('')}</div>${pane}`;
  } else {
    const cur = (s.theme || '').replace(/^theme-/, '');
    body = `<a href="#" class="sp-theme-editor" data-sbg="themes">Color Theme Editor</a><div class="sp-themes">${o.themes.map(([label, v]) => { const c = o.themeColors[v] || {}; return `<button type="button" class="sp-theme${cur === v ? ' is-on' : ''}" data-sact="theme" data-v="${v}" aria-label="Aa${label}" aria-pressed="${cur === v}" style="background:${c.bg || '#fff'};color:${c.ink || '#000'}"><span class="sp-aa">Aa</span><span class="sp-tname">${label}</span></button>`; }).join('')}</div>`;
  }
  return `<div class="sp-tabs" role="tablist">${['Design', 'Background', 'Colors'].map(tab).join('')}</div><div class="sp-body">${body}</div>`;
}
