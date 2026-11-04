// Multi-step experiments on the oracle demo page that one trace cannot hold.
// Each probe writes parity/findings/<item>.json. Every probe starts from a saved,
// clean page, undoes its steps, reloads, and checks the saved state came back (O1).
// Usage: node scripts/oracle-probe.mjs L4 | E3E6 | PANEL | INSET | SETTINGS [options json] | OPTION <[tab,label]> <name> | DIVIDER | DIVSHAPES | DIVOPTS | TOOLBARS | EDITPANEL | TEXTBAR | TEXTOPS [actions json] | PASTE | T13 [types json] [name] | EXIT | AUTOSCROLL [distances json] | NEAR [section] [offsets json] | TOOLBARGEO [cases json] | DESIGN [section] [block] [tests json] | SECTIONBAR [sections json] | UNBUILT [names json] | BUTTONEDIT | TEXTLINK | TEXTCOLOR | BLEND [section] [block] [options json] | BATCH | KEYS
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

if (which === 'TEXTCOLOR') {
  // E4: Text Color and Text Highlight on a selected word. Read the Text Color popover, pick each
  // palette color, then apply Text Highlight; read the HTML after each and undo until Save is
  // disabled again (O1).
  const [i, k] = [2, 1];
  const id = blockIds(i)[k];
  const HTML = `(() => { ${FRAME} const blk = d.querySelector('.fe-block[data-block-id="${id}"]'); const c = blk.querySelector('.ProseMirror') || blk.querySelector('.sqs-html-content'); return JSON.stringify(c.innerHTML.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space:pre-wrap;"/g, '').replace(/ class="([^"]*)"/g, (m, v) => (/sqsrte|preFade|fade|text-align/.test(v) ? m : '')).slice(0, 700)); })()`;
  const startWrite = async () => {
    await select(i, id); await pause(900);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
    evalJs(S, `(() => { ${FRAME} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror'); pm.focus(); const p = pm.querySelector('p'); const t = p.firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); return 'true'; })()`);
    await pause(900);
  };
  const undoAll = async () => { await escape(); await escape(); let n = 0; while (n < 6 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } await deselect(i); return n; };
  const BTN = (label) => `() => [...document.querySelectorAll('button, [role=button]')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(label)} && e.getBoundingClientRect().width > 0)`;
  // The popover: the smallest visible element that holds the Palette tab and swatches.
  const POP = `(() => { const tab = [...document.querySelectorAll('[role=tab], button')].find((e) => e.textContent.trim() === 'Palette' && e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame'));
    if (!tab) return JSON.stringify(null); let p = tab; while (p.parentElement && p.querySelectorAll('button, [role=radio], [role=option]').length < 6) p = p.parentElement; const r = p.getBoundingClientRect(); const vis = (e) => e.getBoundingClientRect().width > 0;
    const sw = [...p.querySelectorAll('button, [role=radio], [role=option]')].filter((e) => vis(e) && e !== tab && e.textContent.trim() !== 'Custom');
    sw.forEach((e, n) => { e.dataset.fxSw = String(n); });
    return JSON.stringify({ box: [r.x, r.y, r.width, r.height].map(Math.round), text: [...new Set([...p.querySelectorAll('*')].filter((e) => vis(e) && e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()))].slice(0, 30),
      swatches: sw.map((e) => { const q = e.getBoundingClientRect(); const c = getComputedStyle(e.querySelector('*') || e); return { label: e.getAttribute('aria-label') || e.title || e.textContent.trim(), role: e.getAttribute('role'), checked: e.getAttribute('aria-checked') || e.getAttribute('aria-pressed'), bg: getComputedStyle(e).backgroundColor, inner: c.backgroundColor, box: [q.x, q.y, q.width, q.height].map(Math.round) }; }) }); })()`;
  if (saveDisabled() !== true) throw new Error('The oracle has unsaved changes; stopping (O1)');
  const out = { block: [i, k] };
  await startWrite();
  out.base = evalJs(S, HTML);
  await undoAll();
  const open = async (label) => { await startWrite(); await click(BTN(label), { wait: 1500 }); };
  // Text Color: a Palette tab of five checkboxes named after the site colors, and Custom.
  await open('Text Color');
  out.colorPopover = evalJs(S, `(() => { const tab = [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.trim() === 'Palette' && e.getBoundingClientRect().width > 0); if (!tab) return JSON.stringify(null);
    let p = tab; while (p.parentElement && p.getBoundingClientRect().height < 110) p = p.parentElement; const r = p.getBoundingClientRect();
    return JSON.stringify({ box: [r.x, r.y, r.width, r.height].map(Math.round), tabs: [...p.querySelectorAll('[role=tab]')].map((e) => e.textContent.trim()),
      swatches: [...p.querySelectorAll('input')].map((e) => { const q = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), type: e.type, checked: e.checked, color: getComputedStyle(e.previousElementSibling || e.parentElement).backgroundColor, box: [q.x, q.y, q.width, q.height].map(Math.round) }; }) }); })()`);
  out.colorButton = evalJs(S, `(() => { const b = (${BTN('Text Color')})(); const r = b.getBoundingClientRect(); return JSON.stringify([r.x, r.y, r.width, r.height].map(Math.round)); })()`);
  console.log('color popover', JSON.stringify(out.colorPopover).slice(0, 600));
  await undoAll();
  out.colors = {};
  for (const name of (out.colorPopover?.swatches || []).map((x) => x.label)) {
    try {
      await open('Text Color');
      await click(`() => document.querySelector('input[aria-label="${name}"]')`, { wait: 1500 });
      out.colors[name] = { html: evalJs(S, HTML), color: evalJs(S, `(() => { ${FRAME} const sp = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror p span'); return JSON.stringify(sp ? W.getComputedStyle(sp).color : null); })()`), changed: saveDisabled() !== true };
    } catch (e) { out.colors[name] = { error: String(e.message).slice(0, 100) }; }
    out.colors[name].undoSteps = await undoAll();
    console.log(name, JSON.stringify(out.colors[name]).slice(0, 300));
  }
  // Text Highlight applies at once; no popover opened in the first run.
  try {
    await open('Text Highlight');
    out.highlight = { html: evalJs(S, HTML), color: evalJs(S, `(() => { ${FRAME} const sp = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror .sqsrte-text-highlight'); if (!sp) return JSON.stringify(null); const c = W.getComputedStyle(sp); return JSON.stringify({ color: c.color, background: c.backgroundColor, backgroundImage: c.backgroundImage }); })()`), changed: saveDisabled() !== true };
  } catch (e) { out.highlight = { error: String(e.message).slice(0, 100) }; }
  out.highlight.undoSteps = await undoAll();
  console.log('highlight', JSON.stringify(out.highlight).slice(0, 400));
  if (saveDisabled() !== true) throw new Error('The probe left unsaved changes');
  write('TEXTCOLOR', { question: 'What do Text Color and Text Highlight offer, and what HTML does a pick write?', ...out });
}

if (which === 'TEXTLINK') {
  // E7 for text: the text toolbar Link on a selected word. Read the popover and where it opens,
  // then set a URL, a URL with Open link in new tab, and a site page, reading the HTML after
  // each and undoing until Save is disabled again (O1).
  const [i, k] = [2, 1];
  const id = blockIds(i)[k];
  const HTML = `(() => { ${FRAME} const blk = d.querySelector('.fe-block[data-block-id="${id}"]'); const c = blk.querySelector('.ProseMirror') || blk.querySelector('.sqs-html-content'); return JSON.stringify(c.innerHTML.replace(/ data-rte-preserve-empty="true"/g, '').replace(/ style="white-space:pre-wrap;"/g, '').replace(/ class="([^"]*)"/g, (m, v) => (/sqsrte|preFade|fade|text-align/.test(v) ? m : '')).slice(0, 700)); })()`;
  const startWrite = async () => {
    await select(i, id); await pause(900);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
    evalJs(S, `(() => { ${FRAME} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror'); pm.focus(); const p = pm.querySelector('p'); const t = p.firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); return 'true'; })()`);
    await pause(900);
  };
  const undoAll = async () => { await escape(); await escape(); let n = 0; while (n < 6 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } await deselect(i); return n; };
  const POP = `(() => { const h = [...document.querySelectorAll('input')].find((e) => e.getAttribute('placeholder') === 'Enter link, search, or add files' && e.getBoundingClientRect().width > 0);
    if (!h) return JSON.stringify(null); let p = h; while (p.parentElement && p.getBoundingClientRect().height < 150) p = p.parentElement; const r = p.getBoundingClientRect(); const vis = (e) => e.getBoundingClientRect().width > 0;
    return JSON.stringify({ box: [r.x, r.y, r.width, r.height].map(Math.round), focused: document.activeElement === h, text: [...new Set([...p.querySelectorAll('*')].filter((e) => vis(e) && e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()))].slice(0, 30),
      checkbox: [...p.querySelectorAll('input[type=checkbox]')].filter(vis).map((e) => ({ label: e.getAttribute('aria-label'), checked: e.checked })) }); })()`;
  const SELBOX = `(() => { ${FRAME} const r = W.getSelection().getRangeAt(0).getBoundingClientRect(); const f2 = f.getBoundingClientRect(); return JSON.stringify([f2.x + r.x, f2.y + r.y, r.width, r.height].map(Math.round)); })()`;
  const LINKBTN = `() => [...document.querySelectorAll('button, [role=button]')].find((e) => /^link$/i.test(e.getAttribute('aria-label') || '') && e.getBoundingClientRect().width > 0)`;
  const tagInput = () => evalJs(S, `(() => { document.querySelectorAll('#fx-target').forEach((x) => x.removeAttribute('id')); const h = [...document.querySelectorAll('input')].find((e) => e.getAttribute('placeholder') === 'Enter link, search, or add files' && e.getBoundingClientRect().width > 0); if (!h) return JSON.stringify(false); h.id = 'fx-target'; return JSON.stringify(true); })()`);
  const cm = (...a) => execFileSync('cmux', ['browser', '--surface', S, ...a]);
  if (saveDisabled() !== true) throw new Error('The oracle has unsaved changes; stopping (O1)');
  const out = { block: [i, k] };
  await startWrite();
  out.base = evalJs(S, HTML);
  out.selection = evalJs(S, SELBOX);
  out.linkButton = evalJs(S, `(() => { const b = (${LINKBTN})(); if (!b) return JSON.stringify(null); const r = b.getBoundingClientRect(); return JSON.stringify([r.x, r.y, r.width, r.height].map(Math.round)); })()`);
  await click(LINKBTN, { wait: 1200 });
  out.popover = evalJs(S, POP);
  console.log('popover', JSON.stringify(out.popover), 'button', JSON.stringify(out.linkButton), 'selection', JSON.stringify(out.selection));
  // Focus the field and let the page list show, then read it.
  if (tagInput() === true) { cm('click', '#fx-target'); await pause(900); out.popoverFocused = evalJs(S, POP); }
  await undoAll();
  for (const [name, how] of [['url', { url: 'https://example.com/probe' }], ['url new tab', { url: 'https://example.com/probe', newTab: true }], ['page', { page: true }]]) {
    try {
      await startWrite();
      await click(LINKBTN, { wait: 1200 });
      if (how.url) {
        if (tagInput() !== true) throw new Error('no link field');
        cm('fill', '#fx-target', how.url); await pause(500);
        if (how.newTab) { await click(`() => [...document.querySelectorAll('input[type=checkbox], [role=checkbox], [role=switch]')].find((e) => e.getBoundingClientRect().width > 0 && /new tab/i.test((e.getAttribute('aria-label') || '') + (e.closest('label')?.textContent || '') + (e.parentElement?.parentElement?.textContent || '')))`, { wait: 600 }); }
        if (tagInput() === true) cm('press', 'Enter');
      } else {
        if (tagInput() === true) { cm('click', '#fx-target'); await pause(900); }
        await click(`() => [...document.querySelectorAll('[role=option], li, button')].find((e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame') && /^Services/.test(e.textContent.trim()) && /\/services/.test(e.textContent))`, { wait: 1200 });
      }
      await pause(1200);
      out[name] = { html: evalJs(S, HTML), popoverAfter: evalJs(S, POP), changed: saveDisabled() !== true };
    } catch (e) { out[name] = { error: String(e.message).slice(0, 100) }; }
    out[name].undoSteps = await undoAll();
    console.log(name, JSON.stringify(out[name]).slice(0, 500));
  }
  if (saveDisabled() !== true) throw new Error('The probe left unsaved changes');
  write('TEXTLINK', { question: 'What does the text toolbar Link open, where, and what HTML does a link write?', ...out });
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

if (which === 'BUTTONEDIT') {
  // T5 and E7: the button block Edit panel (Content tab) and its link editor. Read the panel,
  // then change the button text once and attach one URL, read the published HTML after each,
  // and undo until Save is disabled again (O1).
  const i = 0, id = blockIds(0)[2];
  const BTN = `(() => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="${id}"] .sqs-block-content'); return JSON.stringify(b ? b.innerHTML.replace(/\\s+/g, ' ').trim() : null); })()`;
  // The open panel: the element that holds both the Content and the Animation tab.
  const PANEL = `(() => { const tab = [...document.querySelectorAll('[role=tab], button')].find((e) => e.textContent.trim() === 'Content' && e.getBoundingClientRect().width > 0);
    if (!tab) return JSON.stringify(null); let p = tab; while (p.parentElement && !/Animation/.test(p.textContent)) p = p.parentElement; while (p.parentElement && p.getBoundingClientRect().height < 200) p = p.parentElement;
    const r = p.getBoundingClientRect(); const vis = (e) => e.getBoundingClientRect().width > 0;
    return JSON.stringify({ box: [r.x, r.y, r.width, r.height].map(Math.round),
      text: [...new Set([...p.querySelectorAll('*')].filter((e) => vis(e) && e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()))],
      inputs: [...p.querySelectorAll('input, textarea, [contenteditable=true]')].filter(vis).map((e) => { const q = e.getBoundingClientRect(); return { tag: e.tagName, type: e.type || null, label: e.getAttribute('aria-label'), placeholder: e.getAttribute('placeholder'), value: e.value ?? e.textContent, box: [q.x, q.y, q.width, q.height].map(Math.round) }; }),
      buttons: [...p.querySelectorAll('button, [role=button], [role=tab]')].filter(vis).map((e) => { const q = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label') || e.textContent.trim(), selected: e.getAttribute('aria-selected'), box: [q.x, q.y, q.width, q.height].map(Math.round) }; }) }); })()`;
  // Everything visible that holds a given text, as the popover root.
  const POP = (txt) => `(() => { const h = [...document.querySelectorAll('input, *')].find((e) => e.getBoundingClientRect().width > 0 && ((e.getAttribute('placeholder') || '') === ${JSON.stringify(txt)} || (e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(txt)})));
    if (!h) return JSON.stringify(null); let p = h; while (p.parentElement && p.getBoundingClientRect().height < 150) p = p.parentElement; const r = p.getBoundingClientRect(); const vis = (e) => e.getBoundingClientRect().width > 0;
    return JSON.stringify({ box: [r.x, r.y, r.width, r.height].map(Math.round), text: [...new Set([...p.querySelectorAll('*')].filter((e) => vis(e) && e.childElementCount === 0 && e.textContent.trim()).map((e) => e.textContent.trim()))],
      inputs: [...p.querySelectorAll('input')].filter(vis).map((e) => ({ label: e.getAttribute('aria-label'), placeholder: e.getAttribute('placeholder'), value: e.value })),
      buttons: [...p.querySelectorAll('button, [role=button], [role=option], [role=tab]')].filter(vis).map((e) => e.getAttribute('aria-label') || e.textContent.trim()) }); })()`;
  const tag = (find) => evalJs(S, `(() => { document.querySelectorAll('#fx-target').forEach((x) => x.removeAttribute('id')); const el = (${find})(); if (!el) return JSON.stringify(false); el.id = 'fx-target'; return JSON.stringify(true); })()`);
  const fill = (text) => execFileSync('cmux', ['browser', '--surface', S, 'fill', '#fx-target', text]);
  const press = (k) => execFileSync('cmux', ['browser', '--surface', S, 'press', k]);
  const out = { block: [i, id], htmlBefore: evalJs(S, BTN) };
  if (saveDisabled() !== true) throw new Error('The oracle has unsaved changes; stopping (O1)');
  await select(i, id); await pause(700);
  await click(`() => [...document.querySelectorAll('button')].find((x) => [x.getAttribute('aria-label'), x.textContent.trim()].includes('Edit') && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 80)`, { wait: 1800 });
  out.blockBox = evalJs(S, `(() => { ${FRAME} const fb = f.getBoundingClientRect(); const r = d.querySelector('.fe-block[data-block-id="${id}"]').getBoundingClientRect(); return JSON.stringify([fb.x + r.x, fb.y + r.y, r.width, r.height].map(Math.round)); })()`);
  out.panel = evalJs(S, PANEL);
  console.log('panel', JSON.stringify(out.panel));
  // 1. Button text.
  const textInput = `() => [...document.querySelectorAll('input')].find((e) => e.getAttribute('aria-label') === 'Text' && e.getBoundingClientRect().width > 0)`;
  if (tag(textInput) === true) {
    fill('Learn more now'); press('Tab'); await pause(1500);
    out.afterText = { html: evalJs(S, BTN), saveDisabled: saveDisabled() };
    console.log('afterText', JSON.stringify(out.afterText));
  } else out.afterText = 'no text input found';
  // 2. Attach link: open the link editor, read it, enter one URL.
  await click(`() => [...document.querySelectorAll('button, [role=button]')].find((x) => /attach link/i.test(x.getAttribute('aria-label') || x.textContent) && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
  out.linkEditor = evalJs(S, POP('Enter link, search, or add files'));
  console.log('linkEditor', JSON.stringify(out.linkEditor));
  if (tag(`() => [...document.querySelectorAll('input')].find((e) => e.getAttribute('placeholder') === 'Enter link, search, or add files' && e.getBoundingClientRect().width > 0)`) === true) {
    fill('https://example.com/probe'); await pause(800);
    out.linkTyped = evalJs(S, POP('Enter link, search, or add files'));
    press('Enter'); await pause(1500);
    out.afterLink = { html: evalJs(S, BTN), panel: evalJs(S, PANEL), saveDisabled: saveDisabled() };
    console.log('afterLink', JSON.stringify(out.afterLink));
  } else out.afterLink = 'no link input found';
  await escape(); await escape(); await deselect(i);
  let n = 0; while (n < 8 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
  out.undoSteps = n; out.htmlAfterUndo = evalJs(S, BTN);
  out.restored = out.htmlAfterUndo === out.htmlBefore && saveDisabled() === true;
  write('BUTTONEDIT', { question: 'What does the button Edit panel offer on Content, and what HTML do its text and link write?', ...out });
  if (!out.restored) throw new Error('The button did not return to its saved state');
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

if (which === 'TOOLBARGEO') {
  // U3, U4: the geometry and look of the block toolbar and the selection outline. Select a
  // block, find the toolbar (the box holding its Remove button), read its box relative to the
  // block, its style, each button's box and label, and the selection outline. Read only.
  const cases = (process.argv[3] && JSON.parse(process.argv[3])) || [[2, 1, 'text'], [2, 2, 'shape'], [0, 2, 'button'], [0, 0, 'text at page top'], [3, 0, 'text at section top']];
  const out = {};
  for (const [i, k, label] of cases) {
    const id = blockIds(i)[k];
    await select(i, id); await pause(900);
    out[label] = evalJs(S, `(() => { ${FRAME}
      const fr = f.getBoundingClientRect();
      const b = d.querySelector('.fe-block[data-block-id="${id}"]'); const bq = b.getBoundingClientRect();
      const rel = (q) => [q.left - fr.left - bq.left, q.top - fr.top - bq.top, q.width, q.height].map((v) => Math.round(v * 10) / 10);
      const rm = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Remove' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 60);
      if (!rm) return JSON.stringify({ error: 'no toolbar' });
      let bar = rm; while (bar.parentElement && bar.parentElement.getBoundingClientRect().width < 700 && !(bar.querySelectorAll('button').length >= 3 && W.getComputedStyle(bar).backgroundColor !== 'rgba(0, 0, 0, 0)')) bar = bar.parentElement;
      const cs = getComputedStyle(bar);
      const buttons = [...bar.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => { const c = getComputedStyle(x); const sv = x.querySelector('svg'); const pth = sv && sv.querySelector('path, rect, circle, line, polyline'); const pc = pth && getComputedStyle(pth); return { label: x.getAttribute('aria-label') || x.textContent.trim(), box: rel(x.getBoundingClientRect()), color: c.color, bg: c.backgroundColor, radius: c.borderRadius, icon: sv ? { size: [Math.round(sv.getBoundingClientRect().width), Math.round(sv.getBoundingClientRect().height)], fill: pc && pc.fill, stroke: pc && pc.stroke, strokeWidth: pc && pc.strokeWidth } : null, text: x.textContent.trim(), font: c.font }; });
      const seps = [...bar.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.width <= 2 && q.height >= 10 && q.height <= 40; }).map((e) => ({ box: rel(e.getBoundingClientRect()), bg: getComputedStyle(e).backgroundColor }));
      const icon = bar.querySelector('button svg'); const iq = icon && icon.getBoundingClientRect();
      // Selection outline and handles inside the frame.
      const outline = [...d.querySelectorAll('.fluid-engine *')].filter((e) => { const q = e.getBoundingClientRect(); const c = W.getComputedStyle(e); return Math.abs(q.width - bq.width) < 6 && Math.abs(q.height - bq.height) < 6 && (c.outlineStyle !== 'none' || c.borderTopStyle !== 'none' || c.boxShadow !== 'none') && e !== b; }).map((e) => { const c = W.getComputedStyle(e); return { cls: [...e.classList].filter((x) => !/^[A-Za-z0-9_]{16}$|^fluid-engine-[a-z0-9]{5,7}$/.test(x)).join('.').slice(0, 80), box: [Math.round(e.getBoundingClientRect().left - bq.left), Math.round(e.getBoundingClientRect().top - bq.top), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)], outline: c.outlineStyle !== 'none' ? c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor + ' offset ' + c.outlineOffset : '', border: c.borderTopStyle !== 'none' ? c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor : '', shadow: c.boxShadow !== 'none' ? c.boxShadow : '' }; }).slice(0, 6);
      const pill = [...d.querySelectorAll('.fe-block [class*=label-tag], .fe-block [class*=pill]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ text: e.textContent.trim(), box: [Math.round(e.getBoundingClientRect().left - bq.left), Math.round(e.getBoundingClientRect().top - bq.top), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)], bg: W.getComputedStyle(e).backgroundColor, color: W.getComputedStyle(e).color, font: W.getComputedStyle(e).font }));
      return JSON.stringify({ block: [Math.round(bq.left), Math.round(bq.top), Math.round(bq.width), Math.round(bq.height)], frameTop: Math.round(fr.top),
        bar: { box: rel(bar.getBoundingClientRect()), bg: cs.backgroundColor, radius: cs.borderRadius, shadow: cs.boxShadow, padding: cs.padding, gap: cs.gap, border: cs.border },
        buttons, seps, icon: iq && [Math.round(iq.width), Math.round(iq.height)], outline, pill }); })()`);
    console.log(label, JSON.stringify(out[label]).slice(0, 900));
    if (process.env.SHOTS) execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS}/toolbar-${label.replace(/\W+/g, '-')}.png`]);
    await escape(); await deselect(i);
  }
  if (saveDisabled() !== true) throw new Error('The probe changed the page');
  write('TOOLBARGEO', { question: 'Where is the block toolbar relative to the selected block, how does it look, and how is the selection drawn?', frame: '1600x945', ...out });
}

if (which === 'DESIGN') {
  // T15 (block design): what each control in a block's Edit > Design tab changes. Open Edit on
  // a block, list the controls with their labels, then for each named input type a test value,
  // press Enter, read the block's styles (the block, its content, and the transform style
  // elements inside it), and undo. Usage: DESIGN [section] [block] ['{"Opacity":"50"}'].
  const i = Number(process.argv[3] ?? 2), k = Number(process.argv[4] ?? 1);
  const id = blockIds(i)[k];
  const tests = (process.argv[5] && JSON.parse(process.argv[5])) || null;
  const open = async () => {
    await select(i, id); await pause(800);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Edit' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 80)`, { wait: 1800 });
    await click(`() => [...document.querySelectorAll('button, [role=tab]')].find((x) => x.textContent.trim() === 'Design' && x.getBoundingClientRect().width > 0)`, { wait: 1200 });
  };
  const CONTROLS = `(() => { const vis = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && !e.closest('#sqs-site-frame'); };
    const labelOf = (e) => { let n = e; for (let d = 0; d < 6 && n; d++, n = n.parentElement) { const l = [...n.querySelectorAll('label, span, div, p')].filter((x) => x.childElementCount === 0 && x.textContent.trim() && !/^[\\d.%°px-]+$/.test(x.textContent.trim()) && vis(x) && x.getBoundingClientRect().top <= e.getBoundingClientRect().bottom).pop(); if (l) return l.textContent.trim(); } return ''; };
    return JSON.stringify([...document.querySelectorAll('input, select, [role=switch], [role=slider]')].filter(vis).map((e, n) => { e.dataset.fxCtl = String(n); return { n, type: e.type || e.getAttribute('role'), label: e.getAttribute('aria-label') || labelOf(e), value: e.type === 'checkbox' ? e.checked : e.value, top: Math.round(e.getBoundingClientRect().top) }; })); })()`;
  const READ = `(() => { ${FRAME}
    const b = d.querySelector('.fe-block[data-block-id="${id}"]');
    const els = [b, ...b.querySelectorAll('.fluid-engine-block-contents, .sqs-block, .sqs-block-content, .sqs-html-content')];
    const css = (e) => { const c = W.getComputedStyle(e); return { cls: [...e.classList].filter((x) => !/^[A-Za-z0-9_]{16}$|^fe-block-yui|^fluid-engine-[a-z0-9]{5,7}$/.test(x)).slice(0, 3).join('.'), opacity: c.opacity, transform: c.transform, transformOrigin: c.transformOrigin, filter: c.filter, backdrop: c.backdropFilter, mix: c.mixBlendMode, bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, radius: c.borderRadius, inline: e.getAttribute('style') || '' }; };
    const styles = [...b.querySelectorAll('style')].map((x) => x.textContent.replace(/\\s+/g, ' ').slice(0, 600)).filter(Boolean);
    const shape = b.querySelector('.sqs-shape-block-container');
    const markup = shape ? JSON.stringify({ stretched: shape.hasAttribute('data-stretched-to-fill'), svg: shape.querySelector('svg')?.outerHTML.split('\\n').join(' ') }) : null;
    return JSON.stringify({ els: els.map(css), styles, markup }); })()`;
  await open();
  const controls = evalJs(S, CONTROLS);
  console.log('controls', JSON.stringify(controls.map((c) => `${c.n}:${c.type}:${c.label}=${c.value}`)));
  const base = evalJs(S, READ);
  const out = { controls, base, changes: {} };
  await escape(); await deselect(i);
  for (const [label, value] of Object.entries(tests || {})) {
    try {
      await open();
      const ctl = evalJs(S, CONTROLS).find((c) => (label.startsWith('#') ? c.n === Number(label.slice(1)) : c.label === label || c.label.startsWith(label)));
      if (!ctl) throw new Error(`no control ${label}`);
      evalJs(S, `(() => { document.querySelectorAll('#fx-ctl').forEach((x) => x.removeAttribute('id')); document.querySelector('[data-fx-ctl="${ctl.n}"]').id = 'fx-ctl'; return 'true'; })()`);
      if (ctl.type === 'checkbox' || ctl.type === 'switch') execFileSync('cmux', ['browser', '--surface', S, 'click', '#fx-ctl']);
      else { execFileSync('cmux', ['browser', '--surface', S, 'fill', '#fx-ctl', String(value)]); execFileSync('cmux', ['browser', '--surface', S, 'press', 'Enter']); }
      await pause(1500);
      const after = evalJs(S, READ);
      const diff = after.els.map((e, n) => Object.fromEntries(Object.entries(e).filter(([kk, v]) => v !== base.els[n]?.[kk]))).map((x, n) => (Object.keys(x).length ? { el: after.els[n].cls, ...x } : null)).filter(Boolean);
      out.changes[label] = { set: value, control: ctl, diff, styles: after.styles.filter((x) => !base.styles.includes(x)), markup: after.markup !== base.markup ? after.markup : undefined, changed: saveDisabled() !== true };
    } catch (e) { out.changes[label] = { error: String(e.message).slice(0, 120) }; }
    console.log(label, JSON.stringify(out.changes[label]).slice(0, 700));
    await escape(); await escape();
    let n = 0; while (n < 6 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
    out.changes[label].undoSteps = n;
    await deselect(i);
    if (saveDisabled() !== true) throw new Error('Unsaved changes remain');
  }
  write(process.env.NAME || 'DESIGN', { question: 'What does each control in the block Edit > Design tab change on the block (styles, and for shapes the SVG markup)?', block: [i, k], ...out });
}

if (which === 'BLEND') {
  // T15: the Blend Mode dropdown in a block's Edit > Design tab. List its options, then pick
  // each one, read the block's computed mix-blend-mode and its style elements, and undo until
  // Save is disabled (O1). Usage: BLEND [section] [block] ['["Multiply"]'].
  const i = Number(process.argv[3] ?? 2), k = Number(process.argv[4] ?? 1);
  const id = blockIds(i)[k];
  const only = (process.argv[5] && JSON.parse(process.argv[5])) || null;
  const open = async () => {
    await select(i, id); await pause(800);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Edit' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 80)`, { wait: 1800 });
    await click(`() => [...document.querySelectorAll('button, [role=tab]')].find((x) => x.textContent.trim() === 'Design' && x.getBoundingClientRect().width > 0)`, { wait: 1200 });
    await click(`() => [...document.querySelectorAll('[role=button][aria-haspopup=listbox]')].find((x) => /^Blend Mode/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0)`, { wait: 1000 });
  };
  const OPTIONS = `(() => JSON.stringify([...document.querySelectorAll('[role=option]')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame') && e.textContent.trim() && e.textContent.trim().length < 20).map((e) => ({ text: e.textContent.trim(), selected: e.getAttribute('aria-selected') || e.getAttribute('aria-checked'), role: e.getAttribute('role') }))))()`;
  const READ = `(() => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="${id}"]');
    const els = [b, ...b.querySelectorAll('.fluid-engine-block-contents, .sqs-block, .sqs-block-content')];
    const all = [...b.querySelectorAll('style')].map((x) => x.textContent.replace(/\\s+/g, ' ')).join(' ');
    return JSON.stringify({ blend: els.map((e) => W.getComputedStyle(e).mixBlendMode), vars: all.match(/--tweak-[a-z-]*blend[^;}]*/g) || [] }); })()`;
  if (saveDisabled() !== true) throw new Error('The oracle has unsaved changes; stopping (O1)');
  const base = evalJs(S, READ);
  await open();
  const options = evalJs(S, OPTIONS);
  console.log('options', JSON.stringify(options));
  await escape(); await escape(); await deselect(i);
  const out = { block: [i, k], base, options, changes: {} };
  // A click on an option does not pick it; the keyboard does (ArrowDown from Normal, Enter).
  const names = options.map((x) => x.text);
  for (const o of names.filter((t) => t !== 'Normal' && (!only || only.includes(t)))) {
    try {
      await open();
      for (let n = 0; n < names.indexOf(o); n++) { execFileSync('cmux', ['browser', '--surface', S, 'press', 'ArrowDown']); await pause(120); }
      execFileSync('cmux', ['browser', '--surface', S, 'press', 'Enter']); await pause(1500);
      const after = evalJs(S, READ);
      out.changes[o] = { blend: after.blend, vars: after.vars, changed: saveDisabled() !== true };
    } catch (e) { out.changes[o] = { error: String(e.message).slice(0, 120) }; }
    console.log(o, JSON.stringify(out.changes[o]).slice(0, 400));
    await escape(); await escape();
    let n = 0; while (n < 6 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); }
    out.changes[o].undoSteps = n;
    await deselect(i);
    if (saveDisabled() !== true) throw new Error('Unsaved changes remain');
  }
  write('BLEND', { question: 'Which Blend Mode options does a block Edit > Design tab offer, and what does each write?', ...out });
}

if (which === 'SECTIONBAR') {
  // U9, U10, S4: the section chrome. Hover a section, read every visible control that belongs
  // to it (its box relative to the section, label, colors, the box of its toolbar group), then
  // open Edit Section and read the panel box and look. Read only; Escape closes the panel.
  const cases = (process.argv[3] && JSON.parse(process.argv[3])) || [2, 0, 7];
  const shot = (n) => process.env.SHOTS && execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS}/${n}.png`]);
  const { hoverSection } = await import('./oracle/ui.mjs');
  const out = {};
  for (const i of cases) {
    await escape(); await deselect(i);
    await hoverSection(i); await pause(900);
    const READ = `(() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const d = f.contentDocument, W = f.contentWindow;
      const sec = d.querySelectorAll('main#page .page-section')[${i}]; const sq = sec.getBoundingClientRect();
      const top = fr.top + sq.top, left = fr.left + sq.left, bottom = fr.top + sq.bottom;
      const rel = (q) => [q.left - left, q.top - top, q.width, q.height].map((v) => Math.round(v * 10) / 10);
      const look = (e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, color: c.color, radius: c.borderRadius, shadow: c.boxShadow === 'none' ? '' : c.boxShadow, border: c.borderTopWidth !== '0px' ? c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor : '', font: c.fontSize + ' ' + c.fontWeight + ' ' + c.letterSpacing + ' ' + c.textTransform }; };
      const btns = [...document.querySelectorAll('button')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.top >= top - 70 && q.top <= bottom + 10 && !x.closest('[class*=sidebar], nav'); })
        .map((x) => ({ label: (x.getAttribute('aria-label') || x.textContent.trim()).slice(0, 30), text: x.textContent.trim().slice(0, 20), box: rel(x.getBoundingClientRect()), ...look(x) })).filter((b) => b.label && !/^(Save|Exit|Undo|Redo|Desktop View|Mobile View|Toggle)/.test(b.label));
      const edit = [...document.querySelectorAll('button')].find((x) => /edit section/i.test(x.textContent) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top >= top - 70 && x.getBoundingClientRect().top <= bottom);
      let card = edit; while (card && card.parentElement && getComputedStyle(card).backgroundColor === 'rgba(0, 0, 0, 0)') card = card.parentElement;
      const handle = [...d.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 20 && q.width < 70 && q.height > 15 && q.height < 50 && Math.abs(q.bottom - sq.bottom) < 40 && getComputedStyle(e).backgroundColor === 'rgb(0, 125, 255)' || false; });
      const blues = [...document.querySelectorAll('*'), ...d.querySelectorAll('*')].filter((e) => { const c = (e.ownerDocument === d ? W : window).getComputedStyle(e); const q = e.getBoundingClientRect(); return q.width > 15 && q.width < 300 && q.height > 15 && q.height < 60 && /rgb\(0, 1[0-3]\d, 2[45]\d\)|rgb\(2, 122, 255\)|rgb\(17, 105, 247\)/.test(c.backgroundColor); })
        .map((e) => { const inFrame = e.ownerDocument === d; const q = e.getBoundingClientRect(); const c = (inFrame ? W : window).getComputedStyle(e); return { inFrame, cls: (typeof e.className === 'string' ? e.className : '').split(' ').filter((x) => x && !/^[A-Za-z0-9_]{16}$|^css-|^fluid-engine-[a-z0-9]{5,7}$/.test(x)).slice(0, 3).join('.'), text: e.textContent.trim().slice(0, 20), aria: e.getAttribute('aria-label') || '', box: inFrame ? [q.left - sq.left, q.top - sq.top, q.width, q.height].map((v) => Math.round(v)) : rel(q), bg: c.backgroundColor, radius: c.borderRadius }; });
      const outline = [sec, ...sec.querySelectorAll(':scope > *')].map((e) => { const c = W.getComputedStyle(e); return { cls: [...e.classList].slice(0, 2).join('.'), outline: c.outlineStyle !== 'none' ? c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor + ' ' + c.outlineOffset : '', border: c.borderTopStyle !== 'none' ? c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor : '', shadow: c.boxShadow !== 'none' ? c.boxShadow : '' }; }).filter((x) => x.outline || x.border || x.shadow);
      return JSON.stringify({ section: [Math.round(sq.left), Math.round(sq.top), Math.round(sq.width), Math.round(sq.height)], frame: [Math.round(fr.left), Math.round(fr.top), Math.round(fr.width), Math.round(fr.height)], buttons: btns, card: card && { box: rel(card.getBoundingClientRect()), ...look(card), padding: getComputedStyle(card).padding }, blues, outline }); })()`;
    const hovered = evalJs(S, READ);
    shot(`section-${i}-hover`);
    console.log('section', i, JSON.stringify(hovered).slice(0, 1600));
    await click(`() => { const f = document.getElementById('sqs-site-frame'); const fr = f.getBoundingClientRect(); const sec = f.contentDocument.querySelectorAll('main#page .page-section')[${i}].getBoundingClientRect(); return [...document.querySelectorAll('button')].filter((x) => [x.getAttribute("aria-label"), x.textContent].some((t) => /edit section|open section settings/i.test(t || "")) && x.getBoundingClientRect().width > 0).find((x) => { const y = x.getBoundingClientRect().top; return y >= fr.top + sec.top - 70 && y <= fr.top + sec.bottom; }); }`, { wait: 1800 });
    const panel = evalJs(S, `(() => { const tab = [...document.querySelectorAll('[role=tab], button')].find((e) => e.textContent.trim() === 'Design' && e.getBoundingClientRect().width > 0); if (!tab) return JSON.stringify(null);
      let p = tab; while (p.parentElement && !(getComputedStyle(p).backgroundColor !== 'rgba(0, 0, 0, 0)' && p.getBoundingClientRect().height > 200)) p = p.parentElement;
      const q = p.getBoundingClientRect(), c = getComputedStyle(p); return JSON.stringify({ box: [q.left, q.top, q.width, q.height].map(Math.round), window: [innerWidth, innerHeight], bg: c.backgroundColor, radius: c.borderRadius, shadow: c.boxShadow, overflow: c.overflowY, tabs: [...p.querySelectorAll('[role=tab]')].map((t) => [t.textContent.trim(), Math.round(t.getBoundingClientRect().left - q.left), Math.round(t.getBoundingClientRect().top - q.top)]) }); })()`);
    shot(`section-${i}-panel`);
    console.log('panel', i, JSON.stringify(panel));
    out[i] = { hovered, panel };
    await escape(); await escape();
  }
  if (saveDisabled() !== true) throw new Error('The probe changed the page');
  write('SECTIONBAR', { question: 'What does a hovered section show, and where does the Edit Section panel open?', frame: '1600x1000 window', sections: out });
}

if (which === 'UNBUILT') {
  // What the controls ours shows dimmed actually do (U11, L5, E4, U4, Y4, S4). For each: one
  // action on demo section 2, read the block's markup and the section's style rule before and
  // after, then undo until Save is disabled. Usage: UNBUILT [names json]
  const i = 2;
  const ids = blockIds(i);
  const shape = ids[2], text = ids[1];
  const shot = (n) => process.env.SHOTS && execFileSync('cmux', ['browser', '--surface', S, 'screenshot', '--out', `${process.env.SHOTS}/unbuilt-${n}.png`]);
  const READ = (id) => evalJs(S, `(() => { ${FRAME}
    const sec = d.querySelectorAll('main#page .page-section')[${i}];
    const b = sec.querySelector('.fe-block[data-block-id="${id}"]');
    const css = [...sec.querySelectorAll('style')].map((x) => x.textContent.replace(/\\s+/g, ' ')).join(' | ');
    const pm = b && (b.querySelector('.ProseMirror') || b.querySelector('.sqs-html-content'));
    return JSON.stringify({ exists: !!b, cls: b ? [...b.classList].filter((c) => !/^fe-block-yui|^fluid-engine-[a-z0-9]{5,7}$/.test(c)).join(' ') : null,
      attrs: b ? Object.fromEntries([...b.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'style').map((a) => [a.name, a.value.slice(0, 200)])) : null,
      display: b ? W.getComputedStyle(b).display : null, position: b ? W.getComputedStyle(b).position : null, top: b ? W.getComputedStyle(b).top : null,
      html: pm ? pm.innerHTML.replace(/ data-rte-preserve-empty="true"/g, '').slice(0, 600) : null, css: css.length, cssText: css.slice(0, 4000),
      blocks: [...sec.querySelectorAll('.fe-block')].map((x) => x.dataset.blockId + ' ' + W.getComputedStyle(x).gridArea), rows: W.getComputedStyle(sec.querySelector('.fluid-engine')).gridTemplateRows.split(' ').length }); })()`);
  const diffCss = (a, b) => { const A = new Set(a.split(/(?<=\})/)), B = b.split(/(?<=\})/); return B.filter((r) => !A.has(r)).map((r) => r.trim()).filter(Boolean).slice(0, 12); };
  const undoAll = async () => { for (let k = 0; k < 3; k++) await escape(); let n = 0; while (n < 8 && saveDisabled() !== true && evalJs(S, BUTTON('Undo')) === true) { n++; await pause(900); } return n; };
  const menu = async (id, label) => {
    await select(i, id); await pause(500);
    evalJs(S, `(() => { ${FRAME} const b = d.querySelector('.fe-block[data-block-id="${id}"]'); const q = b.getBoundingClientRect(); b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + 30, clientY: q.top + 30, button: 2, view: W })); return 'true'; })()`);
    await pause(900);
    await click(`() => [...document.querySelectorAll('button, [role=menuitem], li, div, span')].filter((e) => e.childElementCount <= 3 && e.textContent.trim().startsWith(${'LBL'}) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().width < 260).pop()`.replace('LBL', JSON.stringify(label)), { wait: 1500 });
  };
  const startWrite = async (id) => {
    await select(i, id); await pause(700);
    await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Write' && x.getBoundingClientRect().width > 0)`, { wait: 1500 });
    evalJs(S, `(() => { ${FRAME} const pm = d.querySelector('.fe-block[data-block-id="${id}"] .ProseMirror'); pm.focus(); const t = pm.querySelector('p').firstChild; const r = d.createRange(); r.setStart(t, 0); r.setEnd(t, t.textContent.indexOf(' ')); const sel = W.getSelection(); sel.removeAllRanges(); sel.addRange(r); d.dispatchEvent(new W.Event('selectionchange')); return 'true'; })()`);
    await pause(900);
  };
  const labelsNow = () => evalJs(S, `(() => JSON.stringify([...new Set([...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame')).map((e) => e.textContent.trim().slice(0, 40)))].slice(-60)))()`);
  const STEPS = {
    'hide-desktop': async () => { await menu(shape, 'Hide on desktop'); },
    'hide-mobile': async () => { await menu(shape, 'Hide on mobile'); },
    'copy-paste': async () => { await menu(shape, 'Copy'); await escape(); await deselect(i); await menu(text, 'Paste'); },
    'paste-properties-menu': async () => { await menu(shape, 'Copy Properties'); },
    'arrange-menu': async () => { await menu(shape, 'Arrange'); },
    'pin': async () => { await select(i, shape); await pause(500); await click(`() => [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Pin' && x.getBoundingClientRect().width > 0)`, { wait: 1500 }); },
    'link-url': async () => { await startWrite(text); await click(`() => [...document.querySelectorAll('[aria-label]')].find((x) => x.getAttribute('aria-label') === 'Link' && x.getBoundingClientRect().width > 0)`, { wait: 1200 });
      const inp = evalJs(S, `(() => { const i = [...document.querySelectorAll('input')].find((x) => x.getBoundingClientRect().width > 0 && /url|link|http/i.test((x.placeholder || '') + (x.getAttribute('aria-label') || ''))); document.querySelectorAll('#fx-in').forEach((y) => y.removeAttribute('id')); if (!i) return JSON.stringify(false); i.id = 'fx-in'; return JSON.stringify(true); })()`);
      if (inp) { execFileSync('cmux', ['browser', '--surface', S, 'fill', '#fx-in', 'https://example.com/a']); execFileSync('cmux', ['browser', '--surface', S, 'press', 'Enter']); await pause(1200); } },
    'link-page': async () => { await startWrite(text); await click(`() => [...document.querySelectorAll('[aria-label]')].find((x) => x.getAttribute('aria-label') === 'Link' && x.getBoundingClientRect().width > 0)`, { wait: 1200 });
      await click(`() => [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === 'Services' && e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame')).pop()`, { wait: 1500 }); },
    'text-color': async () => { await startWrite(text); await click(`() => [...document.querySelectorAll('[aria-label]')].find((x) => x.getAttribute('aria-label') === 'Text Color' && x.getBoundingClientRect().width > 0)`, { wait: 1200 });
      await click(`() => { const pal = [...document.querySelectorAll('[aria-label], [role=radio], [role=option], button')].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().width < 40 && !e.closest('#sqs-site-frame') && /color|swatch|accent|white|black/i.test((e.getAttribute('aria-label') || '') + (e.className || ''))); return pal[1] || pal[0]; }`, { wait: 1500 }); },
    'section-handle': async () => { const { hoverSection } = await import('./oracle/ui.mjs'); await hoverSection(i); await pause(600);
      const h = evalJs(S, `(() => { ${FRAME} const sec = d.querySelectorAll('main#page .page-section')[${i}]; const sq = sec.getBoundingClientRect(); const all = [...d.querySelectorAll('*'), ...document.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); const c = (e.ownerDocument === d ? W : window).getComputedStyle(e); return q.width > 30 && q.width < 60 && q.height > 20 && q.height < 40 && /rgb\\(0, 1[0-3]\\d, 2[45]\\d\\)|rgb\\(2, 122, 255\\)/.test(c.backgroundColor) && !/add section/i.test(e.textContent); });
        return JSON.stringify(all.map((e) => { const q = e.getBoundingClientRect(); const inF = e.ownerDocument === d; return { inFrame: inF, aria: e.getAttribute('aria-label') || '', cls: String(e.className).slice(0, 80), cursor: (inF ? W : window).getComputedStyle(e).cursor, box: inF ? [q.left - sq.left, q.top - sq.top, q.width, q.height] : [q.left, q.top, q.width, q.height] }; })); })()`);
      out['section-handle-found'] = h; console.log('handle', JSON.stringify(h)); },
  };
  const names = (process.argv[3] && JSON.parse(process.argv[3])) || Object.keys(STEPS);
  const out = {};
  for (const name of names) {
    const target = /link|color|paste/.test(name) ? text : shape;
    const before = READ(target);
    let error = null, labels = null;
    try { await STEPS[name](); await pause(800); labels = labelsNow(); shot(name); } catch (e) { error = String(e.message).slice(0, 160); }
    const after = READ(target);
    const changed = saveDisabled() !== true;
    const delta = {};
    for (const k of ['exists', 'cls', 'display', 'position', 'top', 'html', 'rows']) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) delta[k] = [before[k], after[k]];
    if (JSON.stringify(before.attrs) !== JSON.stringify(after.attrs)) delta.attrs = [before.attrs, after.attrs];
    if (JSON.stringify(before.blocks) !== JSON.stringify(after.blocks)) delta.blocks = [before.blocks, after.blocks];
    const css = diffCss(before.cssText, after.cssText);
    out[name] = { ...(out[name] || {}), changed, delta, newCssRules: css, labelsAfter: labels, error };
    out[name].undoSteps = await undoAll();
    await deselect(i);
    console.log(name, JSON.stringify({ changed, delta, css: css.slice(0, 3), error }).slice(0, 900));
    if (saveDisabled() !== true) throw new Error('Unsaved changes remain; stopping');
  }
  write('UNBUILT', { question: 'What do the controls ours shows dimmed do on the oracle?', section: i, blocks: { shape, text }, steps: out });
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

