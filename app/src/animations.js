// Block animations (T15), from parity/findings/ANIMFLOW.json. The six triggers, their six
// presets with the oracle's own values, what Start blank gives, the curves fitted to the frames
// read there, and a small player. Our own code and drawings: nothing here comes from the oracle
// but measurements (O2).
export const TRIGGERS = [['hover', 'On Hover'], ['press', 'On Press'], ['loop', 'Loop'], ['scroll', 'On Scroll'], ['appear', 'On Appear'], ['follow', 'Follow']];
export const triggerName = (t) => TRIGGERS.find((x) => x[0] === t)[1];
export const REST = ['100%', '0°', '100%', '100%', '0px', '0px', '0°', '0°'];
export const PRESETS = {
  hover: [
    { id: 'hover-1', name: 'Grow', end: ['100%', '0°', '110%', '110%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.3', duration: '0.5s', delay: '0s'},
    { id: 'hover-2', name: 'Lift', end: ['100%', '-5°', '110%', '110%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.3', duration: '0.35s', delay: '0s'},
    { id: 'hover-3', name: 'Look', end: ['100%', '0°', '85%', '85%', '0px', '0px', '10°', '-5°'], ease: 'Out', duration: '0.3s', delay: '0s'},
    { id: 'hover-4', name: 'Jump', end: ['100%', '-5°', '100%', '100%', '0px', '-10%', '0°', '0°'], ease: 'Spring', bounce: '0.5', duration: '0.5s', delay: '0s'},
    { id: 'hover-5', name: 'Squish', end: ['100%', '0°', '90%', '100%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.3s', delay: '0s'},
    { id: 'hover-6', name: 'Jitter', end: ['100%', '0°', '100%', '100%', '-4px', '0px', '0°', '0°'], ease: 'Spring', bounce: '1', duration: '0.2s', delay: '0s'},
  ],
  press: [
    { id: 'press-1', name: 'Grow', end: ['100%', '0°', '110%', '110%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.3s', delay: '0s'},
    { id: 'press-2', name: 'Lift', end: ['100%', '-5°', '110%', '110%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.5s', delay: '0s'},
    { id: 'press-3', name: 'Look', end: ['100%', '0°', '85%', '85%', '0px', '0px', '-10°', '5°'], ease: 'Spring', bounce: '0.2', duration: '0.35s', delay: '0s'},
    { id: 'press-4', name: 'Jump', end: ['100%', '-5°', '100%', '100%', '0px', '-15%', '0°', '0°'], ease: 'Spring', bounce: '0.3', duration: '0.5s', delay: '0s'},
    { id: 'press-5', name: 'Squish', end: ['100%', '0°', '90%', '100%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.3s', delay: '0s'},
    { id: 'press-6', name: 'Jitter', end: ['100%', '0°', '100%', '100%', '-3px', '0px', '0°', '0°'], ease: 'Spring', bounce: '1', duration: '0.3s', delay: '0s'},
  ],
  loop: [
    { id: 'loop-1', name: 'Spin', end: ['100%', '360°', '100%', '100%', '0px', '0px', '0°', '0°'], type: 'Continuous', ease: 'Linear', duration: '10s', delay: '0s'},
    { id: 'loop-2', name: 'Float', end: ['100%', '0°', '95%', '95%', '0px', '20%', '0°', '0°'], type: 'Ping Pong', ease: 'In Out', duration: '2s', delay: '0s'},
    { id: 'loop-3', name: 'Hop', end: ['100%', '0°', '100%', '100%', '0px', '-1%', '0°', '0°'], type: 'Continuous', ease: 'Custom', custom: '0.1, 40, 0.8, 30', duration: '1.5s', delay: '0s'},
    { id: 'loop-4', name: 'Look', end: ['100%', '0°', '85%', '85%', '10%', '0%', '5°', '5°'], type: 'Ping Pong', ease: 'In Out', duration: '1.5s', delay: '0s'},
    { id: 'loop-5', name: 'Roll', end: ['100%', '-90°', '100%', '100%', '-100%', '0px', '0°', '0°'], type: 'Ping Pong', ease: 'In Out', duration: '2s', delay: '0s'},
    { id: 'loop-6', name: 'Breathe', end: ['100%', '0°', '90%', '90%', '0%', '5%', '0°', '0°'], type: 'Ping Pong', ease: 'In Out', duration: '2s', delay: '0s'},
  ],
  scroll: [
    { id: 'scroll-1', name: 'Parallax', start: ['100%', '15°', '100%', '100%', '-25%', '25%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0px', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '100%', ease: 'In Out', iterations: '1'},
    { id: 'scroll-2', name: 'Twirl', start: ['0%', '90°', '80%', '80%', '0%', '0%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '50%', ease: 'Out', iterations: '1'},
    { id: 'scroll-3', name: 'Move', start: ['100%', '0°', '100%', '100%', '-200%', '0%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '100%', ease: 'Ease', iterations: '1'},
    { id: 'scroll-4', name: 'Roll', start: ['100%', '180°', '95%', '95%', '200%', '0px', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '50%', ease: 'Out', iterations: '1'},
    { id: 'scroll-5', name: 'Drop', start: ['0%', '30°', '100%', '100%', '0%', '-200%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '100%', ease: 'In Out', iterations: '1'},
    { id: 'scroll-6', name: 'Zoom', start: ['100%', '0°', '400%', '400%', '0%', '200%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '100%', ease: 'Ease', iterations: '1'},
  ],
  appear: [
    { id: 'appear-1', name: 'Pop', start: ['100%', '0°', '0%', '0%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.1', duration: '0.7s', delay: '0s', when: 'Block', screen: '0%'},
    { id: 'appear-2', name: 'Slide', start: ['100%', '-10°', '100%', '100%', '0px', '100%', '0°', '0°'], ease: 'Spring', bounce: '0.1', duration: '0.8s', delay: '0s', when: 'Block', screen: '0%'},
    { id: 'appear-3', name: 'Drop', start: ['0%', '-15°', '80%', '80%', '0px', '-200%', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.7s', delay: '0s', when: 'Block', screen: '50%'},
    { id: 'appear-4', name: 'Reveal', start: ['0%', '0°', '20%', '20%', '0px', '100%', '15°', '-40°'], ease: 'Spring', bounce: '0.1', duration: '0.9s', delay: '0s', when: 'Block', screen: '0%'},
    { id: 'appear-5', name: 'Stamp', start: ['0%', '-15°', '125%', '125%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.3', duration: '0.6s', delay: '0s', when: 'Block', screen: '33%'},
    { id: 'appear-6', name: 'Zoom', start: ['100%', '0°', '200%', '200%', '0px', '200%', '0°', '0°'], ease: 'Spring', bounce: '0', duration: '0.9s', delay: '0s', when: 'Block', screen: '-100%'},
  ],
  follow: [
    { id: 'follow-1', name: 'Follow', end: ['100%', '0°', '100%', '100%', '150px', '150px', '0°', '0°'], motion: 'Attract', on: 'Block', smoothing: '0.75', radius: '200%', bounce: '0.3', snap: true},
    { id: 'follow-2', name: 'Repel', end: ['100%', '0°', '100%', '100%', '150px', '150px', '0°', '0°'], motion: 'Repel', on: 'Block', smoothing: '0.75', radius: '200%', bounce: '0.3', snap: true},
    { id: 'follow-3', name: 'Slide', end: ['100%', '360°', '110%', '110%', '100%', '100%', '0°', '0°'], motion: 'Attract', on: 'Block', smoothing: '0.75', radius: '500%', bounce: '0.3', snap: true},
    { id: 'follow-4', name: 'Squish', end: ['100%', '0°', '75%', '75%', '0px', '0px', '0°', '0°'], motion: 'Repel', on: 'Block', smoothing: '0.25', radius: '100%', bounce: '0.2', snap: true},
    { id: 'follow-5', name: 'Look', end: ['100%', '10°', '80%', '80%', '150px', '150px', '10°', '-5°'], motion: 'Attract', on: 'Block', smoothing: '0.75', radius: '100%', bounce: '0.15', snap: true},
    { id: 'follow-6', name: 'Inflate', end: ['100%', '20°', '125%', '125%', '150px', '150px', '0°', '0°'], motion: 'Attract', on: 'Block', smoothing: '0.75', radius: '100%', bounce: '0.15', snap: true},
  ],
};
export const BLANK = {
  hover: {ease: 'Out', duration: '0.4s', delay: '0s'},
  press: {ease: 'Out', duration: '0.4s', delay: '0s'},
  loop: {type: 'Continuous', ease: 'Out', duration: '0.4s', delay: '0s'},
  scroll: {when: 'Block', action: 'Scrolls', startPasses: '0%', endPasses: '50%', ease: 'Out', iterations: '1'},
  appear: {ease: 'Out', duration: '0.4s', delay: '0s', when: 'Block', screen: '0%'},
  follow: {motion: 'Attract', on: 'Block', smoothing: '1', radius: '100%', bounce: '0.5', snap: true},
};
export const EASES = ['Spring', 'Ease', 'In Out', 'In Back', 'Out Back', 'In Out Back', 'In', 'Out', 'Linear', 'Custom'];
export const CROSSINGS = ['Cover', 'Contain', 'Entry', 'Exit', 'Entry Crossing', 'Exit Crossing'];
export const OPTIONS = { type: ['Ping Pong', 'Continuous'], ease: EASES, when: ['Block', 'Section'], on: ['Block', 'Section'], action: ['Enters', 'Leaves', 'Scrolls', 'Passes', 'Custom'], motion: ['Repel', 'Attract'], startCross: CROSSINGS, endCross: CROSSINGS };
// The tabs of the editor, by trigger. Hover and Press have no note under their End values.
export const TABS = { hover: ['End', 'Timing'], press: ['End', 'Timing'], loop: ['End', 'Timing'], scroll: ['Start', 'End', 'Timing'], appear: ['Start', 'Timing'], follow: ['Range', 'Timing'] };
export const poseKey = (tab) => (tab === 'Start' ? 'start' : tab === 'Timing' ? null : 'end');
export const hasPoseNote = (t) => t !== 'hover' && t !== 'press';

// A new row from a preset, or from Start blank.
export function newAnimation(trigger, id) {
  const p = id && PRESETS[trigger].find((x) => x.id === id);
  const a = { trigger, preset: p ? p.id : 'custom', ...BLANK[trigger], end: [...REST] };
  if (TABS[trigger].includes('Start')) a.start = [...REST];
  if (p) { const { id: _i, name: _n, ...v } = p; delete a.custom; Object.assign(a, JSON.parse(JSON.stringify(v))); }
  if (trigger === 'scroll') Object.assign(a, { startEdge: 'Top', endEdge: 'Bottom', startCross: 'Entry Crossing', endCross: 'Exit Crossing', topInset: '0%', bottomInset: '0%' });
  if (trigger === 'appear') a.edge = 'Top';
  return a;
}
// The list row's second line: the time, or for two triggers the choice that stands for it.
export const rowDetail = (a) => (a.trigger === 'scroll' ? a.action : a.trigger === 'follow' ? a.motion : a.duration);

// What Reset to default value goes back to: the Start blank value, for presets too.
export function defaultOf(a, key) {
  const d = { startEdge: 'Top', endEdge: 'Bottom', topInset: '0%', bottomInset: '0%', bounce: '0.3', ...BLANK[a.trigger] };
  return key === 'endPasses' && a.action === 'Passes' ? '100%' : d[key];
}

// Text fields keep a unit. A bare number takes the field's unit; Offset takes px or %.
export function typed(raw, cur) {
  const m = String(raw).trim().match(/^(-?\d*\.?\d+)\s*(%|px|°|s)?$/);
  if (!m) return null;
  const unit = String(cur).replace(/^-?[\d.]+/, '');
  const u = m[2] && (m[2] === unit || (m[2] === '%' && unit === 'px') || (m[2] === 'px' && unit === '%')) ? m[2] : unit;
  return `${Number(m[1])}${u}`;
}
// A drag on a field's edge: 0.4 for each pixel on the transforms, 0.04 on a time.
export function scrubbed(cur, dx, key) {
  const n = parseFloat(cur), unit = String(cur).replace(/^-?[\d.]+/, '');
  const step = unit === 's' ? 0.04 : key === 'bounce' || key === 'smoothing' ? 0.01 : key === 'iterations' ? 0.1 : 0.4;
  let v = n + dx * step;
  if (key === 'iterations') v = Math.max(1, Math.round(v));
  if (unit === 's' || key === 'bounce' || key === 'smoothing') v = Math.max(0, v);
  if (key === 'bounce' || key === 'smoothing') v = Math.min(1, v);
  return `${Number(v.toFixed(unit === 's' || key === 'bounce' || key === 'smoothing' ? 2 : 1))}${unit}`;
}

// ---- Curves. Bezier points are fitted to the frames read on the oracle at 0.5s (ANIMFLOW.json
// curves); the spring is a damped one with damping 1 - Bounce, as the frames show at .1, .3, .5.
const BEZIER = { Ease: [0.425, 0.319, 0.178, 0.981], 'In Out': [0.816, 0.037, 0.184, 0.966], 'In Back': [0.762, -0.313, 0.772, 0.241], 'Out Back': [0.3, 1.1, 0.353, 1.212], 'In Out Back': [0.656, -0.594, 0.287, 1.597], In: [0.869, 0.037, 0.856, 1.006], Out: [0.144, 0.397, 0.297, 1.031] };
function bezier([x1, y1, x2, y2], t) {
  let lo = 0, hi = 1, u = t;
  for (let i = 0; i < 24; i++) {
    u = (lo + hi) / 2;
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3;
    if (x < t) lo = u; else hi = u;
  }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
}
function spring(bounce, seconds, t) {
  const z = Math.max(0.05, 1 - bounce);
  const w = bounce >= 0.95 ? 6.4 / seconds : 7.4 / (z * seconds);
  const s = t * seconds, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
}
// Progress at t, from 0 to 1 of the run; it can pass 1 and come back.
export function curve(a, t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const e = a.ease;
  if (e === 'Linear') return t;
  if (e === 'Spring') return spring(parseFloat(a.bounce ?? 0.3), parseFloat(a.duration) || 0.5, t);
  if (e === 'Custom') { const c = String(a.custom || '0, 0, 1, 1').split(',').map(Number); return c.length === 4 && c.every(Number.isFinite) ? bezier(c, t) : t; }
  return bezier(BEZIER[e] || BEZIER.Out, t);
}
// A small drawing of an ease for its select: the curve itself.
export function easeGlyph(a) {
  if (a.ease === 'Custom') return '';
  let d = '';
  for (let i = 0; i <= 16; i++) { const t = i / 16; d += `${i ? 'L' : 'M'}${(1 + t * 14).toFixed(1)} ${(13 - Math.max(-0.4, Math.min(1.4, curve({ ...a, duration: '0.5s', bounce: a.bounce ?? 0.3 }, t))) * 9).toFixed(1)}`; }
  return `<svg class="an-eg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

// ---- Poses. Eight strings from a row become numbers, and go between two poses by progress.
function numbers(p) {
  const off = (s) => (String(s).endsWith('%') ? [parseFloat(s), 0] : [0, parseFloat(s)]);
  const [xp, xpx] = off(p[4]), [yp, ypx] = off(p[5]);
  return { o: parseFloat(p[0]) / 100, r: parseFloat(p[1]), sx: parseFloat(p[2]) / 100, sy: parseFloat(p[3]) / 100, xp, xpx, yp, ypx, kx: parseFloat(p[6]), ky: parseFloat(p[7]) };
}
const REST_N = numbers(REST);
const len = (pct, px) => (pct && px ? `calc(${pct}% + ${px}px)` : pct ? `${pct}%` : `${px}px`);
const css = (n, base) => ({
  transform: `${base.transform === 'none' ? '' : `${base.transform} `}rotate(${n.r}deg) scale(${n.sx}, ${n.sy}) skewX(${n.kx}deg) skewY(${n.ky}deg)`,
  translate: `${len(n.xp, n.xpx)} ${len(n.yp, n.ypx)}`,
  opacity: String(Math.max(0, Math.min(1, n.o)) * base.opacity),
});
const live = new WeakMap(); // element: { pose, base, raf, timer }
function stateOf(el) {
  let s = live.get(el);
  if (!s) {
    const v = el.ownerDocument.defaultView.getComputedStyle(el);
    s = { pose: REST_N, base: { transform: v.transform, opacity: Number(v.opacity) } };
    live.set(el, s);
  }
  return s;
}
function write(el, s) { const c = css(s.pose, s.base); el.style.transform = c.transform; el.style.translate = c.translate; el.style.opacity = c.opacity; }
function stop(s) { if (s.raf) s.win.cancelAnimationFrame(s.raf); clearTimeout(s.timer); s.raf = s.timer = 0; }
function clear(el) {
  const s = live.get(el);
  if (s) stop(s);
  live.delete(el);
  el.style.removeProperty('transform'); el.style.removeProperty('translate'); el.style.removeProperty('opacity');
  el.removeAttribute('data-m-id');
}
// Go from where the element is to a pose over the row's Duration and Delay.
function morph(el, to, a, ms, then) {
  const s = stateOf(el), from = s.pose, win = el.ownerDocument.defaultView;
  stop(s);
  s.win = win;
  const delay = (parseFloat(a.delay) || 0) * 1000, t0 = win.performance.now() + delay;
  const frame = (now) => {
    const t = ms > 0 ? (now - t0) / ms : 1, p = curve(a, t), n = {};
    for (const k of Object.keys(from)) n[k] = from[k] + (to[k] - from[k]) * p;
    s.pose = t >= 1 ? to : n;
    write(el, s);
    if (t >= 1) { s.raf = 0; then?.(); return; }
    s.raf = win.requestAnimationFrame(frame);
  };
  s.raf = win.requestAnimationFrame(frame);
}
const seconds = (a) => (parseFloat(a.duration) || 0.4) * 1000;
const HOLD = 500; // how long a preview stays at its end (0.3s and 0.5s runs read the same)
const SCROLL_PREVIEW = 1000; // a row's Preview on On Scroll, with no scroll needed

// Preview: to the end, a hold, and back; On Appear from its Start to rest; a Loop one way, Ping
// Pong back too; On Scroll from Start to End. Follow has no preview here yet (unbuilt).
export function playPreview(el, a, done) {
  clear(el);
  el.setAttribute('data-m-id', 'm-preview-sequence');
  const s = stateOf(el), end = () => { clear(el); done?.(); };
  if (a.trigger === 'appear') { s.pose = numbers(a.start); write(el, s); morph(el, REST_N, a, seconds(a), end); return; }
  if (a.trigger === 'scroll') { s.pose = numbers(a.start); write(el, s); morph(el, numbers(a.end), a, SCROLL_PREVIEW, end); return; }
  if (a.trigger === 'loop') { morph(el, numbers(a.end), a, seconds(a), a.type === 'Ping Pong' ? () => morph(el, REST_N, a, seconds(a), end) : end); return; }
  if (a.trigger === 'follow') { end(); return; }
  morph(el, numbers(a.end), a, seconds(a), () => { s.timer = setTimeout(() => morph(el, REST_N, a, seconds(a), end), HOLD); });
}
// The End, Start or Range tab holds the block in that pose.
export function holdPose(el, p) {
  clear(el);
  const s = stateOf(el);
  s.pose = numbers(p);
  write(el, s);
}
export const releasePose = clear;

// A preset's tile plays its own preset on the square; Grow and Lift reach 1.21 there, not 1.10.
export function playTile(square, a) {
  const t = JSON.parse(JSON.stringify(a));
  if (t.end) { t.end[2] = `${parseFloat(t.end[2]) ** 2 / 100}%`; t.end[3] = `${parseFloat(t.end[3]) ** 2 / 100}%`; }
  playPreview(square, t);
}

// The page in preview mode: Hover and Press. A press goes from where the block is to Press's End
// and back to Hover's on release; leaving goes back to rest with the row that took it there.
export function bindTriggers(doc, rowsOf) {
  const states = new WeakMap();
  const go = (el) => {
    const st = states.get(el), rows = rowsOf(el.dataset.blockId) || [];
    const hover = rows.find((a) => a.trigger === 'hover'), press = rows.find((a) => a.trigger === 'press');
    const a = (st.down && press) || (st.over && hover);
    if (a) { st.last = a; morph(el, numbers(a.end), a, seconds(a)); return; }
    if (st.last) { const last = st.last; st.last = null; morph(el, REST_N, last, seconds(last), () => clear(el)); }
  };
  const on = (type, set) => doc.addEventListener(type, (e) => {
    if (!doc.body.classList.contains('is-preview')) return;
    const el = e.target.closest?.('.fe-block');
    if (!el || !rowsOf(el.dataset.blockId)?.length) return;
    if ((type === 'pointerover' || type === 'pointerout') && e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (!states.has(el)) states.set(el, { over: false, down: false, last: null });
    set(states.get(el));
    go(el);
  });
  on('pointerover', (s) => { s.over = true; });
  on('pointerout', (s) => { s.over = false; s.down = false; });
  on('pointerdown', (s) => { s.down = true; s.over = true; });
  on('pointerup', (s) => { s.down = false; });
}
