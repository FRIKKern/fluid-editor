// Art's rows behind Edit Settings (parity/findings/CAP-ARTROWS.json). The rows hold values; the picture is
// our CSS stand-in for the oracle's WebGL art and does not follow them (0005).
import { ART_ROWS } from './section-art-rows-data.js';

export const IMAGE_PRESETS = ['Blob 1', 'Blob 2', 'Brush 1', 'Brush 2', 'Brush 3', 'Circle 1', 'Polygon 1', 'Polygon 2'];
export const IMAGE_FILTERS = ['None', 'Circle', 'Cross stitch', 'Cube', 'Gingham', 'Gradient circle', 'Houndstooth', 'Stitch'];
// Our own stand-ins for the preset pictures, drawn with a named CSS shape.
const PRESET_SHAPE = { 'Blob 1': 'ellipse(44% 34% at 50% 50%)', 'Blob 2': 'polygon(50% 5%, 60% 40%, 95% 30%, 65% 55%, 80% 95%, 50% 70%, 20% 95%, 35% 55%, 5% 30%, 40% 40%)', 'Brush 1': 'polygon(15% 10%, 30% 10%, 90% 80%, 80% 92%)', 'Brush 2': 'polygon(10% 25%, 25% 10%, 90% 75%, 75% 90%)', 'Brush 3': 'polygon(10% 25%, 90% 15%, 85% 40%, 15% 50%, 90% 55%, 85% 80%, 15% 85%)', 'Circle 1': 'circle(38% at 50% 50%)', 'Polygon 1': 'polygon(50% 0, 62% 30%, 100% 50%, 62% 70%, 50% 100%, 38% 70%, 0 50%, 38% 30%)', 'Polygon 2': 'polygon(30% 5%, 70% 5%, 95% 30%, 95% 70%, 70% 95%, 30% 95%, 5% 70%, 5% 30%)' };

const num = (v) => String(+(+v).toFixed(2));
const fill = (r, v) => `--p:${((v - r.min) / (r.max - r.min)) * 100}%`;
const value = (set, k, start) => set?.[k] ?? start;

const rangeRow = (label, r, k, set) => { const v = value(set, k, r.v); return `<div class="ar-range"><label class="ar-range-l"><span>${label}</span><input type="text" data-act="artRange" data-k="${k}" data-min="${r.min}" data-max="${r.max}" aria-label="${label}" value="${num(v)}"></label><input type="range" data-act="artRange" data-k="${k}" aria-label="${label}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" style="${fill(r, v)}"></div>`; };
const inlineRange = (group, r, k, set) => { const v = value(set, k, r.v); return `<div class="ar-inline"><input type="range" data-act="artRange" data-k="${k}" aria-label="${group}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" style="${fill(r, v)}"><input type="text" data-act="artRange" data-k="${k}" data-min="${r.min}" data-max="${r.max}" aria-label="${group}" value="${num(v)}"></div>`; };

const MORE = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="4" cy="9" r="1.4"/><circle cx="9" cy="9" r="1.4"/><circle cx="14" cy="9" r="1.4"/></svg>';
function segRow(row, k, set) {
  const now = value(set, k, row.on), n = row.opts.length + (row.noMore ? 0 : 1);
  const btn = (v, label, html, on) => `<button type="button" class="ar-seg${on ? ' is-on' : ''}" style="width:${284 / n}px" data-sact="artSeg" data-k="${k}" data-v="${v}" aria-label="${label}" aria-pressed="${on}">${html}</button>`;
  const sliders = now !== 'more' ? '' : row.sliders.map((r, m) => (r.inline ? inlineRange(row.seg, r, `${k}.${m}`, set) : rangeRow(r.label, r, `${k}.${m}`, set))).join('');
  return `<div class="ar-group">${row.seg ? `<div class="ar-head">${row.seg}</div>` : ''}<div class="ar-segs">${row.opts.map((o, v) => btn(v, o, o, now === v)).join('')}${row.noMore ? '' : btn('more', row.seg, MORE, now === 'more')}</div>${sliders}</div>`;
}
function rowsHtml(rows, f, set) {
  return rows.map((row, n) => {
    const k = `${f}.${n}`;
    if (row.head) return `<div class="ar-group ar-head-only"><div class="ar-head">${row.head}</div></div>`;
    if (row.opts) return segRow(row, k, set);
    if (row.range !== undefined) return rangeRow(row.range, row, k, set);
    const on = value(set, k, row.on);
    return `<label class="ar-check"><span>${row.check}</span><span class="sp-switch"><input type="checkbox" data-act="artCheck" data-k="${k}" aria-label="${row.check}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></span></label>${on ? (row.reveals || []).map((r, m) => rangeRow(r.range, r, `${k}.r${m}`, set)).join('') : ''}`;
  }).join('');
}
const CHEV = (open) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" style="transform:rotate(${open ? 90 : 0}deg)"><path d="M9 5l7 7-7 7"/></svg>`;

// The folded rows of a tile. `more` holds which folds are open.
export function artRowsHtml(name, set, more) {
  return ART_ROWS[name].filter((f) => f.fold).map((f, i) => {
    const open = !!more[`artFold:${f.fold}`];
    return `<div class="ar-fold${open ? ' is-open' : ''}"><button type="button" class="ar-fold-b" data-sact="artFold" data-v="${f.fold}" aria-expanded="${open}">${CHEV(open)}<span>${f.fold}</span></button>${open ? `<div class="ar-fold-body" style="padding-bottom:${f.pad}px">${rowsHtml(f.rows, i, set)}</div>` : ''}</div>`;
  }).join('');
}

// The Images tile: Presets or Custom image above the colors, then its open rows with Filter and Pattern color.
export function artImagesTop(set, more) {
  const custom = !!more.artCustom, on = value(set, 'preset', 'Brush 2');
  const tab = (act, label, is) => `<button type="button" class="ar-tab${is ? ' is-on' : ''}" data-sact="artTab" data-v="${act}" aria-label="${label}">${label}</button>`;
  const pane = custom
    ? `<button type="button" class="ar-add" data-sact="artAddImage">${set?.custom ? 'Replace Image' : 'Add an Image'}</button><input type="file" accept="image/*" hidden data-art-image>`
    : `<div class="ar-presets">${IMAGE_PRESETS.map((p) => `<button type="button" class="ar-preset${p === on ? ' is-on' : ''}" data-sact="artPreset" data-v="${p}" aria-label="${p}" title="${p}" aria-pressed="${p === on}"><i style="clip-path:${PRESET_SHAPE[p]}"></i></button>`).join('')}</div>`;
  return `<div class="ar-box"><div class="ar-tabs">${tab('', 'Presets', !custom)}${tab('custom', 'Custom image', custom)}</div>${pane}</div>`;
}
export function artImagesRows(set, more, patternRow) {
  const [scale, count, wave] = ART_ROWS.images[0].rows, f = value(set, 'filter', 'Stitch'), open = more.artFilterOpen;
  const list = open ? `<div class="sp-options" role="listbox" style="top:${-45 * IMAGE_FILTERS.indexOf(f)}px">${IMAGE_FILTERS.map((n) => `<button type="button" role="option" class="sp-option${n === f ? ' is-on' : ''}" aria-selected="${n === f}" data-sact="artFilter" data-v="${n}">${n}</button>`).join('')}</div>` : '';
  const filter = `<div class="ar-filter"><span>Filter</span><div class="sp-select-wrap"><button type="button" class="sp-select" data-sact="artFilterOpen" aria-label="Filter" aria-expanded="${!!open}"><span>${f}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg></button>${list}</div></div>`;
  return `<div class="ar-img-rows">${rowsHtml([scale, count], 0, set)}${filter}${patternRow}${rowsHtml([wave], 1, set)}</div>`;
}

// A seg press: more, or a preset whose value (when it has one) goes to its slider.
export function artSeg(name, set, k, v) {
  const [f, n] = k.split('.').map(Number), tile = ART_ROWS[name];
  const row = name === 'images' ? tile[0].rows[f === 1 ? 2 : n] : tile[f].rows[n];
  const next = { ...set, [k]: v === 'more' ? 'more' : Number(v) };
  if (v !== 'more' && row.values?.[Number(v)] != null) next[`${k}.0`] = row.values[Number(v)];
  return next;
}
export const clampArt = (input) => {
  const min = Number(input.min || input.dataset.min), max = Number(input.max || input.dataset.max);
  return Math.min(max, Math.max(min, parseFloat(input.value) || 0));
};
