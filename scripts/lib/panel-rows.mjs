// One way to read a panel's rows, for the oracle (scripts/oracle-coverage.mjs) and ours (scripts/coverage-check.mjs).
// A row is a name and the kinds of control that go with it. Nothing here presses anything.
// rowsJs(root) is a JS expression that gives JSON: [{ n: name, k: [kinds], v?: value, reset?: true, off?: true }]. off: the control is there but disabled or marked not built.
export const rowsJs = (root) => `(() => { const root = ${root}; if (!root) return JSON.stringify(null);
  const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none'; };
  const kindOf = (e) => { const t = e.tagName, r = e.getAttribute('role'), ty = e.type;
    if (/check-element/.test(String(e.className))) return 'switch';
    if (r === 'radiogroup') return 'choice'; if (r === 'slider' || ty === 'range') return 'slider';
    if (r === 'switch' || r === 'checkbox' || ty === 'checkbox') return 'switch'; if (r === 'radio' || ty === 'radio') return 'choice';
    if (t === 'SELECT' || r === 'combobox') return 'menu'; if (t === 'TEXTAREA' || e.isContentEditable) return 'area'; if (t === 'INPUT') return 'field';
    if (t === 'BUTTON' || r === 'button' || t === 'A') return 'button'; return null; };
  const r0 = (e) => e.getAttribute('role');
  const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const rows = []; let cur = null;
  const open = (n) => { cur = { n, k: [] }; rows.push(cur); return cur; };
  const walk = (e) => {
    if (!vis(e) || e.getAttribute('role') === 'tablist') return;
    const k = e.querySelector('[role=tablist]') ? null : kindOf(e);
    if (k) {
      const title = e.getAttribute('title'), aria = clean(e.getAttribute('aria-label') || (title === 'Not built yet' ? '' : title));
      const off = e.hasAttribute('data-unbuilt') || e.disabled === true;
      const lines = (e.innerText || '').split('\\n').map(clean).filter(Boolean);
      if (/^reset/i.test(aria)) { if (cur) cur.reset = true; return; }
      const name = aria || (k === 'button' || k === 'menu' || (k === 'switch' && e.tagName === 'DIV') ? lines[0] : '') || clean(e.getAttribute('placeholder'));
      if (k === 'choice' && r0(e) !== 'radiogroup') { if (cur && !cur.k.includes('choice')) cur.k.push('choice'); return; }
      if (k === 'button' && !name) { if (cur && !cur.k.length) cur.k.push('button'); return; }
      if (!name || (cur && cur.n === name)) {
        if (!cur) open('(no name)');
        if (!cur.k.includes(k)) cur.k.push(k);
      } else { open(name).k.push(k); }
      if (off && cur) cur.off = true;
      if (k === 'button' && lines.length > 1) cur.v = lines.slice(lines[0] === name ? 1 : 0).join(' ').slice(0, 60);
      return;
    }
    const own = clean([...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' '));
    if (own && !(cur && cur.n === own)) open(own.slice(0, 80));
    for (const c of e.children) walk(c);
  };
  for (const c of root.children) walk(c);
  return JSON.stringify(rows.filter((r) => r.n !== '(no name)' || r.k.length));
})()`;

// The tabs inside a panel, by their words.
export const tabsJs = (root) => `(() => { const root = ${root}; if (!root) return JSON.stringify([]); return JSON.stringify([...root.querySelectorAll('[role=tab]')].filter((t) => t.getBoundingClientRect().width > 1).map((t) => (t.getAttribute('aria-label') || t.textContent || '').replace(/\\s+/g, ' ').trim())); })()`;

// What can be pressed anywhere on screen, by name, in the page and in frameExpr's document. For telling what a state adds.
export const labelsJs = (frameExpr = 'null') => `(() => { const seen = new Set(); const read = (d) => { for (const e of d.querySelectorAll('button, a, [role=button], [role=menuitem], [role=menuitemradio], [role=option]')) { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue; const c = e.ownerDocument.defaultView.getComputedStyle(e); if (c.visibility === 'hidden' || Number(c.opacity) <= 0.05) continue; const t = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || '').replace(/\\s+/g, ' ').trim(); if (t && t.length <= 60) seen.add(t); } }; read(document); const f = ${frameExpr}; if (f && f.contentDocument) read(f.contentDocument); return JSON.stringify([...seen]); })()`;
