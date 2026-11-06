// T4: what the importer takes from an image on a page, against parity/findings/IMAGEIMPORT.json.
// Writes parity/image-import-check.json. Usage: npm run image-import-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';
import { imageContent } from './lib/image-read.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEIMPORT.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(48)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1.5) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

// The read gives the fields a block keeps.
const P = F.probe;
const lit = imageContent(P.overlayMultiplyLightboxFocal);
add('Overlay on, with its blend', lit.overlay === true && lit.overlayBlend === 'multiply' && !lit.overlayColor, JSON.stringify(lit));
add('Lightbox, and no link beside it', lit.lightbox === true && !lit.lightboxTheme && !lit.href, JSON.stringify(lit));
add('The focal point', near(lit.focal, [0.2963, 0.6961], 0.001), JSON.stringify(lit.focal));
add('Fill keeps no mode', !lit.mode, lit.mode);
const shape = imageContent(P.shape), wide = imageContent(P.shapeStretched), link = imageContent(P.link);
add('Circle is the plain Shape, square', shape.mode === 'shape' && !shape.imageShape && shape.shapeRatio === 1 && !shape.stretch, JSON.stringify(shape));
add('Stretch on Shape has no fixed box', wide.mode === 'shape' && wide.stretch === true && !wide.shapeRatio, JSON.stringify(wide));
add('A link', link.href === '/services' && !link.newTab, JSON.stringify(link));
const off = imageContent({ ...P.shape, mask: null, overlay: { opacity: '0', color: 'rgba(1, 2, 3, 0.5)', blend: 'screen' } });
add('Overlay off keeps its color and blend', !off.overlay && off.overlayColor === 'rgba(1, 2, 3, 0.5)' && off.overlayBlend === 'screen', JSON.stringify(off));
add('A plain image keeps no overlay', !imageContent({ ...P.shape, mask: null }).overlayColor);
add('Four corners from the computed radius', JSON.stringify(imageContent({ ...P.shape, radius: '1px 2px 3px' }).corners) === '[1,2,3,2]');
let threw = false;
try { imageContent({ ...P.shape, mask: 'not-a-shape' }); } catch { threw = true; }
add('An unknown shape stops the import', threw);

// Every saved image on the oracle, drawn from the imported page at the same frame width.
viewport(S, 1242, 923);
for (const [page, { images }] of Object.entries(F.pages)) {
  goto(S, `${BASE}/page.html?page=${page}`); await pause(1200);
  const seen = evalJs(S, `(() => JSON.stringify(Object.fromEntries(${JSON.stringify(images.map((i) => i.id))}.map((id) => { const b = document.getElementById('block-' + id), c = b?.querySelector('.fluid-image-container'); if (!c) return [id, null]; const fe = b.closest('.fe-block') || b, q = fe.getBoundingClientRect(), r = c.getBoundingClientRect(), cs = getComputedStyle(c); return [id, { block: [q.width, q.height], box: [r.left - q.left, r.top - q.top, r.width, r.height], radius: cs.borderRadius, clip: cs.clipPath, cls: b.className }]; }))))()`);
  for (const im of images) {
    const got = seen[im.id], name = `${page} ${im.id.slice(0, 6)}`, raw = im.raw;
    if (!got) { add(name, false, 'not drawn'); continue; }
    add(`${name} block`, near(got.block, im.block, 1.5), JSON.stringify(got.block));
    add(`${name} picture box`, near(got.box, im.box, 1.5), `${JSON.stringify(got.box)} oracle ${JSON.stringify(im.box)}`);
    add(`${name} corner`, got.radius === raw.radius, got.radius);
    add(`${name} mode`, got.cls.includes('image-mode-fit') === raw.fit && got.cls.includes('image-mode-shape') === (raw.mask !== null) && got.cls.includes('image-stretch') === (raw.mask !== null && raw.stretched), got.cls);
    add(`${name} clip`, raw.mask !== null ? got.clip !== 'none' : got.clip === 'none', got.clip);
  }
}

writeFileSync(new URL('../parity/image-import-check.json', import.meta.url), `${JSON.stringify({ check: 'Image import', pass, total, results }, null, 1)}\n`);
console.log(`Image import: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
