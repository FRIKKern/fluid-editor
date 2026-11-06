// The image editor's arithmetic (T4, parity/findings/IMAGEEDITOR.json). Runs in the browser and in Node.
// The numbers are fitted to what the oracle's editor drew on its picture, with each slider read alone.
import { FILTERS } from './image-filters.js';

export const ADJUST = [['Brightness', -100, 100], ['Contrast', -100, 100], ['Saturation', -100, 100], ['Sharpness', 0, 100], ['Blur', 0, 100], ['Highlights', -100, 100], ['Shadows', -100, 100]];
export const RATIOS = { '2:3': 2 / 3, '3:4': 3 / 4, '4:5': 4 / 5, '9:16': 9 / 16, '1:1': 1, '3:2': 3 / 2, '4:3': 4 / 3, '5:4': 5 / 4, '16:9': 16 / 9 };
export const SWAP_RATIO = { '2:3': '3:2', '3:2': '2:3', '3:4': '4:3', '4:3': '3:4', '4:5': '5:4', '5:4': '4:5', '9:16': '16:9', '16:9': '9:16', '1:1': '1:1' };

export const startState = () => ({ adjust: Object.fromEntries(ADJUST.map(([n]) => [n, 0])), ratio: 'Original', box: [0, 0, 1, 1], rot: 0, flipX: false, flipY: false, straighten: 0, filter: null, strength: 100 });

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const SHADOWS = [[0, 0], [16, 5.6], [48, 18.1], [80, 24.5], [112, 29.3], [144, 30.7], [176, 30.9], [208, 21.7], [240, 8.4], [255, 0]];
const shadowAt = (x) => { for (let i = 1; i < SHADOWS.length; i++) if (x <= SHADOWS[i][0]) { const [a, va] = SHADOWS[i - 1], [b, vb] = SHADOWS[i]; return va + ((vb - va) * (x - a)) / (b - a); } return 0; };
// What Brightness, Contrast, Highlights and Shadows do to one channel value. Read at full slider, which
// a press lands on as 97, and in between each moved in step with its slider.
export function toneOf(x, a) {
  const contrast = -21.5 * Math.sin((2 * Math.PI * x) / 255);
  return x + (a.Brightness * 49 + a.Contrast * contrast + a.Highlights * 0.00186 * x * x + a.Shadows * shadowAt(x)) / 97;
}
// Saturation pulls each channel to the pixel's brightest one, not to a luminance: -100 read as max(r, g, b).
export const saturationFactor = (v) => (v >= 0 ? 1 + v * 0.00786 : 1 + v / 100);
export const blurSigma = (v, pictureWidth) => (v * 0.32 * pictureWidth) / 655;
export const sharpenAmount = (v) => 1.24 * (v / 98) ** 0.67;

const curveAt = (t, x) => { const f = (x / 255) * (t.length - 1), i = Math.min(t.length - 2, Math.floor(f)); return t[i] + (t[i + 1] - t[i]) * (f - i); };
const luts = {};
function filterLuts(name) {
  if (luts[name]) return luts[name];
  const c = FILTERS[name].curves;
  luts[name] = c ? c.map((t) => Uint8ClampedArray.from({ length: 256 }, (_, x) => Math.round(curveAt(t, x)))) : null;
  return luts[name];
}
// One pixel through a filter at 100%.
export function filterPixel(name, r, g, b) {
  const f = FILTERS[name], l = filterLuts(name);
  if (f.matrix) [r, g, b] = f.matrix.map((m) => clamp(m[0] * 255 + m[1] * r + m[2] * g + m[3] * b));
  if (f.gray) { const x = Math.max(r, g, b); r = g = b = x; }
  return l ? [l[0][Math.round(r)], l[1][Math.round(g)], l[2][Math.round(b)]] : [r, g, b];
}

// Three box blurs make a Gaussian. Edges repeat their last pixel.
function blurInto(src, w, h, sigma) {
  const out = new Float32Array(src.length);
  const size = Math.max(3, Math.round(Math.sqrt(4 * sigma * sigma + 1)) | 1), rad = (size - 1) / 2;
  let a = Float32Array.from(src), b = out;
  const pass = (from, to, n, lines, stepAlong, stepAcross) => {
    for (let c = 0; c < 4; c++) for (let line = 0; line < lines; line++) {
      const base = line * stepAcross * 4 + c;
      let sum = 0;
      for (let i = -rad; i <= rad; i++) sum += from[base + Math.max(0, Math.min(n - 1, i)) * stepAlong * 4];
      for (let i = 0; i < n; i++) {
        to[base + i * stepAlong * 4] = sum / size;
        sum += from[base + Math.min(n - 1, i + rad + 1) * stepAlong * 4] - from[base + Math.max(0, i - rad) * stepAlong * 4];
      }
    }
  };
  for (let k = 0; k < 3; k++) { pass(a, b, w, h, 1, w); pass(b, a, h, w, w, 1); }
  return a;
}

// Blur and Sharpness first, then the tone, Saturation and the filter. The order is ours: each was read alone.
export function applyColor(px, w, h, st, pictureWidth) {
  const a = st.adjust;
  if (a.Blur > 0) { const s = blurInto(px, w, h, blurSigma(a.Blur, pictureWidth)); for (let i = 0; i < px.length; i++) px[i] = s[i]; }
  if (a.Sharpness > 0) {
    const s = blurInto(px, w, h, Math.max(0.6, pictureWidth / 655)), k = sharpenAmount(a.Sharpness);
    for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) px[i + c] = clamp(px[i + c] + k * (px[i + c] - s[i + c]));
  }
  const tone = a.Brightness || a.Contrast || a.Highlights || a.Shadows ? Uint8ClampedArray.from({ length: 256 }, (_, x) => Math.round(toneOf(x, a))) : null;
  const sat = saturationFactor(a.Saturation), mix = st.filter ? st.strength / 100 : 0;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    if (tone) { r = tone[r]; g = tone[g]; b = tone[b]; }
    if (sat !== 1) { const m = Math.max(r, g, b); r = clamp(m + (r - m) * sat); g = clamp(m + (g - m) * sat); b = clamp(m + (b - m) * sat); }
    if (mix) { const f = filterPixel(st.filter, r, g, b); r += (f[0] - r) * mix; g += (f[1] - g) * mix; b += (f[2] - b) * mix; }
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
}

// ---- Geometry. A box is [x, y, w, h] in fractions of the picture as it stands after turning. ----
export const turned = (w, h, rot) => (rot % 180 ? [h, w] : [w, h]);
// The biggest box of that ratio inside the picture, in the middle (read at nine ratios).
export function ratioBox(name, W, H) {
  const r = RATIOS[name];
  if (!r) return [0, 0, 1, 1];
  const fw = Math.min(1, (H * r) / W), fh = Math.min(1, W / r / H);
  return [(1 - fw) / 2, (1 - fh) / 2, fw, fh];
}
// Pressing 90 turns the box with the picture.
export const turnBox = ([x, y, w, h], d) => (d === 90 ? [1 - y - h, x, h, w] : [y, 1 - x - w, h, w]);
// How much a straightened picture grows so that no corner shows empty.
export function coverScale(deg, W, H) {
  const t = Math.abs((deg * Math.PI) / 180), c = Math.cos(t), s = Math.sin(t);
  return Math.max(c + (H / W) * s, c + (W / H) * s);
}
