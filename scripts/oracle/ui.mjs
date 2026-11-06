// Acting on the Squarespace editor like a person: hover, click, paste, drag.
// Clicks that open menus are real clicks, from cmux or over CDP; drags and pastes are
// pointer and clipboard events inside the site frame. Used by M1 (O1) only.
import { browser, evalJs, pause } from '../lib/cmux.mjs';
import { pressOnTop } from './press.mjs';

export const SURFACE = process.env.ORACLE_SURFACE || 'surface:40';
const cmux = (...a) => browser(SURFACE, ...a);
const FRAME = `const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;`;

// Tag an element found by `find` (JS expression returning an element) and click it.
export async function click(find, { inFrame = false, wait = 1200 } = {}) {
  if (inFrame) cmux('frame', '#sqs-site-frame');
  try {
    const ok = evalJs(SURFACE, `(() => { const el = (${find})(); document.querySelectorAll('#fx-target').forEach((x) => x.removeAttribute('id')); if (!el) return JSON.stringify(false); { const q = el.getBoundingClientRect(); if (q.top < 0 || q.bottom > innerHeight) el.scrollIntoView({ block: 'center' }); } el.id = 'fx-target'; return JSON.stringify(true); })()`);
    if (ok !== true) throw new Error(`click: nothing found for ${find.slice(0, 120)}`);
    // A list may still be scrolling smoothly: a press now lands on its neighbour (OpenTable made a Bandsintown block).
    let was = null;
    for (let t = 0; t < 12; t++) { const now = evalJs(SURFACE, `(() => JSON.stringify(document.getElementById('fx-target').getBoundingClientRect().top))()`); if (now === was) break; was = now; await pause(150); }
    cmux('click', '#fx-target');
  } finally {
    if (inFrame) cmux('frame', 'main');
  }
  await pause(wait);
}

export async function hoverSection(i, top = 80) {
  cmux('frame', '#sqs-site-frame');
  try {
    // scrollIntoView does not move the editor frame; scrolling its window does. The page scrolls
    // smoothly, so a plain scrollTo is still moving when the next step reads a box.
    evalJs(SURFACE, `(() => { const s = document.querySelectorAll('main#page .page-section')[${i}]; document.querySelectorAll('#fx-hover').forEach((x) => x.removeAttribute('id')); scrollTo({ top: scrollY + s.getBoundingClientRect().top - ${top}, behavior: 'instant' }); s.id = 'fx-hover'; return JSON.stringify(true); })()`);
    await pause(400);
    cmux('hover', '#fx-hover');
  } finally {
    cmux('frame', 'main');
  }
  await pause(700);
}

// Open Edit Section on section i, and retry: the click after a panel closed opens nothing. The
// toolbar of the section above can show too; this section's own is the lowest.
export async function openSectionPanel(i, top = 80) {
  const open = () => evalJs(SURFACE, `(() => JSON.stringify(!![...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === 'Design' && e.getBoundingClientRect().width > 0)))()`) === true;
  for (let t = 0; t < 4 && !open(); t++) {
    await hoverSection(i, top);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute('aria-label'), x.textContent].some((t) => /edit section|open section settings/i.test(t || '')) && x.getBoundingClientRect().width > 0).filter((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 70 && y <= fr.top + sec.bottom; }).at(-1); }`, { wait: 1200 });
  }
  if (!open()) throw new Error(`openSectionPanel: section ${i} did not open`);
}

const byText = (sel, text) => `() => [...document.querySelectorAll('${sel}')].filter((x) => x.getBoundingClientRect().width > 0).find((x) => [x.getAttribute('aria-label'), x.textContent].some((t) => (t || '').trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}))`;

export function sectionCount() {
  return evalJs(SURFACE, `(() => { ${FRAME} return JSON.stringify(d.querySelectorAll('main#page .fluid-engine').length); })()`);
}

// Add a blank section after the last one.
export async function addSection() {
  const n = sectionCount();
  if (n === 0) {
    await click(byText('button', 'ADD SECTION'), { inFrame: true, wait: 2500 });
  } else {
    await hoverSection(n - 1);
    // The lowest visible ADD SECTION button sits on the hovered section's bottom edge.
    await click(`() => [...document.querySelectorAll('button')].filter((x) => /^add section$/i.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]`, { wait: 2500 });
  }
  await click(byText('a', 'Add Blank'), { wait: 3000 });
  if (sectionCount() !== n + 1) throw new Error('addSection: no new section appeared');
}

export function blockIds(i) {
  return evalJs(SURFACE, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${i}]; return JSON.stringify([...fe.querySelectorAll(':scope > .fe-block')].map((b) => b.dataset.blockId)); })()`);
}

const allIds = () => evalJs(SURFACE, `(() => { ${FRAME} return JSON.stringify([...d.querySelectorAll('main#page .fluid-engine')].map((fe) => [...fe.querySelectorAll(':scope > .fe-block')].map((b) => b.dataset.blockId))); })()`);

export async function removeBlock(i, id) {
  await select(i, id);
  await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Remove' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 60)`, { wait: 900 });
}

// Add a block of a menu type ("Text", "Shape", "Button", …) to section i; returns its id.
// The editor can hold two block menus at once; the item nearest the clicked button is ours.
// A block that lands in another section anyway is removed.
// Add Block's menu open on section i, nothing pressed in it. Returns the button's top.
export async function openAddBlock(i) {
  await escape();
  await deselect(i);
  // The section toolbar does not always appear on the first hover: hover the section
  // above (or below) first, then this one, up to three times.
  const findBtn = () => evalJs(SURFACE, `(() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const s = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); const top = fr.top + s.top, bottom = fr.top + s.bottom; const b = [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && /^add block$/i.test((x.getAttribute('aria-label') || x.textContent).trim())).find((x) => { const y = x.getBoundingClientRect().top; return y >= top - 40 && y <= bottom; }) || (() => { const all = [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && /^add block$/i.test((x.getAttribute('aria-label') || x.textContent).trim())); const n = f.contentDocument.querySelectorAll('main#page .page-section').length; return all.length === n ? all[${i}] : null; })(); document.querySelectorAll('#fx-target').forEach((x) => x.removeAttribute('id')); if (!b) return JSON.stringify(null); b.id = 'fx-target'; return JSON.stringify(b.getBoundingClientRect().top - fr.top); })()`);
  let btnTop = null;
  for (let t = 0; t < 3 && btnTop == null; t++) {
    if (t) { await hoverSection(i > 0 ? i - 1 : i + 1); await pause(400); }
    await hoverSection(i);
    btnTop = findBtn();
  }
  if (btnTop == null) {
    const seen = evalJs(SURFACE, `(() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const all = f.contentDocument.querySelectorAll('main#page .page-section'); const s = all[${i}]?.getBoundingClientRect(); return JSON.stringify({ sections: all.length, range: s && [Math.round(fr.top + s.top), Math.round(fr.top + s.bottom)], buttons: [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && /add block/i.test(x.getAttribute('aria-label') || x.textContent)).map((x) => Math.round(x.getBoundingClientRect().top)), inFrame: [...f.contentDocument.querySelectorAll('button')].filter((x) => /add block/i.test(x.getAttribute('aria-label') || x.textContent)).map((x) => Math.round(x.getBoundingClientRect().top)) }); })()`);
    throw new Error(`addBlock: no Add Block button on section ${i} ${JSON.stringify(seen)}`);
  }
  cmux('click', '#fx-target');
  await pause(1300);
  return btnTop;
}

export async function addBlock(i, type) {
  const before = new Set(allIds().flat());
  const btnTop = await openAddBlock(i);
  const leaf = `[...document.querySelectorAll('div,span,button,li')].filter((x) => x.childElementCount === 0 && x.getBoundingClientRect().width > 0 && !x.closest('.fe-block') && !/label-tag/.test(x.className) && x.textContent.trim() === ${JSON.stringify(type)})`;
  const visible = evalJs(SURFACE, `(() => { ${FRAME} return JSON.stringify(${leaf.replace('document', 'd')}.length); })()`);
  if (!visible) {
    cmux('frame', '#sqs-site-frame');
    try {
      evalJs(SURFACE, `(() => { const i = [...document.querySelectorAll('input')].filter((x) => /search/i.test(x.placeholder || '') && x.getBoundingClientRect().width > 0).sort((a, b) => Math.abs(a.getBoundingClientRect().top - ${btnTop}) - Math.abs(b.getBoundingClientRect().top - ${btnTop}))[0]; i.id = 'fx-search'; return 'true'; })()`);
      cmux('fill', '#fx-search', type);
    } finally {
      cmux('frame', 'main');
    }
    await pause(900);
    if (process.env.SHOTS) cmux('screenshot', '--out', `${process.env.SHOTS}/addblock-search-${type}.png`);
  }
  const tile = `${leaf}.sort((a, b) => Math.abs(a.getBoundingClientRect().top - ${btnTop}) - Math.abs(b.getBoundingClientRect().top - ${btnTop}))[0]`;
  // A low tile: move the menu's own list, as a wheel would. scrollIntoView moves the frame too, and a new block lands by the frame's scroll (CAP-T14MENU.json).
  cmux('frame', '#sqs-site-frame');
  try {
    evalJs(SURFACE, `(() => { const t = ${tile}; let sc = t && t.parentElement; while (sc && sc !== document.body && !(['auto', 'scroll'].includes(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 1)) sc = sc.parentElement; if (t && sc && sc !== document.body) { const q = t.getBoundingClientRect(), s = sc.getBoundingClientRect(); if (q.top < s.top || q.bottom > s.bottom) sc.scrollTo({ top: sc.scrollTop + q.top - s.top - s.height / 2, behavior: 'instant' }); } return 'true'; })()`);
  } finally {
    cmux('frame', 'main');
  }
  await pause(300);
  await click(`() => ${tile}`, { inFrame: true, wait: 1500 });
  let mine = null;
  for (let t = 0; t < 10 && !mine; t++) {
    const now = allIds();
    mine = (now[i] || []).find((id) => !before.has(id)) || null;
    for (const [k, ids] of now.entries()) for (const id of ids) if (k !== i && !before.has(id)) { console.log(`  stray ${type} block in section ${k}, removing`); await removeBlock(k, id); }
    if (!mine) await pause(500);
  }
  if (!mine) throw new Error(`addBlock ${type}: no new block in section ${i}`);
  return mine;
}

// Replace the text of the text block being edited with HTML, through a paste.
// Only the editor inside block `id` is touched, never the first editor on the page.
export async function pasteHtml(id, html) {
  const r = evalJs(SURFACE, `(async () => {
    ${FRAME}
    const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror[contenteditable=true]');
    if (!pm) return JSON.stringify('no editor');
    pm.focus();
    const rg = d.createRange(); rg.selectNodeContents(pm);
    const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    await new Promise((res) => setTimeout(res, 250));
    const dt = new W.DataTransfer();
    dt.setData('text/html', ${JSON.stringify(html)});
    dt.setData('text/plain', ${JSON.stringify(html.replace(/<[^>]+>/g, ' '))});
    pm.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await new Promise((res) => setTimeout(res, 400));
    return JSON.stringify(pm.innerHTML);
  })()`);
  await pause(300);
  return r;
}

// Double-click a text block to edit it.
export async function editText(i, id) {
  evalJs(SURFACE, `(() => { ${FRAME}
    const b = d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]');
    const q = b.getBoundingClientRect();
    const t = b.querySelector('.sqs-html-content') || b;
    t.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, composed: true, clientX: q.left + 20, clientY: q.top + 10, button: 0, detail: 2, view: W }));
    return 'true'; })()`);
  await pause(700);
}

export async function escape() {
  // A synthetic Escape does not close a panel in Chrome; a real one does.
  if (SURFACE.startsWith('cdp:')) { cmux('press', 'Escape'); await pause(500); return; }
  evalJs(SURFACE, `(() => { ${FRAME} const t = d.activeElement || d.body; for (const type of ['keydown', 'keyup']) t.dispatchEvent(new W.KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true, composed: true })); return 'true'; })()`);
  await pause(500);
}

// Click empty space in section i so nothing is selected or edited.
export async function deselect(i) {
  evalJs(SURFACE, `(() => { ${FRAME}
    const fe = d.querySelectorAll('main#page .fluid-engine')[${i}];
    const r = fe.getBoundingClientRect();
    const x = r.right - 4, y = r.bottom - 4;
    const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', view: W };
    fe.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 }));
    fe.dispatchEvent(new W.MouseEvent('mousedown', { ...o, buttons: 1 }));
    fe.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 }));
    fe.dispatchEvent(new W.MouseEvent('mouseup', { ...o, buttons: 0 }));
    fe.dispatchEvent(new W.MouseEvent('click', { ...o, buttons: 0 }));
    return 'true'; })()`);
  await pause(400);
}

// A pointer drag inside the frame, from an element's point (fx, fy as fractions) by dx, dy pixels.
const DRAG = (findEl, fx, fy, dx, dy) => `(async () => {
  ${FRAME}
  const el = (${findEl})(d, W);
  if (!el) return JSON.stringify('no element');
  const q = el.getBoundingClientRect();
  const x = q.left + q.width * ${fx}, y = q.top + q.height * ${fy};
  const o = { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, view: W };
  const at = (t, cx, cy, buttons) => { const tgt = t === 'down' ? el : d; tgt.dispatchEvent(new W.PointerEvent('pointer' + t, { ...o, clientX: cx, clientY: cy, buttons })); tgt.dispatchEvent(new W.MouseEvent('mouse' + t, { ...o, clientX: cx, clientY: cy, buttons })); };
  at('down', x, y, 1);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const steps = 12;
  for (let i = 1; i <= steps; i++) { at('move', x + (${dx} * i) / steps, y + (${dy} * i) / steps, 1); await sleep(25); }
  await sleep(120);
  at('up', x + ${dx}, y + ${dy}, 0);
  return JSON.stringify('ok');
})()`;

export function geometry(i) {
  return evalJs(SURFACE, `(() => { ${FRAME}
    const fe = d.querySelectorAll('main#page .fluid-engine')[${i}];
    const cs = W.getComputedStyle(fe); const r = fe.getBoundingClientRect();
    const cols = cs.gridTemplateColumns.split(' ').map(parseFloat); const rows = cs.gridTemplateRows.split(' ').map(parseFloat);
    const cg = parseFloat(cs.columnGap), rg = parseFloat(cs.rowGap);
    const colStart = []; let x = r.left; for (const w of cols) { colStart.push(x); x += w + cg; }
    const rowStart = []; let y = r.top; for (const h of rows) { rowStart.push(y); y += h + rg; }
    return JSON.stringify({ top: r.top, left: r.left, cols, rows, cg, rg, colStart, rowStart, rowMin: Math.min(...rows) });
  })()`);
}

export function area(i, id) {
  return evalJs(SURFACE, `(() => { ${FRAME}
    const b = d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]');
    const css = b.querySelector('style[data-test="fluid-engine-grid-css"]').textContent;
    const part = W.innerWidth >= 768 ? css.split('@media (min-width: 768px)')[1] : css.split('@media (min-width: 768px)')[0];
    return JSON.stringify(part.match(/grid-area:\\s*([\\d/-]+)/)[1].split('/').map(Number));
  })()`);
}

const BLOCK = (i, id) => `(d) => d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]')`;
const HANDLE = (cursor) => `(d, W) => [...d.querySelectorAll('.fluid-engine *')].find((e) => { const q = e.getBoundingClientRect(); return q.width === 10 && q.height === 10 && W.getComputedStyle(e).cursor === '${cursor}'; })`;

// Pixel position of the start of column line c and row line r, on uniform rows.
function linePx(g, c, r) {
  const pitch = g.rowMin + g.rg;
  const x = c - 1 < g.colStart.length ? g.colStart[c - 1] : g.colStart.at(-1) + g.cols.at(-1) + g.cg;
  const y = r - 1 < g.rowStart.length ? g.rowStart[r - 1] : g.rowStart.at(-1) + (r - g.rowStart.length) * pitch;
  return { x, y, pitch };
}

export async function select(i, id) {
  evalJs(SURFACE, `(async () => { ${FRAME}
    const b = d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]');
    { const q0 = b.getBoundingClientRect(); if (q0.top < 60 || q0.bottom > W.innerHeight - 20) W.scrollTo({ top: W.scrollY + q0.top - 120, behavior: 'instant' }); }
    await new Promise((res) => setTimeout(res, 400));
    const q = b.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, composed: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', view: W };
    b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 })); b.dispatchEvent(new W.MouseEvent('mousedown', { ...o, buttons: 1 }));
    b.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 })); b.dispatchEvent(new W.MouseEvent('mouseup', { ...o, buttons: 0 }));
    b.dispatchEvent(new W.MouseEvent('click', { ...o, buttons: 0 }));
    return 'true'; })()`);
  await pause(500);
}

export async function key(k) {
  const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  evalJs(SURFACE, `(() => { ${FRAME} const t = d.querySelector('.fe-block[data-is-selected="true"]') || (d.activeElement && d.activeElement !== d.body ? d.activeElement : d.body); for (const type of ['keydown', 'keyup']) t.dispatchEvent(new W.KeyboardEvent(type, { key: '${k}', code: '${k}', keyCode: ${codes[k] || 0}, bubbles: true, cancelable: true, composed: true })); return 'true'; })()`);
  await pause(250);
}

// Move then resize block id in section i to area [r0, c0, r1, c1], in up to 3 rounds:
// drag the block, fix its start with arrow keys, then drag the south-east handle.
export async function place(i, id, want) {
  const [r0, c0, r1, c1] = want;
  const same = (a) => a.join('/') === want.join('/');
  for (let round = 0; round < 3 && !same(area(i, id)); round++) {
    await select(i, id);
    let a = area(i, id);
    if (a[0] !== r0 || a[1] !== c0) {
      const g = geometry(i);
      const from = linePx(g, a[1], a[0]);
      const to = linePx(g, c0, r0);
      evalJs(SURFACE, DRAG(BLOCK(i, id), 0.5, 0.5, to.x - from.x, to.y - from.y));
      await pause(700);
    }
    await select(i, id);
    for (let n = 0; n < 60; n++) {
      a = area(i, id);
      const k = a[1] < c0 ? 'ArrowRight' : a[1] > c0 ? 'ArrowLeft' : a[0] < r0 ? 'ArrowDown' : a[0] > r0 ? 'ArrowUp' : null;
      if (!k) break;
      // A block that would cross the right edge cannot move right; shrink it first.
      if (k === 'ArrowRight' && a[3] >= 27) break;
      await key(k);
    }
    a = area(i, id);
    if (a[2] !== r1 || a[3] !== c1) {
      await select(i, id);
      const g = geometry(i);
      const cur = linePx(g, a[3], a[2]);
      const to = linePx(g, c1, r1);
      evalJs(SURFACE, DRAG(HANDLE('se-resize'), 0.5, 0.5, to.x - cur.x, to.y - cur.y));
      await pause(700);
    }
  }
  return area(i, id);
}

export async function save() {
  await click(byText('button', 'Save'), { wait: 4000 });
  const state = evalJs(SURFACE, `(() => JSON.stringify([...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save')?.disabled))()`);
  if (state !== true) throw new Error('save: the Save button is still enabled');
}

// ---------- gestures in grid units, for traces (M3) ----------
// Pitch: distance between two content column starts, and between two uniform rows.
export function pitch(i) {
  const g = geometry(i);
  return { col: g.colStart[2] - g.colStart[1], row: g.rowMin + g.rg, g };
}

const HANDLE_AT = (i, id, dir) => `(d, W) => {
  const b = d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect();
  const fx = { w: 0, e: 1, n: 0.5, s: 0.5, nw: 0, ne: 1, sw: 0, se: 1 }['${dir}'];
  const fy = { n: 0, s: 1, w: 0.5, e: 0.5, nw: 0, ne: 0, sw: 1, se: 1 }['${dir}'];
  const x = b.left + b.width * fx, y = b.top + b.height * fy;
  return [...d.querySelectorAll('.fluid-engine *')].filter((e) => { const q = e.getBoundingClientRect(); return q.width === 10 && q.height === 10 && /resize/.test(W.getComputedStyle(e).cursor); })
    .sort((p, q) => { const a = p.getBoundingClientRect(), c = q.getBoundingClientRect(); return Math.hypot(a.left + 5 - x, a.top + 5 - y) - Math.hypot(c.left + 5 - x, c.top + 5 - y); })[0];
}`;

// Press on an element, move by (dx, dy) px in steps, hold, and return what the editor shows
// mid-gesture. Call release() afterwards. Modifier keys apply to every pointer event.
export async function hold(findEl, dx, dy, { fx = 0.5, fy = 0.5, shift = false, alt = false, steps = 12 } = {}) {
  const r = evalJs(SURFACE, `(async () => {
    ${FRAME}
    const el = (${findEl})(d, W);
    if (!el) return JSON.stringify({ error: 'no element' });
    const q = el.getBoundingClientRect();
    const x = q.left + q.width * ${fx}, y = q.top + q.height * ${fy};
    window.__fxHold = { x: x + ${dx}, y: y + ${dy} };
    const o = { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, view: W, shiftKey: ${shift}, altKey: ${alt} };
    const at = (t, cx, cy, buttons) => { const tgt = t === 'down' ? el : d; tgt.dispatchEvent(new W.PointerEvent('pointer' + t, { ...o, clientX: cx, clientY: cy, buttons })); tgt.dispatchEvent(new W.MouseEvent('mouse' + t, { ...o, clientX: cx, clientY: cy, buttons })); };
    at('down', x, y, 1);
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let k = 1; k <= ${steps}; k++) { at('move', x + (${dx} * k) / ${steps}, y + (${dy} * k) / ${steps}, 1); await sleep(25); }
    await sleep(300);
    const fe = d.querySelectorAll('main#page .fluid-engine');
    const attrs = [...el.closest('.fluid-engine').querySelectorAll(':scope > .fe-block')].map((b) => ({ id: b.dataset.blockId, near: b.dataset.isNearDraggedBlock, matchW: b.dataset.isMatchingWidth, matchH: b.dataset.isMatchingHeight, selected: b.dataset.isSelected, transform: b.style.transform || '' }));
    const own = el.closest('.fluid-engine');
    const layers = [...own.querySelectorAll(':scope > div')].filter((e) => /indicator|original-position|guide|snap/i.test(e.className)).map((e) => ({ cls: [...e.classList].filter((c) => !/^[A-Za-z0-9_]{16}$/.test(c)).join('.').replace(/[0-9a-f]{20}|yui_[\\d_]+/g, '<id>'), area: W.getComputedStyle(e).gridArea, z: W.getComputedStyle(e).zIndex }));
    const guides = [...d.querySelectorAll('*')].filter((e) => /guide|alignment-line|snap-line/i.test(typeof e.className === 'string' ? e.className : '')).length;
    return JSON.stringify({ attrs: attrs.filter((a) => a.near === 'true' || a.matchW === 'true' || a.matchH === 'true' || a.selected === 'true' || a.transform), layers, guides, gridVisible: [...fe].map((x) => x.dataset.gridIsVisible) });
  })()`);
  await pause(200);
  return r;
}

export async function release({ shift = false, alt = false } = {}) {
  evalJs(SURFACE, `(() => { ${FRAME}
    const p = window.__fxHold || { x: 0, y: 0 };
    const o = { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, view: W, clientX: p.x, clientY: p.y, buttons: 0, shiftKey: ${shift}, altKey: ${alt} };
    d.dispatchEvent(new W.PointerEvent('pointerup', o)); d.dispatchEvent(new W.MouseEvent('mouseup', o));
    return 'true'; })()`);
  await pause(900);
}

// ---------- getting in and out of edit mode ----------
// Open a page by its title in the page list and enter edit mode. Real clicks.
export async function enterEdit(title) {
  if (!title) throw new Error('enterEdit: name the page (0006).');
  const titled = `() => [...document.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.textContent.trim() === ${JSON.stringify(title)} && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left < 400)[0]`;
  // An empty page has no editing section until one is touched, so the top bar's Exit counts too.
  const editing = () => evalJs(SURFACE, `(() => { ${FRAME} return JSON.stringify((d && d.querySelectorAll('.fluid-engine.is-editing').length > 0) || [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Exit' && x.getBoundingClientRect().width > 0)); })()`);
  if (editing()) return;
  await click(titled, { wait: 5000 });
  await click(byText('button', 'Edit'), { wait: 6000 });
  for (let i = 0; i < 20 && !editing(); i++) await pause(1000);
  if (!editing()) throw new Error(`enterEdit: ${title} is not in edit mode`);
  // The editor keeps the phone view across an exit (a page reload resets it), so a read would land on phone positions.
  await click(`() => document.querySelector('[aria-label="Desktop View"]')`, { wait: 900 });
}

// Leave edit mode and throw away unsaved work: Exit, then the Exit inside "Exit Without Saving?".
// Undo is not a safe way back (8 undos left a page dirty on 2026-11-04). Returns whether there
// was a dialog, that is, whether the page was dirty. Each press has an on-top check. If one fails,
// or the top bar still has Exit afterwards, it throws, and the message says the page is still in
// edit mode: nothing is saved, and the caller must not take the page as left.
const TOP_EXIT = `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Exit' && b.getBoundingClientRect().width > 0)`;
const DIALOG_EXIT = `(() => { const t = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && /exit without saving/i.test(e.textContent) && e.getBoundingClientRect().width > 0); let box = t; while (box && ![...box.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Exit')) box = box.parentElement; return box ? [...box.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Exit') : null; })()`;
export async function exitWithoutSaving() {
  const asked = () => evalJs(SURFACE, `(() => JSON.stringify(!!${DIALOG_EXIT}))()`) === true;
  const stuck = (why) => new Error(`exitWithoutSaving: ${why}. Still in edit mode, nothing saved.`);
  const onTop = (find, wait) => pressOnTop(SURFACE, find, wait).catch((e) => { throw stuck(e.message); });
  const hasExit = () => evalJs(SURFACE, `(() => JSON.stringify(!!${TOP_EXIT}))()`) === true;
  if (!asked() && !hasExit()) throw new Error('exitWithoutSaving: no Exit button, so not in edit mode.');
  if (!asked()) await onTop(TOP_EXIT, 1500);
  const dirty = asked();
  if (dirty) await onTop(DIALOG_EXIT, 3000);
  for (let i = 0; i < 10; i++) {
    if (!hasExit()) return dirty;
    await pause(500);
  }
  throw stuck('the top bar still has Exit after pressing it');
}

export const blockEl = (i, id) => BLOCK(i, id);
export const handleEl = (i, id, dir) => HANDLE_AT(i, id, dir);
