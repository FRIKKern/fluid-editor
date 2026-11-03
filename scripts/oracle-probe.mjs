// Multi-step experiments on the oracle demo page that one trace cannot hold.
// Each probe writes parity/findings/<item>.json. Every probe starts from a saved,
// clean page, undoes its steps, reloads, and checks the saved state came back (O1).
// Usage: node scripts/oracle-probe.mjs L4 | E3E6 | PANEL | INSET | SETTINGS [options json] | OPTION <[tab,label]> <name> | DIVIDER | T13 | BATCH | KEYS
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

