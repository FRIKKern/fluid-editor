// Multi-step experiments on the oracle demo page that one trace cannot hold.
// Each probe writes parity/findings/<item>.json. Every probe starts from a saved,
// clean page, undoes its steps, reloads, and checks the saved state came back (O1).
// Usage: node scripts/oracle-probe.mjs L4 | E3E6
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { evalJs, waitFor, reload, pause } from './lib/cmux.mjs';
import { READY, LOADED, ENTER_EDIT, KEY, BUTTON } from './oracle/snippets.mjs';
import { select, click, editText, pasteHtml, escape, deselect } from './oracle/ui.mjs';

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
