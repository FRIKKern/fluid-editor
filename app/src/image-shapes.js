// An image's Shape picker (parity/findings/IMAGESHAPES.json): the oracle's names, tabs and order, with
// our own drawings. Each path is in a 1 by 1 box, because the clip stretches to the picture's box.
const n = (v) => Math.round(v * 1000) / 1000;
const poly = (list) => `M${list.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
const oval = 'M0 .5A.5 .5 0 0 1 1 .5A.5 .5 0 0 1 0 .5Z';
// A closed curve from a radius at each angle, fitted to the box.
const fit = (list) => {
  const xs = list.map((p) => p[0]), ys = list.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  return poly(list.map(([x, y]) => [(x - x0) / w, (y - y0) / h]));
};
const polar = (count, radius) => fit(Array.from({ length: count }, (_, k) => {
  const a = (k / count) * 2 * Math.PI - Math.PI / 2, r = radius(a, k);
  return [r * Math.cos(a), r * Math.sin(a)];
}));
const leaning = (ry) => fit(Array.from({ length: 72 }, (_, k) => {
  const a = (k / 72) * 2 * Math.PI, t = Math.PI / 4;
  return [Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t), -Math.cos(a) * Math.sin(t) - ry * Math.sin(a) * Math.cos(t)];
}));
const roundedPoly = (sides, cut) => {
  const at = (k) => { const a = (k / sides) * 2 * Math.PI - Math.PI / 2; return [Math.cos(a), Math.sin(a)]; };
  const out = [];
  for (let k = 0; k < sides; k++) {
    const p = at(k), a = at(k - 1), b = at(k + 1);
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, from = [p[0] + (a[0] - p[0]) * cut, p[1] + (a[1] - p[1]) * cut], to = [p[0] + (b[0] - p[0]) * cut, p[1] + (b[1] - p[1]) * cut];
      out.push([(1 - u) ** 2 * from[0] + 2 * u * (1 - u) * p[0] + u * u * to[0], (1 - u) ** 2 * from[1] + 2 * u * (1 - u) * p[1] + u * u * to[1]]);
    }
  }
  return fit(out);
};
const shield = 'M.1 .04Q.5 -.04 .9 .04Q.98 .25 1 .5Q.98 .75 .9 .96Q.5 1.04 .1 .96Q.02 .75 0 .5Q.02 .25 .1 .04Z';
const book = 'M0 0Q.5 .16 1 0V1Q.5 .84 0 1Z';
const LIST = {
  '1:1': [
    ['circle', 'Circle', oval],
    ['diamond', 'Diamond', 'M.5 0L1 .5L.5 1L0 .5Z'],
    ['bottom-left-curve', 'Bottom-left curve', 'M0 0H1V1A1 1 0 0 1 0 0Z'],
    ['rabbet', 'Rabbet', poly([[.12, 0], [.88, 0], [.88, .1], [1, .1], [1, .9], [.88, .9], [.88, 1], [.12, 1], [.12, .9], [0, .9], [0, .1], [.12, .1]])],
    ['four-petal-flower', 'Four-petal flower', 'M.5 .1A.27 .27 0 1 1 .9 .5A.27 .27 0 1 1 .5 .9A.27 .27 0 1 1 .1 .5A.27 .27 0 1 1 .5 .1Z'],
    ['four-point-star', 'Four-point star', 'M0 0Q.5 .2 1 0Q.8 .5 1 1Q.5 .8 0 1Q.2 .5 0 0Z'],
    ['descending-ramp', 'Descending ramp', 'M0 0L1 1H0Z'],
    ['descending-stairs', 'Descending stairs', poly([[0, 0], [.2, 0], [.2, .2], [.4, .2], [.4, .4], [.6, .4], [.6, .6], [.8, .6], [.8, .8], [1, .8], [1, 1], [0, 1]])],
    ['octagon', 'Octagon', poly([[.29, 0], [.71, 0], [1, .29], [1, .71], [.71, 1], [.29, 1], [0, .71], [0, .29]])],
    ['stepped-cross', 'Stepped cross', poly([[.35, 0], [.65, 0], [.65, .12], [.82, .12], [.82, .3], [1, .3], [1, .7], [.82, .7], [.82, .88], [.65, .88], [.65, 1], [.35, 1], [.35, .88], [.18, .88], [.18, .7], [0, .7], [0, .3], [.18, .3], [.18, .12], [.35, .12]])],
    ['tv', 'TV', 'M.5 0C.8 0 .95 .02 .97 .1C1 .25 1 .75 .97 .9C.95 .98 .8 1 .5 1C.2 1 .05 .98 .03 .9C0 .75 0 .25 .03 .1C.05 .02 .2 0 .5 0Z'],
    ['open-book', 'Open book', book],
    ['flower', 'Flower', polar(144, (a) => 0.72 + 0.28 * Math.abs(Math.cos(4 * a)) ** 0.7)],
    ['eight-sided-shield', 'Eight-sided shield', shield],
    ['rounded-pentagon', 'Rounded pentagon', roundedPoly(5, 0.28)],
    ['gear', 'Gear', polar(48, (a, k) => (k % 2 ? 0.92 : 1))],
  ],
  '2:3': [
    ['vertical-oval', 'Vertical oval', oval],
    ['hourglass', 'Hourglass', 'M0 0H1V.12Q1 .32 .6 .5Q1 .68 1 .88V1H0V.88Q0 .68 .4 .5Q0 .32 0 .12Z'],
    ['keystone', 'Keystone', 'M0 0H1L.8 1H.2Z'],
    ['vertical-parallelogram', 'Vertical parallelogram', 'M.2 0H1L.8 1H0Z'],
    ['vertical-right-leaning-oval', 'Vertical right-leaning oval', leaning(0.5)],
    ['arched-window', 'Arched window', 'M0 1V.4A.5 .4 0 0 1 1 .4V1Z'],
    ['vertical-stacked-circles', 'Vertical stacked circles', 'M.155 .5A.5 .29 0 1 1 .845 .5A.5 .29 0 1 1 .155 .5Z'],
    ['pointed-window', 'Pointed window', 'M0 1V.2Q.2 .2 .25 .1Q.35 0 .5 0Q.65 0 .75 .1Q.8 .2 1 .2V1Z'],
    ['award', 'Award', 'M.5 0A.5 .33 0 0 1 .9 .5L1 .55V1L.75 .96L.5 1L.25 .96L0 1V.55L.1 .5A.5 .33 0 0 1 .5 0Z'],
    ['narrow-horizontal-stacked-pills', 'Narrow horizontal stacked pills', 'M.2 0H.8Q1 0 1 .17Q1 .3 .88 .333Q1 .37 1 .5Q1 .63 .88 .667Q1 .7 1 .83Q1 1 .8 1H.2Q0 1 0 .83Q0 .7 .12 .667Q0 .63 0 .5Q0 .37 .12 .333Q0 .3 0 .17Q0 0 .2 0Z'],
    ['egg', 'Egg', 'M.5 0C.8 0 1 .45 1 .66C1 .86 .78 1 .5 1C.22 1 0 .86 0 .66C0 .45 .2 0 .5 0Z'],
    ['narrow-pow', 'Narrow pow', polar(24, (a, k) => (k % 2 ? 0.78 : 1))],
  ],
  '3:2': [
    ['horizontal-stacked-circles', 'Horizontal stacked circles', 'M.5 .155A.29 .5 0 1 1 .5 .845A.29 .5 0 1 1 .5 .155Z'],
    ['wide-vertical-stacked-pills', 'Wide vertical stacked pills', 'M0 .2V.8Q0 1 .17 1Q.3 1 .333 .88Q.37 1 .5 1Q.63 1 .667 .88Q.7 1 .83 1Q1 1 1 .8V.2Q1 0 .83 0Q.7 0 .667 .12Q.63 0 .5 0Q.37 0 .333 .12Q.3 0 .17 0Q0 0 0 .2Z'],
    ['wide-horizontal-stacked-pills', 'Wide horizontal stacked pills', 'M.15 0H.85Q1 0 1 .25Q1 .42 .88 .5Q1 .58 1 .75Q1 1 .85 1H.15Q0 1 0 .75Q0 .58 .12 .5Q0 .42 0 .25Q0 0 .15 0Z'],
    ['horizontal-oval', 'Horizontal oval', oval],
    ['horizontal-right-leaning-oval', 'Horizontal right-leaning oval', leaning(0.42)],
    ['wide-eight-sided-shield', 'Wide eight-sided shield', shield],
    ['wide-open-book', 'Wide open book', book],
  ],
};
export const IMAGE_SHAPE_TABS = Object.keys(LIST);
export const imageShapesOf = (tab) => LIST[tab].map(([id, label, d]) => ({ id, label, d, tab }));
export const imageShapeById = (id) => IMAGE_SHAPE_TABS.flatMap(imageShapesOf).find((s) => s.id === id) || imageShapesOf('1:1')[0];
