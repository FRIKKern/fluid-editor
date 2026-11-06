// The full-screen image editor behind Edit > Edit image (T4, parity/findings/IMAGEEDITOR.json): Adjust,
// Crop and Filter over one picture, with its own undo. Save writes one new picture to the block; Cancel
// asks first if anything changed. Its numbers live in image-edit.js and image-filters.js.
import { ADJUST, RATIOS, SWAP_RATIO, applyColor, coverScale, filterPixel, ratioBox, startState, turnBox, turned } from './image-edit.js';
import { FILTER_ORDER } from './image-filters.js';

const svg = (d, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TABS = [
  ['adjust', 'Adjust', '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>'],
  ['crop', 'Crop', '<path d="M7 3v14h14M3 7h14v14"/>'],
  ['filter', 'Filter', '<circle cx="10" cy="10" r="6.5"/><circle cx="14" cy="14" r="6.5"/>'],
];
const ICON = {
  Brightness: '<circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  Contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  Saturation: '<defs><linearGradient id="ie-g"><stop stop-color="#fff"/><stop offset="1" stop-color="#222"/></linearGradient></defs><circle cx="12" cy="12" r="8" fill="url(#ie-g)"/>',
  Sharpness: '<path d="M12 5l8 14H4z"/>',
  Blur: '<circle cx="12" cy="12" r="8" fill="#888" stroke="#ccc" stroke-width="2"/>',
  Highlights: '<circle cx="12" cy="12" r="8"/><path d="M12 7h6M12 10h8M12 14h8M12 17h6"/>',
  Shadows: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/><path d="M12 8h7M12 12h8M12 16h7"/>',
};
const CROP_ROWS = [
  ['Original', 11, 130, 40], ['2:3', 11, 176, 44], ['3:4', 11, 225, 44], ['4:5', 11, 275, 44], ['9:16', 11, 324, 44], ['Custom', 11, 374, 40],
  ['1:1', 171, 130, 44], ['3:2', 171, 180, 44], ['4:3', 171, 229, 44], ['5:4', 171, 279, 44], ['16:9', 171, 328, 44],
];
const CROP_ACTS = [
  ['Flip X', 11, 452, '<path d="M12 4v16M3 7l6 5-6 5zM21 7l-6 5 6 5z"/>', 'flipX'], ['Flip Y', 171, 452, '<path d="M4 12h16M7 3l5 6 5-6zM7 21l5-6 5 6z"/>', 'flipY'],
  ['-90°', 11, 502, '<path d="M5 5v5h5M5.5 10a8 8 0 1 1-.5 4"/>', 'left'], ['90°', 171, 502, '<path d="M19 5v5h-5M18.5 10a8 8 0 1 0 .5 4"/>', 'right'],
];
const RESET_TOP = { adjust: 707, crop: 589 };
const fill = (min, max, v) => { const at = (x) => ((x - min) / (max - min)) * 100, z = at(Math.max(min, Math.min(max, 0))); return `--from:${Math.min(z, at(v))}%;--to:${Math.max(z, at(v))}%`; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function openImageEditor({ src, onSave, onFail }) {
  const img = new Image();
  img.onerror = () => onFail?.();
  img.onload = () => start(img, onSave, onFail);
  img.src = src;
}

function start(img, onSave, onFail) {
  const NW = img.naturalWidth, NH = img.naturalHeight, FIRST = startState();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let st = startState(), tab = 'adjust', past = [], future = [], before = null, queued = false, box = null, thumbKey = '', thumb = null;
  const root = document.createElement('div');
  root.id = 'image-editor';
  root.innerHTML = `<div class="ie-bar"><button type="button" class="ie-save" data-ie="save">Save</button><button type="button" class="ie-cancel" data-ie="cancel">Cancel</button>`
    + `<button type="button" class="ie-hist" aria-label="Undo" data-ie="undo" disabled>${svg('<path d="M8 7L4 11l4 4M4 11h11a5 5 0 0 1 0 10h-3"/>')}</button><button type="button" class="ie-hist" aria-label="Redo" data-ie="redo" disabled>${svg('<path d="M16 7l4 4-4 4M20 11H9a5 5 0 0 0 0 10h3"/>')}</button>`
    + `<div class="ie-tabs" role="tablist">${TABS.map(([k, l, d]) => `<button type="button" role="tab" class="ie-tab" aria-label="${l}" data-ie-tab="${k}">${svg(d)}<span class="ie-tip">${l}</span></button>`).join('')}</div></div>`
    + '<canvas class="ie-canvas"></canvas><div class="ie-frame" hidden></div><div class="ie-under"></div><div class="ie-panel"></div>';
  document.body.append(root);
  const canvas = root.querySelector('.ie-canvas'), frame = root.querySelector('.ie-frame'), under = root.querySelector('.ie-under'), panel = root.querySelector('.ie-panel');

  // Draw the picture as it stands, or only its crop, at a given size in pixels.
  function draw(c, outW, outH, cropped) {
    const [W, H] = turned(NW, NH, st.rot), b = cropped ? st.box : [0, 0, 1, 1];
    c.width = outW; c.height = outH;
    const g = c.getContext('2d', { willReadFrequently: true }), sx = outW / (b[2] * W), sy = outH / (b[3] * H), k = coverScale(st.straighten, W, H);
    g.setTransform(sx, 0, 0, sy, -b[0] * W * sx, -b[1] * H * sy);
    g.translate(W / 2, H / 2);
    g.scale(st.flipX ? -1 : 1, st.flipY ? -1 : 1);
    g.rotate(((st.rot + st.straighten) * Math.PI) / 180);
    g.scale(k, k);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, -NW / 2, -NH / 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return g;
  }
  function placed() {
    const maxW = innerWidth - 364, maxH = innerHeight - (tab === 'adjust' ? 123 : 199), [W, H] = turned(NW, NH, st.rot);
    const b = tab === 'crop' ? [0, 0, 1, 1] : st.box, w = b[2] * W, h = b[3] * H, k = Math.min(maxW / w, maxH / h);
    const dw = Math.round(w * k), dh = Math.round(h * k);
    return { left: Math.round(22 + maxW / 2 - dw / 2), top: Math.round(89 + (maxH - dh) / 2), w: dw, h: dh, pictureWidth: (dw / b[2]) * dpr };
  }
  function paint() {
    box = placed();
    const outW = Math.round(box.w * dpr), outH = Math.round(box.h * dpr), g = draw(canvas, outW, outH, tab !== 'crop');
    canvas.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.w}px;height:${box.h}px`;
    const d = g.getImageData(0, 0, outW, outH);
    applyColor(d.data, outW, outH, st, box.pictureWidth);
    g.putImageData(d, 0, 0);
    placeFrame();
  }
  const soon = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(); }); };

  function placeFrame() {
    frame.hidden = tab !== 'crop';
    if (frame.hidden) return;
    const [x, y, w, h] = st.box, X = x * box.w, Y = y * box.h, W = w * box.w, H = h * box.h;
    frame.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.w}px;height:${box.h}px`;
    const mid = st.ratio === 'Custom' ? ['n', 's', 'w', 'e'].map((m) => `<i class="ie-h ie-mid ie-${m}" data-h="${m}"></i>`).join('') : '';
    if (!frame.firstChild || frame.dataset.mid !== String(!!mid)) {
      frame.dataset.mid = String(!!mid);
      frame.innerHTML = `<b class="ie-dim"></b><b class="ie-dim"></b><b class="ie-dim"></b><b class="ie-dim"></b><div class="ie-box" data-h="move"><u></u><u></u><u></u><u></u>${['nw', 'ne', 'sw', 'se'].map((m) => `<i class="ie-h ie-c ie-${m}" data-h="${m}"></i>`).join('')}${mid}</div>`;
    }
    const dims = frame.querySelectorAll('.ie-dim');
    dims[0].style.cssText = `left:0;top:0;width:100%;height:${Y}px`;
    dims[1].style.cssText = `left:0;top:${Y + H}px;width:100%;bottom:0`;
    dims[2].style.cssText = `left:0;top:${Y}px;width:${X}px;height:${H}px`;
    dims[3].style.cssText = `left:${X + W}px;top:${Y}px;right:0;height:${H}px`;
    frame.querySelector('.ie-box').style.cssText = `left:${X}px;top:${Y}px;width:${W}px;height:${H}px`;
  }

  function paintThumbs() {
    const key = JSON.stringify([st.adjust, st.box, st.rot, st.flipX, st.flipY, st.straighten]);
    if (key !== thumbKey) {
      thumbKey = key;
      const c = document.createElement('canvas'), [W, H] = turned(NW, NH, st.rot), w = st.box[2] * W, h = st.box[3] * H, k = 130 / Math.min(w, h);
      const g = draw(c, Math.round(w * k), Math.round(h * k), true), x = Math.round((c.width - 130) / 2), y = Math.round((c.height - 130) / 2);
      const d = g.getImageData(x, y, 130, 130);
      applyColor(d.data, 130, 130, { ...st, filter: null }, c.width / st.box[2]);
      thumb = d;
    }
    for (const t of panel.querySelectorAll('canvas[data-ie-thumb]')) {
      const out = new ImageData(new Uint8ClampedArray(thumb.data), 130, 130), name = t.dataset.ieThumb;
      if (name !== 'Original') for (let i = 0; i < out.data.length; i += 4) { const f = filterPixel(name, out.data[i], out.data[i + 1], out.data[i + 2]); out.data[i] = f[0]; out.data[i + 1] = f[1]; out.data[i + 2] = f[2]; }
      t.getContext('2d').putImageData(out, 0, 0);
    }
  }

  const resetOn = () => (tab === 'adjust' ? !same(st.adjust, FIRST.adjust) : !same([st.ratio, st.box, st.rot, st.flipX, st.flipY, st.straighten], [FIRST.ratio, FIRST.box, FIRST.rot, FIRST.flipX, FIRST.flipY, FIRST.straighten]));
  const resetHtml = () => `<button type="button" class="ie-reset" style="top:${RESET_TOP[tab]}px" data-ie="reset"${resetOn() ? '' : ' disabled'}>Reset</button>`;
  function panelHtml() {
    const title = `<div class="ie-title">${TABS.find(([k]) => k === tab)[1]}</div>`;
    if (tab === 'adjust') return title + ADJUST.map(([n, min, max], i) => `<div class="ie-row" style="top:${141 + 77 * i}px"><span>${n}</span><input type="text" aria-label="${n}" data-ie-field="${n}" data-min="${min}" data-max="${max}" value="${st.adjust[n]}"><span class="ie-icon">${svg(ICON[n])}</span><input type="range" class="ie-range" aria-label="${n}" data-ie-range="${n}" min="${min}" max="${max}" step="1" value="${st.adjust[n]}" style="${fill(min, max, st.adjust[n])}"></div>`).join('') + resetHtml();
    if (tab === 'crop') {
      const icon = (r) => { const big = 16, w = r >= 1 ? big : big * r, h = r >= 1 ? big / r : big; return `<svg class="ie-ratio" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><rect x="${10 - w / 2}" y="${10 - h / 2}" width="${w}" height="${h}"/></svg>`; };
      return title + CROP_ROWS.map(([n, x, y, h]) => `<button type="button" class="ie-opt${RATIOS[n] ? ' has-icon' : ''}${st.ratio === n ? ' is-on' : ''}" style="left:${x}px;top:${y}px;height:${h}px" aria-pressed="${st.ratio === n}" data-ie-ratio="${n}">${RATIOS[n] ? icon(RATIOS[n]) : ''}<span>${n}</span></button>`).join('')
        + CROP_ACTS.map(([n, x, y, d, act]) => `<button type="button" class="ie-opt has-icon" style="left:${x}px;top:${y}px;height:44px" data-ie-act="${act}">${svg(d, 20)}<span>${n}</span></button>`).join('') + resetHtml();
    }
    return `${title}<div class="ie-list">${FILTER_ORDER.map((n) => { const on = (st.filter || 'Original') === n, orig = n === 'Original'; return `<button type="button" class="ie-tile${on ? ' is-on' : ''}" aria-label="${n}" aria-pressed="${on}" data-ie-filter="${n}"><canvas width="130" height="130" data-ie-thumb="${n}"></canvas>${orig ? '<em class="ie-orig"></em>' : `<em class="ie-chip">${n}</em>`}</button>`; }).join('')}</div>`;
  }
  function underHtml() {
    const cx = 22 + (innerWidth - 364) / 2;
    if (tab === 'crop') return `<div class="ie-straight" style="left:${cx - 153}px;top:${innerHeight - 77}px"><span aria-hidden="true">${svg('<rect x="6" y="7" width="12" height="10" transform="rotate(-20 12 12)"/>', 18)}</span><input type="range" class="ie-range" aria-label="Straighten" data-ie-straight min="-30" max="30" step="1" value="${st.straighten}" style="${fill(-30, 30, st.straighten)}"><span aria-hidden="true">${svg('<rect x="6" y="7" width="12" height="10" transform="rotate(20 12 12)"/>', 18)}</span></div>`;
    if (tab === 'filter' && st.filter) return `<div class="ie-strength" style="left:${cx - 150}px;top:${innerHeight - 75}px"><div><span>Strength</span><output>${st.strength} %</output></div><input type="range" class="ie-range" aria-label="Strength" data-ie-strength min="0" max="100" step="1" value="${st.strength}" style="${fill(0, 100, st.strength)}"></div>`;
    return '';
  }
  function render() {
    const list = panel.querySelector('.ie-list'), top = list?.scrollTop || 0;
    for (const t of root.querySelectorAll('[data-ie-tab]')) { const on = t.dataset.ieTab === tab; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); }
    root.querySelector('[data-ie="undo"]').disabled = !past.length;
    root.querySelector('[data-ie="redo"]').disabled = !future.length;
    panel.innerHTML = panelHtml();
    under.innerHTML = underHtml();
    if (tab === 'filter') { paintThumbs(); panel.querySelector('.ie-list').scrollTop = top; }
    paint();
  }
  function step(change) { const old = JSON.parse(JSON.stringify(st)); change(st); if (same(old, st)) return; past.push(old); future = []; render(); }
  const close = () => root.remove();

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.ieTab) { tab = d.ieTab; render(); return; }
    if (d.ieRatio) { const n = d.ieRatio; step((s) => { s.ratio = n; if (n !== 'Custom') { const [W, H] = turned(NW, NH, s.rot); s.box = ratioBox(n, W, H); } }); return; }
    if (d.ieAct) {
      const a = d.ieAct;
      step((s) => {
        if (a === 'flipX') s.flipX = !s.flipX;
        else if (a === 'flipY') s.flipY = !s.flipY;
        else {
          const by = a === 'right' ? 90 : -90, mirrored = s.flipX !== s.flipY;
          s.rot = (s.rot + (mirrored ? -by : by) + 360) % 360;
          s.box = turnBox(s.box, by === 90 ? 90 : -90);
          if (SWAP_RATIO[s.ratio]) s.ratio = SWAP_RATIO[s.ratio];
        }
      });
      return;
    }
    if (d.ieFilter) { const n = d.ieFilter; step((s) => { s.filter = n === 'Original' ? null : n; s.strength = 100; }); return; }
    if (d.ie === 'reset') { step((s) => { if (tab === 'adjust') s.adjust = { ...FIRST.adjust }; else Object.assign(s, { ratio: 'Original', box: [0, 0, 1, 1], rot: 0, flipX: false, flipY: false, straighten: 0 }); }); return; }
    if (d.ie === 'undo') { future.push(st); st = past.pop(); render(); return; }
    if (d.ie === 'redo') { past.push(st); st = future.pop(); render(); return; }
    if (d.ie === 'cancel') {
      if (same(st, FIRST)) { close(); return; }
      const dlg = document.createElement('div');
      dlg.className = 'ie-scrim';
      dlg.innerHTML = '<div class="ie-dialog" role="alertdialog"><p>Are you sure you want to discard your changes? This can\'t be undone.</p><div><button type="button" data-ie="resume">Resume</button><button type="button" data-ie="discard">Discard</button></div></div>';
      root.append(dlg);
      return;
    }
    if (d.ie === 'resume') { root.querySelector('.ie-scrim').remove(); return; }
    if (d.ie === 'discard') { close(); return; }
    if (d.ie === 'save') {
      if (same(st, FIRST)) { close(); return; }
      try {
        const [W, H] = turned(NW, NH, st.rot), w = st.box[2] * W, h = st.box[3] * H, k = Math.min(1, 1600 / Math.max(w, h));
        const c = document.createElement('canvas'), outW = Math.max(1, Math.round(w * k)), outH = Math.max(1, Math.round(h * k)), g = draw(c, outW, outH, true), px = g.getImageData(0, 0, outW, outH);
        applyColor(px.data, outW, outH, st, outW / st.box[2]);
        g.putImageData(px, 0, 0);
        const out = c.toDataURL('image/webp', 0.85);
        close();
        onSave({ src: out, aspect: w / h });
      } catch { close(); onFail?.(); }
    }
  });
  // A slider moves the picture as it goes and is one undo step when let go.
  const live = (i, set) => { before ??= JSON.parse(JSON.stringify(st)); const v = Number(i.value); set(v); i.style.cssText = fill(Number(i.min), Number(i.max), v); soon(); };
  root.addEventListener('input', (e) => {
    const i = e.target;
    if (i.dataset.ieRange) live(i, (v) => { st.adjust[i.dataset.ieRange] = v; panel.querySelector(`[data-ie-field="${i.dataset.ieRange}"]`).value = v; });
    else if ('ieStraight' in i.dataset) live(i, (v) => { st.straighten = v; });
    else if ('ieStrength' in i.dataset) live(i, (v) => { st.strength = v; under.querySelector('output').textContent = `${v} %`; });
  });
  root.addEventListener('change', (e) => {
    const i = e.target;
    if (i.dataset.ieField) { const n = parseFloat(i.value), name = i.dataset.ieField; const v = Number.isNaN(n) ? st.adjust[name] : Math.max(Number(i.dataset.min), Math.min(Number(i.dataset.max), Math.round(n))); step((s) => { s.adjust[name] = v; }); i.value = st.adjust[name]; return; }
    if (i.type === 'range' && before) { const old = before; before = null; if (!same(old, st)) { past.push(old); future = []; } render(); }
  });
  // The frame: a corner or an edge resizes, inside moves it, and the thirds show while it goes.
  frame.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-h]')?.dataset.h;
    if (!h) return;
    e.preventDefault();
    const start = [...st.box], x0 = e.clientX, y0 = e.clientY, old = JSON.parse(JSON.stringify(st)), [W, H] = turned(NW, NH, st.rot);
    const locked = st.ratio !== 'Custom', aspect = (start[2] * W) / (start[3] * H), MIN = 40 / Math.min(box.w, box.h);
    frame.classList.add('is-drag');
    const move = (m) => {
      const dx = (m.clientX - x0) / box.w, dy = (m.clientY - y0) / box.h;
      let [x, y, w, h2] = start;
      if (h === 'move') { x = Math.max(0, Math.min(1 - w, x + dx)); y = Math.max(0, Math.min(1 - h2, y + dy)); } else {
        let l = x, t = y, r = x + w, b = y + h2;
        if (h.includes('w')) l = Math.max(0, Math.min(r - MIN, l + dx));
        if (h.includes('e')) r = Math.min(1, Math.max(l + MIN, r + dx));
        if (h.includes('n')) t = Math.max(0, Math.min(b - MIN, t + dy));
        if (h.includes('s')) b = Math.min(1, Math.max(t + MIN, b + dy));
        if (locked) {
          // Keep the ratio from the corner across: the shorter of the two sizes wins.
          const px = Math.min((r - l) * W, (b - t) * H * aspect), nw = px / W, nh = px / aspect / H;
          if (h.includes('w')) l = r - nw; else r = l + nw;
          if (h.includes('n')) t = b - nh; else b = t + nh;
        }
        x = l; y = t; w = r - l; h2 = b - t;
      }
      st.box = [x, y, w, h2];
      placeFrame();
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      frame.classList.remove('is-drag');
      if (!same(old.box, st.box)) { past.push(old); future = []; render(); }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  try { render(); } catch { close(); onFail?.(); }
}
