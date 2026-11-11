// A PNG screenshot's pixels, for the checks that read by pixel: pngPixels(file)(x, y) gives [r, g, b].
// 8-bit RGB or RGBA, no interlace (what Chrome's screenshots are).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function pngPixels(file) {
  const png = readFileSync(file); let p = 8, w = 0, h = 0, bpp = 4; const idat = [];
  while (p < png.length) {
    const len = png.readUInt32BE(p), type = png.toString('latin1', p + 4, p + 8), d = png.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bpp = d[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, rows = [];
  let prev = Buffer.alloc(stride);
  for (let r = 0; r < h; r++) {
    const f = raw[r * (stride + 1)], src = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1)), row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      row[i] = (src[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    rows.push(row); prev = row;
  }
  return (x, y) => [0, 1, 2].map((k) => rows[y][x * bpp + k]);
}
