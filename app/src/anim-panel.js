// The Animation tab of the block Edit panel (T15, parity/findings/ANIMFLOW.json): the list of
// triggers, the picker with its trigger menu and six presets, and the editor with its tabs. Boxes
// as measured on a 320 by 500 panel. Icons are our own (O2).
import { TRIGGERS, triggerName, PRESETS, TABS, OPTIONS, poseKey, hasPoseNote, rowDetail, defaultOf, easeGlyph, REST } from './animations.js';
import { escapeHtml as esc } from './render.js';

const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  hover: '<circle cx="11" cy="11" r="7" stroke-dasharray="1.5 2.6"/><path d="M12 12l7 3-3 1-1 3z" fill="currentColor"/>',
  press: '<circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="3.2"/><path d="M13 13l7 3-3 1-1 3z" fill="currentColor"/>',
  loop: '<path d="M19 12a7 7 0 1 1-2.2-5.1"/><path d="M19 3v4h-4"/>',
  scroll: '<rect x="7.5" y="4" width="9" height="16" rx="4.5"/><path d="M12 8v3"/>',
  appear: '<rect x="5" y="8" width="8" height="8"/><circle cx="15.5" cy="8.5" r="3.5"/><path d="M4 20h16" stroke-dasharray="1.5 2.4"/>',
  follow: '<path d="M4 4l7 3-3 1-1 3z" fill="currentColor"/><path d="M12 12a6 6 0 1 1-1 7"/><path d="M11 15v4h4"/>',
};
const BACK = `<button type="button" class="an-back" data-anim="back" aria-label="Back">${svg('<path d="M15 5l-7 7 7 7"/>', 22)}</button>`;
const CHEVRON = '<svg class="an-chev" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M1.5 1.5L6 6l4.5-4.5"/></svg>';
const PAUSE = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="6" cy="6" r="4.75"/><path d="M4.9 4.4v3.2M7.1 4.4v3.2"/></svg>';
const CLOCK = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="4.6"/><path d="M6 3.2V6l1.8 1.1"/></svg>';
const SLIDERS = svg('<path d="M4 7h9M18 7h2M4 12h2M11 12h9M4 17h9M18 17h2"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="12" r="2.3"/><circle cx="15.5" cy="17" r="2.3"/>');

// The list: Triggers, its two buttons, and a row for each animation. On a phone a row has no
// actions menu and the list none; its button is wider (ANIMFLOW.json phone). Add is off there, and
// an empty list says nothing (CAP-L6ANIMPHONE.json). rows are by model index; order is how they show, own marks a row with phone values, by a
// dotted line under its icon. A delay shows left of the time.
export function animListHtml(rows, phone, { order = rows.map((_, i) => i), own = [] } = {}) {
  const head = `<div class="an-row"><span class="an-title">Triggers</span><span class="an-actions">${phone ? '' : `<button type="button" class="an-icon" data-anim="listacts" aria-label="Animation list actions">${svg('<circle cx="5" cy="12" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/><circle cx="19" cy="12" r=".8" fill="currentColor"/>')}</button>`}<button type="button" class="an-icon" data-anim="add" aria-label="Add a new animation"${phone ? ' disabled' : ''}>${svg('<path d="M12 5v14M5 12h14"/>')}</button></span></div>`;
  if (!rows.length && phone) return `<div class="an-view an-list is-phone">${head}</div>`;
  if (!rows.length) return `<div class="an-view an-list">${head}<button type="button" class="an-empty" data-anim="add" aria-label="Press + to get startedUse a preset or customize"><strong>Press + to get started</strong><span>Use a preset or customize</span></button></div>`;
  return `<div class="an-view an-list${phone ? ' is-phone' : ''}">${head}${order.map((i) => {
    const a = rows[i];
    const detail = rowDetail(a), timed = a.trigger !== 'scroll' && a.trigger !== 'follow';
    return `<div class="an-item"><span class="an-ico${own[i] ? ' is-own' : ''}" aria-hidden="true">${svg(ICONS[a.trigger])}</span><button type="button" class="an-open" data-anim="open" data-i="${i}"><span class="an-name">${triggerName(a.trigger)}</span><span class="an-sub">${timed && parseFloat(a.delay) ? `${PAUSE}${esc(a.delay)}<i class="an-gap"></i>` : ''}${timed ? CLOCK : ''}${esc(detail)}</span></button><button type="button" class="an-icon an-rm" data-anim="remove" data-i="${i}" aria-label="Remove animation">${svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>')}</button>${phone ? '' : `<button type="button" class="an-icon an-ra" data-anim="rowacts" data-i="${i}" aria-label="Animation actions">${svg('<circle cx="5" cy="12" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/><circle cx="19" cy="12" r=".8" fill="currentColor"/>')}</button>`}<button type="button" class="an-icon an-pv" data-anim="play" data-i="${i}" aria-label="Preview animation"${a.trigger === 'follow' ? ' data-unbuilt disabled' : ''}><svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1l8 5-8 5z" fill="currentColor"/></svg></button></div>`;
  }).join('')}</div>`;
}

// The picker. The Custom tile comes only with a row that left its preset; the Edit button shows
// on the chosen tile.
export function animPickerHtml(trigger, row, menu) {
  const on = row && row.trigger === trigger ? row.preset : null;
  const gear = `<button type="button" class="an-gear" data-anim="gear" aria-label="Edit" title="Edit">${SLIDERS}</button>`;
  const tile = (id, name, wide) => `<label class="an-tile${wide ? ' is-wide' : ''}${on === id ? ' is-on' : ''}" data-anim-tile="${id}"><input type="radio" name="an-tile" value="${id}"${on === id ? ' checked' : ''}><span class="an-sq"></span><span class="an-tname">${name}</span>${on === id ? gear : ''}</label>`;
  return `<div class="an-view an-picker">${BACK}<div class="an-head">Trigger</div>
    <button type="button" class="an-combo" role="combobox" aria-haspopup="listbox" aria-expanded="${!!menu}" data-anim="menu"><span class="an-combo-ico" aria-hidden="true">${svg(ICONS[trigger], 18)}</span><span>${triggerName(trigger)}</span>${CHEVRON}</button>
    ${menu ? `<div class="an-menu" role="listbox">${TRIGGERS.map(([t, n]) => `<button type="button" role="option" class="an-mopt${t === trigger ? ' is-on' : ''}" data-anim="trigger" data-v="${t}" aria-selected="${t === trigger}">${svg(ICONS[t])}<span>${n}</span></button>`).join('')}</div>` : ''}
    <div class="an-tiles">${on === 'custom' ? tile('custom', 'Custom', true) : ''}${PRESETS[trigger].map((p) => tile(p.id, p.name)).join('')}</div>
    <div class="an-foot"><button type="button" class="an-footbtn" data-anim="blank">Start blank</button></div></div>`;
}

// Edge hit regions take a drag (top, bottom, left 11, right 44); a click on them does nothing.
export const HITS = '<button type="button" class="sc-hit sc-t" tabindex="-1" aria-hidden="true"></button><button type="button" class="sc-hit sc-b" tabindex="-1" aria-hidden="true"></button><button type="button" class="sc-hit sc-l" tabindex="-1" aria-hidden="true"></button><button type="button" class="sc-hit sc-r" tabindex="-1" aria-hidden="true"></button>';
export const resetBtn = (attrs, on) => `<button type="button" class="sc-reset${on ? ' is-on' : ''}" ${attrs} aria-label="Reset to default value" tabindex="-1"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7.5 7.5l7 7M14.5 7.5l-7 7"/></svg></button>`;
// A field's parts, as read (CAP-T6FIELDS.json): <> on hover and focus, and a bar that shows only in a drag.
export const ARROWS = '<span class="sc-arrows" aria-hidden="true"><svg width="22" height="28" viewBox="0 0 22 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 10L5 14l3.5 4M13.5 10L17 14l-3.5 4"/></svg></span>';
export const barAt = (v, [lo, hi]) => (Math.min(1, Math.max(0, (parseFloat(v) - lo) / (hi - lo))) - 1) * 100;
export const barHtml = (v, range) => `<span class="sc-bar" aria-hidden="true"><i style="transform:translateX(${barAt(v, range)}%)"></i></span>`;
// The bar's range for each of the eight values, in the order of REST. Scale, Offset and Skew fit their reads; typed values go past them.
export const POSE_RANGE = [[0, 100], [-360, 360], [0, 200], [0, 200], [-1000, 1000], [-1000, 1000], [-60, 60], [-60, 60]];

const field = (key, value, reset, extra = '') => {
  const pose = /:(\d)/.exec(key);
  return `<span class="an-box sc-box${extra}" data-field="${key}">${pose ? barHtml(value, POSE_RANGE[pose[1]]) : ''}<input type="text" data-afield="${key}" value="${esc(value)}" autocomplete="off" spellcheck="false">${HITS}${extra.includes('is-axis') ? `<b class="an-axis">${key.endsWith('X') ? 'X' : 'Y'}</b>` : ARROWS}${resetBtn(`data-anim="reset" data-key="${key}"`, reset)}</span>`;
};
const line = (label, control) => `<div class="an-f"><span class="an-l">${label}</span>${control}</div>`;
const select = (key, value, glyph = '') => `<button type="button" class="an-sel" data-anim="sel" data-key="${key}" aria-haspopup="listbox">${glyph}<span>${esc(value)}</span>${CHEVRON}</button>`;

const POSE_ROWS = [['Opacity', 0], ['Rotate', 1], ['Scale', 2, 3], ['Offset', 4, 5], ['Skew', 6, 7]];
function poseHtml(a, key) {
  const p = a[key] || REST;
  const one = (i, axis) => field(`${key}:${i}${axis || ''}`, p[i], p[i] !== REST[i], axis ? ' is-axis' : '');
  return POSE_ROWS.map(([l, i, j]) => `<div class="an-f an-p"><span class="an-l">${l}</span><span class="an-pv-row${j ? ' is-pair' : ''}">${j ? one(i, 'X') + one(j, 'Y') : one(i)}</span></div>`).join('')
    + (hasPoseNote(a.trigger) ? '<p class="an-note">Values are relative to design settings</p>' : '');
}
function timingField(a, label, key) { return line(label, field(key, a[key], a[key] !== defaultOf(a, key))); }
function easeRows(a, withTimes = true) {
  let h = line('Ease', select('ease', a.ease, easeGlyph(a)));
  if (a.ease === 'Custom') h += `<div class="an-f an-cease"><span class="an-cbox"><i>(</i><input type="text" data-afield="custom" aria-label="Custom Ease" value="${esc(a.custom || '0, 0, 1, 1')}" autocomplete="off" spellcheck="false"><i>)</i></span></div>`;
  if (!withTimes) return h;
  if (a.ease === 'Spring') h += timingField(a, 'Bounce', 'bounce');
  return h + timingField(a, 'Duration', 'duration') + timingField(a, 'Delay', 'delay');
}
const EDGES = [['Top', 'M4 18h16M8 6h8v8H8z'], ['Middle', 'M4 12h16M8 6h8v12H8z'], ['Bottom', 'M4 6h16M8 10h8v8H8z']];
const edges = (key, cur) => `<span class="an-edges">${EDGES.map(([n, d]) => `<button type="button" class="an-edge${n === cur ? ' is-on' : ''}" data-anim="edge" data-key="${key}" data-v="${n}" aria-label="${n}">${svg(`<path d="${d}"/>`, 18)}</button>`).join('')}</span>`;
function scrollRows(a) {
  let h = line('When', select('when', a.when)) + line('Action', select('action', a.action));
  if (a.action === 'Passes') h += line('Start', edges('startEdge', a.startEdge)) + timingField(a, 'Passes', 'startPasses') + line('End', edges('endEdge', a.endEdge)) + timingField(a, 'Passes', 'endPasses');
  else if (a.action === 'Custom') h += timingField(a, 'Top Inset', 'topInset') + timingField(a, 'Bottom Inset', 'bottomInset') + line('Start', select('startCross', a.startCross)) + timingField(a, 'Passes', 'startPasses') + line('End', select('endCross', a.endCross)) + timingField(a, 'Passes', 'endPasses');
  else h += timingField(a, 'Start', 'startPasses') + timingField(a, 'End', 'endPasses');
  return h + easeRows(a, false) + timingField(a, 'Iterations', 'iterations');
}
function timingHtml(a) {
  switch (a.trigger) {
    case 'loop': return line('Type', select('type', a.type)) + easeRows(a);
    case 'scroll': return scrollRows(a);
    case 'appear': return easeRows(a) + line('When', select('when', a.when)) + line('Edge', edges('edge', a.edge)) + timingField(a, 'Passes Screen', 'screen');
    case 'follow': return line('Motion', select('motion', a.motion)) + line('On', select('on', a.on)) + timingField(a, 'Smoothing', 'smoothing') + timingField(a, 'Radius', 'radius') + timingField(a, 'Bounce', 'bounce')
      + line('Snap Back', `<label class="sp-switch"><input type="checkbox" data-afield="snap" aria-label="Snap Back"${a.snap ? ' checked' : ''}><span aria-hidden="true"></span></label>`);
    default: return easeRows(a);
  }
}
export function animEditorHtml(a, tab) {
  const tabs = TABS[a.trigger];
  const key = poseKey(tab);
  const foot = a.trigger === 'scroll' ? '<button type="button" class="an-footbtn is-off" disabled>Scroll to preview</button>'
    : `<button type="button" class="an-footbtn" data-anim="play"${a.trigger === 'follow' ? ' data-unbuilt disabled' : ''}>Preview</button>`;
  return `<div class="an-view an-editor">${BACK}<div class="an-head">${triggerName(a.trigger)}</div>
    <div class="an-stage"><span class="an-sq"></span></div>
    <div class="an-tabs an-t${tabs.length}" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="an-tab${t === tab ? ' is-on' : ''}" aria-selected="${t === tab}" data-anim="tab" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="an-rows">${key ? poseHtml(a, key) : timingHtml(a)}</div>
    <div class="an-foot">${foot}</div></div>`;
}
export function animOptionsHtml(key, cur) { return OPTIONS[key].map((o) => `<button type="button" role="option" class="${o === cur ? 'is-cur' : ''}" data-an-opt="${esc(o)}">${esc(o)}</button>`).join(''); }
