// Editor shell. The page renders inside an iframe (like #sqs-site-frame), so
// media queries see the preview width. All gestures write to the model only
// on commit; during a gesture we change inline styles and editor layers.
import { renderPage, renderSection, exportHtml, LAST_LINE, COLS } from './render.js';
import { demoModel } from './demo.js';

const KEY = 'fluid-editor:model:v1';
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
function renderAll() {
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
  select({ sid, bid: blk.dataset.blockId });
  const r = blk.getBoundingClientRect();
  gesture = {
    type: 'pending', sid, bid: blk.dataset.blockId, pointerId: e.pointerId,
    x0: e.clientX, y0: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top,
    before: JSON.stringify(model),
  };
}

function onMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) < 4) return;
    beginMove(e);
  }
  if (gesture.type === 'move') updateMove(e);
  else if (gesture.type === 'resize') updateResize(e);
}

function onUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    gesture = null;
    return;
  }
  const g = gesture;
  const s = S(g.sid);
  const b = B(g.sid, g.bid);
  lay(b).area = g.target;
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
  const nr0 = Math.max(1, Math.round((y - top) / m.pitch) + 1);
  const t = [nr0, nc0, nr0 + h, nc0 + w];
  if (!same(t, g.target)) {
    g.target = t;
    setArea(g.tind, t);
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
  for (const el of fe.querySelectorAll('.fe-grid-row, .fe-original-position, .fe-transform-indicator')) el.remove();
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
  if (ARROWS[e.key] && sel && !gesture) {
    e.preventDefault();
    normalize(sel.sid);
    const before = JSON.stringify(model);
    const b = B(sel.sid, sel.bid);
    const [dr, dc] = ARROWS[e.key];
    const a = lay(b).area;
    const next = [a[0] + dr, a[1] + dc, a[2] + dr, a[3] + dc];
    if (next[0] >= 1 && next[1] >= 1 && next[3] <= LAST_LINE[bp]) {
      lay(b).area = next;
      growRows(S(sel.sid));
    }
    renderSectionDom(sel.sid);
    commit(before, `Keyboard moved ${sel.bid} to ${lay(b).area.join('/')}`);
  }
}

// ---------- text editing ----------
function onDblClick(e) {
  const blk = e.target.closest('.fe-block');
  if (!blk || editing) return;
  const sid = blk.closest('section').dataset.sectionId;
  const b = B(sid, blk.dataset.blockId);
  if (b.type !== 'text') return;
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
}

// When an edit makes the text taller, move the block's end row instead of
// letting the row stretch.
function onTextInput() {
  const ed = editing;
  const b = B(ed.sid, ed.bid);
  const need = contentRows(b, ed.m);
  if (ed.area[2] - ed.area[0] < need) {
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
  $('page-state').textContent = dirty ? 'Unsaved changes' : 'Saved';
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
    <div class="row"><button class="btn" data-act="z+">Bring forward</button><button class="btn" data-act="z-">Send backward</button></div>
    <div class="row">${['flex-start', 'center', 'flex-end'].map((v) => `<button class="btn" data-act="justify" data-v="${v}" ${L.justify === v ? 'disabled' : ''}>${{ 'flex-start': 'Top', center: 'Middle', 'flex-end': 'Bottom' }[v]}</button>`).join('')}</div>
    </div>`);
    parts.push(sectionGroup(s));
  } else {
    parts.push(`<div class="group"><h3>Page</h3><p class="hint">Click a block to select it. Drag to move. Pull a handle to resize. Double-click text to edit. Arrow keys move one cell. Esc cancels, Cmd+Z undoes.</p></div>`);
  }
  parts.push(`<div class="group"><h3>Activity</h3><pre class="log">${notes.join('\n') || 'Nothing yet'}</pre></div>`);
  panel.innerHTML = parts.join('');
}

function sectionGroup(s) {
  const fe = feEl(s.id);
  const m = measure(fe);
  const minRows = Math.max(1, ...s.blocks.map((b) => b.layout[bp].area[2] - 1));
  const stretched = m.rows.filter((h) => h > m.rowMin + 0.5).length;
  return `<div class="group"><h3>Section ${s.id}</h3><dl>
    <dt>Columns</dt><dd>${COLS[bp]} + 2 gutters</dd>
    <dt>Row min</dt><dd>${m.rowMin.toFixed(2)}px</dd>
    <dt>Stretched</dt><dd>${stretched} of ${m.rows.length} rows</dd>
  </dl>
  <label>Rows (${bp}) <input type="number" data-act="rows" min="${minRows}" value="${s.rows[bp]}"></label>
  <label>Spacing <input type="number" data-act="gap" min="0" max="40" value="${s.gap}"></label>
  </div>`;
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !sel) return;
  const before = JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  const L = lay(b);
  if (btn.dataset.act === 'z+') L.z += 1;
  if (btn.dataset.act === 'z-') L.z = Math.max(0, L.z - 1);
  if (btn.dataset.act === 'justify') L.justify = btn.dataset.v;
  renderSectionDom(sel.sid);
  commit(before, `${btn.textContent} on ${b.id}`);
});

panel.addEventListener('change', (e) => {
  const input = e.target.closest('input[data-act]');
  if (!input || !sel) return;
  const before = JSON.stringify(model);
  const s = S(sel.sid);
  const v = Math.round(Number(input.value));
  if (!Number.isFinite(v)) return;
  if (input.dataset.act === 'rows') {
    s.rows[bp] = Math.max(Number(input.min), v);
  }
  if (input.dataset.act === 'gap') s.gap = Math.min(40, Math.max(0, v));
  renderSectionDom(s.id);
  commit(before, `Section ${s.id} ${input.dataset.act} set to ${input.dataset.act === 'rows' ? s.rows[bp] : s.gap}`);
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
  };
}

if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.getElementById('page')) boot();
else frame.addEventListener('load', boot, { once: true });
