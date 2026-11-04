// The block Edit panel (T15, U4), drawn like the oracle's (parity/findings/DESIGN.json,
// EDITPANEL.json, the gap review screenshots): a 320 by 500 panel 18px right of the block,
// Design and Animation tabs; Design has Background and Blur switches, Stroke, Blend Mode, and
// Transforms (Opacity, Rotate, Scale X/Y, Offset X/Y, Skew X/Y). Values go into the block's
// transform-vars rule (render.js designCss). Controls marked data-unbuilt are shown where the
// oracle shows them but do nothing yet; the inventory counts them as missing.
import { escapeHtml as esc, BLEND_MODES } from './render.js';

const pi = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${d}</svg>`;

export const DESIGN_FIELDS = [['opacity', 'Opacity', '%', 0, 100], ['rotate', 'Rotate', '°', -360, 360], ['sx', 'Scale', '%', 0, 1000, 'X'], ['sy', 'Scale', '%', 0, 1000, 'Y'],
  ['tx', 'Offset', 'px', -10000, 10000, 'X'], ['ty', 'Offset', 'px', -10000, 10000, 'Y'], ['kx', 'Skew', '°', -89, 89, 'X'], ['ky', 'Skew', '°', -89, 89, 'Y']];

// Content tab of a button block (parity/findings/BUTTONEDIT.json): Text, a 276 by 44 field
// with the placeholder Learn More, and Link, an Attach link button that turns into the link
// with Edit, Copy and Remove Link once one is set.
function linkField(href) {
  const link = href
    ? `<div class="bp-link"><button type="button" class="bp-link-url" data-link="edit" aria-label="${esc(href)}">${esc(href)}</button><div class="bp-link-actions"><button type="button" data-link="edit">Edit</button><button type="button" data-link="copy">Copy</button><button type="button" class="bp-link-remove" data-link="remove">Remove Link</button></div></div>`
    : '<button type="button" class="bp-attach" data-link="open">Attach link</button>';
  return `<div class="bp-field"><span class="bp-flabel">Link</span>${link}</div>`;
}
function buttonContentHtml(c) {
  return `<div class="bp-field"><span class="bp-flabel">Text</span><input class="bp-text" type="text" aria-label="Text" placeholder="Learn More" data-content="label" value="${esc(c.label || '')}"></div>`
    + linkField(c.href);
}

// Content tab of an image block, in the oracle's order (parity/findings/IMAGEMODES.json): the
// picture with Replace, Edit and Remove, then Link, Alternate Filename and Image alt text. Those
// labels are all that is measured, so the sizes follow the button's Content tab. Replace reads a
// file from this computer; Edit, the oracle's full-screen image editor, is not built.
function imageContentHtml(c) {
  const text = (key, label, value) => `<div class="bp-field"><span class="bp-flabel">${label}</span><input class="bp-text" type="text" aria-label="${label}" data-content="${key}" value="${esc(value || '')}"></div>`;
  const pic = c.src ? `<img class="bp-pic-img" alt="" src="${esc(c.src)}">` : '';
  return `<div class="bp-pic">${pic}<div class="bp-pic-actions"><button type="button" data-image-act="replace">Replace</button><button type="button" data-unbuilt disabled title="Not built yet">Edit</button><button type="button" class="bp-link-remove" data-image-act="remove"${c.src ? '' : ' disabled'}>Remove</button></div><input class="bp-pic-file" type="file" accept="image/*" hidden data-image-file></div>`
    + linkField(c.href)
    + text('filename', 'Alternate Filename', c.filename)
    + text('alt', 'Image alt text', c.alt);
}

// The link editor popover (BUTTONEDIT.json, the gap review's button-link state): a URL tab, the
// field Enter link, search, or add files, Open link in new tab and Clear selected page; the site
// pages show under the field while it is empty, as name and path, grouped by navigation.
export function linkPopoverHtml(href, groups) {
  const pages = groups.filter((g) => g.pages.length).map((g) => `<div class="lk-group">${esc(g.name)}</div>${g.pages.map((pg) => `<button type="button" class="lk-page" data-href="${esc(pg.href)}" aria-label="${esc(`${pg.label}${pg.href}`)}"><span>${esc(pg.label)}</span><span class="lk-path">${esc(pg.href)}</span></button>`).join('')}`).join('');
  return `<div class="lk-tabs"><button type="button" class="lk-tab is-on">URL</button></div>`
    + `<div class="lk-row"><input class="lk-input" type="text" placeholder="Enter link, search, or add files" value="${esc(href || '')}"><button type="button" class="lk-clear" aria-label="Clear selected page">×</button></div>`
    + `<label class="lk-newtab" data-unbuilt title="Not built yet"><input type="checkbox" disabled> Open link in new tab</label>`
    + `<div class="lk-pages">${pages}</div>`;
}

// One measurement: the popover sat 342px left of the panel and 61px above the Attach link button.
export function linkPopoverPosition(panel, attach, stage) {
  const left = Math.max(8, panel.left - stage.left - 342);
  const top = Math.max(8, Math.min(attach.top - stage.top - 61, stage.height - 175));
  return { left, top };
}

// Blend Mode (parity/findings/BLEND.json): a button reading Blend Mode and the current mode,
// opening a list of the 16 CSS blend modes.
const blendValue = (label) => label.toLowerCase().replace(/ /g, '-');
function blendRow(cur, open) {
  const name = BLEND_MODES.find((m) => blendValue(m) === cur) || 'Normal';
  const list = open ? `<div class="bp-listbox" role="listbox" aria-label="Blend Mode">${BLEND_MODES.map((m) => `<div role="option" class="bp-option" aria-selected="${m === name}" data-blend="${blendValue(m)}">${m}</div>`).join('')}</div>` : '';
  return `<div class="bp-blend-wrap"><div class="sp-row bp-blend" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="${open}" data-blend-toggle><span class="sp-label">Blend Mode</span><span class="bp-blend-value">${name}</span></div>${list}</div>`;
}

// Stroke (parity/findings/STROKE.json): No, Solid and Dashed Stroke; with a stroke, Stroke Color
// (not built), Thickness S/M/L, Corner and Padding S/M/L.
function strokeRows(d) {
  const seg = (key, val, label, on, icon) => `<button type="button" role="radio" class="sp-seg${on ? ' is-on' : ''}" aria-checked="${on}" data-dset="${key}" data-v="${val}" aria-label="${label}">${icon}</button>`;
  const cur = d.stroke || '';
  let html = `<div class="sp-row"><span class="sp-label">Stroke</span><span class="sp-ctl">${seg('stroke', '', 'No Stroke', !cur, pi('<circle cx="12" cy="12" r="7"/><path d="M7 17L17 7"/>'))}${seg('stroke', 'solid', 'Solid Stroke', cur === 'solid', pi('<path d="M5 12h14"/>'))}${seg('stroke', 'dashed', 'Dashed Stroke', cur === 'dashed', pi('<path d="M4 12h3M10.5 12h3M17 12h3"/>'))}</span></div>`;
  if (!cur) return html;
  const sml = (key, def, labels) => ['S', 'M', 'L'].map((k, n) => `<button type="button" role="radio" class="sp-seg sp-txt${(d[key] || def) === k ? ' is-on' : ''}" aria-checked="${(d[key] || def) === k}" data-dset="${key}" data-v="${k}" aria-label="${labels ? labels[n] : k}">${k}</button>`).join('');
  html += `<div class="sp-row"><span class="sp-label">Stroke Color</span><span class="sp-ctl"><button type="button" class="bp-swatch" data-unbuilt disabled aria-label="Stroke Color"></button></span></div>`
    + `<div class="sp-row"><span class="sp-label">Thickness</span><span class="sp-ctl">${sml('strokeSize', 'S')}</span></div>`
    + `<div class="sp-row"><span class="sp-label">Corner</span><span class="sp-ctl"><label class="bp-box"><input type="number" data-design="corner" aria-label="Corner" min="0" max="500" value="${d.corner || 0}"><span class="bp-unit">px</span></label></span></div>`
    + `<div class="sp-row"><span class="sp-label">Padding</span><span class="sp-ctl">${sml('pad', 'M', ['small block background padding', 'medium block background padding', 'large block background padding'])}</span></div>`;
  return html;
}

export function blockPanelHtml(d, tab, content = null, open = null, shape = null, image = null) {
  const tabBtn = (t) => `<button type="button" role="tab" class="sp-tab${t === tab ? ' is-on' : ''}" aria-selected="${t === tab}" data-btab="${t}">${t}</button>`;
  const row = (label, control) => `<div class="sp-row"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;
  const sw = (key, on, label) => `<label class="sp-switch"><input type="checkbox" data-design="${key}" aria-label="${label}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const box = ([k, l, u, min, max, axis]) => `<label class="bp-box"><input type="number" data-design="${k}" aria-label="${axis ? `${l} ${axis}` : l}" min="${min}" max="${max}" value="${d[k]}"><span class="bp-unit">${u}${axis ? ` <b>${axis}</b>` : ''}</span></label>`;
  let body;
  if (tab === 'Content' && content) {
    body = image ? imageContentHtml(content) : buttonContentHtml(content);
  } else if (tab === 'Design') {
    const pairs = [];
    for (let i = 0; i < DESIGN_FIELDS.length; i++) {
      const f = DESIGN_FIELDS[i];
      if (f[5] === 'X') { pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span><span class="bp-pair">${box(f)}${box(DESIGN_FIELDS[i + 1])}</span></div>`); i++; }
      else pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span>${box(f)}</div>`);
    }
    // A shape's Design tab (parity/findings/SHAPEDESIGN.json) has no Background or Stroke row:
    // shape style, Corner radius with Uniform or Individual radii, Stretch, Color, Blend Mode,
    // Drop Shadow, Blur, then the transforms.
    if (shape) body = row('Shape style', '<span class="bp-unbuilt-chip" data-unbuilt title="Not built yet">Rectangle</span>')
      + `<div class="sp-row"><span class="sp-label">Corner radius</span><span class="sp-ctl"><label class="bp-box bp-radius"><input type="number" data-shape="radius" aria-label="Corner radius" min="0" max="1000" value="${shape.radius}"><span class="bp-unit">px</span></label><span class="bp-radii"><button type="button" role="radio" aria-checked="true" class="sp-seg is-on" aria-label="Uniform corner radii">${pi('<rect x="5" y="5" width="14" height="14" rx="4"/>')}</button><button type="button" role="radio" aria-checked="false" class="sp-seg" disabled data-unbuilt title="Not built yet" aria-label="Individual corner radii">${pi('<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>')}</button></span></span></div>`
      + row('Stretch', `<label class="sp-switch"><input type="checkbox" data-shape="stretch" aria-label="Stretch" ${shape.stretch ? 'checked' : ''}><span aria-hidden="true"></span></label>`)
      + row('Color', '<button type="button" class="bp-swatch" data-unbuilt title="Not built yet" aria-label="Color" disabled></button>')
      + blendRow(d.blend || 'normal', open === 'blend')
      + row('Drop Shadow', sw('shadow', d.shadow, 'Drop Shadow'))
      + row('Blur', sw('blur', d.blur, 'Blur'))
      + `<div class="bp-thead"><span>Transforms</span><span class="bp-more" data-unbuilt title="Not built yet" aria-label="More actions">···</span></div>`
      + pairs.join('');
    // An image's Design tab (parity/findings/IMAGEMODES.json) opens with Fit, Fill and Shape.
    else if (image) {
      const seg = (m, l) => `<button type="button" role="radio" class="bp-mode${image.mode === m ? ' is-on' : ''}" aria-checked="${image.mode === m}" aria-label="${l}" data-image-mode="${m}">${l}</button>`;
      const chip = (l, v) => row(l, `<span class="bp-unbuilt-chip" data-unbuilt title="Not built yet" aria-label="${l}">${v}</span>`);
      const off = (l) => row(l, `<label class="sp-switch" data-unbuilt title="Not built yet"><input type="checkbox" disabled aria-label="${l}"><span aria-hidden="true"></span></label>`);
      body = `<div class="bp-modes" role="radiogroup" aria-label="Image mode">${seg('fit', 'Fit')}${seg('fill', 'Fill')}${seg('shape', 'Shape')}</div>`
        + (image.mode === 'shape' ? chip('Shape', 'Circle') + off('Stretch') : chip('Corner', '0px'))
        + chip('Image Effect', '›') + off('Overlay') + off('Lightbox')
        + `<div class="bp-thead"><span>Transforms</span><span class="bp-more" data-unbuilt title="Not built yet" aria-label="More actions">···</span></div>`
        + pairs.join('');
    }
    else body = row('Background', sw('background', d.background, 'Background'))
      + strokeRows(d)
      + blendRow(d.blend || 'normal', open === 'blend')
      + row('Blur', sw('blur', d.blur, 'Blur'))
      + `<div class="bp-thead"><span>Transforms</span><span class="bp-more" data-unbuilt title="Not built yet" aria-label="More actions">···</span></div>`
      + pairs.join('');
  } else {
    // Animation (parity/findings/ANIMATION.json): the empty state and the preset picker as on
    // the oracle; the animations themselves are not built (data-unbuilt).
    body = open === 'anim-picker'
      ? `<div class="an-head"><button type="button" class="an-back" data-anim="back" aria-label="Back">${pi('<path d="M15 6l-6 6 6 6"/>')}</button><span>Trigger</span></div>`
        + `<label class="an-trigger" data-unbuilt><select aria-label="Trigger" disabled>${['On Hover', 'On Press', 'Loop', 'On Scroll', 'On Appear', 'Follow'].map((t) => `<option>${t}</option>`).join('')}</select></label>`
        + `<div class="an-presets">${['Grow', 'Lift', 'Look', 'Jump', 'Squish', 'Jitter'].map((n) => `<button type="button" class="an-preset" data-unbuilt disabled><span class="an-sq"></span>${n}</button>`).join('')}</div>`
        + '<button type="button" class="an-blank" data-unbuilt disabled>Start blank</button>'
      : `<div class="an-row"><span class="an-title">Triggers</span><span class="an-actions"><button type="button" class="an-icon" aria-label="Animation list actions" data-unbuilt disabled>···</button><button type="button" class="an-icon" data-anim="add" aria-label="Add a new animation">${pi('<path d="M12 5v14M5 12h14"/>')}</button></span></div>`
        + '<button type="button" class="an-empty" data-anim="add" aria-label="Press + to get startedUse a preset or customize"><strong>Press + to get started</strong><span>Use a preset or customize</span></button>';
  }
  const tabs = content ? ['Content', 'Design', 'Animation'] : ['Design', 'Animation'];
  // The header is also the drag handle (U13): the oracle labels it Click and drag to reposition block editor form.
  return `<div class="bp-drag" role="button" aria-label="Click and drag to reposition block editor form" data-drag-panel></div><div class="sp-tabs" role="tablist">${tabs.map(tabBtn).join('')}</div><div class="sp-body">${body}</div>`;
}

// 18px right of the block and 3px below its top, in the stage's coordinates; left of the block
// when there is no room on the right, and always inside the stage.
export function blockPanelPosition(block, frame, stage) {
  const ox = frame.left - stage.left, oy = frame.top - stage.top;
  let left = ox + block.right + 18;
  if (left + 320 > stage.width) left = Math.max(0, ox + block.left - 18 - 320);
  const top = Math.max(oy + 8, Math.min(oy + block.top + 3, stage.height - 500 - 8));
  return { left, top };
}

// The Pin popover (parity/findings/PIN.json): 248 by 140, centred under the toolbar Pin button and
// 7px below it. Pin: four icon radios (Pin to Top, Center, Bottom on Scroll, Remove Pin); Offset: a
// text field and a 204px slider. The slider's range was not measured: ours runs 0 to 500.
export function pinPopoverHtml(st) {
  const ic = { top: '<path d="M5 5h14M12 9v10M8 13l4-4 4 4"/>', center: '<path d="M5 12h14M12 4v4M12 16v4M9 6l3 2 3-2M9 18l3-2 3 2"/>', bottom: '<path d="M5 19h14M12 5v10M8 11l4 4 4-4"/>', remove: '<path d="M6 6l12 12M18 6L6 18"/>' };
  const radio = (k, label) => `<button type="button" role="radio" class="pin-opt${(st ? st.anchor : 'remove') === k ? ' is-on' : ''}" aria-checked="${(st ? st.anchor : 'remove') === k}" data-pin="${k}" aria-label="${label}">${pi(ic[k])}</button>`;
  const off = st ? st.offset : 0;
  return `<div class="pin-row"><span class="pin-label">Pin</span><span class="pin-opts">${radio('top', 'Pin to Top on Scroll')}${radio('center', 'Pin to Center on Scroll')}${radio('bottom', 'Pin to Bottom on Scroll')}${radio('remove', 'Remove Pin')}</span></div>`
    + `<div class="pin-row"><span class="pin-label">Offset</span><input class="pin-off" type="text" aria-label="Offset" data-pin-offset value="${off}px"${st ? '' : ' disabled'}></div>`
    + `<input class="pin-range" type="range" aria-label="Offset" data-pin-range min="0" max="500" value="${off}"${st ? '' : ' disabled'}>`;
}
