// The phone order of a section built here: replays CAP-NEWORDER* and the desktop edits (CAP-DESKMOVE*,
// CAP-ORDER) with the real mouse and keys, and compares every read: which block (by z), its desktop and
// phone area, in order, and that the phone draws those rows. Usage: npm run neworder-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, drag, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`);
await pause(1200);

// Named misses, with no rule read yet.
const KNOWN = new Set(JSON.parse(readFileSync(new URL('../parity/neworder-known.json', import.meta.url))));
const ONLY = process.argv[2]?.split(',');
const FILES = ONLY ?? ['CAP-NEWORDER', 'CAP-NEWORDER2', 'CAP-NEWORDER3', 'CAP-NEWORDER4', 'CAP-NEWORDER5', 'CAP-NEWORDER6', 'CAP-DESKMOVE', 'CAP-DESKMOVE2', 'CAP-DESKMOVE3', 'CAP-DESKMOVE4', 'CAP-DESKMOVE5', 'CAP-DESKMOVE6', 'CAP-DESKMOVE7', 'CAP-DESKMOVE8', 'CAP-DESKMOVE9', 'CAP-ORDER', 'CAP-TURNTEST', 'CAP-TURNTEST2', 'CAP-CYCLE', 'CAP-CYCLE2', 'CAP-CYCLE3', 'CAP-TURNTEST3', 'CAP-CYCLE4', 'CAP-NEWORDER7', 'CAP-TURNTEST4', 'CAP-A2EDITS', 'CAP-A2EDITS2', 'CAP-A2ROUND1', 'CAP-A2ROUND2'];
let quiet = false; // nothing selected since the last Escape, so another one is a wasted call
const press = (k) => { if (k === 'Escape' && quiet) return; browser(S, 'press', k); quiet = k === 'Escape'; };
// The oracle's blocks sit in phone order in the page, and a step names one by its place there.
const blockAt = (k) => evalJs(S, `JSON.stringify([...fe.model.sections[0].blocks].sort((a, b) => a.layout.mobile.area[0] - b.layout.mobile.area[0])[${k}].id)`);
const point = (id, part) => evalJs(S, `(() => { const part = ${JSON.stringify(part)}, f = document.getElementById('site-frame'), W = f.contentWindow, b = f.contentDocument.querySelector('.fe-block[data-block-id="${id}"]'), r = f.getBoundingClientRect(); let q = b.getBoundingClientRect(); if (q.top < 150 || q.bottom > W.innerHeight - 150) { W.scrollTo({ top: W.scrollY + q.top - 200, behavior: 'instant' }); q = b.getBoundingClientRect(); } return JSON.stringify([r.left + q.left + q.width * (part === 'middle' ? 0.5 : part.includes('w') ? 0 : part.includes('e') ? 1 : 0.5), r.top + q.top + q.height * (part === 'middle' ? 0.5 : part.includes('n') ? 0 : part.includes('s') ? 1 : 0.5)]); })()`);
const pasteIn = (html) => evalJs(S, `(() => { const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow, t = d.activeElement; const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(html)}); dt.setData('text/plain', ${JSON.stringify(html)}.replace(/<[^>]+>/g, '')); t.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1; })()`);
const click = async (id, mods = []) => { const p = point(id, 'middle'); mouse(S, 'move', p[0], p[1], { mods }); mouse(S, 'down', p[0], p[1], { buttons: 1, mods }); await pause(30); mouse(S, 'up', p[0], p[1], { mods }); quiet = false; await pause(80); };

// The capture's drag, with the block as far down the frame as on the probe page: a long drag runs
// near the window edge, the page scrolls a little, and it lands a row further (CAP-LONGDRAG).
const DRAG = { steps: 12, holdMs: 200 };
evalJs(S, `(() => { document.getElementById('site-frame').contentDocument.body.style.paddingTop = '185px'; return 1; })()`);
const cases = [];
for (const file of FILES) {
  const F = JSON.parse(readFileSync(new URL(`../parity/findings/${file}.json`, import.meta.url)));
  let last = null, view = 'desktop', held = false; // held: a group or a handle waits for the next drag, so no Escape first
  const pick = (k) => (k === 'new' ? last : blockAt(k));
  for (const step of F.steps) {
    const [op] = step;
    if (op === 'blank') {
      view = 'desktop';
      evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'medium', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 2 }, phoneFollows: true, blocks: [] }] }); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
    } else if (op === 'add') {
      last = evalJs(S, `(() => { fe.addBlock('s', ${JSON.stringify(step[2])}); return JSON.stringify(fe.model.sections[0].blocks.find((b, k, all) => b.layout.desktop.z === Math.max(...all.map((x) => x.layout.desktop.z))).id); })()`);
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
    } else if (op === 'keysFast') {
      // Real keys never reached a new text block on the oracle (CAP-A2TYPED), so these reads have no typing.
      quiet = false;
    } else if (op === 'stubClipboard') {
      // the oracle needs one; ours keeps its own
    } else if (op === 'read') {
      const r = F.reads[step[1]];
      if (!r.stack && !r.areas) continue;
      const z = !!r.stack?.[0]?.z;
      const rows = (r.stack ? r.stack.map((b) => [b.desktop, b.phone, ...(z ? [Number(b.z[0])] : [])]) : r.areas).sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
      const ours = evalJs(S, `JSON.stringify(fe.model.sections[0].blocks.map((b) => [b.layout.desktop.area.join('/'), b.layout.mobile.area.join('/'), ...(${z} ? [b.layout.desktop.z] : [])]).sort((a, b) => parseInt(a[1]) - parseInt(b[1])))`);
      const same = JSON.stringify(ours) === JSON.stringify(rows);
      // What the phone draws, not only what the model says: stale CSS put a drag 2 rows off (task-62dadddadb37e31f).
      const drawn = evalJs(S, `(async () => { const bp = fe.bp; fe.setBp('mobile'); await new Promise((r) => setTimeout(r, 60)); const d = document.getElementById('site-frame').contentDocument, out = fe.model.sections[0].blocks.filter((b) => { const c = d.defaultView.getComputedStyle(d.querySelector('.fe-block[data-block-id="' + b.id + '"]')); return parseInt(c.gridRowStart) !== b.layout.mobile.area[0]; }).map((b) => b.id); fe.setBp(bp); await new Promise((r) => setTimeout(r, 60)); return JSON.stringify(out); })()`);
      const ok = same && !drawn.length, name = `${file} ${step[1]}`;
      cases.push({ name, same: ok, known: !ok && KNOWN.has(name), diffs: ok ? [] : [`oracle ${JSON.stringify(rows)}, ours ${JSON.stringify(ours)}, phone draws other rows for ${JSON.stringify(drawn)}`] });
    }
  }
}
const fails = cases.filter((c) => !c.same && !c.known), known = cases.filter((c) => c.known);
for (const c of [...fails, ...known]) console.log(c.known ? 'known' : 'DIFF', c.name, c.diffs[0]);
console.log(`Phone order: ${cases.length - fails.length - known.length} of ${cases.length} match, ${known.length} named known miss`);
writeFileSync(new URL('../parity/neworder-check.json', import.meta.url), `${JSON.stringify({ check: 'phone order of a section built here', pass: cases.length - fails.length - known.length, total: cases.length, known: known.map((c) => c.name), fails: fails.map((c) => c.name) }, null, 2)}\n`);
process.exit(fails.length ? 1 : 0);
