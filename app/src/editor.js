// Editor shell. The page renders inside an iframe (like #sqs-site-frame), so
// media queries see the preview width. All gestures write to the model only
// on commit; during a gesture we change inline styles and editor layers.
import { renderPage, renderSection, renderHeader, HEADER_SCRIPT, exportHtml, LAST_LINE, COLS, DESIGN_DEFAULTS, ACCORDION_DESCRIPTION } from './render.js';
import * as fmt from './text-format.js';
import { cleanPaste, insertPaste } from './paste.js';
import { toolbarItems, toolbarHtml, toolbarPosition, groupToolbarHtml } from './toolbar.js';
import { sectionChromeHtml, sectionChromeLayout, sectionPanelTop, sectionPanelHtml } from './section-chrome.js';
import { blockPanelHtml, blockPanelPosition, CODE_PANEL_WIDTH, DESIGN_FIELDS, linkPopoverHtml, linkPopoverPosition, pinPopoverHtml } from './block-panel.js';
import { addBlockMenuHtml, layersPanelHtml, contextMenuHtml, arrangeMenuHtml, copyPropsMenuHtml, pastePropsMenuHtml, buttonStyleMenuHtml } from './menus.js';
import { textBarHtml, textBarPosition } from './text-bar.js';
import { addSectionPanelHtml, blankSection } from './add-section.js';
import { siteStylesHtml, stylePopoverHtml, stylePopoverPosition, packFontLinks } from './site-styles.js';
import { siteStylesHead, baseSize } from './site-style-packs.js';
import { demoModel } from './demo.js';

const KEY = 'fluid-editor:model:v2';
const $ = (id) => document.getElementById(id);
const frame = $('site-frame');
const panel = $('panel');
const stage = $('stage');

const CENTER_LINE = (1 + LAST_LINE.desktop) / 2; // grid line 14, the middle of the canvas
let model = load() ?? demoModel();
let savedJson = JSON.stringify(model);
let bp = 'desktop';
let sel = null; // { sid, bid }
let editing = null; // text edit session
let gesture = null; // move or resize session
const undoStack = [];
const redoStack = [];
const notes = [];
let doc = null;
let win = null;

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(model));
    return true;
  } catch {
    return false;
  }
}

// ---------- model helpers ----------
const S = (sid) => model.sections.find((s) => s.id === sid);
const B = (sid, bid) => S(sid).blocks.find((b) => b.id === bid);
const lay = (b) => b.layout[bp];
const sectionEl = (sid) => doc.querySelector(`section[data-section-id="${sid}"]`);
const feEl = (sid) => sectionEl(sid).querySelector('.fluid-engine');
const blockEl = (bid) => doc.querySelector(`.fe-block[data-block-id="${bid}"]`);
const setArea = (el, a) => { el.style.gridArea = a.join(' / '); };
const same = (a, b) => a.every((v, i) => v === b[i]);

function growRows(s) {
  s.rows[bp] = Math.max(s.rows[bp], ...s.blocks.map((b) => b.layout[bp].area[2] - 1));
}

function note(text) {
  notes.unshift(text);
  notes.length = Math.min(notes.length, 6);
}

function commit(before, label) {
  if (JSON.stringify(model) === before) return;
  undoStack.push(before);
  redoStack.length = 0;
  note(label);
  updateUi();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(model));
  model = JSON.parse(undoStack.pop());
  note('Undo');
  renderAll();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(model));
  model = JSON.parse(redoStack.pop());
  note('Redo');
  renderAll();
}

// ---------- rendering ----------
// After undo, redo or a reload of the model the selected block may no longer exist.
function dropMissingSelection() {
  if (!sel) return;
  const s = model.sections.find((x) => x.id === sel.sid);
  const ids = [sel.bid, ...(sel.more || [])].filter((id) => s?.blocks.some((b) => b.id === id));
  sel = ids.length ? { sid: sel.sid, bid: ids[0], more: ids.slice(1) } : null;
}

// The site header lies over the first section in the canvas too, as in the oracle editor;
// the first section is padded by its height after every render (render.js HEADER_SCRIPT).
function fitHeader() {
  const h = doc.getElementById('header');
  const first = doc.querySelector('main#page .page-section');
  if (first) first.style.paddingTop = h ? `${h.getBoundingClientRect().height}px` : '';
}
// The header follows the model: a model without one (a replayed trace) shows none.
let headerJson = null;
function renderHeaderOnce() {
  const json = JSON.stringify(model.header || null);
  if (json === headerJson) return;
  headerJson = json;
  const old = doc.getElementById('header') || doc.getElementById('header-slot');
  if (!old) return;
  if (!model.header) { old.outerHTML = '<div id="header-slot"></div>'; return; }
  old.outerHTML = renderHeader(model.header);
  new win.Function(HEADER_SCRIPT)();
}
// Site Styles picks (U12): their fonts and rules sit at the end of the canvas's head.
let appliedStyles = null;
let onStylesApplied = null;
function applySiteStyles() {
  const next = JSON.stringify(model.siteStyles || null);
  if (next === appliedStyles) return;
  appliedStyles = next;
  for (const el of doc.head.querySelectorAll('[data-fe-site-styles]')) el.remove();
  doc.head.insertAdjacentHTML('beforeend', siteStylesHead(model.siteStyles));
  themeColors = null;
  onStylesApplied?.();
}
function renderAll() {
  dropMissingSelection();
  applySiteStyles();
  renderHeaderOnce();
  doc.getElementById('page').innerHTML = renderPage(model);
  fitHeader();
  for (const s of model.sections) decorate(s.id);
  drawSelection();
  updateUi();
}

function renderSectionDom(sid) {
  const ids = [sid, ...model.sections.filter((s) => s.blocks.some((b) => b.codeOf === sid)).map((s) => s.id)];
  for (const id of new Set(ids)) {
    const tmp = doc.createElement('div');
    tmp.innerHTML = renderSection(S(id), model);
    sectionEl(id).replaceWith(tmp.firstElementChild);
    decorate(id);
  }
  fitHeader();
  drawSelection();
}

function decorate(sid) {
  const fe = feEl(sid);
  fe.classList.add('is-editing');
  fe.setAttribute('role', 'grid');
  fe.setAttribute('aria-multiselectable', 'true');
  fe.dataset.gridIsVisible = 'false';
  for (const el of fe.querySelectorAll(':scope > .fe-block')) {
    el.setAttribute('role', 'gridcell');
    el.tabIndex = 0;
    el.dataset.isSelected = String(sel?.bid === el.dataset.blockId);
    el.dataset.isNearDraggedBlock = 'false';
    el.dataset.isMatchingWidth = 'false';
    el.dataset.isMatchingHeight = 'false';
  }
}

function drawSelection() {
  drawSelectionLayers();
  placeToolbar();
}
function drawSelectionLayers() {
  for (const el of doc.querySelectorAll('.fe-indicator')) el.remove();
  // A held block stays selected (traces T0004 to T0006 mid); only its layers go away.
  if (gesture?.type === 'move' || gesture?.type === 'resize' || gesture?.type === 'gresize') return;
  for (const el of doc.querySelectorAll('.fe-block[data-is-selected="true"]')) el.dataset.isSelected = 'false';
  if (!sel) return;
  const b = B(sel.sid, sel.bid);
  const el = blockEl(sel.bid);
  if (el) el.dataset.isSelected = 'true';
  const ind = doc.createElement('div');
  ind.className = 'fe-indicator';
  setArea(ind, gesture?.target || lay(b).area);
  ind.style.zIndex = String(100000 + lay(b).z);
  for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const h = doc.createElement('div');
    h.className = 'fe-handle';
    h.dataset.dir = dir;
    ind.append(h);
  }
  feEl(sel.sid).append(ind);
  for (const id of sel.more || []) {
    const o = B(sel.sid, id);
    const el2 = blockEl(id);
    if (el2) el2.dataset.isSelected = 'true';
    const ind2 = doc.createElement('div');
    ind2.className = 'fe-indicator';
    setArea(ind2, gesture?.moreTargets?.[id] || lay(o).area);
    ind2.style.zIndex = String(100000 + lay(o).z);
    feEl(sel.sid).append(ind2);
  }
  // A group (X8, gap review screenshot): one outline with eight handles around all selected
  // blocks; each block keeps a thin outline. The handles resize the group (GROUPRESIZE.json).
  if (marquee || sel.more?.length) for (const el3 of feEl(sel.sid).querySelectorAll('.fe-indicator')) { el3.classList.add('is-member'); el3.replaceChildren(); }
  if (!marquee && sel.more?.length) {
    const areas = [sel.bid, ...sel.more].map((id) => (id === sel.bid ? gesture?.target : gesture?.moreTargets?.[id]) || lay(B(sel.sid, id)).area);
    const box = [Math.min(...areas.map((a) => a[0])), Math.min(...areas.map((a) => a[1])), Math.max(...areas.map((a) => a[2])), Math.max(...areas.map((a) => a[3]))];
    const g = doc.createElement('div');
    g.className = 'fe-indicator is-group';
    setArea(g, box);
    g.style.zIndex = '199999';
    for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const h = doc.createElement('div');
      h.className = 'fe-handle';
      h.dataset.dir = dir;
      g.append(h);
    }
    feEl(sel.sid).append(g);
  }
}

// ---------- floating block toolbar (U4) ----------
const toolbar = $('block-toolbar');
function zInfo(sid, b) {
  const L = lay(b);
  const hit = (a, o) => a[0] < o[2] && o[0] < a[2] && a[1] < o[3] && o[1] < a[3];
  const over = S(sid).blocks.filter((o) => o !== b && o.layout[bp] && hit(L.area, o.layout[bp].area));
  return { overlaps: over.length > 0, above: over.some((o) => o.layout[bp].z > L.z), below: over.some((o) => o.layout[bp].z < L.z) };
}
let groupAlignOpen = false;
// Group Move Forward and Backward (parity/findings/GROUPRESIZE.json): is a block outside the group
// above its top one or below its bottom one? The oracle's case is one block above a group of two.
function groupZ(sid, ids) {
  const inside = S(sid).blocks.filter((o) => ids.includes(o.id)).map((o) => lay(o).z);
  const outside = S(sid).blocks.filter((o) => !ids.includes(o.id)).map((o) => lay(o).z);
  return { above: outside.some((z) => z > Math.max(...inside)), below: outside.some((z) => z < Math.min(...inside)) };
}
// The next block outside the group crosses it, and the z values stay the same set: 1, 2, 3 with
// the group on 1 and 2 becomes group 2, 3 and the other block 1.
function groupZSwap(sid, ids, up) {
  const all = S(sid).blocks.map((o) => lay(o)).sort((a, b) => a.z - b.z);
  const members = S(sid).blocks.filter((o) => ids.includes(o.id)).map((o) => lay(o));
  const zs = all.map((L) => L.z);
  const top = Math.max(...members.map((L) => L.z)), bottom = Math.min(...members.map((L) => L.z));
  const other = up ? all.find((L) => L.z > top && !members.includes(L)) : [...all].reverse().find((L) => L.z < bottom && !members.includes(L));
  if (!other) return;
  const rest = all.filter((L) => L !== other);
  const at = rest.findIndex((L) => members.includes(L));
  const lastAt = rest.length - 1 - [...rest].reverse().findIndex((L) => members.includes(L));
  rest.splice(up ? at : lastAt + 1, 0, other);
  rest.forEach((L, k) => { L.z = zs[k]; });
}
function placeGroupToolbar() {
  const g = doc.querySelector('.fe-indicator.is-group');
  if (!g) { toolbar.hidden = true; return; }
  const z = groupZ(sel.sid, [sel.bid, ...sel.more]);
  const key = `group|${sel.bid}|${sel.more.join(',')}|${groupAlignOpen}|${z.above}|${z.below}`;
  if (toolbar.dataset.key !== key) { toolbar.innerHTML = groupToolbarHtml(groupAlignOpen, z); toolbar.dataset.key = key; }
  const p = toolbarPosition(frame.getBoundingClientRect(), stage.getBoundingClientRect(), g.getBoundingClientRect());
  toolbar.style.left = `${p.left - 7}px`;
  toolbar.style.top = `${p.top - 7}px`;
  toolbar.hidden = false;
}
function placeToolbar() {
  if (marquee) { toolbar.hidden = true; return; }
  toolbar.classList.toggle('is-group', !!sel?.more?.length);
  if (sel?.more?.length && !gesture?.type?.match(/move|resize/) && !editing && doc && !document.body.classList.contains('is-preview')) { placeGroupToolbar(); return; }
  if (!sel || sel.more?.length || gesture?.type === 'move' || gesture?.type === 'resize' || editing || !doc || designOpen === sel.bid) { toolbar.hidden = true; return; }
  const b = B(sel.sid, sel.bid);
  const el = blockEl(sel.bid);
  if (!b || !el) { toolbar.hidden = true; return; }
  const z = zInfo(sel.sid, b);
  const key = `${sel.bid}|${bp}|${JSON.stringify(z)}|${b.buttonStyle || ""}`;
  if (toolbar.dataset.key !== key) {
    toolbar.innerHTML = toolbarHtml(toolbarItems(b.type, bp, z), z);
    toolbar.dataset.key = key;
    // The style button names the current style (BUTTONSTYLE.json).
    const sb = toolbar.querySelector('[data-tb="primary"]');
    if (sb && b.buttonStyle) { const n = b.buttonStyle[0].toUpperCase() + b.buttonStyle.slice(1); sb.setAttribute('aria-label', n); sb.title = n; sb.querySelector('.tb-text').textContent = n; }
  }
  const p = toolbarPosition(frame.getBoundingClientRect(), stage.getBoundingClientRect(), el.getBoundingClientRect());
  toolbar.style.left = `${p.left}px`;
  toolbar.style.top = `${p.top}px`;
  toolbar.hidden = false;
}
toolbar.addEventListener('mousedown', (e) => e.preventDefault());
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tb]');
  if (!btn || !sel || btn.classList.contains('is-off')) return;
  const act = btn.dataset.tb;
  const { sid, bid } = sel;
  if (sel.more?.length) {
    // The group toolbar.
    if (act === 'align-menu') { groupAlignOpen = !groupAlignOpen; placeToolbar(); return; }
    groupAlignOpen = false;
    const before = JSON.stringify(model);
    const ids = [bid, ...sel.more];
    if (act === 'stack') stackBlocks();
    if (act === 'z+' || act === 'z-') groupZSwap(sid, ids, act === 'z+');
    if (act.startsWith('align:')) alignGroup(act.slice(6));
    if (act === 'gduplicate') for (const id of ids) duplicateBlock(sid, id);
    if (act === 'gremove') { S(sid).blocks = S(sid).blocks.filter((o) => !ids.includes(o.id)); sel = null; }
    renderSectionDom(sid);
    commit(before, `${btn.getAttribute('aria-label')} on ${ids.length} blocks`);
    return;
  }
  const b = B(sid, bid);
  if (act === 'write') { startTextEdit(sid, bid); placeToolbar(); return; }
  // A button's Edit panel opens on Content (parity/findings/BUTTONEDIT.json).
  if (act === 'edit') { designOpen = bid; designTab = b.type === 'button' || b.type === 'embed' || b.type === 'accordion' || b.type === 'image' || (b.type === 'video' && !b.html) || (b.type === 'code' && b.html != null) ? 'Content' : 'Design'; updateUi(); return; }
  // The toolbar link button opens the same link editor, centred under the button and 7px
  // below it (measured 2026-11-04 on the oracle demo button).
  if (act === 'link' && b.type === 'button') { openLinkPopover(b, (st) => { const r = btn.getBoundingClientRect(); return { left: Math.max(8, r.left + r.width / 2 - 160 - st.left), top: r.bottom + 7 - st.top }; }); return; }
  // Pin (parity/findings/PIN.json): the first click pins to the top with no offset (desktop) and
  // opens the popover; one undo step.
  if (act === 'pin' && bp === 'desktop') {
    if (!b.layout.desktop.sticky) { const before = JSON.stringify(model); b.layout.desktop.sticky = { anchor: 'top', offset: 0 }; renderSectionDom(sid); commit(before, `Pinned ${bid}`); }
    openPin(sid, bid);
    return;
  }
  if (act === 'primary' && b.type === 'button') {
    const m = $('button-style-menu');
    if (!m.hidden) { m.hidden = true; return; }
    m.innerHTML = buttonStyleMenuHtml(b.buttonStyle || 'primary');
    const r = btn.getBoundingClientRect(), st = stage.getBoundingClientRect();
    m.style.left = `${r.left - 37 - st.left}px`; m.style.top = `${r.bottom + 12 - st.top}px`;
    m.dataset.sid = sid; m.dataset.bid = bid; m.hidden = false;
    return;
  }
  if (act === 'pin' || act === 'primary' || act === 'link') { note(`${btn.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  const before = JSON.stringify(model);
  if (act === 'align') { const order = ['flex-start', 'center', 'flex-end']; const L = lay(b); L.justify = order[(order.indexOf(L.justify || 'flex-start') + 1) % 3]; }
  if (act === 'z+' || act === 'z-') zSwap(sid, b, act === 'z+');
  if (act === 'up' || act === 'down') moveInStack(sid, b, act === 'up');
  if (act === 'duplicate') duplicateBlock(sid, bid);
  if (act === 'remove') { S(sid).blocks = S(sid).blocks.filter((o) => o.id !== bid); sel = null; }
  renderSectionDom(sid);
  commit(before, `${btn.getAttribute('aria-label')} on ${bid}`);
});

function select(next) {
  sel = next;
  drawSelection();
  updateUi();
}

// ---------- geometry ----------
function measure(fe) {
  const cs = win.getComputedStyle(fe);
  const r = fe.getBoundingClientRect();
  const cg = parseFloat(cs.columnGap) || 0;
  const rg = parseFloat(cs.rowGap) || 0;
  const cols = cs.gridTemplateColumns.split(' ').map(parseFloat);
  const rows = cs.gridTemplateRows.split(' ').map(parseFloat);
  const colStart = [];
  let x = r.left;
  for (const w of cols) {
    colStart.push(x);
    x += w + cg;
  }
  const colEnd = cols.map((w, i) => colStart[i] + w);
  const rowMin = Math.min(...rows);
  return { r, cols, rows, cg, rg, colStart, colEnd, rowMin, pitch: rowMin + rg };
}

// Rows a block needs so its content fits without stretching a row.
function contentRows(b, m) {
  if (b.type === 'shape') return 1;
  const root = blockEl(b.id);
  const c = root?.querySelector('.accordion-items-container, .sqs-block-video-placeholder--empty') || root?.querySelector('.sqs-block-content');
  if (!c) return 1;
  return Math.max(1, Math.ceil((c.offsetHeight + m.rg) / m.pitch - 0.02));
}

// Remove row stretch: measure every block in pixels and convert back to
// grid lines on uniform rows. Same idea as the Squarespace engineering post:
// it runs at the start of a drag or keyboard move.
// Like the oracle (trace T0001): normalization is not an undo step, and it does
// not mark a saved page as changed. Callers take their undo snapshot after it.
function normalize(sid) {
  const wasClean = JSON.stringify(model) === savedJson;
  const fe = feEl(sid);
  const m = measure(fe);
  const stretched = m.rows.filter((h) => h > m.rowMin + 0.5).length;
  if (!stretched) return 0;
  const s = S(sid);
  const top = m.r.top;
  let moved = 0;
  const next = s.blocks.map((b) => {
    const br = blockEl(b.id).getBoundingClientRect();
    const a = lay(b).area;
    const r0 = Math.max(1, Math.round((br.top - top) / m.pitch) + 1);
    const n = Math.max(1, Math.ceil((br.height + m.rg) / m.pitch - 0.02));
    return [r0, a[1], r0 + n, a[3]];
  });
  s.blocks.forEach((b, i) => {
    if (!same(lay(b).area, next[i])) moved++;
    lay(b).area = next[i];
  });
  s.rows[bp] = Math.max(Math.round((m.r.height + m.rg) / m.pitch), ...next.map((a) => a[2] - 1));
  if (wasClean) savedJson = JSON.stringify(model);
  renderSectionDom(sid);
  note(`Normalized ${stretched} stretched rows, ${moved} blocks remapped`);
  return stretched;
}

// Flags the oracle sets during a gesture (traces T0004 to T0007): blocks next to or
// overlapping the target get data-is-near-dragged-block; during a resize, blocks with
// the same width or height get data-is-matching-width / -height. "Next to" is within
// 2 tracks, the closest gap seen flagged (T0004).
// parity/findings/GUIDES.json: during a resize a near block gets a faint ring, a same-size block
// and the target a yellow bar; a drag draws neither, although the flags are the same.
function flagNeighbours(g, t) {
  const s = S(g.sid);
  let anyW = false, anyH = false;
  for (const o of s.blocks) {
    const el = blockEl(o.id);
    if (!el) continue;
    const a = lay(o).area;
    const mine = o.id === g.bid || g.members?.includes(o.id);
    const gapC = Math.max(a[1] - t[3], t[1] - a[3], 0);
    const gapR = Math.max(a[0] - t[2], t[0] - a[2], 0);
    // parity/findings/NEAR.json: near when both gaps are at most 1 line. The dragged block has the
    // same rule, from where it started: near on a short drag (T0004), not on a far one (T0010).
    el.dataset.isNearDraggedBlock = String(gapC <= 1 && gapR <= 1);
    const resizing = g.type === 'resize' || g.type === 'gresize';
    el.dataset.isMatchingWidth = String(!mine && resizing && a[3] - a[1] === t[3] - t[1]);
    el.dataset.isMatchingHeight = String(!mine && resizing && a[2] - a[0] === t[2] - t[0]);
    const w = el.dataset.isMatchingWidth === 'true', h = el.dataset.isMatchingHeight === 'true';
    anyW ||= w; anyH ||= h;
    const marks = g.marks?.[o.id];
    if (marks) setMarks(marks, { near: !mine && gapC <= 1 && gapR <= 1, w, h });
  }
  setMarks(g.tind, { w: anyW, h: anyH });
  // The center line turns solid yellow when the target is centered (GUIDES.json).
  g.line?.classList.toggle('is-centered', t[1] + t[3] === 2 * CENTER_LINE);
}

function setMarks(el, { near = false, w = false, h = false }) {
  if (!el) return;
  el.classList.toggle('is-near', near);
  el.classList.toggle('is-match-w', w);
  el.classList.toggle('is-match-h', h);
}

// A layer with the marks of GUIDES.json: two nested borders and four end ticks.
function marksLayer(fe, cls, area, z) {
  const el = layer(fe, `fe-marks ${cls}`, area, z);
  el.innerHTML = '<i class="fe-marks-in"></i><i class="fe-tick is-l"></i><i class="fe-tick is-r"></i><i class="fe-tick is-t"></i><i class="fe-tick is-b"></i>';
  return el;
}

function clearFlags(sid) {
  for (const el of feEl(sid).querySelectorAll(':scope > .fe-block')) {
    el.dataset.isNearDraggedBlock = 'false';
    el.dataset.isMatchingWidth = 'false';
    el.dataset.isMatchingHeight = 'false';
  }
}

// G7: scroll the canvas while the pointer stays near its top or bottom edge.
// The oracle does this (trace T0010 moved 30px more than the pointer); band and
// speed here are our own, not measured.
// Auto-scroll (G7, parity/findings/AUTOSCROLL.json): the oracle scrolls the frame in 10px
// steps about every 70ms while the pointer is within 60px of the bottom edge (40px of the
// top), and stops once the pointer plus the scroll since the drag began would be outside the
// window. So a pointer held d px from the edge scrolls the next multiple of 10 above d, and a
// pointer outside the window scrolls nothing (trace T0013).
const EDGE_BOTTOM = 60;
const EDGE_TOP = 40;
const SCROLL_STEP = 10;
const SCROLL_EVERY = 70; // ms
function autoScroll(g) {
  if (g.scrolling) return;
  g.scrolling = true;
  if (g.scroll0 == null) g.scroll0 = win.scrollY;
  const tick = () => {
    if (gesture !== g || !g.lastEvent) { g.scrolling = false; return; }
    const y = g.lastEvent.clientY;
    const h = win.innerHeight;
    const moved = win.scrollY - g.scroll0;
    let dir = 0;
    if (y <= h && h - y <= EDGE_BOTTOM && y + moved <= h) dir = 1;
    else if (y >= 0 && y <= EDGE_TOP && y + moved >= 0) dir = -1;
    if (!dir) { g.scrolling = false; return; }
    win.scrollBy(0, dir * SCROLL_STEP);
    if (g.type === 'move') updateMove(g.lastEvent);
    else if (g.type === 'resize') updateResize(g.lastEvent);
    else if (g.type === 'gresize') updateGroupResize(g.lastEvent);
    win.setTimeout(tick, SCROLL_EVERY);
  };
  win.setTimeout(tick, SCROLL_EVERY);
}

// One SVG per row, drawn the oracle's way (parity/findings/MARKS.json, grid): a pattern one cell wide
// and one row tall, its rect 1px under the tile so the stroke fits on all four sides.
function showGrid(sid, rowCount) {
  const fe = feEl(sid);
  fe.dataset.gridIsVisible = 'true';
  for (const el of fe.querySelectorAll('.fe-grid-row')) el.remove();
  const cs = win.getComputedStyle(fe);
  const gap = parseFloat(cs.columnGap);
  const margin = Math.round(parseFloat(cs.gridTemplateColumns) + gap);
  const inset = 2 * margin - 1;
  const tile = (fe.clientWidth - inset + gap - 1) / COLS[bp];
  const cellH = measure(fe).rowMin - 1;
  const frag = doc.createDocumentFragment();
  for (let r = 1; r <= rowCount; r++) {
    const row = doc.createElement('div');
    row.className = gesture?.shownRows ? 'fe-grid-row' : 'fe-grid-row is-fresh';
    row.style.gridArea = `${r} / 1 / ${r} / -1`;
    const id = `fe-grid-${sid}-${r}`;
    row.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="height:100%;width:calc(100% - ${inset}px);position:absolute;left:${margin}px"><defs><pattern id="${id}" height="100%" width="${tile}px" patternUnits="userSpaceOnUse"><rect height="${cellH}px" width="${tile - gap - 1}px" x="0.5" y="0.5" rx="3" stroke-width="1" stroke="#B7B7B7" fill="#F2F2F240"></rect></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"></rect></svg>`;
    frag.append(row);
  }
  fe.prepend(frag);
  if (gesture) gesture.shownRows = rowCount;
}

function layer(fe, cls, a, z) {
  const el = doc.createElement('div');
  el.className = cls;
  setArea(el, a);
  if (z != null) el.style.zIndex = String(z);
  fe.append(el);
  return el;
}

function nearest(from, to, f) {
  let best = from;
  let bd = Infinity;
  for (let v = from; v <= to; v++) {
    const d = Math.abs(f(v));
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}

// ---------- gestures ----------
// Marquee (X13, parity/findings/X13.json): a drag of 30px from empty space in a section draws a 3px
// rgb(0, 114, 240) box. The blocks of that section it touches join the selection while held, with
// thin outlines only; on release they replace it. A box that touched nothing leaves it alone. A press
// with no drag is a click and clears it. No auto-scroll, and Escape does nothing while held.
let marquee = false;
function startMarquee(e, fe) {
  const sid = fe.closest('section').dataset.sectionId;
  const x0 = e.clientX, y0 = e.clientY;
  const prior = sel;
  const base = prior?.sid === sid ? [prior.bid, ...(prior.more || [])] : [];
  let box = null, touched = [];
  const pick = (ids) => (ids.length ? { sid, bid: ids[0], more: ids.slice(1) } : prior);
  const move = (ev) => {
    const x1 = ev.clientX, y1 = ev.clientY;
    if (!box && Math.hypot(x1 - x0, y1 - y0) < 30) return;
    if (!box) { box = doc.createElement('div'); box.className = 'fe-marquee'; doc.body.append(box); marquee = true; }
    const L = Math.min(x0, x1), T = Math.min(y0, y1), R = Math.max(x0, x1), Bm = Math.max(y0, y1);
    Object.assign(box.style, { left: `${L}px`, top: `${T}px`, width: `${R - L}px`, height: `${Bm - T}px` });
    touched = [...fe.querySelectorAll(':scope > .fe-block')].filter((b) => { const q = b.getBoundingClientRect(); return q.width && q.left <= R && q.right >= L && q.top <= Bm && q.bottom >= T; }).map((b) => b.dataset.blockId);
    select(pick(touched.length ? [...new Set([...base, ...touched])] : []));
  };
  const up = () => {
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', up);
    marquee = false;
    box?.remove();
    select(box ? pick(touched) : null);
  };
  doc.addEventListener('pointermove', move);
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', up);
}

function onDown(e) {
  if (document.body.classList.contains('is-preview')) return;
  if (e.button !== 0) return;
  const handle = e.target.closest('.fe-handle');
  const blk = e.target.closest('.fe-block');
  if (editing) {
    if (blk && blk.dataset.blockId === editing.bid) return;
    finishTextEdit();
  }
  if (handle && sel) {
    e.preventDefault();
    startResize(e, handle.dataset.dir);
    return;
  }
  if (!blk) {
    const fe = e.target.closest('section')?.querySelector('.fluid-engine');
    if (fe && !e.target.closest('.fe-handle, .fe-indicator')) startMarquee(e, fe);
    else select(null);
    return;
  }
  e.preventDefault();
  const sid = blk.closest('section').dataset.sectionId;
  const bid = blk.dataset.blockId;
  // Shift-click adds or removes a block from the selection, as on the oracle (X8).
  if (e.shiftKey && sel && sel.sid === sid) {
    const ids = [sel.bid, ...(sel.more || [])];
    const next = ids.includes(bid) ? ids.filter((x) => x !== bid) : [...ids, bid];
    select(next.length ? { sid, bid: next[0], more: next.slice(1) } : null);
    return;
  }
  const wasSelected = sel && sel.sid === sid && sel.bid === bid && !sel.more?.length;
  const keep = sel && sel.sid === sid && [sel.bid, ...(sel.more || [])].includes(bid) && sel.more?.length;
  select(keep ? { sid, bid, more: [sel.bid, ...sel.more].filter((x) => x !== bid) } : { sid, bid });
  const r = blk.getBoundingClientRect();
  gesture = {
    type: 'pending', sid, bid: blk.dataset.blockId, pointerId: e.pointerId, wasSelected,
    x0: e.clientX, y0: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top,
    before: JSON.stringify(model),
  };
}

function onMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    // The oracle starts a drag once the pointer has moved more than 10px (11 does, 10 does not).
    if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) <= 10) return;
    beginMove(e);
  }
  gesture.lastEvent = { clientX: e.clientX, clientY: e.clientY };
  if (gesture.type === 'move') updateMove(e);
  else if (gesture.type === 'resize') updateResize(e);
  else if (gesture.type === 'gresize') updateGroupResize(e);
  if (gesture.type === 'move' || gesture.type === 'resize' || gesture.type === 'gresize') autoScroll(gesture);
}

function onUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    // A click on a text block that was already selected opens its editor (E1, as on the oracle).
    const g = gesture;
    gesture = null;
    if (g.wasSelected && B(g.sid, g.bid)?.type === 'text') startTextEdit(g.sid, g.bid);
    return;
  }
  const g = gesture;
  const s = S(g.sid);
  const b = B(g.sid, g.bid);
  lay(b).area = g.target;
  for (const o of g.more || []) if (o.target && o.target[0] >= 1 && o.target[1] >= 1 && o.target[3] <= LAST_LINE[bp]) lay(B(g.sid, o.id)).area = o.target;
  growRows(s);
  endGesture();
  renderSectionDom(g.sid);
  commit(g.before, `${g.type === 'move' ? 'Moved' : 'Resized'} ${g.bid} to ${g.target.join('/')}`);
}

function onCancel(e) {
  if (gesture && e.pointerId === gesture.pointerId) cancelGesture();
}

function prepare(e, type, extra = {}) {
  const g = gesture?.type === 'pending' ? gesture : { sid: sel.sid, bid: sel.bid, pointerId: e.pointerId, before: JSON.stringify(model) };
  Object.assign(g, { type }, extra);
  gesture = g;
  try {
    doc.documentElement.setPointerCapture(e.pointerId);
  } catch {}
  normalize(g.sid);
  g.before = JSON.stringify(model);
  const s = S(g.sid);
  const b = B(g.sid, g.bid);
  const fe = feEl(g.sid);
  g.orig = [...lay(b).area];
  g.rows0 = s.rows[bp];
  g.target = [...g.orig];
  g.m = measure(fe);
  fe.style.gridAutoRows = `${g.m.rowMin}px`;
  showGrid(g.sid, s.rows[bp]);
  g.original = layer(fe, 'fe-original-position', g.orig);
  fe.classList.add('is-gesture');
  // parity/findings/GUIDES.json: the target ring on top of everything, and the center line of the
  // section behind the blocks. Phones have no center line.
  g.tind = marksLayer(fe, 'fe-transform-indicator', g.orig);
  if (bp === 'desktop') {
    g.line = doc.createElement('div');
    g.line.className = 'fe-center-line';
    const section = fe.closest('section');
    section.insertBefore(g.line, section.querySelector(':scope > .content-wrapper'));
  }
  if (type === 'resize') {
    g.marks = {};
    for (const o of s.blocks) if (o.id !== g.bid) g.marks[o.id] = marksLayer(fe, 'is-other', lay(o).area, 100000 + lay(o).z);
  }
  // The flags show from the first move, also on a drag too short to change the target (T0004).
  flagNeighbours(g, g.target);
  drawSelection();
  placeChrome();
  return g;
}

function beginMove(e) {
  const g = prepare(e, 'move');
  g.more = (sel?.more || []).map((id) => ({ id, orig: [...lay(B(g.sid, id)).area] }));
  const el = blockEl(g.bid);
  el.classList.add('is-dragging');
}

function updateMove(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  const [r0, c0, r1, c1] = g.orig;
  const w = c1 - c0;
  const h = r1 - r0;
  const left = e.clientX - g.grabX;
  const y = e.clientY - g.grabY;
  const baseLeft = m.colStart[c0 - 1];
  const baseTop = top + (r0 - 1) * m.pitch;
  blockEl(g.bid).style.transform = `translate(${left - baseLeft}px, ${y - baseTop}px)`;
  const nc0 = nearest(1, LAST_LINE[bp] - w, (c) => m.colStart[c - 1] - left);
  // Uniform pitch, also past the last row (traces T0013, T0014).
  const nr0 = Math.max(1, Math.round((y - top) / m.pitch) + 1);
  let t = [nr0, nc0, nr0 + h, nc0 + w];
  // Center snap (G5, parity/findings/GUIDES.json): a block of an odd width cannot center on the
  // center line, so within half a column of it the target takes one more column and is centered.
  // The block shows the wider size, and a drop keeps it. Not for a group or on phones.
  let wide = false;
  if (bp === 'desktop' && !g.more.length && w % 2) {
    const blockWidth = m.colEnd[c1 - 2] - m.colStart[c0 - 1];
    const q = fe.getBoundingClientRect();
    if (Math.abs(left + blockWidth / 2 - (q.left + q.right) / 2) <= (m.colStart[2] - m.colStart[1]) / 2) {
      const cs = CENTER_LINE - (w + 1) / 2;
      t = [nr0, cs, nr0 + h, cs + w + 1];
      wide = true;
    }
  }
  if (wide !== !!g.wide) {
    g.wide = wide;
    blockEl(g.bid).style.gridColumnEnd = wide ? String(c1 + 1) : '';
  }
  // Other selected blocks move by the same number of rows and columns.
  for (const o of g.more || []) {
    const dr = nr0 - r0, dc = nc0 - c0;
    o.target = [o.orig[0] + dr, o.orig[1] + dc, o.orig[2] + dr, o.orig[3] + dc];
    const el2 = blockEl(o.id);
    if (el2) el2.style.transform = blockEl(g.bid).style.transform;
  }
  if (!same(t, g.target)) {
    g.target = t;
    // A group has one ring around all its blocks (GUIDES.json).
    const all = [t, ...g.more.map((o) => o.target)];
    const box = [Math.min(...all.map((a) => a[0])), Math.min(...all.map((a) => a[1])), Math.max(...all.map((a) => a[2])), Math.max(...all.map((a) => a[3]))];
    setArea(g.tind, box);
    flagNeighbours(g, box);
    if (t[2] - 1 > g.shownRows) showGrid(g.sid, t[2] - 1);
  }
}

function startResize(e, dir) {
  if (sel.more?.length) {
    const members = [sel.bid, ...sel.more];
    const g = prepare(e, 'gresize', { dir, members });
    g.more = sel.more.map((id) => ({ id, orig: [...lay(B(g.sid, id)).area] }));
    g.box0 = boxOf([g.orig, ...g.more.map((o) => o.orig)]);
    g.box = g.box0;
    setArea(g.tind, g.box0);
    flagNeighbours(g, g.box0);
    return;
  }
  prepare(e, 'resize', { dir });
}

const boxOf = (areas) => [Math.min(...areas.map((a) => a[0])), Math.min(...areas.map((a) => a[1])), Math.max(...areas.map((a) => a[2])), Math.max(...areas.map((a) => a[3]))];

// One edge pair of a block in a resized group (parity/findings/GROUPRESIZE.json). An edge on the
// group box stays on it; the rest scale by k, the size ratio rounded to one decimal. size gives
// the new size in cells.
function scaleSpan(a0, a1, b0, b1, n0, n1, k, size) {
  const start = a0 === b0 ? n0 : n0 + Math.ceil((a0 - b0) * k - 0.5);
  const end = a1 === b1 ? n1 : start + Math.max(1, size(a1 - a0));
  return [start, Math.max(start + 1, end)];
}

function updateGroupResize(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  let [r0, c0, r1, c1] = g.box0;
  const x = e.clientX, y = e.clientY;
  if (g.dir.includes('e')) c1 = nearest(c0 + 1, LAST_LINE[bp], (l) => m.colEnd[l - 2] - x);
  if (g.dir.includes('w')) c0 = nearest(1, c1 - 1, (l) => m.colStart[l - 1] - x);
  if (g.dir.includes('s')) r1 = Math.max(r0 + 1, Math.round((y - top + m.rg) / m.pitch) + 1);
  if (g.dir.includes('n')) r0 = Math.min(r1 - 1, Math.max(1, Math.round((y - top) / m.pitch) + 1));
  const [br0, bc0, br1, bc1] = g.box0;
  const kc = Math.round((c1 - c0) / (bc1 - bc0) * 10) / 10, kr = Math.round((r1 - r0) / (br1 - br0) * 10) / 10;
  const place = (id, a) => {
    const [cs, ce] = scaleSpan(a[1], a[3], bc0, bc1, c0, c1, kc, (n) => Math.ceil(n * kc - 0.5));
    const [rs0, re] = scaleSpan(a[0], a[2], br0, br1, r0, r1, kr, (n) => Math.round(((n * m.pitch - m.rg) * kr + m.rg) / m.pitch));
    const el = blockEl(id);
    setArea(el, [rs0, cs, re, ce]);
    // A text block keeps the rows its content needs by moving its start up.
    const need = contentRows(B(g.sid, id), m);
    const rs = re - rs0 < need ? Math.max(r0, re - need) : rs0;
    const t = [rs, cs, Math.max(re, rs + need), ce];
    setArea(el, t);
    return t;
  };
  const moved = [g.orig, ...g.more.map((o) => o.orig)].map((a, k) => place(k ? g.more[k - 1].id : g.bid, a));
  g.target = moved[0];
  g.more.forEach((o, k) => { o.target = moved[k + 1]; });
  g.box = [r0, c0, r1, c1];
  setArea(g.tind, g.box);
  flagNeighbours(g, g.box);
  if (r1 - 1 > g.shownRows) showGrid(g.sid, r1 - 1);
}

function updateResize(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  let [r0, c0, r1, c1] = g.orig;
  const x = e.clientX;
  const y = e.clientY;
  if (g.dir.includes('e')) c1 = nearest(c0 + 1, LAST_LINE[bp], (l) => m.colEnd[l - 2] - x);
  if (g.dir.includes('w')) c0 = nearest(1, c1 - 1, (l) => m.colStart[l - 1] - x);
  if (g.dir.includes('s')) r1 = Math.max(r0 + 1, Math.round((y - top + m.rg) / m.pitch) + 1);
  if (g.dir.includes('n')) r0 = Math.min(r1 - 1, Math.max(1, Math.round((y - top) / m.pitch) + 1));
  const el = blockEl(g.bid);
  setArea(el, [r0, c0, r1, c1]);
  // Guard: a block cannot be shorter than its content.
  const need = contentRows(B(g.sid, g.bid), m);
  if (r1 - r0 < need) {
    if (g.dir.includes('n')) {
      r0 = Math.max(1, r1 - need);
      if (r1 - r0 < need) r1 = r0 + need;
    } else {
      r1 = r0 + need;
    }
    setArea(el, [r0, c0, r1, c1]);
  }
  const t = [r0, c0, r1, c1];
  g.target = t;
  setArea(g.tind, t);
  flagNeighbours(g, t);
  if (t[2] - 1 > g.shownRows) showGrid(g.sid, t[2] - 1);
}

function endGesture() {
  const g = gesture;
  gesture = null;
  if (!g || g.type === 'pending') return;
  const fe = feEl(g.sid);
  fe.dataset.gridIsVisible = 'false';
  fe.style.gridAutoRows = '';
  clearFlags(g.sid);
  fe.classList.remove('is-gesture');
  g.line?.remove();
  for (const el of fe.querySelectorAll('.fe-grid-row, .fe-original-position, .fe-marks')) el.remove();
  for (const o of g.more || []) { const el2 = blockEl(o.id); if (el2) { el2.style.transform = ''; el2.style.gridArea = ''; } }
  const el = blockEl(g.bid);
  if (el) {
    el.classList.remove('is-dragging');
    el.style.transform = '';
    el.style.gridArea = '';
  }
  try {
    doc.documentElement.releasePointerCapture(g.pointerId);
  } catch {}
}

function cancelGesture() {
  const g = gesture;
  if (!g) return;
  endGesture();
  model = JSON.parse(g.before);
  note('Cancelled');
  renderAll();
}

// ---------- keyboard ----------
const ARROWS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };

function onKey(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (editing) {
    if (e.key === 'Escape') {
      e.preventDefault();
      finishTextEdit();
      return;
    }
    // The oracle's text shortcuts: Cmd+Opt+6..3 Heading 1..4, Cmd+Opt+2..0 Paragraph 1..3,
    // Cmd+Opt+M Monospace (listed in its Text Style menu), Cmd+B and Cmd+I. e.code, because
    // Option changes e.key on macOS.
    const STYLE_KEYS = { Digit6: 'h1', Digit5: 'h2', Digit4: 'h3', Digit3: 'h4', Digit2: 'p.sqsrte-large', Digit1: 'p', Digit0: 'p.sqsrte-small', KeyM: 'pre' };
    if (mod && e.altKey && STYLE_KEYS[e.code]) { e.preventDefault(); applyFormat('style', STYLE_KEYS[e.code]); renderTextBar(); return; }
    if (mod && !e.altKey && !e.shiftKey && (e.code === 'KeyB' || e.code === 'KeyI')) { e.preventDefault(); applyFormat(e.code === 'KeyB' ? 'bold' : 'italic'); return; }
    return;
  }
  // Cmd+Shift+H hides the selection on desktop (the oracle's right-click menu shows the shortcut).
  if (sel && !gesture && mod && e.shiftKey && !e.altKey && e.code === 'KeyH') {
    e.preventDefault();
    const before = JSON.stringify(model);
    const sid = sel.sid;
    hideBlocks(sid, [sel.bid, ...(sel.more || [])], 'desktop');
    renderSectionDom(sid);
    commit(before, 'Hid on desktop with Cmd+Shift+H');
    return;
  }
  // Cmd+C and Cmd+V copy and paste blocks (the oracle's right-click menu shows the shortcuts).
  if (mod && !e.shiftKey && !e.altKey && !gesture && (e.code === 'KeyC' || e.code === 'KeyV') && !e.target.closest?.('input, textarea, select, [contenteditable="true"]')) {
    if (e.code === 'KeyC' && sel) { e.preventDefault(); copyBlocks(); return; }
    const to = sel?.sid || hoverSid;
    if (e.code === 'KeyV' && blockClip && to) {
      e.preventDefault();
      const before = JSON.stringify(model);
      pasteBlocks(to);
      renderSectionDom(to);
      commit(before, 'Pasted a block');
      return;
    }
  }
  // Shift+S stacks the selection (the oracle's right-click menu shows the shortcut).
  if (sel && !gesture && e.shiftKey && !mod && !e.altKey && e.code === 'KeyS') {
    e.preventDefault();
    const before = JSON.stringify(model);
    const sid = sel.sid;
    stackBlocks();
    renderSectionDom(sid);
    commit(before, 'Stacked with Shift+S');
    return;
  }
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (gesture) return;
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (e.key === 'Escape') {
    if (marquee) return;
    if (gesture && gesture.type !== 'pending') cancelGesture();
    else select(null);
    return;
  }
  // Keys measured on the oracle (parity/findings/KEYS.json, KEYS2.json).
  if (sel && !gesture && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    const before = JSON.stringify(model);
    const ids = [sel.bid, ...(sel.more || [])];
    const s = S(sel.sid);
    s.blocks = s.blocks.filter((b) => !ids.includes(b.id));
    const sid = sel.sid;
    sel = null;
    renderSectionDom(sid);
    commit(before, `Removed ${ids.length} block${ids.length > 1 ? 's' : ''}`);
    return;
  }
  if (sel && !gesture && mod && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    const before = JSON.stringify(model);
    duplicateBlock(sel.sid, sel.bid);
    renderSectionDom(sel.sid);
    commit(before, 'Duplicated a block');
    return;
  }
  if (ARROWS[e.key] && sel && !gesture && mod) {
    // Cmd+Arrow moves the block's end edges: Left and Right the end column, Up and Down the end row.
    e.preventDefault();
    normalize(sel.sid);
    const before = JSON.stringify(model);
    const b = B(sel.sid, sel.bid);
    const [dr, dc] = ARROWS[e.key];
    const a = lay(b).area;
    const next = [a[0], a[1], Math.max(a[0] + 1, a[2] + dr), Math.min(LAST_LINE[bp], Math.max(a[1] + 1, a[3] + dc))];
    if (b.type === 'text') next[2] = Math.max(next[2], a[0] + contentRows(b, measure(feEl(sel.sid))));
    lay(b).area = next;
    growRows(S(sel.sid));
    renderSectionDom(sel.sid);
    commit(before, `Keyboard resized ${sel.bid} to ${next.join('/')}`);
    return;
  }
  if (ARROWS[e.key] && sel && !gesture) {
    e.preventDefault();
    normalize(sel.sid);
    const before = JSON.stringify(model);
    const [dr, dc] = ARROWS[e.key];
    const group = [sel.bid, ...(sel.more || [])].map((id) => B(sel.sid, id));
    const nexts = group.map((b) => { const a = lay(b).area; return [a[0] + dr, a[1] + dc, a[2] + dr, a[3] + dc]; });
    if (nexts.every((n) => n[0] >= 1 && n[1] >= 1 && n[3] <= LAST_LINE[bp])) {
      group.forEach((b, k) => { lay(b).area = nexts[k]; });
      growRows(S(sel.sid));
    }
    const b = group[0];
    renderSectionDom(sel.sid);
    commit(before, `Keyboard moved ${sel.bid} to ${lay(b).area.join('/')}`);
  }
}

// ---------- text editing ----------
function onDblClick(e) {
  const blk = e.target.closest('.fe-block');
  if (!blk || editing) return;
  startTextEdit(blk.closest('section').dataset.sectionId, blk.dataset.blockId);
}

function startTextEdit(sid, bid) {
  const b = B(sid, bid);
  if (!b || b.type !== 'text' || editing) return;
  select({ sid, bid: b.id });
  normalize(sid);
  const before = JSON.stringify(model);
  const el = blockEl(b.id);
  el.classList.add('is-text-editing');
  const ce = el.querySelector('.sqs-html-content');
  ce.contentEditable = 'true';
  ce.focus();
  const range = doc.createRange();
  range.selectNodeContents(ce);
  range.collapse(false);
  const s = win.getSelection();
  s.removeAllRanges();
  s.addRange(range);
  const fe = feEl(sid);
  const m = measure(fe);
  fe.style.gridAutoRows = `${m.rowMin}px`;
  editing = { sid, bid: b.id, before, ce, m, area: [...lay(b).area] };
  ce.addEventListener('input', onTextInput);
  ce.addEventListener('paste', onPaste);
  doc.addEventListener('selectionchange', onTextSelection);
  renderPanel();
  renderTextBar();
}

// Paste (E5): our own cleanup with the oracle's rules (app/src/paste.js).
function onPaste(e) {
  const ed = editing;
  if (!ed) return;
  e.preventDefault();
  const dt = e.clipboardData;
  insertPaste(doc, ed.ce, win.getSelection(), cleanPaste(doc, dt.getData('text/html'), dt.getData('text/plain')));
  onTextInput();
}

// Edit > Design (parity/findings/DESIGN.json): Background and Blur switches, Opacity,
// Rotate, Scale X and Y, Offset X and Y, Skew X and Y. The values go into the block's
// transform-vars rule (render.js designCss). Stroke and Blend Mode are not built.
let designOpen = null;
let designTab = 'Design';
let blendOpen = false;
let animPicker = false;
let embedData = false;
let accView = null; // 'acc-item:<n>' or 'acc-dividers'
const blockPanel = $('block-panel');
function renderBlockPanel() {
  const b = sel && designOpen === sel.bid && !sel.more?.length ? B(sel.sid, sel.bid) : null;
  if (!sel || sel.bid !== linkPop.dataset.bid) closeLinkPopover();
  if (!b && accView) for (const li of doc.querySelectorAll('.accordion-item[data-is-open]')) if (li.previousElementSibling || li.parentElement.dataset.isExpandedFirstItem !== 'true') li.removeAttribute('data-is-open');
  if (!b) { animPicker = false; blendOpen = false; embedData = false; accView = null; panelMoved = null; if (!blockPanel.hidden) { blockPanel.hidden = true; } if (designOpen && (!sel || designOpen !== sel.bid)) designOpen = null; return; }
  if (b.type !== 'accordion' || (accView?.startsWith('acc-item:') && !b.items[Number(accView.slice(9))])) accView = null; // undo can take the item away
  const content = b.type === 'button' ? { label: b.label, href: b.href } : b.type === 'image' ? { src: b.src, href: b.href, alt: b.alt, filename: b.filename, empty: !!b.empty }
    : b.type === 'video' && !b.html ? { kind: 'video', description: b.description }
    : b.type === 'code' && b.html != null ? { kind: 'code', html: b.html, mode: b.codeMode || 'html', showSource: !!b.showSource }
    : b.type === 'accordion' ? { kind: 'accordion', items: b.items, expandFirst: b.expandFirst, multiple: b.multiple, dividers: b.dividers, showFirst: b.showFirst, showLast: b.showLast, iconSize: b.iconSize, iconThickness: b.iconThickness, iconLeft: b.iconLeft, rowPadding: b.rowPadding }
    : b.type === 'embed' ? { kind: 'embed', html: b.html, as: b.embedAs || 'link', url: b.embedUrl, invalid: b.embedInvalid, description: b.description } : null;
  if (!content && designTab === 'Content') designTab = 'Design';
  if (blockPanel.contains(document.activeElement) && document.activeElement.matches('[data-content]')) return; // keep a field being typed in
  const shape = b.type === 'shape' ? { radius: parseFloat(b.radius) || 0, stretch: b.stretch !== false } : null;
  const image = b.type === 'image' ? { mode: b.mode || 'fill', corner: parseFloat(b.radius) || 0, empty: !!b.empty } : null;
  blockPanel.innerHTML = blockPanelHtml({ ...DESIGN_DEFAULTS, ...b.design }, designTab, content, b.type === 'accordion' && accView ? accView : designTab === 'Content' && embedData ? 'embed-data' : designTab === 'Animation' && animPicker ? 'anim-picker' : (blendOpen ? 'blend' : null), shape, image);
  blockPanel.style.width = b.type === 'code' && designTab === 'Content' ? `${CODE_PANEL_WIDTH}px` : '';
  // An item's view holds that item open on the canvas (ACCORDION.json).
  if (b.type === 'accordion') showAccordionItem(b);
  placeBlockPanel();
  blockPanel.hidden = false;
}
let panelMoved = null; // the block whose panel was dragged; it stays where it was dropped
function placeBlockPanel() {
  if (!designOpen || !sel || panelMoved === designOpen) return;
  const el = blockEl(sel.bid);
  if (!el) return;
  const p = blockPanelPosition(el.getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect(), blockPanel.offsetWidth || 320);
  blockPanel.style.left = `${p.left}px`;
  blockPanel.style.top = `${p.top}px`;
}
blockPanel.addEventListener('click', (e) => {
  const an = e.target.closest('[data-anim]');
  if (an) { animPicker = an.dataset.anim === 'add'; renderBlockPanel(); return; }
  if (e.target.closest('[data-blend-toggle]')) { blendOpen = !blendOpen; renderBlockPanel(); return; }
  const ds = e.target.closest('[data-dset]');
  if (ds && sel) { setDesign(ds.dataset.dset, ds.dataset.v || null); return; }
  const o = e.target.closest('[data-blend]');
  if (o && sel) { blendOpen = false; setDesign('blend', o.dataset.blend === 'normal' ? null : o.dataset.blend); return; }
  if (blendOpen && !e.target.closest('.bp-listbox')) { blendOpen = false; renderBlockPanel(); }
  const l = e.target.closest('[data-link]');
  if (l && sel) { onLinkAction(l.dataset.link, l); return; }
  const t = e.target.closest('[data-btab]');
  if (!t) return;
  designTab = t.dataset.btab;
  closeLinkPopover();
  renderBlockPanel();
});

// Drag the panel by its header (U13). Tabs and other controls in the header still click. The panel
// holds the pointer: over the canvas iframe the moves would otherwise go to the iframe and the panel stop.
blockPanel.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag-panel], .sp-tabs');
  if (!h || e.target.closest('button') || e.button !== 0) return;
  e.preventDefault();
  const st = stage.getBoundingClientRect(), r = blockPanel.getBoundingClientRect();
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  blockPanel.setPointerCapture(e.pointerId);
  const move = (ev) => {
    // The limits follow the window, not the editor area (parity/findings/MARKS.json).
    blockPanel.style.left = `${Math.max(20, Math.min(ev.clientX - dx, innerWidth + 6 - r.width)) - st.left}px`;
    blockPanel.style.top = `${Math.max(22, Math.min(ev.clientY - dy, innerHeight + 22 - r.height)) - st.top}px`;
    panelMoved = designOpen;
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

// One design value of the selected block, as one undo step (null removes it).
function setDesign(k, v) {
  const b = B(sel.sid, sel.bid);
  const before = JSON.stringify(model);
  const d = { ...(b.design || {}) };
  if (v == null) delete d[k]; else d[k] = v;
  if (Object.keys(d).length) b.design = d; else delete b.design;
  renderSectionDom(sel.sid);
  commit(before, `${k} set on ${b.id}`);
}
blockPanel.addEventListener('keydown', (e) => {
  const t = e.target.closest('[data-blend-toggle]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); blendOpen = !blendOpen; renderBlockPanel(); }
});

// Image Fit, Fill and Shape (parity/findings/IMAGEMODES.json), one undo step each.
blockPanel.addEventListener('click', (e) => {
  const m = e.target.closest('[data-image-mode]');
  if (!m || !sel) return;
  const b = B(sel.sid, sel.bid);
  if (!b || b.type !== 'image' || (b.mode || 'fill') === m.dataset.imageMode) return;
  const before = JSON.stringify(model);
  if (m.dataset.imageMode === 'fill') delete b.mode; else b.mode = m.dataset.imageMode;
  renderSectionDom(sel.sid);
  commit(before, `image mode ${m.dataset.imageMode} on ${b.id}`);
  renderBlockPanel();
});

// Image Corner (Fit and Fill only, parity/findings/IMAGEMODES.json): the picture box's corner
// radius, the value the oracle importer reads from its pages. One undo step.
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-image-corner]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  const b = B(sel.sid, sel.bid);
  if (!b || b.type !== 'image') return;
  const before = JSON.stringify(model);
  const v = Math.max(0, Math.min(1000, Number(f.value) || 0));
  if (v) b.radius = `${v}px`; else delete b.radius;
  renderSectionDom(sel.sid);
  commit(before, `corner set on ${b.id}`);
}, true);

// Shape Corner radius and Stretch (parity/findings/SHAPEDESIGN.json), one undo step each.
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-shape]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  const b = B(sel.sid, sel.bid);
  if (!b || b.type !== 'shape') return;
  const before = JSON.stringify(model);
  if (f.dataset.shape === 'radius') { const v = Math.max(0, Math.min(1000, Number(f.value) || 0)); if (v) b.radius = `${v}px`; else delete b.radius; }
  if (f.dataset.shape === 'stretch') { if (f.checked) delete b.stretch; else b.stretch = false; }
  renderSectionDom(sel.sid);
  commit(before, `${f.dataset.shape} set on ${b.id}`);
}, true);

// Button and image Content tabs: the text and the link (parity/findings/BUTTONEDIT.json). The
// text is one undo step when the field is left; each link change is one step.
function setButton(change, label) {
  if (!sel) return;
  const b = B(sel.sid, sel.bid);
  if (!b || (b.type !== 'button' && b.type !== 'image')) return;
  const before = JSON.stringify(model);
  change(b);
  renderSectionDom(sel.sid);
  commit(before, label);
}
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-content="label"]');
  if (!f) return;
  e.stopImmediatePropagation();
  const v = f.value;
  f.blur();
  setButton((b) => { b.label = v; }, 'Button text changed');
}, true);
// Code and embed (parity/findings/CODEEMBED.json). The canvas follows the typing; a text is one
// undo step when the field is left. A block grows to hold its code and does not shrink back.
let codeBefore = null;
function growToFit(b) {
  const m = measure(feEl(sel.sid)), L = lay(b);
  const need = contentRows(b, m);
  if (L.area[2] - L.area[0] < need) { L.area = [L.area[0], L.area[1], L.area[0] + need, L.area[3]]; renderSectionDom(sel.sid); }
}
blockPanel.addEventListener('input', (e) => {
  const f = e.target.closest('textarea[data-content="code"], textarea[data-content="embedHtml"]');
  if (!f || !sel) return;
  const b = B(sel.sid, sel.bid);
  codeBefore ??= JSON.stringify(model);
  if (f.dataset.content === 'code') b.html = f.value;
  else if (f.value) { b.html = f.value; delete b.embedInvalid; } else delete b.html;
  renderSectionDom(sel.sid);
  if (b.type === 'code') growToFit(b);
  const lines = f.parentElement.querySelector('.bp-code-lines');
  lines.innerHTML = Array.from({ length: f.value.split('\n').length }, (_, n) => n + 1).join('<br>');
  placeBlockPanel();
});
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('[data-content="code"], [data-content="embedHtml"]');
  if (f) { if (codeBefore != null) commit(codeBefore, f.dataset.content === 'code' ? 'Code changed' : 'Embed data changed'); codeBefore = null; return; }
  const c = e.target.closest('[data-content="codeMode"], [data-content="showSource"], [data-content="embedUrl"], [data-content="description"]');
  if (!c || !sel) return;
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  if (c.dataset.content === 'codeMode') {
    // CSS, JavaScript and Plain Text turn Display Source Code on, and it stays on (CODEEMBED.json).
    if (c.value === 'html') delete b.codeMode; else b.codeMode = c.value;
    if (!['html', 'markdown'].includes(c.value)) b.showSource = true;
  }
  if (c.dataset.content === 'showSource') { if (c.checked) b.showSource = true; else delete b.showSource; }
  if (c.dataset.content === 'embedUrl') { c.blur(); if (c.value) { b.embedUrl = c.value; b.embedInvalid = true; } else { delete b.embedUrl; delete b.embedInvalid; } }
  if (c.dataset.content === 'description') { if (c.value) b.description = c.value; else delete b.description; }
  renderSectionDom(sel.sid);
  if (b.type === 'code') growToFit(b);
  commit(before, `${c.dataset.content} changed on ${b.id}`);
  renderBlockPanel();
});
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-embed]');
  if (!a || !sel) return;
  const b = B(sel.sid, sel.bid), v = a.dataset.embed;
  if (v === 'data' || v === 'back') { embedData = v === 'data'; renderBlockPanel(); return; }
  const before = JSON.stringify(model);
  if (v === 'code') b.embedAs = 'code'; else delete b.embedAs;
  commit(before, `Embed as ${v}`);
  renderBlockPanel();
});

// Accordion (parity/findings/ACCORDION.json). Each change is one undo step, and the block takes the
// rows its list needs, in both directions.
function showAccordionItem(b) {
  const lis = blockEl(b.id)?.querySelectorAll('.accordion-item');
  const n = accView?.startsWith('acc-item:') ? Number(accView.slice(9)) : -1;
  lis?.forEach((li, k) => { const on = k === n || (k === 0 && !!b.expandFirst); if (on) li.setAttribute('data-is-open', 'true'); else li.removeAttribute('data-is-open'); li.querySelector('button').setAttribute('aria-expanded', String(on)); });
}
function setAccordion(change, label) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  change(b);
  renderSectionDom(sel.sid);
  showAccordionItem(b);
  const L = lay(b), need = contentRows(b, measure(feEl(sel.sid)));
  if (L.area[2] - L.area[0] !== need) { L.area = [L.area[0], L.area[1], L.area[0] + need, L.area[3]]; renderSectionDom(sel.sid); showAccordionItem(b); }
  commit(before, label);
  renderBlockPanel();
}
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-acc]');
  const s = e.target.closest('button[data-acc-set]');
  if ((!a && !s) || !sel) return;
  if (s) {
    const k = s.dataset.accSet, v = s.dataset.v;
    setAccordion((b) => { if (k === 'iconLeft') { if (v === 'left') b.iconLeft = true; else delete b.iconLeft; } else b[k] = v; }, `${k} ${v}`);
    return;
  }
  const [act, arg] = a.dataset.acc.split(':'), n = Number(arg);
  if (act === 'open') { accView = `acc-item:${n}`; renderBlockPanel(); return; }
  if (act === 'back') { accView = null; renderBlockPanel(); return; }
  if (act === 'dividers') { accView = 'acc-dividers'; renderBlockPanel(); return; }
  if (act === 'design') { accView = null; renderBlockPanel(); return; }
  accView = null;
  if (act === 'add') setAccordion((b) => { b.items.push({ title: 'New Item', description: ACCORDION_DESCRIPTION }); }, 'Item added');
  if (act === 'del') setAccordion((b) => { b.items.splice(n, 1); }, 'Item deleted');
  if (act === 'dup') setAccordion((b) => { b.items.splice(n + 1, 0, { ...b.items[n] }); }, 'Item duplicated');
});
blockPanel.addEventListener('change', (e) => {
  const t = e.target.closest('[data-content="accTitle"], [data-content="accDescription"]');
  if (t && sel) { const n = Number(t.dataset.n), key = t.dataset.content === 'accTitle' ? 'title' : 'description', v = t.value; t.blur(); setAccordion((b) => { b.items[n][key] = v; }, `Item ${key} changed`); return; }
  const c = e.target.closest('input[data-acc-set]');
  if (!c || !sel) return;
  const k = c.dataset.accSet, keepOn = ['dividers', 'showFirst', 'showLast'].includes(k), on = c.checked;
  setAccordion((b) => { if (keepOn) { if (on) delete b[k]; else b[k] = false; } else if (on) b[k] = true; else delete b[k]; }, `${k} ${on ? 'on' : 'off'}`);
});

// Image Alternate Filename and alt text, one undo step when the field is left; empty removes it.
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-content="alt"], input[data-content="filename"]');
  if (!f) return;
  e.stopImmediatePropagation();
  const key = f.dataset.content, v = f.value;
  f.blur();
  setButton((b) => { if (v) b[key] = v; else delete b[key]; }, key === 'alt' ? 'Image alt text changed' : 'Alternate Filename changed');
  renderBlockPanel();
}, true);
// Image Replace and Remove: one undo step each.
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-image-act]');
  if (!a || !sel) return;
  if (a.dataset.imageAct === 'replace') { blockPanel.querySelector('[data-image-file]').click(); return; }
  setButton((b) => { delete b.src; delete b.aspect; b.empty = true; }, 'Image removed');
  renderBlockPanel();
});
blockPanel.addEventListener('change', async (e) => {
  const f = e.target.closest('input[data-image-file]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  const file = f.files[0];
  if (!file) return;
  const pic = await readPicture(file).catch(() => null);
  if (!pic) { note('That file is not a picture'); updateUi(); return; }
  setButton((b) => { b.src = pic.src; b.aspect = pic.aspect; delete b.empty; }, 'Image replaced');
  renderBlockPanel();
}, true);
// The editor saves to the browser, which holds only a few MB: a picture is kept at most 1600px wide or tall.
async function readPicture(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/webp', 0.85), aspect: bmp.width / bmp.height };
}
// Keys typed in a panel field stay in the field: a Backspace there must not remove the block.
blockPanel.addEventListener('keydown', (e) => { if (e.key !== 'Escape' && e.target.matches('input, textarea, select')) e.stopPropagation(); });
blockPanel.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[data-content]')) e.target.dispatchEvent(new Event('change', { bubbles: true })); });

const linkPop = $('link-popover');
function closeLinkPopover() { linkPop.hidden = true; }
function siteLinkGroups() {
  // The oracle lists each page as name and path, e.g. Services/services. Our header stores no
  // path for most pages, so the path comes from the name when none is stored.
  const path = (n) => (n.href && n.href !== '#' ? n.href : `/${n.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
  const nav = (model.header?.nav || []).map((n) => ({ label: n.label, href: path(n) }));
  return [{ name: 'Main Navigation', pages: nav }];
}
function onLinkAction(act, el) {
  const b = B(sel.sid, sel.bid);
  if (act === 'copy') { navigator.clipboard?.writeText(b.href || '').catch(() => {}); note('Link copied'); updateUi(); return; }
  if (act === 'remove') { closeLinkPopover(); setButton((x) => { delete x.href; }, 'Link removed'); return; }
  // open or edit
  openLinkPopover(b, (st) => linkPopoverPosition(blockPanel.getBoundingClientRect(), el.getBoundingClientRect(), st));
}
// What Enter or a page applies to: the selected button (default) or a saved text range.
let linkTarget = null;
function openLinkPopover(b, place, target = null) {
  linkTarget = target;
  linkPop.dataset.bid = b.id;
  linkPop.innerHTML = linkPopoverHtml(target ? target.href : b.href, siteLinkGroups());
  const p = place(stage.getBoundingClientRect());
  linkPop.style.left = `${p.left}px`; linkPop.style.top = `${p.top}px`;
  linkPop.hidden = false;
  linkPop.classList.toggle('has-text', !!(target ? target.href : b.href));
  linkPop.querySelector('.lk-input').focus();
}
function applyLink(href) {
  closeLinkPopover();
  const v = href.trim();
  if (linkTarget) { const t = linkTarget; linkTarget = null; t.apply(v); return; }
  setButton((b) => { if (v) b.href = v; else delete b.href; }, v ? 'Link set' : 'Link removed');
}
linkPop.addEventListener('input', (e) => { if (e.target.matches('.lk-input')) linkPop.classList.toggle('has-text', !!e.target.value); });
linkPop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.lk-input')) { e.preventDefault(); applyLink(e.target.value); }
  if (e.key === 'Escape') { e.stopPropagation(); closeLinkPopover(); }
});
linkPop.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
linkPop.addEventListener('click', (e) => {
  const pg = e.target.closest('.lk-page');
  if (pg) { applyLink(pg.dataset.href); return; }
  if (e.target.closest('.lk-clear')) { const i = linkPop.querySelector('.lk-input'); i.value = ''; linkPop.classList.remove('has-text'); i.focus(); }
});
function onDesignChange(e) {
  const input = e.target.closest('input[data-design]');
  if (!input || !sel) return;
  e.stopImmediatePropagation();
  const before = JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  const k = input.dataset.design;
  const d = { ...(b.design || {}) };
  if (input.type === 'checkbox') { if (input.checked) d[k] = true; else delete d[k]; }
  else {
    const f = DESIGN_FIELDS.find((x) => x[0] === k) || [k, k, 'px', 0, 500];
    const v = Number(input.value);
    if (!Number.isFinite(v)) return;
    const c = Math.min(f[4], Math.max(f[3], v));
    if (c === (DESIGN_DEFAULTS[k] ?? 0)) delete d[k]; else d[k] = c;
  }
  if (Object.keys(d).length) b.design = d; else delete b.design;
  renderSectionDom(sel.sid);
  commit(before, `${k} set on ${b.id}`);
}
panel.addEventListener('change', onDesignChange, true);
blockPanel.addEventListener('change', onDesignChange, true);

// The text toolbar (E4, parity/findings/TEXTOPS.json), in the oracle's order: Text Style,
// Bold, Italic, Quote, Bullet List, Numbered List, Strike, Outdent, Indent, Text Alignment,
// Clear Formatting. Not built: Squarespace AI, Text Color, Scaled Text, Text Highlight, Link.
const TEXT_ACTIONS = [['bold', 'Bold'], ['italic', 'Italic'], ['quote', 'Quote'], ['bullet', 'Bullet List'], ['numbered', 'Numbered List'], ['strike', 'Strike'],
  ['outdent', 'Outdent'], ['indent', 'Indent'], ['align:left', 'Align left'], ['align:center', 'Align center'], ['align:right', 'Align right'], ['align:justify', 'Align justify'], ['clear', 'Clear Formatting']];
const textBar = $('text-bar');
let textMenu = null; // 'style' | 'align' | null
// The checked swatch: the color span around the selection, else the palette color equal to
// the text's computed color (the oracle checks Darkest on plain black text, TEXTCOLOR.json).
function currentColorKey() {
  const sel = win.getSelection();
  const k = fmt.currentTextColor(editing.ce, sel);
  if (k || !sel.rangeCount) return k;
  const n = sel.getRangeAt(0).startContainer;
  const el = n.nodeType === 1 ? n : n.parentElement;
  const rgb = win.getComputedStyle(el).color;
  return (fmt.TEXT_COLORS.find(([, , c]) => c === rgb) || [])[1] || null;
}
function renderTextBar() {
  if (!editing || document.body.classList.contains('is-preview')) { textBar.hidden = true; textMenu = null; return; }
  textBar.innerHTML = textBarHtml(fmt.currentStyle(editing.ce, win.getSelection()), textMenu, textMenu === 'color' ? currentColorKey() : null, textMenu === 'color' ? customColor : null);
  paintCustomColor();
  // The color popover is centred under its button, 6px below it (TEXTCOLOR.json).
  const cp = textBar.querySelector('.tx-colors'), cb = textBar.querySelector('[data-fmt="color-menu"]');
  if (cp && cb) { cp.style.left = `${cb.offsetLeft + cb.offsetWidth / 2 - 127}px`; cp.style.top = `${cb.offsetTop + cb.offsetHeight + 6}px`; }
  const p = textBarPosition(blockEl(editing.bid).getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect());
  textBar.style.left = `${p.left}px`;
  textBar.style.top = `${p.top}px`;
  textBar.hidden = false;
}
function applyFormat(act, value) {
  const ed = editing;
  if (!ed) return;
  const sel = win.getSelection();
  const [kind, arg] = act.split(':');
  if (kind === 'style') fmt.setStyle(doc, ed.ce, sel, value);
  if (kind === 'bold' || kind === 'italic' || kind === 'strike') fmt.toggleMark(doc, ed.ce, sel, kind);
  if (kind === 'quote' || kind === 'bullet' || kind === 'numbered') fmt.toggleWrap(doc, ed.ce, sel, kind);
  if (kind === 'indent') fmt.indent(ed.ce, sel, 1);
  if (kind === 'outdent') fmt.indent(ed.ce, sel, -1);
  if (kind === 'align') fmt.align(ed.ce, sel, arg);
  if (kind === 'clear') fmt.clearFormatting(ed.ce, sel);
  if (kind === 'color') fmt.setTextColor(doc, ed.ce, sel, value);
  if (kind === 'highlight') fmt.addHighlight(doc, ed.ce, sel);
  if (kind === 'scaled') fmt.toggleScaled(doc, ed.ce, sel);
  ed.ce.focus();
  onTextInput();
}
// The Custom tab of Text Color (parity/findings/TEXTCOLOR.json, custom). A color map, a hue bar and a
// Hex field. Each pick is written at once and the popover stays open. null is the Palette tab.
let customColor = null;
const hsvToHex = ({ h, s, v }) => {
  const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
};
const hexToHsv = (hex) => {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const v = Math.max(r, g, b), d = v - Math.min(r, g, b);
  const h = !d ? 0 : v === r ? ((g - b) / d + 6) % 6 : v === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: v ? d / v : 0, v };
};
const fullHex = (t) => (/^#[0-9a-f]{6}$/i.test(t) ? t : /^#[0-9a-f]{3}$/i.test(t) ? t.replace(/[0-9a-f]/gi, '$&$&') : null)?.toUpperCase();
// What the selection has now: its color as hex, and whether it is a custom one.
function selectionColor() {
  const s0 = win.getSelection();
  const n = s0.rangeCount ? s0.getRangeAt(0).startContainer : editing.ce;
  const [r, g, b] = win.getComputedStyle(n.nodeType === 1 ? n : n.parentElement).color.match(/\d+/g).map(Number);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
function openCustomColor() {
  const hex = selectionColor();
  customColor = { ...hexToHsv(hex), hex };
}
function paintCustomColor() {
  const c = customColor, map = textBar.querySelector('.tx-cmap');
  if (!c || !map) return;
  const thumb = map.firstChild;
  thumb.style.left = `${c.s * 254 - 8}px`;
  thumb.style.top = `${(1 - c.v) * 240 - 8}px`;
  thumb.style.background = c.hex;
  map.style.backgroundColor = `hsl(${c.h}, 100%, 50%)`;
  textBar.querySelector('.tx-chue').firstChild.style.left = `${3 + (c.h / 360) * 234}px`;
  const input = textBar.querySelector('input[aria-label="Hex"]');
  if (input !== document.activeElement) input.value = c.hex;
}
function pickCustomColor() {
  if (!editing) return;
  fmt.setCustomColor(doc, editing.ce, win.getSelection(), customColor.hex);
  onTextInput();
  paintCustomColor();
}
function dragCustomColor(e, el, read) {
  const move = (ev) => {
    const r = el.getBoundingClientRect();
    read(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
    customColor.hex = hsvToHex(customColor);
    pickCustomColor();
  };
  const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  move(e);
}
textBar.addEventListener('pointerdown', (e) => {
  const map = e.target.closest('.tx-cmap'), hue = e.target.closest('.tx-chue');
  if (map) dragCustomColor(e, map, (x, y) => { customColor.s = x; customColor.v = 1 - y; });
  if (hue) dragCustomColor(e, hue, (x) => { customColor.h = x * 360; });
});
textBar.addEventListener('input', (e) => {
  if (e.target.matches('input[aria-label="Alpha"]')) { e.target.value = `${e.target.value.replace(/\D/g, '')}%`; return; }
  if (!e.target.matches('input[aria-label="Hex"]')) return;
  const hex = fullHex(e.target.value.trim());
  if (hex) { customColor = { ...hexToHsv(hex), hex }; pickCustomColor(); }
});
textBar.addEventListener('focusout', (e) => { if (e.target.matches('input[aria-label="Hex"]') && customColor) e.target.value = customColor.hex; });
// Buttons keep the text selection: no focus change on mousedown.
textBar.addEventListener('mousedown', (e) => { if (e.target.closest('button, .tx-swatch, .tx-cmap, .tx-chue')) e.preventDefault(); });
textBar.addEventListener('click', (e) => {
  const ctab = e.target.closest('[data-ctab]');
  if (ctab && editing) { if (ctab.dataset.ctab === 'Custom') openCustomColor(); else customColor = null; renderTextBar(); return; }
  const sw = e.target.closest('input[data-fmt="color"]');
  if (sw && editing) { textMenu = null; applyFormat('color', sw.dataset.v); renderTextBar(); return; }
  const b = e.target.closest('button[data-fmt]');
  if (!b || !editing || b.disabled) return;
  const act = b.dataset.fmt;
  if (act === 'link') { openTextLink(b); return; }
  if (act === 'color-menu') { customColor = null; if (textMenu !== 'color' && fmt.currentTextColor(editing.ce, win.getSelection()) === 'custom') openCustomColor(); }
  if (act === 'style-menu' || act === 'align-menu' || act === 'color-menu') { const m = act.replace('-menu', ''); textMenu = textMenu === m ? null : m; renderTextBar(); return; }
  textMenu = null;
  if (act === 'style') applyFormat('style', b.dataset.v); else applyFormat(act);
  renderTextBar();
});

// Text Link (E7, parity/findings/TEXTLINK.json): the popover opens centred under the Link
// button, 10px below it, for the selected text; Enter or a page wraps it in <a href>.
function openTextLink(btnEl) {
  const ed = editing;
  const s0 = win.getSelection();
  if (!ed || !s0.rangeCount) return;
  const range = s0.getRangeAt(0).cloneRange();
  const a = fmt.linkAt(ed.ce, range);
  openLinkPopover(B(ed.sid, ed.bid), (st) => { const r = btnEl.getBoundingClientRect(); return { left: Math.max(8, r.left + r.width / 2 - 160 - st.left), top: r.bottom + 10 - st.top }; }, {
    href: a ? a.getAttribute('href') : '',
    apply: (href) => {
      if (editing !== ed) return;
      ed.ce.focus();
      const sel2 = win.getSelection(); sel2.removeAllRanges(); sel2.addRange(range);
      if (fmt.setLink(doc, ed.ce, sel2, range, href)) onTextInput();
      renderTextBar();
    },
  });
}

// When an edit makes the text taller, move the block's end row instead of
// letting the row stretch.
function onTextInput() {
  const ed = editing;
  const b = B(ed.sid, ed.bid);
  // The end row follows the text both ways, but not below 2 rows
  // (parity/findings/E3.json: a one-line paragraph ended at 2 rows).
  const need = Math.max(2, contentRows(b, ed.m));
  if (ed.area[2] - ed.area[0] !== need) {
    ed.area[2] = ed.area[0] + need;
    setArea(blockEl(ed.bid), ed.area);
    const ind = feEl(ed.sid).querySelector('.fe-indicator');
    if (ind) setArea(ind, ed.area);
  }
}

function onTextSelection() { if (editing && !textMenu) renderTextBar(); }
function finishTextEdit() {
  const ed = editing;
  if (!ed) return;
  editing = null;
  doc.removeEventListener('selectionchange', onTextSelection);
  renderTextBar();
  const b = B(ed.sid, ed.bid);
  b.html = ed.ce.innerHTML;
  lay(b).area = ed.area;
  growRows(S(ed.sid));
  feEl(ed.sid).style.gridAutoRows = '';
  renderSectionDom(ed.sid);
  commit(ed.before, `Edited text in ${ed.bid}`);
}

// ---------- panel ----------
function updateUi() {
  $('undo').disabled = !undoStack.length;
  $('redo').disabled = !redoStack.length;
  const dirty = JSON.stringify(model) !== savedJson;
  $('save').disabled = !dirty;
  // The oracle's status line stays "Page · Published" with unsaved changes; only Save
  // turns on (parity/findings/EXIT.json).
  $('page-state').textContent = document.body.classList.contains('is-preview') ? 'Previewing' : 'Page · Published';
  renderPanel();
  if (editSid) renderSectionPanel();
  renderBlockPanel();
  placeToolbar();
  placeChrome();
  placePhoneLines();
}

function renderPanel() {
  if (!doc) return;
  const parts = [];
  if (sel) {
    const s = S(sel.sid);
    const b = B(sel.sid, sel.bid);
    const L = lay(b);
    const [r0, c0, r1, c1] = L.area;
    parts.push(`<div class="group"><h3 data-dev>Block</h3><dl data-dev>
      <dt>Id</dt><dd>${b.id}</dd>
      <dt>Type</dt><dd>${b.type}</dd>
      <dt>Layout</dt><dd>${bp}</dd>
      <dt>grid-area</dt><dd>${L.area.join(' / ')}</dd>
      <dt>Size</dt><dd>${c1 - c0} cols, ${r1 - r0} rows</dd>
      <dt>z-index</dt><dd>${L.z}</dd>
    </dl>
    </div>`);
    // Move Forward and Backward, Move Up and Down, Align Vertically, Add Block and the group
    // actions live where the oracle has them: the block and group toolbars and the section chrome.

  } else {
    parts.push(`<div class="group" data-dev><h3>Page</h3><p class="hint">Click a block to select it. Drag to move. Pull a handle to resize. Double-click text to edit. Arrow keys move one cell. Esc cancels, Cmd+Z undoes.</p></div>`);
  }
  // data-dev marks readouts for developers; the inventory (scripts/inventory.mjs) skips them.
  parts.push(`<div class="group" data-dev><h3>Activity</h3><pre class="log">${notes.join('\n') || 'Nothing yet'}</pre></div>`);
  panel.innerHTML = parts.join('');
}

// Add Block (U5, T13): each type lands at the top left of the section with the size
// the oracle gives it (parity/findings/T13.json). The phone placement is ours: the
// bottom of the phone stack, full content width (not measured yet).
const ADD_TYPES = [
  ['Text', 8, 2, () => ({ type: 'text', html: '<p data-rte-preserve-empty="true"></p>' })],
  ['Image', 6, 6, () => ({ type: 'image', alt: '', empty: true, mode: 'fit' })],
  ['Button', 6, 2, () => ({ type: 'button', label: 'Learn more' })],
  ['Video', 8, 8, () => ({ type: 'video' })],
  ['Form', 9, 16, () => ({ type: 'shape', fill: '#d9d4ca', radius: '0', label: 'form' })],
  ['Accordion', 8, 8, () => ({ type: 'accordion', items: [1, 2, 3].map((n) => ({ title: `Accordion Item ${n}`, description: ACCORDION_DESCRIPTION })) })],
  ['Shape', 6, 6, () => ({ type: 'shape', fill: '#ffffff', radius: '0' })],
  ['Scrolling', 24, 2, () => ({ type: 'scrolling', text: 'Scrolling text', size: 5 })],
  ['Line', 4, 1, () => ({ type: 'line' })],
  // From the menu search (parity/findings/T10.json): Code 4 by 6, Embed 8 by 8.
  ['Code', 4, 6, () => ({ type: 'code', html: '<p>Hello, World!</p>' })],
  ['Embed', 8, 8, () => ({ type: 'embed' })],
];
function addBlock(sid, name) {
  const [, w, h, make] = ADD_TYPES.find((t) => t[0] === name);
  const s = S(sid);
  const id = `${name.toLowerCase()}-${Date.now().toString(36)}`;
  // Phone (L3, parity/findings/L3.json): the new block joins the phone stack in desktop
  // reading order (row, then column; after blocks that start at the same place) and the
  // blocks after it move down by its height.
  const key = (a) => a[0] * 100 + a[1];
  const before = s.blocks.filter((b) => key(b.layout.desktop.area) <= key([1, 2]));
  const mobileEnd = before.length ? Math.max(...before.map((b) => b.layout.mobile.area[2])) : 1;
  const zTop = (bpName) => Math.max(0, ...s.blocks.map((b) => b.layout[bpName].z)) + 1;
  const block = { id, ...make(), layout: {
    desktop: { area: [1, 2, 1 + h, 2 + w], z: zTop('desktop'), justify: 'flex-start', align: 'flex-start' },
    mobile: { area: [mobileEnd, 2, mobileEnd + h, 10], z: zTop('mobile'), justify: 'flex-start', align: 'flex-start' },
  } };
  for (const b of s.blocks) {
    const a = b.layout.mobile.area;
    if (!before.includes(b) && a[0] >= mobileEnd) b.layout.mobile.area = [a[0] + h, a[1], a[2] + h, a[3]];
  }
  s.blocks.push(block);
  for (const bpName of ['desktop', 'mobile']) s.rows[bpName] = Math.max(s.rows[bpName], block.layout[bpName].area[2] - 1);
  sel = { sid, bid: id };
}

// Cmd+D (KEYS2): the copy is one row down and one column right on desktop, the same
// size, on top; on phones it goes right below the original and later blocks move down.
function duplicateBlock(sid, bid) {
  const s = S(sid);
  const orig = B(sid, bid);
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = `${orig.type}-${Date.now().toString(36)}`;
  const d = copy.layout.desktop.area;
  const w = d[3] - d[1];
  const c0 = Math.min(d[1] + 1, LAST_LINE.desktop - w);
  copy.layout.desktop.area = [d[0] + 1, c0, d[2] + 1, c0 + w];
  copy.layout.desktop.z = Math.max(...s.blocks.map((b) => b.layout.desktop.z)) + 1;
  const m = orig.layout.mobile.area;
  const h = m[2] - m[0];
  for (const b of s.blocks) {
    const a = b.layout.mobile.area;
    if (b !== orig && a[0] >= m[2]) b.layout.mobile.area = [a[0] + h, a[1], a[2] + h, a[3]];
  }
  copy.layout.mobile.area = [m[2], m[1], m[2] + h, m[3]];
  copy.layout.mobile.z = Math.max(...s.blocks.map((b) => b.layout.mobile.z)) + 1;
  s.blocks.splice(s.blocks.indexOf(orig) + 1, 0, copy);
  for (const bpName of ['desktop', 'mobile']) s.rows[bpName] = Math.max(s.rows[bpName], copy.layout[bpName].area[2] - 1);
  sel = { sid, bid: copy.id };
}

// Copy and Paste of blocks (U11). The oracle's clipboard did not reach the page in the probe, so
// the place is ours: the same grid area in any section, one row and one column on while that
// area is taken, at the bottom of the phone layout. Ours keeps the copy in memory.
let blockClip = null;
let transformClip = null;
function copyBlocks() {
  blockClip = [sel.bid, ...(sel.more || [])].map((id) => JSON.parse(JSON.stringify(B(sel.sid, id))));
}
function pasteBlocks(sid) {
  const s = S(sid);
  const ids = blockClip.map((src, n) => {
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `${src.type}-${Date.now().toString(36)}-${n}`;
    const d = copy.layout.desktop.area;
    const w = d[3] - d[1];
    const taken = (a) => s.blocks.some((b) => b.layout.desktop.area.join() === a.join());
    for (let k = 0; k < 50 && taken(copy.layout.desktop.area); k++) {
      const [r0, c0, r1] = copy.layout.desktop.area;
      const c = Math.min(c0 + 1, LAST_LINE.desktop - w);
      copy.layout.desktop.area = [r0 + 1, c, r1 + 1, c + w];
    }
    const m = copy.layout.mobile.area;
    const top = Math.max(1, ...s.blocks.map((b) => b.layout.mobile.area[2]));
    copy.layout.mobile.area = [top, m[1], top + m[2] - m[0], m[3]];
    for (const bpName of ['desktop', 'mobile']) {
      copy.layout[bpName].z = Math.max(0, ...s.blocks.map((b) => b.layout[bpName].z)) + 1;
      s.rows[bpName] = Math.max(s.rows[bpName], copy.layout[bpName].area[2] - 1);
    }
    s.blocks.push(copy);
    return copy.id;
  });
  sel = { sid, bid: ids[0], ...(ids.length > 1 ? { more: ids.slice(1) } : {}) };
}
// Copy Properties, Transforms: the values of the Design tab's Transforms group.
function copyTransforms() {
  const d = B(sel.sid, sel.bid).design || {};
  transformClip = Object.fromEntries(DESIGN_FIELDS.filter(([k]) => k in d).map(([k]) => [k, d[k]]));
}
function pasteTransforms(sid, ids) {
  for (const id of ids) {
    const b = B(sid, id);
    const d = { ...(b.design || {}) };
    for (const [k] of DESIGN_FIELDS) delete d[k];
    Object.assign(d, transformClip);
    if (Object.keys(d).length) b.design = d; else delete b.design;
  }
}

// Align Group, as on the oracle (traces T0018, T0019): blocks line up on the group's
// bounding box; centers round to the nearest line.
// Like the oracle's Move Forward / Move Backward (traces T0011, T0012): swap z-index
// with the block next above or below in z order.
function zSwap(sid, b, up) {
  const L = lay(b);
  const others = S(sid).blocks.filter((o) => o !== b).map((o) => lay(o));
  const next = others.filter((o) => (up ? o.z > L.z : o.z < L.z)).sort((x, y) => (up ? x.z - y.z : y.z - x.z))[0];
  if (next) [L.z, next.z] = [next.z, L.z];
}

// Phone Move Up and Move Down (traces T0020, T0021): the phone toolbar has these instead of
// Move Forward, Move Backward and Duplicate. The block trades places with the previous or
// next block in the phone stack (by start row): the lower one takes the upper one's start
// row, the upper one follows it. Heights, columns and z-index stay.
function moveInStack(sid, b, up) {
  const stack = S(sid).blocks.filter((o) => o.layout.mobile).sort((x, y) => x.layout.mobile.area[0] - y.layout.mobile.area[0] || x.layout.mobile.area[1] - y.layout.mobile.area[1]);
  const k = stack.indexOf(b);
  const other = stack[up ? k - 1 : k + 1];
  if (!other) return;
  const [upper, lower] = up ? [other, b] : [b, other];
  const U = upper.layout.mobile.area, Lw = lower.layout.mobile.area;
  const gap = Lw[0] - U[2];
  const uh = U[2] - U[0], lh = Lw[2] - Lw[0];
  lower.layout.mobile.area = [U[0], Lw[1], U[0] + lh, Lw[3]];
  upper.layout.mobile.area = [U[0] + lh + gap, U[1], U[0] + lh + gap + uh, U[3]];
}

function alignGroup(kind) {
  const ids = [sel.bid, ...(sel.more || [])];
  const L = ids.map((id) => lay(B(sel.sid, id)));
  const r0 = Math.min(...L.map((l) => l.area[0])), r1 = Math.max(...L.map((l) => l.area[2]));
  const c0 = Math.min(...L.map((l) => l.area[1])), c1 = Math.max(...L.map((l) => l.area[3]));
  for (const l of L) {
    const [a0, b0, a1, b1] = l.area;
    const h = a1 - a0, w = b1 - b0;
    let r = a0, c = b0;
    if (kind === 'left') c = c0;
    if (kind === 'right') c = c1 - w;
    if (kind === 'hcenter') c = Math.round((c0 + c1) / 2 - w / 2);
    if (kind === 'top') r = r0;
    if (kind === 'bottom') r = r1 - h;
    if (kind === 'vcenter') r = Math.round((r0 + r1) / 2 - h / 2);
    l.area = [r, c, r + h, c + w];
  }
}

// Stack Blocks (S3): the selected blocks become one stack over their bounding box,
// on both layouts, children in row order (parity/findings/S3.json). The new block
// is selected afterwards.
function stackBlocks() {
  normalize(sel.sid); // the oracle works on normalized rows here too
  const s = S(sel.sid);
  const ids = [sel.bid, ...(sel.more || [])];
  const parts = ids.map((id) => B(sel.sid, id));
  const box = (bpName) => {
    const A = parts.map((b) => b.layout[bpName].area);
    return [Math.min(...A.map((a) => a[0])), Math.min(...A.map((a) => a[1])), Math.max(...A.map((a) => a[2])), Math.max(...A.map((a) => a[3]))];
  };
  const order = [...parts].sort((a, b) => a.layout[bp].area[0] - b.layout[bp].area[0] || a.layout[bp].area[1] - b.layout[bp].area[1]);
  const id = `stack-${Date.now().toString(36)}`;
  const layout = {};
  for (const bpName of ['desktop', 'mobile']) layout[bpName] = { area: box(bpName), z: Math.max(...parts.map((b) => b.layout[bpName].z)), justify: 'flex-start', align: 'flex-start' };
  const stack = { id, type: 'stack', direction: 'column', gap: 20, children: order.map(({ layout: _l, ...c }) => c), layout };
  const at = Math.min(...parts.map((b) => s.blocks.indexOf(b)));
  s.blocks = s.blocks.filter((b) => !ids.includes(b.id));
  s.blocks.splice(at, 0, stack);
  sel = { sid: sel.sid, bid: id };
}

// Layers, as on the oracle: the section's blocks front to back by z-index; text blocks
// show their first words, others their type. Click selects, drag reorders.
// Edit Section (P3, P4, P5, S1, S2), the oracle's three tabs (parity/findings/PANEL.json,
// SETTINGS.json): Design has Row Count, Gap (Zero 0px, Medium 11px, Custom column and row
// gaps 0 to 50px), Fill Screen, Height S/M/L/Custom and vertical Alignment; Background has
// Background Width; Colors has ten themes. Divider adds the default wave with Stroke and Thickness (shape settings and Color not built). Unchecking Fill Screen makes the section fit its
// content and hides Height and Alignment, as on the oracle.
const THEMES = [['Lightest 1', 'white'], ['Lightest 2', 'white-bold'], ['Light 1', 'light'], ['Light 2', 'light-bold'], ['Bright 1', 'bright-inverse'],
  ['Bright 2', 'bright'], ['Dark 1', 'dark'], ['Dark 2', 'dark-bold'], ['Darkest 1', 'black'], ['Darkest 2', 'black-bold']];
const MEDIUM_GAP = 11;
let sectionTab = 'Design';
let customGap = false;
const fillScreen = (s) => !(s.height === 'custom' && s.customHeight == null);
const gapKind = (s) => (customGap ? 'custom' : s.gap === 0 && (s.rowGap ?? 0) === 0 ? 'zero' : s.gap === MEDIUM_GAP && (s.rowGap ?? MEDIUM_GAP) === MEDIUM_GAP ? 'medium' : 'custom');
function onSectionClick(e) {
  const btn = e.target.closest('button[data-sact]');
  if (!btn || !secSid()) return;
  e.stopImmediatePropagation();
  const s = S(secSid());
  const { sact: act, v } = btn.dataset;
  if (act === 'tab') { sectionTab = v; customGap = false; renderPanel(); if (editSid) renderSectionPanel(); return; }
  if (act === 'gap' && v === 'custom') { customGap = true; renderPanel(); if (editSid) renderSectionPanel(); return; }
  const before = JSON.stringify(model);
  if (act === 'gap') { customGap = false; s.gap = v === 'zero' ? 0 : MEDIUM_GAP; s.rowGap = s.gap; }
  if (act === 'height') { s.height = v; s.customHeight = v === 'custom' ? (s.customHeight ?? 1) : undefined; }
  if (act === 'valign') s.valign = v;
  if (act === 'bgWidth') s.bgWidth = v;
  if (act === 'theme') s.theme = v;
  if (act === 'dividerStroke') { if (v === 'solid') delete s.dividerStroke; else s.dividerStroke = v; }
  if (act === 'dividerThickness') { if (v === 'M') delete s.dividerThickness; else s.dividerThickness = v; }
  if (JSON.stringify(model) === before) return;
  renderSectionDom(s.id);
  commit(before, `Section ${s.id} ${act} set to ${v}`);
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !sel) return;
  const before = JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  const L = lay(b);
  if (btn.dataset.act === 'z+' || btn.dataset.act === 'z-') zSwap(sel.sid, b, btn.dataset.act === 'z+');
  if (btn.dataset.act === 'up' || btn.dataset.act === 'down') moveInStack(sel.sid, b, btn.dataset.act === 'up');
  if (btn.dataset.act === 'justify') L.justify = btn.dataset.v;
  if (btn.dataset.act === 'align') alignGroup(btn.dataset.v);
  if (btn.dataset.act === 'stack') stackBlocks();
  if (btn.dataset.act === 'add') addBlock(sel.sid, btn.dataset.v);
  renderSectionDom(sel.sid);
  commit(before, `${btn.textContent} on ${b.id}`);
});

function onSectionChange(e) {
  const input = e.target.closest('input[data-act]');
  if (!input || !secSid()) return;
  const before = JSON.stringify(model);
  const s = S(secSid());
  const act = input.dataset.act;
  if (act === 'anchor') {
    const v = input.value.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (v) s.anchor = v; else delete s.anchor;
  } else if (act === 'divider') {
    if (input.checked) s.divider = true; else { delete s.divider; delete s.dividerStroke; delete s.dividerThickness; }
  } else if (act === 'fill') {
    if (input.checked) { s.height = 'medium'; delete s.customHeight; } else { s.height = 'custom'; delete s.customHeight; }
  } else {
    const v = Math.round(Number(input.value));
    if (!Number.isFinite(v)) return;
    if (act === 'rows') s.rows[bp] = Math.min(10000, Math.max(Number(input.min), v));
    if (act === 'gap') { s.rowGap = s.rowGap ?? s.gap; s.gap = Math.min(50, Math.max(0, v)); }
    if (act === 'rowGap') s.rowGap = Math.min(50, Math.max(0, v));
    if (act === 'customHeight') s.customHeight = Math.min(100, Math.max(1, v));
  }
  if (JSON.stringify(model) === before) return;
  renderSectionDom(s.id);
  commit(before, `Section ${s.id} ${act} set to ${input.type === 'checkbox' ? input.checked : input.value}`);
}

// ---------- section chrome (U9, U10) ----------
// Hovering a section shows its toolbar; Edit Section opens the settings in a floating panel
// for that section, with or without a selected block.
const chrome = $('section-chrome');
const sectionPanel = $('section-panel');
const addMenu = $('add-block-menu');
let hoverSid = null;
let editSid = null;
const secSid = () => editSid || sel?.sid || null;
panel.addEventListener('click', onSectionClick, true);
panel.addEventListener('change', onSectionChange);
sectionPanel.addEventListener('click', onSectionClick, true);
sectionPanel.addEventListener('change', onSectionChange);
// Background tab: Add an Image and Remove (P5), one undo step each; Colors tab: Color Theme Editor.
for (const host of [panel, sectionPanel]) {
  host.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sbg]');
    if (!a || !secSid()) return;
    e.preventDefault();
    const act = a.dataset.sbg;
    if (act === 'themes') { setSiteStyles(true); return; }
    if (act === 'add') { host.querySelector('[data-sbg-file]').click(); return; }
    const before = JSON.stringify(model);
    const s = S(secSid());
    delete s.bgImage;
    renderSectionDom(s.id);
    commit(before, 'Section background image removed');
  });
  host.addEventListener('change', async (e) => {
    const f = e.target.closest('input[data-sbg-file]');
    if (!f || !secSid()) return;
    const file = f.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { note('That picture is over 20 MB'); updateUi(); return; }
    const pic = await readPicture(file).catch(() => null);
    if (!pic) { note('That file is not a picture'); updateUi(); return; }
    const before = JSON.stringify(model);
    const s = S(secSid());
    s.bgImage = pic.src;
    renderSectionDom(s.id);
    commit(before, 'Section background image added');
  });
}
function chromeSid() { return editSid || sel?.sid || hoverSid; }
function placeChrome() {
  const sid = chromeSid();
  const el = sid && doc && sectionEl(sid);
  if (!el || gesture?.type === 'move' || gesture?.type === 'resize') { chrome.hidden = true; return; }
  const k = model.sections.findIndex((x) => x.id === sid);
  const phone = bp === 'mobile';
  // A group leaves the section's chrome on screen (GROUPRESIZE.json); one selected block does not.
  const blockSelected = !editSid && sel?.sid === sid && !sel.more?.length && !marquee;
  const key = `${sid}|${k}|${model.sections.length}|${phone}|${blockSelected}`;
  if (chrome.dataset.key !== key) { chrome.innerHTML = sectionChromeHtml({ first: k === 0, last: k === model.sections.length - 1, phone, blockSelected }); chrome.dataset.key = key; }
  const header = k === 0 ? doc.getElementById('header') : null;
  const grid = el.querySelector('.fluid-engine')?.getBoundingClientRect() || null;
  const L = sectionChromeLayout(el.getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect(), header ? header.getBoundingClientRect().bottom : 0, phone, grid);
  for (const [part, box] of Object.entries(L)) {
    const node = chrome.querySelector(`[data-sc-part="${part}"]`);
    if (!node) continue;
    for (const [prop, v] of Object.entries(box)) node.style[prop] = `${v}px`;
  }
  chrome.hidden = false;
  if (editSid) {
    // 342px from the canvas's right edge (the window edge on the oracle, where the canvas is the window).
    sectionPanel.style.left = `${stage.getBoundingClientRect().width - 342}px`;
    sectionPanel.style.top = `${sectionPanelTop(L.card.top, stage.getBoundingClientRect().height)}px`;
  }
}
// Theme colors for the Colors tab tiles, read once from the canvas (site.css lives there).
let themeColors = null;
function readThemeColors() {
  const host = doc.createElement('section');
  host.className = 'page-section';
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;';
  host.innerHTML = '<div class="section-background"></div><h2>x</h2>';
  doc.body.append(host);
  const out = {};
  for (const [, v] of THEMES) {
    host.dataset.sectionTheme = v;
    out[v] = { bg: win.getComputedStyle(host.querySelector('.section-background')).backgroundColor, ink: win.getComputedStyle(host.querySelector('h2')).color };
  }
  host.remove();
  return out;
}
// Phone view (gap review screenshot): faint lines run across the white area at each section
// edge, outside the 428px canvas.
function placePhoneLines() {
  const host = $('phone-lines');
  if (bp !== 'mobile' || !doc) { host.replaceChildren(); return; }
  const fr = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
  host.replaceChildren(...[...doc.querySelectorAll('main#page .page-section')].map((sec) => {
    const y = fr.top - st.top + sec.getBoundingClientRect().bottom;
    const line = document.createElement('div');
    line.className = 'phone-line';
    line.style.top = `${Math.round(y)}px`;
    return line;
  }).filter((l) => parseFloat(l.style.top) > fr.top - st.top && parseFloat(l.style.top) < st.height));
}
function renderSectionPanel() {
  if (!editSid || !S(editSid)) { editSid = null; sectionPanel.hidden = true; return; }
  const s = S(editSid);
  themeColors = themeColors || readThemeColors();
  sectionPanel.innerHTML = sectionPanelHtml(s, { tab: sectionTab, bp, gapKind: gapKind(s), fill: fillScreen(s), minRows: Math.max(1, ...s.blocks.map((b) => b.layout[bp].area[2] - 1)), themes: THEMES, themeColors });
  sectionPanel.hidden = false;
}
function closeSectionPanel() { if (!editSid) return; editSid = null; renderSectionPanel(); placeChrome(); }
const newId = () => Math.random().toString(16).slice(2, 14).padEnd(12, '0') + Date.now().toString(16).slice(-12);
chrome.addEventListener('mousedown', (e) => e.preventDefault());
chrome.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sc]');
  const sid = chromeSid();
  if (!btn || !sid || btn.classList.contains('is-off')) return;
  const act = btn.dataset.sc;
  const k = model.sections.findIndex((x) => x.id === sid);
  if (act === 'edit') { editSid = sid; sectionTab = 'Design'; customGap = false; addMenu.hidden = true; renderSectionPanel(); placeChrome(); return; }
  // Add Block and Layers open over the section's top left (oracle screenshots: the Add Block
  // panel at the Layers box plus 5px, the Layers panel under the Layers button).
  const pill = chrome.querySelector('[data-sc-part="layers"]').getBoundingClientRect(), st = stage.getBoundingClientRect();
  if (act === 'add-block') {
    closeFloating();
    addMenu.innerHTML = addBlockMenuHtml(ADD_TYPES);
    addMenu.style.left = `${pill.left - st.left + 5}px`; addMenu.style.top = `${pill.top - st.top + 1}px`;
    addMenu.dataset.sid = sid; addMenu.hidden = false;
    addMenu.querySelector('input')?.focus();
    return;
  }
  if (act === 'layers') {
    closeFloating();
    layersPanel.dataset.sid = sid;
    renderLayersPanel();
    layersPanel.style.left = `${pill.left - st.left}px`; layersPanel.style.top = `${pill.bottom - st.top + 11}px`;
    layersPanel.hidden = false;
    return;
  }
  if (act === 'add-section-above' || act === 'add-section-below') { openAddSection(sid, act.endsWith('below')); return; }
  if (act === 'save') { saveSection(sid); return; }
  if (act === 'layouts' || act.startsWith('add-section')) { note(`${btn.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  const before = JSON.stringify(model);
  if (act === 'up' && k > 0) [model.sections[k - 1], model.sections[k]] = [model.sections[k], model.sections[k - 1]];
  if (act === 'down' && k < model.sections.length - 1) [model.sections[k + 1], model.sections[k]] = [model.sections[k], model.sections[k + 1]];
  if (act === 'duplicate') {
    const copy = JSON.parse(JSON.stringify(model.sections[k]));
    copy.id = newId();
    for (const b of copy.blocks) b.id = `yui_copy_${newId()}`;
    model.sections.splice(k + 1, 0, copy);
  }
  if (act === 'remove') {
    model.sections.splice(k, 1);
    if (sel?.sid === sid) sel = null;
    if (editSid === sid) editSid = null;
    hoverSid = null;
  }
  if (JSON.stringify(model) === before) return;
  renderAll();
  renderSectionPanel();
  commit(before, `${btn.getAttribute('aria-label')} ${sid}`);
});
addMenu.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-add]');
  if (!b) return;
  const before = JSON.stringify(model);
  const sid = addMenu.dataset.sid;
  addBlock(sid, b.dataset.add);
  addMenu.hidden = true;
  renderSectionDom(sid);
  commit(before, `Added ${b.dataset.add} to ${sid}`);
});
// ---------- floating menus: Add Block, Layers, the block context menu ----------
const layersPanel = $('layers-panel');
const contextMenu = $('context-menu');
// Site Styles (U12): the top bar button opens the panel and insets the editor; Close and the
// button again close it.
const siteStyles = $('site-styles');
let ssView = null;
function renderSsPanel() {
  let rows = [];
  if (ssView === 'Colors') {
    themeColors = themeColors || readThemeColors();
    const used = new Set(model.sections.map((s) => s.theme || 'light'));
    rows = THEMES.map(([name, v]) => ({ name, ...themeColors[v], used: used.has(v) }));
  }
  siteStyles.innerHTML = siteStylesHtml(model.siteStyles, ssView, rows);
  if (stylePopKind) siteStyles.querySelector(`[data-ss-pop="${stylePopKind}"]`)?.setAttribute('aria-expanded', 'true');
}
function setSiteStyles(on) {
  if (on) {
    closeFloating(); closeSectionPanel(); ssView = null;
    if (!packFontsLoaded) { document.head.insertAdjacentHTML('beforeend', packFontLinks()); packFontsLoaded = true; }
    renderSsPanel();
  }
  closeStylePopover();
  hideStyleConfirm();
  siteStyles.hidden = !on;
  document.body.classList.toggle('styles-open', on);
  $('site-styles-toggle').setAttribute('aria-pressed', String(on));
  requestAnimationFrame(() => { placeChrome(); placeToolbar?.(); });
}
$('site-styles-toggle').addEventListener('click', () => setSiteStyles(siteStyles.hidden));
siteStyles.addEventListener('click', (e) => {
  if (e.target.closest('[data-ss="close"]')) { setSiteStyles(false); return; }
  const card = e.target.closest('[data-ss-pop]');
  if (card) { openStylePopover(card.dataset.ssPop); return; }
  const open = e.target.closest('[data-ss-view]');
  if (open || e.target.closest('[data-ss-back]')) {
    closeStylePopover();
    ssView = open ? open.dataset.ssView : null;
    renderSsPanel();
    siteStyles.scrollTop = 0;
    return;
  }
  const step = e.target.closest('[data-ss-base]');
  if (step) { setBaseSize(baseSize(model.siteStyles) + Number(step.dataset.ssBase)); return; }
  const r = e.target.closest('[data-ss-reset]');
  if (r) showStyleConfirm(r.dataset.ssReset);
});
siteStyles.addEventListener('change', (e) => {
  if (!e.target.matches('.ss-base-in')) return;
  const n = parseInt(e.target.value, 10);
  if (Number.isFinite(n)) setBaseSize(n); else renderSsPanel();
});
// Base Size: one undo step per press. The limits are ours: the oracle's were not read.
function setSiteStyleKeys(label, change) {
  const before = JSON.stringify(model);
  model.siteStyles = change({ ...(model.siteStyles || {}) });
  commit(before, `Site Styles: ${label}`);
  renderAll();
  fitHeader();
}
function setBaseSize(px) {
  const n = Math.min(32, Math.max(8, px));
  if (n === baseSize(model.siteStyles)) { renderSsPanel(); return; }
  setSiteStyleKeys('Base Size', (st) => ({ ...st, base: n }));
}
// Reset asks first, as on the oracle. Reset clears the pack picked in that view; the theme stays.
const styleConfirm = $('ss-confirm');
let styleConfirmKind = null;
function hideStyleConfirm() { styleConfirm.hidden = true; styleConfirmKind = null; }
function showStyleConfirm(kind) {
  styleConfirmKind = kind;
  const word = kind === 'font' ? 'font' : 'button';
  $('ss-confirm-title').textContent = `Reset ${word === 'font' ? 'Font' : 'Button'} Pack`;
  $('ss-confirm-body').textContent = `Are you sure you want to reset this ${word} pack to its default settings?`;
  styleConfirm.hidden = false;
}
styleConfirm.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const kind = styleConfirmKind;
  hideStyleConfirm();
  if (b.id !== 'ss-confirm-reset') return;
  setSiteStyleKeys(`Reset ${kind} pack`, (st) => { delete st[kind]; if (kind === 'font') delete st.base; return st; });
});
// A style pack popover (parity/findings/SITESTYLES2.json). A tile sets that part of the site's
// styles in one undo step and the popover stays open, as on the oracle.
const stylePop = $('ss-popover');
let stylePopKind = null;
let packFontsLoaded = false;
function closeStylePopover() {
  stylePop.hidden = true; stylePopKind = null;
  for (const c of siteStyles.querySelectorAll('[data-ss-pop]')) c.setAttribute('aria-expanded', 'false');
}
function renderStylePopover() {
  stylePop.innerHTML = stylePopoverHtml(stylePopKind, model.siteStyles);
}
function openStylePopover(kind) {
  const again = stylePopKind === kind;
  closeStylePopover();
  if (again) return;
  stylePopKind = kind;
  renderStylePopover();
  const card = siteStyles.querySelector(`[data-ss-pop="${kind}"]`);
  card.setAttribute('aria-expanded', 'true');
  const p = stylePopoverPosition(kind, card.getBoundingClientRect().top, frame.getBoundingClientRect().right, innerHeight);
  stylePop.style.left = `${p.left}px`; stylePop.style.top = `${p.top}px`; stylePop.style.height = `${p.height}px`;
  stylePop.hidden = false;
}
stylePop.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-ss-pick]');
  if (!t || t.hasAttribute('data-unbuilt')) return;
  const before = JSON.stringify(model);
  const kind = t.dataset.ssPick;
  const top = stylePop.scrollTop;
  model.siteStyles = kind === 'theme' ? { theme: t.dataset.v } : { ...(model.siteStyles || {}), [kind]: t.dataset.v };
  commit(before, `Site Styles: ${t.getAttribute('aria-label')}`);
  renderAll();
  fitHeader();
  stylePop.scrollTop = top;
});
// A change to the styles, undo included, redraws the panel and an open popover.
onStylesApplied = () => {
  if (siteStyles.hidden) return;
  renderSsPanel();
  if (stylePopKind) renderStylePopover();
};

// The row handle (S4, parity/findings/S4.json): dragging it changes the section's row count by
// the drag distance over one row step (row plus gap), rounded, never below the lowest row the
// blocks need; one undo step per drag.
chrome.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.sc-rows');
  if (!h || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const sid = chromeSid();
  const s = S(sid);
  const fe = feEl(sid);
  if (!s || !fe) return;
  const before = JSON.stringify(model);
  const step = measure(fe).pitch;
  const start = s.rows[bp];
  const need = Math.max(1, ...s.blocks.map((b) => lay(b).area[2] - 1));
  const y0 = e.clientY;
  const move = (ev) => {
    const n = Math.max(need, start + Math.round((ev.clientY - y0) / step));
    if (n !== s.rows[bp]) { s.rows[bp] = n; renderSectionDom(sid); placeChrome(); }
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    commit(before, `Rows of ${sid}: ${s.rows[bp]}`);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

const styleMenu = $('button-style-menu');
styleMenu.addEventListener('mousedown', (e) => e.preventDefault());
styleMenu.addEventListener('click', (e) => {
  const o = e.target.closest('[data-bstyle]');
  if (!o) return;
  const b = B(styleMenu.dataset.sid, styleMenu.dataset.bid);
  styleMenu.hidden = true;
  if (!b) return;
  const before = JSON.stringify(model);
  if (o.dataset.bstyle === 'primary') delete b.buttonStyle; else b.buttonStyle = o.dataset.bstyle;
  renderSectionDom(styleMenu.dataset.sid);
  commit(before, `Button style ${o.dataset.bstyle}`);
});

const pinPop = $('pin-popover');
function openPin(sid, bid) {
  const b = B(sid, bid);
  pinPop.dataset.sid = sid; pinPop.dataset.bid = bid;
  pinPop.innerHTML = pinPopoverHtml(b.layout.desktop.sticky);
  const btn = document.querySelector('#block-toolbar [data-tb="pin"]');
  const st = stage.getBoundingClientRect();
  if (btn) { const r = btn.getBoundingClientRect(); pinPop.style.left = `${Math.max(8, r.left + r.width / 2 - 124 - st.left)}px`; pinPop.style.top = `${r.bottom + 7 - st.top}px`; }
  pinPop.hidden = false;
}
function setPin(change, label) {
  const b = B(pinPop.dataset.sid, pinPop.dataset.bid);
  if (!b) return;
  const before = JSON.stringify(model);
  change(b.layout.desktop);
  renderSectionDom(pinPop.dataset.sid);
  commit(before, label);
  openPin(pinPop.dataset.sid, pinPop.dataset.bid);
}
pinPop.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
pinPop.addEventListener('click', (e) => {
  const o = e.target.closest('[data-pin]');
  if (!o) return;
  const k = o.dataset.pin;
  setPin((L) => { if (k === 'remove') delete L.sticky; else L.sticky = { anchor: k, offset: L.sticky?.offset || 0 }; }, k === 'remove' ? 'Removed the pin' : `Pinned to ${k}`);
});
pinPop.addEventListener('change', (e) => {
  const f = e.target.closest('[data-pin-offset], [data-pin-range]');
  if (!f) return;
  const v = Math.max(0, Math.min(500, parseFloat(f.value) || 0));
  setPin((L) => { if (L.sticky) L.sticky = { ...L.sticky, offset: v }; }, `Pin offset ${v}px`);
});
pinPop.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-pin-offset]')) e.target.dispatchEvent(new Event('change', { bubbles: true })); if (e.key === 'Escape') pinPop.hidden = true; });

// Add a Section (U10): the panel remembers where the new section goes.
const addSectionPanel = $('add-section-panel');
let addSectionAt = null;
let addSectionCat = 'Intro';
// Save Section keeps a copy of the section in this browser; Saved in Add a Section lists them
// (U10). What the oracle's Save Section stores was not measured: it writes outside the page.
const SAVED_KEY = 'fe-saved-sections';
function savedSections() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
function writeSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); return true; } catch { return false; } }
function saveSection(sid) {
  const s = S(sid);
  const text = s.blocks.map((b) => b.html || '').join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const name = text ? text.split(' ').slice(0, 5).join(' ') : 'Blank section';
  note(writeSaved([...savedSections(), { id: newId(), name, section: JSON.parse(JSON.stringify(s)) }]) ? `Saved section: ${name}` : 'This browser has no room to save the section');
  updateUi();
}
function renderAddSection() {
  const nav = addSectionPanel.querySelector('.as-nav');
  const top = nav ? nav.scrollTop : 0;
  addSectionPanel.innerHTML = addSectionPanelHtml(addSectionCat, savedSections());
  addSectionPanel.querySelector('.as-nav').scrollTop = top;
}
function openAddSection(sid, below) {
  closeFloating(); closeSectionPanel();
  addSectionAt = { sid, below };
  addSectionCat = 'Intro';
  addSectionPanel.innerHTML = '';
  renderAddSection();
  addSectionPanel.hidden = false;
  addSectionPanel.querySelector('.as-close').focus();
}
function closeAddSection() { addSectionPanel.hidden = true; addSectionAt = null; }
addSectionPanel.addEventListener('click', (e) => {
  if (e.target === addSectionPanel) { closeAddSection(); return; }
  const a = e.target.closest('[data-as], [data-as-cat], [data-as-saved], [data-as-unsave], .as-item, .as-classic');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.as === 'close') { closeAddSection(); return; }
  if (a.dataset.asCat) { addSectionCat = a.dataset.asCat; renderAddSection(); return; }
  if (a.dataset.asUnsave) { writeSaved(savedSections().filter((x) => x.id !== a.dataset.asUnsave)); renderAddSection(); return; }
  const insert = (s, label) => {
    const before = JSON.stringify(model);
    const i = model.sections.findIndex((x) => x.id === addSectionAt.sid);
    model.sections.splice(i < 0 ? model.sections.length : i + (addSectionAt.below ? 1 : 0), 0, s);
    closeAddSection();
    commit(before, label);
    renderAll();
    feEl(s.id)?.closest('section')?.scrollIntoView({ block: 'center' });
  };
  if (a.dataset.as === 'blank' && addSectionAt) insert(blankSection(newId()), 'Added a blank section');
  const saved = a.dataset.asSaved && savedSections().find((x) => x.id === a.dataset.asSaved);
  if (saved && addSectionAt) {
    const s = JSON.parse(JSON.stringify(saved.section));
    s.id = newId();
    for (const b of s.blocks) b.id = `yui_copy_${newId()}`;
    insert(s, 'Added a saved section');
  }
});
addSectionPanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeAddSection(); } });

function closeFloating() { $('button-style-menu').hidden = true; $('pin-popover').hidden = true; addMenu.hidden = true; layersPanel.hidden = true; contextMenu.hidden = true; $('arrange-menu').hidden = true; $('link-popover').hidden = true; }
addMenu.addEventListener('input', (e) => {
  if (!e.target.matches('[data-am="search"]')) return;
  const q = e.target.value;
  addMenu.innerHTML = addBlockMenuHtml(ADD_TYPES, q);
  const input = addMenu.querySelector('input'); input.focus(); input.setSelectionRange(q.length, q.length);
});
// A text block is named by its text, cut by CSS (the oracle row label holds at least the
// first 48 characters, gap review 2026-11-04).
function layerRows(s) {
  return [...s.blocks].sort((a, b) => lay(b).z - lay(a).z).map((b) => ({ id: b.id, type: b.type[0].toUpperCase() + b.type.slice(1), on: sel?.bid === b.id, hidden: !!lay(b).hidden,
    label: b.type === 'text' ? (b.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Text' : b.type[0].toUpperCase() + b.type.slice(1) }));
}
function renderLayersPanel() {
  const s = S(layersPanel.dataset.sid);
  if (!s) { layersPanel.hidden = true; return; }
  layersPanel.innerHTML = layersPanelHtml(layerRows(s));
}
layersPanel.addEventListener('click', (e) => {
  if (rowDragged) return;
  const eye = e.target.closest('[data-unhide]');
  if (eye) { e.stopPropagation(); unhideBlock(layersPanel.dataset.sid, eye.dataset.unhide); return; }
  const li = e.target.closest('li[data-layer]');
  if (li && B(layersPanel.dataset.sid, li.dataset.layer) && lay(B(layersPanel.dataset.sid, li.dataset.layer)).hidden) return;
  if (li) { select({ sid: layersPanel.dataset.sid, bid: li.dataset.layer }); renderLayersPanel(); }
});
// Dragging a row (Z3, parity/findings/LAYERS.json): it follows the pointer over a blue slot, the other
// rows make way when its edge crosses their center, and the drop numbers the blocks 1 to n, the front
// row highest. One undo step.
let rowDragged = false; // the click that ends a drag selects nothing
layersPanel.addEventListener('pointerdown', (e) => {
  rowDragged = false;
  const li = e.target.closest('li[data-layer]');
  if (!li || e.button !== 0 || e.target.closest('[data-unhide]')) return;
  const sid = layersPanel.dataset.sid;
  const list = li.parentElement;
  const rows = [...list.children];
  const from = rows.indexOf(li);
  const box = li.getBoundingClientRect();
  const pitch = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : box.height;
  const y0 = e.clientY;
  let ghost = null;
  const move = (ev) => {
    const d = ev.clientY - y0;
    if (!ghost && Math.abs(d) < 4) return;
    if (!ghost) {
      ghost = li.cloneNode(true);
      ghost.classList.add('lp-ghost');
      Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px` });
      document.body.append(ghost);
      li.classList.add('is-slot');
    }
    ghost.style.transform = `translateY(${d}px)`;
    const passed = Math.floor((Math.abs(d) + box.height / 2) / pitch);
    const to = Math.max(0, Math.min(rows.length - 1, from + Math.sign(d) * passed));
    const others = rows.filter((r) => r !== li);
    list.insertBefore(li, others[to] || null);
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    if (!ghost) return;
    ghost.remove();
    li.classList.remove('is-slot');
    rowDragged = true;
    const before = JSON.stringify(model);
    const order = [...list.children].map((r) => r.dataset.layer);
    order.forEach((id, k) => { lay(B(sid, id)).z = order.length - k; });
    const moved = list.children[from] !== li;
    if (moved) { renderSectionDom(sid); commit(before, 'Reordered layers'); }
    else model = JSON.parse(before);
    renderLayersPanel();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
});
function onContextMenu(e) {
  if (document.body.classList.contains('is-preview')) return;
  const blk = e.target.closest('.fe-block');
  if (!blk || gesture) return;
  e.preventDefault();
  const sid = blk.closest('section').dataset.sectionId;
  if (sel?.bid !== blk.dataset.blockId) select({ sid, bid: blk.dataset.blockId });
  closeFloating();
  contextMenu.innerHTML = contextMenuHtml({ canPaste: !!blockClip });
  const fr = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
  contextMenu.style.left = `${Math.min(fr.left - st.left + e.clientX, st.width - 180)}px`;
  contextMenu.style.top = `${Math.min(fr.top - st.top + e.clientY, st.height - 400)}px`;
  contextMenu.hidden = false;
}
contextMenu.addEventListener('mousedown', (e) => e.preventDefault());
contextMenu.addEventListener('click', (e) => {
  const it = e.target.closest('button[data-cm]');
  if (!it || it.disabled || !sel) return;
  const act = it.dataset.cm;
  if (act === 'arrange') { openArrange(it, arrangeMenuHtml()); return; }
  if (act === 'copy-props') { openArrange(it, copyPropsMenuHtml()); return; }
  if (act === 'paste-props') { openArrange(it, pastePropsMenuHtml({ canPaste: !!transformClip })); return; }
  contextMenu.hidden = true; arrangeMenu.hidden = true;
  if (it.hasAttribute('data-unbuilt')) { note(`${it.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  if (act === 'copy') { copyBlocks(); return; }
  const before = JSON.stringify(model);
  const sid = sel.sid;
  if (act === 'paste') pasteBlocks(sid);
  if (act === 'duplicate') duplicateBlock(sid, sel.bid);
  if (act === 'delete') { const ids = [sel.bid, ...(sel.more || [])]; S(sid).blocks = S(sid).blocks.filter((b) => !ids.includes(b.id)); sel = null; }
  if (act === 'stack') stackBlocks();
  if (act.startsWith('z-')) arrange(sid, sel.bid, act.slice(2));
  if (act === 'hide-desktop' || act === 'hide-mobile') hideBlocks(sid, [sel.bid, ...(sel.more || [])], act === 'hide-desktop' ? 'desktop' : 'mobile');
  renderSectionDom(sid);
  commit(before, `${it.getAttribute('aria-label')} from the block menu`);
});

// Hide on a layout (L5, UNBUILT.json): the block leaves that layout and the selection. Hiding on
// mobile shrinks the phone rows to what the visible blocks need (the oracle went from 10 to 4 on
// demo section 2); desktop rows stay (11 stayed 11).
function hideBlocks(sid, ids, which) {
  const s = S(sid);
  for (const b of s.blocks) if (ids.includes(b.id)) b.layout[which].hidden = true;
  if (which === 'mobile') s.rows.mobile = Math.max(1, ...s.blocks.filter((b) => !b.layout.mobile.hidden).map((b) => b.layout.mobile.area[2] - 1));
  sel = null;
}
function unhideBlock(sid, id) {
  const b = B(sid, id);
  if (!b || !lay(b).hidden) return;
  const before = JSON.stringify(model);
  delete lay(b).hidden;
  growRows(S(sid));
  renderSectionDom(sid);
  commit(before, `Showed ${id} on ${bp}`);
  renderLayersPanel();
}

// Arrange (ARRANGE.json): to front or back, or forward or backward past every block it
// overlaps on that side; then the section's blocks are numbered 1 to n in that order (the oracle renumbered
// 1, 2, 3 after each move).
function overlaps(a, b) { return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; }
function arrange(sid, bid, how) {
  const s = S(sid), b = B(sid, bid);
  const order = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z).filter((x) => x !== b);
  let at;
  const mine = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z).indexOf(b);
  if (how === 'front') at = order.length;
  else if (how === 'back') at = 0;
  else {
    const all = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z);
    // Past every block it overlaps in that direction: the heading overlapping the paragraph (2)
    // and the shape (3) went to 3 on the oracle.
    const range = how === 'forward' ? all.slice(mine + 1).reverse() : all.slice(0, mine);
    const hit = range.find((o) => overlaps(lay(o).area, lay(b).area));
    if (!hit) return;
    const k = order.indexOf(hit);
    at = how === 'forward' ? k + 1 : k;
  }
  order.splice(at, 0, b);
  order.forEach((x, n) => { lay(x).z = n + 1; });
}
const arrangeMenu = $('arrange-menu');
function openArrange(item, html) {
  arrangeMenu.innerHTML = html;
  arrangeMenu.setAttribute('aria-label', item.getAttribute('aria-label'));
  const r = item.getBoundingClientRect(), st = stage.getBoundingClientRect();
  arrangeMenu.style.left = `${r.right - st.left + 4}px`;
  arrangeMenu.style.top = `${r.top - st.top - 6}px`;
  arrangeMenu.hidden = false;
}
arrangeMenu.addEventListener('mousedown', (e) => e.preventDefault());
arrangeMenu.addEventListener('click', (e) => {
  const it = e.target.closest('button[data-cm]');
  if (!it || it.disabled || !sel) return;
  arrangeMenu.hidden = true; contextMenu.hidden = true;
  const act = it.dataset.cm;
  if (it.hasAttribute('data-unbuilt')) { note(`${it.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  if (act === 'pcopy-transforms') { copyTransforms(); return; }
  const before = JSON.stringify(model);
  if (act === 'ppaste-transforms') pasteTransforms(sel.sid, [sel.bid, ...(sel.more || [])]);
  else arrange(sel.sid, sel.bid, act.slice(2));
  renderSectionDom(sel.sid);
  commit(before, `${it.getAttribute('aria-label')} from the block menu`);
});

function onHover(e) {
  if (document.body.classList.contains('is-preview')) return;
  if (gesture && gesture.type !== 'pending') return;
  const secEl = e.target.closest?.('section.page-section[data-section-id]');
  const sid = secEl && model.sections.some((x) => x.id === secEl.dataset.sectionId) ? secEl.dataset.sectionId : null;
  if (sid && sid !== hoverSid) { hoverSid = sid; placeChrome(); }
}

// ---------- top bar ----------
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('save').addEventListener('click', () => {
  if (persist()) {
    savedJson = JSON.stringify(model);
    note('Saved to this browser');
  } else {
    note('Save failed: storage is blocked');
  }
  updateUi();
});
// Exit (Y3, parity/findings/EXIT.json): with unsaved changes the oracle asks "Exit Without
// Saving?" with Save and Exit and no Cancel; Escape closes the question and keeps editing.
// Exit discards the changes. Ours then opens the published page with the saved model.
const leave = () => { location.href = 'page.html?saved'; };
$('exit').addEventListener('click', () => {
  if (editing) finishTextEdit();
  if (JSON.stringify(model) === savedJson) return leave();
  $('exit-dialog').hidden = false;
});
$('exit-save').addEventListener('click', () => { $('exit-dialog').hidden = true; $('save').click(); if (JSON.stringify(model) === savedJson) leave(); });
$('exit-discard').addEventListener('click', () => { model = JSON.parse(savedJson); leave(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('exit-dialog').hidden) { e.preventDefault(); $('exit-dialog').hidden = true; } }, true);
$('reset').addEventListener('click', () => {
  const before = JSON.stringify(model);
  model = demoModel();
  sel = null;
  renderAll();
  commit(before, 'Reset to the demo page');
});
$('export').addEventListener('click', async () => {
  const css = await (await fetch('src/site.css')).text();
  const blob = new Blob([exportHtml(model, css)], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fluid-demo.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  note('Exported fluid-demo.html');
  updateUi();
});

function setBp(next) {
  if (next === bp) return;
  if (editing) finishTextEdit();
  if (gesture) cancelGesture();
  bp = next;
  $('bp-desktop').classList.toggle('is-on', bp === 'desktop');
  $('bp-mobile').classList.toggle('is-on', bp === 'mobile');
  $('bp-desktop').setAttribute('aria-checked', String(bp === 'desktop'));
  $('bp-mobile').setAttribute('aria-checked', String(bp === 'mobile'));
  stage.classList.toggle('is-mobile', bp === 'mobile');
  // Phones use overlay scrollbars, so the preview must not lose width to one.
  doc.documentElement.style.scrollbarWidth = bp === 'mobile' ? 'none' : '';
  requestAnimationFrame(() => {
    drawSelection();
    updateUi();
  });
}
// Preview (oracle "Toggle preview mode"): the page without editor chrome; Escape or the
// button again leaves it. Our developer tools sit behind the menu next to it.
// Reload page preview (TOPBAR.json): ours draws the canvas again from the model.
document.getElementById('reload-preview').addEventListener('click', () => { renderAll(); });
// Ctrl+Shift+D shows our developer menu, which stays out of the bar otherwise.
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); document.body.classList.toggle('dev-tools'); } });

function setPreview(on) {
  document.body.classList.toggle('is-preview', on);
  doc?.body.classList.toggle('is-preview', on);
  $('preview').setAttribute('aria-pressed', String(on));
  $('page-state').textContent = on ? 'Previewing' : 'Page · Published';
  if (on) { closeFloating(); closeSectionPanel(); designOpen = null; if (editing) finishTextEdit(); select(null); }
}
$('preview').addEventListener('click', () => setPreview(!document.body.classList.contains('is-preview')));
$('dev-toggle').addEventListener('click', () => { $('dev-pop').hidden = !$('dev-pop').hidden; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('is-preview')) setPreview(false); });
$('bp-desktop').addEventListener('click', () => setBp('desktop'));
$('bp-mobile').addEventListener('click', () => setBp('mobile'));
document.addEventListener('keydown', onKey);

// ---------- boot ----------
function boot() {
  frame.contentWindow.addEventListener('scroll', () => { placeToolbar(); placeChrome(); placeBlockPanel(); placePhoneLines(); if (editing) renderTextBar(); }, { passive: true });
  // The canvas changes width when the layout switches; place the overlays again once it has.
  // Watch the canvas page itself: it reflows after the canvas element changes width.
  new frame.contentWindow.ResizeObserver(() => { placeToolbar(); placeChrome(); placeBlockPanel(); placePhoneLines(); }).observe(frame.contentDocument.body);
  window.addEventListener('resize', () => { placeToolbar(); placeChrome(); });
  frame.contentDocument.addEventListener('pointermove', onHover);
  frame.contentDocument.addEventListener('pointerdown', () => { closeFloating(); closeSectionPanel(); }, true);
  frame.contentDocument.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeFloating(); closeSectionPanel(); if (designOpen) { designOpen = null; updateUi(); } } });
  frame.contentDocument.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeFloating(); closeSectionPanel(); } });
  doc = frame.contentDocument;
  win = frame.contentWindow;
  doc.addEventListener('pointerdown', onDown);
  doc.addEventListener('pointermove', onMove);
  doc.addEventListener('pointerup', onUp);
  doc.addEventListener('pointercancel', onCancel);
  doc.addEventListener('lostpointercapture', (e) => {
    if (gesture && gesture.type !== 'pending' && e.pointerId === gesture.pointerId) onUp(e);
  });
  doc.addEventListener('dblclick', onDblClick);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('click', (e) => {
    if (e.target.closest('a')) e.preventDefault();
  });
  renderAll();
  // Expose state for automated checks (cmux / Playwright).
  // Replay mode (?replay) always hides the inspector so the canvas width matches the oracle frame.
  if (new URLSearchParams(location.search).has('replay')) document.body.classList.add('is-replay');
  // The inspector side panel: off by default, remembered per browser (developer menu).
  const insp = $('inspector-toggle');
  const setInspector = (on) => { document.body.classList.toggle('show-inspector', on); insp.setAttribute('aria-pressed', String(on)); insp.textContent = on ? 'Hide inspector' : 'Show inspector'; try { localStorage.setItem('fe-inspector', on ? '1' : ''); } catch {} placeChrome?.(); };
  let inspOn = false; try { inspOn = localStorage.getItem('fe-inspector') === '1'; } catch {}
  setInspector(inspOn);
  insp.addEventListener('click', () => setInspector(!document.body.classList.contains('show-inspector')));
  window.fe = {
    get model() { return model; },
    get bp() { return bp; },
    get gesture() { return gesture; },
    get canUndo() { return undoStack.length > 0; },
    load(next) {
      model = JSON.parse(JSON.stringify(next));
      undoStack.length = 0;
      redoStack.length = 0;
      sel = null;
      renderAll();
      return true;
    },
    setBp,
    undo,
    normalize,
    measure: (sid) => measure(feEl(sid)),
    select: (sid, bid) => { select({ sid, bid }); return true; },
    edit: (sid, bid) => { startTextEdit(sid, bid); return !!editing; },
    finishEdit: () => { finishTextEdit(); return true; },
  };
}

if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.getElementById('page')) boot();
else frame.addEventListener('load', boot, { once: true });
