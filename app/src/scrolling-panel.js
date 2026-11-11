// Scrolling's panel (T12). Each row's name, kind, default and what a change does on the block: CAP-ROWSSCROLLING.json and
// CAP-ROWSSCROLLING2.json (two reads, every row alike). Where each row sits, the Text Style list, Text Size's more and an
// item's view: CAP-T12SCROLLPANEL-A.json to -C.json (each place read twice, alike).
// Content: the items, Add Item, and Link with Attach link. Design: Wave Intensity, Text Style, Text Size, Direction, Speed,
// Pause on hover, Fade edges and Item Spacing, then the shared Background, Stroke, Blend Mode, Blur and Transforms.
// Built: the values, each kept on the block as one undo step; Wave Intensity and Text Size set its height and the rows follow
// (editor.js setScrolling); Text Style and Item Spacing set its words. Not built: the moving wave text, so Direction, Speed,
// Pause on hover and Fade edges keep their value and change nothing drawn; what Add Item, an item's field, Duplicate, Delete,
// the grip and Attach link do (not read: drawn, and they do nothing).
import { escapeHtml as esc } from './render.js';

const pi = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const UNBUILT = 'disabled data-unbuilt title="Not built yet"';
// The --marquee-font-size-value each choice writes (CAP-ROWSSCROLLING.json: 1.5 new, Medium 4, Large 8).
export const SCROLL_SIZES = { S: 1.5, M: 4, L: 8 };
export const SCROLL_ITEMS = ['Dream it', '〰️'];
export const scrollItems = (b) => b.items || [b.text || ''];
const sizeKey = (c) => (c.sizeMore ? 'more' : Object.keys(SCROLL_SIZES).find((k) => SCROLL_SIZES[k] === c.size) || 'more');
// What the panel shows, from the block.
export const scrollOf = (b) => ({ items: scrollItems(b), wave: b.wave ?? 0, size: b.size ?? 1.5, sizeMore: !!b.sizeMore, style: b.scrollStyle || 'heading', direction: b.direction || 'left', speed: b.speed ?? 1, pause: !!b.pauseHover, fade: !!b.fadeEdges, spacing: b.spacing ?? 0.5 });
const num = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

const grip = '<span class="bp-scr-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
export function scrollingContentHtml(c) {
  if (c.item != null) {
    const t = c.items[c.item] ?? '';
    return `<div class="bp-sub bp-scr-sub"><button type="button" class="bp-back" data-scr="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>${esc(t)}</span></div>`
      + `<div class="bp-scr-cap is-text">Text</div><input class="bp-scr-text" type="text" aria-label="Text" value="${esc(t)}" readonly data-unbuilt title="Not built yet"><div class="bp-scr-line"></div>`
      + `<div class="bp-scr-acts"><button type="button" ${UNBUILT}>Duplicate</button><button type="button" class="is-red" ${UNBUILT}>Delete</button></div>`;
  }
  return `<div class="bp-scr-list">${c.items.map((t, n) => `<div class="bp-acc-row bp-scr-row">${grip}<span class="bp-acc-t" aria-hidden="true">T</span><button type="button" class="bp-acc-name" data-scr="open:${n}" aria-label="${esc(t)}">${esc(t)}</button><button type="button" class="bp-acc-trash" aria-label="Delete ${esc(t)}" ${UNBUILT}>${pi('<path d="M5 7h14M10 7V4h4v3M7 7v13h10V7M10.5 11v5M13.5 11v5"/>')}</button><button type="button" class="bp-acc-go" data-scr="open:${n}" aria-hidden="true" tabindex="-1">${pi('<path d="M9 6l6 6-6 6"/>')}</button></div>`).join('')}</div>`
    + `<button type="button" class="bp-scr-add" ${UNBUILT}>Add Item</button><div class="bp-scr-cap is-link">Link</div><button type="button" class="bp-scr-attach" ${UNBUILT}>Attach link</button>`;
}

const seg = (cap, key, cur, opts) => `<div class="bp-scr-cap">${cap}</div><div class="bp-scr-seg is-${opts.length}" role="radiogroup" aria-label="${cap}">${opts.map(([v, label, face]) => `<button type="button" role="radio" class="bp-scr-opt${String(cur) === String(v) ? ' is-on' : ''}" aria-checked="${String(cur) === String(v)}" aria-label="${label}" data-scr-set="${key}" data-v="${v}">${face}</button>`).join('')}</div>`;
const sw = (key, on, label) => `<div class="sp-row bp-scr-sw"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" data-scr-set="${key}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label></div>`;
// A label and its value over a range (Item Spacing; Text Size's more).
const labelled = (label, key, v, unit, min, max, step) => `<div class="bp-scr-lab"><div class="bp-scr-labhead"><label class="sp-label">${label}</label><input type="text" aria-label="${label}" data-scr-field="${key}" data-unit="${unit}" data-min="${min}" data-max="${max}" value="${num(v)}${unit}" autocomplete="off" spellcheck="false"></div><input type="range" aria-label="${label}" data-scr-range="${key}" min="${min}" max="${max}" step="${step}" value="${v}" style="--p:${((v - min) / (max - min)) * 100}%"></div>`;
const MORE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>';
export function scrollingDesignHtml(c) {
  const k = sizeKey(c);
  // Wave Intensity: a range of 0 to 180 by 30, a dot at each step (7, 45 apart).
  return `<div class="bp-scr"><div class="bp-scr-wave"><label class="sp-label">Wave Intensity</label><div class="bp-scr-steps">${[0, 1, 2, 3, 4, 5, 6].map((n) => `<i style="left:${n * 45}px"></i>`).join('')}<input type="range" aria-label="Wave Intensity" data-scr-range="wave" min="0" max="180" step="30" value="${c.wave}" style="--p:${(c.wave / 180) * 100}%"></div></div>`
    // Text Style: a list of Heading and Paragraph over the row, the chosen one on it (editor.js accmenu).
    + `<button type="button" class="bp-scr-style" data-acc-menu="scrollStyle" aria-haspopup="listbox" aria-label="Text Style"><span class="sp-label">Text Style</span><span class="bp-scr-v">${c.style === 'paragraph' ? 'Paragraph' : 'Heading'}${pi('<path d="M7 10l5 5 5-5"/>')}</span></button>`
    + seg('Text Size', 'size', k, [['S', 'Small text size', 'S'], ['M', 'Medium text size', 'M'], ['L', 'Large text size', 'L'], ['more', '', MORE]])
    // The more choice keeps the size and shows it in rem, 1 to 50 by 0.1 (CAP-T12SCROLLPANEL-B.json and -C.json).
    + (k === 'more' ? labelled('Text Size', 'size', c.size, 'rem', 1, 50, 0.1) : '')
    + seg('Direction', 'direction', c.direction, [['left', 'Animation direction left', pi('<path d="M19 12H5M11 6l-6 6 6 6"/>')], ['right', 'Animation direction right', pi('<path d="M5 12h14M13 6l6 6-6 6"/>')]])
    + seg('Speed', 'speed', c.speed, [[0.5, 'Animation speed 0.5x', '0.5x'], [1, 'Animation speed 1x', '1x'], [2, 'Animation speed 2x', '2x']])
    + sw('pauseHover', c.pause, 'Pause on hover') + sw('fadeEdges', c.fade, 'Fade edges')
    + labelled('Item Spacing', 'spacing', c.spacing, 'em', 0, 3, 0.1) + '</div>';
}

// The presses. api: block() the selected Scrolling block or null; set(change, label, before, live) changes it (one undo
// step unless live); view(n) opens item n's view, or Content's list with null.
export function wireScrolling(panel, api) {
  const DEF = { size: 1.5, direction: 'left', speed: 1, spacing: 0.5 };
  const write = (b, key, v) => { if (v === DEF[key] && key !== 'size') delete b[key]; else b[key] = v; };
  // The model before a range's drag, for its key and block, and the model its last input left. A drag that ends where it
  // began fires no change, so any other press drops it, and so does any change made since (Cmd+Z, Redo, another edit):
  // a later commit never takes an older snapshot.
  let rangeBefore = null;
  panel.addEventListener('click', (e) => {
    const b = api.block();
    if (!b) return;
    if (!e.target.closest('[data-scr-range]')) rangeBefore = null;
    const nav = e.target.closest('[data-scr]');
    if (nav) { const [act, n] = nav.dataset.scr.split(':'); api.view(act === 'open' ? Number(n) : null); return; }
    const o = e.target.closest('button[data-scr-set]');
    if (!o || o.getAttribute('aria-checked') === 'true') return;
    const key = o.dataset.scrSet, v = o.dataset.v;
    if (key === 'size') api.set((x) => { if (v === 'more') x.sizeMore = true; else { delete x.sizeMore; x.size = SCROLL_SIZES[v]; } }, `Text size ${v}`);
    else api.set((x) => write(x, key, key === 'speed' ? Number(v) : v), `${key} ${v}`);
  });
  panel.addEventListener('change', (e) => {
    const b = api.block(), t = e.target;
    if (!b) return;
    if (t.matches('input[type=checkbox][data-scr-set]')) { rangeBefore = null; const key = t.dataset.scrSet, on = t.checked; api.set((x) => { if (on) x[key] = true; else delete x[key]; }, `${key} ${on ? 'on' : 'off'}`); return; }
    const r = t.closest('[data-scr-range]'), f = t.closest('[data-scr-field]');
    if (!r && !f) return;
    const key = (r || f).dataset.scrRange || f.dataset.scrField, before = rangeBefore?.key === key && rangeBefore.bid === b.id && rangeBefore.at === api.snapshot() ? rangeBefore.snap : null;
    rangeBefore = null;
    const v = r ? Number(r.value) : Math.max(Number(f.dataset.min), Math.min(Number(f.dataset.max), Math.round((parseFloat(f.value) || 0) * 10) / 10));
    api.set((x) => write(x, key, v), `${key} ${v}`, before ?? undefined);
  });
  // A range's drag shows on the block as it goes; letting go is the undo step.
  panel.addEventListener('input', (e) => {
    const r = e.target.closest('[data-scr-range]'), b = api.block();
    if (!r || !b) return;
    const key = r.dataset.scrRange, v = Number(r.value);
    const now = api.snapshot();
    if (rangeBefore?.key !== key || rangeBefore.bid !== b.id || rangeBefore.at !== now) rangeBefore = { key, bid: b.id, snap: now };
    r.style.setProperty('--p', `${((v - r.min) / (r.max - r.min)) * 100}%`);
    const f = panel.querySelector(`[data-scr-field="${key}"]`);
    if (f) f.value = `${num(v)}${f.dataset.unit}`;
    api.set((x) => write(x, key, v), '', null, true);
    rangeBefore.at = api.snapshot();
  });
}
