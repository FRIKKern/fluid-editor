// What an image already on a page gives the importer (parity/findings/IMAGEIMPORT.json).
// IMAGE_READ runs in the oracle's site frame and imageContent turns its answer into our block's
// fields. The picture itself stays out: no Squarespace image in the repo (O2).
import { imageShapeById } from '../../app/src/image-shapes.js';

export const IMAGE_READ = `(b, W) => {
  const root = b.querySelector('.fluid-image-component-root'); if (!root) return null;
  const img = b.querySelector('img'), box = b.querySelector('.fluid-image-container'), over = b.querySelector('.fluidImageOverlay');
  const link = b.querySelector('a[href]'), lb = b.querySelector('[data-lightbox-theme], .sqs-block-image-button.lightbox');
  const oc = over ? W.getComputedStyle(over) : null, q = box ? box.getBoundingClientRect() : null;
  return {
    alt: img?.getAttribute('alt') || '',
    fit: !!b.querySelector('.js-content-mode-element.content-fit'),
    mask: root.dataset.isMaskApplied === 'true' ? (root.dataset.shapeMask || '') : null,
    stretched: root.dataset.isImageStretched === 'true',
    focal: root.dataset.mediaFocalPoint || '',
    dimensions: img?.dataset.imageDimensions || '',
    size: q ? [q.width, q.height] : null,
    radius: box ? W.getComputedStyle(box).borderRadius : '',
    overlay: oc ? { opacity: oc.opacity, color: oc.backgroundColor, blend: oc.mixBlendMode } : null,
    lightbox: lb ? (lb.dataset.lightboxTheme || 'dark') : null,
    href: link ? link.getAttribute('href') : null,
    newTab: link ? link.getAttribute('target') === '_blank' : false,
    phone: root.dataset.bpo || '',
  };
}`;

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.5)';
const SHAPE_RATIOS = [1, 2 / 3, 3 / 2];
const round = (v) => Math.round(v * 10000) / 10000;

// A computed border-radius has one to four values, in CSS order.
function cornersOf(radius) {
  const v = String(radius || '').trim().split(/\s+/).map(parseFloat);
  if (v.length < 2 || v.some(Number.isNaN)) return null;
  return [v[0], v[1], v[2] ?? v[0], v[3] ?? v[1]];
}

export function imageContent(raw) {
  const out = { type: 'image', alt: raw.alt };
  const corners = cornersOf(raw.radius);
  if (corners) out.corners = corners; else out.radius = raw.radius;
  const [w, h] = String(raw.dimensions).split('x').map(Number);
  if (w > 0 && h > 0) out.aspect = round(w / h);
  if (raw.mask !== null) {
    // Our own drawing stands in for the oracle's mask, by name. An unknown name would silently draw a circle.
    if (raw.mask && imageShapeById(raw.mask).id !== raw.mask) throw new Error(`image shape ${raw.mask}: not in app/src/image-shapes.js`);
    out.mode = 'shape';
    if (raw.mask && raw.mask !== 'circle') out.imageShape = raw.mask;
    if (raw.stretched) out.stretch = true;
    else if (raw.size?.[1] > 0) { const r = raw.size[0] / raw.size[1]; out.shapeRatio = SHAPE_RATIOS.find((x) => Math.abs(x - r) < 0.01) ?? round(r); }
  } else if (raw.fit) out.mode = 'fit';
  const focal = String(raw.focal).split(',').map(Number);
  if (focal.length === 2 && focal.every(Number.isFinite) && (focal[0] !== 0.5 || focal[1] !== 0.5)) out.focal = focal;
  if (raw.overlay) {
    if (Number(raw.overlay.opacity) > 0) out.overlay = true;
    if (raw.overlay.color !== OVERLAY_COLOR) out.overlayColor = raw.overlay.color;
    if (raw.overlay.blend !== 'normal') out.overlayBlend = raw.overlay.blend;
  }
  if (raw.lightbox) { out.lightbox = true; if (raw.lightbox === 'light') out.lightboxTheme = 'light'; }
  if (raw.href && !raw.lightbox) { out.href = raw.href; if (raw.newTab) out.newTab = true; }
  return out;
}
