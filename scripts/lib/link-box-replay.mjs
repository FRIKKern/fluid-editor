// E7: walk a recorded run on a Button with real presses and keys, and compare what shows at each read: which view of the
// link editor, the block, the focus, the list, the tip, the box. Positions go by the toolbar's link button, since the
// block stands elsewhere here. Steps that only set up the oracle's page become one Button on a fresh page.
import { browser, cdp, evalJs, goto, mouse, pause, viewport, waitFor } from './cmux.mjs';
import { BASE } from './base.mjs';

const BUTTONS = { 'Open link editor popover': '#block-toolbar [data-tb="link"]', Edit: '#block-toolbar [data-tb="edit"]', 'Attach link': '#block-panel [data-link="open"]', 'Open link in new tab': '#link-popover .lk-box', URL: '#link-popover .lk-pill', Email: '#link-popover .lk-kind[data-kind="email"]', Phone: '#link-popover .lk-kind[data-kind="phone"]', 'Clear selected page': '#link-popover .lk-row .lk-clear', Undo: '#undo' };
const FIELDS = { To: '#link-popover [data-f="to"]', 'Enter phone number': '#link-popover [data-f="phone"]' };
const SEE = `(() => { const P = document.getElementById('link-popover'), a = document.activeElement, q = (s) => P.querySelector(s), on = (e) => !!e && e.getBoundingClientRect().width > 0;
  const box = !P.hidden && P.classList.contains('is-box'), field = !P.hidden && !box, tip = q('.lk-tip');
  const name = !a || a === document.body ? null : a.closest('#site-frame') || a.id === 'site-frame' ? 'frame' : a.matches('input') ? 'field' : a.matches('.lk-pill') ? q('.lk-pill').textContent.trim() : a.matches('[data-tb="link"]') ? 'Open link editor popover' : a.getAttribute('aria-label') || a.textContent.trim();
  return JSON.stringify({ selected: !!document.querySelector('#block-toolbar [data-tb="link"]') && !document.getElementById('block-toolbar').hidden, view: box ? 'box' : field ? P.dataset.kind : 'closed', row: box ? q('.lk-box-row').getAttribute('aria-label') : null, focus: name, value: a?.matches?.('input') ? a.value : null,
    list: field && on(q('.lk-pages')), ticked: field && q('.lk-box') ? q('.lk-box').checked : null, tip: box && tip && getComputedStyle(tip).display !== 'none' ? tip.textContent.replace(location.origin, '') : null }); })()`;

// What the oracle's read says, in the same words. Its link-button tip and its typed scheme are written otherwise.
function oracleSees(reads, name) {
  const r = reads[name] || {}, labels = (r.controls || []).filter((c) => c.box[0] < 700 && c.box[1] > 200 && c.box[1] < 900), has = (l) => labels.some((c) => c.label === l);
  const f = r.focused, fix = (s) => String(s).replace('<https>', 'https://');
  const view = has('Remove Link') ? 'box' : has('Email') ? 'email' : has('Phone') ? 'phone' : has('URL') ? 'url' : 'closed';
  const row = view === 'box' ? fix(labels.find((c) => c.box[3] >= 60 && c.box[2] > 200).label) : null;
  const focus = f === 'frame' ? 'frame' : !f ? null : f.tag === 'input' ? 'field' : fix(f.label);
  const above = reads[`${name}, above`]?.looks?.find((x) => x.text.startsWith('<site>'));
  return { selected: has('Primary'), view, row, focus, value: f?.tag === 'input' ? fix(f.value) : null, list: labels.some((c) => /^Services/.test(c.label)), ticked: view === 'url' ? r.checks?.[0]?.checked ?? null : null, tip: above ? above.text.replace('<site>', '') : null };
}

export async function replayLinkBox(S, finding, add) {
  viewport(S, 1600, 945);
  let dx = 0, dy = 0;
  const fresh = async () => {
    goto(S, `${BASE}/index.html?replay`); waitFor(S, '(() => !!window.fe)()', 20);
    evalJs(S, `(() => { fe.load({ ...fe.model, sections: [{ ...fe.model.sections[0], blocks: [] }] }); fe.addBlock(fe.model.sections[0].id, 'Button'); const s = fe.model.sections[0]; fe.select(s.id, s.blocks[0].id); return 1; })()`);
    await pause(150);
  };
  const place = () => { const q = evalJs(S, `(() => { const r = document.querySelector('#block-toolbar [data-tb="link"]').getBoundingClientRect(); return JSON.stringify([r.left, r.top]); })()`); dx = q[0] - 249.8; dy = q[1] - 242.2; };
  await fresh(); place();
  for (const [op, ...a] of finding.steps) {
    if (op === 'add' && a[1] === 'Text') break; // a Text block's case is read by itself
    if (op === 'exit') await fresh();
    else if (op === 'select') { evalJs(S, `(() => { const s = fe.model.sections[0]; fe.select(s.id, s.blocks[0].id); return 1; })()`); await pause(120); place(); }
    else if (op === 'click') { browser(S, 'click', BUTTONS[a[0]]); await pause(150); }
    else if (op === 'keysFast') { cdp(S, { op: 'presses', keys: [...a[0]] }); await pause(120); }
    else if (op === 'press') { browser(S, 'press', a[0]); await pause(100); }
    else if (op === 'fill') { browser(S, 'fill', FIELDS[a[0]], a[1]); browser(S, 'press', 'Enter'); await pause(100); }
    else if (op === 'moveAt') { mouse(S, 'move', a[0] + dx, a[1] + dy); await pause(100); }
    else if (op === 'clickAt') { const at = [a[0] + dx, a[1] + dy]; mouse(S, 'move', ...at); mouse(S, 'down', ...at); mouse(S, 'up', ...at); await pause(120); }
    else if (op === 'read' && !a[0].endsWith(', above') && !a[0].startsWith('skip ') && !finding.setAside?.[a[0]]) {
      const was = oracleSees(finding.reads, a[0]), ours = evalJs(S, SEE);
      // With no block selected the focus isn't the link editor's. The capture cuts long labels short.
      const same = (k) => (k === 'focus' && (!was.selected || !('focused' in (finding.reads[a[0]] || {})))) || JSON.stringify(was[k]) === JSON.stringify(ours[k]) || ((k === 'row' || k === 'focus') && was[k] && String(ours[k]).startsWith(was[k]));
      add(a[0], Object.keys(was).filter((k) => !same(k)).map((k) => `${k}: oracle ${JSON.stringify(was[k])}, ours ${JSON.stringify(ours[k])}`), ours);
    }
  }
}
