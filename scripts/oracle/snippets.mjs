// JavaScript that runs inside the Squarespace editor page (the oracle).
// Read only, except SELECT, KEY and BUTTON, which act like a person would.
// The page canvas is the same-origin iframe #sqs-site-frame.

const FRAME = `const f = document.getElementById('sqs-site-frame'); const d = f && f.contentDocument; const W = f && f.contentWindow;`;

export const READY = `(() => { ${FRAME} return !!(d && d.querySelector('.fluid-engine.is-editing .fe-block')); })()`;

export const LOADED = `(() => { ${FRAME} return !!(d && d.querySelector('.fluid-engine .fe-block')); })()`;

export const ENTER_EDIT = `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Edit');
  if (b) b.click();
  return JSON.stringify(!!b);
})()`;

// State of one section in the layout the frame shows. Areas come from the editor's
// own per-block style tag (data-test="fluid-engine-grid-css"), not from layout math.
export const READ = (index) => `(() => {
  ${FRAME}
  const fe = d.querySelectorAll('.fluid-engine')[${index}];
  const rowEl = fe.querySelector('.fe-grid-row');
  const sectionId = rowEl ? [...rowEl.classList].find((c) => c.startsWith('rows-')).replace(/^rows-/, '').replace(/-\\d+$/, '') : null;
  const layout = W.innerWidth >= 768 ? 'desktop' : 'mobile';
  const cs = W.getComputedStyle(fe);
  const blocks = {}, content = {};
  for (const b of fe.querySelectorAll(':scope > .fe-block')) {
    const id = b.dataset.blockId;
    const css = b.querySelector('style[data-test="fluid-engine-grid-css"]').textContent;
    const parts = css.split('@media (min-width: 768px)');
    const part = layout === 'desktop' ? parts[1] : parts[0];
    blocks[id] = {
      area: part.match(/grid-area:\\s*([\\d/-]+)/)[1].split('/').map(Number),
      z: Number(part.match(/z-index:\\s*(-?\\d+)/)[1]),
    };
    const kind = b.querySelector('[data-sqsp-block]')?.dataset.sqspBlock || 'unknown';
    content[id] = kind === 'text' ? { type: 'text', html: b.querySelector('.sqs-html-content')?.innerHTML.trim() || '' } : { type: kind };
  }
  const btn = (n) => [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || x.textContent.trim()) === n);
  const off = (b) => !b || b.disabled === true || b.getAttribute('aria-disabled') === 'true';
  return JSON.stringify({
    sectionId, layout, frameWidth: W.innerWidth,
    gap: parseFloat(cs.columnGap), rowGap: parseFloat(cs.rowGap),
    rows: cs.gridTemplateRows.split(' ').length,
    blocks, content,
    saveDisabled: off(btn('Save')), undoDisabled: off(btn('Undo')),
  });
})()`;

export const SELECT = (index, blockId) => `(() => {
  ${FRAME}
  const fe = d.querySelectorAll('.fluid-engine')[${index}];
  const b = fe.querySelector('.fe-block[data-block-id="${blockId}"]');
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, composed: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', view: W };
  b.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, buttons: 1 }));
  b.dispatchEvent(new W.MouseEvent('mousedown', { ...o, buttons: 1 }));
  b.dispatchEvent(new W.PointerEvent('pointerup', { ...o, buttons: 0 }));
  b.dispatchEvent(new W.MouseEvent('mouseup', { ...o, buttons: 0 }));
  b.dispatchEvent(new W.MouseEvent('click', { ...o, buttons: 0 }));
  return JSON.stringify(b.dataset.isSelected);
})()`;

export const KEY = (index, blockId, key) => `(() => {
  ${FRAME}
  const fe = d.querySelectorAll('.fluid-engine')[${index}];
  const b = fe.querySelector('.fe-block[data-block-id="${blockId}"]');
  const t = d.activeElement && d.activeElement !== d.body ? d.activeElement : b;
  const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  for (const type of ['keydown', 'keyup']) t.dispatchEvent(new W.KeyboardEvent(type, { key: '${key}', code: '${key}', keyCode: codes['${key}'], which: codes['${key}'], bubbles: true, cancelable: true, composed: true }));
  return JSON.stringify(true);
})()`;

export const BUTTON = (name) => `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || x.textContent.trim()) === '${name}');
  if (!b || b.disabled) return JSON.stringify(false);
  b.click();
  return JSON.stringify(true);
})()`;
