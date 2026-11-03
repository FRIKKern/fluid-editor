// Editor shell. The page renders inside an iframe (like #sqs-site-frame), so
// media queries see the preview width. All gestures write to the model only
// on commit; during a gesture we change inline styles and editor layers.
import { renderPage, renderSection, exportHtml, LAST_LINE, COLS } from './render.js';
import * as fmt from './text-format.js';
import { cleanPaste, insertPaste } from './paste.js';
import { demoModel } from './demo.js';

const KEY = 'fluid-editor:model:v2';
const $ = (id) => document.getElementById(id);
const frame = $('site-frame');
const panel = $('panel');
const stage = $('stage');

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

function renderAll() {
  dropMissingSelection();
  doc.getElementById('page').innerHTML = renderPage(model);
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
  }
}

function drawSelection() {
  for (const el of doc.querySelectorAll('.fe-indicator')) el.remove();
  for (const el of doc.querySelectorAll('.fe-block[data-is-selected="true"]')) el.dataset.isSelected = 'false';
  if (!sel || gesture?.type === 'move') return;
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
}

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
  const c = blockEl(b.id)?.querySelector('.sqs-block-content');
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
function flagNeighbours(g, t) {
  const s = S(g.sid);
  for (const o of s.blocks) {
    const el = blockEl(o.id);
    if (!el) continue;
    const a = lay(o).area;
    const mine = o.id === g.bid;
    const gapC = Math.max(a[1] - t[3], t[1] - a[3], 0);
    const gapR = Math.max(a[0] - t[2], t[0] - a[2], 0);
    el.dataset.isNearDraggedBlock = String(mine || (gapC <= 2 && gapR <= 2));
    el.dataset.isMatchingWidth = String(!mine && g.type === 'resize' && a[3] - a[1] === t[3] - t[1]);
    el.dataset.isMatchingHeight = String(!mine && g.type === 'resize' && a[2] - a[0] === t[2] - t[0]);
  }
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
    win.setTimeout(tick, SCROLL_EVERY);
  };
  win.setTimeout(tick, SCROLL_EVERY);
}

function showGrid(sid, rowCount) {
  const fe = feEl(sid);
  fe.dataset.gridIsVisible = 'true';
  for (const el of fe.querySelectorAll('.fe-grid-row')) el.remove();
  const frag = doc.createDocumentFragment();
  for (let r = 1; r <= rowCount; r++) {
    const row = doc.createElement('div');
    row.className = 'fe-grid-row';
    row.style.gridArea = `${r} / 2 / ${r + 1} / ${LAST_LINE[bp] - 1}`;
    for (let c = 0; c < COLS[bp]; c++) {
      const cell = doc.createElement('div');
      cell.className = 'fe-grid-cell';
      row.append(cell);
    }
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
function onDown(e) {
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
    select(null);
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
  if (gesture.type === 'move' || gesture.type === 'resize') autoScroll(gesture);
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
  return g;
}

function beginMove(e) {
  const g = prepare(e, 'move');
  const b = B(g.sid, g.bid);
  drawSelection();
  g.tind = layer(feEl(g.sid), 'fe-transform-indicator', g.orig);
  g.more = (sel?.more || []).map((id) => ({ id, orig: [...lay(B(g.sid, id)).area] }));
  const el = blockEl(g.bid);
  el.classList.add('is-dragging');
  g.z = lay(b).z;
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
  const t = [nr0, nc0, nr0 + h, nc0 + w];
  // Other selected blocks move by the same number of rows and columns.
  for (const o of g.more || []) {
    const dr = nr0 - r0, dc = nc0 - c0;
    o.target = [o.orig[0] + dr, o.orig[1] + dc, o.orig[2] + dr, o.orig[3] + dc];
    const el2 = blockEl(o.id);
    if (el2) el2.style.transform = blockEl(g.bid).style.transform;
  }
  if (!same(t, g.target)) {
    g.target = t;
    setArea(g.tind, t);
    flagNeighbours(g, t);
    if (t[2] - 1 > g.shownRows) showGrid(g.sid, t[2] - 1);
  }
}

function startResize(e, dir) {
  const g = prepare(e, 'resize', { dir });
  g.ind = feEl(g.sid).querySelector('.fe-indicator');
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
  flagNeighbours(g, t);
  const ind = fe.querySelector('.fe-indicator');
  if (ind) setArea(ind, t);
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
  for (const el of fe.querySelectorAll('.fe-grid-row, .fe-original-position, .fe-transform-indicator')) el.remove();
  for (const o of g.more || []) { const el2 = blockEl(o.id); if (el2) el2.style.transform = ''; }
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
    }
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
  renderPanel();
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

// The text toolbar (E4, parity/findings/TEXTOPS.json), in the oracle's order: Text Style,
// Bold, Italic, Quote, Bullet List, Numbered List, Strike, Outdent, Indent, Text Alignment,
// Clear Formatting. Not built: Squarespace AI, Text Color, Scaled Text, Text Highlight, Link.
const TEXT_ACTIONS = [['bold', 'Bold'], ['italic', 'Italic'], ['quote', 'Quote'], ['bullet', 'Bullet List'], ['numbered', 'Numbered List'], ['strike', 'Strike'],
  ['outdent', 'Outdent'], ['indent', 'Indent'], ['align:left', 'Align left'], ['align:center', 'Align center'], ['align:right', 'Align right'], ['align:justify', 'Align justify'], ['clear', 'Clear Formatting']];
function textGroup() {
  const cur = fmt.currentStyle(editing.ce, win.getSelection());
  return `<div class="group" data-group="text"><h3>Text</h3>
    <label>Text Style <select data-fmt="style">${fmt.STYLES.map(([l, v]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="row">${TEXT_ACTIONS.map(([a, l]) => `<button class="btn" data-fmt="${a}" aria-label="${l}">${l}</button>`).join('')}</div></div>`;
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
  ed.ce.focus();
  onTextInput();
}
// Buttons keep the text selection: no focus change on mousedown.
panel.addEventListener('mousedown', (e) => { if (e.target.closest('button[data-fmt]')) e.preventDefault(); });
panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-fmt]');
  if (!btn || !editing) return;
  e.stopImmediatePropagation();
  applyFormat(btn.dataset.fmt);
}, true);
panel.addEventListener('change', (e) => {
  const el = e.target.closest('select[data-fmt="style"]');
  if (!el || !editing) return;
  e.stopImmediatePropagation();
  applyFormat('style', el.value);
}, true);

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

function finishTextEdit() {
  const ed = editing;
  if (!ed) return;
  editing = null;
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
  $('page-state').textContent = 'Page · Published';
  renderPanel();
}

function renderPanel() {
  if (!doc) return;
  const parts = [];
  if (sel) {
    const s = S(sel.sid);
    const b = B(sel.sid, sel.bid);
    const L = lay(b);
    const [r0, c0, r1, c1] = L.area;
    parts.push(`<div class="group"><h3>Block</h3><dl>
      <dt>Id</dt><dd>${b.id}</dd>
      <dt>Type</dt><dd>${b.type}</dd>
      <dt>Layout</dt><dd>${bp}</dd>
      <dt>grid-area</dt><dd>${L.area.join(' / ')}</dd>
      <dt>Size</dt><dd>${c1 - c0} cols, ${r1 - r0} rows</dd>
      <dt>z-index</dt><dd>${L.z}</dd>
    </dl>
    <div class="row">${bp === 'mobile' ? '<button class="btn" data-act="up">Move Up</button><button class="btn" data-act="down">Move Down</button>' : '<button class="btn" data-act="z+">Move Forward</button><button class="btn" data-act="z-">Move Backward</button>'}</div>
    <div class="row">${['flex-start', 'center', 'flex-end'].map((v) => `<button class="btn" data-act="justify" data-v="${v}" ${L.justify === v ? 'disabled' : ''}>${{ 'flex-start': 'Top', center: 'Middle', 'flex-end': 'Bottom' }[v]}</button>`).join('')}</div>
    </div>`);
    if (sel.more?.length) parts.push(`<div class="group"><h3>Align group</h3><div class="row">${ALIGNS.map(([k, label]) => `<button class="btn" data-act="align" data-v="${k}">${label}</button>`).join('')}</div><div class="row"><button class="btn" data-act="stack">Stack blocks</button></div></div>`);
    if (editing) parts.push(textGroup());
    parts.push(sectionGroup(s));
    parts.push(`<div class="group"><h3>Add block</h3><div class="row">${ADD_TYPES.map(([n]) => `<button class="btn" data-act="add" data-v="${n}">${n}</button>`).join('')}</div></div>`);
    parts.push(layersGroup(s));
  } else {
    parts.push(`<div class="group"><h3>Page</h3><p class="hint">Click a block to select it. Drag to move. Pull a handle to resize. Double-click text to edit. Arrow keys move one cell. Esc cancels, Cmd+Z undoes.</p></div>`);
  }
  parts.push(`<div class="group"><h3>Activity</h3><pre class="log">${notes.join('\n') || 'Nothing yet'}</pre></div>`);
  panel.innerHTML = parts.join('');
}

// Add Block (U5, T13): each type lands at the top left of the section with the size
// the oracle gives it (parity/findings/T13.json). The phone placement is ours: the
// bottom of the phone stack, full content width (not measured yet).
const ADD_TYPES = [
  ['Text', 8, 2, () => ({ type: 'text', html: '<p data-rte-preserve-empty="true"></p>' })],
  ['Image', 6, 6, () => ({ type: 'image', alt: '' })],
  ['Button', 6, 2, () => ({ type: 'button', label: 'Learn more', href: '#' })],
  ['Video', 8, 8, () => ({ type: 'video' })],
  ['Form', 9, 16, () => ({ type: 'shape', fill: '#d9d4ca', radius: '0', label: 'form' })],
  ['Accordion', 8, 8, () => ({ type: 'shape', fill: '#d9d4ca', radius: '0', label: 'accordion' })],
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

// Align Group, as on the oracle (traces T0018, T0019): blocks line up on the group's
// bounding box; centers round to the nearest line.
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

const ALIGNS = [['left', 'Left'], ['hcenter', 'Center'], ['right', 'Right'], ['top', 'Top'], ['vcenter', 'Middle'], ['bottom', 'Bottom']];
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
function layersGroup(s) {
  const rows = [...s.blocks].sort((a, b) => lay(b).z - lay(a).z).map((b) => {
    const label = b.type === 'text' ? (b.html || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 28) || 'Text' : b.type[0].toUpperCase() + b.type.slice(1);
    return `<li class="layer${sel?.bid === b.id ? ' is-on' : ''}" draggable="true" data-layer="${b.id}">${label.replace(/</g, '&lt;')}</li>`;
  });
  return `<div class="group"><h3>Layers</h3><ol class="layers">${rows.join('')}</ol></div>`;
}

let dragLayer = null;
panel.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-layer]');
  if (li && sel) select({ sid: sel.sid, bid: li.dataset.layer });
});
panel.addEventListener('dragstart', (e) => {
  const li = e.target.closest('li[data-layer]');
  if (li) dragLayer = li.dataset.layer;
});
panel.addEventListener('dragover', (e) => {
  if (dragLayer && e.target.closest('li[data-layer]')) e.preventDefault();
});
panel.addEventListener('drop', (e) => {
  const li = e.target.closest('li[data-layer]');
  if (!li || !dragLayer || !sel) return;
  e.preventDefault();
  const before = JSON.stringify(model);
  const s = S(sel.sid);
  const order = [...s.blocks].sort((a, b) => lay(b).z - lay(a).z).map((b) => b.id).filter((id) => id !== dragLayer);
  order.splice(order.indexOf(li.dataset.layer), 0, dragLayer);
  // Keep the section's set of z values; hand them out in the new front-to-back order.
  const zs = s.blocks.map((b) => lay(b).z).sort((a, b) => b - a);
  order.forEach((id, k) => { lay(B(sel.sid, id)).z = zs[k]; });
  dragLayer = null;
  renderSectionDom(sel.sid);
  commit(before, 'Reordered layers');
});

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
function sectionGroup(s) {
  const fe = feEl(s.id);
  const m = measure(fe);
  const minRows = Math.max(1, ...s.blocks.map((b) => b.layout[bp].area[2] - 1));
  const stretched = m.rows.filter((h) => h > m.rowMin + 0.5).length;
  const opt = (act, v, label, on) => `<button class="btn${on ? ' is-on' : ''}" data-sact="${act}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  const tabs = `<div class="row" role="tablist">${['Design', 'Background', 'Colors'].map((t) => `<button class="btn${t === sectionTab ? ' is-on' : ''}" role="tab" aria-selected="${t === sectionTab}" data-sact="tab" data-v="${t}">${t}</button>`).join('')}</div>`;
  let body = '';
  if (sectionTab === 'Design') {
    const gk = gapKind(s);
    body = `<label>Row Count <input type="number" data-act="rows" min="${minRows}" max="10000" value="${s.rows[bp]}"></label>
    <div class="row">Gap ${opt('gap', 'zero', 'Zero', gk === 'zero')}${opt('gap', 'medium', 'Medium', gk === 'medium')}${opt('gap', 'custom', 'Custom', gk === 'custom')}</div>
    ${gk === 'custom' ? `<label>Column gap <input type="range" data-act="gap" min="0" max="50" value="${s.gap}"> ${s.gap}px</label><label>Row gap <input type="range" data-act="rowGap" min="0" max="50" value="${s.rowGap ?? s.gap}"> ${s.rowGap ?? s.gap}px</label>` : ''}
    <label><input type="checkbox" data-act="fill" ${fillScreen(s) ? 'checked' : ''}> Fill Screen</label>
    ${fillScreen(s) ? `<div class="row">Height ${[['small', 'S'], ['medium', 'M'], ['large', 'L'], ['custom', 'Custom']].map(([v, l]) => opt('height', v, l, s.height === v)).join('')}</div>
    ${s.height === 'custom' ? `<label>Custom height <input type="number" data-act="customHeight" min="1" max="100" value="${s.customHeight}"> vh</label>` : ''}
    <div class="row">Alignment ${[['top', 'Top'], ['middle', 'Center'], ['bottom', 'Bottom']].map(([v, l]) => opt('valign', v, l, (s.valign || 'middle') === v)).join('')}</div>` : ''}
    <label><input type="checkbox" data-act="divider" ${s.divider ? 'checked' : ''}> Divider</label>
    ${s.divider ? `<div class="row">Stroke ${[['none', 'None'], ['solid', 'Solid'], ['dashed', 'Dashed']].map(([v, l]) => opt('dividerStroke', v, l, (s.dividerStroke || 'solid') === v)).join('')}</div>
    <div class="row">Thickness ${['S', 'M', 'L'].map((v) => opt('dividerThickness', v, v, (s.dividerThickness || 'M') === v)).join('')}</div>` : ''}`;
  } else if (sectionTab === 'Background') {
    body = `<div class="row">Background Width ${opt('bgWidth', 'full-bleed', 'Full Bleed', (s.bgWidth || 'full-bleed') === 'full-bleed')}${opt('bgWidth', 'inset', 'Inset', s.bgWidth === 'inset')}</div>`;
  } else {
    body = `<div class="row">${THEMES.map(([l, v]) => opt('theme', v, l, (s.theme || '').replace(/^theme-/, '') === v)).join('')}</div>`;
  }
  return `<div class="group" data-group="section"><h3>Edit Section</h3>${tabs}${body}<dl>
    <dt>Section</dt><dd>${s.id}</dd>
    <dt>Columns</dt><dd>${COLS[bp]} + 2 gutters</dd>
    <dt>Row min</dt><dd>${m.rowMin.toFixed(2)}px</dd>
    <dt>Stretched</dt><dd>${stretched} of ${m.rows.length} rows</dd>
  </dl></div>`;
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sact]');
  if (!btn || !sel) return;
  e.stopImmediatePropagation();
  const s = S(sel.sid);
  const { sact: act, v } = btn.dataset;
  if (act === 'tab') { sectionTab = v; customGap = false; renderPanel(); return; }
  if (act === 'gap' && v === 'custom') { customGap = true; renderPanel(); return; }
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
}, true);

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !sel) return;
  const before = JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  const L = lay(b);
  // Like the oracle's Move Forward / Move Backward (traces T0011, T0012): swap z-index
  // with the block next above or below in z order.
  if (btn.dataset.act === 'z+' || btn.dataset.act === 'z-') {
    const up = btn.dataset.act === 'z+';
    const others = S(sel.sid).blocks.filter((o) => o !== b).map((o) => lay(o));
    const next = others.filter((o) => (up ? o.z > L.z : o.z < L.z)).sort((x, y) => (up ? x.z - y.z : y.z - x.z))[0];
    if (next) [L.z, next.z] = [next.z, L.z];
  }
  if (btn.dataset.act === 'up' || btn.dataset.act === 'down') moveInStack(sel.sid, b, btn.dataset.act === 'up');
  if (btn.dataset.act === 'justify') L.justify = btn.dataset.v;
  if (btn.dataset.act === 'align') alignGroup(btn.dataset.v);
  if (btn.dataset.act === 'stack') stackBlocks();
  if (btn.dataset.act === 'add') addBlock(sel.sid, btn.dataset.v);
  renderSectionDom(sel.sid);
  commit(before, `${btn.textContent} on ${b.id}`);
});

panel.addEventListener('change', (e) => {
  const input = e.target.closest('input[data-act]');
  if (!input || !sel) return;
  const before = JSON.stringify(model);
  const s = S(sel.sid);
  const act = input.dataset.act;
  if (act === 'divider') {
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
});

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
  stage.classList.toggle('is-mobile', bp === 'mobile');
  // Phones use overlay scrollbars, so the preview must not lose width to one.
  doc.documentElement.style.scrollbarWidth = bp === 'mobile' ? 'none' : '';
  requestAnimationFrame(() => {
    drawSelection();
    updateUi();
  });
}
$('bp-desktop').addEventListener('click', () => setBp('desktop'));
$('bp-mobile').addEventListener('click', () => setBp('mobile'));
document.addEventListener('keydown', onKey);

// ---------- boot ----------
function boot() {
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
  // Replay mode (?replay) hides the panel so the canvas width matches the oracle frame.
  if (new URLSearchParams(location.search).has('replay')) document.body.classList.add('is-replay');
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
