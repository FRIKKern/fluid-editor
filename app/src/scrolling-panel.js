// Scrolling's panel (T12). Each row's name, kind, default and what a change does on the block: CAP-ROWSSCROLLING.json and
// CAP-ROWSSCROLLING2.json (two reads, every row alike). Where each row sits, the Text Style list, Text Size's more and an
// item's view: CAP-T12SCROLLPANEL-A.json to -C.json (each place read twice, alike).
// Content: the items, Add Item, and Link with Attach link. Design: Wave Intensity, Text Style, Text Size, Direction, Speed,
// Pause on hover, Fade edges and Item Spacing, then the shared Background, Stroke, Blend Mode, Blur and Transforms.
// Built: the values, each kept on the block as one undo step; Wave Intensity and Text Size set its height and the rows follow
// (editor.js setScrolling); Text Style and Item Spacing set its words. The list (CAP-T12SCROLLLIST.json, each read twice):
// Add Item appends "Dream it" and stays on the list; a row opens its view, whose Text shows on the block at each key and is
// one undo step, Duplicate puts a copy after it and Delete takes it, both back to the list; the trash deletes at once and the
// last item has none; the grip moves an item (editor.js, with the Accordion's). Each is one undo step. The words move along
// the wave by marquee.js (CAP-T12WAVE.json). Attach link opens the shared link editor (editor.js onLinkAction) beside the
// panel; a page links the whole block (render.js .marquee-hitbox) and the Link row shows it (block-panel.js linkRowHtml) once the
// editor closes: while an opening on no link yet stays open the row still reads Attach link (c.linkHeld; CAP-T12LINKKEYS.json
// D1, H1, A1 and CAP-T12LINKZ.json Z1, Z3, Z5, Z8, R1 and R2 alike).
import { escapeHtml as esc } from './render.js';
import { linkRowHtml } from './block-panel.js';

const pi = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// The --marquee-font-size-value each choice writes (CAP-ROWSSCROLLING.json: 1.5 new, Medium 4, Large 8).
export const SCROLL_SIZES = { S: 1.5, M: 4, L: 8 };
export const SCROLL_ITEMS = ['Dream it', '〰️'];
// What Add Item adds, also after the first item was renamed (CAP-T12SCROLLLIST.json scroll6-b, scroll7-a).
export const SCROLL_NEW_ITEM = 'Dream it';
export const scrollItems = (b) => b.items || [b.text || ''];
const sizeKey = (c) => (c.sizeMore ? 'more' : Object.keys(SCROLL_SIZES).find((k) => SCROLL_SIZES[k] === c.size) || 'more');
// What the panel shows, from the block.
// Wave Intensity is the view's own: set in the phone view it is the phone's (waveMobile, dotted, the phone button on) and
// the desktop keeps its line and rows; until then the phone follows the desktop's (CAP-T12WAVEVIEWS.json, R1 and R2 alike).
// waveIn is the stored value (none on an imported block, which draws 120; render.js).
export const waveIn = (b, view) => (view === 'mobile' && b.waveMobile != null ? b.waveMobile : b.wave);
export const scrollOf = (b, view = 'desktop') => ({ items: scrollItems(b), wave: waveIn(b, view) ?? 0, size: b.size ?? 1.5, sizeMore: !!b.sizeMore, style: b.scrollStyle || 'heading', direction: b.direction || 'left', speed: b.speed ?? 1, pause: !!b.pauseHover, fade: !!b.fadeEdges, spacing: b.spacing ?? 0.5 });
const num = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

const grip = '<span class="bp-acc-grip bp-scr-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
export function scrollingContentHtml(c) {
  if (c.item != null) {
    const t = c.items[c.item] ?? '';
    return `<div class="bp-sub bp-scr-sub"><button type="button" class="bp-back" data-scr="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>${esc(t)}</span></div>`
      + `<div class="bp-scr-cap is-text">Text</div><input class="bp-scr-text" type="text" aria-label="Text" value="${esc(t)}" data-scr-text="${c.item}" autocomplete="off" spellcheck="false"><div class="bp-scr-line"></div>`
      + `<div class="bp-scr-acts"><button type="button" data-scr="dup:${c.item}">Duplicate</button><button type="button" class="is-red" data-scr="del:${c.item}">Delete</button></div>`;
  }
  return `<div class="bp-scr-list">${c.items.map((t, n) => `<div class="bp-acc-row bp-scr-row">${grip}<span class="bp-acc-t" aria-hidden="true">T</span><button type="button" class="bp-acc-name" data-scr="open:${n}" aria-label="${esc(t)}">${esc(t)}</button>${c.items.length > 1 ? `<button type="button" class="bp-acc-trash" data-scr="del:${n}" aria-label="Delete ${esc(t)}">${pi('<path d="M5 7h14M10 7V4h4v3M7 7v13h10V7M10.5 11v5M13.5 11v5"/>')}</button>` : ''}<button type="button" class="bp-acc-go" data-scr="open:${n}" aria-hidden="true" tabindex="-1">${pi('<path d="M9 6l6 6-6 6"/>')}</button></div>`).join('')}</div>`
    + `<button type="button" class="bp-scr-add" data-scr="add">Add Item</button><div class="bp-scr-cap is-link">Link</div>${c.href && !c.linkHeld ? linkRowHtml(c.href, c.pages) : `<button type="button" class="bp-scr-attach bp-attach" data-link="open"${c.linkHeld ? ' data-held' : ''}>Attach link</button>`}`;
}

// The editor closed, by a press away or on Undo: the held Attach link turns into the Link row, only that button, so the press
// that closed it lands where it was (CAP-T12LINKUNDO.json A and B Undo: the row shows About).
export function showHeldLink(panel, href, pages) {
  const held = panel.querySelector('.bp-scr-attach[data-held]');
  if (!held) return;
  if (href) held.outerHTML = linkRowHtml(href, pages); else delete held.dataset.held;
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

// The presses. api: block() the selected Scrolling block or null; set(change, label, before, live, keep) changes it (one undo
// step unless live; live 'drag' for a range's moves while held); snapshot() the model; commit(before, label, held, force) takes a step for what is in the model (held: the
// panel is left as it is; force: a step also when nothing changed); settle() gives a drag's last fall its rows at the let go,
// true when that changed the model; view(n) opens item
// n's view, or Content's list with null; phone() is true in the phone view.
let flushText = () => {};
export function wireScrolling(panel, api) {
  const DEF = { size: 1.5, direction: 'left', speed: 1, spacing: 0.5 };
  const write = (b, key, v) => { if (key === 'wave' && api.phone()) b.waveMobile = v; else if (v === DEF[key] && key !== 'size') delete b[key]; else b[key] = v; };
  // The model before a range's drag, for its key and block, and the model its last input left. A drag that ends where it
  // began fires no change, so any other press drops it, and so does any change made since (Cmd+Z, Redo, another edit):
  // a later commit never takes an older snapshot.
  // A drag's undo steps (CAP-T12WAVEDRAG.json, Wave Intensity in the phone view and on the desktop, read twice): a pause of
  // a second or more between two values ends a step, and letting go takes the last one, also when the value is back where
  // the drag began (no change fires then). Values 300 to 870 ms apart are one step, 1100 ms or more apart one step each;
  // 1000 ms is inferred, as in typing (editor.js TYPING_PAUSE). Item Spacing and Text Size's range: not read, the same here.
  const DRAG_PAUSE = 1000;
  let rangeBefore = null;
  // held: the drag goes on, so the panel stays as it is (drawn again, its range would drop the drag).
  // A let go takes its step even when the model is back where the drag began (N: the Scrolling block alone, 90 out to 180
  // and back, Cmd+Z leaves it as it was).
  const stepNow = (b, held, force = false) => { if (rangeBefore?.bid !== b.id || rangeBefore.at !== api.snapshot() || (!force && rangeBefore.snap === rangeBefore.at)) return false; api.commit(rangeBefore.snap, `${rangeBefore.key} ${rangeBefore.v}`, held, force); return true; };
  const letGo = () => { const b = api.block(); if (rangeBefore?.drag && b && stepNow(b, false, true)) rangeBefore = null; };
  // At the let go the drag's last fall takes its rows first (editor.js settleScrollDrag), and the step takes them along.
  // A touch drag the browser ends with a pointercancel (no pointerup, no change) lets go the same way.
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, () => { if (rangeBefore?.drag && rangeBefore.at === api.snapshot() && api.settle()) rangeBefore.at = api.snapshot(); setTimeout(letGo, 0); }, true);
  panel.addEventListener('click', (e) => {
    const b = api.block();
    if (!b) return;
    if (!e.target.closest('[data-scr-range]')) rangeBefore = null;
    const nav = e.target.closest('[data-scr]');
    if (nav) {
      flushText();
      const [act, k] = nav.dataset.scr.split(':'), n = Number(k);
      if (act === 'open') { api.view(n); return; }
      if (act === 'back') { api.view(null); return; }
      // The list's and the view's changes: each one undo step, and Duplicate and Delete go back to the list.
      const items = (x) => (x.items = [...scrollItems(x)]);
      if (act === 'add') api.set((x) => items(x).push(SCROLL_NEW_ITEM), 'Item added');
      else if (act === 'dup') { api.view(null); api.set((x) => { const l = items(x); l.splice(n + 1, 0, l[n]); }, 'Item duplicated'); }
      else if (act === 'del' && scrollItems(b).length > 1) { api.view(null); api.set((x) => items(x).splice(n, 1), 'Item deleted'); }
      return;
    }
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
  // An item's Text shows on the block at each key; the typing is one undo step, taken when the field is left (CAP-T12SCROLLLIST.json).
  // Left by a press (Back, Duplicate, Delete), the step waits for that press's click: taken at its mousedown, the panel drawn
  // again would swallow the click.
  let textBefore = null, pending = null, down = false, moved = false;
  // An undo or another change since the typing took it away with the model: nothing is left to take. Another block
  // selected meanwhile: the words are in the model already, so only the step is taken.
  const flush = () => {
    if (!pending) return;
    const p = pending;
    pending = null;
    if (api.snapshot() !== p.at) return;
    if (api.block()?.id === p.bid) api.set((x) => { (x.items = [...scrollItems(x)])[p.n] = p.v; }, 'Item text changed', p.before, false, true);
    else api.commit(p.before, 'Item text changed');
  };
  flushText = flush;
  addEventListener('pointerdown', () => { down = true; moved = false; }, true);
  // A move while held: the range's inputs from now on are a drag's, not the press's own (setScrolling, a desktop drag).
  addEventListener('pointermove', () => { if (down) moved = true; }, true);
  // A press's click takes it first, ahead of the press's own work (Undo then undoes the typing); a press with no click after.
  addEventListener('click', flush, true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, () => { down = false; setTimeout(flush, 0); }, true);
  panel.addEventListener('input', (e) => {
    const f = e.target.closest('[data-scr-text]'), b = api.block();
    if (!f || !b) return;
    const n = Number(f.dataset.scrText), now = api.snapshot();
    if (textBefore?.bid !== b.id || textBefore.at !== now) textBefore = { bid: b.id, snap: now };
    api.set((x) => { (x.items = [...scrollItems(x)])[n] = f.value; }, '', null, true);
    textBefore.at = api.snapshot();
  });
  panel.addEventListener('change', (e) => {
    const f = e.target.closest('[data-scr-text]'), b = api.block();
    if (!f || !b || textBefore?.bid !== b.id || textBefore.at !== api.snapshot()) return;
    pending = { bid: b.id, n: Number(f.dataset.scrText), v: f.value, before: textBefore.snap, at: textBefore.at };
    textBefore = null;
    if (!down) flush();
  });
  // A range's drag shows on the block as it goes; letting go is the undo step.
  panel.addEventListener('input', (e) => {
    const r = e.target.closest('[data-scr-range]'), b = api.block();
    if (!r || !b) return;
    const key = r.dataset.scrRange, v = Number(r.value), t = performance.now();
    if (rangeBefore?.key === key && t - rangeBefore.t >= DRAG_PAUSE && stepNow(b, true)) rangeBefore.snap = rangeBefore.at = api.snapshot();
    const now = api.snapshot();
    if (rangeBefore?.key !== key || rangeBefore.bid !== b.id || rangeBefore.at !== now) rangeBefore = { key, bid: b.id, snap: now };
    rangeBefore.t = t; rangeBefore.v = v; rangeBefore.drag = down;
    r.style.setProperty('--p', `${((v - r.min) / (r.max - r.min)) * 100}%`);
    const f = panel.querySelector(`[data-scr-field="${key}"]`);
    if (f) f.value = `${num(v)}${f.dataset.unit}`;
    // The label names the key for setScrolling's rows rule; a live step is no undo step, so it is not shown.
    api.set((x) => write(x, key, v), `${key} ${v}`, null, down && moved ? 'drag' : true);
    rangeBefore.at = api.snapshot();
  });
}
