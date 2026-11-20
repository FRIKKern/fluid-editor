// Is the section outline drawn where it is laid out? Page code for marks-check's outline watch: `(${outlineDrawn})(ch)` gives a
// function of the outline that returns 0 when it is drawn, else why not. The color rows read only the border's color, which stays
// lit or mid-fade while the outline is hidden some other way (task-3288a127630aa993, task-b1cdc0b917ae4cf2). Each frame:
// - Hidden, no box, or see-through by its own or a parent's opacity (as before).
// - Paint a hit test can't see, on the outline and every parent: a filter, a mask or a blend mode. A right page has none of them
//   there. And the outline's own border: every side solid enough to draw (a style, 1px or more), all four the top's color (the
//   color rows read only the top), and no border image.
// - Laid out on its section: the box as laid out within 2px of the section's box in the frame (placeChrome's own layout), so
//   an outline laid out at 0x0, or anywhere else, fails even where it is drawn (task-135ffb783a541425).
// - A hit test at 4 points on its border: left and right halfway down the part in view, top and bottom a quarter of the way along.
//   The points come from the box as laid out (offsets, which ignore transforms), cut to the chrome's laid-out box and the window.
//   For that read every element is made hit-testable (pointer-events), so the outline must be the topmost thing at each point.
//   That catches an outline clipped (clip-path, an overflow, content-visibility), moved or shrunk by a transform or translate,
//   and any element laid over it, pointer-events none or not (an inline !important one still wins). No point in view fails too.
//   elementFromPoint rounds a point to the whole pixel, so a point in the view's last half pixel tests the pixel past it and hits
//   nothing: an outline laid on a stage at x.5 puts its right point at 1599.5 on a 1600 window (task-4bd893b5b2fa60c4). A point
//   kept is moved up to a pixel in from the view's right and bottom edge, which keeps it on its border.
// Paint with no box of its own (a sibling's shadow or outline) can still cover it unseen.
// The extra sheet goes on and off in the same task, so no frame is ever drawn with it.
export const outlineDrawn = `(ch) => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync('*, .sc-outline { pointer-events: auto !important; }');
  const fr = document.getElementById('site-frame');
  const name = (n) => n ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList[0] ? '.' + n.classList[0] : '') : 'nothing';
  const laid = (n) => { let x = -scrollX, y = -scrollY; for (let p = n; p; p = p.offsetParent) { x += p.offsetLeft + (p === n ? 0 : p.clientLeft); y += p.offsetTop + (p === n ? 0 : p.clientTop); } return { l: x, t: y, r: x + n.offsetWidth, b: y + n.offsetHeight }; };
  return (e) => {
    const c = getComputedStyle(e);
    if (c.visibility !== 'visible') return 'visibility ' + c.visibility;
    if (!e.getClientRects().length) return 'no box';
    let o = 1;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      o *= +s.opacity;
      if (s.filter !== 'none') return 'filter ' + s.filter + ' on ' + name(n);
      if (s.maskImage !== 'none') return 'mask on ' + name(n);
      if (s.mixBlendMode !== 'normal') return 'blend ' + s.mixBlendMode + ' on ' + name(n);
    }
    if (o < 1) return 'opacity ' + o;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const st = c['border' + side + 'Style'], w = c['border' + side + 'Width'];
      if (st === 'none' || st === 'hidden' || !(parseFloat(w) >= 1)) return 'border ' + side.toLowerCase() + ' ' + st + ' ' + w;
    }
    if (c.borderImageSource !== 'none') return 'border image';
    const col = [c.borderTopColor, c.borderRightColor, c.borderBottomColor, c.borderLeftColor];
    if (col.some((x) => x !== col[0])) return 'border colors ' + col.join(' / ');
    const b = laid(e), k = laid(ch);
    const sid = ch.dataset.outline, sec = fr && fr.contentDocument && fr.contentDocument.querySelector('section[data-section-id="' + sid + '"]');
    if (!sec) return 'no section ' + sid;
    const f = fr.getBoundingClientRect(), q = sec.getBoundingClientRect(), at = { l: f.left + q.left, t: f.top + q.top, r: f.left + q.right, b: f.top + q.bottom };
    if (['l', 't', 'r', 'b'].some((s) => Math.abs(b[s] - at[s]) > 2)) return 'laid ' + [b.l, b.t, b.r, b.b].map(Math.round) + ' off its section ' + [at.l, at.t, at.r, at.b].map(Math.round);
    const v = { l: Math.max(k.l, 0), t: Math.max(k.t, 0), r: Math.min(k.r, innerWidth), b: Math.min(k.b, innerHeight) };
    const my = (Math.max(b.t, v.t) + Math.min(b.b, v.b)) / 2, qx = b.l + (b.r - b.l) / 4;
    const pts = [[b.l + 1.5, my], [b.r - 1.5, my], [qx, b.t + 1.5], [qx, b.b - 1.5]].filter(([x, y]) => x >= v.l && x < v.r && y >= v.t && y < v.b)
      .map(([x, y]) => [Math.max(v.l, Math.min(x, v.r - 1)), Math.max(v.t, Math.min(y, v.b - 1))]);
    if (!pts.length) return 'off view';
    const prev = [...document.adoptedStyleSheets];
    document.adoptedStyleSheets = [...prev, sheet];
    try {
      for (const [x, y] of pts) { const t = document.elementFromPoint(x, y); if (t !== e) return 'under ' + name(t); }
    } finally { document.adoptedStyleSheets = prev; }
    return 0;
  };
}`;
