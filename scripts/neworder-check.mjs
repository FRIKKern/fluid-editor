// The phone order of a section built here: replays CAP-NEWORDER* and the desktop edits (CAP-DESKMOVE*,
// CAP-ORDER), or with --text the text that grows or shrinks (CAP-TEXTPUSH*), with the real mouse and keys, and compares every
// read: which block (by z), its desktop and phone area, in order, the section's rows where read, and that the
// phone draws those rows. Usage: npm run neworder-check runs a sample in under 2 min and lists every named miss;
// -- --full replays every read, about 25 min, and writes parity/neworder-check.json; npm run textpush-check runs --text.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, drag, browser, cdp } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`);
await pause(1200);

// Named misses, with no rule read yet.
const KNOWN = new Set(JSON.parse(readFileSync(new URL('../parity/neworder-known.json', import.meta.url))));
// npm run textpush-check: the reads of text that grows or shrinks (R2), about 13 min, kept apart for its typing.
const TEXT = process.argv[2] === '--text', FULL = process.argv[2] === '--full';
// The sample: file and the sections in it, by their place. New blocks, moves, turns, copies, deletes, typing,
// a long drag, text that grows, shrinks and undoes, and a named miss so a change there shows.
const SAMPLE = { 'CAP-NEWORDER3': [1], 'CAP-NEWORDER7': [3], 'CAP-DESKMOVE5': [6], 'CAP-TURNTEST4': [3], 'CAP-CYCLE4': [1], 'CAP-A2EDITS': [3, 9], 'CAP-A2ROUND2': [10], 'CAP-A2DELETE': [1], 'CAP-A2STOPNEW': [3], 'CAP-A2TYPED3': [4], 'CAP-A2TYPEDNEW': [0], 'CAP-LONGDRAG': [0], 'CAP-TEXTPUSH5': [1, 15], 'CAP-TEXTPUSH7': [2, 9] };
const ONLY = TEXT ? ['CAP-TEXTPUSH', 'CAP-TEXTPUSH2', 'CAP-TEXTPUSH3', 'CAP-TEXTPUSH4', 'CAP-TEXTPUSH5', 'CAP-TEXTPUSH6', 'CAP-TEXTPUSH7'] : process.argv[2] && !FULL ? process.argv[2].split(',') : null;
const FILES = ONLY ?? (FULL ? ['CAP-NEWORDER', 'CAP-NEWORDER2', 'CAP-NEWORDER3', 'CAP-NEWORDER4', 'CAP-NEWORDER5', 'CAP-NEWORDER6', 'CAP-DESKMOVE', 'CAP-DESKMOVE2', 'CAP-DESKMOVE3', 'CAP-DESKMOVE4', 'CAP-DESKMOVE5', 'CAP-DESKMOVE6', 'CAP-DESKMOVE7', 'CAP-DESKMOVE8', 'CAP-DESKMOVE9', 'CAP-ORDER', 'CAP-TURNTEST', 'CAP-TURNTEST2', 'CAP-CYCLE', 'CAP-CYCLE2', 'CAP-CYCLE3', 'CAP-TURNTEST3', 'CAP-CYCLE4', 'CAP-NEWORDER7', 'CAP-TURNTEST4', 'CAP-A2EDITS', 'CAP-A2EDITS2', 'CAP-A2ROUND1', 'CAP-A2ROUND2', 'CAP-A2DELETE', 'CAP-A2STOPNEW', 'CAP-A2TYPED3', 'CAP-A2TYPEDNEW', 'CAP-LONGDRAG'] : Object.keys(SAMPLE));
let quiet = false; // nothing selected since the last Escape, so another one is a wasted call
// After typing, the first Escape only closes the editor, so the next one counts too.
let loud = 0;
const press = (k) => { if (k === 'Escape' && quiet && loud <= 0) return; if (k === 'Escape') loud--; browser(S, 'press', k); quiet = k === 'Escape'; };
// The oracle's blocks sit in phone order in the page, and a step names one by its place there.
const blockAt = (k) => evalJs(S, `JSON.stringify([...fe.model.sections[0].blocks].sort((a, b) => a.layout.mobile.area[0] - b.layout.mobile.area[0])[${k}].id)`);
const point = (id, part) => evalJs(S, `(() => { const part = ${JSON.stringify(part)}, f = document.getElementById('site-frame'), W = f.contentWindow, b = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]'), r = f.getBoundingClientRect(); let q = b.getBoundingClientRect(); if (q.top < 150 || q.bottom > W.innerHeight - 150) { W.scrollTo({ top: W.scrollY + q.top - 200, behavior: 'instant' }); q = b.getBoundingClientRect(); } return JSON.stringify([r.left + q.left + q.width * (Array.isArray(part) ? part[0] : part === 'middle' ? 0.5 : part.includes('w') ? 0 : part.includes('e') ? 1 : 0.5), r.top + q.top + q.height * (Array.isArray(part) ? part[1] : part === 'middle' ? 0.5 : part.includes('n') ? 0 : part.includes('s') ? 1 : 0.5)]); })()`);
const pasteIn = (html) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, t = d.activeElement; const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(html)}); dt.setData('text/plain', ${JSON.stringify(html)}.replace(/<[^>]+>/g, '')); t.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1; })()`);
const writeOn = () => { const p = evalJs(S, `(() => { const q = document.querySelector('[data-tb="write"]').getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); })()`); mouse(S, 'move', p[0], p[1]); mouse(S, 'down', p[0], p[1], { buttons: 1 }); mouse(S, 'up', p[0], p[1]); };
// In the text reads a Text under another block still got the press on the oracle (CAP-TEXTPUSH4 s3): press a part no block covers.
const onTop = (id) => { point(id, 'middle'); return evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, b = d.querySelector('.fe-block[data-block-id="${id}"]'), r = f.getBoundingClientRect(), q = b.getBoundingClientRect(); for (const [fx, fy] of [[.5, .5], [.5, .2], [.9, .2], [.9, .5], [.1, .2], [.9, .9], [.5, .9], [.1, .9]]) { const x = q.left + q.width * fx, y = q.top + q.height * fy, e = d.elementFromPoint(x, y); if (e && b.contains(e)) return JSON.stringify([r.left + x, r.top + y]); } return JSON.stringify([r.left + q.left + q.width / 2, r.top + q.top + q.height / 2]); })()`); };
let inTextReads = false;
const click = async (id, mods = []) => { const p = inTextReads ? onTop(id) : point(id, 'middle'); mouse(S, 'move', p[0], p[1], { mods }); mouse(S, 'down', p[0], p[1], { buttons: 1, mods }); await pause(30); mouse(S, 'up', p[0], p[1], { mods }); quiet = false; await pause(80); };

// The capture's drag, with the block as far down the frame as on the probe page: a long drag runs
// near the window edge, the page scrolls a little, and it lands a row further (CAP-LONGDRAG).
const DRAG = { steps: 12, holdMs: 200 };
// And as much page below the section: 633px. With less, a scroll to a low block stops short and a long
// drag starts lower in the window, runs into the edge and lands a row off (CAP-RESIZESCROLL.json tails).
evalJs(S, `(() => { const b = document.getElementById('site-frame').contentDocument.body; b.style.paddingTop = '185px'; b.style.paddingBottom = '633px'; return 1; })()`);
const cases = [];
for (const file of FILES) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  let last = null, view = 'desktop', held = false, writing = false; // held: a group or a handle waits for the next drag, so no Escape first
  const pick = (k) => (k === 'new' ? last : blockAt(k));
  inTextReads = file.startsWith('CAP-TEXTPUSH');
  const parts = !ONLY && !FULL ? SAMPLE[file] : null;
  let part = -1;
  for (const step of F.steps) {
    const [op] = step;
    if (op === 'blank') part++;
    if (parts && !parts.includes(part)) continue;
    if (op === 'blank') {
      view = 'desktop';
      evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 2 }, phoneFollows: true, blocks: [] }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
    } else if (op === 'add') {
      // The capture's add finds its tile with the page back at the top (CAP-DRAGSCROLL.json: 44 and 10 become 0).
      last = evalJs(S, `(() => { document.getElementById('site-frame').contentWindow.scrollTo(0, 0); fe.addBlock('s', ${JSON.stringify(step[2])}); return JSON.stringify(fe.model.sections[0].blocks.find((b, k, all) => b.layout.desktop.z === Math.max(...all.map((x) => x.layout.desktop.z))).id); })()`);
      await pause(3); quiet = false; press('Escape'); await pause(40);
    } else if (op === 'view') {
      view = step[1] === 'Mobile' ? 'mobile' : 'desktop';
      evalJs(S, `(async () => { fe.setBp('${step[1] === 'Mobile' ? 'mobile' : 'desktop'}'); await new Promise((r) => setTimeout(r, 200)); return 1; })()`);
    } else if (op === 'press') {
      press(step[1]); await pause(80);
    } else if (op === 'deselect') {
      press('Escape'); await pause(40); held = false;
    } else if (op === 'select' || op === 'pick') {
      press('Escape'); await pause(40); await click(pick(step[2])); held = true;
    } else if (op === 'shiftClick') {
      await click(pick(step[2]), ['Shift']); held = true;
    } else if (op === 'drag') {
      // At the very top of the page our toolbar covers a one-row block's south handle (the oracle's probe had room above): press the corner.
      const id = pick(step[2]), part = view === 'mobile' && step[3] === 's' ? 'se' : step[3];
      if (!held) { press('Escape'); await pause(40); }
      held = false; quiet = false;
      const p = point(id, part);
      drag(S, p, [p[0] + step[4], p[1] + step[5]], DRAG); await pause(150);
    } else if (op === 'groupDrag') {
      const at = evalJs(S, `(() => { const f = document.getElementById('site-frame'), fr = f.getBoundingClientRect(), qs = [...f.contentDocument.querySelectorAll('.fe-block.is-group-member, .fe-block[data-is-selected="true"]')].map((b) => b.getBoundingClientRect()); return JSON.stringify([fr.left + Math.max(...qs.map((q) => q.right)), fr.top + Math.max(...qs.map((q) => q.bottom))]); })()`);
      held = false; quiet = false;
      drag(S, at, [at[0] + step[2], at[1] + step[3]], DRAG); await pause(150);
    } else if (op === 'editText') {
      press('Escape'); await pause(40); const id = pick(step[2]); await click(id); await pause(120); await click(id); await pause(200); quiet = false;
    } else if (op === 'pasteMid') {
      pasteIn(step[3]); await pause(200); quiet = false;
    } else if (op === 'click' && step[1] === 'Write') {
      // A press that hit another block has no Write, on the oracle too (CAP-TEXTPUSH2 q4, CAP-TEXTPUSH4 s4).
      writing = evalJs(S, `!!document.querySelector('[data-tb="write"]')`);
      if (writing) { writeOn(); await pause(250); quiet = false; loud = 2; }
    } else if (op === 'click') {
      const at = evalJs(S, `(() => { const L = ${JSON.stringify(step[1])}, e = [...document.querySelectorAll('#text-bar button, .tx-menu button, [class*=tx-] button')].find((x) => x.getBoundingClientRect().width > 0 && (x.getAttribute('aria-label') === L || x.textContent.trim() === L)), q = e.getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); })()`);
      mouse(S, 'move', at[0], at[1]); mouse(S, 'down', at[0], at[1], { buttons: 1 }); mouse(S, 'up', at[0], at[1]); await pause(200);
    } else if (op === 'keysList') {
      cdp(S, { op: 'presses', keys: step[1] }); await pause(300); loud = 2; quiet = false;
    } else if (op === 'keysFast') {
      // Keys after a double click never landed on the oracle (CAP-A2TYPED): those reads have no typing. After Write they do (CAP-A2TYPED3).
      if (writing) { cdp(S, { op: 'presses', keys: [...step[1]].map((c) => (c === ' ' ? 'Space' : c)) }); await pause(300); }
      if (writing) loud = 2;
      writing = false; quiet = false;
    } else if (op === 'stubClipboard') {
      // the oracle needs one; ours keeps its own
    } else if (op === 'read') {
      const r = F.reads[step[1]];
      if (!r.stack && !r.areas) continue;
      const z = !!r.stack?.[0]?.z;
      const rows = (r.stack ? r.stack.map((b) => [b.desktop, b.phone, ...(z ? [Number(b.z[0])] : [])]) : r.areas).sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
      // A text in edit keeps its area out of the model until the edit ends: read that one from the page.
      const ours = evalJs(S, `(() => { const live = (b, on) => { const e = on && document.getElementById('site-frame').contentDocument.querySelector('.fe-block.is-text-editing[data-block-id="' + b.id + '"]'); return e ? e.style.gridArea.split(' / ').join('/') : ''; }; return JSON.stringify(fe.model.sections[0].blocks.map((b) => [live(b, ${view === 'desktop'}) || b.layout.desktop.area.join('/'), live(b, ${view === 'mobile'}) || b.layout.mobile.area.join('/'), ...(${z} ? [b.layout.desktop.z] : [])]).sort((a, b) => parseInt(a[1]) - parseInt(b[1]))); })()`);
      const sectionRows = r.section?.rows, ourRows = evalJs(S, `fe.model.sections[0].rows.${view}`);
      const same = JSON.stringify(ours) === JSON.stringify(rows) && (sectionRows === undefined || sectionRows === ourRows);
      // What the phone draws, not only what the model says: stale CSS put a drag 2 rows off (task-62dadddadb37e31f).
      const drawn = evalJs(S, `!!document.getElementById('site-frame').contentDocument.querySelector('.is-text-editing')`) ? [] : evalJs(S, `(async () => { const bp = fe.bp; fe.setBp('mobile'); await new Promise((r) => setTimeout(r, 60)); const d = document.getElementById('site-frame').contentDocument, out = fe.model.sections[0].blocks.filter((b) => { const c = d.defaultView.getComputedStyle(d.querySelector('.fe-block[data-block-id="' + b.id + '"]')); return parseInt(c.gridRowStart) !== b.layout.mobile.area[0]; }).map((b) => b.id); fe.setBp(bp); await new Promise((r) => setTimeout(r, 60)); return JSON.stringify(out); })()`);
      const ok = same && !drawn.length, name = `${file} ${step[1]}`;
      cases.push({ name, same: ok, known: !ok && KNOWN.has(name), diffs: ok ? [] : [`oracle ${JSON.stringify(rows)} rows ${sectionRows}, ours ${JSON.stringify(ours)} rows ${ourRows}, phone draws other rows for ${JSON.stringify(drawn)}`] });
    }
  }
}
const fails = cases.filter((c) => !c.same && !c.known), known = cases.filter((c) => c.known);
for (const c of [...fails, ...known]) console.log(c.known ? 'known' : 'DIFF', c.name, c.diffs[0]);
if (!FULL && !TEXT && !ONLY) {
  const unrun = [...KNOWN].filter((n) => !cases.some((c) => c.name === n));
  console.log(`known, not run here, --full runs them: ${unrun.join('; ')}`);
}
console.log(`Phone order: ${cases.length - fails.length - known.length} of ${cases.length} match, ${known.length} named known miss`);
if (FULL || TEXT) writeFileSync(new URL(TEXT ? '../parity/textpush-check.json' : '../parity/neworder-check.json', import.meta.url), `${JSON.stringify({ check: 'phone order of a section built here', pass: cases.length - fails.length - known.length, total: cases.length, known: known.map((c) => c.name), fails: fails.map((c) => c.name) }, null, 2)}\n`);
process.exit(fails.length ? 1 : 0);
