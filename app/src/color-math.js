// Color conversions for the palette and theme rows. Colors reach the oracle's page as hsl strings, so
// a pressed or typed color goes through whole-number rgb first, as its readings do (#C6B4F2 gives 257.42).
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const trim = (v) => Number(v.toFixed(2));

export function hslToRgb(value) {
  const [h, s, l] = String(value).split(',').map(parseFloat);
  const a = (s / 100) * Math.min(l, 100 - l) / 100;
  const part = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [part(0), part(8), part(4)];
}
export function rgbToHslParts([r, g, b]) {
  const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s * 100, l * 100];
}
export const rgbToHsl = (rgb) => { const [h, s, l] = rgbToHslParts(rgb); return `${trim(h)},${trim(s)}%,${trim(l)}%`; };
export const rgbToHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
export const hexOf = (value) => rgbToHex(hslToRgb(value));
// What the oracle takes: # and three or six digits. Anything else changes nothing.
export function hexToRgb(text) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text).trim());
  if (!m) return null;
  const x = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
}
export function rgbToHsv([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return [rgbToHslParts([r, g, b])[0], max ? (max - min) / max : 0, max / 255];
}
export function hsvToRgb(h, s, v) {
  const part = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return [part(5), part(3), part(1)];
}
export const hueToRgb = (h, s, l) => hslToRgb(`${h},${s}%,${l}%`);
export const clampByte = (v) => clamp(Math.round(Number(v)), 0, 255);
// Perceived brightness, 0 to 1: the measure the oracle's safe colors fit (parity/findings/CAP-THEMEROWS.json).
export const brightness = (value) => { const [r, g, b] = hslToRgb(value); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
