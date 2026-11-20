// The Scrolling block's moving text (T12), as read on the oracle (parity/findings/CAP-T12WAVE.json, scroll2-a to scroll4-a):
//
//   x: -550        0         550       1100      1650  ...  550 * ceil((W + 550) / 550)
//      top ╲      bottom ╱  top  ╲   bottom ╱   top          W = the block's width
//           ╲____╱             ╲___╱
//   y: the top line is 0.662 h down the drawing, the bottom A below it (A = Wave Intensity, px); h = the rounded line height.
//   The drawing is h + A high, moved down 0.1 h, the path a further 0.05 h. The first half is a cubic through (188, A / 2)
//   and (422, A) from its start; each later half leaves and ends flat, with its controls at a third and two thirds.
//
// The words are tspans along that path, each at the rounded widths before it plus one gap each (Item Spacing, em of the
// font size), repeated past the path's end. The text path's start offset moves 60 px a second times Speed, falling for
// Left and rising for Right, and wraps within one set (minus the set's width to 0). Fade edges masks the drawing
// (site.css). Pause on hover doesn't pause in the editor (two reads); on a published page or in Preview it pauses here,
// which is inferred, not read (it needs a Save).
//
// One loop for the page. A marquee keeps its offset across a redraw of its block by the block's id. The rendered HTML
// (render.js) holds the words as hidden measure spans and an empty svg; this fills and moves it.
export function runMarquees(document) {
  const win = document.defaultView, NS = 'http://www.w3.org/2000/svg';
  if (win.__marquees) return;
  const state = (win.__marquees = new Map());
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const pathOf = (W, h, A) => {
    const top = 0.662 * h, bottom = top + A, end = 550 * Math.ceil((W + 550) / 550);
    let d = `M -550 ${r2(top)} C -362 ${r2(top + A / 2)} -128 ${r2(bottom)} 0 ${r2(bottom)}`;
    for (let x = 0, k = 0; x < end; x += 550, k++) {
      const from = k % 2 ? top : bottom, to = k % 2 ? bottom : top;
      d += ` C ${r2(x + 550 / 3)} ${r2(from)} ${r2(x + 1100 / 3)} ${r2(to)} ${x + 550} ${r2(to)}`;
    }
    return d;
  };
  const build = (m, st) => {
    const svg = m.querySelector('.marquee-svg'), items = [...m.querySelectorAll('.marquee-item')];
    if (!svg || !items.length) return false;
    // h from the tallest item: an emptied item is 0 high.
    const fs = parseFloat(win.getComputedStyle(svg).fontSize), h = Math.round(Math.max(...items.map((e) => e.getBoundingClientRect().height)));
    const A = Number(m.dataset.wave) || 0, W = m.getBoundingClientRect().width, gap = (Number(m.dataset.spacing) || 0) * fs;
    const widths = items.map((e) => Math.round(e.getBoundingClientRect().width)), words = items.map((e) => e.textContent);
    if (!words.join('').trim()) { if (st.sig !== '') { svg.innerHTML = ''; st.sig = ''; } return false; }
    const sig = JSON.stringify([fs, h, A, W, gap, widths, words]);
    if (sig === st.sig) return true;
    st.sig = sig;
    const id = `marquee-path-${m.dataset.marqueeId || Math.random().toString(36).slice(2)}`;
    svg.style.height = `${h + A}px`;
    svg.style.transform = `translateY(${r1(0.1 * h)}px)`;
    const xs = []; let x = 0;
    for (const w of widths) { xs.push(x); x += w + gap; }
    st.set = x;
    svg.innerHTML = `<g class="marquee-path-group" transform="translate(0, ${0.05 * h})"><path class="marquee-path" id="${id}" fill="none" stroke="none"></path></g><text><textPath class="marquee-svg-text" href="#${id}"></textPath></text>`;
    const path = svg.querySelector('path');
    path.setAttribute('d', pathOf(W, h, A));
    const L = path.getTotalLength(), sets = Math.ceil(L / Math.max(1, st.set)) + 1, tp = svg.querySelector('textPath');
    for (let n = 0; n < sets; n++) words.forEach((t, k) => { const s = document.createElementNS(NS, 'tspan'); s.setAttribute('class', 'marquee-svg-text'); s.setAttribute('x', r1(n * st.set + xs[k])); s.textContent = t; tp.append(s); });
    st.tp = tp;
    return true;
  };
  let last = null;
  const frame = (t) => {
    const dt = last == null ? 0 : Math.min(0.1, (t - last) / 1000);
    last = t;
    const editing = !!win.frameElement && !document.body.classList.contains('is-preview');
    const seen = new Set();
    for (const m of document.querySelectorAll('.marquee')) {
      const key = m.dataset.marqueeId || m;
      seen.add(key);
      let st = state.get(key);
      if (!st || st.el !== m) { st = { ...(st || { offset: null }), el: m, sig: null }; state.set(key, st); }
      if (!build(m, st) || !st.set) continue;
      const right = m.dataset.direction === 'right', v = 60 * (Number(m.dataset.speed) || 1);
      if (st.offset == null) st.offset = right ? -st.set : 0;
      // The hover is the block's: Attach link's hitbox lies over the line (render.js).
      const paused = m.dataset.pause === 'true' && !editing && (m.closest('.sqs-block-scrolling') || m).matches(':hover');
      if (!paused) st.offset += (right ? v : -v) * dt;
      while (st.offset <= -st.set) st.offset += st.set;
      while (st.offset > 0) st.offset -= st.set;
      st.tp.setAttribute('startOffset', r1(st.offset));
    }
    for (const k of state.keys()) if (!seen.has(k)) state.delete(k); // a removed block lets go of its elements
    win.requestAnimationFrame(frame);
  };
  win.requestAnimationFrame(frame);
}
export const MARQUEE_SCRIPT = `(${runMarquees})(document);`;
