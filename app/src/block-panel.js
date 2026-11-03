// The block Edit panel (T15, U4), drawn like the oracle's (parity/findings/DESIGN.json,
// EDITPANEL.json, the gap review screenshots): a 320 by 500 panel 18px right of the block,
// Design and Animation tabs; Design has Background and Blur switches, Stroke, Blend Mode, and
// Transforms (Opacity, Rotate, Scale X/Y, Offset X/Y, Skew X/Y). Values go into the block's
// transform-vars rule (render.js designCss). Controls marked data-unbuilt are shown where the
// oracle shows them but do nothing yet; the inventory counts them as missing.
const pi = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${d}</svg>`;

export const DESIGN_FIELDS = [['opacity', 'Opacity', '%', 0, 100], ['rotate', 'Rotate', '°', -360, 360], ['sx', 'Scale', '%', 0, 1000, 'X'], ['sy', 'Scale', '%', 0, 1000, 'Y'],
  ['tx', 'Offset', 'px', -10000, 10000, 'X'], ['ty', 'Offset', 'px', -10000, 10000, 'Y'], ['kx', 'Skew', '°', -89, 89, 'X'], ['ky', 'Skew', '°', -89, 89, 'Y']];

export function blockPanelHtml(d, tab) {
  const tabBtn = (t) => `<button type="button" role="tab" class="sp-tab${t === tab ? ' is-on' : ''}" aria-selected="${t === tab}" data-btab="${t}">${t}</button>`;
  const row = (label, control) => `<div class="sp-row"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;
  const sw = (key, on, label) => `<label class="sp-switch"><input type="checkbox" data-design="${key}" aria-label="${label}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const box = ([k, l, u, min, max, axis]) => `<label class="bp-box"><input type="number" data-design="${k}" aria-label="${axis ? `${l} ${axis}` : l}" min="${min}" max="${max}" value="${d[k]}"><span class="bp-unit">${u}${axis ? ` <b>${axis}</b>` : ''}</span></label>`;
  let body;
  if (tab === 'Design') {
    const pairs = [];
    for (let i = 0; i < DESIGN_FIELDS.length; i++) {
      const f = DESIGN_FIELDS[i];
      if (f[5] === 'X') { pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span><span class="bp-pair">${box(f)}${box(DESIGN_FIELDS[i + 1])}</span></div>`); i++; }
      else pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span>${box(f)}</div>`);
    }
    body = row('Background', sw('background', d.background, 'Background'))
      + row('Stroke', `<span class="sp-ctl" data-unbuilt title="Not built yet">${['No stroke', 'Solid stroke', 'Dashed stroke'].map((l, k) => `<button type="button" class="sp-seg${k === 0 ? ' is-on' : ''}" disabled aria-label="${l}">${pi(['<circle cx="12" cy="12" r="7"/><path d="M7 17L17 7"/>', '<path d="M5 12h14"/>', '<path d="M4 12h3M10.5 12h3M17 12h3"/>'][k])}</button>`).join('')}</span>`)
      + row('Blend Mode', `<span data-unbuilt title="Not built yet"><select class="bp-select" disabled aria-label="Blend Mode"><option>Normal</option></select></span>`)
      + row('Blur', sw('blur', d.blur, 'Blur'))
      + `<div class="bp-thead"><span>Transforms</span><span class="bp-more" data-unbuilt title="Not built yet" aria-label="More actions">···</span></div>`
      + pairs.join('');
  } else {
    body = '<p class="sp-help" data-unbuilt>Animations are not built yet.</p>';
  }
  return `<div class="sp-tabs" role="tablist">${['Design', 'Animation'].map(tabBtn).join('')}</div><div class="sp-body">${body}</div>`;
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
