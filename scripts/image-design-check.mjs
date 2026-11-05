// T4: Focal point, Corner, Overlay, Lightbox and Stretch on a new image with a picture, through
// real presses, against parity/findings/IMAGEDESIGN.json. Writes parity/image-design-check.json.
// Usage: npm run image-design-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, browser } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/IMAGEDESIGN.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(44)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, t = 1) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t);

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1600);
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const made = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Image"]').click(); await sleep(450); const s = fe.model.sections[1]; const b = s.blocks.at(-1); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(300); const P = document.getElementById('block-panel'); P.querySelector('[data-btab="Content"]')?.click(); await sleep(150); const c = document.createElement('canvas'); c.width = 896; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#2d6'; g.fillRect(0, 0, 896, 1200); const blob = await new Promise((res) => c.toBlob(res, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'room.png', { type: 'image/png' })); const inp = P.querySelector('[data-image-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); await sleep(600); return JSON.stringify({ sid: s.id, bid: b.id, panel: !P.hidden }); })()`);
const { sid, bid } = made;
const M = `fe.model.sections.find((s) => s.id === '${sid}').blocks.find((b) => b.id === '${bid}')`;
const PX = `const P = document.getElementById('block-panel'), P0 = P.getBoundingClientRect(); const fr = document.getElementById('site-frame'), d = fr.contentDocument, W = fr.contentWindow; const blk = d.getElementById('block-${bid}'); const box = blk.querySelector('.fluid-image-container'), q = blk.closest('.fe-block').getBoundingClientRect();`;
const R = (js) => evalJs(S, `(() => { ${PX} return JSON.stringify(${js}); })()`);
const act = async (js, wait = 300) => { evalJs(S, `(() => { ${PX} ${js}; return 'true'; })()`); await pause(wait); };
const tab = (t) => act(`P.querySelector('[data-btab="${t}"]').click()`, 250);
const center = (sel) => R(`(() => { const r = ${sel}.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const press = async (sel, wait = 300) => { const c = center(sel); mouse(S, 'move', c[0], c[1]); await pause(30); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(wait); };
const undo = () => act(`document.getElementById('undo').click()`, 250);

// Content: the card and the thumbnail.
await tab('Content');
const card = R(`(() => { const rel = (e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height]; }; return { thumb: rel(P.querySelector('.bp-pic-frame')), card: rel(P.querySelector('.bp-pic')), name: rel(P.querySelector('.bp-pic-name')), kind: rel(P.querySelector('.bp-pic-kind')), replace: rel(P.querySelector('[data-image-act="replace"]')), remove: rel(P.querySelector('[data-image-act="remove"]')), ring: rel(P.querySelector('.bp-focal')), nameText: P.querySelector('.bp-pic-name').textContent }; })()`);
add('Thumbnail box', near(card.thumb, F.content.thumbnail, 1.5), JSON.stringify(card.thumb));
add('Card left and width', near([card.card[0], card.card[2]], [F.content.cardLeft, F.content.cardWidth]), JSON.stringify(card.card));
add('File name line', near(card.name.slice(0, 2), F.content.name.slice(0, 2), 1.5) && card.nameText === 'room.png', JSON.stringify([card.name, card.nameText]));
add('Image line', near(card.kind.slice(0, 2), F.content.kind.slice(0, 2), 1.5), JSON.stringify(card.kind));
add('Replace', near(card.replace.slice(0, 2), [F.content.replace[0], F.content.replace[1]], 8), JSON.stringify(card.replace));
add('Remove', near(card.remove, F.content.remove, 1.5), JSON.stringify(card.remove));
add('Ring is 16 and on the centre', near(card.ring.slice(2), F.focal.ring) && near([card.ring[0] + 8, card.ring[1] + 8], [card.thumb[0] + card.thumb[2] / 2, card.thumb[1] + card.thumb[3] / 2]), JSON.stringify(card.ring));

// Focal point: a press on the picture, a drag, a drag out, an arrow key.
const focalNow = () => evalJs(S, `(() => JSON.stringify(${M}.focal || [0.5, 0.5]))()`);
const pos = () => R(`W.getComputedStyle(blk.querySelector('img')).objectPosition`);
const thumb = R(`(() => { const r = P.querySelector('.bp-pic-frame').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
const px = thumb[0] + thumb[2] * 0.25, py = thumb[1] + thumb[3] * 0.75;
mouse(S, 'move', px, py); await pause(30); mouse(S, 'down', px, py, { buttons: 1 }); await pause(30); mouse(S, 'up', px, py); await pause(350);
let f = focalNow();
add('A press on the picture sets the point', near(f, [0.25, 0.75], 0.02), JSON.stringify(f));
add('Canvas takes the point', pos() === `${f[0] * 100}% ${f[1] * 100}%`, pos());
await undo(); add('Press is one undo step', near(focalNow(), [0.5, 0.5], 0), JSON.stringify(focalNow()));
const cx = thumb[0] + thumb[2] / 2, cy = thumb[1] + thumb[3] / 2;
mouse(S, 'move', cx, cy); await pause(30); mouse(S, 'down', cx, cy, { buttons: 1 }); await pause(30);
for (let i = 1; i <= 5; i++) { mouse(S, 'move', cx + i * 6, cy - i * 5, { buttons: 1 }); await pause(30); }
const during = pos();
mouse(S, 'up', cx + 30, cy - 25); await pause(350);
f = focalNow();
add('Drag follows the pointer', near(f, F.focal.dragBy.point, 0.015), JSON.stringify(f));
add('Canvas follows during the drag', during === pos(), `${during} / ${pos()}`);
const ring = center(`P.querySelector('.bp-focal')`);
add('The panel stays put after a drag', near(ring, [cx + 30, cy - 25], 2), JSON.stringify([ring, cx, cy]));
mouse(S, 'move', ring[0], ring[1]); await pause(30); mouse(S, 'down', ring[0], ring[1], { buttons: 1 }); await pause(30);
for (let i = 1; i <= 5; i++) { mouse(S, 'move', ring[0] + i * 40, ring[1] - i * 30, { buttons: 1 }); await pause(30); }
mouse(S, 'up', ring[0] + 200, ring[1] - 150); await pause(350);
add('A drag out stops at the edge', near(focalNow(), F.focal.dragOut.point, 0), JSON.stringify(focalNow()));
await undo(); await undo();
await press(`P.querySelector('.bp-focal')`);
const beforeKey = focalNow();
await act(`P.querySelector('.bp-focal').focus()`, 60);
browser(S, 'press', 'ArrowRight'); await pause(300);
add('Arrow Right moves it by 0.1', near(focalNow(), [beforeKey[0] + 0.1, beforeKey[1]], 0.001), JSON.stringify([beforeKey, focalNow()]));
add('The block stayed selected', R(`!!P.querySelector('.bp-focal')`) === true);

// The rows of the Design tab, top by top.
const labels = () => R(`[...P.querySelectorAll('.bp-modes button, .sp-label, .bp-thead > span, .bp-range-head .sp-label')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), r.top - P0.top + r.height / 2]; })`);
const rowsMatch = (name, want) => {
  const got = labels(), used = new Set();
  // Anchor is a transform row no block has yet: outside T4.
  const miss = want.filter(([t, , top, , h]) => !['Normal', 'Dark Overlay', 'Anchor'].includes(t)).filter(([t, , top, , h]) => { const i = got.findIndex((g, n) => !used.has(n) && g[0] === t && Math.abs(g[1] - (top + h / 2)) <= 2); if (i >= 0) used.add(i); return i < 0; });
  add(`Rows on ${name}`, !miss.length, JSON.stringify(miss.map((m) => m[0])) + ' got ' + JSON.stringify(got.map((g) => [g[0], Math.round(g[1])])));
};
await tab('Design');
await act(`P.querySelector('[data-image-mode="fill"]').click()`, 250);
rowsMatch('Fill', F.rows.fill);
const modes = R(`[...P.querySelectorAll('.bp-modes button')].map((e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left, r.top - P0.top, r.width, r.height]; })`);
add('Fit, Fill, Shape boxes', modes.every((b, i) => near(b, F.rows.fill[i].slice(1), 1.5)), JSON.stringify(modes));

// Overlay.
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`);
rowsMatch('Overlay on', F.rows.overlayOn);
const ov = () => R(`(() => { const e = blk.querySelector('.fluidImageOverlay'); if (!e) return null; const s = W.getComputedStyle(e), r = e.getBoundingClientRect(), c = box.getBoundingClientRect(); return { bg: s.backgroundColor, op: s.opacity, blend: s.mixBlendMode, same: [r.left - c.left, r.top - c.top, r.width - c.width, r.height - c.height].every((v) => Math.abs(v) <= 1) }; })()`);
let o = ov();
add('Overlay on: default color and opacity', o?.bg === F.overlay.default && o.op === '1' && o.blend === F.overlay.blendDefault, JSON.stringify(o));
add('Overlay fills the picture box', o?.same, JSON.stringify(o));
await undo(); add('Overlay is one undo step', R(`!P.querySelector('input[aria-label="Overlay"]').checked`) === true);
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`);
await press(`P.querySelector('[data-shape-act="overlay"]')`);
const pop = R(`(() => { const r = document.getElementById('shape-pop').getBoundingClientRect(); return [document.getElementById('shape-pop').hidden, r.width]; })()`);
add('Color opens the color popup', pop[0] === false, JSON.stringify(pop));
await press(`document.querySelectorAll('#shape-pop .sh-swatch')[1]`);
o = ov();
add('A swatch keeps the alpha', /, 0\.5\)$/.test(o?.bg || '') && o.bg !== F.overlay.default, JSON.stringify(o));
const colored = o?.bg;
await press(`P.querySelector('[data-shape-act="overlay"]')`);
await press(`P.querySelector('[data-image-sel="blend"]')`);
const list = R(`(() => { const p = document.getElementById('shape-pop'), b = P.querySelector('[data-image-sel="blend"]').getBoundingClientRect(), r = p.getBoundingClientRect(); return { names: [...p.querySelectorAll('[role=option]')].map((e) => e.textContent), left: r.left - b.left, top: r.top - b.top, width: r.width, row: p.querySelector('[role=option]').getBoundingClientRect().height }; })()`);
add('Blend Mode list', JSON.stringify(list.names) === JSON.stringify(F.overlay.blendList), JSON.stringify(list.names));
add('Blend list sits over the button', near([list.left, list.top, list.width, list.row], [-9, 0, F.overlay.blendListBox.width, F.overlay.blendListBox.rowHeight]), JSON.stringify(list));
await press(`[...document.querySelectorAll('#shape-pop [role=option]')].find((e) => e.textContent === 'Multiply')`);
o = ov();
add('Multiply on the overlay', o?.blend === 'multiply', JSON.stringify(o));
add('The button reads Multiply', R(`P.querySelector('[data-image-sel="blend"]').textContent.trim()`) === 'Multiply');
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`);
o = ov();
add('Off keeps color and blend at opacity 0', o?.op === '0' && o.blend === 'multiply' && o.bg === colored, JSON.stringify(o));
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`);
o = ov();
add('On again has the same color and blend', o?.op === '1' && o.blend === 'multiply' && o.bg === colored, JSON.stringify(o));
await press(`P.querySelector('input[aria-label="Overlay"]').closest('label')`);

// Corner.
const setField = async (sel, v) => { await act(`const f = ${sel}; f.value = '${v}'; f.dispatchEvent(new Event('change', { bubbles: true }))`, 280); };
const radius = () => R(`(() => { const s = W.getComputedStyle(box); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join(' '); })()`);
await setField(`P.querySelector('input[aria-label="Corner"]')`, '24');
add('Corner 24 on all four', radius() === '24px 24px 24px 24px' && R(`W.getComputedStyle(blk.querySelector('.fluid-image-container')).overflow`) === 'hidden', radius());
await press(`P.querySelector('[aria-label="Individual corner radii"]')`);
rowsMatch('Individual', F.rows.individual);
const four = () => R(`[...P.querySelectorAll('.sh-corner')].map((e) => e.value)`);
add('Individual starts from the value', JSON.stringify(four().map(Number)) === JSON.stringify(F.corner.individualFrom24), JSON.stringify(four()));
const inputs = R(`[...P.querySelectorAll('.sh-corner')].map((e) => { const r = e.getBoundingClientRect(); return [r.left - P0.left + 6, r.top - P0.top, r.width - 12, r.height]; })`);
add('Four fields where measured', inputs.every((b, i) => near(b, F.corner.individualInputs[i], 1.5)), JSON.stringify(inputs));
await setField(`P.querySelector('input[aria-label="Top left corner radius"]')`, '40');
add('Top left 40', radius() === '40px 24px 24px 24px', radius());
add('The main field reads Mixed', R(`P.querySelector('input[aria-label="Corner"]').value`) === 'Mixed');
await press(`P.querySelector('[aria-label="Uniform corner radii"]')`);
add('Uniform takes the top left', radius() === '40px 40px 40px 40px' && R(`P.querySelector('input[aria-label="Corner"]').value`) === '40px', radius());
await act(`P.querySelector('[data-image-mode="fit"]').click()`, 280);
add('Fit keeps the radius', radius() === '40px 40px 40px 40px', radius());

// Shape and Stretch.
await act(`P.querySelector('[data-image-mode="shape"]').click()`, 280);
rowsMatch('Shape', F.rows.shape);
add('Shape has no Corner row', R(`!P.querySelector('input[aria-label="Corner"]')`) === true);
const bx = () => R(`(() => { const r = blk.querySelector('.fluid-image-container').getBoundingClientRect(); return [r.left - q.left, r.top - q.top, r.width, r.height, q.width, q.height, W.getComputedStyle(blk.querySelector('.fluid-image-container')).clipPath]; })()`);
const off = bx();
add('Stretch off: a square, centred', Math.abs(off[2] - off[3]) <= 1 && Math.abs(off[0] - (off[4] - off[2]) / 2) <= 1 && Math.abs(off[1] - (off[5] - off[3]) / 2) <= 1, JSON.stringify(off));
await press(`P.querySelector('input[aria-label="Stretch"]').closest('label')`);
const on = bx();
add('Stretch on: fills the block', near(on.slice(0, 4), [0, 0, on[4], on[5]]), JSON.stringify(on));
add('The mask stays', on[6] !== 'none', on[6]);
await undo(); add('Stretch is one undo step', near(bx().slice(0, 4), off.slice(0, 4)), JSON.stringify(bx()));
await act(`P.querySelector('[data-image-mode="fill"]').click()`, 280);

// Lightbox: panel, Content without Link, then preview.
await press(`P.querySelector('input[aria-label="Lightbox"]').closest('label')`);
rowsMatch('Lightbox on', F.rows.lightboxOn);
await press(`P.querySelector('[data-image-sel="theme"]')`);
const theme = R(`[...document.querySelectorAll('#shape-pop [role=option]')].map((e) => e.textContent)`);
add('Lightbox Theme list', JSON.stringify(theme) === JSON.stringify(F.lightbox.themeList), JSON.stringify(theme));
await press(`[...document.querySelectorAll('#shape-pop [role=option]')].find((e) => e.textContent === 'Light Overlay')`);
add('The button reads Light Overlay', R(`P.querySelector('[data-image-sel="theme"]').textContent.trim()`) === 'Light Overlay');
await tab('Content');
add('Lightbox takes the Link rows away', R(`!P.textContent.includes('Attach link') && !P.querySelector('[data-link-toggle], .bp-link-attach')`) === true);
await tab('Design');
await act(`document.getElementById('preview').click()`, 500);
const pic = R(`(() => { const r = box.getBoundingClientRect(), f = fr.getBoundingClientRect(); return [f.left + r.left + r.width / 2, f.top + Math.max(40, r.top + 40), W.getComputedStyle(blk.querySelector('img')).cursor]; })()`);
add('Preview: the cursor is a pointer', pic[2] === 'pointer', pic[2]);
mouse(S, 'move', pic[0], pic[1]); await pause(40); mouse(S, 'down', pic[0], pic[1], { buttons: 1 }); await pause(40); mouse(S, 'up', pic[0], pic[1]); await pause(400);
const big = R(`(() => { const a = d.querySelector('.cdk-image-lightbox'); if (!a) return null; const o = W.getComputedStyle(a.querySelector('.sqs-lightbox-overlay')), c = a.querySelector('.sqs-lightbox-close').getBoundingClientRect(), i = a.querySelector('.cdk-image-lightbox-padder img').getBoundingClientRect(), g = W.innerWidth, h = W.innerHeight; return { bg: o.backgroundColor, op: o.opacity, close: [c.left, c.top, c.width, c.height], color: W.getComputedStyle(a.querySelector('.sqs-lightbox-close')).color, img: [i.left, i.top, i.width, i.height], g, h }; })()`);
add('Preview: a press opens the lightbox', !!big, 'no lightbox');
add('Page is black at 0.95', big?.bg === F.lightbox.preview.page.color && big.op === String(F.lightbox.preview.page.opacity), JSON.stringify(big));
add('Light Overlay still draws dark', big?.bg === 'rgb(0, 0, 0)', JSON.stringify(big));
add('Close button', big && near(big.close, [big.g - 56, 19, 24, 24]) && big.color === F.lightbox.preview.close.color, JSON.stringify(big));
const wantH = big ? big.h - 38 : 0, wantW = wantH * (896 / 1200);
add('The picture fills the height, centred', big && near(big.img, [(big.g - wantW) / 2, 19, wantW, wantH]), JSON.stringify(big));
const clickAt = async (x, y) => { mouse(S, 'move', x, y); await pause(40); mouse(S, 'down', x, y, { buttons: 1 }); await pause(40); mouse(S, 'up', x, y); await pause(350); };
const frameXY = R(`(() => { const f = fr.getBoundingClientRect(); return [f.left, f.top]; })()`);
if (big) await clickAt(frameXY[0] + big.close[0] + 12, frameXY[1] + big.close[1] + 12);
add('The close button ends it', R(`!d.querySelector('.cdk-image-lightbox')`) === true);
await clickAt(pic[0], pic[1]);
const open2 = R(`!!d.querySelector('.cdk-image-lightbox')`);
if (big) await clickAt(frameXY[0] + 30, frameXY[1] + 400);
add('A press beside the picture ends it', open2 && R(`!d.querySelector('.cdk-image-lightbox')`) === true, String(open2));
await act(`document.getElementById('preview').click()`, 400);
await clickAt(pic[0], pic[1]);
add('While editing a press does not open it', R(`!d.querySelector('.cdk-image-lightbox')`) === true);

// Nothing goes to a new block, and the page's other images are left alone.
const others = evalJs(S, `(() => JSON.stringify(fe.model.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'image' && b.id !== '${bid}' && (b.overlay || b.overlayColor || b.overlayBlend || b.lightbox || b.focal || b.stretch)).length))()`);
add('No other image changed', others === 0, String(others));

writeFileSync(new URL('../parity/image-design-check.json', import.meta.url), `${JSON.stringify({ check: 'image Focal point, Corner, Overlay, Lightbox, Stretch', pass, total, results }, null, 1)}\n`);
console.log(`Image design: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
