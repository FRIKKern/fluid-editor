// Multi-step experiments on the oracle demo page that one trace cannot hold.
// Each probe writes parity/findings/<item>.json. Every probe starts from a saved,
// clean page, undoes its steps, reloads, and checks the saved state came back (O1).
// Usage: node scripts/oracle-probe.mjs L4 | E3E6 | PANEL | INSET | SETTINGS [options json] | OPTION <[tab,label]> <name> | DIVIDER | DIVSHAPES | DIVOPTS | TOOLBARS | EDITPANEL | TEXTBAR | TEXTOPS [actions json] | PASTE | T13 [types json] [name] | EXIT | AUTOSCROLL [distances json] | NEAR [section] [offsets json] | BATCH | KEYS
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

if (which === 'SETTINGS') {
  // P3, P5, S1, S2: click one Edit Section option at a time on section 2, read the section
  // after the change renders, then undo. Colors tab options give the theme names.
  const i = 2;
  const start = { [i]: both(i) };
  const READ = `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}];
    const fe = sec.querySelector('.fluid-engine'), wrap = sec.querySelector('.content-wrapper'), bg = sec.querySelector('.section-background');
    const cs = W.getComputedStyle(sec), fs = W.getComputedStyle(fe), ws = W.getComputedStyle(wrap);
    const rows = fs.gridTemplateRows.split(' ');
    const div = sec.querySelector('.section-divider-display, [class*=divider]');
    return JSON.stringify({ classes: [...sec.classList].filter((c) => /--|section$/.test(c)).join(' '), theme: sec.dataset.sectionTheme, inline: (sec.getAttribute('style') || '').replace(/outline[^;]*;|scroll-margin-top[^;]*;/g, '').trim(),
      height: Math.round(sec.getBoundingClientRect().height * 10) / 10, minHeight: cs.minHeight, wrapPadding: ws.padding, wrapMinHeight: ws.minHeight, justify: ws.justifyContent, align: ws.alignItems,
      rows: rows.length, firstRow: rows[0], rowGap: fs.rowGap, columnGap: fs.columnGap, gridHeight: Math.round(fe.getBoundingClientRect().height * 10) / 10,
      bg: bg && W.getComputedStyle(bg).backgroundColor, divider: div ? { cls: div.className.slice(0, 80), h: Math.round(div.getBoundingClientRect().height) } : null, frameH: W.innerHeight,
      inputs: [...document.querySelectorAll('input[type=number], input[type=text], input[type=range]')].filter((e) => e.getBoundingClientRect().left > 1200 && e.getBoundingClientRect().width > 0).map((e) => (e.getAttribute('aria-label') || e.type) + '=' + e.value + (e.min ? ' [' + e.min + '..' + e.max + ']' : '')),
      fullClasses: [...sec.classList].filter((c) => !/^[A-Za-z0-9_]{16}$/.test(c)).join(' '),
      ink: ['h1, h2, h3', 'p', '.sqs-block-button-element'].map((q) => { const e = sec.querySelector(q); return e ? W.getComputedStyle(e).color + (q.includes('button') ? ' on ' + W.getComputedStyle(e).backgroundColor : '') : null; }),
      all: [...d.querySelectorAll('main#page .page-section')].map((x) => [...x.classList].filter((c) => /height--|alignment--|width--/.test(c)).join(' ') + '|' + x.dataset.sectionTheme) }); })()`;
  const { hoverSection } = await import('./oracle/ui.mjs');
  const open = async (tab) => {
    await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 });
    await click(`() => [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === ${'TAB'})`.replace('TAB', JSON.stringify(tab)), { wait: 1200 });
  };
  const pick = (label) => click(`() => { const L = ${'LBL'}; const hit = [...document.querySelectorAll('[aria-label], body *')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame') && (e.getAttribute('aria-label') === L || (e.childElementCount === 0 && e.textContent.trim() === L))).pop(); return hit && (hit.closest('button, label, [role=radio], [role=button], [role=switch], [role=option]') || hit); }`.replace('LBL', JSON.stringify(label)), { wait: 2500 });
  const base = evalJs(S, READ);
  const results = { base };
  await open('Design'); await escape();
  const OPTS = (process.argv[3] ? JSON.parse(process.argv[3]) : null) || [['Design', 'S'], ['Design', 'L'], ['Design', 'Custom height'], ['Design', 'Fill Screen'], ['Design', 'Vertical top'], ['Design', 'Vertical bottom'],
    ['Design', 'Zero gap'], ['Design', 'Custom gap'], ['Design', 'Divider'],
    ['Colors', 'Lightest 1'], ['Colors', 'Lightest 2'], ['Colors', 'Light 1'], ['Colors', 'Light 2'], ['Colors', 'Bright 1'], ['Colors', 'Bright 2'], ['Colors', 'Dark 1'], ['Colors', 'Dark 2'], ['Colors', 'Darkest 1'], ['Colors', 'Darkest 2']];
  for (const [tab, label] of OPTS) {
    // The first panel open after the probe starts does not always take: retry once when nothing changed.
    for (let t = 0; t < 2; t++) {
      try { await open(tab); await pick(label); await pause(1200); results[label] = evalJs(S, READ); }
      catch (e) { results[label] = { error: String(e.message).slice(0, 80) }; }
      if (results[label].error || saveDisabled() !== true) break;
      await escape();
    }
    await escape();
    let n = 0; while (n < 6 && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
    if (results[label]) results[label].undoSteps = n;
    const d = Object.fromEntries(Object.entries(results[label] || {}).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k])));
    console.log(label, JSON.stringify(d));
  }
  const steps = await restore(start, [i]);
  write('SETTINGS', { question: 'What does each Edit Section option change on a Fluid Engine section?', section: i, results, undoSteps: steps });
}

if (which === 'OPTION') {
  // One Edit Section option on section 2, read at several frame sizes, then undone.
  // Usage: node scripts/oracle-probe.mjs OPTION '["Design","Vertical top"]' [name]
  const [tab, label] = JSON.parse(process.argv[3]);
  const name = process.argv[4] || 'OPTION';
  const i = 2;
  const start = { [i]: both(i) };
  const READ = `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}];
    const fe = sec.querySelector('.fluid-engine'), ws = W.getComputedStyle(sec.querySelector('.content-wrapper'));
    return JSON.stringify({ w: W.innerWidth, h: W.innerHeight, classes: [...sec.classList].filter((c) => /height--|alignment--/.test(c)).join(' '), inline: sec.getAttribute('style'),
      height: Math.round(sec.getBoundingClientRect().height * 10) / 10, minHeight: W.getComputedStyle(sec).minHeight, padTop: ws.paddingTop, padBottom: ws.paddingBottom,
      gridHeight: Math.round(fe.getBoundingClientRect().height * 10) / 10, gridTop: Math.round((fe.getBoundingClientRect().top - sec.getBoundingClientRect().top) * 10) / 10 }); })()`;
  const { hoverSection } = await import('./oracle/ui.mjs');
  const openPanel = async () => { await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 }); };
  await openPanel(); await escape();
  await openPanel();
  const help = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && /fill screen will/i.test(e.textContent)).map((e) => e.textContent.trim())))()`);
  await click(`() => [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === ${'TAB'})`.replace('TAB', JSON.stringify(tab)), { wait: 1200 });
  await click(`() => { const L = ${'LBL'}; const hit = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame') && (e.getAttribute('aria-label') === L || (e.childElementCount === 0 && e.textContent.trim() === L))).pop(); return hit && (hit.closest('button, label, [role=radio], [role=button], [role=switch]') || hit); }`.replace('LBL', JSON.stringify(label)), { wait: 2500 });
  if (saveDisabled() === true) throw new Error(`${label} changed nothing`);
  await escape();
  const reads = [evalJs(S, READ)];
  for (const [w, h] of [[375, 700], [768, 1000], [1280, 800], [1920, 1000]]) {
    evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const [k, v] of [['width', '${w}px'], ['height', '${h}px'], ['max-width', 'none'], ['min-width', '0'], ['flex', 'none']]) f.style.setProperty(k, v, 'important'); return 'true'; })()`);
    await pause(1500);
    reads.push(evalJs(S, READ));
  }
  evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const k of ['width', 'height', 'max-width', 'min-width', 'flex']) f.style.removeProperty(k); return 'true'; })()`);
  await pause(1500);
  for (const r of reads) console.log(JSON.stringify(r));
  const steps = await restore(start, [i]);
  write(name, { question: `What does Edit Section > ${tab} > ${label} change, at several frame sizes?`, section: i, help, reads, undoSteps: steps });
}

if (which === 'DIVIDER') {
  // P5: Edit Section > Design > Divider on section 2. Record the options it reveals and the
  // divider's geometry (boxes, computed styles, SVG viewBox and path size), never its markup (O2).
  const i = 2;
  const start = Object.fromEntries([...Array(8).keys()].map((k) => [k, both(k)]));
  const { hoverSection } = await import('./oracle/ui.mjs');
  const openPanel = async () => { await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 }); };
  const PANEL_READ = `(() => { const ok = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.left > 1200 && !e.closest('#sqs-site-frame'); };
    return JSON.stringify({ text: [...new Set([...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && ok(e) && e.textContent.trim()).map((e) => e.textContent.trim().slice(0, 40)))],
      inputs: [...document.querySelectorAll('input, select')].filter(ok).map((e) => [e.type, e.getAttribute('aria-label') || e.closest('label')?.textContent.trim().slice(0, 30) || '', e.type === 'checkbox' ? e.checked : e.value, e.min, e.max].join('|')) }); })()`;
  const DIV_READ = `(() => { ${FRAME}
    const all = [...d.querySelectorAll('main#page .page-section')];
    const at = all.findIndex((x) => x.querySelector('.section-divider-display'));
    const sec = all[at >= 0 ? at : ${i}]; const sq = sec.getBoundingClientRect();
    const box = (e) => { const q = e.getBoundingClientRect(); return [q.left - sq.left, q.top - sq.top, q.width, q.height].map((v) => Math.round(v * 10) / 10); };
    const divs = [...sec.querySelectorAll('[class*=divider]')];
    return JSON.stringify({ index: at, frame: [W.innerWidth, W.innerHeight], section: box(sec), sectionClasses: [...sec.classList].filter((c) => /divider|height--/.test(c)).join(' '), sectionStyle: sec.getAttribute('style'),
      wrapPad: W.getComputedStyle(sec.querySelector('.content-wrapper')).padding,
      parts: divs.map((e) => { const cs = W.getComputedStyle(e); const svg = e.tagName.toLowerCase() === 'svg' ? e : null;
        return { tag: e.tagName.toLowerCase(), cls: [...e.classList].join(' '), box: box(e), position: cs.position, bottom: cs.bottom, height: cs.height, fill: cs.fill, bg: cs.backgroundColor, clip: cs.clipPath.slice(0, 60), mask: (cs.maskImage || cs.webkitMaskImage || '').slice(0, 30), transform: cs.transform,
          viewBox: svg && svg.getAttribute('viewBox'), preserve: svg && svg.getAttribute('preserveAspectRatio'), paths: svg ? [...svg.querySelectorAll('path, use, rect')].map((p) => p.tagName + ':' + (p.getAttribute('d') || '').length + 'ch') : null }; }),
      // The clip edge as numbers: for 41 x positions across the section, the y (in px from the
      // section top) where the clip path's fill begins at the bottom, found by bisection.
      edge: (() => { const path = sec.querySelector('.section-divider-clip'); if (!path) return null; const svg = path.ownerSVGElement;
        const P = (x, y) => { const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; return path.isPointInFill(pt); };
        const units = path.closest('clipPath')?.getAttribute('clipPathUnits');
        return { units, ys: [...Array(41).keys()].map((k) => { const x = k / 40; let lo = 0, hi = 1; if (!P(x, 0.5)) return null; for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (P(x, m)) lo = m; else hi = m; } return Math.round(lo * sq.height * 10) / 10; }) }; })(),
      next: all[at + 1] ? box(all[at + 1]) : null,
      clipped: [sec, ...sec.querySelectorAll('*')].filter((e) => W.getComputedStyle(e).clipPath.includes("url")).map((e) => [...e.classList][0] || e.tagName),
      strokeVisible: (() => { const e = sec.querySelector('.section-divider-svg-stroke'); if (!e) return null; const cs = W.getComputedStyle(e); return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity }; })(),
      pad: W.getComputedStyle(sec).paddingBottom, wrapH: Math.round(sec.querySelector('.content-wrapper').getBoundingClientRect().height * 10) / 10,
      stroke: (() => { const e = sec.querySelector('.section-divider-stroke'); if (!e) return null; const cs = W.getComputedStyle(e); return { width: cs.strokeWidth, color: cs.stroke, dash: cs.strokeDasharray, vectorEffect: cs.vectorEffect }; })(),
      vars: Object.fromEntries([...sec.getAttribute('style').matchAll(/(--[\w-]*divider[\w-]*):\s*([^;]+)/g)].map((m) => [m[1], m[2]])) }); })()`;
  await openPanel(); await escape(); await openPanel();
  const before = evalJs(S, DIV_READ);
  await click(`() => { const e = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.getAttribute('aria-label') === 'Divider'); return e && (e.closest('label, [role=switch]') || e); }`, { wait: 2500 });
  if (saveDisabled() === true) throw new Error('Divider changed nothing');
  const panelOn = evalJs(S, PANEL_READ);
  const on = evalJs(S, DIV_READ);
  console.log('panel', JSON.stringify(panelOn)); console.log('on', JSON.stringify(on));
  // The Shape picker: open it, list the shape names, close it without choosing.
  let shapes = null;
  try {
    await click(`() => { const L = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === 'Shape' && e.getBoundingClientRect().width > 0).pop(); const r = L.getBoundingClientRect(); return [...document.querySelectorAll('button, [role=button], [role=combobox]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 0 && Math.abs(q.top + q.height / 2 - (r.top + r.height / 2)) < 20 && q.left > r.left; })[0] || L.closest('button, [role=button]') || L; }`, { wait: 1500 });
    shapes = evalJs(S, PANEL_READ);
    console.log('shapes', JSON.stringify(shapes));
  } catch (e) { shapes = { error: String(e.message).slice(0, 80) }; }
  await escape();
  const widths = {};
  for (const [w, h] of [[375, 700], [1280, 800]]) {
    evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const [k, v] of [['width', '${w}px'], ['height', '${h}px'], ['max-width', 'none'], ['min-width', '0'], ['flex', 'none']]) f.style.setProperty(k, v, 'important'); return 'true'; })()`);
    await pause(1500); widths[`${w}x${h}`] = evalJs(S, DIV_READ);
  }
  evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const k of ['width', 'height', 'max-width', 'min-width', 'flex']) f.style.removeProperty(k); return 'true'; })()`);
  await pause(1200);
  const steps = await restore(start, [...new Set([i, on.index])].filter((k) => k >= 0));
  write('DIVIDER', { question: 'What does the section Divider add, and which options does it show?', section: i, frame: '1600x945 unless named', before, panelOn, shapes, on, widths, undoSteps: steps });
}

if (which === 'DIVSHAPES') {
  // P5: the divider's Shape, Stroke, Color and Thickness controls. Turn Divider on, then
  // screenshot the panel and click each control row once, recording what opens. Undone after.
  const i = 2;
  const start = Object.fromEntries([...Array(8).keys()].map((k) => [k, both(k)]));
  const { hoverSection } = await import('./oracle/ui.mjs');
  const shot = (name) => execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS || '/tmp'}/${name}.png`]);
  const openPanel = async () => { await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 }); };
  const hasDivider = () => evalJs(S, `(() => JSON.stringify(!![...document.querySelectorAll('input[type=checkbox]')].find((x) => x.getAttribute('aria-label') === 'Divider')))()`);
  for (let t = 0; t < 3 && hasDivider() !== true; t++) { await escape(); await openPanel(); }
  await click(`() => { const e = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.getAttribute('aria-label') === 'Divider'); return e && (e.closest('label, [role=switch]') || e); }`, { wait: 2500 });
  const PANEL = `(() => { const ok = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.left > 1200 && !e.closest('#sqs-site-frame'); };
    return JSON.stringify({ text: [...new Set([...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && ok(e) && e.textContent.trim()).map((e) => e.textContent.trim().slice(0, 40)))],
      controls: [...document.querySelectorAll('button, input, select, [role=button], [role=slider], [role=combobox]')].filter(ok).map((e) => [e.tagName.toLowerCase(), e.type || '', e.getAttribute('aria-label') || e.textContent.trim().slice(0, 30), e.value ?? '', e.min || '', e.max || ''].join('|')) }); })()`;
  evalJs(S, `(() => { const e = [...document.querySelectorAll('body *')].find((x) => x.childElementCount === 0 && x.textContent.trim() === 'Thickness'); if (e) e.scrollIntoView({ block: 'center' }); return 'true'; })()`);
  await pause(800); shot('divider-panel');
  const out = { on: evalJs(S, PANEL) };
  for (const label of ['Shape', 'Stroke', 'Color']) {
    try {
      await click(`() => { const L = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === ${'LBL'} && e.getBoundingClientRect().left > 1200).pop(); return L.closest('button, [role=button], li, [class*=row], [class*=Row]') || L.parentElement; }`.replace('LBL', JSON.stringify(label)), { wait: 1500 });
      shot(`divider-${label.toLowerCase()}`);
      out[label] = evalJs(S, PANEL);
      console.log(label, JSON.stringify(out[label]).slice(0, 600));
      execFileSync('cmux', ['browser', '--surface', S, 'press', 'Escape']); await pause(800);
      if (hasDivider() !== true) { await openPanel(); }
    } catch (e) { out[label] = { error: String(e.message).slice(0, 80) }; }
  }
  await escape();
  const steps = await restore(start, [...Array(8).keys()]);
  write('DIVSHAPES', { question: 'Which options do the divider Shape, Stroke and Color controls offer?', section: i, ...out, undoSteps: steps });
}

if (which === 'DIVOPTS') {
  // P5: each divider Stroke and Thickness option, by row and position, and the shape
  // settings behind Edit Settings. Reads the stroke and the edge after each; undone after.
  const i = 2;
  const start = Object.fromEntries([...Array(8).keys()].map((k) => [k, both(k)]));
  const { hoverSection } = await import('./oracle/ui.mjs');
  const shot = (name) => execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS || '/tmp'}/${name}.png`]);
  const openPanel = async () => { await hoverSection(i);
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 2 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 }); };
  const hasDivider = () => evalJs(S, `(() => JSON.stringify(!![...document.querySelectorAll('input[type=checkbox]')].find((x) => x.getAttribute('aria-label') === 'Divider')))()`);
  const ensurePanel = async () => { for (let t = 0; t < 3 && hasDivider() !== true; t++) { await escape(); await openPanel(); } };
  await ensurePanel();
  await click(`() => { const e = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.getAttribute('aria-label') === 'Divider'); return e && (e.closest('label, [role=switch]') || e); }`, { wait: 2500 });
  const READ = `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}]; const sq = sec.getBoundingClientRect();
    const e = sec.querySelector('.section-divider-stroke'); const cs = e && W.getComputedStyle(e); const svg = sec.querySelector('.section-divider-svg-stroke');
    const blk = sec.querySelector('.section-divider-block');
    return JSON.stringify({ height: Math.round(sq.height * 10) / 10, band: blk && Math.round(blk.getBoundingClientRect().height * 10) / 10, classes: [...sec.classList].filter((c) => /divider/.test(c)).join(' '),
      stroke: cs && { width: cs.strokeWidth, color: cs.stroke, dash: cs.strokeDasharray, linecap: cs.strokeLinecap, svgDisplay: W.getComputedStyle(svg).display, opacity: cs.opacity } }); })()`;
  const rowOption = (row, k) => click(`() => { const L = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === ${'ROW'} && e.getBoundingClientRect().left > 1200).pop(); let r = L; while (r && r.querySelectorAll('label[value]').length < 2) r = r.parentElement; return r && r.querySelectorAll('label[value]')[${'K'}]; }`.replace('ROW', JSON.stringify(row)).replace('K', String(k)), { wait: 1800 });
  const out = { on: evalJs(S, READ), options: {} };
  for (const [row, k, name] of [['Stroke', 0, 'none'], ['Stroke', 2, 'dashed'], ['Stroke', 1, 'solid'], ['Thickness', 0, 'S'], ['Thickness', 2, 'L'], ['Thickness', 3, 'custom'], ['Thickness', 1, 'M']]) {
    try { await ensurePanel(); await rowOption(row, k); out.options[`${row} ${name}`] = evalJs(S, READ); }
    catch (e) { out.options[`${row} ${name}`] = { error: String(e.message).slice(0, 80) }; }
    console.log(row, name, JSON.stringify(out.options[`${row} ${name}`]));
  }
  try {
    await ensurePanel();
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Edit Settings' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
    shot('divider-settings');
    out.settings = evalJs(S, `(() => { const ok = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.left > 1150 && !e.closest('#sqs-site-frame'); };
      return JSON.stringify({ text: [...new Set([...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && ok(e) && e.textContent.trim()).map((e) => e.textContent.trim().slice(0, 40)))],
        inputs: [...document.querySelectorAll('input, [role=slider]')].filter(ok).map((e) => [e.type || e.getAttribute('role'), e.getAttribute('aria-label') || '', e.value ?? e.getAttribute('aria-valuenow'), e.min || e.getAttribute('aria-valuemin') || '', e.max || e.getAttribute('aria-valuemax') || '', e.step || ''].join('|')) }); })()`);
    console.log('settings', JSON.stringify(out.settings));
  } catch (e) { out.settings = { error: String(e.message).slice(0, 80) }; }
  await escape();
  const steps = await restore(start, [...Array(8).keys()]);
  write('DIVOPTS', { question: 'What do the divider Stroke and Thickness options change, and what does Edit Settings offer?', section: i, frame: '1600x945', ...out, undoSteps: steps });
}

if (which === 'TOOLBARS') {
  // U4, L5, L6, X10, E4: the controls each block type offers on desktop and on phones.
  // Select a block, list every visible control outside the top bar and the section
  // toolbars; for text, click again to edit and list the formatting toolbar. Read only.
  const SECTION_UI = /^(edit section|open section settings|view layouts|duplicate section|save section|move section (up|down)|remove section|add section|add block|layers|desktop view|mobile view|toggle site styles editing|toggle preview mode|save|exit|undo|redo)$/i;
  const CONTROLS = `(() => { ${FRAME}
    const vis = (e, w) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < w.innerHeight && w.getComputedStyle(e).visibility !== 'hidden'; };
    const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('data-tooltip') || e.textContent.trim()).slice(0, 40);
    const pick = (root, w, where) => [...root.querySelectorAll('button, [role=button], [role=menuitem], [role=radio], [role=checkbox], select, input')].filter((e) => vis(e, w) && !e.closest('.fe-block .sqs-html-content, .sqs-block-content form') && (where !== 'top' || e.getBoundingClientRect().top > 56))
      .map((e) => ({ name: name(e), pressed: e.getAttribute('aria-pressed') || e.getAttribute('aria-checked') || '', where })).filter((c) => c.name && !${SECTION_UI.toString()}.test(c.name));
    return JSON.stringify([...pick(document, window, 'top'), ...pick(d, W, 'frame')]); })()`;
  const kinds = { text: [2, 1], shape: [2, 2], button: [0, 2] };
  const out = {};
  for (const layout of ['Desktop', 'Mobile']) {
    await view(layout);
    await pause(1500);
    out[layout] = {};
    for (const [kind, [i, k]] of Object.entries(kinds)) {
      const id = blockIds(i)[k];
      await select(i, id); await pause(900);
      const r = { selected: evalJs(S, CONTROLS) };
      r.locked = evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.querySelector('.fe-block[data-block-id="${id}"]')?.getAttribute('data-is-locked')); })()`);
      if (kind === 'text') {
        await select(i, id); await pause(1200);
        r.editing = evalJs(S, `(() => { ${FRAME} return JSON.stringify(!!d.querySelector('.fe-block[data-block-id="${id}"] [contenteditable=true]')); })()`);
        r.formatting = evalJs(S, CONTROLS);
        await escape();
      }
      out[layout][kind] = r;
      console.log(layout, kind, JSON.stringify(r).slice(0, 700));
      await escape(); await deselect(i);
    }
  }
  await view('Desktop');
  if (saveDisabled() !== true) throw new Error('The probe changed the page; it must stay read only');
  write('TOOLBARS', { question: 'Which controls does each block type offer when selected, on desktop and on phones?', blocks: kinds, ...out });
}

if (which === 'EDITPANEL') {
  // L6: open the text block's Edit panel on desktop and on phones and list every label,
  // to see whether phones offer their own font size or other overrides. Read only.
  const [i, k] = [2, 1];
  const LABELS = `(() => { const vis = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && !e.closest('#sqs-site-frame'); };
    const panel = [...document.querySelectorAll('[role=dialog], [class*=panel], [class*=Panel], [class*=popover], [class*=Popover]')].filter(vis).filter((e) => e.getBoundingClientRect().top > 50 && e.getBoundingClientRect().width < 700).pop();
    if (!panel) return JSON.stringify(null);
    return JSON.stringify({ text: [...new Set([...panel.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && vis(e) && e.textContent.trim()).map((e) => e.textContent.trim().slice(0, 40)))],
      controls: [...panel.querySelectorAll('button, input, select, [role=tab], [role=slider]')].filter(vis).map((e) => (e.getAttribute('aria-label') || e.textContent.trim() || e.type).slice(0, 30) + (e.value && e.tagName === 'INPUT' ? '=' + e.value : '')) }); })()`;
  const out = {};
  for (const layout of ['Desktop', 'Mobile']) {
    await view(layout); await pause(1500);
    const id = blockIds(i)[k];
    await select(i, id); await pause(900);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Edit' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 80)`, { wait: 2000 });
    out[layout] = { tabs: evalJs(S, LABELS) };
    for (const tab of (out[layout].tabs?.controls || []).filter((c) => /^(Design|Animation|Content|Style|Format)$/.test(c))) {
      await click(`() => [...document.querySelectorAll('button, [role=tab]')].find((x) => x.textContent.trim() === ${'TAB'} && x.getBoundingClientRect().width > 0)`.replace('TAB', JSON.stringify(tab)), { wait: 1200 });
      out[layout][tab] = evalJs(S, LABELS);
    }
    console.log(layout, JSON.stringify(out[layout]).slice(0, 900));
    await escape(); await escape(); await deselect(i);
  }
  await view('Desktop');
  if (saveDisabled() !== true) throw new Error('The probe changed the page; it must stay read only');
  write('EDITPANEL', { question: 'Does the text Edit panel offer phone-only settings such as font size?', block: [i, k], ...out });
}

if (which === 'TEXTBAR') {
  // E4: the text formatting toolbar. Edit the paragraph of demo section 2, select its
  // first word, list every control that appears, open each menu-like control once and
  // list its items. Nothing is applied; Escape closes each menu. Read only.
  const [i, k] = [2, 1];
  const id = blockIds(i)[k];
  const CONTROLS = `(() => { ${FRAME}
    const vis = (e, w) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.bottom > 0 && q.top < w.innerHeight; };
    const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent.trim()).slice(0, 40);
    const skip = /^(edit section|open section settings|view layouts|duplicate section|save section|move section (up|down)|remove section|add section|add block|open layers panel|desktop view|mobile view|toggle site styles editing|toggle preview mode|save|exit|undo|redo|write|edit|align vertically|pin|move forward|move backward|duplicate|remove)$/i;
    const pick = (root, w, where) => [...root.querySelectorAll('button, [role=button], [role=menuitem], [role=option], [role=menuitemradio], select')].filter((e) => vis(e, w) && (where === 'frame' || e.getBoundingClientRect().top > 56) && !e.closest('nav, [class*=sidebar], [class*=Sidebar]'))
      .map((e) => ({ name: name(e), pressed: e.getAttribute('aria-pressed') || e.getAttribute('aria-checked') || e.getAttribute('aria-expanded') || '', where })).filter((c) => c.name && !skip.test(c.name));
    return JSON.stringify([...pick(document, window, 'top'), ...pick(d, W, 'frame')]); })()`;
  await select(i, id); await pause(900);
  await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1800 });
  evalJs(S, `(() => { ${FRAME} const p = d.querySelector('.fe-block[data-block-id="${id}"] [contenteditable=true] p'); const t = p.firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, Math.max(1, t.textContent.indexOf(' '))); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new W.Event('selectionchange')); p.dispatchEvent(new W.MouseEvent('mouseup', { bubbles: true })); return 'true'; })()`);
  await pause(1200);
  execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS || '/tmp'}/textbar.png`]);
  const bar = evalJs(S, CONTROLS);
  console.log('bar', JSON.stringify(bar.map((c) => c.name + (c.pressed ? '[' + c.pressed + ']' : '') + (c.where === 'frame' ? '*' : ''))));
  const menus = {};
  for (const c of bar.filter((c) => c.pressed === 'false' || /style|size|color|align|list|link|more|font|format/i.test(c.name)).slice(0, 8)) {
    try {
      await click(`() => { const all = [...document.querySelectorAll('button, [role=button]')].filter((e) => (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent.trim()).slice(0, 40) === ${'NAME'} && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().top > 56); return all[0]; }`.replace('NAME', JSON.stringify(c.name)), { wait: 1000 });
      execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS || '/tmp'}/textbar-${c.name.replace(/\W+/g, '-').toLowerCase()}.png`]);
      const after = evalJs(S, CONTROLS).map((x) => x.name);
      menus[c.name] = after.filter((n) => !bar.some((b) => b.name === n));
      console.log('menu', c.name, JSON.stringify(menus[c.name]));
      execFileSync('cmux', ['browser', '--surface', S, 'press', 'Escape']); await pause(600);
    } catch (e) { menus[c.name] = { error: String(e.message).slice(0, 60) }; }
  }
  await escape(); await escape(); await deselect(i);
  let n = 0; while (n < 5 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(800); }
  if (saveDisabled() !== true) throw new Error('The probe changed the page; it must stay read only');
  write('TEXTBAR', { question: 'Which controls does the text formatting toolbar offer, and what do its menus hold?', block: [i, k], bar, menus });
}

if (which === 'TEXTOPS') {
  // E4: what HTML each formatting action makes. For each action: Write on the paragraph of
  // demo section 2, select its first word, apply the action (shortcut key or toolbar
  // button), read the text block's HTML, undo until Save is disabled again.
  const [i, k] = [2, 1];
  const id = blockIds(i)[k];
  const HTML = `(() => { ${FRAME} const blk = d.querySelector('.fe-block[data-block-id="${id}"]'); const c = blk.querySelector('.ProseMirror') || blk.querySelector('.sqs-html-content'); return JSON.stringify(c.innerHTML.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space:pre-wrap;"/g, '').replace(/ class="([^"]*)"/g, (m, v) => (/sqsrte|preFade|fade|text-align/.test(v) ? m : '')).slice(0, 700)); })()`;
  const startWrite = async () => {
    await select(i, id); await pause(900);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
    evalJs(S, `(() => { ${FRAME} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror'); pm.focus(); const p = pm.querySelector('p'); const t = p.firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); return 'true'; })()`);
    await pause(900);
  };
  const BAR = `(() => { const style = [...document.querySelectorAll('button, [role]')].find((e) => e.getAttribute('aria-label') === 'Text Style' && e.getBoundingClientRect().width > 0); if (!style) return JSON.stringify(null);
    let bar = style; while (bar.parentElement && bar.getBoundingClientRect().width < 600) bar = bar.parentElement;
    return JSON.stringify([...bar.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().width > 12 && e.getBoundingClientRect().width < 60 && (e.getAttribute('aria-label') || e.getAttribute('role') || e.tagName === 'BUTTON')).map((e) => [e.tagName.toLowerCase(), e.getAttribute('role') || '', e.getAttribute('aria-label') || '', Math.round(e.getBoundingClientRect().left)].join('|'))); })()`;
  const key = (k2, mods) => evalJs(S, `(() => { ${FRAME} const t = d.activeElement; const o = { key: '${k2}', code: '${/^[0-9]$/.test(k2) ? 'Digit' + k2 : 'Key' + k2.toUpperCase()}', metaKey: true, altKey: ${mods.includes('alt')}, shiftKey: ${mods.includes('shift')}, bubbles: true, cancelable: true }; t.dispatchEvent(new W.KeyboardEvent('keydown', o)); t.dispatchEvent(new W.KeyboardEvent('keyup', o)); return 'true'; })()`);
  const undoAll = async () => { await escape(); await escape(); let n = 0; while (n < 6 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } await deselect(i); return n; };
  await startWrite();
  const bar = evalJs(S, BAR);
  console.log('bar', JSON.stringify(bar));
  const base = evalJs(S, HTML);
  await undoAll();
  const ACTIONS = (process.argv[3] ? JSON.parse(process.argv[3]) : null) || [['Heading 1', 'Text Style>Heading 1'], ['Heading 4', 'Text Style>Heading 4'], ['Paragraph 1', 'Text Style>Paragraph 1'], ['Paragraph 3', 'Text Style>Paragraph 3'], ['Monospace', 'Text Style>Monospace'],
    ['Bold', 'Bold'], ['Italic', 'Italic'], ['Strike', 'Strike'], ['Scaled Text', 'Scaled Text'], ['Quote', 'Quote'], ['Bullet List', 'Bullet List'], ['Numbered List', 'Numbered List'], ['Indent', 'Indent'], ['Align center', 'Text Alignment>center'], ['Align right', 'Text Alignment>right'], ['Align justify', 'Text Alignment>justify']];
  const out = { base };
  for (const [name, how] of ACTIONS) {
    try {
      await startWrite();
      if (Array.isArray(how)) key(how[0], how[1]);
      else {
        const [label, idx] = how.split('>');
        await click(`() => [...document.querySelectorAll('button, [role=button], [role=checkbox], [role=radio], [role=switch]')].find((e) => (e.getAttribute('aria-label') || '').toLowerCase().startsWith(${'LBL'}.toLowerCase()) && e.getBoundingClientRect().width > 0)`.replace('LBL', JSON.stringify(label)), { wait: 1000 });
        if (idx) {
          out.alignItems = out.alignItems || evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('[aria-label]')].filter((e) => /align/i.test(e.getAttribute('aria-label')) && e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('aria-label') + '|' + (e.getAttribute('role') || e.tagName))))()`);
          await click(`() => { const want = IX;
            const byLabel = [...document.querySelectorAll('[aria-label]')].find((e) => e.getBoundingClientRect().width > 0 && new RegExp(want, 'i').test(e.getAttribute('aria-label')) && !['Text Alignment', 'Text Style'].includes(e.getAttribute('aria-label')));
            if (byLabel) return byLabel;
            const leaf = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === want && e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame'));
            return leaf && (leaf.closest('[role=menuitem], [role=option], [role=menuitemradio], [role=button], button, li') || leaf); }`.replace('IX', JSON.stringify(idx)), { wait: 1000 });
        }
      }
      await pause(900);
      out[name] = { html: evalJs(S, HTML), changed: saveDisabled() !== true };
    } catch (e) { out[name] = { error: String(e.message).slice(0, 80) }; }
    out[name].undoSteps = await undoAll();
    console.log(name, JSON.stringify(out[name]).slice(0, 300));
  }
  if (saveDisabled() !== true) throw new Error('The probe left unsaved changes');
  console.log('align items', JSON.stringify(out.alignItems));
  write('TEXTOPS', { question: 'What HTML does each text formatting action produce on a selected word?', block: [i, k], bar, ...out });
}

if (which === 'PASTE') {
  // E5: what the text editor keeps from pasted HTML. Each sample replaces the content of the
  // paragraph block of demo section 2 (Write, select all, paste), the result is read, then
  // undone until Save is disabled again.
  const [i, k] = [2, 1];
  const id = blockIds(i)[k];
  const SAMPLES = [
    ['marks', '<b>bold</b> <i>it</i> <u>under</u> <s>strike</s> <strong>strong</strong> <em>em</em>'],
    ['inline style', '<span style="color:red;font-size:30px;font-family:Comic Sans MS;background:yellow">styled</span> plain'],
    ['divs', '<div>one</div><div>two</div>'],
    ['headings', '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>'],
    ['br', '<p>a<br>b</p>'],
    ['link', '<p><a href="https://example.com/x" target="_blank" title="t">link</a> after</p>'],
    ['lists', '<ul><li>x</li><li>y</li></ul><ol><li>z</li></ol>'],
    ['table', '<table><tr><td>c1</td><td>c2</td></tr><tr><td>c3</td><td>c4</td></tr></table>'],
    ['image', '<p>before <img src="https://example.com/x.png" alt="x"> after</p>'],
    ['word', '<p class="MsoNormal" style="margin:0cm;mso-line-height-alt:12pt"><span lang="EN-US" style="font-size:11pt;mso-bidi-font-weight:bold">word text</span><o:p></o:p></p>'],
    ['code', '<pre>code  spaced\nline2</pre><p><code>inline</code> text</p>'],
    ['quote', '<blockquote>q text</blockquote>'],
    ['align', '<p style="text-align:center">c</p><p align="right">r</p>'],
    ['sup sub mark', '<p><mark>hi</mark> x<sup>2</sup> y<sub>3</sub></p>'],
  ];
  const PLAIN = 'line one\nline two\n\nline four';
  const undoAll = async () => { await escape(); await escape(); let n = 0; while (n < 8 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } await deselect(i); return n; };
  const startWrite = async () => {
    await select(i, id); await pause(900);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
  };
  const clean = (h) => h.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space:pre-wrap;"/g, '');
  const out = {};
  for (const [name, html] of [...SAMPLES, ['plain text', null]]) {
    try {
      await startWrite();
      let r;
      if (html) r = await pasteHtml(id, html);
      else r = evalJs(S, `(async () => { ${FRAME} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror[contenteditable=true]'); pm.focus();
        const rg = d.createRange(); rg.selectNodeContents(pm); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(rg); await new Promise((res) => setTimeout(res, 250));
        const dt = new W.DataTransfer(); dt.setData('text/plain', ${JSON.stringify(PLAIN)}); pm.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        await new Promise((res) => setTimeout(res, 400)); return JSON.stringify(pm.innerHTML); })()`);
      out[name] = { pasted: html ?? PLAIN, result: clean(r) };
    } catch (e) { out[name] = { error: String(e.message).slice(0, 80) }; }
    out[name].undoSteps = await undoAll();
    console.log(name.padEnd(13), JSON.stringify(out[name].result || out[name].error).slice(0, 300));
  }
  if (saveDisabled() !== true) throw new Error('The probe left unsaved changes');
  write('PASTE', { question: 'What does the text editor keep from pasted HTML and plain text?', block: [i, k], samples: out });
}

if (which === 'EXIT') {
  // Y3: what the editor says about unsaved work. Make one change (ArrowRight on a selected
  // block), read the top bar, click Exit and record the dialog, then choose the option that
  // keeps editing (Escape; never Save or Exit), undo, and check Save is disabled again.
  const [i, k] = [2, 2];
  const id = blockIds(i)[k];
  const BAR = `(() => { const t = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.getBoundingClientRect().top < 55 && e.getBoundingClientRect().width > 0 && e.textContent.trim()).map((e) => e.textContent.trim());
    const save = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save'); return JSON.stringify({ text: [...new Set(t)], saveDisabled: save?.disabled }); })()`;
  const shot = (n) => process.env.SHOTS && execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS}/${n}.png`]);
  const start = both(i);
  const out = { clean: evalJs(S, BAR) };
  await select(i, id); await pause(600);
  const { key: press } = await import('./oracle/ui.mjs');
  await press('ArrowRight'); await pause(1200);
  out.dirty = evalJs(S, BAR);
  console.log('dirty', JSON.stringify(out.dirty));
  if (out.dirty.saveDisabled !== false) throw new Error('The change did not make the page dirty');
  if (process.env.DIRTY_ONLY) { let n = 0; while (n < 4 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } console.log('undone', n, saveDisabled()); process.exit(0); }
  await escape(); await deselect(i);
  // A native confirm() would not show in the DOM: record any call and answer Cancel.
  evalJs(S, `(() => { window.__asked = []; for (const f of ['confirm', 'alert', 'prompt']) { const name = f; window[name] = (m) => { window.__asked.push([name, String(m)]); return name === 'confirm' ? false : null; }; } return 'true'; })()`);
  await click(`() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Exit' && x.getBoundingClientRect().width > 0)`, { wait: 1800 });
  shot('exit-dialog');
  out.nativeDialogs = evalJs(S, `(() => JSON.stringify(window.__asked || 'page changed'))()`);
  out.stillEditing = evalJs(S, `(() => JSON.stringify(!![...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save' && x.getBoundingClientRect().width > 0)))()`);
  console.log('native', JSON.stringify(out.nativeDialogs), 'stillEditing', out.stillEditing);
  if (!out.stillEditing) {
    // Exit left the editor: write what happened, then check the saved page is unchanged.
    out.dialog = null;
    reload(S); await pause(1500); try { execFileSync('cmux', ['browser', '--surface', S, 'dialog', 'accept']); } catch {}
    ensurePage(); evalJs(S, ENTER_EDIT); waitFor(S, READY, 30);
    const now = both(i);
    out.savedUnchanged = JSON.stringify(now) === JSON.stringify(start);
    write('EXIT', { question: 'How does the editor mark unsaved work, and what does Exit do with it?', block: [i, k], ...out });
    if (!out.savedUnchanged) throw new Error('The saved page changed after Exit');
    process.exit(0);
  }
  // The dialog has no Cancel (Save and Exit only); Escape closes it and keeps editing.
  out.dialog = evalJs(S, `(() => { const h = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && /without saving/i.test(e.textContent) && e.getBoundingClientRect().width > 0);
    if (!h) return JSON.stringify(null); let box = h; while (box.parentElement && !box.querySelector('button')) box = box.parentElement;
    return JSON.stringify({ text: [...new Set([...box.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()))], buttons: [...box.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim() || x.getAttribute('aria-label')) }); })()`);
  console.log('dialog', JSON.stringify(out.dialog));
  execFileSync('cmux', ['browser', '--surface', S, 'press', 'Escape']); await pause(1500);
  out.kept = 'Escape';
  out.afterKeep = evalJs(S, BAR);
  let n = 0; while (n < 4 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
  out.afterUndo = evalJs(S, BAR);
  if (saveDisabled() !== true) throw new Error('Unsaved changes remain');
  write('EXIT', { question: 'How does the editor mark unsaved work, and what does Exit do with it?', block: [i, k], ...out });
}

if (which === 'AUTOSCROLL') {
  // G7: the auto-scroll speed near the window edge during a drag. Grab a block of demo
  // section 2, move the pointer to a fixed distance from the bottom (or top) edge of the
  // editor frame's window, sample scrollY every 50ms for 1.2s, move back to the middle,
  // release and undo. One run per distance.
  const [i, k] = [2, 2];
  const id = blockIds(i)[k];
  const dists = (process.argv[3] && JSON.parse(process.argv[3])) || [-20, 2, 10, 25, 40, 60, 80, 100, 130];
  const out = { frame: evalJs(S, `(() => { ${FRAME} return JSON.stringify([W.innerWidth, W.innerHeight]); })()`), runs: {} };
  for (const edge of ['bottom', 'top']) {
    for (const dist of dists) {
      await select(i, id); await pause(500);
      const r = evalJs(S, `(async () => { ${FRAME}
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        const b = d.querySelector('.fe-block[data-block-id="${id}"]');
        // Put the block in the middle of the window first.
        { const q0 = b.getBoundingClientRect(); W.scrollTo(0, W.scrollY + q0.top + q0.height / 2 - W.innerHeight / 2); await sleep(300); }
        const q = b.getBoundingClientRect(); const x = q.left + q.width / 2, y0 = q.top + q.height / 2;
        const o = { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, view: W };
        const at = (t, cx, cy, buttons) => { const tgt = t === 'down' ? b : d; tgt.dispatchEvent(new W.PointerEvent('pointer' + t, { ...o, clientX: cx, clientY: cy, buttons })); tgt.dispatchEvent(new W.MouseEvent('mouse' + t, { ...o, clientX: cx, clientY: cy, buttons })); };
        at('down', x, y0, 1);
        for (let s = 1; s <= 4; s++) { at('move', x, y0 + s * 5, 1); await sleep(25); }
        const y = ${edge === 'bottom' ? `W.innerHeight - ${dist}` : `${dist}`};
        const steps = 8; for (let s = 1; s <= steps; s++) { at('move', x, y0 + 20 + (y - y0 - 20) * s / steps, 1); await sleep(20); }
        const t0 = performance.now(), s0 = W.scrollY; const samples = [];
        while (performance.now() - t0 < 1200) { await sleep(50); at('move', x, y, 1); samples.push([Math.round(performance.now() - t0), Math.round((W.scrollY - s0) * 10) / 10]); }
        at('move', x, W.innerHeight / 2, 1); await sleep(150);
        at('up', x, W.innerHeight / 2, 0);
        return JSON.stringify({ y, samples }); })()`);
      await pause(600);
      let n = 0; while (n < 4 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
      await escape(); await deselect(i);
      const s1 = r.samples, last = s1.at(-1), mid = s1[Math.floor(s1.length / 2)];
      r.speed = Math.round(((last[1] - mid[1]) / ((last[0] - mid[0]) / 1000)) * 10) / 10;
      r.undoSteps = n;
      out.runs[`${edge} ${dist}`] = r;
      console.log(edge, dist, 'y', r.y, 'speed px/s', r.speed, 'scrolled', last[1], 'undo', n);
      if (saveDisabled() !== true) throw new Error('Unsaved changes remain');
    }
  }
  write('AUTOSCROLL', { question: 'How fast does the editor frame scroll while a dragged block is held near the window edge?', block: [i, k], ...out });
}

if (which === 'NEAR') {
  // X4: which blocks get data-is-near-dragged-block. Hold a drag of one block of a section at
  // several offsets (whole cells), read the flag on every other block, release and undo.
  // For each other block the gaps to the target area are counted in grid lines.
  const i = Number(process.argv[3] ?? 4);
  const ids = blockIds(i);
  const id = ids[0];
  const p = pitch(i);
  const areaOf = (bid) => area(i, bid);
  const start = Object.fromEntries(ids.map((b) => [b, areaOf(b)]));
  const OFFS = (process.argv[4] && JSON.parse(process.argv[4])) || [[0, 1], [1, 0], [2, 0], [3, 0], [4, 0], [6, 0], [0, 2], [0, 3], [0, 4], [0, 6], [-1, 0], [5, 3]];
  const runs = [];
  for (const [dc, dr] of OFFS) {
    await select(i, id); await pause(400);
    const mid = await hold(blockEl(i, id), dc * p.col, dr * p.row, {});
    await release({}); await pause(500);
    let n = 0; while (n < 4 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
    await escape(); await deselect(i);
    const [r0, c0, r1, c1] = start[id];
    const t = [r0 + dr, c0 + dc, r1 + dr, c1 + dc];
    const others = ids.filter((b) => b !== id).map((b) => {
      const [a0, b0, a1, b1] = start[b];
      const colGap = Math.max(0, b0 - t[3], t[1] - b1), rowGap = Math.max(0, a0 - t[2], t[0] - a1);
      const near = (mid.attrs || []).some((x) => x.id === b && x.near === 'true');
      return { id: b, area: start[b], colGap, rowGap, overlap: colGap === 0 && rowGap === 0, near };
    });
    runs.push({ by: [dc, dr], target: t, others });
    console.log(`by ${dc},${dr} target ${t.join('/')}:`, others.map((o) => `${o.id.slice(-5)} gap c${o.colGap} r${o.rowGap} ${o.near ? 'NEAR' : '-'}`).join(' | '));
    if (saveDisabled() !== true) throw new Error('Unsaved changes remain');
  }
  write('NEAR', { question: 'Which blocks get data-is-near-dragged-block while a block is held at a target?', section: i, dragged: id, start, runs });
}

if (which === 'T13') {
  // Default size and place of each block type: a scratch section at the end, one block
  // at a time (added, read, removed), then a reload that discards it all (nothing saved).
  // node scripts/oracle-probe.mjs T13 '["Code","Embed"]' [name] probes other types and also
  // records each new block's skeleton (tags and classes, no content) into parity/findings/<name>.json.
  const types = (process.argv[3] && JSON.parse(process.argv[3])) || ['Text', 'Image', 'Button', 'Video', 'Form', 'Accordion', 'Shape', 'Scrolling', 'Line'];
  const outName = process.argv[4] || 'T13';
  const SKELETON = (id) => `(() => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="${id}"]'); if (!b) return JSON.stringify(null);
    const sk = (e, depth) => { const cls = [...e.classList].filter((c) => !/^[a-z0-9]{6,}$/i.test(c) || /block/.test(c)).join('.'); const tag = e.tagName.toLowerCase() + (cls ? '.' + cls : '') + (e.getAttribute('data-block-type') ? '[type=' + e.getAttribute('data-block-type') + ']' : '');
      return depth > 4 ? tag : { [tag]: [...e.children].slice(0, 6).map((c) => sk(c, depth + 1)) }; };
    const q = b.getBoundingClientRect(); return JSON.stringify({ skeleton: sk(b, 0), size: [Math.round(q.width), Math.round(q.height)], text: b.innerText.trim().slice(0, 120) }); })()`;
  await addSection();
  const i = sectionCount() - 1;
  const results = {};
  for (const t of types) {
    try {
      const id = await addBlock(i, t);
      await escape();
      await pause(800);
      const extra = outName !== 'T13' ? evalJs(S, SKELETON(id)) : {};
      results[t] = { ...extra, area: area(i, id).join('/'), rows: evalJs(S, `(() => { ${FRAME} return JSON.stringify(W.getComputedStyle(d.querySelectorAll('main#page .fluid-engine')[${i}]).gridTemplateRows.split(' ').length); })()`) };
      await deselect(i);
      await removeBlock(i, id);
    } catch (e) {
      results[t] = { error: String(e.message).slice(0, 300) };
      if (process.env.SHOTS) execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS}/t13-${t}.png`]);
    }
    console.log(t, JSON.stringify(results[t]));
  }
  reload(S);
  await pause(1500);
  try { execFileSync('cmux', ['browser', '--surface', S, 'dialog', 'accept']); } catch {}
  ensurePage();
  const n = evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.querySelectorAll('main#page .fluid-engine').length); })()`);
  if (n !== 8) throw new Error(`after reload the page has ${n} sections, expected the saved 8`);
  write(outName, { question: 'Where does each block type land, and how big, when added to an empty section?' + (outName !== 'T13' ? ' What is its editor markup (tags and classes)?' : ''), section: 'scratch section at the end, removed by reload', results, savedSectionsAfterReload: n });
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

