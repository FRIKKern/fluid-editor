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
    { id: 'scroll-3', name: 'Move', start: ['100%', '0°', '100%', '100%', '-200%', '0%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', endEdge: 'Top', startPasses: '0%', endPasses: '100%', ease: 'Ease', iterations: '1'},
    { id: 'scroll-4', name: 'Roll', start: ['100%', '180°', '95%', '95%', '200%', '0px', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', startPasses: '0%', endPasses: '50%', ease: 'Out', iterations: '1'},
    { id: 'scroll-5', name: 'Drop', start: ['0%', '30°', '100%', '100%', '0%', '-200%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', endEdge: 'Top', startPasses: '0%', endPasses: '100%', ease: 'In Out', iterations: '1'},
    { id: 'scroll-6', name: 'Zoom', start: ['100%', '0°', '400%', '400%', '0%', '200%', '0°', '0°'], end: ['100%', '0°', '100%', '100%', '0%', '0%', '0°', '0°'], when: 'Block', action: 'Passes', endEdge: 'Top', startPasses: '0%', endPasses: '100%', ease: 'Ease', iterations: '1'},
  ],
  appear: [
    { id: 'appear-1', name: 'Pop', start: ['100%', '0°', '0%', '0%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.1', duration: '0.7s', delay: '0s', when: 'Block', edge: 'Middle', screen: '0%'},
    { id: 'appear-2', name: 'Slide', start: ['100%', '-10°', '100%', '100%', '0px', '100%', '0°', '0°'], ease: 'Spring', bounce: '0.1', duration: '0.8s', delay: '0s', when: 'Block', edge: 'Middle', screen: '0%'},
    { id: 'appear-3', name: 'Drop', start: ['0%', '-15°', '80%', '80%', '0px', '-200%', '0°', '0°'], ease: 'Spring', bounce: '0.2', duration: '0.7s', delay: '0s', when: 'Block', edge: 'Middle', screen: '50%'},
    { id: 'appear-4', name: 'Reveal', start: ['0%', '0°', '20%', '20%', '0px', '100%', '15°', '-40°'], ease: 'Spring', bounce: '0.1', duration: '0.9s', delay: '0s', when: 'Block', edge: 'Top', screen: '0%'},
    { id: 'appear-5', name: 'Stamp', start: ['0%', '-15°', '125%', '125%', '0px', '0px', '0°', '0°'], ease: 'Spring', bounce: '0.3', duration: '0.6s', delay: '0s', when: 'Block', edge: 'Bottom', screen: '33%'},
    { id: 'appear-6', name: 'Zoom', start: ['100%', '0°', '200%', '200%', '0px', '200%', '0°', '0°'], ease: 'Spring', bounce: '0', duration: '0.9s', delay: '0s', when: 'Block', edge: 'Top', screen: '-100%'},
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
// A row on a phone (CAP-L6ANIMPHONE.json): a.phone holds the values the phone set, key by key, so the
// rest follow desktop. Rows themselves are shared: both layouts add and remove the same ones.
export function rowOn(a, bp) {
  if (!a.phone) return a;
  const { phone, ...row } = a;
  if (bp !== 'mobile') return row;
  for (const [k, v] of Object.entries(phone)) {
    if (!k.includes(':')) { row[k] = v; continue; }
    const [p, n] = k.split(':');
    row[p] = [...(row[p] || REST)];
    row[p][parseInt(n, 10)] = v;
  }
  return row;
}
// Every value of a row picked on a phone, so all of them are the phone's own.
export function ownOf(row) {
  const own = {};
  for (const [k, v] of Object.entries(row)) {
    if (Array.isArray(v)) v.forEach((x, n) => { own[`${k}:${n}`] = x; });
    else own[k] = v;
  }
  return own;
}
// A row whose trigger the phone changed goes after the others on a phone (read with two and three rows).
export function animPhoneOrder(rows) {
  const moved = (a) => a.phone?.trigger && a.phone.trigger !== a.trigger;
  const all = rows.map((_, i) => i);
  return [...all.filter((i) => !moved(rows[i])), ...all.filter((i) => moved(rows[i]))];
}
export function newAnimation(trigger, id) {
  const p = id && PRESETS[trigger].find((x) => x.id === id);
  const a = { trigger, preset: p ? p.id : 'custom', ...BLANK[trigger], end: [...REST] };
  if (TABS[trigger].includes('Start')) a.start = [...REST];
  if (trigger === 'scroll') Object.assign(a, { startEdge: 'Top', endEdge: 'Bottom', startCross: 'Entry Crossing', endCross: 'Exit Crossing', topInset: '0%', bottomInset: '0%' });
  if (trigger === 'appear') a.edge = 'Top';
  if (p) { const { id: _i, name: _n, ...v } = p; delete a.custom; Object.assign(a, JSON.parse(JSON.stringify(v))); }
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
  // A number typed after the shown value's unit joins it: 0° then 5 is 5° (CAP-L6RESET.json).
  const m = String(raw).trim().replace(/^(-?[\d.]*)(?:%|px|°|s)(?=[\d.])/, '$1').match(/^(-?\d*\.?\d+)\s*(%|px|°|s)?$/);
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
// Pong back too; On Scroll from Start to End; Follow along a path of our own. With the End tab
// open it stays at the End (CAP-T15FOLLOW.json).
export function playPreview(el, a, done, stay) {
  clear(el);
  el.setAttribute('data-m-id', 'm-preview-sequence');
  const s = stateOf(el), end = () => { clear(el); done?.(); };
  if (a.trigger === 'appear') { s.pose = numbers(a.start); write(el, s); morph(el, REST_N, a, seconds(a), end); return; }
  if (a.trigger === 'scroll') { s.pose = numbers(a.start); write(el, s); morph(el, numbers(a.end), a, SCROLL_PREVIEW, end); return; }
  if (a.trigger === 'loop') { morph(el, numbers(a.end), a, seconds(a), a.type === 'Ping Pong' ? () => morph(el, REST_N, a, seconds(a), end) : end); return; }
  if (a.trigger === 'follow') { followPreview(el, a, end); return; }
  if (stay && (a.trigger === 'hover' || a.trigger === 'press')) { morph(el, numbers(a.end), a, seconds(a), end); return; }
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
  if (a.trigger === 'follow') return;
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

// ---- The page in preview mode: Loop, On Appear and On Scroll (parity/findings/CAP-T15TRIGGERS.json).
// A row watches a box where it sits before any transform: its block's, or its section's. Screen
// percents count up from the bottom of the frame.
const SHARE = { Top: 0, Middle: 0.5, Bottom: 1 };
const pct = (s) => (parseFloat(s) || 0) / 100;
function watched(el, a) {
  const box = a.when === 'Section' ? el.closest('section') || el : el;
  let top = 0;
  for (let e = box; e; e = e.offsetParent) top += e.offsetTop;
  return { top, h: box.offsetHeight, self: box === el };
}
// The scroll at which On Appear plays. Start's Offset Y moves the edge; its scale and rotate do
// not, but a scale of 0 leaves no box: Top and Middle act at the middle, and Bottom never plays.
export function appearAt({ top, h, self }, a, view) {
  const n = numbers(a.start);
  let share = SHARE[a.edge] ?? 0;
  if (self && n.sy === 0) { if (a.edge === 'Bottom') return Infinity; share = 0.5; }
  return top + (self ? n.ypx + (n.yp * h) / 100 : 0) + h * share - view * (1 - pct(a.screen));
}
// The scroll where On Scroll starts and ends.
export function scrollSpan({ top, h }, a, view) {
  if (a.action === 'Passes') {
    const at = (edge, passes) => top + h * (SHARE[edge] ?? 0) - view * (1 - pct(passes));
    return [at(a.startEdge, a.startPasses), at(a.endEdge, a.endPasses)];
  }
  const custom = a.action === 'Custom', hi = custom ? view * pct(a.topInset) : 0, lo = view - (custom ? view * pct(a.bottomInset) : 0);
  const fits = h <= lo - hi, inFull = fits ? top + h - lo : top - hi, outFull = fits ? top - hi : top + h - lo;
  const spans = {
    Cover: [top - lo, top + h - hi],
    Contain: [inFull, outFull],
    Entry: [top - lo, inFull],
    Exit: [outFull, top + h - hi],
    'Entry Crossing': [top - lo, top + h - lo],
    'Exit Crossing': [top - hi, top + h - hi],
  };
  const within = (name, p) => { const [x, y] = spans[name] || spans.Cover; return x + (y - x) * pct(p); };
  if (custom) return [within(a.startCross, a.startPasses), within(a.endCross, a.endPasses)];
  const name = { Enters: 'Entry', Leaves: 'Exit' }[a.action] || 'Cover';
  return [within(name, a.startPasses), within(name, a.endPasses)];
}
export function scrollProgress(a, y, [from, to]) {
  const p = to > from ? (y - from) / (to - from) : y >= to ? 1 : 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return curve(a, (p * (parseFloat(a.iterations) || 1)) % 1);
}
const between = (from, to, p) => Object.fromEntries(Object.keys(from).map((k) => [k, from[k] + (to[k] - from[k]) * p]));
// Continuous starts over; Ping Pong runs to its End and back, each way one Duration.
function runLoop(el, a) {
  const s = stateOf(el), win = el.ownerDocument.defaultView, end = numbers(a.end), ms = seconds(a), both = a.type === 'Ping Pong';
  const t0 = win.performance.now() + (parseFloat(a.delay) || 0) * 1000;
  s.win = win;
  const frame = (now) => {
    const t = ((now - t0) / ms) % (both ? 2 : 1);
    if (now >= t0) { s.pose = t < 1 ? between(REST_N, end, curve(a, t)) : between(end, REST_N, curve(a, t - 1)); write(el, s); }
    s.raf = win.requestAnimationFrame(frame);
  };
  s.raf = win.requestAnimationFrame(frame);
}
// ---- Follow (CAP-T15FOLLOW.json). The mouse's place from the box's centre sets a pose. Attract
// grows with the distance, Repel fades with it and pushes away; past the radius there is no pose.
export function followPose(a, dx, dy, R, away = [1, 0]) {
  const d = Math.hypot(dx, dy);
  if (d >= R) return null;
  const end = numbers(a.end), repel = a.motion === 'Repel', v = repel ? 1 - d / R : d / R;
  const ux = d ? dx / d : away[0], uy = d ? dy / d : away[1];
  const ax = repel ? v * ux : dx / R, ay = repel ? v * uy : dy / R, push = repel ? -1 : 1;
  return {
    o: 1 + (end.o - 1) * v, r: end.r * (ax - ay), sx: 1 + (end.sx - 1) * v, sy: 1 + (end.sy - 1) * v,
    kx: end.kx * ax, ky: end.ky * ay,
    xp: end.xp * ax * push, xpx: end.xpx * ax * push, yp: end.yp * ay * push, ypx: end.ypx * ay * push,
  };
}
// How a block chases that pose: a spring whose speed and damping come from Smoothing, scaled by
// Bounce. Fitted to steps read at Smoothing .25 to 1 and Bounce 0 to .6 (CAP-T15FOLLOW.json).
const FOLLOW_S = [[0.25, 43, 1.3], [0.5, 30, 1.2], [0.75, 13.5, 0.87], [1, 7, 0.8]]; // at Bounce .3: speed, damping
const FOLLOW_B = [[0, 1.4, 2], [0.3, 1, 1], [0.6, 0.62, 0.38], [1, 0.3, 0.1]]; // their factors by Bounce
const along = (pts, x, i) => {
  if (x <= pts[0][0]) return pts[0][i];
  for (let k = 1; k < pts.length; k++) if (x <= pts[k][0]) { const [a, b] = [pts[k - 1], pts[k]]; return a[i] + ((b[i] - a[i]) * (x - a[0])) / (b[0] - a[0]); }
  return pts.at(-1)[i];
};
export function followSpring(a) {
  const s = parseFloat(a.smoothing) || 0, b = parseFloat(a.bounce) || 0;
  return { w: along(FOLLOW_S, s, 1) * along(FOLLOW_B, b, 1), z: along(FOLLOW_S, s, 2) * along(FOLLOW_B, b, 2) };
}
function chaser(el, a) {
  const s = stateOf(el), win = el.ownerDocument.defaultView, { w, z } = followSpring(a), vel = {};
  let to = REST_N, last = 0;
  s.win = win;
  const tick = (now) => {
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
    last = now;
    const n = {};
    let moving = false;
    for (const k of Object.keys(to)) {
      vel[k] = (vel[k] || 0) + (w * w * (to[k] - s.pose[k]) - 2 * z * w * (vel[k] || 0)) * dt;
      n[k] = s.pose[k] + vel[k] * dt;
      if (Math.abs(to[k] - n[k]) > 0.001 || Math.abs(vel[k]) > 0.01) moving = true;
    }
    s.pose = moving ? n : to;
    write(el, s);
    s.raf = moving ? win.requestAnimationFrame(tick) : 0;
    if (!moving) last = 0;
  };
  return { aim(p) { to = p; if (!s.raf) s.raf = win.requestAnimationFrame(tick); } };
}
function followBox(el, a) {
  const box = a.on === 'Section' ? el.closest('section') || el : el;
  let top = 0, left = 0;
  for (let e = box; e; e = e.offsetParent) { top += e.offsetTop; left += e.offsetLeft; }
  const w = box.offsetWidth, h = box.offsetHeight;
  return { x: left + w / 2, y: top + h / 2, R: (pct(a.radius) * Math.hypot(w, h)) / 2 };
}
// Preview has no mouse: an imagined one goes round and out from the centre, and the block ends at rest.
const PATH_MS = 1650, PATH_TURN = 1330, PATH_OUT = 0.27;
function followPreview(el, a, end) {
  const { R } = followBox(el, a), c = chaser(el, a), win = el.ownerDocument.defaultView, s = stateOf(el), t0 = win.performance.now();
  const step = (now) => {
    const t = now - t0;
    if (t >= PATH_MS) { end(); return; }
    const out = (PATH_OUT * R * t) / 1000, turn = (2 * Math.PI * t) / PATH_TURN;
    c.aim(followPose(a, out * Math.cos(turn), out * Math.sin(turn), R) || REST_N);
    s.timer = setTimeout(() => step(win.performance.now()), 16);
  };
  step(t0);
}
let motion = null;
export function stopPageMotion() {
  if (!motion) return;
  motion.off();
  motion.els.forEach(clear);
  motion = null;
}
export function startPageMotion(doc, rowsOf) {
  stopPageMotion();
  const win = doc.defaultView, els = new Set(), appear = [], scroll = [], follow = [];
  for (const el of doc.querySelectorAll('.fe-block')) {
    const rows = rowsOf(el.dataset.blockId) || [];
    const row = (t) => rows.find((a) => a.trigger === t);
    const a = row('scroll') || row('appear') || row('loop') || row('follow');
    if (!a) continue;
    els.add(el);
    if (a.trigger === 'follow') { follow.push({ el, a, c: chaser(el, a), away: [1, 0] }); continue; }
    if (a.trigger === 'loop') { runLoop(el, a); continue; }
    (a.trigger === 'appear' ? appear : scroll).push({ el, a, from: numbers(a.start), to: a.trigger === 'scroll' ? numbers(a.end) : REST_N });
    const s = stateOf(el);
    s.pose = numbers(a.start);
    write(el, s);
  }
  const check = () => {
    const y = win.scrollY, view = win.innerHeight;
    for (const r of scroll) { const s = stateOf(r.el); s.pose = between(r.from, r.to, scrollProgress(r.a, y, scrollSpan(watched(r.el, r.a), r.a, view))); write(r.el, s); }
    for (const r of appear) {
      if (r.done || y < appearAt(watched(r.el, r.a), r.a, view)) continue;
      r.done = true;
      morph(r.el, REST_N, r.a, seconds(r.a), () => clear(r.el));
    }
  };
  const moved = (e) => {
    for (const r of follow) {
      const b = followBox(r.el, r.a), dx = e.clientX + win.scrollX - b.x, dy = e.clientY + win.scrollY - b.y, d = Math.hypot(dx, dy);
      if (d) r.away = [dx / d, dy / d];
      const p = followPose(r.a, dx, dy, b.R, r.away);
      if (p) r.c.aim(p);
      else if (r.a.snap) r.c.aim(REST_N);
    }
  };
  win.addEventListener('scroll', check, { passive: true });
  win.addEventListener('resize', check);
  if (follow.length) doc.addEventListener('pointermove', moved);
  check();
  motion = { els, off: () => { win.removeEventListener('scroll', check); win.removeEventListener('resize', check); doc.removeEventListener('pointermove', moved); } };
}
