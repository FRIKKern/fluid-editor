// The Image Effect panel (parity/findings/IMAGEEFFECT.json): six tiles, then one effect's settings.
import { EFFECTS, EFFECT_ORDER } from './image-effects.js';

const pi = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
const BACK = `<button type="button" class="bp-back bp-fx-back" data-fx-nav="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button>`;
const SHUFFLE = pi('<path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c1.8 0 3.2-1.3 4.5-3M13.5 10c1.3-1.7 2.7-3 4.5-3h3M18 4l3 3-3 3M18 14l3 3-3 3"/>');
const SLIDERS = pi('<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="17" r="2"/>');
const DOTS = '<svg width="20" height="4" viewBox="0 0 20 4" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.5"/><circle cx="10" cy="2" r="1.5"/><circle cx="18" cy="2" r="1.5"/></svg>';

function tileHtml(kind, cur) {
  const name = EFFECTS[kind].name;
  if (kind !== cur) return `<button type="button" class="bp-fx-tile" aria-label="${name}" aria-pressed="false" data-fx-tile="${kind}"><canvas width="125" height="108" data-fx-still="${kind}"></canvas></button>`;
  return `<div class="bp-fx-tile is-on" role="group" aria-label="${name}"><span class="bp-fx-crop"><canvas width="125" height="108" data-fx-still="${kind}"></canvas></span><button type="button" class="bp-fx-act" aria-label="Shuffle Settings" data-fx-shuffle>${SHUFFLE}</button><button type="button" class="bp-fx-act" aria-label="Edit Settings" data-fx-nav="settings">${SLIDERS}</button></div>`;
}

function listHtml(cur) {
  return `<div class="bp-ishape-head">${BACK}<span>Image Effect</span></div><div class="bp-fx-body"><div class="bp-fx-grid">`
    + `<button type="button" class="bp-fx-tile bp-fx-none${cur ? '' : ' is-on'}" aria-label="None" aria-pressed="${!cur}" data-fx-tile="none">NONE</button>`
    + EFFECT_ORDER.map((k) => tileHtml(k, cur)).join('')
    + '</div><p class="bp-fx-note">Image effects will only appear in browsers that support WebGL.</p></div>';
}

function rangeHtml([, label, key, min, max], v) {
  // The line fills from zero, or from the start when zero is out of range (Taper's fills from the middle).
  const at = (x) => ((x - min) / (max - min)) * 100, zero = at(Math.max(min, Math.min(max, 0))), p = at(v);
  return `<div class="bp-fx-range"><div class="bp-fx-head"><span>${label}</span><input type="text" aria-label="${label}" data-fx-field="${key}" data-min="${min}" data-max="${max}" value="${v}"></div>`
    + `<input type="range" aria-label="${label}" data-fx-range="${key}" min="${min}" max="${max}" step="1" value="${v}" style="--from:${Math.min(zero, p)}%;--to:${Math.max(zero, p)}%"></div>`;
}

function rowHtml(row, e) {
  const [type, label, key] = row;
  if (type === 'range') return row[5] && !row[5](e) ? '' : rangeHtml(row, e[key]);
  if (type === 'switch') return `<label class="bp-fx-switch"><span>${label}</span><span class="sp-switch"><input type="checkbox" aria-label="${label}" data-fx-switch="${key}"${e[key] ? ' checked' : ''}><span aria-hidden="true"></span></span></label>`;
  if (type === 'select') return `<button type="button" class="bp-fx-sel" aria-haspopup="listbox" aria-label="${label}" data-fx-sel="${key}"><span>${label}</span><span class="bp-fx-sel-v">${e[key]}${pi('<path d="M8 10l4-4 4 4M8 14l4 4 4-4"/>')}</span></button>`;
  const [, , , options, custom] = row, last = options.length - 1;
  const hasCustom = custom.length > 0;
  const buttons = options.map((o, i) => {
    const on = e[key] === o, more = hasCustom && i === last;
    return `<button type="button" role="radio" class="bp-fx-opt${on ? ' is-on' : ''}" aria-checked="${on}" aria-label="${o}" data-fx-seg="${key}" data-fx-val="${o}">${more ? DOTS : o}</button>`;
  }).join('');
  const rows = hasCustom && e[key] === options[last] ? custom.map((r) => rowHtml(r, e)).join('') : '';
  return `<div class="bp-fx-seglabel">${label}</div><div class="bp-fx-seg" role="radiogroup" aria-label="${label}" style="grid-template-columns:repeat(${options.length},1fr)">${buttons}</div>${rows}`;
}

function settingsHtml(e, open) {
  const def = EFFECTS[e.kind];
  const body = def.groups
    ? def.groups.map(([name, rows]) => {
      const on = open.includes(name);
      return `<button type="button" class="bp-fx-group" aria-expanded="${on}" data-fx-group="${name}">${pi(on ? '<path d="M6 9l6 6 6-6"/>' : '<path d="M9 6l6 6-6 6"/>')}<span>${name}</span></button>`
        + (on ? `<div class="bp-fx-rows">${rows.map((r) => rowHtml(r, e)).join('')}</div>` : '');
    }).join('')
    : `<div class="bp-fx-rows">${def.rows.map((r) => rowHtml(r, e)).join('')}</div>`;
  return `<div class="bp-ishape-head">${BACK}</div><div class="bp-fx-body">${body}<button type="button" class="bp-fx-shuffle" data-fx-shuffle>Shuffle Settings</button></div>`;
}

export const effectPanelHtml = ({ fxView, effect, fxOpen }) => (fxView === 'settings' && effect ? settingsHtml(effect, fxOpen) : listHtml(effect?.kind));
