// Multi-step experiments on the oracle demo page that one trace cannot hold.
// Each probe writes parity/findings/<item>.json. Every probe starts from a saved,
// clean page, undoes its steps, reloads, and checks the saved state came back (O1).
// Usage: node scripts/oracle-probe.mjs L4 | E3E6
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { evalJs, waitFor, reload, pause } from './lib/cmux.mjs';
import { READY, LOADED, ENTER_EDIT, KEY, BUTTON } from './oracle/snippets.mjs';
import { select, click, editText, pasteHtml, escape, deselect, addSection, addBlock, removeBlock, sectionCount, area, hold, release, blockEl, pitch, blockIds } from './oracle/ui.mjs';

const S = process.env.ORACLE_SURFACE || 'surface:40';
const which = process.argv[2];
const PAGE = '/how-fluid-engine-works';
const today = new Date().toISOString().slice(0, 10);

const FRAME = `const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;`;
// Both layouts for every block of section i, from the editor's per-block style tags.
const both = (i) => evalJs(S, `(() => { ${FRAME}
  const fe = d.querySelectorAll('main#page .fluid-engine')[${i}];
  const out = {};
  for (const b of fe.querySelectorAll(':scope > .fe-block')) {
    const css = b.querySelector('style[data-test="fluid-engine-grid-css"]').textContent;
    const [m, dk] = css.split('@media (min-width: 768px)');
    const a = (t) => t.match(/grid-area:\\s*([\\d/-]+)/)[1];
    out[b.dataset.blockId] = { mobile: a(m), desktop: a(dk) };
  }
  return JSON.stringify(out); })()`);
const allSections = () => evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.querySelectorAll('main#page .fluid-engine').length); })()`);
const saveDisabled = () => evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save')?.disabled))()`);

function ensurePage() {
  waitFor(S, LOADED);
  const path = evalJs(S, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentDocument.location.pathname))()`);
  if (path === PAGE) return;
  evalJs(S, `(() => { const e = [...document.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && x.textContent.trim() === 'How Fluid Engine works' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().left < 400)[0]; document.querySelectorAll('#fx-target').forEach((y) => y.removeAttribute('id')); e.id = 'fx-target'; return 'true'; })()`);
  execFileSync('cmux', ['browser', '--surface', S, 'click', '#fx-target']);
  waitFor(S, `(() => document.getElementById('sqs-site-frame').contentDocument.location.pathname === '${PAGE}')()`, 30);
}
function ensureEditing() {
  if (evalJs(S, READY) === true) return;
  ensurePage();
  evalJs(S, ENTER_EDIT);
  waitFor(S, READY, 30);
}
const view = (name) => click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '${name} View')`, { wait: 2500 });

async function restore(snapshotBefore, sections) {
  let steps = 0;
  while (steps < 15 && evalJs(S, BUTTON('Undo')) === true) { steps++; await pause(800); }
  reload(S);
  ensurePage();
  evalJs(S, ENTER_EDIT);
  waitFor(S, READY, 30);
  for (const i of sections) {
    const now = both(i);
    if (JSON.stringify(now) !== JSON.stringify(snapshotBefore[i])) throw new Error(`section ${i} did not come back after reload`);
  }
  return steps;
}

function write(item, finding) {
  mkdirSync(new URL('../parity/findings/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`../parity/findings/${item}.json`, import.meta.url), JSON.stringify({ item, oracle: `https://halibut-keyboard-jlhd.squarespace.com${PAGE}`, capturedAt: today, ...finding }, null, 2) + '\n');
  console.log(`wrote parity/findings/${item}.json`);
}

ensureEditing();
if (saveDisabled() !== true) throw new Error('The oracle has unsaved changes; the probe never touches unsaved work.');

if (which === 'L4') {
  // Phone edit, then a desktop edit of the same block, then read both layouts.
  const i = 6;
  const start = { [i]: both(i) };
  const id = Object.keys(start[i])[2];
  await view('Mobile');
  await select(i, id);
  evalJs(S, KEY(i, id, 'ArrowDown'));
  await pause(1200);
  const afterPhone = both(i);
  await view('Desktop');
  await select(i, id);
  evalJs(S, KEY(i, id, 'ArrowRight'));
  await pause(1200);
  const afterDesktop = both(i);
  await view('Mobile');
  await pause(800);
  const phoneAgain = both(i);
  await view('Desktop');
  const steps = await restore(start, [i]);
  write('L4', {
    question: 'Do phone edits survive a later desktop edit of the same block?',
    block: id,
    steps: ['phone view: ArrowDown on the block', 'desktop view: ArrowRight on the same block', 'phone view: read'],
    start: start[i][id], afterPhoneEdit: afterPhone[id], afterDesktopEdit: afterDesktop[id], phoneAfterBoth: phoneAgain[id],
    answer: afterPhone[id].mobile === phoneAgain[id].mobile ? 'The phone area stayed as edited after the desktop edit.' : 'The desktop edit changed the phone area.',
    undoSteps: steps,
  });
}

if (which === 'E3E6') {
  // Grow a text block by editing on desktop, then shrink the text again.
  const i = 2;
  const start = { [i]: both(i) };
  const id = Object.keys(start[i])[1];
  const original = evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"] .sqs-html-content').innerHTML); })()`);
  await deselect(i);
  await editText(i, id);
  const longer = '<p>' + 'More words make this paragraph wrap onto more lines. '.repeat(8) + '</p>';
  await pasteHtml(id, longer);
  await pause(1200);
  const grown = both(i);
  await pasteHtml(id, '<p>Short.</p>');
  await pause(1200);
  const shortened = both(i);
  await escape();
  await deselect(i);
  await pause(800);
  const afterEdit = both(i);
  const steps = await restore(start, [i]);
  const s0 = start[i][id], g = grown[id], sh = shortened[id], ae = afterEdit[id];
  write('E3', {
    question: 'Does a text block shrink when text is deleted?',
    block: id, start: s0, afterLongerText: g, afterShortText: sh, afterLeavingEdit: ae,
    answer: sh.desktop === g.desktop && ae.desktop === g.desktop ? 'No: the end row stays where the longer text put it.' : `The desktop area went from ${g.desktop} to ${ae.desktop}.`,
    undoSteps: steps, originalHtmlLength: original.length,
  });
  write('E6', {
    question: "Does a desktop text edit change the block's phone layout?",
    block: id, start: s0, afterLongerText: g, afterLeavingEdit: ae,
    answer: s0.mobile === g.mobile ? 'No: the phone area did not change while the desktop end row grew.' : `Yes: the phone area went from ${s0.mobile} to ${g.mobile}.`,
  });
}

if (which === 'SECTION') {
  // Section settings (P3, P5, S2): open Edit Section on section 2, click each option,
  // read the section's markup and computed layout, undo after each.
  const i = 2;
  const start = { [i]: both(i) };
  const READ_SECTION = `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}];
    const fe = sec.querySelector('.fluid-engine'); const wrap = sec.querySelector('.content-wrapper');
    const cs = W.getComputedStyle(sec), fs = W.getComputedStyle(fe), ws = W.getComputedStyle(wrap);
    const rows = fs.gridTemplateRows.split(' ');
    return JSON.stringify({
      classes: [...sec.classList].filter((c) => !/^[A-Za-z0-9_]{16}$/.test(c)).join(' '),
      data: Object.fromEntries([...sec.attributes].filter((a) => a.name.startsWith('data-') && !/current-(styles|context)|controllers/.test(a.name)).map((a) => [a.name, a.value.slice(0, 60)])),
      inline: sec.getAttribute('style'),
      height: Math.round(sec.getBoundingClientRect().height), paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, minHeight: cs.minHeight,
      wrapper: { alignItems: ws.alignItems, justifyContent: ws.justifyContent, padding: ws.padding, minHeight: ws.minHeight },
      grid: { rows: rows.length, firstRow: rows[0], rowGap: fs.rowGap, columnGap: fs.columnGap, height: Math.round(fe.getBoundingClientRect().height), alignSelf: fs.alignSelf },
      divider: !!sec.querySelector('[class*=divider]'),
    }); })()`;
  const openPanel = async () => {
    const { hoverSection } = await import('./oracle/ui.mjs');
    await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 });
  };
  const option = (label) => click(`() => { const leaf = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().left > 1100 && e.textContent.trim() === ${'${JSON.stringify(label)}'}).pop(); if (!leaf) return null; return leaf.closest('button, label, [role=button], [role=radio], [role=switch], [role=tab]') || leaf; }`.replace('${JSON.stringify(label)}', JSON.stringify(label)), { wait: 1500 });
  const results = { base: evalJs(S, READ_SECTION) };
  for (const label of ['S', 'L', 'Fill Screen', 'Vertical center', 'Vertical bottom', 'Zero gap', 'Divider']) {
    await openPanel();
    try { await option(label); } catch (e) { results[label] = { error: String(e.message).slice(0, 80) }; continue; }
    await pause(800);
    results[label] = evalJs(S, READ_SECTION);
    let n = 0;
    await escape();
    while (n < 5 && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
    results[label].undoSteps = n;
  }
  const steps = await restore(start, [i]);
  write('SECTION', { question: 'What does each section setting change?', section: i, results, undoSteps: steps });
}

if (which === 'PANEL') {
  // P4, P5, C9: every label in the Edit Section panel, tab by tab. Read only; nothing is clicked except tabs.
  const i = 2;
  const { hoverSection } = await import('./oracle/ui.mjs');
  await hoverSection(i);
  await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 });
  const LABELS = `(() => { const fr = document.getElementById('sqs-site-frame').getBoundingClientRect();
    const inPanel = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && (q.left > fr.right - 420 || q.left > 1000); };
    const leaves = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && inPanel(e) && e.textContent.trim() && !e.closest('#sqs-site-frame'));
    const aria = [...document.querySelectorAll('[aria-label]')].filter((e) => inPanel(e)).map((e) => e.getAttribute('aria-label'));
    const tabs = [...document.querySelectorAll('[role=tab]')].filter(inPanel).map((e) => e.textContent.trim());
    return JSON.stringify({ text: [...new Set(leaves.map((e) => e.textContent.trim().slice(0, 50)))], aria: [...new Set(aria)], tabs }); })()`;
  const first = evalJs(S, LABELS);
  const out = { [first.tabs.join('|') || 'panel']: first };
  for (const t of first.tabs) {
    await click(`() => [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === ${'${JSON.stringify(t)}'})`.replace('${JSON.stringify(t)}', JSON.stringify(t)), { wait: 1200 });
    out[t] = evalJs(S, LABELS);
    console.log(t, JSON.stringify(out[t]).slice(0, 400));
  }
  await escape();
  write('PANEL', { question: 'Which settings does the Edit Section panel offer on each tab?', section: i, tabs: out, saveDisabled: saveDisabled() });
}

if (which === 'INSET') {
  // P4, C9: Background tab > Background Width > Inset on section 2. Read the section, its
  // background and its grid before and after, then undo and reload-check.
  const i = 2;
  const start = { [i]: both(i) };
  const READ = `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}];
    const box = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10); };
    const fe = sec.querySelector('.fluid-engine'); const bg = sec.querySelector('.section-background');
    return JSON.stringify({ frameWidth: W.innerWidth, classes: [...sec.classList].filter((c) => /width|bleed/.test(c)).join(' '),
      section: box(sec), background: box(bg), backgroundStyle: bg && { left: W.getComputedStyle(bg).left, right: W.getComputedStyle(bg).right, width: W.getComputedStyle(bg).width, borderRadius: W.getComputedStyle(bg).borderRadius },
      grid: box(fe), columns: W.getComputedStyle(fe).gridTemplateColumns.split(' ').slice(0, 3).join(' '), inset: W.getComputedStyle(fe).getPropertyValue('--inset-padding'),
      container: W.getComputedStyle(fe).getPropertyValue('--container-width'), wrapper: W.getComputedStyle(sec.querySelector('.content-wrapper')).padding }); })()`;
  const { hoverSection } = await import('./oracle/ui.mjs');
  const before = evalJs(S, READ);
  await hoverSection(i);
  await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 });
  await click(`() => [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === 'Background')`, { wait: 1200 });
  await click(`() => { const leaf = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.getBoundingClientRect().width > 0 && e.textContent.trim() === 'Inset').pop(); return leaf && (leaf.closest('button, label, [role=radio], [role=button]') || leaf); }`, { wait: 1800 });
  const after = evalJs(S, READ);
  console.log('before', JSON.stringify(before)); console.log('after', JSON.stringify(after));
  await escape();
  const widths = {};
  for (const w of [375, 768, 1280]) {
    evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const [k, v] of [['width', '${w}px'], ['max-width', 'none'], ['min-width', '0'], ['flex', 'none']]) f.style.setProperty(k, v, 'important'); return 'true'; })()`);
    await pause(1500);
    widths[w] = evalJs(S, READ);
    console.log(w, JSON.stringify(widths[w]));
  }
  evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const k of ['width', 'max-width', 'min-width', 'flex']) f.style.removeProperty(k); return 'true'; })()`);
  await pause(1500);
  after.widths = widths;
  const steps = await restore(start, [i]);
  write('INSET', { question: 'What does Background Width Inset change on a Fluid Engine section?', section: i, before, after, undoSteps: steps });
}

if (which === 'T13') {
  // Default size and place of each block type: a scratch section at the end, one block
  // at a time (added, read, removed), then a reload that discards it all (nothing saved).
  const types = ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Scrolling', 'Line'];
  await addSection();
  const i = sectionCount() - 1;
  const results = {};
  for (const t of types) {
    try {
      const id = await addBlock(i, t);
      await escape();
      await pause(800);
      results[t] = { area: area(i, id).join('/'), rows: evalJs(S, `(() => { ${FRAME} return JSON.stringify(W.getComputedStyle(d.querySelectorAll('main#page .fluid-engine')[${i}]).gridTemplateRows.split(' ').length); })()`) };
      await deselect(i);
      await removeBlock(i, id);
    } catch (e) {
      results[t] = { error: String(e.message).slice(0, 100) };
    }
    console.log(t, JSON.stringify(results[t]));
  }
  reload(S);
  await pause(1500);
  try { execFileSync('cmux', ['browser', '--surface', S, 'dialog', 'accept']); } catch {}
  ensurePage();
  const n = evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.querySelectorAll('main#page .fluid-engine').length); })()`);
  if (n !== 8) throw new Error(`after reload the page has ${n} sections, expected the saved 8`);
  write('T13', { question: 'Where does each block type land, and how big, when added to an empty section?', section: 'scratch section at the end, removed by reload', results, savedSectionsAfterReload: n });
}

if (which === 'BATCH') {
  // L3, E1, X1, X6, R4 in one pass on the demo page; every change is undone, then a reload check.
  const out = {};
  const undoAll = async () => { await escape(); let n = 0; while (n < 10 && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } return n; };
  const startAll = {}; for (let k = 0; k < 8; k++) startAll[k] = both(k);

  // L3: add a Text block on desktop to section 6, read its phone area.
  { const i = 6; const id = await addBlock(i, 'Text'); await escape(); await pause(900);
    const a = both(i)[id]; const others = Object.entries(both(i)).filter(([k]) => k !== id).map(([, v]) => v.mobile);
    out.L3 = { added: a, otherPhoneAreas: others }; await deselect(i); await undoAll(); }

  // E1: click a selected text block once more; is the text editor open?
  { const i = 2; const id = blockIds(i)[1]; await select(i, id); await pause(500); await select(i, id); await pause(900);
    out.E1 = { editorOpenAfterSecondClick: evalJs(S, `(() => { ${FRAME} return JSON.stringify(!!d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror[contenteditable=true]')); })()`) };
    await escape(); await deselect(i); }

  // X1: hold a drag of 2, 4, 8 and 16px; does the grid show, does the block move?
  { const i = 2; const id = blockIds(i)[2]; out.X1 = {};
    for (const px of [2, 4, 8, 16]) { await select(i, id); const mid = await hold(blockEl(i, id), px, 0, { steps: 4 }); await release(); await pause(600);
      out.X1[px] = { gridVisible: mid.gridVisible?.[i], transform: (mid.attrs || []).find((a) => a.id === id)?.transform || '' }; await undoAll(); } }

  // X6: handles shown for each block type present on the page.
  { out.X6 = {}; const kinds = { text: [2, 1], shape: [2, 2], button: [0, 2] };
    for (const [kind, [i, k]] of Object.entries(kinds)) { const id = blockIds(i)[k]; await select(i, id); await pause(600);
      out.X6[kind] = evalJs(S, `(() => { ${FRAME} return JSON.stringify([...d.querySelectorAll('.fluid-engine *')].filter((e) => { const q = e.getBoundingClientRect(); return q.width === 10 && q.height === 10 && /resize/.test(W.getComputedStyle(e).cursor); }).map((e) => W.getComputedStyle(e).cursor)); })()`);
      await deselect(i); } }

  // R4: drag a block 6 rows down past the bottom, then back up; does the row count shrink?
  { const i = 2; const id = blockIds(i)[2]; const rows = () => evalJs(S, `(() => { ${FRAME} return JSON.stringify(W.getComputedStyle(d.querySelectorAll('main#page .fluid-engine')[${i}]).gridTemplateRows.split(' ').length); })()`);
    const r0 = rows(); const p = pitch(i);
    await select(i, id); await hold(blockEl(i, id), 0, 6 * p.row); await release(); await pause(900); const r1 = rows(); const a1 = area(i, id);
    await select(i, id); await hold(blockEl(i, id), 0, -6 * p.row); await release(); await pause(900); const r2 = rows(); const a2 = area(i, id);
    out.R4 = { rowsBefore: r0, afterDragDown: { rows: r1, area: a1 }, afterDragBack: { rows: r2, area: a2 } }; await undoAll(); }

  const steps = await restore(startAll, [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const [k, v] of Object.entries(out)) write(k, { question: k, ...v, note: 'from oracle-probe.mjs BATCH; every change undone, saved page checked after reload' });
  console.log(JSON.stringify(out, null, 1));
}

if (which === 'KEYS') {
  // A3, Y4: key combinations on a selected block; area, block count and selection after each.
  const i = 2;
  const startAll = {}; for (let k = 0; k < 8; k++) startAll[k] = both(k);
  const id = blockIds(i)[2];
  const press = (key, mods = {}) => evalJs(S, `(() => { ${FRAME}
    const t = d.querySelector('.fe-block[data-is-selected="true"]') || (d.activeElement !== d.body ? d.activeElement : d.body);
    const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Tab: 9, Backspace: 8, Delete: 46, d: 68, c: 67, v: 86, Escape: 27 };
    const o = { key: '${key}', code: '${key.length === 1 ? 'Key' + key.toUpperCase() : key}', keyCode: codes['${key}'] || 0, which: codes['${key}'] || 0, bubbles: true, cancelable: true, composed: true, shiftKey: ${!!mods.shift}, altKey: ${!!mods.alt}, metaKey: ${!!mods.meta}, ctrlKey: false };
    for (const type of ['keydown', 'keyup']) t.dispatchEvent(new W.KeyboardEvent(type, o));
    return 'true'; })()`);
  const state = () => evalJs(S, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${i}];
    const sel = [...fe.querySelectorAll(':scope > .fe-block')].filter((b) => b.dataset.isSelected === 'true').map((b) => b.dataset.blockId);
    return JSON.stringify({ count: fe.querySelectorAll(':scope > .fe-block').length, selected: sel, active: (d.activeElement && d.activeElement.dataset && d.activeElement.dataset.blockId) || d.activeElement.tagName }); })()`);
  const undoAll = async () => { await escape(); let n = 0; while (n < 10 && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } return n; };
  const combos = process.argv[3] === '2'
    ? [['ArrowLeft', { meta: true }], ['ArrowDown', { meta: true }], ['ArrowUp', { meta: true }], ['d', { meta: true }], ['Delete', {}]]
    : [['ArrowRight', { shift: true }], ['ArrowDown', { shift: true }], ['ArrowRight', { alt: true }], ['ArrowRight', { meta: true }], ['Tab', {}], ['Tab', { shift: true }], ['d', { meta: true }], ['c', { meta: true }, 'v'], ['Backspace', {}]];
  const out = {};
  for (const [key, mods, then] of combos) {
    const name = [mods.meta && 'Cmd', mods.alt && 'Alt', mods.shift && 'Shift', key].filter(Boolean).join('+') + (then ? ` then Cmd+${then}` : '');
    await select(i, id); await pause(400);
    const before = { area: both(i)[id]?.desktop, ...state() };
    press(key, mods); await pause(900);
    if (then) { press(then, { meta: true }); await pause(1200); }
    const after = { area: both(i)[id]?.desktop || 'gone', ...state() };
    const all = both(i); after.newAreas = Object.entries(all).filter(([k]) => !(k in startAll[i])).map(([k, v]) => ({ id: k, ...v }));
    const undone = await undoAll();
    out[name] = { before, after, undoSteps: undone };
    console.log(name, JSON.stringify(after), 'undo', undone);
  }
  const steps = await restore(startAll, [0, 1, 2, 3, 4, 5, 6, 7]);
  write(process.argv[3] === '2' ? 'KEYS2' : 'KEYS', { question: 'What do key combinations do on a selected block?', block: id, results: out });
}

